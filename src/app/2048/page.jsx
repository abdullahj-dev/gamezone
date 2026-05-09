'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================================
// ── STORAGE KEY (unique, no clash) ───────────────────────────────────────────
// ============================================================================
const SK = "FLUX_2048_OVERDRIVE_V1_a9f3k";

// ============================================================================
// ── AUDIO ENGINE ─────────────────────────────────────────────────────────────
// ============================================================================
let _AC = null;
const ac = () => {
  if (typeof window === "undefined") return null;
  try {
    if (!_AC) _AC = new (window.AudioContext || window.webkitAudioContext)();
    if (_AC.state === "suspended") _AC.resume();
    return _AC;
  } catch (_) { return null; }
};
const tone = (freq, dur, type = "sine", vol = 0.08, delay = 0) => {
  try {
    const ctx = ac(); if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type; o.frequency.setValueAtTime(Math.max(20, freq), t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.01, dur));
    o.start(t); o.stop(t + Math.max(0.01, dur) + 0.01);
  } catch (_) {}
};
const SFX = {
  slide:   () => { tone(180, 0.05, "sine", 0.04); tone(220, 0.04, "sine", 0.03, 0.03); },
  merge:   (v) => {
    const f = Math.min(2000, 200 + Math.log2(v || 2) * 80);
    tone(f, 0.08, "triangle", 0.07);
    tone(f * 1.5, 0.06, "sine", 0.04, 0.05);
  },
  bigMerge:(v) => {
    const f = Math.min(2400, 300 + Math.log2(v || 2) * 90);
    [f, f*1.25, f*1.5, f*2].forEach((fr, i) => tone(fr, 0.12, "triangle", 0.06, i*0.06));
  },
  spawn:   () => tone(320, 0.04, "sine", 0.025),
  win:     () => [523,659,784,1047,1319].forEach((f,i)=>tone(f,0.14,"square",0.06,i*0.09)),
  gameover:() => [400,300,200,150].forEach((f,i)=>tone(f,0.2,"sawtooth",0.07,i*0.13)),
  menu:    () => tone(660, 0.05, "triangle", 0.04),
  buy:     () => { tone(880,0.06,"square",0.06); tone(1100,0.1,"triangle",0.05,0.07); },
  deny:    () => tone(110, 0.12, "sawtooth", 0.06),
  undo:    () => { tone(440,0.05,"sine",0.05); tone(330,0.08,"sine",0.04,0.06); },
  combo:   (n) => tone(Math.min(1800,440*Math.pow(1.15,n)), 0.08, "triangle", 0.07),
  streak:  () => [660,880,1100,1320].forEach((f,i)=>tone(f,0.1,"triangle",0.07,i*0.05)),
};

// ── Background music (procedural ambient) ────────────────────────────────────
let _bgTimer = null;
let _bgBeat  = 0;
const MUSIC_SCALES = {
  ambient: [261,294,330,392,440,523,587,659],
  mystic:  [261,277,311,349,415,466,523,554],
  digital: [220,261,311,392,440,523,622,698],
  zen:     [261,294,330,370,415,466,523,587],
};
const startBG = (scaleName = "ambient") => {
  stopBG();
  const scale = MUSIC_SCALES[scaleName] || MUSIC_SCALES.ambient;
  _bgBeat = 0;
  const pattern = [0,3,5,3,1,4,6,4,2,5,3,5,0,4,6,2];
  const bassP   = [0,0,5,5,3,3,6,6];
  _bgTimer = setInterval(() => {
    try {
      const b  = _bgBeat % pattern.length;
      const bs = _bgBeat % bassP.length;
      if (_bgBeat % 3 === 0) tone(scale[pattern[b]], 0.18, "sine", 0.025);
      if (_bgBeat % 6 === 0) tone((scale[bassP[bs]]||130)/2, 0.3, "triangle", 0.015);
      _bgBeat++;
    } catch (_) {}
  }, 480);
};
const stopBG = () => { clearInterval(_bgTimer); _bgTimer = null; };

// ============================================================================
// ── GAME CONSTANTS ────────────────────────────────────────────────────────────
// ============================================================================
const GRID_SIZE  = 4;
const WIN_VALUE  = 2048;
const MAX_UNDOS  = 3;

// ============================================================================
// ── SHOP DATA ─────────────────────────────────────────────────────────────────
// ============================================================================

// Color themes: tile colors by power-of-2 index (1=2, 2=4, ... 11=2048, 12=4096+)
const THEMES = {
  obsidian: {
    name:"Obsidian",
    bg:"#0a0a0f", boardBg:"#111118", cellBg:"#1a1a25",
    accent:"#7c6af7", accent2:"#a855f7",
    textDark:"#1a1a25", textLight:"#f0eeff",
    tiles:["#2d2b47","#3d3a5e","#4a3f7a","#5c4d9e","#7059c4","#8a6ee0","#a080f8","#b89aff","#d4b8ff","#e8d4ff","#f5ecff","#ffd700","#ff9500"],
    tileText:["#9090cc","#a0a0dd","#b0a8ee","#e8e0ff","#fff","#fff","#fff","#fff","#fff","#fff","#1a1a25","#1a1a25","#fff"],
    glow:true, rarity:"FREE",
  },
  aurora: {
    name:"Aurora",
    bg:"#050a0f", boardBg:"#0a1520", cellBg:"#0f2030",
    accent:"#00e5ff", accent2:"#00ff88",
    textDark:"#050a0f", textLight:"#e0f8ff",
    tiles:["#0d2535","#0d3545","#0d4555","#0a5060","#006080","#0080a0","#00a0c0","#00c8e0","#00e5ff","#50ffcc","#a0ffee","#ffd700","#ff6600"],
    tileText:["#50a0cc","#60c0dd","#70d0ee","#80e0f0","#fff","#fff","#fff","#fff","#0a1520","#0a1520","#0a1520","#0a1520","#fff"],
    glow:true, rarity:"FREE",
  },
  ember: {
    name:"Ember",
    bg:"#0f0700", boardBg:"#1a0d00", cellBg:"#251500",
    accent:"#ff6a00", accent2:"#ff9500",
    textDark:"#0f0700", textLight:"#fff4e8",
    tiles:["#2a1200","#3d1a00","#552200","#6e2a00","#8c3400","#aa4200","#cc5500","#e86a00","#ff8000","#ffaa00","#ffcc44","#ffd700","#ff3300"],
    tileText:["#884400","#aa5500","#cc6600","#ff8800","#fff","#fff","#fff","#fff","#1a0d00","#1a0d00","#1a0d00","#1a0d00","#fff"],
    glow:true, rarity:"COMMON", cost:400,
  },
  void_: {
    name:"Void",
    bg:"#000000", boardBg:"#050508", cellBg:"#0c0c10",
    accent:"#ffffff", accent2:"#aaaaaa",
    textDark:"#000000", textLight:"#ffffff",
    tiles:["#111114","#18181c","#222226","#2c2c32","#38383e","#46464e","#565660","#686874","#808088","#9898a4","#b8b8c4","#ffd700","#ff4444"],
    tileText:["#505058","#606068","#707078","#888890","#aaaaaa","#cccccc","#eeeeee","#fff","#fff","#000","#000","#000","#fff"],
    glow:false, rarity:"UNCOMMON", cost:1200,
  },
  sakura: {
    name:"Sakura",
    bg:"#0d0508", boardBg:"#180a10", cellBg:"#220d18",
    accent:"#ff6eb0", accent2:"#ff9dd0",
    textDark:"#0d0508", textLight:"#ffe8f4",
    tiles:["#2a0f1a","#3d1528","#55203a","#6e2a4e","#8a3362","#a83d78","#c84890","#e050a8","#ff60bb","#ff88cc","#ffaade","#ffd700","#ff1155"],
    tileText:["#8844aa","#aa55bb","#cc66cc","#ee77dd","#fff","#fff","#fff","#fff","#0d0508","#0d0508","#0d0508","#0d0508","#fff"],
    glow:true, rarity:"RARE", cost:2500,
  },
  matrix: {
    name:"Matrix",
    bg:"#000800", boardBg:"#000d00", cellBg:"#001200",
    accent:"#00ff41", accent2:"#00cc33",
    textDark:"#000800", textLight:"#ccffcc",
    tiles:["#001800","#002200","#002e00","#003a00","#004800","#005800","#006c00","#008400","#00a800","#00cc00","#00ff41","#ffd700","#ff0000"],
    tileText:["#005500","#006600","#008800","#00aa00","#00cc00","#00ee00","#ccffcc","#ccffcc","#000800","#000800","#000800","#000800","#fff"],
    glow:true, rarity:"RARE", cost:3000,
  },
  royal: {
    name:"Royal Gold",
    bg:"#06040a", boardBg:"#0f0a18", cellBg:"#180f25",
    accent:"#ffd700", accent2:"#ffaa00",
    textDark:"#06040a", textLight:"#fff8e0",
    tiles:["#1a1030","#251545","#321c5e","#42247a","#543099","#683cbb","#7e4ad4","#9860e8","#b07af0","#cc96f8","#e8b8ff","#ffd700","#ff6600"],
    tileText:["#7060aa","#9080cc","#a898dd","#c0b0ee","#fff","#fff","#fff","#fff","#06040a","#06040a","#06040a","#06040a","#fff"],
    glow:true, rarity:"EPIC", cost:6000,
  },
  crimson: {
    name:"Blood Moon",
    bg:"#0a0000", boardBg:"#150000", cellBg:"#200000",
    accent:"#ff2244", accent2:"#ff5566",
    textDark:"#0a0000", textLight:"#ffe8e8",
    tiles:["#250000","#350000","#480000","#600000","#7a0000","#950000","#b40000","#d00000","#ee1122","#ff3344","#ff6677","#ffd700","#ff8800"],
    tileText:["#aa4444","#cc5555","#dd6666","#ee7777","#ff9999","#ffbbbb","#fff","#fff","#0a0000","#0a0000","#0a0000","#0a0000","#fff"],
    glow:true, rarity:"LEGENDARY", cost:10000,
  },
  crystal: {
    name:"Crystal Clear",
    bg:"#f0f0f8", boardBg:"#e0e0ee", cellBg:"#d0d0e8",
    accent:"#6644cc", accent2:"#8866ee",
    textDark:"#1a1a3a", textLight:"#1a1a3a",
    tiles:["#d8d8f0","#c8c8e8","#b8b0e0","#a898d8","#9880d0","#8868c8","#7850c0","#6838b8","#5820b0","#4808a8","#3800a0","#ffd700","#cc2200"],
    tileText:["#8888bb","#9090cc","#9898cc","#a0a0cc","#1a1a3a","#1a1a3a","#f0f0ff","#f0f0ff","#f0f0ff","#f0f0ff","#f0f0ff","#1a1a3a","#fff"],
    glow:false, rarity:"EPIC", cost:7500,
  },
  galaxy: {
    name:"Galaxy",
    bg:"#020210", boardBg:"#050520", cellBg:"#0a0a30",
    accent:"#cc88ff", accent2:"#88ccff",
    textDark:"#020210", textLight:"#eeeeff",
    tiles:["#0d0d40","#151560","#1e1e80","#28289e","#3535bb","#4848d4","#6060e8","#7878f0","#9090f8","#aaaaff","#ccccff","#ffd700","#ff4488"],
    tileText:["#5050aa","#6666bb","#7878cc","#8888dd","#aaaaee","#ccccff","#fff","#fff","#020210","#020210","#020210","#020210","#fff"],
    glow:true, rarity:"MYTHIC", cost:18000,
  },
  hacker: {
    name:"Terminal",
    bg:"#000000", boardBg:"#030303", cellBg:"#050505",
    accent:"#22ff88", accent2:"#00ffcc",
    textDark:"#000000", textLight:"#ccffee",
    tiles:["#001a0d","#002815","#00361e","#004828","#005c34","#007044","#008858","#00a870","#00cc88","#00eeaa","#22ffcc","#ffd700","#ff0066"],
    tileText:["#00aa66","#00bb77","#00cc88","#00dd99","#00eeaa","#ccffee","#000000","#000000","#000000","#000000","#000000","#000000","#fff"],
    glow:true, rarity:"DIVINE", cost:30000,
  },
};

