/**
 * enemySystem.js  (final, pure)
 *
 * Rules:
 * 1. Each room gets ONE fixed set of enemies at entry — buildRoomEnemies().
 * 2. No continuous spawning. No wave refill. Room ends when all enemies die.
 * 3. Summoner/necromancer AI is capped hard via gs._enemyCap.
 * 4. Boss rooms spawn ONE boss. Minion adds (Drake at 50%, Lich phase 3)
 * are also capped — never exceed gs._enemyCap total.
 */

import { getGameConfig } from "./gameConfig.js";
import { mkEnemy, SPAWN_TABLES } from "../data/enemies.js";
import { randInt, rand, clamp } from "../utils/math.js";
import { W, H, TILE } from "../utils/constants.js";

function safeX() { return randInt(Math.floor(W * 0.42), W - TILE - 20); }
function safeY() { return randInt(TILE + 24, H - TILE - 24); }

function weightedPick(table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of table) { r -= w; if (r <= 0) return type; }
  return table[0][0];
}

export function pickNextBoss(gs) {
  const cfg      = getGameConfig(gs.mode);
  const pool     = cfg.bossPool;
  gs.bossHistory = gs.bossHistory || [];

  const forbidden  = new Set(gs.bossHistory.slice(-2));
  const candidates = pool.filter(b => !forbidden.has(b));
  const from       = candidates.length > 0 ? candidates : pool;
  const idx        = clamp(Math.floor(gs.room / 5) - 1, 0, from.length - 1);
  const boss       = from[idx % from.length];

  gs.bossHistory.push(boss);
  if (gs.bossHistory.length > 4) gs.bossHistory.shift();
  return boss;
}

export function getRoomEvent(roomNum) {
  if (roomNum % 5 === 0) return null;
  if (roomNum >= 7  && roomNum % 7 === 0) return "shrine";
  if (roomNum >= 30 && roomNum % 8 === 0) return "gauntlet";
  if (roomNum >= 20 && roomNum % 4 === 0) return "horde";
  if (roomNum >= 15 && roomNum % 3 === 0) return "elite";
  if (roomNum >= 25 && roomNum % 6 === 0) return "cursed";
  return null;
}

/**
 * Call ONCE on room entry. Never call mid-room.
 * Sets gs._enemyCap so AI can read it.
 */
export function buildRoomEnemies(roomNum, gs) {
  const cfg = getGameConfig(gs.mode);

  if (roomNum % cfg.bossRoomInterval === 0) {
    const bossType = pickNextBoss(gs);
    const boss     = mkEnemy(bossType, W * 0.75, H * 0.5, cfg.enemyScaleFn(roomNum));
    gs._enemyCap   = cfg.maxEnemies; // boss AI minion adds respect this
    return [boss];
  }

  const event = getRoomEvent(roomNum);
  if (event === "shrine")   { gs._enemyCap = 0; return []; }
  if (event === "horde")    return _horde(roomNum, cfg, gs);
  if (event === "elite")    return _elite(roomNum, cfg, gs);
  if (event === "gauntlet") return _gauntlet(roomNum, cfg, gs);
  return _normal(roomNum, cfg, gs);
}

function _normal(roomNum, cfg, gs) {
  const tier  = Math.min(Math.floor((roomNum - 1) / 5), SPAWN_TABLES.length - 1);
  const sf    = cfg.enemyScaleFn(roomNum);
  const count = Math.min(cfg.roomCountFn(roomNum), cfg.maxEnemies);
  gs._enemyCap = cfg.maxEnemies;
  return Array.from({ length: count }, () =>
    mkEnemy(weightedPick(SPAWN_TABLES[tier]), safeX(), safeY(), sf)
  );
}

function _horde(roomNum, cfg, gs) {
  const table = roomNum < 25
    ? [["slime", 5], ["goblin", 4], ["archer", 1]]
    : SPAWN_TABLES[Math.min(Math.floor((roomNum - 1) / 5), SPAWN_TABLES.length - 1)];
  const count = Math.min(Math.floor(cfg.maxEnemies * 1.5), 16);
  const sf    = cfg.enemyScaleFn(roomNum) * 0.50;
  gs._enemyCap = count;
  return Array.from({ length: count }, () =>
    mkEnemy(weightedPick(table), safeX(), safeY(), sf)
  );
}

function _elite(roomNum, cfg, gs) {
  const tier       = Math.min(Math.floor((roomNum - 1) / 5), SPAWN_TABLES.length - 1);
  const sf         = cfg.enemyScaleFn(roomNum);
  const eliteCount = roomNum >= 25 ? 2 : 1;
  const extras     = Math.min(2 + Math.floor(roomNum / 10), 5);
  const enemies    = [];

  for (let i = 0; i < eliteCount; i++) {
    const e = mkEnemy(weightedPick(SPAWN_TABLES[tier]), safeX(), safeY(), sf * 1.85);
    e.elite = true; e.col = "#ff6f00"; e.xp = Math.floor(e.xp * 2.5);
    enemies.push(e);
  }
  for (let i = 0; i < extras; i++) {
    enemies.push(mkEnemy(weightedPick(SPAWN_TABLES[tier]), safeX(), safeY(), sf));
  }
  const final = enemies.slice(0, cfg.maxEnemies);
  gs._enemyCap = final.length;
  return final;
}

function _gauntlet(roomNum, cfg, gs) {
  const pool = ["dungeonLord", "lichKing", "shadowDrake", "voidOverlord", "ancientTitan"];
  const sf   = cfg.enemyScaleFn(roomNum) * 0.52;
  const b1   = pool[randInt(0, pool.length - 1)];
  let   b2   = pool[randInt(0, pool.length - 1)];
  if (b2 === b1) b2 = pool[(pool.indexOf(b1) + 1) % pool.length];
  gs._enemyCap = 2;
  return [
    mkEnemy(b1, W * 0.58, H * 0.35, sf),
    mkEnemy(b2, W * 0.72, H * 0.65, sf),
  ];
}

/** Door opens when this returns true. */
export function isRoomCleared(gs) {
  if (gs.roomEvent === "shrine") return gs.shrineActivated === true;
  return gs.enemies.length === 0;
}