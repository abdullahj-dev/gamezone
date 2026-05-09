'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   BATTLEFLEET: PHANTOM TIDES — ULTIMATE EDITION
   Complete rewrite: Zero bugs, addictive economy, world-class UI
═══════════════════════════════════════════════════════════════════════════ */

const ROWS = 10, COLS = 10, CELL = 42;
const SAVE_KEY = "bf_phantom_v1";
const VERSION = "2.1.0";

// ─── FLEET DATA ──────────────────────────────────────────────────────────────
const SHIPS = [
  { id:"carrier",    name:"Carrier",    size:5, icon:"🛸" },
  { id:"battleship", name:"Battleship", size:4, icon:"⚓" },
  { id:"destroyer",  name:"Destroyer",  size:3, icon:"⚡" },
  { id:"submarine",  name:"Submarine",  size:3, icon:"🔱" },
  { id:"patrol",     name:"Patrol",     size:2, icon:"🔰" },
];
const TOTAL_SHIPS = SHIPS.length;

// ─── ECONOMY ─────────────────────────────────────────────────────────────────
const DAILY_REWARD = 150;
const XP_PER_HIT = 25;
const XP_PER_SINK = 100;
const XP_PER_WIN = 500;
const RANK_THRESHOLDS = [0,500,1500,3500,7000,13000,22000,35000,55000,80000];
const RANK_NAMES = ["Recruit","Seaman","Petty Officer","Lieutenant","Commander","Captain","Commodore","Admiral","Vice Admiral","Grand Admiral"];
const RANK_COLORS = ["#94a3b8","#22c55e","#3b82f6","#a855f7","#f59e0b","#ef4444","#ec4899","#14b8a6","#f97316","#fbbf24"];

// ─── SHOP ITEMS ───────────────────────────────────────────────────────────────
const SKINS = [
  { id:"steel",    name:"Steel Navy",      cost:0,    rarity:"FREE",      color:"#64748b", glow:"none",                   desc:"Standard naval grey" },
  { id:"arctic",   name:"Arctic Ghost",    cost:400,  rarity:"COMMON",    color:"#bae6fd", glow:"0 0 8px #bae6fd88",      desc:"Camo for frozen seas" },
  { id:"jungle",   name:"Jungle Specter",  cost:400,  rarity:"COMMON",    color:"#4ade80", glow:"0 0 8px #4ade8088",      desc:"Rainforest camouflage" },
  { id:"crimson",  name:"Crimson Terror",  cost:800,  rarity:"RARE",      color:"#f87171", glow:"0 0 12px #f8717188",     desc:"Strike fear in enemies" },
  { id:"neon",     name:"Cyber Pulse",     cost:800,  rarity:"RARE",      color:"#38bdf8", glow:"0 0 14px #38bdf8aa",     desc:"Digital ocean fighter" },
  { id:"shadow",   name:"Shadow Protocol", cost:1500, rarity:"EPIC",      color:"#1e1b4b", glow:"0 0 18px #818cf8aa",     desc:"Near-invisible stealth" },
  { id:"lava",     name:"Magma Dreadnought",cost:1500,rarity:"EPIC",      color:"#fb923c", glow:"0 0 18px #fb923caa",     desc:"Born from the volcano" },
  { id:"galaxy",   name:"Nebula Command",  cost:3000, rarity:"LEGENDARY", color:"#c084fc", glow:"0 0 24px #c084fccc",     desc:"From distant galaxies" },
  { id:"void",     name:"Void Sovereign",  cost:3000, rarity:"LEGENDARY", color:"#e879f9", glow:"0 0 28px #e879f9cc",     desc:"Ultimate darkness" },
  { id:"golden",   name:"Aurum Imperator", cost:5000, rarity:"MYTHIC",    color:"#fbbf24", glow:"0 0 32px #fbbf24dd",     desc:"Forged from pure gold" },
];

const MARKERS = [
  { id:"cannon",   name:"Naval Cannon",    cost:0,    rarity:"FREE",      color:"#ef4444", shape:"X",   desc:"Classic artillery" },
  { id:"plasma",   name:"Plasma Lance",    cost:500,  rarity:"RARE",      color:"#22c55e", shape:"O",   desc:"Searing plasma bolt" },
  { id:"dark",     name:"Dark Matter",     cost:1000, rarity:"EPIC",      color:"#a855f7", shape:"◆",   desc:"Tears space itself" },
  { id:"cryo",     name:"Cryo Spike",      cost:1000, rarity:"EPIC",      color:"#67e8f9", shape:"✦",   desc:"Freezes on impact" },
  { id:"solar",    name:"Solar Flare",     cost:2000, rarity:"LEGENDARY", color:"#fbbf24", shape:"★",   desc:"Harnessed sun energy" },
  { id:"phantom",  name:"Phantom Strike",  cost:2000, rarity:"LEGENDARY", color:"#f0abfc", shape:"⬟",   desc:"Appears from nowhere" },
];

const BOARDS = [
  { id:"ocean",   name:"Pacific Depths",    cost:0,    rarity:"FREE",      bg:"#0f172a", grid:"#1e3a5f", desc:"The classic battleground" },
  { id:"arctic",  name:"Frozen Tundra",     cost:600,  rarity:"COMMON",    bg:"#0c1a2e", grid:"#1e3a5f", desc:"Ice-cold northern waters" },
  { id:"lava",    name:"Volcanic Trench",   cost:600,  rarity:"COMMON",    bg:"#1a0a00", grid:"#3d1a00", desc:"Bubbling magma beneath" },
  { id:"void",    name:"Void Dimension",    cost:1200, rarity:"EPIC",      bg:"#050012", grid:"#1a003a", desc:"Between dimensions" },
  { id:"neon",    name:"Digital Ocean",     cost:1200, rarity:"EPIC",      bg:"#000d1a", grid:"#003030", desc:"Cyberspace warfare" },
  { id:"golden",  name:"Gilded Seas",       cost:3000, rarity:"MYTHIC",    bg:"#1a1200", grid:"#3d2a00", desc:"Legendary golden ocean" },
];

const TITLES = [
  { id:"rookie",   name:"Sea Rookie",     cost:0,    rarity:"FREE"    },
  { id:"hunter",   name:"Ship Hunter",    cost:500,  rarity:"COMMON"  },
  { id:"ghost",    name:"Ocean Ghost",    cost:1000, rarity:"RARE"    },
  { id:"warlord",  name:"Naval Warlord",  cost:2000, rarity:"EPIC"    },
  { id:"legend",   name:"Fleet Legend",   cost:4000, rarity:"LEGENDARY"},
  { id:"phantom",  name:"Phantom Admiral",cost:8000, rarity:"MYTHIC"  },
];

const EMOTES = [
  { id:"wave",    name:"🌊 Wave",       cost:0    },
  { id:"boom",    name:"💥 Boom",       cost:200  },
  { id:"skull",   name:"💀 Skull",      cost:200  },
  { id:"fire",    name:"🔥 Fire",       cost:400  },
  { id:"crown",   name:"👑 Crown",      cost:600  },
  { id:"anchor",  name:"⚓ Anchor",     cost:600  },
  { id:"ghost",   name:"👻 Ghost",      cost:1000 },
  { id:"diamond", name:"💎 Diamond",    cost:1500 },
];

const WORLDS = [
  { id:1, name:"Coral Shallows",    ai:1, reward:120, xp:200,  badge:"🪸", desc:"Learn the basics. Rookie AI.", color:"#22c55e" },
  { id:2, name:"Iron Straits",      ai:2, reward:250, xp:400,  badge:"⚓", desc:"Smarter AI. Hunt & destroy.", color:"#3b82f6" },
  { id:3, name:"Abyssal Trench",    ai:3, reward:500, xp:800,  badge:"🌊", desc:"Checkerboard targeting AI.", color:"#a855f7" },
  { id:4, name:"Crimson Seas",      ai:4, reward:800, xp:1200, badge:"🩸", desc:"Cluster bombing AI.", color:"#ef4444" },
  { id:5, name:"Phantom Rift",      ai:5, reward:1200,xp:1800, badge:"👻", desc:"Near-perfect targeting.", color:"#f0abfc" },
  { id:6, name:"Void Command",      ai:6, reward:2000,xp:3000, badge:"🌌", desc:"The ultimate machine mind.", color:"#fbbf24" },
];

const ACHIEVEMENTS = [
  { id:"first_blood",   name:"First Blood",      desc:"Win your first match",              icon:"🩸", reward:100  },
  { id:"sharp_shot",    name:"Sharpshooter",      desc:"Hit 5 in a row without missing",    icon:"🎯", reward:200  },
  { id:"destroyer",     name:"Ship Breaker",       desc:"Sink 10 ships total",               icon:"⚓", reward:300  },
  { id:"clean_sweep",   name:"Clean Sweep",       desc:"Win with 100% accuracy",            icon:"✨", reward:500  },
  { id:"worlds_1",      name:"Coral Graduate",    desc:"Complete Coral Shallows",           icon:"🪸", reward:200  },
  { id:"worlds_3",      name:"Deep Diver",        desc:"Complete Abyssal Trench",           icon:"🌊", reward:500  },
  { id:"worlds_6",      name:"Void Conqueror",    desc:"Complete all 6 worlds",             icon:"🌌", reward:2000 },
  { id:"collector_5",   name:"Collector",         desc:"Own 5 cosmetic items",              icon:"🛍️", reward:300  },
  { id:"coin_1000",     name:"Wealthy Admiral",   desc:"Accumulate 1000 coins at once",     icon:"🪙", reward:200  },
  { id:"streak_3",      name:"Win Streak",        desc:"Win 3 matches in a row",            icon:"🔥", reward:400  },
];

