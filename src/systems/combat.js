/**
 * combatEngine.js
 * All damage, collision, projectile, and kill logic.
 * Aligned with fixed-room enemy system (no wave refills).
 */

import { W, H, TILE, MAX_ACTIVE_SKILLS } from "../utils/constants.js";
import { dist, angle, clamp, rand, randInt } from "../utils/math.js";
import { getSkillDef } from "../data/skills.js";
import { mkEnemy }     from "../data/enemies.js";
import { getGameConfig } from "./gameConfig.js";

// ── Public entry point ────────────────────────────────────────────────────────
export function runCombat(gs, keys, mousePos, hooks = {}) {
  const p = gs.player;

  // ── Timers ──────────────────────────────────────────────────────────────
  if (p.atkCd > 0)          p.atkCd--;
  if (p.invuln > 0)         p.invuln--;
  if (gs.twarp > 0)         gs.twarp--;
  if (gs.vortexActive > 0)  gs.vortexActive--;
  if (gs.blizzardActive > 0) gs.blizzardActive--;
  if (gs.streakBuffTimer > 0) gs.streakBuffTimer--;
  if (gs.streakTimer > 0)   gs.streakTimer--;
  else if (gs.killStreak > 0) gs.killStreak = 0;
  
  for (const id in p.skillCds) {
    if (p.skillCds[id] > 0) p.skillCds[id]--;
  }

  // Shadow: fade (invisibility revive) timer
  if (gs.fadeActive > 0) { 
    gs.fadeActive--; 
    p.invuln = gs.fadeActive + 1; 
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const hasSkill    = (id) => p.unlockedSkills.includes(id);
  const isBerserker = hasSkill("berserker") && p.hp < p.maxHp * 0.4;
  const effAtkRate  = isBerserker ? Math.floor(p.atkRate * 0.45) : p.atkRate;
  const streakMult  = gs.streakBuffTimer > 0 ? (gs.streakDmgMult || 1) : 1;

  // ── Auto-attack ──────────────────────────────────────────────────────────
  if (p.atkCd === 0 && gs.enemies.length > 0) {
    let nearest = null, nd = Infinity;
    for (const e of gs.enemies) {
      if (e.invisible) continue;
      const d = dist(p, e);
      if (d < p.atkRange && d < nd) { nd = d; nearest = e; }
    }
    if (nearest) {
      let dmg = p.atk + randInt(-2, 3);
      if (isBerserker) dmg += 5;
      if (hasSkill("critStrike") && Math.random() < 0.25) dmg *= 2.5;
      if (hasSkill("executioner") && nearest.hp < nearest.maxHp * 0.25) dmg *= 1.6;
      dmg *= streakMult;
      
      dealDmgToEnemy(gs, nearest, dmg, false, hooks);
      if (hasSkill("lifesteal")) p.hp = Math.min(p.maxHp, p.hp + dmg * 0.35);
      
      spawnParticles(gs, nearest.x, nearest.y, "#ffeb3b", 3, 0.7);
      p.atkCd = effAtkRate;
    }
  }

  // ── Player ↔ Enemy collision ─────────────────────────────────────────────
  for (const e of gs.enemies) {
    if (e.invisible) continue;
    const dx = p.x - e.x, dy = p.y - e.y;
    let d = Math.hypot(dx, dy);
    if (d === 0) d = 0.01;
    const minDist = p.r + e.r;

    if (d < minDist) {
      const overlap = minDist - d;
      const nx = dx / d, ny = dy / d;
      if (e.boss) {
        p.x += nx * overlap * 0.6;
        p.y += ny * overlap * 0.6;
      } else {
        e.x -= nx * overlap * 0.68;
        e.y -= ny * overlap * 0.68;
        p.x += nx * overlap * 0.32;
        p.y += ny * overlap * 0.32;
      }
    }

    if (e.hitCd === undefined) e.hitCd = 0;
    if (e.hitCd > 0) e.hitCd--;
    
    if (d < minDist * 0.9 && e.hitCd <= 0) {
      takeDamage(gs, e.atk, e.boss, hooks);
      e.hitCd = e.boss ? 50 : 28;

      if (hasSkill("thornmail")) {
        const reflectDmg = Math.round(e.atk * 0.35);
        e.hp -= reflectDmg;
        e.hurtFlash = 5;
        spawnParticles(gs, e.x, e.y, "#78909c", 4);
        if (e.hp <= 0) onEnemyKill(gs, e, hooks);
      }
    }
  }

  // ── Enemy ↔ Enemy separation ─────────────────────────────────────────────
  for (let i = 0; i < gs.enemies.length; i++) {
    for (let j = i + 1; j < gs.enemies.length; j++) {
      const a = gs.enemies[i], b = gs.enemies[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      if (d === 0) d = 0.01;
      const minDist = a.r + b.r + 2;
      if (d < minDist) {
        const overlap = (minDist - d) / 2;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;
      }
    }
  }

  // ── Skill activation ──────────────────────────────────────────────────────
  for (let i = 0; i < p.equippedSkills.length; i++) {
    const keyStr = String(i + 1);
    if (keys[keyStr] === 1) {
      activateSkill(gs, p.equippedSkills[i], mousePos, hooks);
      keys[keyStr] = true;
    }
  }

  // ── AoE ticks ────────────────────────────────────────────────────────────
  if (gs.vortexActive > 0 && gs.frame % 12 === 0) {
    for (const e of gs.enemies) {
      if (dist(p, e) < 110) {
        dealDmgToEnemy(gs, e, p.atk * 1.5 * streakMult, true, hooks);
        spawnParticles(gs, e.x, e.y, "#ff6d00", 4);
      }
    }
  }

  if (gs.blizzardActive > 0 && gs.frame % 10 === 0) {
    const bx = p.x + p.facing.x * 100, by = p.y + p.facing.y * 100;
    for (const e of gs.enemies) {
      if (dist({ x: bx, y: by }, e) < 100) {
        dealDmgToEnemy(gs, e, p.atk * 0.7, true, hooks);
        e.slowed = 40;
        spawnParticles(gs, e.x, e.y, "#b3e5fc", 3);
      }
    }
  }

  // ── Projectiles ───────────────────────────────────────────────────────────
  gs.projectiles = gs.projectiles.filter(pr => {
    pr.x += pr.vx; pr.y += pr.vy; pr.life--;
    if (pr.linger) { pr.vx *= 0.92; pr.vy *= 0.92; }
    if (pr.life <= 0 || pr.x < 0 || pr.x > W || pr.y < 0 || pr.y > H) return false;

    if (!pr.fromEnemy) {
      let hit = false;
      for (const e of gs.enemies) {
        if (pr.hitIds.has(e.id)) continue;
        if (dist(pr, e) < e.r + pr.r) {
          let dmg = p.atk * (pr.dmgMult || 1) * streakMult;
          if (pr.skillId === "frostBolt") { e.slowed = 190; dmg *= 2; }
          dealDmgToEnemy(gs, e, dmg, true, hooks);
          spawnParticles(gs, pr.x, pr.y, pr.color, 8);
          if (pr.pierce) { pr.hitIds.add(e.id); } else hit = true;
          if (pr.explode) aoeExplosion(gs, pr.x, pr.y, 80, dmg * 0.7, hooks);
          break;
        }
      }
      return !hit;
    } else {
      if (pr.hitIds.has("player")) return !pr.linger || pr.life > 0;
      if (dist(pr, p) < p.r + pr.r) {
        takeDamage(gs, pr.atk, false, hooks);
        spawnParticles(gs, pr.x, pr.y, pr.color, 5);
        if (!pr.linger) { pr.hitIds.add("player"); return false; }
        pr.hitIds.add("player");
      }
      return true;
    }
  });

  // ── Nova charge ───────────────────────────────────────────────────────────
  if (gs.novaCharging) {
    gs.novaChargeTick = (gs.novaChargeTick || 0) + 1;
    if (gs.novaChargeTick >= 62) {
      for (const e of gs.enemies) {
        if (dist(p, e) < 120) {
          dealDmgToEnemy(gs, e, p.atk * 2.8 * streakMult, true, hooks);
          spawnParticles(gs, e.x, e.y, "#ff4081", 10);
        }
      }
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        gs.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, color: "#ff4081", r: 4, life: 28 });
      }
      gs._screenShake(10);
      gs.novaCharging = false; gs.novaChargeTick = 0;
      p.skillCds["nova"] = getSkillDef("nova").cdFrames;
    }
    const moving = Object.keys(keys).some(k =>
      ["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(k) && keys[k]
    );
    if (moving) {
      gs.novaCharging = false; gs.novaChargeTick = 0;
      p.skillCds["nova"] = Math.floor(getSkillDef("nova").cdFrames * 0.3);
    }
  }
}

