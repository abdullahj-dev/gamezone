/**
 * enemies.js  (refactored)
 * Enemy definitions for all three games.
 *
 * Shadow enemies receive higher base HP and meltImmune on spawn.
 * Boss pool rebalanced — later bosses have proportionally more HP,
 * not just flat stat dumps.
 *
 * mkEnemy(type, x, y, scaleFactor, gameId)
 *   gameId: optional — if "shadow", applies shadow modifiers.
 */

import { randInt } from "../utils/math.js";

// aiType: melee | archer | mage | healer | berserker | shade | summoner | necro | charger | voidshade
export const ENEMY_DEFS = {
  slime:       { name:"Slime",          hp:36,  atk:5,  def:0,  spd:0.8,  xp:10,  col:"#43a047", r:12, aiType:"melee",     aggroR:180, atkRate:68, splits:true },
  goblin:      { name:"Goblin",         hp:48,  atk:9,  def:1,  spd:1.7,  xp:18,  col:"#ff8f00", r:13, aiType:"berserker", aggroR:220, atkRate:52 },
  archer:      { name:"Skeleton Archer",hp:44,  atk:12, def:0,  spd:1.1,  xp:24,  col:"#b0bec5", r:13, aiType:"archer",    aggroR:280, shootRate:95, keepDist:160 },
  orc:         { name:"Orc Charger",    hp:105, atk:18, def:3,  spd:0.7,  xp:40,  col:"#c62828", r:19, aiType:"charger",   aggroR:200, chargeSpd:5.2, chargeCd:200 },
  shadowMage:  { name:"Shadow Mage",    hp:60,  atk:16, def:1,  spd:0.85, xp:45,  col:"#7b1fa2", r:13, aiType:"mage",      aggroR:260, shootRate:110, teleportCd:240 },
  healer:      { name:"Mystic Healer",  hp:42,  atk:4,  def:0,  spd:1.3,  xp:35,  col:"#00897b", r:12, aiType:"healer",    aggroR:250, healRate:180, healAmt:18 },
  vampire:     { name:"Vampire",        hp:82,  atk:14, def:2,  spd:1.45, xp:52,  col:"#880e4f", r:14, aiType:"melee",     aggroR:230, atkRate:45, lifesteal:0.45 },
  golem:       { name:"Stone Golem",    hp:220, atk:22, def:8,  spd:0.45, xp:75,  col:"#607d8b", r:23, aiType:"charger",   aggroR:180, chargeSpd:1.8, chargeCd:300, slamAoe:true },
  shade:       { name:"Shadow Shade",   hp:62,  atk:20, def:2,  spd:1.2,  xp:55,  col:"#1a237e", r:13, aiType:"shade",     aggroR:200, invisDur:170, visDur:80 },
  summoner:    { name:"Imp Summoner",   hp:65,  atk:7,  def:0,  spd:0.6,  xp:60,  col:"#6a1b9a", r:14, aiType:"summoner",  aggroR:260, summonRate:400, summonType:"goblin" },
  necromancer: { name:"Necromancer",    hp:72,  atk:8,  def:1,  spd:0.65, xp:70,  col:"#4a148c", r:15, aiType:"necro",     aggroR:300, reviveRate:440 },
  voidShade:   { name:"Void Shade",     hp:55,  atk:18, def:2,  spd:0,    xp:65,  col:"#311b92", r:13, aiType:"voidshade", aggroR:310, teleportRate:160, shootOnAppear:true },
};

export const BOSS_DEFS = {
  dungeonLord: {
    name:"Dungeon Lord", hp:480,  atk:22, def:4,  spd:1.2,  xp:250,  col:"#b71c1c", r:30, boss:true,
    aiType:"boss_dungeon", phases:[{hpPct:0.5, msg:"ENRAGED!"}],
    chargeSpd:5.5, chargeCd:180, shieldHp:100, bulletSpread:3,
  },
  lichKing: {
    name:"Lich King",   hp:680,  atk:19, def:3,  spd:0.9,  xp:380,  col:"#4a148c", r:32, boss:true,
    aiType:"boss_lich", phases:[{hpPct:0.6, msg:"PHASE 2"},{hpPct:0.3, msg:"FINAL FORM"}],
    spiralCount:12, spiralRate:18, deathOrbCount:4, summonType:"archer",
  },
  shadowDrake: {
    name:"Shadow Drake", hp:900, atk:26, def:5,  spd:1.1,  xp:520,  col:"#1a237e", r:34, boss:true,
    aiType:"boss_drake", phases:[{hpPct:0.5, msg:"DRAKE UNLEASHED"}],
    wingFanCount:7, earthquakeCd:400, spawnType:"goblin", spawnCount:3,
  },
  voidOverlord: {
    name:"Void Overlord", hp:1150, atk:28, def:6, spd:0.0, xp:700,  col:"#311b92", r:36, boss:true,
    aiType:"boss_void", phases:[{hpPct:0.65, msg:"VOID RUPTURE"},{hpPct:0.3, msg:"DIMENSION BREAK"}],
    teleportRate:240, ringCount:8, spreadCount:4, portalCount:2,
  },
  ancientTitan: {
    name:"Ancient Titan", hp:1700, atk:36, def:11, spd:0.55, xp:1000, col:"#37474f", r:42, boss:true,
    aiType:"boss_titan", phases:[{hpPct:0.7, msg:"ARMOR BROKEN"},{hpPct:0.35, msg:"BERSERKER"}],
    stompRings:4, shockwaveSpd:3.5, armorHp:280, earthquakeCd:320,
  },
};

