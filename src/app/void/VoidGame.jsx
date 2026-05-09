'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// ============================================================
//  VOID : ETERNAL RIFT  —  Complete Game  v5.0
//  Perfect JSX · All bugs fixed · Maximum addiction
// ============================================================

// ── CONSTANTS ───────────────────────────────────────────────
const STORAGE_KEY = "VER_SAVE_V5";

// ── MATH UTILS ──────────────────────────────────────────────
const clamp  = (v, a, b) => Math.max(a, Math.min(b, v));
const dst    = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ang    = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const rand   = (a, b) => Math.random() * (b - a) + a;
const ri     = (a, b) => Math.floor(rand(a, b + 1));
const v2     = (x, y) => ({ x, y });

// ── DATA ─────────────────────────────────────────────────────
const SKILLS = {
  voidBurst:       { id: "voidBurst",       name: "Void Burst",     type: "active",  col: "#a855f7", desc: "Massive AOE explosion (r=170). Deals 5× ATK.", cd: 150 },
  phaseShift:      { id: "phaseShift",      name: "Phase Shift",    type: "active",  col: "#06b6d4", desc: "Teleport to cursor. 2.5s invulnerability. Damages nearby enemies.", cd: 180 },
  singularity:     { id: "singularity",     name: "Singularity",    type: "active",  col: "#c084fc", desc: "Pull all enemies to you then detonate for massive damage.", cd: 300 },
  riftAnchor:      { id: "riftAnchor",      name: "Rift Anchor",    type: "active",  col: "#34d399", desc: "Drop a rift that deals damage to enemies inside for 10s.", cd: 240 },
  overcharge:      { id: "overcharge",      name: "Overcharge",     type: "active",  col: "#fbbf24", desc: "Fire rate +60% and damage +50% for 4 seconds.", cd: 360 },
  voidMine:        { id: "voidMine",        name: "Void Mine",      type: "active",  col: "#f97316", desc: "Drop a proximity mine. Detonates on enemy contact.", cd: 90 },
  novaLance:       { id: "novaLance",       name: "Nova Lance",     type: "active",  col: "#f43f5e", desc: "Fire a piercing beam through all enemies in cursor direction.", cd: 200 },
  timeRift:        { id: "timeRift",        name: "Time Rift",      type: "active",  col: "#a3e635", desc: "Slow all enemies to 25% speed for 3.5 seconds.", cd: 420 },
  echoShot:        { id: "echoShot",        name: "Echo Shot",      type: "passive", col: "#a855f7", desc: "30% chance to fire a bouncing secondary projectile." },
  voidConduit:     { id: "voidConduit",     name: "Conduit",        type: "passive", col: "#06b6d4", desc: "Permanently +25% fire rate." },
  crystalline:     { id: "crystalline",     name: "Crystalline",    type: "passive", col: "#e2e8f0", desc: "All incoming damage reduced by 30%." },
  siphon:          { id: "siphon",          name: "Siphon",         type: "passive", col: "#ef4444", desc: "Heal 1 HP per kill." },
  swiftness:       { id: "swiftness",       name: "Swiftness",      type: "passive", col: "#facc15", desc: "Movement speed +25%." },
  vampirism:       { id: "vampirism",       name: "Vampirism",      type: "passive", col: "#ec4899", desc: "8% chance to heal 6 HP on hit." },
  droneMk2:        { id: "droneMk2",        name: "Drone Mk-II",    type: "passive", col: "#38bdf8", desc: "An orbiting drone absorbs one hit every 8 seconds." },
  chainArc:        { id: "chainArc",        name: "Chain Arc",      type: "passive", col: "#fde047", desc: "Projectiles chain to a nearby enemy on hit (deals 70% dmg)." },
  explosiveRounds: { id: "explosiveRounds", name: "Explosive Rnd",  type: "passive", col: "#fb923c", desc: "Projectiles explode on hit for AoE damage." },
  voidSurge:       { id: "voidSurge",       name: "Void Surge",     type: "passive", col: "#818cf8", desc: "Every 10th kill triggers a free mini Void Burst." },
};

const UPGRADES = [
  { id: "hp",     name: "Reinforced Hull",   desc: "+25 Max HP per level",       cost: 80,  max: 10, col: "#ef4444" },
  { id: "atk",    name: "Void Infusion",     desc: "+4 Base Attack per level",   cost: 120, max: 10, col: "#a855f7" },
  { id: "revive", name: "Phoenix Protocol",  desc: "Start each run with +1 Revive", cost: 450, max: 4, col: "#34d399" },
  { id: "xp",     name: "Scholar's Mark",   desc: "+20% XP Gain per level",     cost: 180, max: 5,  col: "#facc15" },
  { id: "shard",  name: "Shard Magnet",      desc: "Double all shard drops",     cost: 700, max: 1,  col: "#06b6d4" },
  { id: "spd",    name: "Flux Capacitors",   desc: "+0.3 Move Speed per level",  cost: 150, max: 5,  col: "#fb923c" },
  { id: "def",    name: "Ablative Plating",  desc: "+3 Defense per level",       cost: 160, max: 8,  col: "#38bdf8" },
  { id: "start",  name: "Head Start",        desc: "Begin every run at Wave 3",  cost: 600, max: 1,  col: "#c084fc" },
];

const SKINS = [
  { id: "default",  name: "Exo-Suit",    col: "#06b6d4",  cost: 0     },
  { id: "phantom",  name: "Phantom",     col: "#d946ef",  cost: 400   },
  { id: "vanguard", name: "Vanguard",    col: "#34d399",  cost: 1000  },
  { id: "inferno",  name: "Inferno",     col: "#f97316",  cost: 2500  },
  { id: "abyssal",  name: "Abyssal",     col: "#fbbf24",  cost: 7000  },
  { id: "nebula",   name: "Nebula Core", col: "#f43f5e",  cost: 15000 },
  { id: "spectral", name: "Spectral",    col: "#a3e635",  cost: 30000 },
];

const BOSS_DEFS = [
  { name: "COLOSSUS",      col: "#ff1744", hp: 700,  spd: 1.0, atk: 12, type: "boss_colossus"  },
  { name: "TYRANT",        col: "#ff9100", hp: 1100, spd: 0.9, atk: 18, type: "boss_tyrant"    },
  { name: "PHASE LORD",    col: "#d500f9", hp: 950,  spd: 1.3, atk: 22, type: "boss_phase"     },
  { name: "SWARM MOTHER",  col: "#00e676", hp: 1500, spd: 0.7, atk: 14, type: "boss_swarm"     },
  { name: "VOID SERPENT",  col: "#651fff", hp: 1400, spd: 1.5, atk: 22, type: "boss_serpent"   },
  { name: "NEBULA QUEEN",  col: "#f50057", hp: 1900, spd: 0.8, atk: 32, type: "boss_nebula"    },
  { name: "CORE GUARDIAN", col: "#00b0ff", hp: 2600, spd: 0.5, atk: 38, type: "boss_core"      },
  { name: "RIFT WEAVER",   col: "#1de9b6", hp: 2100, spd: 1.1, atk: 32, type: "boss_weaver"    },
  { name: "DOOMBRINGER",   col: "#d50000", hp: 3200, spd: 1.4, atk: 46, type: "boss_doom"      },
  { name: "OBLIVION",      col: "#aa00ff", hp: 5500, spd: 1.7, atk: 65, type: "boss_oblivion"  },
];

const ENEMY_TYPES = ["stalker", "dasher", "blinker", "weaver", "specter", "leech", "bomber", "shielder"];

// ── DEFAULT META ─────────────────────────────────────────────
const DEFAULT_META = {
  shards: 0, upgrades: {}, skins: ["default"],
  activeSkin: "default", highWave: 0, totalRuns: 0, totalKills: 0,
};

// ── SAVE / LOAD ───────────────────────────────────────────────
// ── SAVE / LOAD (FIXED) ───────────────────────────────────────────────
function saveMeta(meta) {
  if (typeof window === "undefined") return; // Exit if on server
  try { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta)); 
  } catch (_) {}
}

function loadMeta() {
  if (typeof window === "undefined") return { ...DEFAULT_META }; // Return default if on server
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_META };
    const loaded = JSON.parse(raw);
    return { ...DEFAULT_META, ...loaded, upgrades: loaded.upgrades || {}, skins: loaded.skins || ["default"] };
  } catch (_) { return { ...DEFAULT_META }; }
}

// ── GAME INIT ─────────────────────────────────────────────────
function initPlayer(meta) {
  const u = meta.upgrades || {};
  return {
    x: 0, y: 0, r: 14,
    hp: 100 + (u.hp || 0) * 25,
    maxHp: 100 + (u.hp || 0) * 25,
    atk: 10 + (u.atk || 0) * 4,
    def: (u.def || 0) * 3,
    spd: 3.2 + (u.spd || 0) * 0.3,
    xp: 0, xpNeeded: 60, level: 1,
    equippedSkills: [], unlockedSkills: [], skillCds: {},
    kills: 0, revives: u.revive || 0,
    invuln: 0, droneCd: 0, droneUp: true,
    facing: v2(1, 0),
    shards: 0,
    xpMult: 1 + (u.xp || 0) * 0.2,
    shardMult: u.shard ? 2 : 1,
    fireRate: 22, fireCd: 0,
    overcharged: 0,
    skin: meta.activeSkin || "default",
    vx: 0, vy: 0,
    combo: 0, comboCd: 0,
    surgeKills: 0,
  };
}

function initStars(W, H) {
  return Array.from({ length: 130 }, () => ({
    x: rand(0, W), y: rand(0, H),
    r: rand(0.4, 2.2),
    tw: rand(0, Math.PI * 2),
    spd: rand(0.012, 0.06),
  }));
}

function initGS(meta, mode, W, H) {
  const ARENA = {
    x: 188, y: 8,
    w: W - 196 - 188,
    h: H - 16,
  };
  const p = initPlayer(meta);
  p.x = ARENA.x + ARENA.w / 2;
  p.y = ARENA.y + ARENA.h / 2;
  const startWave = meta.upgrades?.start ? 2 : 0;
  return {
    p, mode, ARENA, frame: 0,
    enemies: [], projectiles: [], particles: [], floats: [],
    rifts: [], friendlyRifts: [], mines: [],
    wave: startWave, waveState: "breather", breatherT: 200,
    spawnQueue: [], totalKills: 0,
    singActive: 0, timeSlowActive: 0,
    shake: 0, sx: 0, sy: 0,
    pendingLevelUp: false, pendingDeath: false,
    bossRef: null,
    stars: initStars(W, H),
    bgHue: 260,
  };
}

