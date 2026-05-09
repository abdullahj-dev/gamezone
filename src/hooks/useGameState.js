import { useRef } from "react";
import { W, H, TILE, MAX_ACTIVE_SKILLS } from "@/utils/constants.js";
import { clamp } from "@/utils/math.js";
import { saveGame, loadSave } from "@/utils/storage.js";
import { makeEnemies, makeObstacles, getRoomEvent, makeShrines } from "@/systems/rooms.js";
import { takeDamage, aoeExplosion, stompShockwave } from "@/systems/combat.js";
import { getSkillDef, SKILLS } from "@/data/skills.js";

const ACTIVE_SKILL_IDS = [
  "fireball","frostBolt","dash","chainLightning",
  "timeWarp","nova","flameVortex","voidStep","blizzard","iceShield",
];

export function initPlayer(upgrades = {}) {
  const p = {
    x: 80, y: H / 2, r: 16,
    hp: 100, maxHp: 100,
    atk: 8, def: 2, spd: 2.7,
    xp: 0, xpNeeded: 55, level: 1,
    equippedSkills: [], unlockedSkills: [], skillCds: {},
    kills: 0, revivesAvailable: 0,
    atkCd: 0, atkRange: 78, atkRate: 52,
    invuln: 0, shieldCharges: 0,
    facing: { x: 1, y: 0 }, vx: 0, vy: 0,
    shards: 0, xpMult: 1, shardMult: 1,
  };
  
  const upg = upgrades || {};
  if (upg.reinforcedCore) { p.maxHp += upg.reinforcedCore * 20; p.hp = p.maxHp; }
  if (upg.scholarMark)    p.xpMult   = 1 + upg.scholarMark * 0.15;
  if (upg.shardSense)     p.shardMult = 2;
  if (upg.ironHeart)      p.def      += upg.ironHeart * 2;
  if (upg.startingBlade) {
    const id = ACTIVE_SKILL_IDS[Math.floor(Math.random() * ACTIVE_SKILL_IDS.length)];
    p.equippedSkills.push(id); p.unlockedSkills.push(id);
  }
  return p;
}

export function buildGS(room = 1, player = null, mode = "normal") {
  const p = player || initPlayer();
  p.x = 80; p.y = H / 2; p.invuln = 0;
  const event = getRoomEvent(room);
  
  return {
    player: p, frame: 0, room, mode: mode || "normal", // Purely reliant on mode now
    enemies:       makeEnemies(room),
    obstacles:     makeObstacles(room),
    projectiles: [], particles: [], trails: [],
    floatingTexts: [], _deadEnemies: [],
    door: { x: W - 38, y: H / 2, r: 22 },
    doorOpen: false, roomKills: 0, totalKills: 0,
    twarp: 0, earthquakeTimer: 0,
    novaCharging: false, novaChargeTick: 0,
    vortexActive: 0, blizzardActive: 0,
    shake: 0, sx: 0, sy: 0,
    _pendingLevelUp: false, _pendingDeath: false,
    roomEvent: event,
    shrines: event === "shrine" ? makeShrines() : [],
    shrineActivated: false,
    cursedRoom: event === "cursed",
    killStreak: 0, streakTimer: 0, lastKillFrame: 0,
    streakBuffTimer: 0, streakDmgMult: 1,
  };
}

