'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// BUMP KNIGHTS: OVERDRIVE ULTRA — World's Best Multiplayer Arena
// ============================================================

const W = 1100, H = 680;
const GRAVITY = 0.52;
const FRICTION = 0.80;
const JUMP_FORCE = -12.5;
const SPEED = 1.4;
const MAX_JUMPS = 2;
const STORAGE_KEY = "BUMP_ULTRA_V3";

// ─── UNIQUE PLAYER COLORS (all different, vivid) ──────────────
const PLAYER_COLORS = [
  "#ef4444", // P1 Red
  "#3b82f6", // P2 Blue
  "#10b981", // P3 Emerald
  "#f59e0b", // P4 Amber
];

// ─── SKINS ──────────────────────────────────────────────────
const SKINS = [
  { id: "crimson",   name: "Crimson Knight",  hex: "#ef4444", cost: 0,    unlock: "starter" },
  { id: "azure",     name: "Azure Guardian",  hex: "#3b82f6", cost: 0,    unlock: "starter" },
  { id: "emerald",   name: "Emerald Blade",   hex: "#10b981", cost: 0,    unlock: "starter" },
  { id: "amber",     name: "Amber Warden",    hex: "#f59e0b", cost: 0,    unlock: "starter" },
  { id: "violet",    name: "Void Dancer",     hex: "#8b5cf6", cost: 120,  unlock: "shop" },
  { id: "neon",      name: "Neon Phantom",    hex: "#06b6d4", cost: 200,  unlock: "shop" },
  { id: "rose",      name: "Rose Reaper",     hex: "#f43f5e", cost: 200,  unlock: "shop" },
  { id: "lime",      name: "Lime Specter",    hex: "#84cc16", cost: 200,  unlock: "shop" },
  { id: "gold",      name: "24K Gold",        hex: "#eab308", cost: 400,  unlock: "shop" },
  { id: "silver",    name: "Chrome Titan",    hex: "#94a3b8", cost: 400,  unlock: "shop" },
  { id: "void",      name: "Abyss Lord",      hex: "#18181b", cost: 700,  unlock: "shop", glow: "#8b5cf6" },
  { id: "inferno",   name: "Inferno King",    hex: "#b45309", cost: 700,  unlock: "shop", glow: "#f97316" },
  { id: "ice",       name: "Ice Emperor",     hex: "#bae6fd", cost: 900,  unlock: "shop", glow: "#38bdf8" },
  { id: "glitch",    name: "Glitch Entity",   hex: "#d1fae5", cost: 1200, unlock: "shop", glow: "#10b981", animated: true },
  { id: "cosmic",    name: "Cosmic Deity",    hex: "#312e81", cost: 2000, unlock: "shop", glow: "#a78bfa", animated: true },
];

// ─── HATS ──────────────────────────────────────────────────
const HATS = [
  { id: "none",     name: "Bareheaded",   cost: 0    },
  { id: "halo",     name: "Halo",         cost: 150  },
  { id: "crown",    name: "Royal Crown",  cost: 300  },
  { id: "horns",    name: "Demon Horns",  cost: 400  },
  { id: "tophat",   name: "Top Hat",      cost: 250  },
  { id: "wizard",   name: "Wizard Hat",   cost: 500  },
  { id: "mohawk",   name: "Mohawk",       cost: 200  },
  { id: "antenna",  name: "Bot Antenna",  cost: 350  },
  { id: "halo2",    name: "Dark Halo",    cost: 600  },
  { id: "wings",    name: "Angel Wings",  cost: 800  },
];

// ─── TRAILS ─────────────────────────────────────────────────
const TRAILS = [
  { id: "none",     name: "No Trail",    cost: 0   },
  { id: "dust",     name: "Dust Cloud",  cost: 100 },
  { id: "fire",     name: "Fire Blaze",  cost: 300 },
  { id: "ice2",     name: "Ice Crystals",cost: 300 },
  { id: "sparkle",  name: "Starfield",   cost: 500 },
  { id: "rainbow",  name: "Rainbow",     cost: 700 },
  { id: "vortex",   name: "Dark Vortex", cost: 900 },
  { id: "lightning",name: "Lightning",   cost: 1100},
];

// ─── POWERUPS ───────────────────────────────────────────────
const POWERUP_TYPES = [
  { id: "star",    col: "#eab308", icon: "★", label: "STAR POWER!",  effect: "invuln",    duration: 300, desc: "5s Invincibility" },
  { id: "speed",   col: "#06b6d4", icon: "⚡", label: "OVERDRIVE!",   effect: "speed",     duration: 250, desc: "Speed Boost" },
  { id: "big",     col: "#f97316", icon: "↑", label: "TITAN MODE!",  effect: "big",       duration: 200, desc: "Mega Size" },
  { id: "tiny",    col: "#a78bfa", icon: "↓", label: "MICRO MODE!",  effect: "tiny",      duration: 200, desc: "Tiny & Fast" },
  { id: "ghost",   col: "#64748b", icon: "◈", label: "GHOST!",       effect: "ghost",     duration: 180, desc: "Phase Through Walls" },
  { id: "multiJump",col:"#10b981",icon: "∞", label: "INFINITE JUMP!",effect:"multiJump",  duration: 250, desc: "Unlimited Jumps" },
  { id: "freeze",  col: "#93c5fd", icon: "❄", label: "FREEZE ALL!",  effect: "freeze",    duration: 0,   desc: "Freeze Others" },
  { id: "bomb",    col: "#ef4444", icon: "💥", label: "BOMB!",        effect: "bomb",      duration: 0,   desc: "Area Explosion" },
];

