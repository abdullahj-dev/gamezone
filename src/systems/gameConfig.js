/**
 * gameConfig.js
 * Single source of truth for all game modes.
 * Import getGameConfig(mode) everywhere.
 */

// ── Per-mode config objects ───────────────────────────────────────────────────
const CONFIGS = {

  normal: {
    id: "normal",
    label: "Normal",
    theme: { bg: ["#03020c", "#0d001a"], wall: "#4a148c", accent: "#00e5ff" },

    // Enemy caps — enforced at spawn time
    maxEnemies:        10,   // hard cap on active non-boss enemies
    minEnemiesForWave: 4,    // new wave only spawns when active < this
    waveDelay:         180,  // frames between wave checks

    // Boss rotation — list in intended reveal order; never repeats consecutively
    bossPool: ["dungeonLord", "lichKing", "shadowDrake", "voidOverlord", "ancientTitan"],

    // Scaling — logarithmic so late rooms don't become impossible
    enemyScaleFn: (room) => 1 + Math.log1p(room - 1) * 0.35,
    roomCountFn:  (room) => Math.min(3 + Math.floor(Math.log1p(room) * 2.2), 12),

    // Revive — Normal (formerly Depths): spend shards, then pick 2 skills from 4 options
    revive: {
      type: "shard_skills",
      baseCost: 50,           // shards; scales: baseCost + room * 3
      costPerRoom: 3,
      skillChoices: 4,        // shown
      skillPicks: 2,          // player picks this many
      hpRestorePct: 0.6,      // restore 60 % max HP
      maxRevivesPerRun: 3,
    },

    // Progression
    xpNeededBase: 55,
    xpNeededGrowth: 1.52,
    bossRoomInterval: 5,      // every 5th room is a boss room
  },

  void: {
    id: "void",
    label: "Void",
    theme: { bg: ["#000814", "#001233"], wall: "#023e8a", accent: "#7c4dff" },

    maxEnemies:        8,
    minEnemiesForWave: 3,
    waveDelay:         220,

    bossPool: ["voidOverlord", "lichKing", "ancientTitan", "dungeonLord", "shadowDrake"],

    enemyScaleFn: (room) => 1 + Math.log1p(room - 1) * 0.40,
    roomCountFn:  (room) => Math.min(2 + Math.floor(Math.log1p(room) * 1.8), 10),

    // Revive — Void: automatic full restore when player kills a boss (one per boss kill)
    revive: {
      type: "boss_tribute",
      hpRestorePct: 1.0,
      skillRefund: false,     // no skill changes on revive
      maxRevivesPerRun: 5,    // one per boss, tracked separately
    },

    xpNeededBase: 60,
    xpNeededGrowth: 1.55,
    bossRoomInterval: 5,
  },

  nightmare: {
    id: "nightmare",
    label: "Nightmare",
    theme: { bg: ["#0a0a0a", "#1a001a"], wall: "#1a0030", accent: "#ff4081" },

    maxEnemies:        9,
    minEnemiesForWave: 3,
    waveDelay:         200,

    bossPool: ["shadowDrake", "dungeonLord", "voidOverlord", "lichKing", "ancientTitan"],

    enemyScaleFn: (room) => 1 + Math.log1p(room - 1) * 0.38,
    // Nightmare rooms are smaller waves, but enemies are tankier
    roomCountFn:  (room) => Math.min(2 + Math.floor(Math.log1p(room) * 1.6), 9),

    // Revive — Nightmare (formerly Shadow): "Fade" mechanic — player goes invisible for 4s, regains 40% HP
    // (Note: Currently disabled globally in canRevive() for true Nightmare difficulty, but kept for structural purity)
    revive: {
      type: "fade",
      hpRestorePct: 0.40,
      invisDuration: 240,     // frames of immunity/invisibility
      loseWeakestSkill: true, // strip the first equipped skill
      maxRevivesPerRun: 2,
    },

    // Shadow enemies have a "melt immunity" window when spawned
    meltImmunityFrames: 120, // newly spawned enemies can't be melted for 2s

    xpNeededBase: 50,
    xpNeededGrowth: 1.48,
    bossRoomInterval: 5,
  },
};

export function getGameConfig(mode) {
  const cfg = CONFIGS[mode];
  if (!cfg) {
    console.warn(`[GameConfig] Unknown mode: "${mode}". Falling back to normal.`);
    return CONFIGS["normal"];
  }
  return cfg;
}

/** Compute shard cost for a Normal revive */
export function depthsReviveCost(cfg, room) {
  return cfg.revive.baseCost + room * cfg.revive.costPerRoom;
}