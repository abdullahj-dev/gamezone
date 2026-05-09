import { W, H, TILE } from "@/utils/constants.js";
import { randInt, rand } from "@/utils/math.js";
import { mkEnemy, SPAWN_TABLES } from "@/data/enemies.js";

// ── Passable layouts ──────────────────────────────────────────────────────────
// Every layout guarantees:
//   1. Player spawn zone (x < 120) is clear
//   2. Door zone (x > W-60) is clear
//   3. A navigable corridor exists between left and right — never fully walled
const ROOM_LAYOUTS = [
  // 0: open
  () => [],
  // 1: four isolated pillars — player and door zones clear
  () => [
    { x:190, y:130, w:36, h:36 }, { x:540, y:130, w:36, h:36 },
    { x:190, y:340, w:36, h:36 }, { x:540, y:340, w:36, h:36 },
  ],
  // 2: split walls with deliberate gap in center (always passable)
  () => [
    { x:130, y:200, w:150, h:20 },
    { x:130, y:310, w:150, h:20 },
    { x:560, y:160, w:150, h:20 },
    { x:560, y:340, w:150, h:20 },
  ],
  // 3: vertical divider with large gaps top and bottom — always passable
  () => [
    { x:360, y: 58, w:20, h:140 },
    { x:360, y:325, w:20, h:145 },
  ],
  // 4: staggered horizontal walls — never cover the full height
  () => [
    { x:140, y:150, w:200, h:18 },
    { x:500, y:230, w:200, h:18 },
    { x:140, y:350, w:200, h:18 },
  ],
  // 5: center fortress — open corridors on all four sides
  () => [
    { x:300, y:175, w:230, h:20 },
    { x:300, y:330, w:230, h:20 },
    { x:300, y:193, w:20,  h:140 },
    { x:510, y:193, w:20,  h:140 },
  ],
  // 6: scattered boxes — plenty of gaps
  () => [
    { x:170, y:110, w:44, h:44 },
    { x:580, y:110, w:44, h:44 },
    { x:170, y:370, w:44, h:44 },
    { x:580, y:370, w:44, h:44 },
    { x:370, y:220, w:44, h:44 },
  ],
  // 7: L-shaped walls — open passage through middle
  () => [
    { x:130, y: 58, w:18, h:170 },
    { x:130, y:300, w:18, h:170 },
    { x:590, y: 58, w:18, h:170 },
    { x:590, y:300, w:18, h:170 },
  ],
  // 8: diagonal feel — no horizontal runs that block the path
  () => [
    { x:200, y:120, w:24, h:24 }, { x:560, y:120, w:24, h:24 },
    { x:200, y:380, w:24, h:24 }, { x:560, y:380, w:24, h:24 },
    { x:380, y:200, w:24, h:24 }, { x:380, y:300, w:24, h:24 },
  ],
  // 9: two horizontal splits — gap always in center third
  () => [
    { x:130, y:168, w:240, h:18 },
    { x:480, y:340, w:240, h:18 },
  ],
  // 10: cross pattern — four arms, open at ends
  () => [
    { x:370, y:180, w:18, h:70 },
    { x:370, y:275, w:18, h:70 },
    { x:240, y:245, w:130, h:18 },
    { x:390, y:245, w:130, h:18 },
  ],
];

function scaleFactor(room) {
  return 1 + Math.floor((room - 1) / 5) * 0.28;
}

// Room event — rooms 7+ occasionally get special types
export function getRoomEvent(roomNum) {
  if (roomNum % 5 === 0) return null;          // boss rooms: nothing special
  if (roomNum >= 7  && roomNum % 7 === 0) return "shrine";
  if (roomNum >= 30 && roomNum % 8 === 0) return "gauntlet";
  if (roomNum >= 20 && roomNum % 4 === 0) return "horde";
  if (roomNum >= 15 && roomNum % 3 === 0) return "elite";
  if (roomNum >= 25 && roomNum % 6 === 0) return "cursed";
  return null;
}