// ── ENEMY FACTORY ─────────────────────────────────────────────
function mkEnemy(type, x, y, sf) {
  let hp = 15 * sf, atk = 5 * sf, spd = 1.8, r = 12, col = "#a855f7", aiType = "melee";
  const extra = {};

  if (type.startsWith("boss_")) {
    const idx = parseInt(type.split("_")[1]);
    const def = BOSS_DEFS[Math.min(idx, BOSS_DEFS.length - 1)];
    hp = def.hp * sf; atk = def.atk * sf; spd = def.spd; col = def.col; r = 38; aiType = def.type;
    return {
      id: Math.random(), x, y, r, hp, maxHp: hp, atk, spd, col, aiType,
      boss: true, name: def.name, hitCd: 0, phase: 1,
      phases: [{ hpPct: 0.5, msg: "ENRAGED!" }, { hpPct: 0.2, msg: "FINAL FORM!" }],
      hurtFlash: 0, shield: 0, maxShield: 0, invisible: false,
    };
  }

  if      (type === "dasher")   { spd = 2.6; col = "#f97316"; aiType = "charger";  hp *= 0.8; }
  else if (type === "blinker")  { spd = 1.3; col = "#06b6d4"; aiType = "blinker";  hp *= 0.7; }
  else if (type === "weaver")   { spd = 1.1; col = "#ec4899"; aiType = "weaver";   hp *= 1.2; r = 14; }
  else if (type === "specter")  { spd = 1.8; col = "#94a3b8"; aiType = "specter";  hp *= 0.9; extra.invisible = false; extra.invisT = 60; extra.visDur = 70; extra.invisDur = 90; }
  else if (type === "leech")    { spd = 1.3; col = "#4ade80"; aiType = "leech";    hp *= 1.5; r = 14; }
  else if (type === "bomber")   { spd = 2.1; col = "#fb923c"; aiType = "bomber";   hp *= 0.6; r = 13; extra.armT = 120; }
  else if (type === "shielder") { spd = 1.0; col = "#6366f1"; aiType = "shielder"; hp *= 2;   r = 16; extra.shield = 30; extra.maxShield = 30; }

  return {
    id: Math.random(), x, y, r, hp, maxHp: hp, atk, spd, col, aiType,
    boss: false, hitCd: 0, hurtFlash: 0, invisible: false, shield: 0, maxShield: 0,
    ...extra,
  };
}

// ── ENGINE FUNCTIONS ──────────────────────────────────────────
function updatePlayer(gs, keys, mouse) {
  const p = gs.p;
  const { ARENA } = gs;

  if (p.invuln > 0) p.invuln--;
  if (p.fireCd > 0) p.fireCd--;
  if (p.overcharged > 0) p.overcharged--;
  if (gs.timeSlowActive > 0) gs.timeSlowActive--;
  if (p.comboCd > 0) { p.comboCd--; if (p.comboCd <= 0) p.combo = 0; }
  for (const id in p.skillCds) if (p.skillCds[id] > 0) p.skillCds[id]--;

  // Drone regen
  if (p.unlockedSkills.includes("droneMk2") && !p.droneUp) {
    if (p.droneCd > 0) p.droneCd--;
    else p.droneUp = true;
  }

  // Movement
  let dx = 0, dy = 0;
  if (keys["a"] || keys["arrowleft"])  dx -= 1;
  if (keys["d"] || keys["arrowright"]) dx += 1;
  if (keys["w"] || keys["arrowup"])    dy -= 1;
  if (keys["s"] || keys["arrowdown"])  dy += 1;
  if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }

  const spdMult = p.unlockedSkills.includes("swiftness") ? 1.25 : 1;
  p.vx = dx; p.vy = dy;
  p.x = clamp(p.x + dx * p.spd * spdMult, ARENA.x + p.r, ARENA.x + ARENA.w - p.r);
  p.y = clamp(p.y + dy * p.spd * spdMult, ARENA.y + p.r, ARENA.y + ARENA.h - p.r);

  // Aim
  const mdx = mouse.x - p.x, mdy = mouse.y - p.y;
  const mm = Math.hypot(mdx, mdy) || 1;
  p.facing = { x: mdx / mm, y: mdy / mm };

  // Autofire
  const conduit = p.unlockedSkills.includes("voidConduit") ? 0.75 : 1;
  const effRate = Math.max(6, Math.floor(p.fireRate * (p.overcharged > 0 ? 0.35 : 1) * conduit));
  const skinCol = SKINS.find(s => s.id === p.skin)?.col || "#06b6d4";
  const dmg = p.atk * (p.overcharged > 0 ? 1.5 : 1);

  if (p.fireCd <= 0 && gs.enemies.length > 0) {
    pushProj(gs, p.x, p.y, mouse.x, mouse.y, 11, dmg, skinCol, 7, "player", false, false);
    if (p.unlockedSkills.includes("echoShot") && Math.random() < 0.3) {
      const a = ang(p, mouse) + rand(-0.32, 0.32);
      const ep = makeProj(p.x, p.y, Math.cos(a) * 10, Math.sin(a) * 10, dmg * 0.5, "#a855f7", 5, "player");
      ep.bounce = 2;
      ep.chain = p.unlockedSkills.includes("chainArc");
      ep.explode = p.unlockedSkills.includes("explosiveRounds");
      gs.projectiles.push(ep);
    }
    p.fireCd = effRate;
  }
}

function makeProj(x, y, vx, vy, dmg, color, r, owner) {
  return { x, y, vx, vy, dmg, color, r, life: 290, owner, hitIds: new Set(), pierce: false, bounce: 0, chain: false, explode: false };
}

function pushProj(gs, x, y, tx, ty, spd, dmg, col, r, owner, pierce = false, chain = false) {
  const p = gs.p;
  const a = ang({ x, y }, { x: tx, y: ty });
  const pr = makeProj(x, y, Math.cos(a) * spd, Math.sin(a) * spd, dmg, col, r, owner);
  pr.pierce = pierce;
  pr.chain = chain || (owner === "player" && p.unlockedSkills.includes("chainArc"));
  pr.explode = owner === "player" && p.unlockedSkills.includes("explosiveRounds");
  gs.projectiles.push(pr);
}

function spawnParts(gs, x, y, col, n, sm = 1) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), s = rand(1.5, 6) * sm;
    gs.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color: col, r: rand(1.5, 4.5), life: ri(15, 45) });
  }
}

function addFloat(gs, x, y, text, color, big = false) {
  gs.floats.push({ x, y, text, color, life: big ? 100 : 45, big });
}

function aoeHit(gs, cx, cy, r, dmg) {
  for (const e of gs.enemies) if (dst({ x: cx, y: cy }, e) < r) hitEnemy(gs, e, dmg);
}

function takeDmg(gs, rawDmg, isBoss = false) {
  const p = gs.p;
  if (p.invuln > 0) return;

  if (p.unlockedSkills.includes("droneMk2") && p.droneUp) {
    p.droneUp = false; p.droneCd = 480;
    spawnParts(gs, p.x, p.y, "#38bdf8", 22, 1.5);
    addFloat(gs, p.x, p.y - 32, "DRONE ABSORBED!", "#38bdf8", false);
    return;
  }

  let dmg = Math.max(1, Math.round(rawDmg - p.def));
  if (p.unlockedSkills.includes("crystalline")) dmg = Math.floor(dmg * 0.7);
  p.hp -= dmg; p.invuln = isBoss ? 50 : 32;
  addFloat(gs, p.x, p.y - 28, `-${dmg}`, "#f87171", true);
  gs.shake = isBoss ? 20 : 12;
  p.combo = 0; p.comboCd = 0;
  if (p.hp <= 0) { p.hp = 0; gs.pendingDeath = true; }
}

function hitEnemy(gs, e, rawDmg) {
  if (!e || e.hp <= 0) return;
  let dmg = Math.max(1, Math.round(rawDmg));

  if (e.shield > 0) {
    const abs = Math.min(e.shield, dmg);
    e.shield -= abs; dmg -= abs;
    spawnParts(gs, e.x, e.y, "#6366f1", 4);
    if (dmg <= 0) return;
  }

  e.hp -= dmg; e.hurtFlash = 8;
  addFloat(gs, e.x + rand(-12, 12), e.y - 22, String(dmg), "#fde047", false);

  const p = gs.p;
  if (p.unlockedSkills.includes("vampirism") && Math.random() < 0.08) {
    p.hp = Math.min(p.maxHp, p.hp + 6);
    spawnParts(gs, p.x, p.y, "#ec4899", 3);
  }
  if (e.hp <= 0) killEnemy(gs, e);
}

function killEnemy(gs, e) {
  const p = gs.p;
  spawnParts(gs, e.x, e.y, e.col, e.boss ? 65 : 22, e.boss ? 3 : 1.4);
  gs.totalKills++; p.kills++;
  p.combo = Math.min(p.combo + 1, 99); p.comboCd = 200;
  p.surgeKills++;

  // Void Surge passive
  if (p.unlockedSkills.includes("voidSurge") && p.surgeKills >= 10) {
    p.surgeKills = 0;
    aoeHit(gs, p.x, p.y, 130, p.atk * 3);
    spawnParts(gs, p.x, p.y, "#818cf8", 35, 2);
    addFloat(gs, p.x, p.y - 40, "VOID SURGE!", "#818cf8", true);
  }

  const mult = (gs.mode === "nightmare" ? 2 : 1) * p.shardMult;
  const sh = Math.floor((e.boss ? 65 : ri(1, 3)) * mult * (1 + p.combo * 0.02));
  p.shards += sh;
  if (e.boss) addFloat(gs, e.x, e.y - 55, `+${sh} 💎`, "#22d3ee", true);

  if (p.unlockedSkills.includes("siphon")) p.hp = Math.min(p.maxHp, p.hp + 1);

  const xpGain = (e.boss ? 70 : 6) * p.xpMult * (gs.mode === "nightmare" ? 1.5 : 1);
  p.xp += xpGain;
  while (p.xp >= p.xpNeeded) {
    p.xp -= p.xpNeeded;
    p.xpNeeded = Math.floor(p.xpNeeded * 1.45);
    p.level++;
    gs.pendingLevelUp = true;
  }
  if (e.boss) gs.bossRef = null;
}

