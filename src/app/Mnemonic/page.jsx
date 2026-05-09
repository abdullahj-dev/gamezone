'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================================
// ── AUDIO ENGINE ─────────────────────────────────────────────────────────────
// ============================================================================
let audioCtx = null;
const initAudio = () => {
  if (typeof window === "undefined") return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
};
const playSound = (type) => {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const configs = {
    flip:  () => { osc.type="sine";     osc.frequency.setValueAtTime(400,t); osc.frequency.exponentialRampToValueAtTime(800,t+0.08); gain.gain.setValueAtTime(0.12,t); gain.gain.exponentialRampToValueAtTime(0.001,t+0.1); osc.start(t); osc.stop(t+0.1); },
    match: () => { osc.type="triangle"; [440,554,880].forEach((f,i)=>osc.frequency.setValueAtTime(f,t+i*0.1)); gain.gain.setValueAtTime(0.18,t); gain.gain.linearRampToValueAtTime(0,t+0.4); osc.start(t); osc.stop(t+0.4); },
    miss:  () => { osc.type="sawtooth"; osc.frequency.setValueAtTime(150,t); osc.frequency.linearRampToValueAtTime(60,t+0.3); gain.gain.setValueAtTime(0.18,t); gain.gain.linearRampToValueAtTime(0,t+0.35); osc.start(t); osc.stop(t+0.35); },
    win:   () => { osc.type="square";   [440,554,659,880,1108].forEach((f,i)=>osc.frequency.setValueAtTime(f,t+i*0.09)); gain.gain.setValueAtTime(0.12,t); gain.gain.linearRampToValueAtTime(0,t+0.6); osc.start(t); osc.stop(t+0.6); },
    lose:  () => { osc.type="sawtooth"; osc.frequency.setValueAtTime(300,t); osc.frequency.exponentialRampToValueAtTime(50,t+0.8); gain.gain.setValueAtTime(0.18,t); gain.gain.linearRampToValueAtTime(0,t+0.85); osc.start(t); osc.stop(t+0.85); },
    click: () => { osc.type="sine";     osc.frequency.setValueAtTime(600,t); gain.gain.setValueAtTime(0.08,t); gain.gain.exponentialRampToValueAtTime(0.001,t+0.05); osc.start(t); osc.stop(t+0.05); },
  };
  if (configs[type]) configs[type]();
};