// ─── DEFAULT SAVE ─────────────────────────────────────────────────────────────
const DEFAULT = {
  coins: 750,
  xp: 0,
  wins: 0,
  losses: 0,
  totalShots: 0,
  totalHits: 0,
  totalSinks: 0,
  winStreak: 0,
  maxStreak: 0,
  worldProgress: 1,
  inventory: ["steel","cannon","ocean","rookie","wave"],
  equipped: { skin:"steel", marker:"cannon", board:"ocean", title:"rookie", emotes:["wave"] },
  achievements: [],
  lastDaily: null,
  matchHistory: [],
  consecutiveHits: 0,
  version: VERSION,
};

// ─── AUDIO ENGINE ─────────────────────────────────────────────────────────────
let _actx = null;
const getAudioCtx = () => {
  if (!_actx && typeof AudioContext !== "undefined") _actx = new AudioContext();
  else if (!_actx && typeof webkitAudioContext !== "undefined") _actx = new webkitAudioContext();
  return _actx;
};

const SFX = {
  play(type) {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const t = ctx.currentTime;
      const presets = {
        place:  { type:"sine",     freq:[400,300],     time:0.1,  vol:0.08 },
        shoot:  { type:"square",   freq:[200,60],      time:0.12, vol:0.1  },
        hit:    { type:"sawtooth", freq:[120,15],      time:0.35, vol:0.25 },
        miss:   { type:"sine",     freq:[350,250],     time:0.2,  vol:0.12 },
        sink:   { type:"sawtooth", freq:[80,10],       time:0.5,  vol:0.3  },
        win:    { type:"triangle", freq:[523,659,784], time:0.8,  vol:0.2  },
        lose:   { type:"sawtooth", freq:[200,100,50],  time:1.0,  vol:0.15 },
        coin:   { type:"sine",     freq:[600,800],     time:0.15, vol:0.08 },
        click:  { type:"sine",     freq:[300,400],     time:0.05, vol:0.05 },
        unlock: { type:"triangle", freq:[440,550,660], time:0.6,  vol:0.15 },
      };
      const p = presets[type] || presets.click;
      osc.type = p.type;
      const freqs = p.freq;
      osc.frequency.setValueAtTime(freqs[0], t);
      freqs.forEach((f, i) => { if (i > 0) osc.frequency.linearRampToValueAtTime(f, t + (p.time * i / (freqs.length - 1))); });
      gain.gain.setValueAtTime(p.vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + p.time);
      osc.start(t); osc.stop(t + p.time + 0.01);
    } catch {}
  }
};

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const Store = {
  load: () => { try { const v=localStorage.getItem(SAVE_KEY); if(!v) return null; const d=JSON.parse(v); return d.version===VERSION ? d : {...DEFAULT,...d,version:VERSION}; } catch { return null; } },
  save: (d) => { try { localStorage.setItem(SAVE_KEY,JSON.stringify(d)); } catch {} },
  wipe: () => { try { localStorage.removeItem(SAVE_KEY); } catch {} },
};

// ─── GAME LOGIC ───────────────────────────────────────────────────────────────
const makeBoard = () => Array(ROWS).fill(null).map(()=>Array(COLS).fill(null));

const canPlace = (placed, size, x, y, vert) => {
  if (vert ? y+size>ROWS : x+size>COLS) return false;
  for (let i=0;i<size;i++) {
    const cx=vert?x:x+i, cy=vert?y+i:y;
    for (const s of placed) {
      for (let j=0;j<s.size;j++) {
        const sx=s.vert?s.x:s.x+j, sy=s.vert?s.y+j:s.y;
        if(cx===sx&&cy===sy) return false;
      }
    }
  }
  return true;
};

const randomFleet = () => {
  const fleet=[];
  for (const t of SHIPS) {
    let ok=false;
    while(!ok) {
      const x=~~(Math.random()*COLS), y=~~(Math.random()*ROWS), vert=Math.random()>.5;
      if(canPlace(fleet,t.size,x,y,vert)) { fleet.push({...t,x,y,vert,hits:[]}); ok=true; }
    }
  }
  return fleet;
};

const getShipAt = (ships, x, y) => {
  for (const s of ships) {
    for (let i=0;i<s.size;i++) {
      const sx=s.vert?s.x:s.x+i, sy=s.vert?s.y+i:s.y;
      if(sx===x&&sy===y) return s;
    }
  }
  return null;
};

const isSunk = (ship) => ship.hits.length>=ship.size;
const allSunk = (ships) => ships.every(isSunk);

// ─── AI ENGINE ────────────────────────────────────────────────────────────────
const botMove = (guesses, playerShips, level) => {
  const avail=[];
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) if(!guesses[y][x]) avail.push({x,y});
  if(!avail.length) return null;

  if(level===1) return avail[~~(Math.random()*avail.length)];

  // Find hit cells that aren't part of sunk ships
  const sunkCells = new Set();
  playerShips.filter(isSunk).forEach(s => {
    for(let i=0;i<s.size;i++) {
      const sx=s.vert?s.x:s.x+i, sy=s.vert?s.y+i:s.y;
      sunkCells.add(`${sx},${sy}`);
    }
  });

  const activeHits=[];
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) {
    if(guesses[y][x]==='hit' && !sunkCells.has(`${x},${y}`)) activeHits.push({x,y});
  }

  // Level 2+: Hunt mode — shoot adjacent to existing hits
  if(activeHits.length>0) {
    const hunts=[];
    // Try to find direction of ship
    if(activeHits.length>=2) {
      const sorted=[...activeHits];
      const horizontal=sorted.every(h=>h.y===sorted[0].y);
      const vertical=sorted.every(h=>h.x===sorted[0].x);
      if(horizontal) {
        const ys=sorted[0].y;
        const xs=sorted.map(h=>h.x).sort((a,b)=>a-b);
        const minX=xs[0], maxX=xs[xs.length-1];
        if(minX>0 && !guesses[ys][minX-1]) hunts.push({x:minX-1,y:ys});
        if(maxX<COLS-1 && !guesses[ys][maxX+1]) hunts.push({x:maxX+1,y:ys});
      } else if(vertical) {
        const xs2=sorted[0].x;
        const ys2=sorted.map(h=>h.y).sort((a,b)=>a-b);
        const minY=ys2[0], maxY=ys2[ys2.length-1];
        if(minY>0 && !guesses[minY-1][xs2]) hunts.push({x:xs2,y:minY-1});
        if(maxY<ROWS-1 && !guesses[maxY+1][xs2]) hunts.push({x:xs2,y:maxY+1});
      }
    }
    if(!hunts.length) {
      activeHits.forEach(({x,y})=>{
        [{x,y:y-1},{x,y:y+1},{x:x-1,y},{x:x+1,y}].forEach(a=>{
          if(a.x>=0&&a.x<COLS&&a.y>=0&&a.y<ROWS&&!guesses[a.y][a.x]) hunts.push(a);
        });
      });
    }
    if(hunts.length) return hunts[~~(Math.random()*hunts.length)];
  }

  // Level 2+: Checkerboard parity
  if(level>=2) {
    const parity = level>=5 ? 1 : 2;
    const cb=avail.filter(({x,y})=>(x+y)%parity===0);
    const pool=cb.length>0?cb:avail;
    
    // Level 4+: Probability density
    if(level>=4) {
      const scores=new Map();
      pool.forEach(({x,y})=>scores.set(`${x},${y}`,0));
      for(const ship of playerShips) {
        if(isSunk(ship)) continue;
        for(let vert of[false,true]) {
          for(let i=0;i<ROWS;i++) for(let j=0;j<COLS;j++) {
            if(canPlace(playerShips.filter(s=>!isSunk(s)),ship.size,j,i,vert)) {
              for(let k=0;k<ship.size;k++) {
                const cx=vert?j:j+k, cy=vert?i+k:i;
                const key=`${cx},${cy}`;
                if(scores.has(key)) scores.set(key,(scores.get(key)||0)+1);
              }
            }
          }
        }
      }
      let best=null, bestScore=-1;
      scores.forEach((score,key)=>{ if(score>bestScore){bestScore=score;best=key;} });
      if(best) { const [bx,by]=best.split(',').map(Number); return {x:bx,y:by}; }
    }
    
    return pool[~~(Math.random()*pool.length)];
  }

  return avail[~~(Math.random()*avail.length)];
};

