/**
 * enemyAI.js  (refactored)
 * All enemy AI behaviors, now shared across games.
 * Game-specific enemy variants (Shadow melt, Void phase) are toggled via
 * flags on the enemy object set at spawn time in each game's enemy factory.
 *
 * Key fixes:
 *  - Enemies never overlap-clip the player (stopDist enforced in every AI)
 *  - Boss phases capped — phase 2 spread fire rate won't shred the player
 *  - Shadow melt: meltImmune window prevents instant-dissolve on spawn
 *  - Wave caps prevent the "infinite generation" loop
 */

import { W, H, TILE } from "../utils/constants.js";
import { dist, angle, clamp, rand, randInt } from "../utils/math.js";
import { mkEnemy } from "../data/enemies.js";

export function updateEnemyAI(e, gs) {
  if (e.stunned > 0) { e.stunned--; return; }
  if (e.frozen  > 0) { e.frozen--;  return; }
  e.slowed = Math.max(0, e.slowed - 1);

  // Shadow melt immunity countdown
  if (e.meltImmune > 0) e.meltImmune--;

  const sm = gs.twarp > 0 ? 0.25 : e.slowed > 0 ? 0.38 : 1;
  e.aiTimer++;

  switch (e.aiType) {
    case "melee":        aiMelee(e, gs, sm);       break;
    case "berserker":    aiBerserker(e, gs, sm);   break;
    case "archer":       aiArcher(e, gs, sm);      break;
    case "charger":      aiCharger(e, gs, sm);     break;
    case "mage":         aiMage(e, gs, sm);        break;
    case "healer":       aiHealer(e, gs, sm);      break;
    case "shade":        aiShade(e, gs, sm);       break;
    case "summoner":     aiSummoner(e, gs, sm);    break;
    case "necro":        aiNecro(e, gs, sm);       break;
    case "voidshade":    aiVoidShade(e, gs, sm);   break;
    case "boss_dungeon": bossDungeonLord(e, gs, sm); break;
    case "boss_lich":    bossLichKing(e, gs, sm);    break;
    case "boss_drake":   bossShadowDrake(e, gs, sm); break;
    case "boss_void":    bossVoidOverlord(e, gs, sm);break;
    case "boss_titan":   bossAncientTitan(e, gs, sm);break;
  }
  clampToArena(e);
}

// ── Movement helpers ──────────────────────────────────────────────────────────
function moveToward(e, tx, ty, spd) {
  const a = Math.atan2(ty - e.y, tx - e.x);
  e.x += Math.cos(a) * spd;
  e.y += Math.sin(a) * spd;
}
function moveAway(e, tx, ty, spd) {
  const a = Math.atan2(ty - e.y, tx - e.x) + Math.PI;
  e.x += Math.cos(a) * spd;
  e.y += Math.sin(a) * spd;
}
function moveOrtho(e, tx, ty, spd, frame) {
  const sign = Math.sin(frame * 0.04) > 0 ? 1 : -1;
  const a    = Math.atan2(ty - e.y, tx - e.x) + (Math.PI / 2) * sign;
  e.x += Math.cos(a) * spd;
  e.y += Math.sin(a) * spd;
}
function clampToArena(e) {
  e.x = clamp(e.x, e.r + TILE + 1, W - e.r - TILE - 1);
  e.y = clamp(e.y, e.r + TILE + 1, H - e.r - TILE - 1);
}

/** Minimum distance at which an enemy stops approaching (prevents clipping) */
function stopDist(e, p) { return e.r + p.r + 10; }

function shootAt(gs, from, tx, ty, spd, atk, color, r = 8, pierce = false) {
  const a = Math.atan2(ty - from.y, tx - from.x);
  gs.projectiles.push({
    x: from.x, y: from.y,
    vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
    fromEnemy: true, atk, r, color, life: 220,
    pierce, hitIds: new Set(),
  });
}
function shootRing(gs, from, count, spd, atk, color, r = 8, offset = 0) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + offset;
    gs.projectiles.push({
      x: from.x, y: from.y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      fromEnemy: true, atk, r, color, life: 200, hitIds: new Set(),
    });
  }
}
function spawnParts(gs, x, y, color, n, spdMul = 1) {
  for (let i = 0; i < n; i++) {
    const a   = Math.random() * Math.PI * 2;
    const spd = rand(1.2, 4) * spdMul;
    gs.particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, color, r: rand(2, 5), life: randInt(18, 36) });
  }
}