// ============================================================================
// ── SHOP DATA ────────────────────────────────────────────────────────────────
// ============================================================================
const SHOP = {
  decks: {
    classic:    { name:"Primitives",    preview:"🔥⭐🍀💎",  items:["🔥","⭐","🍀","💎","👻","🚀","🌈","🪐","🍒","⚡","🧊","🎯","🎈","🎨","🎲","🎸","💡","💣"],      cost:0,     rarity:"FREE",    desc:"Standard starter deck" },
    animals:    { name:"Wildlife",      preview:"🦊🐼🦁🐸",  items:["🦊","🐼","🐸","🦁","🐷","🐨","🐵","🦉","🦄","🐺","🐙","🐢","🦋","🦖","🦚","🐅","🐘","🐊"],      cost:150,   rarity:"COMMON",  desc:"Animals of the world" },
    food:       { name:"Snacks",        preview:"🍔🍕🌮🍣",  items:["🍔","🍕","🍟","🌭","🍿","🥓","🥞","🧇","🥩","🍗","🌮","🥪","🍱","🍣","🍦","🍩","🍰","🍫"],      cost:300,   rarity:"COMMON",  desc:"Street food world tour" },
    space:      { name:"Cosmos",        preview:"🌍🪐🌠💫",  items:["🌍","🪐","🌠","💫","🌌","☄️","🌙","⭐","🌞","🪨","🛸","🔭","🌀","💥","🌊","🏔️","⛰️","🗻"],       cost:500,   rarity:"UNCOMMON",desc:"Deep space exploration" },
    cyber:      { name:"Cyber-Rig",     preview:"🕹️💾📡🤖",  items:["🕹️","💾","📡","🔋","🔌","💻","📟","🖱️","🤖","🦾","🦿","👓","🧬","🧪","🔬","🛰️","📱","🖥️"],      cost:600,   rarity:"UNCOMMON",desc:"Digital underground" },
    ocean:      { name:"Deep Ocean",    preview:"🐬🦈🐙🦑",  items:["🐬","🦈","🐙","🦑","🐡","🐠","🦐","🦞","🦀","🐚","🌊","⚓","🏴‍☠️","🐋","🦭","🐟","🦪","🐊"],       cost:800,   rarity:"UNCOMMON",desc:"Creatures of the deep" },
    flags:      { name:"Nations",       preview:"🇺🇸🇯🇵🇩🇪🇧🇷", items:["🇺🇸","🇬🇧","🇯🇵","🇨🇦","🇩🇪","🇫🇷","🇧🇷","🇮🇳","🇦🇺","🇮🇹","🇲🇽","🇰🇷","🇪🇸","🇿🇦","🇨🇳","🇷🇺","🇸🇪","🇳🇴"], cost:1200,  rarity:"RARE",    desc:"Flags of all nations" },
    sports:     { name:"Athletics",     preview:"⚽🏀🎾⛳",  items:["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🥋","⛳","⛸️","🎿","🏂","🏋️","🚴"],       cost:1500,  rarity:"RARE",    desc:"Sports from around the globe" },
    nature:     { name:"Botany",        preview:"🌲🌸🌻🍄",  items:["🌲","🌳","🌴","🌵","🌷","🌸","🌹","🌺","🌻","🌼","🍄","🍁","🍂","🍃","🌾","🌿","🍀","🪴"],      cost:2000,  rarity:"RARE",    desc:"Flora of the wild" },
    weather:    { name:"Meteorology",   preview:"⛈️🌈☀️❄️",  items:["⛈️","🌈","☀️","❄️","🌪️","⚡","🌧️","🌫️","🌊","🌋","🏔️","🌅","🌄","🌃","🌆","🌇","🔥","💧"],     cost:2500,  rarity:"EPIC",    desc:"Forces of nature" },
    music:      { name:"Symphony",      preview:"🎸🎹🎺🥁",  items:["🎸","🎹","🎺","🎻","🥁","🎷","🎤","🎧","📻","🎼","🎵","🎶","🪕","🪘","🪗","🎙️","🎚️","🎛️"],      cost:3000,  rarity:"EPIC",    desc:"The universal language" },
    void:       { name:"Void Runes",    preview:"⚗️⚛☯✡",   items:["⚗️","⚛️","☯️","✡️","☪️","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","⛎"],               cost:3500,  rarity:"EPIC",    desc:"Ancient symbol system" },
    apex:       { name:"Entities",      preview:"🐉👾🧞🧛",  items:["🐉","👾","👽","🧞","🧛","🧟","🧝","🧚","🧜","🧙","🧌","🥷","🦸","🦹","🧑‍🚀","🕵️","💂","🤴"],     cost:5000,  rarity:"LEGENDARY",desc:"Mythical beings of lore" },
    armory:     { name:"War Armory",    preview:"⚔️🛡️🏹💣",  items:["⚔️","🗡️","🔫","🏹","🛡️","💣","🧨","🪓","🪃","🧿","🔮","🪄","🧲","🪖","⛓️","🗺️","🔐","🗝️"],    cost:8000,  rarity:"LEGENDARY",desc:"Arsenal of war" },
    mythology:  { name:"Gods",          preview:"🏛️⚡🔱🦅",  items:["🏛️","⚡","🔱","🦉","🕊️","🐍","🔥","🦅","🐎","⚔️","🛡️","🍷","☀️","🌙","⭐","👑","👁️","⚖️"],    cost:12000, rarity:"LEGENDARY",desc:"Pantheon of ancient gods" },
    gluttony:   { name:"Feast",         preview:"🍩🍰🍷🥂",  items:["🍩","🍰","🎂","🍪","🍮","🍯","🍷","🍸","🍹","🍺","🥂","🥃","🧊","🍾","🧉","🍼","☕","🍵"],      cost:16000, rarity:"MYTHIC",  desc:"Banquet of excess" },
    cosmos:     { name:"Singularity",   preview:"🌌💫✨🔮",  items:["🌌","💫","✨","🔮","🌀","💠","🔵","🟣","⚫","🟤","🔶","🔷","🔸","🔹","🔺","🔻","💎","🌟"],       cost:25000, rarity:"MYTHIC",  desc:"The fabric of reality" },
    glitch:     { name:"GLITCH",        preview:"⬛⬜🟥🟦",  items:["⬛","⬜","🟥","🟦","🟩","🟨","🟧","🟪","🔲","🔳","▪️","▫️","◾","◽","◼️","◻️","🔲","⏹️"],         cost:50000, rarity:"DIVINE",  desc:"Reality is broken" },
  },
  backs: {
    default:  { name:"Standard",     symbol:"?",    cost:0,     rarity:"FREE",     desc:"Classic question mark" },
    grid:     { name:"Data Grid",    symbol:"▦",    cost:200,   rarity:"COMMON",   desc:"Neural network grid" },
    hex:      { name:"Hexagon",      symbol:"⬡",    cost:500,   rarity:"UNCOMMON", desc:"Honeycomb structure" },
    diamond:  { name:"Diamond",      symbol:"◇",    cost:800,   rarity:"UNCOMMON", desc:"Faceted gemstone" },
    circuit:  { name:"Circuitry",    symbol:"⎛",    cost:1200,  rarity:"RARE",     desc:"PCB trace pattern" },
    spiral:   { name:"Vortex",       symbol:"〄",    cost:2000,  rarity:"RARE",     desc:"Infinite spiral" },
    runes:    { name:"Ancient Rune", symbol:"ᚱ",    cost:3000,  rarity:"EPIC",     desc:"Elder futhark" },
    ankh:     { name:"Ankh",         symbol:"☥",    cost:4500,  rarity:"EPIC",     desc:"Egyptian key of life" },
    eye:      { name:"All-Seeing",   symbol:"👁",    cost:7000,  rarity:"LEGENDARY",desc:"The omniscient eye" },
    infinity: { name:"Infinity",     symbol:"∞",    cost:10000, rarity:"LEGENDARY",desc:"Endless loop" },
    skull:    { name:"Death Mark",   symbol:"☠",    cost:15000, rarity:"MYTHIC",   desc:"Mortality sigil" },
    crown:    { name:"King's Crown", symbol:"♔",    cost:25000, rarity:"DIVINE",   desc:"Sovereign emblem" },
  },
  auras: {
    cyan:     { name:"Neon Cyan",      color:"#00e5ff", cost:0,     rarity:"FREE",     desc:"Electric blue surge" },
    purple:   { name:"Plasma Purple",  color:"#b300ff", cost:300,   rarity:"COMMON",   desc:"Dark matter pulse" },
    green:    { name:"Matrix Green",   color:"#00ff44", cost:800,   rarity:"UNCOMMON", desc:"Terminal interface" },
    pink:     { name:"Synth Pink",     color:"#ff00aa", cost:1500,  rarity:"RARE",     desc:"Neon retro dream" },
    orange:   { name:"Inferno",        color:"#ff6600", cost:2500,  rarity:"RARE",     desc:"Volcanic fire" },
    gold:     { name:"Royal Gold",     color:"#ffd700", cost:4000,  rarity:"EPIC",     desc:"Gilded sovereign" },
    crimson:  { name:"Blood Moon",     color:"#ff1144", cost:7000,  rarity:"LEGENDARY",desc:"Lunar apocalypse" },
    teal:     { name:"Deep Sea",       color:"#00ffcc", cost:10000, rarity:"LEGENDARY",desc:"Bioluminescent tide" },
    hacker:   { name:"Terminal Hack",  color:"#22ffaa", cost:15000, rarity:"MYTHIC",   desc:"Root access granted" },
    silver:   { name:"Chrome",         color:"#c0c0c0", cost:20000, rarity:"MYTHIC",   desc:"Liquid metal" },
    rainbow:  { name:"Prismatic",      color:"#ff00ff", cost:35000, rarity:"DIVINE",   desc:"Full spectrum dominance" },
    abyss:    { name:"Void",           color:"#4400ff", cost:50000, rarity:"DIVINE",   desc:"The end of all light" },
  },
  titles: {
    rookie:   { name:"ROOKIE",         display:"🎮 Rookie",          cost:0,     rarity:"FREE",     desc:"Just started out" },
    hunter:   { name:"CARD HUNTER",    display:"🎴 Card Hunter",     cost:500,   rarity:"COMMON",   desc:"Decent memory skills" },
    hacker:   { name:"MEMORY HACKER",  display:"💾 Memory Hacker",   cost:2000,  rarity:"UNCOMMON", desc:"Breaking the system" },
    phantom:  { name:"PHANTOM",        display:"👻 Phantom",         cost:5000,  rarity:"RARE",     desc:"Unseen and unstoppable" },
    spectre:  { name:"SPECTRE",        display:"💀 Spectre",         cost:12000, rarity:"EPIC",     desc:"You don't exist" },
    overlord: { name:"OVERLORD",       display:"👑 Overlord",        cost:30000, rarity:"LEGENDARY",desc:"Ruler of all cards" },
    god:      { name:"GOD",            display:"⚡ God",             cost:100000,rarity:"DIVINE",   desc:"Transcended humanity" },
  },
  trails: {
    none:     { name:"None",           symbol:"",   cost:0,     rarity:"FREE",     desc:"Clean cursor" },
    sparks:   { name:"Sparks",         symbol:"✦",  cost:1000,  rarity:"COMMON",   desc:"Electric sparks" },
    stars:    { name:"Stars",          symbol:"★",  cost:3000,  rarity:"RARE",     desc:"Shooting stars" },
    skulls:   { name:"Skulls",         symbol:"💀", cost:8000,  rarity:"EPIC",     desc:"Trail of death" },
    crowns:   { name:"Crowns",         symbol:"♔",  cost:20000, rarity:"LEGENDARY",desc:"Royal procession" },
    void:     { name:"Void",           symbol:"●",  cost:50000, rarity:"DIVINE",   desc:"Collapsed singularity" },
  },
  xp_boosts: {
    boost_1_5x: { name:"1.5x XP Boost", multiplier:1.5, cost:500,   rarity:"COMMON",   desc:"50% more credits for 5 games",   uses:5 },
    boost_2x:   { name:"2x XP Boost",   multiplier:2.0, cost:1500,  rarity:"RARE",     desc:"Double credits for 3 games",     uses:3 },
    boost_3x:   { name:"3x XP Boost",   multiplier:3.0, cost:5000,  rarity:"LEGENDARY",desc:"Triple credits for 2 games",     uses:2 },
  }
};