// ─── WORLDS ─────────────────────────────────────────────────
const WORLDS = [
  {
    id: "arena",
    name: "The Arena",
    emoji: "⚔️",
    desc: "Classic battleground with solid platforms",
    bg: ["#0a0a0f", "#0f172a"],
    gridCol: "rgba(56,189,248,0.04)",
    platforms: [
      { x: 0, y: H-40, w: W, h: 40, type: "floor" },
      { x: 180, y: H-190, w: 220, h: 22 },
      { x: W-400, y: H-190, w: 220, h: 22 },
      { x: W/2-150, y: H-340, w: 300, h: 22 },
      { x: 60, y: H-330, w: 100, h: 22 },
      { x: W-160, y: H-330, w: 100, h: 22 },
    ],
    portals: [],
    springs: [],
  },
  {
    id: "sky",
    name: "Sky Islands",
    emoji: "☁️",
    desc: "No ground! Master the air or perish",
    bg: ["#0c1445", "#1e1b4b"],
    gridCol: "rgba(167,139,250,0.04)",
    platforms: [
      { x: W/2-280, y: H-130, w: 200, h: 22 },
      { x: W/2+80,  y: H-130, w: 200, h: 22 },
      { x: 60,      y: H-280, w: 180, h: 22 },
      { x: W-240,   y: H-280, w: 180, h: 22 },
      { x: W/2-120, y: H-430, w: 240, h: 22 },
      { x: 200,     y: H-500, w: 120, h: 22 },
      { x: W-320,   y: H-500, w: 120, h: 22 },
    ],
    portals: [
      { x: 40, y: H-80, w: 40, h: 60, pairId: 1, col: "#a78bfa" },
      { x: W-80, y: H-80, w: 40, h: 60, pairId: 1, col: "#a78bfa" },
    ],
    springs: [],
  },
  {
    id: "pit",
    name: "The Pit",
    emoji: "🕳️",
    desc: "Walls trap you. Fall and you're done",
    bg: ["#1c0303", "#2d0a0a"],
    gridCol: "rgba(239,68,68,0.04)",
    platforms: [
      { x: 0, y: 0, w: 35, h: H, type: "wall" },
      { x: W-35, y: 0, w: 35, h: H, type: "wall" },
      { x: 35, y: H-40, w: 300, h: 40 },
      { x: W-335, y: H-40, w: 300, h: 40 },
      { x: W/2-110, y: H-220, w: 220, h: 22 },
      { x: 100, y: H-370, w: 160, h: 22 },
      { x: W-260, y: H-370, w: 160, h: 22 },
    ],
    portals: [],
    springs: [
      { x: W/2-25, y: H-262, w: 50, h: 20, force: -18, col: "#10b981" },
    ],
  },
  {
    id: "maze",
    name: "Crystal Maze",
    emoji: "💎",
    desc: "Tight corridors and secret passages",
    bg: ["#001a1a", "#002a2a"],
    gridCol: "rgba(6,182,212,0.04)",
    platforms: [
      { x: 0, y: H-40, w: 300, h: 40, type: "floor" },
      { x: W-300, y: H-40, w: 300, h: 40, type: "floor" },
      { x: W/2-60, y: H-40, w: 120, h: 40, type: "floor" },
      { x: 0, y: H-200, w: 200, h: 22 },
      { x: W-200, y: H-200, w: 200, h: 22 },
      { x: W/2-80, y: H-160, w: 160, h: 22 },
      { x: 150, y: H-340, w: 180, h: 22 },
      { x: W-330, y: H-340, w: 180, h: 22 },
      { x: W/2-100, y: H-340, w: 200, h: 22 },
      { x: 0, y: H-480, w: 150, h: 22 },
      { x: W-150, y: H-480, w: 150, h: 22 },
      { x: W/2-140, y: H-500, w: 280, h: 22 },
    ],
    portals: [
      { x: W/2-200, y: H-100, w: 35, h: 55, pairId: 2, col: "#06b6d4" },
      { x: W/2+165, y: H-100, w: 35, h: 55, pairId: 2, col: "#06b6d4" },
    ],
    springs: [
      { x: 50, y: H-222, w: 50, h: 20, force: -16, col: "#10b981" },
      { x: W-100, y: H-222, w: 50, h: 20, force: -16, col: "#10b981" },
    ],
  },
  {
    id: "portal",
    name: "Warp Zone",
    emoji: "🌀",
    desc: "Portals everywhere — never know where you'll end up!",
    bg: ["#0d001a", "#1a0030"],
    gridCol: "rgba(168,85,247,0.04)",
    platforms: [
      { x: 0, y: H-40, w: W, h: 40, type: "floor" },
      { x: 200, y: H-160, w: 160, h: 22 },
      { x: W-360, y: H-160, w: 160, h: 22 },
      { x: W/2-100, y: H-280, w: 200, h: 22 },
      { x: 80, y: H-380, w: 140, h: 22 },
      { x: W-220, y: H-380, w: 140, h: 22 },
    ],
    portals: [
      { x: 0, y: H-240, w: 35, h: 60, pairId: 3, col: "#c084fc" },
      { x: W-35, y: H-240, w: 35, h: 60, pairId: 3, col: "#c084fc" },
      { x: 300, y: H-80, w: 35, h: 40, pairId: 4, col: "#f472b6" },
      { x: W-335, y: H-80, w: 35, h: 40, pairId: 4, col: "#f472b6" },
      { x: W/2-17, y: H-80, w: 35, h: 40, pairId: 5, col: "#60a5fa" },
      { x: W/2-17, y: H-490, w: 35, h: 40, pairId: 5, col: "#60a5fa" },
    ],
    springs: [
      { x: 130, y: H-62, w: 50, h: 22, force: -17, col: "#10b981" },
      { x: W-180, y: H-62, w: 50, h: 22, force: -17, col: "#10b981" },
    ],
  },
  {
    id: "tower",
    name: "Battle Tower",
    emoji: "🗼",
    desc: "Vertical warfare — fight your way to the top!",
    bg: ["#0a0805", "#1c1408"],
    gridCol: "rgba(234,179,8,0.04)",
    platforms: [
      { x: 0, y: H-40, w: W, h: 40, type: "floor" },
      { x: W/2-200, y: H-130, w: 140, h: 22 },
      { x: W/2+60, y: H-130, w: 140, h: 22 },
      { x: W/2-100, y: H-250, w: 200, h: 22 },
      { x: 80, y: H-320, w: 120, h: 22 },
      { x: W-200, y: H-320, w: 120, h: 22 },
      { x: W/2-80, y: H-400, w: 160, h: 22 },
      { x: 180, y: H-480, w: 120, h: 22 },
      { x: W-300, y: H-480, w: 120, h: 22 },
      { x: W/2-60, y: H-560, w: 120, h: 22 },
    ],
    portals: [],
    springs: [
      { x: W/2-25, y: H-62, w: 50, h: 22, force: -20, col: "#f59e0b" },
      { x: 180, y: H-342, w: 50, h: 22, force: -16, col: "#10b981" },
      { x: W-230, y: H-342, w: 50, h: 22, force: -16, col: "#10b981" },
    ],
  },
];

// ─── DEFAULT SAVE DATA ──────────────────────────────────────
const DEFAULT_SAVE = {
  coins: 500,
  ownedSkins: ["crimson","azure","emerald","amber"],
  ownedHats: ["none"],
  ownedTrails: ["none"],
  equip: {
    p1: { skin: "crimson", hat: "none", trail: "none" },
    p2: { skin: "azure",   hat: "none", trail: "none" },
    p3: { skin: "emerald", hat: "none", trail: "none" },
    p4: { skin: "amber",   hat: "none", trail: "none" },
  },
  stats: { kills: 0, wins: 0, gamesPlayed: 0 },
};

// ─── UTILS ──────────────────────────────────────────────────
const rectIntersect = (r1, r2) =>
  !(r2.x > r1.x+r1.w || r2.x+r2.w < r1.x || r2.y > r1.y+r1.h || r2.y+r2.h < r1.y);