// ── Standard AI behaviors ─────────────────────────────────────────────────────

function aiMelee(e, gs, sm) {
  const p  = gs.player;
  const d  = dist(e, p);
  const sd = stopDist(e, p);
  if (d < e.aggroRange && d > sd) moveToward(e, p.x, p.y, e.spd * sm);
  if (e.atkCd > 0) { e.atkCd--; return; }
  if (d <= sd + 4) {
    gs._onEnemyHit(e, p, e.atk);
    if (e.lifesteal) e.hp = Math.min(e.maxHp, e.hp + e.atk * e.lifesteal);
    e.atkCd = e.atkRate || 60;
  }
}

function aiBerserker(e, gs, sm) {
  const p       = gs.player;
  const d       = dist(e, p);
  const sd      = stopDist(e, p);
  const rushing = d < 120;
  const effSpd  = rushing ? e.spd * 2.0 : e.spd;
  if (d < e.aggroRange && d > sd) moveToward(e, p.x, p.y, effSpd * sm);
  if (e.atkCd > 0) { e.atkCd--; return; }
  if (d <= sd + 4) {
    gs._onEnemyHit(e, p, e.atk + (rushing ? 5 : 0));
    e.atkCd = e.atkRate || 50;
  }
}

function aiArcher(e, gs, sm) {
  const p  = gs.player;
  const d  = dist(e, p);
  const kd = e.keepDist || 170;
  if      (d < kd - 30)      moveAway(e, p.x, p.y, e.spd * sm);
  else if (d > kd + 70)      moveToward(e, p.x, p.y, e.spd * 0.75 * sm);
  else                        moveOrtho(e, p.x, p.y, e.spd * 0.65 * sm, e.aiTimer);

  if (e.shootCd > 0) { e.shootCd--; return; }
  if (d < e.aggroRange) {
    const leadX = p.x + (p.vx || 0) * 9;
    const leadY = p.y + (p.vy || 0) * 9;
    shootAt(gs, e, leadX, leadY, 3.6, e.atk, "#b0bec5");
    e.shootCd = e.shootRate;
  }
}

function aiCharger(e, gs, sm) {
  const p  = gs.player;
  const d  = dist(e, p);
  const sd = stopDist(e, p);

  if (e.charging) {
    e.x += e.chargeVx; e.y += e.chargeVy;
    e.stateTimer--;
    if (e.stateTimer <= 0 || d < sd) {
      if (d < sd + 22) gs._onEnemyHit(e, p, e.atk * 1.8);
      e.charging  = false;
      e.chargeCd  = e.chargeCooldown || 200;
    }
    return;
  }

  if (e.chargeCd > 0) e.chargeCd--;

  if (e.chargeCd === 0 && d > sd && d < 240) {
    const a = angle(e, p);
    e.chargeVx = Math.cos(a) * (e.chargeSpd || 4) * sm;
    e.chargeVy = Math.sin(a) * (e.chargeSpd || 4) * sm;
    e.charging    = true;
    e.stateTimer  = 42;
    spawnParts(gs, e.x, e.y, e.col, 6);
    if (e.slamAoe && d < 110) gs._aoeExplosion(e.x, e.y, 90, e.atk * 1.4);
    return;
  }

  if (d > sd && d < e.aggroRange) moveToward(e, p.x, p.y, e.spd * sm);
  if (e.atkCd > 0) { e.atkCd--; return; }
  if (d <= sd + 4) { gs._onEnemyHit(e, p, e.atk); e.atkCd = 55; }
}

