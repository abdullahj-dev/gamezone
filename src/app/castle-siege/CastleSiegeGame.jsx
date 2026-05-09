'use client';
// ═══════════════════════════════════════════════════════════════
//  CASTLE SIEGE: IRON & FLAME  ·  Perfect Edition
//  • Blocks = platforms (land on TOP, walk under or through)
//  • Jump + Down = place temp scaffold block to climb walls
//  • Iron Gate = passable by owner only, wall to enemy
//  • Any player can mount any cannon — strategic raiding!
//  • 4 cannon types with ammo per type shown
//  • All powerups with timers, full effects
//  • Smooth 60fps canvas engine
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from "react";

const W = 1200, H = 620;
const GND = H - 58;           // ground surface Y
const GRAV = 0.50;
const FRIC = 0.78;
const JUMP_V = -14;
const RUN_SPD = 3.4;
const STORAGE_KEY = "CS_PERFECT_V1";

// ── SAFE STORAGE ─────────────────────────────────────────────
const sGet = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const sSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
function merge(def, saved) {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return saved ?? def;
  const out = { ...def };
  for (const k of Object.keys(saved)) {
    out[k] = (k in def && def[k] !== null && typeof def[k] === "object" && !Array.isArray(def[k]))
      ? merge(def[k], saved[k]) : (saved[k] ?? def[k]);
  }
  return out;
}
const rand    = (a, b) => Math.random() * (b - a) + a;
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── CANNON TYPES ─────────────────────────────────────────────
const CANNON_TYPES = {
  standard: { name:"Standard",   icon:"💣", col:"#555555", dmg:35,  aoe:55,  spd:10, maxAmmo:12, cost:35, desc:"Balanced — reliable" },
  mortar:   { name:"Mortar",     icon:"💥", col:"#7a3a00", dmg:65,  aoe:90,  spd:6,  maxAmmo:6,  cost:55, desc:"High arc, big blast" },
  sniper:   { name:"Sniper",     icon:"🎯", col:"#003a7a", dmg:80,  aoe:20,  spd:18, maxAmmo:8,  cost:60, desc:"Fast & precise, low splash" },
  flamethrower:{ name:"Flame",   icon:"🔥", col:"#8a2200", dmg:20,  aoe:35,  spd:8,  maxAmmo:18, cost:45, desc:"Burns blocks, rapid fire" },
};

// ── BLOCK TYPES ───────────────────────────────────────────────
const BLOCK_TYPES = {
  wall:     { name:"Stone Wall",   hp:160, w:52, h:44, cost:8,  icon:"🧱", col:"#4a4640", edge:"#7a7470", isGate:false },
  fort:     { name:"Fort Wall",    hp:300, w:52, h:44, cost:28, icon:"🏰", col:"#2e2824", edge:"#5e5854", isGate:false },
  tower:    { name:"Watch Tower",  hp:220, w:52, h:88, cost:22, icon:"🗼", col:"#3d3630", edge:"#6d6660", isGate:false },
  gate:     { name:"Iron Gate",    hp:200, w:52, h:44, cost:18, icon:"🚪", col:"#1a1a1a", edge:"#4a4a4a", isGate:true  },
  cannon_s: { name:"Std Cannon",   hp:90,  w:64, h:40, cost:35, icon:"💣", col:"#333333", edge:"#666666", cannonType:"standard" },
  cannon_m: { name:"Mortar",       hp:80,  w:64, h:40, cost:55, icon:"💥", col:"#5a2a00", edge:"#8a5a30", cannonType:"mortar"   },
  cannon_n: { name:"Sniper",       hp:80,  w:64, h:40, cost:60, icon:"🎯", col:"#002a5a", edge:"#305a8a", cannonType:"sniper"   },
  cannon_f: { name:"Flamethrower", hp:80,  w:64, h:40, cost:45, icon:"🔥", col:"#6a1500", edge:"#9a4530", cannonType:"flamethrower" },
  barricade:{ name:"Barricade",    hp:80,  w:52, h:28, cost:6,  icon:"⬛", col:"#3a2a1a", edge:"#6a5a4a", isGate:false },
};

// ── POWERUP TYPES ─────────────────────────────────────────────
const POWERUP_TYPES = [
  { id:"heal_self",   name:"Repair Kit",   icon:"💚", col:"#22c55e", duration:0,   desc:"Heals YOUR castle blocks +80hp each" },
  { id:"damage_enem", name:"Sabotage",     icon:"💀", col:"#ef4444", duration:0,   desc:"Damages ENEMY castle blocks -40hp each" },
  { id:"armor",       name:"Iron Skin",    icon:"🛡", col:"#60a5fa", duration:480, desc:"Absorbs 50% incoming damage for 8s" },
  { id:"speed",       name:"Fleet Foot",   icon:"⚡", col:"#fbbf24", duration:360, desc:"Move 70% faster for 6s" },
  { id:"sword_up",    name:"Blessed Blade",icon:"⚔",  col:"#f97316", duration:480, desc:"+80% sword damage for 8s" },
  { id:"double_ammo", name:"Full Quiver",  icon:"🔫", col:"#a78bfa", duration:0,   desc:"Refills ALL cannon ammo to max" },
  { id:"invisible",   name:"Shadow Veil",  icon:"👻", col:"#6366f1", duration:300, desc:"Enemy can't see you for 5s" },
  { id:"shield_dome", name:"Force Dome",   icon:"✨", col:"#8b5cf6", duration:300, desc:"Castle takes NO damage for 5s" },
  { id:"explode_all", name:"War Blast",    icon:"💣", col:"#dc2626", duration:0,   desc:"Massive explosion on enemy castle" },
  { id:"freeze_enem", name:"Blizzard",     icon:"❄",  col:"#93c5fd", duration:240, desc:"Freezes enemy knight for 4s" },
];

// ── STAGES ────────────────────────────────────────────────────
const STAGES = [
  { id:"plains", name:"Burning Plains",  emoji:"🔥", bg:["#0e0b08","#1a1208","#2a2010"], gnd:"#2d2416", grass:"#1e3a0a",  weather:"clear"    },
  { id:"dusk",   name:"Crimson Dusk",    emoji:"🌅", bg:["#1a0808","#2d1010","#4a1a0a"], gnd:"#3d1a0a", grass:"#2a0e04",  weather:"embers"   },
  { id:"storm",  name:"Stormbringer",    emoji:"⛈",  bg:["#060810","#0c1020","#101828"], gnd:"#0e1418", grass:"#0a1810",  weather:"storm"    },
  { id:"lava",   name:"Volcanic Rift",   emoji:"🌋", bg:["#120400","#1e0600","#300e00"], gnd:"#1e0a00", grass:"#280c00",  weather:"volcanic" },
  { id:"snow",   name:"Frozen Siege",    emoji:"❄",  bg:["#0a0c14","#101420","#18202e"], gnd:"#2a3040", grass:"#1e2840",  weather:"snow"     },
  { id:"night",  name:"Midnight War",    emoji:"🌙", bg:["#030308","#05050f","#08081a"], gnd:"#0c0c1a", grass:"#080c14",  weather:"night"    },
];

// ── MODES ────────────────────────────────────────────────────
const MODES = [
  { id:"kills",  name:"Kill Count",   icon:"💀", desc:"First to 15 knight kills",    target:15  },
  { id:"time",   name:"Timed Battle", icon:"⏱", desc:"Most kills in 2 minutes",     target:120 },
  { id:"castle", name:"Castle Fall",  icon:"🏰", desc:"Destroy all enemy blocks",    target:0   },
];

// ── GRID CONSTANTS ────────────────────────────────────────────
const GRID_COLS = 7, GRID_ROWS = 5;
const CELL_W = 58, CELL_H = 50;
const P1_BASE_X = 18;
const P2_BASE_X = W - 18 - GRID_COLS * CELL_W;
const BUILD_Y = GND - GRID_ROWS * CELL_H;

// ── DEFAULT CASTLE LAYOUTS ────────────────────────────────────
// Each entry: [col, row, type]
const DEFAULT_CASTLE = [
  // Ground floor
  [0,4,"gate"], [1,4,"wall"], [2,4,"wall"], [3,4,"wall"], [4,4,"wall"], [5,4,"wall"], [6,4,"wall"],
  // Second floor
  [0,3,"wall"], [1,3,"wall"], [2,3,"wall"], [5,3,"cannon_s"], [6,3,"fort"],
  // Third floor
  [0,2,"fort"], [6,2,"fort"],
  // Fourth floor
  [0,1,"tower"], [2,1,"cannon_m"], [6,1,"tower"],
  // Top
  [0,0,"fort"], [6,0,"fort"],
];

// ── DEFAULT SAVE ──────────────────────────────────────────────
const DEFAULT_SAVE = {
  stats: {
    p1: { wins:0, kills:0, deaths:0, cannonShots:0, gamesPlayed:0, powerupsCollected:0 },
    p2: { wins:0, kills:0, deaths:0, cannonShots:0, gamesPlayed:0, powerupsCollected:0 },
  },
  totalGames: 0,
};