export function useGameState() {
  const gsRef      = useRef(null);
  const overlayRef = useRef("menu");

  function bindCallbacks(gs) {
    gs._onEnemyHit     = (e, p, rawDmg) => takeDamage(gs, rawDmg, e.boss || false);
    gs._screenShake    = (amt)          => { gs.shake = Math.max(gs.shake, amt); };
    gs._aoeExplosion   = (x,y,r,dmg)    => aoeExplosion(gs, x, y, r, dmg);
    gs._stompShockwave = (x,y,rings,dmg)=> stompShockwave(gs, x, y, rings, dmg);
    gs._earthquake     = (dmg) => {
      gs.shake = 22; gs.earthquakeTimer = 70;
      aoeExplosion(gs, gs.player.x, gs.player.y, W, dmg * 0.6);
      for (const e of gs.enemies) e.stunned = (e.stunned || 0) + 40;
    };
    gs._triggerLevelUp = () => { gs._pendingLevelUp = true; };
    gs._playerDead     = () => { gs._pendingDeath   = true; };
  }

  function applyNightmareScaling(gs) {
    if (gs.mode !== "nightmare") return;
    for (const e of gs.enemies) { 
      e.hp *= 2; 
      e.maxHp *= 2; 
      e.atk = Math.round(e.atk * 1.5); 
    }
  }

  // ── Start / Load ────────────────────────────────────────────────────────────
  function startNew(upgrades = {}, mode = "normal") {
    const p  = initPlayer(upgrades);
    const gs = buildGS(1, p, mode);
    applyNightmareScaling(gs);
    bindCallbacks(gs);
    gsRef.current      = gs;
    overlayRef.current = "playing";
    return gs;
  }

  async function loadAndResume(upgrades = {}) {
    const save = await loadSave();
    if (!save) return null;
    
    const p  = { ...initPlayer({}), ...save.player };
    if (upgrades?.scholarMark) p.xpMult   = 1 + upgrades.scholarMark * 0.15;
    if (upgrades?.shardSense)  p.shardMult = 2;
    
    const gs = buildGS(save.room, p, save.mode || "normal");
    gs.totalKills  = save.totalKills || 0;
    
    applyNightmareScaling(gs);
    bindCallbacks(gs);
    gsRef.current      = gs;
    overlayRef.current = "playing";
    return gs;
  }

  // ── Next room ───────────────────────────────────────────────────────────────
  function nextRoom() {
    const gs = gsRef.current; if (!gs) return null;
    const rn    = gs.room + 1;
    gs.room     = rn;
    
    const event = getRoomEvent(rn);
    gs.roomEvent       = event;
    gs.shrineActivated = false;
    gs.cursedRoom      = event === "cursed";
    gs.shrines         = event === "shrine" ? makeShrines() : [];
    gs.enemies         = makeEnemies(rn);
    gs.obstacles       = makeObstacles(rn);
    
    gs.projectiles = []; gs.particles = []; gs.trails = [];
    gs.floatingTexts = []; gs._deadEnemies = [];
    gs.doorOpen = false; gs.roomKills = 0;
    gs.novaCharging = false; gs.novaChargeTick = 0;
    gs.vortexActive = 0; gs.blizzardActive = 0;
    gs.killStreak = 0; gs.streakTimer = 0;
    gs.streakBuffTimer = 0; gs.streakDmgMult = 1;
    
    const p = gs.player;
    p.x = 80; p.y = H / 2;
    p.hp = Math.min(p.maxHp, p.hp + 28); // partial heal between rooms
    
    applyNightmareScaling(gs);
    bindCallbacks(gs);
    saveGame(gs);
    
    const milestones = { 
      10: "FLOOR 10 — DARKNESS THICKENS", 
      20: "FLOOR 20 — ELITE TERRITORY", 
      30: "FLOOR 30 — BEYOND REASON", 
      50: "FLOOR 50 — THE ABYSS WATCHES" 
    };
    if (milestones[rn]) {
      gs.floatingTexts.push({ x: W / 2, y: H / 2 - 80, text: milestones[rn], color: "#ffd700", life: 150, big: true });
    }
    return event;
  }

  // ── Revive ──────────────────────────────────────────────────────────────────
  function revive(keepSkillIds) {
    const gs = gsRef.current; if (!gs) return false;
    const p  = gs.player;
    if (p.revivesAvailable <= 0 || gs.mode === "nightmare") return false;

    p.revivesAvailable--;
    p.equippedSkills = keepSkillIds;
    p.unlockedSkills = p.unlockedSkills.filter(id => {
      const d = getSkillDef(id);
      return !d || d.type !== "active" || keepSkillIds.includes(id);
    });

    p.hp            = p.maxHp;
    p.x             = 80;
    p.y             = H / 2;
    p.invuln        = 90;
    p.shieldCharges = 3;

    gs.projectiles    = [];
    gs.particles      = [];
    gs.floatingTexts  = [];
    gs._pendingDeath  = false;
    gs.killStreak     = 0;
    gs.streakBuffTimer= 0;
    gs.streakDmgMult  = 1;

    bindCallbacks(gs);
    overlayRef.current = "playing";
    return true;
  }

  return { gsRef, overlayRef, startNew, loadAndResume, nextRoom, revive, buildGS };
}