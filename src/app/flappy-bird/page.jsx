'use client';
import React, { useState, useRef, useEffect } from "react";

// ============================================================================
// ── CONFIG & PHYSICS ENGINE ─────────────────────────────────────────────────
// ============================================================================
const W = 900, H = 650;
const STORAGE_KEY = "CYBERFLAP_PERFECT_SAVE_V2";

// Snappy, addictive physics tuning
const GRAVITY = 0.35; 
const JUMP_STRENGTH = -7.2;
const BASE_SPEED = 4.0;
const PIPE_WIDTH = 70;

// Math & Collision Utils
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => Math.random() * (b - a) + a;
const rectCircleCollide = (cx, cy, r, rx, ry, rw, rh) => {
  const testX = clamp(cx, rx, rx + rw);
  const testY = clamp(cy, ry, ry + rh);
  const dist = Math.hypot(cx - testX, cy - testY);
  return dist <= r;
};

// ============================================================================
// ── METADATA & SHOP SYSTEM ──────────────────────────────────────────────────
// ============================================================================
const UPGRADES = [
  { id: "multiplier", name: "Shard Multiplier", desc: "Increase shards per pipe", cost: 200, max: 10, val: 1 },
  { id: "shield", name: "Grid Shield", desc: "Absorb 1 fatal crash", cost: 1000, max: 1, val: 1 },
  { id: "magnet", name: "Magnetic Core", desc: "Pull floating shards", cost: 500, max: 5, val: 40 },
  { id: "thruster", name: "Thruster Tuning", desc: "Smoother jump recovery", cost: 800, max: 3, val: 0.2 }
];

const SKINS = [
  { id: "default", name: "Volt-X", col: "#00e5ff", core: "#ffffff", cost: 0 },
  { id: "neon", name: "Synthwave", col: "#ff00ff", core: "#00e5ff", cost: 800 },
  { id: "toxic", name: "Bio-Hazard", col: "#39ff14", core: "#000000", cost: 2000 },
  { id: "blood", name: "Crimson Demon", col: "#ff003c", core: "#ffaa00", cost: 5000 },
  { id: "void", name: "Dark Matter", col: "#8855ff", core: "#110033", cost: 10000 },
];

const DEFAULT_META = { shards: 0, upgrades: {}, skins: ["default"], activeSkin: "default", highscore: 0 };

