'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
//  SPINBLADE NEON 3.0  ─  ULTIMATE EDITION
//  8 Power-ups · 6 Worlds · 12 Cores · 6 Chains · 3 Bot Levels
//  Perfect Physics · Zero Memory Leaks · Stale-Closure-Free Save
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEY = "SB_NEON_V3";
const W = 1100, H = 650;

// ── Physics constants ────────────────────────────────────────────
const FRICTION      = 0.873;
const BASE_SPEED    = 1.45;
const DASH_FORCE    = 22;
const DASH_CD       = 78;
const CHAIN_LEN     = 88;
const SPRING_K      = 0.135;
const FLAIL_FRIC    = 0.932;
const LETHAL_SPD    = 8.1;
const PLAYER_R      = 16;
const FLAIL_R       = 14;
const RESPAWN_F     = 72;
const PARTICLE_CAP  = 220;
const PU_SPAWN_BASE = 500;
const PU_MAX        = 4;

// ── Cosmetic data ────────────────────────────────────────────────
const CORES = [
  { id:"cyan",    name:"Plasma Cyan",     hex:"#00e5ff", cost:0    },
  { id:"magenta", name:"Neon Magenta",    hex:"#ff00ea", cost:0    },
  { id:"lime",    name:"Toxic Lime",      hex:"#39ff14", cost:150  },
  { id:"gold",    name:"Solar Gold",      hex:"#ffea00", cost:400  },
  { id:"crimson", name:"Blood Crimson",   hex:"#ff003c", cost:800  },
  { id:"ghost",   name:"Phantom White",   hex:"#eeeeee", cost:1500 },
  { id:"violet",  name:"Void Violet",     hex:"#9d00ff", cost:600  },
  { id:"orange",  name:"Inferno",         hex:"#ff6600", cost:350  },
  { id:"teal",    name:"Deep Teal",       hex:"#00ffc8", cost:500  },
  { id:"pink",    name:"Blossom Pink",    hex:"#ff69b4", cost:700  },
  { id:"ice",     name:"Arctic Ice",      hex:"#aaddff", cost:900  },
  { id:"rainbow", name:"✦ Prismatic",     hex:"#ff0000", cost:2500, rainbow:true },
];

const CHAINS = [
  { id:"solid",     name:"Steel Beam",    cost:0,    lw:2.5, dash:[]       },
  { id:"dashed",    name:"Pulse Line",    cost:200,  lw:2,   dash:[10,6]   },
  { id:"dotted",    name:"Quantum Dot",   cost:500,  lw:2,   dash:[2,8]    },
  { id:"thick",     name:"Iron Chain",    cost:800,  lw:5,   dash:[]       },
  { id:"double",    name:"Twin Coil",     cost:1500, lw:2,   dash:[], double:true },
  { id:"invisible", name:"Ghost Wire",    cost:1200, lw:0,   dash:[], invisible:true },
];

const ARENAS = [
  { id:"cage",     name:"The Cage",      emoji:"⬛", desc:"Walls bounce your blade hard." },
  { id:"void",     name:"The Void",      emoji:"🌀", desc:"Loop around all four edges." },
  { id:"pillars",  name:"Pillars",       emoji:"🏛", desc:"Four central pillars to orbit." },
  { id:"maze",     name:"The Labyrinth", emoji:"🧩", desc:"Walls everywhere. No mercy." },
  { id:"islands",  name:"Islands",       emoji:"🏝", desc:"Fight on floating platforms." },
  { id:"corridor", name:"Corridor",      emoji:"🔲", desc:"Long lanes, tight quarters." },
];

const POWERUPS = [
  { id:"speed",  name:"SPEED RUSH",  col:"#ffea00", sym:"⚡", dur:300, desc:"3× movement speed" },
  { id:"shield", name:"BARRIER",     col:"#00e5ff", sym:"🛡", dur:0,   desc:"Absorb one fatal hit" },
  { id:"extend", name:"EXTEND",      col:"#39ff14", sym:"⛓", dur:400, desc:"+70% chain reach" },
  { id:"rage",   name:"RAGE",        col:"#ff003c", sym:"💢", dur:360, desc:"Flail always lethal" },
  { id:"freeze", name:"CRYO",        col:"#88ccff", sym:"❄", dur:220, desc:"Freezes all enemies" },
  { id:"ghost",  name:"PHASE",       col:"#ccccdd", sym:"👻", dur:280, desc:"Ghost through walls" },
  { id:"magnet", name:"VORTEX",      col:"#9d00ff", sym:"🧲", dur:250, desc:"Pull enemy flails" },
  { id:"nova",   name:"NOVA BURST",  col:"#f97316", sym:"💥", dur:0,   desc:"Area explosion!" },
];

const BOT_NAMES = ["APEX","NEXUS","VIPER","STORM","BLADE","REAPER","WRAITH","NOVA","TITAN","BLAZE"];
const BOT_CORES = ["crimson","violet","orange","teal","pink","ice"];

const DEFAULT_SAVE = {
  v: 3,
  shards: 0,
  ownedCores:  ["cyan","magenta"],
  ownedChains: ["solid"],
  equip: {
    p1:{ core:"cyan",    chain:"solid" },
    p2:{ core:"magenta", chain:"solid" },
    p3:{ core:"lime",    chain:"solid" },
    p4:{ core:"gold",    chain:"solid" },
  },
  stats: { kills:0, wins:0, powerups:0, gamesPlayed:0 },
};

// ── Helpers ──────────────────────────────────────────────────────
const dstSq = (x1,y1,x2,y2) => (x2-x1)**2+(y2-y1)**2;
const rand   = (a,b) => Math.random()*(b-a)+a;
const rInt   = (a,b) => Math.floor(rand(a,b+0.999));
const clamp  = (v,a,b) => v<a?a:v>b?b:v;

const coreHex = (id, frame=0) => {
  if (id==="rainbow") return `hsl(${(frame*2)%360},100%,55%)`;
  return CORES.find(c=>c.id===id)?.hex || "#00e5ff";
};

const buildPlatforms = (id) => {
  const cx=W/2, cy=H/2;
  switch(id){
    case "pillars": return [
      {x:cx-260,y:cy-160,w:110,h:110},{x:cx+150,y:cy-160,w:110,h:110},
      {x:cx-260,y:cy+50, w:110,h:110},{x:cx+150,y:cy+50, w:110,h:110},
    ];
    case "maze": return [
      {x:80, y:80, w:260,h:18},{x:80,  y:80, w:18,h:180},
      {x:760,y:80, w:260,h:18},{x:1002,y:80, w:18,h:180},
      {x:80, y:552,w:260,h:18},{x:80,  y:390,w:18,h:180},
      {x:760,y:552,w:260,h:18},{x:1002,y:390,w:18,h:180},
      {x:cx-55,y:cy-85,w:110,h:16},{x:cx-55,y:cy+69,w:110,h:16},
      {x:cx-75,y:cy-85,w:16, h:170},{x:cx+59, y:cy-85,w:16,h:170},
    ];
    case "islands": return [
      {x:cx-70, y:cy-8,  w:140,h:16},
      {x:100,   y:cy+90, w:120,h:16},{x:W-220, y:cy+90, w:120,h:16},
      {x:100,   y:cy-110,w:120,h:16},{x:W-220, y:cy-110,w:120,h:16},
    ];
    case "corridor": return [
      {x:0,    y:cy-90,w:W,  h:16},
      {x:0,    y:cy+74,w:W,  h:16},
      {x:cx-18,y:0,    w:36, h:cy-90},
      {x:cx-18,y:cy+90,w:36, h:cy-90},
    ];
    default: return [];
  }
};