// ── Damage functions ────────────────────
export function dealDmgToEnemy(gs, e, dmg, isSkill = false, hooks = {}) {
  if (e.meltImmune > 0 && isSkill) return;

  if (e.armored && e.armorHp > 0) {
    dmg = Math.floor(dmg * 0.35);
    e.armorHp = Math.max(0, e.armorHp - 1);
  }
  if (e.shieldHp > 0) {
    e.shieldHp = Math.max(0, e.shieldHp - dmg * 0.5);
    dmg *= 0.15;
  }
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.hurtFlash = 7;
  
  gs.floatingTexts.push({
    x: e.x + randInt(-12, 12), y: e.y - 22,
    text: String(dmg),
    color: isSkill ? "#ffeb3b" : "#fff",
    life: 46,
    big: isSkill && dmg > 15,
  });
  
  if (e.hp <= 0) onEnemyKill(gs, e, hooks);
}

export function takeDamage(gs, rawDmg, isBoss = false, hooks = {}) {
  const p = gs.player;
  if (p.invuln > 0) return;
  if (p.shieldCharges > 0) {
    p.shieldCharges--;
    spawnParticles(gs, p.x, p.y, "#29b6f6", 12);
    return;
  }
  let dmg = Math.max(1, rawDmg - p.def);
  if (p.unlockedSkills.includes("ironWill")) dmg = Math.floor(dmg * 0.8);
  if (gs.cursedRoom) dmg = Math.floor(dmg * 1.3);

  p.hp -= dmg;
  p.invuln = isBoss ? 55 : 32;
  
  gs.floatingTexts.push({
    x: p.x + randInt(-10, 10), y: p.y - 22,
    text: String(dmg), color: "#ff5252", life: 46, big: true,
  });
  gs._screenShake(isBoss ? 12 : 8);

  if (p.hp <= 0) {
    p.hp = 0;
    if (hooks.onPlayerDeath) hooks.onPlayerDeath(gs);
    else gs._playerDead();
  }
}

