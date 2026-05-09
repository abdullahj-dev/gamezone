'use client';
import React, { useEffect } from 'react';

// ── Styles ────────────────────────────────────────────────────────────────────
const globalStyles = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#020509;overflow:hidden;font-family:'Courier New',monospace;color:#ccc}
#wrap{position:relative;width:100%;height:700px;background:#020509;overflow:hidden;user-select:none;box-shadow:inset 0 0 120px rgba(0,0,0,0.95)}
#gc{position:absolute;left:170px;top:0;cursor:crosshair}
#lp{position:absolute;left:0;top:0;width:170px;height:590px;background:rgba(2,5,9,0.97);border-right:1px solid #0a2a0a;padding:8px;overflow-y:auto;overflow-x:hidden}
#bb{position:absolute;bottom:0;left:0;right:0;height:110px;background:rgba(2,5,9,0.97);border-top:1px solid #0a2a0a;display:flex;align-items:center;padding:0 8px;gap:5px;overflow-x:auto}
.stat-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #0a2a0a;font-size:11px}
.stat-val{font-weight:bold;font-size:12px}
.hp-bar-outer{height:8px;background:#1a0a0a;border:1px solid #400;margin:4px 0;border-radius:3px;overflow:hidden;box-shadow:0 0 5px rgba(255,0,0,0.2)}
.hp-bar-inner{height:100%;transition:width 0.15s;border-radius:2px}
.tcard{flex-shrink:0;width:92px;height:90px;border:1px solid #1a3a1a;background:#030a03;padding:4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;position:relative;transition:all 0.15s ease}
.tcard:hover{border-color:#0f6; transform:translateY(-2px)}
.tcard.sel{border-color:#0ff;background:#030f12;box-shadow:0 0 12px rgba(0,255,255,0.2)}
.tcard-key{position:absolute;top:2px;left:4px;font-size:9px;color:#777}
.tcard-cost{font-size:10px;font-weight:bold}
.tcard-name{font-size:9px;text-align:center;line-height:1.2}
.btn{background:#060f06;border:1px solid #1a4a1a;color:#0f6;padding:6px 8px;cursor:pointer;font-family:inherit;font-size:10px;width:100%;transition:all 0.15s;text-transform:uppercase;font-weight:bold}
.btn:hover{background:#0a1f0a;border-color:#0f6;box-shadow:0 0 8px rgba(0,255,102,0.2)}
.btn-wave{background:#0a0a1a;border:1px solid #224;color:#66f;padding:5px 0;cursor:pointer;font-family:inherit;font-size:11px;font-weight:bold;flex-shrink:0;height:80px;width:88px;letter-spacing:0.05em;text-align:center;transition:all 0.15s;border-radius:4px}
.btn-wave:hover{background:#111;border-color:#66f;color:#aaf;box-shadow:0 0 10px rgba(100,100,255,0.2)}
.btn-wave.ready{border-color:#0f6;color:#0f6;animation:pulse-ready 1.5s infinite;box-shadow:0 0 15px rgba(0,255,102,0.4)}
@keyframes pulse-ready{0%,100%{box-shadow:0 0 4px rgba(0,255,102,0.3)}50%{box-shadow:0 0 18px rgba(0,255,102,0.7)}}
.pup-btn{width:100%;background:#060808;border:1px solid #1a2a1a;color:#888;padding:4px;cursor:pointer;font-family:inherit;font-size:10px;display:flex;justify-content:space-between;align-items:center;margin:2px 0;transition:all 0.1s}
.pup-btn:hover{border-color:#0f6}
.pup-btn.afford{color:#ddd;border-color:#1a3a2a}
#overlay{position:absolute;inset:0;background:rgba(1,3,8,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;z-index:99;backdrop-filter:blur(3px)}
#shop-modal{position:absolute;inset:0;background:rgba(1,3,8,0.98);z-index:100;display:none;overflow-y:auto;padding:20px;backdrop-filter:blur(5px)}
.shop-card{background:#030a03;border:1px solid #1a3a1a;padding:12px;margin-bottom:10px;display:flex;gap:12px;align-items:center;border-radius:4px;transition:background 0.2s}
.shop-card:hover{background:#051005}
.big-btn{background:#060f06;border:1px solid #0a3a0a;color:#0f6;padding:12px 30px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:bold;letter-spacing:0.1em;transition:all 0.15s;border-radius:2px}
.big-btn:hover{background:#0a1f0a;border-color:#0f6;box-shadow:0 0 15px rgba(0,255,102,0.3)}
.wave-banner{position:absolute;top:20px;left:170px;right:0;text-align:center;font-size:16px;font-weight:bold;padding:4px;z-index:10;pointer-events:none;opacity:0;transition:opacity 0.4s;text-shadow:0 0 15px currentColor}
#msg{position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);font-size:22px;font-weight:bold;pointer-events:none;opacity:0;z-index:20;transition:opacity 0.3s;text-align:center;text-shadow:0 0 25px currentColor;white-space:nowrap}
`;

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID = 50;

// REBALANCED TOWERS
const TOWER_DEFS = {
  laser:  {cost:65,  range:160, col:"#00e8ff", cd:14,  type:"single", dmg:22,  name:"Pulse Laser",  key:"1", desc:"Fast single-target. Good starter."},
  mortar: {cost:140, range:215, col:"#ff4400", cd:75,  type:"aoe",    dmg:60,  radius:92, name:"Plasma Mortar", key:"2", desc:"Devastating AoE splash damage."},
  stasis: {cost:110, range:135, col:"#bb00ff", cd:6,   type:"slow",   dmg:6,   name:"Stasis Grid",  key:"3", desc:"Slows all enemies in range continuously."},
  siphon: {cost:250, range:0,   col:"#00ff88", cd:180, type:"income", dmg:0,   yield:5,  name:"Gas Siphon",  key:"4", desc:"Generates 5 gas passively every 3s. Paused between waves."}, 
  tesla:  {cost:160, range:175, col:"#ffdd00", cd:30,  type:"chain",  dmg:32,  chains:4, name:"Tesla Arc",   key:"5", desc:"Chains lightning to 4 nearest enemies."},
  cryo:   {cost:135, range:150, col:"#88ddff", cd:48,  type:"freeze", dmg:28,  freeze:160, name:"Cryo Cannon", key:"6", desc:"Freezes target solid. Highly effective."},
  rail:   {cost:220, range:800, col:"#ff88ff", cd:110, type:"pierce", dmg:100, name:"Railgun",       key:"7", desc:"Pierces full screen row. Expensive."},
  mine:   {cost:95,  triggerR:38, col:"#ff8800", cd:0, type:"mine",   dmg:130, radius:82, name:"Void Trap",  key:"8", desc:"Detonates on contact. Auto-rearms."},
  sell:   {cost:0,   range:0,   col:"#ff2222", cd:0,   type:"sell",   dmg:0,   name:"Scrap Tool",   key:"9", desc:"Sell structure for partial refund."},
};
const T_KEYS = Object.keys(TOWER_DEFS);

const ENEMY_DEFS = {
  scout:    {hp:35,  spd:2.2, col:"#ffbb00", r:7,  rwd:4,  shape:"tri",  spdDmg:10},
  tank:     {hp:185, spd:0.85,col:"#ff4400", r:14, rwd:12, shape:"hex",  spdDmg:20},
  swarm:    {hp:14,  spd:2.0, col:"#ff88ff", r:5,  rwd:2,  shape:"dot",  spdDmg:7 },
  speeder:  {hp:52,  spd:3.8, col:"#00ffcc", r:7,  rwd:6,  shape:"dia",  spdDmg:14},
  shielded: {hp:90,  spd:1.2, col:"#6688ff", r:11, rwd:9,  shape:"sq",   spdDmg:14},
  splitter: {hp:105, spd:1.1, col:"#ff6600", r:12, rwd:8,  shape:"sqr",  spdDmg:16},
  phantom:  {hp:60,  spd:1.9, col:"#cc88ff", r:9,  rwd:10, shape:"tri",  spdDmg:11},
  berserker:{hp:145, spd:1.6, col:"#ff2244", r:11, rwd:14, shape:"star", spdDmg:18},
};

const BOSS_DEFS = [
  {id:"dread", hp:900,  spd:0.55, col:"#cc4400", r:26, rwd:70,  name:"DREADNOUGHT", shape:"oct",  desc:"Disables nearest tower when wounded"},
  {id:"void",  hp:700,  spd:0.95, col:"#aa00ff", r:22, rwd:90,  name:"VOID WALKER", shape:"star", desc:"Teleports forward every 5 seconds"},
  {id:"hive",  hp:1100, spd:0.45, col:"#ff88ff", r:28, rwd:110, name:"HIVE MIND",   shape:"hex",  desc:"Spawns swarm minions continuously"},
  {id:"pulse", hp:1000, spd:0.75, col:"#ffdd00", r:24, rwd:130, name:"PULSE STORM", shape:"tri",  desc:"Rotating shield blocks 80% damage"},
  {id:"nexus", hp:1500, spd:0.4,  col:"#00aaff", r:30, rwd:160, name:"NEXUS CORE",  shape:"sq",   desc:"Orbiting nodes must be destroyed first"},
];

const SHOP_ITEMS = [
  {id:"hull",    name:"Hull Plating",       desc:"+25 max HP per level",             costs:[50,90,140,200,280,380,500,680], max:8, col:"#00ff88"},
  {id:"dmg",     name:"Weapons R&D",        desc:"+12% tower damage per level",      costs:[80,145,230,360,520],            max:5, col:"#ff4400"},
  {id:"gas",     name:"Gas Reserves",       desc:"+70 starting gas per level",       costs:[60,100,155,225,315],            max:5, col:"#ffdd00"},
  {id:"grid",    name:"Tactical Grid",      desc:"+2 max tower slots per level",     costs:[120,220,360,520],               max:4, col:"#00cccc"}, 
  {id:"cdr",     name:"Cooling Systems",    desc:"-8% all tower cooldowns",          costs:[110,200,320],                   max:3, col:"#ffaa44"},
  {id:"cost",    name:"Rapid Prototyping",  desc:"-8% all tower costs per level",    costs:[130,230,360],                   max:3, col:"#00e8ff"},
  {id:"range",   name:"Signal Boost",       desc:"+15% all tower ranges",            costs:[90,165,270],                    max:3, col:"#88ffdd"},
  {id:"shards",  name:"Shard Optimizer",    desc:"+25% shard yield on kills",        costs:[100,185,300],                   max:3, col:"#aa88ff"},
  {id:"bounty",  name:"Kill Bounty",        desc:"+15% gas from enemy kills",        costs:[110,195,310],                   max:3, col:"#ffee66"},
  {id:"salvage", name:"Salvage Protocol",   desc:"+5% sell refund per level",        costs:[90,160,260],                    max:3, col:"#ddaaff"},
  {id:"revive",  name:"Emergency Protocol", desc:"1 free revive per run",            costs:[160,340],                       max:2, col:"#ff88ff"},
  {id:"repair",  name:"Auto-Repair",        desc:"Regen 2 HP per wave cleared",      costs:[200,380,560],                   max:3, col:"#88ff44"},
];

const PUP_DEFS = [
  {id:"strike", name:"Orbital Strike",  cost:120, col:"#ff4400", desc:"Deal 45% max HP to all enemies"},
  {id:"repair", name:"Repair Drones",   cost:110, col:"#00ff88", desc:"Restore 40 HP to base"},
  {id:"emp",    name:"EMP Burst",       cost:130, col:"#ffdd00", desc:"Stun all enemies for 5 seconds"},
  {id:"clock",  name:"Overclock",       cost:170, col:"#00e8ff", desc:"2× fire rate for 15 seconds"},
  {id:"shield", name:"Shield Matrix",   cost:200, col:"#ff88ff", desc:"Absorb next 80 damage"},
  {id:"nuke",   name:"Void Nuke",       cost:300, col:"#ff2244", desc:"Instantly destroy non-boss enemies"},
];

let META = {
  shards:0, bestWave:0,
  upgrades:{hull:0,dmg:0,gas:0,grid:0,cdr:0,cost:0,range:0,shards:0,bounty:0,salvage:0,revive:0,repair:0}
};
let G = null;
let selectedTower = "laser";
let gameView = "start";
let animId = null;
let msgTimer = null;
let inputBound = false;

function saveMeta() {
  try { window.localStorage.setItem('nf3_meta', JSON.stringify(META)); } catch(e) { console.error("Save Error", e); }
}
function loadMeta() {
  try {
    const val = window.localStorage.getItem('nf3_meta');
    if (val) {
      const m = JSON.parse(val);
      META.shards   = m.shards   || 0;
      META.bestWave = m.bestWave || 0;
      if (m.upgrades) META.upgrades = {...META.upgrades, ...m.upgrades};
    }
  } catch(e) { console.error("Load Error", e); }
}

const GW = () => document.getElementById("gc")?.width  || 780;
const GH = () => 590;

function initGame() {
  const up = META.upgrades;
  const maxHp     = 100 + up.hull * 25;
  const maxTowers = 12 + up.grid * 2; 
  G = {
    gas: 200 + up.gas * 70, hp: maxHp, maxHp,
    wave:0, frame:0, waveActive:false,
    spawnLeft:0, spawnPool:[],
    towers:[], mines:[], maxTowers,
    enemies:[], projectiles:[], particles:[],
    floatingTexts:[], // Added for juice!
    shake:0, flashRed:0, // Screen effects
    disabledTowers:{},
    buffs:{overclock:0, shield:0, emp:0},
    kills:0, pendingShards:0,
    revivesLeft: up.revive,
    nextId:1,
  };
  gameView = "playing";
  document.getElementById("overlay").style.display = "none";
  buildTowerBar();
  buildPupsPanel();
  cancelAnimationFrame(animId);
  syncUI();
  loop();
}

function startWave() {
  if (!G || G.waveActive) return;
  G.wave++;
  document.getElementById("wavebtn")?.classList.remove("ready");
  const wnum = document.getElementById("wnum");
  if (wnum) wnum.textContent = "#" + (G.wave + 1);

  const isBoss = G.wave % 5 === 0;
  if (isBoss) {
    const bIdx  = (Math.floor(G.wave/5)-1) % BOSS_DEFS.length;
    const cycle = Math.floor((Math.floor(G.wave/5)-1) / BOSS_DEFS.length);
    const def   = BOSS_DEFS[bIdx];
    G.enemies.push(mkBoss(def, 1 + cycle * 0.6));
    G.spawnLeft = 0;
    showBanner(`⚠  ${def.name}  —  ${def.desc}`, "#ff4400");
    G.shake = 18; // Huge screen shake on boss spawn
  } else {
    G.spawnPool = buildSpawnPool(G.wave);
    G.spawnLeft = G.spawnPool.length;
    const tier = G.wave >= 20 ? "ELITE" : G.wave >= 10 ? "HARD" : G.wave >= 5 ? "NORMAL" : "EASY";
    showBanner(`WAVE ${G.wave}  ·  ${tier}  ·  ${G.spawnLeft} enemies incoming`, "#0f6");
  }
  G.waveActive = true;

  if ([10,20,30,50].includes(G.wave)) {
    const bonus = G.wave * 3;
    META.shards += bonus;
    saveMeta();
    setTimeout(() => {
      showMsg(`⭐ MILESTONE  +${bonus} SHARDS`, "#ffdd00");
      addFloatText(GW()/2, GH()/2, `+${bonus} ◈`, "#ffdd00");
    }, 2600);
  }
  syncUI();
}

function buildSpawnPool(wave) {
  const count = Math.min(7 + wave * 2, 60);
  const pool  = ["scout"];
  if (wave >= 2)  pool.push("tank");
  if (wave >= 3)  pool.push("swarm","swarm");
  if (wave >= 5)  pool.push("speeder");
  if (wave >= 7)  pool.push("shielded");
  if (wave >= 9)  pool.push("splitter");
  if (wave >= 11) pool.push("phantom");
  if (wave >= 13) pool.push("berserker");
  if (wave >= 8)  pool.push("tank","shielded");
  if (wave >= 14) pool.push("berserker","speeder");
  const out = [];
  for (let i = 0; i < count; i++) out.push(pool[Math.floor(Math.random()*pool.length)]);
  return out;
}

function mkEnemy(type, wave, nosplit) {
  const def = ENEMY_DEFS[type];
  const hpScale  = Math.pow(1.13, wave);
  const spdScale = Math.min(1 + wave * 0.05, 3.5);
  const id = G.nextId++;
  return {
    id, type,
    x: GW() + 30 + Math.random()*60,
    y: 50 + Math.random()*(GH()-100),
    hp: def.hp*hpScale, maxHp: def.hp*hpScale,
    spd: def.spd*spdScale,
    col:def.col, r:def.r, rwd:def.rwd, shape:def.shape, spdDmg:def.spdDmg,
    slowUntil:0, freezeUntil:0, stunUntil:0,
    shielded:  type==="shielded",
    shieldHp:  type==="shielded" ? 60+wave*4 : 0,
    shieldMax: type==="shielded" ? 60+wave*4 : 0,
    doSplit:   type==="splitter" && !nosplit,
    phantom:   type==="phantom",
    phaseAngle:Math.random()*Math.PI*2,
    phased:false, raging:false, boss:false, wave,
  };
}

function mkBoss(def, scale) {
  const id = G.nextId++;
  const hp = def.hp * scale * 1.4;
  const b = {
    id, type:def.id,
    x:GW()+60, y:GH()*0.5,
    hp, maxHp:hp,
    spd: def.spd*(1+(scale-1)*0.3),
    col:def.col, r:def.r, rwd:def.rwd,
    shape:def.shape, spdDmg:28,
    slowUntil:0, freezeUntil:0, stunUntil:0,
    boss:true, bossId:def.id, bossName:def.name,
    abilTimer:0, abilCd:220,
    shielded:false, shieldHp:0, shieldMax:0,
    doSplit:false, phantom:false, raging:false,
    shieldPct: def.id==="pulse" ? 0.8 : 0,
    shieldPhase:0, nodes:[], wave:G.wave,
  };
  if (def.id === "nexus") {
    for (let i=0;i<4;i++) {
      const angle = (i/4)*Math.PI*2;
      const nd = {
        id:G.nextId++, type:"node",
        x:b.x+Math.cos(angle)*65, y:b.y+Math.sin(angle)*65,
        hp:200*scale, maxHp:200*scale,
        spd:0, col:"#00aaff", r:10, rwd:0,
        shape:"dot", spdDmg:0,
        orbitAngle:angle, orbitParent:id,
        slowUntil:0, freezeUntil:0, stunUntil:0,
        boss:false, doSplit:false, phantom:false, raging:false,
        shielded:false, shieldHp:0, shieldMax:0, node:true, wave:G.wave,
      };
      b.nodes.push(nd.id);
      G.enemies.push(nd);
    }
  }
  return b;
}

function activatePup(id) {
  if (!G) return;
  const def = PUP_DEFS.find(p=>p.id===id);
  if (!def || G.gas < def.cost) return;
  G.gas -= def.cost;
  switch(id) {
    case "strike":
      G.enemies.forEach(e => { e.hp -= e.boss ? e.maxHp*0.1 : e.maxHp*0.45; });
      spawnParticles(GW()/2, GH()/2, "#ff4400", 60, 5);
      G.shake = 15;
      showMsg("☄ ORBITAL STRIKE", "#ff4400"); break;
    case "repair":
      G.hp = Math.min(G.maxHp, G.hp+40);
      addFloatText(30, GH()/2, "+40 HP", "#00ff88");
      showMsg("✚ REPAIR DRONES", "#00ff88"); break;
    case "emp":
      G.buffs.emp = 300;
      G.enemies.forEach(e => e.stunUntil = G.frame+300);
      showMsg("⚡ EMP BURST  —  5s STUN", "#ffdd00"); break;
    case "clock":
      G.buffs.overclock = 900;
      showMsg("⏩ OVERCLOCK  —  2× FIRE RATE", "#00e8ff"); break;
    case "shield":
      G.buffs.shield += 80;
      showMsg("⬡ SHIELD MATRIX  +80", "#ff88ff"); break;
    case "nuke":
      const n = G.enemies.filter(e=>!e.node&&!e.boss).length;
      G.enemies.forEach(e=>{ if(!e.node&&!e.boss) e.hp=0; });
      G.enemies.filter(e=>e.boss).forEach(e=>e.hp-=e.maxHp*0.2);
      spawnParticles(GW()/2, GH()/2, "#ff2244", 80, 8);
      G.shake = 25;
      G.flashRed = 10;
      showMsg(`☢ VOID NUKE  —  ${n} DESTROYED`, "#ff2244"); break;
  }
  syncUI();
}

function openShop() { document.getElementById("shop-modal").style.display = "block"; renderShop(); }
function closeShop() { document.getElementById("shop-modal").style.display = "none"; }
function renderShop() {
  const div = document.getElementById("shop-items");
  if (!div) return;
  const ss = document.getElementById("shop-shards");
  if (ss) ss.textContent = META.shards;
  const bw = document.getElementById("shop-best");
  if (bw) bw.textContent = META.bestWave;
  div.innerHTML = SHOP_ITEMS.map(item => {
    const lv = META.upgrades[item.id]||0;
    const nextCost = lv < item.max ? item.costs[lv] : null;
    const canBuy = nextCost !== null && META.shards >= nextCost;
    return `<div class="shop-card">
      <div style="width:8px;height:44px;background:${item.col};opacity:0.8;flex-shrink:0;border-radius:2px;box-shadow:0 0 5px ${item.col}"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:bold;color:${item.col};text-transform:uppercase">${item.name} <span style="color:#556;font-size:10px">Lv ${lv}/${item.max}</span></div>
        <div style="font-size:10px;color:#778;margin-top:4px">${item.desc}</div>
      </div>
      ${nextCost!==null
        ? `<button onclick="window.buyUpgrade('${item.id}')" style="background:${canBuy?'#060f06':'#050505'};border:1px solid ${canBuy?'#1a4a1a':'#222'};color:${canBuy?item.col:'#444'};padding:6px 12px;cursor:pointer;font-family:inherit;font-size:11px;white-space:nowrap;flex-shrink:0;border-radius:2px">${nextCost} ◈</button>`
        : `<div style="font-size:11px;color:#4a4a4a;padding:5px 10px;flex-shrink:0;font-weight:bold">MAXED</div>`}
    </div>`;
  }).join("");
}
function buyUpgrade(id) {
  const item = SHOP_ITEMS.find(i=>i.id===id);
  if (!item) return;
  const lv = META.upgrades[id]||0;
  if (lv >= item.max) return;
  const cost = item.costs[lv];
  if (META.shards < cost) return;
  META.shards -= cost;
  META.upgrades[id] = lv+1;
  saveMeta();
  renderShop();
  if (G) G.maxTowers = 12 + META.upgrades.grid*2; 
}

// Float text utility for addictive juice
function addFloatText(x, y, text, col, size = 12) {
  if (!G) return;
  G.floatingTexts.push({x, y, text, col, size, life: 40, maxLife: 40, vy: -1.2 - Math.random()});
}

function loop() {
  if (gameView !== "playing") return;
  const canvas = document.getElementById("gc");
  if (canvas) tick(canvas.getContext("2d"), canvas.width, canvas.height);
  animId = requestAnimationFrame(loop);
}

function tick(ctx, W, H) {
  const f = ++G.frame;
  const up = META.upgrades;

  if (G.buffs.overclock > 0) G.buffs.overclock--;
  if (G.buffs.shield    > 0) G.buffs.shield--;
  if (G.buffs.emp       > 0) G.buffs.emp--;
  if (G.flashRed        > 0) G.flashRed--;

  const dmgMult    = 1 + up.dmg    * 0.12;
  const rangeMult  = 1 + up.range  * 0.15;
  const bountyMult = 1 + up.bounty * 0.15;
  const shardMult  = 1 + up.shards * 0.25;
  const cdMult     = (G.buffs.overclock > 0 ? 0.5 : 1) * (1 - up.cdr * 0.08);

  if (G.waveActive && G.spawnLeft > 0) {
    const interval = Math.max(18, 80 - G.wave*3);
    if (f % interval === 0) {
      G.enemies.push(mkEnemy(G.spawnPool[G.spawnPool.length - G.spawnLeft], G.wave));
      G.spawnLeft--;
    }
  }

  if (G.waveActive && G.spawnLeft<=0 && G.enemies.filter(e=>!e.node).length===0) {
    G.waveActive = false;
    const gasBonus = 25 + G.wave*12;
    G.gas += gasBonus;
    const earned = Math.floor(G.pendingShards * shardMult);
    META.shards += earned;
    G.pendingShards = 0;
    if (up.repair > 0) G.hp = Math.min(G.maxHp, G.hp + up.repair*2);
    saveMeta();
    showMsg(`WAVE ${G.wave} CLEARED  ·  +${gasBonus} GAS  ·  +${earned} ◈`, "#0f6");
    addFloatText(W/2, H/2 - 30, `+${gasBonus} GAS`, "#0f6", 20);
    document.getElementById("wavebtn")?.classList.add("ready");
    const wn = document.getElementById("wnum");
    if (wn) wn.textContent = "#" + (G.wave+1);
  }

  // Draw Background and apply screen shake!
  ctx.save();
  if (G.shake > 0) {
    ctx.translate((Math.random()-0.5)*G.shake, (Math.random()-0.5)*G.shake);
    G.shake *= 0.85; // dampen shake
    if (G.shake < 0.5) G.shake = 0;
  }

  ctx.fillStyle = G.flashRed > 0 ? `rgba(50,0,0,0.8)` : "#020509";
  ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = "rgba(0,100,50,0.06)";
  ctx.lineWidth = 1;
  // Scrolling grid effect for forward momentum!
  const offsetX = (f * 0.3) % GRID;
  for (let x=offsetX;x<=W;x+=GRID){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for (let y=0;y<=H;y+=GRID){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

  const bW=62, hpPct=Math.max(0,G.hp/G.maxHp);
  const bCol = hpPct>0.6?"#0f6":hpPct>0.3?"#ff8":"#f44";
  ctx.fillStyle="rgba(0,25,15,0.7)"; ctx.fillRect(0,0,bW,H);
  ctx.strokeStyle=bCol; ctx.lineWidth=2; ctx.strokeRect(1,1,bW-2,H-2);
  ctx.globalAlpha=0.2; ctx.strokeStyle=bCol; ctx.lineWidth=1;
  for(let y=40;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(bW,y);ctx.stroke();}
  ctx.globalAlpha=1;
  ctx.fillStyle=bCol; ctx.font="bold 10px Courier New"; ctx.textAlign="center";
  ctx.fillText("BASE",bW/2,H/2-10); 
  ctx.font="bold 12px Courier New";
  ctx.fillText(Math.ceil(G.hp),bW/2,H/2+6);
  ctx.textAlign="left";
  if (G.buffs.shield>0) {
    ctx.strokeStyle="#ff88ff"; ctx.lineWidth=3;
    ctx.globalAlpha=0.4+0.35*Math.sin(f*0.15);
    ctx.strokeRect(0,0,bW,H); ctx.globalAlpha=1;
  }

  G.mines.forEach(m => {
    ctx.strokeStyle=m.armed?"#ff8800":"#443300"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(m.x,m.y,14,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle=m.armed?"rgba(255,136,0,0.15)":"rgba(30,20,0,0.3)"; ctx.fill();
    ctx.strokeStyle=m.armed?"#ff8800":"#443300"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(m.x-6,m.y-6); ctx.lineTo(m.x+6,m.y+6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m.x+6,m.y-6); ctx.lineTo(m.x-6,m.y+6); ctx.stroke();
    if (!m.armed) {
      ctx.strokeStyle="#555"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(m.x,m.y,16,-Math.PI/2,-Math.PI/2+(1-m.rearmTimer/300)*Math.PI*2); ctx.stroke();
    }
  });

  G.towers.forEach(t => {
    const disabled = G.disabledTowers[t.id] && G.disabledTowers[t.id] > f;
    ctx.globalAlpha = disabled ? 0.35 : 1;
    drawTower(ctx, t, f);
    ctx.globalAlpha = 1;

    // FIX: Siphon Exploit Solved Strictly
    if (t.type === "income") {
      if (!G.waveActive) {
        t.lastShot = f; // Reset timer so it doesn't pop instantly when wave starts
        ctx.fillStyle = "#555";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("zZz", t.x+25, t.y-4);
        ctx.textAlign = "left";
        return;
      }
      if (f - t.lastShot > Math.ceil(t.cd*cdMult)) {
        G.gas += t.yield;
        t.lastShot = f;
        spawnParticles(t.x+25, t.y+25, t.col, 6, 2);
        addFloatText(t.x+25, t.y-5, `+${t.yield}`, "#00ff88");
      }
      return;
    }
    
    if (disabled) return;

    const effCd = Math.max(4, Math.ceil(t.cd*cdMult));
    if (f - t.lastShot < effCd) return;
    const tx=t.x+25, ty=t.y+25;
    const effRange = t.range*rangeMult;
    const inRange = G.enemies
      .filter(e => !e.node && !e.phased && Math.hypot(e.x-tx,e.y-ty)<=effRange)
      .sort((a,b) => a.x-b.x);
    if (!inRange.length) return;
    const target = inRange[0];
    t.lastShot = f;

    if (t.type==="single") {
      G.projectiles.push({x:tx,y:ty,tx:target.x,ty:target.y,dmg:t.dmg*dmgMult,col:t.col,type:"laser",target,life:8});
    } else if (t.type==="aoe") {
      let bx=target.x, by=target.y, bc=1;
      inRange.slice(1,6).forEach(e=>{if(Math.hypot(e.x-target.x,e.y-target.y)<t.radius){bx+=e.x;by+=e.y;bc++;}});
      G.projectiles.push({x:tx,y:ty,tx:bx/bc,ty:by/bc,dmg:t.dmg*dmgMult,col:t.col,type:"mortar",radius:t.radius,life:90});
    } else if (t.type==="slow") {
      inRange.forEach(e => e.slowUntil=f+32);
      ctx.strokeStyle=t.col; ctx.lineWidth=1; ctx.globalAlpha=0.25;
      ctx.beginPath(); ctx.arc(tx,ty,effRange,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=1;
    } else if (t.type==="chain") {
      const chain=[target];
      for(let i=1;i<t.chains;i++){
        const last=chain[chain.length-1];
        const next=inRange
          .filter(e=>!chain.includes(e))
          .sort((a,b)=>Math.hypot(a.x-last.x,a.y-last.y)-Math.hypot(b.x-last.x,b.y-last.y))[0];
        if(!next) break;
        chain.push(next);
      }
      chain.forEach((e,i)=>{
        const from=i===0?{x:tx,y:ty}:chain[i-1];
        G.projectiles.push({x:from.x,y:from.y,tx:e.x,ty:e.y,dmg:t.dmg*dmgMult*(1-i*0.2),col:t.col,type:"laser",target:e,life:7});
      });
    } else if (t.type==="freeze") {
      G.projectiles.push({x:tx,y:ty,tx:target.x,ty:target.y,dmg:t.dmg*dmgMult,col:t.col,type:"cryo",target,freeze:t.freeze,life:8});
    } else if (t.type==="pierce") {
      const pts=G.enemies.filter(e=>!e.node && Math.abs(e.y-ty)<28);
      G.projectiles.push({x:tx,y:ty,targets:pts,dmg:t.dmg*dmgMult,col:t.col,type:"rail",life:10});
    }
  });

  G.mines.forEach(m => {
    if (!m.armed) {
      m.rearmTimer=Math.max(0,m.rearmTimer-1);
      if(m.rearmTimer<=0) m.armed=true;
      return;
    }
    for (let i=G.enemies.length-1;i>=0;i--) {
      const e=G.enemies[i];
      if (e.node) continue;
      if (Math.hypot(e.x-m.x,e.y-m.y) < m.triggerR) {
        G.enemies.forEach(e2=>{if(!e2.node&&Math.hypot(e2.x-m.x,e2.y-m.y)<m.radius) applyDmg(e2,m.dmg*dmgMult);});
        spawnParticles(m.x,m.y,"#ff8800",50,5);
        m.armed=false; m.rearmTimer=300;
        G.shake = 6; // screen shake on trap hit
        ctx.fillStyle="rgba(255,136,0,0.5)"; ctx.beginPath(); ctx.arc(m.x,m.y,m.radius,0,Math.PI*2); ctx.fill();
        break;
      }
    }
  });

  for (let i=G.projectiles.length-1;i>=0;i--) {
    const p=G.projectiles[i];
    p.life--;
    if (p.life<=0 && p.type!=="mortar") { G.projectiles.splice(i,1); continue; }
    
    if (p.type==="laser"||p.type==="cryo") {
      ctx.strokeStyle=p.col; ctx.lineWidth=3; ctx.globalAlpha=p.life/8;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.tx,p.ty); ctx.stroke(); ctx.globalAlpha=1;
      if (p.life===7) {
        applyDmg(p.target, p.dmg);
        if (p.type==="cryo") p.target.freezeUntil = f + p.freeze;
        spawnParticles(p.tx,p.ty,p.col,6,2);
      }
    } else if (p.type==="rail") {
      ctx.strokeStyle=p.col; ctx.lineWidth=6; ctx.globalAlpha=p.life/10;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(W+60,p.y); ctx.stroke();
      ctx.lineWidth=2; ctx.strokeStyle="#fff";
      ctx.beginPath(); ctx.moveTo(p.x,p.y-3); ctx.lineTo(W+60,p.y-3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x,p.y+3); ctx.lineTo(W+60,p.y+3); ctx.stroke();
      ctx.globalAlpha=1;
      if(p.life===9){ p.targets.forEach(e=>{if(e.hp>0) applyDmg(e,p.dmg);}); }
    } else if (p.type==="mortar") {
      const ang=Math.atan2(p.ty-p.y,p.tx-p.x);
      p.x+=Math.cos(ang)*8; p.y+=Math.sin(ang)*8;
      ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(255,100,0,0.3)"; ctx.beginPath(); ctx.arc(p.x,p.y,10,0,Math.PI*2); ctx.fill();
      if (Math.hypot(p.tx-p.x,p.ty-p.y)<12) {
        spawnParticles(p.x,p.y,p.col,35,4.5);
        ctx.strokeStyle=p.col; ctx.lineWidth=1; ctx.globalAlpha=0.4;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=1;
        G.enemies.forEach(e=>{if(!e.node&&Math.hypot(e.x-p.x,e.y-p.y)<p.radius) applyDmg(e,p.dmg);});
        G.projectiles.splice(i,1);
      }
    }
  }

  G.enemies.filter(e=>e.boss).forEach(boss=>{
    boss.abilTimer++;
    if (boss.abilTimer<boss.abilCd) return;
    boss.abilTimer=0;
    if (boss.bossId==="dread" && boss.hp<boss.maxHp*0.8) {
      let near=null,nd=Infinity;
      G.towers.forEach(t=>{const d=Math.hypot(t.x+25-boss.x,t.y+25-boss.y);if(d<nd){nd=d;near=t;}});
      if(near){G.disabledTowers[near.id]=f+280;spawnParticles(near.x+25,near.y+25,"#cc4400",14,2.5);}
    } else if (boss.bossId==="void") {
      boss.x=Math.max(80,boss.x-200);
      spawnParticles(boss.x,boss.y,"#aa00ff",25,4);
    } else if (boss.bossId==="hive") {
      for(let i=0;i<3;i++){
        if(G.enemies.length<70){
          const sw=mkEnemy("swarm",Math.max(1,G.wave-2));
          sw.x=boss.x+(Math.random()-0.5)*90; sw.y=boss.y+(Math.random()-0.5)*90;
          G.enemies.push(sw);
        }
      }
    } else if (boss.bossId==="pulse") {
      boss.shieldPhase=(boss.shieldPhase||0)+1;
    } else if (boss.bossId==="nexus") {
      if (G.enemies.filter(e=>boss.nodes.includes(e.id)).length===0) {
        boss.nodes=[];
        for(let i=0;i<4;i++){
          const angle=(i/4)*Math.PI*2;
          const nd={
            id:G.nextId++,type:"node",x:boss.x+Math.cos(angle)*65,y:boss.y+Math.sin(angle)*65,
            hp:150,maxHp:150,spd:0,col:"#00aaff",r:10,rwd:0,shape:"dot",spdDmg:0,
            orbitAngle:angle,orbitParent:boss.id,slowUntil:0,freezeUntil:0,stunUntil:0,
            boss:false,doSplit:false,phantom:false,raging:false,shielded:false,shieldHp:0,shieldMax:0,node:true,wave:G.wave
          };
          boss.nodes.push(nd.id); G.enemies.push(nd);
        }
      }
    }
  });

  for (let i=G.enemies.length-1;i>=0;i--) {
    const e=G.enemies[i];
    if (e.node) {
      const parent=G.enemies.find(b=>b.id===e.orbitParent);
      if(!parent){G.enemies.splice(i,1);continue;}
      e.orbitAngle+=0.02;
      e.x=parent.x+Math.cos(e.orbitAngle)*65;
      e.y=parent.y+Math.sin(e.orbitAngle)*65;
      drawEnemyShape(ctx,e,f);
      continue;
    }
    const stunned=f<e.stunUntil, frozen=f<e.freezeUntil, slowed=f<e.slowUntil&&!frozen;
    if(!stunned&&!frozen){
      if(e.phantom){e.phaseAngle=(e.phaseAngle||0)+0.035;e.phased=Math.sin(e.phaseAngle)>0.55;}
      if(!e.raging&&e.type==="berserker"&&e.hp<e.maxHp*0.3) e.raging=true;
      const effSpd=slowed?e.spd*0.35:e.raging?e.spd*1.75:e.spd;
      const ang=Math.atan2(GH()*0.5-e.y,31-e.x);
      e.x+=Math.cos(ang)*effSpd;
      e.y+=Math.sin(ang)*effSpd;
    }
    if(e.x<62+e.r){
      let dmg=e.boss?30:(e.spdDmg||10);
      if(G.buffs.shield>0){G.buffs.shield-=dmg;if(G.buffs.shield<0){G.hp+=G.buffs.shield;G.buffs.shield=0;}}
      else G.hp-=dmg;
      
      G.shake = 5 + (e.boss ? 10 : 0); // Heavy shake when base hit
      G.flashRed = 8;
      
      spawnParticles(62,e.y,"#ff2200",15,3);
      addFloatText(62, e.y, `-${dmg}`, "#ff2200", 16); // floating damage text
      
      G.enemies.splice(i,1);
      if(G.hp<=0){
        if(G.revivesLeft>0){
          G.revivesLeft--; G.hp=Math.ceil(G.maxHp*0.4);
          showMsg("☯ EMERGENCY REVIVAL — HULL 40%","#ff88ff");
          G.shake = 20; // massive shake for revival
        } else{ gameOver(); ctx.restore(); return; }
      }
      continue;
    }
    drawEnemyShape(ctx,e,f);
  }

  // Handle dead enemies safely
  for(let i=G.enemies.length-1;i>=0;i--){
    const e=G.enemies[i];
    if(e.hp>0) continue;
    
    if(e.doSplit){
      for(let j=0;j<2;j++){
        const s=mkEnemy("scout",Math.max(1,e.wave-1),true);
        s.x=e.x+(Math.random()-0.5)*40;
        s.y=e.y+(Math.random()-0.5)*40;
        G.enemies.push(s); 
      }
    }
    if(!e.node){
      G.kills++;
      const gRwd = Math.ceil(e.rwd*bountyMult);
      G.gas+=gRwd;
      G.pendingShards+=e.boss?e.rwd:Math.ceil(e.rwd*0.35);
      
      // Floating combat juice!
      addFloatText(e.x, e.y, `+${gRwd}`, "#0f6", e.boss?16:11);
      if(e.boss) {
        addFloatText(e.x, e.y+20, `+${e.rwd} ◈`, "#aa88ff", 16);
        G.shake = 20; // shake when boss dies
      }
    }
    spawnParticles(e.x,e.y,e.col,e.boss?55:15,e.boss?5:2.5);
    G.enemies.splice(i,1);
  }

  // Draw Particles
  for(let i=G.particles.length-1;i>=0;i--){
    const p=G.particles[i];
    p.x+=p.vx;p.y+=p.vy;p.vx*=0.93;p.vy*=0.93;p.life--;
    ctx.globalAlpha=Math.max(0,p.life/p.maxLife);
    ctx.fillStyle=p.col;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
    if(p.life<=0)G.particles.splice(i,1);
  }
  ctx.globalAlpha=1;

  // Draw Floating Text (The Juice)
  for(let i=G.floatingTexts.length-1; i>=0; i--){
    const ft = G.floatingTexts[i];
    ft.y += ft.vy;
    ft.life--;
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.fillStyle = ft.col;
    ctx.font = `bold ${ft.size}px Courier New`;
    ctx.textAlign = "center";
    ctx.fillText(ft.text, ft.x, ft.y);
    if(ft.life <= 0) G.floatingTexts.splice(i, 1);
  }
  ctx.globalAlpha=1; ctx.textAlign="left";

  if(selectedTower&&G.mouse){
    const{gx,gy}=G.mouse;
    if(selectedTower==="sell"){
      const on=G.towers.some(t=>t.x===gx&&t.y===gy)||G.mines.some(m=>Math.hypot(m.x-(gx+25),m.y-(gy+25))<32);
      ctx.fillStyle=on?"rgba(255,0,0,0.4)":"rgba(255,0,0,0.1)";
      ctx.fillRect(gx,gy,GRID,GRID);
    } else {
      const def=TOWER_DEFS[selectedTower];
      const valid=gx>=62&&!G.towers.some(t=>t.x===gx&&t.y===gy)&&!G.mines.some(m=>Math.hypot(m.x-(gx+25),m.y-(gy+25))<32);
      ctx.fillStyle=valid?"rgba(0,255,100,0.2)":"rgba(255,0,0,0.2)";
      ctx.fillRect(gx,gy,GRID,GRID);
      if(valid&&def.range>0){
        ctx.strokeStyle=def.col; ctx.lineWidth=1; ctx.globalAlpha=0.3;
        ctx.beginPath(); ctx.arc(gx+25,gy+25,def.range*rangeMult,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=1;
      }
    }
  }

  ctx.restore(); // Restore from screen shake translate

  if (f%15===0) syncUI();
}

function drawTower(ctx, t, f) {
  ctx.fillStyle="#081408"; ctx.fillRect(t.x+4,t.y+4,42,42);
  ctx.strokeStyle="#1a3a1a"; ctx.lineWidth=1; ctx.strokeRect(t.x+4,t.y+4,42,42);
  ctx.strokeStyle=t.col; ctx.lineWidth=2;
  const cx=t.x+25, cy=t.y+25;
  if(t.type==="single"){
    ctx.beginPath();ctx.arc(cx,cy,10,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx,cy-14);ctx.lineTo(cx,cy+14);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-14,cy);ctx.lineTo(cx+14,cy);ctx.stroke();
  } else if(t.type==="aoe"){
    ctx.beginPath();ctx.rect(cx-10,cy-10,20,20);ctx.stroke();
    ctx.fillStyle=t.col;ctx.fillRect(cx-4,cy-4,8,8);
  } else if(t.type==="slow"){
    ctx.beginPath();ctx.moveTo(cx,cy-12);ctx.lineTo(cx+12,cy);ctx.lineTo(cx,cy+12);ctx.lineTo(cx-12,cy);ctx.closePath();ctx.stroke();
    ctx.globalAlpha=0.5+0.5*Math.sin(f*0.1);ctx.fillStyle=t.col;ctx.fill();ctx.globalAlpha=1;
  } else if(t.type==="income"){
    ctx.beginPath();ctx.arc(cx,cy,12,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=t.col;ctx.globalAlpha=0.3+0.4*Math.sin(f*0.05);ctx.fill();ctx.globalAlpha=1;
  } else if(t.type==="chain"){
    ctx.beginPath();ctx.moveTo(cx-8,cy-8);ctx.lineTo(cx+8,cy+8);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+8,cy-8);ctx.lineTo(cx-8,cy+8);ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,6,0,Math.PI*2);ctx.stroke();
  } else if(t.type==="freeze"){
    ctx.beginPath();ctx.moveTo(cx,cy-12);ctx.lineTo(cx+10,cy+8);ctx.lineTo(cx-10,cy+8);ctx.closePath();ctx.stroke();
    ctx.fillStyle=t.col;ctx.fill();
  } else if(t.type==="pierce"){
    ctx.beginPath();ctx.moveTo(cx-14,cy-6);ctx.lineTo(cx+14,cy-6);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-14,cy+6);ctx.lineTo(cx+14,cy+6);ctx.stroke();
    ctx.fillStyle=t.col;ctx.fillRect(cx-8,cy-2,16,4);
  }
}

function drawEnemyShape(ctx, e, f) {
  if(e.phased){ctx.globalAlpha=0.3;}
  ctx.translate(e.x,e.y);
  if(e.raging) ctx.rotate(f*0.15);
  ctx.fillStyle="#000"; ctx.strokeStyle=e.col; ctx.lineWidth=2;
  ctx.beginPath();
  if(e.shape==="tri"){ctx.moveTo(e.r,0);ctx.lineTo(-e.r,e.r);ctx.lineTo(-e.r,-e.r);ctx.closePath();}
  else if(e.shape==="hex"){for(let i=0;i<6;i++){ctx.lineTo(e.r*Math.cos(i*Math.PI/3),e.r*Math.sin(i*Math.PI/3));}ctx.closePath();}
  else if(e.shape==="sq"){ctx.rect(-e.r,-e.r,e.r*2,e.r*2);}
  else if(e.shape==="sqr"){ctx.rect(-e.r,-e.r,e.r*2,e.r*2);ctx.moveTo(0,-e.r);ctx.lineTo(0,e.r);ctx.moveTo(-e.r,0);ctx.lineTo(e.r,0);}
  else if(e.shape==="dia"){ctx.moveTo(e.r,0);ctx.lineTo(0,e.r);ctx.lineTo(-e.r,0);ctx.lineTo(0,-e.r);ctx.closePath();}
  else if(e.shape==="star"){for(let i=0;i<10;i++){const r=i%2===0?e.r:e.r/2;ctx.lineTo(r*Math.cos(i*Math.PI/5),r*Math.sin(i*Math.PI/5));}ctx.closePath();}
  else if(e.shape==="oct"){for(let i=0;i<8;i++){ctx.lineTo(e.r*Math.cos(i*Math.PI/4),e.r*Math.sin(i*Math.PI/4));}ctx.closePath();}
  else if(e.shape==="dot"){ctx.arc(0,0,e.r,0,Math.PI*2);}
  ctx.fill(); ctx.stroke();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalAlpha=1;

  if(e.shielded && e.shieldHp>0){
    ctx.strokeStyle="#6688ff"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(e.x,e.y,e.r+4,0,Math.PI*2); ctx.stroke();
  }
  if(e.boss && e.bossId==="pulse"){
    ctx.strokeStyle="#ffdd00"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(e.x,e.y,e.r+12,e.shieldPhase*0.1,e.shieldPhase*0.1+Math.PI); ctx.stroke();
  }
  if(f<e.freezeUntil){
    ctx.fillStyle="rgba(136,221,255,0.6)"; ctx.beginPath(); ctx.arc(e.x,e.y,e.r+2,0,Math.PI*2); ctx.fill();
  } else if(f<e.stunUntil){
    ctx.strokeStyle="#ffdd00"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(e.x-8,e.y-12); ctx.lineTo(e.x+2,e.y-12); ctx.lineTo(e.x-2,e.y-18); ctx.lineTo(e.x+8,e.y-18); ctx.stroke();
  }
  if(e.hp<e.maxHp && !e.node){
    ctx.fillStyle="#300"; ctx.fillRect(e.x-12,e.y+e.r+4,24,3);
    ctx.fillStyle="#0f6"; ctx.fillRect(e.x-12,e.y+e.r+4,24*(e.hp/e.maxHp),3);
  }
}

function applyDmg(e, amt) {
  if(e.boss && e.bossId==="pulse"){
    const ang=Math.atan2(e.y-GH()/2, e.x-GW());
    const shieldAng=e.shieldPhase*0.1;
    let diff=Math.abs(ang-shieldAng)%(Math.PI*2);
    if(diff>Math.PI) diff=Math.PI*2-diff;
    if(diff<Math.PI/2) amt*=(1-e.shieldPct);
  }
  if(e.shielded && e.shieldHp>0){
    e.shieldHp-=amt;
    if(e.shieldHp<0){e.hp+=e.shieldHp; e.shieldHp=0;}
  } else { e.hp-=amt; }
}

function spawnParticles(x, y, col, count, spd) {
  for(let i=0;i<count;i++){
    const ang=Math.random()*Math.PI*2;
    const v=Math.random()*spd;
    G.particles.push({x,y,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v,col,r:1+Math.random()*2,life:15+Math.random()*20,maxLife:35});
  }
}

function showMsg(txt, col) {
  const m = document.getElementById("msg");
  if (!m) return;
  m.textContent = txt; m.style.color = col; m.style.opacity = 1;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(()=>m.style.opacity=0, 2000);
}
function showBanner(txt, col) {
  const b = document.getElementById("banner");
  if (!b) return;
  b.textContent = txt; b.style.color = col; b.style.opacity = 1;
  setTimeout(()=>b.style.opacity=0, 3000);
}
function gameOver() {
  gameView = "over";
  if(G.wave > META.bestWave) META.bestWave = G.wave;
  saveMeta();
  document.getElementById("overlay").style.display = "flex";
  document.getElementById("gameover-info").style.display = "block";
  document.getElementById("gameover-info").innerHTML = `
    WAVE REACHED: <span style="color:#fff">${G.wave}</span><br/>
    ENEMIES DESTROYED: <span style="color:#fff">${G.kills}</span><br/>
    SHARDS EARNED: <span style="color:#aa88ff">${META.shards} ◈</span>
  `;
}

function sellStructureAt(gx,gy){
  if(!G) return;
  const pct=0.6+META.upgrades.salvage*0.05;
  let refund=0,sold=false;
  const ti=G.towers.findIndex(t=>t.x===gx&&t.y===gy);
  if(ti>=0){refund=Math.floor(G.towers[ti].cost*pct);G.towers.splice(ti,1);sold=true;}
  else{const mi=G.mines.findIndex(m=>Math.hypot(m.x-(gx+25),m.y-(gy+25))<32);if(mi>=0){refund=Math.floor(G.mines[mi].cost*pct);G.mines.splice(mi,1);sold=true;}}
  if(sold){G.gas+=refund;spawnParticles(gx+25,gy+25,"#fff",15,3);showMsg(`SOLD +${refund} GAS`,"#aaa");syncUI();}
}

function setupInput(){
  if(inputBound) return;
  inputBound=true;
  const canvas=document.getElementById("gc");
  if(!canvas) return;
  canvas.addEventListener("mousemove",e=>{
    if(!G) return;
    const r=canvas.getBoundingClientRect();
    const mx=e.clientX-r.left,my=e.clientY-r.top;
    G.mouse={x:mx,y:my,gx:Math.floor(mx/GRID)*GRID,gy:Math.floor(my/GRID)*GRID};
  });
  canvas.addEventListener("mouseleave",()=>{if(G)G.mouse=null;});
  canvas.addEventListener("contextmenu",e=>{
    e.preventDefault();
    if(!G||gameView!=="playing") return;
    const r=canvas.getBoundingClientRect();
    sellStructureAt(Math.floor((e.clientX-r.left)/GRID)*GRID,Math.floor((e.clientY-r.top)/GRID)*GRID);
  });
  canvas.addEventListener("click",e=>{
    if(!G||gameView!=="playing") return;
    const r=canvas.getBoundingClientRect();
    const gx=Math.floor((e.clientX-r.left)/GRID)*GRID;
    const gy=Math.floor((e.clientY-r.top)/GRID)*GRID;
    if(gx<62) return;
    if(selectedTower==="sell"){sellStructureAt(gx,gy);return;}
    if(G.towers.length+G.mines.length>=G.maxTowers){showMsg(`SLOT LIMIT (${G.maxTowers}) — upgrade in shop`,"#f84");return;}
    const def=TOWER_DEFS[selectedTower];
    const cost=Math.ceil(def.cost*(1-META.upgrades.cost*0.08));
    if(G.gas<cost){showMsg("NOT ENOUGH GAS","#f84");return;}
    if(selectedTower==="mine"){
      if(G.mines.some(m=>Math.hypot(m.x-(gx+25),m.y-(gy+25))<32)) return;
      G.gas-=cost;
      G.mines.push({x:gx+25,y:gy+25,armed:true,triggerR:def.triggerR,radius:def.radius,dmg:def.dmg,rearmTimer:0,cost});
    } else {
      if(G.towers.some(t=>t.x===gx&&t.y===gy)) return;
      G.gas-=cost;
      G.towers.push({id:G.nextId++,x:gx,y:gy,type:def.type,col:def.col,name:def.name,dmg:def.dmg,range:def.range,cd:def.cd,chains:def.chains||0,freeze:def.freeze||0,yield:def.yield||0,radius:def.radius||0,lastShot:G.frame,cost}); // Prevent instant shoot on build
    }
    spawnParticles(gx+25,gy+25,def.col,15,3);
    syncUI();
  });
  window.addEventListener("keydown",e=>{
    const idx=parseInt(e.key)-1;
    if(idx>=0&&idx<T_KEYS.length){selectedTower=T_KEYS[idx];updateTowerCards();return;}
    if(e.code==="Space"&&G&&!G.waveActive){e.preventDefault();startWave();}
    if(e.code==="Escape"){selectedTower=null;updateTowerCards();}
  });
}

function syncUI(){
  if(!G) return;
  const s=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  s("stat-gas", Math.floor(G.gas));
  s("stat-wave", G.wave);
  s("stat-kills", G.kills);
  s("stat-shards", META.shards + (G.pendingShards?` (+${Math.floor(G.pendingShards*(1+META.upgrades.shards*0.25))})`:''));
  s("stat-towers", `${G.towers.length+G.mines.length} / ${G.maxTowers}`);
  s("stat-hp", `${Math.ceil(G.hp)} / ${G.maxHp}`);
  const hpInner=document.getElementById("hp-inner");
  if(hpInner) hpInner.style.width=`${Math.max(0,(G.hp/G.maxHp)*100)}%`;
  updateTowerCards();
  
  PUP_DEFS.forEach(p=>{
    const el=document.getElementById(`pup-${p.id}`);
    if(!el) return;
    if(G.gas>=p.cost) el.classList.add("afford"); else el.classList.remove("afford");
  });
}

function buildTowerBar(){
  const div=document.getElementById("tcards");
  if(!div) return;
  div.innerHTML=T_KEYS.map((k,i)=>{
    const d=TOWER_DEFS[k];
    const cost=Math.ceil(d.cost*(1-META.upgrades.cost*0.08));
    return `<div id="tcard-${k}" class="tcard" onclick="window.selTower('${k}')" title="${d.desc}">
      <div class="tcard-key">${i+1}</div>
      <div style="width:28px;height:28px;border:1px solid ${d.col};background:#050505;display:flex;align-items:center;justify-content:center">
        <div style="width:12px;height:12px;background:${d.col};opacity:0.6"></div>
      </div>
      <div class="tcard-name" style="color:${d.col}">${d.name}</div>
      ${d.cost>0?`<div class="tcard-cost" style="color:#0f6">${cost} GAS</div>`:''}
    </div>`;
  }).join("");
}

function buildPupsPanel(){
  const div=document.getElementById("pups-panel");
  if(!div) return;
  div.innerHTML=PUP_DEFS.map(p=>
    `<button id="pup-${p.id}" class="pup-btn" onclick="window.usePup('${p.id}')" title="${p.desc}">
      <span style="color:${p.col};font-weight:bold">${p.name}</span>
      <span>${p.cost}</span>
    </button>`
  ).join("");
}

function updateTowerCards(){
  T_KEYS.forEach(k=>{
    const el=document.getElementById(`tcard-${k}`);
    if(el){
      if(selectedTower===k) el.classList.add("sel");
      else el.classList.remove("sel");
    }
  });
}

// Global hooks for inline handlers
if(typeof window!=="undefined"){
  window.selTower = (k) => {selectedTower=k;updateTowerCards();};
  window.buyUpgrade = buyUpgrade;
  window.usePup = activatePup;
}

export default function App() {
  useEffect(() => {
    loadMeta();
    setupInput();
    const ob = document.getElementById("overlay-best");
    if(ob) ob.innerHTML = `BEST WAVE: <span style="color:#fff">${META.bestWave}</span> &nbsp;·&nbsp; SHARDS: <span style="color:#aa88ff">${META.shards}</span>`;
  }, []);

  return (
    <>
      <style>{globalStyles}</style>
      <div id="wrap">
        <canvas id="gc" width="800" height="700"/>
        
        <div id="lp">
          <div style={{fontSize:18,fontWeight:900,color:"#0f6",marginBottom:10,letterSpacing:1,textShadow:"0 0 10px rgba(0,255,102,0.5)"}}>N.FURY</div>
          <div className="stat-row"><span>WAVE</span><span id="stat-wave" className="stat-val">0</span></div>
          <div className="stat-row"><span>GAS</span><span id="stat-gas" className="stat-val" style={{color:"#0f6"}}>0</span></div>
          <div className="stat-row"><span>SHARDS</span><span id="stat-shards" className="stat-val" style={{color:"#aa88ff"}}>0</span></div>
          <div className="stat-row"><span>KILLS</span><span id="stat-kills" className="stat-val">0</span></div>
          <div className="stat-row"><span>SLOTS</span><span id="stat-towers" className="stat-val" style={{color:"#00e8ff"}}>0/0</span></div>
          
          <div style={{marginTop:15,fontSize:10,color:"#888"}}>BASE INTEGRITY</div>
          <div className="hp-bar-outer"><div id="hp-inner" className="hp-bar-inner" style={{background:"#0f6",width:"100%"}}/></div>
          <div id="stat-hp" style={{fontSize:10,textAlign:"right",fontWeight:"bold"}}>100/100</div>

          <div style={{marginTop:20,fontSize:10,color:"#888",marginBottom:4}}>TACTICAL SUPPORT</div>
          <div id="pups-panel"/>
        </div>

        <div id="bb">
          <button className="btn-wave" id="wavebtn" onClick={startWave}>
            START<br/>WAVE<br/><span id="wnum" style={{fontSize:14}}>#1</span>
          </button>
          <div id="tcards" style={{display:"flex",gap:6,flex:1,overflowX:"auto"}}/>
        </div>

        <div className="wave-banner" id="banner"/>
        <div id="msg"/>

        <div id="overlay">
          <div style={{fontSize:48,fontWeight:900,color:"#0f6",letterSpacing:"0.15em",textShadow:"0 0 40px rgba(0,255,102,0.4)"}}>NEBULA FURY</div>
          <div style={{color:"#88a",fontSize:13,textAlign:"center",lineHeight:1.6,marginBottom:10,maxWidth:400}}>
            Place towers · Defend base · <strong style={{color:"#0cc"}}>Strict</strong> structure slots<br/>
            <strong style={{color:"#0f6"}}>SPACE</strong> starts waves · <strong style={{color:"#f44"}}>Key 9</strong> or right-click to sell
          </div>
          <div style={{display:"flex",gap:15,marginTop:6}}>
            <button className="big-btn" onClick={initGame}>DEPLOY</button>
            <button className="big-btn" style={{borderColor:"#446",color:"#88f"}} onClick={openShop}>VOID TERMINAL</button>
          </div>
          <div id="overlay-best" style={{color:"#ffdd00",fontSize:12,marginTop:10}}/>
          <div id="gameover-info" style={{display:"none",color:"#f84",fontSize:12,textAlign:"center",lineHeight:1.8}}/>
        </div>

        <div id="shop-modal">
          <div style={{maxWidth:650,margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:20,fontWeight:"bold",color:"#aa88ff",textShadow:"0 0 10px rgba(170,136,255,0.4)"}}>VOID TERMINAL — Persistent Upgrades</div>
              <div style={{fontSize:13,color:"#aa88ff"}}>◈ <span id="shop-shards" style={{fontWeight:"bold"}}>0</span> &nbsp;·&nbsp; Best: Wave <span id="shop-best">0</span></div>
            </div>
            <div id="shop-items" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}/>
            <div style={{marginTop:20,textAlign:"right"}}>
              <button className="big-btn" style={{borderColor:"#555",color:"#fff"}} onClick={closeShop}>CLOSE TERMINAL</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}