const RARITY_COLORS = {
  FREE:"#888", COMMON:"#aaa", UNCOMMON:"#00cc44", RARE:"#0099ff", EPIC:"#bb44ff", LEGENDARY:"#ff9900", MYTHIC:"#ff4488", DIVINE:"#ffd700"
};

const DIFFICULTY = {
  easy:   { name:"EASY",      pairs:6,  time:35,  mult:1.0, label:"12 cards", color:"#00ff44" },
  medium: { name:"NORMAL",    pairs:8,  time:50,  mult:1.5, label:"16 cards", color:"#00e5ff" },
  hard:   { name:"EXPERT",    pairs:12, time:70,  mult:2.5, label:"24 cards", color:"#ff9900" },
  apex:   { name:"APEX",      pairs:15, time:90,  mult:4.0, label:"30 cards", color:"#ff4488" },
  god:    { name:"GOD TIER",  pairs:18, time:110, mult:7.0, label:"36 cards", color:"#ffd700" },
};

const STORAGE_KEY = "NEON_OVERDRIVE_V5";

const DEFAULT_SAVE = {
  credits: 0,
  unlockedDecks: ["classic"],       activeDeck: "classic",
  unlockedBacks: ["default"],       activeBack: "default",
  unlockedAuras: ["cyan"],          activeAura: "cyan",
  unlockedTitles: ["rookie"],       activeTitle: "rookie",
  unlockedTrails: ["none"],         activeTrail: "none",
  activeBoost: null,
  boostGamesLeft: 0,
  stats: { matchesWon:0, matchesLost:0, highestCombo:0, totalCreditsEarned:0, totalGamesPlayed:0 }
};

// ============================================================================
// ── BOT AI ───────────────────────────────────────────────────────────────────
// ============================================================================
const createBot = (difficulty) => {
  const memory = {}; // cardIdx -> item
  const seen = {};
  const remember = (idx, item) => { memory[idx] = item; seen[idx] = true; };
  const findMatch = (excludeIdx) => {
    const entries = Object.entries(memory);
    for (let [i, item] of entries) {
      if (parseInt(i) === excludeIdx) continue;
      const partner = entries.find(([j, it]) => parseInt(j) !== parseInt(i) && parseInt(j) !== excludeIdx && it === item);
      if (partner) return [parseInt(i), parseInt(partner[0])];
    }
    return null;
  };
  const skillChance = { easy:0.3, medium:0.55, hard:0.8, apex:0.95, god:1.0 }[difficulty] || 0.5;
  return { remember, findMatch, skillChance, memory };
};

// ============================================================================
// ── CSS ──────────────────────────────────────────────────────────────────────
// ============================================================================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;800;900&family=Share+Tech+Mono&display=swap');

