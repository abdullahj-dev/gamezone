/**
 * reviveSystem.js
 * Three distinct revive mechanics, pure and driven by gs.mode.
 * Called from the death handler inside useGameLoop / useGameState.
 *
 * Usage:
 * import { canRevive, executeRevive, getReviveUI } from "./reviveSystem.js";
 *
 * // In your death handler:
 * if (canRevive(gs)) {
 * showReviveScreen(getReviveUI(gs));
 * }
 * // When player confirms:
 * executeRevive(gs, options);
 */

import { getGameConfig, depthsReviveCost } from "../systems/gameConfig.js";
import { getSkillDef } from "../data/skills.js";
import { rand, randInt, clamp } from "../utils/math.js";
import { W, H, TILE } from "../utils/constants.js";

// ── Can the player revive right now? ─────────────────────────────────────────
export function canRevive(gs) {
  const cfg = getGameConfig(gs.mode);
  const p   = gs.player;

  if (gs.mode === "nightmare") return false; // never in nightmare mode
  if ((gs.revivesUsed || 0) >= cfg.revive.maxRevivesPerRun) return false;

  switch (cfg.revive.type) {
    case "shard_skills":
      return (p.shards || 0) >= depthsReviveCost(cfg, gs.room);

    case "boss_tribute":
      // Void: revive available only if a boss was killed and stored a tribute
      return (gs.bossKillRevives || 0) > 0;

    case "fade":
      return true; // Shadow always allows fade if revives remain
  }
  return false;
}

// ── Get UI data for the revive screen ────────────────────────────────────────
export function getReviveUI(gs) {
  const cfg = getGameConfig(gs.mode);
  const p   = gs.player;

  switch (cfg.revive.type) {

    case "shard_skills": {
      const cost = depthsReviveCost(cfg, gs.room);
      // Pick 4 random skills for the player to choose from
      const allSkills = getAllSkillIds().filter(id => !p.unlockedSkills.includes(id));
      const pool      = shuffle(allSkills).slice(0, cfg.revive.skillChoices);
      return {
        type:         "shard_skills",
        cost,
        shards:       p.shards || 0,
        canAfford:    (p.shards || 0) >= cost,
        skillChoices: pool,
        pickCount:    cfg.revive.skillPicks,
        hpRestore:    Math.floor(p.maxHp * cfg.revive.hpRestorePct),
        label:        "Shard Revive",
        description:  `Spend ${cost}💎 to return. Choose ${cfg.revive.skillPicks} skills.`,
      };
    }

    case "boss_tribute":
      return {
        type:         "boss_tribute",
        tributes:     gs.bossKillRevives || 0,
        hpRestore:    p.maxHp, // full restore
        label:        "Boss Tribute",
        description:  "A fallen boss's power flows back into you. Full restore.",
      };

    case "fade":
      return {
        type:           "fade",
        hpRestore:      Math.floor(p.maxHp * cfg.revive.hpRestorePct),
        invisDuration:  cfg.revive.invisDuration,
        loseSkill:      cfg.revive.loseWeakestSkill ? p.equippedSkills[0] : null,
        label:          "Fade",
        description:    "Slip into shadow. Regain 40% HP. Lose your weakest skill.",
      };
  }
}

// ── Execute the revive ────────────────────────────────────────────────────────
export function executeRevive(gs, options = {}) {
  const cfg = getGameConfig(gs.mode);
  const p   = gs.player;

  gs.revivesUsed = (gs.revivesUsed || 0) + 1;

  switch (cfg.revive.type) {

    case "shard_skills": {
      const cost = depthsReviveCost(cfg, gs.room);
      p.shards   = Math.max(0, (p.shards || 0) - cost);
      p.hp       = Math.floor(p.maxHp * cfg.revive.hpRestorePct);
      p.invuln   = 180; // 3s of grace

      // Grant the chosen skills
      const chosen = (options.chosenSkillIds || []).slice(0, cfg.revive.skillPicks);
      for (const id of chosen) {
        if (!p.unlockedSkills.includes(id)) p.unlockedSkills.push(id);
        const def = getSkillDef(id);
        if (def?.type === "active" && p.equippedSkills.length < 3) {
          p.equippedSkills.push(id);
        }
      }

      // Teleport player to safe spawn zone
      _teleportToSafe(gs, p);
      break;
    }

    case "boss_tribute": {
      gs.bossKillRevives = Math.max(0, (gs.bossKillRevives || 0) - 1);
      p.hp     = p.maxHp;
      p.invuln = 240; // 4s of invulnerability

      // Clear all projectiles — reset the fight
      gs.projectiles = [];
      _teleportToSafe(gs, p);

      // Visual fanfare
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        gs.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, color: "#7c4dff", r: 5, life: 40 });
      }
      break;
    }

    case "fade": {
      // Lose first equipped skill if configured
      if (cfg.revive.loseWeakestSkill && p.equippedSkills.length > 0) {
        const lost = p.equippedSkills.shift();
        gs.floatingTexts?.push({ x: p.x, y: p.y - 40, text: `Lost: ${lost}`, color: "#ff4081", life: 80, big: true });
      }

      p.hp         = Math.floor(p.maxHp * cfg.revive.hpRestorePct);
      gs.fadeActive = cfg.revive.invisDuration; // handled in combatEngine timer
      p.invuln     = cfg.revive.invisDuration;

      _teleportToSafe(gs, p);

      // Shadow visual — dark burst
      for (let i = 0; i < 32; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = rand(2, 6);
        gs.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color: "#ff4081", r: rand(2, 5), life: randInt(20, 45) });
      }
      break;
    }
  }
}

// ── Called when a Void boss dies ──────────────────────────────────────────────
/**
 * Registers a revive credit. The UI will offer the revive immediately if the
 * player's HP is already 0, or bank it for later use.
 */
export function onVoidBossKill(gs) {
  gs.bossKillRevives = Math.min(
    (gs.bossKillRevives || 0) + 1,
    getGameConfig(gs.mode).revive.maxRevivesPerRun
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _teleportToSafe(gs, p) {
  // Left quarter of the arena — far from most enemies
  p.x = clamp(rand(TILE + p.r + 10, W * 0.25), TILE + p.r, W - p.r - TILE);
  p.y = clamp(rand(TILE + p.r + 10, H - p.r - TILE), TILE + p.r, H - p.r - TILE);
}

function getAllSkillIds() {
  // Returns all skill IDs — adjust to match your skills.js
  return [
    "fireball","frostBolt","iceShield","dash","chainLightning",
    "timeWarp","nova","flameVortex","voidStep","blizzard",
    "vitality","sharpen","ironSkin","swiftness","critStrike",
    "lifesteal","executioner","berserker","thornmail","ironWill","vampiricEdge",
  ];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}