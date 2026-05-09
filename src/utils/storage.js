// Storage uses window.storage (claude artifact API) with localStorage as fallback.
// All functions are async for consistency even when using localStorage.

const SAVE_KEY = "depths_v4_save";
const META_KEY = "depths_v4_meta";

async function storageGet(key) {
  try {
    if (typeof window !== "undefined" && window.storage) {
      const r = await window.storage.get(key);
      return r?.value ?? null;
    }
  } catch (_) { /* fall through */ }
  try { return window.localStorage.getItem(key); } catch (_) { return null; }
}

async function storageSet(key, value) {
  try {
    if (typeof window !== "undefined" && window.storage) {
      await window.storage.set(key, value);
      return true;
    }
  } catch (_) { /* fall through */ }
  try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; }
}

async function storageDelete(key) {
  try {
    if (typeof window !== "undefined" && window.storage) {
      await window.storage.delete(key);
    }
  } catch (_) { /* ignored */ }
  try { window.localStorage.removeItem(key); } catch (_) { /* ignored */ }
}

// ── Game save ────────────────────────────────────────────────────────────────
export async function saveGame(gs) {
  try {
    const snap = {
      room:       gs.room,
      totalKills: gs.totalKills,
      mode:       gs.mode || "dungeon",
      player: {
        hp:              gs.player.hp,
        maxHp:           gs.player.maxHp,
        atk:             gs.player.atk,
        def:             gs.player.def,
        spd:             gs.player.spd,
        xp:              gs.player.xp,
        xpNeeded:        gs.player.xpNeeded,
        level:           gs.player.level,
        equippedSkills:  gs.player.equippedSkills,
        unlockedSkills:  gs.player.unlockedSkills,
        skillCds:        gs.player.skillCds,
        kills:           gs.player.kills,
        revivesAvailable:gs.player.revivesAvailable,
        atkRange:        gs.player.atkRange,
        shards:          gs.player.shards || 0,
        xpMult:          gs.player.xpMult  || 1,
        shardMult:       gs.player.shardMult || 1,
        deathMark:       gs.player.deathMark || false,
      },
    };
    await storageSet(SAVE_KEY, JSON.stringify(snap));
    return true;
  } catch (_) { return false; }
}

export async function loadSave() {
  try {
    const raw = await storageGet(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export async function hasSave() {
  try { return (await storageGet(SAVE_KEY)) !== null; }
  catch (_) { return false; }
}

export async function clearSave() {
  await storageDelete(SAVE_KEY);
}

// ── Meta save ────────────────────────────────────────────────────────────────
const META_DEFAULTS = { shards: 0, upgrades: {}, bestRoom: 0, totalKills: 0 };

export async function saveMeta(meta) {
  try {
    await storageSet(META_KEY, JSON.stringify(meta));
    return true;
  } catch (_) { return false; }
}

export async function loadMeta() {
  try {
    const raw = await storageGet(META_KEY);
    return raw ? { ...META_DEFAULTS, ...JSON.parse(raw) } : { ...META_DEFAULTS };
  } catch (_) { return { ...META_DEFAULTS }; }
}