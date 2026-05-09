'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
   BOMB BLITZ  ·  HOT POTATO SURVIVAL BRAWLER
   Run into enemies to PASS the bomb. Don't hold it when it blows.
   Bomb respawns after each explosion. Last player alive wins the round.
═══════════════════════════════════════════════════════════════════ */

const W = 1100, H = 660;
const GRAVITY    = 0.48;
const FRICTION   = 0.79;
const JUMP_VEL   = -13.2;
const SPD        = 1.55;
const MAX_JUMPS  = 2;
const XFER_CD    = 55;   // frames of cooldown after a bomb transfer
const RESPAWN_T  = 105;  // frames between explosion and new bomb spawning

const DIFFICULTIES = {
  easy:   { label:"ROOKIE",    col:"#10b981", reactTime:85,  accuracy:0.30, desc:"Relaxed pace"       },
  normal: { label:"WARRIOR",   col:"#eab308", reactTime:50,  accuracy:0.62, desc:"Balanced challenge" },
  hard:   { label:"ASSASSIN",  col:"#ef4444", reactTime:26,  accuracy:0.84, desc:"Fast & relentless"  },
  insane: { label:"NIGHTMARE", col:"#c084fc", reactTime:12,  accuracy:0.96, desc:"Nearly impossible"  },
};

const SKINS = [
  { id:"inferno",  name:"Inferno",      hex:"#ff4d00", cost:0,    glow:null        },
  { id:"arctic",   name:"Arctic Fox",   hex:"#38bdf8", cost:0,    glow:null        },
  { id:"venom",    name:"Venom Slime",  hex:"#a3e635", cost:0,    glow:null        },
  { id:"aurelius", name:"Aurelius",     hex:"#f59e0b", cost:0,    glow:null        },
  { id:"void",     name:"Void Walker",  hex:"#18181b", cost:150,  glow:"#8b5cf6"   },
  { id:"candy",    name:"Candy Crash",  hex:"#f472b6", cost:200,  glow:null        },
  { id:"cyber",    name:"Cyber Punk",   hex:"#06b6d4", cost:200,  glow:"#06b6d4"   },
  { id:"toxic",    name:"Toxic Waste",  hex:"#84cc16", cost:250,  glow:"#84cc16"   },
  { id:"shadow",   name:"Shadow Realm", hex:"#3f3f46", cost:300,  glow:"#a78bfa"   },
  { id:"lava",     name:"Lava Lord",    hex:"#b45309", cost:350,  glow:"#f97316"   },
  { id:"ice",      name:"Ice Emperor",  hex:"#bae6fd", cost:400,  glow:"#38bdf8"   },
  { id:"plasma",   name:"Plasma King",  hex:"#e879f9", cost:500,  glow:"#e879f9"   },
  { id:"gold",     name:"24-Karat",     hex:"#eab308", cost:600,  glow:"#fbbf24"   },
  { id:"obsidian", name:"Obsidian",     hex:"#09090b", cost:800,  glow:"#ef4444"   },
  { id:"neon",     name:"Neon Ghost",   hex:"#d1fae5", cost:1000, glow:"#10b981"   },
  { id:"cosmic",   name:"Cosmic Deity", hex:"#312e81", cost:1500, glow:"#a78bfa"   },
  { id:"rainbow",  name:"Prism Entity", hex:"#f8fafc", cost:2000, glow:"#f472b6"   },
];

const HATS = [
  { id:"none",     name:"Bare",         cost:0   },
  { id:"halo",     name:"Halo",         cost:120 },
  { id:"crown",    name:"Crown",        cost:250 },
  { id:"horns",    name:"Horns",        cost:300 },
  { id:"tophat",   name:"Top Hat",      cost:200 },
  { id:"wizard",   name:"Wizard Hat",   cost:400 },
  { id:"mohawk",   name:"Mohawk",       cost:180 },
  { id:"antenna",  name:"Antenna",      cost:280 },
  { id:"halo2",    name:"Dark Halo",    cost:500 },
  { id:"wings",    name:"Angel Wings",  cost:700 },
  { id:"bomb_hat", name:"Bomb Cap",     cost:350 },
  { id:"ninja",    name:"Ninja Wrap",   cost:450 },
  { id:"flames",   name:"Flame Crown",  cost:600 },
  { id:"laurel",   name:"Laurel",       cost:150 },
];

const TRAILS = [
  { id:"none",      name:"No Trail",   cost:0    },
  { id:"dust",      name:"Dust",       cost:80   },
  { id:"fire",      name:"Fire",       cost:250  },
  { id:"ice",       name:"Ice",        cost:250  },
  { id:"sparkle",   name:"Sparkle",    cost:400  },
  { id:"rainbow",   name:"Rainbow",    cost:600  },
  { id:"vortex",    name:"Vortex",     cost:800  },
  { id:"lightning", name:"Lightning",  cost:1000 },
  { id:"smoke",     name:"Dark Smoke", cost:350  },
  { id:"hearts",    name:"Hearts",     cost:300  },
];

const TAUNTS = [
  { id:"none",  name:"No Taunt",      cost:0   },
  { id:"laugh", name:"Evil Laugh",    cost:200 },
  { id:"flex",  name:"Muscle Flex",   cost:300 },
  { id:"dance", name:"Victory Dance", cost:400 },
  { id:"point", name:"Finger Point",  cost:150 },
  { id:"shrug", name:"The Shrug",     cost:180 },
];

const BOMB_SKINS = [
  { id:"classic", name:"Classic",    cost:0,   col:"#18181b", fuse:"#f97316" },
  { id:"nuclear", name:"Nuclear",    cost:300, col:"#14532d", fuse:"#86efac" },
  { id:"cyber",   name:"Cyber Bomb", cost:400, col:"#1e3a5f", fuse:"#38bdf8" },
  { id:"heart",   name:"Heart Bomb", cost:500, col:"#9f1239", fuse:"#f472b6" },
  { id:"rainbow", name:"Rainbow",    cost:700, col:"#312e81", fuse:"#e879f9" },
  { id:"skull",   name:"Skull Bomb", cost:600, col:"#09090b", fuse:"#ef4444" },
];

const POWERUP_TYPES = [
  { id:"shield",    col:"#38bdf8", icon:"🛡", label:"SHIELD!",       effect:"shield",    duration:300 },
  { id:"speed",     col:"#f97316", icon:"⚡", label:"OVERDRIVE!",    effect:"speed",     duration:220 },
  { id:"freeze",    col:"#93c5fd", icon:"❄", label:"FREEZE!",       effect:"freeze",    duration:0   },
  { id:"magnet",    col:"#8b5cf6", icon:"◈", label:"MAGNET!",       effect:"magnet",    duration:0   },
  { id:"ghost",     col:"#64748b", icon:"◎", label:"PHANTOM!",      effect:"ghost",     duration:200 },
  { id:"extend",    col:"#eab308", icon:"⏱", label:"+3s FUSE!",     effect:"extend",    duration:0   },
  { id:"shrink",    col:"#c084fc", icon:"↓", label:"SHRINK!",       effect:"shrink",    duration:200 },
  { id:"multiJump", col:"#10b981", icon:"∞", label:"INFINITE JUMP!",effect:"multiJump", duration:250 },
  { id:"confusion", col:"#f59e0b", icon:"?", label:"CONFUSED!",     effect:"confusion", duration:150 },
];