const puSpawnPos = (platforms, existing) => {
  for(let i=0;i<25;i++){
    const x=rand(70,W-70), y=rand(70,H-70);
    let ok=true;
    for(const p of platforms) if(x>p.x-25&&x<p.x+p.w+25&&y>p.y-25&&y<p.y+p.h+25){ok=false;break;}
    for(const e of existing) if(dstSq(x,y,e.x,e.y)<85*85){ok=false;break;}
    if(ok) return {x,y};
  }
  return {x:rand(100,W-100),y:rand(100,H-100)};
};

// ── Web Audio ────────────────────────────────────────────────────
const snd = (ctx, type) => {
  if(!ctx) return;
  try{
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const t=ctx.currentTime;
    switch(type){
      case"hit":    o.type="square";   o.frequency.value=200; g.gain.setValueAtTime(0.18,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.09); break;
      case"kill":   o.type="sawtooth"; o.frequency.setValueAtTime(440,t); o.frequency.exponentialRampToValueAtTime(100,t+0.35); g.gain.setValueAtTime(0.28,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.38); break;
      case"pickup": o.type="sine";     o.frequency.setValueAtTime(660,t); o.frequency.exponentialRampToValueAtTime(1100,t+0.12); g.gain.setValueAtTime(0.14,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.18); break;
      case"dash":   o.type="sine";     o.frequency.value=300; g.gain.setValueAtTime(0.09,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.06); break;
      case"shield": o.type="sine";     o.frequency.setValueAtTime(880,t); o.frequency.exponentialRampToValueAtTime(440,t+0.2); g.gain.setValueAtTime(0.12,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.22); break;
    }
    o.start(t); o.stop(t+0.45);
  }catch(e){}
};