function openRift(gs) {
  const { ARENA } = gs;
  const m = 40, side = ri(0, 3);
  let x = 0, y = 0;
  if (side === 0)      { x = rand(ARENA.x + m, ARENA.x + ARENA.w - m); y = ARENA.y + m; }
  else if (side === 1) { x = rand(ARENA.x + m, ARENA.x + ARENA.w - m); y = ARENA.y + ARENA.h - m; }
  else if (side === 2) { x = ARENA.x + m;          y = rand(ARENA.y + m, ARENA.y + ARENA.h - m); }
  else                 { x = ARENA.x + ARENA.w - m; y = rand(ARENA.y + m, ARENA.y + ARENA.h - m); }
  gs.rifts.push({ x, y, life: 700, maxLife: 700, r: 28 });
}

function spawnEnemy(gs, type, sf) {
  const { ARENA } = gs;
  const rift = gs.rifts.length > 0 ? gs.rifts[ri(0, gs.rifts.length - 1)] : { x: ARENA.x + 60, y: ARENA.y + 60 };
  const ex = clamp(rift.x + rand(-20, 20), ARENA.x + 40, ARENA.x + ARENA.w - 40);
  const ey = clamp(rift.y + rand(-20, 20), ARENA.y + 40, ARENA.y + ARENA.h - 40);
  const e = mkEnemy(type, ex, ey, sf);
  gs.enemies.push(e);
  if (e.boss) gs.bossRef = e;
  spawnParts(gs, ex, ey, "#a855f7", 14);
}

function launchWave(gs) {
  gs.wave++;
  const isBoss = gs.wave % 5 === 0;
  gs.waveState = isBoss ? "boss" : "fighting";
  const sf = 1 + gs.wave * 0.07 + (gs.mode === "nightmare" ? 0.35 : 0);

  if (isBoss) {
    const bossIdx = Math.min(BOSS_DEFS.length - 1, Math.floor(gs.wave / 5) - 1);
    gs.spawnQueue.push({ type: `boss_${bossIdx}`, sf, timer: 80 });
    for (let i = 0; i < 3; i++) openRift(gs);
    addFloat(gs, gs.p.x, gs.p.y - 50, "⚠ BOSS INCOMING ⚠", "#ff1744", true);
  } else {
    const count = Math.min(28, 4 + Math.floor(gs.wave * 1.3));
    for (let i = 0; i < count; i++) {
      const typeIdx = Math.min(ENEMY_TYPES.length - 1, Math.floor(gs.wave / 2.5));
      gs.spawnQueue.push({ type: ENEMY_TYPES[ri(0, typeIdx)], sf, timer: i * 38 });
    }
    const rifts = clamp(Math.floor(count / 5), 1, 4);
    for (let i = 0; i < rifts; i++) openRift(gs);
    addFloat(gs, gs.p.x, gs.p.y - 50, `WAVE ${gs.wave}`, "#fbbf24", true);
  }
  gs.bgHue = (260 + gs.wave * 5) % 360;
}

function tickWave(gs) {
  if (gs.waveState === "breather") {
    gs.breatherT--;
    if (gs.breatherT <= 0) launchWave(gs);
  } else if (gs.enemies.length === 0 && gs.spawnQueue.length === 0) {
    if (gs.waveState === "boss") {
      gs.p.revives++;
      addFloat(gs, gs.p.x, gs.p.y - 60, "🔥 BOSS SLAIN — REVIVE EARNED!", "#ffd700", true);
      gs.shake = 30;
    }
    gs.waveState = "breather";
    gs.breatherT = gs.wave % 5 === 0 ? 230 : 160;
  }
}

// ── AI ─────────────────────────────────────────────────────────
function runAI(gs, e) {
  const p = gs.p;
  const spdMult = gs.timeSlowActive > 0 ? 0.25 : 1;
  const d = dst(e, p), sd = e.r + p.r;
  const mt = (spd) => { const a = ang(e, p); e.x += Math.cos(a) * spd * spdMult; e.y += Math.sin(a) * spd * spdMult; };
  const shoot = (spd, dmg, col, r, off = 0) => { const a = ang(e, p) + off; gs.projectiles.push(makeProj(e.x, e.y, Math.cos(a) * spd, Math.sin(a) * spd, dmg, col, r, "enemy")); };
  const ring = (n, spd, dmg, col, r) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; gs.projectiles.push(makeProj(e.x, e.y, Math.cos(a) * spd, Math.sin(a) * spd, dmg, col, r, "enemy")); } };

  // Boss phase transitions
  if (e.phases) {
    for (const ph of e.phases) {
      if (e.hp / e.maxHp <= ph.hpPct && !e[`_ph_${ph.hpPct}`]) {
        e[`_ph_${ph.hpPct}`] = true; e.phase++;
        addFloat(gs, e.x, e.y - 50, ph.msg, "#ff1744", true);
        spawnParts(gs, e.x, e.y, e.col, 55, 2.8); gs.shake = 22;
      }
    }
  }

  if (!e._s1) e._s1 = ri(80, 200);

  switch (e.aiType) {
    case "melee": if (d > sd) mt(e.spd); break;
    case "charger":
      if (e.charging) {
        e.x += (e._cx || 0) * spdMult; e.y += (e._cy || 0) * spdMult; e._ct = (e._ct || 0) - 1;
        if ((e._ct || 0) <= 0 || d < sd + 5) { e.charging = false; if (d < sd + 35) takeDmg(gs, e.atk * 1.6, false); }
      } else {
        if (d > sd) mt(e.spd * 0.55);
        if (!e._cd) e._cd = 140; e._cd--;
        if (e._cd <= 0 && d > sd + 20 && d < 320) {
          const a = ang(e, p); e._cx = Math.cos(a) * e.spd * 4.2; e._cy = Math.sin(a) * e.spd * 4.2;
          e.charging = true; e._ct = 30; e._cd = 140; spawnParts(gs, e.x, e.y, e.col, 8);
        }
      }
      break;
    case "blinker":
      if (!e._cd) e._cd = 130; e._cd--;
      if (e._cd <= 0) {
        const { ARENA } = gs;
        e.x = rand(ARENA.x + 60, ARENA.x + ARENA.w - 60); e.y = rand(ARENA.y + 60, ARENA.y + ARENA.h - 60);
        spawnParts(gs, e.x, e.y, e.col, 16); e._cd = ri(110, 170); shoot(4.5, e.atk, e.col, 8);
      }
      break;
    case "weaver":
      if (d < 140) mt(-e.spd); else if (d > 260) mt(e.spd * 0.4);
      if (!e._cd) e._cd = 250; e._cd--;
      if (e._cd <= 0 && gs.rifts.length < 6) { gs.rifts.push({ x: e.x + rand(-60, 60), y: e.y + rand(-60, 60), life: 280, maxLife: 280, r: 16 }); e._cd = 280; }
      break;
    case "specter":
      if (!e.invisible) { e._s1--; if (e._s1 <= 0) { e.invisible = true; e._s1 = e.invisDur || 90; } mt(e.spd); }
      else { e._s1--; if (e._s1 <= 0) { e.invisible = false; e._s1 = e.visDur || 70; shoot(3.5, e.atk, e.col, 7); } mt(e.spd * 1.4); }
      break;
    case "leech":
      mt(e.spd);
      if (!e._cd) e._cd = 140; e._cd--;
      if (e._cd <= 0) { e.hp = Math.min(e.maxHp, e.hp + 16); spawnParts(gs, e.x, e.y, "#4ade80", 6); e._cd = 140; }
      break;
    case "bomber":
      mt(e.spd);
      e.armT = (e.armT || 0) - 1;
      if (d < 60 && (e.armT || 0) <= 0) {
        aoeHit(gs, e.x, e.y, 95, e.atk * 2.2);
        spawnParts(gs, e.x, e.y, e.col, 30, 2.2);
        e.hp = 0; gs.shake = 16;
      }
      break;
    case "shielder":
      if (d > sd) mt(e.spd);
      if (!e._cd) e._cd = 110; e._cd--;
      if (e._cd <= 0) { shoot(3.2, e.atk, e.col, 8); e._cd = ri(80, 140); }
      if (gs.frame % 180 === 0 && e.shield < (e.maxShield || 30)) e.shield = Math.min(e.maxShield || 30, e.shield + 8);
      break;
    case "boss_colossus":
      if (d > sd) mt(e.spd);
      e._s1--; if (e._s1 <= 0) { ring(e.phase >= 3 ? 14 : e.phase >= 2 ? 10 : 7, 3.2, e.atk * 0.7, e.col, 9); e._s1 = e.phase >= 2 ? 100 : 140; }
      break;
    case "boss_tyrant":
      if (d > sd) mt(e.spd * 0.5);
      e._s1--; if (e._s1 <= 0) { const a = e._ang || 0; for (let i = 0; i < 4; i++) shoot(3.8, e.atk, e.col, 8, a + i * Math.PI / 2); e._ang = (e._ang || 0) + 0.28; e._s1 = e.phase >= 2 ? 18 : 28; }
      if (Math.random() < 0.005) openRift(gs);
      break;
    case "boss_phase":
      e._s1--; if (e._s1 <= 0) {
        const { ARENA } = gs;
        e.x = clamp(p.x + rand(-180, 180), ARENA.x + 55, ARENA.x + ARENA.w - 55);
        e.y = clamp(p.y + rand(-180, 180), ARENA.y + 55, ARENA.y + ARENA.h - 55);
        spawnParts(gs, e.x, e.y, e.col, 24); ring(e.phase >= 2 ? 14 : 9, 4.2, e.atk, e.col, 8); e._s1 = e.phase >= 2 ? 78 : 125;
      }
      break;
    case "boss_swarm":
      if (d < 200) mt(-e.spd); else if (d > 300) mt(e.spd * 0.4);
      e._s1--; if (e._s1 <= 0) {
        gs.spawnQueue.push({ type: "stalker", sf: 1, timer: 0 });
        gs.spawnQueue.push({ type: "stalker", sf: 1, timer: 20 });
        if (e.phase >= 2) gs.spawnQueue.push({ type: "dasher", sf: 1.2, timer: 10 });
        e._s1 = e.phase >= 2 ? 60 : 88;
      }
      break;
    case "boss_serpent":
      mt(e.spd);
      e._s1--; if (e._s1 <= 0) { gs.mines.push({ x: e.x, y: e.y, life: 420, r: 11 }); e._s1 = e.phase >= 2 ? 20 : 36; }
      break;
    case "boss_nebula":
      if (d > sd) mt(e.spd * 0.35);
      e._s1--; if (e._s1 <= 0) { gs.singActive = 95; e._s1 = e.phase >= 2 ? 165 : 255; }
      if (e.phase >= 2 && Math.random() < 0.055) shoot(5.8, e.atk, e.col, 6);
      break;
    case "boss_core":
      mt(e.spd);
      e._s1--; if (e._s1 <= 0) { ring(e.phase >= 2 ? 22 : 16, 2.6, e.atk * 1.15, e.col, 14); e._s1 = e.phase >= 2 ? 125 : 170; gs.shake = 14; }
      break;
    case "boss_weaver":
      if (d > sd) mt(e.spd);
      e._s1--; if (e._s1 <= 0) { for (let i = 0; i < (e.phase >= 2 ? 4 : 2); i++) openRift(gs); e._s1 = 150; }
      break;
    case "boss_doom":
      mt(e.spd);
      e._s1--; if (e._s1 <= 0) { [0, 0.3, -0.3, ...(e.phase >= 2 ? [0.6, -0.6] : [])].forEach(off => shoot(6.8, e.atk, e.col, 12, off)); e._s1 = e.phase >= 2 ? 38 : 58; }
      break;
    case "boss_oblivion":
      mt(e.spd);
      if (Math.random() < 0.028) ring(ri(8, 13), 4.8, e.atk, e.col, 10);
      if (Math.random() < 0.014) { const { ARENA } = gs; e.x = clamp(p.x + rand(-230, 230), ARENA.x + 55, ARENA.x + ARENA.w - 55); e.y = clamp(p.y + rand(-230, 230), ARENA.y + 55, ARENA.y + ARENA.h - 55); spawnParts(gs, e.x, e.y, e.col, 30); }
      if (Math.random() < 0.008) gs.singActive = 75;
      if (Math.random() < 0.007) gs.timeSlowActive = 190;
      break;
  }
}