const BOARD_SIZES = {
  s4x4: { name:"4×4 Classic",  size:4,  cost:0,     rarity:"FREE",     desc:"The original experience" },
  s5x5: { name:"5×5 Extended", size:5,  cost:1000,  rarity:"COMMON",   desc:"More room, more chaos" },
  s6x6: { name:"6×6 Chaos",    size:6,  cost:3000,  rarity:"RARE",     desc:"Absolute madness" },
  s3x3: { name:"3×3 Brutal",   size:3,  cost:2000,  rarity:"UNCOMMON", desc:"Impossibly tight" },
};

const TILE_SKINS = {
  flat:     { name:"Flat",        cost:0,     rarity:"FREE",     desc:"Clean flat design" },
  glossy:   { name:"Glossy",      cost:600,   rarity:"COMMON",   desc:"Shiny highlight on each tile" },
  neon:     { name:"Neon Glow",   cost:1500,  rarity:"UNCOMMON", desc:"Intense neon border glow" },
  glass:    { name:"Frosted Glass",cost:3000, rarity:"RARE",     desc:"Frosted glass effect" },
  embossed: { name:"Embossed",    cost:5000,  rarity:"EPIC",     desc:"Deep 3D raised effect" },
  hologram: { name:"Hologram",    cost:12000, rarity:"LEGENDARY",desc:"Shifting iridescent surface" },
};

const BACKGROUNDS = {
  plain:    { name:"Plain",       cost:0,     rarity:"FREE",     desc:"Pure background color" },
  grid:     { name:"Grid Lines",  cost:300,   rarity:"COMMON",   desc:"Subtle grid overlay" },
  dots:     { name:"Dot Matrix",  cost:800,   rarity:"UNCOMMON", desc:"Dot pattern background" },
  circuit:  { name:"Circuit",     cost:2000,  rarity:"RARE",     desc:"PCB circuit pattern" },
  nebula:   { name:"Nebula",      cost:5000,  rarity:"EPIC",     desc:"Nebula particle field" },
  void_:    { name:"The Void",    cost:15000, rarity:"DIVINE",   desc:"Absolute nothing" },
};

const TITLES = {
  novice:    { name:"Novice",       display:"🎲 Novice",       cost:0,     rarity:"FREE" },
  adept:     { name:"Adept",        display:"🧩 Adept",        cost:500,   rarity:"COMMON" },
  tactician: { name:"Tactician",    display:"♟ Tactician",    cost:2000,  rarity:"UNCOMMON" },
  architect: { name:"Architect",    display:"🏗 Architect",    cost:6000,  rarity:"RARE" },
  oracle:    { name:"Oracle",       display:"🔮 Oracle",       cost:15000, rarity:"EPIC" },
  sovereign: { name:"Sovereign",    display:"👑 Sovereign",    cost:40000, rarity:"LEGENDARY" },
  transcendent:{ name:"Transcendent",display:"⚡ Transcendent",cost:100000,rarity:"DIVINE" },
};

const MULTIPLIERS = {
  m1:  { name:"1.5× Points",  mult:1.5, uses:5,  cost:600,   rarity:"COMMON",   desc:"5 games at 1.5× score" },
  m2:  { name:"2× Points",    mult:2.0, uses:3,  cost:1800,  rarity:"RARE",     desc:"3 games at double score" },
  m3:  { name:"3× Combo",     mult:3.0, uses:2,  cost:5000,  rarity:"LEGENDARY",desc:"2 games at triple score" },
};

const POWERUPS = {
  undo:    { name:"+3 Undos",     cost:500,  rarity:"COMMON",   desc:"Get 3 extra undo moves" },
  bomb:    { name:"Tile Bomb",    cost:1500, rarity:"RARE",     desc:"Remove any one tile next game" },
  shield:  { name:"Score Shield", cost:3000, rarity:"EPIC",     desc:"Keep score on game over (once)" },
};

const MUSIC_STYLES = {
  ambient: { name:"Ambient",  desc:"Soft ambient tones" },
  mystic:  { name:"Mystic",   desc:"Mysterious arpeggios" },
  digital: { name:"Digital",  desc:"Electronic pulses" },
  zen:     { name:"Zen",      desc:"Peaceful meditation" },
};

const RARITY_C = {
  FREE:"#777", COMMON:"#aaa", UNCOMMON:"#00cc44", RARE:"#0099ff",
  EPIC:"#bb44ff", LEGENDARY:"#ff9900", MYTHIC:"#ff44cc", DIVINE:"#ffd700",
};

const DEFAULT_SAVE = {
  gems: 0,
  activeTheme: "obsidian",
  activeSkin: "flat",         unlockedSkins: ["flat"],
  activeBoard: "s4x4",        unlockedBoards: ["s4x4"],
  activeBg: "plain",          unlockedBgs: ["plain"],
  activeTitle: "novice",      unlockedTitles: ["novice"],
  activeMult: null,           multGamesLeft: 0,
  musicStyle: "ambient",      musicOn: true, sfxOn: true,
  showAnim: true,             showStreak: true,
  undosLeft: MAX_UNDOS,
  stats: {
    totalGames:0, totalMoves:0, bestScore:0, best2048s:0,
    bestTile:0, totalGems:0, longestStreak:0,
  },
};

