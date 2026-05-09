'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
//  KNOCKOUT ARENA ULTRA  —  World's Best Top-Down Brawler
//  Up to 4 humans + 4 bots | 8 arenas | 20+ skins | Full shop
// ═══════════════════════════════════════════════════════════════

const SAVE_KEY = "KO_ULTRA_V4";
const W = 1100, H = 680;

// Physics
const FRICTION       = 0.91;
const SPEED          = 0.85;
const MAX_VEL        = 14;
const DASH_FORCE     = 20;
const DASH_CD        = 70;
const DASH_DURATION  = 14;
const KNOCKBACK_BASE = 7;
const PLAYER_R       = 22;

// ─── SKINS ──────────────────────────────────────────────────
const SKINS = [
  { id:"cobalt",   name:"Cobalt",       hex:"#3b82f6", glow:"#60a5fa", cost:0 },
  { id:"scarlet",  name:"Scarlet",      hex:"#ef4444", glow:"#f87171", cost:0 },
  { id:"jade",     name:"Jade",         hex:"#10b981", glow:"#34d399", cost:0 },
  { id:"amber",    name:"Amber",        hex:"#f59e0b", glow:"#fbbf24", cost:0 },
  { id:"violet",   name:"Violet",       hex:"#8b5cf6", glow:"#a78bfa", cost:150 },
  { id:"rose",     name:"Neon Rose",    hex:"#f43f5e", glow:"#fb7185", cost:200 },
  { id:"cyan",     name:"Cyan Storm",   hex:"#06b6d4", glow:"#22d3ee", cost:200 },
  { id:"lime",     name:"Toxic Lime",   hex:"#84cc16", glow:"#a3e635", cost:200 },
  { id:"gold",     name:"24K Gold",     hex:"#eab308", glow:"#fde047", cost:400 },
  { id:"crimson",  name:"Blood Moon",   hex:"#b91c1c", glow:"#ef4444", cost:400 },
  { id:"teal",     name:"Deep Teal",    hex:"#0d9488", glow:"#2dd4bf", cost:400 },
  { id:"indigo",   name:"Indigo",       hex:"#4338ca", glow:"#818cf8", cost:500 },
  { id:"silver",   name:"Chrome",       hex:"#94a3b8", glow:"#cbd5e1", cost:600 },
  { id:"white",    name:"Phantom",      hex:"#f8fafc", glow:"#ffffff", cost:700 },
  { id:"void",     name:"Void",         hex:"#09090b", glow:"#7c3aed", cost:900 },
  { id:"inferno",  name:"Inferno",      hex:"#c2410c", glow:"#f97316", cost:900 },
  { id:"aurora",   name:"Aurora",       hex:"#0ea5e9", glow:"#e879f9", cost:1200, animated:true },
  { id:"cosmic",   name:"Cosmic",       hex:"#1e1b4b", glow:"#818cf8", cost:1500, animated:true },
  { id:"plasma",   name:"Plasma Core",  hex:"#d946ef", glow:"#f0abfc", cost:2000, animated:true },
  { id:"divine",   name:"Divine Light", hex:"#fef3c7", glow:"#fde68a", cost:3000, animated:true },
];

// ─── TRAILS ─────────────────────────────────────────────────
const TRAILS = [
  { id:"none",      name:"None",         cost:0   },
  { id:"dust",      name:"Dust Cloud",   cost:100 },
  { id:"fire",      name:"Flame",        cost:300 },
  { id:"ice",       name:"Ice Crystals", cost:300 },
  { id:"electric",  name:"Electric",     cost:500 },
  { id:"rainbow",   name:"Rainbow",      cost:700 },
  { id:"shadow",    name:"Dark Shadow",  cost:700 },
  { id:"sparkle",   name:"Stardust",     cost:900 },
  { id:"vortex",    name:"Vortex",       cost:1100},
  { id:"comet",     name:"Comet Tail",   cost:1300},
];

// ─── RINGS ──────────────────────────────────────────────────
const RINGS = [
  { id:"none",     name:"None",          cost:0    },
  { id:"basic",    name:"Ring",          cost:150  },
  { id:"spiky",    name:"Spike Ring",    cost:400  },
  { id:"halo",     name:"Halo",          cost:600  },
  { id:"orbit",    name:"Orbiting Dot",  cost:800  },
  { id:"crown",    name:"Crown",         cost:1000 },
  { id:"blades",   name:"Razor Blades",  cost:1500 },
];

// ─── POWERUP TYPES ──────────────────────────────────────────
const POWERUP_DEFS = [
  { id:"speed",    col:"#06b6d4", icon:"⚡", label:"SPEED UP!",     dur:240, desc:"2x Speed" },
  { id:"shield",   col:"#60a5fa", icon:"🛡", label:"SHIELDED!",     dur:200, desc:"Block 1 hit" },
  { id:"bigdash",  col:"#f97316", icon:"💥", label:"MEGA DASH!",    dur:0,   desc:"Instant power dash" },
  { id:"sticky",   col:"#a78bfa", icon:"🌀", label:"STICKY ZONE!",  dur:0,   desc:"Drop a sticky trap" },
  { id:"freeze",   col:"#93c5fd", icon:"❄",  label:"FREEZE ALL!",   dur:0,   desc:"Freeze everyone nearby" },
  { id:"magnet",   col:"#fbbf24", icon:"🧲", label:"REPEL!",        dur:160, desc:"Repel nearby players" },
  { id:"tiny",     col:"#34d399", icon:"↙",  label:"TINY MODE!",    dur:180, desc:"Small but fast" },
  { id:"big",      col:"#f43f5e", icon:"↗",  label:"TITAN MODE!",   dur:160, desc:"Huge knockback" },
  { id:"ghost",    col:"#94a3b8", icon:"👻", label:"GHOST!",        dur:200, desc:"Phase through others" },
  { id:"bomb",     col:"#ef4444", icon:"💣", label:"BOMB!",         dur:0,   desc:"Explosion on next hit" },
];