// ═══════════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CastleSiegeGame() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const gsRef     = useRef(null);

  const [save, setSave]             = useState(DEFAULT_SAVE);
  const [screen, setScreen]         = useState("menu");
  const [config, setConfig]         = useState({ stage:"plains", mode:"kills" });
  const [buildGrids, setBuildGrids] = useState({ p1:null, p2:null }); // null = use default
  const [buildGold, setBuildGold]   = useState({ p1:500, p2:500 });
  const [selBlock, setSelBlock]     = useState({ p1:"wall", p2:"wall" });
  const [uiSnap, setUiSnap]         = useState(null);
  const [notif, setNotif]           = useState(null);
  const [mf, setMf]                 = useState(0);  // menu frame for animations

  useEffect(() => {
    const raw = sGet(STORAGE_KEY);
    if (raw) setSave(merge(DEFAULT_SAVE, raw));
    let af, f = 0;
    const fn = () => { f++; setMf(f); af = requestAnimationFrame(fn); };
    af = requestAnimationFrame(fn);
    return () => { cancelAnimationFrame(af); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const persist = useCallback(d => { setSave(d); sSet(STORAGE_KEY, d); }, []);
  const showNotif = useCallback((msg, col="#f59e0b") => {
    setNotif({ msg, col }); setTimeout(() => setNotif(null), 2800);
  }, []);

  // ── BUILD GRID ────────────────────────────────────────────
  const getGrid = (side) => buildGrids[side] || Object.fromEntries(
    DEFAULT_CASTLE.map(([c, r, t]) => [`${c},${r}`, { type:t, hp:BLOCK_TYPES[t].hp, maxHp:BLOCK_TYPES[t].hp }])
  );

  const handleCell = useCallback((side, col, row) => {
    const grid = getGrid(side);
    const key = `${col},${row}`;
    const type = selBlock[side];
    const bt = BLOCK_TYPES[type];
    if (!bt) return;
    const existing = grid[key];
    const refund = existing ? (BLOCK_TYPES[existing.type]?.cost || 0) : 0;
    const gold = buildGold[side];
    if (existing?.type === type) {
      setBuildGold(g => ({ ...g, [side]: g[side] + bt.cost }));
      const ng = { ...grid }; delete ng[key];
      setBuildGrids(prev => ({ ...prev, [side]: ng }));
      return;
    }
    if (gold + refund < bt.cost) { showNotif("Not enough gold! 🪙", "#ef4444"); return; }
    setBuildGold(g => ({ ...g, [side]: g[side] + refund - bt.cost }));
    setBuildGrids(prev => ({ ...prev, [side]: { ...getGrid(side), [key]: { type, hp: bt.hp, maxHp: bt.hp } } }));
  // eslint-disable-next-line
  }, [selBlock, buildGrids, buildGold, showNotif]);

  // ── START MATCH ───────────────────────────────────────────
  const startMatch = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const stage = STAGES.find(s => s.id === config.stage) || STAGES[0];
    const mode  = MODES.find(m => m.id === config.mode) || MODES[0];

    const gridToBlocks = (grid, baseX, player) => {
      const blocks = [];
      for (const [key, cell] of Object.entries(grid)) {
        const [col, row] = key.split(",").map(Number);
        const bt = BLOCK_TYPES[cell.type];
        if (!bt) continue;
        // Stack blocks: each row stacks on top of previous
        // We use y = BUILD_Y + row * CELL_H but actual visual y = GND - (GRID_ROWS - row) * CELL_H + offset
        // Platform logic: top surface = y, knight lands on top
        const bx = baseX + col * CELL_W;
        const by = GND - (GRID_ROWS - row) * CELL_H;
        blocks.push({
          id: `b${player}_${key}`, type: cell.type,
          x: bx, y: by, w: bt.w, h: bt.h,
          hp: cell.hp, maxHp: cell.maxHp,
          player,
          cannonType: bt.cannonType || null,
          isGate: bt.isGate || false,
          burning: false, burnTimer: 0,
          shieldDome: false, shieldTimer: 0,
        });
      }
      return blocks;
    };

    const p1Grid = getGrid("p1");
    const p2Grid = getGrid("p2");
    const p1Blocks = gridToBlocks(p1Grid, P1_BASE_X, 1);
    const p2Blocks = gridToBlocks(p2Grid, P2_BASE_X, 2);

    // Assign ammo to cannon blocks
    const allBlocks = [...p1Blocks, ...p2Blocks];
    for (const b of allBlocks) {
      if (b.cannonType) {
        b.ammo = CANNON_TYPES[b.cannonType].maxAmmo;
        b.fireTimer = 0;
      }
    }

    const makePlayer = (pid) => ({
      pid,
      x: pid === 1 ? P1_BASE_X + GRID_COLS * CELL_W + 30 : P2_BASE_X - 52,
      y: GND - 52,
      w: 28, h: 48,
      vx: 0, vy: 0,
      grounded: false,
      facing: pid === 1 ? 1 : -1,
      hp: 100, maxHp: 100,
      alive: true, respawnTimer: 0,
      kills: 0, deaths: 0,
      // Cannon mount
      mountedCannon: null,    // block id
      cannonAngle: pid===1 ? -0.55 : -(Math.PI - 0.55),
      cannonPower: 0,
      cannonCharging: false,
      // Effects
      armor: 0, speed: 0, swordUp: 0, invisible: 0, frozen: 0,
      // Sword
      swingTimer: 0, swingCD: 0,
      // Scaffold (temp step blocks)
      scaffoldCooldown: 0,
      frame: 0,
      // Input edge tracking
      _keys: {},
    });

    // Weather particles
    const initWeatherP = (w) => {
      if (w !== "snow" && w !== "storm") return [];
      return Array.from({ length: 90 }, () => ({
        x: rand(0,W), y: rand(0,H),
        spd: w==="storm" ? rand(12,20) : rand(2.5,6),
        col: w==="storm" ? "#38bdf8" : "#dde8f0",
        len: w==="storm" ? rand(14,24) : rand(5,10),
        angle: w==="storm" ? 0.28 : 0,
      }));
    };

    const g = {
      frame: 0, active: true,
      stage, mode,
      players: [makePlayer(1), makePlayer(2)],
      blocks: allBlocks,
      scaffolds: [],     // temp step blocks
      projectiles: [],
      particles: [],
      popups: [],
      drops: [],
      explosions: [],
      kills: { p1: 0, p2: 0 },
      timer: mode.id === "time" ? mode.target * 60 : 0,
      shake: 0, shakeMag: 0, hitstop: 0,
      winner: null,
      weather: { type: stage.weather, lTimer: randInt(200,420), pts: initWeatherP(stage.weather) },
      airship: { x: W/2, y: 52, dir: 1, timer: randInt(600,900) },
      saveRef: merge(DEFAULT_SAVE, save),
      keys: {},
    };

    gsRef.current = g;
    setScreen("playing");

    const loop = () => {
      const g2 = gsRef.current;
      if (!g2 || !g2.active) return;
      gameStep(g2);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  // eslint-disable-next-line
  }, [config, buildGrids, save]);

  // ── KEY BINDING ───────────────────────────────────────────
  useEffect(() => {
    if (screen !== "playing") return;
    const dn = e => {
      if (!gsRef.current) return;
      gsRef.current.keys[e.code] = true;
      if (e.code === "Escape") { gsRef.current.active = false; setScreen("menu"); }
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
    };
    const up = e => { if (gsRef.current) gsRef.current.keys[e.code] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, [screen]);

  // ═══════════════════════════════════════════════════════════
  //  GAME STEP
  // ═══════════════════════════════════════════════════════════
  const gameStep = (g) => {
    if (g.hitstop > 0) { g.hitstop--; drawGame(g); return; }
    g.frame++;
    if (g.shake > 0) g.shake--;

    // Timer mode
    if (g.mode.id === "time") {
      g.timer--;
      if (g.timer <= 0 && !g.winner) endGame(g, g.kills.p1 > g.kills.p2 ? 1 : g.kills.p2 > g.kills.p1 ? 2 : 0);
    }

    tickWeather(g);
    tickAirship(g);
    tickDrops(g);
    tickScaffolds(g);

    for (const p of g.players) {
      if (!p.alive) {
        if (p.respawnTimer > 0) p.respawnTimer--;
        if (p.respawnTimer === 0) respawn(g, p);
        continue;
      }
      stepPlayer(g, p);
    }

    tickProjectiles(g);
    tickBlocks(g);
    tickParticles(g);
    if (!g.winner) checkWin(g);

    drawGame(g);

    if (g.frame % 3 === 0) {
      setUiSnap({
        kills: { ...g.kills },
        timer: g.timer, winner: g.winner,
        mode: g.mode, stage: g.stage,
        p1: { ...g.players[0] },
        p2: { ...g.players[1] },
        blocks: g.blocks.map(b => ({
          id:b.id, hp:b.hp, maxHp:b.maxHp, player:b.player,
          cannonType:b.cannonType, ammo:b.ammo,
        })),
        drops: g.drops.length,
        scaffolds: g.scaffolds.length,
      });
    }
  };

  // ── STEP PLAYER ───────────────────────────────────────────
  const stepPlayer = (g, p) => {
    const K = g.keys;
    const pid = p.pid;

    // Tick effects
    const eff = ['armor','speed','swordUp','invisible','frozen'];
    for (const e of eff) if (p[e] > 0) p[e]--;

    if (p.swingCD > 0) p.swingCD--;
    if (p.swingTimer > 0) p.swingTimer--;
    if (p.scaffoldCooldown > 0) p.scaffoldCooldown--;

    // Frozen = can't move
    if (p.frozen > 0) {
      p.vx *= 0.8;
      p.vy += GRAV;
      applyPhysics(g, p);
      p.frame++;
      return;
    }

    // ── CANNON MOUNTED ──
    if (p.mountedCannon) {
      const cb = g.blocks.find(b => b.id === p.mountedCannon);
      if (!cb || cb.hp <= 0) { p.mountedCannon = null; }
      else {
        const L = pid===1?"KeyA":"ArrowLeft", R = pid===1?"KeyD":"ArrowRight";
        const FIRE_K = pid===1?"KeyF":"Slash";
        const DISC = pid===1?"KeyS":"ArrowDown";

        if (K[L]) p.cannonAngle -= 0.03;
        if (K[R]) p.cannonAngle += 0.03;
        // Constrain angle per side (can't shoot backward)
        if (pid===1) p.cannonAngle = clamp(p.cannonAngle, -Math.PI*0.92, -0.08);
        else         p.cannonAngle = clamp(p.cannonAngle, -(Math.PI*0.92), -0.08);

        // Charging
        if (K[FIRE_K]) {
          p.cannonCharging = true;
          p.cannonPower = Math.min(p.cannonPower + 0.015, 1);
        } else if (p.cannonCharging) {
          const ct = CANNON_TYPES[cb.cannonType];
          if (cb.ammo > 0) {
            fireCannon(g, p, cb);
            cb.ammo--;
          } else {
            g.popups.push({ x:cb.x+cb.w/2, y:cb.y-24, txt:"OUT OF AMMO!", col:"#ef4444", life:50 });
          }
          p.cannonCharging = false; p.cannonPower = 0;
        }

        // Dismount (edge)
        const dKey = `disc_${pid}`;
        if (K[DISC] && !K[dKey]) {
          p.mountedCannon = null;
          p.x = cb.x + cb.w/2 - p.w/2;
          p.y = cb.y - p.h - 2;
          p.vy = -2;
        }
        K[dKey] = K[DISC];

        p.x = cb.x + cb.w/2 - p.w/2;
        p.y = cb.y - p.h + 10;
        p.frame++;
        return;
      }
    }

    // ── FREE MOVEMENT ──
    const L  = pid===1?"KeyA":"ArrowLeft";
    const R  = pid===1?"KeyD":"ArrowRight";
    const JK = pid===1?"KeyW":"ArrowUp";
    const DK = pid===1?"KeyS":"ArrowDown";
    const ACT = pid===1?"KeyF":"Slash";        // sword
    const MNT = pid===1?"KeyE":"Period";        // mount cannon

    const spd = RUN_SPD * (p.speed > 0 ? 1.7 : 1.0);
    if (K[L]) { p.vx -= spd * 0.38; p.facing = -1; }
    if (K[R]) { p.vx += spd * 0.38; p.facing =  1; }
    if (!K[L] && !K[R]) p.vx *= FRIC;
    p.vx = clamp(p.vx, -spd, spd);

    // Jump (edge)
    const jKey = `j_${pid}`;
    if (K[JK] && !K[jKey] && p.grounded) { p.vy = JUMP_V; p.grounded = false; }
    K[jKey] = K[JK];

    // ── SCAFFOLD PLACEMENT (jump + down simultaneously) ──
    // While airborne, press Down to place a temp scaffold step below player
    const scKey = `sc_${pid}`;
    if (K[DK] && !K[scKey] && !p.grounded && p.scaffoldCooldown === 0) {
      placeScaffold(g, p);
      p.scaffoldCooldown = 90; // 1.5s before can place another
    }
    K[scKey] = K[DK];

    // Gravity & move
    p.vy += GRAV;
    applyPhysics(g, p);

    // ── SWORD SWING (edge) ──
    const aKey = `a_${pid}`;
    if (K[ACT] && !K[aKey] && p.swingCD === 0) {
      p.swingTimer = 18; p.swingCD = 32;
      doSwordSwing(g, p);
    }
    K[aKey] = K[ACT];

    // ── MOUNT CANNON (edge) ──
    const mKey = `m_${pid}`;
    if (K[MNT] && !K[mKey]) {
      // Can mount ANY cannon (own or enemy) — adds strategic raiding!
      const nearby = g.blocks.find(b =>
        b.cannonType &&
        b.hp > 0 &&
        Math.abs((b.x+b.w/2)-(p.x+p.w/2)) < 80 &&
        Math.abs((b.y+b.h/2)-(p.y+p.h/2)) < 80
      );
      if (nearby) {
        p.mountedCannon = nearby.id;
        const isOwn = nearby.player === pid;
        p.cannonAngle = isOwn
          ? (pid===1 ? -0.55 : -(Math.PI-0.55))
          : (pid===1 ? -(Math.PI-0.55) : -0.55); // aim toward own castle if on enemy
        p.cannonPower = 0; p.cannonCharging = false;
        const ct = CANNON_TYPES[nearby.cannonType];
        g.popups.push({ x:nearby.x+nearby.w/2, y:nearby.y-26, txt:`${isOwn?"":"⚠ ENEMY "}${ct.name.toUpperCase()} — ${pid===1?"HOLD F":"HOLD /"}=CHARGE, RELEASE=FIRE`, col:isOwn?"#f59e0b":"#ef4444", life:90 });
      }
    }
    K[mKey] = K[MNT];

    // ── COLLECT DROPS ──
    for (let di = g.drops.length-1; di >= 0; di--) {
      const dr = g.drops[di];
      if (!dr.grounded) continue;
      if (Math.hypot((p.x+p.w/2)-dr.x, (p.y+p.h/2)-dr.y) < 46) {
        applyDrop(g, p, dr); g.drops.splice(di,1);
      }
    }

    p.frame = (p.frame+1)%30;
  };

  // ── PHYSICS ───────────────────────────────────────────────
  const applyPhysics = (g, p) => {
    p.x += p.vx; p.y += p.vy;
    p.grounded = false;

    // Ground
    if (p.y + p.h >= GND) { p.y = GND - p.h; p.vy = 0; p.grounded = true; }

    // Horizontal clamp
    p.x = clamp(p.x, 0, W - p.w);
    if (p.y < -200) p.vy = 3;

    // ── BLOCK COLLISIONS — only land on TOP ──
    // Players do NOT get blocked horizontally by blocks — they can walk under or through
    // EXCEPT: Iron Gates block the ENEMY (not the owner)
    for (const b of g.blocks) {
      if (b.hp <= 0) continue;

      // Iron Gate: acts as solid wall only for enemy
      if (b.isGate) {
        const isEnemy = b.player !== p.pid;
        if (isEnemy) {
          // Solid horizontal barrier for enemy
          if (p.x + p.w > b.x + 4 && p.x < b.x + b.w - 4 &&
              p.y + p.h > b.y + 6 && p.y < b.y + b.h) {
            // push out horizontally
            const overlapL = p.x + p.w - b.x;
            const overlapR = b.x + b.w - p.x;
            if (overlapL < overlapR) { p.x = b.x - p.w; p.vx = 0; }
            else                     { p.x = b.x + b.w; p.vx = 0; }
          }
        }
        // Both can land ON TOP of gate
        const prevBot = p.y + p.h - p.vy;
        if (p.vy >= 0 && prevBot <= b.y + 8 && p.y + p.h >= b.y && p.x + p.w > b.x + 4 && p.x < b.x + b.w - 4) {
          p.y = b.y - p.h; p.vy = 0; p.grounded = true;
        }
        continue;
      }

      // Normal blocks — land on top only, no horizontal collision
      const prevBot = p.y + p.h - p.vy;
      if (p.vy >= 0 &&
          prevBot <= b.y + 10 &&
          p.y + p.h >= b.y &&
          p.x + p.w > b.x + 4 &&
          p.x < b.x + b.w - 4) {
        p.y = b.y - p.h; p.vy = 0; p.grounded = true;
      }
    }

    // Scaffold collisions (temp step blocks) — same as normal
    for (const sc of g.scaffolds) {
      const prevBot = p.y + p.h - p.vy;
      if (p.vy >= 0 && prevBot <= sc.y + 10 && p.y + p.h >= sc.y &&
          p.x + p.w > sc.x + 2 && p.x < sc.x + sc.w - 2) {
        p.y = sc.y - p.h; p.vy = 0; p.grounded = true;
      }
    }
  };

  // ── SCAFFOLD PLACEMENT ────────────────────────────────────
  const placeScaffold = (g, p) => {
    // Place a step-block just below the player's feet
    const scW = 40, scH = 12;
    const scX = p.x + p.w/2 - scW/2;
    const scY = p.y + p.h + 4;
    // Don't place inside existing block
    const collide = g.blocks.some(b => b.hp>0 && scX<b.x+b.w && scX+scW>b.x && scY<b.y+b.h && scY+scH>b.y);
    if (collide || scY > GND - 8) return;

    g.scaffolds.push({
      id: `sc_${g.frame}_${p.pid}`,
      x: scX, y: scY, w: scW, h: scH,
      owner: p.pid,
      life: 180 + 60, // 3s visible + fade
      maxLife: 240,
    });
    p.vy = -8; // small bounce up when placing
    glow(g, scX + scW/2, scY, "#f59e0baa", 5);
  };

  const tickScaffolds = (g) => {
    for (let i = g.scaffolds.length-1; i >= 0; i--) {
      g.scaffolds[i].life--;
      if (g.scaffolds[i].life <= 0) g.scaffolds.splice(i, 1);
    }
  };

  // ── SWORD SWING ───────────────────────────────────────────
  const doSwordSwing = (g, p) => {
    const enemy = g.players.find(ep => ep.pid !== p.pid && ep.alive);
    const reachX = 58, reachY = 54;

    if (enemy) {
      const dx = Math.abs((enemy.x+enemy.w/2)-(p.x+p.w/2));
      const dy = Math.abs((enemy.y+enemy.h/2)-(p.y+p.h/2));
      if (dx < reachX && dy < reachY) {
        const base = p.swordUp > 0 ? 38 : 20;
        const dmg = p.armor > 0 ? Math.floor(base*0.5) : base;
        const absorbed = enemy.armor > 0 ? Math.floor(dmg*0.5) : 0;
        const final = dmg - absorbed;
        enemy.hp -= final;
        glow(g, enemy.x+enemy.w/2, enemy.y+enemy.h/2, "#ef4444", 12);
        g.popups.push({ x:enemy.x, y:enemy.y-20, txt:`-${final}${enemy.armor>0?" 🛡":""}`, col:"#ef4444", life:32 });
        if (enemy.hp <= 0) killPlayer(g, enemy, p);
      }
    }
    // Chip damage to ADJACENT enemy blocks
    for (const b of g.blocks) {
      if (b.player===p.pid||b.hp<=0) continue;
      const dx = Math.abs((b.x+b.w/2)-(p.x+p.w/2));
      const dy = Math.abs((b.y+b.h/2)-(p.y+p.h/2));
      if (dx < 66 && dy < 66) {
        const swordDmg = p.swordUp > 0 ? 22 : 12;
        b.hp -= swordDmg;
        glow(g, b.x+b.w/2, b.y+b.h/2, "#78716c", 5);
        g.popups.push({ x:b.x, y:b.y-14, txt:`-${swordDmg}`, col:"#f97316", life:24 });
      }
    }
  };

  // ── FIRE CANNON ───────────────────────────────────────────
  const fireCannon = (g, p, cb) => {
    const ct = CANNON_TYPES[cb.cannonType];
    const spd = ct.spd * (0.5 + p.cannonPower*0.5);
    const angle = p.cannonAngle;
    const ox = Math.cos(angle)*38, oy = Math.sin(angle)*38;

    // Flame type: multiple small projectiles
    const count = cb.cannonType === "flamethrower" ? 3 : 1;
    for (let ci = 0; ci < count; ci++) {
      const spread = (ci - (count-1)/2) * 0.12;
      g.projectiles.push({
        id: `${g.frame}_${ci}`,
        x: cb.x+cb.w/2+ox, y: cb.y+cb.h/2+oy,
        vx: Math.cos(angle+spread)*(ct.spd + p.cannonPower*8),
        vy: Math.sin(angle+spread)*(ct.spd + p.cannonPower*8),
        r: cb.cannonType==="mortar"?12:cb.cannonType==="sniper"?6:cb.cannonType==="flamethrower"?5:9,
        col: cb.cannonType==="flamethrower"?"#f97316":cb.cannonType==="sniper"?"#60a5fa":cb.cannonType==="mortar"?"#8b5cf6":"#1a1a1a",
        dmg: ct.dmg + Math.floor(p.cannonPower*30),
        aoe: ct.aoe,
        type: cb.cannonType,
        player: p.pid,  // shooter — for scoring (enemy = other player)
        life: 240,
        trail: [],
        gravity: cb.cannonType==="mortar"?1.0:0.28,
      });
    }

    glow(g, cb.x+cb.w/2, cb.y+cb.h/2, "#fbbf24", 14);
    g.shake = 8; g.shakeMag = 5; g.hitstop = 2;
    g.popups.push({ x:cb.x+cb.w/2, y:cb.y-24, txt:`PWR ${Math.round(p.cannonPower*100)}% · DMG ${ct.dmg+Math.floor(p.cannonPower*30)}`, col:"#f59e0b", life:35 });

    // Save stats
    if (p.pid === 1) g.saveRef.stats.p1.cannonShots = (g.saveRef.stats.p1.cannonShots||0)+1;
    else             g.saveRef.stats.p2.cannonShots = (g.saveRef.stats.p2.cannonShots||0)+1;
  };

  // ── PROJECTILES ───────────────────────────────────────────
  const tickProjectiles = (g) => {
    for (let i = g.projectiles.length-1; i >= 0; i--) {
      const pr = g.projectiles[i];
      pr.vy += GRAV * pr.gravity;
      pr.x += pr.vx; pr.y += pr.vy; pr.life--;
      pr.trail.push({x:pr.x,y:pr.y});
      if (pr.trail.length > 10) pr.trail.shift();

      if (pr.life<=0||pr.y>GND+40||pr.x<-100||pr.x>W+100) {
        if (pr.y >= GND) doExplode(g, pr.x, GND, pr.aoe, pr.dmg, pr.player, pr.type);
        g.projectiles.splice(i,1); continue;
      }

      let hit = false;
      // Hit blocks (only enemy's blocks relative to shooter)
      for (const b of g.blocks) {
        if (b.player===pr.player||b.hp<=0||b.shieldDome) continue;
        if (pr.x>b.x-pr.r&&pr.x<b.x+b.w+pr.r&&pr.y>b.y-pr.r&&pr.y<b.y+b.h+pr.r) {
          doExplode(g, pr.x, pr.y, pr.aoe, pr.dmg, pr.player, pr.type);
          hit=true; break;
        }
      }
      if (!hit) {
        // Direct hit enemy knight
        for (const p of g.players) {
          if (p.pid===pr.player||!p.alive) continue;
          if (Math.hypot(pr.x-(p.x+p.w/2), pr.y-(p.y+p.h/2)) < pr.r+14) {
            const d = Math.floor(pr.dmg*0.7);
            const abs = p.armor>0 ? Math.floor(d*0.5) : 0;
            const fin = d-abs;
            p.hp -= fin;
            glow(g, p.x+p.w/2, p.y+p.h/2, "#ef4444", 14);
            g.popups.push({x:p.x,y:p.y-22,txt:`💥${fin}${p.armor>0?" 🛡":""}`,col:"#ef4444",life:36});
            if (p.hp<=0) killPlayer(g, p, g.players.find(pp=>pp.pid===pr.player));
            doExplode(g, pr.x, pr.y, pr.aoe*0.45, pr.dmg*0.3, pr.player, pr.type);
            hit=true; break;
          }
        }
      }
      if (hit) g.projectiles.splice(i,1);
    }
  };

  const doExplode = (g, x, y, aoe, dmg, shooterPid, type) => {
    glow(g, x, y, type==="flamethrower"?"#f97316":type==="sniper"?"#60a5fa":"#f97316", 22);
    glow(g, x, y, "#fbbf24", 10);
    g.explosions.push({x,y,r:5,maxR:aoe,life:22,col:type==="flamethrower"?"#f97316":type==="sniper"?"#60a5fa":"#f97316"});
    g.shake=12; g.shakeMag=7; g.hitstop=4;

    for (const b of g.blocks) {
      if (b.player===shooterPid||b.hp<=0||b.shieldDome) continue;
      const d = Math.hypot((b.x+b.w/2)-x,(b.y+b.h/2)-y);
      if (d < aoe) {
        b.hp -= dmg*(1-d/aoe);
        if (type==="flamethrower"||type==="mortar") { b.burning=true; b.burnTimer=150; }
      }
    }
    for (const p of g.players) {
      if (p.pid===shooterPid||!p.alive) continue;
      const d = Math.hypot((p.x+p.w/2)-x,(p.y+p.h/2)-y);
      if (d < aoe) {
        const sp = Math.floor(dmg*0.4*(1-d/aoe));
        const abs = p.armor>0?Math.floor(sp*0.5):0;
        p.hp -= (sp-abs);
        if (p.hp<=0) killPlayer(g, p, g.players.find(pp=>pp.pid===shooterPid));
      }
    }
  };

  // ── KILL / RESPAWN ────────────────────────────────────────
  const killPlayer = (g, victim, killer) => {
    if (!victim.alive) return;
    victim.alive=false; victim.hp=0; victim.mountedCannon=null;
    victim.respawnTimer=180; victim.deaths=(victim.deaths||0)+1;
    const kk=`p${killer?.pid||( victim.pid===1?2:1 )}`;
    g.kills[kk]=(g.kills[kk]||0)+1;
    glow(g, victim.x+victim.w/2, victim.y+victim.h/2, "#ef4444", 32);
    g.popups.push({x:victim.x,y:victim.y-32,txt:"☠ SLAIN",col:"#ef4444",life:65,big:true});
    if (killer) g.popups.push({x:killer.x,y:killer.y-32,txt:"+1 KILL",col:"#22c55e",life:50});
    g.shake=20;g.shakeMag=12;g.hitstop=6;
  };

  const respawn = (g, p) => {
    p.alive=true; p.hp=p.maxHp; p.vx=0; p.vy=0;
    p.mountedCannon=null; p.swingTimer=0; p.swingCD=0;
    p.armor=0; p.speed=0; p.swordUp=0; p.invisible=0; p.frozen=0;
    p.x = p.pid===1 ? P1_BASE_X+GRID_COLS*CELL_W+30 : P2_BASE_X-52;
    p.y = GND-p.h-10; p.facing=p.pid===1?1:-1;
    g.popups.push({x:p.x,y:p.y-22,txt:`P${p.pid} RESPAWNED`,col:p.pid===1?"#f59e0b":"#38bdf8",life:55});
  };

  // ── BLOCKS TICK ───────────────────────────────────────────
  const tickBlocks = (g) => {
    for (let i=g.blocks.length-1;i>=0;i--) {
      const b=g.blocks[i];
      if (b.burning) {
        b.burnTimer--;
        if (g.frame%5===0) b.hp-=2;
        if (b.burnTimer<=0) b.burning=false;
      }
      if (b.shieldDome&&b.shieldTimer>0) b.shieldTimer--;
      if (b.shieldTimer<=0) b.shieldDome=false;
      if (b.hp<=0) {
        glow(g,b.x+b.w/2,b.y+b.h/2,"#78716c",26);
        glow(g,b.x+b.w/2,b.y+b.h/2,"#f97316",10);
        g.blocks.splice(i,1);
        g.shake=16;g.shakeMag=9;g.hitstop=5;
        checkWin(g);
      }
    }
  };

  // ── AIRSHIP & DROPS ───────────────────────────────────────
  const tickAirship = (g) => {
    const a=g.airship;
    a.x+=a.dir*0.85; if(a.x>W-65)a.dir=-1; if(a.x<65)a.dir=1;
    a.timer--;
    if(a.timer<=0){
      a.timer=randInt(480,900);
      const dt=POWERUP_TYPES[randInt(0,POWERUP_TYPES.length-1)];
      g.drops.push({id:`d${g.frame}`,x:a.x,y:88,vy:0.6,vx:rand(-0.6,0.6),type:dt,grounded:false,groundTimer:800,para:250});
      g.popups.push({x:a.x,y:104,txt:`📦 ${dt.name} INBOUND`,col:dt.col,life:70});
    }
  };

  const tickDrops = (g) => {
    for(let i=g.drops.length-1;i>=0;i--){
      const d=g.drops[i];
      if(!d.grounded){
        d.vy+=GRAV*(d.para>0?0.04:0.3); d.vy=Math.min(d.vy,d.para>0?2:8);
        d.x+=d.vx; d.y+=d.vy; if(d.para>0) d.para--;
        if(d.y+18>=GND){d.y=GND-18;d.grounded=true;d.vy=0;}
        for(const b of g.blocks){
          if(d.x>b.x&&d.x<b.x+b.w&&d.y+18>=b.y&&d.y+16<=b.y+12&&d.vy>=0){d.y=b.y-18;d.grounded=true;d.vy=0;}
        }
      } else { d.groundTimer--; if(d.groundTimer<=0) g.drops.splice(i,1); }
    }
  };

  // ── APPLY POWERUP DROP ────────────────────────────────────
  const applyDrop = (g, p, drop) => {
    const t=drop.type;
    glow(g,drop.x,drop.y,t.col,18);
    g.popups.push({x:p.x,y:p.y-32,txt:`${t.icon} ${t.name.toUpperCase()}!`,col:t.col,life:65,big:true});

    const ownBlocks = g.blocks.filter(b=>b.player===p.pid);
    const enemyBlocks = g.blocks.filter(b=>b.player!==p.pid);

    switch(t.id){
      case "heal_self":
        ownBlocks.forEach(b=>{b.hp=Math.min(b.maxHp,b.hp+80);});
        g.popups.push({x:p.x,y:p.y-52,txt:"+80HP ALL BLOCKS",col:"#22c55e",life:55});
        break;
      case "damage_enem":
        enemyBlocks.forEach(b=>{b.hp=Math.max(1,b.hp-40);});
        g.shake=14;g.shakeMag=8;
        g.popups.push({x:p.x,y:p.y-52,txt:"-40HP ENEMY CASTLE",col:"#ef4444",life:55});
        break;
      case "armor":      p.armor=t.duration; break;
      case "speed":      p.speed=t.duration; break;
      case "sword_up":   p.swordUp=t.duration; break;
      case "double_ammo":
        g.blocks.filter(b=>b.player===p.pid&&b.cannonType).forEach(b=>{b.ammo=CANNON_TYPES[b.cannonType].maxAmmo;});
        g.popups.push({x:p.x,y:p.y-52,txt:"ALL CANNONS RELOADED!",col:"#a78bfa",life:55});
        break;
      case "invisible":  p.invisible=t.duration; break;
      case "shield_dome":
        ownBlocks.forEach(b=>{b.shieldDome=true;b.shieldTimer=t.duration;});
        g.popups.push({x:p.x,y:p.y-52,txt:"CASTLE SHIELDED 5s!",col:"#8b5cf6",life:55});
        break;
      case "explode_all":
        enemyBlocks.forEach(b=>{
          if(Math.random()<0.7){b.hp-=rand(30,60);b.burning=true;b.burnTimer=120;}
        });
        g.shake=24;g.shakeMag=14;g.hitstop=8;
        for(let ei=0;ei<3;ei++){
          const rb=enemyBlocks[randInt(0,enemyBlocks.length-1)];
          if(rb) glow(g,rb.x+rb.w/2,rb.y+rb.h/2,"#ef4444",20);
        }
        g.popups.push({x:W/2,y:H/2-60,txt:"WAR BLAST!",col:"#dc2626",life:70,big:true});
        break;
      case "freeze_enem":
        g.players.filter(ep=>ep.pid!==p.pid&&ep.alive).forEach(ep=>{ep.frozen=t.duration;ep.vx=0;});
        g.popups.push({x:p.x,y:p.y-52,txt:"ENEMY FROZEN 4s!",col:"#93c5fd",life:55});
        break;
    }

    // Stats
    const sk=`p${p.pid}`;
    g.saveRef.stats[sk].powerupsCollected=(g.saveRef.stats[sk].powerupsCollected||0)+1;
  };

  // ── WEATHER ───────────────────────────────────────────────
  const tickWeather = (g) => {
    g.weather.pts.forEach(rp=>{rp.y+=rp.spd;rp.x+=rp.angle?1.8:0.5;if(rp.y>H){rp.y=0;rp.x=rand(0,W);}});
    if(g.weather.type==="storm"){
      g.weather.lTimer--;
      if(g.weather.lTimer<=0){
        g.weather.lTimer=randInt(220,440);
        const lx=rand(150,W-150);
        const hit=g.blocks.find(b=>b.hp>0&&Math.abs(b.x+b.w/2-lx)<55);
        if(hit&&!hit.shieldDome){hit.hp-=40;hit.burning=true;hit.burnTimer=100;glow(g,hit.x+hit.w/2,hit.y,"#60a5fa",14);}
        g.shake=12;g.shakeMag=7;
        g.explosions.push({x:lx,y:0,r:3,maxR:40,life:12,col:"#60a5fa"});
      }
    }
  };

  // ── PARTICLES ─────────────────────────────────────────────
  const glow = (g, x, y, col, count=16) => {
    for(let k=0;k<count;k++){
      const a=(k/count)*Math.PI*2+rand(-0.3,0.3), spd=rand(2.5,8.5);
      g.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-1.5,col,s:rand(2,5.5),life:rand(12,28),alpha:1});
    }
  };

  const tickParticles = (g) => {
    for(let i=g.particles.length-1;i>=0;i--){const p=g.particles[i];p.x+=p.vx;p.y+=p.vy;p.life--;p.vy+=0.1;p.vx*=0.97;if(p.life<=0)g.particles.splice(i,1);}
    for(let i=g.explosions.length-1;i>=0;i--){const e=g.explosions[i];e.r=Math.min(e.r+3.8,e.maxR);e.life--;if(e.life<=0)g.explosions.splice(i,1);}
    for(let i=g.popups.length-1;i>=0;i--){const p=g.popups[i];p.y-=0.9;p.life--;if(p.life<=0)g.popups.splice(i,1);}
  };

  // ── WIN CHECK ─────────────────────────────────────────────
  const checkWin = (g) => {
    if(g.winner!==null) return;
    const {mode,kills,blocks}=g;
    if(mode.id==="kills"&&kills.p1>=mode.target) endGame(g,1);
    if(mode.id==="kills"&&kills.p2>=mode.target) endGame(g,2);
    if(mode.id==="castle"){
      const p1a=blocks.some(b=>b.player===1&&b.hp>0),p2a=blocks.some(b=>b.player===2&&b.hp>0);
      if(!p1a&&!p2a)endGame(g,0);else if(!p1a)endGame(g,2);else if(!p2a)endGame(g,1);
    }
  };

  const endGame = (g, winner) => {
    if(g.winner!==null) return;
    g.winner=winner; g.active=false;
    const ns=merge(DEFAULT_SAVE,g.saveRef);
    ns.totalGames=(ns.totalGames||0)+1;
    for(const p of g.players){
      const k=`p${p.pid}`;
      ns.stats[k].kills=(ns.stats[k].kills||0)+(g.kills[k]||0);
      ns.stats[k].deaths=(ns.stats[k].deaths||0)+(p.deaths||0);
      ns.stats[k].gamesPlayed=(ns.stats[k].gamesPlayed||0)+1;
      if(p.pid===winner) ns.stats[k].wins=(ns.stats[k].wins||0)+1;
    }
    persist(ns);
    setTimeout(()=>setScreen("gameover"),3400);
  };

  // ═══════════════════════════════════════════════════════════
  //  DRAW ENGINE
  // ═══════════════════════════════════════════════════════════
  const drawGame = (g) => {
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    ctx.save();
    if(g.shake>0) ctx.translate(rand(-g.shakeMag,g.shakeMag)*0.42,rand(-g.shakeMag,g.shakeMag)*0.35);

    const s=g.stage;
    // Sky
    const sky=ctx.createLinearGradient(0,0,0,GND);
    sky.addColorStop(0,s.bg[0]);sky.addColorStop(0.55,s.bg[1]);sky.addColorStop(1,s.bg[2]);
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

    drawSkyFx(ctx,g);

    // Weather
    if(g.weather.pts.length){
      ctx.globalAlpha=g.weather.type==="storm"?0.4:0.5;
      g.weather.pts.forEach(rp=>{
        ctx.strokeStyle=rp.col;ctx.lineWidth=g.weather.type==="storm"?1.5:1;
        ctx.beginPath();ctx.moveTo(rp.x,rp.y);ctx.lineTo(rp.x+(rp.angle?2:0.5),rp.y+rp.len);ctx.stroke();
      });
      ctx.globalAlpha=1;
    }

    // Ground
    const gg=ctx.createLinearGradient(0,GND,0,H);
    gg.addColorStop(0,s.gnd);gg.addColorStop(1,"#050402");
    ctx.fillStyle=gg;ctx.fillRect(0,GND,W,H-GND);
    ctx.fillStyle=s.grass;ctx.fillRect(0,GND,W,7);
    ctx.fillStyle="rgba(255,255,255,0.022)";
    for(let gx=0;gx<W;gx+=54){ctx.fillRect(gx,GND+9,22,5);ctx.fillRect(gx+28,GND+22,16,4);}

    // Particles (behind everything)
    g.particles.forEach(p=>{
      ctx.globalAlpha=clamp((p.alpha||1)*(p.life/22),0,1);
      ctx.fillStyle=p.col;ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);
    });ctx.globalAlpha=1;

    // Explosions
    g.explosions.forEach(e=>{
      const a=(e.life/22)*0.5;
      ctx.globalAlpha=a;ctx.fillStyle=e.col;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=a*0.35;ctx.fillStyle="#fbbf24";ctx.beginPath();ctx.arc(e.x,e.y,e.r*0.45,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
    });

    // Scaffold (temp step blocks)
    g.scaffolds.forEach(sc=>{
      const fade=sc.life<60?sc.life/60:1;
      ctx.globalAlpha=fade*0.75;
      const col=sc.owner===1?"#f59e0b":"#38bdf8";
      ctx.fillStyle=col+"88";ctx.fillRect(sc.x,sc.y,sc.w,sc.h);
      ctx.strokeStyle=col;ctx.lineWidth=1.5;
      ctx.setLineDash([4,3]);ctx.strokeRect(sc.x,sc.y,sc.w,sc.h);ctx.setLineDash([]);
      ctx.globalAlpha=1;
    });

    // Blocks
    drawBlocks(ctx,g);

    // Drops
    drawDrops(ctx,g);

    // Projectile trails + balls
    g.projectiles.forEach(pr=>{
      if(pr.trail.length>1){
        ctx.strokeStyle=pr.col==="f97316"?"rgba(249,115,22,0.4)":`${pr.col}66`;
        ctx.lineWidth=pr.r*0.7;
        ctx.beginPath();pr.trail.forEach((t,i)=>i===0?ctx.moveTo(t.x,t.y):ctx.lineTo(t.x,t.y));ctx.stroke();
      }
      ctx.save();
      ctx.shadowBlur=pr.type==="sniper"?16:12;
      ctx.shadowColor=pr.col;
      ctx.fillStyle=pr.col;
      ctx.beginPath();ctx.arc(pr.x,pr.y,pr.r,0,Math.PI*2);ctx.fill();
      if(pr.type!=="flamethrower"){
        ctx.fillStyle="rgba(255,255,255,0.2)";
        ctx.beginPath();ctx.arc(pr.x-pr.r*0.28,pr.y-pr.r*0.28,pr.r*0.32,0,Math.PI*2);ctx.fill();
      }
      ctx.shadowBlur=0;ctx.restore();
    });

    // Players
    for(const p of g.players) drawPlayer(ctx,g,p);

    // Cannon aim preview
    for(const p of g.players){
      if(!p.alive||!p.mountedCannon) continue;
      const cb=g.blocks.find(b=>b.id===p.mountedCannon);
      if(!cb) continue;
      const cx=cb.x+cb.w/2,cy=cb.y+cb.h/2;
      const ct=CANNON_TYPES[cb.cannonType];
      const spd=(ct.spd + p.cannonPower*8);
      // Draw trajectory dots
      let px=cx+Math.cos(p.cannonAngle)*42,py=cy+Math.sin(p.cannonAngle)*42;
      let vx=Math.cos(p.cannonAngle)*spd,vy=Math.sin(p.cannonAngle)*spd;
      const trajColor=p.cannonCharging?`rgba(239,68,68,${0.45+p.cannonPower*0.45})`:"rgba(251,191,36,0.4)";
      ctx.fillStyle=trajColor;
      const gravity=cb.cannonType==="mortar"?1.0:0.28;
      for(let step=0;step<35;step++){
        vy+=GRAV*gravity; px+=vx; py+=vy;
        if(step%2===0){ctx.beginPath();ctx.arc(px,py,2+(p.cannonPower*1.5),0,Math.PI*2);ctx.fill();}
        if(py>GND||px<0||px>W) break;
      }
      // Power ring
      if(p.cannonCharging){
        ctx.strokeStyle=`rgba(251,191,36,${0.5+p.cannonPower*0.4})`;
        ctx.lineWidth=3;ctx.beginPath();
        ctx.arc(cx,cy,28+p.cannonPower*18,-Math.PI/2,-Math.PI/2+p.cannonPower*Math.PI*2);ctx.stroke();
      }
    }

    // Popups
    g.popups.forEach(pp=>{
      ctx.globalAlpha=Math.min(1,pp.life/28);
      ctx.fillStyle=pp.col;ctx.font=`900 ${pp.big?22:15}px "Georgia",serif`;
      ctx.textAlign="center";ctx.shadowBlur=5;ctx.shadowColor="#000";
      ctx.fillText(pp.txt,pp.x+14,pp.y);ctx.shadowBlur=0;
    });ctx.globalAlpha=1;

    drawAirship(ctx,g);

    if(g.winner!==null){
      ctx.fillStyle="rgba(0,0,0,0.83)";ctx.fillRect(0,H/2-95,W,190);
      const wCol=g.winner===1?"#f59e0b":g.winner===2?"#38bdf8":"#94a3b8";
      ctx.fillStyle=wCol;ctx.font=`900 62px "Georgia",serif`;ctx.textAlign="center";
      ctx.shadowBlur=32;ctx.shadowColor=wCol;
      ctx.fillText(g.winner===0?"DRAW!":`PLAYER ${g.winner} WINS!`,W/2,H/2+8);
      ctx.shadowBlur=0;
      ctx.fillStyle="#a3956a";ctx.font=`italic 20px "Georgia",serif`;
      ctx.fillText(`Kills — P1: ${g.kills.p1}   P2: ${g.kills.p2}`,W/2,H/2+52);
    }

    ctx.restore();
  };

  // ── DRAW SKY FX ───────────────────────────────────────────
  const drawSkyFx = (ctx, g) => {
    const s=g.stage,f=g.frame;
    if(s.weather==="clear"||s.weather==="embers"){
      ctx.save();ctx.globalAlpha=0.5;ctx.fillStyle="#fbbf24";
      ctx.beginPath();ctx.arc(W-108,70,36,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=0.1;ctx.fillStyle="#fde68a";ctx.beginPath();ctx.arc(W-108,70,62,0,Math.PI*2);ctx.fill();
      if(s.weather==="embers"&&f%5===0){
        g.particles.push({x:rand(0,W),y:GND,vx:rand(-1,1),vy:rand(-4,-1),col:rand(0,1)>0.5?"#f97316":"#ef4444",s:rand(2,5),life:rand(40,80),alpha:0.8});
      }
      ctx.restore();
    }
    if(s.weather==="night"){
      ctx.save();ctx.globalAlpha=0.5;ctx.fillStyle="#e8dfc0";
      ctx.beginPath();ctx.arc(W-128,62,29,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#0a0a18";ctx.beginPath();ctx.arc(W-116,57,22,0,Math.PI*2);ctx.fill();
      for(let si=0;si<35;si++){
        const sx=((si*43+11)%W),sy=((si*61)%(H*0.5));
        ctx.globalAlpha=0.28+0.44*Math.abs(Math.sin(f*0.012+si));
        ctx.fillStyle="#e8e0cc";ctx.fillRect(sx,sy,si%4===0?2:1,si%4===0?2:1);
      }
      ctx.restore();
    }
    if(s.weather==="volcanic"){
      ctx.save();
      const rg=ctx.createRadialGradient(W/2,H,0,W/2,H,H);
      rg.addColorStop(0,"rgba(239,68,68,0.2)");rg.addColorStop(1,"transparent");
      ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
      ctx.restore();
      if(f%240===0){
        const lx=rand(300,W-300);
        for(let i=0;i<20;i++) g.particles.push({x:lx,y:GND,vx:rand(-5,5),vy:rand(-14,-4),col:rand(0,1)>0.5?"#f97316":"#ef4444",s:rand(4,9),life:rand(30,60),alpha:1});
        g.shake=10;g.shakeMag=6;
      }
    }
    // Clouds
    if(s.weather==="clear"||s.weather==="snow"){
      ctx.save();ctx.globalAlpha=0.1;ctx.fillStyle="#e8e0cc";
      [100,340,620,880].forEach((cx,ci)=>{
        const ox=((f*0.09+ci*90)%(W+200))-100;
        ctx.beginPath();ctx.ellipse(cx+ox,66+ci*8,70,20,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(cx+ox+32,56+ci*8,48,15,0,0,Math.PI*2);ctx.fill();
      });
      ctx.restore();
    }
  };

  // ── DRAW BLOCKS ───────────────────────────────────────────
  const drawBlocks = (ctx, g) => {
    g.blocks.forEach(b=>{
      if(b.hp<=0) return;
      const bt=BLOCK_TYPES[b.type]; if(!bt) return;
      const pct=b.hp/b.maxHp;
      const isP2=b.player===2;

      // Shield dome
      if(b.shieldDome&&b.shieldTimer>0){
        const sp=0.4+0.4*Math.sin(g.frame*0.08);
        ctx.save();ctx.shadowBlur=16;ctx.shadowColor="#8b5cf6";
        ctx.strokeStyle=`rgba(139,92,246,${0.45+sp*0.35})`;ctx.lineWidth=2+sp;
        ctx.beginPath();ctx.ellipse(b.x+b.w/2,b.y+b.h/2,b.w*0.82+sp*4,b.h*0.82+sp*4,0,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      }

      const bodyCol=isP2?blueShift(bt.col):bt.col;
      const edgeCol=isP2?blueShift(bt.edge):bt.edge;

      ctx.fillStyle=bodyCol;ctx.fillRect(b.x,b.y,b.w,b.h);

      // Stone texture rows
      ctx.fillStyle="rgba(255,255,255,0.04)";
      for(let ri=0;ri<Math.floor(b.h/13);ri++){
        ctx.fillRect(b.x+3,b.y+4+ri*13,(ri%2===0?b.w-7:b.w/2-3),4);
      }

      // Gate portcullis lines
      if(b.isGate){
        ctx.strokeStyle=isP2?"#334466":"#664433";ctx.lineWidth=2;
        for(let gi=0;gi<4;gi++){
          ctx.beginPath();ctx.moveTo(b.x+8+gi*(b.w-16)/3,b.y+3);ctx.lineTo(b.x+8+gi*(b.w-16)/3,b.y+b.h-3);ctx.stroke();
        }
        ctx.beginPath();ctx.moveTo(b.x+3,b.y+b.h*0.45);ctx.lineTo(b.x+b.w-3,b.y+b.h*0.45);ctx.stroke();
        // Lock indicator
        const lockCol=isP2?"#38bdf8":"#f59e0b";
        ctx.fillStyle=lockCol;
        ctx.beginPath();ctx.arc(b.x+b.w/2,b.y+b.h*0.25,4,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=lockCol+"55";ctx.font="8px system-ui";ctx.textAlign="center";
        ctx.fillText("P"+(b.player),b.x+b.w/2,b.y+b.h*0.68);
      }

      // Edge border
      ctx.strokeStyle=edgeCol;ctx.lineWidth=1.5;
      ctx.strokeRect(b.x+0.75,b.y+0.75,b.w-1.5,b.h-1.5);
      ctx.fillStyle="rgba(255,255,255,0.055)";ctx.fillRect(b.x+2,b.y+2,b.w-4,4);

      // Cannon barrel (if it's a cannon block)
      if(b.cannonType){
        const ct=CANNON_TYPES[b.cannonType];
        // Find any player mounted on this cannon
        const mounP=g.players.find(p=>p.mountedCannon===b.id&&p.alive);
        const angle=mounP?mounP.cannonAngle:(b.player===1?-0.5:-(Math.PI-0.5));
        ctx.save();ctx.translate(b.x+b.w/2,b.y+b.h/2);
        // Cannon body
        ctx.fillStyle=ct.col||"#333";ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
        // Barrel
        const bColor=b.cannonType==="flamethrower"?"#8a2200":b.cannonType==="sniper"?"#002a5a":b.cannonType==="mortar"?"#5a2a00":"#555";
        ctx.strokeStyle=bColor;ctx.lineWidth=7;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(angle)*28,Math.sin(angle)*28);ctx.stroke();
        ctx.strokeStyle=ct.col||"#777";ctx.lineWidth=5;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(angle)*28,Math.sin(angle)*28);ctx.stroke();
        // Muzzle
        ctx.strokeStyle=isP2?"#38bdf8":"#f59e0b";ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(Math.cos(angle)*26,Math.sin(angle)*26,5,0,Math.PI*2);ctx.stroke();
        ctx.restore();

        // Ammo bar
        if(b.ammo!==undefined){
          const ct2=CANNON_TYPES[b.cannonType];
          const ammoRatio=b.ammo/ct2.maxAmmo;
          ctx.fillStyle="#0a0806";ctx.fillRect(b.x,b.y+b.h+2,b.w,5);
          ctx.fillStyle=ammoRatio>0.5?"#22c55e":ammoRatio>0.25?"#f59e0b":"#ef4444";
          ctx.fillRect(b.x,b.y+b.h+2,b.w*ammoRatio,5);
          // Ammo count dots
          ctx.fillStyle=isP2?"#38bdf8":"#f59e0b";
          ctx.font=`700 9px "Georgia",serif`;ctx.textAlign="center";
          ctx.fillText(`${b.ammo}/${ct2.maxAmmo} ${ct2.icon}`,b.x+b.w/2,b.y+b.h+18);
          // Mount hint
          const anyNear=g.players.some(p=>p.alive&&!p.mountedCannon&&Math.abs((p.x+p.w/2)-(b.x+b.w/2))<80&&Math.abs((p.y+p.h/2)-(b.y+b.h/2))<80);
          if(anyNear){
            const hintCol=isP2?"#38bdf8":"#f59e0b";
            ctx.fillStyle=hintCol;ctx.font=`700 9px "Georgia",serif`;ctx.textAlign="center";
            ctx.fillText(`[${b.player===1?"E":"."}] MOUNT`,b.x+b.w/2,b.y-12);
          }
        }
      }

      // Tower battlements + flag
      if(b.type==="tower"||b.type==="fort"){
        ctx.fillStyle=edgeCol;
        for(let ci=0;ci<4;ci++) ctx.fillRect(b.x+ci*13,b.y-9,9,9);
        ctx.fillStyle=isP2?"#38bdf8":"#f59e0b";
        ctx.beginPath();ctx.moveTo(b.x+b.w/2,b.y-18);ctx.lineTo(b.x+b.w/2+14,b.y-10);ctx.lineTo(b.x+b.w/2,b.y-2);ctx.fill();
      }

      // HP bar
      if(pct<0.99){
        ctx.fillStyle="#0a0806";ctx.fillRect(b.x,b.y-8,b.w,5);
        ctx.fillStyle=pct>0.6?"#22c55e":pct>0.3?"#f59e0b":"#ef4444";
        ctx.fillRect(b.x,b.y-8,b.w*pct,5);
      }

      // Burning overlay
      if(b.burning&&g.frame%3===0){
        for(let fi=0;fi<4;fi++){
          ctx.globalAlpha=rand(0.4,0.8);ctx.fillStyle=fi%2?"#ef4444":"#f97316";
          ctx.beginPath();ctx.arc(b.x+rand(6,b.w-6),b.y+rand(0,b.h*0.5),rand(3,7),0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=1;
        }
      }

      // Crack damage
      if(pct<0.5){
        ctx.strokeStyle=`rgba(0,0,0,${0.5-pct*0.24})`;ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(b.x+9,b.y+3);ctx.lineTo(b.x+3,b.y+b.h-5);ctx.stroke();
        if(pct<0.28){ctx.beginPath();ctx.moveTo(b.x+b.w-9,b.y+8);ctx.lineTo(b.x+b.w-3,b.y+b.h*0.65);ctx.stroke();}
      }
    });
  };

  // ── DRAW PLAYER ───────────────────────────────────────────
  const drawPlayer = (ctx, g, p) => {
    if(!p.alive){
      if(Math.floor(g.frame/8)%2===0){
        ctx.globalAlpha=0.2;ctx.fillStyle=p.pid===1?"#f59e0b":"#38bdf8";
        ctx.fillRect(p.x,p.y,p.w,p.h);ctx.globalAlpha=1;
      }
      if(p.respawnTimer>0){
        ctx.fillStyle=p.pid===1?"#f59e0b":"#38bdf8";
        ctx.font=`700 11px "Georgia",serif`;ctx.textAlign="center";
        ctx.fillText(`⏱${Math.ceil(p.respawnTimer/60)}s`,p.x+p.w/2,p.y-8);
      }
      return;
    }
    if(p.invisible>0&&Math.floor(g.frame/5)%3!==0) return; // flicker when invisible

    ctx.save();
    const pCol=p.pid===1?"#f59e0b":"#38bdf8";
    const bob=(p.grounded&&Math.abs(p.vx)>0.3)?Math.sin(p.frame*0.45)*2:0;
    ctx.translate(p.x+p.w/2,p.y+p.h/2+bob);
    if(p.facing<0) ctx.scale(-1,1);

    // Armor glow
    if(p.armor>0){ctx.shadowBlur=14;ctx.shadowColor="#60a5fa";}
    // Speed glow
    if(p.speed>0){ctx.shadowBlur=10;ctx.shadowColor="#fbbf24";}

    // Shadow
    ctx.globalAlpha=0.22;ctx.fillStyle="#000";
    ctx.beginPath();ctx.ellipse(0,p.h/2+3,p.w*0.58,6,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=p.invisible>0?0.45:1;

    // Body
    ctx.fillStyle=p.pid===1?"#b8893a":"#3880b8";
    ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h*0.64);
    ctx.strokeStyle=p.pid===1?"#7a5a1a":"#1a507a";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(-5,-p.h/2+4);ctx.lineTo(5,-p.h/2+4);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,-p.h/2+1);ctx.lineTo(0,-p.h/2+8);ctx.stroke();

    // Legs
    const legSw=Math.sin(p.frame*0.5)*(p.grounded&&Math.abs(p.vx)>0.3?5:0);
    ctx.fillStyle=p.pid===1?"#6a4a1a":"#1a4a6a";
    ctx.fillRect(-p.w/2,p.h*0.12,p.w/2-2,p.h*0.38+legSw);
    ctx.fillRect(2,p.h*0.12,p.w/2-2,p.h*0.38-legSw);
    ctx.fillStyle="#2a1e0e";
    ctx.fillRect(-p.w/2,p.h*0.42+legSw,p.w/2-2,p.h*0.1);
    ctx.fillRect(2,p.h*0.42-legSw,p.w/2-2,p.h*0.1);

    ctx.shadowBlur=0;ctx.globalAlpha=p.invisible>0?0.45:1;

    // Helmet
    ctx.fillStyle=p.pid===1?"#5a3a10":"#103a5a";
    ctx.fillRect(-p.w/2,-p.h/2-13,p.w,15);ctx.fillRect(-p.w/2-2,-p.h/2-4,p.w+4,7);
    ctx.fillStyle=p.pid===1?"#240e02":"#020e24";ctx.fillRect(-p.w/2+4,-p.h/2-5,p.w-8,6);
    ctx.fillStyle=pCol+"cc";ctx.fillRect(-6,-p.h/2+2,4,5);ctx.fillRect(2,-p.h/2+2,4,5);

    // Frozen overlay
    if(p.frozen>0){
      ctx.fillStyle="rgba(147,197,253,0.5)";ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.fillStyle="#93c5fd";ctx.font="bold 14px system-ui";ctx.textAlign="center";ctx.fillText("❄",0,-p.h/4);
    }

    // Sword
    const swR=p.swingTimer>0?(p.swingTimer/18)*-1.3:0.15;
    ctx.save();ctx.translate(p.w/2-4,-p.h/4);ctx.rotate(swR);
    if(p.swordUp>0){ctx.shadowBlur=8;ctx.shadowColor="#f97316";}
    ctx.strokeStyle=p.swordUp>0?"#fbbf24":"#c0bab0";ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(24,-20);ctx.stroke();
    ctx.strokeStyle=p.swordUp>0?"#f97316":"#7a7068";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(24,-20);ctx.stroke();
    ctx.strokeStyle="#888";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(7,0);ctx.stroke();
    ctx.shadowBlur=0;ctx.restore();

    ctx.globalAlpha=1;ctx.restore();

    // HUD above player
    ctx.fillStyle=pCol;ctx.font=`900 11px "Georgia",serif`;ctx.textAlign="center";
    ctx.shadowBlur=3;ctx.shadowColor="#000";
    ctx.fillText(`P${p.pid}`,p.x+p.w/2,p.y-20);ctx.shadowBlur=0;
    ctx.fillStyle="#0a0806";ctx.fillRect(p.x,p.y-16,p.w,5);
    const hpPct=p.hp/p.maxHp;
    ctx.fillStyle=hpPct>0.5?"#22c55e":hpPct>0.25?"#f59e0b":"#ef4444";
    ctx.fillRect(p.x,p.y-16,p.w*hpPct,5);

    // Ammo display when mounted
    if(p.mountedCannon){
      const cb=g.blocks.find(b=>b.id===p.mountedCannon);
      if(cb&&cb.cannonType){
        const ct=CANNON_TYPES[cb.cannonType];
        ctx.fillStyle=pCol;ctx.font=`700 10px "Georgia",serif`;ctx.textAlign="center";
        ctx.fillText(`${ct.icon} ${cb.ammo}/${ct.maxAmmo}`,p.x+p.w/2,p.y-32);
      }
    }

    // Effect timers
    let ei=0;
    if(p.armor>0)   { drawEffectBadge(ctx,p,"🛡",`${Math.ceil(p.armor/60)}s`,"#60a5fa",ei++); }
    if(p.speed>0)   { drawEffectBadge(ctx,p,"⚡",`${Math.ceil(p.speed/60)}s`,"#fbbf24",ei++); }
    if(p.swordUp>0) { drawEffectBadge(ctx,p,"⚔",`${Math.ceil(p.swordUp/60)}s`,"#f97316",ei++); }
    if(p.invisible>0){ drawEffectBadge(ctx,p,"👻",`${Math.ceil(p.invisible/60)}s`,"#6366f1",ei++); }
    if(p.frozen>0)  { drawEffectBadge(ctx,p,"❄",`${Math.ceil(p.frozen/60)}s`,"#93c5fd",ei++); }
  };

  const drawEffectBadge = (ctx, p, icon, label, col, idx) => {
    const bx=p.x+p.w+4, by=p.y+idx*16;
    ctx.fillStyle=col+"cc";ctx.fillRect(bx,by,28,14);
    ctx.fillStyle="#000";ctx.font="bold 9px system-ui";ctx.textAlign="left";
    ctx.fillText(`${icon}${label}`,bx+2,by+10);
  };

  // ── DRAW DROPS ────────────────────────────────────────────
  const drawDrops = (ctx, g) => {
    g.drops.forEach(d=>{
      ctx.save();
      if(d.para>0){
        ctx.strokeStyle=d.type.col+"88";ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(d.x,d.y-26,20,Math.PI,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(d.x-20,d.y-26);ctx.lineTo(d.x-4,d.y-7);ctx.stroke();
        ctx.beginPath();ctx.moveTo(d.x+20,d.y-26);ctx.lineTo(d.x+4,d.y-7);ctx.stroke();
        ctx.beginPath();ctx.moveTo(d.x,d.y-26);ctx.lineTo(d.x,d.y-7);ctx.stroke();
      }
      const pulse=0.72+0.28*Math.sin(g.frame*0.09+d.x);
      ctx.shadowBlur=10*pulse;ctx.shadowColor=d.type.col;
      ctx.fillStyle="#1e1408";ctx.fillRect(d.x-14,d.y-14,28,28);
      ctx.strokeStyle=d.type.col;ctx.lineWidth=2;ctx.strokeRect(d.x-14,d.y-14,28,28);
      ctx.strokeStyle=d.type.col+"44";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(d.x-14,d.y);ctx.lineTo(d.x+14,d.y);ctx.stroke();
      ctx.beginPath();ctx.moveTo(d.x,d.y-14);ctx.lineTo(d.x,d.y+14);ctx.stroke();
      ctx.shadowBlur=0;
      ctx.font="bold 13px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(d.type.icon,d.x,d.y);ctx.textBaseline="alphabetic";
      if(d.grounded){
        ctx.fillStyle=d.type.col;ctx.font=`700 9px "Georgia",serif`;ctx.textAlign="center";
        ctx.fillText("WALK OVER",d.x,d.y+22);
        // Description
        ctx.fillStyle=d.type.col+"aa";ctx.font=`600 8px "Georgia",serif`;
        ctx.fillText(d.type.desc,d.x,d.y+32);
      }
      ctx.restore();
    });
  };

  // ── DRAW AIRSHIP ──────────────────────────────────────────
  const drawAirship = (ctx, g) => {
    const a=g.airship,f=g.frame;
    ctx.save();ctx.translate(a.x,a.y+Math.sin(f*0.023)*4);
    const bg2=ctx.createLinearGradient(-60,-24,-60,24);
    bg2.addColorStop(0,"#4a3820");bg2.addColorStop(0.5,"#2a2010");bg2.addColorStop(1,"#1a1008");
    ctx.fillStyle=bg2;ctx.beginPath();ctx.ellipse(0,0,64,25,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#5a4a28";ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,64,25,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="#3a2e18";ctx.lineWidth=1;
    [-28,-8,12,32].forEach(rx=>{ctx.beginPath();ctx.moveTo(rx,-23);ctx.lineTo(rx,23);ctx.stroke();});
    ctx.fillStyle="#221a08";ctx.fillRect(-26,25,52,20);
    ctx.strokeStyle="#3a2e18";ctx.lineWidth=1.5;ctx.strokeRect(-26,25,52,20);
    [[-14,33],[0,33],[14,33]].forEach(([wx,wy])=>{
      ctx.fillStyle=Math.random()>0.997?"#fbbf24":"#f59e0b55";
      ctx.beginPath();ctx.ellipse(wx,wy,3,3,0,0,Math.PI*2);ctx.fill();
    });
    [-66,66].forEach((px2,pi)=>{
      ctx.save();ctx.translate(px2,8);ctx.rotate(f*0.13*(pi?-1:1));
      ctx.strokeStyle="#5a4a28";ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(0,10);ctx.stroke();
      ctx.restore();
    });
    const hp2=0.3+0.3*Math.sin(f*0.07);
    ctx.shadowBlur=8*hp2;ctx.shadowColor="#f59e0b";
    ctx.fillStyle=`rgba(245,158,11,${hp2*0.28})`;ctx.fillRect(-9,36,18,7);
    ctx.shadowBlur=0;ctx.restore();
  };

  // ── COLOR HELPER ──────────────────────────────────────────
  const blueShift = (hex) => {
    try {
      const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
      return `#${Math.max(0,Math.floor(r*0.45)).toString(16).padStart(2,"0")}${Math.max(0,Math.floor(g*0.70)).toString(16).padStart(2,"0")}${Math.min(255,Math.floor(b*1.35+40)).toString(16).padStart(2,"0")}`;
    } catch { return hex; }
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  const stg = STAGES.find(s=>s.id===config.stage)||STAGES[0];

  return (
    <div style={{minHeight:"100vh",background:"#0a0806",color:"#e8e0cc",fontFamily:"'Georgia','Times New Roman',serif",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(245,158,11,0.01) 3px,rgba(245,158,11,0.01) 4px)"}}/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,background:"radial-gradient(ellipse at 50% 40%,transparent 42%,rgba(0,0,0,0.6) 100%)"}}/>

      {notif&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:notif.col,color:"#0a0806",padding:"11px 26px",borderRadius:3,fontWeight:700,fontSize:"0.94rem",zIndex:9999,boxShadow:"0 4px 26px rgba(0,0,0,0.7)",letterSpacing:"1px"}}>{notif.msg}</div>}

      {/* ── MENU ── */}
      {screen==="menu"&&(
        <div style={{zIndex:10,position:"relative",width:840,maxWidth:"98vw"}}>
          <div style={{textAlign:"center",marginBottom:30}}>
            <div style={{fontSize:"0.68rem",letterSpacing:"10px",color:"#4a3820",fontWeight:700,marginBottom:4}}>IRON &amp; FLAME PRESENTS</div>
            <div style={{fontSize:"4.2rem",fontWeight:900,fontStyle:"italic",lineHeight:1,letterSpacing:"-2px"}}>
              <span style={{color:"#f59e0b",textShadow:"0 0 40px rgba(245,158,11,0.5),0 3px 0 rgba(0,0,0,0.9)"}}>CASTLE</span>
              <span style={{color:"#e8e0cc",textShadow:"0 3px 0 rgba(0,0,0,0.9)"}}> SIEGE</span>
            </div>
            <div style={{height:2,background:"linear-gradient(90deg,transparent,#f59e0b,transparent)",margin:"12px 0 8px"}}/>
            <div style={{fontSize:"0.76rem",letterSpacing:"4px",color:"#3d3020"}}>2-PLAYER CASTLE BATTLE · BUILD · FIGHT · CONQUER</div>
          </div>

          <div style={{background:"rgba(10,8,6,0.97)",border:"1px solid #3a2e18",borderRadius:4,padding:30,boxShadow:"0 20px 80px rgba(0,0,0,0.95),inset 0 1px 0 rgba(245,158,11,0.07)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:13}}>
              <StoneCard label="⚔ BATTLEFIELD">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                  {STAGES.map(s=>(
                    <button key={s.id} onClick={()=>setConfig({...config,stage:s.id})} style={{background:config.stage===s.id?"#2a2010":"#0e0c08",border:`1px solid ${config.stage===s.id?"#f59e0b":"#1c1810"}`,borderRadius:3,padding:"7px 3px",cursor:"pointer",textAlign:"center",color:config.stage===s.id?"#f59e0b":"#5a4a28",fontFamily:"'Georgia',serif",transition:"all 0.13s"}}>
                      <div style={{fontSize:"1.1rem"}}>{s.emoji}</div>
                      <div style={{fontSize:"0.6rem",fontWeight:700,marginTop:2}}>{s.name}</div>
                    </button>
                  ))}
                </div>
              </StoneCard>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <StoneCard label="🏆 VICTORY">
                  {MODES.map(m=>(
                    <button key={m.id} onClick={()=>setConfig({...config,mode:m.id})} style={{display:"block",width:"100%",background:config.mode===m.id?"#2a2010":"transparent",border:`1px solid ${config.mode===m.id?"#f59e0b":"#1c1810"}`,borderRadius:3,padding:"6px 10px",cursor:"pointer",textAlign:"left",color:config.mode===m.id?"#f59e0b":"#5a4a28",fontFamily:"'Georgia',serif",marginBottom:4,transition:"all 0.12s"}}>
                      {m.icon} <b style={{fontSize:"0.75rem"}}>{m.name}</b>
                      <span style={{color:"#3a2e18",fontSize:"0.6rem",marginLeft:6}}>{m.desc}</span>
                    </button>
                  ))}
                </StoneCard>
              </div>
            </div>

            {/* Controls quick ref */}
            <div style={{background:"#0a0806",border:"1px solid #1c1810",borderRadius:3,padding:"11px 14px",marginBottom:13}}>
              <div style={{color:"#5a4a28",fontSize:"0.66rem",fontWeight:700,letterSpacing:"2px",marginBottom:7}}>⌨ CONTROLS QUICK REF</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{p:"PLAYER 1",col:"#f59e0b",keys:["WASD — Move & Jump","W+S (airborne) — place scaffold step below","F — Sword swing","E — Mount/dismount cannon","On cannon: A/D=aim · Hold F=charge · Release=FIRE"]},{p:"PLAYER 2",col:"#38bdf8",keys:["Arrow keys — Move & Jump","↑+↓ (airborne) — place scaffold step","/ — Sword swing",".(period) — Mount/dismount cannon","On cannon: ←/→=aim · Hold /=charge · Release=FIRE"]}].map(c=>(
                  <div key={c.p} style={{borderLeft:`2px solid ${c.col}`,paddingLeft:9}}>
                    <div style={{color:c.col,fontWeight:700,fontSize:"0.72rem",marginBottom:4}}>{c.p}</div>
                    {c.keys.map((ck,ci)=><div key={ci} style={{color:"#4a3a20",fontSize:"0.62rem",marginBottom:2}}>• {ck}</div>)}
                  </div>
                ))}
              </div>
              <div style={{color:"#2a2010",fontSize:"0.6rem",marginTop:7,borderTop:"1px solid #1c1810",paddingTop:6}}>
                🧱 Blocks are PLATFORMS (walk under them, land on top) · 🚪 Iron Gate: only YOUR knight passes through · 💣 Any cannon can be mounted by EITHER player — raid enemy cannons! · 📦 Walk over airship crates to collect powerups
              </div>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setBuildGrids({p1:null,p2:null});setBuildGold({p1:500,p2:500});setScreen("build");}} style={stBtn("#f59e0b","#0a0806")}>⚒ BUILD CASTLES</button>
              <button onClick={()=>{setBuildGrids({p1:null,p2:null});startMatch();}} style={stBtn("transparent","#f59e0b","#f59e0b")}>▶ QUICK START (Default Castles)</button>
              <button onClick={()=>setScreen("stats")} style={stBtn("transparent","#a3956a","#3a2e18")}>📜 RECORDS</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUILD PHASE ── */}
      {screen==="build"&&(
        <div style={{zIndex:10,position:"relative",width:1280,maxWidth:"99vw"}}>
          <div style={{background:"rgba(10,8,6,0.97)",border:"1px solid #3a2e18",borderRadius:4,padding:22,boxShadow:"0 20px 80px rgba(0,0,0,0.95)"}}>
            <div style={{textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:"1.8rem",fontWeight:900,fontStyle:"italic",color:"#f59e0b"}}>⚒ FORTIFY YOUR CASTLE</div>
              <div style={{color:"#4a3a20",fontSize:"0.68rem",letterSpacing:"2px",marginTop:2}}>CLICK TO PLACE · CLICK SAME TYPE = REMOVE &amp; REFUND · IRON GATE = locked to enemy · CANNONS = any player can mount!</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              {[1,2].map(player=>{
                const side=player===1?"p1":"p2";
                const pCol=player===1?"#f59e0b":"#38bdf8";
                const grid=getGrid(side);
                const gold=buildGold[side];
                const isDefault=!buildGrids[side];

                return(
                  <div key={player}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{color:pCol,fontWeight:700,fontSize:"0.9rem"}}>{player===1?"⬅ P1 — Left Castle":"P2 — Right Castle ➡"}{isDefault&&<span style={{color:"#3a2e18",fontSize:"0.65rem",marginLeft:8}}>(Default Layout)</span>}</div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{color:"#f59e0b",fontWeight:700,fontSize:"0.8rem",background:"#1a1408",padding:"3px 10px",borderRadius:3,border:"1px solid #2a2010"}}>🪙 {gold} GOLD</span>
                        <button onClick={()=>{setBuildGrids(prev=>({...prev,[side]:null}));setBuildGold(g=>({...g,[side]:500}));}} style={{background:"#18100a",border:"1px solid #3a2010",borderRadius:3,padding:"3px 8px",cursor:"pointer",color:"#a3956a",fontFamily:"'Georgia',serif",fontSize:"0.65rem"}}>↺ Reset Default</button>
                      </div>
                    </div>

                    {/* Block palette */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:3,marginBottom:8}}>
                      {Object.entries(BLOCK_TYPES).map(([tid,bt])=>{
                        const ct2=bt.cannonType?CANNON_TYPES[bt.cannonType]:null;
                        return(
                          <button key={tid} onClick={()=>setSelBlock(prev=>({...prev,[side]:tid}))} style={{background:selBlock[side]===tid?"#2a2010":"#0e0c08",border:`1px solid ${selBlock[side]===tid?pCol:"#1c1810"}`,borderRadius:3,padding:"5px 2px",cursor:"pointer",textAlign:"center",color:selBlock[side]===tid?pCol:"#5a4a28",fontFamily:"'Georgia',serif",opacity:gold<bt.cost?0.35:1}}>
                            <div style={{fontSize:"0.9rem"}}>{bt.icon}</div>
                            <div style={{fontSize:"0.5rem",fontWeight:700,marginTop:1,lineHeight:1.2}}>{ct2?ct2.name:bt.name}</div>
                            <div style={{fontSize:"0.48rem",color:selBlock[side]===tid?pCol+"88":"#3a2e18"}}>🪙{bt.cost}</div>
                            {ct2&&<div style={{fontSize:"0.45rem",color:ct2.col,marginTop:1}}>{ct2.icon}×{ct2.maxAmmo}</div>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Grid */}
                    <div style={{background:"#0a0806",border:`1px solid ${pCol}22`,borderRadius:3,padding:5,display:"inline-block"}}>
                      {Array.from({length:GRID_ROWS}).map((_,row)=>(
                        <div key={row} style={{display:"flex",gap:2,marginBottom:2}}>
                          {Array.from({length:GRID_COLS}).map((_,col)=>{
                            const key=`${col},${row}`;
                            const cell=grid[key];
                            const bt2=cell?BLOCK_TYPES[cell.type]:null;
                            return(
                              <div key={col} onClick={()=>handleCell(side,col,row)} style={{width:CELL_W,height:CELL_H,background:cell?bt2.col+"bb":"#0e0c08",border:`1px solid ${cell?pCol+"44":"#1a1810"}`,borderRadius:2,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",transition:"all 0.1s",boxShadow:cell?"inset 0 0 5px rgba(0,0,0,0.5)":"none"}}>
                                {cell&&<span style={{fontSize:"1.1rem",pointerEvents:"none"}}>{bt2.icon}</span>}
                                {cell&&<span style={{fontSize:"0.46rem",color:pCol+"99",fontWeight:700,pointerEvents:"none"}}>{cell.hp}</span>}
                                {!cell&&<div style={{fontSize:"0.5rem",color:"#1c1810",pointerEvents:"none"}}>+</div>}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:4,color:"#3a2e18",fontSize:"0.6rem"}}>
                      {Object.keys(grid).length} blocks · Selected: {BLOCK_TYPES[selBlock[side]]?.name}
                      {selBlock[side]==="gate"&&" · 🚪 ENEMY CANNOT PASS"}
                      {BLOCK_TYPES[selBlock[side]]?.cannonType&&` · ${CANNON_TYPES[BLOCK_TYPES[selBlock[side]].cannonType].desc}`}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{marginTop:16,display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={startMatch} style={stBtn("#f59e0b","#0a0806")}>🔥 BEGIN THE SIEGE</button>
              <button onClick={()=>{setBuildGrids({p1:null,p2:null});setBuildGold({p1:500,p2:500});}} style={stBtn("transparent","#a3956a","#3a2e18")}>↺ RESET BOTH</button>
              <button onClick={()=>setScreen("menu")} style={stBtn("transparent","#6a5a38","#2a2010")}>← BACK</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PLAYING HUD + CANVAS ── */}
      <div style={{display:screen==="playing"?"flex":"none",flexDirection:"column",zIndex:10,position:"relative"}}>
        {uiSnap&&(
          <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"stretch"}}>
            {/* P1 */}
            <div style={{flex:1,background:"rgba(10,8,6,0.93)",border:"1px solid #f59e0b44",borderRadius:3,padding:"7px 12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{color:"#f59e0b",fontWeight:700,fontSize:"0.84rem"}}>⬅ P1</span>
                <span style={{color:"#f59e0b",fontSize:"1.9rem",fontWeight:900,lineHeight:1}}>{uiSnap.kills?.p1||0}</span>
              </div>
              <div style={{height:5,background:"#1a1408",borderRadius:2,overflow:"hidden",marginBottom:3}}>
                <div style={{height:"100%",width:`${((uiSnap.p1?.hp||0)/100)*100}%`,background:(uiSnap.p1?.hp||0)>50?"#22c55e":(uiSnap.p1?.hp||0)>25?"#f59e0b":"#ef4444",transition:"width 0.1s"}}/>
              </div>
              {/* Cannon ammo bars */}
              <div style={{display:"flex",gap:3,marginBottom:3,flexWrap:"wrap"}}>
                {(uiSnap.blocks||[]).filter(b=>b.player===1&&b.cannonType).map(b=>{
                  const ct=CANNON_TYPES[b.cannonType];
                  return(
                    <div key={b.id} style={{display:"flex",alignItems:"center",gap:2,background:"#140e06",borderRadius:2,padding:"1px 4px",border:"1px solid #2a2010"}}>
                      <span style={{fontSize:"9px"}}>{ct.icon}</span>
                      <div style={{width:28,height:4,background:"#1a1408",borderRadius:1,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${((b.ammo||0)/(ct.maxAmmo))*100}%`,background:(b.ammo||0)>ct.maxAmmo*0.5?"#22c55e":(b.ammo||0)>ct.maxAmmo*0.25?"#f59e0b":"#ef4444"}}/>
                      </div>
                      <span style={{fontSize:"8px",color:"#f59e0b",fontWeight:700}}>{b.ammo}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{color:"#3a2e18",fontSize:"0.56rem",lineHeight:1.4}}>
                {uiSnap.p1?.mountedCannon?"🎯 CANNON — A/D aim · Hold F charge · Release FIRE":uiSnap.p1?.alive===false?`⏱ Respawn ${Math.ceil((uiSnap.p1?.respawnTimer||0)/60)}s`:"WASD·F sword·E cannon · Airborne+S=scaffold"}
              </div>
            </div>

            {/* Center */}
            <div style={{background:"rgba(10,8,6,0.96)",border:"1px solid #2a2010",borderRadius:3,padding:"7px 14px",textAlign:"center",minWidth:155}}>
              <div style={{color:"#4a3a20",fontSize:"0.58rem",letterSpacing:"2px",fontWeight:700}}>{uiSnap.stage?.name}</div>
              {uiSnap.mode?.id==="time"&&<div style={{color:(uiSnap.timer||0)<60?"#ef4444":"#e8e0cc",fontSize:"1.6rem",fontWeight:900,fontVariantNumeric:"tabular-nums"}}>{Math.floor((uiSnap.timer||0)/60)}:{String((uiSnap.timer||0)%60).padStart(2,"0")}</div>}
              {uiSnap.mode?.id==="kills"&&<div style={{color:"#a3956a",fontSize:"0.68rem",marginTop:4}}>First to {uiSnap.mode?.target} kills</div>}
              {uiSnap.mode?.id==="castle"&&<div style={{color:"#a3956a",fontSize:"0.68rem",marginTop:4}}>Destroy all blocks</div>}
              <div style={{color:"#2a2010",fontSize:"0.55rem",marginTop:3}}>📦 {uiSnap.drops||0} crates on field</div>
              <div style={{color:"#2a2010",fontSize:"0.55rem"}}>🪜 {uiSnap.scaffolds||0} scaffolds active</div>
            </div>

            {/* P2 */}
            <div style={{flex:1,background:"rgba(10,8,6,0.93)",border:"1px solid #38bdf844",borderRadius:3,padding:"7px 12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{color:"#38bdf8",fontSize:"1.9rem",fontWeight:900,lineHeight:1}}>{uiSnap.kills?.p2||0}</span>
                <span style={{color:"#38bdf8",fontWeight:700,fontSize:"0.84rem"}}>P2 ➡</span>
              </div>
              <div style={{height:5,background:"#0a1418",borderRadius:2,overflow:"hidden",marginBottom:3}}>
                <div style={{height:"100%",width:`${((uiSnap.p2?.hp||0)/100)*100}%`,background:(uiSnap.p2?.hp||0)>50?"#38bdf8":(uiSnap.p2?.hp||0)>25?"#f59e0b":"#ef4444",transition:"width 0.1s"}}/>
              </div>
              <div style={{display:"flex",gap:3,marginBottom:3,flexWrap:"wrap",justifyContent:"flex-end"}}>
                {(uiSnap.blocks||[]).filter(b=>b.player===2&&b.cannonType).map(b=>{
                  const ct=CANNON_TYPES[b.cannonType];
                  return(
                    <div key={b.id} style={{display:"flex",alignItems:"center",gap:2,background:"#060e14",borderRadius:2,padding:"1px 4px",border:"1px solid #1a2a30"}}>
                      <span style={{fontSize:"8px",color:"#38bdf8",fontWeight:700}}>{b.ammo}</span>
                      <div style={{width:28,height:4,background:"#0a1418",borderRadius:1,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${((b.ammo||0)/(ct.maxAmmo))*100}%`,background:(b.ammo||0)>ct.maxAmmo*0.5?"#38bdf8":(b.ammo||0)>ct.maxAmmo*0.25?"#f59e0b":"#ef4444"}}/>
                      </div>
                      <span style={{fontSize:"9px"}}>{ct.icon}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{color:"#1a3040",fontSize:"0.56rem",lineHeight:1.4,textAlign:"right"}}>
                {uiSnap.p2?.mountedCannon?"🎯 CANNON — ←/→ aim · Hold / charge · Release FIRE":uiSnap.p2?.alive===false?`⏱ Respawn ${Math.ceil((uiSnap.p2?.respawnTimer||0)/60)}s`:"Arrows·/ sword·. cannon · Airborne+↓=scaffold"}
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} width={W} height={H} style={{borderRadius:4,boxShadow:"0 0 60px rgba(0,0,0,0.95),0 0 0 1px #2a2010"}}/>

        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,color:"#1c1810",fontSize:"0.58rem",fontWeight:700}}>
          <span>P1: WASD · F=sword · E=mount cannon · Airborne+S=scaffold step</span>
          <span>ESC=quit</span>
          <span>P2: Arrows · /=sword · .=mount · Airborne+↓=scaffold</span>
        </div>
      </div>

      {/* ── STATS ── */}
      {screen==="stats"&&(
        <div style={{zIndex:10,position:"relative",width:540}}>
          <div style={{background:"rgba(10,8,6,0.97)",border:"1px solid #3a2e18",borderRadius:4,padding:34,boxShadow:"0 20px 80px rgba(0,0,0,0.9)"}}>
            <div style={{fontSize:"1.9rem",fontWeight:900,fontStyle:"italic",color:"#f59e0b",marginBottom:5}}>📜 CHRONICLES</div>
            <div style={{height:1,background:"linear-gradient(90deg,#f59e0b,transparent)",marginBottom:18}}/>
            {[{p:"Player 1",col:"#f59e0b",key:"p1"},{p:"Player 2",col:"#38bdf8",key:"p2"}].map(pl=>(
              <div key={pl.key} style={{marginBottom:15}}>
                <div style={{color:pl.col,fontWeight:700,fontSize:"0.78rem",letterSpacing:"2px",marginBottom:7}}>{pl.p.toUpperCase()}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
                  {[{l:"Wins",v:save.stats[pl.key]?.wins||0,i:"🏆"},{l:"Kills",v:save.stats[pl.key]?.kills||0,i:"💀"},{l:"Deaths",v:save.stats[pl.key]?.deaths||0,i:"☠"},{l:"Shots",v:save.stats[pl.key]?.cannonShots||0,i:"💣"},{l:"Powerups",v:save.stats[pl.key]?.powerupsCollected||0,i:"⚡"}].map(st=>(
                    <div key={st.l} style={{background:"#0a0806",border:`1px solid ${pl.col}18`,borderRadius:3,padding:"9px 6px",textAlign:"center"}}>
                      <div>{st.i}</div>
                      <div style={{fontSize:"1.3rem",fontWeight:900,color:pl.col,marginTop:2}}>{(st.v||0).toLocaleString()}</div>
                      <div style={{fontSize:"0.58rem",color:"#3a2e18",marginTop:1}}>{st.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{background:"#0a0806",border:"1px solid #1c1810",borderRadius:3,padding:"8px 12px",textAlign:"center",marginBottom:14}}>
              <span style={{color:"#4a3a20",fontSize:"0.72rem"}}>Total battles: </span>
              <span style={{color:"#f59e0b",fontWeight:700}}>{(save.totalGames||0).toLocaleString()}</span>
            </div>
            <button onClick={()=>setScreen("menu")} style={{...stBtn("transparent","#a3956a","#3a2e18"),width:"100%"}}>← MAIN HALL</button>
          </div>
        </div>
      )}

      {/* ── GAME OVER ── */}
      {screen==="gameover"&&uiSnap&&(()=>{
        const w=uiSnap?.winner;
        const wCol=w===1?"#f59e0b":w===2?"#38bdf8":"#94a3b8";
        return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.94)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:1000}}>
            <div style={{textAlign:"center",maxWidth:620}}>
              <div style={{fontSize:"0.68rem",letterSpacing:"8px",color:"#3a2e18",fontWeight:700,marginBottom:7}}>THE BATTLE IS OVER</div>
              <div style={{fontSize:"5rem",fontWeight:900,fontStyle:"italic",color:wCol,lineHeight:1,textShadow:`0 0 50px ${wCol},0 4px 0 rgba(0,0,0,0.9)`,marginBottom:10}}>
                {w===0?"DRAW":"VICTORY"}
              </div>
              <div style={{fontSize:"1.55rem",color:wCol,fontWeight:700,marginBottom:5}}>
                {w===0?"Both castles in ruins!":`Player ${w} stands victorious!`}
              </div>
              <div style={{height:1,background:`linear-gradient(90deg,transparent,${wCol},transparent)`,margin:"14px auto 22px",width:260}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:28,maxWidth:360,margin:"0 auto 28px"}}>
                {[{l:"P1",k:"p1",col:"#f59e0b"},{l:"P2",k:"p2",col:"#38bdf8"}].map(pl=>(
                  <div key={pl.k} style={{background:"rgba(10,8,6,0.95)",border:`2px solid ${pl.col}`,borderRadius:4,padding:"13px 10px",textAlign:"center"}}>
                    <div style={{color:pl.col,fontWeight:700,marginBottom:4}}>{pl.l}</div>
                    <div style={{fontSize:"2.4rem",fontWeight:900,color:pl.col}}>{uiSnap.kills?.[pl.k]||0}</div>
                    <div style={{color:"#3a2e18",fontSize:"0.64rem"}}>KILLS</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                <button onClick={()=>{setBuildGrids({p1:null,p2:null});setBuildGold({p1:500,p2:500});setScreen("build");}} style={stBtn("#f59e0b","#0a0806")}>⚔ REMATCH</button>
                <button onClick={()=>setScreen("menu")} style={stBtn("transparent","#a3956a","#3a2e18")}>⬅ MAIN HALL</button>
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`button:hover{filter:brightness(1.15)} button:active{transform:scale(0.97)} ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#0a0806} ::-webkit-scrollbar-thumb{background:#2a2010;border-radius:2px}`}</style>
    </div>
  );
}

function StoneCard({label,children}){
  return(
    <div style={{background:"#0a0806",border:"1px solid #1c1810",borderRadius:3,padding:"11px 13px"}}>
      <div style={{color:"#4a3820",fontWeight:700,fontSize:"0.66rem",letterSpacing:"2px",marginBottom:7}}>{label}</div>
      {children}
    </div>
  );
}

const stBtn=(bg,col,border)=>({
  padding:"12px 22px",background:bg,color:col,
  border:border?`1px solid ${border}`:"none",borderRadius:3,
  fontFamily:"'Georgia',serif",fontWeight:700,fontSize:"0.88rem",
  cursor:"pointer",letterSpacing:"1px",transition:"all 0.14s",
  boxShadow:bg!=="transparent"?"0 4px 18px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.07)":"none",
});