function activateSkill(gs, id, mouse) {
  const p = gs.p, def = SKILLS[id];
  if (!def || def.type !== "active" || (p.skillCds[id] || 0) > 0) return;

  switch (id) {
    case "voidBurst":
      aoeHit(gs, p.x, p.y, 170, p.atk * 5);
      spawnParts(gs, p.x, p.y, def.col, 55, 3); gs.shake = 20;
      break;
    case "phaseShift":
      spawnParts(gs, p.x, p.y, def.col, 24);
      p.x = clamp(mouse.x, gs.ARENA.x + p.r, gs.ARENA.x + gs.ARENA.w - p.r);
      p.y = clamp(mouse.y, gs.ARENA.y + p.r, gs.ARENA.y + gs.ARENA.h - p.r);
      p.invuln = 45;
      aoeHit(gs, p.x, p.y, 115, p.atk * 3.5);
      spawnParts(gs, p.x, p.y, def.col, 30); gs.shake = 10;
      break;
    case "singularity":
      gs.singActive = 135;
      spawnParts(gs, p.x, p.y, def.col, 36, 2.2);
      break;
    case "riftAnchor":
      gs.friendlyRifts.push({ x: p.x, y: p.y, life: 380, r: 40 });
      spawnParts(gs, p.x, p.y, def.col, 28);
      break;
    case "overcharge":
      p.overcharged = 280;
      spawnParts(gs, p.x, p.y, def.col, 40, 2.4);
      addFloat(gs, p.x, p.y - 38, "OVERCHARGE!", def.col, true);
      break;
    case "voidMine":
      gs.mines.push({ x: p.x, y: p.y, life: 950, r: 11 });
      spawnParts(gs, p.x, p.y, def.col, 18);
      break;
    case "novaLance": {
      const a = ang(p, mouse);
      const lp = makeProj(p.x, p.y, Math.cos(a) * 17, Math.sin(a) * 17, p.atk * 5.5, "#f43f5e", 13, "player");
      lp.pierce = true; lp.life = 110;
      gs.projectiles.push(lp);
      spawnParts(gs, p.x, p.y, "#f43f5e", 22, 2.2);
      break;
    }
    case "timeRift":
      gs.timeSlowActive = 215;
      addFloat(gs, p.x, p.y - 38, "TIME RIFT!", def.col, true);
      spawnParts(gs, p.x, p.y, def.col, 32, 1.9);
      break;
  }
  p.skillCds[id] = def.cd;
}

// ── MAIN UPDATE ───────────────────────────────────────────────
function updateGS(gs, keys, mouse) {
  if (!gs) return;
  gs.frame++;

  updatePlayer(gs, keys, mouse);

  // Projectiles
  gs.projectiles = gs.projectiles.filter(pr => {
    pr.x += pr.vx; pr.y += pr.vy; pr.life--;
    if (pr.bounce > 0) {
      if (pr.x < gs.ARENA.x || pr.x > gs.ARENA.x + gs.ARENA.w) { pr.vx *= -1; pr.bounce--; }
      if (pr.y < gs.ARENA.y || pr.y > gs.ARENA.y + gs.ARENA.h) { pr.vy *= -1; pr.bounce--; }
    }
    if (pr.life <= 0 || pr.x < -30 || pr.x > 9999 || pr.y < -30 || pr.y > 9999) return false;

    if (pr.owner === "player") {
      for (const e of gs.enemies) {
        if (pr.hitIds.has(e.id) || e.invisible) continue;
        if (dst(pr, e) < e.r + pr.r) {
          hitEnemy(gs, e, pr.dmg);
          if (pr.explode) { aoeHit(gs, pr.x, pr.y, 65, pr.dmg * 0.5); spawnParts(gs, pr.x, pr.y, "#fb923c", 14, 1.6); }
          if (pr.chain && gs.enemies.length > 1) {
            const ct = gs.enemies.filter(x => x !== e && !pr.hitIds.has(x.id)).sort((a2, b2) => dst(pr, a2) - dst(pr, b2))[0];
            if (ct && dst(e, ct) < 210) {
              const cp = makeProj(e.x, e.y, (ct.x - e.x) * 0.14, (ct.y - e.y) * 0.14, pr.dmg * 0.7, "#fde047", 5, "player");
              gs.projectiles.push(cp);
              spawnParts(gs, e.x, e.y, "#fde047", 6, 1);
            }
          }
          spawnParts(gs, pr.x, pr.y, pr.color, 4);
          if (pr.pierce) { pr.hitIds.add(e.id); continue; }
          return false;
        }
      }
    } else {
      if (!pr.hitIds.has("player") && dst(pr, gs.p) < gs.p.r + pr.r) {
        takeDmg(gs, pr.dmg, false); spawnParts(gs, pr.x, pr.y, pr.color, 5);
        return false;
      }
    }
    return true;
  });

  // Enemies
  gs.enemies = gs.enemies.filter(e => e.hp > 0);
  for (const e of gs.enemies) {
    if (e.hurtFlash > 0) e.hurtFlash--;
    const d = dst(gs.p, e);
    const sd = gs.p.r + e.r;
    if (d < sd) {
      const a = ang(e, gs.p), ov = sd - d;
      if (e.boss) { gs.p.x += Math.cos(a) * ov * 0.7; gs.p.y += Math.sin(a) * ov * 0.7; }
      else { e.x -= Math.cos(a) * ov * 0.5; e.y -= Math.sin(a) * ov * 0.5; }
      if (e.hitCd <= 0) { takeDmg(gs, e.atk, e.boss); e.hitCd = e.boss ? 36 : 26; }
    }
    if (e.hitCd > 0) e.hitCd--;
    for (const o of gs.enemies) {
      if (e === o) continue;
      const od = dst(e, o), om = e.r + o.r;
      if (od < om && od > 0) { const ov = (om - od) / 2 + 0.1, oa = ang(e, o); e.x -= Math.cos(oa) * ov; e.y -= Math.sin(oa) * ov; }
    }
    runAI(gs, e);
    e.x = clamp(e.x, gs.ARENA.x + e.r, gs.ARENA.x + gs.ARENA.w - e.r);
    e.y = clamp(e.y, gs.ARENA.y + e.r, gs.ARENA.y + gs.ARENA.h - e.r);
  }

  // Singularity pull
  if (gs.singActive > 0) {
    gs.singActive--;
    for (const e of gs.enemies) { const a = ang(e, gs.p), d2 = dst(e, gs.p); const pull = Math.min(5.5, 900 / Math.max(d2, 50)); e.x += Math.cos(a) * pull; e.y += Math.sin(a) * pull; }
    if (gs.singActive === 1) { aoeHit(gs, gs.p.x, gs.p.y, 190, gs.p.atk * 6.5); spawnParts(gs, gs.p.x, gs.p.y, "#c084fc", 65, 3.2); gs.shake = 30; }
  }

  // Mines
  gs.mines = gs.mines.filter(m => {
    m.life--;
    for (const e of gs.enemies) if (dst(m, e) < 50) {
      aoeHit(gs, m.x, m.y, 125, gs.p.atk * 4.2);
      spawnParts(gs, m.x, m.y, "#f97316", 38, 2.8); gs.shake = 20; return false;
    }
    return m.life > 0;
  });

  // Friendly rifts
  gs.friendlyRifts = gs.friendlyRifts.filter(fr => {
    fr.life--;
    if (gs.frame % 18 === 0) for (const e of gs.enemies) if (dst(fr, e) < 100) { hitEnemy(gs, e, gs.p.atk * 1.3); spawnParts(gs, e.x, e.y, "#34d399", 4); }
    return fr.life > 0;
  });

  // Spawn queue
  gs.spawnQueue = gs.spawnQueue.filter(sq => { sq.timer--; if (sq.timer <= 0) { spawnEnemy(gs, sq.type, sq.sf); return false; } return true; });

  // Rifts age
  gs.rifts = gs.rifts.filter(r => { r.life--; return r.life > 0; });

  // Particles
  gs.particles = gs.particles.filter(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.vx *= 0.88; pt.vy *= 0.88; pt.life--; return pt.life > 0; });
  gs.floats = gs.floats.filter(ft => { ft.y -= 0.9; ft.life--; return ft.life > 0; });

  tickWave(gs);

  gs.shake *= 0.78;
  if (gs.shake > 0.5) { gs.sx = rand(-gs.shake, gs.shake); gs.sy = rand(-gs.shake, gs.shake); }
  else { gs.sx = 0; gs.sy = 0; gs.shake = 0; }
}