// ─── ARENAS ─────────────────────────────────────────────────
const ARENAS = [
  {
    id:"island",    name:"The Island",   emoji:"🏝️",
    desc:"Circular platform. Simple. Deadly.",
    bg:["#020617","#0c1445"],   edgeCol:"#1e3a5f",   glowCol:"#0ea5e9",
    getSafe:(x,y)=> Math.hypot(x-W/2,y-H/2)<290,
    draw:(ctx,f)=>{
      ctx.save();
      // Outer glow
      const og=ctx.createRadialGradient(W/2,H/2,250,W/2,H/2,320);
      og.addColorStop(0,"rgba(14,165,233,0.15)"); og.addColorStop(1,"transparent");
      ctx.fillStyle=og; ctx.beginPath(); ctx.arc(W/2,H/2,320,0,Math.PI*2); ctx.fill();
      // Platform
      const g=ctx.createRadialGradient(W/2,H/2-30,20,W/2,H/2,290);
      g.addColorStop(0,"#1e3a5f"); g.addColorStop(0.7,"#1a2744"); g.addColorStop(1,"#0f1f38");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(W/2,H/2,290,0,Math.PI*2); ctx.fill();
      // Edge rim
      ctx.strokeStyle=`rgba(14,165,233,${0.4+0.2*Math.sin(f*0.03)})`;
      ctx.lineWidth=4; ctx.beginPath(); ctx.arc(W/2,H/2,290,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
  },
  {
    id:"donut",     name:"The Ring",     emoji:"🍩",
    desc:"Hole in the middle — don't fall in!",
    bg:["#0d0005","#1a0010"],  edgeCol:"#7c1d3e",  glowCol:"#f43f5e",
    getSafe:(x,y)=>{ const d=Math.hypot(x-W/2,y-H/2); return d<310&&d>115; },
    draw:(ctx,f)=>{
      ctx.save();
      ctx.fillStyle=ctx.createRadialGradient(W/2,H/2,110,W/2,H/2,315);
      const g=ctx.createRadialGradient(W/2,H/2,110,W/2,H/2,315);
      g.addColorStop(0,"#2a0015"); g.addColorStop(0.5,"#1f0010"); g.addColorStop(1,"#0d0005");
      // Draw ring using composite ops
      ctx.save();
      ctx.beginPath(); ctx.arc(W/2,H/2,310,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
      ctx.globalCompositeOperation="destination-out";
      ctx.beginPath(); ctx.arc(W/2,H/2,115,0,Math.PI*2); ctx.fill();
      ctx.restore();
      // Inner edge glow
      ctx.strokeStyle=`rgba(244,63,94,${0.5+0.3*Math.sin(f*0.05)})`; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(W/2,H/2,115,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle=`rgba(244,63,94,${0.3+0.2*Math.sin(f*0.04)})`; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(W/2,H/2,310,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
  },
  {
    id:"cross",     name:"Crossroads",   emoji:"✚",
    desc:"Four narrow bridges meet the center.",
    bg:["#001005","#002510"],  edgeCol:"#064e3b",  glowCol:"#10b981",
    getSafe:(x,y)=>{
      const cx=W/2, cy=H/2;
      return (Math.abs(x-cx)<75&&Math.abs(y-cy)<75) ||
             (Math.abs(y-cy)<55&&Math.abs(x-cx)<350) ||
             (Math.abs(x-cx)<55&&Math.abs(y-cy)<300);
    },
    draw:(ctx,f)=>{
      ctx.save();
      const glow=`rgba(16,185,129,${0.3+0.1*Math.sin(f*0.04)})`;
      // Bridge pieces
      const parts=[
        {x:W/2-350,y:H/2-55,w:700,h:110},
        {x:W/2-55,y:H/2-300,w:110,h:600},
      ];
      parts.forEach(p=>{
        const g=ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);
        g.addColorStop(0,"#0a3320"); g.addColorStop(0.5,"#0d4a2c"); g.addColorStop(1,"#0a3320");
        ctx.fillStyle=g; ctx.fillRect(p.x,p.y,p.w,p.h);
        ctx.strokeStyle=glow; ctx.lineWidth=2.5;
        ctx.strokeRect(p.x,p.y,p.w,p.h);
      });
      ctx.restore();
    }
  },
  {
    id:"hex",       name:"Hexagon",      emoji:"⬡",
    desc:"Six sides. Six ways to fall.",
    bg:["#0a0800","#1a1400"],  edgeCol:"#78350f",  glowCol:"#f59e0b",
    getSafe:(x,y)=>{
      const cx=W/2, cy=H/2, s=290;
      const dx=Math.abs(x-cx), dy=Math.abs(y-cy);
      return dx<=s*0.866&&dy<=s*0.5&&(s*0.866*s*0.5)>=(s*0.5*dx+s*0.866*dy/2);
    },
    draw:(ctx,f)=>{
      ctx.save();
      const cx=W/2, cy=H/2, s=290;
      ctx.beginPath();
      for(let i=0;i<6;i++){
        const a=Math.PI/180*(60*i-30);
        i===0?ctx.moveTo(cx+s*Math.cos(a),cy+s*Math.sin(a)):ctx.lineTo(cx+s*Math.cos(a),cy+s*Math.sin(a));
      }
      ctx.closePath();
      const g=ctx.createRadialGradient(cx,cy-40,20,cx,cy,s);
      g.addColorStop(0,"#2c1a00"); g.addColorStop(0.8,"#1a1000"); g.addColorStop(1,"#0a0800");
      ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle=`rgba(245,158,11,${0.5+0.3*Math.sin(f*0.04)})`; ctx.lineWidth=4; ctx.stroke();
      ctx.restore();
    }
  },
  {
    id:"shuriken",  name:"Shuriken",     emoji:"✴️",
    desc:"Star-shaped. Sharp corners are safe — barely.",
    bg:["#0d0015","#1a0030"],  edgeCol:"#6b21a8",  glowCol:"#a855f7",
    getSafe:(x,y)=>{
      const cx=W/2, cy=H/2;
      const dx=x-cx, dy=y-cy;
      const angle=Math.atan2(dy,dx);
      const dist=Math.hypot(dx,dy);
      const sector=(((Math.round(angle/(Math.PI/4))%8)+8)%8);
      const maxR=sector%2===0?280:170;
      return dist<maxR;
    },
    draw:(ctx,f)=>{
      ctx.save();
      const cx=W/2, cy=H/2;
      ctx.beginPath();
      for(let i=0;i<8;i++){
        const a=(i/8)*Math.PI*2-Math.PI/2;
        const r=i%2===0?280:170;
        i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
      }
      ctx.closePath();
      const g=ctx.createRadialGradient(cx,cy,50,cx,cy,280);
      g.addColorStop(0,"#2e0057"); g.addColorStop(0.7,"#1a0033"); g.addColorStop(1,"#0d0015");
      ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle=`rgba(168,85,247,${0.5+0.3*Math.sin(f*0.05)})`; ctx.lineWidth=3.5; ctx.stroke();
      ctx.restore();
    }
  },
  {
    id:"diamond",   name:"Diamond",      emoji:"💎",
    desc:"Diamond-shaped platform. Mind the corners.",
    bg:["#001a1a","#002a2a"],  edgeCol:"#164e63",  glowCol:"#06b6d4",
    getSafe:(x,y)=>{
      const cx=W/2, cy=H/2;
      return Math.abs(x-cx)/310+Math.abs(y-cy)/290<1;
    },
    draw:(ctx,f)=>{
      ctx.save();
      const cx=W/2, cy=H/2;
      ctx.beginPath();
      ctx.moveTo(cx,cy-290); ctx.lineTo(cx+310,cy);
      ctx.lineTo(cx,cy+290); ctx.lineTo(cx-310,cy);
      ctx.closePath();
      const g=ctx.createRadialGradient(cx,cy-40,20,cx,cy,300);
      g.addColorStop(0,"#0a3a40"); g.addColorStop(0.8,"#052830"); g.addColorStop(1,"#001a1a");
      ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle=`rgba(6,182,212,${0.5+0.3*Math.sin(f*0.04)})`; ctx.lineWidth=4; ctx.stroke();
      ctx.restore();
    }
  },
  {
    id:"maze",      name:"Labyrinth",    emoji:"🌀",
    desc:"Multiple platforms connected by thin paths.",
    bg:["#0f0505","#200a0a"],  edgeCol:"#7f1d1d",  glowCol:"#ef4444",
    getSafe:(x,y)=>{
      const cx=W/2, cy=H/2;
      const center=Math.hypot(x-cx,y-cy)<110;
      const tl=Math.hypot(x-(cx-220),y-(cy-180))<90;
      const tr=Math.hypot(x-(cx+220),y-(cy-180))<90;
      const bl=Math.hypot(x-(cx-220),y-(cy+180))<90;
      const br=Math.hypot(x-(cx+220),y-(cy+180))<90;
      const pathH=Math.abs(y-cy)<38&&Math.abs(x-cx)<330;
      const pathV=Math.abs(x-cx)<38&&Math.abs(y-cy)<270;
      return center||tl||tr||bl||br||pathH||pathV;
    },
    draw:(ctx,f)=>{
      ctx.save();
      const cx=W/2, cy=H/2;
      const glow=`rgba(239,68,68,${0.4+0.2*Math.sin(f*0.04)})`;
      const nodes=[
        {x:cx,y:cy,r:110},
        {x:cx-220,y:cy-180,r:90},{x:cx+220,y:cy-180,r:90},
        {x:cx-220,y:cy+180,r:90},{x:cx+220,y:cy+180,r:90},
      ];
      nodes.forEach(n=>{
        const g=ctx.createRadialGradient(n.x,n.y-15,5,n.x,n.y,n.r);
        g.addColorStop(0,"#3b0a0a"); g.addColorStop(1,"#1a0505");
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=glow; ctx.lineWidth=2.5; ctx.stroke();
      });
      // Corridors
      [[{x:cx-330,y:cy-38,w:660,h:76},{x:cx-38,y:cy-270,w:76,h:540}]].flat().forEach(r=>{
        const g2=ctx.createLinearGradient(r.x,r.y,r.x,r.y+r.h);
        g2.addColorStop(0,"#2a0808"); g2.addColorStop(0.5,"#350b0b"); g2.addColorStop(1,"#2a0808");
        ctx.fillStyle=g2; ctx.fillRect(r.x,r.y,r.w,r.h);
      });
      ctx.restore();
    }
  },
  {
    id:"chaos",     name:"Chaos Zone",   emoji:"🌪️",
    desc:"Multiple islands. Jump between them to survive!",
    bg:["#050014","#0a0028"],  edgeCol:"#312e81",  glowCol:"#818cf8",
    getSafe:(x,y)=>{
      const islands=[
        {x:W/2,y:H/2,r:160},
        {x:W/2-280,y:H/2-150,r:100},
        {x:W/2+280,y:H/2-150,r:100},
        {x:W/2-260,y:H/2+160,r:90},
        {x:W/2+260,y:H/2+160,r:90},
        {x:W/2,y:H/2-260,r:75},
      ];
      return islands.some(i=>Math.hypot(x-i.x,y-i.y)<i.r);
    },
    draw:(ctx,f)=>{
      ctx.save();
      const islands=[
        {x:W/2,y:H/2,r:160,col:"#1a1548"},
        {x:W/2-280,y:H/2-150,r:100,col:"#141030"},
        {x:W/2+280,y:H/2-150,r:100,col:"#141030"},
        {x:W/2-260,y:H/2+160,r:90,col:"#10102e"},
        {x:W/2+260,y:H/2+160,r:90,col:"#10102e"},
        {x:W/2,y:H/2-260,r:75,col:"#0e0e28"},
      ];
      islands.forEach((il,i)=>{
        ctx.shadowBlur=20+10*Math.sin(f*0.04+i);
        ctx.shadowColor="#818cf8";
        const g=ctx.createRadialGradient(il.x,il.y-il.r*0.2,il.r*0.1,il.x,il.y,il.r);
        g.addColorStop(0,il.col); g.addColorStop(1,"#080820");
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(il.x,il.y,il.r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=`rgba(129,140,248,${0.4+0.3*Math.sin(f*0.05+i)})`; ctx.lineWidth=2.5; ctx.stroke();
      });
      ctx.shadowBlur=0;
      ctx.restore();
    }
  },
];

// ─── DEFAULT SAVE ────────────────────────────────────────────
const DEFAULT_SAVE = {
  coins: 800,
  ownedSkins:  ["cobalt","scarlet","jade","amber"],
  ownedTrails: ["none"],
  ownedRings:  ["none"],
  equip: {
    p1:{ skin:"cobalt",  trail:"none", ring:"none" },
    p2:{ skin:"scarlet", trail:"none", ring:"none" },
    p3:{ skin:"jade",    trail:"none", ring:"none" },
    p4:{ skin:"amber",   trail:"none", ring:"none" },
  },
  stats:{ kills:0, wins:0, matches:0, coins_earned:0 },
  unlockedArenas:["island","donut","cross","hex"],
};

// ─── UTILS ──────────────────────────────────────────────────
const rand  = (a,b) => Math.random()*(b-a)+a;
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const dist  = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);

// ══════════════════════════════════════════════════════════════
export default function KnockoutArenaUltra() {
  const canvasRef = useRef(null);
  const reqRef    = useRef(null);
  const gsRef     = useRef({ keys:{}, active:false, frame:0 });

  const [save,   setSave]   = useState(DEFAULT_SAVE);
  const [screen, setScreen] = useState("menu");
  const [cfg,    setCfg]    = useState({ humans:1, bots:3, winScore:5, arenaId:"island" });
  const [shopTab,setShopTab]= useState("skins");
  const [shopPid,setShopPid]= useState(1);
  const [uiSnap, setUiSnap] = useState({ players:[], frame:0 });
  const [notif,  setNotif]  = useState(null);
  const [menuF,  setMenuF]  = useState(0);

  // ── LOAD ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setSave(prev => ({
          ...DEFAULT_SAVE, ...d,
          equip: { ...DEFAULT_SAVE.equip, ...(d.equip||{}) },
          stats: { ...DEFAULT_SAVE.stats, ...(d.stats||{}) },
          ownedSkins:  d.ownedSkins  || DEFAULT_SAVE.ownedSkins,
          ownedTrails: d.ownedTrails || DEFAULT_SAVE.ownedTrails,
          ownedRings:  d.ownedRings  || DEFAULT_SAVE.ownedRings,
          unlockedArenas: d.unlockedArenas || DEFAULT_SAVE.unlockedArenas,
        }));
      }
    } catch(_) {}

    const dn = e => { gsRef.current.keys[e.code]=true; gsRef.current.keys[e.key?.toLowerCase()]=true; };
    const up = e => { gsRef.current.keys[e.code]=false; gsRef.current.keys[e.key?.toLowerCase()]=false; };
    window.addEventListener("keydown",dn);
    window.addEventListener("keyup",up);

    let af, f=0;
    const ani = () => { setMenuF(++f); af=requestAnimationFrame(ani); };
    af = requestAnimationFrame(ani);

    return () => {
      window.removeEventListener("keydown",dn);
      window.removeEventListener("keyup",up);
      cancelAnimationFrame(af);
      if(reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  const persist = useCallback((data) => {
    setSave(data);
    try { localStorage.setItem(SAVE_KEY,JSON.stringify(data)); } catch(_){}
  }, []);

  const notify = (msg, col="#eab308") => {
    setNotif({msg,col});
    setTimeout(()=>setNotif(null), 2400);
  };

  // ── START MATCH ─────────────────────────────────────────────
  const startMatch = useCallback(() => {
    if(reqRef.current) cancelAnimationFrame(reqRef.current);
    const arena = ARENAS.find(a=>a.id===cfg.arenaId)||ARENAS[0];

    const humanCtrl = [
      { l:"KeyA",     r:"KeyD",      u:"KeyW",      d:"KeyS",      dash:"Space"     },
      { l:"ArrowLeft",r:"ArrowRight",u:"ArrowUp",   d:"ArrowDown", dash:"ShiftRight"},
      { l:"KeyJ",     r:"KeyL",      u:"KeyI",      d:"KeyK",      dash:"KeyO"      },
      { l:"Numpad4",  r:"Numpad6",   u:"Numpad8",   d:"Numpad5",   dash:"Numpad0"   },
    ];

    // Assign unique skins
    const usedSkins = [];
    const assignSkin = (pid) => {
      let sid = save.equip[`p${pid}`]?.skin;
      if (!sid || usedSkins.includes(sid)) {
        sid = save.ownedSkins.find(s=>!usedSkins.includes(s)) || SKINS[pid-1].id;
      }
      usedSkins.push(sid);
      return sid;
    };

    const spawnPositions = [
      {x:W/2-160,y:H/2-160},{x:W/2+160,y:H/2-160},
      {x:W/2-160,y:H/2+160},{x:W/2+160,y:H/2+160},
      {x:W/2,y:H/2-200},{x:W/2,y:H/2+200},
      {x:W/2-220,y:H/2},{x:W/2+220,y:H/2},
    ];

    let players = [];
    for (let i=0;i<cfg.humans;i++) {
      const pid=i+1;
      const sid=assignSkin(pid);
      const sk=SKINS.find(s=>s.id===sid)||SKINS[0];
      const sp=spawnPositions[i%spawnPositions.length];
      players.push({
        pid, id:pid, type:"human", ctrl:humanCtrl[i],
        x:sp.x+rand(-20,20), y:sp.y+rand(-20,20),
        vx:0, vy:0, r:PLAYER_R,
        score:0, lives:3,
        state:"alive", // alive | falling | dead
        fallScale:1,
        dashCd:0, dashTime:0,
        effects:{}, // speed,shield,tiny,big,ghost,magnet,bomb
        lastHitBy:null,
        invuln:0,
        trailId: save.equip[`p${pid}`]?.trail||"none",
        ringId:  save.equip[`p${pid}`]?.ring||"none",
        skinId: sid,
        col:sk.hex, glow:sk.glow, animated:sk.animated,
        label:`P${pid}`,
        orbitAngle:0,
        portalCd:0,
      });
    }

    const botNames=["ACE","DOOM","NOVA","FURY","ZETA","APEX","RUIN","VILE"];
    const botCols=[
      {hex:"#94a3b8",glow:"#cbd5e1"},{hex:"#fb923c",glow:"#fdba74"},
      {hex:"#c084fc",glow:"#e879f9"},{hex:"#2dd4bf",glow:"#99f6e4"},
      {hex:"#f472b6",glow:"#fbcfe8"},{hex:"#a3e635",glow:"#d9f99d"},
    ];
    for (let i=0;i<cfg.bots;i++) {
      const pid=cfg.humans+i+1;
      const sp=spawnPositions[(cfg.humans+i)%spawnPositions.length];
      const bc=botCols[i%botCols.length];
      players.push({
        pid, id:pid, type:"bot", ctrl:null,
        x:sp.x+rand(-20,20), y:sp.y+rand(-20,20),
        vx:0, vy:0, r:PLAYER_R,
        score:0, lives:3,
        state:"alive", fallScale:1,
        dashCd:0, dashTime:0,
        effects:{}, lastHitBy:null, invuln:0,
        trailId:"none", ringId:"none", skinId:"none",
        col:bc.hex, glow:bc.glow,
        label:botNames[i%botNames.length],
        orbitAngle:0, portalCd:0,
        botTargetPid:null, botStateTimer:0, botMode:"hunt",
      });
    }

    gsRef.current = {
      keys: gsRef.current.keys,
      frame:0, active:true,
      shake:0, shakeMag:0, hitstop:0,
      players,
      particles:[],
      popups:[],
      powerups:[],
      traps:[], // sticky traps
      winner:null,
      arena,
      winScore:cfg.winScore,
      saveSnap:{ ...save },
      roundNum:1,
      roundTimer:0,
      roundFlash:0,
    };

    setScreen("playing");
    reqRef.current = requestAnimationFrame(gameLoop);
  // eslint-disable-next-line
  }, [cfg, save]);

  // ── GAME LOOP ────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const g = gsRef.current;
    if (!g.active) return;

    if (g.hitstop>0) { g.hitstop--; drawFrame(g); reqRef.current=requestAnimationFrame(gameLoop); return; }

    g.frame++;
    if (g.shake>0) g.shake--;

    const arena = g.arena;

    // ── POWERUP SPAWNER ──────────────────────────────────────
    if (g.frame%420===0 && Math.random()<0.8) {
      const def = POWERUP_DEFS[Math.floor(Math.random()*POWERUP_DEFS.length)];
      // Find safe spawn
      let sx,sy,tries=0;
      do { sx=rand(100,W-100); sy=rand(100,H-100); tries++; } while(!arena.getSafe(sx,sy)&&tries<30);
      if(tries<30) g.powerups.push({ x:sx, y:sy, def, bob:rand(0,Math.PI*2), life:700, pulse:0 });
    }

    // ── PLAYER UPDATE ────────────────────────────────────────
    let aliveCnt=0;
    for (let i=0;i<g.players.length;i++) {
      const p=g.players[i];
      if (p.state==="dead") continue;

      // Falling animation
      if (p.state==="falling") {
        p.fallScale = Math.max(0, p.fallScale-0.045);
        p.x+=p.vx*0.6; p.y+=p.vy*0.6;
        if (p.fallScale<=0) {
          p.state="dead";
          // Award point
          if (p.lastHitBy) {
            const killer=g.players.find(k=>k.pid===p.lastHitBy&&k.state!=="dead");
            if (killer) {
              killer.score++;
              g.popups.push({x:p.x,y:p.y-30,txt:"KNOCKOUT!",col:killer.col,life:55,big:true});
              spawnBurst(g,p.x,p.y,p.col,25);
              g.shake=14; g.shakeMag=9;
              g.hitstop=6;
              if(killer.type==="human") {
                const ns={...g.saveSnap,coins:g.saveSnap.coins+15,stats:{...g.saveSnap.stats,kills:g.saveSnap.stats.kills+1,coins_earned:g.saveSnap.stats.coins_earned+15}};
                g.saveSnap=ns; persist(ns);
              }
            }
          } else {
            // Suicide — no point
            g.popups.push({x:p.x,y:p.y,txt:"FELL OFF!",col:"#94a3b8",life:40});
          }
        }
        continue;
      }

      aliveCnt++;

      // Invuln cooldown
      if(p.invuln>0) p.invuln--;
      if(p.dashCd>0) p.dashCd--;
      if(p.dashTime>0) p.dashTime--;
      if(p.portalCd>0) p.portalCd--;
      p.orbitAngle+=0.06;

      // Tick effects
      for(const k of Object.keys(p.effects)) {
        if(typeof p.effects[k]==="number") { p.effects[k]--; if(p.effects[k]<=0) delete p.effects[k]; }
      }

      // Frozen check
      if(p.effects.frozen) { p.vx*=0.7; p.vy*=0.7; continue; }

      let ax=0, ay=0, doDash=false;

      // ── HUMAN INPUT ──────────────────────────────────────
      if(p.type==="human") {
        const k=p.ctrl;
        if(g.keys[k.l]) ax-=1;
        if(g.keys[k.r]) ax+=1;
        if(g.keys[k.u]) ay-=1;
        if(g.keys[k.d]) ay+=1;
        if(g.keys[k.dash]&&p.dashCd===0) { doDash=true; g.keys[k.dash]=false; }
      }
      // ── BOT AI ────────────────────────────────────────────
      else {
        p.botStateTimer--;
        if(p.botStateTimer<=0) {
          // Predict edge danger
          const nx=p.x+p.vx*20, ny=p.y+p.vy*20;
          if(!arena.getSafe(nx,ny)) {
            p.botMode="retreat";
          } else {
            // Pick a target
            let closest=null, bestD=9999;
            g.players.forEach(op=>{
              if(op!==p&&op.state==="alive") {
                const dd=dist(p,op); if(dd<bestD) { bestD=dd; closest=op; }
              }
            });
            p.botTargetPid = closest?.pid||null;
            p.botMode = closest&&bestD<350?"hunt":"wander";
          }
          p.botStateTimer=Math.floor(rand(15,45));
        }

        if(p.botMode==="retreat") {
          const cx=W/2, cy=H/2;
          const toCenter={x:cx-p.x,y:cy-p.y};
          const len=Math.hypot(toCenter.x,toCenter.y)||1;
          ax=toCenter.x/len; ay=toCenter.y/len;
          if(p.dashCd===0&&Math.random()<0.15) doDash=true;
        } else if(p.botMode==="hunt") {
          const target=g.players.find(q=>q.pid===p.botTargetPid&&q.state==="alive");
          if(target) {
            const d=dist(p,target);
            const dir={x:target.x-p.x,y:target.y-p.y};
            const len=Math.hypot(dir.x,dir.y)||1;
            ax=dir.x/len; ay=dir.y/len;
            // Dash when close
            if(d<150&&p.dashCd===0&&Math.random()<0.07) doDash=true;
          }
        } else {
          // Wander toward random point
          const tx=W/2+rand(-150,150), ty=H/2+rand(-150,150);
          const dir={x:tx-p.x,y:ty-p.y}; const len=Math.hypot(dir.x,dir.y)||1;
          ax=dir.x/len; ay=dir.y/len;
          if(Math.random()<0.004&&p.dashCd===0) doDash=true;
        }
      }

      // Normalize diagonal
      const alen=Math.hypot(ax,ay); if(alen>1){ax/=alen;ay/=alen;}

      // Speed modifier
      const speedMul = p.effects.speed?1.9 : p.effects.tiny?1.7 : p.effects.big?0.7 : 1.0;
      const ctrlFactor = p.dashTime>0?0.15:1;
      p.vx += ax*SPEED*speedMul*ctrlFactor;
      p.vy += ay*SPEED*speedMul*ctrlFactor;

      // Dash
      if(doDash) {
        const spd=Math.hypot(p.vx,p.vy)||1;
        const nx=spd>0.1?p.vx/spd:(Math.random()>0.5?1:-1);
        const ny=spd>0.1?p.vy/spd:0;
        const df=p.effects.big?DASH_FORCE*1.5:DASH_FORCE;
        p.vx=nx*df; p.vy=ny*df;
        p.dashCd=DASH_CD; p.dashTime=DASH_DURATION;
        for(let k=0;k<10;k++) g.particles.push({x:p.x,y:p.y,vx:rand(-3,3)-p.vx*0.15,vy:rand(-3,3)-p.vy*0.15,col:p.col,life:22,s:rand(4,8),alpha:0.9});
      }

      // Friction & clamp
      p.vx*=FRICTION; p.vy*=FRICTION;
      const maxV=p.effects.speed?MAX_VEL*1.9:p.effects.tiny?MAX_VEL*1.7:MAX_VEL;
      const speed=Math.hypot(p.vx,p.vy);
      if(speed>maxV){p.vx=p.vx/speed*maxV;p.vy=p.vy/speed*maxV;}

      // Magnet repel
      if(p.effects.magnet) {
        g.players.forEach(op=>{
          if(op===p||op.state!=="alive") return;
          const d=dist(p,op); if(d<200&&d>0.1) {
            const nx=(op.x-p.x)/d, ny=(op.y-p.y)/d;
            op.vx+=nx*3; op.vy+=ny*3;
          }
        });
      }

      p.x+=p.vx; p.y+=p.vy;

      // Trail
      emitTrail(g,p);

      // Sticky traps
      for(const trap of g.traps) {
        if(trap.owner===p.pid) continue;
        if(Math.hypot(p.x-trap.x,p.y-trap.y)<trap.r&&!p.effects.ghost) {
          p.vx*=0.6; p.vy*=0.6; p.effects.sticky=20;
        }
      }

      // Magnet aura particles
      if(p.effects.magnet&&g.frame%4===0) {
        const a=rand(0,Math.PI*2);
        g.particles.push({x:p.x+Math.cos(a)*60,y:p.y+Math.sin(a)*60,vx:(p.x-p.x-Math.cos(a)*60)*0.05,vy:(p.y-p.y-Math.sin(a)*60)*0.05,col:"#fbbf24",life:20,s:3,alpha:0.7});
      }

      // Edge check
      const r=p.effects.tiny?PLAYER_R*0.55:p.effects.big?PLAYER_R*1.6:PLAYER_R;
      p.r=r;
      if(!arena.getSafe(p.x,p.y)&&p.invuln===0) {
        p.state="falling";
        spawnBurst(g,p.x,p.y,p.col,12);
      }
    }

    // ── PLAYER COLLISIONS ────────────────────────────────────
    for(let i=0;i<g.players.length;i++) {
      for(let j=i+1;j<g.players.length;j++) {
        const a=g.players[i], b=g.players[j];
        if(a.state!=="alive"||b.state!=="alive") continue;
        if(a.effects.ghost||b.effects.ghost) continue;

        const d=dist(a,b);
        const minD=a.r+b.r;
        if(d>=minD||d<0.01) continue;

        // Overlap push
        const nx=(b.x-a.x)/d, ny=(b.y-a.y)/d;
        const overlap=minD-d;
        a.x-=nx*(overlap*0.52); a.y-=ny*(overlap*0.52);
        b.x+=nx*(overlap*0.48); b.y+=ny*(overlap*0.48);

        // Velocity-based force
        const relV=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
        if(relV<0) continue; // moving apart

        let force=KNOCKBACK_BASE+Math.abs(relV)*0.5;
        if(a.dashTime>0) force+=12; if(b.dashTime>0) force+=12;
        if(a.effects.big) force*=1.6; if(b.effects.big) force*=1.6;

        // Shield absorbs
        if(b.invuln===0&&!b.effects.shield) {
          b.vx+=nx*force*1.1; b.vy+=ny*force*1.1;
          b.lastHitBy=a.pid;
        } else if(b.effects.shield) { delete b.effects.shield; b.invuln=60; }

        if(a.invuln===0&&!a.effects.shield) {
          a.vx-=nx*force*1.1; a.vy-=ny*force*1.1;
          a.lastHitBy=b.pid;
        } else if(a.effects.shield) { delete a.effects.shield; a.invuln=60; }

        // Bomb on hit
        if(a.effects.bomb) { triggerBomb(g,a); delete a.effects.bomb; }
        if(b.effects.bomb) { triggerBomb(g,b); delete b.effects.bomb; }

        if(force>18) {
          g.shake=9; g.shakeMag=6; g.hitstop=4;
          spawnBurst(g,a.x+nx*a.r,a.y+ny*a.r,"#ffffff",12);
          g.popups.push({x:a.x+nx*a.r,y:a.y+ny*a.r-20,txt:"SLAM!",col:"#fff",life:28});
        }
      }
    }

    // ── POWERUP PICKUPS ──────────────────────────────────────
    for(let i=g.powerups.length-1;i>=0;i--) {
      const pw=g.powerups[i];
      pw.life--; pw.bob+=0.08; pw.pulse=(pw.pulse||0)+0.1;
      if(pw.life<=0){g.powerups.splice(i,1);continue;}
      for(const p of g.players) {
        if(p.state!=="alive") continue;
        if(Math.hypot(p.x-pw.x,p.y-pw.y)<p.r+18) {
          applyPowerup(g,p,pw.def);
          spawnBurst(g,pw.x,pw.y,pw.def.col,14);
          g.popups.push({x:pw.x,y:pw.y-20,txt:pw.def.label,col:pw.def.col,life:50});
          g.powerups.splice(i,1);
          break;
        }
      }
    }

    // ── TRAPS TICK ───────────────────────────────────────────
    for(let i=g.traps.length-1;i>=0;i--){g.traps[i].life--;if(g.traps[i].life<=0)g.traps.splice(i,1);}

    // ── ROUND END CHECK ──────────────────────────────────────
    const alive=g.players.filter(p=>p.state==="alive");

    // Win check
    const maxScore=Math.max(...g.players.map(p=>p.score),0);
    if(maxScore>=g.winScore&&!g.winner) {
      g.winner=g.players.find(p=>p.score===maxScore);
      g.active=false;
      if(g.winner?.type==="human") {
        const ns={...g.saveSnap,coins:g.saveSnap.coins+200,stats:{...g.saveSnap.stats,wins:g.saveSnap.stats.wins+1,matches:g.saveSnap.stats.matches+1}};
        g.saveSnap=ns; persist(ns);
      } else {
        const ns={...g.saveSnap,stats:{...g.saveSnap.stats,matches:g.saveSnap.stats.matches+1}};
        g.saveSnap=ns; persist(ns);
      }
      setTimeout(()=>setScreen("gameover"),3200);
    }

    // New round if only 1 left
    if(alive.length<=1&&g.players.length>1&&g.frame>90&&!g.winner) {
      g.roundNum++;
      g.roundFlash=80;
      g.players.forEach((p,idx)=>{
        p.state="alive"; p.fallScale=1;
        const sp=[ {x:W/2-160,y:H/2-160},{x:W/2+160,y:H/2-160},{x:W/2-160,y:H/2+160},{x:W/2+160,y:H/2+160},{x:W/2,y:H/2-200},{x:W/2,y:H/2+200},{x:W/2-220,y:H/2},{x:W/2+220,y:H/2} ];
        const ss=sp[idx%sp.length];
        p.x=ss.x+rand(-15,15); p.y=ss.y+rand(-15,15);
        p.vx=0; p.vy=0; p.invuln=100; p.effects={}; p.dashCd=0; p.r=PLAYER_R;
      });
    }
    if(g.roundFlash>0) g.roundFlash--;

    // ── PARTICLES ────────────────────────────────────────────
    for(let i=g.particles.length-1;i>=0;i--){
      const p=g.particles[i]; p.x+=p.vx; p.y+=p.vy; p.life--; p.vx*=0.97; p.vy*=0.97;
      if(p.life<=0) g.particles.splice(i,1);
    }
    for(let i=g.popups.length-1;i>=0;i--){
      const p=g.popups[i]; p.y-=1.4; p.life--;
      if(p.life<=0) g.popups.splice(i,1);
    }

    drawFrame(g);
    if(g.frame%4===0) setUiSnap({players:g.players.map(p=>({...p,effects:{...p.effects}})),frame:g.frame});
    if(g.active) reqRef.current=requestAnimationFrame(gameLoop);
  // eslint-disable-next-line
  }, [persist]);

  // ── HELPERS ──────────────────────────────────────────────────
  const emitTrail = (g,p) => {
    if(p.trailId==="none") return;
    if(Math.hypot(p.vx,p.vy)<0.4) return;
    if(g.frame%3!==0) return;
    let col=p.col, s=rand(3,6);
    switch(p.trailId){
      case"fire": col=g.frame%3===0?"#f97316":"#ef4444"; s=rand(4,7); break;
      case"ice":  col="#bae6fd"; break;
      case"electric": col=g.frame%2===0?"#fcd34d":"#ffffff"; break;
      case"rainbow": col=`hsl(${(g.frame*8)%360},100%,60%)`; break;
      case"shadow": col="#1e1b4b"; s=rand(5,9); break;
      case"sparkle": col=g.frame%3===0?"#eab308":"#fde68a"; break;
      case"vortex": col="#8b5cf6"; s=rand(4,8); break;
      case"comet": col=p.col; s=rand(3,10); break;
      default: col="#94a3b8";
    }
    g.particles.push({x:p.x+rand(-5,5),y:p.y+rand(-5,5),vx:rand(-0.8,0.8),vy:rand(-0.8,0.8),col,life:25,s,alpha:0.75});
  };

  const spawnBurst = (g,x,y,col,n=20) => {
    for(let k=0;k<n;k++){
      const a=(k/n)*Math.PI*2, spd=rand(3,9);
      g.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-1,col,life:rand(16,36),s:rand(3,7),alpha:1});
    }
  };

  const triggerBomb = (g,p) => {
    spawnBurst(g,p.x,p.y,"#ef4444",30);
    g.players.forEach(op=>{
      if(op===p||op.state!=="alive"||op.invuln>0) return;
      const d=dist(p,op); if(d<180) {
        const nx=(op.x-p.x)/(d||1), ny=(op.y-p.y)/(d||1);
        const f=14*(1-d/180);
        op.vx+=nx*f; op.vy+=ny*f; op.lastHitBy=p.pid;
      }
    });
    g.shake=16; g.shakeMag=10; g.hitstop=6;
  };

  const applyPowerup = (g,p,def) => {
    if(def.id==="freeze") {
      g.players.forEach(op=>{ if(op!==p&&op.state==="alive"&&Math.hypot(op.x-p.x,op.y-p.y)<260) op.effects.frozen=120; });
      return;
    }
    if(def.id==="sticky") {
      g.traps.push({x:p.x,y:p.y,r:50,owner:p.pid,col:"#a78bfa",life:500});
      return;
    }
    if(def.id==="bigdash") {
      const spd=Math.hypot(p.vx,p.vy)||1;
      const nx=spd>0.1?p.vx/spd:(Math.random()>0.5?1:-1);
      const ny=spd>0.1?p.vy/spd:0;
      p.vx=nx*DASH_FORCE*1.8; p.vy=ny*DASH_FORCE*1.8;
      p.dashTime=DASH_DURATION*2; p.dashCd=DASH_CD;
      return;
    }
    if(def.id==="bomb") { p.effects.bomb=true; return; }
    p.effects[def.id]=def.dur;
    if(def.id==="shield") p.invuln=0;
    if(p.type==="human") {
      const ns={...g.saveSnap,coins:g.saveSnap.coins+5};
      g.saveSnap=ns; persist(ns);
    }
  };

  // ── DRAW ─────────────────────────────────────────────────────
  const drawFrame = (g) => {
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    ctx.save();

    if(g.shake>0&&g.shakeMag>0) ctx.translate(rand(-g.shakeMag,g.shakeMag)*0.5,rand(-g.shakeMag,g.shakeMag)*0.5);

    // BG
    const arena=g.arena;
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,arena.bg[0]); bg.addColorStop(1,arena.bg[1]);
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // Stars
    ctx.fillStyle="rgba(255,255,255,0.6)";
    for(let i=0;i<60;i++){
      const sx=(i*137+17)%W, sy=(i*89+23)%H;
      const tw=0.5+0.5*Math.sin(g.frame*0.04+i);
      ctx.globalAlpha=tw*0.4; ctx.fillRect(sx,sy,1,1);
    }
    ctx.globalAlpha=1;

    // Arena platform
    arena.draw(ctx,g.frame);

    // Grid overlay on platform
    ctx.save();
    ctx.globalCompositeOperation="source-atop";
    ctx.strokeStyle=`rgba(255,255,255,0.03)`; ctx.lineWidth=1;
    for(let xi=0;xi<W;xi+=45){ctx.beginPath();ctx.moveTo(xi,0);ctx.lineTo(xi,H);ctx.stroke();}
    for(let yi=0;yi<H;yi+=45){ctx.beginPath();ctx.moveTo(0,yi);ctx.lineTo(W,yi);ctx.stroke();}
    ctx.restore();

    // Traps
    g.traps.forEach(trap=>{
      ctx.save();
      ctx.globalAlpha=0.35;
      ctx.fillStyle=trap.col;
      ctx.beginPath(); ctx.arc(trap.x,trap.y,trap.r,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.7;
      ctx.strokeStyle=trap.col; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(trap.x,trap.y,trap.r,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    });

    // Powerups
    g.powerups.forEach(pw=>{
      const bob=Math.sin(pw.bob)*7;
      const pulse=1+0.15*Math.sin(pw.pulse);
      ctx.save();
      ctx.shadowBlur=18*pulse; ctx.shadowColor=pw.def.col;
      ctx.fillStyle=pw.def.col;
      ctx.beginPath(); ctx.arc(pw.x,pw.y+bob,14*pulse,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#000"; ctx.font=`bold ${Math.round(14*pulse)}px system-ui`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(pw.def.icon,pw.x,pw.y+bob);
      ctx.shadowBlur=0;
      // Life bar
      ctx.fillStyle=pw.def.col+"44";
      ctx.fillRect(pw.x-15,pw.y+bob+18,30,3);
      ctx.fillStyle=pw.def.col;
      ctx.fillRect(pw.x-15,pw.y+bob+18,30*(pw.life/700),3);
      ctx.restore();
    });

    // Particles
    for(const p of g.particles){
      const alpha=clamp((p.alpha||1)*(p.life/30),0,1);
      ctx.globalAlpha=alpha;
      ctx.fillStyle=p.col;
      ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);
    }
    ctx.globalAlpha=1;

    // Players
    for(const p of g.players){
      if(p.state==="dead") continue;

      ctx.save();
      ctx.translate(p.x,p.y);

      const fs=p.state==="falling"?p.fallScale:1;
      const sf=p.effects.big?1.6:p.effects.tiny?0.55:1;
      ctx.scale(fs*sf,fs*sf);

      // Invuln flicker
      if(p.invuln>0&&g.frame%8<4) ctx.globalAlpha=0.4;

      // Frozen tint
      const isFrozen=!!p.effects.frozen;

      // Glow
      if(p.dashTime>0||p.effects.speed||p.effects.big) {
        ctx.shadowBlur=28; ctx.shadowColor=p.glow||p.col;
      } else if(p.effects.shield) {
        ctx.shadowBlur=20; ctx.shadowColor="#60a5fa";
      } else if(isFrozen) {
        ctx.shadowBlur=15; ctx.shadowColor="#93c5fd";
      } else {
        ctx.shadowBlur=8; ctx.shadowColor=(p.glow||p.col)+"66";
      }

      // Body
      ctx.fillStyle=isFrozen?"#93c5fd":p.effects.bomb?"#ef4444":p.col;
      ctx.beginPath(); ctx.arc(0,0,PLAYER_R,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

      // Inner gradient highlight
      const hl=ctx.createRadialGradient(-PLAYER_R*0.3,-PLAYER_R*0.35,1,-PLAYER_R*0.1,-PLAYER_R*0.1,PLAYER_R*0.9);
      hl.addColorStop(0,"rgba(255,255,255,0.25)"); hl.addColorStop(1,"rgba(0,0,0,0.2)");
      ctx.fillStyle=hl; ctx.beginPath(); ctx.arc(0,0,PLAYER_R,0,Math.PI*2); ctx.fill();

      // Direction eye
      const spd=Math.hypot(p.vx,p.vy)||0.01;
      const edx=spd>0.3?p.vx/spd:1, edy=spd>0.3?p.vy/spd:0;
      ctx.fillStyle=isFrozen?"#1e40af":p.type==="bot"?"#ef4444":"#ffffff";
      ctx.beginPath(); ctx.arc(edx*9,edy*9,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#000";
      ctx.beginPath(); ctx.arc(edx*9+edx*2,edy*9+edy*2,3.5,0,Math.PI*2); ctx.fill();

      // Frozen X
      if(isFrozen) {
        ctx.fillStyle="#1e40af"; ctx.font="bold 11px system-ui"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("✕",edx*9,edy*9);
      }

      // Dash CD ring
      ctx.strokeStyle=p.dashCd===0?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.25)";
      ctx.lineWidth=2.5;
      if(p.dashCd===0) {
        ctx.beginPath(); ctx.arc(0,0,PLAYER_R+5,0,Math.PI*2); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(0,0,PLAYER_R+5,-Math.PI/2,-Math.PI/2+(1-p.dashCd/DASH_CD)*Math.PI*2); ctx.stroke();
      }

      // Shield bubble
      if(p.effects.shield) {
        ctx.strokeStyle="rgba(96,165,250,0.8)"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(0,0,PLAYER_R+10,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle="rgba(96,165,250,0.12)";
        ctx.beginPath(); ctx.arc(0,0,PLAYER_R+10,0,Math.PI*2); ctx.fill();
      }

      // Bomb indicator
      if(p.effects.bomb) {
        ctx.fillStyle="#ef4444"; ctx.font="14px system-ui"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("💣",0,-PLAYER_R-12);
      }

      // Ring cosmetic
      drawRing(ctx,p,g.frame);

      ctx.restore();

      // Label
      ctx.fillStyle=p.type==="bot"?"#f87171":"#7dd3fc";
      ctx.font=`900 11px "Trebuchet MS",system-ui`; ctx.textAlign="center";
      ctx.shadowBlur=4; ctx.shadowColor="#000";
      const labelY = p.y-(PLAYER_R*sf*fs)-18;
      ctx.fillText(p.label,p.x,labelY);
      ctx.shadowBlur=0;

      // Effect badge
      const hasEff = Object.keys(p.effects).filter(k=>p.effects[k]&&k!=="bomb"&&k!=="sticky")[0];
      if(hasEff) {
        const def=POWERUP_DEFS.find(d=>d.id===hasEff);
        if(def){
          ctx.fillStyle=def.col; ctx.font="10px system-ui"; ctx.textAlign="center";
          ctx.fillText(def.icon,p.x+PLAYER_R*sf*fs+8,p.y-8);
        }
      }
    }

    // Popups
    for(const pp of g.popups){
      const alpha=Math.min(1,pp.life/25);
      ctx.globalAlpha=alpha;
      ctx.fillStyle=pp.col;
      ctx.font=`900 ${pp.big?26:18}px "Trebuchet MS",system-ui`;
      ctx.textAlign="center"; ctx.shadowBlur=8; ctx.shadowColor="#000";
      ctx.fillText(pp.txt,pp.x,pp.y);
      ctx.shadowBlur=0;
    }
    ctx.globalAlpha=1;

    // Round flash
    if(g.roundFlash>0) {
      const fa=Math.min(1,g.roundFlash/30)*(g.roundFlash>40?1:(g.roundFlash/40));
      ctx.fillStyle=`rgba(255,255,255,${fa*0.12})`;
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle=`rgba(234,179,8,${fa})`;
      ctx.font=`900 56px "Trebuchet MS",system-ui`; ctx.textAlign="center";
      ctx.shadowBlur=30; ctx.shadowColor="#eab308";
      ctx.fillText(`ROUND ${g.roundNum}`,W/2,H/2+20);
      ctx.shadowBlur=0;
    }

    // Win overlay
    if(g.winner) {
      ctx.fillStyle="rgba(0,0,0,0.85)";
      ctx.fillRect(0,H/2-110,W,220);
      ctx.fillStyle=g.winner.col;
      ctx.font=`900 68px "Trebuchet MS",system-ui`; ctx.textAlign="center";
      ctx.shadowBlur=40; ctx.shadowColor=g.winner.col;
      ctx.fillText(`${g.winner.label} WINS!`,W/2,H/2+15);
      ctx.shadowBlur=0;
      ctx.fillStyle="#eab308"; ctx.font=`bold 26px system-ui`;
      ctx.fillText("+200 COINS",W/2,H/2+60);
    }

    ctx.restore();
  };

  const drawRing = (ctx,p,f) => {
    switch(p.ringId){
      case"basic":
        ctx.strokeStyle=(p.glow||p.col)+"99"; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.arc(0,0,PLAYER_R+8,0,Math.PI*2); ctx.stroke(); break;
      case"spiky":
        ctx.strokeStyle=p.col; ctx.lineWidth=2;
        for(let i=0;i<8;i++){
          const a=(i/8)*Math.PI*2+f*0.04;
          ctx.beginPath(); ctx.moveTo(Math.cos(a)*(PLAYER_R+4),Math.sin(a)*(PLAYER_R+4));
          ctx.lineTo(Math.cos(a)*(PLAYER_R+12),Math.sin(a)*(PLAYER_R+12)); ctx.stroke();
        } break;
      case"halo":
        ctx.strokeStyle="#fde68a"; ctx.lineWidth=3;
        ctx.shadowBlur=10; ctx.shadowColor="#eab308";
        ctx.beginPath(); ctx.ellipse(0,-PLAYER_R-6,14,5,0,0,Math.PI*2); ctx.stroke();
        ctx.shadowBlur=0; break;
      case"orbit":
        ctx.fillStyle=(p.glow||p.col);
        ctx.shadowBlur=8; ctx.shadowColor=p.col;
        ctx.beginPath(); ctx.arc(Math.cos(p.orbitAngle)*(PLAYER_R+12),Math.sin(p.orbitAngle)*(PLAYER_R+12),5,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0; break;
      case"crown":
        ctx.fillStyle="#eab308";
        for(let i=0;i<5;i++){
          const a=(i/5)*Math.PI*2-Math.PI/2;
          const bx=Math.cos(a)*(PLAYER_R+12), by=Math.sin(a)*(PLAYER_R+12);
          ctx.beginPath(); ctx.arc(bx,by,3.5,0,Math.PI*2); ctx.fill();
        }
        ctx.strokeStyle="#eab308"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(0,0,PLAYER_R+12,0,Math.PI*2); ctx.stroke(); break;
      case"blades":
        ctx.fillStyle=p.col;
        for(let i=0;i<4;i++){
          const a=(i/4)*Math.PI*2+p.orbitAngle*1.5;
          ctx.save(); ctx.translate(Math.cos(a)*(PLAYER_R+14),Math.sin(a)*(PLAYER_R+14));
          ctx.rotate(a+Math.PI/2);
          ctx.beginPath(); ctx.moveTo(0,-8); ctx.lineTo(3,4); ctx.lineTo(-3,4); ctx.closePath(); ctx.fill();
          ctx.restore();
        } break;
      default: break;
    }
  };

  // ── SHOP ACTIONS ─────────────────────────────────────────────
  const buyItem = (type,id,cost) => {
    if(save.coins<cost){notify("Not enough coins! 🪙","#ef4444"); return;}
    const ns={...save,coins:save.coins-cost};
    if(type==="skin")  ns.ownedSkins=[...ns.ownedSkins,id];
    if(type==="trail") ns.ownedTrails=[...ns.ownedTrails,id];
    if(type==="ring")  ns.ownedRings=[...ns.ownedRings,id];
    persist(ns); notify("Unlocked! ✨","#10b981");
  };

  const equipItem = (pid,type,id) => {
    if(type==="skin") {
      for(let op=1;op<=4;op++){
        if(op!==pid&&save.equip[`p${op}`]?.skin===id){
          notify("Skin already used by another player!","#f59e0b"); return;
        }
      }
    }
    const ns={...save,equip:{...save.equip,[`p${pid}`]:{...save.equip[`p${pid}`],[type]:id}}};
    persist(ns);
  };

  // ── RENDER ───────────────────────────────────────────────────
  const currentArena = ARENAS.find(a=>a.id===cfg.arenaId)||ARENAS[0];

  return (
    <div style={{minHeight:"100vh",background:"#030308",color:"#f1f5f9",fontFamily:'"Trebuchet MS",system-ui,sans-serif',display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>

      {/* BG particles */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        {Array.from({length:50}).map((_,i)=>(
          <div key={i} style={{
            position:"absolute",
            left:`${(i*73)%100}%`,top:`${(i*47)%100}%`,
            width:`${i%7===0?2:1}px`,height:`${i%7===0?2:1}px`,
            background:"#fff",borderRadius:"50%",
            opacity:0.15+0.25*Math.abs(Math.sin(menuF*0.015+i*0.8)),
          }}/>
        ))}
      </div>

      {/* Notification */}
      {notif&&<div style={{position:"fixed",top:20,right:20,background:notif.col,color:"#000",padding:"12px 22px",borderRadius:10,fontWeight:900,zIndex:9999,boxShadow:"0 4px 30px rgba(0,0,0,0.5)"}}>{notif.msg}</div>}

      {/* ── MENU ──────────────────────────────────────────────── */}
      {screen==="menu"&&(
        <div style={{zIndex:10,position:"relative",width:820,maxWidth:"98vw"}}>
          {/* Title */}
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:"4.2rem",fontWeight:900,fontStyle:"italic",letterSpacing:"-2px",lineHeight:1}}>
              <span style={{color:"#38bdf8",textShadow:"0 0 40px rgba(56,189,248,0.7)"}}>KNOCKOUT</span>
              <span style={{color:"#f8fafc"}}> ARENA</span>
            </div>
            <div style={{color:"#ef4444",fontWeight:900,fontSize:"1rem",letterSpacing:"6px",marginTop:4,textShadow:"0 0 20px rgba(239,68,68,0.5)"}}>ULTRA</div>
            <div style={{color:"#334155",fontSize:"0.8rem",letterSpacing:"2px",marginTop:6}}>TOP-DOWN KNOCKOUT BRAWLER · UP TO 4 PLAYERS</div>
          </div>

          <div style={{background:"#0a0a14",border:"1px solid #1e1b3a",borderRadius:20,padding:34,boxShadow:"0 20px 80px rgba(0,0,0,0.8)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <Scard label="👤 HUMAN PLAYERS" sub="WASD · Arrows · IJKL · Numpad">
                <Brow items={[1,2,3,4]} val={cfg.humans} col="#38bdf8" set={v=>setCfg({...cfg,humans:v})}/>
              </Scard>
              <Scard label="🤖 AI BOTS" sub="Adaptive difficulty">
                <Brow items={[0,1,2,3,4]} val={cfg.bots} col="#ef4444" set={v=>setCfg({...cfg,bots:v})}/>
              </Scard>
            </div>

            <Scard label="🏆 WIN SCORE" sub="First to reach this wins" style={{marginBottom:14}}>
              <Brow items={[3,5,7,10,15,20]} val={cfg.winScore} col="#eab308" set={v=>setCfg({...cfg,winScore:v})}/>
            </Scard>

            {/* Arena select */}
            <div style={{marginBottom:22}}>
              <div style={{color:"#475569",fontWeight:900,fontSize:"0.75rem",letterSpacing:"2px",marginBottom:10}}>🌍 ARENA SELECT</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {ARENAS.map(a=>(
                  <button key={a.id} onClick={()=>setCfg({...cfg,arenaId:a.id})} style={{
                    background:cfg.arenaId===a.id?"#111827":"#08080f",
                    border:`2px solid ${cfg.arenaId===a.id?a.glowCol:"#1e1b3a"}`,
                    borderRadius:10,padding:"12px 8px",cursor:"pointer",textAlign:"center",
                    color:cfg.arenaId===a.id?a.glowCol:"#475569",
                    boxShadow:cfg.arenaId===a.id?`0 0 20px ${a.glowCol}33`:"none",
                    transition:"all 0.15s",
                  }}>
                    <div style={{fontSize:"1.4rem"}}>{a.emoji}</div>
                    <div style={{fontWeight:900,fontSize:"0.78rem",marginTop:4}}>{a.name}</div>
                    <div style={{fontSize:"0.62rem",color:"#334155",marginTop:3,lineHeight:1.3}}>{a.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:"flex",gap:12}}>
              <button onClick={startMatch} style={mbs("#38bdf8","#000")}>▶ ENTER ARENA</button>
              <button onClick={()=>setScreen("shop")} style={mbs("#0a0a14","#eab308","#eab308")}>
                🛒 SHOP &nbsp;<span style={{background:"#eab308",color:"#000",padding:"2px 8px",borderRadius:6,fontWeight:900}}>🪙{save.coins}</span>
              </button>
              <button onClick={()=>setScreen("stats")} style={mbs("#0a0a14","#a78bfa","#a78bfa")}>📊 RECORDS</button>
            </div>

            {/* Controls legend */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:18}}>
              {[
                {l:"P1",k:"W A S D\n+ SPACE",col:"#38bdf8"},
                {l:"P2",k:"↑↓←→\n+ R.SHIFT",col:"#ef4444"},
                {l:"P3",k:"I J K L\n+ O",col:"#10b981"},
                {l:"P4",k:"8 4 5 6\n+ NUM0",col:"#f59e0b"},
              ].map(c=>(
                <div key={c.l} style={{background:"#08080f",border:`1px solid ${c.col}33`,borderRadius:8,padding:"8px",textAlign:"center"}}>
                  <div style={{color:c.col,fontWeight:900,fontSize:"0.8rem"}}>{c.l}</div>
                  <div style={{color:"#334155",fontSize:"0.68rem",marginTop:3,whiteSpace:"pre-line",lineHeight:1.5}}>{c.k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SHOP ──────────────────────────────────────────────── */}
      {screen==="shop"&&(
        <div style={{zIndex:10,position:"relative",width:980,maxWidth:"98vw"}}>
          <div style={{background:"#0a0a14",border:"1px solid #1e1b3a",borderRadius:20,padding:34,boxShadow:"0 20px 80px rgba(0,0,0,0.8)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <div>
                <div style={{fontSize:"2.4rem",fontWeight:900,fontStyle:"italic"}}>THE ARMORY</div>
                <div style={{color:"#334155",fontSize:"0.75rem",letterSpacing:"2px"}}>UNLOCK COSMETICS · EQUIP PER PLAYER</div>
              </div>
              <div style={{background:"#13131f",padding:"10px 20px",borderRadius:12,fontSize:"1.6rem",fontWeight:900,color:"#eab308"}}>🪙 {save.coins}</div>
            </div>

            {/* Player selector */}
            <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center"}}>
              <span style={{color:"#475569",fontWeight:900,fontSize:"0.75rem",letterSpacing:"1px"}}>EQUIP FOR:</span>
              {[1,2,3,4].map(p=>(
                <button key={p} onClick={()=>setShopPid(p)} style={{
                  background:shopPid===p?`rgba(${p===1?"56,189,248":p===2?"239,68,68":p===3?"16,185,129":"245,158,11"},0.15)`:"#13131f",
                  border:`2px solid ${shopPid===p?(p===1?"#38bdf8":p===2?"#ef4444":p===3?"#10b981":"#f59e0b"):"#1e1b3a"}`,
                  borderRadius:8,padding:"8px 18px",fontWeight:900,cursor:"pointer",
                  color:shopPid===p?(p===1?"#38bdf8":p===2?"#ef4444":p===3?"#10b981":"#f59e0b"):"#475569",
                  fontSize:"0.85rem",
                }}>P{p}</button>
              ))}
            </div>

            {/* Tabs */}
            <div style={{display:"flex",gap:8,marginBottom:18}}>
              {["skins","trails","rings"].map(t=>(
                <button key={t} onClick={()=>setShopTab(t)} style={{
                  background:shopTab===t?"#38bdf8":"#13131f",color:shopTab===t?"#000":"#475569",
                  border:"none",borderRadius:8,padding:"9px 20px",fontWeight:900,cursor:"pointer",
                  textTransform:"uppercase",letterSpacing:"1px",fontSize:"0.8rem",
                }}>{t}</button>
              ))}
            </div>

            {/* Grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,maxHeight:380,overflowY:"auto",paddingRight:4}}>
              {(shopTab==="skins"?SKINS:shopTab==="trails"?TRAILS:RINGS).map(item=>{
                const owned=shopTab==="skins"?save.ownedSkins.includes(item.id):shopTab==="trails"?save.ownedTrails.includes(item.id):save.ownedRings.includes(item.id);
                const typeKey=shopTab==="skins"?"skin":shopTab==="trails"?"trail":"ring";
                const equipped=save.equip[`p${shopPid}`]?.[typeKey]===item.id;
                const canAfford=save.coins>=item.cost;
                return (
                  <div key={item.id} style={{
                    background:equipped?"#111827":"#0d0d1a",
                    border:`2px solid ${equipped?"#38bdf8":owned?"#1e1b3a":item.hex||"#1e1b3a"}`,
                    borderRadius:12,padding:"14px 10px",textAlign:"center",
                    boxShadow:equipped?"0 0 14px rgba(56,189,248,0.2)":"none",
                    position:"relative",transition:"all 0.1s",
                  }}>
                    {/* Preview */}
                    {shopTab==="skins"&&item.hex&&(
                      <div style={{width:32,height:32,background:item.hex,borderRadius:"50%",margin:"0 auto 8px",boxShadow:item.glow?`0 0 14px ${item.glow}`:undefined,border:item.animated?"2px solid #fff":undefined}}/>
                    )}
                    {shopTab==="trails"&&(
                      <div style={{fontSize:"1.4rem",margin:"0 auto 8px"}}>
                        {item.id==="none"?"💨":item.id==="dust"?"🌫️":item.id==="fire"?"🔥":item.id==="ice"?"❄️":item.id==="electric"?"⚡":item.id==="rainbow"?"🌈":item.id==="shadow"?"🌑":item.id==="sparkle"?"✨":item.id==="vortex"?"🌀":"☄️"}
                      </div>
                    )}
                    {shopTab==="rings"&&(
                      <div style={{fontSize:"1.4rem",margin:"0 auto 8px"}}>
                        {item.id==="none"?"⭕":item.id==="basic"?"🔵":item.id==="spiky"?"⭐":item.id==="halo"?"😇":item.id==="orbit"?"🪐":item.id==="crown"?"👑":"⚔️"}
                      </div>
                    )}
                    <div style={{fontWeight:900,fontSize:"0.72rem",color:owned?"#e2e8f0":"#475569",marginBottom:8,lineHeight:1.3}}>{item.name}</div>
                    {!owned?(
                      <button onClick={()=>buyItem(typeKey,item.id,item.cost)} disabled={!canAfford} style={{width:"100%",padding:"6px 4px",background:canAfford?"#eab308":"#1e1b3a",color:canAfford?"#000":"#475569",border:"none",borderRadius:6,fontWeight:900,cursor:canAfford?"pointer":"not-allowed",fontSize:"0.72rem"}}>
                        {item.cost===0?"FREE":"🪙 "+item.cost}
                      </button>
                    ):(
                      <button onClick={()=>equipItem(shopPid,typeKey,item.id)} style={{width:"100%",padding:"6px 4px",background:equipped?"#38bdf8":"#1e1b3a",color:equipped?"#000":"#38bdf8",border:`1px solid ${equipped?"#38bdf8":"#1e1b3a"}`,borderRadius:6,fontWeight:900,cursor:"pointer",fontSize:"0.72rem"}}>
                        {equipped?"✓ EQUIPPED":"EQUIP"}
                      </button>
                    )}
                    {equipped&&<div style={{position:"absolute",top:5,right:5,background:"#38bdf8",color:"#000",borderRadius:4,fontSize:"0.58rem",padding:"1px 5px",fontWeight:900}}>EQ</div>}
                    {item.animated&&owned&&<div style={{position:"absolute",top:5,left:5,background:"#8b5cf6",color:"#fff",borderRadius:4,fontSize:"0.55rem",padding:"1px 4px",fontWeight:900}}>✦</div>}
                  </div>
                );
              })}
            </div>

            <button onClick={()=>setScreen("menu")} style={{...mbs("#13131f","#94a3b8","#1e1b3a"),marginTop:18,flex:"none",width:160}}>← BACK</button>
          </div>
        </div>
      )}

      {/* ── STATS ─────────────────────────────────────────────── */}
      {screen==="stats"&&(
        <div style={{zIndex:10,position:"relative",width:520}}>
          <div style={{background:"#0a0a14",border:"1px solid #1e1b3a",borderRadius:20,padding:38,boxShadow:"0 20px 80px rgba(0,0,0,0.8)"}}>
            <div style={{fontSize:"2.3rem",fontWeight:900,marginBottom:24,fontStyle:"italic"}}>📊 HALL OF RECORDS</div>
            {[
              {l:"Total Knockouts",v:save.stats.kills,      col:"#ef4444",i:"💀"},
              {l:"Matches Won",    v:save.stats.wins,       col:"#eab308",i:"🏆"},
              {l:"Matches Played", v:save.stats.matches,    col:"#38bdf8",i:"🎮"},
              {l:"Coins Earned",   v:save.stats.coins_earned,col:"#eab308",i:"🪙"},
              {l:"Current Coins",  v:save.coins,             col:"#fbbf24",i:"💰"},
              {l:"Items Owned",    v:save.ownedSkins.length+save.ownedTrails.length+save.ownedRings.length,col:"#a78bfa",i:"🛒"},
            ].map(s=>(
              <div key={s.l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0d0d1a",borderRadius:10,padding:"14px 18px",marginBottom:10,border:`1px solid ${s.col}22`}}>
                <div style={{color:"#94a3b8",fontWeight:700,fontSize:"0.9rem"}}>{s.i} {s.l}</div>
                <div style={{color:s.col,fontWeight:900,fontSize:"1.4rem"}}>{s.v.toLocaleString()}</div>
              </div>
            ))}
            <button onClick={()=>setScreen("menu")} style={{...mbs("#13131f","#94a3b8","#1e1b3a"),marginTop:6,flex:"none",width:"100%"}}>← BACK</button>
          </div>
        </div>
      )}

      {/* ── PLAYING ───────────────────────────────────────────── */}
      <div style={{display:screen==="playing"?"flex":"none",flexDirection:"column",zIndex:10,position:"relative"}}>
        {/* HUD */}
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          {uiSnap.players.map(p=>{
            const pct=Math.min(1,p.score/cfg.winScore);
            const isDead=p.state==="dead";
            return (
              <div key={p.pid} style={{flex:1,background:"#0a0a14",borderRadius:10,padding:"10px 14px",border:`2px solid ${isDead?"#1e1b3a":p.col}33`,opacity:isDead?0.3:1,transition:"opacity 0.3s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:900,color:p.type==="bot"?"#f87171":"#e2e8f0",fontSize:"0.85rem"}}>{p.label}</div>
                  <div style={{fontSize:"1.7rem",fontWeight:900,color:isDead?"#334155":p.col}}>{p.score}</div>
                </div>
                <div style={{height:3,background:"#1e1b3a",borderRadius:99,marginTop:6,overflow:"hidden"}}>
                  <div style={{width:`${pct*100}%`,height:"100%",background:p.col,borderRadius:99,transition:"width 0.3s",boxShadow:`0 0 6px ${p.col}`}}/>
                </div>
                {/* Effect icons */}
                <div style={{display:"flex",gap:3,marginTop:5,flexWrap:"wrap",minHeight:14}}>
                  {Object.keys(p.effects||{}).map(eff=>{
                    const def=POWERUP_DEFS.find(d=>d.id===eff);
                    return def?(
                      <span key={eff} style={{fontSize:"10px",background:`${def.col}33`,color:def.col,padding:"1px 4px",borderRadius:4,fontWeight:900}}>{def.icon}</span>
                    ):null;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <canvas ref={canvasRef} width={W} height={H} style={{borderRadius:14,boxShadow:"0 0 80px rgba(0,0,0,0.95)"}}/>

        <div style={{display:"flex",justifyContent:"space-between",marginTop:10,color:"#1e293b",fontSize:"0.72rem",fontWeight:700}}>
          <span>FIRST TO {cfg.winScore} KNOCKOUTS</span>
          <span style={{color:currentArena.glowCol+"99"}}>{currentArena.emoji} {currentArena.name.toUpperCase()}</span>
          <span>DASH=BURST · FALL=OUT · STOMP OTHERS OFF!</span>
        </div>
      </div>

      {/* ── GAME OVER ─────────────────────────────────────────── */}
      {screen==="gameover"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"0.9rem",letterSpacing:"6px",color:"#334155",fontWeight:900,marginBottom:6}}>MATCH COMPLETE</div>
            <div style={{fontSize:"5.5rem",fontWeight:900,fontStyle:"italic",lineHeight:1,color:uiSnap.players.find(p=>p.score>=cfg.winScore)?.col||"#38bdf8",textShadow:`0 0 50px ${uiSnap.players.find(p=>p.score>=cfg.winScore)?.col||"#38bdf8"}`}}>
              CHAMPION
            </div>
            <div style={{fontSize:"2rem",fontWeight:900,color:"#f1f5f9",marginTop:8}}>
              {uiSnap.players.find(p=>p.score>=cfg.winScore)?.label||"?"} wins the match!
            </div>
            <div style={{color:"#eab308",fontSize:"1.1rem",marginBottom:36}}>+200 COINS AWARDED</div>

            {/* Scoreboard */}
            <div style={{display:"flex",gap:12,marginBottom:40,justifyContent:"center"}}>
              {[...uiSnap.players].sort((a,b)=>b.score-a.score).map((p,i)=>(
                <div key={p.pid} style={{background:"#0a0a14",border:`2px solid ${p.col}`,borderRadius:12,padding:"16px 20px",textAlign:"center",minWidth:110}}>
                  {i===0&&<div style={{fontSize:"1.2rem",marginBottom:2}}>🏆</div>}
                  <div style={{color:p.col,fontWeight:900,fontSize:"1rem"}}>{p.label}</div>
                  <div style={{fontSize:"2.2rem",fontWeight:900,color:p.col}}>{p.score}</div>
                  <div style={{color:"#334155",fontSize:"0.7rem"}}>KOs</div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:14,justifyContent:"center"}}>
              <button onClick={startMatch} style={mbs("#38bdf8","#000")}>▶ REMATCH</button>
              <button onClick={()=>setScreen("menu")} style={mbs("#0a0a14","#94a3b8","#1e1b3a")}>⬅ MENU</button>
              <button onClick={()=>setScreen("shop")} style={mbs("#0a0a14","#eab308","#eab308")}>🛒 SHOP</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── UI HELPERS ────────────────────────────────────────────────
function Scard({label,sub,children,style={}}) {
  return (
    <div style={{background:"#0d0d1a",padding:"16px 18px",borderRadius:12,border:"1px solid #1e1b3a",...style}}>
      <div style={{fontWeight:900,color:"#475569",fontSize:"0.72rem",letterSpacing:"2px"}}>{label}</div>
      {sub&&<div style={{color:"#1e293b",fontSize:"0.62rem",letterSpacing:"1px",marginBottom:2}}>{sub}</div>}
      <div style={{marginTop:10}}>{children}</div>
    </div>
  );
}

function Brow({items,val,col,set}) {
  return (
    <div style={{display:"flex",gap:7}}>
      {items.map(v=>(
        <button key={v} onClick={()=>set(v)} style={{
          flex:1,padding:"10px 0",border:"none",borderRadius:8,fontWeight:900,cursor:"pointer",fontSize:"0.95rem",
          background:val===v?col:"#13131f",color:val===v?"#000":"#334155",
          boxShadow:val===v?`0 0 12px ${col}55`:"none",transition:"all 0.1s",
        }}>{v}</button>
      ))}
    </div>
  );
}

const mbs=(bg,col,border)=>({
  flex:1,padding:"15px 22px",border:border?`2px solid ${border}`:"none",
  borderRadius:11,fontSize:"0.95rem",fontWeight:900,cursor:"pointer",
  background:bg,color:col,transition:"all 0.15s",letterSpacing:"0.5px",
  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
  boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
});