// ============================================================================
// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ============================================================================
export default function CyberFlapV2() {
  const canvasRef = useRef(null);
  const [screen, setScreen] = useState("menu");
  const [meta, setMeta] = useState(DEFAULT_META);
  const [lastScore, setLastScore] = useState(0);
  
  // High-performance mutable game state (avoids React re-renders during play)
  const gs = useRef(null);
  const keys = useRef({});

  // ─── PERFECT SAVE SYSTEM ──────────────────────────────────────────────────
  const saveMeta = (newMeta) => {
    setMeta(newMeta);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newMeta));
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setMeta({ ...DEFAULT_META, ...JSON.parse(saved) }); } 
      catch (e) { console.error("Save corrupted, using default"); }
    }

    // Auto-save on accidental close/reload
    const handleUnload = () => {
      if (gs.current && !gs.current.isDead) {
        // Emergency bank shards if user closes tab mid-game
        const emergencyMeta = JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(DEFAULT_META));
        emergencyMeta.shards += gs.current.sessionShards;
        if (gs.current.score > emergencyMeta.highscore) emergencyMeta.highscore = gs.current.score;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(emergencyMeta));
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // ─── GAME ENGINE LOOP ─────────────────────────────────────────────────────
  const startGame = () => {
    const u = meta.upgrades;
    gs.current = {
      p: { y: H / 2, vy: 0, r: 14, trail: [] },
      pipes: [], particles: [], floaters: [], pickups: [],
      score: 0, sessionShards: 0, frame: 0, speed: BASE_SPEED,
      shake: 0, isDead: false,
      
      // Load Upgrades
      shield: u.shield > 0,
      mult: 1 + (u.multiplier || 0),
      magnet: (u.magnet || 0) * 40,
      jumpMod: 1 - ((u.thruster || 0) * 0.05),
      
      skin: SKINS.find(s => s.id === meta.activeSkin) || SKINS[0]
    };
    setScreen("playing");
  };

  const spawnParticles = (x, y, col, count, speedMax) => {
    for(let i=0; i<count; i++) {
      gs.current.particles.push({
        x, y, vx: rand(-speedMax, speedMax), vy: rand(-speedMax, speedMax),
        life: rand(20, 40), maxLife: 40, col, r: rand(2, 5)
      });
    }
  };

  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let rafId;

    const loop = () => {
      const g = gs.current;
      g.frame++;

      // 1. Input & Physics
      g.p.vy += GRAVITY;
      g.p.y += g.p.vy;

      if (keys.current[" "] || keys.current["click"]) {
        g.p.vy = JUMP_STRENGTH * g.jumpMod;
        keys.current[" "] = false; keys.current["click"] = false; // require re-press
        spawnParticles(100, g.p.y, g.skin.col, 5, 2);
      }

      // Trail update
      g.p.trail.unshift({ x: 100, y: g.p.y });
      if (g.p.trail.length > 15) g.p.trail.pop();

      // Dynamic Difficulty (Speeds up slightly)
      g.speed = BASE_SPEED + Math.min((g.score / 10) * 0.3, 3);

      // 2. Map Generation (Pipes & Pickups)
      const gapSize = Math.max(140, 200 - (g.score * 1.5)); // Gap tightens over time
      if (g.frame % Math.floor(120 / (g.speed / BASE_SPEED)) === 0) {
        const topHeight = rand(100, H - gapSize - 100);
        g.pipes.push({ x: W, topHeight, gap: gapSize, passed: false });
        
        // 20% chance to spawn a floating shard in the gap
        if (Math.random() < 0.2) {
          g.pickups.push({ x: W + PIPE_WIDTH/2, y: topHeight + gapSize/2, collected: false });
        }
      }

      // 3. Movement & Collision Logic
      const pbox = { cx: 100, cy: g.p.y, r: g.p.r };

      // Bounds
      if (g.p.y < -50 || g.p.y > H + 50) triggerDeath(g);

      g.pipes.forEach(pipe => {
        pipe.x -= g.speed;
        
        // Collisions
        const hitTop = rectCircleCollide(pbox.cx, pbox.cy, pbox.r, pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        const hitBot = rectCircleCollide(pbox.cx, pbox.cy, pbox.r, pipe.x, pipe.topHeight + pipe.gap, PIPE_WIDTH, H);
        
        if (hitTop || hitBot) {
          if (g.shield) {
            g.shield = false;
            g.shake = 25;
            pipe.x = -500; // destroy pipe visually
            spawnParticles(100, g.p.y, "#fff", 30, 8);
            g.floaters.push({ x: 100, y: g.p.y - 30, txt: "SHIELD BROKEN!", col: "#fff", life: 60 });
          } else {
            triggerDeath(g);
          }
        }

        // Scoring
        if (!pipe.passed && pipe.x + PIPE_WIDTH < 100) {
          pipe.passed = true;
          g.score++;
          const shardGain = 5 * g.mult;
          g.sessionShards += shardGain;
          g.floaters.push({ x: 100, y: g.p.y, txt: `+${shardGain}💎`, col: "#00e5ff", life: 50 });
          // Instant silent save to prevent loss
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...meta, shards: meta.shards + g.sessionShards }));
        }
      });

      // Pickups (Shards)
      g.pickups.forEach(pu => {
        if (pu.collected) return;
        pu.x -= g.speed;
        
        // Magnet effect
        const d = Math.hypot(pbox.cx - pu.x, pbox.cy - pu.y);
        if (g.magnet > 0 && d < g.magnet) {
          pu.x -= (pu.x - pbox.cx) * 0.1;
          pu.y -= (pu.y - pbox.cy) * 0.1;
        }

        if (d < pbox.r + 15) {
          pu.collected = true;
          g.sessionShards += 10 * g.mult;
          spawnParticles(pu.x, pu.y, "#00e5ff", 10, 4);
          g.floaters.push({ x: pu.x, y: pu.y, txt: "JACKPOT!", col: "#00ffbb", life: 40 });
        }
      });

      // Cleanup
      g.pipes = g.pipes.filter(p => p.x > -PIPE_WIDTH);
      g.pickups = g.pickups.filter(p => p.x > -50 && !p.collected);
      g.particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.life--; });
      g.particles = g.particles.filter(p => p.life > 0);
      g.floaters.forEach(fl => { fl.y -= 1; fl.life--; });
      g.floaters = g.floaters.filter(f => f.life > 0);
      g.shake *= 0.85;

      // 4. Rendering
      if (!g.isDead) {
        renderCanvas(ctx, g);
        rafId = requestAnimationFrame(loop);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [screen]);

  const triggerDeath = (g) => {
    if (g.isDead) return;
    g.isDead = true;
    setLastScore(g.score);
    
    setMeta(prev => {
      const nm = { ...prev, shards: prev.shards + g.sessionShards };
      if (g.score > nm.highscore) nm.highscore = g.score;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nm));
      return nm;
    });
    setScreen("dead");
  };

  // ─── RENDERER (Drawn directly for FPS) ────────────────────────────────────
  const renderCanvas = (ctx, g) => {
    const sx = rand(-g.shake, g.shake);
    const sy = rand(-g.shake, g.shake);
    
    ctx.save();
    ctx.translate(sx, sy);

    // Deep Space Background
    ctx.fillStyle = "#010105";
    ctx.fillRect(0, 0, W, H);
    
    // Cyber Grid Parallax
    ctx.strokeStyle = "rgba(136, 85, 255, 0.15)";
    ctx.lineWidth = 1;
    const gridOffset = (g.frame * (g.speed * 0.5)) % 50;
    ctx.beginPath();
    for (let x = -gridOffset; x < W; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y < H; y += 50) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // Render Pipes
    g.pipes.forEach(pipe => {
      ctx.shadowBlur = 15;
      ctx.shadowColor = g.skin.col;
      ctx.fillStyle = "#050510";
      ctx.strokeStyle = g.skin.col;
      ctx.lineWidth = 3;
      
      // Top Pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      
      // Bottom Pipe
      ctx.fillRect(pipe.x, pipe.topHeight + pipe.gap, PIPE_WIDTH, H);
      ctx.strokeRect(pipe.x, pipe.topHeight + pipe.gap, PIPE_WIDTH, H);
      ctx.shadowBlur = 0;
    });

    // Render Pickups
    g.pickups.forEach(pu => {
      ctx.fillStyle = "#00e5ff";
      ctx.shadowBlur = 20; ctx.shadowColor = "#00e5ff";
      ctx.beginPath();
      ctx.arc(pu.x, pu.y + Math.sin(g.frame * 0.1) * 5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Render Particles
    g.particles.forEach(pt => {
      ctx.fillStyle = pt.col;
      ctx.globalAlpha = pt.life / pt.maxLife;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Render Player Trail
    ctx.beginPath();
    g.p.trail.forEach((pos, i) => {
      if (i === 0) ctx.moveTo(pos.x, pos.y);
      else ctx.lineTo(pos.x, pos.y);
    });
    ctx.strokeStyle = g.skin.col;
    ctx.lineWidth = g.p.r * 1.5;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.3;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Render Player
    ctx.shadowBlur = 25; ctx.shadowColor = g.skin.col;
    ctx.fillStyle = g.skin.core;
    ctx.beginPath(); ctx.arc(100, g.p.y, g.p.r, 0, Math.PI*2); ctx.fill();
    
    // Shield Aura
    if (g.shield) {
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(100, g.p.y, g.p.r + 10 + Math.sin(g.frame*0.2)*3, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.shadowBlur = 0;

    // HUD (Drawn on canvas so React doesn't lag)
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    ctx.shadowBlur = 10; ctx.shadowColor = "#000";
    ctx.fillText(g.score, W / 2, 70);
    
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "#00e5ff";
    ctx.textAlign = "left";
    ctx.fillText(`💎 ${meta.shards + g.sessionShards}`, 20, 40);

    // Floaters
    ctx.textAlign = "center";
    g.floaters.forEach(fl => {
      ctx.fillStyle = fl.col;
      ctx.globalAlpha = fl.life / 50;
      ctx.font = "bold 20px monospace";
      ctx.fillText(fl.txt, fl.x, fl.y);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
  };

  // ─── UI HANDLERS ──────────────────────────────────────────────────────────
  const handleInput = (e, type) => {
    if (type === 'down') {
      if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); keys.current[" "] = true; }
    }
  };

  const buyUpgrade = (u) => {
    const currentLevel = meta.upgrades[u.id] || 0;
    if (currentLevel >= u.max || meta.shards < u.cost) return;
    
    saveMeta({
      ...meta,
      shards: meta.shards - u.cost,
      upgrades: { ...meta.upgrades, [u.id]: currentLevel + 1 }
    });
  };

  const buySkin = (s) => {
    if (meta.skins.includes(s.id)) {
      saveMeta({ ...meta, activeSkin: s.id });
    } else if (meta.shards >= s.cost) {
      saveMeta({
        ...meta,
        shards: meta.shards - s.cost,
        skins: [...meta.skins, s.id],
        activeSkin: s.id
      });
    }
  };

  return (
    <>
      <style>{`
        .bg-void { background: radial-gradient(circle at center, #0a0a1a 0%, #010105 100%); width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; color: #fff; font-family: monospace; overflow: hidden; user-select: none; }
        .glass-panel { background: rgba(20, 20, 35, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(136, 85, 255, 0.3); border-radius: 20px; padding: 40px; box-shadow: 0 0 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(136,85,255,0.1); }
        .btn-neon { background: transparent; color: #fff; border: 2px solid #8855ff; padding: 12px 24px; font-size: 18px; font-family: monospace; font-weight: bold; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 2px; }
        .btn-neon:hover:not(:disabled) { background: #8855ff; box-shadow: 0 0 20px #8855ff; transform: scale(1.05); }
        .btn-neon:disabled { border-color: #444; color: #666; cursor: not-allowed; }
        .btn-glow { box-shadow: 0 0 15px currentColor; }
        .title-glitch { font-size: 72px; font-weight: 900; margin: 0 0 20px 0; color: #fff; text-shadow: 3px 3px 0 #ff00ff, -3px -3px 0 #00e5ff; letter-spacing: 5px; animation: float 4s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        .shop-grid { display: grid; grid-template-columns: 1fr; gap: 15px; max-height: 400px; overflow-y: auto; padding-right: 10px; }
        .shop-grid::-webkit-scrollbar { width: 6px; }
        .shop-grid::-webkit-scrollbar-thumb { background: #8855ff; border-radius: 3px; }
      `}</style>

      <div className="bg-void" 
           onKeyDown={(e) => handleInput(e, 'down')} 
           onMouseDown={() => keys.current["click"] = true}
           onTouchStart={() => keys.current["click"] = true}
           tabIndex={0}>

        {/* ── MAIN MENU ── */}
        {screen === "menu" && (
          <div className="glass-panel" style={{ textAlign: "center", width: 600 }}>
            <h1 className="title-glitch">Flappy Bird</h1>
            <div style={{ fontSize: 24, color: "#00e5ff", marginBottom: 30, fontWeight: "bold" }}>HIGH SCORE: {meta.highscore} | 💎 {meta.shards}</div>
            
            <button className="btn-neon" style={{ fontSize: 28, padding: "20px 40px", marginBottom: 30, width: "100%", background: "rgba(136,85,255,0.2)" }} onClick={startGame}>
              Play
            </button>
            
            <div style={{ display: "flex", gap: 15, justifyContent: "center" }}>
              <button className="btn-neon" onClick={() => setScreen("shop")} style={{ flex: 1 }}>UPGRADES</button>
              <button className="btn-neon" onClick={() => setScreen("skins")} style={{ flex: 1 }}>SKINS</button>
            </div>
          </div>
        )}

        {/* ── SHOP: UPGRADES ── */}
        {screen === "shop" && (
          <div className="glass-panel" style={{ width: 650 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: "#8855ff", textShadow: "0 0 10px #8855ff" }}>HARDWARE UPGRADES</h2>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#00e5ff" }}>💎 {meta.shards}</div>
            </div>
            
            <div className="shop-grid">
              {UPGRADES.map(u => {
                const lvl = meta.upgrades[u.id] || 0;
                const isMax = lvl >= u.max;
                return (
                  <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.4)", padding: "15px 20px", borderRadius: 10, borderLeft: "4px solid #8855ff" }}>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 20, fontWeight: "bold" }}>{u.name} <span style={{ color: "#8855ff" }}>[LVL {lvl}/{u.max}]</span></div>
                      <div style={{ color: "#aaa", fontSize: 14, marginTop: 5 }}>{u.desc}</div>
                    </div>
                    <button className="btn-neon" onClick={() => buyUpgrade(u)} disabled={isMax || meta.shards < u.cost} style={{ width: 140 }}>
                      {isMax ? "MAXED" : `💎 ${u.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="btn-neon" style={{ marginTop: 20, width: "100%", borderColor: "#ff4444", color: "#ff4444" }} onClick={() => setScreen("menu")}>CLOSE TERMINAL</button>
          </div>
        )}

        {/* ── SHOP: SKINS ── */}
        {screen === "skins" && (
          <div className="glass-panel" style={{ width: 650 }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: "#00e5ff", textShadow: "0 0 10px #00e5ff" }}>VISUAL OVERRIDES</h2>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#00e5ff" }}>💎 {meta.shards}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
              {SKINS.map(s => {
                const owned = meta.skins.includes(s.id);
                const active = meta.activeSkin === s.id;
                return (
                  <button key={s.id} onClick={() => buySkin(s)} disabled={!owned && meta.shards < s.cost}
                          className="btn-neon" 
                          style={{ 
                            height: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            borderColor: s.col, color: active ? "#fff" : s.col,
                            background: active ? s.col : owned ? `rgba(255,255,255,0.05)` : "transparent",
                            boxShadow: active ? `0 0 15px ${s.col}` : "none"
                          }}>
                    <span style={{ fontSize: 18, fontWeight: "bold", textShadow: `0 0 5px ${s.col}` }}>{s.name}</span>
                    <span style={{ fontSize: 14, marginTop: 5 }}>{active ? "EQUIPPED" : owned ? "SELECT" : `💎 ${s.cost}`}</span>
                  </button>
                );
              })}
            </div>
            <button className="btn-neon" style={{ marginTop: 20, width: "100%", borderColor: "#ff4444", color: "#ff4444" }} onClick={() => setScreen("menu")}>CLOSE TERMINAL</button>
          </div>
        )}

        {/* ── GAME CANVAS ── */}
        {screen === "playing" && (
          <canvas ref={canvasRef} width={W} height={H} 
                  style={{ borderRadius: 16, border: "1px solid rgba(136,85,255,0.4)", boxShadow: "0 0 40px rgba(0,0,0,0.8)", background: "#000", cursor: "crosshair" }} />
        )}

        {/* ── DEATH SCREEN ── */}
        {screen === "dead" && (
          <div className="glass-panel" style={{ textAlign: "center", position: "absolute", zIndex: 10, animation: "float 3s ease-in-out infinite" }}>
            <h1 style={{ color: "#ff003c", fontSize: 60, margin: 0, textShadow: "0 0 20px #ff003c" }}>SYSTEM FAILURE</h1>
            <div style={{ margin: "30px 0", background: "rgba(0,0,0,0.5)", padding: 20, borderRadius: 10 }}>
              <div style={{ fontSize: 24, color: "#aaa" }}>SCORE SECURED</div>
              <div style={{ fontSize: 48, fontWeight: "bold", color: "#fff", textShadow: "0 0 15px #fff" }}>{lastScore}</div>
            </div>
            
            <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
              <button className="btn-neon" onClick={startGame} style={{ fontSize: 20, padding: "15px 30px", background: "rgba(136,85,255,0.2)" }}>REBOOT</button>
              <button className="btn-neon" onClick={() => setScreen("menu")} style={{ fontSize: 20, padding: "15px 30px", borderColor: "#aaa", color: "#aaa" }}>MENU</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}