// ── COMPONENT ────────────────────────────────────────────────────
export default function SpinbladeGame() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const gsRef     = useRef({ active:false, keys:{}, frame:0 });
  const saveRef   = useRef(DEFAULT_SAVE);       // always-current, no stale closures
  const audioRef  = useRef(null);

  const [save,    setSave]    = useState(DEFAULT_SAVE);
  const [screen,  setScreen]  = useState("menu");
  const [config,  setConfig]  = useState({ humans:1, bots:3, winScore:10, arena:"cage", diff:"medium" });
  const [shopTab, setShopTab] = useState("cores");
  const [uiSnap,  setUiSnap]  = useState({ players:[], winner:null });

  // ── Persist ──────────────────────────────────────────────────
  const persist = useCallback((ns) => {
    saveRef.current = ns;
    setSave({ ...ns });
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(ns)); }catch(e){}
  },[]);

  // ── Boot ─────────────────────────────────────────────────────
  useEffect(()=>{
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const p = JSON.parse(raw);
        if(p?.v===3){
          const ns = {
            ...DEFAULT_SAVE, ...p,
            equip:{
              p1:{...DEFAULT_SAVE.equip.p1,...(p.equip?.p1||{})},
              p2:{...DEFAULT_SAVE.equip.p2,...(p.equip?.p2||{})},
              p3:{...DEFAULT_SAVE.equip.p3,...(p.equip?.p3||{})},
              p4:{...DEFAULT_SAVE.equip.p4,...(p.equip?.p4||{})},
            },
            stats:{...DEFAULT_SAVE.stats,...(p.stats||{})},
          };
          saveRef.current = ns;
          setSave(ns);
        }
      }
    }catch(e){}

    const kd=(e)=>{ gsRef.current.keys[e.key.toLowerCase()]=true; };
    const ku=(e)=>{ gsRef.current.keys[e.key.toLowerCase()]=false; };
    window.addEventListener("keydown",kd);
    window.addEventListener("keyup",ku);
    return ()=>{
      window.removeEventListener("keydown",kd);
      window.removeEventListener("keyup",ku);
      if(rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  },[]);

  const initAudio = () => {
    if(!audioRef.current){
      try{ audioRef.current = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
    }
  };

  // ── makePlayer ───────────────────────────────────────────────
  const makeFx = () => ({ speed:0, shield:false, extend:0, rage:0, freeze:0, ghost:0, magnet:0 });

  const makePlayer = (overrides) => {
    const sx=rand(150,W-150), sy=rand(150,H-150);
    return {
      pid:0, type:"human", id:"P1",
      k:null, eq:{core:"cyan",chain:"solid"},
      x:sx, y:sy, vx:0, vy:0,
      flail:{x:sx+CHAIN_LEN, y:sy, vx:0, vy:0, r:FLAIL_R, lethal:false},
      r:PLAYER_R,
      score:0, state:"alive", respawnTimer:0,
      dashCd:0, dashTime:0,
      col:"#00e5ff",
      fx:makeFx(),
      invincible:0,
      ai:{ mx:0, my:0, dash:false, strafeDir:1, strafeTimer:0 },
      ...overrides,
    };
  };

  // ── startMatch ───────────────────────────────────────────────
  const startMatch = () => {
    initAudio();
    const sv = saveRef.current;
    const CTRL = [
      { k:{u:"w",       d:"s",        l:"a",         r:"d",          dash:" "    }, pidKey:"p1" },
      { k:{u:"arrowup", d:"arrowdown",l:"arrowleft",  r:"arrowright", dash:"enter"}, pidKey:"p2" },
      { k:{u:"i",       d:"k",        l:"j",          r:"l",          dash:"o"   }, pidKey:"p3" },
      { k:{u:"t",       d:"g",        l:"f",          r:"h",          dash:"y"   }, pidKey:"p4" },
    ];
    const players = [];
    let nextPid=1;

    for(let i=0;i<config.humans;i++){
      const eq=sv.equip[CTRL[i].pidKey];
      players.push(makePlayer({
        pid:nextPid++, type:"human", id:`P${i+1}`,
        k:CTRL[i].k, eq,
        col:coreHex(eq.core,0),
      }));
    }

    const diffMap={easy:0,medium:1,hard:2};
    const diff=diffMap[config.diff]??1;
    for(let i=0;i<config.bots;i++){
      const coreId=BOT_CORES[i%BOT_CORES.length];
      const name=BOT_NAMES[(i*3+diff*5)%BOT_NAMES.length];
      players.push(makePlayer({
        pid:nextPid++, type:"bot", id:name,
        eq:{core:coreId,chain:"solid"},
        col:coreHex(coreId,0),
        diff,
      }));
    }

    const platforms=buildPlatforms(config.arena);

    gsRef.current = {
      ...gsRef.current,
      active:true, frame:0, shake:0, hitstop:0,
      players, platforms,
      powerups:[], particles:[], popups:[],
      puTimer:PU_SPAWN_BASE+rInt(0,150),
      winner:null,
      arena:config.arena,
      winScore:config.winScore,
    };

    setScreen("playing");
    setUiSnap({ players: uiPlayers(players), winner:null });
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(gameLoop);
  };

  const uiPlayers = (pl) => pl.map(p=>({
    pid:p.pid, id:p.id, type:p.type, score:p.score,
    state:p.state, col:p.col,
    shield:p.fx.shield, speed:p.fx.speed>0, rage:p.fx.rage>0,
    extend:p.fx.extend>0, ghost:p.fx.ghost>0, magnet:p.fx.magnet>0,
    freeze:p.fx.freeze>0,
  }));

  // ── AI ───────────────────────────────────────────────────────
  const aiTick = (g, p) => {
    const ai=p.ai, diff=p.diff??1;
    ai.strafeTimer--;
    if(ai.strafeTimer<=0){ ai.strafeDir=Math.random()<0.5?1:-1; ai.strafeTimer=rInt(35,75); }

    // Hard bots hunt power-ups
    if(diff>=2 && g.powerups.length>0){
      let best=null,bestD=Infinity;
      for(const pu of g.powerups){
        const d=dstSq(p.x,p.y,pu.x,pu.y);
        if(d<280*280&&d<bestD){bestD=d;best=pu;}
      }
      if(best){ const a=Math.atan2(best.y-p.y,best.x-p.x); ai.mx=Math.cos(a); ai.my=Math.sin(a); return; }
    }

    let target=null,minD=Infinity;
    for(const op of g.players){
      if(op===p||op.state==="dead") continue;
      const d=dstSq(p.x,p.y,op.x,op.y);
      if(d<minD){minD=d;target=op;}
    }
    if(!target){ai.mx=0;ai.my=0;return;}

    const ang=Math.atan2(target.y-p.y,target.x-p.x);
    const dist=Math.sqrt(minD);
    const ideal=CHAIN_LEN+(diff===2?50:diff===1?65:80);
    let mx=0,my=0;
    if(dist>ideal+30){       mx=Math.cos(ang);  my=Math.sin(ang); }
    else if(dist<ideal-20){ mx=-Math.cos(ang); my=-Math.sin(ang); }
    else{ const sa=ang+(Math.PI/2)*ai.strafeDir; mx=Math.cos(sa); my=Math.sin(sa); }

    const react=diff===0?0.38:diff===1?0.72:0.95;
    ai.mx=Math.random()<react?mx:rand(-1,1);
    ai.my=Math.random()<react?my:rand(-1,1);

    if(p.dashCd===0&&p.flail.lethal&&dist<ideal+110){
      const dc=diff===0?0.004:diff===1?0.018:0.038;
      if(Math.random()<dc) ai.dash=true;
    }
  };

  // ── Power-up apply ───────────────────────────────────────────
  const applyPU = (g, p, pu) => {
    switch(pu.id){
      case"speed":  p.fx.speed =pu.dur; break;
      case"shield": p.fx.shield=true;   break;
      case"extend": p.fx.extend=pu.dur; break;
      case"rage":   p.fx.rage  =pu.dur; break;
      case"ghost":  p.fx.ghost =pu.dur; break;
      case"magnet": p.fx.magnet=pu.dur; break;
      case"freeze":
        for(const op of g.players) if(op!==p&&op.state==="alive") op.fx.freeze=pu.dur;
        burst(g,p.x,p.y,"#88ccff",20,5); break;
      case"nova":
        for(const op of g.players){
          if(op===p||op.state==="dead") continue;
          if(dstSq(p.x,p.y,op.x,op.y)<200*200) killPlayer(g,op,p);
        }
        g.shake=22; g.hitstop=12; burst(g,p.x,p.y,"#f97316",45,8);
        break;
    }
  };

  // ── Kill ─────────────────────────────────────────────────────
  const killPlayer = (g, victim, killer) => {
    if(victim.state==="dead") return;
    victim.state="dead"; victim.respawnTimer=RESPAWN_F;
    victim.fx=makeFx(); victim.dashTime=0;
    killer.score++;
    g.hitstop=7; g.shake=14;
    burst(g,victim.x,victim.y,victim.col,32,7);
    g.popups.push({x:victim.x,y:victim.y-44,txt:"SHREDDED!",col:killer.col,life:58});
    snd(audioRef.current,"kill");

    if(killer.type==="human"){
      const sv=saveRef.current;
      persist({...sv,shards:sv.shards+25,stats:{...sv.stats,kills:sv.stats.kills+1}});
    }
  };

  // ── Bounds ───────────────────────────────────────────────────
  const playerBounds = (g, p) => {
    if(g.arena==="void"||p.fx.ghost>0){
      if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
    } else {
      const r=p.r;
      if(p.x<r){p.x=r; p.vx=Math.abs(p.vx)*0.65;}
      if(p.x>W-r){p.x=W-r; p.vx=-Math.abs(p.vx)*0.65;}
      if(p.y<r){p.y=r; p.vy=Math.abs(p.vy)*0.65;}
      if(p.y>H-r){p.y=H-r; p.vy=-Math.abs(p.vy)*0.65;}
    }
  };

  const flailBounds = (g, f, ghostActive) => {
    if(g.arena==="void"||ghostActive){
      if(f.x<0)f.x=W; if(f.x>W)f.x=0; if(f.y<0)f.y=H; if(f.y>H)f.y=0;
    } else {
      const r=f.r;
      if(f.x<r){f.x=r; f.vx=Math.abs(f.vx)*0.52;}
      if(f.x>W-r){f.x=W-r; f.vx=-Math.abs(f.vx)*0.52;}
      if(f.y<r){f.y=r; f.vy=Math.abs(f.vy)*0.52;}
      if(f.y>H-r){f.y=H-r; f.vy=-Math.abs(f.vy)*0.52;}
    }
  };

  const circleRect = (obj, rect, r) => {
    const cx=clamp(obj.x,rect.x,rect.x+rect.w);
    const cy=clamp(obj.y,rect.y,rect.y+rect.h);
    const sq=dstSq(obj.x,obj.y,cx,cy);
    if(sq>=r*r) return;
    const d=Math.sqrt(sq)||0.01;
    const nx=(obj.x-cx)/d, ny=(obj.y-cy)/d;
    const push=r-d+0.5;
    obj.x+=nx*push; obj.y+=ny*push;
    const dot=obj.vx*nx+obj.vy*ny;
    if(dot<0){ obj.vx-=1.7*dot*nx; obj.vy-=1.7*dot*ny; obj.vx*=0.72; obj.vy*=0.72; }
  };

  // ── Flail hit check ──────────────────────────────────────────
  const flailHit = (g, flail, target, attacker) => {
    if(target.state==="dead"||target.invincible>0) return;
    if(dstSq(flail.x,flail.y,target.x,target.y)>=(flail.r+target.r)**2) return;
    if(flail.lethal){
      if(target.fx.shield){
        target.fx.shield=false;
        burst(g,target.x,target.y,"#00e5ff",16,5);
        g.popups.push({x:target.x,y:target.y-32,txt:"BLOCKED!",col:"#00e5ff",life:48});
        flail.vx*=-0.6; flail.vy*=-0.6;
        snd(audioRef.current,"shield");
      } else {
        killPlayer(g,target,attacker);
      }
    } else {
      target.vx+=flail.vx*0.48; target.vy+=flail.vy*0.48;
      snd(audioRef.current,"hit");
    }
  };

  // ── Burst particles ──────────────────────────────────────────
  const burst = (g, x, y, col, n, s) => {
    const spare=PARTICLE_CAP-g.particles.length;
    if(spare<=0) return;
    const c=Math.min(n,spare);
    for(let i=0;i<c;i++){
      const a=rand(0,Math.PI*2), spd=rand(2.5,11);
      g.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,col:i%3===0?"#ffffff88":col,life:rand(18,42),s});
    }
  };

  // ── GAME LOOP ────────────────────────────────────────────────
  const gameLoop = () => {
    const g=gsRef.current;
    if(!g.active) return;
    if(g.hitstop>0){g.hitstop--;rafRef.current=requestAnimationFrame(gameLoop);return;}

    g.frame++;
    if(g.shake>0) g.shake=Math.max(0,g.shake-1);

    let uiDirty=g.frame%12===0;
    let scoresChanged=false;

    // ── Player loop ──────────────────────────────────────────
    for(let i=0;i<g.players.length;i++){
      const p=g.players[i];

      // Respawn
      if(p.state==="dead"){
        if(--p.respawnTimer<=0){
          p.state="alive";
          p.x=rand(120,W-120); p.y=rand(120,H-120);
          p.vx=0;p.vy=0;
          p.flail.x=p.x+CHAIN_LEN; p.flail.y=p.y;
          p.flail.vx=0;p.flail.vy=0;
          p.dashCd=0;p.dashTime=0;
          p.invincible=90;
          p.fx=makeFx();
          burst(g,p.x,p.y,p.col,18,4);
          uiDirty=true;
        }
        continue;
      }

      if(p.invincible>0) p.invincible--;
      if(p.dashCd>0)    p.dashCd--;
      if(p.dashTime>0)  p.dashTime--;

      // Tick fx
      const fx=p.fx;
      if(fx.speed >0) fx.speed--;
      if(fx.extend>0) fx.extend--;
      if(fx.rage  >0) fx.rage--;
      if(fx.freeze>0) fx.freeze--;
      if(fx.ghost >0) fx.ghost--;
      if(fx.magnet>0) fx.magnet--;

      // Rainbow color
      if(p.eq?.core==="rainbow") p.col=coreHex("rainbow",g.frame+i*33);

      let mx=0,my=0,doDash=false;

      if(p.type==="human"){
        const k=g.keys,kp=p.k;
        if(k[kp.l]) mx-=1; if(k[kp.r]) mx+=1;
        if(k[kp.u]) my-=1; if(k[kp.d]) my+=1;
        if(k[kp.dash]&&p.dashCd===0){ doDash=true; g.keys[kp.dash]=false; }
      } else {
        aiTick(g,p);
        mx=p.ai.mx; my=p.ai.my;
        if(p.ai.dash){ doDash=true; p.ai.dash=false; }
      }

      // Normalize
      if(mx!==0&&my!==0){mx*=0.707;my*=0.707;}

      const spd=BASE_SPEED*(fx.speed>0?2.85:1)*(fx.freeze>0?0.33:1);
      p.vx+=mx*spd; p.vy+=my*spd;

      if(doDash&&p.dashCd===0){
        const len=Math.hypot(p.vx,p.vy)||1;
        p.vx=(p.vx/len)*DASH_FORCE; p.vy=(p.vy/len)*DASH_FORCE;
        p.dashCd=DASH_CD; p.dashTime=14;
        snd(audioRef.current,"dash");
        burst(g,p.x,p.y,p.col,8,3);
      }

      p.vx*=FRICTION; p.vy*=FRICTION;
      p.x+=p.vx; p.y+=p.vy;

      playerBounds(g,p);
      for(const pl of g.platforms) circleRect(p,pl,p.r);

      // ── Flail physics ────────────────────────────────────
      const f=p.flail;
      const cLen=CHAIN_LEN*(fx.extend>0?1.72:1);
      const dx=p.x-f.x, dy=p.y-f.y;
      const d=Math.hypot(dx,dy)||0.01;
      const sf=(d-cLen)*SPRING_K;
      f.vx+=(dx/d)*sf; f.vy+=(dy/d)*sf;

      const torque=0.78+Math.hypot(p.vx,p.vy)*0.22;
      f.vx+=(-dy/d)*torque; f.vy+=(dx/d)*torque;

      // Magnet
      if(fx.magnet>0){
        for(const op of g.players){
          if(op===p||op.state==="dead") continue;
          const md=Math.hypot(f.x-op.flail.x,f.y-op.flail.y)||0.01;
          if(md<260){ op.flail.vx+=(f.x-op.flail.x)/md*1.6; op.flail.vy+=(f.y-op.flail.y)/md*1.6; }
        }
      }

      f.vx*=FLAIL_FRIC; f.vy*=FLAIL_FRIC;
      f.x+=f.vx; f.y+=f.vy;

      const fSpdSq=f.vx**2+f.vy**2;
      f.lethal=fx.rage>0||fSpdSq>=LETHAL_SPD**2;

      flailBounds(g,f,fx.ghost>0);
      for(const pl of g.platforms) circleRect(f,pl,f.r);

      // Particles
      if(f.lethal&&g.particles.length<PARTICLE_CAP){
        g.particles.push({x:f.x,y:f.y,vx:rand(-1.5,1.5),vy:rand(-1.5,1.5),col:"#f97316",life:13,s:6});
        if(g.frame%2===0) g.particles.push({x:f.x,y:f.y,vx:rand(-2.5,2.5),vy:rand(-2.5,2.5),col:"#fff8",life:7,s:3});
      } else if(fSpdSq>14&&g.frame%4===0&&g.particles.length<PARTICLE_CAP){
        g.particles.push({x:f.x,y:f.y,vx:0,vy:0,col:p.col+"77",life:9,s:4});
      }
      // Shield aura
      if(fx.shield&&g.frame%5===0&&g.particles.length<PARTICLE_CAP){
        const a=rand(0,Math.PI*2);
        g.particles.push({x:p.x+Math.cos(a)*24,y:p.y+Math.sin(a)*24,vx:0,vy:0,col:"#00e5ff66",life:14,s:5});
      }
      // Rage smoke
      if(fx.rage>0&&g.frame%7===0&&g.particles.length<PARTICLE_CAP){
        g.particles.push({x:p.x+rand(-8,8),y:p.y+rand(-6,6),vx:rand(-0.5,0.5),vy:-rand(0.5,2),col:"#ff003c66",life:22,s:4});
      }
    }

    // ── Power-up spawn ───────────────────────────────────────
    if(--g.puTimer<=0&&g.powerups.length<PU_MAX){
      const def=POWERUPS[rInt(0,POWERUPS.length-1)];
      const pos=puSpawnPos(g.platforms,g.powerups);
      g.powerups.push({...def,x:pos.x,y:pos.y,r:18,pulse:0,born:g.frame});
      g.puTimer=PU_SPAWN_BASE+rInt(0,200);
    }

    // ── Power-up collection ──────────────────────────────────
    for(let pi=g.powerups.length-1;pi>=0;pi--){
      const pu=g.powerups[pi];
      pu.pulse=(pu.pulse+0.1)%(Math.PI*2);
      for(const p of g.players){
        if(p.state==="dead") continue;
        if(dstSq(p.x,p.y,pu.x,pu.y)<(p.r+pu.r+4)**2){
          applyPU(g,p,pu);
          g.powerups.splice(pi,1);
          snd(audioRef.current,"pickup");
          g.popups.push({x:pu.x,y:pu.y-36,txt:pu.sym+" "+pu.name,col:pu.col,life:65});
          const sv=saveRef.current;
          persist({...sv,stats:{...sv.stats,powerups:sv.stats.powerups+1}});
          uiDirty=true; break;
        }
      }
    }

    // ── Combat ───────────────────────────────────────────────
    for(let i=0;i<g.players.length;i++){
      for(let j=i+1;j<g.players.length;j++){
        const a=g.players[i],b=g.players[j];
        if(a.state==="dead"||b.state==="dead") continue;

        // Flail vs Flail (clash)
        const fa=a.flail,fb=b.flail;
        if(dstSq(fa.x,fa.y,fb.x,fb.y)<(fa.r+fb.r)**2){
          const nx=fb.x-fa.x,ny=fb.y-fa.y;
          const len=Math.hypot(nx,ny)||0.01;
          const inx=nx/len,iny=ny/len;
          fa.vx-=inx*21;fa.vy-=iny*21;
          fb.vx+=inx*21;fb.vy+=iny*21;
          g.shake=5;g.hitstop=4;
          burst(g,(fa.x+fb.x)/2,(fa.y+fb.y)/2,"#fff",12,5);
          snd(audioRef.current,"hit"); continue;
        }

        // Flail vs Body
        flailHit(g,fb,a,b);
        if(a.state!=="dead") flailHit(g,fa,b,a);

        // Body vs Body (push)
        if(a.state!=="dead"&&b.state!=="dead"){
          const rr=(a.r+b.r)**2;
          if(dstSq(a.x,a.y,b.x,b.y)<rr){
            const nx=b.x-a.x,ny=b.y-a.y;
            const len=Math.hypot(nx,ny)||0.01;
            a.vx-=(nx/len)*4.5;a.vy-=(ny/len)*4.5;
            b.vx+=(nx/len)*4.5;b.vy+=(ny/len)*4.5;
          }
        }

        if(a.score!==g.players[i].score||b.score!==g.players[j].score) scoresChanged=true;
      }
    }

    // ── Particles & popups ───────────────────────────────────
    for(let i=g.particles.length-1;i>=0;i--){
      const p=g.particles[i];
      p.x+=p.vx;p.y+=p.vy;p.vx*=0.96;p.vy*=0.96;
      if(--p.life<=0) g.particles.splice(i,1);
    }
    for(let i=g.popups.length-1;i>=0;i--){
      const p=g.popups[i];
      p.y-=1.15;
      if(--p.life<=0) g.popups.splice(i,1);
    }

    // ── Win check ────────────────────────────────────────────
    if(!g.winner){
      let top=null,topS=0;
      for(const p of g.players) if(p.score>topS){topS=p.score;top=p;}
      if(top&&topS>=g.winScore){
        g.winner=top; g.active=false;
        const sv=saveRef.current;
        if(top.type==="human"){
          persist({...sv,shards:sv.shards+250,stats:{...sv.stats,wins:sv.stats.wins+1,gamesPlayed:sv.stats.gamesPlayed+1}});
        } else {
          persist({...sv,stats:{...sv.stats,gamesPlayed:sv.stats.gamesPlayed+1}});
        }
        setUiSnap(u=>({...u,winner:{id:top.id,col:top.col,type:top.type}}));
        setTimeout(()=>setScreen("gameover"),3000);
      }
    }

    // ── Render ───────────────────────────────────────────────
    render(g);

    if(uiDirty||scoresChanged){
      setUiSnap({ players:uiPlayers(g.players), winner:g.winner?{id:g.winner.id,col:g.winner.col,type:g.winner.type}:null });
    }

    if(g.active) rafRef.current=requestAnimationFrame(gameLoop);
  };

  // ── RENDER ───────────────────────────────────────────────────
  const render = (g) => {
    const canvas=canvasRef.current;
    if(!canvas) return;
    const ctx=canvas.getContext("2d",{alpha:false});
    ctx.save();

    if(g.shake>0) ctx.translate(rand(-g.shake*0.5,g.shake*0.5),rand(-g.shake*0.5,g.shake*0.5));

    // BG
    ctx.fillStyle="#020209"; ctx.fillRect(0,0,W,H);

    // Scanlines (subtle)
    ctx.fillStyle="rgba(0,0,20,0.18)";
    for(let y=0;y<H;y+=4) ctx.fillRect(0,y,W,2);

    // Grid
    ctx.strokeStyle="rgba(100,100,200,0.04)"; ctx.lineWidth=1;
    ctx.beginPath();
    for(let x=0;x<W;x+=60){ctx.moveTo(x,0);ctx.lineTo(x,H);}
    for(let y=0;y<H;y+=60){ctx.moveTo(0,y);ctx.lineTo(W,y);}
    ctx.stroke();

    // Border
    const borderGrad=ctx.createLinearGradient(0,0,W,H);
    borderGrad.addColorStop(0,"#f9731622"); borderGrad.addColorStop(1,"#00e5ff22");
    ctx.strokeStyle=borderGrad; ctx.lineWidth=2;
    ctx.strokeRect(1,1,W-2,H-2);

    // Platforms
    for(const pl of g.platforms){
      ctx.fillStyle="#0e0e1e"; ctx.fillRect(pl.x,pl.y,pl.w,pl.h);
      ctx.strokeStyle="#f9731630"; ctx.lineWidth=2; ctx.strokeRect(pl.x-1,pl.y-1,pl.w+2,pl.h+2);
      ctx.strokeStyle="#1a1a30"; ctx.lineWidth=1; ctx.strokeRect(pl.x,pl.y,pl.w,pl.h);
    }

    // Particles
    for(const p of g.particles){
      ctx.globalAlpha=clamp(p.life/30,0,1);
      ctx.fillStyle=p.col;
      ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);
    }
    ctx.globalAlpha=1;

    // Power-ups
    for(const pu of g.powerups){
      const pls=Math.sin(pu.pulse)*5;
      ctx.shadowBlur=30+pls; ctx.shadowColor=pu.col;
      // Outer glow ring
      ctx.strokeStyle=pu.col+"55"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(pu.x,pu.y,pu.r+10+pls,0,Math.PI*2); ctx.stroke();
      // Body
      ctx.fillStyle=pu.col+"33"; ctx.beginPath(); ctx.arc(pu.x,pu.y,pu.r+pls,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=pu.col+"99"; ctx.beginPath(); ctx.arc(pu.x,pu.y,pu.r-3+pls*0.5,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // Symbol
      ctx.font="bold 15px 'Courier New'"; ctx.textAlign="center"; ctx.fillStyle="#fff";
      ctx.fillText(pu.sym,pu.x,pu.y+5);
      // Name tag
      ctx.font="700 9px 'Courier New'"; ctx.fillStyle=pu.col;
      ctx.fillText(pu.name,pu.x,pu.y+pu.r+16);
    }

    // ── Players ──────────────────────────────────────────────
    for(const p of g.players){
      if(p.state==="dead") continue;
      if(p.invincible>0&&Math.floor(p.invincible/5)%2===0) continue; // blink

      const col=p.col;
      const f=p.flail;
      const chainDef=CHAINS.find(c=>c.id===p.eq?.chain)||CHAINS[0];

      // ── Chain ───────────────────────────────────────────
      if(!chainDef.invisible&&chainDef.lw>0){
        ctx.globalAlpha=0.55;
        ctx.strokeStyle=col;
        ctx.lineWidth=chainDef.lw;
        ctx.setLineDash(chainDef.dash||[]);

        if(chainDef.double){
          const ex=f.x-p.x,ey=f.y-p.y;
          const len=Math.hypot(ex,ey)||0.01;
          const ox=(-ey/len)*3.5,oy=(ex/len)*3.5;
          ctx.beginPath();ctx.moveTo(p.x+ox,p.y+oy);ctx.lineTo(f.x+ox,f.y+oy);ctx.stroke();
          ctx.beginPath();ctx.moveTo(p.x-ox,p.y-oy);ctx.lineTo(f.x-ox,f.y-oy);ctx.stroke();
        } else {
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(f.x,f.y);ctx.stroke();
        }
        ctx.setLineDash([]); ctx.globalAlpha=1;
      }

      // ── Shield ring ─────────────────────────────────────
      if(p.fx.shield){
        ctx.shadowBlur=22; ctx.shadowColor="#00e5ff";
        ctx.strokeStyle="#00e5ff"; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.arc(p.x,p.y,28+Math.sin(g.frame*0.13)*3,0,Math.PI*2); ctx.stroke();
        ctx.shadowBlur=0;
      }

      // ── Rage aura ───────────────────────────────────────
      if(p.fx.rage>0){
        ctx.shadowBlur=16; ctx.shadowColor="#ff003c";
        ctx.strokeStyle="#ff003c88"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(p.x,p.y,24+Math.sin(g.frame*0.22)*3,0,Math.PI*2); ctx.stroke();
        ctx.shadowBlur=0;
      }

      // ── Ghost overlay ────────────────────────────────────
      if(p.fx.ghost>0){
        ctx.globalAlpha=0.25; ctx.fillStyle="#aabbff";
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r+6,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
      }

      // ── Freeze overlay ───────────────────────────────────
      if(p.fx.freeze>0){
        ctx.globalAlpha=0.35; ctx.fillStyle="#88ccff";
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r+5,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
      }

      // ── Speed ring ───────────────────────────────────────
      if(p.fx.speed>0){
        ctx.strokeStyle="#ffea0044"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r+12+Math.sin(g.frame*0.4)*4,0,Math.PI*2); ctx.stroke();
      }

      // ── Flail ────────────────────────────────────────────
      if(f.lethal){ ctx.shadowBlur=26; ctx.shadowColor="#f97316"; ctx.fillStyle="#ff7a00"; }
      else         { ctx.shadowBlur=10; ctx.shadowColor=col+"88";  ctx.fillStyle=col; }
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill();
      // Flail inner
      ctx.shadowBlur=0;
      ctx.fillStyle=f.lethal?"#fff":"#fff8";
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r*0.44,0,Math.PI*2); ctx.fill();

      // ── Player body ──────────────────────────────────────
      ctx.shadowBlur=14; ctx.shadowColor=col;
      ctx.fillStyle="#000";
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=col; ctx.lineWidth=p.dashTime>0?4:2.5; ctx.stroke();
      ctx.shadowBlur=0;
      // Core glow
      ctx.fillStyle=col;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.44,0,Math.PI*2); ctx.fill();

      // ── Name ─────────────────────────────────────────────
      ctx.font="bold 11px 'Courier New'"; ctx.textAlign="center";
      ctx.fillStyle=p.type==="bot"?"#ff7777":"#ffffff";
      ctx.fillText(p.id,p.x,p.y-26);

      // ── FX bar strips (below player) ─────────────────────
      const fxBars=[];
      if(p.fx.speed >0) fxBars.push({col:"#ffea00",t:p.fx.speed /300});
      if(p.fx.extend>0) fxBars.push({col:"#39ff14",t:p.fx.extend/400});
      if(p.fx.rage  >0) fxBars.push({col:"#ff003c",t:p.fx.rage  /360});
      if(p.fx.ghost >0) fxBars.push({col:"#ccccdd",t:p.fx.ghost /280});
      if(p.fx.magnet>0) fxBars.push({col:"#9d00ff",t:p.fx.magnet/250});
      if(p.fx.shield)   fxBars.push({col:"#00e5ff",t:1});
      if(fxBars.length){
        const bw=28,bh=3,bg=3;
        const tw=fxBars.length*(bw+bg)-bg;
        fxBars.forEach((b,bi)=>{
          const bx=p.x-tw/2+bi*(bw+bg), by=p.y+23;
          ctx.fillStyle="#111"; ctx.fillRect(bx,by,bw,bh);
          ctx.fillStyle=b.col; ctx.fillRect(bx,by,bw*b.t,bh);
        });
      }
    }

    // ── Popups ───────────────────────────────────────────────
    for(const p of g.popups){
      ctx.globalAlpha=clamp(p.life/55,0,1);
      ctx.fillStyle=p.col; ctx.font="900 21px 'Courier New'"; ctx.textAlign="center";
      ctx.fillText(p.txt,p.x,p.y);
    }
    ctx.globalAlpha=1;

    ctx.restore();
  };

  // ── Shop logic ───────────────────────────────────────────────
  const buy = (type, id, cost) => {
    const sv=saveRef.current;
    if(sv.shards<cost) return;
    const ns={...sv,shards:sv.shards-cost};
    if(type==="core")  ns.ownedCores =[...sv.ownedCores, id];
    if(type==="chain") ns.ownedChains=[...sv.ownedChains,id];
    persist(ns);
  };
  const equip = (pidKey,type,id) => {
    const sv=saveRef.current;
    persist({...sv,equip:{...sv.equip,[pidKey]:{...sv.equip[pidKey],[type]:id}}});
  };

  // ── SCREENS ──────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"#020209",color:"#fff",fontFamily:"'Courier New',monospace",display:"flex",alignItems:"center",justifyContent:"center",overflow:"auto",padding:"20px 0"}}>

      {/* ══ MENU ══════════════════════════════════════════════ */}
      {screen==="menu"&&(
        <div style={S.card}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontSize:"4.8rem",fontWeight:900,fontStyle:"italic",letterSpacing:"-2px",lineHeight:1,
              background:"linear-gradient(135deg,#f97316,#ff003c)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              filter:"drop-shadow(0 0 30px #f9731688)"}}>
              SPINBLADE
            </div>
            <div style={{color:"#00e5ff",fontSize:"0.85rem",letterSpacing:"6px",marginTop:4}}>NEON 3.0 — ULTIMATE EDITION</div>
            <div style={{color:"#333",fontSize:"0.72rem",letterSpacing:"2px",marginTop:8}}>
              ♦ {save.shards}&nbsp;&nbsp;·&nbsp;&nbsp;{save.stats?.kills||0} KILLS&nbsp;&nbsp;·&nbsp;&nbsp;{save.stats?.wins||0} WINS
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div style={S.box}>
              <div style={S.lbl}>HUMAN PLAYERS</div>
              <div style={{color:"#2a2a3a",fontSize:"0.68rem",marginTop:2}}>WASD · ARROWS · IJKL · TFGH</div>
              <div style={{display:"flex",gap:7,marginTop:10}}>
                {[1,2,3,4].map(n=><button key={n} onClick={()=>setConfig(c=>({...c,humans:n}))} style={{...S.btn(config.humans===n,"#00e5ff"),flex:1}}>{n}</button>)}
              </div>
            </div>
            <div style={S.box}>
              <div style={S.lbl}>AI BOTS</div>
              <div style={{color:"#2a2a3a",fontSize:"0.68rem",marginTop:2}}>DIFFICULTY: {config.diff.toUpperCase()}</div>
              <div style={{display:"flex",gap:7,marginTop:10}}>
                {[0,1,2,3].map(n=><button key={n} onClick={()=>setConfig(c=>({...c,bots:n}))} style={{...S.btn(config.bots===n,"#ff00ea"),flex:1}}>{n}</button>)}
              </div>
            </div>
          </div>

          <div style={{...S.box,marginBottom:12}}>
            <div style={S.lbl}>BOT DIFFICULTY</div>
            <div style={{display:"flex",gap:7,marginTop:10}}>
              {["easy","medium","hard"].map(d=>(
                <button key={d} onClick={()=>setConfig(c=>({...c,diff:d}))}
                  style={{...S.btn(config.diff===d,d==="easy"?"#39ff14":d==="medium"?"#ffea00":"#ff003c"),flex:1,textTransform:"uppercase"}}>{d}</button>
              ))}
            </div>
          </div>

          <div style={{...S.box,marginBottom:12}}>
            <div style={S.lbl}>ARENA</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginTop:10}}>
              {ARENAS.map(a=>(
                <button key={a.id} onClick={()=>setConfig(c=>({...c,arena:a.id}))}
                  style={{...S.btn(config.arena===a.id,"#39ff14"),padding:"9px 5px",fontSize:"0.72rem"}}>
                  <div style={{fontSize:"1.1rem"}}>{a.emoji}</div>
                  <div style={{marginTop:2}}>{a.name}</div>
                </button>
              ))}
            </div>
            <div style={{color:"#333",fontSize:"0.7rem",marginTop:8}}>
              {ARENAS.find(a=>a.id===config.arena)?.desc}
            </div>
          </div>

          <div style={{...S.box,marginBottom:20}}>
            <div style={S.lbl}>WIN SCORE (KILLS TO WIN)</div>
            <div style={{display:"flex",gap:7,marginTop:10}}>
              {[5,10,15,20].map(n=><button key={n} onClick={()=>setConfig(c=>({...c,winScore:n}))} style={{...S.btn(config.winScore===n,"#f97316"),flex:1}}>{n}</button>)}
            </div>
          </div>

          <div style={{display:"flex",gap:12}}>
            <button onClick={startMatch} style={{...S.mainBtn,background:"linear-gradient(135deg,#f97316,#ff003c)",color:"#fff",flex:2,fontSize:"1.05rem"}}>
              ⚔ INITIATE BRAWL
            </button>
            <button onClick={()=>setScreen("shop")} style={{...S.mainBtn,background:"#0d0d1c",border:"1.5px solid #00e5ff",color:"#00e5ff",flex:1}}>
              🛒 ARMORY
            </button>
          </div>

          {/* Power-up legend */}
          <div style={{marginTop:20,padding:"12px 16px",background:"#0a0a16",borderRadius:10,border:"1px solid #111"}}>
            <div style={{color:"#333",fontSize:"0.7rem",letterSpacing:"2px",marginBottom:8}}>POWER-UPS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              {POWERUPS.map(pu=>(
                <div key={pu.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:"0.72rem",color:"#555"}}>
                  <span style={{fontSize:"0.9rem"}}>{pu.sym}</span>
                  <span style={{color:pu.col}}>{pu.name}</span>
                  <span>— {pu.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ ARMORY ═══════════════════════════════════════════ */}
      {screen==="shop"&&(
        <div style={{...S.card,width:980,maxWidth:"98vw"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
            <div style={{fontSize:"2rem",fontWeight:900,fontStyle:"italic",color:"#00e5ff"}}>ARMORY</div>
            <div style={{fontSize:"1.3rem",color:"#f97316",fontWeight:900}}>♦ {save.shards} SHARDS</div>
          </div>

          <div style={{display:"flex",gap:10,marginBottom:18}}>
            {["cores","chains"].map(t=>(
              <button key={t} onClick={()=>setShopTab(t)}
                style={{...S.btn(shopTab===t,"#9d00ff"),padding:"10px 30px",textTransform:"uppercase"}}>{t}</button>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,minHeight:300}}>
            {(shopTab==="cores"?CORES:CHAINS).map(item=>{
              const ownedList=shopTab==="cores"?save.ownedCores:save.ownedChains;
              const owned=ownedList.includes(item.id);
              const col=item.hex||"#666";
              return(
                <div key={item.id} style={{background:"#0a0a16",border:`1.5px solid ${owned?col+"55":"#1a1a2a"}`,borderRadius:12,padding:15,textAlign:"center"}}>
                  {shopTab==="cores"?(
                    <div style={{width:42,height:42,borderRadius:"50%",background:item.rainbow?"conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)":col,margin:"0 auto 10px",
                      boxShadow:owned?`0 0 20px ${col}66`:"none"}}/>
                  ):(
                    <div style={{height:42,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}>
                      <div style={{width:"80%",height:item.lw>0?item.lw+1:2,background:col,opacity:item.invisible?0.2:0.8,
                        borderTop:item.double?`2px solid ${col}`:"none",marginTop:item.double?"-4px":"0"}}/>
                    </div>
                  )}
                  <div style={{fontWeight:900,fontSize:"0.82rem",color:owned?"#fff":"#666",marginBottom:4}}>{item.name}</div>
                  {!owned?(
                    <button onClick={()=>buy(shopTab==="cores"?"core":"chain",item.id,item.cost)}
                      disabled={save.shards<item.cost}
                      style={{...S.smallBtn,opacity:save.shards<item.cost?0.25:1,marginTop:6}}>
                      {item.cost===0?"FREE":"♦ "+item.cost}
                    </button>
                  ):(
                    <div style={{marginTop:4}}>
                      <div style={{color:"#39ff14",fontSize:"0.68rem",marginBottom:6}}>✓ OWNED</div>
                      <div style={{display:"flex",gap:4}}>
                        {["p1","p2","p3","p4"].map((pk,pi)=>{
                          const eType=shopTab==="cores"?"core":"chain";
                          const isEq=save.equip[pk][eType]===item.id;
                          return(
                            <button key={pk} onClick={()=>equip(pk,eType,item.id)}
                              style={{...S.smallBtn,flex:1,padding:"5px 2px",fontSize:"0.68rem",
                                background:isEq?col:"#1a1a2a",color:isEq?"#000":"#555",border:`1px solid ${isEq?col:"#222"}`}}>
                              P{pi+1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div style={{marginTop:18,padding:14,background:"#0a0a16",borderRadius:10,border:"1px solid #111"}}>
            <div style={{color:"#333",fontSize:"0.75rem",letterSpacing:"2px",marginBottom:8}}>CAREER STATS</div>
            <div style={{display:"flex",gap:24,fontSize:"0.85rem"}}>
              {[
                {l:"Kills",  v:save.stats?.kills||0,  c:"#f97316"},
                {l:"Wins",   v:save.stats?.wins||0,   c:"#39ff14"},
                {l:"Power-ups",v:save.stats?.powerups||0,c:"#9d00ff"},
                {l:"Games",  v:save.stats?.gamesPlayed||0,c:"#00e5ff"},
              ].map(s=>(
                <div key={s.l}>{s.l}: <span style={{color:s.c,fontWeight:900}}>{s.v}</span></div>
              ))}
            </div>
          </div>

          <button onClick={()=>setScreen("menu")} style={{...S.mainBtn,background:"#0e0e1c",border:"1px solid #1a1a2a",marginTop:16,width:"100%"}}>← BACK TO MENU</button>
        </div>
      )}

      {/* ══ PLAYING ═══════════════════════════════════════════ */}
      <div style={{display:screen==="playing"?"flex":"none",flexDirection:"column",alignItems:"center"}}>
        {/* HUD */}
        <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",justifyContent:"center"}}>
          {uiSnap.players.map(p=>(
            <div key={p.pid} style={{
              background:"#080810",border:`1.5px solid ${p.col}22`,borderBottom:`3px solid ${p.col}`,
              padding:"10px 15px",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",
              minWidth:170,transition:"opacity 0.2s",opacity:p.state==="dead"?0.25:1,
            }}>
              <div>
                <div style={{fontWeight:900,color:p.type==="bot"?"#ff7777":"#fff",fontSize:"0.9rem"}}>{p.id}</div>
                <div style={{display:"flex",gap:3,marginTop:3,fontSize:"0.8rem"}}>
                  {p.shield&&<span title="Shield">🛡</span>}
                  {p.speed &&<span title="Speed">⚡</span>}
                  {p.rage  &&<span title="Rage">💢</span>}
                  {p.extend&&<span title="Extend">⛓</span>}
                  {p.ghost &&<span title="Phase">👻</span>}
                  {p.magnet&&<span title="Vortex">🧲</span>}
                  {p.freeze&&<span title="Frozen">❄</span>}
                </div>
              </div>
              <div style={{fontSize:"2rem",fontWeight:900,color:p.col,minWidth:30,textAlign:"right"}}>{p.score}</div>
            </div>
          ))}
        </div>

        <canvas ref={canvasRef} width={W} height={H} style={{
          borderRadius:14,border:"1px solid #1a1a28",display:"block",
          boxShadow:"0 0 80px rgba(249,115,22,0.1),0 0 160px rgba(0,229,255,0.05)",
        }}/>

        <div style={{display:"flex",gap:20,marginTop:10,color:"#252530",fontSize:"0.72rem",fontWeight:900,letterSpacing:"1.5px"}}>
          <span>FIRST TO {config.winScore} KILLS</span>
          <span>·</span>
          <span>ORANGE BLADE = LETHAL</span>
          <span>·</span>
          <span>COLLECT GLOWING ICONS</span>
        </div>
      </div>

      {/* ══ GAME OVER ═════════════════════════════════════════ */}
      {screen==="gameover"&&(()=>{
        const w=gsRef.current.winner;
        if(!w) return null;
        return(
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"0.9rem",color:"#333",letterSpacing:"8px",marginBottom:14}}>MATCH OVER</div>
            <div style={{fontSize:"6.5rem",fontWeight:900,fontStyle:"italic",lineHeight:1,color:w.col,
              textShadow:`0 0 60px ${w.col},0 0 120px ${w.col}66`}}>
              CHAMPION
            </div>
            <div style={{fontSize:"1.8rem",color:"#fff",marginTop:18,fontWeight:900}}>{w.id}</div>
            {w.type==="human"&&(
              <div style={{color:"#f97316",fontSize:"1.1rem",marginTop:10,fontWeight:900}}>+250 ♦ SHARDS EARNED</div>
            )}
            <div style={{display:"flex",gap:16,marginTop:40,justifyContent:"center"}}>
              <button onClick={startMatch}
                style={{...S.mainBtn,background:"linear-gradient(135deg,#f97316,#ff003c)",color:"#fff",padding:"18px 40px",fontSize:"1.05rem"}}>
                ⚔ PLAY AGAIN
              </button>
              <button onClick={()=>setScreen("menu")}
                style={{...S.mainBtn,background:"#0a0a16",border:"1.5px solid #00e5ff",color:"#00e5ff",padding:"18px 40px"}}>
                MENU
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const S = {
  card:{
    background:"#0a0a14",border:"1px solid #111820",
    padding:"42px 46px",borderRadius:20,
    width:780,maxWidth:"98vw",
    boxShadow:"0 40px 80px rgba(0,0,0,0.9),inset 0 1px 0 rgba(255,255,255,0.03)",
  },
  box:{
    background:"#0d0d1a",padding:"15px 17px",
    borderRadius:12,border:"1px solid #111820",
  },
  lbl:{ fontWeight:900,color:"#444",fontSize:"0.76rem",letterSpacing:"2.5px" },
  btn:(active,col)=>({
    background:active?col:"#0e0e1a",
    color:active?"#000":"#444",
    border:`1px solid ${active?col:"#1a1a28"}`,
    padding:"11px 8px",borderRadius:8,
    fontWeight:900,cursor:"pointer",fontSize:"0.82rem",
    fontFamily:"inherit",transition:"background 0.1s,color 0.1s",
  }),
  mainBtn:{
    padding:"17px 22px",border:"none",borderRadius:10,
    fontSize:"0.95rem",fontWeight:900,cursor:"pointer",
    fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"1px",
  },
  smallBtn:{
    width:"100%",padding:"10px",background:"#f97316",
    color:"#000",border:"none",borderRadius:6,
    fontWeight:900,cursor:"pointer",fontSize:"0.78rem",fontFamily:"inherit",
  },
};