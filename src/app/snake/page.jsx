'use client';
import React, { useState, useRef, useEffect } from "react";

// ============================================================================
// ── CONSTANTS & CONFIG ──────────────────────────────────────────────────────
// ============================================================================
const GRID = 20;
const W = 800, H = 600;
const COLS = W / GRID;
const ROWS = H / GRID;
const STORAGE_KEY = "SNAKE_PERFECT_V4";

// Fruit Types: 'life' is in frames (approx 100 frames = 10 seconds at normal speed)
const TYPES = {
  APPLE: { icon: "🍎", col: "#ff3333", score: 10, shard: 1, grow: 1, prob: 0.65, life: Infinity },
  GRAPE: { icon: "🍇", col: "#b833ff", score: 30, shard: 3, grow: 2, prob: 0.15, life: 150 },
  CRYSTAL: { icon: "💎", col: "#00e5ff", score: 100, shard: 15, grow: 0, prob: 0.08, life: 80 },
  POISON: { icon: "☠️", col: "#33ff33", score: -50, shard: 0, grow: -3, prob: 0.12, bad: true, life: 120 }
};

const SKINS = [
  { id: "classic", name: "Classic Green", hex: "#00ff88", cost: 0 },
  { id: "neon", name: "Neon Blue", hex: "#00e5ff", cost: 100 },
  { id: "lava", name: "Lava Red", hex: "#ff3333", cost: 300 },
  { id: "gold", name: "Pure Gold", hex: "#ffcc00", cost: 800 },
  { id: "void", name: "Dark Matter", hex: "#9900ff", cost: 1500 }
];

const DEFAULT_SAVE = { shards: 0, highscore: 0, skins: ["classic"], activeSkin: "classic" };