export function makeObstacles(roomNum) {
  // Boss, shrine, gauntlet rooms always open
  if (roomNum % 5 === 0) return [];
  const event = getRoomEvent(roomNum);
  if (event === "shrine" || event === "gauntlet") return [];
  const idx = ((roomNum - 1) % (ROOM_LAYOUTS.length - 1)) + 1;
  return ROOM_LAYOUTS[idx % ROOM_LAYOUTS.length]();
}

export function makeEnemies(roomNum) {
  if (roomNum % 5 === 0) return makeBossRoom(roomNum);
  const event = getRoomEvent(roomNum);
  if (event === "shrine")   return [];
  if (event === "horde")    return makeHordeRoom(roomNum);
  if (event === "elite")    return makeEliteRoom(roomNum);
  if (event === "gauntlet") return makeGauntletRoom(roomNum);
  return makeNormalRoom(roomNum);
}

function makeNormalRoom(roomNum) {
  const tier  = Math.min(Math.floor((roomNum - 1) / 5), SPAWN_TABLES.length - 1);
  const table = SPAWN_TABLES[tier];
  const total = Math.min(4 + roomNum + tier, 16);
  const sf    = scaleFactor(roomNum);
  return Array.from({ length: total }, () =>
    mkEnemy(weightedPick(table), safeX(), safeY(), sf)
  );
}

function makeHordeRoom(roomNum) {
  const table = roomNum < 25
    ? [["slime",4],["goblin",5],["archer",1]]
    : SPAWN_TABLES[Math.min(Math.floor((roomNum-1)/5), SPAWN_TABLES.length-1)];
  const total = Math.min(10 + Math.floor(roomNum * 0.7), 28);
  const sf    = scaleFactor(roomNum) * 0.48;
  return Array.from({ length: total }, () =>
    mkEnemy(weightedPick(table), safeX(), safeY(), sf)
  );
}

function makeEliteRoom(roomNum) {
  const sf    = scaleFactor(roomNum);
  const tier  = Math.min(Math.floor((roomNum-1)/5), SPAWN_TABLES.length-1);
  const table = SPAWN_TABLES[tier];
  const enemies = [];

  const eliteCount = roomNum >= 25 ? 2 : 1;
  for (let i = 0; i < eliteCount; i++) {
    const e = mkEnemy(weightedPick(table), safeX(), safeY(), sf * 1.85);
    e.elite = true;
    e.col   = "#ff6f00";
    e.xp    = Math.floor(e.xp * 2.5);
    enemies.push(e);
  }
  const extra = Math.min(3 + Math.floor(roomNum / 9), 7);
  for (let i = 0; i < extra; i++) enemies.push(mkEnemy(weightedPick(table), safeX(), safeY(), sf));
  return enemies;
}

function makeGauntletRoom(roomNum) {
  const bossList = ["dungeonLord","lichKing","shadowDrake","voidOverlord","ancientTitan"];
  const sf  = scaleFactor(roomNum) * 0.52;
  const b1  = bossList[randInt(0, bossList.length-1)];
  let b2    = bossList[randInt(0, bossList.length-1)];
  if (b2 === b1) b2 = bossList[(bossList.indexOf(b1)+1) % bossList.length];
  return [
    mkEnemy(b1, W*0.58,  H*0.35, sf),
    mkEnemy(b2, W*0.72,  H*0.65, sf),
  ];
}

function makeBossRoom(roomNum) {
  const bossNum = Math.floor(roomNum / 5);
  const bossList = ["dungeonLord","lichKing","shadowDrake","voidOverlord","ancientTitan"];
  const bossType = bossList[(bossNum-1) % bossList.length];
  const sf = 1 + (bossNum-1) * 0.3;
  return [mkEnemy(bossType, W*0.75, H*0.5, sf)];
}

// Shrine orbs — three positions spread across the room
export function makeShrines() {
  return [
    { x: W*0.28, y: H*0.38, used: false },
    { x: W*0.50, y: H*0.62, used: false },
    { x: W*0.70, y: H*0.38, used: false },
  ];
}

// Enemies only spawn in the right two thirds — keep left side for player entry
function safeX() { return randInt(Math.floor(W * 0.42), W - 80); }
function safeY() { return randInt(TILE + 24, H - TILE - 24); }

function weightedPick(table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of table) { r -= w; if (r <= 0) return type; }
  return table[0][0];
}