// ── Kill logic ────────────────────────────────────────────────────────────────
function onEnemyKill(gs, e, hooks = {}) {
  const p = gs.player;
  spawnParticles(gs, e.x, e.y, e.col, 22, 1.3);
  p.kills++;
  gs.totalKills++;
  gs.roomKills++;

  if (p.unlockedSkills.includes("vampiricEdge")) p.hp = Math.min(p.maxHp, p.hp + 18);

  const nightmareMult = gs.mode === "nightmare" ? 2 : 1;
  const shardBase     = e.boss ? 15 : e.elite ? 5 : 1;
  const shardAmt      = shardBase * nightmareMult * (p.shardMult || 1);
  p.shards = (p.shards || 0) + shardAmt;

  if (shardAmt > 1) {
    gs.floatingTexts.push({ x: e.x, y: e.y - 36, text: `+${shardAmt}💎`, color: "#00e5ff", life: 52 });
  }

  // Kill streak
  const now = gs.frame;
  if (now - (gs.lastKillFrame || 0) < 180) gs.killStreak = (gs.killStreak || 0) + 1;
  else gs.killStreak = 1;
  gs.lastKillFrame = now;
  gs.streakTimer = 180;

  if (gs.killStreak === 5  && (gs.streakDmgMult || 1) < 1.3) {
    gs.streakBuffTimer = 300; gs.streakDmgMult = 1.3;
    gs.floatingTexts.push({ x: p.x, y: p.y - 54, text: "ON FIRE  ×1.3", color: "#ff6d00", life: 80, big: true });
    gs._screenShake(6);
  } else if (gs.killStreak === 10 && (gs.streakDmgMult || 1) < 1.6) {
    gs.streakBuffTimer = 360; gs.streakDmgMult = 1.6;
    gs.floatingTexts.push({ x: p.x, y: p.y - 54, text: "RAMPAGE  ×1.6", color: "#ff1744", life: 90, big: true });
    gs._screenShake(10);
    p.shards = (p.shards || 0) + 5 * nightmareMult;
  } else if (gs.killStreak === 20 && (gs.streakDmgMult || 1) < 2.0) {
    gs.streakBuffTimer = 420; gs.streakDmgMult = 2.0;
    gs.floatingTexts.push({ x: W / 2, y: H / 2 - 70, text: "UNSTOPPABLE  ×2", color: "#ffd700", life: 100, big: true });
    gs._screenShake(16);
    p.shards = (p.shards || 0) + 20 * nightmareMult;
  }

  gainXP(gs, e.xp);

  // ── Respecting the new gs._enemyCap ──
  if (e.splits && e.r > 8) {
    const activeId = "depths";
    const cfg = getGameConfig(activeId);
    const cap = gs._enemyCap || cfg.maxEnemies;
    
    // Only allow splits if we aren't blowing past the room's cap
    if (gs.enemies.length < cap - 1) {
      for (let i = 0; i < 2; i++) {
        const s = mkEnemy("slime", e.x + rand(-30, 30), e.y + rand(-20, 20), 0.45, activeId);
        s.r = Math.max(5, e.r * 0.58);
        gs.enemies.push(s);
      }
    }
  }

  // Necromancer corpse tracking — cap to 8 to prevent memory bloat
  gs._deadEnemies = gs._deadEnemies || [];
  gs._deadEnemies.push({ type: e.type, x: e.x, y: e.y });
  if (gs._deadEnemies.length > 8) gs._deadEnemies.shift();

  if (e.boss && hooks.onBossKill) hooks.onBossKill(gs, e);
  if (hooks.onEnemyKill) hooks.onEnemyKill(gs, e);

  if (e.boss) {
    gs.floatingTexts.push({ x: W / 2, y: 70, text: "BOSS SLAIN", color: "#ffd700", life: 130, big: true });
  }
}