const rand = (min, max) => Math.random()*(max-min)+min;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b-a)*t;

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function BumpKnightsUltra() {
  const canvasRef = useRef(null);
  const reqRef = useRef(null);
  const gs = useRef({ keys: {}, frame: 0, active: false });

  const [save, setSave] = useState(DEFAULT_SAVE);
  const [screen, setScreen] = useState("menu");
  const [config, setConfig] = useState({ humans: 1, bots: 3, winScore: 10, worldId: "arena" });
  const [shopTab, setShopTab] = useState("skins");
  const [shopPlayer, setShopPlayer] = useState(1);
  const [uiSnap, setUiSnap] = useState({ players: [], frame: 0 });
  const [notification, setNotification] = useState(null);
  const [menuAnim, setMenuAnim] = useState(0);

  // ─── LOAD SAVE ────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const loaded = JSON.parse(raw);
        setSave(prev => ({
          ...DEFAULT_SAVE, ...loaded,
          equip: { ...DEFAULT_SAVE.equip, ...(loaded.equip || {}) },
          stats: { ...DEFAULT_SAVE.stats, ...(loaded.stats || {}) },
        }));
      }
    } catch(e) {}

    const down = e => { gs.current.keys[e.code] = true; gs.current.keys[e.key?.toLowerCase()] = true; };
    const up   = e => { gs.current.keys[e.code] = false; gs.current.keys[e.key?.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    // Menu animation
    let af; let f = 0;
    const animMenu = () => { f++; setMenuAnim(f); af = requestAnimationFrame(animMenu); };
    af = requestAnimationFrame(animMenu);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(af);
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  const saveGame = useCallback((data) => {
    setSave(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
  }, []);

  const showNotif = (msg, col="#eab308") => {
    setNotification({ msg, col });
    setTimeout(() => setNotification(null), 2500);
  };

  // ─── ENSURE UNIQUE SKINS ──────────────────────────────────
  const getPlayerSkin = (pid, equip) => {
    const skin = equip[`p${pid}`]?.skin;
    // Check no other active player uses same skin
    return skin || ["crimson","azure","emerald","amber"][pid-1];
  };

  // ─── GET WORLD ────────────────────────────────────────────
  const getWorld = (id) => WORLDS.find(w => w.id === id) || WORLDS[0];

  // ─── START MATCH ─────────────────────────────────────────
  const startMatch = useCallback(() => {
    if (reqRef.current) cancelAnimationFrame(reqRef.current);

    const world = getWorld(config.worldId);

    const humanKeys = [
      { l: "KeyA", r: "KeyD", j: "KeyW", jd: "KeyS" },
      { l: "ArrowLeft", r: "ArrowRight", j: "ArrowUp", jd: "ArrowDown" },
      { l: "KeyJ", r: "KeyL", j: "KeyI", jd: "KeyK" },
      { l: "Numpad4", r: "Numpad6", j: "Numpad8", jd: "Numpad5" },
    ];

    // Assign unique skin per player
    const usedSkins = [];
    const assignSkin = (pid) => {
      let s = save.equip[`p${pid}`]?.skin;
      if (!s || usedSkins.includes(s)) {
        // Find first owned skin not used
        s = save.ownedSkins.find(sk => !usedSkins.includes(sk)) || SKINS[pid-1].id;
      }
      usedSkins.push(s);
      return s;
    };

    let players = [];
    for (let i = 0; i < config.humans; i++) {
      const pid = i + 1;
      const skinId = assignSkin(pid);
      const skinData = SKINS.find(s => s.id === skinId) || SKINS[i];
      const hatId = save.equip[`p${pid}`]?.hat || "none";
      const trailId = save.equip[`p${pid}`]?.trail || "none";
      players.push({
        pid, id: pid, type: "human",
        keys: humanKeys[i],
        w: 30, h: 30, x: 150 + i*200, y: 100,
        vx: 0, vy: 0,
        score: 0, jumps: MAX_JUMPS, invuln: 0, respawn: 0,
        jumpHeld: false, jumpPressed: false,
        effects: {},
        col: skinData.hex, glow: skinData.glow,
        skinId, hatId, trailId,
        label: `P${pid}`,
        portalCooldown: 0,
      });
    }

    const botNames = ["ACE","DOOM","NOVA","FURY","ZETA","APEX"];
    const botColors = ["#94a3b8","#f97316","#c084fc","#14b8a6","#fb923c","#e879f9"];
    for (let i = 0; i < config.bots; i++) {
      const pid = config.humans + i + 1;
      players.push({
        pid, id: pid, type: "bot",
        w: 30, h: 30, x: W - 150 - i*200, y: 100,
        vx: 0, vy: 0,
        score: 0, jumps: MAX_JUMPS, invuln: 0, respawn: 0,
        jumpHeld: false, effects: {},
        col: botColors[i % botColors.length],
        skinId: "none", hatId: "none", trailId: "none",
        label: botNames[i % botNames.length],
        botTimer: 0, botDir: 1, botStateTimer: 0, botTargetX: W/2,
        portalCooldown: 0,
      });
    }

    gs.current = {
      keys: gs.current.keys, frame: 0, active: true,
      hitstop: 0, shake: 0, shakeMag: 0,
      players,
      platforms: world.platforms,
      portals: world.portals.map(p => ({ ...p })),
      springs: world.springs.map(s => ({ ...s })),
      particles: [],
      popups: [],
      powerups: [],
      winner: null,
      world,
      winScore: config.winScore,
      saveRef: save,
    };

    setScreen("playing");
    reqRef.current = requestAnimationFrame(loopFn);
  // eslint-disable-next-line
  }, [config, save]);

  // ─── GAME LOOP ────────────────────────────────────────────
  const loopFn = useCallback(() => {
    const g = gs.current;
    if (!g.active) return;

    if (g.hitstop > 0) {
      g.hitstop--;
      draw(g);
      reqRef.current = requestAnimationFrame(loopFn);
      return;
    }

    g.frame++;
    if (g.shake > 0) g.shake--;

    // ── POWERUP SPAWNER ──
    if (g.frame % 480 === 0 && Math.random() < 0.75) {
      const type = POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)];
      g.powerups.push({
        x: rand(80, W-80), y: -40, vy: 1.5,
        grounded: false, life: 800,
        type, bobPhase: rand(0, Math.PI*2),
      });
    }

    // ── PLAYERS ──
    let highestScore = 0;

    for (let i = 0; i < g.players.length; i++) {
      let p = g.players[i];

      if (p.respawn > 0) {
        p.respawn--;
        if (p.respawn === 0) {
          p.x = rand(100, W-100); p.y = -60;
          p.vx = 0; p.vy = 0;
          p.invuln = 150;
          p.effects = {};
          p.jumps = MAX_JUMPS;
        }
        continue;
      }

      if (p.invuln > 0) p.invuln--;

      // Tick effects
      for (const eff in p.effects) {
        p.effects[eff]--;
        if (p.effects[eff] <= 0) delete p.effects[eff];
      }

      if (p.portalCooldown > 0) p.portalCooldown--;

      // ── SIZE from effects ──
      const isBig  = !!p.effects.big;
      const isTiny = !!p.effects.tiny;
      p.w = isBig ? 48 : isTiny ? 16 : 30;
      p.h = isBig ? 48 : isTiny ? 16 : 30;

      let moveX = 0, doJump = false;

      // ── HUMAN INPUT ──
      if (p.type === "human") {
        if (g.keys[p.keys.l]) moveX -= 1;
        if (g.keys[p.keys.r]) moveX += 1;
        const jumpKey = g.keys[p.keys.j];
        if (jumpKey && !p.jumpHeld) {
          const maxJ = p.effects.multiJump ? 99 : MAX_JUMPS;
          if (p.jumps > 0) { doJump = true; p.jumps--; }
        }
        p.jumpHeld = !!g.keys[p.keys.j];
      }
      // ── BOT AI ──
      else {
        p.botStateTimer--;
        if (p.botStateTimer <= 0) {
          // Pick nearest enemy as target, with some randomness
          let target = null, best = 600;
          g.players.forEach(op => {
            if (op !== p && op.respawn === 0) {
              const d = Math.hypot(p.x-op.x, p.y-op.y);
              if (d < best) { best = d; target = op; }
            }
          });

          if (target && Math.random() < 0.7) {
            p.botTargetX = target.x;
            // Jump to reach target or avoid fall
            if ((target.y < p.y - 40 || p.vy > 5) && p.jumps > 0 && Math.random() < 0.4) {
              doJump = true; p.jumps--;
            }
          } else {
            p.botTargetX = rand(80, W-80);
          }
          p.botStateTimer = Math.floor(rand(20,60));
        }

        const dx = p.botTargetX - (p.x + p.w/2);
        if (Math.abs(dx) > 15) moveX = dx > 0 ? 1 : -1;

        // Random jump
        if (Math.random() < 0.008 && p.jumps > 0) { doJump = true; p.jumps--; }

        // Avoid falling off edge
        if (p.vy > 3 && p.jumps > 0 && Math.random() < 0.3) { doJump = true; p.jumps--; }
      }

      // ── PHYSICS ──
      const speedMul = p.effects.speed ? 2.0 : isTiny ? 1.8 : isBig ? 0.75 : 1.0;
      p.vx += moveX * SPEED * speedMul;
      p.vy += p.effects.ghost ? GRAVITY * 0.3 : GRAVITY;
      p.vx *= FRICTION;
      if (Math.abs(p.vx) > (p.effects.speed ? 18 : 12)) p.vx = Math.sign(p.vx) * (p.effects.speed ? 18 : 12);

      if (doJump) {
        const jf = isBig ? JUMP_FORCE * 0.85 : isTiny ? JUMP_FORCE * 1.2 : JUMP_FORCE;
        p.vy = jf;
        spawnDust(g, p.x+p.w/2, p.y+p.h, p.col);
      }

      // ── MOVEMENT ──
      p.x += p.vx;
      p.y += p.vy;

      // Horizontal wrap
      if (p.x < -p.w) p.x = W;
      if (p.x > W) p.x = -p.w;
      // Fall off bottom → respawn
      if (p.y > H + 80) {
        doKillPlayer(g, p, null);
        continue;
      }
      // Clamp top
      if (p.y < -200) { p.vy = 2; }

      let grounded = false;

      // ── PLATFORM COLLISIONS ──
      if (!p.effects.ghost) {
        g.platforms.forEach(plat => {
          if (!rectIntersect(p, plat)) return;
          if (plat.type === "wall") {
            if (p.vx > 0) { p.x = plat.x - p.w; p.vx *= -0.3; }
            else { p.x = plat.x + plat.w; p.vx *= -0.3; }
            return;
          }
          const prevBot = p.y + p.h - p.vy;
          if (p.vy >= 0 && prevBot <= plat.y + 8) {
            p.y = plat.y - p.h; p.vy = 0;
            p.jumps = p.effects.multiJump ? 99 : MAX_JUMPS;
            grounded = true;
          } else if (p.vy < 0 && p.y - p.vy >= plat.y + plat.h - 6) {
            p.y = plat.y + plat.h; p.vy = Math.abs(p.vy) * 0.4;
          }
        });
      }

      // ── SPRING COLLISIONS ──
      g.springs.forEach(sp => {
        const spr = { x: sp.x, y: sp.y, w: sp.w, h: sp.h };
        if (rectIntersect(p, spr) && p.vy >= 0 && p.y + p.h - p.vy <= sp.y + 8) {
          p.vy = sp.force;
          p.jumps = p.effects.multiJump ? 99 : MAX_JUMPS;
          sp.anim = 8;
          g.popups.push({ x: p.x, y: p.y-20, txt: "BOING!", col: sp.col, life: 30 });
          spawnBurst(g, sp.x+sp.w/2, sp.y, sp.col, 6);
        }
      });
      g.springs.forEach(sp => { if (sp.anim > 0) sp.anim--; });

      // ── PORTAL COLLISIONS ──
      if (p.portalCooldown <= 0) {
        for (let pi = 0; pi < g.portals.length; pi++) {
          const portal = g.portals[pi];
          if (rectIntersect(p, portal)) {
            // Find matching portal
            const partner = g.portals.find((pp, idx) => idx !== pi && pp.pairId === portal.pairId);
            if (partner) {
              p.x = partner.x + partner.w/2 - p.w/2;
              p.y = partner.y;
              p.portalCooldown = 60;
              spawnBurst(g, p.x+p.w/2, p.y+p.h/2, portal.col, 12);
              g.popups.push({ x: p.x, y: p.y-20, txt: "WARP!", col: portal.col, life: 28 });
              break;
            }
          }
        }
      }

      // ── TRAILS ──
      if (p.trailId !== "none" && g.frame % 2 === 0 && (Math.abs(p.vx) > 0.5 || Math.abs(p.vy) > 0.5)) {
        let tcol = p.col;
        if (p.trailId === "fire") tcol = g.frame%3===0 ? "#f97316" : "#ef4444";
        if (p.trailId === "ice2") tcol = "#bae6fd";
        if (p.trailId === "sparkle") tcol = g.frame%3===0 ? "#eab308" : "#fde68a";
        if (p.trailId === "rainbow") tcol = `hsl(${(g.frame*6)%360},100%,60%)`;
        if (p.trailId === "vortex") tcol = "#8b5cf6";
        if (p.trailId === "lightning") tcol = g.frame%2===0?"#fcd34d":"#ffffff";
        const ts = p.trailId === "sparkle" || p.trailId === "rainbow" ? rand(2,5) : rand(3,6);
        g.particles.push({ x: p.x+p.w/2+rand(-4,4), y: p.y+p.h/2+rand(-4,4), vx: rand(-1,1), vy: rand(-0.5,0.5), col: tcol, life: 20, s: ts, alpha: 0.8 });
      }

      if (p.score > highestScore) highestScore = p.score;
    }

    // ── PLAYER vs PLAYER ──
    for (let i = 0; i < g.players.length; i++) {
      for (let j = i+1; j < g.players.length; j++) {
        const a = g.players[i], b = g.players[j];
        if (a.respawn > 0 || b.respawn > 0) continue;
        if (!rectIntersect(a, b)) continue;
        if (a.effects.ghost || b.effects.ghost) continue;

        const aBot = a.y + a.h;
        const bBot = b.y + b.h;

        // Stomp: A lands on B
        if (a.vy > 1 && aBot - a.vy <= b.y + 6) {
          if (b.invuln === 0) { doKillPlayer(g, b, a); a.vy = JUMP_FORCE*0.7; a.jumps = MAX_JUMPS; }
        }
        // Stomp: B lands on A
        else if (b.vy > 1 && bBot - b.vy <= a.y + 6) {
          if (a.invuln === 0) { doKillPlayer(g, a, b); b.vy = JUMP_FORCE*0.7; b.jumps = MAX_JUMPS; }
        }
        // Side bump
        else {
          const push = a.x < b.x ? 5 : -5;
          const pushPow = (a.effects.big || b.effects.big) ? 8 : 5;
          a.vx = -push * (a.invuln ? 0.3 : 1);
          b.vx =  push * (b.invuln ? 0.3 : 1);
          if (a.invuln === 0 && b.invuln > 0) doKillPlayer(g, a, b);
          else if (b.invuln === 0 && a.invuln > 0) doKillPlayer(g, b, a);
        }
      }
    }

    // ── POWERUPS ──
    for (let i = g.powerups.length-1; i >= 0; i--) {
      const pw = g.powerups[i];
      if (!pw.grounded) {
        pw.vy = Math.min(pw.vy + GRAVITY*0.5, 6);
        pw.y += pw.vy;
        g.platforms.forEach(plat => {
          if (plat.type === "wall") return;
          if (rectIntersect({x:pw.x-10,y:pw.y-10,w:20,h:20}, plat) && pw.vy >= 0 && pw.y - pw.vy <= plat.y + 5) {
            pw.y = plat.y - 10; pw.vy = 0; pw.grounded = true;
          }
        });
        if (pw.y > H-50) { pw.y = H-50; pw.grounded = true; pw.vy = 0; }
      }
      pw.life--;

      let grabbed = false;
      for (let pi = 0; pi < g.players.length; pi++) {
        const p = g.players[pi];
        if (p.respawn > 0) continue;
        if (rectIntersect(p, {x:pw.x-12,y:pw.y-12,w:24,h:24})) {
          applyPowerup(g, p, pw.type);
          grabbed = true; break;
        }
      }
      if (grabbed || pw.life <= 0) { g.powerups.splice(i,1); }
    }

    // ── PARTICLES ──
    for (let i = g.particles.length-1; i >= 0; i--) {
      const p = g.particles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      p.vy += 0.08; p.vx *= 0.97;
      if (p.life <= 0) g.particles.splice(i,1);
    }

    // ── POPUPS ──
    for (let i = g.popups.length-1; i >= 0; i--) {
      const p = g.popups[i];
      p.y -= 1.2; p.life--;
      if (p.life <= 0) g.popups.splice(i,1);
    }

    // ── WIN CHECK ──
    if (highestScore >= g.winScore && !g.winner) {
      g.winner = g.players.find(p => p.score >= g.winScore);
      g.active = false;
      if (g.winner?.type === "human") {
        const ns = {
          ...g.saveRef,
          coins: g.saveRef.coins + 150,
          stats: { ...g.saveRef.stats, wins: g.saveRef.stats.wins+1, gamesPlayed: g.saveRef.stats.gamesPlayed+1 }
        };
        saveGame(ns);
      } else {
        const ns = { ...g.saveRef, stats: { ...g.saveRef.stats, gamesPlayed: g.saveRef.stats.gamesPlayed+1 } };
        saveGame(ns);
      }
      setTimeout(() => setScreen("gameover"), 3000);
    }

    draw(g);

    if (g.frame % 4 === 0) setUiSnap({ players: g.players.map(p => ({...p})), frame: g.frame });
    if (g.active) reqRef.current = requestAnimationFrame(loopFn);
  // eslint-disable-next-line
  }, [saveGame]);

  // ── POWERUP APPLICATION ──
  const applyPowerup = (g, p, type) => {
    g.popups.push({ x: p.x, y: p.y-25, txt: type.label, col: type.col, life: 50 });
    spawnBurst(g, p.x+p.w/2, p.y+p.h/2, type.col, 15);

    if (type.effect === "bomb") {
      // Kill all nearby players
      g.players.forEach(op => {
        if (op !== p && op.respawn === 0 && op.invuln === 0) {
          const d = Math.hypot(p.x - op.x, p.y - op.y);
          if (d < 200) doKillPlayer(g, op, p);
        }
      });
      spawnBurst(g, p.x+p.w/2, p.y+p.h/2, "#ef4444", 30);
      g.shake = 18; g.shakeMag = 12;
      return;
    }
    if (type.effect === "freeze") {
      g.players.forEach(op => {
        if (op !== p && op.respawn === 0) { op.effects.frozen = 180; op.vx = 0; }
      });
      return;
    }
    p.effects[type.effect] = type.duration;
    if (type.effect === "invuln") p.invuln = type.duration;

    if (p.type === "human") {
      const ns = { ...g.saveRef, coins: g.saveRef.coins + 10 };
      g.saveRef = ns;
      saveGame(ns);
    }
  };

  const doKillPlayer = (g, victim, killer) => {
    if (victim.respawn > 0) return;
    victim.respawn = 130;

    if (killer) {
      killer.score += 1;
      killer.vy = JUMP_FORCE * 0.75;
      killer.jumps = MAX_JUMPS;
      if (killer.type === "human") {
        g.popups.push({ x: killer.x, y: killer.y-20, txt: "+1 POINT", col: "#10b981", life: 40 });
        const ns = { ...g.saveRef, coins: g.saveRef.coins+8, stats: { ...g.saveRef.stats, kills: g.saveRef.stats.kills+1 } };
        g.saveRef = ns;
        saveGame(ns);
      }
    }

    g.hitstop = 6;
    g.shake = 12; g.shakeMag = 8;

    spawnBurst(g, victim.x+victim.w/2, victim.y+victim.h/2, victim.col, 28);
    if (killer) g.popups.push({ x: victim.x, y: victim.y-30, txt: "OVERDRIVE!", col: killer.col, life: 55 });
  };

  const spawnDust = (g, x, y, col) => {
    for (let k=0;k<6;k++) g.particles.push({ x, y, vx: rand(-2.5,2.5), vy: rand(-1.5,0.5), col: "#94a3b8", life: 18, s: rand(3,5), alpha: 0.6 });
  };
  const spawnBurst = (g, x, y, col, count=20) => {
    for (let k=0;k<count;k++) {
      const angle = (k/count)*Math.PI*2;
      const spd = rand(3,9);
      g.particles.push({ x, y, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd-2, col, life: rand(18,38), s: rand(3,7), alpha: 1 });
    }
  };

  // ─── CANVAS DRAW ─────────────────────────────────────────
  const draw = (g) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.save();

    if (g.shake > 0 && g.shakeMag > 0) {
      ctx.translate(rand(-g.shakeMag,g.shakeMag)*0.5, rand(-g.shakeMag,g.shakeMag)*0.5);
    }

    const world = g.world;

    // ── BG GRADIENT ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, world.bg[0]);
    bgGrad.addColorStop(1, world.bg[1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── GRID ──
    ctx.strokeStyle = world.gridCol; ctx.lineWidth = 1;
    for (let xi=0;xi<W;xi+=60) { ctx.beginPath(); ctx.moveTo(xi,0); ctx.lineTo(xi,H); ctx.stroke(); }
    for (let yi=0;yi<H;yi+=60) { ctx.beginPath(); ctx.moveTo(0,yi); ctx.lineTo(W,yi); ctx.stroke(); }

    // ── PORTALS ──
    g.portals.forEach(portal => {
      const pulse = 0.6 + 0.4 * Math.sin(g.frame*0.08 + portal.pairId);
      ctx.save();
      ctx.shadowBlur = 20 * pulse;
      ctx.shadowColor = portal.col;
      ctx.fillStyle = portal.col + "aa";
      ctx.fillRect(portal.x, portal.y, portal.w, portal.h);
      // Swirl lines
      ctx.strokeStyle = portal.col;
      ctx.lineWidth = 2;
      for (let pi=0;pi<3;pi++) {
        ctx.beginPath();
        const cx = portal.x + portal.w/2, cy = portal.y + portal.h/2;
        const r = (portal.w/2)*0.8;
        const startA = g.frame*0.06 + pi*(Math.PI*2/3);
        ctx.arc(cx, cy, r, startA, startA + Math.PI*1.2);
        ctx.stroke();
      }
      ctx.restore();
    });

    // ── SPRINGS ──
    g.springs.forEach(sp => {
      const compress = sp.anim || 0;
      ctx.fillStyle = sp.col;
      ctx.fillRect(sp.x, sp.y + compress*0.5, sp.w, sp.h - compress*0.5);
      // Spring coils
      ctx.strokeStyle = "#ffffff44"; ctx.lineWidth = 2;
      const coils = 4;
      for (let ci=0;ci<coils;ci++) {
        const yt = sp.y + (ci/coils)*sp.h;
        ctx.beginPath(); ctx.moveTo(sp.x+2, yt); ctx.lineTo(sp.x+sp.w-2, yt+sp.h/coils*0.5); ctx.stroke();
      }
    });

    // ── PLATFORMS ──
    g.platforms.forEach(plat => {
      if (plat.type === "wall") {
        const wg = ctx.createLinearGradient(plat.x, 0, plat.x+plat.w, 0);
        wg.addColorStop(0, "#1e293b"); wg.addColorStop(1, "#0f172a");
        ctx.fillStyle = wg;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        return;
      }
      // Platform body
      ctx.fillStyle = plat.type === "floor" ? "#1a1a2e" : "#1e293b";
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      // Top edge highlight
      const edgeGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x+plat.w, plat.y);
      edgeGrad.addColorStop(0, "#3f3f6688");
      edgeGrad.addColorStop(0.5, "#6366f144");
      edgeGrad.addColorStop(1, "#3f3f6688");
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(plat.x, plat.y, plat.w, 4);
    });

    // ── POWERUPS ──
    g.powerups.forEach(pw => {
      const pulse = 1 + 0.15 * Math.sin(g.frame*0.1 + pw.bobPhase);
      const bob = Math.sin(g.frame*0.07 + pw.bobPhase)*4;
      ctx.save();
      ctx.shadowBlur = 15 * pulse;
      ctx.shadowColor = pw.type.col;
      ctx.fillStyle = pw.type.col;
      ctx.beginPath();
      ctx.arc(pw.x, pw.y - 10 + bob, 12 * pulse, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = `bold ${Math.round(13*pulse)}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(pw.type.icon, pw.x, pw.y - 10 + bob);
      ctx.restore();
    });

    // ── PARTICLES ──
    for (const p of g.particles) {
      const alpha = (p.alpha || 1) * (p.life / 30);
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.s/2, p.y - p.s/2, p.s, p.s);
    }
    ctx.globalAlpha = 1;

    // ── PLAYERS ──
    for (const p of g.players) {
      if (p.respawn > 0) {
        // Ghost indicator: where they'll respawn
        if (p.respawn < 40) {
          ctx.globalAlpha = (40 - p.respawn) / 40 * 0.4;
          ctx.fillStyle = p.col;
          ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.globalAlpha = 1;
        }
        continue;
      }

      ctx.save();

      // Invuln flash
      if (p.invuln > 0 && g.frame % 8 < 4) {
        ctx.globalAlpha = 0.5;
      }

      // Frozen effect
      if (p.effects.frozen) {
        ctx.shadowBlur = 15; ctx.shadowColor = "#93c5fd";
      }

      // Star/invuln glow
      if (p.effects.invuln) {
        ctx.shadowBlur = 20 + Math.sin(g.frame*0.2)*8;
        ctx.shadowColor = "#eab308";
      }

      // Ghost effect
      if (p.effects.ghost) {
        ctx.globalAlpha = 0.5;
        ctx.shadowBlur = 10; ctx.shadowColor = p.col;
      }

      // Skin glow
      const skinDef = SKINS.find(s=>s.id===p.skinId);
      if (skinDef?.glow) {
        ctx.shadowBlur = 12; ctx.shadowColor = skinDef.glow;
      }

      // Body
      ctx.fillStyle = p.effects.frozen ? "#93c5fd" : p.col;

      if (p.effects.big || p.effects.tiny) {
        ctx.fillRect(p.x, p.y, p.w, p.h);
      } else {
        // Rounded corners via arc approximation
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(p.x+r, p.y);
        ctx.lineTo(p.x+p.w-r, p.y);
        ctx.quadraticCurveTo(p.x+p.w, p.y, p.x+p.w, p.y+r);
        ctx.lineTo(p.x+p.w, p.y+p.h-r);
        ctx.quadraticCurveTo(p.x+p.w, p.y+p.h, p.x+p.w-r, p.y+p.h);
        ctx.lineTo(p.x+r, p.y+p.h);
        ctx.quadraticCurveTo(p.x, p.y+p.h, p.x, p.y+p.h-r);
        ctx.lineTo(p.x, p.y+r);
        ctx.quadraticCurveTo(p.x, p.y, p.x+r, p.y);
        ctx.closePath();
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // Eyes
      if (!p.effects.frozen) {
        const eyeCol = p.effects.invuln ? "#eab308" : p.type==="bot" ? "#ef4444" : "#ffffff";
        ctx.fillStyle = eyeCol;
        const eyeOff = p.vx > 0.5 ? 3 : p.vx < -0.5 ? -3 : 0;
        const ew = p.w > 30 ? 9 : p.w < 20 ? 4 : 7;
        const eh = p.w > 30 ? 11 : p.w < 20 ? 5 : 9;

        if (p.type === "bot") {
          ctx.fillRect(p.x+5+eyeOff, p.y+8, ew-2, eh-2);
          ctx.fillRect(p.x+p.w-5-ew+2+eyeOff, p.y+8, ew-2, eh-2);
          // Antenna
          ctx.fillStyle = "#64748b";
          ctx.fillRect(p.x+p.w/2-2, p.y-10, 4, 10);
          ctx.fillStyle = "#ef4444";
          ctx.beginPath(); ctx.arc(p.x+p.w/2, p.y-10, 3, 0, Math.PI*2); ctx.fill();
        } else {
          ctx.fillRect(p.x+4+eyeOff, p.y+6, ew, eh);
          ctx.fillRect(p.x+p.w-4-ew+eyeOff, p.y+6, ew, eh);
          ctx.fillStyle = "#000";
          ctx.fillRect(p.x+6+eyeOff, p.y+10, ew-3, eh-4);
          ctx.fillRect(p.x+p.w-2-ew+eyeOff, p.y+10, ew-3, eh-4);
        }
      } else {
        // Frozen X eyes
        ctx.fillStyle = "#1e40af"; ctx.font = "bold 10px system-ui"; ctx.textAlign = "center";
        ctx.fillText("x x", p.x+p.w/2, p.y+14);
      }

      // HATS
      drawHat(ctx, p, g.frame);

      // Label above
      ctx.fillStyle = p.type==="bot" ? "#f87171" : "#7dd3fc";
      ctx.font = `900 10px "Trebuchet MS", system-ui`; ctx.textAlign = "center";
      ctx.shadowBlur = 4; ctx.shadowColor = "#000";
      ctx.fillText(p.label, p.x+p.w/2, p.y - (p.hatId!=="none"&&p.hatId!==undefined?22:15));
      ctx.shadowBlur = 0;

      // Effect indicators
      if (p.effects.speed) {
        ctx.fillStyle = "#06b6d4"; ctx.font = "10px system-ui";
        ctx.fillText("⚡", p.x+p.w+3, p.y+10);
      }
      if (p.effects.multiJump) {
        ctx.fillStyle = "#10b981"; ctx.font = "10px system-ui";
        ctx.fillText("∞", p.x+p.w+3, p.y+22);
      }

      ctx.restore();
    }

    // ── POPUPS ──
    for (const pp of g.popups) {
      const alpha = Math.min(1, pp.life/25);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pp.col;
      ctx.font = `900 ${pp.big?28:20}px "Trebuchet MS", system-ui`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 8; ctx.shadowColor = "#000";
      ctx.fillText(pp.txt, pp.x+15, pp.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // ── WIN OVERLAY ──
    if (g.winner) {
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      ctx.fillRect(0, H/2-100, W, 200);
      ctx.fillStyle = g.winner.col;
      ctx.font = `900 62px "Trebuchet MS", system-ui`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 30; ctx.shadowColor = g.winner.col;
      ctx.fillText(`${g.winner.label} WINS!`, W/2, H/2+10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#eab308"; ctx.font = `bold 24px system-ui`;
      ctx.fillText("+150 COINS EARNED!", W/2, H/2+55);
    }

    ctx.restore();
  };

  const drawHat = (ctx, p, frame) => {
    const cx = p.x + p.w/2;
    const top = p.y - 2;
    switch (p.hatId) {
      case "halo":
        ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 3; ctx.shadowBlur = 8; ctx.shadowColor = "#eab308";
        ctx.beginPath(); ctx.ellipse(cx, top-8, 13, 5, 0, 0, Math.PI*2); ctx.stroke();
        ctx.shadowBlur = 0; break;
      case "crown":
        ctx.fillStyle = "#eab308";
        ctx.beginPath(); ctx.moveTo(p.x, top); ctx.lineTo(p.x+5, top-14); ctx.lineTo(cx, top-6);
        ctx.lineTo(p.x+p.w-5, top-14); ctx.lineTo(p.x+p.w, top); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(p.x+5, top-14, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, top-6, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x+p.w-5, top-14, 3, 0, Math.PI*2); ctx.fill();
        break;
      case "horns":
        ctx.fillStyle = "#dc2626";
        ctx.beginPath(); ctx.moveTo(p.x+4, top); ctx.lineTo(p.x+8, top-14); ctx.lineTo(p.x+12, top); ctx.fill();
        ctx.beginPath(); ctx.moveTo(p.x+p.w-12, top); ctx.lineTo(p.x+p.w-8, top-14); ctx.lineTo(p.x+p.w-4, top); ctx.fill();
        break;
      case "tophat":
        ctx.fillStyle = "#1c1917"; ctx.fillRect(p.x-2, top-18, p.w+4, 18);
        ctx.fillRect(p.x-5, top-3, p.w+10, 5);
        ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 2;
        ctx.strokeRect(p.x-2, top-18, p.w+4, 18); break;
      case "wizard":
        ctx.fillStyle = "#7c3aed";
        ctx.beginPath(); ctx.moveTo(p.x, top); ctx.lineTo(cx, top-28); ctx.lineTo(p.x+p.w, top); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#eab308"; ctx.font = "8px system-ui"; ctx.textAlign = "center";
        ctx.fillText("★", cx-4, top-12); ctx.fillText("★", cx+3, top-20); break;
      case "mohawk":
        for (let mi=0;mi<5;mi++) {
          ctx.fillStyle = `hsl(${mi*30+frame*2},100%,55%)`;
          ctx.fillRect(p.x+7+mi*3, top-6-mi*2, 3, 8+mi*2);
        } break;
      case "antenna":
        ctx.fillStyle = "#64748b"; ctx.fillRect(cx-1.5, top-20, 3, 20);
        ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(cx, top-20, 5, 0, Math.PI*2); ctx.fill(); break;
      case "halo2":
        ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 3; ctx.shadowBlur = 12; ctx.shadowColor = "#7c3aed";
        ctx.beginPath(); ctx.ellipse(cx, top-8, 13, 5, 0, 0, Math.PI*2); ctx.stroke();
        ctx.shadowBlur = 0; break;
      case "wings":
        ctx.fillStyle = "#f0f9ff88";
        ctx.beginPath(); ctx.ellipse(p.x-8, top+p.h*0.3, 12, 18+Math.sin(frame*0.15)*3, -0.4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(p.x+p.w+8, top+p.h*0.3, 12, 18+Math.sin(frame*0.15)*3, 0.4, 0, Math.PI*2); ctx.fill();
        break;
      default: break;
    }
  };

  // ─── SHOP LOGIC ─────────────────────────────────────────
  const buyItem = (type, id, cost) => {
    if (save.coins < cost) { showNotif("Not enough coins! 🪙", "#ef4444"); return; }
    const ns = { ...save, coins: save.coins - cost };
    if (type === "skin") ns.ownedSkins = [...ns.ownedSkins, id];
    if (type === "hat")  ns.ownedHats  = [...ns.ownedHats, id];
    if (type === "trail")ns.ownedTrails= [...ns.ownedTrails, id];
    saveGame(ns);
    showNotif("Unlocked! ✨", "#10b981");
  };

  const equipItem = (pid, type, id) => {
    // Ensure unique skin colors
    if (type === "skin") {
      const totalPlayers = config.humans + config.bots;
      for (let op = 1; op <= 4; op++) {
        if (op !== pid && save.equip[`p${op}`]?.skin === id) {
          showNotif("Another player already uses this skin!", "#f59e0b");
          return;
        }
      }
    }
    const ns = { ...save, equip: { ...save.equip, [`p${pid}`]: { ...save.equip[`p${pid}`], [type]: id } } };
    saveGame(ns);
  };

  // ─── RENDER ──────────────────────────────────────────────
  const menuWave = (menuAnim/60);

  return (
    <div style={{ minHeight:"100vh", background:"#030303", color:"#f8fafc", fontFamily:'"Trebuchet MS", system-ui, sans-serif', display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", position:"relative" }}>

      {/* BG Stars */}
      <div style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
        {Array.from({length:40}).map((_,i)=>(
          <div key={i} style={{
            position:"absolute",
            left:`${(i*37)%100}%`, top:`${(i*53)%100}%`,
            width: i%5===0?"3px":"1px", height: i%5===0?"3px":"1px",
            background:"#ffffff",
            opacity: 0.3 + 0.4*Math.abs(Math.sin(menuAnim*0.02+i)),
            borderRadius:"50%",
          }}/>
        ))}
      </div>

      {/* Notification */}
      {notification && (
        <div style={{ position:"fixed", top:20, right:20, background:notification.col, color:"#000", padding:"12px 24px", borderRadius:12, fontWeight:900, fontSize:"1.1rem", zIndex:9999, boxShadow:"0 4px 30px rgba(0,0,0,0.5)", animation:"none" }}>
          {notification.msg}
        </div>
      )}

      {/* ── MENU ── */}
      {screen === "menu" && (
        <div style={{ zIndex:10, position:"relative", width:780, maxWidth:"98vw" }}>
          {/* Title */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ fontSize:"3.8rem", fontWeight:900, fontStyle:"italic", lineHeight:1, letterSpacing:"-1px" }}>
              <span style={{ color:"#38bdf8", textShadow:"0 0 30px rgba(56,189,248,0.6)" }}>BUMP</span>
              <span style={{ color:"#f8fafc" }}> KNIGHTS</span>
            </div>
            <div style={{ fontSize:"1.5rem", fontWeight:900, color:"#ef4444", letterSpacing:"6px", textShadow:"0 0 20px rgba(239,68,68,0.5)" }}>
              OVERDRIVE ULTRA
            </div>
            <div style={{ color:"#52525b", marginTop:6, fontSize:"0.85rem", letterSpacing:"2px" }}>
              LOCAL MULTIPLAYER BRAWLER • UP TO 4 PLAYERS + BOTS
            </div>
          </div>

          <div style={{ background:"#0d0d14", border:"1px solid #1e1e2e", borderRadius:20, padding:36, boxShadow:"0 20px 80px rgba(0,0,0,0.8)" }}>
            {/* Players */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <SettingCard label="👥 HUMAN PLAYERS" sublabel="WASD · Arrows · IJKL · Numpad">
                <BtnRow items={[1,2,3,4]} active={config.humans} col="#38bdf8" onSelect={v=>setConfig({...config,humans:v})}/>
              </SettingCard>
              <SettingCard label="🤖 AI OPPONENTS" sublabel="Adaptive difficulty">
                <BtnRow items={[0,1,2,3]} active={config.bots} col="#ef4444" onSelect={v=>setConfig({...config,bots:v})}/>
              </SettingCard>
            </div>

            {/* Win Score */}
            <SettingCard label="🏆 WIN SCORE" sublabel="First to reach this wins!" style={{marginBottom:16}}>
              <BtnRow items={[5,10,15,20,30]} active={config.winScore} col="#eab308" onSelect={v=>setConfig({...config,winScore:v})}/>
            </SettingCard>

            {/* World Select */}
            <div style={{ marginBottom:24 }}>
              <div style={{ color:"#71717a", fontWeight:900, fontSize:"0.8rem", letterSpacing:"2px", marginBottom:10 }}>🌍 SELECT WORLD</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                {WORLDS.map(w=>(
                  <button key={w.id} onClick={()=>setConfig({...config,worldId:w.id})} style={{
                    background: config.worldId===w.id ? "#1e293b" : "#0f0f17",
                    border: `2px solid ${config.worldId===w.id ? "#38bdf8" : "#1e1e2e"}`,
                    borderRadius:12, padding:"14px 10px", cursor:"pointer", textAlign:"center",
                    color: config.worldId===w.id ? "#38bdf8" : "#94a3b8",
                    transition:"all 0.15s",
                    boxShadow: config.worldId===w.id ? "0 0 20px rgba(56,189,248,0.2)" : "none",
                  }}>
                    <div style={{ fontSize:"1.5rem" }}>{w.emoji}</div>
                    <div style={{ fontWeight:900, fontSize:"0.85rem", marginTop:4 }}>{w.name}</div>
                    <div style={{ fontSize:"0.7rem", color:"#52525b", marginTop:3, lineHeight:1.3 }}>{w.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display:"flex", gap:12 }}>
              <button onClick={startMatch} style={mainBtnStyle("#38bdf8","#000")}>
                ▶ START BRAWL
              </button>
              <button onClick={()=>setScreen("shop")} style={mainBtnStyle("#0f0f17","#eab308", "#eab308")}>
                🛒 SHOP &nbsp;<span style={{ background:"#eab308", color:"#000", padding:"2px 8px", borderRadius:8, fontWeight:900 }}>🪙 {save.coins}</span>
              </button>
              <button onClick={()=>setScreen("stats")} style={mainBtnStyle("#0f0f17","#a78bfa","#a78bfa")}>
                📊 STATS
              </button>
            </div>

            {/* Controls legend */}
            <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {[
                { label:"P1", keys:"W A S D", col:"#ef4444" },
                { label:"P2", keys:"↑ ← ↓ →", col:"#3b82f6" },
                { label:"P3", keys:"I J K L", col:"#10b981" },
                { label:"P4", keys:"8 4 5 6", col:"#f59e0b" },
              ].map(c=>(
                <div key={c.label} style={{ background:"#0f0f17", border:`1px solid ${c.col}44`, borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                  <div style={{ color:c.col, fontWeight:900, fontSize:"0.8rem" }}>{c.label}</div>
                  <div style={{ color:"#71717a", fontSize:"0.75rem", marginTop:2 }}>{c.keys}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SHOP ── */}
      {screen === "shop" && (
        <div style={{ zIndex:10, position:"relative", width:920, maxWidth:"98vw" }}>
          <div style={{ background:"#0d0d14", border:"1px solid #1e1e2e", borderRadius:20, padding:36, boxShadow:"0 20px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div>
                <div style={{ fontSize:"2.4rem", fontWeight:900, fontStyle:"italic" }}>THE VAULT</div>
                <div style={{ color:"#52525b", fontSize:"0.8rem", letterSpacing:"2px" }}>UNLOCK & EQUIP ITEMS FOR YOUR KNIGHTS</div>
              </div>
              <div style={{ fontSize:"1.8rem", fontWeight:900, color:"#eab308", background:"#18181b", padding:"10px 20px", borderRadius:12 }}>🪙 {save.coins}</div>
            </div>

            {/* Player selector */}
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              <span style={{ color:"#52525b", fontWeight:900, fontSize:"0.8rem", alignSelf:"center", marginRight:4 }}>EQUIP FOR:</span>
              {[1,2,3,4].map(p=>(
                <button key={p} onClick={()=>setShopPlayer(p)} style={{
                  background: shopPlayer===p ? PLAYER_COLORS[p-1] : "#18181b",
                  color: shopPlayer===p ? "#000" : "#fff",
                  border:"none", borderRadius:8, padding:"8px 16px", fontWeight:900, cursor:"pointer",
                  fontSize:"0.85rem",
                }}>P{p}</button>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              {["skins","hats","trails"].map(t=>(
                <button key={t} onClick={()=>setShopTab(t)} style={{
                  background: shopTab===t ? "#38bdf8" : "#18181b",
                  color: shopTab===t ? "#000" : "#94a3b8",
                  border:"none", borderRadius:8, padding:"10px 20px", fontWeight:900,
                  cursor:"pointer", textTransform:"uppercase", fontSize:"0.85rem", letterSpacing:"1px",
                }}>{t}</button>
              ))}
            </div>

            {/* Items grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, minHeight:300, maxHeight:360, overflowY:"auto" }}>
              {(shopTab==="skins"?SKINS:shopTab==="hats"?HATS:TRAILS).map(item=>{
                const owned = shopTab==="skins"?save.ownedSkins.includes(item.id):shopTab==="hats"?save.ownedHats.includes(item.id):save.ownedTrails.includes(item.id);
                const equipped = save.equip[`p${shopPlayer}`]?.[shopTab==="skins"?"skin":shopTab==="hats"?"hat":"trail"] === item.id;
                return (
                  <div key={item.id} style={{
                    background: equipped ? "#1e293b" : "#12121c",
                    border:`2px solid ${equipped?"#38bdf8":owned?"#27272a":item.hex||"#27272a"}`,
                    borderRadius:12, padding:"14px 10px", textAlign:"center",
                    boxShadow: equipped ? "0 0 16px rgba(56,189,248,0.2)" : "none",
                    position:"relative",
                  }}>
                    {/* Preview */}
                    {shopTab==="skins" && item.hex && (
                      <div style={{ width:30, height:30, background:item.hex, borderRadius:6, margin:"0 auto 10px", boxShadow:item.glow?`0 0 12px ${item.glow}`:"none" }}/>
                    )}
                    {shopTab==="hats" && (
                      <div style={{ fontSize:"1.3rem", margin:"0 auto 8px" }}>
                        {item.id==="none"?"😶":item.id==="halo"?"👼":item.id==="crown"?"👑":item.id==="horns"?"😈":item.id==="tophat"?"🎩":item.id==="wizard"?"🧙":item.id==="mohawk"?"🤘":item.id==="antenna"?"🤖":item.id==="halo2"?"😇":"🪽"}
                      </div>
                    )}
                    {shopTab==="trails" && (
                      <div style={{ fontSize:"1.3rem", margin:"0 auto 8px" }}>
                        {item.id==="none"?"💨":item.id==="dust"?"🌫️":item.id==="fire"?"🔥":item.id==="ice2"?"❄️":item.id==="sparkle"?"✨":item.id==="rainbow"?"🌈":item.id==="vortex"?"🌀":"⚡"}
                      </div>
                    )}
                    <div style={{ fontWeight:900, fontSize:"0.75rem", color: owned?"#f8fafc":"#52525b", marginBottom:8, lineHeight:1.2 }}>{item.name}</div>
                    {!owned ? (
                      <button onClick={()=>buyItem(shopTab==="skins"?"skin":shopTab==="hats"?"hat":"trail", item.id, item.cost)}
                        disabled={save.coins<item.cost}
                        style={{ width:"100%", padding:"6px 4px", background: save.coins>=item.cost?"#eab308":"#27272a", color: save.coins>=item.cost?"#000":"#555", border:"none", borderRadius:6, fontWeight:900, cursor: save.coins>=item.cost?"pointer":"not-allowed", fontSize:"0.75rem" }}>
                        {item.cost===0?"FREE":"🪙 "+item.cost}
                      </button>
                    ) : (
                      <button onClick={()=>equipItem(shopPlayer, shopTab==="skins"?"skin":shopTab==="hats"?"hat":"trail", item.id)} style={{
                        width:"100%", padding:"6px 4px",
                        background: equipped?"#38bdf8":"#1e293b",
                        color: equipped?"#000":"#38bdf8",
                        border:`1px solid ${equipped?"#38bdf8":"#1e293b"}`,
                        borderRadius:6, fontWeight:900, cursor:"pointer", fontSize:"0.75rem",
                      }}>{equipped?"✓ ON":"EQUIP"}</button>
                    )}
                    {equipped && <div style={{ position:"absolute", top:6, right:6, background:"#38bdf8", color:"#000", borderRadius:4, fontSize:"0.6rem", padding:"1px 4px", fontWeight:900 }}>EQ</div>}
                  </div>
                );
              })}
            </div>

            <button onClick={()=>setScreen("menu")} style={{ ...mainBtnStyle("#18181b","#94a3b8","#27272a"), marginTop:20, flex:"none", width:160 }}>← BACK</button>
          </div>
        </div>
      )}

      {/* ── STATS ── */}
      {screen === "stats" && (
        <div style={{ zIndex:10, position:"relative", width:500 }}>
          <div style={{ background:"#0d0d14", border:"1px solid #1e1e2e", borderRadius:20, padding:40, boxShadow:"0 20px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize:"2.5rem", fontWeight:900, marginBottom:24, fontStyle:"italic" }}>📊 HALL OF RECORDS</div>
            {[
              { label:"Total Kills",    val: save.stats.kills,       col:"#ef4444", icon:"💀" },
              { label:"Total Wins",     val: save.stats.wins,        col:"#eab308", icon:"🏆" },
              { label:"Games Played",   val: save.stats.gamesPlayed, col:"#38bdf8", icon:"🎮" },
              { label:"Coins Earned",   val: save.coins,             col:"#eab308", icon:"🪙" },
              { label:"Items Owned",    val: save.ownedSkins.length+save.ownedHats.length+save.ownedTrails.length, col:"#a78bfa", icon:"🛒" },
            ].map(s=>(
              <div key={s.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#12121c", borderRadius:10, padding:"14px 20px", marginBottom:10, border:`1px solid ${s.col}22` }}>
                <div style={{ color:"#94a3b8", fontWeight:700 }}>{s.icon} {s.label}</div>
                <div style={{ color:s.col, fontWeight:900, fontSize:"1.3rem" }}>{s.val.toLocaleString()}</div>
              </div>
            ))}
            <button onClick={()=>setScreen("menu")} style={{ ...mainBtnStyle("#18181b","#94a3b8","#27272a"), marginTop:10, flex:"none", width:"100%" }}>← BACK</button>
          </div>
        </div>
      )}

      {/* ── GAME CANVAS + HUD ── */}
      <div style={{ display: screen==="playing"?"flex":"none", flexDirection:"column", zIndex:10, position:"relative" }}>
        {/* HUD */}
        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          {uiSnap.players.map(p=>{
            const pct = Math.min(1, p.score / config.winScore);
            return (
              <div key={p.pid} style={{
                flex:1, background:"#0d0d14", borderRadius:10, padding:"10px 16px", border:`2px solid ${p.col}44`,
                opacity: p.respawn>0?0.45:1, transition:"opacity 0.2s", position:"relative", overflow:"hidden",
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontWeight:900, color: p.type==="bot"?"#f87171":"#e2e8f0", fontSize:"0.85rem" }}>{p.label}</div>
                  <div style={{ fontSize:"1.6rem", fontWeight:900, color:p.col }}>{p.score}</div>
                </div>
                {/* Score bar */}
                <div style={{ height:3, background:"#1e1e2e", borderRadius:99, marginTop:6, overflow:"hidden" }}>
                  <div style={{ width:`${pct*100}%`, height:"100%", background:p.col, borderRadius:99, transition:"width 0.3s", boxShadow:`0 0 8px ${p.col}` }}/>
                </div>
                {/* Respawn indicator */}
                {p.respawn>0 && (
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.7)", borderRadius:10 }}>
                    <span style={{ color:p.col, fontWeight:900, fontSize:"0.8rem" }}>RESPAWNING…</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <canvas ref={canvasRef} width={W} height={H} style={{ borderRadius:14, boxShadow:"0 0 60px rgba(0,0,0,0.9), 0 0 120px rgba(0,0,0,0.5)" }}/>

        <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, color:"#3f3f46", fontSize:"0.75rem", fontWeight:700 }}>
          <span>FIRST TO {config.winScore} WINS</span>
          <span>DOUBLE JUMP ∙ PORTALS ∙ POWER-UPS ∙ SPRINGS</span>
          <span>ESC: QUIT</span>
        </div>
      </div>

      {/* ── GAME OVER ── */}
      {screen === "gameover" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"1rem", letterSpacing:"6px", color:"#52525b", fontWeight:900, marginBottom:8 }}>MATCH OVER</div>
            <div style={{ fontSize:"5.5rem", fontWeight:900, fontStyle:"italic", color: uiSnap.players.find(p=>p.score>=config.winScore)?.col || "#38bdf8", lineHeight:1, textShadow:`0 0 40px ${uiSnap.players.find(p=>p.score>=config.winScore)?.col||"#38bdf8"}` }}>
              VICTORY
            </div>
            <div style={{ fontSize:"1.8rem", color:"#eab308", fontWeight:900, margin:"12px 0 8px" }}>
              {uiSnap.players.find(p=>p.score>=config.winScore)?.label || "WINNER"} WINS!
            </div>
            <div style={{ color:"#eab308", marginBottom:40, fontSize:"1rem" }}>+150 COINS</div>

            {/* Scoreboard */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:40, minWidth:400, maxWidth:600 }}>
              {uiSnap.players.sort((a,b)=>b.score-a.score).map(p=>(
                <div key={p.pid} style={{ background:"#0d0d14", border:`2px solid ${p.col}`, borderRadius:12, padding:"14px 10px", textAlign:"center" }}>
                  <div style={{ color:p.col, fontWeight:900, fontSize:"1rem" }}>{p.label}</div>
                  <div style={{ fontSize:"2rem", fontWeight:900, color:p.col }}>{p.score}</div>
                  <div style={{ color:"#52525b", fontSize:"0.75rem" }}>POINTS</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:16 }}>
              <button onClick={startMatch} style={mainBtnStyle("#38bdf8","#000")}>▶ REMATCH</button>
              <button onClick={()=>setScreen("menu")} style={mainBtnStyle("#18181b","#94a3b8","#27272a")}>⬅ MENU</button>
              <button onClick={()=>setScreen("shop")} style={mainBtnStyle("#18181b","#eab308","#eab308")}>🛒 SHOP</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UI HELPERS ──────────────────────────────────────────────
function SettingCard({ label, sublabel, children, style={} }) {
  return (
    <div style={{ background:"#12121c", padding:"16px 18px", borderRadius:12, border:"1px solid #1e1e2e", ...style }}>
      <div style={{ fontWeight:900, color:"#71717a", fontSize:"0.75rem", letterSpacing:"2px" }}>{label}</div>
      {sublabel && <div style={{ color:"#3f3f46", fontSize:"0.65rem", marginBottom:10, letterSpacing:"1px" }}>{sublabel}</div>}
      <div style={{ marginTop:10 }}>{children}</div>
    </div>
  );
}

function BtnRow({ items, active, col, onSelect }) {
  return (
    <div style={{ display:"flex", gap:8 }}>
      {items.map(v=>(
        <button key={v} onClick={()=>onSelect(v)} style={{
          flex:1, padding:"10px 0", border:"none", borderRadius:8, fontWeight:900, cursor:"pointer", fontSize:"1rem",
          background: active===v ? col : "#1e1e2e",
          color: active===v ? "#000" : "#52525b",
          boxShadow: active===v ? `0 0 14px ${col}66` : "none",
          transition:"all 0.12s",
        }}>{v}</button>
      ))}
    </div>
  );
}

const mainBtnStyle = (bg, col, border) => ({
  flex:1, padding:"16px 24px", border: border?`2px solid ${border}`:"none",
  borderRadius:12, fontSize:"1rem", fontWeight:900, cursor:"pointer",
  background:bg, color:col, transition:"all 0.15s", letterSpacing:"0.5px",
  boxShadow: bg!=="none"?"0 4px 20px rgba(0,0,0,0.4)":"none",
  display:"flex", alignItems:"center", justifyContent:"center", gap:6,
});