// ── RENDERER ──────────────────────────────────────────────────
function renderGS(ctx, gs, frame) {
  const p = gs.p, f = gs.frame, { ARENA } = gs;
  const W = ctx.canvas.width, H = ctx.canvas.height;

  ctx.save();
  ctx.translate(gs.sx || 0, gs.sy || 0);

  // Background
  ctx.fillStyle = "#010108"; ctx.fillRect(0, 0, W, H);

  // Nebula
  const hue = (gs.bgHue || 260);
  const nb = ctx.createRadialGradient(W * 0.4, H * 0.45, 0, W * 0.4, H * 0.45, Math.max(W, H) * 0.65);
  nb.addColorStop(0, `hsla(${hue},70%,9%,0.22)`);
  nb.addColorStop(0.5, `hsla(${(hue + 40) % 360},55%,4%,0.1)`);
  nb.addColorStop(1, "transparent");
  ctx.fillStyle = nb; ctx.fillRect(0, 0, W, H);

  // Time slow visual
  if (gs.timeSlowActive > 0) {
    ctx.fillStyle = `rgba(163,230,53,${0.03 * Math.min(1, gs.timeSlowActive / 60)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Stars
  for (const st of gs.stars) {
    const tw = Math.sin(f * st.spd + st.tw);
    ctx.globalAlpha = 0.28 + tw * 0.28;
    ctx.fillStyle = gs.timeSlowActive > 0 ? "#d9f99d" : "#c7d2fe";
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r * (0.85 + tw * 0.25), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Arena shadow border
  ctx.fillStyle = "rgba(0,0,0,0.84)";
  ctx.fillRect(0, 0, W, ARENA.y);
  ctx.fillRect(0, ARENA.y + ARENA.h, W, H - ARENA.y - ARENA.h);
  ctx.fillRect(0, ARENA.y, ARENA.x, ARENA.h);
  ctx.fillRect(ARENA.x + ARENA.w, ARENA.y, W - ARENA.x - ARENA.w, ARENA.h);

  // Arena border glow
  const bAlpha = 0.45 + Math.sin(f * 0.04) * 0.2;
  ctx.strokeStyle = `hsla(${hue},75%,65%,${bAlpha})`;
  ctx.lineWidth = 2.5; ctx.shadowColor = `hsl(${hue},70%,55%)`; ctx.shadowBlur = 16;
  ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h); ctx.shadowBlur = 0;

  // Arena grid
  ctx.strokeStyle = "rgba(100,50,200,0.045)"; ctx.lineWidth = 1;
  const GS = 55;
  for (let gx = ARENA.x + GS; gx < ARENA.x + ARENA.w; gx += GS) { ctx.beginPath(); ctx.moveTo(gx, ARENA.y); ctx.lineTo(gx, ARENA.y + ARENA.h); ctx.stroke(); }
  for (let gy = ARENA.y + GS; gy < ARENA.y + ARENA.h; gy += GS) { ctx.beginPath(); ctx.moveTo(ARENA.x, gy); ctx.lineTo(ARENA.x + ARENA.w, gy); ctx.stroke(); }

  // Enemy rifts
  for (const r of gs.rifts) {
    const pct = r.life / r.maxLife, pulse = Math.sin(f * 0.12 + r.x) * 9;
    const rg = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r * 4.5 + pulse);
    rg.addColorStop(0, `rgba(168,85,247,${0.52 * pct})`); rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 4.5 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(216,180,254,${0.8 * pct})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.7, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(f * 0.055);
    ctx.strokeStyle = `rgba(220,180,255,${0.45 * pct})`; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(r.r * 0.2, 0); ctx.lineTo(r.r * 0.85, 0); ctx.stroke(); ctx.rotate(Math.PI / 2); }
    ctx.restore();
  }

  // Friendly rifts
  for (const fr of gs.friendlyRifts) {
    const alpha = fr.life / 380;
    ctx.strokeStyle = `rgba(52,211,153,${alpha})`; ctx.lineWidth = 3;
    ctx.shadowColor = "#34d399"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(fr.x, fr.y, fr.r + Math.sin(f * 0.18) * 7, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(52,211,153,${alpha * 0.08})`; ctx.beginPath(); ctx.arc(fr.x, fr.y, fr.r + 6, 0, Math.PI * 2); ctx.fill();
  }

  // Mines
  for (const m of gs.mines) {
    const blink = f % 10 < 5 ? "#f97316" : "#9a3412";
    ctx.fillStyle = blink; ctx.shadowColor = "#f97316"; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(249,115,22,0.18)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(m.x, m.y, 50, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }

  // Singularity ring
  if (gs.singActive > 0) {
    const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 190);
    sg.addColorStop(0, "rgba(192,132,252,0.2)"); sg.addColorStop(1, "transparent");
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(192,132,252,0.72)"; ctx.lineWidth = 2.5; ctx.setLineDash([10, 7]);
    ctx.beginPath(); ctx.arc(p.x, p.y, 190, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }

  // Time slow ring
  if (gs.timeSlowActive > 0) {
    ctx.strokeStyle = `rgba(163,230,53,0.22)`; ctx.lineWidth = 1.5; ctx.setLineDash([6, 8]);
    ctx.strokeRect(ARENA.x + 4, ARENA.y + 4, ARENA.w - 8, ARENA.h - 8); ctx.setLineDash([]);
  }

  // Particles
  for (const pt of gs.particles) {
    ctx.globalAlpha = Math.min(1, pt.life / 18);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Projectiles
  for (const pr of gs.projectiles) {
    ctx.fillStyle = pr.color; ctx.shadowColor = pr.color; ctx.shadowBlur = pr.r * 2.2;
    ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Enemies
  for (const e of gs.enemies) {
    if (e.invisible && e._s1 > 30) ctx.globalAlpha = 0.1;
    ctx.fillStyle = e.hurtFlash > 0 ? "#ffffff" : e.col;
    if (e.boss) { ctx.shadowColor = e.col; ctx.shadowBlur = 24; }
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    if (e.shield > 0) {
      const sp = e.shield / (e.maxShield || 30);
      ctx.strokeStyle = `rgba(99,102,241,${sp * 0.9})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5, 0, Math.PI * 2); ctx.stroke();
    }

    const bw = e.r * 2.8, bx = e.x - bw / 2, by = e.y - e.r - 15;
    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(bx - 1, by - 1, bw + 2, 9);
    const hp2 = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = hp2 > 0.6 ? "#4ade80" : hp2 > 0.3 ? "#fb923c" : "#ef4444";
    ctx.fillRect(bx, by, bw * hp2, 7);

    if (e.boss) {
      ctx.fillStyle = "rgba(255,80,80,0.95)"; ctx.font = "bold 12px 'Courier New',monospace"; ctx.textAlign = "center";
      ctx.shadowColor = "rgba(255,0,0,0.8)"; ctx.shadowBlur = 10;
      ctx.fillText(e.name, e.x, by - 8); ctx.shadowBlur = 0;
    }
  }
  ctx.textAlign = "left";

  // Player
  const visible = p.invuln === 0 || f % 8 < 4;
  if (visible) {
    if (p.overcharged > 0) {
      ctx.strokeStyle = "rgba(251,191,36,0.85)"; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 12 + Math.sin(f * 0.3) * 4, 0, Math.PI * 2); ctx.stroke();
    }
    if (p.unlockedSkills.includes("droneMk2") && p.droneUp) {
      const da = f * 0.07;
      ctx.fillStyle = "#38bdf8"; ctx.shadowColor = "#38bdf8"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(p.x + Math.cos(da) * 32, p.y + Math.sin(da) * 32, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    const skinCol = SKINS.find(s => s.id === p.skin)?.col || "#06b6d4";
    ctx.fillStyle = skinCol; ctx.shadowColor = skinCol; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath(); ctx.arc(p.x + p.facing.x * 10, p.y + p.facing.y * 10, 4.2, 0, Math.PI * 2); ctx.fill();
    if (p.hp / p.maxHp < 0.3) {
      ctx.strokeStyle = `rgba(248,113,113,${0.45 + Math.sin(f * 0.18) * 0.3})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // Floats
  for (const ft of gs.floats) {
    ctx.globalAlpha = Math.min(1, ft.life / 28);
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${ft.big ? 22 : 14}px 'Courier New',monospace`;
    ctx.textAlign = "center";
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1; ctx.textAlign = "left";

  // Breather countdown
  if (gs.waveState === "breather" && gs.breatherT > 0) {
    const sec = Math.ceil(gs.breatherT / 60);
    ctx.fillStyle = `hsla(${hue},75%,70%,${0.5 + Math.sin(f * 0.12) * 0.25})`;
    ctx.font = "15px 'Courier New',monospace"; ctx.textAlign = "center";
    ctx.fillText(`NEXT WAVE IN ${sec}s`, ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h - 18);
    ctx.textAlign = "left";
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  REACT COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function VoidEternalRift() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const gsRef = useRef(null);
  const keys = useRef({});
  const mouse = useRef({ x: 400, y: 300 });
  const [meta, setMeta] = useState(() => loadMeta());
  const [screen, setScreen] = useState("menu");
  const [uiSnap, setUiSnap] = useState(null);
  const [lvlChoices, setLvlChoices] = useState([]);
  const [toasts, setToasts] = useState([]);
  const gameMode = useRef("normal");

  // Auto-save on visibility / unload
  useEffect(() => {
    const save = () => saveMeta(meta);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
    return () => { window.removeEventListener("beforeunload", save); };
  }, [meta]);

  useEffect(() => { saveMeta(meta); }, [meta]);

  const addToast = useCallback((msg, col = "#a855f7") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, col }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
  }, []);

  // ── KEY HANDLERS ──────────────────────────────────────────────
  const onKeyDown = useCallback((e) => {
    const k = e.key.toLowerCase();
    if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
    keys.current[k] = true;

    const gs = gsRef.current;
    if (screen === "playing" && gs && !gs.pendingLevelUp && !gs.pendingDeath) {
      const altMap = { "1": 0, "2": 1, "3": 2, "4": 3, "q": 0, "e": 1, "r": 2, "f": 3 };
      const idx = altMap[k];
      if (idx !== undefined) {
        const id = gs.p.equippedSkills[idx];
        if (id) activateSkill(gs, id, mouse.current);
      }
    }
  }, [screen]);

  const onKeyUp = useCallback((e) => { keys.current[e.key.toLowerCase()] = false; }, []);

  const onMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // ── GAME LOOP ─────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const loop = () => {
      const gs = gsRef.current;
      if (!gs) return;
      updateGS(gs, keys.current, mouse.current);
      renderGS(ctx, gs);

      // Throttled React UI update
      if (gs.frame % 3 === 0) {
        const p = gs.p;
        setUiSnap({
          hp: p.hp, maxHp: p.maxHp, xp: p.xp, xpNeeded: p.xpNeeded, level: p.level,
          shards: p.shards, equippedSkills: [...p.equippedSkills],
          unlockedSkills: [...p.unlockedSkills], skillCds: { ...p.skillCds },
          revives: p.revives, combo: p.combo, overcharged: p.overcharged > 0,
          wave: gs.wave, waveState: gs.waveState, totalKills: gs.totalKills,
          breatherT: gs.breatherT, bossRef: gs.bossRef ? { name: gs.bossRef.name, hp: gs.bossRef.hp, maxHp: gs.bossRef.maxHp, col: gs.bossRef.col } : null,
          mode: gs.mode, droneUp: p.droneUp,
        });
      }

      if (gs.pendingLevelUp) {
        gs.pendingLevelUp = false;
        const p = gs.p;
        const taken = new Set(p.unlockedSkills.filter(id => SKILLS[id]?.type === "passive"));
        const pool = Object.keys(SKILLS).filter(id => !taken.has(id));
        setLvlChoices(pool.sort(() => Math.random() - 0.5).slice(0, 3));
        setScreen("levelup");
        return;
      }
      if (gs.pendingDeath) {
        gs.pendingDeath = false;
        if (gs.p.revives > 0 && gs.mode !== "nightmare") {
          setScreen("revive");
        } else {
          doDeath();
        }
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screen]);

  const startGame = useCallback((mode) => {
    gameMode.current = mode;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    gsRef.current = initGS(meta, mode, W, H);
    setMeta(m => { const nm = { ...m, totalRuns: (m.totalRuns || 0) + 1 }; saveMeta(nm); return nm; });
    setScreen("playing");
  }, [meta]);

  const doDeath = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const gs = gsRef.current;
    if (!gs) return;
    const shards = gs.p.shards;
    const wave = gs.wave, kills = gs.totalKills;
    setMeta(m => {
      const nm = {
        ...m,
        shards: m.shards + shards,
        totalKills: (m.totalKills || 0) + kills,
        highWave: Math.max(m.highWave || 0, wave),
      };
      saveMeta(nm);
      return nm;
    });
    setScreen("dead");
  }, []);

  const doRevive = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    gs.p.revives--;
    gs.p.hp = gs.p.maxHp;
    gs.p.invuln = 150;
    gs.enemies = []; gs.projectiles = []; gs.mines = [];
    setScreen("playing");
  }, []);

  const pickSkill = useCallback((id) => {
    const gs = gsRef.current;
    if (!gs) return;
    const p = gs.p;
    if (!p.unlockedSkills.includes(id)) p.unlockedSkills.push(id);
    if (SKILLS[id].type === "active" && !p.equippedSkills.includes(id) && p.equippedSkills.length < 4) p.equippedSkills.push(id);
    setScreen("playing");
  }, []);

  const buyUpgrade = useCallback((u) => {
    setMeta(m => {
      const cur = m.upgrades[u.id] || 0;
      if (m.shards < u.cost || cur >= u.max) return m;
      const nm = { ...m, shards: m.shards - u.cost, upgrades: { ...m.upgrades, [u.id]: cur + 1 } };
      saveMeta(nm); return nm;
    });
    addToast(`${u.name} upgraded!`, u.col);
  }, [addToast]);

  const buySkin = useCallback((sk) => {
    setMeta(m => {
      if (m.skins.includes(sk.id)) { const nm = { ...m, activeSkin: sk.id }; saveMeta(nm); return nm; }
      if (m.shards < sk.cost) return m;
      const nm = { ...m, shards: m.shards - sk.cost, skins: [...m.skins, sk.id], activeSkin: sk.id };
      saveMeta(nm); return nm;
    });
    addToast(`Skin equipped: ${sk.name}`, sk.col);
  }, [addToast]);

  // ── STYLES ────────────────────────────────────────────────────
  const S = useMemo(() => ({
    root: {
      position: "fixed", inset: 0, background: "#010108",
      fontFamily: "'Courier New', 'Lucida Console', monospace",
      color: "#fff", userSelect: "none", overflow: "hidden",
    },
    canvas: { display: "block", width: "100%", height: "100%", cursor: "none" },
    ovr: {
      position: "absolute", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(1,1,8,0.92)", backdropFilter: "blur(8px)",
    },
    panel: {
      background: "rgba(3,2,16,0.97)",
      border: "1px solid rgba(168,85,247,0.35)",
      borderRadius: 20, padding: "40px 44px",
      boxShadow: "0 0 80px rgba(100,30,200,0.22), inset 0 0 40px rgba(0,0,0,0.6)",
      maxWidth: 860, width: "92%",
      animation: "vfadeIn 0.35s cubic-bezier(0.34,1.4,0.64,1) both",
    },
    btn: (col, sm) => ({
      padding: sm ? "10px 20px" : "13px 28px",
      background: "rgba(3,2,16,0.9)",
      border: `2px solid ${col}`,
      color: col, fontFamily: "'Courier New', monospace",
      fontSize: sm ? 12 : 13, fontWeight: "bold",
      letterSpacing: sm ? 1.5 : 2, textTransform: "uppercase",
      borderRadius: 9, cursor: "pointer",
      boxShadow: `0 0 18px ${col}33`,
      transition: "all 0.16s ease",
    }),
    hud: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 },
  }), []);

  // ── HUD ───────────────────────────────────────────────────────
  const HUD = ({ ui }) => {
    if (!ui) return null;
    const hp = ui.hp, mhp = ui.maxHp;
    const hpPct = Math.max(0, (hp / mhp) * 100);
    const xpPct = (ui.xp / ui.xpNeeded) * 100;
    const passives = ui.unlockedSkills.filter(id => SKILLS[id]?.type === "passive");
    const hpCol = hpPct > 55 ? "#4ade80" : hpPct > 25 ? "#fb923c" : "#ef4444";

    const boxStyle = {
      background: "rgba(1,1,10,0.92)",
      border: "1px solid rgba(168,85,247,0.28)",
      borderRadius: 10, padding: "10px 13px", marginBottom: 8,
      backdropFilter: "blur(10px)",
      boxShadow: "0 0 12px rgba(80,30,180,0.1), inset 0 0 8px rgba(0,0,0,0.5)",
    };
    const lbl = { fontSize: 9, letterSpacing: 2, color: "#4a3060", marginBottom: 4 };
    const bar = { width: "100%", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", marginTop: 5 };

    return (
      <div style={S.hud}>
        {/* LEFT SIDEBAR */}
        <div style={{ position: "absolute", left: 8, top: 8, width: 178 }}>
          {/* HP */}
          <div style={boxStyle}>
            <div style={lbl}>HULL INTEGRITY</div>
            <div style={{ color: "#fca5a5", fontSize: 13, fontWeight: "bold", textShadow: `0 0 8px ${hpCol}` }}>
              {Math.ceil(hp)} / {mhp}
            </div>
            <div style={bar}>
              <div style={{ width: hpPct + "%", height: "100%", background: `linear-gradient(90deg,${hpCol},${hpCol}bb)`, borderRadius: 4, transition: "width 0.1s" }} />
            </div>
          </div>

          {/* XP */}
          <div style={boxStyle}>
            <div style={lbl}>EVOLUTION</div>
            <div style={{ color: "#c4b5fd", fontSize: 12, fontWeight: "bold" }}>LV {ui.level} · {Math.floor(ui.xp)}/{ui.xpNeeded}</div>
            <div style={bar}>
              <div style={{ width: xpPct + "%", height: "100%", background: "linear-gradient(90deg,#7c3aed,#22d3ee)", borderRadius: 4, transition: "width 0.18s" }} />
            </div>
          </div>

          {/* Stats */}
          <div style={boxStyle}>
            <div style={lbl}>SHARDS · COMBO · KILLS</div>
            <div style={{ color: "#22d3ee", fontSize: 13, fontWeight: "bold" }}>💎 {ui.shards}</div>
            {ui.combo > 1 && (
              <div style={{ color: "#fde047", fontSize: 11, fontWeight: "bold", marginTop: 2 }}>
                ×{ui.combo} COMBO
              </div>
            )}
            <div style={{ color: "#6b7280", fontSize: 11, marginTop: 3 }}>{ui.totalKills} SLAIN</div>
          </div>

          {/* Passives */}
          {passives.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ ...lbl, marginBottom: 6 }}>PASSIVES</div>
              {passives.map(id => {
                const s = SKILLS[id];
                return (
                  <div key={id} style={{
                    background: "rgba(1,1,10,0.88)", borderLeft: `3px solid ${s.col}`,
                    borderRadius: "0 6px 6px 0", padding: "5px 10px",
                    fontSize: 10, color: "#bbb", marginBottom: 5, letterSpacing: 1,
                    boxShadow: `inset 0 0 6px rgba(0,0,0,0.4)`,
                  }}>{s.name}</div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ position: "absolute", right: 8, top: 8, width: 182, textAlign: "right" }}>
          {/* Wave */}
          <div style={{
            ...boxStyle,
            borderColor: ui.waveState === "boss" ? "rgba(239,68,68,0.55)" : "rgba(168,85,247,0.3)",
            animation: ui.waveState === "boss" ? "vpulse 0.7s ease-in-out infinite alternate" : "none",
          }}>
            <div style={{
              color: ui.waveState === "boss" ? "#f87171" : "#a78bfa",
              fontSize: 20, fontWeight: 900, letterSpacing: 3,
              textShadow: `0 0 14px ${ui.waveState === "boss" ? "#ef4444" : "#a855f7"}`,
            }}>
              {ui.waveState === "boss" ? `⚠ BOSS ${Math.ceil(ui.wave / 5)}` : `WAVE ${ui.wave}`}
            </div>
          </div>

          {/* Mode */}
          <div style={boxStyle}>
            <div style={lbl}>MODE</div>
            <div style={{ color: ui.mode === "nightmare" ? "#f87171" : "#fbbf24", fontSize: 12, fontWeight: "bold", letterSpacing: 2 }}>
              {ui.mode === "nightmare" ? "☠ NIGHTMARE" : "⚡ NORMAL"}
            </div>
          </div>

          {/* Timer */}
          <div style={boxStyle}>
            <div style={lbl}>{ui.waveState === "breather" ? "NEXT WAVE" : "ENEMIES LEFT"}</div>
            <div style={{ color: "#93c5fd", fontSize: 13, fontWeight: "bold" }}>
              {ui.waveState === "breather" ? `${Math.ceil((ui.breatherT || 0) / 60)}s` : `${ui.totalKills > 0 ? "→" : ""} fighting`}
            </div>
          </div>

          {/* Revives */}
          {ui.revives > 0 && (
            <div style={{ ...boxStyle, borderColor: "rgba(52,211,153,0.35)" }}>
              <div style={lbl}>PHOENIX PROTOCOL</div>
              <div style={{ color: "#34d399", fontSize: 12, fontWeight: "bold" }}>⇧ {ui.revives} REVIVE{ui.revives > 1 ? "S" : ""}</div>
            </div>
          )}

          {/* Overcharge indicator */}
          {ui.overcharged && (
            <div style={{ ...boxStyle, borderColor: "rgba(251,191,36,0.6)", animation: "vpulse 0.5s ease-in-out infinite alternate" }}>
              <div style={{ color: "#fbbf24", fontSize: 12, fontWeight: "bold", letterSpacing: 2 }}>⚡ OVERCHARGE</div>
            </div>
          )}
        </div>

        {/* BOSS HP BAR */}
        {ui.bossRef && (
          <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 380, textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#f87171", textShadow: "0 0 10px #ef4444", marginBottom: 4 }}>{ui.bossRef.name}</div>
            <div style={{ height: 12, background: "rgba(1,1,10,0.92)", border: "1px solid rgba(239,68,68,0.45)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: Math.max(0, ui.bossRef.hp / ui.bossRef.maxHp * 100) + "%", height: "100%", background: `linear-gradient(90deg,#991b1b,${ui.bossRef.col},#f97316)`, borderRadius: 6, transition: "width 0.1s" }} />
            </div>
          </div>
        )}

        {/* SKILL BAR — bottom center */}
        <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12 }}>
          {ui.equippedSkills.map((id, i) => {
            const s = SKILLS[id], cd = ui.skillCds[id] || 0;
            const rdy = cd <= 0;
            return (
              <div key={id} style={{
                width: 62, height: 62, background: "rgba(1,1,10,0.92)",
                border: `2px solid ${rdy ? s.col : "#1e1e3a"}`,
                borderRadius: 12, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                position: "relative", overflow: "hidden",
                boxShadow: rdy ? `0 0 16px ${s.col}44, inset 0 0 8px ${s.col}11` : "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}>
                <span style={{ color: rdy ? s.col : "#3f3f6a", fontSize: 10, fontWeight: "bold", textAlign: "center", lineHeight: 1.2, padding: "0 4px" }}>
                  {s.name.split(" ")[0]}
                </span>
                <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 8, marginTop: 3, letterSpacing: 1 }}>[{i + 1}]</span>
                {!rdy && (
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)",
                    borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 14, fontWeight: "bold",
                  }}>
                    {(cd / 60).toFixed(1)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── MENU ──────────────────────────────────────────────────────
  const MenuScreen = () => (
    <div style={{ ...S.ovr, background: "#010108", zIndex: 100 }}>
      <style>{`
        @keyframes vfadeIn { from{opacity:0;transform:scale(0.92) translateY(18px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes vfloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes vpulse { from{box-shadow:0 0 8px rgba(168,85,247,0.3)} to{box-shadow:0 0 28px rgba(168,85,247,0.75)} }
        @keyframes vglow { 0%,100%{text-shadow:0 0 60px #7c3aed,0 0 25px #c084fc} 50%{text-shadow:0 0 100px #a855f7,0 0 45px #c084fc,0 0 10px #fff} }
        @keyframes vspin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-track{background:#0a0815} ::-webkit-scrollbar-thumb{background:#7c3aed55;border-radius:3px}
      `}</style>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${(i * 13 + 5) % 100}%`, top: `${(i * 17 + 10) % 100}%`,
            width: `${rand(80, 260)}px`, height: `${rand(80, 260)}px`,
            borderRadius: "50%",
            background: `radial-gradient(circle, hsla(${260 + i * 18},80%,55%,0.06) 0%, transparent 70%)`,
            animation: `vfloat ${4 + i * 0.4}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
      </div>
      <div style={{ textAlign: "center", animation: "vfloat 5s ease-in-out infinite", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 88, fontWeight: 900, letterSpacing: 22, color: "#c084fc", animation: "vglow 3s ease-in-out infinite", marginBottom: 0, lineHeight: 1 }}>
          VOID
        </div>
        <div style={{ fontSize: 13, letterSpacing: 13, color: "#22d3ee", marginBottom: 14, textShadow: "0 0 14px #06b6d4" }}>
          ETERNAL RIFT
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10, flexWrap: "wrap" }}>
          {[
            { label: `⚡ HIGH WAVE: ${meta.highWave}`, col: "#fbbf24" },
            { label: `💎 TOTAL: ${meta.totalKills || 0} KILLS`, col: "#a855f7" },
            { label: `🔮 SHARDS: ${meta.shards}`, col: "#22d3ee" },
          ].map((b, i) => (
            <div key={i} style={{ padding: "5px 14px", background: "rgba(1,1,12,0.8)", border: `1px solid ${b.col}33`, borderRadius: 20, fontSize: 11, color: b.col, letterSpacing: 1 }}>
              {b.label}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 32, marginBottom: 22, flexWrap: "wrap" }}>
          {[
            { label: "⚡ NORMAL RUN", col: "#a855f7", mode: "normal" },
            { label: "☠ NIGHTMARE", col: "#ef4444", mode: "nightmare" },
          ].map(b => (
            <button key={b.mode} style={S.btn(b.col)} onClick={() => startGame(b.mode)}
              onMouseEnter={e => { e.target.style.transform = "scale(1.06) translateY(-2px)"; e.target.style.filter = "brightness(1.25)"; }}
              onMouseLeave={e => { e.target.style.transform = "none"; e.target.style.filter = "none"; }}>
              {b.label}
            </button>
          ))}
        </div>
        <button style={S.btn("#22d3ee")} onClick={() => setScreen("shop")}
          onMouseEnter={e => { e.target.style.transform = "scale(1.04)"; e.target.style.filter = "brightness(1.2)"; }}
          onMouseLeave={e => { e.target.style.transform = "none"; e.target.style.filter = "none"; }}>
          ◈ ARCHIVES &amp; SHOP
        </button>
        <div style={{ marginTop: 30, fontSize: 10, color: "#3f3f5e", letterSpacing: 2 }}>
          WASD · AIM &amp; SHOOT AUTO · 1-4 / Q-E-R-F SKILLS
        </div>
      </div>
    </div>
  );

  // ── SHOP ──────────────────────────────────────────────────────
  const ShopScreen = () => (
    <div style={S.ovr}>
      <div style={{ ...S.panel, maxHeight: "90vh", overflowY: "auto" }} className="vfadeIn">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ color: "#c084fc", fontSize: 26, letterSpacing: 4, textShadow: "0 0 18px #a855f7", margin: 0 }}>◈ VOID ARCHIVES</h2>
          <div style={{ color: "#22d3ee", fontSize: 22, fontWeight: "bold" }}>💎 {meta.shards}</div>
        </div>

        <div style={{ color: "#7c3aed", fontSize: 10, letterSpacing: 3, borderBottom: "1px solid #1e1e3a", paddingBottom: 8, marginBottom: 18 }}>PERMANENT UPGRADES</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 30 }}>
          {UPGRADES.map(u => {
            const cur = meta.upgrades[u.id] || 0, maxed = cur >= u.max, canBuy = !maxed && meta.shards >= u.cost;
            return (
              <div key={u.id} onClick={() => canBuy && buyUpgrade(u)} style={{
                background: "rgba(6,4,24,0.8)", padding: "16px 18px", borderRadius: 12,
                border: `1px solid ${canBuy ? u.col + "44" : "#1e1e3a"}`,
                cursor: canBuy ? "pointer" : "default", opacity: maxed ? 0.55 : 1,
                transition: "all 0.16s",
              }}
                onMouseEnter={e => { if (canBuy) e.currentTarget.style.borderColor = u.col; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = canBuy ? u.col + "44" : "#1e1e3a"; }}>
                <div style={{ color: u.col, fontWeight: "bold", fontSize: 13 }}>
                  {u.name}
                  <span style={{ float: "right", fontSize: 11, color: "#4a3060" }}>{cur}/{u.max}</span>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 7, lineHeight: 1.5 }}>{u.desc}</div>
                <div style={{ fontSize: 12, fontWeight: "bold", marginTop: 9, color: maxed ? "#fb923c" : canBuy ? "#4ade80" : "#ef4444" }}>
                  {maxed ? "✓ MAXED" : `💎 ${u.cost}`}
                </div>
                <div style={{ width: "100%", height: 3, background: "#1e1e3a", borderRadius: 2, marginTop: 10 }}>
                  <div style={{ width: (cur / u.max * 100) + "%", height: "100%", background: u.col, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ color: "#06b6d4", fontSize: 10, letterSpacing: 3, borderBottom: "1px solid #1e1e3a", paddingBottom: 8, marginBottom: 18 }}>EXO-SUIT SKINS</div>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 12 }}>
          {SKINS.map(sk => {
            const owned = meta.skins.includes(sk.id), active = meta.activeSkin === sk.id, canBuy = !owned && meta.shards >= sk.cost;
            return (
              <div key={sk.id} onClick={() => (owned || canBuy) && buySkin(sk)} style={{
                flex: "0 0 120px", padding: "16px 12px", textAlign: "center",
                background: "rgba(6,4,24,0.8)", borderRadius: 12,
                border: `2px solid ${active ? sk.col : "#1e1e3a"}`,
                cursor: owned || canBuy ? "pointer" : "default",
                boxShadow: active ? `0 0 24px ${sk.col}55` : "none",
                transition: "all 0.18s",
              }}
                onMouseEnter={e => { if (owned || canBuy) e.currentTarget.style.borderColor = sk.col; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = active ? sk.col : "#1e1e3a"; }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: sk.col, margin: "0 auto 12px", boxShadow: `0 0 16px ${sk.col}` }} />
                <div style={{ fontSize: 13, color: sk.col, fontWeight: "bold" }}>{sk.name}</div>
                <div style={{ fontSize: 11, marginTop: 8, color: owned ? (active ? "#34d399" : "#9ca3af") : (canBuy ? "#22d3ee" : "#ef4444"), fontWeight: "bold" }}>
                  {owned ? (active ? "EQUIPPED" : "USE") : `💎 ${sk.cost}`}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={S.btn("#4b5563")} onClick={() => setScreen("menu")}
            onMouseEnter={e => { e.target.style.filter = "brightness(1.3)"; }}
            onMouseLeave={e => { e.target.style.filter = "none"; }}>
            ← BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );

  // ── LEVEL UP ──────────────────────────────────────────────────
  const LevelUpScreen = () => (
    <div style={S.ovr}>
      <div style={S.panel}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 style={{ color: "#c084fc", fontSize: 40, letterSpacing: 5, textShadow: "0 0 30px #a855f7", margin: "0 0 8px" }}>EVOLUTION READY</h2>
          <div style={{ color: "#22d3ee", fontSize: 11, letterSpacing: 4 }}>CHOOSE YOUR AUGMENTATION</div>
        </div>
        <div style={{ display: "flex", gap: 22, justifyContent: "center", flexWrap: "wrap" }}>
          {lvlChoices.map(id => {
            const s = SKILLS[id];
            return (
              <div key={id} onClick={() => pickSkill(id)} style={{
                width: 200, padding: "26px 20px", textAlign: "center",
                background: "rgba(4,2,20,0.97)", border: `2px solid ${s.col}`,
                borderRadius: 16, cursor: "pointer",
                boxShadow: `0 0 30px ${s.col}22`,
                transition: "all 0.18s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.04)"; e.currentTarget.style.boxShadow = `0 0 50px ${s.col}44`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 0 30px ${s.col}22`; }}>
                <div style={{ color: s.col, fontSize: 19, fontWeight: "bold", textShadow: `0 0 12px ${s.col}`, marginBottom: 8 }}>{s.name}</div>
                <div style={{
                  fontSize: 9, letterSpacing: 3, marginBottom: 14, padding: "3px 10px",
                  borderRadius: 20, display: "inline-block",
                  color: s.type === "active" ? "#22d3ee" : "#fb923c",
                  border: `1px solid ${s.type === "active" ? "#22d3ee33" : "#fb923c33"}`,
                  background: s.type === "active" ? "#22d3ee0a" : "#fb923c0a",
                }}>{s.type.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── REVIVE ────────────────────────────────────────────────────
  const ReviveScreen = () => (
    <div style={{ ...S.ovr, background: "rgba(30,0,0,0.93)" }}>
      <div style={{ ...S.panel, textAlign: "center", borderColor: "rgba(239,68,68,0.5)" }}>
        <h2 style={{ color: "#f87171", fontSize: 50, letterSpacing: 5, textShadow: "0 0 45px #ef4444", margin: "0 0 16px" }}>SYSTEM FAILURE</h2>
        <div style={{ color: "#fca5a5", fontSize: 16, marginBottom: 8 }}>
          WAVE <span style={{ color: "#fff", fontWeight: "bold" }}>{gsRef.current?.wave || 0}</span> · {" "}
          <span style={{ color: "#fff", fontWeight: "bold" }}>{gsRef.current?.totalKills || 0}</span> KILLS
        </div>
        <div style={{ color: "#f87171", fontSize: 14, marginBottom: 40, letterSpacing: 2 }}>
          PHOENIX PROTOCOL AVAILABLE: <span style={{ color: "#34d399", fontWeight: "bold" }}>{gsRef.current?.p?.revives || 0}</span>
        </div>
        <div style={{ display: "flex", gap: 22, justifyContent: "center" }}>
          <button style={S.btn("#34d399")} onClick={doRevive}
            onMouseEnter={e => { e.target.style.transform = "scale(1.05)"; }}
            onMouseLeave={e => { e.target.style.transform = "none"; }}>
            ⇧ INITIATE REVIVE
          </button>
          <button style={S.btn("#4b5563")} onClick={doDeath}
            onMouseEnter={e => { e.target.style.transform = "scale(1.05)"; }}
            onMouseLeave={e => { e.target.style.transform = "none"; }}>
            ✕ ACCEPT FATE
          </button>
        </div>
      </div>
    </div>
  );

  // ── DEAD ──────────────────────────────────────────────────────
  const DeadScreen = () => {
    const gs = gsRef.current;
    const shards = gs?.p?.shards || 0;
    return (
      <div style={S.ovr}>
        <div style={{ ...S.panel, textAlign: "center" }}>
          <h1 style={{ color: "#ef4444", fontSize: 68, textShadow: "0 0 45px #dc2626", margin: "0 0 28px", letterSpacing: 12, fontWeight: 900 }}>COLLAPSED</h1>
          <div style={{
            display: "inline-flex", flexDirection: "column", gap: 12,
            padding: "22px 40px", background: "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.22)", borderRadius: 14, marginBottom: 30,
          }}>
            <div style={{ fontSize: 18, color: "#fca5a5" }}>WAVE REACHED: <span style={{ color: "#fff", fontWeight: "bold" }}>{gs?.wave || 0}</span></div>
            <div style={{ fontSize: 16, color: "#9ca3af" }}>ENEMIES SLAIN: <span style={{ color: "#fff", fontWeight: "bold" }}>{gs?.totalKills || 0}</span></div>
            <div style={{ fontSize: 28, color: "#22d3ee", fontWeight: "bold", textShadow: "0 0 18px #06b6d4" }}>+{shards} 💎 BANKED</div>
          </div>
          <div style={{ marginBottom: 10, fontSize: 11, color: "#4a3060", letterSpacing: 2 }}>BEST WAVE: {meta.highWave} · TOTAL 💎 {meta.shards + shards}</div>
          <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
            {[
              { label: "↺ RETRY RUN", col: "#a855f7", fn: () => startGame(gameMode.current) },
              { label: "◈ ARCHIVES", col: "#22d3ee", fn: () => setScreen("shop") },
              { label: "⌂ MAIN MENU", col: "#4b5563", fn: () => setScreen("menu") },
            ].map(b => (
              <button key={b.label} style={S.btn(b.col)} onClick={b.fn}
                onMouseEnter={e => { e.target.style.transform = "scale(1.05) translateY(-2px)"; e.target.style.filter = "brightness(1.2)"; }}
                onMouseLeave={e => { e.target.style.transform = "none"; e.target.style.filter = "none"; }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── TOAST SYSTEM ──────────────────────────────────────────────
  const Toasts = () => (
    <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 200, pointerEvents: "none", display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: "rgba(3,2,18,0.96)", border: `1px solid ${t.col}55`,
          borderRadius: 8, padding: "10px 22px", fontSize: 12,
          color: t.col, letterSpacing: 2, textAlign: "center",
          boxShadow: `0 0 16px ${t.col}22`,
          animation: "vfadeIn 0.28s ease both",
        }}>{t.msg}</div>
      ))}
    </div>
  );

  // ── CANVAS SIZE ───────────────────────────────────────────────
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setCanvasSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── RENDER ────────────────────────────────────────────────────
  const isPlaying = screen === "playing" || screen === "levelup" || screen === "revive";

  return (
    <div style={S.root} tabIndex={0} onKeyDown={onKeyDown} onKeyUp={onKeyUp} onContextMenu={e => e.preventDefault()}>
      {/* Always-present canvas */}
      <div style={{ position: "absolute", inset: 0, display: isPlaying ? "block" : "none" }} onMouseMove={onMouseMove}>
        <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h} style={S.canvas} />
        {screen === "playing" && <HUD ui={uiSnap} />}
        {screen === "levelup" && <><HUD ui={uiSnap} /><LevelUpScreen /></>}
        {screen === "revive" && <><HUD ui={uiSnap} /><ReviveScreen /></>}
      </div>

      {/* Screens */}
      {screen === "menu" && <MenuScreen />}
      {screen === "shop" && <ShopScreen />}
      {screen === "dead" && <DeadScreen />}

      {/* Toasts */}
      <Toasts />

      {/* Crosshair — only while playing */}
      {screen === "playing" && (
        <div style={{
          position: "fixed", pointerEvents: "none", zIndex: 300,
          left: mouse.current.x, top: mouse.current.y,
          transform: "translate(-50%,-50%)",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24">
            <line x1="12" y1="2" x2="12" y2="22" stroke="rgba(6,182,212,0.7)" strokeWidth="1.5" />
            <line x1="2" y1="12" x2="22" y2="12" stroke="rgba(6,182,212,0.7)" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3" fill="none" stroke="rgba(6,182,212,0.5)" strokeWidth="1" />
          </svg>
        </div>
      )}
    </div>
  );
}