const WORLDS = [
  {
    id:"arena", name:"Death Arena", emoji:"💀", desc:"Symmetrical battleground",
    bg:["#07050a","#0d0a14"], accent:"#ff4d00", gridCol:"rgba(255,77,0,0.03)",
    platforms:[
      { x:0,        y:H-38,   w:W,   h:38 },
      { x:180,      y:H-185,  w:210, h:20 },
      { x:W-390,    y:H-185,  w:210, h:20 },
      { x:W/2-145,  y:H-330,  w:290, h:20 },
      { x:55,       y:H-320,  w:95,  h:20 },
      { x:W-150,    y:H-320,  w:95,  h:20 },
      { x:W/2-60,   y:H-470,  w:120, h:20 },
    ],
    portals:[], springs:[], hazards:[],
  },
  {
    id:"skyfall", name:"Sky Coffin", emoji:"☁", desc:"No floor — fall means death",
    bg:["#050814","#0c1035"], accent:"#38bdf8", gridCol:"rgba(56,189,248,0.04)",
    platforms:[
      { x:W/2-260,  y:H-110,  w:180, h:20 },
      { x:W/2+80,   y:H-110,  w:180, h:20 },
      { x:60,       y:H-260,  w:160, h:20 },
      { x:W-220,    y:H-260,  w:160, h:20 },
      { x:W/2-110,  y:H-400,  w:220, h:20 },
      { x:190,      y:H-480,  w:110, h:20 },
      { x:W-300,    y:H-480,  w:110, h:20 },
      { x:W/2-50,   y:H-560,  w:100, h:20 },
    ],
    portals:[
      { x:30,   y:H-80, w:38, h:58, pairId:1, col:"#a78bfa" },
      { x:W-68, y:H-80, w:38, h:58, pairId:1, col:"#a78bfa" },
    ],
    springs:[], hazards:[],
  },
  {
    id:"pit", name:"The Furnace", emoji:"🔥", desc:"Walled arena with launch pads",
    bg:["#150200","#200400"], accent:"#ef4444", gridCol:"rgba(239,68,68,0.04)",
    platforms:[
      { x:0,       y:0,     w:32,  h:H,  type:"wall" },
      { x:W-32,    y:0,     w:32,  h:H,  type:"wall" },
      { x:32,      y:H-38,  w:280, h:38  },
      { x:W-312,   y:H-38,  w:280, h:38  },
      { x:W/2-105, y:H-210, w:210, h:20  },
      { x:90,      y:H-360, w:155, h:20  },
      { x:W-245,   y:H-360, w:155, h:20  },
      { x:W/2-70,  y:H-510, w:140, h:20  },
    ],
    portals:[],
    springs:[{ x:W/2-24, y:H-250, w:48, h:18, force:-19, col:"#ef4444", anim:0 }],
    hazards:[],
  },
  {
    id:"maze", name:"Crystal Labyrinth", emoji:"💎", desc:"Tight corridors & teleporters",
    bg:["#001818","#002828"], accent:"#06b6d4", gridCol:"rgba(6,182,212,0.04)",
    platforms:[
      { x:0,        y:H-38,  w:280, h:38 },
      { x:W-280,    y:H-38,  w:280, h:38 },
      { x:W/2-55,   y:H-38,  w:110, h:38 },
      { x:0,        y:H-195, w:185, h:20 },
      { x:W-185,    y:H-195, w:185, h:20 },
      { x:W/2-75,   y:H-155, w:150, h:20 },
      { x:145,      y:H-325, w:165, h:20 },
      { x:W-310,    y:H-325, w:165, h:20 },
      { x:W/2-95,   y:H-325, w:190, h:20 },
      { x:0,        y:H-465, w:140, h:20 },
      { x:W-140,    y:H-465, w:140, h:20 },
      { x:W/2-130,  y:H-490, w:260, h:20 },
    ],
    portals:[
      { x:W/2-185, y:H-95,  w:33, h:52, pairId:2, col:"#06b6d4" },
      { x:W/2+152, y:H-95,  w:33, h:52, pairId:2, col:"#06b6d4" },
      { x:30,      y:H-485, w:33, h:52, pairId:3, col:"#f472b6" },
      { x:W-63,    y:H-485, w:33, h:52, pairId:3, col:"#f472b6" },
    ],
    springs:[
      { x:50,    y:H-215, w:48, h:18, force:-15, col:"#06b6d4", anim:0 },
      { x:W-98,  y:H-215, w:48, h:18, force:-15, col:"#06b6d4", anim:0 },
    ],
    hazards:[],
  },
  {
    id:"warp", name:"Warp Zone", emoji:"🌀", desc:"Portals everywhere — pure chaos",
    bg:["#0d0018","#180030"], accent:"#c084fc", gridCol:"rgba(192,132,252,0.04)",
    platforms:[
      { x:0,       y:H-38,  w:W,   h:38 },
      { x:195,     y:H-155, w:150, h:20 },
      { x:W-345,   y:H-155, w:150, h:20 },
      { x:W/2-95,  y:H-270, w:190, h:20 },
      { x:75,      y:H-370, w:130, h:20 },
      { x:W-205,   y:H-370, w:130, h:20 },
      { x:W/2-55,  y:H-480, w:110, h:20 },
    ],
    portals:[
      { x:0,       y:H-230, w:33, h:58, pairId:4, col:"#c084fc" },
      { x:W-33,    y:H-230, w:33, h:58, pairId:4, col:"#c084fc" },
      { x:295,     y:H-78,  w:33, h:38, pairId:5, col:"#f472b6" },
      { x:W-328,   y:H-78,  w:33, h:38, pairId:5, col:"#f472b6" },
      { x:W/2-16,  y:H-78,  w:33, h:38, pairId:6, col:"#60a5fa" },
      { x:W/2-16,  y:H-495, w:33, h:38, pairId:6, col:"#60a5fa" },
    ],
    springs:[
      { x:125,   y:H-60, w:48, h:18, force:-16, col:"#10b981", anim:0 },
      { x:W-173, y:H-60, w:48, h:18, force:-16, col:"#10b981", anim:0 },
    ],
    hazards:[],
  },
  {
    id:"tower", name:"Battle Tower", emoji:"🗼", desc:"Vertical — fight to the peak",
    bg:["#080602","#14100a"], accent:"#eab308", gridCol:"rgba(234,179,8,0.04)",
    platforms:[
      { x:0,       y:H-38,  w:W,   h:38 },
      { x:W/2-195, y:H-125, w:130, h:20 },
      { x:W/2+65,  y:H-125, w:130, h:20 },
      { x:W/2-95,  y:H-240, w:190, h:20 },
      { x:75,      y:H-310, w:115, h:20 },
      { x:W-190,   y:H-310, w:115, h:20 },
      { x:W/2-75,  y:H-390, w:150, h:20 },
      { x:175,     y:H-465, w:115, h:20 },
      { x:W-290,   y:H-465, w:115, h:20 },
      { x:W/2-55,  y:H-545, w:110, h:20 },
    ],
    portals:[],
    springs:[
      { x:W/2-24, y:H-60,  w:48, h:18, force:-21, col:"#eab308", anim:0 },
      { x:175,    y:H-330, w:48, h:18, force:-15, col:"#10b981", anim:0 },
      { x:W-223,  y:H-330, w:48, h:18, force:-15, col:"#10b981", anim:0 },
    ],
    hazards:[],
  },
  {
    id:"volcano", name:"Volcano Core", emoji:"🌋", desc:"Rising lava — panic!",
    bg:["#1a0000","#300000"], accent:"#f97316", gridCol:"rgba(249,115,22,0.04)",
    platforms:[
      { x:0,       y:H-38,  w:W,   h:38 },
      { x:140,     y:H-160, w:200, h:20 },
      { x:W-340,   y:H-160, w:200, h:20 },
      { x:W/2-130, y:H-290, w:260, h:20 },
      { x:40,      y:H-390, w:140, h:20 },
      { x:W-180,   y:H-390, w:140, h:20 },
      { x:W/2-80,  y:H-500, w:160, h:20 },
    ],
    portals:[],
    springs:[{ x:W/2-24, y:H-60, w:48, h:18, force:-18, col:"#f97316", anim:0 }],
    hazards:[{ type:"risingLava", level:H, speed:0.11, maxLevel:H-130 }],
  },
];

const DEFAULT_SAVE = {
  coins: 600,
  ownedSkins:    ["inferno","arctic","venom","aurelius"],
  ownedHats:     ["none"],
  ownedTrails:   ["none"],
  ownedTaunts:   ["none"],
  ownedBombSkins:["classic"],
  equip:{
    p1:{ skin:"inferno",  hat:"none", trail:"none", taunt:"none", bombSkin:"classic" },
    p2:{ skin:"arctic",   hat:"none", trail:"none", taunt:"none", bombSkin:"classic" },
    p3:{ skin:"venom",    hat:"none", trail:"none", taunt:"none", bombSkin:"classic" },
    p4:{ skin:"aurelius", hat:"none", trail:"none", taunt:"none", bombSkin:"classic" },
  },
  stats:{ kills:0, wins:0, losses:0, gamesPlayed:0, bombsHeld:0, powerupsCollected:0 },
  winStreak:0,
};

// ─── utils ───────────────────────────────────────────────────────────────────
const ri    = (a,b) => !(b.x>a.x+a.w||b.x+b.w<a.x||b.y>a.y+a.h||b.y+b.h<a.y);
const rand  = (a,b) => Math.random()*(b-a)+a;
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const deepMerge = (def, saved) => {
  if (!saved||typeof saved!=="object") return def;
  const out={...def};
  for (const k in saved) {
    if (k in def&&typeof def[k]==="object"&&!Array.isArray(def[k])) out[k]=deepMerge(def[k],saved[k]);
    else if (k in def) out[k]=saved[k];
  }
  return out;
};

