import { useState, useRef, useEffect } from "react";
import { saveMeta, loadMeta } from "@/utils/storage.js";

const BLANK_META = { shards: 0, upgrades: {}, bestRoom: 0, totalKills: 0 };

export const META_UPGRADES = [
  { id: "reinforcedCore", name: "❤ REINFORCED CORE", cost: 30, maxRank: 3, effect: "+20 Max HP per rank"       },
  { id: "scholarMark",    name: "📚 SCHOLAR'S MARK",  cost: 40, maxRank: 1, effect: "+15% XP gain"             },
  { id: "shardSense",     name: "💎 SHARD SENSE",      cost: 50, maxRank: 1, effect: "Double shard drops"       },
  { id: "startingBlade",  name: "⚔ STARTING BLADE",   cost: 60, maxRank: 1, effect: "Begin run with a random active skill" },
  { id: "ironHeart",      name: "🔩 IRON HEART",       cost: 35, maxRank: 2, effect: "+2 Base Defense per rank" },
];

export function useMeta() {
  const metaRef = useRef({ ...BLANK_META });
  const [meta, setMetaState] = useState({ ...BLANK_META });

  useEffect(() => {
    loadMeta().then(m => {
      const loaded = m || { ...BLANK_META };
      metaRef.current = loaded;
      setMetaState(loaded);
    });
  }, []);

  function applyMeta(next) {
    metaRef.current = next;
    setMetaState(next);
    saveMeta(next);
  }

  function earnShards(amount) {
    applyMeta({ ...metaRef.current, shards: metaRef.current.shards + amount });
  }

  function recordRun(room, kills) {
    applyMeta({
      ...metaRef.current,
      bestRoom:   Math.max(metaRef.current.bestRoom  || 0, room),
      totalKills: (metaRef.current.totalKills || 0) + kills,
    });
  }

  function purchaseUpgrade(id, cost) {
    const upg = META_UPGRADES.find(u => u.id === id);
    if (!upg) return false;
    const rank = metaRef.current.upgrades[id] || 0;
    if (rank >= upg.maxRank || metaRef.current.shards < cost) return false;
    applyMeta({
      ...metaRef.current,
      shards:   metaRef.current.shards - cost,
      upgrades: { ...metaRef.current.upgrades, [id]: rank + 1 },
    });
    return true;
  }

  function spendShards(amount) {
    if (metaRef.current.shards < amount) return false;
    applyMeta({ ...metaRef.current, shards: metaRef.current.shards - amount });
    return true;
  }

  return { meta, metaRef, earnShards, recordRun, purchaseUpgrade, spendShards };
}