// ============================================================================
// ── CORE GAME LOGIC ───────────────────────────────────────────────────────────
// ============================================================================
let _idCounter = 1;
const newTile = (val, r, c) => ({ id: _idCounter++, val, r, c, isNew: true, isMerged: false });

const mkEmpty = (size) => Array.from({length:size}, () => Array(size).fill(null));

const emptySpots = (grid, size) => {
  const spots = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) spots.push([r, c]);
  return spots;
};

const spawnRandom = (grid, size) => {
  const spots = emptySpots(grid, size);
  if (!spots.length) return grid;
  const [r, c] = spots[Math.floor(Math.random() * spots.length)];
  const g = grid.map(row => [...row]);
  g[r][c] = newTile(Math.random() < 0.85 ? 2 : 4, r, c);
  return g;
};

// Slide one row/col LEFT, return { row, merged, score }
const slideLeft = (line) => {
  const vals = line.filter(Boolean);
  const result = [];
  let score = 0;
  let i = 0;
  while (i < vals.length) {
    if (i + 1 < vals.length && vals[i].val === vals[i+1].val) {
      const merged = vals[i].val * 2;
      score += merged;
      result.push({ ...vals[i], val: merged, isMerged: true, isNew: false });
      i += 2;
    } else {
      result.push({ ...vals[i], isNew: false, isMerged: false });
      i++;
    }
  }
  while (result.length < line.length) result.push(null);
  return { row: result, score };
};

const transpose = (grid, size) => {
  const g = mkEmpty(size);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      g[c][r] = grid[r][c] ? { ...grid[r][c] } : null;
  return g;
};

const reverseRows = (grid, size) => {
  return grid.map(row => {
    const r = [...row].reverse();
    return r;
  });
};

const moveGrid = (grid, dir, size) => {
  let g = grid.map(row => row.map(t => t ? { ...t } : null));
  let totalScore = 0;
  let moved = false;
  const mergedVals = [];

  // Normalize to "slide left" by rotating
  if (dir === "right") g = reverseRows(g, size);
  else if (dir === "up")   g = transpose(g, size);
  else if (dir === "down") g = transpose(reverseRows(g, size), size);

  // Slide each row left
  const newG = g.map(row => {
    const { row: slid, score } = slideLeft(row);
    totalScore += score;
    // Check moved
    for (let i = 0; i < row.length; i++) {
      const a = row[i], b = slid[i];
      if ((!a && b) || (a && !b) || (a && b && a.val !== b.val)) moved = true;
    }
    // Collect merges
    slid.forEach(t => { if (t?.isMerged) mergedVals.push(t.val); });
    return slid;
  });

  // Un-rotate
  let finalG = newG;
  if (dir === "right") finalG = reverseRows(newG, size);
  else if (dir === "up")   finalG = transpose(newG, size);
  else if (dir === "down") finalG = reverseRows(transpose(newG, size), size);

  // Re-stamp positions
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (finalG[r][c]) finalG[r][c] = { ...finalG[r][c], r, c };

  return { grid: finalG, score: totalScore, moved, mergedVals };
};

const canMove = (grid, size) => {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) return true;
      if (c+1<size && grid[r][c+1] && grid[r][c].val === grid[r][c+1].val) return true;
      if (r+1<size && grid[r+1]    && grid[r][c].val === grid[r+1][c].val) return true;
    }
  }
  return false;
};

const maxTile = (grid, size) => {
  let m = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c] && grid[r][c].val > m) m = grid[r][c].val;
  return m;
};

// Serialize/deserialize grid for localStorage
const serGrid = (grid) => grid.map(row => row.map(t => t ? {val:t.val,r:t.r,c:t.c} : null));
const deserGrid = (raw) => raw.map(row => row.map(t => t ? newTile(t.val,t.r,t.c) : null));

