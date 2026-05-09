// ── Enemy definitions ─────────────────────────────────────────────────────────
export const VOID_ENEMIES = {
  drifter:  { name:"Drifter",       hp:35,  atk:7,  spd:1.2,  r:13, col:"#7b68ee", xp:8,  aiType:"melee",   atkRate:55 },
  lancer:   { name:"Lancer",        hp:50,  atk:12, spd:0.9,  r:14, col:"#00cfff", xp:15, aiType:"charger", chargeSpd:5.8, chargeCd:160 },
  phantom:  { name:"Phantom",       hp:40,  atk:10, spd:0,    r:12, col:"#cc66ff", xp:18, aiType:"blinker", blinkRate:130, shootRate:70 },
  brute:    { name:"Brute",         hp:130, atk:18, spd:0.65, r:21, col:"#4488ff", xp:30, aiType:"melee",   atkRate:70 },
  weaver:   { name:"Weaver",        hp:45,  atk:6,  spd:0.8,  r:13, col:"#ff44cc", xp:25, aiType:"weaver",  riftRate:280 },
  specter:  { name:"Specter",       hp:55,  atk:14, spd:1.3,  r:13, col:"#334466", xp:22, aiType:"specter", visDur:60, invisDur:180 },
  leech:    { name:"Rift Leech",    hp:60,  atk:8,  spd:1.0,  r:14, col:"#ff6644", xp:20, aiType:"leech",   healRate:120 },
  colossus: { name:"Void Colossus", hp:600, atk:22, spd:0.7,  r:36, col:"#8855ff", xp:300, aiType:"boss_colossus", boss:true, phases:[{hpPct:0.5,msg:"PHASE 2 — RIFTS OPEN"}] },
  tyrant:   { name:"Rift Tyrant",   hp:900, atk:18, spd:0.55, r:38, col:"#00aaff", xp:500, aiType:"boss_tyrant",   boss:true, phases:[{hpPct:0.6,msg:"RIFT STORM"},{hpPct:0.3,msg:"DESPERATION"}] },
  phaseLord:{ name:"Phase Lord",    hp:750, atk:20, spd:0,    r:34, col:"#ff44aa", xp:420, aiType:"boss_phase",    boss:true, phases:[{hpPct:0.5,msg:"DIMENSIONAL BREAK"}] },
};

export function mkVoidEnemy(type, x, y, scaleFactor = 1) {
  const d = VOID_ENEMIES[type];
  if (!d) return null;
  return {
    id: Math.random() + Date.now(), type, x, y,
    hp: d.hp * scaleFactor, maxHp: d.hp * scaleFactor,
    atk: d.atk * scaleFactor, spd: d.spd, r: d.r, xp: d.xp,
    col: d.col, name: d.name, boss: d.boss || false,
    aiType: d.aiType,
    atkCd: 0, atkRate: d.atkRate || 60,
    hurtFlash: 0, stunned: 0, slowed: 0, hitCd: 0,
    charging: false, chargeVx: 0, chargeVy: 0,
    chargeCd: d.chargeCd || 0, chargeSpd: d.chargeSpd || 4,
    blinkCd: d.blinkRate || 130, shootCd: d.shootRate || 80,
    riftCd: d.riftRate || 280,
    healCd: d.healRate || 120,
    invisible: d.aiType === "specter",
    invisTimer: d.invisDur || 180, visDur: d.visDur || 60, invisDur: d.invisDur || 180,
    phase: 1, phases: d.phases || [], spiralAngle: 0,
    _shootCd: 0, _chargeCd: 0, _riftCd: 0, _blink: 0,
  };
}

