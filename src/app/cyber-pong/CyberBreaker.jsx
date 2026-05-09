'use client';
import React, { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════
   CYBER-BREAKER: DEATHMATCH  ·  OVERDRIVE STUDIO
   Pong meets Wallbreaker. Protect your core. Destroy their defenses.
═══════════════════════════════════════════════════════════════════ */

const CANVAS_W = 1200;
const CANVAS_H = 700;

// ─── SHOP ASSETS ────────────────────────────────────────────────────────
const SHOP = {
  bats: [
    { id: "bat_basic", name: "Standard Issue", cost: 0, hex: "#f8fafc", glow: "#94a3b8" },
    { id: "bat_cyan", name: "Plasma Cyan", cost: 500, hex: "#06b6d4", glow: "#0891b2" },
    { id: "bat_toxic", name: "Acid Green", cost: 1200, hex: "#10b981", glow: "#059669" },
    { id: "bat_overdrive", name: "Overdrive Core", cost: 2500, hex: "#ff4d00", glow: "#b91c1c" }
  ],
  balls: [
    { id: "ball_basic", name: "Steel Core", cost: 0, hex: "#ffffff", glow: "#ffffff", trail: false },
    { id: "ball_ghost", name: "Phantom Orb", cost: 800, hex: "#a855f7", glow: "#7e22ce", trail: true },
    { id: "ball_fire", name: "Solar Flare", cost: 2000, hex: "#eab308", glow: "#b45309", trail: true }
  ]
};

const DEFAULT_SAVE = { 
  coins: 0, 
  inventory: ["bat_basic", "ball_basic"], 
  eqBat: "bat_basic", 
  eqBall: "ball_basic" 
};

// ─── LOCAL STORAGE WRAPPER ──────────────────────────────────────────────
const LS = {
  get: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

export default function CyberBreaker() {
  const canvasRef = useRef(null);
  
  // React State for UI
  const [screen, setScreen] = useState("menu"); // menu, shop, playing, gameover
  const [save, setSave] = useState(DEFAULT_SAVE);
  const [mode, setMode] = useState("bot"); 
  const [shopTab, setShopTab] = useState("bats");
  const [winner, setWinner] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // ─── HIGH-PERFORMANCE ENGINE STATE (Mutable Refs) ───────────────────────
  const engine = useRef({
    keys: { w: false, s: false, ArrowUp: false, ArrowDown: false },
    p1: { x: 120, y: CANVAS_H / 2 - 60, w: 16, h: 120, score: 0 },
    p2: { x: CANVAS_W - 136, y: CANVAS_H / 2 - 60, w: 16, h: 120, score: 0 },
    balls: [],
    bricks: [],
    particles: [],
    shake: 0,
    hitstop: 0, // Freeze frames for heavy impacts
    frame: 0
  });

  // Load Save on Mount
  useEffect(() => {
    const data = LS.get("cb_save");
    if (data) setSave({ ...DEFAULT_SAVE, ...data });
    setLoaded(true);
  }, []);

  const updateSave = (updates) => {
    const newSave = { ...save, ...updates };
    setSave(newSave);
    LS.set("cb_save", newSave);
  };

  // ─── LEVEL GENERATOR ────────────────────────────────────────────────────
  const initLevel = () => {
    const state = engine.current;
    state.bricks = [];
    state.balls = [];
    state.particles = [];
    state.p1.y = CANVAS_H / 2 - state.p1.h / 2;
    state.p2.y = CANVAS_H / 2 - state.p2.h / 2;
    state.p1.score = 0;
    state.p2.score = 0;

    // Generate Brick Walls (Protecting the edges)
    const rows = 12;
    const brickH = (CANVAS_H - 100) / rows;
    for (let i = 0; i < rows; i++) {
      // Player 1 Bricks (Left)
      state.bricks.push({ x: 30, y: 50 + i * brickH, w: 30, h: brickH - 4, active: true, owner: 1, color: "#06b6d4" });
      // Player 2 Bricks (Right)
      state.bricks.push({ x: CANVAS_W - 60, y: 50 + i * brickH, w: 30, h: brickH - 4, active: true, owner: 2, color: "#ef4444" });
    }

    spawnBall(CANVAS_W / 2, CANVAS_H / 2, -6, (Math.random() * 4 - 2));
  };

  const spawnBall = (x, y, vx, vy) => {
    engine.current.balls.push({
      x, y, vx, vy,
      radius: 9,
      speed: Math.hypot(vx, vy),
      bounces: 0,
      overdrive: false,
      history: [] // For trail effects
    });
  };

  const spawnParticles = (x, y, color, count, speedMult = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 * speedMult;
      engine.current.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1.0, decay: Math.random() * 0.03 + 0.02, color, size: Math.random() * 5 + 2
      });
    }
  };

  // ─── MAIN PHYSICS LOOP ──────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    let animFrame;

    // Get Active Cosmetics
    const activeBat = SHOP.bats.find(b => b.id === save.eqBat) || SHOP.bats[0];
    const activeBall = SHOP.balls.find(b => b.id === save.eqBall) || SHOP.balls[0];

    initLevel();

    // Key Bindings
    const onDown = (e) => { if (engine.current.keys.hasOwnProperty(e.key)) engine.current.keys[e.key] = true; };
    const onUp = (e) => { if (engine.current.keys.hasOwnProperty(e.key)) engine.current.keys[e.key] = false; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    const loop = () => {
      animFrame = requestAnimationFrame(loop);
      const state = engine.current;

      // Hitstop logic (Game freezes momentarily on heavy impacts for "Juice")
      if (state.hitstop > 0) { state.hitstop--; return; }

      state.frame++;

      // 1. Paddle Movement
      const P_SPEED = 8.5;
      if (state.keys.w) state.p1.y -= P_SPEED;
      if (state.keys.s) state.p1.y += P_SPEED;

      if (mode === "local") {
        if (state.keys.ArrowUp) state.p2.y -= P_SPEED;
        if (state.keys.ArrowDown) state.p2.y += P_SPEED;
      } else {
        // Advanced AI
        const incoming = state.balls.filter(b => b.vx > 0).sort((a, b) => b.x - a.x);
        let targetY = CANVAS_H / 2;
        if (incoming.length > 0) targetY = incoming[0].y;
        
        const center = state.p2.y + state.p2.h / 2;
        if (center < targetY - 15) state.p2.y += P_SPEED * 0.85;
        else if (center > targetY + 15) state.p2.y -= P_SPEED * 0.85;
      }

      // Constrain
      state.p1.y = Math.max(10, Math.min(CANVAS_H - state.p1.h - 10, state.p1.y));
      state.p2.y = Math.max(10, Math.min(CANVAS_H - state.p2.h - 10, state.p2.y));

      // 2. Ball Physics
      for (let i = state.balls.length - 1; i >= 0; i--) {
        const b = state.balls[i];
        
        // Trail recording
        if (activeBall.trail || b.overdrive) {
          b.history.unshift({ x: b.x, y: b.y });
          if (b.history.length > 10) b.history.pop();
        }

        b.x += b.vx;
        b.y += b.vy;

        // Top/Bottom Walls
        if (b.y - b.radius < 0) { b.y = b.radius; b.vy *= -1; spawnParticles(b.x, b.y, "#52525b", 5); }
        if (b.y + b.radius > CANVAS_H) { b.y = CANVAS_H - b.radius; b.vy *= -1; spawnParticles(b.x, b.y, "#52525b", 5); }

        // AABB Collision Helper
        const checkAABB = (rect) => {
          return b.x + b.radius > rect.x && b.x - b.radius < rect.x + rect.w &&
                 b.y + b.radius > rect.y && b.y - b.radius < rect.y + rect.h;
        };

        // Paddle Collisions
        if (b.vx < 0 && checkAABB(state.p1)) {
          b.x = state.p1.x + state.p1.w + b.radius;
          b.vx *= -1;
          const hitDelta = (b.y - (state.p1.y + state.p1.h / 2)) / (state.p1.h / 2);
          b.vy = hitDelta * 9;
          b.speed = Math.min(20, b.speed * 1.05); // Speed scaling
          const n = b.speed / Math.hypot(b.vx, b.vy);
          b.vx *= n; b.vy *= n;
          b.bounces++;
          
          spawnParticles(b.x, b.y, activeBat.hex, 15);
          state.shake = 4;
        }

        if (b.vx > 0 && checkAABB(state.p2)) {
          b.x = state.p2.x - b.radius;
          b.vx *= -1;
          const hitDelta = (b.y - (state.p2.y + state.p2.h / 2)) / (state.p2.h / 2);
          b.vy = hitDelta * 9;
          b.speed = Math.min(20, b.speed * 1.05);
          const n = b.speed / Math.hypot(b.vx, b.vy);
          b.vx *= n; b.vy *= n;
          b.bounces++;

          spawnParticles(b.x, b.y, "#ef4444", 15);
          state.shake = 4;
        }

        // Overdrive Mechanic
        if (b.bounces > 10 && !b.overdrive) {
          b.overdrive = true;
          spawnParticles(b.x, b.y, "#ff4d00", 30, 2);
          state.shake = 10;
          state.hitstop = 3; // FREEZE FRAME
        }

        // Brick Collisions
        for (let j = 0; j < state.bricks.length; j++) {
          const brick = state.bricks[j];
          if (brick.active && checkAABB(brick)) {
            brick.active = false;
            b.vx *= -1; // Bounce back
            spawnParticles(brick.x + brick.w/2, brick.y + brick.h/2, brick.color, 25, 1.5);
            state.shake = 8;
            state.hitstop = 2; // Intense feel
            
            // Economy: Give coins dynamically via React setState safely using functional update
            if (brick.owner === 2) setSave(prev => { 
                const newS = { ...prev, coins: prev.coins + 15 };
                LS.set("cb_save", newS); return newS; 
            });

            // Multi-ball chance!
            if (Math.random() > 0.85) {
              spawnBall(brick.x, brick.y, b.vx * -1, b.vy + (Math.random() * 4 - 2));
            }
            break; // Only break one brick per frame to prevent tunneling
          }
        }

        // Win/Loss Condition (Out of Bounds)
        if (b.x < 0) {
          setWinner("PLAYER 2");
          setScreen("gameover");
          return; // Kill loop
        } else if (b.x > CANVAS_W) {
          setWinner("PLAYER 1");
          setSave(prev => { const n = { ...prev, coins: prev.coins + 500 }; LS.set("cb_save", n); return n; });
          setScreen("gameover");
          return;
        }
      }

      // ─── RENDER ENGINE ──────────────────────────────────────────────────────
      ctx.fillStyle = "#06060a";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.save();
      if (state.shake > 0) {
        ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
        state.shake *= 0.85;
        if (state.shake < 0.5) state.shake = 0;
      }

      // Center Grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 2;
      for (let i = 0; i < CANVAS_W; i += 60) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); ctx.stroke();
      }

      // Bricks
      for (const brick of state.bricks) {
        if (!brick.active) continue;
        ctx.shadowBlur = 15;
        ctx.shadowColor = brick.color;
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
        // Inner detail
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(brick.x + 4, brick.y + 4, brick.w - 8, brick.h - 8);
      }

      // Paddles
      ctx.shadowBlur = 20;
      ctx.shadowColor = activeBat.glow;
      ctx.fillStyle = activeBat.hex;
      ctx.fillRect(state.p1.x, state.p1.y, state.p1.w, state.p1.h);

      ctx.shadowColor = "#ef4444";
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(state.p2.x, state.p2.y, state.p2.w, state.p2.h);

      // Balls & Trails
      for (const b of state.balls) {
        const isFire = b.overdrive || activeBall.id === "ball_fire";
        const ballColor = isFire ? "#ff4d00" : activeBall.hex;
        const ballGlow = isFire ? "#b91c1c" : activeBall.glow;

        // Trail
        if (b.history.length > 0) {
          ctx.beginPath();
          ctx.moveTo(b.history[0].x, b.history[0].y);
          for (let i = 1; i < b.history.length; i++) ctx.lineTo(b.history[i].x, b.history[i].y);
          ctx.strokeStyle = ballColor;
          ctx.lineWidth = b.radius * 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowBlur = 15;
          ctx.shadowColor = ballGlow;
          ctx.globalAlpha = 0.4;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }

        ctx.shadowBlur = 20;
        ctx.shadowColor = ballGlow;
        ctx.fillStyle = ballColor;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner white core
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(b.x - 2, b.y - 2, b.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Particles
      ctx.shadowBlur = 10;
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) { state.particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1.0;
      ctx.restore();
    };

    animFrame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [screen, mode, save.eqBat, save.eqBall]);

  // ─── UI RENDERING ─────────────────────────────────────────────────────────
  if (!loaded) return <div style={{ background: "#06060a", height: "100vh" }} />;

  return (
    <div style={{ backgroundColor: "#06060a", minHeight: "100vh", color: "#f8fafc", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      
      {/* HEADER NAV */}
      <div style={{ padding: "16px 32px", background: "#0c0c14", borderBottom: "2px solid #18181b", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50 }}>
        <div style={{ fontSize: "1.8rem", fontWeight: 900, fontStyle: "italic", letterSpacing: "2px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#f8fafc" }}>CYBER</span>
          <span style={{ color: "#06b6d4", background: "rgba(6,182,212,0.1)", padding: "2px 10px", borderRadius: 4 }}>BREAKER</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ background: "#18181b", padding: "8px 16px", borderRadius: 8, border: "1px solid #27272a", display: "flex", alignItems: "center", gap: 8, fontWeight: 900 }}>
            <span style={{ color: "#eab308" }}>CREDITS</span>
            <span style={{ color: "#fff", fontSize: "1.2rem", textShadow: "0 0 10px #eab308" }}>{save.coins}</span>
          </div>
          {screen !== "menu" && (
            <button onClick={() => setScreen("menu")} style={{ background: "transparent", color: "#94a3b8", border: "1px solid #27272a", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>ABORT</button>
          )}
        </div>
      </div>

      {/* DYNAMIC VIEWPORT */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", backgroundImage: "radial-gradient(circle at center, #111118 0%, #06060a 100%)" }}>
        
        {/* MAIN MENU */}
        {screen === "menu" && (
          <div style={{ textAlign: "center", zIndex: 10, animation: "fadeIn 0.5s ease" }}>
            <h1 style={{ fontSize: "6rem", fontStyle: "italic", margin: "0 0 -10px 0", letterSpacing: "-4px", textShadow: "0 0 30px rgba(6, 182, 212, 0.5)", color: "#fff" }}>DEATHMATCH</h1>
            <p style={{ color: "#94a3b8", fontSize: "1.2rem", marginBottom: 50, letterSpacing: "1px", textTransform: "uppercase" }}>Protect the core. Destroy their defenses. Survive.</p>
            
            <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
              <MenuCard title="SOLO ASSAULT" sub="W/S vs AI BOT" col="#ef4444" onClick={() => { setMode("bot"); setScreen("playing"); }} />
              <MenuCard title="LOCAL WARFARE" sub="W/S vs UP/DOWN" col="#06b6d4" onClick={() => { setMode("local"); setScreen("playing"); }} />
              <MenuCard title="THE ARMORY" sub="SPEND CREDITS" col="#eab308" onClick={() => setScreen("shop")} />
            </div>
          </div>
        )}

        {/* THE ARMORY (SHOP) */}
        {screen === "shop" && (
          <div style={{ width: "100%", maxWidth: 1000, zIndex: 10, animation: "fadeIn 0.3s ease" }}>
            
            {/* Shop Tabs */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, justifyContent: "center" }}>
              {["bats", "balls"].map(t => (
                <button key={t} onClick={() => setShopTab(t)} style={{
                  background: shopTab === t ? "#fff" : "#111118", color: shopTab === t ? "#000" : "#a1a1aa",
                  border: `2px solid ${shopTab === t ? "#fff" : "#27272a"}`, padding: "12px 40px",
                  fontSize: "1.2rem", fontWeight: 900, textTransform: "uppercase", cursor: "pointer", borderRadius: 8, transition: "0.2s"
                }}>{t}</button>
              ))}
            </div>

            {/* Shop Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
              {SHOP[shopTab].map(item => {
                const owned = save.inventory.includes(item.id);
                const isEq = save.eqBat === item.id || save.eqBall === item.id;
                
                return (
                  <div key={item.id} style={{
                    background: "#0c0c14", padding: 24, borderRadius: 16, border: `2px solid ${isEq ? item.hex : "#18181b"}`,
                    boxShadow: isEq ? `0 0 30px rgba(0,0,0,0.5), inset 0 0 20px ${item.glow}44` : "0 10px 30px rgba(0,0,0,0.8)",
                    display: "flex", flexDirection: "column", alignItems: "center", transition: "0.2s"
                  }}>
                    {/* Visual Preview */}
                    <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                      {shopTab === "bats" ? (
                        <div style={{ width: 16, height: 80, background: item.hex, borderRadius: 4, boxShadow: `0 0 20px ${item.glow}` }} />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: item.hex, boxShadow: `0 0 20px ${item.glow}` }} />
                      )}
                    </div>
                    
                    <h3 style={{ margin: "0 0 20px 0", color: item.hex, fontSize: "1.3rem", fontWeight: 900, textTransform: "uppercase" }}>{item.name}</h3>
                    
                    {!owned ? (
                      <button onClick={() => {
                        if (save.coins >= item.cost) updateSave({ coins: save.coins - item.cost, inventory: [...save.inventory, item.id] });
                      }} style={{ width: "100%", padding: "12px", background: save.coins >= item.cost ? "#eab308" : "#27272a", color: save.coins >= item.cost ? "#000" : "#52525b", border: "none", borderRadius: 8, fontWeight: 900, cursor: save.coins >= item.cost ? "pointer" : "not-allowed", transition: "0.2s" }}>
                        BUY - {item.cost} CR
                      </button>
                    ) : (
                      <button onClick={() => updateSave(shopTab === "bats" ? { eqBat: item.id } : { eqBall: item.id })} style={{ width: "100%", padding: "12px", background: isEq ? "#10b981" : "#18181b", color: isEq ? "#000" : "#fff", border: `2px solid ${isEq ? "#10b981" : "#27272a"}`, borderRadius: 8, fontWeight: 900, cursor: "pointer", transition: "0.2s" }}>
                        {isEq ? "EQUIPPED" : "EQUIP"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GAME OVER BANNER */}
        {screen === "gameover" && (
          <div style={{ position: "absolute", zIndex: 20, background: "rgba(6, 6, 10, 0.95)", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}>
            <h2 style={{ fontSize: "6rem", margin: 0, color: winner === "PLAYER 1" ? "#06b6d4" : "#ef4444", textShadow: `0 0 40px ${winner === "PLAYER 1" ? "#0891b2" : "#b91c1c"}`, fontStyle: "italic", fontWeight: 900 }}>{winner} WINS</h2>
            <p style={{ fontSize: "1.5rem", color: "#a1a1aa", marginTop: 10, marginBottom: 40, letterSpacing: "4px" }}>CORE BREACH DETECTED</p>
            <button onClick={() => setScreen("menu")} style={{ background: "#fff", color: "#000", border: "none", padding: "16px 48px", fontSize: "1.2rem", fontWeight: 900, borderRadius: 8, cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={e=>e.target.style.transform="scale(1.05)"} onMouseOut={e=>e.target.style.transform="scale(1)"}>RETURN TO BASE</button>
          </div>
        )}

        {/* GAME CANVAS */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          visibility: screen === "playing" ? "visible" : "hidden",
          border: "2px solid #18181b", borderRadius: 16, overflow: "hidden",
          boxShadow: "0 0 60px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,0,0,0.5)"
        }}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ display: "block", background: "#06060a" }} />
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ─── UI HELPER ────────────────────────────────────────────────────────────
function MenuCard({ title, sub, col, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#111118", border: `2px solid #18181b`, borderRadius: 16, padding: "40px 30px",
      width: 280, cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
    }}
    onMouseOver={e => { e.currentTarget.style.borderColor = col; e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = `0 15px 40px ${col}33`; }}
    onMouseOut={e => { e.currentTarget.style.borderColor = "#18181b"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)"; }}>
      <div style={{ color: col, fontSize: "2rem", marginBottom: 16 }}>◈</div>
      <h3 style={{ margin: "0 0 8px 0", color: "#f8fafc", fontSize: "1.5rem", fontWeight: 900, fontStyle: "italic" }}>{title}</h3>
      <div style={{ color: "#52525b", fontSize: "0.9rem", fontWeight: "bold", letterSpacing: "1px" }}>{sub}</div>
    </div>
  );
}