// ─── storage (window.storage, no localStorage) ───────────────────────────────
const storageGet = async (key) => {
  try { const r = await window.storage?.get(key); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
};
const storageSet = async (key, val) => {
  try { await window.storage?.set(key, JSON.stringify(val)); } catch {}
};

// ─────────────────────────────────────────────────────────────────────────────
export default function BombBlitz() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const gRef      = useRef({ keys:{}, frame:0, active:false });

  const [save, setSave]       = useState(DEFAULT_SAVE);
  const [screen, setScreen]   = useState("menu");
  const [config, setConfig]   = useState({ humans:1, bots:3, winRounds:3, worldId:"arena", difficulty:"normal" });
  const [shopTab, setShopTab] = useState("skins");
  const [shopPid, setShopPid] = useState(1);
  const [uiSnap, setUiSnap]   = useState({ players:[], bomb:null, roundNum:1, maxRounds:3 });
  const [notif, setNotif]     = useState(null);
  const [tick, setTick]       = useState(0);

  // ── load & keyboard ────────────────────────────────────────────────────────
  useEffect(() => {
    storageGet("bb_save").then(raw => {
      if (raw) setSave(deepMerge(DEFAULT_SAVE, raw));
    });
    const onKey = e => {
      const down = e.type==="keydown";
      gRef.current.keys[e.code] = down;
      if (e.key) gRef.current.keys[e.key.toLowerCase()] = down;
      if (e.code==="Escape"&&gRef.current.active) { gRef.current.active=false; setScreen("menu"); }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup",   onKey);
    let af; const anim = () => { setTick(t=>t+1); af=requestAnimationFrame(anim); };
    af = requestAnimationFrame(anim);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup",   onKey);
      cancelAnimationFrame(af);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const persist = useCallback((data) => {
    setSave(data);
    storageSet("bb_save", data);
  }, []);

  const notify = useCallback((msg, col="#eab308") => {
    setNotif({ msg, col });
    setTimeout(() => setNotif(null), 2600);
  }, []);

  // ── particle helpers (stable — no React state deps) ────────────────────────
  const spawnBurst = (g, x, y, col, n=18) => {
    for (let k=0;k<n;k++) {
      const a=(k/n)*Math.PI*2, s=rand(3,9);
      g.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,col,life:rand(16,36),sz:rand(3,7)});
    }
  };
  const spawnDust = (g, x, y) => {
    for (let k=0;k<5;k++)
      g.particles.push({x,y,vx:rand(-2,2),vy:rand(-1.2,0.3),col:"#94a3b8",life:16,sz:rand(3,5)});
  };
  const updateParticles = (g) => {
    for (let i=g.particles.length-1;i>=0;i--) {
      const p=g.particles[i];
      p.x+=p.vx; p.y+=p.vy; p.vx*=0.97; p.vy+=0.09; p.life--;
      if (p.life<=0) g.particles.splice(i,1);
    }
  };
  const updatePopups = (g) => {
    for (let i=g.popups.length-1;i>=0;i--) {
      const p=g.popups[i]; p.y-=1.0; p.life--;
      if (p.life<=0) g.popups.splice(i,1);
    }
  };
  const emitTrail = (g, p) => {
    if (p.trailId==="none"||g.frame%2!==0) return;
    if (Math.abs(p.vx)<0.5&&Math.abs(p.vy)<0.5) return;
    let col=p.col;
    if (p.trailId==="fire")      col=g.frame%3?"#f97316":"#ef4444";
    if (p.trailId==="ice")       col="#bae6fd";
    if (p.trailId==="sparkle")   col=g.frame%3?"#eab308":"#fde68a";
    if (p.trailId==="rainbow")   col=`hsl(${(g.frame*7)%360},100%,60%)`;
    if (p.trailId==="vortex")    col="#8b5cf6";
    if (p.trailId==="lightning") col=g.frame%2?"#fcd34d":"#fff";
    if (p.trailId==="smoke")     col="#374151";
    if (p.trailId==="hearts")    col="#f472b6";
    g.particles.push({x:p.x+p.w/2+rand(-3,3),y:p.y+p.h/2+rand(-3,3),vx:rand(-0.6,0.6),vy:rand(-0.4,0.2),col,life:22,sz:rand(3,6)});
  };

  // ── create bomb on a random alive player ───────────────────────────────────
  const createBomb = (g, customFuse) => {
    const alive = g.players.filter(p=>p.alive);
    if (!alive.length) return;
    const holder = alive[Math.floor(Math.random()*alive.length)];
    holder.holdingBomb = true;
    const ft = customFuse || (420 + Math.floor(Math.random()*180));
    g.bomb = {
      holderId:    holder.pid,
      fuseTotal:   ft,
      fuse:        ft,
      x: holder.x + holder.w/2 - 11,
      y: holder.y - 26,
      w: 22, h: 22,
      exploding:   false,
      xferCooldown: XFER_CD,
      respawnTimer: 0,
    };
    g.popups.push({x:holder.x,y:holder.y-30,txt:"💣 GOT BOMB!",col:"#ff4d00",life:50,big:false});
  };

  // ── eliminate a player ─────────────────────────────────────────────────────
  const eliminate = (g, p, cause) => {
    if (!p.alive) return;
    p.alive = false;
    p.holdingBomb = false;
    spawnBurst(g, p.x+p.w/2, p.y+p.h/2, p.col, 32);
    g.popups.push({
      x: p.x, y: p.y-30,
      txt: cause==="bomb"?"💥 BOOM!":cause==="lava"?"🌋 LAVA!":"💀 FELL!",
      col: p.col, life:65, big:true,
    });
    if (p.type==="human") {
      g.saveRef={...g.saveRef,stats:{...g.saveRef.stats,bombsHeld:g.saveRef.stats.bombsHeld+1}};
    }
  };

  // ── end round / match ──────────────────────────────────────────────────────
  const endRound = (g, survivor) => {
    if (g.roundPhase!=="playing") return;
    g.roundPhase="roundEnd";
    g.roundEndTimer=220;
    if (survivor) {
      survivor.wins++;
      g.popups.push({x:W/2,y:H/2-20,txt:`${survivor.label} SURVIVES ROUND ${g.roundNum}!`,col:survivor.col,life:140,big:true});
      if (survivor.type==="human") {
        g.saveRef={...g.saveRef,coins:g.saveRef.coins+80,stats:{...g.saveRef.stats,wins:g.saveRef.stats.wins+1},winStreak:(g.saveRef.winStreak||0)+1};
      }
    }
    if (survivor && survivor.wins>=g.maxRounds) {
      g.matchWinner=survivor;
      g.roundPhase="matchEnd";
      g.roundEndTimer=300;
      if (survivor.type==="human") {
        const bonus=150+((g.saveRef.winStreak||0)>3?60:0);
        g.saveRef={...g.saveRef,coins:g.saveRef.coins+bonus,stats:{...g.saveRef.stats,gamesPlayed:g.saveRef.stats.gamesPlayed+1}};
      } else {
        g.saveRef={...g.saveRef,stats:{...g.saveRef.stats,gamesPlayed:g.saveRef.stats.gamesPlayed+1,losses:g.saveRef.stats.losses+1},winStreak:0};
      }
      persist(g.saveRef);
    } else {
      persist(g.saveRef);
    }
  };

  // ── reset for next round (keep wins) ──────────────────────────────────────
  const startNewRound = (g) => {
    const wins={};
    g.players.forEach(p=>wins[p.pid]=p.wins);
    const spawns=[[120,80],[W-150,80],[W/2-60,80],[W/2+30,80]];
    const world=g.world;
    g.players.forEach((p,i)=>{
      p.alive=true; p.holdingBomb=false;
      p.x=spawns[i%4][0]; p.y=spawns[i%4][1];
      p.vx=0; p.vy=0; p.effects={}; p.invuln=120; p.jumps=MAX_JUMPS;
      p.portalCooldown=0; p.wins=wins[p.pid]||0;
    });
    g.portals  = world.portals.map(p=>({...p}));
    g.springs  = world.springs.map(s=>({...s,anim:0}));
    g.particles=[]; g.popups=[]; g.powerups=[];
    g.roundWinner=null; g.roundNum++;
    g.roundPhase="playing";
    g.lavaLevel=(world.hazards.find(h=>h.type==="risingLava")?.level)||H+100;
    g.lavaHazard=world.hazards.find(h=>h.type==="risingLava")||null;
    createBomb(g);
  };

  // ── apply powerup ──────────────────────────────────────────────────────────
  const applyPowerup = (g, p, type) => {
    g.popups.push({x:p.x,y:p.y-26,txt:type.label,col:type.col,life:48});
    spawnBurst(g,p.x+p.w/2,p.y+p.h/2,type.col,14);
    if (type.effect==="freeze") {
      g.players.forEach(op=>{if(op!==p&&op.alive){op.effects.frozen=180;op.vx=0;}});
    } else if (type.effect==="extend") {
      if (g.bomb&&!g.bomb.exploding) g.bomb.fuse=Math.min(g.bomb.fuse+180,g.bomb.fuseTotal);
    } else if (type.effect==="magnet") {
      // Steal bomb from current holder
      if (g.bomb&&!g.bomb.exploding&&!p.holdingBomb) {
        const holder=g.players.find(q=>q.pid===g.bomb.holderId&&q.alive);
        if (holder&&holder!==p) {
          holder.holdingBomb=false;
          p.holdingBomb=true;
          g.bomb.holderId=p.pid;
          g.bomb.xferCooldown=XFER_CD;
          g.popups.push({x:p.x,y:p.y-44,txt:"MAGNETIZED!",col:type.col,life:40});
        }
      }
    } else {
      p.effects[type.effect]=type.duration;
    }
    if (p.type==="human") {
      g.saveRef={...g.saveRef,coins:g.saveRef.coins+8,stats:{...g.saveRef.stats,powerupsCollected:g.saveRef.stats.powerupsCollected+1}};
    }
  };

  // ── draw hat ───────────────────────────────────────────────────────────────
  const drawHat = (ctx, p, frame) => {
    const cx=p.x+p.w/2, top=p.y-2;
    ctx.save();
    switch(p.hatId) {
      case "halo":
        ctx.strokeStyle="#fde68a"; ctx.lineWidth=3; ctx.shadowBlur=8; ctx.shadowColor="#eab308";
        ctx.beginPath(); ctx.ellipse(cx,top-8,13,5,0,0,Math.PI*2); ctx.stroke(); break;
      case "crown":
        ctx.fillStyle="#eab308";
        ctx.beginPath(); ctx.moveTo(p.x,top); ctx.lineTo(p.x+5,top-14); ctx.lineTo(cx,top-6);
        ctx.lineTo(p.x+p.w-5,top-14); ctx.lineTo(p.x+p.w,top); ctx.closePath(); ctx.fill();
        ctx.fillStyle="#ef4444";
        [p.x+5,cx,p.x+p.w-5].forEach(bx=>{ctx.beginPath();ctx.arc(bx,top-14,3,0,Math.PI*2);ctx.fill();}); break;
      case "horns":
        ctx.fillStyle="#dc2626";
        [[p.x+4,p.x+8,p.x+12],[p.x+p.w-12,p.x+p.w-8,p.x+p.w-4]].forEach(([a,b,c])=>{
          ctx.beginPath();ctx.moveTo(a,top);ctx.lineTo(b,top-15);ctx.lineTo(c,top);ctx.fill();
        }); break;
      case "tophat":
        ctx.fillStyle="#1c1917"; ctx.fillRect(p.x-2,top-18,p.w+4,18); ctx.fillRect(p.x-5,top-3,p.w+10,5);
        ctx.strokeStyle="#a78bfa"; ctx.lineWidth=2; ctx.strokeRect(p.x-2,top-18,p.w+4,18); break;
      case "wizard":
        ctx.fillStyle="#7c3aed";
        ctx.beginPath();ctx.moveTo(p.x,top);ctx.lineTo(cx,top-30);ctx.lineTo(p.x+p.w,top);ctx.closePath();ctx.fill();
        ctx.fillStyle="#fde68a"; ctx.font="9px system-ui"; ctx.textAlign="center";
        ctx.fillText("★",cx-4,top-13); ctx.fillText("★",cx+3,top-21); break;
      case "mohawk":
        for(let mi=0;mi<5;mi++){
          ctx.fillStyle=`hsl(${mi*30+frame*2},100%,55%)`;
          ctx.fillRect(p.x+7+mi*3,top-6-mi*2,3,8+mi*2);
        } break;
      case "antenna":
        ctx.fillStyle="#64748b"; ctx.fillRect(cx-1.5,top-20,3,20);
        ctx.fillStyle="#38bdf8"; ctx.beginPath(); ctx.arc(cx,top-20,5,0,Math.PI*2); ctx.fill(); break;
      case "halo2":
        ctx.strokeStyle="#7c3aed"; ctx.lineWidth=3; ctx.shadowBlur=12; ctx.shadowColor="#7c3aed";
        ctx.beginPath(); ctx.ellipse(cx,top-8,13,5,0,0,Math.PI*2); ctx.stroke(); break;
      case "wings":
        ctx.fillStyle="#f0f9ff88";
        ctx.beginPath();ctx.ellipse(p.x-8,top+p.h*0.3,12,18+Math.sin(frame*0.15)*3,-0.4,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(p.x+p.w+8,top+p.h*0.3,12,18+Math.sin(frame*0.15)*3,0.4,0,Math.PI*2);ctx.fill(); break;
      case "bomb_hat":
        ctx.fillStyle="#18181b";ctx.beginPath();ctx.arc(cx,top-10,10,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="#f97316";ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(cx+7,top-14);ctx.lineTo(cx+14,top-22);ctx.stroke();
        ctx.fillStyle="#fbbf24";ctx.beginPath();ctx.arc(cx+14,top-22,3,0,Math.PI*2);ctx.fill(); break;
      case "ninja":
        ctx.fillStyle="#1c1917";ctx.fillRect(p.x,top-8,p.w,8);ctx.fillRect(p.x,p.y+4,p.w,8);
        ctx.fillStyle="#ef4444";ctx.fillRect(p.x,top,p.w,4); break;
      case "flames":
        for(let fi=0;fi<4;fi++){
          ctx.fillStyle=`hsl(${(frame*3+fi*20)%60},100%,55%)`;
          ctx.beginPath();ctx.ellipse(p.x+4+fi*(p.w/4),top-8+Math.sin(frame*0.12+fi)*3,4,10+Math.sin(frame*0.1+fi)*2,0,0,Math.PI*2);ctx.fill();
        } break;
      case "laurel":
        ctx.strokeStyle="#16a34a";ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(cx,top-2,13,-Math.PI*0.85,Math.PI*0.85,false);ctx.stroke();
        for(let li=0;li<5;li++){
          const a=-Math.PI*0.7+li*(Math.PI*1.4/4);
          ctx.fillStyle="#16a34a";ctx.beginPath();ctx.ellipse(cx+Math.cos(a)*13,top-2+Math.sin(a)*13,4,3,a,0,Math.PI*2);ctx.fill();
        } break;
      default: break;
    }
    ctx.restore();
  };

  // ── draw ───────────────────────────────────────────────────────────────────
  const drawGame = (g) => {
    const canvas=canvasRef.current; if (!canvas) return;
    const ctx=canvas.getContext("2d");
    const world=g.world;
    ctx.save();
    if (g.shake>0) ctx.translate(rand(-g.shakeMag,g.shakeMag)*0.35,rand(-g.shakeMag,g.shakeMag)*0.35);

    // background
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,world.bg[0]); bg.addColorStop(1,world.bg[1]);
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // grid
    ctx.strokeStyle=world.gridCol; ctx.lineWidth=1;
    for(let x=0;x<W;x+=55){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=55){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

    // lava
    if (g.lavaLevel<H+50) {
      const lg=ctx.createLinearGradient(0,g.lavaLevel,0,H);
      lg.addColorStop(0,"rgba(249,115,22,0.9)");lg.addColorStop(0.3,"rgba(220,38,38,0.95)");lg.addColorStop(1,"#1c0000");
      ctx.fillStyle=lg; ctx.fillRect(0,g.lavaLevel,W,H-g.lavaLevel);
      ctx.fillStyle="#f97316";
      for(let lx=0;lx<W;lx+=40) ctx.fillRect(lx,g.lavaLevel+Math.sin(g.frame*0.05+lx*0.1)*4,40,3);
    }

    // portals
    for (const pr of g.portals) {
      const pulse=0.55+0.45*Math.sin(g.frame*0.07+pr.pairId);
      ctx.save();ctx.shadowBlur=18*pulse;ctx.shadowColor=pr.col;
      ctx.fillStyle=pr.col+"99";ctx.fillRect(pr.x,pr.y,pr.w,pr.h);
      ctx.strokeStyle=pr.col;ctx.lineWidth=2;
      for(let pi=0;pi<3;pi++){const sa=g.frame*0.055+pi*(Math.PI*2/3);ctx.beginPath();ctx.arc(pr.x+pr.w/2,pr.y+pr.h/2,(pr.w/2)*0.75,sa,sa+Math.PI*1.2);ctx.stroke();}
      ctx.restore();
    }

    // springs
    for (const sp of g.springs) {
      const c=sp.anim||0;
      ctx.fillStyle=sp.col; ctx.fillRect(sp.x,sp.y+c*0.5,sp.w,sp.h-c*0.5);
    }

    // platforms
    for (const plat of g.platforms) {
      if (plat.type==="wall") {
        ctx.fillStyle="#0f172a";ctx.fillRect(plat.x,plat.y,plat.w,plat.h);
        ctx.fillStyle=world.accent+"22";ctx.fillRect(plat.x<W/2?plat.x+plat.w-4:plat.x,plat.y,4,plat.h);
        continue;
      }
      ctx.fillStyle=plat.type==="floor"?"#141420":"#1a1a2e";ctx.fillRect(plat.x,plat.y,plat.w,plat.h);
      const eg=ctx.createLinearGradient(plat.x,plat.y,plat.x+plat.w,plat.y);
      eg.addColorStop(0,world.accent+"55");eg.addColorStop(0.5,world.accent+"22");eg.addColorStop(1,world.accent+"55");
      ctx.fillStyle=eg;ctx.fillRect(plat.x,plat.y,plat.w,4);
    }

    // powerups
    for (const pw of g.powerups) {
      const pulse=1+0.14*Math.sin(g.frame*0.09+pw.bob);
      const bob=Math.sin(g.frame*0.07+pw.bob)*4;
      ctx.save();ctx.shadowBlur=14*pulse;ctx.shadowColor=pw.type.col;
      ctx.fillStyle=pw.type.col;ctx.beginPath();ctx.arc(pw.x,pw.y-10+bob,11*pulse,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#000";ctx.font=`bold ${Math.round(12*pulse)}px system-ui`;ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(pw.type.icon,pw.x,pw.y-10+bob);ctx.restore();
    }

    // particles
    for (const p of g.particles) {
      ctx.globalAlpha=clamp(p.life/28,0,1);ctx.fillStyle=p.col;ctx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
    }
    ctx.globalAlpha=1;

    // respawn indicator
    if (g.bomb?.respawnTimer>0) {
      const ratio=1-g.bomb.respawnTimer/RESPAWN_T;
      ctx.fillStyle="rgba(255,77,0,0.15)";ctx.fillRect(0,0,W*ratio,6);
      ctx.fillStyle="#ff4d00";ctx.font='900 20px "Trebuchet MS",system-ui';ctx.textAlign="center";
      ctx.shadowBlur=10;ctx.shadowColor="#ff4d00";
      ctx.fillText(`💣  NEW BOMB IN  ${Math.ceil(g.bomb.respawnTimer/60)}s`,W/2,H/2);ctx.shadowBlur=0;
    }

    // players
    for (const p of g.players) {
      if (!p.alive) continue;
      ctx.save();
      if (p.invuln>0&&g.frame%8<4) ctx.globalAlpha=0.45;
      const sk=SKINS.find(s=>s.id===p.skinId);
      if (sk?.glow&&!p.effects.frozen){ctx.shadowBlur=14;ctx.shadowColor=sk.glow;}
      if (p.effects.shield){ctx.shadowBlur=16+Math.sin(g.frame*0.2)*6;ctx.shadowColor="#38bdf8";}
      if (p.effects.ghost){ctx.globalAlpha=(ctx.globalAlpha||1)*0.5;ctx.shadowBlur=10;ctx.shadowColor=p.col;}
      ctx.fillStyle=p.effects.frozen?"#93c5fd":p.col;

      const r=6,px=p.x,py=p.y,pw=p.w,ph=p.h;
      ctx.beginPath();
      ctx.moveTo(px+r,py);ctx.lineTo(px+pw-r,py);ctx.quadraticCurveTo(px+pw,py,px+pw,py+r);
      ctx.lineTo(px+pw,py+ph-r);ctx.quadraticCurveTo(px+pw,py+ph,px+pw-r,py+ph);
      ctx.lineTo(px+r,py+ph);ctx.quadraticCurveTo(px,py+ph,px,py+ph-r);
      ctx.lineTo(px,py+r);ctx.quadraticCurveTo(px,py,px+r,py);
      ctx.closePath();ctx.fill();ctx.shadowBlur=0;

      if (!p.effects.frozen) {
        const ec=p.effects.shield?"#38bdf8":p.type==="bot"?"#ef4444":"#fff";
        const eo=p.vx>0.5?3:p.vx<-0.5?-3:0;
        ctx.fillStyle=ec;
        if (p.type==="bot") {
          ctx.fillRect(px+5+eo,py+8,5,7);ctx.fillRect(px+pw-10+eo,py+8,5,7);
          ctx.fillStyle="#64748b";ctx.fillRect(px+pw/2-2,py-9,3,9);
          ctx.fillStyle="#ef4444";ctx.beginPath();ctx.arc(px+pw/2,py-9,3,0,Math.PI*2);ctx.fill();
        } else {
          ctx.fillRect(px+4+eo,py+6,7,9);ctx.fillRect(px+pw-11+eo,py+6,7,9);
          ctx.fillStyle="#000";ctx.fillRect(px+6+eo,py+10,3,4);ctx.fillRect(px+pw-9+eo,py+10,3,4);
        }
      } else {
        ctx.fillStyle="#1e40af";ctx.font="bold 11px system-ui";ctx.textAlign="center";ctx.fillText("x x",px+pw/2,py+15);
      }

      if (p.effects.shield) {
        const sp=0.5+0.5*Math.sin(g.frame*0.15);
        ctx.strokeStyle=`rgba(56,189,248,${0.5+sp*0.4})`;ctx.lineWidth=2+sp;
        ctx.beginPath();ctx.arc(px+pw/2,py+ph/2,pw*0.9+sp*3,0,Math.PI*2);ctx.stroke();
      }

      drawHat(ctx,p,g.frame);

      ctx.fillStyle=p.type==="bot"?"#f87171":"#7dd3fc";
      ctx.font='900 10px "Trebuchet MS",system-ui';ctx.textAlign="center";
      ctx.shadowBlur=3;ctx.shadowColor="#000";
      ctx.fillText(p.label,px+pw/2,py-(p.hatId!=="none"?22:14));ctx.shadowBlur=0;

      if (p.effects.speed)     {ctx.fillStyle="#f97316";ctx.font="9px system-ui";ctx.fillText("⚡",px+pw+3,py+8);}
      if (p.effects.multiJump) {ctx.fillStyle="#10b981";ctx.font="9px system-ui";ctx.fillText("∞",px+pw+3,py+20);}
      if (p.effects.confusion) {ctx.fillStyle="#f59e0b";ctx.font="9px system-ui";ctx.fillText("?",px-8,py+8);}
      ctx.restore();
    }

    // bomb
    const bomb=g.bomb;
    if (bomb&&!bomb.exploding&&bomb.respawnTimer===0) {
      const fuseRatio=bomb.fuse/bomb.fuseTotal;
      const urgency=fuseRatio<0.25;
      const holder=g.players.find(p=>p.pid===bomb.holderId&&p.alive);
      const bsk=BOMB_SKINS.find(s=>s.id===(holder?.bombSkin?.id||"classic"))||BOMB_SKINS[0];
      ctx.save();
      if (urgency){ctx.shadowBlur=20+Math.sin(g.frame*0.3)*8;ctx.shadowColor="#ff4d00";}
      ctx.fillStyle=bsk.col;ctx.beginPath();ctx.arc(bomb.x+bomb.w/2,bomb.y+bomb.h/2,bomb.w/2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="rgba(255,255,255,0.12)";ctx.beginPath();ctx.arc(bomb.x+bomb.w*0.35,bomb.y+bomb.h*0.3,bomb.w*0.18,0,Math.PI*2);ctx.fill();
      // fuse rope
      const fa=-Math.PI/4+Math.sin(g.frame*0.12)*0.3;
      const fx=bomb.x+bomb.w/2+Math.cos(fa)*bomb.w*0.45, fy=bomb.y+bomb.h/2+Math.sin(fa)*bomb.h*0.45;
      ctx.strokeStyle=bsk.fuse;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+Math.cos(fa)*22,fy+Math.sin(fa)*22);ctx.stroke();
      // spark
      const sx=fx+Math.cos(fa)*22,sy=fy+Math.sin(fa)*22;
      ctx.fillStyle="#fbbf24";ctx.beginPath();ctx.arc(sx,sy,urgency?4:2.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(sx,sy,urgency?2:1,0,Math.PI*2);ctx.fill();
      if (urgency&&g.frame%4===0) spawnBurst(g,sx,sy,"#fbbf24",2);
      // fuse arc
      ctx.strokeStyle=fuseRatio<0.3?"#ef4444":fuseRatio<0.6?"#f59e0b":"#22c55e";
      ctx.lineWidth=3;ctx.beginPath();
      ctx.arc(bomb.x+bomb.w/2,bomb.y+bomb.h/2,bomb.w/2+5,-Math.PI/2,-Math.PI/2+fuseRatio*Math.PI*2);ctx.stroke();
      ctx.restore();
    } else if (bomb?.exploding&&bomb.respawnTimer===0) {
      // fading explosion bloom
      const t=Math.min(g.frame%60,10);
      ctx.save();
      ctx.globalAlpha=Math.max(0,0.65-t*0.07);ctx.fillStyle="#ff4d00";
      ctx.beginPath();ctx.arc(bomb.x+bomb.w/2,bomb.y+bomb.h/2,42+t*8,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=Math.max(0,0.38-t*0.04);ctx.fillStyle="#fbbf24";
      ctx.beginPath();ctx.arc(bomb.x+bomb.w/2,bomb.y+bomb.h/2,26+t*5,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }

    // popups
    for (const pp of g.popups) {
      ctx.globalAlpha=Math.min(1,pp.life/30);ctx.fillStyle=pp.col;
      ctx.font=`900 ${pp.big?24:18}px "Trebuchet MS",system-ui`;ctx.textAlign="center";
      ctx.shadowBlur=7;ctx.shadowColor="#000";ctx.fillText(pp.txt,pp.x+15,pp.y);ctx.shadowBlur=0;
    }
    ctx.globalAlpha=1;

    // round/match end overlay
    if (g.roundPhase==="roundEnd"||g.roundPhase==="matchEnd") {
      ctx.fillStyle="rgba(0,0,0,0.76)";ctx.fillRect(0,H/2-85,W,170);
      if (g.roundPhase==="matchEnd"&&g.matchWinner) {
        ctx.fillStyle=g.matchWinner.col;ctx.font='900 50px "Trebuchet MS",system-ui';ctx.textAlign="center";
        ctx.shadowBlur=25;ctx.shadowColor=g.matchWinner.col;
        ctx.fillText(`${g.matchWinner.label} WINS THE MATCH!`,W/2,H/2+8);ctx.shadowBlur=0;
        ctx.fillStyle="#eab308";ctx.font="bold 22px system-ui";ctx.fillText("+150 COINS EARNED!",W/2,H/2+46);
      } else {
        const s=g.players.find(p=>p.alive);
        if (s) {
          ctx.fillStyle=s.col;ctx.font='900 40px "Trebuchet MS",system-ui';ctx.textAlign="center";
          ctx.shadowBlur=20;ctx.shadowColor=s.col;ctx.fillText(`${s.label} SURVIVES ROUND ${g.roundNum}!`,W/2,H/2+8);ctx.shadowBlur=0;
          ctx.fillStyle="#94a3b8";ctx.font="bold 18px system-ui";ctx.fillText("Next round starting...",W/2,H/2+46);
        } else {
          ctx.fillStyle="#f8fafc";ctx.font='900 40px "Trebuchet MS",system-ui';ctx.textAlign="center";ctx.fillText("EVERYONE EXPLODED!",W/2,H/2+8);
        }
      }
    }
    ctx.restore();
  };

  // ── main game loop ─────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    const g = gRef.current;
    if (!g.active) return;
    g.frame++;
    if (g.shake>0) g.shake--;

    // ── bomb respawn countdown ─────────────────────────────────────────────
    if (g.roundPhase==="playing"&&g.bomb?.respawnTimer>0) {
      g.bomb.respawnTimer--;
      if (g.bomb.respawnTimer===0) {
        const alive=g.players.filter(p=>p.alive);
        if (alive.length<=1) { endRound(g,alive[0]||null); }
        else                  { createBomb(g); }
      }
      updateParticles(g); updatePopups(g); drawGame(g);
      if (g.active) rafRef.current=requestAnimationFrame(loop);
      return;
    }

    // ── round/match end countdown ──────────────────────────────────────────
    if (g.roundPhase==="roundEnd"||g.roundPhase==="matchEnd") {
      g.roundEndTimer--;
      updateParticles(g); updatePopups(g); drawGame(g);
      if (g.roundEndTimer<=0) {
        if (g.roundPhase==="matchEnd") { g.active=false; setScreen("gameover"); return; }
        startNewRound(g);
      }
      if (g.active) rafRef.current=requestAnimationFrame(loop);
      return;
    }

    // ── powerup spawner ────────────────────────────────────────────────────
    if (g.frame%520===0&&Math.random()<0.65) {
      const t=POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)];
      g.powerups.push({x:rand(80,W-80),y:-30,vy:1.4,grounded:false,life:900,type:t,bob:rand(0,Math.PI*2)});
    }

    // ── lava ───────────────────────────────────────────────────────────────
    if (g.lavaHazard) g.lavaLevel=Math.max(g.lavaHazard.maxLevel,g.lavaLevel-g.lavaHazard.speed);

    // ── players ────────────────────────────────────────────────────────────
    for (let i=0;i<g.players.length;i++) {
      const p=g.players[i];
      if (!p.alive) continue;
      if (p.invuln>0) p.invuln--;
      for (const k in p.effects) { if(p.effects[k]>0)p.effects[k]--; if(p.effects[k]<=0)delete p.effects[k]; }
      if (p.portalCooldown>0) p.portalCooldown--;
      const shrunk=!!p.effects.shrink;
      p.w=shrunk?17:30; p.h=shrunk?17:30;

      let mx=0, doJump=false;

      if (p.type==="human") {
        const rev=!!p.effects.confusion;
        if (g.keys[p.keys.l]) mx+=rev?1:-1;
        if (g.keys[p.keys.r]) mx+=rev?-1:1;
        if (g.keys[p.keys.j]&&!p.jumpHeld&&p.jumps>0) { doJump=true; p.jumps--; }
        p.jumpHeld=!!g.keys[p.keys.j];
      } else {
        // ── BOT AI ── chase to pass bomb, flee when safe ──────────────────
        const diff=g.diff;
        const bombHolder=g.players.find(q=>q.holdingBomb&&q.alive);
        const iHaveBomb=p.holdingBomb;

        if (p.botReactDelay>0) { p.botReactDelay--; }
        else {
          if ((p.botTimer||0)<=0) {
            if (iHaveBomb) {
              // Find nearest alive player and chase them to tag
              let tgt=null, bd=9999;
              g.players.forEach(q=>{if(q!==p&&q.alive&&!q.effects.shield){const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<bd){bd=d;tgt=q;}}});
              if (tgt) {
                p.botTargetX=tgt.x+(tgt.w-p.w)/2;
                if ((tgt.y<p.y-50||Math.abs(tgt.x-p.x)>280)&&p.jumps>0&&Math.random()<0.5) { doJump=true; p.jumps--; }
              } else {
                p.botTargetX=rand(80,W-80);
              }
            } else {
              // Run away from bomb holder
              if (bombHolder&&bombHolder!==p) {
                const dx=p.x-bombHolder.x;
                const dist=Math.hypot(p.x-bombHolder.x,p.y-bombHolder.y);
                p.botTargetX=dx>0?Math.min(p.x+rand(100,260),W-55):Math.max(p.x-rand(100,260),55);
                if (dist<170&&p.jumps>0&&Math.random()<0.55) { doJump=true; p.jumps--; }
              } else {
                p.botTargetX=rand(80,W-80);
              }
            }
            p.botTimer=Math.floor(rand(diff.reactTime,diff.reactTime*2.3));
            p.botReactDelay=Math.floor(rand(0,diff.reactTime*0.3));
          } else {
            p.botTimer--;
          }
          // Move toward target
          const dxBot=(p.botTargetX||W/2)-(p.x+p.w/2);
          if (Math.abs(dxBot)>12) mx=dxBot>0?1:-1;
          // Occasional random jumps for navigation
          if (Math.random()<0.006&&p.jumps>0) { doJump=true; p.jumps--; }
          if (p.vy>6&&p.jumps>0&&Math.random()<0.18) { doJump=true; p.jumps--; }
        }
      }

      // ── physics ───────────────────────────────────────────────────────────
      const spd=p.effects.speed?2.1:shrunk?1.75:1.0;
      p.vx+=mx*SPD*spd; p.vy+=p.effects.ghost?GRAVITY*0.3:GRAVITY;
      p.vx*=FRICTION;
      const maxV=p.effects.speed?18:shrunk?14:11;
      if (Math.abs(p.vx)>maxV) p.vx=Math.sign(p.vx)*maxV;
      if (doJump) { p.vy=shrunk?JUMP_VEL*1.15:JUMP_VEL; spawnDust(g,p.x+p.w/2,p.y+p.h); }
      p.x+=p.vx; p.y+=p.vy;
      if (p.x<-p.w) p.x=W; if (p.x>W) p.x=-p.w;
      if (p.y>H+80) { eliminate(g,p,"fell"); continue; }
      if (p.y<-250) p.vy=2;
      if (g.lavaLevel<H&&p.y+p.h>g.lavaLevel) { eliminate(g,p,"lava"); continue; }

      // ── platform collision ────────────────────────────────────────────────
      if (!p.effects.ghost) {
        for (const plat of g.platforms) {
          if (!ri(p,plat)) continue;
          if (plat.type==="wall") {
            if (p.vx>0){p.x=plat.x-p.w;p.vx*=-0.15;}else{p.x=plat.x+plat.w;p.vx*=-0.15;}
            continue;
          }
          if (p.vy>=0&&p.y+p.h-p.vy<=plat.y+12) {
            p.y=plat.y-p.h;p.vy=0;p.jumps=p.effects.multiJump?99:MAX_JUMPS;
          } else if (p.vy<0&&p.y-p.vy>=plat.y+plat.h-8) {
            p.y=plat.y+plat.h;p.vy=Math.abs(p.vy)*0.3;
          }
        }
      }

      // ── springs ───────────────────────────────────────────────────────────
      for (const sp of g.springs) {
        if (ri(p,{x:sp.x,y:sp.y,w:sp.w,h:sp.h})&&p.vy>=0&&p.y+p.h-p.vy<=sp.y+12) {
          p.vy=sp.force;p.jumps=p.effects.multiJump?99:MAX_JUMPS;sp.anim=8;
          g.popups.push({x:p.x,y:p.y-20,txt:"BOING!",col:sp.col,life:28});spawnBurst(g,sp.x+sp.w/2,sp.y,sp.col,5);
        }
      }
      for (const sp of g.springs) { if(sp.anim>0)sp.anim--; }

      // ── portals ───────────────────────────────────────────────────────────
      if (p.portalCooldown<=0) {
        for (let pi=0;pi<g.portals.length;pi++) {
          const portal=g.portals[pi];
          if (ri(p,portal)) {
            const partner=g.portals.find((pp,idx)=>idx!==pi&&pp.pairId===portal.pairId);
            if (partner) {
              p.x=partner.x+partner.w/2-p.w/2;p.y=partner.y;p.portalCooldown=60;
              spawnBurst(g,p.x+p.w/2,p.y+p.h/2,portal.col,10);
              g.popups.push({x:p.x,y:p.y-20,txt:"WARP!",col:portal.col,life:24});break;
            }
          }
        }
      }

      emitTrail(g,p);
    }

    // ── bomb: touch-transfer & fuse ────────────────────────────────────────
    if (g.bomb&&!g.bomb.exploding&&g.bomb.respawnTimer===0) {
      if (g.bomb.xferCooldown>0) g.bomb.xferCooldown--;

      const holder=g.players.find(p=>p.pid===g.bomb.holderId&&p.alive);

      if (holder) {
        // Stick bomb to holder
        g.bomb.x=holder.x+holder.w/2-g.bomb.w/2;
        g.bomb.y=holder.y-g.bomb.h-4;

        // ── TOUCH TRANSFER ──────────────────────────────────────────────
        if (g.bomb.xferCooldown<=0&&!holder.effects.ghost) {
          for (const p of g.players) {
            if (p===holder||!p.alive||p.effects.shield||p.invuln>0) continue;
            if (ri(holder,p)) {
              // Transfer bomb
              holder.holdingBomb=false;
              p.holdingBomb=true;
              g.bomb.holderId=p.pid;
              g.bomb.xferCooldown=XFER_CD;
              g.popups.push({x:p.x,y:p.y-28,txt:"🔥 TAGGED!",col:"#ff4d00",life:40});
              spawnBurst(g,p.x+p.w/2,p.y+p.h/2,"#ff4d00",14);
              if (p.type==="human") {
                g.saveRef={...g.saveRef,stats:{...g.saveRef.stats,bombsHeld:g.saveRef.stats.bombsHeld+1}};
              }
              break;
            }
          }
        }

        // ── FUSE COUNTDOWN ───────────────────────────────────────────────
        g.bomb.fuse--;
        if (g.bomb.fuse<=0) {
          g.shake=22; g.shakeMag=12;
          spawnBurst(g,g.bomb.x+g.bomb.w/2,g.bomb.y+g.bomb.h/2,"#ff4d00",65);
          spawnBurst(g,g.bomb.x+g.bomb.w/2,g.bomb.y+g.bomb.h/2,"#fbbf24",40);
          g.popups.push({x:g.bomb.x-30,y:g.bomb.y-40,txt:"KABOOM!",col:"#ff4d00",life:90,big:true});
          g.bomb.exploding=true;
          eliminate(g,holder,"bomb");
          const aliveNow=g.players.filter(p=>p.alive);
          if (aliveNow.length<=1) {
            endRound(g,aliveNow[0]||null);
          } else {
            // Respawn bomb after a pause
            g.bomb.respawnTimer=RESPAWN_T;
          }
        }

        // Urgency particles
        if (g.bomb.fuse>0&&g.bomb.fuse<80&&g.frame%8===0)
          spawnBurst(g,g.bomb.x+g.bomb.w/2,g.bomb.y+g.bomb.h/2,"#ff4d00",3);

      } else if (!g.bomb.exploding) {
        // Holder died without explosion — reassign bomb
        const alive=g.players.filter(p=>p.alive);
        if (alive.length<=1) {
          endRound(g,alive[0]||null);
        } else {
          const nb=alive[Math.floor(Math.random()*alive.length)];
          nb.holdingBomb=true;
          g.bomb.holderId=nb.pid;
          g.bomb.xferCooldown=XFER_CD;
          g.popups.push({x:nb.x,y:nb.y-28,txt:"💣 GOT BOMB!",col:"#ff4d00",life:45});
        }
      }
    }

    // ── powerups ───────────────────────────────────────────────────────────
    for (let i=g.powerups.length-1;i>=0;i--) {
      const pw=g.powerups[i];
      if (!pw.grounded) {
        pw.vy=Math.min(pw.vy+GRAVITY*0.42,5);pw.y+=pw.vy;
        for (const plat of g.platforms) {
          if (plat.type==="wall") continue;
          if (ri({x:pw.x-10,y:pw.y-10,w:20,h:20},plat)&&pw.vy>=0&&pw.y-pw.vy<=plat.y+8) {
            pw.y=plat.y-10;pw.vy=0;pw.grounded=true;break;
          }
        }
        if (pw.y>H-50) { pw.y=H-50;pw.grounded=true;pw.vy=0; }
      }
      pw.life--;
      let grabbed=false;
      for (const p of g.players) {
        if (!p.alive) continue;
        if (ri(p,{x:pw.x-13,y:pw.y-13,w:26,h:26})) { applyPowerup(g,p,pw.type);grabbed=true;break; }
      }
      if (grabbed||pw.life<=0) g.powerups.splice(i,1);
    }

    updateParticles(g);
    updatePopups(g);
    drawGame(g);

    if (g.frame%3===0) {
      setUiSnap({
        players: g.players.map(p=>({...p,effects:{...p.effects}})),
        bomb: g.bomb?{...g.bomb}:null,
        roundNum: g.roundNum,
        maxRounds: g.maxRounds,
      });
    }

    if (g.active) rafRef.current=requestAnimationFrame(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── start match ────────────────────────────────────────────────────────────
  const startMatch = useCallback((sv) => {
    sv = sv || save;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const world = WORLDS.find(w=>w.id===config.worldId)||WORLDS[0];
    const diff  = DIFFICULTIES[config.difficulty]||DIFFICULTIES.normal;

    const HKEYS = [
      { l:"KeyA",      r:"KeyD",       j:"KeyW"    },
      { l:"ArrowLeft", r:"ArrowRight", j:"ArrowUp" },
      { l:"KeyJ",      r:"KeyL",       j:"KeyI"    },
      { l:"Numpad4",   r:"Numpad6",    j:"Numpad8" },
    ];

    const usedSkins=[];
    const getSkin=(pid)=>{
      let s=sv.equip[`p${pid}`]?.skin;
      if(!s||usedSkins.includes(s)) s=sv.ownedSkins.find(sk=>!usedSkins.includes(sk))||SKINS[pid-1].id;
      usedSkins.push(s);return s;
    };

    const spawns=[[120,80],[W-150,80],[W/2-60,80],[W/2+30,80]];
    const players=[];
    const totalPlayers=config.humans+config.bots;

    for (let i=0;i<config.humans;i++) {
      const pid=i+1;
      const skinId=getSkin(pid);
      const sk=SKINS.find(s=>s.id===skinId)||SKINS[i];
      const bsk=BOMB_SKINS.find(b=>b.id===(sv.equip[`p${pid}`]?.bombSkin||"classic"))||BOMB_SKINS[0];
      players.push({
        pid,id:pid,type:"human",keys:HKEYS[i],
        w:30,h:30,x:spawns[i%4][0],y:spawns[i%4][1],vx:0,vy:0,
        alive:true,wins:0,jumps:MAX_JUMPS,jumpHeld:false,effects:{},
        col:sk.hex,glow:sk.glow||null,skinId,
        hatId:sv.equip[`p${pid}`]?.hat||"none",
        trailId:sv.equip[`p${pid}`]?.trail||"none",
        bombSkin:bsk,label:`P${pid}`,
        portalCooldown:0,holdingBomb:false,invuln:120,
      });
    }

    const BOT_NAMES=["ACE","DOOM","NOVA","FURY","ZETA","APEX","BOLT","VIPER"];
    const BOT_COLS=["#94a3b8","#f97316","#c084fc","#14b8a6","#fb923c","#e879f9","#67e8f9","#86efac"];
    for (let i=0;i<config.bots;i++) {
      const pid=config.humans+i+1;
      players.push({
        pid,id:pid,type:"bot",
        w:30,h:30,x:spawns[(config.humans+i)%4][0],y:spawns[(config.humans+i)%4][1],vx:0,vy:0,
        alive:true,wins:0,jumps:MAX_JUMPS,jumpHeld:false,effects:{},
        col:BOT_COLS[i%BOT_COLS.length],glow:null,skinId:"none",
        hatId:"none",trailId:"none",bombSkin:BOMB_SKINS[0],
        label:BOT_NAMES[i%BOT_NAMES.length],
        portalCooldown:0,holdingBomb:false,invuln:120,
        botTimer:0,botTargetX:W/2,botReactDelay:0,
      });
    }

    gRef.current = {
      keys: gRef.current.keys||{},
      frame:0,active:true,shake:0,shakeMag:0,
      players,
      platforms: world.platforms,
      portals:   world.portals.map(p=>({...p})),
      springs:   world.springs.map(s=>({...s,anim:0})),
      hazards:   world.hazards,
      particles:[],popups:[],powerups:[],
      bomb: null,
      world,diff,
      roundNum:1,maxRounds:config.winRounds,
      roundWinner:null,matchWinner:null,
      roundPhase:"playing",roundEndTimer:0,
      saveRef: sv,
      lavaLevel:(world.hazards.find(h=>h.type==="risingLava")?.level)||H+100,
      lavaHazard:world.hazards.find(h=>h.type==="risingLava")||null,
    };

    createBomb(gRef.current);
    setScreen("playing");
    rafRef.current = requestAnimationFrame(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, save, loop]);

  // ── shop logic ─────────────────────────────────────────────────────────────
  const buyItem = (type, id, cost) => {
    if (save.coins<cost) { notify("Not enough coins! 🪙","#ef4444"); return; }
    const ns={...save,coins:save.coins-cost};
    if (type==="skin")     ns.ownedSkins    =[...ns.ownedSkins,id];
    if (type==="hat")      ns.ownedHats     =[...ns.ownedHats,id];
    if (type==="trail")    ns.ownedTrails   =[...ns.ownedTrails,id];
    if (type==="taunt")    ns.ownedTaunts   =[...ns.ownedTaunts,id];
    if (type==="bombSkin") ns.ownedBombSkins=[...ns.ownedBombSkins,id];
    persist(ns); notify("Unlocked! ✨","#10b981");
  };

  const equipItem = (pid, type, id) => {
    if (type==="skin") {
      for (let op=1;op<=4;op++) {
        if (op!==pid&&save.equip[`p${op}`]?.skin===id) { notify("Another player already uses this!","#f59e0b"); return; }
      }
    }
    persist({...save,equip:{...save.equip,[`p${pid}`]:{...save.equip[`p${pid}`],[type]:id}}});
  };

  // ── render ─────────────────────────────────────────────────────────────────
  const MBtn = (bg,col,bord) => ({
    flex:1,padding:"15px 22px",border:bord?`2px solid ${bord}`:"none",borderRadius:11,
    fontSize:"0.95rem",fontWeight:900,cursor:"pointer",background:bg,color:col,
    transition:"all 0.14s",letterSpacing:"0.4px",
    boxShadow:"0 4px 18px rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",gap:5,
  });

  return (
    <div style={{minHeight:"100vh",background:"#06060a",color:"#f8fafc",fontFamily:'"Trebuchet MS",system-ui,sans-serif',display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
      {/* starfield */}
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
        {Array.from({length:50}).map((_,i)=>(
          <div key={i} style={{position:"absolute",left:`${(i*41)%100}%`,top:`${(i*57)%100}%`,
            width:i%7===0?"3px":"1.5px",height:i%7===0?"3px":"1.5px",background:"#fff",
            opacity:0.12+0.3*Math.abs(Math.sin(tick*0.018+i)),borderRadius:"50%"}}/>
        ))}
        <div style={{position:"absolute",width:"60vw",height:"60vh",left:"20vw",top:"20vh",background:"radial-gradient(circle,rgba(255,77,0,0.04)0%,transparent 70%)",pointerEvents:"none"}}/>
      </div>

      {notif&&(
        <div style={{position:"fixed",top:20,right:20,background:notif.col,color:"#000",padding:"12px 24px",borderRadius:12,fontWeight:900,fontSize:"1.05rem",zIndex:9999,boxShadow:"0 4px 30px rgba(0,0,0,0.5)"}}>
          {notif.msg}
        </div>
      )}

      {/* ─── MENU ─── */}
      {screen==="menu"&&(
        <div style={{zIndex:10,position:"relative",width:800,maxWidth:"98vw"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontSize:"4.2rem",fontWeight:900,fontStyle:"italic",lineHeight:1,letterSpacing:"-2px"}}>
              <span style={{color:"#ff4d00",textShadow:"0 0 40px rgba(255,77,0,0.55)"}}>BOMB</span>
              <span style={{color:"#f8fafc"}}> BLITZ</span>
            </div>
            <div style={{fontSize:"1.4rem",fontWeight:900,color:"#ef4444",letterSpacing:"8px",textShadow:"0 0 20px rgba(239,68,68,0.4)"}}>HOT POTATO SURVIVAL</div>
            <div style={{color:"#3f3f46",marginTop:6,fontSize:"0.82rem",letterSpacing:"2px"}}>RUN INTO ENEMIES TO PASS THE BOMB  •  DON'T HOLD IT WHEN IT BLOWS</div>
          </div>

          <div style={{background:"#0c0c14",border:"1px solid #1c1c28",borderRadius:20,padding:36,boxShadow:"0 24px 80px rgba(0,0,0,0.85)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <SCard label="👥 HUMAN PLAYERS" sub="WASD · Arrows · IJKL · Numpad">
                <BRow items={[1,2,3,4]} active={config.humans} col="#ff4d00" onSel={v=>setConfig({...config,humans:v})}/>
              </SCard>
              <SCard label="🤖 BOT OPPONENTS" sub="Adaptive AI">
                <BRow items={[0,1,2,3]} active={config.bots} col="#38bdf8" onSel={v=>setConfig({...config,bots:v})}/>
              </SCard>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <SCard label="🏆 ROUNDS TO WIN" sub="Best-of series">
                <BRow items={[1,2,3,5]} active={config.winRounds} col="#eab308" onSel={v=>setConfig({...config,winRounds:v})}/>
              </SCard>
              <SCard label="🤖 BOT DIFFICULTY" sub={DIFFICULTIES[config.difficulty]?.desc||""}>
                <div style={{display:"flex",gap:6}}>
                  {Object.entries(DIFFICULTIES).map(([k,d])=>(
                    <button key={k} onClick={()=>setConfig({...config,difficulty:k})} style={{
                      flex:1,padding:"9px 0",border:"none",borderRadius:7,fontWeight:900,cursor:"pointer",fontSize:"0.7rem",letterSpacing:"0.5px",
                      background:config.difficulty===k?d.col:"#1a1a26",
                      color:config.difficulty===k?"#000":"#52525b",
                      boxShadow:config.difficulty===k?`0 0 12px ${d.col}66`:"none",transition:"all 0.12s",
                    }}>{d.label}</button>
                  ))}
                </div>
              </SCard>
            </div>

            <div style={{marginBottom:24}}>
              <div style={{color:"#52525b",fontWeight:900,fontSize:"0.78rem",letterSpacing:"2px",marginBottom:10}}>🌍 BATTLE ARENA</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>
                {WORLDS.map(w=>(
                  <button key={w.id} onClick={()=>setConfig({...config,worldId:w.id})} style={{
                    background:config.worldId===w.id?"#1a1a28":"#0f0f18",
                    border:`2px solid ${config.worldId===w.id?w.accent:"#1c1c28"}`,
                    borderRadius:11,padding:"13px 8px",cursor:"pointer",textAlign:"center",
                    color:config.worldId===w.id?w.accent:"#71717a",transition:"all 0.15s",
                    boxShadow:config.worldId===w.id?`0 0 18px ${w.accent}22`:"none",
                  }}>
                    <div style={{fontSize:"1.4rem"}}>{w.emoji}</div>
                    <div style={{fontWeight:900,fontSize:"0.8rem",marginTop:3}}>{w.name}</div>
                    <div style={{fontSize:"0.65rem",color:"#3f3f46",marginTop:2,lineHeight:1.3}}>{w.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>startMatch(save)} style={MBtn("#ff4d00","#000")}>💣 START BRAWL</button>
              <button onClick={()=>setScreen("shop")} style={MBtn("#0f0f18","#eab308","#eab308")}>
                🛒 VAULT <span style={{background:"#eab308",color:"#000",padding:"2px 8px",borderRadius:7,fontWeight:900,marginLeft:4}}>🪙 {save.coins}</span>
              </button>
              <button onClick={()=>setScreen("stats")} style={MBtn("#0f0f18","#a78bfa","#a78bfa")}>📊 RECORDS</button>
            </div>

            <div style={{marginTop:18,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>
              {[
                {label:"P1",keys:"W A D",col:"#ff4d00"},
                {label:"P2",keys:"↑ ← →",col:"#38bdf8"},
                {label:"P3",keys:"I J L",col:"#a3e635"},
                {label:"P4",keys:"8 4 6",col:"#f59e0b"},
              ].map(c=>(
                <div key={c.label} style={{background:"#0f0f18",border:`1px solid ${c.col}33`,borderRadius:8,padding:"8px 9px",textAlign:"center"}}>
                  <div style={{color:c.col,fontWeight:900,fontSize:"0.78rem"}}>{c.label}</div>
                  <div style={{color:"#52525b",fontSize:"0.72rem",marginTop:1}}>{c.keys}</div>
                  <div style={{color:c.col+"99",fontSize:"0.65rem",marginTop:1}}>Touch to tag!</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── SHOP ─── */}
      {screen==="shop"&&(
        <div style={{zIndex:10,position:"relative",width:960,maxWidth:"98vw"}}>
          <div style={{background:"#0c0c14",border:"1px solid #1c1c28",borderRadius:20,padding:36,boxShadow:"0 24px 80px rgba(0,0,0,0.85)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <div>
                <div style={{fontSize:"2.4rem",fontWeight:900,fontStyle:"italic"}}>THE VAULT</div>
                <div style={{color:"#3f3f46",fontSize:"0.78rem",letterSpacing:"2px"}}>CUSTOMIZE YOUR KNIGHT</div>
              </div>
              <div style={{fontSize:"1.7rem",fontWeight:900,color:"#eab308",background:"#18181b",padding:"10px 20px",borderRadius:12}}>🪙 {save.coins}</div>
            </div>

            <div style={{display:"flex",gap:9,marginBottom:14,alignItems:"center"}}>
              <span style={{color:"#3f3f46",fontWeight:900,fontSize:"0.75rem",marginRight:3}}>EQUIP FOR:</span>
              {[1,2,3,4].map(p=>(
                <button key={p} onClick={()=>setShopPid(p)} style={{
                  background:shopPid===p?["#ff4d00","#38bdf8","#a3e635","#f59e0b"][p-1]:"#18181b",
                  color:shopPid===p?"#000":"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:900,cursor:"pointer",fontSize:"0.84rem",
                }}>P{p}</button>
              ))}
            </div>

            <div style={{display:"flex",gap:7,marginBottom:18}}>
              {[{id:"skins",label:"Skins"},{id:"hats",label:"Hats"},{id:"trails",label:"Trails"},{id:"taunts",label:"Taunts"},{id:"bombSkins",label:"Bomb"}].map(t=>(
                <button key={t.id} onClick={()=>setShopTab(t.id)} style={{
                  background:shopTab===t.id?"#ff4d00":"#18181b",
                  color:shopTab===t.id?"#000":"#94a3b8",
                  border:"none",borderRadius:8,padding:"10px 18px",fontWeight:900,cursor:"pointer",textTransform:"uppercase",fontSize:"0.82rem",letterSpacing:"1px",
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:11,minHeight:300,maxHeight:380,overflowY:"auto",paddingRight:4}}>
              {(()=>{
                const items=shopTab==="skins"?SKINS:shopTab==="hats"?HATS:shopTab==="trails"?TRAILS:shopTab==="taunts"?TAUNTS:BOMB_SKINS;
                const key=shopTab==="skins"?"skin":shopTab==="hats"?"hat":shopTab==="trails"?"trail":shopTab==="taunts"?"taunt":"bombSkin";
                const ownedArr=shopTab==="skins"?save.ownedSkins:shopTab==="hats"?save.ownedHats:shopTab==="trails"?save.ownedTrails:shopTab==="taunts"?save.ownedTaunts:save.ownedBombSkins;
                return items.map(item=>{
                  const owned=ownedArr.includes(item.id);
                  const equipped=save.equip[`p${shopPid}`]?.[key]===item.id;
                  const col=item.hex||item.col||"#52525b";
                  const HAT_ICONS={"none":"😶","halo":"👼","crown":"👑","horns":"😈","tophat":"🎩","wizard":"🧙","mohawk":"🤘","antenna":"🤖","halo2":"😇","wings":"🪽","bomb_hat":"💣","ninja":"🥷","flames":"🔥","laurel":"🏅"};
                  const TRAIL_ICONS={"none":"💨","dust":"🌫","fire":"🔥","ice":"❄","sparkle":"✨","rainbow":"🌈","vortex":"🌀","lightning":"⚡","smoke":"💭","hearts":"❤"};
                  const TAUNT_ICONS={"none":"🫥","laugh":"😈","flex":"💪","dance":"🕺","point":"👉","shrug":"🤷"};
                  return (
                    <div key={item.id} style={{background:equipped?"#1a1a28":"#111118",border:`2px solid ${equipped?"#ff4d00":owned?"#27272a":col+"55"}`,borderRadius:11,padding:"13px 8px",textAlign:"center",boxShadow:equipped?"0 0 14px rgba(255,77,0,0.18)":"none",position:"relative"}}>
                      {shopTab==="skins"&&<div style={{width:28,height:28,background:item.hex,borderRadius:5,margin:"0 auto 9px",boxShadow:item.glow?`0 0 10px ${item.glow}`:"none"}}/>}
                      {shopTab==="hats"&&<div style={{fontSize:"1.2rem",margin:"0 auto 7px"}}>{HAT_ICONS[item.id]||"🎭"}</div>}
                      {shopTab==="trails"&&<div style={{fontSize:"1.2rem",margin:"0 auto 7px"}}>{TRAIL_ICONS[item.id]||"💫"}</div>}
                      {shopTab==="taunts"&&<div style={{fontSize:"1.2rem",margin:"0 auto 7px"}}>{TAUNT_ICONS[item.id]||"😎"}</div>}
                      {shopTab==="bombSkins"&&<div style={{width:28,height:28,background:item.col,borderRadius:"50%",margin:"0 auto 9px",boxShadow:`0 0 8px ${item.fuse||"#f97316"}`}}/>}
                      <div style={{fontWeight:900,fontSize:"0.72rem",color:owned?"#f8fafc":"#3f3f46",marginBottom:7,lineHeight:1.2}}>{item.name}</div>
                      {!owned?(
                        <button onClick={()=>buyItem(key,item.id,item.cost)} disabled={save.coins<item.cost} style={{width:"100%",padding:"6px 3px",background:save.coins>=item.cost?"#eab308":"#1f1f2a",color:save.coins>=item.cost?"#000":"#444",border:"none",borderRadius:5,fontWeight:900,cursor:save.coins>=item.cost?"pointer":"not-allowed",fontSize:"0.72rem"}}>
                          {item.cost===0?"FREE":"🪙 "+item.cost}
                        </button>
                      ):(
                        <button onClick={()=>equipItem(shopPid,key,item.id)} style={{width:"100%",padding:"6px 3px",background:equipped?"#ff4d00":"#1a1a28",color:equipped?"#000":"#ff4d00",border:`1px solid ${equipped?"#ff4d00":"#1a1a28"}`,borderRadius:5,fontWeight:900,cursor:"pointer",fontSize:"0.72rem"}}>
                          {equipped?"✓ ON":"EQUIP"}
                        </button>
                      )}
                      {equipped&&<div style={{position:"absolute",top:5,right:5,background:"#ff4d00",color:"#000",borderRadius:3,fontSize:"0.58rem",padding:"1px 4px",fontWeight:900}}>EQ</div>}
                    </div>
                  );
                });
              })()}
            </div>

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button onClick={()=>setScreen("menu")} style={{...MBtn("#18181b","#94a3b8","#27272a"),flex:"none",width:140}}>← BACK</button>
              <button onClick={()=>{persist(DEFAULT_SAVE);notify("Save reset! 🔄","#94a3b8");}} style={{...MBtn("#18181b","#ef4444","#ef4444"),flex:"none",width:160,fontSize:"0.8rem"}}>RESET SAVE</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STATS ─── */}
      {screen==="stats"&&(
        <div style={{zIndex:10,position:"relative",width:540}}>
          <div style={{background:"#0c0c14",border:"1px solid #1c1c28",borderRadius:20,padding:40,boxShadow:"0 24px 80px rgba(0,0,0,0.85)"}}>
            <div style={{fontSize:"2.3rem",fontWeight:900,marginBottom:24,fontStyle:"italic"}}>📊 HALL OF RECORDS</div>
            {[
              {label:"Match Wins",       val:save.stats.wins,              col:"#eab308",icon:"🏆"},
              {label:"Losses",           val:save.stats.losses,            col:"#52525b",icon:"💔"},
              {label:"Games Played",     val:save.stats.gamesPlayed,       col:"#38bdf8",icon:"🎮"},
              {label:"Times Tagged",     val:save.stats.bombsHeld,         col:"#f97316",icon:"💣"},
              {label:"Powerups Grabbed", val:save.stats.powerupsCollected, col:"#a78bfa",icon:"⚡"},
              {label:"Win Streak",       val:save.winStreak||0,            col:"#10b981",icon:"🔥"},
              {label:"Coins",            val:save.coins,                   col:"#eab308",icon:"🪙"},
              {label:"Items Unlocked",   val:save.ownedSkins.length+save.ownedHats.length+save.ownedTrails.length+save.ownedTaunts.length+save.ownedBombSkins.length, col:"#c084fc",icon:"🛒"},
            ].map(s=>(
              <div key={s.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#111118",borderRadius:9,padding:"13px 18px",marginBottom:8,border:`1px solid ${s.col}18`}}>
                <div style={{color:"#71717a",fontWeight:700,fontSize:"0.9rem"}}>{s.icon} {s.label}</div>
                <div style={{color:s.col,fontWeight:900,fontSize:"1.25rem"}}>{(s.val||0).toLocaleString()}</div>
              </div>
            ))}
            <button onClick={()=>setScreen("menu")} style={{...MBtn("#18181b","#94a3b8","#27272a"),marginTop:10,width:"100%"}}>← BACK</button>
          </div>
        </div>
      )}

      {/* ─── GAMEPLAY ─── */}
      <div style={{display:screen==="playing"?"flex":"none",flexDirection:"column",zIndex:10,position:"relative"}}>
        {/* HUD */}
        <div style={{display:"flex",gap:9,marginBottom:10}}>
          {uiSnap.players.map(p=>{
            const isHolder=uiSnap.bomb?.holderId===p.pid&&!uiSnap.bomb?.exploding;
            const fuseRatio=uiSnap.bomb?(uiSnap.bomb.fuse/uiSnap.bomb.fuseTotal):1;
            return(
              <div key={p.pid} style={{flex:1,background:"#0c0c14",borderRadius:9,padding:"9px 14px",border:`2px solid ${isHolder?"#ff4d00":p.alive?p.col+"44":"#1c1c28"}`,opacity:p.alive?1:0.3,boxShadow:isHolder?"0 0 20px rgba(255,77,0,0.3)":"none",position:"relative",overflow:"hidden",transition:"opacity 0.25s,border-color 0.1s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:900,color:p.type==="bot"?"#f87171":"#e2e8f0",fontSize:"0.83rem"}}>{p.label}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    {isHolder&&<span style={{fontSize:"0.9rem"}}>💣</span>}
                    <span style={{fontSize:"1.5rem",fontWeight:900,color:p.col}}>{p.wins||0}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:3,marginTop:5}}>
                  {Array.from({length:uiSnap.maxRounds}).map((_,ri)=>(
                    <div key={ri} style={{flex:1,height:4,background:ri<(p.wins||0)?p.col:"#1f1f2a",borderRadius:99,transition:"background 0.3s"}}/>
                  ))}
                </div>
                {isHolder&&(
                  <div style={{height:3,background:"#1f1f2a",borderRadius:99,marginTop:5,overflow:"hidden"}}>
                    <div style={{width:`${clamp(fuseRatio,0,1)*100}%`,height:"100%",background:fuseRatio<0.3?"#ef4444":fuseRatio<0.6?"#f59e0b":"#22c55e",borderRadius:99,transition:"width 0.08s,background 0.3s"}}/>
                  </div>
                )}
                {!p.alive&&(
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.75)",borderRadius:9}}>
                    <span style={{color:p.col,fontWeight:900,fontSize:"0.78rem"}}>ELIMINATED</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <canvas ref={canvasRef} width={W} height={H} style={{borderRadius:13,boxShadow:"0 0 60px rgba(0,0,0,0.95),0 0 120px rgba(0,0,0,0.5)"}}/>

        <div style={{display:"flex",justifyContent:"space-between",marginTop:9,color:"#27272a",fontSize:"0.73rem",fontWeight:700}}>
          <span>ROUND {uiSnap.roundNum||1} / {uiSnap.maxRounds||3} WINS NEEDED</span>
          <span>💣 RUN INTO PLAYERS TO PASS THE BOMB</span>
          <span>ESC: QUIT</span>
        </div>
      </div>

      {/* ─── GAME OVER ─── */}
      {screen==="gameover"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{textAlign:"center",maxWidth:700}}>
            <div style={{fontSize:"0.9rem",letterSpacing:"6px",color:"#3f3f46",fontWeight:900,marginBottom:6}}>MATCH OVER</div>
            {(()=>{
              const winner=uiSnap.players.find(p=>(p.wins||0)>=(uiSnap.maxRounds||3));
              return winner?(
                <>
                  <div style={{fontSize:"5rem",fontWeight:900,fontStyle:"italic",color:winner.col,lineHeight:1,textShadow:`0 0 50px ${winner.col}`}}>SURVIVOR</div>
                  <div style={{fontSize:"1.7rem",color:winner.col,fontWeight:900,margin:"10px 0 6px"}}>{winner.label} WINS THE MATCH!</div>
                  <div style={{color:"#eab308",marginBottom:32,fontSize:"0.95rem"}}>+150 COINS EARNED{(save.winStreak||0)>2?" · 🔥 STREAK BONUS!":""}</div>
                </>
              ):(
                <div style={{fontSize:"3rem",fontWeight:900,color:"#ef4444",marginBottom:32}}>EVERYONE EXPLODED!</div>
              );
            })()}
            <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(uiSnap.players.length,4)},1fr)`,gap:10,marginBottom:36,minWidth:420}}>
              {[...uiSnap.players].sort((a,b)=>(b.wins||0)-(a.wins||0)).map(p=>(
                <div key={p.pid} style={{background:"#0c0c14",border:`2px solid ${p.col}`,borderRadius:12,padding:"14px 10px",textAlign:"center"}}>
                  <div style={{color:p.col,fontWeight:900,fontSize:"0.95rem"}}>{p.label}</div>
                  <div style={{fontSize:"2.2rem",fontWeight:900,color:p.col}}>{p.wins||0}</div>
                  <div style={{color:"#3f3f46",fontSize:"0.72rem"}}>ROUNDS WON</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:14,justifyContent:"center"}}>
              <button onClick={()=>startMatch(save)} style={MBtn("#ff4d00","#000")}>💣 REMATCH</button>
              <button onClick={()=>setScreen("menu")} style={MBtn("#18181b","#94a3b8","#27272a")}>⬅ MENU</button>
              <button onClick={()=>setScreen("shop")} style={MBtn("#18181b","#eab308","#eab308")}>🛒 VAULT</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#0c0c14}
        ::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:3px}
      `}</style>
    </div>
  );
}

// ─── small UI components ──────────────────────────────────────────────────────
function SCard({ label, sub, children }) {
  return (
    <div style={{background:"#111118",padding:"15px 16px",borderRadius:11,border:"1px solid #1c1c28"}}>
      <div style={{fontWeight:900,color:"#52525b",fontSize:"0.73rem",letterSpacing:"2px"}}>{label}</div>
      {sub&&<div style={{color:"#27272a",fontSize:"0.63rem",marginBottom:8,letterSpacing:"1px"}}>{sub}</div>}
      <div style={{marginTop:8}}>{children}</div>
    </div>
  );
}

function BRow({ items, active, col, onSel }) {
  return (
    <div style={{display:"flex",gap:7}}>
      {items.map(v=>(
        <button key={v} onClick={()=>onSel(v)} style={{
          flex:1,padding:"9px 0",border:"none",borderRadius:7,fontWeight:900,cursor:"pointer",fontSize:"0.95rem",
          background:active===v?col:"#1a1a26",color:active===v?"#000":"#3f3f46",
          boxShadow:active===v?`0 0 12px ${col}55`:"none",transition:"all 0.1s",
        }}>{v}</button>
      ))}
    </div>
  );
}