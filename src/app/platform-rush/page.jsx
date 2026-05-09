'use client';

import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════
//  STORAGE — unique namespace
// ═══════════════════════════════════════════════════
const NS = "GZ_PlatformRush_v2";
const loadStore = () => {
  try {
    const d = JSON.parse(localStorage.getItem(NS) || "{}");
    return {
      coins: d.coins ?? 0,
      best: d.best ?? 0,
      gamesPlayed: d.gamesPlayed ?? 0,
      totalDistance: d.totalDistance ?? 0,
      bestCombo: d.bestCombo ?? 0,
      worldsUnlocked: d.worldsUnlocked ?? [0],
      achievements: d.achievements ?? {},
      ownedItems: d.ownedItems ?? ["skin_default"],
      equippedSkin: d.equippedSkin ?? "skin_default",
      upgrades: d.upgrades ?? {},
      leaderboard: d.leaderboard ?? [],
      dailyStreak: d.dailyStreak ?? 0,
      lastPlayDate: d.lastPlayDate ?? "",
      powerupLevels: d.powerupLevels ?? {},
    };
  } catch { return loadStore.defaults(); }
};
loadStore.defaults = () => ({
  coins:0, best:0, gamesPlayed:0, totalDistance:0, bestCombo:0,
  worldsUnlocked:[0], achievements:{}, ownedItems:["skin_default"],
  equippedSkin:"skin_default", upgrades:{}, leaderboard:[],
  dailyStreak:0, lastPlayDate:"", powerupLevels:{},
});
const saveStore = (d) => { try { localStorage.setItem(NS, JSON.stringify(d)); } catch {} };

// ═══════════════════════════════════════════════════
//  WORLD CONFIGS
// ═══════════════════════════════════════════════════
const WORLDS = [
  {
    id: 0, name: "Neon City",
    sky: ["#0d0221","#150a3a"], ground: "#1a0a2e",
    accent: "#ff00ff", accent2: "#00ffff", platformColor: "#2d1b4e",
    platformTop: "#ff00ff", particleColor: "#ff00ff",
    fogColor: "rgba(255,0,255,0.04)",
    gravity: 0.58, bgObjects: "buildings",
    hazard: "spikes", special: "spring",
    unlockCost: 0,
  },
  {
    id: 1, name: "Lava Zone",
    sky: ["#1a0500","#2d0a00"], ground: "#3d0a00",
    accent: "#ff4400", accent2: "#ffaa00", platformColor: "#3d1500",
    platformTop: "#ff6600", particleColor: "#ff4400",
    fogColor: "rgba(255,68,0,0.05)",
    gravity: 0.65, bgObjects: "rocks",
    hazard: "lava", special: "launch",
    unlockCost: 500,
  },
  {
    id: 2, name: "Ice Tundra",
    sky: ["#010d1a","#02152b"], ground: "#011829",
    accent: "#00ccff", accent2: "#aaeeff", platformColor: "#0a2a3d",
    platformTop: "#00ccff", particleColor: "#aaeeff",
    fogColor: "rgba(0,204,255,0.04)",
    gravity: 0.45, bgObjects: "crystals",
    hazard: "icicles", special: "slide",
    unlockCost: 1200,
  },
  {
    id: 3, name: "Space Void",
    sky: ["#000005","#00000f"], ground: "#050510",
    accent: "#7700ff", accent2: "#ff77ff", platformColor: "#0a0020",
    platformTop: "#7700ff", particleColor: "#ff77ff",
    fogColor: "rgba(119,0,255,0.04)",
    gravity: 0.28, bgObjects: "stars",
    hazard: "blackhole", special: "zerograv",
    unlockCost: 2500,
  },
  {
    id: 4, name: "Cyber Grid",
    sky: ["#001a00","#002a00"], ground: "#001500",
    accent: "#00ff88", accent2: "#ffff00", platformColor: "#001a0a",
    platformTop: "#00ff88", particleColor: "#00ff88",
    fogColor: "rgba(0,255,136,0.04)",
    gravity: 0.62, bgObjects: "grid",
    hazard: "laser", special: "warp",
    unlockCost: 5000,
  },
];

// ═══════════════════════════════════════════════════
//  SHOP ITEMS
// ═══════════════════════════════════════════════════
const SHOP_ITEMS = [
  // Skins
  { id:"skin_default", name:"Rusher",      cat:"skin", price:0,    color:"#ffee44", desc:"The original" },
  { id:"skin_fire",    name:"Blazer",      cat:"skin", price:300,  color:"#ff4400", desc:"Trails fire" },
  { id:"skin_ice",     name:"Frost",       cat:"skin", price:300,  color:"#00ccff", desc:"Leaves ice shards" },
  { id:"skin_void",    name:"Void",        cat:"skin", price:600,  color:"#7700ff", desc:"Bends reality" },
  { id:"skin_ghost",   name:"Phantom",     cat:"skin", price:800,  color:"#aaffee", desc:"Semi-transparent" },
  { id:"skin_gold",    name:"Gilded",      cat:"skin", price:1500, color:"#ffd700", desc:"Flex on everyone" },

  // Power-ups (consumable, used per run)
  { id:"pu_shield",   name:"Shield",      cat:"powerup", price:80,  icon:"🛡", desc:"One free hit this run" },
  { id:"pu_magnet",   name:"Magnet",      cat:"powerup", price:60,  icon:"🧲", desc:"Auto-collect orbs 15s" },
  { id:"pu_double",   name:"2× Score",    cat:"powerup", price:100, icon:"✖", desc:"Double score 20s" },
  { id:"pu_ghost",    name:"Ghost",       cat:"powerup", price:120, icon:"👻", desc:"Phase through hazards 12s" },
  { id:"pu_rocket",   name:"Rocket",      cat:"powerup", price:150, icon:"🚀", desc:"Burst upward instantly" },
  { id:"pu_timeslow", name:"Time Warp",   cat:"powerup", price:200, icon:"⏱", desc:"World slows 10s" },
  { id:"pu_coinburst",name:"Coin Rain",   cat:"powerup", price:90,  icon:"💰", desc:"+200 coins instantly" },

  // Upgrades (permanent)
  { id:"upg_startspeed", name:"Head Start",  cat:"upgrade", price:400,  maxLevel:3, desc:"Start faster each run", icon:"⚡" },
  { id:"upg_dashcount",  name:"Dash Master", cat:"upgrade", price:350,  maxLevel:3, desc:"Shorter dash cooldown",  icon:"💨" },
  { id:"upg_orbvalue",   name:"Gold Finder", cat:"upgrade", price:500,  maxLevel:3, desc:"Orbs worth +50% coins",  icon:"🪙" },
  { id:"upg_lives",      name:"Extra Life",  cat:"upgrade", price:800,  maxLevel:2, desc:"Start with +1 life",     icon:"❤️" },
  { id:"upg_combo",      name:"Combo God",   cat:"upgrade", price:600,  maxLevel:3, desc:"Combo timer lasts longer",icon:"🔥" },
];