function gainXP(gs, xp) {
  const p    = gs.player;
  const mult = (gs.mode === "nightmare" ? 2 : 1) * (p.xpMult || 1);
  p.xp += Math.round(xp * mult);
  if (p.xp >= p.xpNeeded) {
    p.xp -= p.xpNeeded;
    p.xpNeeded = Math.floor(p.xpNeeded * 1.52);
    p.level++;
    gs._triggerLevelUp();
  }
}

export function aoeExplosion(gs, cx, cy, radius, dmg, hooks = {}) {
  for (const e of gs.enemies) {
    if (dist({ x: cx, y: cy }, e) < radius) dealDmgToEnemy(gs, e, dmg, true, hooks);
  }
}

export function stompShockwave(gs, cx, cy, rings, dmg, hooks = {}) {
  for (let i = 1; i <= rings; i++) {
    const r = i * 60;
    setTimeout(() => {
      if (!gs.enemies) return;
      for (const e of gs.enemies) {
        const d = dist({ x: cx, y: cy }, e);
        if (d > r - 30 && d < r + 30) dealDmgToEnemy(gs, e, dmg * (1 - i * 0.15), true, hooks);
      }
      spawnParticles(gs, cx, cy, "#607d8b", 10 + i * 3, 1.5);
    }, i * 120);
  }
}

function spawnParticles(gs, x, y, color, n, sm = 1) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(1.2, 4.5) * sm;
    gs.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, r: rand(2, 5.5), life: randInt(16, 36) });
  }
}