*{box-sizing:border-box;user-select:none;-webkit-tap-highlight-color:transparent;}
:root{--c:#00e5ff;--cd:rgba(0,229,255,0.15);--bg:#04040a;--glass:rgba(8,8,18,0.7);}
html,body{margin:0;padding:0;height:100%;background:var(--bg);}

.gw{
  width:100vw;min-height:100vh;background:radial-gradient(ellipse 120% 80% at 50% 0%,#0d1a2a 0%,var(--bg) 65%);
  color:#fff;font-family:'Exo 2',sans-serif;
  display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
  overflow-x:hidden;padding:12px 12px 40px;position:relative;
}
.mono{font-family:'Share Tech Mono',monospace;}

.scanlines{
  position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px);
  animation:scanMove 8s linear infinite;opacity:0.4;
}
@keyframes scanMove{0%{background-position:0 0}100%{background-position:0 80px}}

.grid-bg{
  position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;
  background-image:linear-gradient(var(--cd) 1px,transparent 1px),linear-gradient(90deg,var(--cd) 1px,transparent 1px);
  background-size:50px 50px;opacity:0.25;
}

.layer{z-index:2;width:100%;display:flex;flex-direction:column;align-items:center;}

.glass{
  background:var(--glass);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid var(--cd);border-radius:16px;
  box-shadow:0 8px 40px rgba(0,0,0,0.6),inset 0 0 30px var(--cd);
}
.glass-sm{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;}

/* BUTTONS */
.btn{
  padding:13px 22px;background:rgba(0,0,0,0.5);border:2px solid var(--c);
  color:var(--c);cursor:pointer;font-weight:800;letter-spacing:2px;
  border-radius:12px;transition:all 0.18s;text-transform:uppercase;
  position:relative;overflow:hidden;font-family:'Exo 2',sans-serif;font-size:14px;
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
}
.btn::after{content:'';position:absolute;inset:0;background:var(--c);opacity:0;transition:opacity 0.18s;}
.btn:hover:not(:disabled){background:var(--c);color:#000;box-shadow:0 0 30px var(--c),0 0 60px rgba(0,0,0,0.5);transform:translateY(-2px);}
.btn:active:not(:disabled){transform:translateY(1px);box-shadow:none;}
.btn:disabled{border-color:#2a2a3a;color:#44445a;cursor:not-allowed;background:rgba(0,0,0,0.2);}
.btn-sm{padding:8px 14px;font-size:12px;border-radius:8px;}
.btn-ghost{border-color:#333;color:#666;}
.btn-ghost:hover:not(:disabled){background:#333;color:#aaa;box-shadow:none;}
.btn-danger{border-color:#ff3366;color:#ff3366;}
.btn-danger:hover:not(:disabled){background:#ff3366;color:#fff;box-shadow:0 0 25px #ff3366;}
.btn-gold{border-color:#ffd700;color:#ffd700;}
.btn-gold:hover:not(:disabled){background:#ffd700;color:#000;box-shadow:0 0 25px #ffd700;}

/* NAV */
.nav{
  display:flex;justify-content:space-between;align-items:center;
  width:100%;max-width:960px;padding:12px 20px;margin-bottom:16px;
}
.credits-badge{
  display:flex;align-items:center;gap:8px;padding:8px 16px;
  background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);
  border-radius:20px;font-size:18px;font-weight:800;color:#ffd700;
}
.title-badge{
  font-size:12px;color:#888;font-weight:600;letter-spacing:1px;
  padding:4px 10px;border:1px solid #222;border-radius:10px;
}

/* MENU */
.menu-title{
  font-size:clamp(52px,13vw,90px);font-weight:900;letter-spacing:-2px;
  background:linear-gradient(135deg,var(--c),#7700ff);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  text-shadow:none;line-height:1;margin:0 0 4px;
  animation:titlePulse 3s ease-in-out infinite;
}
@keyframes titlePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.3)}}
.sub{font-size:13px;letter-spacing:6px;color:#666;margin:0 0 30px;font-weight:300;}

.diff-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:480px;}
.diff-btn{
  padding:16px;background:rgba(0,0,0,0.4);border:2px solid transparent;
  border-radius:14px;cursor:pointer;transition:all 0.2s;text-align:center;
  font-family:'Exo 2',sans-serif;
}
.diff-btn:hover{transform:translateY(-3px);box-shadow:0 8px 25px rgba(0,0,0,0.4);}
.diff-btn:active{transform:translateY(0);}
.diff-name{font-size:16px;font-weight:800;letter-spacing:2px;margin-bottom:4px;}
.diff-label{font-size:12px;color:#888;font-family:'Share Tech Mono',monospace;}

.mode-tabs{display:flex;gap:8px;margin-bottom:24px;}
.mode-tab{
  padding:10px 20px;border-radius:20px;border:1px solid #333;background:rgba(0,0,0,0.4);
  color:#666;cursor:pointer;transition:all 0.2s;font-weight:700;font-size:14px;letter-spacing:1px;
}
.mode-tab.active{background:var(--c);color:#000;border-color:var(--c);box-shadow:0 0 20px rgba(0,229,255,0.4);}

/* SHOP */
.shop-layout{width:100%;max-width:960px;display:flex;flex-direction:column;gap:0;}
.shop-tabs{display:flex;overflow-x:auto;border-bottom:1px solid #111;gap:0;scrollbar-width:none;}
.shop-tabs::-webkit-scrollbar{display:none;}
.shop-tab-btn{
  flex-shrink:0;padding:14px 20px;border:none;background:transparent;color:#555;
  cursor:pointer;transition:all 0.2s;font-weight:700;font-size:13px;letter-spacing:1px;
  border-bottom:3px solid transparent;font-family:'Exo 2',sans-serif;
}
.shop-tab-btn.active{color:var(--c);border-bottom-color:var(--c);}
.shop-tab-btn:hover:not(.active){color:#888;}

.shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:16px;}
.shop-item{
  padding:16px;border-radius:14px;cursor:pointer;transition:all 0.2s;position:relative;
  border:2px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.4);
}
.shop-item:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.15);}
.shop-item.owned{border-color:rgba(0,229,255,0.3);background:rgba(0,229,255,0.05);}
.shop-item.equipped{border-color:var(--c);background:rgba(0,229,255,0.1);box-shadow:0 0 20px rgba(0,229,255,0.2);}
.item-rarity{font-size:10px;font-weight:700;letter-spacing:2px;margin-bottom:6px;font-family:'Share Tech Mono';}
.item-name{font-size:16px;font-weight:800;margin-bottom:4px;}
.item-desc{font-size:12px;color:#888;margin-bottom:10px;line-height:1.4;}
.item-preview{font-size:22px;margin-bottom:8px;letter-spacing:2px;}
.item-cost{font-size:13px;font-weight:700;}
.item-badge{
  position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:6px;
  font-size:10px;font-weight:800;letter-spacing:1px;background:var(--c);color:#000;
}

/* GAME */
.hud{width:100%;max-width:960px;padding:16px 20px;margin-bottom:12px;}
.hud-row{display:flex;justify-content:space-between;align-items:center;gap:12px;}
.stat-block{text-align:center;}
.stat-label{font-size:11px;color:#555;font-family:'Share Tech Mono';letter-spacing:1px;margin-bottom:2px;}
.stat-value{font-size:28px;font-weight:800;line-height:1;}

.timer-track{width:100%;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;margin-top:12px;overflow:hidden;}
.timer-fill{height:100%;background:var(--c);border-radius:4px;transition:width 0.9s linear;box-shadow:0 0 8px var(--c);}

.board{
  display:grid;gap:clamp(6px,1.2vw,12px);width:100%;max-width:960px;
  padding:0 4px;
}

.card-wrap{aspect-ratio:1;perspective:1000px;cursor:pointer;transition:transform 0.15s;}
.card-wrap:hover:not(.locked){transform:scale(1.06) translateY(-4px);}
.card-wrap:active:not(.locked){transform:scale(0.94);}
.card-inner{width:100%;height:100%;transition:transform 0.45s cubic-bezier(0.34,1.4,0.64,1);transform-style:preserve-3d;}
.card-wrap.flipped .card-inner,.card-wrap.matched .card-inner{transform:rotateY(180deg);}
.card-wrap.error .card-inner{animation:shake 0.4s both;}
.card-wrap.matched .card-inner{animation:matchPop 0.5s ease-out;}
@keyframes matchPop{0%{transform:rotateY(180deg) scale(1)}50%{transform:rotateY(180deg) scale(1.18)}100%{transform:rotateY(180deg) scale(1)}}
@keyframes shake{10%,90%{transform:translate3d(-2px,0,0)}20%,80%{transform:translate3d(3px,0,0)}30%,50%,70%{transform:translate3d(-5px,0,0)}40%,60%{transform:translate3d(5px,0,0)}}

.card-face{
  position:absolute;width:100%;height:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;
  display:flex;align-items:center;justify-content:center;
  font-size:clamp(18px,4.5vw,32px);border-radius:12px;border:2px solid;
}
.card-front{
  background:linear-gradient(145deg,#0d0d1a,#060610);
  border-color:var(--c);color:var(--c);
  text-shadow:0 0 12px var(--c);
}
.card-back{
  background:#fff;border-color:var(--c);transform:rotateY(180deg);
  box-shadow:inset 0 0 20px rgba(0,0,0,0.1);
}
.card-wrap.matched .card-back{background:var(--c);filter:brightness(1.15);}
.card-wrap.error .card-front{border-color:#ff3366!important;box-shadow:0 0 20px rgba(255,51,102,0.5)!important;}

/* PLAYER CARDS (MP) */
.player-strips{display:flex;gap:10px;justify-content:space-between;}
.p-strip{flex:1;padding:12px;border-radius:12px;border:2px solid #222;background:rgba(0,0,0,0.4);text-align:center;transition:all 0.2s;}
.p-strip.active{border-color:var(--c);background:rgba(0,229,255,0.08);box-shadow:0 0 20px rgba(0,229,255,0.2);transform:scale(1.02);}

/* COMBO POPUP */
.combo-pop{
  position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
  pointer-events:none;z-index:999;
  font-size:clamp(36px,8vw,60px);font-weight:900;
  color:var(--c);text-shadow:0 0 30px var(--c),0 0 60px var(--c);
  animation:comboAnim 0.9s ease-out forwards;letter-spacing:2px;
}
@keyframes comboAnim{
  0%{opacity:0;transform:translate(-50%,-50%) scale(0.5)}
  25%{opacity:1;transform:translate(-50%,-60%) scale(1.3)}
  100%{opacity:0;transform:translate(-50%,-80%) scale(1)}
}

/* RESULT */
.result-grade{
  font-size:clamp(70px,20vw,120px);font-weight:900;line-height:1;
  text-shadow:0 0 40px var(--c),0 0 80px var(--c);margin:0;
}
.stat-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);}
.stat-row:last-child{border-bottom:none;}
.stat-row.total{font-size:22px;font-weight:800;border-top:2px solid rgba(255,255,255,0.12);border-bottom:none;padding-top:16px;margin-top:4px;}

/* SCROLL */
::-webkit-scrollbar{width:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#222;border-radius:3px;}
::-webkit-scrollbar-thumb:hover{background:#333;}

/* ANIMATIONS */
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.fade-up{animation:fadeUp 0.4s ease both;}
.fade-in{animation:fadeIn 0.3s ease both;}

/* DANGER */
.danger-text{color:#ff3366!important;text-shadow:0 0 15px #ff3366!important;}
.danger-glow{box-shadow:0 0 20px rgba(255,51,102,0.3)!important;}

/* FLAWLESS BANNER */
.flawless-banner{
  text-align:center;padding:8px 20px;border-radius:10px;
  background:rgba(0,255,68,0.1);border:1px solid rgba(0,255,68,0.4);
  color:#00ff44;font-size:14px;font-weight:800;letter-spacing:3px;margin:12px 0;
  animation:flawlessPulse 1.5s ease-in-out infinite;
}
@keyframes flawlessPulse{0%,100%{box-shadow:0 0 10px rgba(0,255,68,0.3)}50%{box-shadow:0 0 25px rgba(0,255,68,0.6)}}

/* RESPONSIVE BOARD */
@media(max-width:500px){.hud-row{flex-wrap:wrap;}.stat-value{font-size:22px;}}
`;

// ============================================================================
// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
// ============================================================================
export default function NeonOverdrive() {
  const [mounted, setMounted] = useState(false);
  const [save, setSave] = useState(DEFAULT_SAVE);
  const [screen, setScreen] = useState("menu");
  const [shopTab, setShopTab] = useState("decks");
  const [gameMode, setGameMode] = useState("solo"); // solo | pvp | pve
  const [difficulty, setDifficulty] = useState("medium");
  const [lastResult, setLastResult] = useState(null);
  const [comboPopup, setComboPopup] = useState(null);

  // Game state
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const [errorCards, setErrorCards] = useState([]);
  const [combo, setCombo] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [maxTime, setMaxTime] = useState(1);

  // Multiplayer
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [scores, setScores] = useState({ 1:0, 2:0 });
  const [isBotThinking, setIsBotThinking] = useState(false);

  const timerRef = useRef(null);
  const runStats = useRef({ maxCombo:0, wrongMoves:0 });
  const botRef = useRef(null);
  const saveQueued = useRef(false);

  // ── PERSISTENCE ───────────────────────────────────────────────────────────
  const safeSave = useCallback((data) => {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, serialized);
      // Verify write
      const verify = localStorage.getItem(STORAGE_KEY);
      if (verify !== serialized) throw new Error("Verify failed");
    } catch (e) {
      // Retry once
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Deep merge with defaults to handle missing fields
        const merged = {
          ...DEFAULT_SAVE,
          ...parsed,
          stats: { ...DEFAULT_SAVE.stats, ...(parsed.stats || {}) },
          unlockedDecks: parsed.unlockedDecks || ["classic"],
          unlockedBacks: parsed.unlockedBacks || ["default"],
          unlockedAuras: parsed.unlockedAuras || ["cyan"],
          unlockedTitles: parsed.unlockedTitles || ["rookie"],
          unlockedTrails: parsed.unlockedTrails || ["none"],
        };
        setSave(merged);
      }
    } catch (e) {
      console.warn("Save load failed, using defaults");
    }
    setMounted(true);
  }, []);

  // Auto-save on every state change, debounced
  useEffect(() => {
    if (!mounted) return;
    if (saveQueued.current) return;
    saveQueued.current = true;
    const t = setTimeout(() => {
      safeSave(save);
      saveQueued.current = false;
    }, 300);
    return () => clearTimeout(t);
  }, [save, mounted, safeSave]);

  // Save on page hide/unload
  useEffect(() => {
    const handler = () => { if (mounted) safeSave(save); };
    window.addEventListener("beforeunload", handler);
    document.addEventListener("visibilitychange", () => { if (document.hidden && mounted) safeSave(save); });
    return () => window.removeEventListener("beforeunload", handler);
  }, [save, mounted, safeSave]);

  // ── GAME LOGIC ────────────────────────────────────────────────────────────
  const buildDeck = (diffId) => {
    const diff = DIFFICULTY[diffId];
    const deckItems = SHOP.decks[save.activeDeck].items;
    let pool = [...deckItems];
    while (pool.length < diff.pairs) pool = [...pool, ...deckItems];
    const selected = pool.sort(() => Math.random() - 0.5).slice(0, diff.pairs);
    return [...selected, ...selected]
      .sort(() => Math.random() - 0.5)
      .map((item, i) => ({ id: i, item }));
  };

  const startMatch = (diffId) => {
    initAudio(); playSound("click");
    const diff = DIFFICULTY[diffId];
    const deck = buildDeck(diffId);
    setDifficulty(diffId);
    setCards(deck);
    setFlipped([]);
    setSolved([]);
    setErrorCards([]);
    setCombo(0);
    setIsLocked(false);
    setCurrentPlayer(1);
    setScores({ 1:0, 2:0 });
    runStats.current = { maxCombo:0, wrongMoves:0 };
    if (gameMode === "solo") {
      setTimeLeft(diff.time);
      setMaxTime(diff.time);
    } else {
      setTimeLeft(9999);
      setMaxTime(9999);
    }
    if (gameMode === "pve") botRef.current = createBot(diffId);
    setScreen("playing");
  };

  // Timer
  useEffect(() => {
    clearInterval(timerRef.current);
    if (screen === "playing" && gameMode === "solo") {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); handleGameOver(false); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [screen, gameMode]);

  // Bot turn
  useEffect(() => {
    if (screen !== "playing" || gameMode !== "pve" || currentPlayer !== 2 || isLocked || isBotThinking) return;
    const bot = botRef.current;
    if (!bot) return;
    setIsBotThinking(true);
    const delay = 800 + Math.random() * 600;

    setTimeout(() => {
      // Bot picks first card
      const unflipped = cards.map((_,i)=>i).filter(i => !solved.includes(i));
      if (unflipped.length === 0) { setIsBotThinking(false); return; }

      const known = bot.findMatch(-1);
      let first, second;

      if (known && Math.random() < bot.skillChance) {
        [first, second] = known;
      } else {
        const randPick = (exclude) => {
          const opts = unflipped.filter(i => i !== exclude);
          return opts[Math.floor(Math.random() * opts.length)];
        };
        first = randPick(-1);
        second = randPick(first);
      }

      if (first === undefined || second === undefined) { setIsBotThinking(false); return; }

      // Flip first
      playSound("flip");
      setFlipped([first]);
      bot.remember(first, cards[first].item);

      setTimeout(() => {
        playSound("flip");
        setFlipped([first, second]);
        bot.remember(second, cards[second].item);
        setIsLocked(true);

        setTimeout(() => {
          if (cards[first].item === cards[second].item) {
            playSound("match");
            const newCombo = combo + 1;
            setCombo(newCombo);
            if (newCombo > runStats.current.maxCombo) runStats.current.maxCombo = newCombo;
            setScores(s => ({ ...s, 2: s[2] + 100 * newCombo }));
            setSolved(prev => {
              const next = [...prev, first, second];
              if (next.length === cards.length) setTimeout(() => handleGameOver(true), 600);
              return next;
            });
            setTimeout(() => { setFlipped([]); setIsLocked(false); setIsBotThinking(false); }, 400);
          } else {
            playSound("miss");
            setCombo(0);
            setErrorCards([first, second]);
            setTimeout(() => {
              setFlipped([]); setErrorCards([]); setIsLocked(false);
              setCurrentPlayer(1); setIsBotThinking(false);
            }, 900);
          }
        }, 700);
      }, 600);
    }, delay);
  }, [screen, gameMode, currentPlayer, isLocked, isBotThinking, solved, cards]);

  const showCombo = (n) => {
    setComboPopup(`×${n} COMBO!`);
    setTimeout(() => setComboPopup(null), 900);
  };

  const handleCardClick = (idx) => {
    initAudio();
    if (isLocked || solved.includes(idx) || flipped.includes(idx) || screen !== "playing") return;
    if (gameMode === "pve" && currentPlayer === 2) return;

    playSound("flip");
    const next = [...flipped, idx];
    setFlipped(next);

    if (next.length === 2) {
      setIsLocked(true);
      const [a, b] = next;

      if (cards[a].item === cards[b].item) {
        playSound("match");
        const newCombo = combo + 1;
        setCombo(newCombo);
        if (newCombo > runStats.current.maxCombo) runStats.current.maxCombo = newCombo;
        if (newCombo > 1) showCombo(newCombo);

        if (gameMode === "solo") setTimeLeft(t => Math.min(maxTime, t + 3));
        else setScores(s => ({ ...s, [currentPlayer]: s[currentPlayer] + 100 * newCombo }));

        setSolved(prev => {
          const ns = [...prev, a, b];
          if (ns.length === cards.length) setTimeout(() => handleGameOver(true), 600);
          return ns;
        });
        setTimeout(() => { setFlipped([]); setIsLocked(false); }, 400);
      } else {
        playSound("miss");
        runStats.current.wrongMoves += 1;
        setCombo(0);
        setErrorCards([a, b]);
        if (gameMode === "solo") setTimeLeft(t => Math.max(1, t - 4));

        const switchDelay = gameMode === "solo" ? 800 : 1000;
        setTimeout(() => {
          setFlipped([]); setErrorCards([]); setIsLocked(false);
          if (gameMode !== "solo") setCurrentPlayer(p => p === 1 ? 2 : 1);
        }, switchDelay);
      }
    }
  };

  const handleGameOver = (isWin) => {
    clearInterval(timerRef.current);
    if (gameMode !== "solo") {
      playSound("win");
      const winner = scores[1] > scores[2] ? 1 : scores[2] > scores[1] ? 2 : 0;
      setLastResult({ mp:true, scores:{ ...scores }, winner, mode:gameMode });
      setScreen("result");
      setSave(prev => ({ ...prev, stats: { ...prev.stats, totalGamesPlayed: prev.stats.totalGamesPlayed + 1, matchesWon: prev.stats.matchesWon + (winner===1?1:0), matchesLost: prev.stats.matchesLost + (winner!==1?1:0) } }));
      return;
    }
    if (isWin) {
      playSound("win");
      const diff = DIFFICULTY[difficulty];
      const base = Math.floor(diff.mult * 35);
      const timeBonus = Math.floor(timeLeft * diff.mult * 1.2);
      const comboBonus = Math.floor(runStats.current.maxCombo * diff.mult * 6);
      const penalty = Math.floor(runStats.current.wrongMoves * diff.mult * 6);
      const raw = Math.max(0, base + timeBonus + comboBonus - penalty);
      const tp = timeLeft / maxTime;
      const err = runStats.current.wrongMoves;
      let grade="C", gm=0.8;
      if (tp>=0.55 && err<=2){ grade="S"; gm=1.6; }
      else if (tp>=0.35 && err<=5){ grade="A"; gm=1.25; }
      else if (tp>=0.18){ grade="B"; gm=1.0; }
      const flawless = err === 0;
      const fm = flawless ? 2.2 : 1.0;

      // Apply boost
      let boostMult = 1;
      let newBoostGamesLeft = save.boostGamesLeft;
      let newBoost = save.activeBoost;
      if (save.activeBoost && save.boostGamesLeft > 0) {
        boostMult = SHOP.xp_boosts[save.activeBoost]?.multiplier || 1;
        newBoostGamesLeft = save.boostGamesLeft - 1;
        if (newBoostGamesLeft <= 0) newBoost = null;
      }

      const earned = Math.floor(raw * gm * fm * boostMult);
      setLastResult({ mp:false, isWin:true, grade, base, timeBonus, comboBonus, penalty, gm, fm, flawless, earned, boostMult, time:timeLeft, maxCombo:runStats.current.maxCombo, errors:err });
      setSave(prev => ({
        ...prev, credits: prev.credits + earned,
        activeBoost: newBoost, boostGamesLeft: newBoostGamesLeft,
        stats: { ...prev.stats, matchesWon: prev.stats.matchesWon+1, highestCombo: Math.max(prev.stats.highestCombo, runStats.current.maxCombo), totalCreditsEarned: prev.stats.totalCreditsEarned + earned, totalGamesPlayed: prev.stats.totalGamesPlayed+1 }
      }));
    } else {
      playSound("lose");
      setLastResult({ mp:false, isWin:false });
      setSave(prev => ({ ...prev, stats: { ...prev.stats, matchesLost: prev.stats.matchesLost+1, totalGamesPlayed: prev.stats.totalGamesPlayed+1 } }));
    }
    setScreen("result");
  };

  // ── SHOP ──────────────────────────────────────────────────────────────────
  const purchase = (cat, key) => {
    initAudio();
    const catMap = { decks:"Decks", backs:"Backs", auras:"Auras", titles:"Titles", trails:"Trails" };
    const Cat = catMap[cat];
    if (!Cat) return;
    const item = SHOP[cat][key];
    if (!item) return;
    const unlockField = `unlocked${Cat}`;
    const activeField = `active${Cat}`;
    const owned = (save[unlockField] || []).includes(key);

    if (cat === "xp_boosts") {
      if (save.credits < item.cost) { playSound("miss"); return; }
      playSound("win");
      setSave(prev => ({ ...prev, credits: prev.credits - item.cost, activeBoost: key, boostGamesLeft: item.uses }));
      return;
    }

    if (owned) {
      playSound("click");
      setSave(prev => ({ ...prev, [activeField]: key }));
    } else if (save.credits >= item.cost) {
      playSound("win");
      setSave(prev => ({
        ...prev, credits: prev.credits - item.cost,
        [unlockField]: [...(prev[unlockField] || []), key],
        [activeField]: key
      }));
    } else {
      playSound("miss");
    }
  };

  if (!mounted) return null;

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const themeColor = SHOP.auras[save.activeAura]?.color || "#00e5ff";
  const themeBack = SHOP.backs[save.activeBack]?.symbol || "?";
  const activeTitle = SHOP.titles[save.activeTitle]?.display || "🎮 Rookie";
  const isDanger = gameMode === "solo" && screen === "playing" && timeLeft <= 10;
  const resolvedColor = isDanger ? "#ff3366" : themeColor;
  const pct = (timeLeft / maxTime) * 100;

  const cols = cards.length <= 12 ? 4 : cards.length <= 16 ? 4 : cards.length <= 24 ? 6 : cards.length <= 30 ? 6 : 6;

  const shopCategories = [
    { key:"decks",     label:"🎴 Decks" },
    { key:"backs",     label:"🃏 Card Backs" },
    { key:"auras",     label:"✨ Auras" },
    { key:"titles",    label:"🏆 Titles" },
    { key:"trails",    label:"💨 Trails" },
    { key:"xp_boosts", label:"⚡ Boosts" },
  ];

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="gw" style={{ "--c": resolvedColor, "--cd": resolvedColor + "28" }}>
      <style>{CSS}</style>
      <div className="scanlines" />
      <div className="grid-bg" />
      {comboPopup && <div className="combo-pop">{comboPopup}</div>}

      <div className="layer">

        {/* ── MENU ── */}
        {screen === "menu" && (
          <div className="fade-up" style={{ width:"100%", maxWidth:520, textAlign:"center", paddingTop:20 }}>
            <nav className="nav" style={{ maxWidth:520 }}>
              <div className="title-badge mono">{activeTitle}</div>
              <div className="credits-badge mono">{save.credits.toLocaleString()} <span style={{fontSize:14}}>💎</span></div>
            </nav>

            <h1 className="menu-title">OVERDRIVE</h1>
            <p className="sub mono">MNEMONIC PROTOCOL V5</p>

            {save.activeBoost && (
              <div style={{ marginBottom:16, padding:"8px 16px", borderRadius:10, background:"rgba(255,153,0,0.1)", border:"1px solid rgba(255,153,0,0.3)", color:"#ffaa00", fontSize:13, fontWeight:700 }}>
                ⚡ {SHOP.xp_boosts[save.activeBoost]?.name} ACTIVE — {save.boostGamesLeft} games left
              </div>
            )}

            <div className="mode-tabs" style={{ justifyContent:"center" }}>
              {[["solo","SOLO"],["pvp","VS PLAYER"],["pve","VS BOT"]].map(([m,l]) => (
                <div key={m} className={`mode-tab${gameMode===m?" active":""}`}
                  onClick={() => { initAudio(); playSound("click"); setGameMode(m); }}>
                  {l}
                </div>
              ))}
            </div>

            <div className="diff-grid" style={{ margin:"0 auto 28px" }}>
              {Object.entries(DIFFICULTY).map(([id, d]) => (
                <div key={id} className="diff-btn" style={{ borderColor: d.color + "55", color: d.color }}
                  onClick={() => startMatch(id)}>
                  <div className="diff-name" style={{ color: d.color }}>{d.name}</div>
                  <div className="diff-label">{d.label} · ×{d.mult} MULT</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <button className="btn btn-ghost" onClick={() => { initAudio(); playSound("click"); setScreen("shop"); }}>
                🛒 BLACK MARKET
              </button>
              <button className="btn btn-ghost" onClick={() => { initAudio(); setScreen("stats"); }}>
                📊 STATS
              </button>
            </div>
          </div>
        )}

        {/* ── STATS SCREEN ── */}
        {screen === "stats" && (
          <div className="fade-up glass" style={{ width:"100%", maxWidth:480, margin:"20px auto", padding:30 }}>
            <h2 style={{ color: themeColor, margin:"0 0 24px", letterSpacing:2 }}>NEURAL PROFILE</h2>
            {[
              ["Total Games",save.stats.totalGamesPlayed],
              ["Wins",save.stats.matchesWon],
              ["Losses",save.stats.matchesLost],
              ["Win Rate", save.stats.totalGamesPlayed > 0 ? Math.round(save.stats.matchesWon/save.stats.totalGamesPlayed*100)+"%" : "—"],
              ["Highest Combo","×"+save.stats.highestCombo],
              ["Credits Earned",save.stats.totalCreditsEarned.toLocaleString()+" 💎"],
              ["Current Balance",save.credits.toLocaleString()+" 💎"],
            ].map(([k,v]) => (
              <div key={k} className="stat-row">
                <span style={{ color:"#888" }}>{k}</span>
                <span style={{ fontWeight:800, color:themeColor }}>{v}</span>
              </div>
            ))}
            <button className="btn btn-ghost" style={{ width:"100%", marginTop:20 }} onClick={() => { playSound("click"); setScreen("menu"); }}>
              ← BACK
            </button>
          </div>
        )}

        {/* ── SHOP ── */}
        {screen === "shop" && (
          <div className="shop-layout fade-in">
            <div className="nav" style={{ maxWidth:960 }}>
              <h2 style={{ margin:0, color:themeColor, fontSize:"clamp(18px,4vw,28px)", fontWeight:900, letterSpacing:2 }}>BLACK MARKET</h2>
              <div className="credits-badge mono">{save.credits.toLocaleString()} <span style={{fontSize:14}}>💎</span></div>
            </div>

            <div className="glass" style={{ width:"100%", maxWidth:960 }}>
              <div className="shop-tabs">
                {shopCategories.map(({key,label}) => (
                  <button key={key} className={`shop-tab-btn${shopTab===key?" active":""}`}
                    onClick={() => { playSound("click"); setShopTab(key); }}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="shop-grid" style={{ maxHeight:"60vh", overflowY:"auto" }}>
                {shopTab === "xp_boosts" ? (
                  Object.entries(SHOP.xp_boosts).map(([key, item]) => {
                    const isActive = save.activeBoost === key;
                    const canAfford = save.credits >= item.cost;
                    return (
                      <div key={key} className={`shop-item${isActive?" equipped":""}`}
                        onClick={() => purchase("xp_boosts", key)}
                        style={{ opacity: !canAfford && !isActive ? 0.5 : 1 }}>
                        <div className="item-rarity" style={{ color: RARITY_COLORS[item.rarity] }}>{item.rarity}</div>
                        <div className="item-preview">⚡</div>
                        <div className="item-name">{item.name}</div>
                        <div className="item-desc">{item.desc}</div>
                        <div className="item-cost" style={{ color: canAfford ? "#ffd700" : "#555" }}>
                          {isActive ? `${save.boostGamesLeft} games left` : `${item.cost.toLocaleString()} 💎`}
                        </div>
                        {isActive && <div className="item-badge">ACTIVE</div>}
                      </div>
                    );
                  })
                ) : (
                  Object.entries(SHOP[shopTab] || {}).map(([key, item]) => {
                    const catMap = { decks:"Decks", backs:"Backs", auras:"Auras", titles:"Titles", trails:"Trails" };
                    const Cat = catMap[shopTab];
                    const owned = Cat ? (save[`unlocked${Cat}`] || []).includes(key) : false;
                    const isEquipped = Cat ? save[`active${Cat}`] === key : false;
                    const canAfford = save.credits >= item.cost;

                    return (
                      <div key={key}
                        className={`shop-item${isEquipped?" equipped":owned?" owned":""}`}
                        onClick={() => purchase(shopTab, key)}
                        style={{ opacity: !canAfford && !owned ? 0.55 : 1 }}>
                        <div className="item-rarity" style={{ color: RARITY_COLORS[item.rarity || "FREE"] }}>{item.rarity || "FREE"}</div>
                        <div className="item-preview">
                          {shopTab === "decks" && item.preview}
                          {shopTab === "backs" && <span style={{ fontSize:32, color:isEquipped?themeColor:"#ccc" }}>{item.symbol}</span>}
                          {shopTab === "auras" && <span style={{ fontSize:28, color:item.color, textShadow:`0 0 12px ${item.color}` }}>◉</span>}
                          {shopTab === "titles" && <span style={{ fontSize:20 }}>{item.display}</span>}
                          {shopTab === "trails" && <span style={{ fontSize:28 }}>{item.symbol || "—"}</span>}
                        </div>
                        <div className="item-name">{item.name}</div>
                        <div className="item-desc">{item.desc}</div>
                        <div className="item-cost" style={{ color: owned ? themeColor : canAfford ? "#ffd700" : "#555" }}>
                          {item.cost === 0 ? "FREE" : owned ? "OWNED" : `${item.cost.toLocaleString()} 💎`}
                        </div>
                        {isEquipped && <div className="item-badge">EQUIPPED</div>}
                        {!isEquipped && owned && <div className="item-badge" style={{ background:"#333", color:"#aaa" }}>EQUIP</div>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button className="btn btn-ghost" style={{ marginTop:16 }} onClick={() => { playSound("click"); setScreen("menu"); }}>
              ← EXIT MARKET
            </button>
          </div>
        )}

        {/* ── PLAYING ── */}
        {screen === "playing" && (
          <div style={{ width:"100%", maxWidth:960, display:"flex", flexDirection:"column", alignItems:"center" }}>

            <div className={`hud glass${isDanger?" danger-glow":""}`}>
              {gameMode === "solo" ? (
                <>
                  <div className="hud-row">
                    <div className="stat-block">
                      <div className="stat-label mono">TIME</div>
                      <div className={`stat-value mono${isDanger?" danger-text":""}`}>{timeLeft}s</div>
                    </div>
                    <div className="stat-block">
                      <div className="stat-label mono">COMBO</div>
                      <div className="stat-value" style={{ color: combo > 1 ? themeColor : "#fff", textShadow: combo > 1 ? `0 0 15px ${themeColor}` : "none" }}>×{combo}</div>
                    </div>
                    <div className="stat-block">
                      <div className="stat-label mono">FOUND</div>
                      <div className="stat-value">{solved.length/2}/{cards.length/2}</div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => handleGameOver(false)}>ABORT</button>
                  </div>
                  <div className="timer-track">
                    <div className="timer-fill" style={{ width:`${pct}%`, background: isDanger ? "#ff3366" : themeColor, boxShadow:`0 0 8px ${isDanger?"#ff3366":themeColor}` }} />
                  </div>
                </>
              ) : (
                <div className="player-strips">
                  {[1,2].map(p => (
                    <div key={p} className={`p-strip${currentPlayer===p?" active":""}`}>
                      <div className="mono" style={{ fontSize:11, color:"#666", letterSpacing:1 }}>
                        {gameMode==="pve" && p===2 ? "BOT" : `PLAYER ${p}`}
                      </div>
                      <div style={{ fontSize:30, fontWeight:800, color: currentPlayer===p ? themeColor : "#fff" }}>{scores[p]}</div>
                      {gameMode==="pve" && p===2 && isBotThinking && <div style={{ fontSize:11, color:themeColor }} className="mono">thinking...</div>}
                    </div>
                  ))}
                  <div style={{ textAlign:"center", alignSelf:"center", minWidth:80 }}>
                    <div className="mono" style={{ fontSize:11, color:"#555" }}>FOUND</div>
                    <div style={{ fontSize:20, fontWeight:800 }}>{solved.length/2}/{cards.length/2}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="board" style={{ gridTemplateColumns:`repeat(${cols}, 1fr)` }}>
              {cards.map((card, idx) => {
                const isFlip = flipped.includes(idx) || solved.includes(idx);
                const isMatch = solved.includes(idx);
                const isErr = errorCards.includes(idx);
                return (
                  <div key={idx}
                    className={`card-wrap${isFlip?" flipped":""}${isMatch?" matched":""}${isErr?" error":""}${isLocked?" locked":""}`}
                    onClick={() => handleCardClick(idx)}>
                    <div className="card-inner">
                      <div className="card-face card-front" style={{ fontSize:"clamp(16px,4vw,28px)" }}>{themeBack}</div>
                      <div className="card-face card-back">{card.item}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {gameMode !== "solo" && (
              <button className="btn btn-danger" style={{ marginTop:20 }} onClick={() => { playSound("click"); setScreen("menu"); }}>
                END MATCH
              </button>
            )}
          </div>
        )}

        {/* ── RESULT ── */}
        {screen === "result" && lastResult && (
          <div className="fade-up" style={{ width:"100%", maxWidth:480, textAlign:"center", padding:"20px 0" }}>

            {lastResult.mp ? (
              <>
                <h1 style={{ color: themeColor, fontSize:"clamp(32px,9vw,58px)", margin:"0 0 8px", fontWeight:900 }}>
                  {lastResult.winner===0 ? "DRAW!" : lastResult.mode==="pve" && lastResult.winner===2 ? "BOT WINS" : `PLAYER ${lastResult.winner} WINS!`}
                </h1>
                <div className="glass" style={{ padding:30, margin:"20px 0" }}>
                  {[1,2].map(p => (
                    <div key={p} className="stat-row">
                      <span style={{ color: lastResult.winner===p ? themeColor : "#aaa", fontWeight:700 }}>
                        {lastResult.mode==="pve" && p===2 ? "🤖 BOT" : `PLAYER ${p}`}
                      </span>
                      <span style={{ fontSize:24, fontWeight:800, color: lastResult.winner===p ? themeColor : "#fff" }}>
                        {lastResult.scores[p].toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h1 style={{ color: lastResult.isWin ? themeColor : "#ff3366", fontSize:"clamp(28px,7vw,48px)", fontWeight:900, margin:"0 0 4px" }}>
                  {lastResult.isWin ? "LINK SECURED" : "CRITICAL FAILURE"}
                </h1>
                {lastResult.isWin && (
                  <div className="glass" style={{ padding:30, margin:"20px 0", textAlign:"left" }}>
                    <div style={{ textAlign:"center", marginBottom:20 }}>
                      <p className="result-grade" style={{ color: lastResult.grade==="S" ? "#ffd700" : themeColor }}>
                        {lastResult.grade}
                      </p>
                      {lastResult.flawless && <div className="flawless-banner">⚡ FLAWLESS RUN ⚡</div>}
                    </div>
                    {[
                      ["Base Value", lastResult.base, "#fff"],
                      ["Time Bonus", `+${lastResult.timeBonus}`, themeColor],
                      ["Combo Bonus", `+${lastResult.comboBonus}`, themeColor],
                      ["Miss Penalty", `-${lastResult.penalty}`, "#ff3366"],
                    ].map(([l,v,c]) => (
                      <div key={l} className="stat-row">
                        <span style={{ color:"#888" }}>{l}</span>
                        <span style={{ color:c, fontWeight:700 }}>{v}</span>
                      </div>
                    ))}
                    <div className="stat-row"><span style={{color:"#888"}}>Grade Modifier</span><span>×{lastResult.gm}</span></div>
                    {lastResult.flawless && <div className="stat-row"><span style={{color:"#888"}}>Flawless Bonus</span><span style={{color:"#00ff44"}}>×{lastResult.fm}</span></div>}
                    {lastResult.boostMult > 1 && <div className="stat-row"><span style={{color:"#888"}}>XP Boost</span><span style={{color:"#ffaa00"}}>×{lastResult.boostMult}</span></div>}
                    <div className="stat-row total">
                      <span>PAYOUT</span>
                      <span style={{ color:"#ffd700" }}>+{lastResult.earned.toLocaleString()} 💎</span>
                    </div>
                  </div>
                )}
                {!lastResult.isWin && (
                  <div className="glass" style={{ padding:30, margin:"20px 0", textAlign:"center" }}>
                    <div style={{ fontSize:60 }}>💀</div>
                    <p className="mono" style={{ color:"#666" }}>Time expired. No credits recovered.</p>
                    <div style={{ fontSize:28, fontWeight:800, color:"#ff3366", marginTop:12 }}>0 💎</div>
                  </div>
                )}
              </>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:12, maxWidth:320, margin:"0 auto" }}>
              <button className="btn" onClick={() => startMatch(difficulty)}>⟳ REBOOT</button>
              <button className="btn btn-ghost" onClick={() => { playSound("click"); setScreen("menu"); }}>⟵ HUB</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}