// ═══════════════════════════════════════════════════
//  ACHIEVEMENTS
// ═══════════════════════════════════════════════════
const ACHIEVEMENTS = [
  { id:"first",    name:"Respawned",      desc:"Play your first run",         icon:"🔥", reward:50  },
  { id:"s500",     name:"Getting There",  desc:"Score 500",                   icon:"⚡", reward:30  },
  { id:"s2000",    name:"On Fire",        desc:"Score 2,000",                 icon:"💥", reward:80  },
  { id:"s5000",    name:"Legendary",      desc:"Score 5,000",                 icon:"👑", reward:200 },
  { id:"s10000",   name:"Immortal",       desc:"Score 10,000",                icon:"🌟", reward:500 },
  { id:"combo10",  name:"Combo Machine",  desc:"Reach ×10 combo",             icon:"🎯", reward:100 },
  { id:"dist1000", name:"Long Runner",    desc:"Travel 1,000m",               icon:"🏃", reward:150 },
  { id:"w3",       name:"World Hopper",   desc:"Reach world 3",               icon:"🌍", reward:200 },
  { id:"g20",      name:"Addicted",       desc:"Play 20 games",               icon:"🎮", reward:100 },
  { id:"portal5",  name:"Portal Surfer",  desc:"Use 5 portals in one run",    icon:"🌀", reward:120 },
  { id:"nodash",   name:"No Dash Run",    desc:"Score 1000 without dashing",  icon:"🧘", reward:250 },
  { id:"allworld", name:"Dimension Lord", desc:"Unlock all worlds",           icon:"🔮", reward:1000},
];

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function PlatformRush() {
  const [screen, setScreen] = useState("menu"); // menu | game | gameover | shop | leaderboard | worlds
  const [store, setStore] = useState(loadStore);
  const [runStats, setRunStats] = useState(null);
  const [toastQueue, setToastQueue] = useState([]);
  const [selectedPowerups, setSelectedPowerups] = useState([]); // up to 2 powerups to bring
  const [shopTab, setShopTab] = useState("skin");
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const rafRef = useRef(null);
  const pausedRef = useRef(false);

  // persist store
  const updateStore = useCallback((fn) => {
    setStore(prev => {
      const next = typeof fn === "function" ? fn(prev) : { ...prev, ...fn };
      saveStore(next);
      return next;
    });
  }, []);

  // toast system
  const pushToast = useCallback((toast) => {
    setToastQueue(q => [...q, { ...toast, id: Date.now() + Math.random() }]);
  }, []);

  useEffect(() => {
    if (!toastQueue.length) return;
    const t = setTimeout(() => setToastQueue(q => q.slice(1)), 3500);
    return () => clearTimeout(t);
  }, [toastQueue]);

  // ── GAME INIT ──
  const startGame = useCallback((worldId = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth || window.innerWidth;
    const H = canvas.offsetHeight || window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const world = WORLDS[worldId] ?? WORLDS[0];
    const upgrades = store.upgrades;
    const startLives = 3 + (upgrades.upg_lives ?? 0);
    const dashCooldownBase = 180 - (upgrades.upg_dashcount ?? 0) * 30;
    const startSpeed = 1 + (upgrades.upg_startspeed ?? 0) * 0.15;

    const GROUND_Y = H * 0.78;

    // Build active powerups for this run
    const runPowerups = {};
    selectedPowerups.forEach(id => { runPowerups[id] = true; });

    const G = {
      W, H, GROUND_Y,
      world, worldId,
      score: 0, coins: 0, distance: 0,
      level: 1, lives: startLives,
      combo: 0, maxCombo: 0,
      comboTimer: 0,
      dashCount: 0, portalsUsed: 0,
      frameCount: 0, worldX: 0,
      speedMult: startSpeed,
      gravity: world.gravity,
      gameOver: false,
      dashCooldownBase,
      noDashRun: true,
      doubleScoreActive: 0,
      magnetActive: 0,
      ghostActive: 0,
      timeSlowActive: 0,
      shieldActive: runPowerups.pu_shield ? 1 : 0,
      runPowerups,

      // world-specific
      zeroGravZone: false,
      zeroGravTimer: 0,

      player: {
        x: W * 0.22, y: GROUND_Y - 60,
        w: 26, h: 34,
        vx: 0, vy: 0,
        onGround: false, onPlatform: false,
        jumpsLeft: 2,
        facing: 1,
        dashCooldown: 0, dashActive: 0,
        invincible: 180, // start with invincibility
        trailPts: [],
        dead: false,
      },

      bgParticles: buildBgParticles(W, H, world),
      platforms: [],
      orbs: [],
      hazards: [],
      specials: [], // springs, launchers, portals, zerograv zones
      particles: [],
      floatTexts: [],
      inWorldPowerups: [],

      input: { left:false, right:false, jump:false, dash:false },
      prevInput: { jump:false, dash:false },

      orbValueMult: 1 + (upgrades.upg_orbvalue ?? 0) * 0.5,
      comboTimerBase: 200 + (upgrades.upg_combo ?? 0) * 50,
    };

    // Apply coin rain powerup immediately
    if (runPowerups.pu_coinburst) {
      G.coins += 200;
      updateStore(s => ({ ...s, coins: s.coins + 200 }));
    }

    // Initial ground
    G.platforms.push({ x: -300, y: GROUND_Y, w: W + 600, h: 40, type: "ground", solid: true });

    // Starting safe platforms
    let px = W * 0.35;
    for (let i = 0; i < 10; i++) {
      px += 130 + i * 10;
      const py = GROUND_Y - 90 - Math.random() * 120;
      G.platforms.push(makePlat(px, py, G));
    }

    gameRef.current = G;
    setScreen("game");

    pausedRef.current = false;
    let lastTs = performance.now();

    const loop = (ts) => {
      if (pausedRef.current) return;
      const rawDt = Math.min((ts - lastTs) / 16.67, 3);
      lastTs = ts;
      const dt = G.timeSlowActive > 0 ? rawDt * 0.35 : rawDt;

      updateGame(G, dt, rawDt, updateStore, pushToast);
      renderGame(G, canvas);

      if (!G.gameOver) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        finishRun(G, store, updateStore, setRunStats, setScreen, pushToast);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [store, selectedPowerups, updateStore, pushToast]);

  // keyboard
  useEffect(() => {
    const down = (e) => {
      if (!gameRef.current) return;
      const G = gameRef.current;
      if (e.code === "ArrowLeft"  || e.code === "KeyA") G.input.left  = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") G.input.right = true;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") { G.input.jump = true; e.preventDefault(); }
      if (e.code === "ShiftLeft"  || e.code === "ShiftRight") G.input.dash = true;
      if ((e.code === "KeyP" || e.code === "Escape") && screen === "game") {
        pausedRef.current = !pausedRef.current;
        if (!pausedRef.current) { let lt = performance.now(); rafRef.current = requestAnimationFrame(function loop(ts){ if(pausedRef.current)return; gameRef.current&&updateGame(gameRef.current,(Math.min((ts-lt)/16.67,3)),Math.min((ts-lt)/16.67,3),updateStore,pushToast); gameRef.current&&renderGame(gameRef.current,canvasRef.current); if(gameRef.current&&!gameRef.current.gameOver)rafRef.current=requestAnimationFrame(loop); else if(gameRef.current?.gameOver)finishRun(gameRef.current,store,updateStore,setRunStats,setScreen,pushToast); lt=ts; }); }
      }
    };
    const up = (e) => {
      if (!gameRef.current) return;
      const G = gameRef.current;
      if (e.code === "ArrowLeft"  || e.code === "KeyA") G.input.left  = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") G.input.right = false;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") G.input.jump = false;
      if (e.code === "ShiftLeft"  || e.code === "ShiftRight") G.input.dash = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [screen, store, updateStore, pushToast]);

  // cleanup on unmount
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── RENDER ──
  return (
    <div style={{ width:"100vw", height:"100vh", background:"#000", overflow:"hidden", position:"relative",
      fontFamily:"'Orbitron', 'Rajdhani', monospace", userSelect:"none" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#111; } ::-webkit-scrollbar-thumb { background:#444; border-radius:2px; }
        button { cursor:pointer; border:none; outline:none; font-family:inherit; }
        .fade-in { animation: fadeIn 0.35s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
        @keyframes slideDown { from{transform:translateY(-80px) translateX(-50%)} to{transform:translateY(0) translateX(-50%)} }
        @keyframes floatUp { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-50px) scale(1.2)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glow { 0%,100%{text-shadow:0 0 20px currentColor} 50%{text-shadow:0 0 40px currentColor, 0 0 80px currentColor} }
        .btn { transition: all 0.15s; } .btn:active { transform: scale(0.95) !important; }
        .shop-tab { transition: all 0.2s; }
        .item-card { transition: all 0.2s; } .item-card:hover { transform: translateY(-2px); }
      `}</style>

      {/* CANVAS — always mounted */}
      <canvas ref={canvasRef} style={{ display: screen === "game" ? "block" : "none",
        width:"100%", height:"100%", position:"absolute", inset:0 }} />

      {/* GAME HUD */}
      {screen === "game" && <GameHUD gameRef={gameRef} pausedRef={pausedRef} onMenu={() => {
        cancelAnimationFrame(rafRef.current);
        pausedRef.current = false;
        gameRef.current = null;
        setScreen("menu");
      }} />}

      {/* MENU */}
      {screen === "menu" && <MenuScreen store={store} onPlay={() => setScreen("prerun")}
        onShop={() => setScreen("shop")} onLeaderboard={() => setScreen("leaderboard")}
        onWorlds={() => setScreen("worlds")} onReset={() => { if(window.confirm("Reset ALL data?")){localStorage.removeItem(NS);setStore(loadStore());} }} />}

      {/* PRE-RUN (world + powerup select) */}
      {screen === "prerun" && <PreRunScreen store={store} selectedPowerups={selectedPowerups}
        setSelectedPowerups={setSelectedPowerups} onStart={startGame} onBack={() => setScreen("menu")} />}

      {/* GAME OVER */}
      {screen === "gameover" && runStats && <GameOverScreen stats={runStats} store={store}
        onRetry={() => startGame(runStats.worldId)} onMenu={() => setScreen("menu")}
        onLeaderboard={() => setScreen("leaderboard")} />}

      {/* SHOP */}
      {screen === "shop" && <ShopScreen store={store} tab={shopTab} setTab={setShopTab}
        onBuy={(item) => handleBuy(item, store, updateStore, pushToast)}
        onEquip={(id) => updateStore(s => ({ ...s, equippedSkin: id }))}
        onBack={() => setScreen("menu")} />}

      {/* LEADERBOARD */}
      {screen === "leaderboard" && <LeaderboardScreen store={store} onBack={() => setScreen("menu")} />}

      {/* WORLDS */}
      {screen === "worlds" && <WorldsScreen store={store} onUnlock={(w) => handleUnlockWorld(w, store, updateStore, pushToast)}
        onBack={() => setScreen("menu")} />}

      {/* TOASTS */}
      <ToastStack queue={toastQueue} />
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  GAME ENGINE — UPDATE
// ═══════════════════════════════════════════════════
function updateGame(G, dt, rawDt, updateStore, pushToast) {
  G.frameCount++;
  const p = G.player;
  const { input, prevInput } = G;

  // Cooldowns
  if (p.dashCooldown > 0) p.dashCooldown -= rawDt;
  if (p.dashActive > 0)   p.dashActive   -= dt;
  if (p.invincible > 0)   p.invincible   -= rawDt;
  if (G.doubleScoreActive > 0) G.doubleScoreActive -= rawDt;
  if (G.magnetActive > 0)      G.magnetActive      -= rawDt;
  if (G.ghostActive > 0)       G.ghostActive       -= rawDt;
  if (G.timeSlowActive > 0)    G.timeSlowActive    -= rawDt;
  if (G.zeroGravZone && G.zeroGravTimer > 0) G.zeroGravTimer -= rawDt;
  if (G.zeroGravTimer <= 0) G.zeroGravZone = false;
  if (G.comboTimer > 0) {
    G.comboTimer -= rawDt;
    if (G.comboTimer <= 0) { G.combo = 0; }
  }

  // Effective gravity
  const effectiveGrav = G.zeroGravZone ? 0.04 : G.gravity;

  // Horizontal movement
  const speed = G.MOVE_SPEED ?? 4.8;
  p.vx = 0;
  if (input.left)  { p.vx = -(speed + (G.speedMult - 1) * 0.8); p.facing = -1; }
  if (input.right) { p.vx =  (speed + (G.speedMult - 1) * 0.8); p.facing =  1; }

  // Dash
  if (input.dash && !prevInput.dash && p.dashCooldown <= 0 && !G.zeroGravZone) {
    p.dashActive = 9;
    p.dashCooldown = G.dashCooldownBase;
    p.vx = p.facing * 20;
    G.dashCount++;
    G.noDashRun = false;
    spawnParts(G, p.x + p.w/2, p.y + p.h/2, 14, G.world.accent, 5);
  }
  if (p.dashActive > 0) p.vx = p.facing * 20;

  // Jump
  if (input.jump && !prevInput.jump && p.jumpsLeft > 0) {
    const jumpForce = G.zeroGravZone ? -5 : (-12.5 - (G.speedMult - 1) * 0.3);
    p.vy = jumpForce;
    p.jumpsLeft--;
    spawnParts(G, p.x + p.w/2, p.y + p.h, 7, G.world.accent2, 2.5);
  }
  // Variable height
  if (!input.jump && p.vy < -4 && !G.zeroGravZone) p.vy += 2 * dt;

  prevInput.jump = input.jump;
  prevInput.dash = input.dash;

  // Physics
  p.vy += effectiveGrav * dt;
  p.vy = Math.min(p.vy, G.zeroGravZone ? 6 : 22);
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // Clamp X
  p.x = Math.max(0, Math.min(G.W - p.w, p.x));

  // World scroll
  const scrollZone = G.W * 0.52;
  if (p.x > scrollZone) {
    const sa = (p.x - scrollZone) * 0.13 * dt * G.speedMult;
    G.worldX += sa;
    G.distance += sa * 0.06;
    p.x -= sa * 0.28;
    const scrollAll = (obj) => { obj.x -= sa; };
    G.platforms.forEach(scrollAll);
    G.orbs.forEach(scrollAll);
    G.hazards.forEach(scrollAll);
    G.specials.forEach(scrollAll);
    G.inWorldPowerups.forEach(scrollAll);
  }

  // ── COLLISION ──
  p.onGround = false; p.onPlatform = false;
  let landedNewPlat = false;

  G.platforms.forEach(pl => {
    if (!pl.solid) return;
    if (p.x + p.w < pl.x + 4 || p.x > pl.x + pl.w - 4) return;
    if (p.vy >= -0.5 && p.y + p.h >= pl.y && p.y + p.h <= pl.y + 20) {
      p.y = pl.y - p.h;
      p.vy = 0;
      p.jumpsLeft = 2;
      if (pl.type === "ground") {
        p.onGround = true;
      } else {
        p.onPlatform = true;
        if (!pl.landed) {
          pl.landed = true; pl.glowTimer = 60;
          landedNewPlat = true;
          G.combo++;
          G.maxCombo = Math.max(G.maxCombo, G.combo);
          G.comboTimer = G.comboTimerBase;
          if (G.combo >= 2) {
            const pts = G.combo * 30 * (G.doubleScoreActive > 0 ? 2 : 1);
            addScore(G, pts);
            spawnFloatText(G, p.x + p.w/2, p.y - 10, `×${G.combo} +${pts}`, G.world.accent2, 13);
          }
          if (G.combo >= 10) checkAch(G, "combo10", pushToast, updateStore);
        }
      }
    }
  });

  // Specials (springs, launchers, portals, zero-grav zones)
  G.specials.forEach(sp => {
    if (sp.x + sp.w < -50 || sp.x > G.W + 50) return;
    const hit = p.x + p.w > sp.x && p.x < sp.x + sp.w && p.y + p.h > sp.y && p.y < sp.y + sp.h;
    if (!hit) return;
    if (sp.type === "spring" && !sp.triggered) {
      sp.triggered = true; setTimeout(() => sp.triggered = false, 500);
      p.vy = -20; p.jumpsLeft = 2;
      spawnParts(G, sp.x + sp.w/2, sp.y, 12, "#00ffcc", 4);
      spawnFloatText(G, sp.x + sp.w/2, sp.y - 20, "SPRING!", "#00ffcc");
    }
    if (sp.type === "launch" && !sp.triggered) {
      sp.triggered = true; setTimeout(() => sp.triggered = false, 800);
      p.vy = -25; p.vx = p.facing * 15; p.jumpsLeft = 2;
      spawnParts(G, sp.x + sp.w/2, sp.y, 20, G.world.accent, 6);
      spawnFloatText(G, sp.x + sp.w/2, sp.y - 20, "LAUNCH!", G.world.accent, 16);
    }
    if (sp.type === "portal" && !sp.cooldown) {
      sp.cooldown = 120;
      G.portalsUsed++;
      // teleport player to a safe platform
      const safePlats = G.platforms.filter(pl => pl.type !== "ground" && pl.x > G.W * 0.1 && pl.x < G.W * 0.9);
      if (safePlats.length) {
        const dest = safePlats[Math.floor(Math.random() * safePlats.length)];
        p.x = dest.x + dest.w/2 - p.w/2;
        p.y = dest.y - p.h - 5;
        p.vy = -8; p.invincible = 60;
        addScore(G, 150);
        spawnParts(G, p.x + p.w/2, p.y + p.h/2, 20, "#ff00ff", 5);
        spawnFloatText(G, p.x, p.y - 20, "PORTAL! +150", "#ff77ff", 15);
      }
      if (G.portalsUsed >= 5) checkAch(G, "portal5", pushToast, updateStore);
    }
    if (sp.type === "zerograv" && G.zeroGravTimer <= 0) {
      G.zeroGravZone = true; G.zeroGravTimer = 180;
      spawnFloatText(G, G.W/2, G.H * 0.3, "ZERO-G ZONE!", G.world.accent, 18);
    }
    if (sp.type === "warp" && !sp.triggered) {
      sp.triggered = true; setTimeout(() => sp.triggered = false, 1000);
      p.vx = p.facing * 30; p.invincible = 30;
      spawnParts(G, p.x, p.y + p.h/2, 20, G.world.accent2, 8);
      spawnFloatText(G, p.x, p.y - 20, "WARP!", G.world.accent2);
    }
    if (sp.type === "slide") {
      p.vx += p.facing * 0.8 * dt;
    }
  });

  if (sp => sp.cooldown > 0) G.specials.forEach(sp => { if (sp.cooldown > 0) sp.cooldown -= rawDt; });

  // Orbs
  G.orbs = G.orbs.filter(o => {
    if (o.collected || o.x < -60 || o.x > G.W + 60) return false;
    o.phase = (o.phase || 0) + 0.06 * dt;
    o.displayY = o.y + Math.sin(o.phase) * 5;
    const dx = p.x + p.w/2 - o.x;
    const dy = p.y + p.h/2 - o.displayY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const magnetRange = G.magnetActive > 0 ? 160 : 30;
    if (G.magnetActive > 0 && dist < magnetRange) {
      o.x += dx * 0.15 * dt; o.y += dy * 0.15 * dt;
    }
    if (dist < p.w * 0.7 + o.r) {
      o.collected = true;
      const coinVal = Math.round(o.coinVal * G.orbValueMult);
      const scoreVal = 40 * (G.doubleScoreActive > 0 ? 2 : 1) * (G.combo || 1);
      addScore(G, scoreVal);
      G.coins += coinVal;
      spawnFloatText(G, o.x, o.displayY, `+${coinVal}🪙`, "#ffee44", 11);
      spawnParts(G, o.x, o.displayY, 8, "#ffee44", 3);
      return false;
    }
    return true;
  });

  // Hazards
  if (p.invincible <= 0 && G.ghostActive <= 0) {
    G.hazards.forEach(h => {
      if (h.x + h.w < -10 || h.x > G.W + 10) return;
      const hit = p.x + p.w - 4 > h.x && p.x + 4 < h.x + h.w && p.y + p.h > h.y && p.y < h.y + h.h;
      if (hit && !h.hit) {
        h.hit = true; setTimeout(() => h.hit = false, 500);
        takeHit(G, p, pushToast, updateStore);
      }
    });
  }

  // In-world powerups
  G.inWorldPowerups = G.inWorldPowerups.filter(pw => {
    if (pw.x < -60 || pw.x > G.W + 60) return false;
    pw.phase = (pw.phase || 0) + 0.04 * dt;
    const dx = p.x + p.w/2 - pw.x;
    const dy = p.y + p.h/2 - pw.y;
    if (Math.sqrt(dx*dx + dy*dy) < 28) {
      applyInWorldPowerup(G, pw, spawnFloatText, spawnParts, pushToast, updateStore);
      return false;
    }
    return true;
  });

  // Fall detection — FIXED respawn logic
  if (p.y > G.H + 80) {
    handleFall(G, p, pushToast, updateStore);
  }

  // Trail
  p.trailPts = p.trailPts || [];
  p.trailPts.unshift({ x: p.x + p.w/2, y: p.y + p.h/2 });
  if (p.trailPts.length > 14) p.trailPts.pop();

  // Particles age
  G.particles = G.particles.filter(pt => {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vy += 0.15 * dt; pt.life -= dt;
    return pt.life > 0;
  });
  G.floatTexts = G.floatTexts.filter(ft => {
    ft.life -= dt; ft.y -= 0.7 * dt; return ft.life > 0;
  });
  G.platforms.forEach(pl => { if (pl.glowTimer > 0) pl.glowTimer -= rawDt; });

  // Score from speed
  const scoreRate = G.speedMult * 0.12 * (G.doubleScoreActive > 0 ? 2 : 1);
  addScore(G, scoreRate * dt);

  // Level up every 250m
  const newLevel = 1 + Math.floor(G.distance / 250);
  if (newLevel > G.level) {
    G.level = newLevel;
    G.speedMult = 1 + (newLevel - 1) * 0.16 + (G.upgrades?.upg_startspeed ?? 0) * 0.15;
    G.gravity = G.world.gravity + (newLevel - 1) * 0.01;
    spawnFloatText(G, G.W/2, G.H * 0.28, `LEVEL ${G.level} — SPEED UP!`, G.world.accent, 20);
    spawnParts(G, G.W/2, G.H/2, 30, G.world.accent, 6);
    if (G.level >= 3 && G.worldId === 0) checkAch(G, "w3", pushToast, updateStore);
    // Randomly drop an in-world powerup
    if (Math.random() < 0.7) spawnInWorldPowerup(G);
  }

  // Generate terrain
  generateTerrain(G);

  // Cleanup offscreen
  G.platforms = G.platforms.filter(pl => pl.x > -500 || pl.type === "ground");
  G.hazards    = G.hazards.filter(h  => h.x > -200);
  G.specials   = G.specials.filter(sp => sp.x > -200);

  // Achievement checks
  const sc = Math.floor(G.score);
  if (sc >= 500)   checkAch(G, "s500",   pushToast, updateStore);
  if (sc >= 2000)  checkAch(G, "s2000",  pushToast, updateStore);
  if (sc >= 5000)  checkAch(G, "s5000",  pushToast, updateStore);
  if (sc >= 10000) checkAch(G, "s10000", pushToast, updateStore);
  if (G.distance >= 1000) checkAch(G, "dist1000", pushToast, updateStore);
}

// ── FALL HANDLER (fixed) ──
function handleFall(G, p, pushToast, updateStore) {
  if (G.lives <= 1) {
    G.lives = 0;
    G.gameOver = true;
    return;
  }
  G.lives--;

  // Find a safe landing spot: find platform visible on screen above ground
  const candidates = G.platforms.filter(pl =>
    pl.type !== "ground" &&
    pl.y < G.GROUND_Y - 30 &&
    pl.x + pl.w > G.W * 0.05 &&
    pl.x < G.W * 0.85
  ).sort((a, b) => b.y - a.y); // lowest platform first (closest to ground = safest)

  if (candidates.length > 0) {
    const dest = candidates[0];
    p.x = dest.x + dest.w / 2 - p.w / 2;
    p.x = Math.max(0, Math.min(G.W - p.w, p.x));
    p.y = dest.y - p.h - 2;
  } else {
    // Fallback: ground level
    p.x = Math.max(0, Math.min(G.W - p.w, G.W * 0.25));
    p.y = G.GROUND_Y - p.h - 2;
  }
  p.vy = 0; p.vx = 0;
  p.invincible = 150; // 2.5 second invincibility
  p.jumpsLeft = 2;
  spawnFloatText(G, p.x + p.w/2, p.y - 30, "FELL!", "#ff3355", 14);
  spawnParts(G, p.x + p.w/2, p.y + p.h/2, 12, "#ff3355", 4);
}

function takeHit(G, p, pushToast, updateStore) {
  if (G.shieldActive > 0) {
    G.shieldActive--;
    p.invincible = 90;
    spawnFloatText(G, p.x + p.w/2, p.y - 20, "SHIELD!", "#00ccff", 14);
    spawnParts(G, p.x + p.w/2, p.y + p.h/2, 15, "#00ccff", 4);
    return;
  }
  G.combo = 0; G.comboTimer = 0;
  if (G.lives <= 1) { G.lives = 0; G.gameOver = true; return; }
  G.lives--;
  p.invincible = 110;
  spawnParts(G, p.x + p.w/2, p.y + p.h/2, 18, "#ff3355", 5);
  spawnFloatText(G, p.x + p.w/2, p.y - 15, "HIT!", "#ff3355");
}

function addScore(G, pts) { G.score += pts; }

function spawnParts(G, x, y, count, color, spd) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = spd * (0.4 + Math.random() * 0.8);
    G.particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, color, life:25+Math.random()*20, maxLife:45, size:2+Math.random()*3 });
  }
}

function spawnFloatText(G, x, y, text, color, size = 12) {
  G.floatTexts.push({ x, y, text, color, size, life:65, maxLife:65 });
}

function checkAch(G, id, pushToast, updateStore) {
  if (G._achs && G._achs[id]) return;
  if (!G._achs) G._achs = {};
  G._achs[id] = true;
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return;
  updateStore(s => {
    if (s.achievements[id]) return s;
    const next = { ...s, achievements: { ...s.achievements, [id]: true }, coins: s.coins + a.reward };
    saveStore(next);
    return next;
  });
  pushToast({ type:"achievement", icon:a.icon, title:a.name, body:`+${a.reward} coins`, color:"#ffee44" });
}

// ── TERRAIN GENERATION ──
function generateTerrain(G) {
  const platArr = G.platforms.filter(p => p.type !== "ground");
  const rightmost = platArr.length ? Math.max(...platArr.map(p => p.x + p.w)) : G.W * 0.5;

  while (rightmost < G.W + 600) {
    const last = platArr.length ? platArr.sort((a,b)=>b.x-a.x)[0] : { x: G.W, y: G.GROUND_Y - 100, w: 100 };
    const gap = 130 + Math.random() * 90 + G.level * 8;
    const nx = last.x + last.w + gap;
    const minY = G.GROUND_Y - 280, maxY = G.GROUND_Y - 70;
    const ny = minY + Math.random() * (maxY - minY);
    const pl = makePlat(nx, ny, G);
    G.platforms.push(pl);

    // Hazards on platform
    if (G.level > 1 && Math.random() < 0.25 + G.level * 0.03) {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        G.hazards.push(makeHazard(nx + 12 + i * 22, ny - 16, G.world));
      }
    }

    // Specials — varied per world
    if (Math.random() < 0.22) {
      G.specials.push(makeSpecial(nx + pl.w/2 - 15, ny - 30, G.world));
    }

    // Orbs above platform
    if (Math.random() < 0.6) {
      const oc = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < oc; i++) {
        G.orbs.push({ x: nx + 15 + i * 28, y: ny - 35 - Math.random() * 40,
          r: 8, collected: false, phase: Math.random() * Math.PI * 2,
          coinVal: Math.floor(5 + G.level * 3 + Math.random() * 10), displayY: 0 });
      }
    }
    platArr.push(pl);
    break;
  }
}

function makePlat(x, y, G) {
  const w = Math.max(55, 110 + Math.random() * 70 - G.level * 5);
  return { x, y, w, h: 14, type:"platform", solid:true, landed:false, glowTimer:0,
    wobble: G.world.id === 2 ? Math.random() * Math.PI * 2 : 0 };
}

function makeHazard(x, y, world) {
  return { x, y, w: 14, h: 16, type: world.hazard, hit: false };
}

function makeSpecial(x, y, world) {
  const types = {
    0: ["spring","portal"],
    1: ["launch","portal"],
    2: ["slide","spring","portal"],
    3: ["zerograv","portal"],
    4: ["warp","portal"],
  };
  const opts = types[world.id] || ["spring"];
  const type = opts[Math.floor(Math.random() * opts.length)];
  return { x, y, w: 30, h: 30, type, triggered: false, cooldown: 0 };
}

function spawnInWorldPowerup(G) {
  const types = ["speed","shield","double","magnet","ghost"];
  const type = types[Math.floor(Math.random() * types.length)];
  G.inWorldPowerups.push({
    x: G.W * 0.6 + Math.random() * G.W * 0.3,
    y: G.GROUND_Y - 120 - Math.random() * 100,
    type, phase: 0,
  });
}

function applyInWorldPowerup(G, pw, spawnFloatText, spawnParts, pushToast) {
  const labels = { speed:"SPEED BOOST!", shield:"SHIELD UP!", double:"2× SCORE!", magnet:"MAGNET!", ghost:"GHOST MODE!" };
  const colors  = { speed:"#ffee44", shield:"#00ccff", double:"#ff77ff", magnet:"#ffaa00", ghost:"#aaffee" };
  spawnFloatText(G, pw.x, pw.y - 20, labels[pw.type] || "POWER UP!", colors[pw.type] || "#fff", 14);
  spawnParts(G, pw.x, pw.y, 20, colors[pw.type] || "#fff", 5);
  if (pw.type === "speed")  G.speedMult = Math.min(G.speedMult + 0.3, 5);
  if (pw.type === "shield") G.shieldActive = Math.min(G.shieldActive + 1, 3);
  if (pw.type === "double") G.doubleScoreActive = 300;
  if (pw.type === "magnet") G.magnetActive = 300;
  if (pw.type === "ghost")  G.ghostActive = 200;
  pushToast({ type:"powerup", icon:"⚡", title: labels[pw.type] || "Power Up", body:"Activated!", color: colors[pw.type] || "#fff" });
}

function buildBgParticles(W, H, world) {
  const count = world.id === 3 ? 120 : 40;
  return Array.from({ length: count }, () => ({
    x: Math.random() * W * 2, y: Math.random() * H,
    size: 0.5 + Math.random() * (world.id === 3 ? 2 : 1.5),
    alpha: 0.1 + Math.random() * 0.4,
    speed: 0.2 + Math.random() * 0.5,
  }));
}

// ═══════════════════════════════════════════════════
//  GAME ENGINE — RENDER
// ═══════════════════════════════════════════════════
function renderGame(G, canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const { W, H, GROUND_Y, world, player: p } = G;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, world.sky[0]);
  sky.addColorStop(1, world.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Zero-grav overlay
  if (G.zeroGravZone) {
    ctx.fillStyle = `rgba(${world.id === 3 ? "119,0,255" : "0,120,255"},0.07)`;
    ctx.fillRect(0, 0, W, H);
  }

  // Background particles / stars
  G.bgParticles.forEach(bp => {
    const ex = ((bp.x - G.worldX * bp.speed * 0.3) % (W * 2) + W * 2) % (W * 2);
    ctx.globalAlpha = bp.alpha;
    ctx.fillStyle = world.id === 3 ? "#ffffff" : world.accent;
    ctx.beginPath();
    ctx.arc(ex, bp.y, bp.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // World-specific bg decoration
  drawWorldBg(ctx, G);

  // Ground
  G.platforms.filter(pl => pl.type === "ground").forEach(pl => {
    const g = ctx.createLinearGradient(0, pl.y, 0, pl.y + pl.h);
    g.addColorStop(0, world.ground);
    g.addColorStop(1, "#000");
    ctx.fillStyle = g;
    ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.strokeStyle = world.accent + "55";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x + pl.w, pl.y); ctx.stroke();
  });

  // Platforms
  G.platforms.filter(pl => pl.type !== "ground").forEach(pl => {
    if (pl.x + pl.w < 0 || pl.x > W) return;
    // Ice wobble
    const wobbleY = world.id === 2 ? Math.sin(G.frameCount * 0.02 + pl.wobble) * 2 : 0;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(pl.x + 3, pl.y + wobbleY + 5, pl.w, pl.h);

    const glowing = pl.glowTimer > 0;
    const pg = ctx.createLinearGradient(0, pl.y + wobbleY, 0, pl.y + wobbleY + pl.h);
    if (glowing) {
      pg.addColorStop(0, world.accent);
      pg.addColorStop(1, world.platformColor);
    } else {
      pg.addColorStop(0, world.platformColor);
      pg.addColorStop(1, world.platformColor + "aa");
    }
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect(pl.x, pl.y + wobbleY, pl.w, pl.h, 3);
    ctx.fill();

    ctx.strokeStyle = glowing ? world.accent : world.platformTop + "66";
    ctx.lineWidth = glowing ? 2 : 1;
    if (glowing) { ctx.shadowColor = world.accent; ctx.shadowBlur = 16; }
    ctx.beginPath(); ctx.moveTo(pl.x + 4, pl.y + wobbleY); ctx.lineTo(pl.x + pl.w - 4, pl.y + wobbleY); ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // Specials
  G.specials.forEach(sp => {
    if (sp.x + sp.w < -10 || sp.x > W + 10) return;
    drawSpecial(ctx, sp, G);
  });

  // Hazards
  G.hazards.forEach(h => {
    if (h.x + h.w < -10 || h.x > W + 10) return;
    drawHazard(ctx, h, world, G.frameCount);
  });

  // In-world powerups
  G.inWorldPowerups.forEach(pw => {
    const bob = Math.sin(pw.phase) * 5;
    ctx.shadowColor = "#ffee44"; ctx.shadowBlur = 20;
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(pw.x, pw.y + bob, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffee44"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pw.x, pw.y + bob, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = "16px serif"; ctx.textAlign = "center";
    const icons = { speed:"⚡", shield:"🛡", double:"✖", magnet:"🧲", ghost:"👻" };
    ctx.fillText(icons[pw.type] || "★", pw.x, pw.y + bob + 6);
  });

  // Orbs
  G.orbs.forEach(o => {
    if (o.collected || o.x < -20 || o.x > W + 20) return;
    ctx.shadowColor = "#ffee44"; ctx.shadowBlur = 18;
    const og = ctx.createRadialGradient(o.x - 2, o.displayY - 2, 1, o.x, o.displayY, o.r);
    og.addColorStop(0, "#fffacc");
    og.addColorStop(0.6, "#ffee44");
    og.addColorStop(1, "#cc8800");
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(o.x, o.displayY, o.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath(); ctx.ellipse(o.x - 2, o.displayY - 2, 2.5, 1.5, -0.5, 0, Math.PI * 2); ctx.fill();
  });

  // Player trail
  p.trailPts && p.trailPts.forEach((pt, i) => {
    const alpha = (1 - i / p.trailPts.length) * 0.22;
    const size = p.w * (1 - i / p.trailPts.length) * 0.65;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.dashActive > 0 ? world.accent2 : world.accent;
    ctx.fillRect(pt.x - size/2, pt.y - size/2, size, size);
  });
  ctx.globalAlpha = 1;

  // Player
  const blink = p.invincible > 0 && Math.floor(G.frameCount / 5) % 2 === 0;
  if (!blink) {
    ctx.save();
    ctx.translate(p.x + p.w/2, p.y + p.h/2);
    ctx.scale(p.facing, 1);
    ctx.translate(-p.w/2, -p.h/2);

    const ghostAlpha = G.ghostActive > 0 ? 0.45 : 1;
    ctx.globalAlpha = ghostAlpha;

    const bodyColor = G.ghostActive > 0 ? "#aaffee" : (p.dashActive > 0 ? world.accent2 : world.accent);
    ctx.fillStyle = bodyColor;
    ctx.shadowColor = bodyColor; ctx.shadowBlur = p.dashActive > 0 ? 22 : 10;
    ctx.beginPath(); ctx.roundRect(2, 0, p.w - 4, p.h, 4); ctx.fill();

    // Shield ring
    if (G.shieldActive > 0) {
      ctx.strokeStyle = "#00ccff"; ctx.lineWidth = 2; ctx.shadowColor = "#00ccff"; ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.arc(p.w/2, p.h/2, 22, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.fillStyle = "#080818";
    ctx.beginPath(); ctx.roundRect(7, 5, p.w - 14, 11, 2); ctx.fill();

    const eyeColor = G.ghostActive > 0 ? "#ff77ff" : (p.dashActive > 0 ? "#ff3355" : world.accent2);
    ctx.fillStyle = eyeColor; ctx.shadowColor = eyeColor; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(p.w - 9, 11, 3.5, 0, Math.PI * 2); ctx.fill();

    const leg = Math.sin(G.frameCount * 0.3) * (p.vx !== 0 ? 5 : 0);
    ctx.fillStyle = bodyColor + "88";
    ctx.fillRect(5, p.h - 9, 7, 9 + leg * 0.4);
    ctx.fillRect(p.w - 12, p.h - 9, 7, 9 - leg * 0.4);

    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Particles
  G.particles.forEach(pt => {
    ctx.globalAlpha = pt.life / pt.maxLife;
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.maxLife), 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Float texts
  G.floatTexts.forEach(ft => {
    ctx.globalAlpha = ft.life / ft.maxLife;
    ctx.fillStyle = ft.color;
    ctx.font = `700 ${ft.size}px Orbitron, monospace`;
    ctx.textAlign = "center";
    ctx.shadowColor = ft.color; ctx.shadowBlur = 12;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.shadowBlur = 0;
  });
  ctx.globalAlpha = 1; ctx.textAlign = "left";

  // Dash cooldown arc
  if (p.dashCooldown > 0) {
    const prog = 1 - p.dashCooldown / G.dashCooldownBase;
    ctx.strokeStyle = world.accent + "88"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x + p.w/2, p.y + p.h/2, 24, -Math.PI/2, -Math.PI/2 + prog * Math.PI * 2);
    ctx.stroke();
  }

  // Time-slow vignette
  if (G.timeSlowActive > 0) {
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.9);
    vg.addColorStop(0, "transparent");
    vg.addColorStop(1, "rgba(80,0,120,0.35)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
}

function drawWorldBg(ctx, G) {
  const { W, H, world, frameCount } = G;
  ctx.globalAlpha = 0.07;
  if (world.id === 0) { // Neon City — building silhouettes
    for (let i = 0; i < 12; i++) {
      const bx = ((i * 140 - G.worldX * 0.08) % (W + 300) + W + 300) % (W + 300) - 150;
      const bh = 80 + (i * 37 % 160);
      ctx.fillStyle = world.accent;
      ctx.fillRect(bx, H - bh - G.GROUND_Y * 0.1, 70 + (i * 23 % 60), bh);
    }
  } else if (world.id === 4) { // Cyber grid
    ctx.strokeStyle = world.accent; ctx.lineWidth = 0.5;
    const gs = 60;
    for (let x = -gs; x < W + gs; x += gs) {
      const gx = ((x - G.worldX * 0.2) % W + W) % W;
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawSpecial(ctx, sp, G) {
  const { frameCount, world } = G;
  const cx = sp.x + sp.w / 2, cy = sp.y + sp.h / 2;
  if (sp.type === "spring") {
    const bounce = sp.triggered ? 1.5 : 1;
    ctx.strokeStyle = "#00ffcc"; ctx.lineWidth = 3; ctx.shadowColor = "#00ffcc"; ctx.shadowBlur = 12;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(sp.x + 4, sp.y + sp.h - i * 4 * bounce);
      ctx.lineTo(sp.x + sp.w - 4, sp.y + sp.h - (i + 1) * 4 * bounce);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  } else if (sp.type === "portal") {
    const r = 18 + Math.sin(frameCount * 0.05) * 3;
    const a = frameCount * 0.04;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    g.addColorStop(0, "#ff00ff"); g.addColorStop(1, "#00ffff00");
    ctx.fillStyle = g; ctx.shadowColor = "#ff00ff"; ctx.shadowBlur = 25;
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 1.4, a, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ff77ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.5, r * 0.7, a + Math.PI/4, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff"; ctx.font = "9px Orbitron"; ctx.textAlign = "center";
    ctx.fillText("PORTAL", cx, cy + r + 12);
  } else if (sp.type === "zerograv") {
    ctx.fillStyle = world.accent + "33"; ctx.strokeStyle = world.accent; ctx.lineWidth = 1.5;
    ctx.shadowColor = world.accent; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.roundRect(sp.x, sp.y, sp.w, sp.h, 4); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = world.accent; ctx.font = "9px Orbitron"; ctx.textAlign = "center";
    ctx.fillText("0-G", cx, cy + 4);
  } else if (sp.type === "launch") {
    ctx.fillStyle = "#ff6600"; ctx.shadowColor = "#ff6600"; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(cx, sp.y); ctx.lineTo(cx - 12, sp.y + sp.h); ctx.lineTo(cx + 12, sp.y + sp.h); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
  } else if (sp.type === "warp") {
    const r2 = 14 + Math.sin(frameCount * 0.08) * 3;
    ctx.strokeStyle = world.accent2; ctx.lineWidth = 2; ctx.shadowColor = world.accent2; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = world.accent; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r2 * 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.textAlign = "left";
}

function drawHazard(ctx, h, world, fc) {
  if (h.type === "spikes" || h.type === "icicles") {
    ctx.fillStyle = h.type === "icicles" ? "#aaeeff" : "#ff3355";
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y + h.h); ctx.lineTo(h.x + h.w/2, h.y); ctx.lineTo(h.x + h.w, h.y + h.h);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
  } else if (h.type === "lava") {
    const lava = ctx.createLinearGradient(0, h.y, 0, h.y + h.h);
    lava.addColorStop(0, "#ffaa00"); lava.addColorStop(1, "#cc2200");
    ctx.fillStyle = lava; ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 15;
    ctx.fillRect(h.x, h.y, h.w, h.h);
    const bubble = Math.sin(fc * 0.1 + h.x) > 0.5;
    if (bubble) { ctx.fillStyle = "#ffcc00"; ctx.beginPath(); ctx.arc(h.x + h.w/2, h.y + 4, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.shadowBlur = 0;
  } else if (h.type === "blackhole") {
    const r = 10 + Math.sin(fc * 0.06) * 2;
    const bh = ctx.createRadialGradient(h.x + h.w/2, h.y + h.h/2, 0, h.x + h.w/2, h.y + h.h/2, r * 2);
    bh.addColorStop(0, "#000000"); bh.addColorStop(0.5, "#330066"); bh.addColorStop(1, "transparent");
    ctx.fillStyle = bh; ctx.beginPath(); ctx.arc(h.x + h.w/2, h.y + h.h/2, r * 2, 0, Math.PI * 2); ctx.fill();
  } else if (h.type === "laser") {
    const on = Math.floor(fc / 30) % 2 === 0;
    ctx.strokeStyle = on ? "#ff0044" : "#330011"; ctx.lineWidth = on ? 3 : 1;
    ctx.shadowColor = "#ff0044"; ctx.shadowBlur = on ? 20 : 5;
    ctx.beginPath(); ctx.moveTo(h.x + h.w/2, 0); ctx.lineTo(h.x + h.w/2, h.y + h.h); ctx.stroke();
    ctx.shadowBlur = 0;
    h.solid = on; // laser is only dangerous when on - update hitbox active
    h.active = on;
  }
}

// ═══════════════════════════════════════════════════
//  RUN FINISH
// ═══════════════════════════════════════════════════
function finishRun(G, store, updateStore, setRunStats, setScreen, pushToast) {
  const score = Math.floor(G.score);
  const dist = Math.floor(G.distance);
  const isNewBest = score > store.best;

  updateStore(s => {
    const newCoins = s.coins + G.coins;
    const newLeaderboard = [...s.leaderboard, {
      score, distance: dist, level: G.level, worldId: G.worldId,
      date: new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short" }),
    }].sort((a,b) => b.score - a.score).slice(0, 20);

    // Daily streak
    const today = new Date().toDateString();
    const streakVal = s.lastPlayDate === new Date(Date.now()-86400000).toDateString() ? s.dailyStreak + 1 : (s.lastPlayDate === today ? s.dailyStreak : 1);

    const next = {
      ...s,
      coins: newCoins,
      best: Math.max(s.best, score),
      gamesPlayed: s.gamesPlayed + 1,
      totalDistance: s.totalDistance + dist,
      bestCombo: Math.max(s.bestCombo, G.maxCombo),
      leaderboard: newLeaderboard,
      dailyStreak: streakVal,
      lastPlayDate: today,
    };
    saveStore(next);
    return next;
  });

  if (isNewBest) pushToast({ type:"best", icon:"👑", title:"New Best!", body:`${score.toLocaleString()} pts`, color:"#ffee44" });
  if (G.noDashRun && score >= 1000) checkAch(G, "nodash", pushToast, updateStore);
  checkAch(G, "first", pushToast, updateStore);
  if (store.gamesPlayed + 1 >= 20) checkAch(G, "g20", pushToast, updateStore);

  setRunStats({ score, dist, level: G.level, worldId: G.worldId, isNewBest, coins: G.coins, maxCombo: G.maxCombo, dashCount: G.dashCount, portalsUsed: G.portalsUsed });
  setTimeout(() => setScreen("gameover"), 400);
}

// ═══════════════════════════════════════════════════
//  SHOP LOGIC
// ═══════════════════════════════════════════════════
function handleBuy(item, store, updateStore, pushToast) {
  if (item.cat === "skin" && store.ownedItems.includes(item.id)) {
    pushToast({ type:"info", icon:"ℹ", title:"Already owned", body:"", color:"#888" });
    return;
  }
  if (item.cat === "upgrade") {
    const curLevel = store.upgrades[item.id] ?? 0;
    if (curLevel >= item.maxLevel) {
      pushToast({ type:"info", icon:"ℹ", title:"Max level reached", body:"", color:"#888" });
      return;
    }
    const cost = item.price * (curLevel + 1);
    if (store.coins < cost) { pushToast({ type:"error", icon:"✕", title:"Not enough coins", body:`Need ${cost}🪙`, color:"#ff3355" }); return; }
    updateStore(s => {
      const next = { ...s, coins: s.coins - cost, upgrades: { ...s.upgrades, [item.id]: (s.upgrades[item.id] ?? 0) + 1 } };
      saveStore(next); return next;
    });
    pushToast({ type:"success", icon:item.icon, title:`${item.name} upgraded!`, body:`Level ${curLevel + 1}`, color:"#00ffcc" });
    return;
  }
  if (store.coins < item.price) { pushToast({ type:"error", icon:"✕", title:"Not enough coins", body:`Need ${item.price}🪙`, color:"#ff3355" }); return; }
  updateStore(s => {
    const next = { ...s, coins: s.coins - item.price, ownedItems: [...new Set([...s.ownedItems, item.id])] };
    saveStore(next); return next;
  });
  pushToast({ type:"success", icon:"✓", title:`${item.name} purchased!`, body:"", color:"#00ffcc" });
}

function handleUnlockWorld(world, store, updateStore, pushToast) {
  if (store.worldsUnlocked.includes(world.id)) return;
  if (store.coins < world.unlockCost) { pushToast({ type:"error", icon:"✕", title:"Not enough coins", body:`Need ${world.unlockCost}🪙`, color:"#ff3355" }); return; }
  updateStore(s => {
    const next = { ...s, coins: s.coins - world.unlockCost, worldsUnlocked: [...s.worldsUnlocked, world.id] };
    saveStore(next); return next;
  });
  pushToast({ type:"success", icon:"🌍", title:`${world.name} unlocked!`, body:"New world awaits", color:"#7700ff" });
  const allUnlocked = WORLDS.every(w => store.worldsUnlocked.includes(w.id) || w.id === world.id);
  if (allUnlocked) setTimeout(() => checkAch({_achs:{}}, "allworld", pushToast, updateStore), 500);
}

// ═══════════════════════════════════════════════════
//  UI COMPONENTS
// ═══════════════════════════════════════════════════

// ── GAME HUD ──
function GameHUD({ gameRef, pausedRef, onMenu }) {
  const [hud, setHud] = useState({ score:0, lives:3, combo:0, level:1, dist:0, speed:1, coins:0, powerups:{} });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let raf;
    const update = () => {
      const G = gameRef.current;
      if (G) setHud({
        score: Math.floor(G.score), lives: G.lives, combo: G.combo, level: G.level,
        dist: Math.floor(G.distance), speed: G.speedMult,
        coins: G.coins,
        shieldActive: G.shieldActive, doubleActive: G.doubleScoreActive > 0,
        magnetActive: G.magnetActive > 0, ghostActive: G.ghostActive > 0,
        timeSlowActive: G.timeSlowActive > 0, zeroGrav: G.zeroGravZone,
      });
      setPaused(pausedRef.current);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [gameRef, pausedRef]);

  const W = { accent: WORLDS[gameRef.current?.worldId ?? 0]?.accent ?? "#ffee44" };

  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:10 }}>
      {/* Top bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, padding:"10px 16px",
        display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        background:"linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}>

        {/* Score */}
        <div>
          <div style={{ fontSize:"0.6rem", letterSpacing:"0.2em", color:"#666", textTransform:"uppercase" }}>Score</div>
          <div style={{ fontSize:"1.7rem", fontWeight:900, color:W.accent,
            textShadow:`0 0 20px ${W.accent}88`, lineHeight:1, fontFamily:"Orbitron,monospace" }}>
            {hud.score.toLocaleString()}
          </div>
          <div style={{ fontSize:"0.65rem", color:"#555", marginTop:2 }}>🪙 {hud.coins}</div>
        </div>

        {/* Center */}
        <div style={{ textAlign:"center" }}>
          {hud.combo >= 2 && (
            <div style={{ fontSize:"1rem", fontWeight:700, color:"#ff6b35",
              textShadow:"0 0 15px #ff6b35", animation:"pulse 0.5s infinite" }}>
              ×{hud.combo} COMBO!
            </div>
          )}
          <div style={{ fontSize:"0.65rem", color:"#555", letterSpacing:"0.15em" }}>LEVEL {hud.level}</div>
          <div style={{ display:"flex", gap:5, justifyContent:"center", marginTop:4 }}>
            {[...Array(3)].map((_,i) => (
              <div key={i} style={{ width:12, height:12, borderRadius:2, background: i < hud.lives ? "#ff3355" : "#333",
                boxShadow: i < hud.lives ? "0 0 6px #ff335588" : "none", transition:"all 0.3s" }} />
            ))}
          </div>
          {/* Active powerup badges */}
          <div style={{ display:"flex", gap:4, justifyContent:"center", marginTop:4, flexWrap:"wrap" }}>
            {hud.doubleActive && <span style={{ fontSize:"0.6rem", background:"#ff77ff22", border:"1px solid #ff77ff", borderRadius:4, padding:"1px 5px", color:"#ff77ff" }}>2×</span>}
            {hud.magnetActive && <span style={{ fontSize:"0.6rem", background:"#ffaa0022", border:"1px solid #ffaa00", borderRadius:4, padding:"1px 5px", color:"#ffaa00" }}>🧲</span>}
            {hud.ghostActive  && <span style={{ fontSize:"0.6rem", background:"#aaffee22", border:"1px solid #aaffee", borderRadius:4, padding:"1px 5px", color:"#aaffee" }}>👻</span>}
            {hud.shieldActive > 0 && <span style={{ fontSize:"0.6rem", background:"#00ccff22", border:"1px solid #00ccff", borderRadius:4, padding:"1px 5px", color:"#00ccff" }}>🛡×{hud.shieldActive}</span>}
            {hud.zeroGrav && <span style={{ fontSize:"0.6rem", background:"#7700ff22", border:"1px solid #7700ff", borderRadius:4, padding:"1px 5px", color:"#bb77ff" }}>0-G</span>}
          </div>
        </div>

        {/* Right */}
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"0.6rem", color:"#555", letterSpacing:"0.15em" }}>SPEED</div>
          <div style={{ fontSize:"0.9rem", fontWeight:700, color:W.accent, fontFamily:"Orbitron,monospace" }}>{hud.speed.toFixed(1)}×</div>
          <div style={{ fontSize:"0.65rem", color:"#555", marginTop:2 }}>{hud.dist}m</div>
          <button onClick={() => { pausedRef.current = !pausedRef.current; }}
            style={{ marginTop:6, pointerEvents:"all", background:"rgba(255,255,255,0.08)", border:"1px solid #333",
              borderRadius:4, color:"#888", fontSize:"0.6rem", padding:"2px 8px", cursor:"pointer", fontFamily:"Orbitron,monospace" }}>
            {paused ? "▶" : "⏸"}
          </button>
        </div>
      </div>

      {/* Pause overlay */}
      {paused && (
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.85)", display:"flex",
          flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"1rem",
          backdropFilter:"blur(6px)", pointerEvents:"all" }}>
          <div style={{ fontFamily:"Orbitron,monospace", fontSize:"2rem", fontWeight:900, color:W.accent,
            letterSpacing:"0.2em", animation:"glow 2s infinite" }}>PAUSED</div>
          <Btn onClick={() => { pausedRef.current = false; }} accent={W.accent}>▶ RESUME</Btn>
          <Btn onClick={onMenu} variant="sec">⌂ MENU</Btn>
        </div>
      )}

      {/* Mobile controls */}
      <MobileControls gameRef={gameRef} accent={W.accent} />
    </div>
  );
}

// ── MOBILE CONTROLS ──
function MobileControls({ gameRef, accent }) {
  const isMobile = window.innerWidth < 768 || "ontouchstart" in window;
  if (!isMobile) return null;

  const press = (key, val) => { if (gameRef.current) gameRef.current.input[key] = val; };

  const touchBtn = (label, key, extra = {}) => (
    <button onTouchStart={e => { e.preventDefault(); press(key, true); }}
      onTouchEnd={e => { e.preventDefault(); press(key, false); }}
      onMouseDown={() => press(key, true)} onMouseUp={() => press(key, false)}
      style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${accent}44`,
        borderRadius:10, color:`${accent}cc`, fontFamily:"Orbitron,monospace",
        fontSize:"0.7rem", cursor:"pointer", WebkitTapHighlightColor:"transparent",
        ...extra }}>
      {label}
    </button>
  );

  return (
    <div style={{ position:"absolute", bottom:0, left:0, right:0, height:130,
      display:"flex", alignItems:"flex-end", padding:"1rem", gap:"0.5rem",
      pointerEvents:"none" }}>
      <div style={{ display:"flex", gap:"0.5rem", pointerEvents:"all" }}>
        {touchBtn("←", "left", { width:60, height:60 })}
        {touchBtn("→", "right", { width:60, height:60 })}
      </div>
      <div style={{ flex:1 }} />
      <div style={{ display:"flex", gap:"0.5rem", pointerEvents:"all" }}>
        {touchBtn("DASH", "dash", { width:66, height:52 })}
        {touchBtn("JUMP", "jump", { width:72, height:72 })}
      </div>
    </div>
  );
}

// ── MENU SCREEN ──
function MenuScreen({ store, onPlay, onShop, onLeaderboard, onWorlds, onReset }) {
  return (
    <div className="fade-in" style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"radial-gradient(ellipse at 50% -10%, #1a0a3a 0%, #0a0a0f 60%)" }}>

      {/* Animated grid */}
      <BgGrid />

      <div style={{ fontFamily:"Orbitron,monospace", fontSize:"clamp(2rem,6vw,4.5rem)", fontWeight:900,
        color:"#ffee44", letterSpacing:"0.06em",
        textShadow:"0 0 40px #ffee4466, 0 0 80px #ffee4422", position:"relative", zIndex:1, animation:"glow 3s infinite" }}>
        PLATFORM RUSH
      </div>
      <div style={{ fontFamily:"Rajdhani,sans-serif", fontSize:"0.95rem", letterSpacing:"0.5em",
        color:"#555", textTransform:"uppercase", marginBottom:"2.5rem", position:"relative", zIndex:1 }}>
        Jump · Dash · Endure
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:"1.5rem", marginBottom:"2.5rem", position:"relative", zIndex:1 }}>
        {[["Best", store.best.toLocaleString()], ["Coins", store.coins.toLocaleString()], ["Runs", store.gamesPlayed]].map(([l,v]) => (
          <div key={l} style={{ background:"rgba(255,238,68,0.05)", border:"1px solid rgba(255,238,68,0.12)",
            borderRadius:8, padding:"0.6rem 1.2rem", textAlign:"center" }}>
            <div style={{ fontFamily:"Orbitron,monospace", fontSize:"1.3rem", fontWeight:700, color:"#ffee44" }}>{v}</div>
            <div style={{ fontSize:"0.65rem", letterSpacing:"0.15em", color:"#555", textTransform:"uppercase" }}>{l}</div>
          </div>
        ))}
      </div>

      {store.dailyStreak > 1 && (
        <div style={{ marginBottom:"1rem", background:"rgba(255,150,0,0.1)", border:"1px solid rgba(255,150,0,0.3)",
          borderRadius:20, padding:"4px 16px", fontSize:"0.8rem", color:"#ffaa44", position:"relative", zIndex:1 }}>
          🔥 {store.dailyStreak}-day streak!
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:"0.7rem", alignItems:"center", position:"relative", zIndex:1 }}>
        <Btn onClick={onPlay} big>▶ PLAY</Btn>
        <Btn onClick={onShop} variant="sec">🛒 SHOP</Btn>
        <Btn onClick={onWorlds} variant="sec">🌍 WORLDS</Btn>
        <Btn onClick={onLeaderboard} variant="sec">🏆 LEADERBOARD</Btn>
        <Btn onClick={onReset} variant="danger" style={{ fontSize:"0.65rem" }}>✕ RESET DATA</Btn>
      </div>

      <div style={{ position:"absolute", bottom:"1.2rem", display:"flex", gap:"1.5rem",
        fontSize:"0.72rem", color:"#444", letterSpacing:"0.05em" }}>
        {[["← →","Move"], ["↑ / Space","Jump"], ["Shift","Dash"], ["P","Pause"]].map(([k,l]) => (
          <span key={k}><KBD>{k}</KBD> {l}</span>
        ))}
      </div>
    </div>
  );
}