function aiMage(e, gs, sm) {
  const p = gs.player;
  const d = dist(e, p);
  if      (d < 140) moveAway(e, p.x, p.y, e.spd * sm);
  else if (d > 240) moveToward(e, p.x, p.y, e.spd * 0.55 * sm);

  if (e.shootCd > 0) { e.shootCd--; }
  else if (d < e.aggroRange) {
    const a0 = angle(e, p);
    [-0.28, 0, 0.28].forEach(off => {
      const fa = a0 + off;
      gs.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(fa) * 2.7, vy: Math.sin(fa) * 2.7, fromEnemy: true, atk: e.atk, r: 9, color: e.col, life: 200, hitIds: new Set() });
    });
    e.shootCd = e.shootRate;
  }

  if (e.teleportCd > 0) { e.teleportCd--; }
  else if (e.hp < e.maxHp * 0.5 && d < 200) {
    let nx, ny, att = 0;
    do {
      nx = clamp(e.x + rand(-230, 230), TILE + e.r, W - TILE - e.r);
      ny = clamp(e.y + rand(-180, 180), TILE + e.r, H - TILE - e.r);
      att++;
    } while (dist({ x: nx, y: ny }, gs.player) < 120 && att < 8);
    spawnParts(gs, e.x, e.y, e.col, 8);
    e.x = nx; e.y = ny;
    spawnParts(gs, e.x, e.y, e.col, 12);
    e.teleportCd = e.teleportRate || 240;
  }
}

function aiHealer(e, gs, sm) {
  const p = gs.player;
  const d = dist(e, p);
  if (d < 160) moveAway(e, p.x, p.y, e.spd * 1.35 * sm);

  let healTarget = null, minPct = 0.82;
  for (const ally of gs.enemies) {
    if (ally === e || ally.boss) continue;
    const pct = ally.hp / ally.maxHp;
    if (pct < minPct) { minPct = pct; healTarget = ally; }
  }

  if (healTarget) {
    const dh = dist(e, healTarget);
    if (dh > 80) moveToward(e, healTarget.x, healTarget.y, e.spd * sm);
    if (e.healCd > 0) { e.healCd--; return; }
    if (dh < 100) {
      healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + e.healAmt);
      spawnParts(gs, healTarget.x, healTarget.y, "#69f0ae", 8);
      gs.floatingTexts.push({ x: healTarget.x, y: healTarget.y - 20, text: `+${e.healAmt}`, color: "#69f0ae", life: 40 });
      e.healCd = e.healRate;
    }
  } else if (d < e.aggroRange) {
    moveOrtho(e, p.x, p.y, e.spd * 0.45 * sm, e.aiTimer);
  }
}

function aiShade(e, gs, sm) {
  const p  = gs.player;
  const d  = dist(e, p);
  const sd = stopDist(e, p);

  if (e.invisible) {
    e.invisTimer--;
    if (d > sd) moveToward(e, p.x, p.y, e.spd * 1.05 * sm);
    if (e.invisTimer <= 0) {
      e.invisible   = false;
      e.invisTimer  = e.visDur;
      spawnParts(gs, e.x, e.y, e.col, 12);
    }
    return;
  }

  e.invisTimer--;
  if (d > sd) moveToward(e, p.x, p.y, e.spd * sm);

  if (e.atkCd > 0) { e.atkCd--; }
  else if (d <= sd + 4) {
    gs._onEnemyHit(e, p, e.atk * 1.35);
    e.atkCd      = 45;
    e.invisible  = true;
    e.invisTimer = e.invisDur;
  }

  if (e.invisTimer <= 0) {
    e.invisible  = true;
    e.invisTimer = e.invisDur;
  }
}

function aiSummoner(e, gs, sm) {
  const p = gs.player;
  const d = dist(e, p);
  if (d < 180) moveAway(e, p.x, p.y, e.spd * sm);

  if (e.summonCd > 0) { e.summonCd--; return; }

  // Hard cap — summoner stops if arena is full
  const minionCount = gs.enemies.filter(en => en.type === e.summonType).length;
  if (minionCount >= 4 || gs.enemies.length >= (gs._enemyCap || 10)) {
    e.summonCd = 140;
    return;
  }

  for (let i = 0; i < 2; i++) {
    if (gs.enemies.length >= (gs._enemyCap || 10)) break;
    const sx = clamp(e.x + rand(-90, 90), TILE + 15, W - TILE - 15);
    const sy = clamp(e.y + rand(-60, 60), TILE + 15, H - TILE - 15);
    gs.enemies.push(mkEnemy(e.summonType || "goblin", sx, sy, 1));
  }
  spawnParts(gs, e.x, e.y, e.col, 18, 1.4);
  e.summonCd = e.summonRate;
}