// Spawn tables [type, weight] per tier (0–7)
export const SPAWN_TABLES = [
  [["slime",4],["goblin",2]],
  [["slime",2],["goblin",4],["archer",2]],
  [["goblin",2],["archer",3],["orc",2],["shadowMage",1]],
  [["archer",2],["orc",3],["shadowMage",2],["healer",1],["vampire",1]],
  [["orc",2],["shadowMage",2],["healer",2],["vampire",2],["golem",1]],
  [["shadowMage",2],["healer",2],["vampire",2],["shade",2],["summoner",1]],
  [["vampire",2],["golem",1],["shade",2],["summoner",2],["necromancer",1],["voidShade",1]],
  [["shade",2],["summoner",2],["necromancer",2],["voidShade",2],["golem",1]],
];

/**
 * Create an enemy instance.
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @param {number} scaleFactor  — use cfg.enemyScaleFn(room) from gameConfig
 * @param {string} [gameId]     — "shadow" enables melt immunity + higher HP
 */
export function mkEnemy(type, x, y, scaleFactor = 1, gameId = "depths") {
  const d = BOSS_DEFS[type] || ENEMY_DEFS[type];
  if (!d) return null;

  // Shadow: enemies are tankier to survive the melt DoT
  const hpMult = gameId === "shadow" ? 1.35 : 1;

  const e = {
    id:    Math.random() + Date.now(),
    type, x, y,
    hp:    d.hp * scaleFactor * hpMult,
    maxHp: d.hp * scaleFactor * hpMult,
    atk:   d.atk * scaleFactor,
    def:   d.def || 0,
    spd:   d.spd,
    r:     d.r,
    xp:    d.xp,
    col:   d.col,
    name:  d.name,
    boss:  d.boss || false,
    aiType:     d.aiType,
    aggroRange: d.aggroR || 200,

    // AI state
    state: "idle", stateTimer: 0, aiTimer: 0,
    charging: false, chargeVx: 0, chargeVy: 0,
    chargeCd: d.chargeCd || 0,
    chargeSpd: d.chargeSpd || 0,

    // Ranged
    shootCd:   randInt(0, 60),
    shootRate: d.shootRate || 90,
    keepDist:  d.keepDist || 0,
    teleportCd:   d.teleportCd || 0,
    teleportRate: d.teleportRate || 0,

    // Healer
    healRate: d.healRate || 0,
    healCd:   randInt(0, 60),
    healAmt:  d.healAmt || 0,

    // Summoner/necro
    summonRate: d.summonRate || 0,
    summonCd:   randInt(0, 80),
    summonType: d.summonType || "",
    reviveRate: d.reviveRate || 0,
    reviveCd:   randInt(0, 100),

    // Shade invisibility
    invisDur:   d.invisDur || 0,
    visDur:     d.visDur || 0,
    invisible:  d.aiType === "shade",
    invisTimer: d.invisDur || 0,

    // Void shade
    shootOnAppear: d.shootOnAppear || false,

    // Special flags
    lifesteal: d.lifesteal || 0,
    splits:    d.splits || false,
    slamAoe:   d.slamAoe || false,

    // Boss phase tracking
    phase: 1, phaseChanged: false, phases: d.phases || [],
    shieldHp: d.shieldHp || 0, shieldMaxHp: d.shieldHp || 0,
    spiralAngle: 0,
    spiralCount: d.spiralCount || 0,
    spiralRate:  d.spiralRate || 0,
    spiralCd: 0,
    deathOrbCount: d.deathOrbCount || 0,
    wingFanCount:  d.wingFanCount || 0,
    earthquakeCd:  d.earthquakeCd || 0,
    earthquakeTimer: d.earthquakeCd || 0,
    spawnType:  d.spawnType || "",
    spawnCount: d.spawnCount || 0,
    spawnDone:  false,
    ringCount:  d.ringCount || 0,
    spreadCount: d.spreadCount || 0,
    portalCount: d.portalCount || 0,
    stompRings: d.stompRings || 0,
    stompCd:    140,
    armorHp:    d.armorHp || 0,
    armorMaxHp: d.armorHp || 0,
    armored:    d.armorHp > 0,

    // Visual
    hurtFlash: 0,
    glowPulse: 0,

    // Status effects
    slowed:  0,
    stunned: 0,
    frozen:  0,

    // Shadow: melt DoT
    meltStacks: 0,
    // New enemies are immune to melt for 2 seconds (120 frames)
    // Prevents freshly-spawned enemies from being instantly dissolved
    meltImmune: gameId === "shadow" ? 120 : 0,

    lastKnownPlayerPos: null,
  };

  return e;
}