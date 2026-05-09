/**
 * gameHooks.js
 * Per-game hook objects passed into combatEngine.runCombat().
 *
 * Each game gets its own hooks object. Import the one you need:
 * import { depthsHooks } from "./gameHooks.js";
 * runCombat(gs, keys, mousePos, depthsHooks);
 *
 * Hooks are thin — business logic lives in combatEngine + reviveSystem.
 */

import { onVoidBossKill } from "../core/reviveSystem.js";
import { W, H } from "../utils/constants.js";
import { rand } from "../utils/math.js";

// ── Depths ────────────────────────────────────────────────────────────────────
export const depthsHooks = {
  onEnemyKill(gs, e) {
    // Depths: chance to drop a health orb (small visual reward)
    if (!e.boss && Math.random() < 0.12) {
      gs.healthOrbs = gs.healthOrbs || [];
      gs.healthOrbs.push({ x: e.x, y: e.y, life: 300, r: 8 });
    }
  },

  onBossKill(gs, e) {
    // Depths bosses don't grant revives — revive is shard-gated
    gs.floatingTexts.push({ x: W / 2, y: 60, text: "BOSS SLAIN — ROOM CLEARED", color: "#ffd700", life: 130, big: true });
  },

  onPlayerDeath(gs) {
    gs._playerDead(); // useGameState handles shard-revive check
  },
};

// ── Void ──────────────────────────────────────────────────────────────────────
export const voidHooks = {
  onEnemyKill(gs, e) {
    // Void: killing enemies charges the Rift meter
    gs.riftCharge = Math.min((gs.riftCharge || 0) + (e.boss ? 20 : 2), 100);
    if (gs.riftCharge >= 100) {
      gs.riftCharge = 0;
      // Full rift: brief speed boost for the player
      gs.player.invuln = Math.max(gs.player.invuln, 60);
      gs.floatingTexts.push({ x: gs.player.x, y: gs.player.y - 40, text: "VOID RIFT!", color: "#7c4dff", life: 60, big: true });
    }
  },

  onBossKill(gs, e) {
    // Void: boss kill banks a revive tribute
    onVoidBossKill(gs);
    gs.floatingTexts.push({ x: W / 2, y: 60, text: "TRIBUTE STORED — REVIVE READY", color: "#7c4dff", life: 130, big: true });
    gs._screenShake(20);

    // Full-screen void flash
    gs.voidFlash = 30;
  },

  onPlayerDeath(gs) {
    gs._playerDead(); // useGameState checks bossKillRevives for Void revive
  },
};

// ── Shadow ────────────────────────────────────────────────────────────────────
export const shadowHooks = {
  onEnemyKill(gs, e) {
    // Shadow: enemies leave a melt pool (visual only — damage handled by AoE DoT)
    // The "melt" mechanic means: on kill, nearby enemies get a melt DoT
    // But enemies have meltImmune on spawn so fresh enemies aren't instantly melted
    const meltRadius = 55;
    for (const ally of gs.enemies) {
      if (ally.meltImmune > 0) continue; // spawned too recently
      const dx = ally.x - e.x, dy = ally.y - e.y;
      if (dx * dx + dy * dy < meltRadius * meltRadius) {
        // Apply a weak DoT — not instant kill, just pressure
        ally.meltStacks = Math.min((ally.meltStacks || 0) + 1, 5);
      }
    }

    // Visual: dark splatter
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(1, 4);
      gs.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color: "#1a001a", r: rand(3, 7), life: 40 });
    }
  },

  onBossKill(gs, e) {
    // Shadow: boss kill clears all melt stacks on the player's behalf
    gs.floatingTexts.push({ x: W / 2, y: 60, text: "SHADOW FALLS", color: "#ff4081", life: 130, big: true });
    gs._screenShake(22);
  },

  onPlayerDeath(gs) {
    gs._playerDead(); // useGameState checks fade revive
  },
};

// ── Apply melt DoT each frame (call from Shadow's game loop) ─────────────────
export function tickShadowMelt(gs) {
  for (const e of gs.enemies) {
    if (!e.meltStacks || e.meltStacks <= 0) continue;
    if (e.meltImmune > 0) continue;

    // DoT: 1-3 damage per stack per 20 frames — meaningful pressure, not instant kill
    if (gs.frame % 20 === 0) {
      const dmg = e.meltStacks * rand(1, 3);
      e.hp -= dmg;
      if (dmg > 0) {
        gs.floatingTexts.push({ x: e.x, y: e.y - 14, text: String(Math.round(dmg)), color: "#ff4081", life: 28 });
      }
      // Stacks decay
      e.meltStacks = Math.max(0, e.meltStacks - 1);
      if (e.hp <= 0) {
        // Kill via melt — trigger from game loop, not combatEngine
        gs.pendingKills = gs.pendingKills || [];
        gs.pendingKills.push(e);
      }
    }
  }

  // Process pending melt kills at end of frame
  if (gs.pendingKills?.length) {
    for (const dead of gs.pendingKills) {
      const idx = gs.enemies.indexOf(dead);
      if (idx !== -1) {
        gs.enemies.splice(idx, 1);
        gs.totalKills++;
        gs.roomKills++;
        // Minimal particles — melted enemies don't burst
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          gs.particles.push({ x: dead.x, y: dead.y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, color: dead.col, r: 3, life: 20 });
        }
      }
    }
    gs.pendingKills = [];
  }
}