function aiNecro(e, gs, sm) {
  const p = gs.player;
  const d = dist(e, p);
  if (d < 180) moveAway(e, p.x, p.y, e.spd * sm);

  if (e.reviveCd > 0) { e.reviveCd--; return; }
  // Necro only revives if under cap
  if (gs.enemies.length >= (gs._enemyCap || 10)) { e.reviveCd = 180; return; }

  if (gs._deadEnemies && gs._deadEnemies.length > 0) {
    const corpse = gs._deadEnemies.pop();
    if (corpse) {
      const re = mkEnemy(corpse.type, corpse.x, corpse.y, 0.55);
      gs.enemies.push(re);
      spawnParts(gs, corpse.x, corpse.y, "#4a148c", 16, 1.2);
    }
    e.reviveCd = e.reviveRate;
  }
}

function aiVoidShade(e, gs, sm) {
  if (e.teleportCd > 0) { e.teleportCd--; return; }
  const p    = gs.player;
  const oldX = e.x, oldY = e.y;

  let nx, ny, att = 0;
  do {
    nx = clamp(rand(TILE * 1.5, W - TILE * 1.5), TILE + e.r, W - TILE - e.r);
    ny = clamp(rand(TILE * 1.5, H - TILE * 1.5), TILE + e.r, H - TILE - e.r);
    att++;
  } while (dist({ x: nx, y: ny }, p) < 130 && att < 10);

  spawnParts(gs, oldX, oldY, e.col, 8);
  e.x = nx; e.y = ny;
  spawnParts(gs, e.x, e.y, e.col, 12);

  // 5 bullets — not a ring of death
  if (e.shootOnAppear) shootRing(gs, e, 5, 2.8, e.atk, e.col, 8);
  e.teleportCd = e.teleportRate;
}

// ── Boss helpers ──────────────────────────────────────────────────────────────
function bossCheckPhase(e, gs) {
  if (!e.phases) return;
  const hpPct = e.hp / e.maxHp;
  for (const ph of e.phases) {
    if (hpPct <= ph.hpPct && !e[`_ph_${ph.hpPct}`]) {
      e[`_ph_${ph.hpPct}`] = true;
      e.phase++;
      gs.floatingTexts.push({ x: e.x, y: e.y - 55, text: ph.msg, color: "#ff1744", life: 100, big: true });
      spawnParts(gs, e.x, e.y, e.col, 40, 1.8);
      gs._screenShake(18);
    }
  }
}

// ── Boss 1: Dungeon Lord ──────────────────────────────────────────────────────
function bossDungeonLord(e, gs, sm) {
  const p  = gs.player;
  const d  = dist(e, p);
  const sd = e.r + p.r + 10;
  bossCheckPhase(e, gs);

  if (e.charging) {
    e.x += e.chargeVx * sm; e.y += e.chargeVy * sm;
    e.stateTimer--;
    if (e.stateTimer <= 0 || d < sd) {
      if (d < sd + 30) gs._onEnemyHit(e, p, e.atk * 2.0);
      e.charging = false; e.chargeCd = 190;
      if (e.phase >= 2) shootRing(gs, e, 4, 3.2, e.atk * 0.7, e.col, 10);
    }
    return;
  }
  if (e.chargeCd > 0) e.chargeCd--;
  if (d > sd) moveToward(e, p.x, p.y, e.spd * sm);

  if (e.chargeCd === 0 && d > sd && d < 360) {
    const a = angle(e, p);
    e.chargeVx = Math.cos(a) * e.chargeSpd * sm;
    e.chargeVy = Math.sin(a) * e.chargeSpd * sm;
    e.charging = true; e.stateTimer = 44;
    spawnParts(gs, e.x, e.y, "#b71c1c", 14);
    e.chargeCd = 190;
    return;
  }

  if (e.atkCd > 0) { e.atkCd--; }
  else if (d <= sd + 4) { gs._onEnemyHit(e, p, e.atk); e.atkCd = 55; }

  // Phase 2 spread — 110-frame cooldown so it's readable
  if (e.phase >= 2) {
    if (!e._shootCd) e._shootCd = 110;
    e._shootCd--;
    if (e._shootCd <= 0 && d < 320) {
      const a0 = angle(e, p);
      [-0.35, 0, 0.35].forEach(off => {
        const fa = a0 + off;
        gs.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(fa) * 3.5, vy: Math.sin(fa) * 3.5, fromEnemy: true, atk: e.atk * 0.65, r: 9, color: e.col, life: 210, hitIds: new Set() });
      });
      e._shootCd = 110;
    }
  }
}