// ============================================================================
// ── MAIN APP ──────────────────────────────────────────────────────────────────
// ============================================================================
export default function Flux2048() {
  const [mounted,   setMounted]   = useState(false);
  const [save,      setSave]      = useState(DEFAULT_SAVE);
  const [screen,    setScreen]    = useState("menu"); // menu|game|shop|settings|stats|gameover
  const [shopTab,   setShopTab]   = useState("themes");
  const [notif,     setNotif]     = useState(null);

  // ── Game State ──────────────────────────────────────────────────────────
  const [grid,      setGrid]      = useState(null);
  const [score,     setScore]     = useState(0);
  const [best,      setBest]      = useState(0);
  const [moves,     setMoves]     = useState(0);
  const [streak,    setStreak]    = useState(0);   // consecutive merges
  const [undos,     setUndos]     = useState(MAX_UNDOS);
  const [won,       setWon]       = useState(false);
  const [gameOver,  setGameOver]  = useState(false);
  const [mergeFlash,setMergeFlash]= useState(null); // { val, key }
  const [lastScore, setLastScore] = useState(0);
  const [comboMsg,  setComboMsg]  = useState(null);

  const historyRef = useRef([]); // for undo: [{grid, score}]
  const saveRef    = useRef(save);
  const gridSize   = BOARD_SIZES[save.activeBoard]?.size || 4;

  useEffect(() => { saveRef.current = save; }, [save]);

  // ── Persist ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SK);
      if (raw) {
        const p = JSON.parse(raw);
        const merged = { ...DEFAULT_SAVE, ...p, stats: { ...DEFAULT_SAVE.stats, ...(p.stats||{}) } };
        setSave(merged);
        setBest(merged.stats.bestScore || 0);
      }
    } catch (_) {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(SK, JSON.stringify(save)); } catch (_) {}
    }, 400);
    return () => clearTimeout(t);
  }, [save, mounted]);

  useEffect(() => {
    const flush = () => { try { localStorage.setItem(SK, JSON.stringify(saveRef.current)); } catch (_) {} };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  // ── Start Game ────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    ac();
    const sz = BOARD_SIZES[save.activeBoard]?.size || 4;
    let g = mkEmpty(sz);
    g = spawnRandom(g, sz);
    g = spawnRandom(g, sz);
    setGrid(g);
    setScore(0);
    setMoves(0);
    setStreak(0);
    setWon(false);
    setGameOver(false);
    setLastScore(0);
    setComboMsg(null);
    historyRef.current = [];
    const newUndos = Math.min(save.undosLeft + MAX_UNDOS, MAX_UNDOS * 2);
    setUndos(save.undosLeft);
    if (save.sfxOn) SFX.spawn();
    if (save.musicOn) startBG(save.musicStyle);
    setScreen("game");
  }, [save]);

  // ── Handle move ───────────────────────────────────────────────────────────
  const handleMove = useCallback((dir) => {
    if (!grid || gameOver || won) return;
    const sz = gridSize;
    const { grid: newGrid, score: gained, moved, mergedVals } = moveGrid(grid, dir, sz);
    if (!moved) return;

    // Push to undo history
    historyRef.current = [{ grid: grid.map(r=>[...r]), score }, ...historyRef.current].slice(0, 6);

    const newScore = score + gained;
    let newStreak = gained > 0 ? streak + mergedVals.length : 0;
    setMoves(m => m + 1);
    setStreak(newStreak);
    setLastScore(gained);

    // SFX
    if (save.sfxOn) {
      if (gained === 0) SFX.slide();
      else if (mergedVals.length > 0) {
        const maxV = Math.max(...mergedVals);
        if (maxV >= 512) SFX.bigMerge(maxV);
        else SFX.merge(maxV);
        if (newStreak >= 4) SFX.streak();
        else if (newStreak >= 2) SFX.combo(newStreak);
      }
    }

    // Combo message
    if (newStreak >= 3) {
      const msgs = ["COMBO!", "HOT STREAK!", "ON FIRE!", "UNSTOPPABLE!", "GODLIKE!"];
      setComboMsg(msgs[Math.min(Math.floor(newStreak/2)-1, msgs.length-1)]);
      setTimeout(() => setComboMsg(null), 1100);
    }

    // Merge flash
    if (mergedVals.length > 0) {
      const key = Date.now();
      setMergeFlash({ val: Math.max(...mergedVals), key });
      setTimeout(() => setMergeFlash(mf => mf?.key === key ? null : mf), 500);
    }

    // Spawn new tile
    const spawned = spawnRandom(newGrid, sz);
    setGrid(spawned);

    // Apply score multiplier
    const bm = save.activeMult && save.multGamesLeft > 0
      ? (MULTIPLIERS[save.activeMult]?.mult || 1) : 1;
    const finalGained = Math.floor(gained * bm);
    const finalScore  = score + finalGained;
    setScore(finalScore);
    if (finalScore > best) setBest(finalScore);

    // Win check
    const maxV = maxTile(spawned, sz);
    if (maxV >= WIN_VALUE && !won) {
      setWon(true);
      if (save.sfxOn) SFX.win();
    }

    // Game-over check
    if (!canMove(spawned, sz)) {
      setGameOver(true);
      if (save.sfxOn) SFX.gameover();
      stopBG();
      finalizeGame(finalScore, maxV);
    }
  }, [grid, score, streak, won, gameOver, save, best, gridSize]);

  const finalizeGame = (finalScore, maxV) => {
    const bm = saveRef.current.activeMult && saveRef.current.multGamesLeft > 0
      ? (MULTIPLIERS[saveRef.current.activeMult]?.mult || 1) : 1;
    const gems = Math.floor(finalScore / 50);

    setSave(prev => {
      const nml = Math.max(0, prev.multGamesLeft - (prev.activeMult ? 1 : 0));
      return {
        ...prev,
        gems: prev.gems + gems,
        activeMult: nml <= 0 ? null : prev.activeMult,
        multGamesLeft: nml,
        stats: {
          ...prev.stats,
          totalGames:   prev.stats.totalGames + 1,
          bestScore:    Math.max(prev.stats.bestScore, finalScore),
          bestTile:     Math.max(prev.stats.bestTile, maxV),
          best2048s:    prev.stats.best2048s + (maxV >= WIN_VALUE ? 1 : 0),
          totalGems:    prev.stats.totalGems + gems,
        },
      };
    });
    setTimeout(() => setScreen("gameover"), 900);
  };

  // ── Undo ──────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undos <= 0 || !historyRef.current.length) return;
    const prev = historyRef.current.shift();
    setGrid(prev.grid);
    setScore(prev.score);
    setUndos(u => u - 1);
    setStreak(0);
    if (save.sfxOn) SFX.undo();
  }, [undos, save.sfxOn]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    const onKey = (e) => {
      const map = { ArrowLeft:"left", ArrowRight:"right", ArrowUp:"up", ArrowDown:"down",
                    KeyA:"left", KeyD:"right", KeyW:"up", KeyS:"down" };
      if (map[e.code]) { e.preventDefault(); handleMove(map[e.code]); }
      if (e.code === "KeyZ" || e.code === "Backspace") { e.preventDefault(); handleUndo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, handleMove, handleUndo]);

  // ── Touch swipe ───────────────────────────────────────────────────────────
  const touchRef = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    touchRef.current = null;
    const ad = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ad, ay) < 30) return;
    if (ad > ay) handleMove(dx > 0 ? "right" : "left");
    else         handleMove(dy > 0 ? "down"  : "up");
  };

  // ── Shop purchase ─────────────────────────────────────────────────────────
  const purchase = (cat, key) => {
    ac();
    if (cat === "themes") {
      if (save.sfxOn) SFX.menu();
      setSave(p => ({ ...p, activeTheme: key }));
      notify(`Theme: ${THEMES[key]?.name}`);
      return;
    }
    if (cat === "multipliers") {
      const item = MULTIPLIERS[key]; if (!item) return;
      if (save.gems < item.cost) { if(save.sfxOn) SFX.deny(); notify("Not enough gems!", "#ff3366"); return; }
      if (save.sfxOn) SFX.buy();
      setSave(p => ({ ...p, gems: p.gems - item.cost, activeMult: key, multGamesLeft: item.uses }));
      notify(`${item.name} activated!`);
      return;
    }
    if (cat === "powerups") {
      const item = POWERUPS[key]; if (!item) return;
      if (save.gems < item.cost) { if(save.sfxOn) SFX.deny(); notify("Not enough gems!", "#ff3366"); return; }
      if (save.sfxOn) SFX.buy();
      setSave(p => ({ ...p, gems: p.gems - item.cost, undosLeft: (p.undosLeft||0) + (key==="undo"?3:0) }));
      notify(`${item.name} applied!`);
      return;
    }
    const MAP = {
      skins:  { active:"activeSkin",  unlocked:"unlockedSkins",  data:TILE_SKINS },
      boards: { active:"activeBoard", unlocked:"unlockedBoards", data:BOARD_SIZES },
      bgs:    { active:"activeBg",    unlocked:"unlockedBgs",    data:BACKGROUNDS },
      titles: { active:"activeTitle", unlocked:"unlockedTitles", data:TITLES },
    };
    const m = MAP[cat]; if (!m) return;
    const item = m.data[key]; if (!item) return;
    const cost = item.cost || 0;
    const owned = (save[m.unlocked]||[]).includes(key);
    if (owned) {
      if (save.sfxOn) SFX.menu();
      setSave(p => ({ ...p, [m.active]: key }));
      notify(`Equipped: ${item.name}`);
    } else if (save.gems >= cost) {
      if (save.sfxOn) SFX.buy();
      setSave(p => ({ ...p, gems: p.gems - cost, [m.unlocked]:[...(p[m.unlocked]||[]),key], [m.active]:key }));
      notify(`Unlocked: ${item.name}!`);
    } else {
      if (save.sfxOn) SFX.deny();
      notify("Not enough gems!", "#ff3366");
    }
  };

  const notify = (msg, color) => {
    setNotif({ msg, color: color || (THEMES[save.activeTheme]?.accent || "#7c6af7") });
    setTimeout(() => setNotif(null), 2500);
  };

  if (!mounted) return null;

  const theme  = THEMES[save.activeTheme]  || THEMES.obsidian;
  const titleD = TITLES[save.activeTitle]?.display || "🎲 Novice";

  return (
    <div style={{ minHeight:"100vh", width:"100vw", background:theme.bg, color:theme.textLight,
      fontFamily:"'Syne','Exo 2',sans-serif",
      display:"flex", flexDirection:"column", alignItems:"center",
      overflowX:"hidden", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Exo+2:wght@300;500;700;900&family=JetBrains+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;user-select:none;-webkit-tap-highlight-color:transparent;}
        body{margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{0%{transform:scale(0.4) rotate(-8deg);opacity:0}70%{transform:scale(1.12) rotate(1deg)}100%{transform:scale(1) rotate(0deg);opacity:1}}
        @keyframes tileNew{0%{transform:scale(0.5);opacity:0.4}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        @keyframes tileMerge{0%{transform:scale(1)}30%{transform:scale(1.22)}70%{transform:scale(0.95)}100%{transform:scale(1)}}
        @keyframes comboFloat{0%{opacity:1;transform:translate(-50%,-50%) scale(0.8)}50%{opacity:1;transform:translate(-50%,-70%) scale(1.1)}100%{opacity:0;transform:translate(-50%,-110%) scale(1)}}
        @keyframes scoreFloat{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-28px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.65}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes borderGlow{0%,100%{box-shadow:0 0 12px var(--ac)}50%{box-shadow:0 0 28px var(--ac),0 0 48px var(--ac)}}
        @keyframes slideIn{from{opacity:0;transform:scale(0.9) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes winPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
      `}</style>

      {/* Background pattern */}
      <BgLayer theme={theme} bgKey={save.activeBg} />

      {/* Notification */}
      {notif && (
        <div style={{ position:"fixed",top:14,left:"50%",zIndex:9999,
          padding:"9px 22px",borderRadius:10,background:"rgba(0,0,0,0.92)",
          border:`1px solid ${notif.color}`,color:notif.color,fontWeight:700,
          letterSpacing:2,fontSize:13,fontFamily:"'JetBrains Mono'",
          animation:"slideIn 0.22s ease both",boxShadow:`0 0 18px ${notif.color}44`,
          whiteSpace:"nowrap" }}>{notif.msg}</div>
      )}

      <div style={{ position:"relative",zIndex:2,width:"100%",display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 12px 32px" }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

        {screen === "menu" && (
          <MenuScreen save={save} theme={theme} titleD={titleD} best={best}
            onStart={startGame}
            onShop={()=>{ac();if(save.sfxOn)SFX.menu();setScreen("shop");}}
            onStats={()=>setScreen("stats")}
            onSettings={()=>setScreen("settings")} />
        )}
        {screen === "game" && (
          <GameScreen
            grid={grid} score={score} best={best} moves={moves}
            streak={streak} undos={undos} won={won} gameOver={gameOver}
            mergeFlash={mergeFlash} comboMsg={comboMsg} lastScore={lastScore}
            theme={theme} save={save} gridSize={gridSize}
            onMove={handleMove} onUndo={handleUndo}
            onMenu={()=>{ stopBG(); setScreen("menu"); }}
            onRestart={startGame} />
        )}
        {screen === "gameover" && (
          <GameOverScreen score={score} best={best} moves={moves}
            grid={grid} gridSize={gridSize} theme={theme} save={save}
            onRestart={startGame}
            onMenu={()=>setScreen("menu")} />
        )}
        {screen === "shop" && (
          <ShopScreen save={save} theme={theme} shopTab={shopTab} setShopTab={setShopTab}
            purchase={purchase} onBack={()=>{if(save.sfxOn)SFX.menu();setScreen("menu");}} />
        )}
        {screen === "settings" && (
          <SettingsScreen save={save} setSave={setSave} theme={theme}
            onBack={()=>setScreen("menu")} />
        )}
        {screen === "stats" && (
          <StatsScreen save={save} theme={theme} onBack={()=>setScreen("menu")} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ── BACKGROUND LAYER ─────────────────────────────────────────────────────────
// ============================================================================
function BgLayer({ theme, bgKey }) {
  const base = { position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0 };
  if (bgKey === "grid") return (
    <div style={{ ...base,
      backgroundImage:`linear-gradient(${theme.cellBg} 1px,transparent 1px),linear-gradient(90deg,${theme.cellBg} 1px,transparent 1px)`,
      backgroundSize:"40px 40px",opacity:0.5 }} />
  );
  if (bgKey === "dots") return (
    <div style={{ ...base,
      backgroundImage:`radial-gradient(${theme.cellBg} 1px, transparent 1px)`,
      backgroundSize:"28px 28px",opacity:0.6 }} />
  );
  if (bgKey === "circuit") return (
    <div style={{ ...base,
      backgroundImage:`linear-gradient(${theme.cellBg}88 1px,transparent 1px),linear-gradient(90deg,${theme.cellBg}88 1px,transparent 1px),linear-gradient(${theme.cellBg}44 1px,transparent 1px),linear-gradient(90deg,${theme.cellBg}44 1px,transparent 1px)`,
      backgroundSize:"80px 80px,80px 80px,20px 20px,20px 20px",opacity:0.7 }} />
  );
  if (bgKey === "nebula") return (
    <div style={{ ...base,
      background:`radial-gradient(ellipse 60% 40% at 20% 30%, ${theme.accent}15 0%, transparent 60%),radial-gradient(ellipse 40% 60% at 80% 70%, ${theme.accent2}12 0%, transparent 60%)` }} />
  );
  return <div style={{ ...base, background: bgKey === "void_" ? "#000" : "transparent" }} />;
}

// ============================================================================
// ── MENU SCREEN ───────────────────────────────────────────────────────────────
// ============================================================================
function MenuScreen({ save, theme, titleD, best, onStart, onShop, onStats, onSettings }) {
  const ac2 = theme.accent;
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:420,paddingTop:16,animation:"fadeUp 0.4s ease" }}>
      {/* Top bar */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",marginBottom:22 }}>
        <div style={{ fontSize:11,color:"#555",letterSpacing:2,padding:"4px 10px",border:"1px solid #1e1e1e",borderRadius:6,fontFamily:"'JetBrains Mono'" }}>{titleD}</div>
        <div style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,
          background:`${ac2}10`,border:`1px solid ${ac2}30`,color:"#ffd700",fontWeight:700,fontSize:14,fontFamily:"'JetBrains Mono'" }}>
          {save.gems.toLocaleString()} <span style={{fontSize:11,opacity:0.6}}>◆</span>
        </div>
      </div>

      {/* Logo */}
      <div style={{ textAlign:"center",marginBottom:4 }}>
        <div style={{ fontFamily:"Syne",fontSize:"clamp(52px,15vw,88px)",fontWeight:800,letterSpacing:-2,lineHeight:1,
          background:`linear-gradient(135deg,${ac2} 0%,${theme.accent2} 50%,#ffd700 100%)`,
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>
          FLUX
        </div>
        <div style={{ fontFamily:"'JetBrains Mono'",fontSize:11,letterSpacing:5,color:"#333",marginTop:0 }}>2048  OVERDRIVE</div>
      </div>

      {/* Best score */}
      <div style={{ display:"flex",gap:10,marginBottom:22,justifyContent:"center" }}>
        {[["BEST",best.toLocaleString()],["BOARD",BOARD_SIZES[save.activeBoard]?.name||"4×4"],["GAMES",save.stats.totalGames]].map(([l,v])=>(
          <div key={l} style={{ padding:"4px 12px",borderRadius:20,background:"rgba(255,255,255,0.03)",border:"1px solid #1e1e1e",fontSize:11 }}>
            <span style={{color:"#3a3a3a",marginRight:4,fontFamily:"'JetBrains Mono'"}}>{l}</span>
            <span style={{fontWeight:700,color:theme.textLight}}>{v}</span>
          </div>
        ))}
      </div>

      {save.activeMult && (
        <div style={{ width:"100%",marginBottom:14,padding:"7px 14px",borderRadius:8,
          background:`${theme.accent}0c`,border:`1px solid ${theme.accent}25`,
          color:theme.accent,fontSize:12,fontWeight:700,textAlign:"center",letterSpacing:1,fontFamily:"Syne" }}>
          ⚡ {MULTIPLIERS[save.activeMult]?.name} — {save.multGamesLeft} GAMES LEFT
        </div>
      )}

      {/* Start button */}
      <button onClick={onStart} style={{
        width:"100%",padding:"18px",marginBottom:12,
        background:`linear-gradient(135deg,${ac2}22,${theme.accent2}18)`,
        border:`2px solid ${ac2}`,color:ac2,cursor:"pointer",
        fontFamily:"Syne",fontSize:18,fontWeight:800,letterSpacing:3,borderRadius:14,
        transition:"all 0.2s",boxShadow:`0 0 24px ${ac2}22`,
      }} onMouseEnter={e=>{e.currentTarget.style.background=`${ac2}30`;e.currentTarget.style.boxShadow=`0 0 36px ${ac2}44`;e.currentTarget.style.transform="translateY(-2px)";}}
         onMouseLeave={e=>{e.currentTarget.style.background=`linear-gradient(135deg,${ac2}22,${theme.accent2}18)`;e.currentTarget.style.boxShadow=`0 0 24px ${ac2}22`;e.currentTarget.style.transform="none";}}>
        NEW GAME
      </button>

      <div style={{ display:"flex",gap:9,flexWrap:"wrap",justifyContent:"center" }}>
        {[[onShop,"🛒 SHOP"],[onStats,"📊 STATS"],[onSettings,"⚙️ CONFIG"]].map(([fn,lbl])=>(
          <button key={lbl} onClick={fn} style={{
            padding:"9px 16px",background:"transparent",border:"1px solid #222",color:"#444",
            cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:2,borderRadius:8,
            transition:"all 0.18s",fontFamily:"Syne",
          }} onMouseEnter={e=>{e.currentTarget.style.borderColor=ac2+"66";e.currentTarget.style.color=ac2;}}
             onMouseLeave={e=>{e.currentTarget.style.borderColor="#222";e.currentTarget.style.color="#444";}}
          >{lbl}</button>
        ))}
      </div>

      <div style={{ marginTop:14,fontSize:10,color:"#222",letterSpacing:2,textAlign:"center",lineHeight:2,fontFamily:"'JetBrains Mono'" }}>
        ARROW KEYS OR WASD · Z UNDO · SWIPE ON MOBILE
      </div>
    </div>
  );
}

// ============================================================================
// ── GAME SCREEN ───────────────────────────────────────────────────────────────
// ============================================================================
function GameScreen({ grid, score, best, moves, streak, undos, won, gameOver,
                      mergeFlash, comboMsg, lastScore, theme, save, gridSize,
                      onMove, onUndo, onMenu, onRestart }) {
  const ac2   = theme.accent;
  const maxW  = Math.min(460, typeof window!=="undefined" ? window.innerWidth - 24 : 460);
  const gap   = gridSize >= 6 ? 6 : gridSize === 5 ? 8 : 10;
  const cell  = Math.floor((maxW - gap*(gridSize+1)) / gridSize);
  const bSize = cell * gridSize + gap * (gridSize+1);

  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:480,animation:"fadeUp 0.3s ease" }}>

      {/* HUD */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",marginBottom:14 }}>
        <div style={{ display:"flex",gap:8 }}>
          <ScoreBox label="SCORE" value={score.toLocaleString()} color={ac2} sub={lastScore>0?`+${lastScore}`:null} />
          <ScoreBox label="BEST"  value={best.toLocaleString()}  color="#ffd700" />
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <ScoreBox label="MOVES" value={moves} color="#888" />
          {streak > 1 && <StreakBadge n={streak} color={ac2} />}
        </div>
      </div>

      {/* Board */}
      <div style={{ position:"relative" }}>
        {/* Combo popup */}
        {comboMsg && (
          <div style={{ position:"absolute",top:"42%",left:"50%",zIndex:50,
            fontFamily:"Syne",fontSize:"clamp(22px,6vw,34px)",fontWeight:800,
            color:ac2,textShadow:`0 0 20px ${ac2}`,letterSpacing:2,whiteSpace:"nowrap",
            animation:"comboFloat 1.1s ease forwards",pointerEvents:"none" }}>
            {comboMsg}
          </div>
        )}

        {/* Win overlay */}
        {won && !gameOver && (
          <div style={{ position:"absolute",inset:0,zIndex:40,background:"rgba(0,0,0,0.72)",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            borderRadius:16,backdropFilter:"blur(8px)",animation:"winPulse 2s ease infinite" }}>
            <div style={{ fontFamily:"Syne",fontSize:32,fontWeight:800,color:"#ffd700",letterSpacing:3,marginBottom:6,textShadow:"0 0 30px #ffd700" }}>YOU WIN!</div>
            <div style={{ fontSize:13,color:"#888",letterSpacing:2,marginBottom:20,fontFamily:"'JetBrains Mono'" }}>2048 ACHIEVED</div>
            <div style={{ display:"flex",gap:10 }}>
              <GBtn label="KEEP GOING" color={ac2} onClick={()=>{ /* just close won without restarting */ }} small />
              <GBtn label="NEW GAME" color="#ffd700" onClick={onRestart} small />
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {gameOver && (
          <div style={{ position:"absolute",inset:0,zIndex:40,background:"rgba(0,0,0,0.8)",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            borderRadius:16,backdropFilter:"blur(8px)" }}>
            <div style={{ fontFamily:"Syne",fontSize:28,fontWeight:800,color:"#ff3366",letterSpacing:3,marginBottom:4 }}>GAME OVER</div>
            <div style={{ fontSize:20,fontWeight:700,color:"#ffd700",marginBottom:20,fontFamily:"'JetBrains Mono'" }}>{score.toLocaleString()}</div>
            <div style={{ display:"flex",gap:10 }}>
              <GBtn label="RETRY" color={ac2} onClick={onRestart} />
              <GBtn label="MENU"  color="#444" onClick={onMenu} />
            </div>
          </div>
        )}

        {/* The actual board */}
        <div style={{
          width:bSize, height:bSize,
          background:theme.boardBg,
          borderRadius:16, padding:gap,
          border:`2px solid ${ac2}22`,
          boxShadow:theme.glow?`0 0 40px ${ac2}18,inset 0 0 30px rgba(0,0,0,0.4)`:`inset 0 0 30px rgba(0,0,0,0.4)`,
          display:"grid",
          gridTemplateColumns:`repeat(${gridSize},${cell}px)`,
          gridTemplateRows:`repeat(${gridSize},${cell}px)`,
          gap,
        }}>
          {/* Empty cells */}
          {Array.from({length:gridSize*gridSize}).map((_,i)=>(
            <div key={i} style={{ width:cell,height:cell,background:theme.cellBg,borderRadius:gridSize>=6?8:10 }} />
          ))}
        </div>

        {/* Tile layer (absolute positioned over board) */}
        <div style={{ position:"absolute",top:0,left:0,width:bSize,height:bSize,pointerEvents:"none" }}>
          {grid && grid.flat().filter(Boolean).map(tile => {
            const x = gap + tile.c * (cell + gap);
            const y = gap + tile.r * (cell + gap);
            return (
              <TileCell key={tile.id} tile={tile} x={x} y={y} size={cell}
                theme={theme} skin={save.activeSkin} gridSize={gridSize} />
            );
          })}
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display:"flex",gap:10,marginTop:16,justifyContent:"center",width:"100%",flexWrap:"wrap" }}>
        <GBtn label={`↩ UNDO (${undos})`} color={undos>0?ac2:"#333"} onClick={onUndo} disabled={undos<=0} small />
        <GBtn label="⟳ RESTART" color="#555" onClick={onRestart} small />
        <GBtn label="⟵ MENU"   color="#333" onClick={()=>{stopBG();onMenu();}} small />
      </div>
      <div style={{ marginTop:10,fontSize:10,color:"#222",letterSpacing:2,fontFamily:"'JetBrains Mono'" }}>
        ARROWS/WASD · Z=UNDO · SWIPE
      </div>
    </div>
  );
}

// ── Tile Cell ─────────────────────────────────────────────────────────────────
function TileCell({ tile, x, y, size, theme, skin, gridSize }) {
  const idx = Math.min(Math.log2(tile.val) - 1, theme.tiles.length - 1);
  const bg   = theme.tiles[Math.max(0, Math.floor(idx))] || theme.tiles[theme.tiles.length-1];
  const col  = theme.tileText[Math.max(0, Math.floor(idx))] || "#fff";
  const fs   = size >= 80 ? (tile.val >= 1000 ? 22 : tile.val >= 100 ? 26 : 32)
             : size >= 60 ? (tile.val >= 1000 ? 16 : tile.val >= 100 ? 20 : 24)
             : (tile.val >= 1000 ? 13 : tile.val >= 100 ? 15 : 18);
  const anim = tile.isMerged ? "tileMerge 0.18s ease" : tile.isNew ? "tileNew 0.15s ease" : "none";
  const br   = gridSize >= 6 ? 8 : 10;

  // Skin overlays
  const skinStyle = {};
  if (skin === "glossy") skinStyle.overflow = "hidden";
  if (skin === "neon") skinStyle.boxShadow = `0 0 12px ${bg},0 0 24px ${bg}66`;
  if (skin === "glass") skinStyle.backdropFilter = "blur(4px)";
  if (skin === "embossed") skinStyle.boxShadow = `3px 3px 0 rgba(0,0,0,0.4),-1px -1px 0 rgba(255,255,255,0.1)`;
  if (skin === "hologram") skinStyle.backgroundImage = `linear-gradient(135deg,${bg},${bg}cc,${bg}ee,${bg})`;

  return (
    <div style={{
      position:"absolute",
      left:x, top:y,
      width:size, height:size,
      background:bg,
      borderRadius:br,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"Syne", fontSize:fs, fontWeight:800,
      color:col,
      transition:"left 0.1s ease,top 0.1s ease",
      animation:anim,
      ...skinStyle,
    }}>
      {skin === "glossy" && (
        <div style={{ position:"absolute",top:3,left:3,right:"40%",height:"38%",background:"rgba(255,255,255,0.22)",borderRadius:4 }} />
      )}
      {tile.val.toLocaleString()}
    </div>
  );
}

function ScoreBox({ label, value, color, sub }) {
  return (
    <div style={{ padding:"6px 12px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",textAlign:"center",minWidth:72,position:"relative" }}>
      <div style={{ fontSize:8,letterSpacing:2,color:"#3a3a3a",fontFamily:"'JetBrains Mono'" }}>{label}</div>
      <div style={{ fontSize:16,fontWeight:800,color,fontFamily:"Syne" }}>{value}</div>
      {sub && <div style={{ position:"absolute",top:-14,right:4,fontSize:11,color,fontWeight:700,fontFamily:"Syne",animation:"scoreFloat 0.9s ease forwards" }}>{sub}</div>}
    </div>
  );
}

function StreakBadge({ n, color }) {
  return (
    <div style={{ padding:"4px 10px",borderRadius:20,background:`${color}18`,border:`1px solid ${color}44`,color,fontSize:11,fontWeight:800,fontFamily:"Syne",letterSpacing:1,animation:"pulse 0.8s ease infinite" }}>
      🔥 ×{n}
    </div>
  );
}

function GBtn({ label, color, onClick, disabled, small }) {
  const [h,setH] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        padding:small?"8px 14px":"11px 20px",
        background:h&&!disabled?`${color}1e`:"transparent",
        border:`1px solid ${disabled?"#222":color}`,
        color:disabled?"#333":color,
        cursor:disabled?"not-allowed":"pointer",
        borderRadius:8,fontSize:small?11:13,fontWeight:700,fontFamily:"Syne",
        letterSpacing:1,transition:"all 0.18s",
        boxShadow:h&&!disabled?`0 0 14px ${color}33`:"none",
      }}>{label}</button>
  );
}