// ── Wave composition ──────────────────────────────────────────────────────────
// Enemy counts are kept LOW — the challenge comes from staggered timing + rifts,
// not a screen full of 20 enemies at once.
export function getWaveComposition(wave, mode = "dungeon") {
  if (wave % 5 === 0) return getBossWave(wave, mode);

  const nightmareMult = mode === "nightmare" ? 1.4 : 1;
  const tier  = Math.min(Math.floor((wave - 1) / 3), 5);
  const sf    = (1 + Math.floor((wave - 1) / 5) * 0.22) * (mode === "nightmare" ? 1.5 : 1);

  // Base groups — intentionally small counts
  const tables = [
    // tier 0: waves 1–3
    [["drifter", 4]],
    // tier 1: waves 4–6
    [["drifter", 3], ["lancer", 2]],
    // tier 2: waves 7–9
    [["lancer", 2], ["phantom", 2], ["drifter", 2], ["brute", 1]],
    // tier 3: waves 10–12
    [["brute", 1], ["phantom", 3], ["lancer", 2], ["weaver", 1]],
    // tier 4: waves 13–15
    [["specter", 2], ["brute", 1], ["weaver", 1], ["phantom", 2], ["lancer", 2]],
    // tier 5+
    [["specter", 2], ["leech", 2], ["brute", 2], ["weaver", 1], ["phantom", 3]],
  ];

  const groups = tables[tier];
  // Add one extra unit every 5 waves after wave 10, max cap 12 total
  if (wave > 10) {
    const extraCount = Math.min(Math.floor((wave - 10) / 5), 3);
    groups.push(["drifter", extraCount]);
  }

  const totalEnemies = groups.reduce((s, [, c]) => s + c, 0);
  return { groups, scaleFactor: sf, totalEnemies };
}

function getBossWave(wave, mode) {
  const bossNum = wave / 5;
  const bosses  = ["colossus", "tyrant", "phaseLord", "colossus", "tyrant"];
  const boss    = bosses[(bossNum - 1) % bosses.length];
  const sf      = (1 + (bossNum - 1) * 0.35) * (mode === "nightmare" ? 1.6 : 1);
  return { groups: [[boss, 1]], scaleFactor: sf, totalEnemies: 1, isBoss: true };
}

// ── Skills ────────────────────────────────────────────────────────────────────
export const VOID_SKILLS = [
  { id:"voidBurst",   name:"💥 Void Burst",    type:"active",  cdFrames:200, col:"#8855ff", desc:"AoE pulse — 3× dmg in 130px radius." },
  { id:"phaseShift",  name:"⚡ Phase Shift",   type:"active",  cdFrames:110, col:"#00cfff", desc:"Blink to cursor. Brief invuln + burst on arrival." },
  { id:"singularity", name:"🌀 Singularity",   type:"active",  cdFrames:360, col:"#cc66ff", desc:"Pull all enemies toward you for 2s, then detonate." },
  { id:"voidRift",    name:"🌌 Void Rift",     type:"active",  cdFrames:480, col:"#44ffaa", desc:"Friendly rift that zaps nearby enemies for 5s." },
  { id:"overcharge",  name:"⚡ Overcharge",    type:"active",  cdFrames:300, col:"#ffdd00", desc:"2× fire rate + 50% dmg for 3s." },
  { id:"voidMine",    name:"💣 Void Mine",     type:"active",  cdFrames:180, col:"#ff6644", desc:"Drop a mine. Triggers on enemy proximity." },
  { id:"voidConduit", name:"🔋 Void Conduit",  type:"passive",               col:"#8855ff", desc:"Auto-fire rate +20%." },
  { id:"crystalline", name:"💎 Crystalline",   type:"passive",               col:"#00cfff", desc:"Take 20% less damage." },
  { id:"echoShot",    name:"🔊 Echo Shot",     type:"passive",               col:"#ffdd00", desc:"30% chance to fire a bonus projectile." },
  { id:"voidHeart",   name:"❤ Void Heart",    type:"passive", once:true,    col:"#ff5577", desc:"+80 Max HP, full restore." },
  { id:"darkMatter",  name:"⚙ Dark Matter",   type:"passive", once:true,    col:"#aabbcc", desc:"+10 Base damage permanently." },
  { id:"voidStride",  name:"🌀 Void Stride",   type:"passive", once:true,    col:"#80cbc4", desc:"+30% Move speed permanently." },
];

export const MAX_VOID_SKILLS = 3;

export function getVoidSkillDef(id) { return VOID_SKILLS.find(s => s.id === id); }

export function pickVoidLevelUpChoices(ownedIds, count = 3) {
  const owned = new Set(ownedIds);
  const pool  = VOID_SKILLS.filter(s => !owned.has(s.id) || (!s.once && s.type === "passive"));
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}