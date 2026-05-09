// Max 3 ACTIVE skills equipped. Passives unlimited.
export const SKILLS = [
  // ── Actives ────────────────────────────────────────────────────────────────
  {
    id:"fireball", name:"🔥 Fireball", type:"active", cdFrames:180,
    col:"#ff5722",
    desc:"Launch a piercing fireball (3× dmg). Hits all in path.",
  },
  {
    id:"frostBolt", name:"❄ Frost Bolt", type:"active", cdFrames:150,
    col:"#81d4fa",
    desc:"Slow target 60% for 3s and deal 2× dmg.",
  },
  {
    id:"iceShield", name:"🛡 Ice Shield", type:"active", cdFrames:600,
    col:"#29b6f6",
    desc:"Absorb 3 hits. Shield breaks under pressure — use wisely.",
  },
  {
    id:"dash", name:"⚡ Dash", type:"active", cdFrames:90,
    col:"#ffeb3b",
    desc:"120px dash. Brief invuln. Cannot dash into walls.",
  },
  {
    id:"chainLightning", name:"⛈ Chain Lightning", type:"active", cdFrames:280,
    col:"#ce93d8",
    desc:"Zap 5 nearest enemies for 2.5× dmg each.",
  },
  {
    id:"timeWarp", name:"⏰ Time Warp", type:"active", cdFrames:480,
    col:"#00bcd4",
    desc:"Slow ALL enemies 65% for 4s. Cannot be stacked.",
  },
  {
    id:"nova", name:"💥 Nova", type:"active", cdFrames:380,
    col:"#ff4081",
    desc:"120px blast after 1s charge (stand still). Cannot spam.",
  },
  {
    id:"flameVortex", name:"🌀 Flame Vortex", type:"active", cdFrames:440,
    col:"#ff6d00",
    desc:"Spinning fire wall around you for 4s. 1.5× tick dmg.",
  },
  {
    id:"voidStep", name:"🌑 Void Step", type:"active", cdFrames:220,
    col:"#7c4dff",
    desc:"Teleport toward mouse cursor. Appear with AoE burst.",
  },
  {
    id:"blizzard", name:"🌨 Blizzard", type:"active", cdFrames:500,
    col:"#b3e5fc",
    desc:"Ice zone in facing direction for 3s. Slows + dmg per tick.",
  },
  // ── Passives ───────────────────────────────────────────────────────────────
  {
    id:"lifesteal", name:"🩸 Lifesteal", type:"passive",
    col:"#e91e63",
    desc:"Heal 35% of all auto-attack damage dealt.",
  },
  {
    id:"berserker", name:"💀 Berserker Rage", type:"passive",
    col:"#ff7043",
    desc:"Below 40% HP: 2× attack speed and +5 damage.",
  },
  {
    id:"thornmail", name:"⚙ Thornmail", type:"passive",
    col:"#78909c",
    desc:"Reflect 35% of incoming damage to attacker.",
  },
  {
    id:"vampiricEdge", name:"🦇 Vampiric Edge", type:"passive",
    col:"#ad1457",
    desc:"Each kill restores 18 HP.",
  },
  {
    id:"ironWill", name:"🔩 Iron Will", type:"passive",
    col:"#90a4ae",
    desc:"Permanently reduce all incoming damage by 20%.",
  },
  {
    id:"executioner", name:"⚔ Executioner", type:"passive",
    col:"#ef5350",
    desc:"+60% damage to enemies below 25% HP.",
  },
  {
    id:"critStrike", name:"🎯 Critical Strike", type:"passive",
    col:"#ff8f00",
    desc:"25% chance for 2.5× damage on auto-attacks.",
  },
  // ── One-time stat upgrades ─────────────────────────────────────────────────
  {
    id:"vitality", name:"❤ Vitality", type:"passive", once:true,
    col:"#e53935",
    desc:"+80 Max HP and immediate full restore.",
  },
  {
    id:"sharpen", name:"⚔ Sharpen", type:"passive", once:true,
    col:"#ffd54f",
    desc:"+12 Attack power permanently.",
  },
  {
    id:"ironSkin", name:"🛡 Iron Skin", type:"passive", once:true,
    col:"#b0bec5",
    desc:"+7 Defense permanently (flat damage reduction).",
  },
  {
    id:"swiftness", name:"🌀 Swiftness", type:"passive", once:true,
    col:"#80cbc4",
    desc:"+30% Move speed permanently.",
  },
];

export function getSkillDef(id) { return SKILLS.find(s => s.id === id); }

export function pickLevelUpChoices(unlockedIds, count = 3) {
  const owned = new Set(unlockedIds);
  const pool  = SKILLS.filter(s => !owned.has(s.id) || (!s.once && s.type === "passive"));
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}