// ============================================================================
// ── GAME OVER SCREEN ──────────────────────────────────────────────────────────
// ============================================================================
function GameOverScreen({ score, best, moves, grid, gridSize, theme, save, onRestart, onMenu }) {
  const ac2 = theme.accent;
  const gems = Math.floor(score / 50);
  const highest = grid ? maxTile(grid, gridSize) : 0;
  const isNewBest = score >= save.stats.bestScore;
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:400,paddingTop:16,animation:"fadeUp 0.45s ease" }}>
      <div style={{ fontFamily:"Syne",fontSize:"clamp(28px,8vw,46px)",fontWeight:800,color:"#ff3366",letterSpacing:3,textShadow:"0 0 20px #ff3366",marginBottom:4 }}>GAME OVER</div>
      {isNewBest && <div style={{ fontSize:12,color:"#ffd700",letterSpacing:3,marginBottom:4,fontFamily:"Syne",animation:"pulse 1s infinite" }}>✦ NEW RECORD ✦</div>}
      <div style={{ fontSize:11,color:"#2e2e2e",letterSpacing:4,marginBottom:20,fontFamily:"'JetBrains Mono'" }}>SESSION TERMINATED</div>

      <div style={{ background:"rgba(0,0,0,0.48)",border:`1px solid ${ac2}18`,borderRadius:14,padding:22,marginBottom:16,textAlign:"left",width:"100%" }}>
        {[
          ["FINAL SCORE", score.toLocaleString(), "#ffd700"],
          ["BEST SCORE",  best.toLocaleString(),  ac2],
          ["MOVES MADE",  moves,                  "#888"],
          ["HIGHEST TILE",highest.toLocaleString(),theme.accent2],
          ["BOARD SIZE",  BOARD_SIZES[save.activeBoard]?.name || "4×4", "#666"],
        ].map(([l,v,c])=>(
          <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ color:"#484848",fontSize:12,fontFamily:"Syne",fontWeight:600,letterSpacing:1 }}>{l}</span>
            <span style={{ color:c,fontWeight:700,fontSize:13,fontFamily:"'JetBrains Mono'" }}>{v}</span>
          </div>
        ))}
        <div style={{ display:"flex",justifyContent:"space-between",paddingTop:14,fontSize:17,fontWeight:800 }}>
          <span style={{ color:"#555",fontFamily:"Syne" }}>GEMS EARNED</span>
          <span style={{ color:"#ffd700",textShadow:"0 0 8px rgba(255,215,0,0.4)",fontFamily:"Syne" }}>+{gems.toLocaleString()} ◆</span>
        </div>
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:9,width:"100%" }}>
        {[[onRestart,"⟳ PLAY AGAIN",ac2],[onMenu,"⟵ MAIN MENU","#363636"]].map(([fn,lbl,c])=>(
          <button key={lbl} onClick={fn} style={{
            padding:"13px",background:"rgba(0,0,0,0.48)",border:`2px solid ${c}`,
            color:c,cursor:"pointer",fontWeight:700,fontSize:13,letterSpacing:2,borderRadius:11,
            transition:"all 0.18s",fontFamily:"Syne",
          }} onMouseEnter={e=>{e.currentTarget.style.background=`${c}1e`;e.currentTarget.style.boxShadow=`0 0 16px ${c}44`;}}
             onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,0,0,0.48)";e.currentTarget.style.boxShadow="none";}}>
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ── SHOP ─────────────────────────────────────────────────────────────────────
// ============================================================================
function ShopScreen({ save, theme, shopTab, setShopTab, purchase, onBack }) {
  const ac2 = theme.accent;
  const tabs = [
    {key:"themes",     label:"🎨 Themes"},
    {key:"skins",      label:"🧊 Tile Skins"},
    {key:"boards",     label:"⬛ Boards"},
    {key:"bgs",        label:"✦ Backgrounds"},
    {key:"titles",     label:"🏆 Titles"},
    {key:"multipliers",label:"⚡ Boosts"},
    {key:"powerups",   label:"🔮 Power-Ups"},
  ];

  const renderItems = () => {
    if (shopTab === "themes") {
      return Object.entries(THEMES).map(([k,t]) => (
        <SCard key={k} name={t.name} rarity={t.rarity||"FREE"} desc={t.rarity==="FREE"?"Always free":"Premium color theme"}
          cost={t.cost||0} owned={true} equip={save.activeTheme===k} canAfford={true}
          onSelect={()=>purchase("themes",k)} theme={theme}>
          <div style={{ display:"flex",gap:3,marginBottom:8,flexWrap:"wrap" }}>
            {t.tiles.slice(0,8).map((c,i)=>( <div key={i} style={{ width:12,height:12,borderRadius:2,background:c,boxShadow:t.glow?`0 0 4px ${c}77`:"none" }} /> ))}
          </div>
        </SCard>
      ));
    }
    if (shopTab === "multipliers") {
      return Object.entries(MULTIPLIERS).map(([k,item])=>(
        <SCard key={k} name={item.name} rarity={item.rarity} desc={item.desc}
          cost={item.cost} owned={false} equip={save.activeMult===k}
          canAfford={save.gems>=item.cost}
          onSelect={()=>purchase("multipliers",k)} theme={theme}
          badge={save.activeMult===k?`${save.multGamesLeft} LEFT`:null} />
      ));
    }
    if (shopTab === "powerups") {
      return Object.entries(POWERUPS).map(([k,item])=>(
        <SCard key={k} name={item.name} rarity={item.rarity} desc={item.desc}
          cost={item.cost} owned={false} equip={false} canAfford={save.gems>=item.cost}
          onSelect={()=>purchase("powerups",k)} theme={theme} />
      ));
    }
    const DS = { skins:TILE_SKINS, boards:BOARD_SIZES, bgs:BACKGROUNDS, titles:TITLES };
    const UM = { skins:"unlockedSkins", boards:"unlockedBoards", bgs:"unlockedBgs", titles:"unlockedTitles" };
    const AM = { skins:"activeSkin", boards:"activeBoard", bgs:"activeBg", titles:"activeTitle" };
    return Object.entries(DS[shopTab]||{}).map(([k,item])=>{
      const owned = (save[UM[shopTab]]||[]).includes(k);
      return (
        <SCard key={k} name={item.name||k} rarity={item.rarity||"FREE"} desc={item.desc||""}
          cost={item.cost||0} owned={owned} equip={save[AM[shopTab]]===k}
          canAfford={save.gems>=(item.cost||0)} onSelect={()=>purchase(shopTab,k)} theme={theme} />
      );
    });
  };

  return (
    <div style={{ width:"100%",maxWidth:900,animation:"fadeUp 0.4s ease" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,padding:"0 2px" }}>
        <div style={{ fontFamily:"Syne",fontSize:18,fontWeight:800,color:ac2,letterSpacing:3 }}>GEM MARKET</div>
        <div style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 13px",borderRadius:20,
          background:`${ac2}0a`,border:`1px solid ${ac2}22`,color:"#ffd700",fontWeight:700,fontSize:13,fontFamily:"'JetBrains Mono'" }}>
          {save.gems.toLocaleString()} ◆
        </div>
      </div>

      <div style={{ display:"flex",overflowX:"auto",borderBottom:"1px solid #111",marginBottom:14,scrollbarWidth:"none" }}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>{if(save.sfxOn)SFX.menu();setShopTab(t.key);}} style={{
            flexShrink:0,padding:"9px 13px",background:"transparent",border:"none",cursor:"pointer",
            color:shopTab===t.key?ac2:"#383838",fontSize:11,fontWeight:700,letterSpacing:1,
            borderBottom:`2px solid ${shopTab===t.key?ac2:"transparent"}`,transition:"all 0.18s",fontFamily:"Syne",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(168px,1fr))",gap:10,maxHeight:"56vh",overflowY:"auto",padding:"2px 2px 8px" }}>
        {renderItems()}
      </div>

      <button onClick={onBack} style={{
        marginTop:12,padding:"10px 20px",background:"transparent",border:`1px solid #222`,
        color:"#444",cursor:"pointer",borderRadius:7,fontWeight:700,letterSpacing:2,fontSize:11,fontFamily:"Syne",transition:"all 0.18s",
      }} onMouseEnter={e=>{e.currentTarget.style.borderColor=ac2+"55";e.currentTarget.style.color=ac2;}}
         onMouseLeave={e=>{e.currentTarget.style.borderColor="#222";e.currentTarget.style.color="#444";}}>
        ← EXIT MARKET
      </button>
    </div>
  );
}