// ── Boss 2: Lich King ─────────────────────────────────────────────────────────
function bossLichKing(e, gs, sm) {
  const p  = gs.player;
  const sd = e.r + p.r + 10;
  bossCheckPhase(e, gs);
  if (dist(e, p) > sd) moveToward(e, p.x, p.y, e.spd * sm * 0.45);

  if (!e.spiralCd) e.spiralCd = 0;
  e.spiralCd--;
  if (e.spiralCd <= 0) {
    const count = e.phase >= 3 ? 14 : e.phase >= 2 ? 10 : 8;
    for (let i = 0; i < count; i++) {
      const a = e.spiralAngle + (i / count) * Math.PI * 2;
      gs.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 2.8, vy: Math.sin(a) * 2.8, fromEnemy: true, atk: e.atk, r: 8, color: e.col, life: 210, hitIds: new Set() });
    }
    e.spiralAngle = (e.spiralAngle || 0) + 0.42;
    // Phase 3 = 45 frames = ~0.75s between spirals — still leaves gaps to dodge
    e.spiralCd = e.phase >= 3 ? 45 : e.phase >= 2 ? 62 : 85;
  }

  if (e.phase >= 2) {
    if (!e._deathOrbCd) e._deathOrbCd = 0;
    e._deathOrbCd--;
    if (e._deathOrbCd <= 0) {
      // 4 lingering orbs — balanced, not a cage
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        gs.projectiles.push({ x: e.x + Math.cos(a) * 85, y: e.y + Math.sin(a) * 85, vx: 0, vy: 0, fromEnemy: true, atk: e.atk * 0.55, r: 13, color: "#7b1fa2", life: 280, linger: true, hitIds: new Set() });
      }
      e._deathOrbCd = 340;
    }
  }

  if (e.phase >= 3) {
    if (!e._summonCd) e._summonCd = 320;
    e._summonCd--;
    if (e._summonCd <= 0 && gs.enemies.length < (gs._enemyCap || 10)) {
      gs.enemies.push(mkEnemy("archer", e.x + rand(-120, 120), e.y + rand(-80, 80), 0.75));
      e._summonCd = 320;
    }
  }
}

// ── Boss 3: Shadow Drake ──────────────────────────────────────────────────────
function bossShadowDrake(e, gs, sm) {
  const p  = gs.player;
  const sd = e.r + p.r + 12;
  const d  = dist(e, p);
  bossCheckPhase(e, gs);
  if (d > sd) moveToward(e, p.x, p.y, e.spd * sm * 0.65);

  if (!e._fanCd) e._fanCd = 0;
  e._fanCd--;
  if (e._fanCd <= 0) {
    const a   = angle(e, p);
    const cnt = e.wingFanCount || 7;
    for (let i = 0; i < cnt; i++) {
      const spread = (i - (cnt - 1) / 2) * 0.2;
      gs.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(a + spread) * 3.8, vy: Math.sin(a + spread) * 3.8, fromEnemy: true, atk: e.atk * 0.85, r: 10, color: e.col, life: 200, hitIds: new Set() });
    }
    e._fanCd = e.phase >= 2 ? 100 : 150;
    spawnParts(gs, e.x, e.y, "#1a237e", 10);
  }

  if (!e._eqTimer) e._eqTimer = e.earthquakeCd || 400;
  e._eqTimer--;
  if (e._eqTimer <= 0) {
    gs._earthquake(e.atk * 1.1);
    e._eqTimer = e.earthquakeCd || 400;
  }

  if (!e.spawnDone && e.hp < e.maxHp * 0.5) {
    const cap = gs._enemyCap || 10;
    const max = Math.min(e.spawnCount || 3, cap - gs.enemies.length - 1);
    for (let i = 0; i < max; i++) {
      gs.enemies.push(mkEnemy(e.spawnType || "goblin", rand(TILE * 2, W * 0.5), rand(TILE * 2, H - TILE * 2), 1));
    }
    e.spawnDone = true;
    gs.floatingTexts.push({ x: W / 2, y: 95, text: "MINIONS SUMMONED!", color: "#ff1744", life: 80, big: true });
  }

  if (e.atkCd > 0) { e.atkCd--; }
  else if (d <= sd + 4) { gs._onEnemyHit(e, p, e.atk); e.atkCd = 55; }
}