// ============================================================================
// ── GAME ENGINE ─────────────────────────────────────────────────────────────
// ============================================================================
export default function PerfectSnake() {
  const canvasRef = useRef(null);
  const [screen, setScreen] = useState("menu"); 
  const [save, setSave] = useState(DEFAULT_SAVE);
  
  const gs = useRef(null);
  const keys = useRef({});

  // ─── LOAD/SAVE ───
  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try { setSave({ ...DEFAULT_SAVE, ...JSON.parse(data) }); } 
      catch (e) { console.error("Save error"); }
    }
  }, []);

  const syncSave = (newSave) => {
    setSave(newSave);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSave));
  };

  // ─── GAME LOGIC ───
  const initGame = (reviving = false) => {
    if (!reviving) {
      gs.current = {
        snake: [{ x: 10, y: 15 }, { x: 9, y: 15 }, { x: 8, y: 15 }],
        dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 },
        fruits: [], particles: [], floaters: [],
        score: 0, sessionShards: 0,
        combo: 1, comboTimer: 0, // Combo system added
        frame: 0, isDead: false, shake: 0, invincible: 0,
        skin: SKINS.find(s => s.id === save.activeSkin) || SKINS[0]
      };
      // Spawn initial fruits
      spawnFruit(TYPES.APPLE);
      spawnRandomFruit();
    } else {
      gs.current.isDead = false;
      gs.current.invincible = 150; 
      gs.current.fruits = gs.current.fruits.filter(f => !f.bad);
    }
    setScreen("playing");
  };

  const spawnRandomFruit = () => {
    let r = Math.random();
    let type = TYPES.APPLE;
    let sum = 0;
    for (const key in TYPES) {
      sum += TYPES[key].prob;
      if (r <= sum) { type = TYPES[key]; break; }
    }
    spawnFruit(type);
  };

  const spawnFruit = (type) => {
    // Prevent spawning inside snake or other fruits
    let x, y, valid;
    do {
      valid = true;
      x = Math.floor(Math.random() * (COLS - 2)) + 1;
      y = Math.floor(Math.random() * (ROWS - 2)) + 1;
      
      for (let s of gs.current.snake) if (s.x === x && s.y === y) valid = false;
      for (let f of gs.current.fruits) if (f.x === x && f.y === y) valid = false;
    } while (!valid);

    gs.current.fruits.push({ x, y, ...type, maxLife: type.life });
  };

  const addParticles = (x, y, col) => {
    for (let i = 0; i < 12; i++) {
      gs.current.particles.push({
        x: x * GRID + GRID/2, y: y * GRID + GRID/2,
        vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
        life: 25, col
      });
    }
  };

  const triggerDeath = () => {
    gs.current.isDead = true;
    gs.current.shake = 20;
    
    syncSave({
      ...save,
      shards: save.shards + gs.current.sessionShards,
      highscore: Math.max(save.highscore, gs.current.score)
    });
    
    setTimeout(() => setScreen("dead"), 800); 
  };

  // ─── LOOP ───
  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let lastMove = 0;

    const loop = (time) => {
      const g = gs.current;
      g.frame++;

      // Combo depletion
      if (g.comboTimer > 0) {
        g.comboTimer--;
        if (g.comboTimer === 0) g.combo = 1;
      }

      // Fast speed on Spacebar
      const tickRate = keys.current[" "] ? 45 : 90;

      if (time - lastMove > tickRate && !g.isDead) {
        lastMove = time;
        
        if (g.nextDir.x !== 0 && g.dir.x === 0) g.dir = { ...g.nextDir };
        if (g.nextDir.y !== 0 && g.dir.y === 0) g.dir = { ...g.nextDir };

        const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };

        // Wall Collision
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
          if (g.invincible > 0) {
            head.x = (head.x + COLS) % COLS;
            head.y = (head.y + ROWS) % ROWS;
          } else {
            triggerDeath();
          }
        }

        // Tail Collision
        if (!g.isDead && g.invincible <= 0) {
          for (let i = 0; i < g.snake.length; i++) {
            if (head.x === g.snake[i].x && head.y === g.snake[i].y) triggerDeath();
          }
        }

        if (!g.isDead) {
          g.snake.unshift(head);
          let ate = false;

          // Process Fruits
          for (let i = g.fruits.length - 1; i >= 0; i--) {
            const f = g.fruits[i];
            
            // Lifespan Logic (Vanishing items)
            if (f.life !== Infinity) {
              f.life--;
              if (f.life <= 0) {
                g.particles.push({ x: f.x*GRID+GRID/2, y: f.y*GRID+GRID/2, vx:0, vy:-2, life: 15, col: "#555" });
                g.fruits.splice(i, 1);
                if (!f.bad) spawnRandomFruit(); // replace good items if they vanish
                continue;
              }
            }

            // Eating logic
            if (head.x === f.x && head.y === f.y) {
              ate = true;
              addParticles(f.x, f.y, f.col);
              
              if (f.bad) {
                g.shake = 10;
                g.combo = 1;
                g.comboTimer = 0;
                g.score += f.score; 
                if (g.score < 0) g.score = 0;
                
                const shrinkCount = Math.abs(f.grow);
                for(let s=0; s<shrinkCount; s++) if(g.snake.length > 3) g.snake.pop();
                
                g.floaters.push({ x: f.x * GRID, y: f.y * GRID, txt: "POISONED!", col: f.col, life: 40 });
              } else {
                // Good item eaten
                const points = f.score * g.combo;
                g.score += points;
                g.sessionShards += f.shard;
                
                // Increase Combo
                g.combo = Math.min(5, g.combo + 1);
                g.comboTimer = 100; // time to get next item

                g.floaters.push({ x: f.x * GRID, y: f.y * GRID, txt: `+${points}`, col: f.col, life: 30 });
              }

              g.fruits.splice(i, 1);
              spawnRandomFruit();
              
              // Maintain minimum 1 apple on screen logic
              if (g.fruits.filter(fr => fr.icon === TYPES.APPLE.icon).length === 0) {
                 spawnFruit(TYPES.APPLE);
              }
            }
          }

          if (!ate) g.snake.pop();
        }
      }

      // Cleanup & render
      if (g.invincible > 0) g.invincible--;
      g.shake *= 0.8;
      g.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
      g.particles = g.particles.filter(p => p.life > 0);
      g.floaters.forEach(f => { f.y -= 1.5; f.life--; });
      g.floaters = g.floaters.filter(f => f.life > 0);

      render(ctx, g);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen]);

  const render = (ctx, g) => {
    ctx.save();
    
    if (g.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
    }

    // BG
    ctx.fillStyle = "#0d0d1a";
    ctx.fillRect(0, 0, W, H);

    // Subtle Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += GRID) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += GRID) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // Fruits & Lifespan indicators
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    g.fruits.forEach(f => {
      // Draw fruit
      ctx.fillText(f.icon, f.x * GRID + GRID/2, f.y * GRID + GRID/2);
      
      // Draw lifespan bar if temporary
      if (f.life !== Infinity) {
        const pct = f.life / f.maxLife;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(f.x * GRID + 2, f.y * GRID + GRID - 4, GRID - 4, 3);
        ctx.fillStyle = pct > 0.3 ? f.col : "#ff0000";
        ctx.fillRect(f.x * GRID + 2, f.y * GRID + GRID - 4, (GRID - 4) * pct, 3);
      }
    });

    // Particles
    g.particles.forEach(p => {
      ctx.fillStyle = p.col;
      ctx.globalAlpha = p.life / 25;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Snake
    const isBlinking = g.invincible > 0 && Math.floor(g.frame / 5) % 2 === 0;
    if (!isBlinking) {
      g.snake.forEach((s, i) => {
        const isHead = i === 0;
        ctx.fillStyle = isHead ? "#ffffff" : g.skin.hex;
        ctx.shadowBlur = isHead ? 15 : 8;
        ctx.shadowColor = g.skin.hex;
        
        ctx.beginPath();
        ctx.roundRect(s.x * GRID + 1, s.y * GRID + 1, GRID - 2, GRID - 2, 6);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }

    // Floaters
    ctx.font = "bold 18px 'Inter', sans-serif";
    g.floaters.forEach(f => {
      ctx.fillStyle = f.col;
      ctx.globalAlpha = f.life / 30;
      ctx.shadowBlur = 10;
      ctx.shadowColor = f.col;
      ctx.fillText(f.txt, f.x + GRID/2, f.y);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // HUD Header
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, W, 50);
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(0, 50, W, 2); // Bottom border line for HUD

    // Score & Shards
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${g.score}`, 20, 25);
    
    ctx.fillStyle = "#00e5ff";
    ctx.textAlign = "right";
    ctx.fillText(`💎 ${save.shards + g.sessionShards}`, W - 20, 25);

    // Combo Meter
    if (g.combo > 1) {
      ctx.textAlign = "center";
      ctx.fillStyle = g.combo === 5 ? "#ffcc00" : "#b833ff";
      ctx.font = "bold 24px 'Inter', sans-serif";
      ctx.fillText(`${g.combo}x COMBO`, W / 2, 25);
      
      // Combo bar
      const barW = 100;
      const pct = g.comboTimer / 100;
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(W/2 - barW/2, 40, barW, 4);
      ctx.fillStyle = g.combo === 5 ? "#ffcc00" : "#b833ff";
      ctx.fillRect(W/2 - barW/2, 40, barW * pct, 4);
    }

    ctx.restore();
  };

  // ─── INPUTS ───
  useEffect(() => {
    const down = (e) => {
      keys.current[e.key] = true;
      if (!gs.current) return;
      const key = e.key.toLowerCase();
      if ((key === "arrowup" || key === "w")) gs.current.nextDir = { x: 0, y: -1 };
      if ((key === "arrowdown" || key === "s")) gs.current.nextDir = { x: 0, y: 1 };
      if ((key === "arrowleft" || key === "a")) gs.current.nextDir = { x: -1, y: 0 };
      if ((key === "arrowright" || key === "d")) gs.current.nextDir = { x: 1, y: 0 };
    };
    const up = (e) => keys.current[e.key] = false;
    
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const handleRevive = () => {
    if (save.shards >= 50) {
      syncSave({ ...save, shards: save.shards - 50 });
      initGame(true);
    }
  };

  const handleBuySkin = (skin) => {
    if (save.skins.includes(skin.id)) {
      syncSave({ ...save, activeSkin: skin.id });
    } else if (save.shards >= skin.cost) {
      syncSave({ 
        ...save, 
        shards: save.shards - skin.cost, 
        skins: [...save.skins, skin.id], 
        activeSkin: skin.id 
      });
    }
  };

  // ─── UI COMPONENTS ───
  return (
    <div className="bg-arcade">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        .bg-arcade { background: radial-gradient(circle at top, #1a1a2e 0%, #0f0f1a 100%); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; user-select: none; color: white; }
        .panel { background: rgba(20, 20, 35, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 10px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(0, 229, 255, 0.05); width: 450px; }
        .btn { display: block; width: 100%; background: rgba(0,0,0,0.4); color: #fff; border: 1px solid #555; padding: 16px; margin-bottom: 12px; font-size: 16px; font-weight: 800; border-radius: 12px; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); text-transform: uppercase; letter-spacing: 1px; }
        .btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.4); border-color: #fff; }
        .btn:active:not(:disabled) { transform: translateY(0); }
        .btn-primary { border-color: #00e5ff; color: #00e5ff; box-shadow: 0 0 10px rgba(0,229,255,0.2); }
        .btn-primary:hover:not(:disabled) { background: #00e5ff; color: #000; box-shadow: 0 0 25px rgba(0,229,255,0.6); }
        .btn-warning { border-color: #ffcc00; color: #ffcc00; box-shadow: 0 0 10px rgba(255,204,0,0.2); }
        .btn-warning:hover:not(:disabled) { background: #ffcc00; color: #000; box-shadow: 0 0 25px rgba(255,204,0,0.6); }
        .btn-danger { border-color: #ff3333; color: #ff3333; }
        .btn-danger:hover:not(:disabled) { background: #ff3333; color: #000; box-shadow: 0 0 25px rgba(255,51,51,0.6); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        
        h1 { font-size: 54px; font-weight: 900; margin: 0 0 15px; letter-spacing: 2px; text-shadow: 0 0 30px rgba(0,229,255,0.4); background: linear-gradient(135deg, #fff, #00e5ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .title-dead { background: linear-gradient(135deg, #fff, #ff3333); text-shadow: 0 0 30px rgba(255,51,51,0.5); }
        .stat-box { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.05); }
        .canvas-wrap { position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(0,229,255,0.1); padding: 5px; background: rgba(255,255,255,0.02); }
      `}</style>

      {/* GAME CANVAS */}
      {screen === "playing" && (
        <div className="canvas-wrap">
          <canvas ref={canvasRef} width={W} height={H} style={{ borderRadius: 12, display: "block" }} />
        </div>
      )}

      {/* MAIN MENU */}
      {screen === "menu" && (
        <div className="panel">
          <h1>SNAKE</h1>
          <div className="stat-box">
            <div style={{ color: "#aaa", fontSize: 14, fontWeight: "bold", letterSpacing: 1 }}>HIGHSCORE</div>
            <div style={{ fontSize: 32, fontWeight: 900, margin: "5px 0" }}>{save.highscore}</div>
            <div style={{ color: "#00e5ff", fontSize: 18, fontWeight: "bold" }}>💎 {save.shards}</div>
          </div>
          <button className="btn btn-primary" onClick={() => initGame(false)}>Play Now</button>
          <button className="btn" onClick={() => setScreen("store")}>Skin Store</button>
        </div>
      )}

      {/* DEATH SCREEN */}
      {screen === "dead" && (
        <div className="panel">
          <h1 className="title-dead">CRASHED</h1>
          <div className="stat-box">
            <div style={{ color: "#aaa", fontSize: 14, fontWeight: "bold" }}>FINAL SCORE</div>
            <div style={{ fontSize: 42, fontWeight: 900, margin: "5px 0" }}>{gs.current?.score}</div>
            <div style={{ color: "#00e5ff", fontSize: 16, fontWeight: "bold" }}>+ {gs.current?.sessionShards} 💎 EARNED</div>
          </div>
          
          <button className="btn btn-warning" onClick={handleRevive} disabled={save.shards < 50}>
            Revive (💎 50)
          </button>
          <button className="btn btn-primary" onClick={() => initGame(false)}>Retry</button>
          <button className="btn" onClick={() => setScreen("menu")}>Main Menu</button>
        </div>
      )}

      {/* STORE SCREEN */}
      {screen === "store" && (
        <div className="panel" style={{ width: 600 }}>
          <h1 style={{ fontSize: 36 }}>SKIN STORE</h1>
          <div style={{ color: "#00e5ff", marginBottom: 25, fontSize: 22, fontWeight: "bold" }}>💎 {save.shards}</div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 25 }}>
            {SKINS.map(skin => {
              const owned = save.skins.includes(skin.id);
              const active = save.activeSkin === skin.id;
              return (
                <button 
                  key={skin.id} 
                  className="btn"
                  disabled={!owned && save.shards < skin.cost}
                  onClick={() => handleBuySkin(skin)}
                  style={{
                    borderColor: active ? skin.hex : owned ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                    color: active ? "#000" : skin.hex,
                    background: active ? skin.hex : "rgba(0,0,0,0.3)",
                    boxShadow: active ? `0 0 15px ${skin.hex}` : "none",
                    margin: 0, padding: "20px 10px"
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 18 }}>{skin.name}</div>
                  <div style={{ fontSize: 14, color: active ? "#000" : owned ? "#fff" : skin.hex }}>
                    {active ? "EQUIPPED" : owned ? "SELECT" : `💎 ${skin.cost}`}
                  </div>
                </button>
              );
            })}
          </div>
          
          <button className="btn" onClick={() => setScreen("menu")}>Back to Menu</button>
        </div>
      )}
    </div>
  );
}