function SCard({ name, rarity, desc, cost, owned, equip, canAfford, onSelect, theme, children, badge }) {
  const [h,setH] = useState(false);
  const rc = RARITY_C[rarity] || "#777";
  const ac2 = theme.accent;
  return (
    <div onClick={onSelect}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ padding:12,borderRadius:11,cursor:"pointer",position:"relative",
        border:`2px solid ${equip?ac2:h?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)"}`,
        background:equip?`${ac2}0d`:h?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.38)",
        opacity:!canAfford&&!owned?0.48:1,
        boxShadow:equip?`0 0 14px ${ac2}28`:"none",
        transition:"all 0.18s",transform:h&&!equip?"translateY(-2px)":"none" }}>
      {badge&&<div style={{ position:"absolute",top:7,right:7,padding:"2px 7px",borderRadius:4,background:ac2,color:theme.textDark,fontSize:9,fontWeight:800,letterSpacing:1 }}>{badge}</div>}
      {equip&&!badge&&<div style={{ position:"absolute",top:7,right:7,padding:"2px 7px",borderRadius:4,background:ac2,color:theme.textDark,fontSize:9,fontWeight:800,letterSpacing:1 }}>ON</div>}
      <div style={{ fontSize:8,color:rc,fontWeight:700,letterSpacing:2,marginBottom:5,fontFamily:"'JetBrains Mono'" }}>{rarity}</div>
      {children}
      <div style={{ fontSize:13,fontWeight:700,marginBottom:2,fontFamily:"Syne",color:theme.textLight }}>{name}</div>
      <div style={{ fontSize:11,color:"#4a4a4a",marginBottom:8,lineHeight:1.4 }}>{desc}</div>
      <div style={{ fontSize:11,fontWeight:700,color:owned&&cost>0?ac2:canAfford?"#ffd700":"#383838",fontFamily:"'JetBrains Mono'" }}>
        {cost===0?"FREE":owned?"OWNED":`${cost.toLocaleString()} ◆`}
      </div>
    </div>
  );
}