// ─── RARITY STYLING ───────────────────────────────────────────────────────────
const RARITY_COLORS = {
  FREE:      "#64748b",
  COMMON:    "#22c55e",
  RARE:      "#3b82f6",
  EPIC:      "#a855f7",
  LEGENDARY: "#f59e0b",
  MYTHIC:    "#ec4899",
};

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class Boundary extends React.Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  render(){
    if(this.state.err) return(
      <div style={{background:"#020617",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"monospace"}}>
        <div style={{fontSize:"4rem",marginBottom:20}}>⚠️</div>
        <h2 style={{color:"#ef4444",marginBottom:10}}>SYSTEM FAILURE</h2>
        <p style={{color:"#64748b",marginBottom:30}}>{String(this.state.err)}</p>
        <button onClick={()=>{Store.wipe();window.location.reload();}} style={{background:"#ef4444",color:"#fff",border:"none",padding:"12px 28px",borderRadius:8,cursor:"pointer",fontWeight:"bold"}}>FACTORY RESET</button>
      </div>
    );
    return this.props.children;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN GAME
// ══════════════════════════════════════════════════════════════════════════════
function Game() {
  const [save, _setSave] = useState(()=>Store.load()||DEFAULT);
  const [screen, setScreen] = useState("menu");
  const [shopTab, setShopTab] = useState("skins");
  const [match, setMatch] = useState(null);
  const [matchMode, setMatchMode] = useState("bot");
  const [activeWorld, setActiveWorld] = useState(null);
  const [placingIdx, setPlacingIdx] = useState(0);
  const [vert, setVert] = useState(false);
  const [hoverCell, setHoverCell] = useState(null);
  const [toast, setToast] = useState([]);
  const [shakeBoard, setShakeBoard] = useState(null);
  const [flash, setFlash] = useState(null);
  const [lastAnim, setLastAnim] = useState(null);
  const [showDaily, setShowDaily] = useState(false);
  const [newAchievements, setNewAchievements] = useState([]);
  const [statsOpen, setStatsOpen] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const toastRef = useRef(0);
  const botTimer = useRef(null);

  const setSave = useCallback((updater) => {
    _setSave(prev => {
      const next = typeof updater==='function' ? updater(prev) : {...prev,...updater};
      Store.save(next);
      return next;
    });
  }, []);

  // Initialize audio on interaction
  useEffect(()=>{ const init=()=>getAudioCtx(); window.addEventListener('pointerdown',init,{once:true}); return()=>window.removeEventListener('pointerdown',init); },[]);

  // Check daily reward
  useEffect(()=>{
    if(!save.lastDaily || new Date().toDateString()!==new Date(save.lastDaily).toDateString()) {
      const isNew = !save.lastDaily;
      if(!isNew) setShowDaily(true);
    }
  },[]);

  // Achievement checker
  const checkAchievements = useCallback((newSave) => {
    const newOnes = [];
    const already = new Set(newSave.achievements||[]);
    
    if(newSave.wins>=1 && !already.has("first_blood")) newOnes.push("first_blood");
    if(newSave.totalSinks>=10 && !already.has("destroyer")) newOnes.push("destroyer");
    if((newSave.inventory||[]).length>=5 && !already.has("collector_5")) newOnes.push("collector_5");
    if(newSave.coins>=1000 && !already.has("coin_1000")) newOnes.push("coin_1000");
    if(newSave.winStreak>=3 && !already.has("streak_3")) newOnes.push("streak_3");
    if(newSave.worldProgress>1 && !already.has("worlds_1")) newOnes.push("worlds_1");
    if(newSave.worldProgress>3 && !already.has("worlds_3")) newOnes.push("worlds_3");
    if(newSave.worldProgress>6 && !already.has("worlds_6")) newOnes.push("worlds_6");
    
    return newOnes;
  }, []);

  const addToast = useCallback((msg, color="#ef4444", duration=2500) => {
    const id = ++toastRef.current;
    setToast(p=>[...p,{id,msg,color}]);
    setTimeout(()=>setToast(p=>p.filter(t=>t.id!==id)), duration);
  }, []);

  const claimDaily = () => {
    SFX.play('coin');
    setSave(p=>({...p,coins:p.coins+DAILY_REWARD,lastDaily:new Date().toISOString()}));
    setShowDaily(false);
    addToast(`🌅 Daily Login: +${DAILY_REWARD} Coins!`, "#fbbf24", 3000);
  };

  const getRank = (xp) => {
    let rank=0;
    for(let i=RANK_THRESHOLDS.length-1;i>=0;i--) { if(xp>=RANK_THRESHOLDS[i]){rank=i;break;} }
    return rank;
  };

  const getRankProgress = (xp) => {
    const r=getRank(xp);
    if(r>=RANK_NAMES.length-1) return 1;
    const lo=RANK_THRESHOLDS[r], hi=RANK_THRESHOLDS[r+1];
    return (xp-lo)/(hi-lo);
  };

  // ─── MATCH START ────────────────────────────────────────────────────────────
  const startMatch = useCallback((mode, world=null) => {
    SFX.play('click');
    setMatchMode(mode);
    setActiveWorld(world);
    const m = {
      mode,
      world,
      p1:{ ships:[], shots:makeBoard() },
      p2:{ ships:mode==="bot"?randomFleet():[], shots:makeBoard() },
      turn:1,
      phase:"setup",
      winner:null,
      p1ShotsCount:0, p1HitsCount:0,
      consecutiveHits:0,
    };
    setMatch(m);
    setPlacingIdx(0);
    setVert(false);
    setScreen("setup");
  }, []);

  const abortMatch = useCallback(()=>{
    if(botTimer.current) clearTimeout(botTimer.current);
    setMatch(null);
    setActiveWorld(null);
    setScreen("menu");
    SFX.play('click');
  }, []);

  // ─── PLACEMENT ──────────────────────────────────────────────────────────────
  const handlePlace = useCallback((x, y) => {
    if(!match||match.phase!=="setup") return;
    const pKey = match.turn===1?"p1":"p2";
    const ship = SHIPS[placingIdx];
    if(!canPlace(match[pKey].ships, ship.size, x, y, vert)) return;
    
    SFX.play('place');
    const newShips=[...match[pKey].ships,{...ship,x,y,vert,hits:[]}];
    const lastShip = placingIdx+1>=SHIPS.length;

    const nextMatch = {...match,[pKey]:{...match[pKey],ships:newShips}};
    if(!lastShip) {
      setMatch(nextMatch);
      setPlacingIdx(placingIdx+1);
    } else {
      setPlacingIdx(0);
      if(match.turn===1 && match.mode==="local") {
        nextMatch.turn=2;
        setMatch(nextMatch);
        setScreen("pass");
      } else {
        nextMatch.turn=1;
        nextMatch.phase="play";
        setMatch(nextMatch);
        setScreen("play");
      }
    }
  }, [match, placingIdx, vert]);

  // ─── SHOT LOGIC ─────────────────────────────────────────────────────────────
  const fireShot = useCallback((x, y, isBot=false) => {
    setMatch(prevMatch => {
      if(!prevMatch||prevMatch.phase!=="play") return prevMatch;
      const atkKey=prevMatch.turn===1?"p1":"p2";
      const defKey=prevMatch.turn===1?"p2":"p1";
      if(prevMatch[atkKey].shots[y][x]) return prevMatch;

      const newShots = prevMatch[atkKey].shots.map(r=>[...r]);
      const defShips = prevMatch[defKey].ships.map(s=>({...s,hits:[...s.hits]}));

      const hitShip = getShipAt(defShips, x, y);
      const isHit = !!hitShip;
      let sunkShip = null;

      if(hitShip) {
        hitShip.hits.push({x,y});
        if(isSunk(hitShip)) sunkShip=hitShip;
      }

      newShots[y][x] = isHit ? 'hit' : 'miss';

      const won = allSunk(defShips);
      const updatedP1 = atkKey==="p1"
        ? {...prevMatch.p1,shots:newShots,hitsCount:(prevMatch.p1.hitsCount||0)+(isHit?1:0),shotsCount:(prevMatch.p1.shotsCount||0)+1}
        : {...prevMatch.p1,ships:defShips};
      const updatedP2 = atkKey==="p2"
        ? {...prevMatch.p2,shots:newShots,hitsCount:(prevMatch.p2.hitsCount||0)+(isHit?1:0),shotsCount:(prevMatch.p2.shotsCount||0)+1}
        : {...prevMatch.p2,ships:defShips};

      const nextMatch = {
        ...prevMatch,
        p1:updatedP1,
        p2:updatedP2,
        winner: won ? prevMatch.turn : null,
        turn: won ? prevMatch.turn : (isHit ? prevMatch.turn : (prevMatch.turn===1?2:1)),
      };

      // Side effects (deferred)
      if(isHit) {
        SFX.play(sunkShip?'sink':'hit');
        setShakeBoard(defKey);
        setTimeout(()=>setShakeBoard(null),500);
        setFlash({x,y,board:defKey});
        setTimeout(()=>setFlash(null),400);
        setLastAnim({type:'hit',x,y,board:defKey,sunk:sunkShip?.name});
        if(sunkShip) addToast(`💥 ${sunkShip.name.toUpperCase()} DESTROYED!`, "#ef4444", 2000);
        else addToast("🎯 DIRECT HIT! Extra turn.", "#22c55e", 1500);
      } else {
        SFX.play('miss');
        setLastAnim({type:'miss',x,y,board:defKey});
        addToast(prevMatch.turn===1?"💦 Miss! Enemy's turn." : "💦 Miss! Your turn.", "#64748b", 1500);
      }

      if(won) {
        SFX.play(prevMatch.turn===1?'win':'lose');
        const isPlayerWin = prevMatch.turn===1;
        const reward = isPlayerWin ? (activeWorld?.reward||75) : 0;
        const xpGain = isPlayerWin ? (activeWorld?.xp||150) : 50;
        
        setSave(prev => {
          const newXp = prev.xp + xpGain;
          const newWins = prev.wins + (isPlayerWin?1:0);
          const newLosses = prev.losses + (isPlayerWin?0:1);
          const newStreak = isPlayerWin ? prev.winStreak+1 : 0;
          const newMaxStreak = Math.max(prev.maxStreak, newStreak);
          const newWorldProgress = (isPlayerWin && activeWorld && activeWorld.id===prev.worldProgress)
            ? Math.min(prev.worldProgress+1, WORLDS.length+1) : prev.worldProgress;

          const shots = atkKey==="p1" ? (nextMatch.p1.shotsCount||0) : (nextMatch.p2.shotsCount||0);
          const hits = atkKey==="p1" ? (nextMatch.p1.hitsCount||0) : (nextMatch.p2.hitsCount||0);
          const accuracy = shots>0 ? Math.round((hits/shots)*100) : 0;
          let bonusCoins = 0;
          if(accuracy===100&&isPlayerWin) bonusCoins=500;
          
          const updated = {
            ...prev,
            coins: prev.coins + reward + bonusCoins,
            xp: newXp,
            wins: newWins,
            losses: newLosses,
            winStreak: newStreak,
            maxStreak: newMaxStreak,
            totalShots: prev.totalShots + 1,
            totalHits: prev.totalHits + (isHit?1:0),
            totalSinks: prev.totalSinks + (sunkShip?1:0),
            worldProgress: newWorldProgress,
          };
          
          const newAch = checkAchievements(updated);
          if(newAch.length>0) {
            updated.achievements = [...(prev.achievements||[]),...newAch];
            let achRewards = 0;
            newAch.forEach(id=>{
              const a=ACHIEVEMENTS.find(a=>a.id===id);
              if(a) achRewards+=a.reward;
            });
            updated.coins += achRewards;
            setTimeout(()=>{
              setNewAchievements(newAch);
              SFX.play('unlock');
            }, 2000);
          }
          
          return updated;
        });

        setTimeout(()=>setScreen("gameover"), 1800);
      }

      return nextMatch;
    });
  }, [activeWorld, addToast, checkAchievements, setSave]);

  // ─── BOT AI LOOP ────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!match||match.phase!=="play"||match.turn!==2||match.mode!=="bot"||match.winner) return;
    const delay = 800 + Math.random()*600;
    botTimer.current = setTimeout(()=>{
      const level = activeWorld?.ai||1;
      const move = botMove(match.p2.shots, match.p1.ships, level);
      if(move) fireShot(move.x, move.y, true);
    }, delay);
    return ()=>clearTimeout(botTimer.current);
  }, [match, activeWorld, fireShot]);

  // ─── GHOST SHIP PREVIEW ─────────────────────────────────────────────────────
  const ghostCells = useMemo(()=>{
    if(screen!=="setup"||!hoverCell) return [];
    const ship=SHIPS[placingIdx];
    const cells=[];
    let valid=true;
    const pKey=match?.turn===1?"p1":"p2";
    const placed=match?.[pKey]?.ships||[];
    for(let i=0;i<ship.size;i++) {
      const cx=vert?hoverCell.x:hoverCell.x+i;
      const cy=vert?hoverCell.y+i:hoverCell.y;
      if(cx>=COLS||cy>=ROWS){valid=false;break;}
      cells.push({x:cx,y:cy});
    }
    if(!valid) return [];
    const canP = canPlace(placed,ship.size,hoverCell.x,hoverCell.y,vert);
    return cells.map(c=>({...c,valid:canP}));
  },[hoverCell,placingIdx,vert,match,screen]);

  // ── COMPUTED ────────────────────────────────────────────────────────────────
  const rank = getRank(save.xp);
  const rankPct = getRankProgress(save.xp);
  const boardConfig = BOARDS.find(b=>b.id===(save.equipped?.board||"ocean"))||BOARDS[0];
  const skinConfig = SKINS.find(s=>s.id===(save.equipped?.skin||"steel"))||SKINS[0];
  const markerConfig = MARKERS.find(m=>m.id===(save.equipped?.marker||"cannon"))||MARKERS[0];
  const titleConfig = TITLES.find(t=>t.id===(save.equipped?.title||"rookie"))||TITLES[0];
  const accuracy = save.totalShots>0 ? Math.round((save.totalHits/save.totalShots)*100) : 0;

  // ─── RENDER HELPERS ─────────────────────────────────────────────────────────

  const renderShip = (ship, skinId, sunk=false) => {
    const sk = SKINS.find(s=>s.id===skinId)||SKINS[0];
    const w = ship.vert?CELL:ship.size*CELL;
    const h = ship.vert?ship.size*CELL:CELL;
    return (
      <div key={`${ship.id}-${ship.x}-${ship.y}`} style={{
        position:"absolute",
        left:ship.x*CELL+3, top:ship.y*CELL+3,
        width:w-6, height:h-6,
        borderRadius:10,
        background:sunk?"#1e293b":`linear-gradient(135deg, ${sk.color}33, ${sk.color}11)`,
        border:`2px solid ${sunk?"#334155":sk.color}`,
        boxShadow:sunk?"none":sk.glow,
        opacity:sunk?0.35:1,
        transition:"all 0.3s ease",
        pointerEvents:"none",
        zIndex:2,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:Math.min(12, CELL*0.3),
        overflow:"hidden",
      }}>
        {!sunk && (
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:2,opacity:0.7}}>
            {Array(ship.size).fill(0).map((_,i)=>(
              <div key={i} style={{width:6,height:6,borderRadius:"50%",background:sk.color,flexShrink:0}} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMarker = (type, color) => {
    if(type==="cannon") return (
      <div style={{position:"relative",width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:"70%",height:"70%",background:color+"22",borderRadius:"50%"}}/>
        <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" style={{position:"relative",zIndex:1}}>
          <line x1="4" y1="4" x2="20" y2="20" stroke={color} strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="20" y1="4" x2="4" y2="20" stroke={color} strokeWidth="3.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
    if(type==="plasma") return <div style={{width:"75%",height:"75%",background:color,borderRadius:"50%",boxShadow:`0 0 12px ${color}, 0 0 4px #fff inset`,margin:"auto"}} />;
    if(type==="dark") return <div style={{width:"75%",height:"75%",background:"#000",border:`2.5px solid ${color}`,borderRadius:"50%",boxShadow:`0 0 14px ${color}`,margin:"auto"}} />;
    if(type==="cryo") return (
      <svg width="70%" height="70%" viewBox="0 0 24 24" fill={color} style={{margin:"auto",filter:`drop-shadow(0 0 6px ${color})`}}>
        <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/>
      </svg>
    );
    if(type==="solar") return (
      <svg width="70%" height="70%" viewBox="0 0 24 24" fill={color} style={{margin:"auto",filter:`drop-shadow(0 0 8px ${color})`}}>
        <polygon points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10"/>
      </svg>
    );
    if(type==="phantom") return (
      <div style={{width:"80%",height:"80%",margin:"auto",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",inset:0,border:`2px solid ${color}`,borderRadius:4,transform:"rotate(45deg)",boxShadow:`0 0 10px ${color}`}}/>
      </div>
    );
    return <div style={{width:"70%",height:"70%",background:color,borderRadius:"50%",margin:"auto"}} />;
  };

  const renderBoard = (boardKey, interactive=false, showShips=false) => {
    if(!match) return null;
    const defKey = boardKey;
    const atkKey = boardKey==="p1"?"p2":"p1";
    const shots = match[atkKey].shots;
    const ships = match[boardKey].ships;
    const isMyBoard = boardKey==="p1";
    const isTargetable = interactive && match.phase==="play" && 
      ((matchMode==="bot" && boardKey==="p2" && match.turn===1) ||
       (matchMode==="local" && ((boardKey==="p2"&&match.turn===1)||(boardKey==="p1"&&match.turn===2))));
    const isShaking = shakeBoard===boardKey;
    const wConf = BOARDS.find(b=>b.id===(save.equipped?.board||"ocean"))||BOARDS[0];
    const mk = MARKERS.find(m=>m.id===(save.equipped?.marker||"cannon"))||MARKERS[0];

    return (
      <div style={{
        position:"relative",
        width:COLS*CELL, height:ROWS*CELL,
        background:wConf.bg,
        border:`2px solid ${isTargetable?"#ef444488":"#1e293b"}`,
        borderRadius:14,
        boxShadow:isTargetable?"0 0 30px rgba(239,68,68,0.2)":"none",
        overflow:"hidden",
        animation:isShaking?"boardShake 0.45s ease":"none",
        transition:"border-color 0.3s",
        flexShrink:0,
      }}>
        {/* Grid lines */}
        {Array(ROWS).fill(0).map((_,y)=>Array(COLS).fill(0).map((__,x)=>{
          const shot = shots[y][x];
          const ghostCell = ghostCells.find(g=>g.x===x&&g.y===y);
          const isFlash = flash?.x===x&&flash?.y===y&&flash?.board===boardKey;

          return (
            <div key={`${x}-${y}`}
              onMouseEnter={()=>isTargetable&&!shot&&setHoverCell({x,y})}
              onMouseLeave={()=>setHoverCell(null)}
              onClick={()=>isTargetable&&!shot&&fireShot(x,y)}
              style={{
                position:"absolute", left:x*CELL, top:y*CELL,
                width:CELL, height:CELL,
                border:`0.5px solid ${wConf.grid}44`,
                cursor:isTargetable&&!shot?"crosshair":"default",
                background: ghostCell ? (ghostCell.valid?"rgba(59,130,246,0.2)":"rgba(239,68,68,0.2)") :
                            (isTargetable&&!shot&&hoverCell?.x===x&&hoverCell?.y===y?"rgba(239,68,68,0.15)":"transparent"),
                transition:"background 0.1s",
                display:"flex", alignItems:"center", justifyContent:"center",
                zIndex:1,
              }}>
              {isFlash && <div style={{position:"absolute",inset:0,background:"#fff",opacity:0.9,animation:"flashOut 0.35s forwards"}}/>}
              {shot==="hit" && (
                <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",animation:"popIn 0.25s ease"}}>
                  {renderMarker(mk.id, mk.color)}
                </div>
              )}
              {shot==="miss" && (
                <div style={{width:10,height:10,borderRadius:"50%",background:"#475569",opacity:0.7,animation:"popIn 0.2s ease"}}/>
              )}
            </div>
          );
        }))}

        {/* Ships */}
        {ships.filter(s=>showShips||isSunk(s)||(boardKey==="p1"&&matchMode==="bot")).map(s=>renderShip(s,save.equipped?.skin||"steel",isSunk(s)))}
        
        {/* Show own ships in setup */}
        {screen==="setup" && boardKey==="p1" && match[match.turn===1?"p1":"p2"].ships.map(s=>renderShip(s,save.equipped?.skin||"steel",false))}
        
        {/* Ghost preview */}
        {screen==="setup" && ghostCells.map(({x,y,valid})=>(
          <div key={`ghost-${x}-${y}`} style={{
            position:"absolute", left:x*CELL+3, top:y*CELL+3,
            width:CELL-6, height:CELL-6,
            background:valid?"rgba(59,130,246,0.3)":"rgba(239,68,68,0.3)",
            border:`2px dashed ${valid?"#3b82f6":"#ef4444"}`,
            borderRadius:6, pointerEvents:"none", zIndex:3,
            animation:"ghostPulse 0.8s ease infinite alternate",
          }}/>
        ))}

        {/* Coordinate labels */}
        {Array(COLS).fill(0).map((_,i)=>(
          <div key={`col-${i}`} style={{position:"absolute",top:-20,left:i*CELL,width:CELL,textAlign:"center",fontSize:10,color:"#475569",pointerEvents:"none"}}>{String.fromCharCode(65+i)}</div>
        ))}
        {Array(ROWS).fill(0).map((_,i)=>(
          <div key={`row-${i}`} style={{position:"absolute",left:-18,top:i*CELL,height:CELL,display:"flex",alignItems:"center",fontSize:10,color:"#475569",pointerEvents:"none"}}>{i+1}</div>
        ))}
      </div>
    );
  };

  // ─── SCREENS ─────────────────────────────────────────────────────────────────

  const renderMenu = () => (
    <div style={{maxWidth:900,margin:"0 auto",padding:"0 20px"}}>
      {/* Hero */}
      <div style={{textAlign:"center",padding:"40px 0 30px"}}>
        <div style={{fontSize:"4.5rem",fontWeight:900,letterSpacing:"-2px",lineHeight:1,marginBottom:8}}>
          BATTLE<span style={{color:"#ef4444",textShadow:"0 0 30px #ef444488"}}>FLEET</span>
        </div>
        <div style={{color:"#f0abfc",fontSize:"1rem",letterSpacing:3,fontWeight:300,textTransform:"uppercase",marginBottom:6}}>Phantom Tides</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:20,padding:"6px 16px",fontSize:13,color:RANK_COLORS[rank]}}>
          <span>⚓</span>
          <span style={{fontWeight:600}}>{RANK_NAMES[rank]}</span>
          <span style={{color:"#64748b"}}>•</span>
          <span style={{color:"#64748b"}}>{save.xp.toLocaleString()} XP</span>
        </div>
        {/* XP Bar */}
        <div style={{maxWidth:300,margin:"12px auto 0",height:4,background:"#1e293b",borderRadius:2,overflow:"hidden"}}>
          <div style={{width:`${rankPct*100}%`,height:"100%",background:`linear-gradient(90deg,${RANK_COLORS[rank]},${RANK_COLORS[Math.min(rank+1,RANK_NAMES.length-1)]})`,transition:"width 0.8s ease"}}/>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:30}}>
        {[
          {label:"Wins",val:save.wins,icon:"🏆",col:"#22c55e"},
          {label:"Win Streak",val:save.winStreak,icon:"🔥",col:"#f97316"},
          {label:"Accuracy",val:accuracy+"%",icon:"🎯",col:"#3b82f6"},
          {label:"Ships Sunk",val:save.totalSinks,icon:"💥",col:"#a855f7"},
        ].map(s=>(
          <div key={s.label} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"14px 10px",textAlign:"center"}}>
            <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:"1.4rem",fontWeight:700,color:s.col}}>{s.val}</div>
            <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Nav Cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
        <NavCard icon="🌍" title="CAMPAIGN" sub="6 worlds, rise in rank" col="#8b5cf6" onClick={()=>{SFX.play('click');setScreen("campaign");}} badge={`${save.worldProgress-1}/${WORLDS.length}`}/>
        <NavCard icon="⚔️" title="LOCAL PVP" sub="Pass & play with a friend" col="#38bdf8" onClick={()=>startMatch("local")}/>
        <NavCard icon="🤖" title="QUICK BATTLE" sub="Face the AI anytime" col="#22c55e" onClick={()=>startMatch("bot",WORLDS[Math.min((save.worldProgress||1)-1,WORLDS.length-1)]||WORLDS[0])}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <NavCard icon="🛒" title="DOCKYARD" sub="Skins, boards, markers" col="#f59e0b" onClick={()=>{SFX.play('click');setScreen("shop");}}/>
        <NavCard icon="🏅" title="ACHIEVEMENTS" sub={`${save.achievements?.length||0}/${ACHIEVEMENTS.length} unlocked`} col="#ec4899" onClick={()=>{SFX.play('click');setScreen("achievements");}}/>
      </div>
    </div>
  );

  const renderCampaign = () => (
    <div style={{maxWidth:860,margin:"0 auto",padding:"0 20px"}}>
      <SectionHeader title="CAMPAIGN WORLDS" sub="Defeat every world to unlock the next" onBack={()=>{SFX.play('click');setScreen("menu");}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        {WORLDS.map(w=>{
          const unlocked = save.worldProgress>=w.id;
          const completed = save.worldProgress>w.id;
          return (
            <div key={w.id} style={{
              background:"rgba(255,255,255,0.03)",
              border:`1px solid ${unlocked?w.color+"44":"rgba(255,255,255,0.05)"}`,
              borderRadius:16,
              padding:24,
              opacity:unlocked?1:0.45,
              position:"relative",
              overflow:"hidden",
              transition:"transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e=>{if(unlocked){e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 8px 30px ${w.color}33`;}}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
              {completed && <div style={{position:"absolute",top:14,right:14,background:"#22c55e22",border:"1px solid #22c55e44",color:"#22c55e",fontSize:11,padding:"3px 10px",borderRadius:20,letterSpacing:1}}>CLEARED</div>}
              <div style={{fontSize:"2.5rem",marginBottom:10}}>{w.badge}</div>
              <div style={{fontSize:"1.3rem",fontWeight:700,color:"#fff",marginBottom:4}}>
                WORLD {w.id} — {w.name}
              </div>
              <div style={{fontSize:13,color:"#94a3b8",marginBottom:16,lineHeight:1.5}}>{unlocked?w.desc:"Complete previous world to unlock."}</div>
              <div style={{display:"flex",gap:12,marginBottom:16,fontSize:13}}>
                <span style={{color:"#fbbf24"}}>🪙 {w.reward}</span>
                <span style={{color:"#a78bfa"}}>⭐ {w.xp} XP</span>
                <span style={{color:"#64748b"}}>AI Lv.{w.ai}</span>
              </div>
              <button onClick={()=>unlocked&&startMatch("bot",w)} disabled={!unlocked}
                style={{width:"100%",padding:"11px",background:unlocked?w.color:"#1e293b",color:unlocked?"#fff":"#475569",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:unlocked?"pointer":"not-allowed",letterSpacing:1,transition:"opacity 0.2s"}}
                onMouseEnter={e=>{if(unlocked)e.target.style.opacity="0.85";}}
                onMouseLeave={e=>{e.target.style.opacity="1";}}>
                {unlocked?(completed?"REPLAY":"LAUNCH"):"🔒 LOCKED"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderShop = () => {
    const tabs = [
      {id:"skins",label:"Ship Skins",icon:"🚢"},
      {id:"markers",label:"Artillery",icon:"💥"},
      {id:"boards",label:"Boards",icon:"🌊"},
      {id:"titles",label:"Titles",icon:"🏅"},
      {id:"emotes",label:"Emotes",icon:"🎭"},
    ];
    const itemsMap = {skins:SKINS,markers:MARKERS,boards:BOARDS,titles:TITLES,emotes:EMOTES};
    const equippedMap = {
      skins:"skin",markers:"marker",boards:"board",titles:"title",emotes:null
    };

    const buyItem = (item) => {
      if(save.coins<item.cost){addToast("❌ Insufficient coins!", "#ef4444");return;}
      if(save.inventory?.includes(item.id)){addToast("Already owned!","#64748b");return;}
      SFX.play('unlock');
      setSave(p=>({...p,coins:p.coins-item.cost,inventory:[...(p.inventory||[]),item.id]}));
      addToast(`✅ ${item.name} unlocked!`,"#22c55e",2000);
    };

    const equipItem = (item, catKey) => {
      if(!catKey) return;
      SFX.play('click');
      setSave(p=>({...p,equipped:{...(p.equipped||{}), [catKey]:item.id}}));
      addToast(`⚓ ${item.name} equipped!`,"#3b82f6",1500);
    };

    return (
      <div style={{maxWidth:920,margin:"0 auto",padding:"0 20px"}}>
        <SectionHeader title="DOCKYARD" sub="Equip your fleet with the finest gear" onBack={()=>{SFX.play('click');setScreen("menu");}}>
          <div style={{background:"rgba(234,179,8,0.15)",border:"1px solid rgba(234,179,8,0.3)",color:"#fde047",padding:"8px 18px",borderRadius:20,fontSize:15,fontWeight:700}}>
            🪙 {save.coins.toLocaleString()}
          </div>
        </SectionHeader>

        <div style={{display:"flex",gap:8,marginBottom:28,overflowX:"auto",paddingBottom:4}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>{SFX.play('click');setShopTab(t.id);}}
              style={{padding:"9px 18px",borderRadius:22,border:"1px solid rgba(255,255,255,0.1)",background:shopTab===t.id?"rgba(255,255,255,0.12)":"transparent",color:shopTab===t.id?"#fff":"#94a3b8",cursor:"pointer",fontSize:13,fontWeight:shopTab===t.id?600:400,whiteSpace:"nowrap",transition:"all 0.15s"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}}>
          {(itemsMap[shopTab]||[]).map(item=>{
            const owned = (save.inventory||[]).includes(item.id);
            const catKey = equippedMap[shopTab];
            const equipped = catKey && save.equipped?.[catKey]===item.id;
            const rCol = RARITY_COLORS[item.rarity||"COMMON"]||"#64748b";
            const previewColor = item.color||item.col||"#64748b";

            return (
              <div key={item.id} style={{
                background:"rgba(255,255,255,0.03)",
                border:`1px solid ${equipped?previewColor+"66":"rgba(255,255,255,0.07)"}`,
                borderRadius:14,
                padding:16,
                display:"flex",flexDirection:"column",
                transition:"transform 0.2s, border-color 0.2s",
                position:"relative",
                overflow:"hidden",
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";}}>
                {equipped && <div style={{position:"absolute",top:8,right:8,background:previewColor+"22",border:`1px solid ${previewColor}55`,color:previewColor,fontSize:10,padding:"2px 8px",borderRadius:10,letterSpacing:1,fontWeight:700}}>ON</div>}
                
                {/* Preview */}
                <div style={{height:70,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14,background:"rgba(0,0,0,0.3)",borderRadius:8,overflow:"hidden",position:"relative"}}>
                  {shopTab==="skins" && (
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      {[5,4,3].map(sz=>(
                        <div key={sz} style={{width:sz*12,height:14,borderRadius:6,background:`linear-gradient(135deg,${previewColor}44,${previewColor}22)`,border:`1.5px solid ${previewColor}`,boxShadow:item.glow||"none"}}/>
                      ))}
                    </div>
                  )}
                  {shopTab==="markers" && (
                    <div style={{width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {renderMarker(item.id, previewColor)}
                    </div>
                  )}
                  {shopTab==="boards" && (
                    <div style={{width:"100%",height:"100%",background:item.bg,display:"grid",gridTemplateColumns:"repeat(5,1fr)",opacity:0.8}}>
                      {Array(25).fill(0).map((_,i)=><div key={i} style={{border:`0.5px solid ${item.grid}88`}}/>)}
                    </div>
                  )}
                  {shopTab==="titles" && (
                    <div style={{fontSize:15,fontWeight:700,color:rCol,letterSpacing:1}}>"{item.name}"</div>
                  )}
                  {shopTab==="emotes" && (
                    <div style={{fontSize:32}}>{item.name.split(' ')[0]}</div>
                  )}
                </div>

                <div style={{marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                  {item.rarity && <span style={{fontSize:10,color:rCol,background:rCol+"15",border:`1px solid ${rCol}33`,padding:"1px 7px",borderRadius:8,letterSpacing:1,fontWeight:700,flexShrink:0}}>{item.rarity}</span>}
                </div>
                {item.desc && <div style={{fontSize:12,color:"#64748b",marginBottom:12,lineHeight:1.4}}>{item.desc}</div>}

                {item.cost===0||owned ? (
                  catKey ? (
                    <button onClick={()=>equipItem(item,catKey)}
                      style={{width:"100%",padding:"9px",background:equipped?previewColor+"33":"rgba(255,255,255,0.07)",color:equipped?previewColor:"#cbd5e1",border:`1px solid ${equipped?previewColor+"55":"rgba(255,255,255,0.1)"}`,borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer",transition:"all 0.15s"}}>
                      {equipped?"✓ EQUIPPED":"EQUIP"}
                    </button>
                  ) : (
                    <div style={{padding:"9px",textAlign:"center",color:"#22c55e",fontSize:13,fontWeight:600}}>✓ Owned</div>
                  )
                ) : (
                  <button onClick={()=>buyItem(item)} disabled={save.coins<item.cost}
                    style={{width:"100%",padding:"9px",background:save.coins>=item.cost?"#fbbf2422":"rgba(255,255,255,0.04)",color:save.coins>=item.cost?"#fbbf24":"#475569",border:`1px solid ${save.coins>=item.cost?"#fbbf2444":"rgba(255,255,255,0.08)"}`,borderRadius:8,fontWeight:700,fontSize:13,cursor:save.coins>=item.cost?"pointer":"not-allowed",transition:"all 0.15s"}}>
                    🪙 {item.cost.toLocaleString()}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAchievements = () => (
    <div style={{maxWidth:860,margin:"0 auto",padding:"0 20px"}}>
      <SectionHeader title="ACHIEVEMENTS" sub={`${save.achievements?.length||0} / ${ACHIEVEMENTS.length} unlocked`} onBack={()=>{SFX.play('click');setScreen("menu");}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {ACHIEVEMENTS.map(a=>{
          const done = (save.achievements||[]).includes(a.id);
          return (
            <div key={a.id} style={{display:"flex",gap:14,alignItems:"center",background:done?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.015)",border:`1px solid ${done?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)"}`,borderRadius:12,padding:"14px 16px",opacity:done?1:0.5}}>
              <div style={{fontSize:"2rem",filter:done?"none":"grayscale(1)",flexShrink:0}}>{a.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:done?"#e2e8f0":"#64748b",marginBottom:2}}>{a.name}</div>
                <div style={{fontSize:12,color:"#64748b"}}>{a.desc}</div>
              </div>
              <div style={{fontSize:13,color:"#fbbf24",fontWeight:700,flexShrink:0}}>+{a.reward}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSetup = () => {
    const pKey = match?.turn===1?"p1":"p2";
    const placed = match?.[pKey]?.ships||[];
    const current = SHIPS[placingIdx];
    
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:24}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"1.8rem",fontWeight:800,color:"#38bdf8",letterSpacing:1,marginBottom:4}}>
            {matchMode==="local"?`PLAYER ${match?.turn} — `:""}DEPLOY YOUR FLEET
          </div>
          <div style={{color:"#64748b",fontSize:14}}>Click grid to place ships</div>
        </div>

        <div style={{display:"flex",gap:16,alignItems:"center",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 24px",flexWrap:"wrap",justifyContent:"center"}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {SHIPS.map((s,i)=>(
              <div key={s.id} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                opacity:i<placingIdx?0.3:i===placingIdx?1:0.6,
                transition:"opacity 0.3s",
              }}>
                <div style={{fontSize:i===placingIdx?"1.2rem":"1rem",filter:i<placingIdx?"grayscale(1)":"none"}}>{s.icon}</div>
                <div style={{fontSize:10,color:i===placingIdx?"#38bdf8":"#64748b",fontWeight:i===placingIdx?700:400}}>{s.name}</div>
                {i<placingIdx && <div style={{width:16,height:2,background:"#22c55e",borderRadius:1}}/>}
                {i===placingIdx && <div style={{width:16,height:2,background:"#38bdf8",borderRadius:1,animation:"pulse 1s infinite alternate"}}/>}
              </div>
            ))}
          </div>
          <div style={{width:1,height:48,background:"rgba(255,255,255,0.08)"}}/>
          <button onClick={()=>{SFX.play('click');setVert(v=>!v);}}
            style={{padding:"10px 20px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,color:"#fff",cursor:"pointer",fontWeight:600,fontSize:14,display:"flex",gap:8,alignItems:"center",transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}>
            <span style={{transform:vert?"rotate(90deg)":"none",display:"inline-block",transition:"transform 0.2s"}}>➡</span>
            {vert?"VERTICAL":"HORIZONTAL"}
          </button>
          <button onClick={()=>{
            SFX.play('click');
            const fleet=randomFleet();
            if(match){
              const pK=match.turn===1?"p1":"p2";
              const nextM={...match,[pK]:{...match[pK],ships:fleet}};
              setMatch(nextM);
              setPlacingIdx(0);
              const lastIdx=SHIPS.length-1;
              setPlacingIdx(SHIPS.length); // mark all as placed
              // immediately advance
              const nm={...nextM,turn:1,phase:"play"};
              setMatch(nm);
              setScreen("play");
            }
          }}
            style={{padding:"10px 20px",background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:10,color:"#93c5fd",cursor:"pointer",fontWeight:600,fontSize:14,transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(59,130,246,0.25)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(59,130,246,0.15)"}>
            🎲 AUTO PLACE
          </button>
        </div>

        <div style={{position:"relative",paddingLeft:22,paddingTop:22}}
          onMouseLeave={()=>setHoverCell(null)}>
          <div style={{position:"absolute",top:22,left:0,height:ROWS*CELL,display:"flex",flexDirection:"column"}}>
            {Array(ROWS).fill(0).map((_,i)=><div key={i} style={{height:CELL,display:"flex",alignItems:"center",fontSize:11,color:"#475569",paddingRight:4}}>{i+1}</div>)}
          </div>
          <div style={{position:"absolute",top:0,left:22,width:COLS*CELL,display:"flex"}}>
            {Array(COLS).fill(0).map((_,i)=><div key={i} style={{width:CELL,textAlign:"center",fontSize:11,color:"#475569"}}>{String.fromCharCode(65+i)}</div>)}
          </div>
          <div style={{position:"relative",width:COLS*CELL,height:ROWS*CELL,background:boardConfig.bg,border:"2px solid #1e293b",borderRadius:12,overflow:"hidden"}}>
            {Array(ROWS).fill(0).map((_,y)=>Array(COLS).fill(0).map((__,x)=>{
              const ghostCell=ghostCells.find(g=>g.x===x&&g.y===y);
              return (
                <div key={`${x}-${y}`}
                  onMouseEnter={()=>setHoverCell({x,y})}
                  onClick={()=>handlePlace(x,y)}
                  style={{position:"absolute",left:x*CELL,top:y*CELL,width:CELL,height:CELL,border:`0.5px solid ${boardConfig.grid}44`,cursor:"crosshair",
                  background:ghostCell?(ghostCell.valid?"rgba(59,130,246,0.25)":"rgba(239,68,68,0.25)"):"transparent",transition:"background 0.1s"}}/>
              );
            }))}
            {placed.map(s=>renderShip(s,save.equipped?.skin||"steel",false))}
            {ghostCells.map(({x,y,valid})=>(
              <div key={`g-${x}-${y}`} style={{position:"absolute",left:x*CELL+3,top:y*CELL+3,width:CELL-6,height:CELL-6,background:valid?"rgba(59,130,246,0.3)":"rgba(239,68,68,0.3)",border:`2px dashed ${valid?"#3b82f6":"#ef4444"}`,borderRadius:6,pointerEvents:"none",zIndex:3}}/>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPlay = () => {
    if(!match) return null;
    const isBotTurn = matchMode==="bot" && match.turn===2;
    const remainP1 = match.p2.ships.filter(s=>!isSunk(s)).length;
    const remainP2 = match.p1.ships.filter(s=>!isSunk(s)).length;
    const p1Shots = match.p1.shots.flat().filter(Boolean).length;
    const p2Shots = match.p2.shots.flat().filter(Boolean).length;

    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
        {/* Turn indicator */}
        <div style={{
          background:isBotTurn?"rgba(239,68,68,0.1)":"rgba(59,130,246,0.1)",
          border:`1px solid ${isBotTurn?"rgba(239,68,68,0.3)":"rgba(59,130,246,0.3)"}`,
          borderRadius:14, padding:"12px 32px", textAlign:"center",
          minWidth:300,
        }}>
          <div style={{fontSize:"1.3rem",fontWeight:700,color:isBotTurn?"#fca5a5":"#93c5fd",letterSpacing:1}}>
            {isBotTurn?"⚡ AI COMPUTING..." : match.turn===1?"YOUR TURN — FIRE!":"PLAYER 2 — FIRE!"}
          </div>
          {activeWorld && <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{activeWorld.name} — AI Level {activeWorld.ai}</div>}
        </div>

        {/* Boards */}
        <div style={{display:"flex",gap:40,flexWrap:"wrap",justifyContent:"center",alignItems:"flex-start"}}>
          {/* Enemy board */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
            <div style={{display:"flex",gap:16,alignItems:"center"}}>
              <div style={{fontSize:13,color:"#ef4444",fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>
                {matchMode==="bot"?"ENEMY WATERS":"P2 FLEET"}
              </div>
              <div style={{fontSize:12,color:"#64748b"}}>
                {remainP1}/{SHIPS.length} ships remain
              </div>
            </div>
            <div style={{paddingLeft:22,paddingTop:22,position:"relative"}} onMouseLeave={()=>setHoverCell(null)}>
              <div style={{position:"absolute",top:22,left:0,height:ROWS*CELL,display:"flex",flexDirection:"column"}}>
                {Array(ROWS).fill(0).map((_,i)=><div key={i} style={{height:CELL,display:"flex",alignItems:"center",fontSize:11,color:"#475569",paddingRight:4}}>{i+1}</div>)}
              </div>
              <div style={{position:"absolute",top:0,left:22,width:COLS*CELL,display:"flex"}}>
                {Array(COLS).fill(0).map((_,i)=><div key={i} style={{width:CELL,textAlign:"center",fontSize:11,color:"#475569"}}>{String.fromCharCode(65+i)}</div>)}
              </div>
              {renderBoard("p2", true, false)}
            </div>
            <div style={{display:"flex",gap:16,fontSize:13,color:"#64748b"}}>
              <span>🎯 {match.p1.shots.flat().filter(v=>v==="hit").length} hits</span>
              <span>💦 {match.p1.shots.flat().filter(v=>v==="miss").length} misses</span>
              <span>📊 {p1Shots>0?Math.round(match.p1.shots.flat().filter(v=>v==="hit").length/p1Shots*100):0}%</span>
            </div>
          </div>

          {/* Own board */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
            <div style={{display:"flex",gap:16,alignItems:"center"}}>
              <div style={{fontSize:13,color:"#38bdf8",fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>
                YOUR FLEET
              </div>
              <div style={{fontSize:12,color:"#64748b"}}>
                {remainP2}/{SHIPS.length} ships remain
              </div>
            </div>
            <div style={{paddingLeft:22,paddingTop:22,position:"relative"}}>
              <div style={{position:"absolute",top:22,left:0,height:ROWS*CELL,display:"flex",flexDirection:"column"}}>
                {Array(ROWS).fill(0).map((_,i)=><div key={i} style={{height:CELL,display:"flex",alignItems:"center",fontSize:11,color:"#475569",paddingRight:4}}>{i+1}</div>)}
              </div>
              <div style={{position:"absolute",top:0,left:22,width:COLS*CELL,display:"flex"}}>
                {Array(COLS).fill(0).map((_,i)=><div key={i} style={{width:CELL,textAlign:"center",fontSize:11,color:"#475569"}}>{String.fromCharCode(65+i)}</div>)}
              </div>
              {renderBoard("p1", false, true)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGameOver = () => {
    if(!match) return null;
    const playerWon = match.winner===1;
    const shots = match.p1.shots.flat().filter(Boolean).length;
    const hits = match.p1.shots.flat().filter(v=>v==="hit").length;
    const acc = shots>0?Math.round(hits/shots*100):0;
    const sinks = match.p2.ships.filter(isSunk).length;
    const reward = playerWon?(activeWorld?.reward||75):0;
    const xp = playerWon?(activeWorld?.xp||150):50;

    return (
      <div style={{textAlign:"center",maxWidth:600,margin:"0 auto",padding:"0 20px"}}>
        <div style={{fontSize:"5rem",marginBottom:10}}>{playerWon?"🏆":"💀"}</div>
        <div style={{fontSize:"3.5rem",fontWeight:900,letterSpacing:"-1px",color:playerWon?"#fbbf24":"#ef4444",textShadow:playerWon?"0 0 40px #fbbf2466":"0 0 40px #ef444466",marginBottom:6}}>
          {playerWon?"VICTORY!":"DEFEAT"}
        </div>
        <div style={{color:"#64748b",marginBottom:36,fontSize:15}}>
          {playerWon?"Enemy fleet annihilated. Well fought, Admiral.":"Your fleet has been sunk. Better luck next time."}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:36}}>
          {[
            {label:"Accuracy",val:acc+"%",col:"#38bdf8"},
            {label:"Ships Sunk",val:sinks+"/5",col:"#22c55e"},
            {label:"Total Shots",val:shots,col:"#a855f7"},
          ].map(s=>(
            <div key={s.label} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"18px 10px"}}>
              <div style={{fontSize:"2rem",fontWeight:700,color:s.col,marginBottom:4}}>{s.val}</div>
              <div style={{fontSize:12,color:"#64748b",letterSpacing:1}}>{s.label}</div>
            </div>
          ))}
        </div>

        {playerWon && (
          <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:28}}>
            <div style={{background:"rgba(234,179,8,0.15)",border:"1px solid rgba(234,179,8,0.3)",borderRadius:12,padding:"12px 24px",color:"#fde047",fontWeight:700}}>+🪙{reward}</div>
            <div style={{background:"rgba(168,85,247,0.15)",border:"1px solid rgba(168,85,247,0.3)",borderRadius:12,padding:"12px 24px",color:"#d8b4fe",fontWeight:700}}>+⭐{xp} XP</div>
            {acc===100&&<div style={{background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:12,padding:"12px 24px",color:"#86efac",fontWeight:700}}>🎯 PERFECT +500</div>}
          </div>
        )}

        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>activeWorld?startMatch("bot",activeWorld):startMatch("bot",WORLDS[0])}
            style={{padding:"14px 32px",background:"#ef4444",color:"#fff",border:"none",borderRadius:12,fontWeight:700,fontSize:16,cursor:"pointer",letterSpacing:1}}>
            REMATCH
          </button>
          <button onClick={abortMatch}
            style={{padding:"14px 32px",background:"rgba(255,255,255,0.07)",color:"#cbd5e1",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,fontWeight:600,fontSize:15,cursor:"pointer"}}>
            MAIN MENU
          </button>
        </div>
      </div>
    );
  };

  const renderPass = () => (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"50vh",gap:30}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"3rem",marginBottom:12}}>🔒</div>
        <div style={{fontSize:"2.5rem",fontWeight:800,color:"#ef4444",marginBottom:8}}>SCREEN SECURED</div>
        <div style={{fontSize:16,color:"#94a3b8"}}>Pass device to Player {match?.turn} for Fleet Deployment</div>
      </div>
      <button onClick={()=>{SFX.play('click');setScreen("setup");}}
        style={{padding:"18px 60px",background:"#ef4444",color:"#fff",border:"none",borderRadius:14,fontSize:"1.4rem",fontWeight:800,cursor:"pointer",boxShadow:"0 8px 25px rgba(239,68,68,0.4)",letterSpacing:1}}>
        ENGAGE
      </button>
    </div>
  );

  // ─── FULL RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{background:"radial-gradient(circle at 20% 80%, #0d1b2a 0%, #020617 60%, #0a0015 100%)",color:"#f8fafc",minHeight:"100vh",fontFamily:'"Space Grotesk",-apple-system,sans-serif',overflowX:"hidden"}}>
      
      {/* GOOGLE FONT */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes boardShake { 0%,100%{transform:translate(0)} 15%{transform:translate(-8px,-4px)} 30%{transform:translate(8px,4px)} 45%{transform:translate(-6px,2px)} 60%{transform:translate(6px,-2px)} 75%{transform:translate(-4px,4px)} 90%{transform:translate(4px,-2px)} }
        @keyframes flashOut { from{opacity:0.9} to{opacity:0} }
        @keyframes popIn { from{transform:scale(0.4);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes toastIn { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes ghostPulse { from{opacity:0.6} to{opacity:1} }
        @keyframes pulse { from{opacity:0.5} to{opacity:1} }
        @keyframes achPop { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
      `}</style>

      {/* HEADER */}
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 28px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.4)",backdropFilter:"blur(10px)",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <button onClick={()=>{SFX.play('click');setScreen("menu");}} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontSize:"1.5rem",fontWeight:900,letterSpacing:"-1px",color:"#fff"}}>BATTLE<span style={{color:"#ef4444"}}>FLEET</span></div>
          </button>
          {screen!=="menu" && (
            <div style={{fontSize:12,color:"#475569",borderLeft:"1px solid #1e293b",paddingLeft:14,textTransform:"uppercase",letterSpacing:1}}>
              {screen==="campaign"?"Campaign":screen==="shop"?"Dockyard":screen==="achievements"?"Achievements":screen==="setup"?"Deploy":screen==="play"?"Combat":screen==="gameover"?"Result":screen}
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(234,179,8,0.1)",border:"1px solid rgba(234,179,8,0.2)",borderRadius:20,padding:"5px 14px",fontSize:14,fontWeight:700,color:"#fde047"}}>
            🪙 {save.coins.toLocaleString()}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(168,85,247,0.1)",border:"1px solid rgba(168,85,247,0.2)",borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:600,color:RANK_COLORS[rank]}}>
            ⚓ {RANK_NAMES[rank]}
          </div>
          {screen!=="menu" && screen!=="gameover" && (
            <button onClick={abortMatch} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",padding:"5px 14px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:600,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="#94a3b8";}}>
              ABORT
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{padding:"32px 0 80px"}}>
        {screen==="menu" && renderMenu()}
        {screen==="campaign" && renderCampaign()}
        {screen==="shop" && renderShop()}
        {screen==="achievements" && renderAchievements()}
        {screen==="setup" && renderSetup()}
        {screen==="pass" && renderPass()}
        {screen==="play" && renderPlay()}
        {screen==="gameover" && renderGameOver()}
      </main>

      {/* TOAST NOTIFICATIONS */}
      <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",gap:8,zIndex:200,pointerEvents:"none",alignItems:"center"}}>
        {toast.map(t=>(
          <div key={t.id} style={{background:"rgba(15,23,42,0.97)",border:`1px solid ${t.color}44`,borderRadius:10,padding:"10px 22px",fontSize:15,fontWeight:600,color:t.color,boxShadow:`0 4px 20px rgba(0,0,0,0.5)`,animation:"toastIn 0.25s ease",whiteSpace:"nowrap"}}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* DAILY REWARD MODAL */}
      {showDaily && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)"}}>
          <div style={{background:"#0f172a",border:"1px solid rgba(234,179,8,0.3)",borderRadius:20,padding:"40px 50px",textAlign:"center",maxWidth:400,boxShadow:"0 0 60px rgba(234,179,8,0.15)"}}>
            <div style={{fontSize:"3.5rem",marginBottom:12}}>🌅</div>
            <div style={{fontSize:"1.8rem",fontWeight:800,color:"#fde047",marginBottom:8}}>DAILY REWARD</div>
            <div style={{color:"#94a3b8",marginBottom:24,fontSize:15}}>Welcome back, Admiral!</div>
            <div style={{fontSize:"2.5rem",fontWeight:900,color:"#fbbf24",marginBottom:28}}>+{DAILY_REWARD} 🪙</div>
            <button onClick={claimDaily} style={{padding:"14px 44px",background:"#fbbf24",color:"#000",border:"none",borderRadius:12,fontSize:16,fontWeight:800,cursor:"pointer",letterSpacing:1}}>CLAIM REWARD</button>
          </div>
        </div>
      )}

      {/* ACHIEVEMENT POPUP */}
      {newAchievements.length>0 && (
        <div style={{position:"fixed",top:80,right:20,zIndex:250,display:"flex",flexDirection:"column",gap:10}}>
          {newAchievements.map(id=>{
            const a=ACHIEVEMENTS.find(a=>a.id===id);
            if(!a) return null;
            return (
              <div key={id} onClick={()=>setNewAchievements(p=>p.filter(i=>i!==id))}
                style={{background:"rgba(15,23,42,0.98)",border:"1px solid rgba(251,191,36,0.4)",borderRadius:14,padding:"14px 20px",display:"flex",gap:14,alignItems:"center",animation:"achPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)",cursor:"pointer",boxShadow:"0 4px 30px rgba(251,191,36,0.15)",minWidth:280}}>
                <div style={{fontSize:"2rem"}}>{a.icon}</div>
                <div>
                  <div style={{fontSize:11,color:"#fbbf24",letterSpacing:2,marginBottom:2,fontWeight:700}}>ACHIEVEMENT UNLOCKED</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:1}}>{a.name}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>{a.desc} · +{a.reward}🪙</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SUB COMPONENTS ──────────────────────────────────────────────────────────
function NavCard({icon,title,sub,col,onClick,badge}) {
  return (
    <div onClick={onClick} style={{
      background:"rgba(255,255,255,0.03)",
      border:`1px solid rgba(255,255,255,0.07)`,
      borderTop:`3px solid ${col}`,
      borderRadius:14,padding:"24px 20px",cursor:"pointer",
      transition:"all 0.2s",textAlign:"center",
    }}
    onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=`0 12px 30px ${col}22`;}}
    onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
      <div style={{fontSize:"2.2rem",marginBottom:10}}>{icon}</div>
      <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:4,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        {title}
        {badge && <span style={{background:`${col}22`,color:col,border:`1px solid ${col}44`,fontSize:11,padding:"1px 8px",borderRadius:10}}>{badge}</span>}
      </div>
      <div style={{fontSize:13,color:"#64748b"}}>{sub}</div>
    </div>
  );
}

function SectionHeader({title,sub,onBack,children}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28,gap:16,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        {onBack && (
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",width:36,height:36,borderRadius:10,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",flexShrink:0}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#fff";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="#94a3b8";}}>
            ←
          </button>
        )}
        <div>
          <div style={{fontSize:"1.8rem",fontWeight:800,letterSpacing:"-0.5px"}}>{title}</div>
          {sub && <div style={{fontSize:13,color:"#64748b",marginTop:2}}>{sub}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function App() {
  return <Boundary><Game /></Boundary>;
}