// ── PRE-RUN ──
function PreRunScreen({ store, selectedPowerups, setSelectedPowerups, onStart, onBack }) {
  const [worldId, setWorldId] = useState(0);
  const powerupItems = SHOP_ITEMS.filter(i => i.cat === "powerup" && store.ownedItems.includes(i.id));

  const togglePowerup = (id) => {
    setSelectedPowerups(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev);
  };

  const w = WORLDS[worldId];

  return (
    <div className="fade-in" style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:`radial-gradient(ellipse at 50% 0%, ${w.sky[0]}88 0%, #0a0a0f 70%)` }}>

      <div style={{ fontFamily:"Orbitron,monospace", fontSize:"1.5rem", fontWeight:900, color:w.accent,
        letterSpacing:"0.15em", marginBottom:"1.5rem" }}>SELECT LOADOUT</div>

      {/* World selector */}
      <div style={{ marginBottom:"1.5rem" }}>
        <div style={{ fontSize:"0.7rem", color:"#555", letterSpacing:"0.2em", textAlign:"center", marginBottom:"0.6rem" }}>WORLD</div>
        <div style={{ display:"flex", gap:"0.6rem", flexWrap:"wrap", justifyContent:"center" }}>
          {WORLDS.map(wo => {
            const unlocked = store.worldsUnlocked.includes(wo.id);
            return (
              <button key={wo.id} onClick={() => unlocked && setWorldId(wo.id)}
                style={{ background: worldId === wo.id ? `${wo.accent}22` : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${worldId === wo.id ? wo.accent : "#333"}`,
                  borderRadius:8, padding:"0.5rem 0.9rem", color: unlocked ? (worldId === wo.id ? wo.accent : "#888") : "#333",
                  fontFamily:"Orbitron,monospace", fontSize:"0.7rem", cursor: unlocked ? "pointer" : "not-allowed",
                  transition:"all 0.2s" }}>
                {unlocked ? wo.name : `🔒 ${wo.name}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* World info card */}
      <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${w.accent}33`,
        borderRadius:12, padding:"1rem 1.5rem", marginBottom:"1.5rem", width:"min(380px,90vw)", textAlign:"center" }}>
        <div style={{ color:w.accent, fontFamily:"Orbitron,monospace", fontWeight:700, fontSize:"1rem", marginBottom:4 }}>{w.name}</div>
        <div style={{ fontSize:"0.75rem", color:"#555", display:"flex", gap:"1rem", justifyContent:"center" }}>
          <span>🌀 Special: <span style={{ color:w.accent2 }}>{w.special}</span></span>
          <span>⚠ Hazard: <span style={{ color:"#ff3355" }}>{w.hazard}</span></span>
        </div>
      </div>

      {/* Powerup select */}
      {powerupItems.length > 0 && (
        <div style={{ marginBottom:"1.5rem", width:"min(420px,92vw)" }}>
          <div style={{ fontSize:"0.7rem", color:"#555", letterSpacing:"0.2em", marginBottom:"0.6rem" }}>
            BRING POWERUPS (max 2)
          </div>
          <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
            {powerupItems.map(item => {
              const sel = selectedPowerups.includes(item.id);
              return (
                <button key={item.id} onClick={() => togglePowerup(item.id)}
                  style={{ background: sel ? "rgba(255,238,68,0.15)" : "rgba(255,255,255,0.04)",
                    border:`1.5px solid ${sel ? "#ffee44" : "#333"}`, borderRadius:8, padding:"0.4rem 0.7rem",
                    color: sel ? "#ffee44" : "#666", cursor:"pointer", fontSize:"0.75rem", fontFamily:"Orbitron,monospace",
                    display:"flex", alignItems:"center", gap:4, transition:"all 0.2s" }}>
                  <span>{item.icon}</span>{item.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:"0.75rem" }}>
        <Btn onClick={onBack} variant="sec">← BACK</Btn>
        <Btn onClick={() => onStart(worldId)} accent={w.accent}>▶ START RUN</Btn>
      </div>
    </div>
  );
}

// ── GAME OVER ──
function GameOverScreen({ stats, store, onRetry, onMenu, onLeaderboard }) {
  const w = WORLDS[stats.worldId] ?? WORLDS[0];
  return (
    <div className="fade-in" style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:`radial-gradient(ellipse at 50% 40%, #1a0010 0%, #0a0a0f 70%)` }}>

      <div style={{ fontFamily:"Orbitron,monospace", fontSize:"clamp(1.8rem,5vw,3rem)", fontWeight:900,
        color:"#ff3355", letterSpacing:"0.1em", textShadow:"0 0 40px #ff335566", marginBottom:"0.5rem" }}>
        GAME OVER
      </div>

      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${w.accent}33`,
        borderRadius:14, padding:"1.5rem 2.5rem", margin:"1.2rem 0", textAlign:"center",
        minWidth:280 }}>
        <div style={{ fontSize:"0.65rem", color:"#555", letterSpacing:"0.2em", marginBottom:4 }}>FINAL SCORE</div>
        <div style={{ fontFamily:"Orbitron,monospace", fontSize:"2.8rem", fontWeight:900, color:w.accent,
          textShadow:`0 0 30px ${w.accent}66` }}>{stats.score.toLocaleString()}</div>
        {stats.isNewBest && <div style={{ color:"#00ffcc", fontSize:"0.75rem", letterSpacing:"0.3em",
          marginTop:4, animation:"pulse 1s infinite" }}>★ NEW BEST ★</div>}
        <div style={{ color:"#ffee44", fontSize:"0.85rem", marginTop:6 }}>+{stats.coins} 🪙</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem 1.5rem",
        marginBottom:"1.5rem", fontSize:"0.85rem", color:"#555", width:"min(340px,90vw)" }}>
        {[["Distance", `${stats.dist}m`], ["Level", stats.level], ["Best Combo", `×${stats.maxCombo}`],
          ["Dashes", stats.dashCount], ["Portals", stats.portalsUsed], ["Total Best", store.best.toLocaleString()]
        ].map(([l,v]) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", gap:"1rem" }}>
            <span>{l}</span><span style={{ color:"#ccc", fontFamily:"Orbitron,monospace", fontSize:"0.8rem" }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem", alignItems:"center" }}>
        <Btn onClick={onRetry} accent={w.accent} big>▶ PLAY AGAIN</Btn>
        <Btn onClick={onLeaderboard} variant="sec">🏆 LEADERBOARD</Btn>
        <Btn onClick={onMenu} variant="sec">⌂ MENU</Btn>
      </div>
    </div>
  );
}

// ── SHOP ──
function ShopScreen({ store, tab, setTab, onBuy, onEquip, onBack }) {
  const tabs = [{ id:"skin", label:"Skins" }, { id:"powerup", label:"Power-ups" }, { id:"upgrade", label:"Upgrades" }];
  const items = SHOP_ITEMS.filter(i => i.cat === tab);

  return (
    <div className="fade-in" style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      background:"radial-gradient(ellipse at 50% -20%, #0a1a2a 0%, #0a0a0f 60%)",
      overflow:"hidden" }}>

      {/* Header */}
      <div style={{ padding:"1.2rem 1.5rem 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontFamily:"Orbitron,monospace", fontSize:"1.3rem", fontWeight:900, color:"#00ccff",
          letterSpacing:"0.1em" }}>SHOP</div>
        <div style={{ fontFamily:"Orbitron,monospace", color:"#ffee44", fontSize:"1.1rem" }}>
          🪙 {store.coins.toLocaleString()}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:"0.5rem", padding:"0.8rem 1.5rem" }}>
        {tabs.map(t => (
          <button key={t.id} className="shop-tab" onClick={() => setTab(t.id)}
            style={{ fontFamily:"Orbitron,monospace", fontSize:"0.7rem", padding:"6px 16px", borderRadius:6,
              background: tab === t.id ? "rgba(0,204,255,0.15)" : "rgba(255,255,255,0.04)",
              border:`1px solid ${tab === t.id ? "#00ccff" : "#222"}`,
              color: tab === t.id ? "#00ccff" : "#555", cursor:"pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div style={{ flex:1, overflowY:"auto", padding:"0 1.2rem 1.2rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:"0.8rem" }}>
          {items.map(item => {
            const owned = store.ownedItems.includes(item.id);
            const equipped = store.equippedSkin === item.id;
            const upgradeLevel = store.upgrades[item.id] ?? 0;
            const maxed = item.cat === "upgrade" && upgradeLevel >= item.maxLevel;
            const cost = item.cat === "upgrade" ? item.price * (upgradeLevel + 1) : item.price;
            const canAfford = store.coins >= cost;

            return (
              <div key={item.id} className="item-card" style={{ background:"rgba(255,255,255,0.04)",
                border:`1px solid ${equipped ? "#ffee44" : owned ? "#00ccff33" : "#1a1a1a"}`,
                borderRadius:12, padding:"1rem", display:"flex", flexDirection:"column", gap:"0.5rem" }}>

                {/* Icon / color */}
                <div style={{ textAlign:"center", fontSize:"1.5rem" }}>
                  {item.cat === "skin"
                    ? <div style={{ width:32, height:40, borderRadius:4, background:item.color,
                        boxShadow:`0 0 16px ${item.color}66`, margin:"0 auto" }} />
                    : <span>{item.icon}</span>}
                </div>

                <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.75rem", fontWeight:700, color:"#ccc", textAlign:"center" }}>
                  {item.name}
                </div>
                <div style={{ fontSize:"0.65rem", color:"#555", textAlign:"center", lineHeight:1.4 }}>{item.desc}</div>

                {item.cat === "upgrade" && (
                  <div style={{ display:"flex", gap:3, justifyContent:"center" }}>
                    {[...Array(item.maxLevel)].map((_,i) => (
                      <div key={i} style={{ width:12, height:4, borderRadius:2,
                        background: i < upgradeLevel ? "#00ffcc" : "#222" }} />
                    ))}
                  </div>
                )}

                <div style={{ marginTop:"auto" }}>
                  {item.cat === "skin" && owned && (
                    <button onClick={() => onEquip(item.id)}
                      style={{ width:"100%", padding:"5px 0", borderRadius:6, fontSize:"0.65rem",
                        fontFamily:"Orbitron,monospace", cursor:"pointer",
                        background: equipped ? "#ffee4422" : "transparent",
                        border:`1px solid ${equipped ? "#ffee44" : "#333"}`,
                        color: equipped ? "#ffee44" : "#555" }}>
                      {equipped ? "✓ EQUIPPED" : "EQUIP"}
                    </button>
                  )}
                  {(!owned || item.cat !== "skin") && !maxed && (
                    <button onClick={() => onBuy(item)}
                      style={{ width:"100%", padding:"5px 0", borderRadius:6, fontSize:"0.65rem",
                        fontFamily:"Orbitron,monospace", cursor: canAfford ? "pointer" : "not-allowed",
                        background: canAfford ? "rgba(0,204,255,0.1)" : "transparent",
                        border:`1px solid ${canAfford ? "#00ccff" : "#222"}`,
                        color: canAfford ? "#00ccff" : "#333", transition:"all 0.2s" }}>
                      {item.price === 0 ? "FREE" : `🪙 ${cost.toLocaleString()}`}
                    </button>
                  )}
                  {maxed && <div style={{ textAlign:"center", fontSize:"0.65rem", color:"#00ffcc" }}>✓ MAX LEVEL</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding:"0.8rem 1.5rem" }}>
        <Btn onClick={onBack} variant="sec" style={{ width:"100%" }}>← BACK</Btn>
      </div>
    </div>
  );
}

// ── LEADERBOARD ──
function LeaderboardScreen({ store, onBack }) {
  return (
    <div className="fade-in" style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", background:"radial-gradient(ellipse at 50% 0%, #0f0f2a 0%, #0a0a0f 70%)",
      padding:"1.5rem 1rem", overflow:"hidden" }}>
      <div style={{ fontFamily:"Orbitron,monospace", fontSize:"1.5rem", fontWeight:900, color:"#ffee44",
        letterSpacing:"0.15em", marginBottom:"1.2rem" }}>LEADERBOARD</div>
      <div style={{ flex:1, overflowY:"auto", width:"100%", maxWidth:480 }}>
        {store.leaderboard.length === 0
          ? <div style={{ textAlign:"center", color:"#444", marginTop:"3rem" }}>No runs yet. Play!</div>
          : store.leaderboard.map((run, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.75rem",
              padding:"0.65rem 1rem", borderBottom:"1px solid #111",
              background: i === 0 ? "rgba(255,238,68,0.06)" : "transparent" }}>
              <div style={{ width:24, color: i < 3 ? ["#ffee44","#aaa","#cd7f32"][i] : "#444",
                fontFamily:"Orbitron,monospace", fontSize:"0.8rem", textAlign:"right" }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.95rem",
                  color: i === 0 ? "#ffee44" : "#ccc" }}>{run.score.toLocaleString()}</div>
                <div style={{ fontSize:"0.65rem", color:"#555" }}>
                  {WORLDS[run.worldId]?.name ?? "Neon City"} · {run.distance}m · Lv{run.level}
                </div>
              </div>
              <div style={{ fontSize:"0.7rem", color:"#444" }}>{run.date}</div>
            </div>
          ))
        }
      </div>
      <div style={{ paddingTop:"1rem" }}>
        <Btn onClick={onBack} variant="sec">← BACK</Btn>
      </div>
    </div>
  );
}

// ── WORLDS ──
function WorldsScreen({ store, onUnlock, onBack }) {
  return (
    <div className="fade-in" style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
      alignItems:"center", background:"#0a0a0f", padding:"1.5rem 1rem", overflow:"hidden" }}>
      <div style={{ fontFamily:"Orbitron,monospace", fontSize:"1.5rem", fontWeight:900, color:"#7700ff",
        letterSpacing:"0.15em", marginBottom:"0.5rem" }}>WORLDS</div>
      <div style={{ fontSize:"0.75rem", color:"#555", marginBottom:"1.5rem" }}>
        🪙 {store.coins.toLocaleString()} coins available
      </div>
      <div style={{ flex:1, overflowY:"auto", width:"100%", maxWidth:480, display:"flex", flexDirection:"column", gap:"0.75rem" }}>
        {WORLDS.map(w => {
          const unlocked = store.worldsUnlocked.includes(w.id);
          const canAfford = store.coins >= w.unlockCost;
          return (
            <div key={w.id} style={{ background:`${w.sky[0]}cc`, border:`1.5px solid ${unlocked ? w.accent : "#222"}`,
              borderRadius:14, padding:"1.1rem 1.3rem", display:"flex", alignItems:"center", gap:"1rem" }}>
              <div style={{ width:40, height:40, borderRadius:8, background:w.accent + "33",
                border:`2px solid ${w.accent}`, display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"1.2rem" }}>
                {unlocked ? "🌍" : "🔒"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"Orbitron,monospace", fontWeight:700, color: unlocked ? w.accent : "#444",
                  fontSize:"0.9rem" }}>{w.name}</div>
                <div style={{ fontSize:"0.65rem", color:"#555", marginTop:2 }}>
                  Hazard: {w.hazard} · Special: {w.special}
                </div>
              </div>
              {!unlocked && (
                <button onClick={() => onUnlock(w)}
                  style={{ fontFamily:"Orbitron,monospace", fontSize:"0.65rem", padding:"6px 12px", borderRadius:6,
                    background: canAfford ? `${w.accent}22` : "transparent",
                    border:`1px solid ${canAfford ? w.accent : "#333"}`,
                    color: canAfford ? w.accent : "#333", cursor: canAfford ? "pointer" : "not-allowed" }}>
                  {w.unlockCost === 0 ? "FREE" : `🪙 ${w.unlockCost}`}
                </button>
              )}
              {unlocked && <div style={{ color:w.accent, fontSize:"0.75rem" }}>✓ UNLOCKED</div>}
            </div>
          );
        })}
      </div>
      <div style={{ paddingTop:"1rem" }}>
        <Btn onClick={onBack} variant="sec">← BACK</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  SHARED PRIMITIVES
// ═══════════════════════════════════════════════════
function Btn({ children, onClick, variant = "pri", accent = "#ffee44", big = false, style: s = {} }) {
  const base = { fontFamily:"Orbitron,monospace", fontWeight:700, letterSpacing:"0.12em",
    borderRadius:7, cursor:"pointer", transition:"all 0.15s", display:"flex",
    alignItems:"center", justifyContent:"center",
    width: big ? 260 : 240, height: big ? 52 : 44, fontSize: big ? "0.95rem" : "0.78rem" };
  const variants = {
    pri: { background:accent, color:"#0a0a0f", boxShadow:`0 0 25px ${accent}44`, border:"none" },
    sec: { background:"transparent", color:"#888", border:"1px solid #2a2a2a" },
    danger: { background:"transparent", color:"#ff3355", border:"1px solid rgba(255,51,85,0.3)" },
  };
  return (
    <button className="btn" onClick={onClick} style={{ ...base, ...variants[variant], ...s }}>
      {children}
    </button>
  );
}

function KBD({ children }) {
  return (
    <span style={{ background:"#1a1a1a", border:"1px solid #333", borderRadius:4,
      padding:"1px 6px", fontFamily:"Orbitron,monospace", fontSize:"0.65rem", color:"#ffee44" }}>
      {children}
    </span>
  );
}

function BgGrid() {
  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
      <svg width="100%" height="100%" style={{ opacity:0.07 }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#ffee44" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>
    </div>
  );
}

function ToastStack({ queue }) {
  if (!queue.length) return null;
  const toast = queue[0];
  const colors = { achievement:"#ffee44", best:"#ffee44", success:"#00ffcc", error:"#ff3355", info:"#888", powerup:"#ff77ff" };
  const c = toast.color || colors[toast.type] || "#ffee44";
  return (
    <div style={{ position:"absolute", top:"70px", left:"50%",
      transform:"translateX(-50%)", zIndex:100,
      animation:"slideDown 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
      background:"rgba(10,10,20,0.95)", border:`1px solid ${c}`,
      borderRadius:10, padding:"0.7rem 1.2rem",
      display:"flex", alignItems:"center", gap:"0.7rem",
      boxShadow:`0 4px 30px ${c}33`, whiteSpace:"nowrap" }}>
      <span style={{ fontSize:"1.2rem" }}>{toast.icon}</span>
      <div>
        <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.75rem", fontWeight:700, color:c }}>
          {toast.title}
        </div>
        {toast.body && <div style={{ fontSize:"0.7rem", color:"#666", marginTop:1 }}>{toast.body}</div>}
      </div>
    </div>
  );
}