// ============================================================================
// ── SETTINGS ─────────────────────────────────────────────────────────────────
// ============================================================================
function SettingsScreen({ save, setSave, theme, onBack }) {
  const ac2 = theme.accent;
  const tog = k => setSave(p=>({...p,[k]:!p[k]}));
  return (
    <div style={{ width:"100%",maxWidth:400,animation:"fadeUp 0.4s ease" }}>
      <div style={{ fontFamily:"Syne",fontSize:18,fontWeight:800,color:ac2,letterSpacing:3,marginBottom:18 }}>SETTINGS</div>

      <div style={{ background:"rgba(0,0,0,0.44)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:13,overflow:"hidden",marginBottom:12 }}>
        {[
          ["musicOn",  "🎵 Music",       "Ambient background music"],
          ["sfxOn",    "🔊 Sound FX",    "Merge & move sounds"],
          ["showAnim", "✨ Animations",  "Tile merge animations"],
          ["showStreak","🔥 Streak HUD", "Show streak counter"],
        ].map(([k,label,desc])=>(
          <div key={k} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"13px 17px",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <div>
              <div style={{ fontWeight:700,fontSize:13,fontFamily:"Syne",color:theme.textLight }}>{label}</div>
              <div style={{ fontSize:11,color:"#3e3e3e" }}>{desc}</div>
            </div>
            <div onClick={()=>tog(k)} style={{
              width:42,height:23,borderRadius:12,cursor:"pointer",position:"relative",
              background:save[k]?ac2:"#1c1c1c",transition:"all 0.22s",
              border:`1px solid ${save[k]?ac2+"55":"#282828"}`,
              boxShadow:save[k]?`0 0 9px ${ac2}44`:"none",
            }}>
              <div style={{ position:"absolute",top:2,left:save[k]?19:2,width:17,height:17,
                borderRadius:"50%",background:save[k]?theme.textDark:"#404040",transition:"left 0.22s" }} />
            </div>
          </div>
        ))}

        {/* Music style */}
        <div style={{ padding:"13px 17px" }}>
          <div style={{ fontWeight:700,fontSize:13,fontFamily:"Syne",letterSpacing:1,marginBottom:9,color:theme.textLight }}>🎼 Music Style</div>
          <div style={{ display:"flex",gap:7,flexWrap:"wrap" }}>
            {Object.entries(MUSIC_STYLES).map(([k,ms])=>(
              <button key={k} onClick={()=>setSave(p=>({...p,musicStyle:k}))} style={{
                padding:"5px 12px",borderRadius:7,transition:"all 0.18s",
                border:`1px solid ${save.musicStyle===k?ac2:"#252525"}`,
                background:save.musicStyle===k?`${ac2}18`:"transparent",
                color:save.musicStyle===k?ac2:"#3e3e3e",
                cursor:"pointer",fontSize:11,fontWeight:700,textTransform:"uppercase",fontFamily:"Syne",
              }}>{ms.name}</button>
            ))}
          </div>
        </div>

        {/* Reset */}
        <div style={{ padding:"13px 17px",borderTop:"1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontWeight:700,fontSize:13,fontFamily:"Syne",marginBottom:4,color:theme.textLight }}>⚠️ Reset Progress</div>
          <div style={{ fontSize:11,color:"#3e3e3e",marginBottom:9 }}>Wipe all gems, unlocks & stats</div>
          <button onClick={()=>{if(window.confirm("Reset ALL progress? Cannot be undone.")){localStorage.removeItem(SK);setSave({...DEFAULT_SAVE});}}} style={{
            padding:"7px 14px",background:"transparent",border:"1px solid #ff336640",
            color:"#ff3366",cursor:"pointer",borderRadius:7,fontSize:11,fontWeight:700,fontFamily:"Syne",transition:"all 0.18s",
          }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,51,102,0.08)"}
             onMouseLeave={e=>e.currentTarget.style.background="transparent"}>FACTORY RESET</button>
        </div>
      </div>

      <button onClick={()=>{if(save.sfxOn)SFX.menu();onBack();}} style={{
        padding:"11px 20px",background:"rgba(0,0,0,0.38)",border:`2px solid ${ac2}`,
        color:ac2,cursor:"pointer",borderRadius:8,fontWeight:700,letterSpacing:2,
        fontSize:12,fontFamily:"Syne",transition:"all 0.18s",
      }} onMouseEnter={e=>e.currentTarget.style.background=`${ac2}18`}
         onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.38)"}>← BACK</button>
    </div>
  );
}

// ============================================================================
// ── STATS ─────────────────────────────────────────────────────────────────────
// ============================================================================
function StatsScreen({ save, theme, onBack }) {
  const ac2 = theme.accent;
  const s = save.stats;
  const rows = [
    ["Total Games",      s.totalGames],
    ["Best Score",       s.bestScore.toLocaleString()],
    ["Highest Tile",     s.bestTile.toLocaleString()],
    ["Times Hit 2048",   s.best2048s],
    ["Total Moves",      s.totalGames > 0 ? Math.round(s.totalMoves/s.totalGames)+" avg" : "—"],
    ["Gems Earned",      `${s.totalGems.toLocaleString()} ◆`],
    ["Current Gems",     `${save.gems.toLocaleString()} ◆`],
  ];
  return (
    <div style={{ width:"100%",maxWidth:380,animation:"fadeUp 0.4s ease" }}>
      <div style={{ fontFamily:"Syne",fontSize:18,fontWeight:800,color:ac2,letterSpacing:3,marginBottom:18 }}>STATISTICS</div>
      <div style={{ background:"rgba(0,0,0,0.44)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:13 }}>
        {rows.map(([l,v],i)=>(
          <div key={l} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"11px 17px",borderBottom:i<rows.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
            <span style={{ color:"#484848",fontSize:13,fontFamily:"Syne",fontWeight:600 }}>{l}</span>
            <span style={{ color:ac2,fontWeight:700,fontSize:13,fontFamily:"'JetBrains Mono'" }}>{v}</span>
          </div>
        ))}
      </div>
      <button onClick={()=>{if(save.sfxOn)SFX.menu();onBack();}} style={{
        marginTop:14,padding:"11px 20px",background:"rgba(0,0,0,0.38)",border:`2px solid ${ac2}`,
        color:ac2,cursor:"pointer",borderRadius:8,fontWeight:700,letterSpacing:2,fontSize:12,fontFamily:"Syne",transition:"all 0.18s",
      }} onMouseEnter={e=>e.currentTarget.style.background=`${ac2}18`}
         onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.38)"}>← BACK</button>
    </div>
  );
}