function activateSkill(gs, skillId, mousePos, hooks) {
  const p      = gs.player;
  const def    = getSkillDef(skillId);
  if (!def || def.type !== "active") return;
  if ((p.skillCds[skillId] || 0) > 0) return;
  const streakMult = gs.streakBuffTimer > 0 ? (gs.streakDmgMult || 1) : 1;

  switch (skillId) {
    case "fireball": {
      const t = [...gs.enemies].filter(e => !e.invisible).sort((a, b) => dist(p, a) - dist(p, b))[0];
      if (t) {
        const a = angle(p, t);
        gs.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, fromEnemy: false, atk: p.atk, dmgMult: 3 * streakMult, r: 12, color: "#ff5722", life: 260, pierce: false, skillId: "fireball", hitIds: new Set() });
        p.skillCds[skillId] = def.cdFrames;
      }
      break;
    }
    case "frostBolt": {
      const t = [...gs.enemies].filter(e => !e.invisible).sort((a, b) => dist(p, a) - dist(p, b))[0];
      if (t) {
        const a = angle(p, t);
        gs.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, fromEnemy: false, atk: p.atk, dmgMult: 2, r: 10, color: "#81d4fa", life: 230, pierce: false, skillId: "frostBolt", hitIds: new Set() });
        p.skillCds[skillId] = def.cdFrames;
      }
      break;
    }
    case "iceShield":
      p.shieldCharges = 3;
      spawnParticles(gs, p.x, p.y, "#29b6f6", 22, 1.2);
      p.skillCds[skillId] = def.cdFrames;
      break;
    case "dash": {
      const fx = p.facing.x || 1, fy = p.facing.y || 0;
      const m  = Math.hypot(fx, fy) || 1;
      for (let i = 0; i < 6; i++) gs.trails.push({ x: p.x - (fx / m) * i * 18, y: p.y - (fy / m) * i * 18, r: p.r, life: 14, col: "#ffeb3b" });
      p.x = clamp(p.x + (fx / m) * 120, p.r + TILE, W - p.r - TILE);
      p.y = clamp(p.y + (fy / m) * 120, p.r + TILE, H - p.r - TILE);
      p.invuln = 24;
      spawnParticles(gs, p.x, p.y, "#ffeb3b", 10);
      p.skillCds[skillId] = def.cdFrames;
      break;
    }
    case "chainLightning": {
      const targets = [...gs.enemies].filter(e => !e.invisible).sort((a, b) => dist(p, a) - dist(p, b)).slice(0, 5);
      targets.forEach(e => { dealDmgToEnemy(gs, e, p.atk * 2.5 * streakMult, true, hooks); spawnParticles(gs, e.x, e.y, "#ce93d8", 10); });
      gs._screenShake(7);
      p.skillCds[skillId] = def.cdFrames;
      break;
    }
    case "timeWarp":
      gs.twarp = 250;
      spawnParticles(gs, W / 2, H / 2, "#00bcd4", 40, 2);
      p.skillCds[skillId] = def.cdFrames;
      break;
    case "nova":
      if (!gs.novaCharging) { gs.novaCharging = true; gs.novaChargeTick = 0; }
      break;
    case "flameVortex":
      gs.vortexActive = 240;
      spawnParticles(gs, p.x, p.y, "#ff6d00", 20, 1.5);
      p.skillCds[skillId] = def.cdFrames;
      break;
    case "voidStep":
      if (mousePos) {
        const ox = p.x, oy = p.y;
        p.x = clamp(mousePos.x, p.r + TILE, W - p.r - TILE);
        p.y = clamp(mousePos.y, p.r + TILE, H - p.r - TILE);
        spawnParticles(gs, ox, oy, "#7c4dff", 12);
        aoeExplosion(gs, p.x, p.y, 80, p.atk * 1.8 * streakMult, hooks);
        spawnParticles(gs, p.x, p.y, "#7c4dff", 18);
        p.invuln = 20;
      }
      p.skillCds[skillId] = def.cdFrames;
      break;
    case "blizzard":
      gs.blizzardActive = 180;
      spawnParticles(gs, p.x, p.y, "#b3e5fc", 20);
      p.skillCds[skillId] = def.cdFrames;
      break;
  }
}