// ── Boss 4: Void Overlord ─────────────────────────────────────────────────────
function bossVoidOverlord(e, gs, sm) {
  const p = gs.player;
  bossCheckPhase(e, gs);

  if (!e._tpCd) e._tpCd = 0;
  e._tpCd--;
  if (e._tpCd <= 0) {
    let nx, ny, att = 0;
    do {
      nx = clamp(rand(TILE * 2, W - TILE * 2), TILE + e.r, W - TILE - e.r);
      ny = clamp(rand(TILE * 2, H - TILE * 2), TILE + e.r, H - TILE - e.r);
      att++;
    } while (dist({ x: nx, y: ny }, p) < 160 && att < 12);

    spawnParts(gs, e.x, e.y, e.col, 16);
    e.x = nx; e.y = ny;
    spawnParts(gs, e.x, e.y, e.col, 20);

    const ringCnt = e.phase >= 2 ? 10 : e.ringCount || 8;
    shootRing(gs, e, ringCnt, 3.2, e.atk, e.col, 10, e.spiralAngle || 0);
    e.spiralAngle = (e.spiralAngle || 0) + 0.55;

    const a0  = angle(e, p);
    const cnt = e.spreadCount || 4;
    for (let i = 0; i < cnt; i++) {
      const off = (i - (cnt - 1) / 2) * 0.18;
      gs.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(a0 + off) * 4.2, vy: Math.sin(a0 + off) * 4.2, fromEnemy: true, atk: e.atk * 0.95, r: 11, color: e.col, life: 220, hitIds: new Set() });
    }
    // Phase 2 teleport slightly faster but still breathable
    e._tpCd = e.phase >= 2 ? 200 : e.teleportRate || 240;
  }

  if (e.phase >= 2) {
    if (!e._portalCd) e._portalCd = 0;
    e._portalCd--;
    if (e._portalCd <= 0) {
      const px = rand(TILE * 2, W - TILE * 2), py = TILE + 12;
      const a  = angle({ x: px, y: py }, p);
      gs.projectiles.push({ x: px, y: py, vx: Math.cos(a) * 3.5, vy: Math.sin(a) * 3.5, fromEnemy: true, atk: e.atk * 0.75, r: 12, color: "#7c4dff", life: 230, hitIds: new Set() });
      e._portalCd = 90;
    }
  }
}

// ── Boss 5: Ancient Titan ─────────────────────────────────────────────────────
function bossAncientTitan(e, gs, sm) {
  const p  = gs.player;
  const d  = dist(e, p);
  const sd = e.r + p.r + 12;
  bossCheckPhase(e, gs);

  if (e.armored && e.phase < 2) {
    e.armorHp = Math.max(0, e.armorHp - 0.25);
    if (e.armorHp <= 0) {
      e.armored = false;
      spawnParts(gs, e.x, e.y, "#607d8b", 30, 2);
      gs._screenShake(20);
      gs.floatingTexts.push({ x: e.x, y: e.y - 60, text: "ARMOR SHATTERED", color: "#607d8b", life: 80, big: true });
    }
  }

  const effSpd = e.phase >= 3 ? e.spd * 1.45 : e.spd;
  if (d > sd) moveToward(e, p.x, p.y, effSpd * sm);

  if (e.stompCd > 0) { e.stompCd--; }
  else if (d < 100) {
    gs._stompShockwave(e.x, e.y, e.stompRings || 4, e.atk * 1.5);
    gs._screenShake(16);
    e.stompCd = 160; // slightly longer cooldown — stomp was chaining too fast
  }

  if (e.phase >= 2) {
    if (!e._eqCd) e._eqCd = e.earthquakeCd || 320;
    e._eqCd--;
    if (e._eqCd <= 0) {
      gs._earthquake(e.atk * 1.1);
      e._eqCd = e.earthquakeCd || 320;
    }
  }

  if (e.atkCd > 0) { e.atkCd--; }
  else if (d <= sd + 4) {
    gs._onEnemyHit(e, p, e.atk * (e.phase >= 3 ? 1.45 : 1));
    e.atkCd = e.phase >= 3 ? 42 : 65;
  }
}