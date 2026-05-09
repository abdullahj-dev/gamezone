'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================================
// ── AUDIO ENGINE ─────────────────────────────────────────────────────────────
// ============================================================================
let _AC = null;
const getAC = () => {
  if (typeof window === "undefined") return null;
  try {
    if (!_AC) _AC = new (window.AudioContext || window.webkitAudioContext)();
    if (_AC.state === "suspended") _AC.resume();
    return _AC;
  } catch (e) { return null; }
};
const note = (freq, dur, type = "square", vol = 0.07, delay = 0) => {
  try {
    const ac = getAC(); if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, dur));
    o.start(t); o.stop(t + Math.max(0.02, dur) + 0.01);
  } catch (_) {}
};
const SFX = {
  move:     () => note(260, 0.04, "square", 0.03),
  rotate:   () => note(420, 0.06, "triangle", 0.05),
  lock:     () => { note(120, 0.07, "sawtooth", 0.06); note(80, 0.1, "sawtooth", 0.04, 0.06); },
  clear1:   () => { note(523, 0.08, "square", 0.08); note(659, 0.09, "square", 0.08, 0.09); note(784, 0.12, "square", 0.08, 0.18); },
  clear2:   () => [523,659,784,1047].forEach((f,i) => note(f, 0.1, "square", 0.09, i*0.07)),
  clear3:   () => [659,784,1047,1319].forEach((f,i) => note(f, 0.11, "triangle", 0.1, i*0.06)),
  tetris:   () => [784,1047,1319,1568,2093].forEach((f,i) => note(f, 0.12, "square", 0.11, i*0.05)),
  tspin:    () => { note(440,0.05,"square",0.09); note(880,0.06,"square",0.09,0.06); note(1760,0.14,"triangle",0.1,0.12); },
  hold:     () => note(330, 0.08, "triangle", 0.06),
  level:    () => [440,554,659,880].forEach((f,i) => note(f, 0.1, "square", 0.09, i*0.06)),
  gameover: () => [440,330,220,165,110].forEach((f,i) => note(f, 0.22, "sawtooth", 0.09, i*0.14)),
  hardDrop: () => { note(90, 0.06, "sawtooth", 0.09); note(60, 0.12, "sawtooth", 0.06, 0.06); },
  combo:    (n) => note(Math.min(1800, 380 * Math.pow(1.18, n)), 0.1, "triangle", 0.1),
  menu:     () => note(660, 0.06, "triangle", 0.05),
  buy:      () => { note(880, 0.07, "square", 0.08); note(1100, 0.11, "triangle", 0.08, 0.09); },
  deny:     () => note(110, 0.15, "sawtooth", 0.08),
};

// ── MUSIC ENGINE ─────────────────────────────────────────────────────────────
let _musicTimer = null;
let _musicBeat  = 0;
const SCALES = {
  classic: [261,294,330,349,392,440,494],
  cyber:   [220,261,311,370,440,523,622],
  acid:    [196,220,261,311,370,440,523],
  ghost:   [174,196,220,261,311,370,440],
};
const startMusic = (level = 1, scaleName = "classic") => {
  stopMusic();
  const scale   = SCALES[scaleName] || SCALES.classic;
  const melody  = [0,4,2,5,3,6,1,4,0,3,5,2,4,1,6,3];
  const bassMap = [0,0,4,4,2,2,5,5];
  _musicBeat = 0;
  const bpm  = Math.min(210, 116 + level * 7);
  const ivl  = Math.round(60000 / bpm / 2);
  _musicTimer = setInterval(() => {
    try {
      const b  = _musicBeat % melody.length;
      const bs = _musicBeat % bassMap.length;
      note(scale[melody[b]], 0.11, "square", 0.032);
      if (_musicBeat % 2 === 0) note((scale[bassMap[bs]] || 130) / 2, 0.2, "sawtooth", 0.022);
      _musicBeat++;
    } catch (_) {}
  }, ivl);
};
const stopMusic = () => { clearInterval(_musicTimer); _musicTimer = null; };

// ============================================================================
// ── TETROMINO DATA ────────────────────────────────────────────────────────────
// ============================================================================
const STORAGE_KEY = "TETRIS_OVERDRIVE_V5";

// Raw cell definitions (x,y) — origin top-left
const TETROMINO_DEFS = {
  I: [[0,0],[1,0],[2,0],[3,0]],
  O: [[0,0],[1,0],[0,1],[1,1]],
  T: [[1,0],[0,1],[1,1],[2,1]],
  S: [[1,0],[2,0],[0,1],[1,1]],
  Z: [[0,0],[1,0],[1,1],[2,1]],
  J: [[0,0],[0,1],[1,1],[2,1]],
  L: [[2,0],[0,1],[1,1],[2,1]],
};
const PIECE_KEYS = ["I","O","T","S","Z","J","L"];

// Normalise so min-x=0, min-y=0
const normCells = (cells) => {
  const minX = Math.min(...cells.map(c => c[0]));
  const minY = Math.min(...cells.map(c => c[1]));
  return cells.map(c => [c[0]-minX, c[1]-minY]);
};
// Rotate 90° clockwise
const rotateCW = (cells) => {
  const maxX = Math.max(...cells.map(c => c[0]));
  return normCells(cells.map(([x,y]) => [y, maxX-x]));
};

// Pre-compute all 4 rotations for every piece at module level
const ALL_ROTS = {};   // ALL_ROTS["T"][0..3] = [[x,y],...]
PIECE_KEYS.forEach(k => {
  const r0 = normCells(TETROMINO_DEFS[k]);
  const r1 = rotateCW(r0);
  const r2 = rotateCW(r1);
  const r3 = rotateCW(r2);
  ALL_ROTS[k] = [r0, r1, r2, r3];
});

// Safe getter — never throws
const getRot = (piece, rot) => {
  if (!piece || !ALL_ROTS[piece]) return [];
  return ALL_ROTS[piece][((rot % 4) + 4) % 4] || [];
};

// SRS wall-kick offsets  [from-rotation-index] → list of (dx,dy) to try
const KICKS_JLSTZ = [
  [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
];
const KICKS_I = [
  [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
];
const getKicks = (piece, fromRot) => {
  const table = piece === "I" ? KICKS_I : KICKS_JLSTZ;
  return table[((fromRot % 4) + 4) % 4] || [[0,0]];
};

// ============================================================================
// ── VISUAL / SHOP DATA ────────────────────────────────────────────────────────
// ============================================================================
const THEMES = {
  neon:   { name:"Neon Grid",    bg:"#04040a", grid:"#0b0b1a", I:"#00e5ff", O:"#ffd700", T:"#cc44ff", S:"#00ff44", Z:"#ff3366", J:"#4488ff", L:"#ff8800", ghost:"rgba(255,255,255,0.09)", glow:true },
  retro:  { name:"Retro Arcade", bg:"#0a0005", grid:"#130008", I:"#ff0088", O:"#ffff00", T:"#ff00ff", S:"#00ff88", Z:"#ff4400", J:"#4488ff", L:"#ffaa00", ghost:"rgba(255,80,255,0.1)",   glow:true },
  ice:    { name:"Frozen Void",  bg:"#000d1a", grid:"#001525", I:"#88eeff", O:"#aaddff", T:"#ccbbff", S:"#88ffdd", Z:"#aaccff", J:"#77aaff", L:"#99ddff", ghost:"rgba(136,238,255,0.09)",glow:true },
  lava:   { name:"Magma Core",   bg:"#0a0200", grid:"#160400", I:"#ff4400", O:"#ffaa00", T:"#ff2200", S:"#ff6600", Z:"#ff0000", J:"#ff8800", L:"#ffcc00", ghost:"rgba(255,100,0,0.09)",  glow:true },
  mono:   { name:"Monochrome",   bg:"#050505", grid:"#0d0d0d", I:"#ffffff", O:"#dddddd", T:"#bbbbbb", S:"#aaaaaa", Z:"#888888", J:"#777777", L:"#cccccc", ghost:"rgba(255,255,255,0.07)",glow:false },
  forest: { name:"Bio Matrix",   bg:"#010a01", grid:"#031303", I:"#00ff44", O:"#88ff00", T:"#44ff88", S:"#00cc44", Z:"#88cc00", J:"#00ff88", L:"#ccff00", ghost:"rgba(0,255,68,0.08)",  glow:true },
  galaxy: { name:"Galaxy Core",  bg:"#010010", grid:"#07000f", I:"#cc44ff", O:"#ff44cc", T:"#8844ff", S:"#ff44ff", Z:"#4488ff", J:"#ff8844", L:"#44ffcc", ghost:"rgba(180,100,255,0.09)",glow:true },
  sunset: { name:"Sunset Drive", bg:"#0a0006", grid:"#13000a", I:"#ff6688", O:"#ffaa44", T:"#ff44aa", S:"#ffdd44", Z:"#ff2255", J:"#ff88aa", L:"#ffcc44", ghost:"rgba(255,100,150,0.09)",glow:true },
};

const SKINS = {
  classic:   { name:"Classic",       cost:0,     rarity:"FREE",      desc:"Clean flat blocks" },
  glossy:    { name:"Glossy Gem",    cost:500,   rarity:"COMMON",    desc:"Shiny highlight" },
  rounded:   { name:"Soft Rounded",  cost:2000,  rarity:"UNCOMMON",  desc:"Rounded corners" },
  neon_edge: { name:"Neon Edge",     cost:3500,  rarity:"RARE",      desc:"Glowing border" },
  diamond:   { name:"Crystal",       cost:6000,  rarity:"EPIC",      desc:"Faceted gem look" },
  plasma:    { name:"Plasma Cell",   cost:10000, rarity:"LEGENDARY", desc:"Pulsing energy" },
};
const BOARDS = {
  classic: { name:"Classic",    cols:10, rows:20, cost:0,     rarity:"FREE",      desc:"Standard 10×20" },
  narrow:  { name:"Narrow",     cols:8,  rows:20, cost:800,   rarity:"COMMON",    desc:"8×20 — tight!" },
  wide:    { name:"Wide",       cols:12, rows:20, cost:1500,  rarity:"UNCOMMON",  desc:"12×20 — more room" },
  tall:    { name:"Skyscraper", cols:10, rows:24, cost:2500,  rarity:"RARE",      desc:"10×24 — vertical danger" },
  arena:   { name:"Arena",      cols:14, rows:22, cost:5000,  rarity:"EPIC",      desc:"14×22 — max chaos" },
};
const GRAVITY_MODES = {
  normal:  { name:"Normal",  desc:"Standard fall speed",    mult:1.0, cost:0,    rarity:"FREE" },
  fast:    { name:"Turbo",   desc:"+50% faster gravity",    mult:1.5, cost:500,  rarity:"COMMON" },
  ultra:   { name:"Ultra",   desc:"2× gravity multiplier",  mult:2.0, cost:1500, rarity:"RARE" },
  instant: { name:"Instant", desc:"Near-instant lock",      mult:3.5, cost:5000, rarity:"EPIC" },
};
const TITLES = {
  newbie:      { name:"Newbie",       display:"🎮 Newbie",        cost:0,     rarity:"FREE" },
  stacker:     { name:"Stacker",      display:"🧱 Stacker",       cost:300,   rarity:"COMMON" },
  spinner:     { name:"Spin Doctor",  display:"🌀 Spin Doctor",   cost:1000,  rarity:"UNCOMMON" },
  phantom:     { name:"Phantom",      display:"👻 Phantom",       cost:3000,  rarity:"RARE" },
  tspin_king:  { name:"T-Spin King",  display:"♛ T-Spin King",   cost:8000,  rarity:"EPIC" },
  grandmaster: { name:"Grandmaster",  display:"🏆 Grandmaster",   cost:20000, rarity:"LEGENDARY" },
  god:         { name:"God",          display:"⚡ God of Tetris", cost:75000, rarity:"DIVINE" },
};
const XP_BOOSTS = {
  b1: { name:"1.5× Score", mult:1.5, uses:5, cost:500,  rarity:"COMMON",    desc:"5 games at 1.5× score" },
  b2: { name:"2× Score",   mult:2.0, uses:3, cost:1500, rarity:"RARE",      desc:"3 games at double score" },
  b3: { name:"3× Score",   mult:3.0, uses:2, cost:4000, rarity:"LEGENDARY", desc:"2 games at triple score" },
};
const RARITY_COLORS = {
  FREE:"#777", COMMON:"#aaa", UNCOMMON:"#00cc44", RARE:"#0099ff",
  EPIC:"#bb44ff", LEGENDARY:"#ff9900", DIVINE:"#ffd700",
};
const DEFAULT_SAVE = {
  coins:0,
  activeTheme:"neon",
  activeSkin:"classic",      unlockedSkins:["classic"],
  activeBoard:"classic",     unlockedBoards:["classic"],
  activeGravity:"normal",    unlockedGravity:["normal"],
  activeTitle:"newbie",      unlockedTitles:["newbie"],
  activeBoost:null,          boostGamesLeft:0,
  musicScale:"classic",      musicEnabled:true, sfxEnabled:true,
  showGhost:true,            showGrid:true,
  stats:{ totalGames:0, totalLines:0, maxScore:0, maxLevel:0, maxCombo:0, totalTetris:0, totalTSpins:0 },
};

// ============================================================================
// ── GAME ENGINE (pure ref-based, no stale-closure issues) ────────────────────
// ============================================================================
function useEngine(save) {
  const cfg  = BOARDS[save.activeBoard] || BOARDS.classic;
  const COLS = cfg.cols;
  const ROWS = cfg.rows;

  const mkBoard = () => Array.from({length:ROWS}, () => Array(COLS).fill(null));

  // All mutable game state lives in one ref so callbacks never go stale
  const G = useRef({
    board:    mkBoard(),
    piece:    null,   // "T" | null
    rot:      0,
    x:        0,
    y:        0,
    queue:    [],     // upcoming pieces
    held:     null,
    canHold:  true,
    score:    0,
    lines:    0,
    level:    1,
    combo:    0,
    phase:    "idle", // idle | playing | paused | over
    rStats:   { tetris:0, tspins:0, hardDrops:0 },
    bag:      [],
  });

  // React state — only what needs to trigger renders
  const [tick,    forceRender] = useState(0);
  const [clearRows, setClearRows] = useState([]);
  const [lastAction, setLastAction] = useState("");

  const render = useCallback(() => forceRender(n => n+1), []);

  const dropTimer = useRef(null);
  const lockTimer = useRef(null);
  const sfxOn     = useRef(save.sfxEnabled);
  const musicOn   = useRef(save.musicEnabled);
  const scaleRef  = useRef(save.musicScale);
  sfxOn.current   = save.sfxEnabled;
  musicOn.current = save.musicEnabled;
  scaleRef.current = save.musicScale;

  // ── Bag randomiser ──────────────────────────────────────────────────────
  const drawPiece = useCallback(() => {
    const g = G.current;
    if (g.bag.length === 0) {
      g.bag = [...PIECE_KEYS].sort(() => Math.random() - 0.5);
    }
    return g.bag.shift();
  }, []);

  // Fill queue to 4 pieces
  const fillQueue = useCallback(() => {
    const g = G.current;
    while (g.queue.length < 4) g.queue.push(drawPiece());
  }, [drawPiece]);

  // ── Collision ────────────────────────────────────────────────────────────
  const collides = useCallback((piece, rot, tx, ty, board) => {
    if (!piece) return false;
    const cells = getRot(piece, rot);
    const brd   = board || G.current.board;
    for (const [cx, cy] of cells) {
      const nx = tx + cx, ny = ty + cy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && brd[ny] && brd[ny][nx]) return true;
    }
    return false;
  }, [COLS, ROWS]);

  // ── Spawn X for a piece ──────────────────────────────────────────────────
  const spawnX = useCallback((piece, rot = 0) => {
    const cells = getRot(piece, rot);
    if (!cells.length) return 0;
    const maxX = Math.max(...cells.map(c => c[0]));
    return Math.floor((COLS - maxX - 1) / 2);
  }, [COLS]);

  // ── Stop all timers ──────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    clearInterval(dropTimer.current); dropTimer.current = null;
    clearTimeout(lockTimer.current);  lockTimer.current = null;
  }, []);

  // ── Ghost Y ──────────────────────────────────────────────────────────────
  const ghostY = useCallback(() => {
    const g = G.current;
    if (!g.piece) return g.y;
    let gy = g.y;
    while (!collides(g.piece, g.rot, g.x, gy + 1, g.board)) gy++;
    return gy;
  }, [collides]);

  // ── Lock piece + line clear ──────────────────────────────────────────────
  const lockPiece = useCallback(() => {
    clearTimers();
    const g = G.current;
    if (!g.piece) return;
    const cells = getRot(g.piece, g.rot);

    // Stamp piece onto board
    const newBoard = g.board.map(r => [...r]);
    let offScreen = false;
    cells.forEach(([cx, cy]) => {
      const nx = g.x + cx, ny = g.y + cy;
      if (ny < 0) { offScreen = true; return; }
      if (ny < ROWS && nx >= 0 && nx < COLS) newBoard[ny][nx] = g.piece;
    });

    if (sfxOn.current) SFX.lock();

    if (offScreen) {
      // Piece locked above playfield → game over
      g.phase = "over";
      g.piece = null;
      render();
      if (sfxOn.current) SFX.gameover();
      return;
    }

    // Find full rows
    const full = [];
    newBoard.forEach((row, i) => { if (row.every(c => c !== null)) full.push(i); });

    g.piece = null; // hide active piece during clear animation
    g.board = newBoard;
    // Snapshot the board NOW so the timeout closure is immune to any later mutation
    const boardSnapshot = newBoard.map(r => [...r]);
    clearTimers(); // CRITICAL: stop drop loop so lockPiece cannot fire again during animation
    render();

    if (full.length > 0) {
      setClearRows(full);
      setTimeout(() => {
        setClearRows([]);
        const g2 = G.current;

        // Remove full rows from the snapshot (not from g2.board which may have changed)
        const kept = boardSnapshot.filter((_, i) => !full.includes(i));
        while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
        // Write cleaned board back
        g2.board = kept;
        g2.board = kept;

        // Score
        const pts        = [0,100,300,500,800][Math.min(full.length, 4)];
        g2.combo         += 1;
        const comboBonus = g2.combo > 1 ? (g2.combo - 1) * 50 * g2.level : 0;
        g2.score         += pts * g2.level + comboBonus;
        g2.lines         += full.length;
        const newLevel    = Math.floor(g2.lines / 10) + 1;
        const levelUp     = newLevel > g2.level;
        if (levelUp) g2.level = newLevel;

        // Run stats
        const isTetris = full.length >= 4;
        if (isTetris) g2.rStats.tetris++;

        // SFX
        if (sfxOn.current) {
          if (isTetris)           SFX.tetris();
          else if (full.length===3) SFX.clear3();
          else if (full.length===2) SFX.clear2();
          else                      SFX.clear1();
          if (g2.combo > 1)       SFX.combo(g2.combo);
          if (levelUp)            SFX.level();
        }

        // Action label
        let act = isTetris ? "✦ TETRIS ✦" : `${full.length} LINE${full.length>1?"S":""}`;
        if (g2.combo > 1) act += `  ×${g2.combo} COMBO`;
        setLastAction(act);
        setTimeout(() => setLastAction(a => a === act ? "" : a), 1600);

        // Spawn next
        if (musicOn.current && levelUp) startMusic(g2.level, scaleRef.current);
        spawnNext();
      }, 170);
    } else {
      G.current.combo = 0;
      spawnNext();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ROWS, COLS, clearTimers, render, collides]);

  // ── Spawn next piece from queue ───────────────────────────────────────────
  const spawnNext = useCallback(() => {
    const g = G.current;
    fillQueue();
    let next = g.queue.shift();
    fillQueue();

    // Safety guard: next must be a valid piece key string
    if (!next || !ALL_ROTS[next]) {
      g.bag = []; g.queue = [];
      fillQueue();
      next = g.queue.shift() || "T";
      fillQueue();
    }

    const sx = spawnX(next, 0);

    // Game-over check
    if (collides(next, 0, sx, 0, g.board)) {
      g.piece  = null;
      g.phase  = "over";
      render();
      if (sfxOn.current) SFX.gameover();
      return;
    }

    g.piece   = next;
    g.rot     = 0;
    g.x       = sx;
    g.y       = 0;
    g.canHold = true;
    render();
    startDropLoop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillQueue, spawnX, collides, render]);

  // ── Drop loop ─────────────────────────────────────────────────────────────
  const startDropLoop = useCallback(() => {
    clearTimers();
    const g      = G.current;
    const gMult  = (GRAVITY_MODES[save.activeGravity]?.mult) || 1;
    const speed  = Math.max(40, Math.round((1000 - (g.level - 1) * 48) / gMult));

    dropTimer.current = setInterval(() => {
      const g2 = G.current;
      if (g2.phase !== "playing" || !g2.piece) { clearTimers(); return; }
      if (!collides(g2.piece, g2.rot, g2.x, g2.y + 1, g2.board)) {
        g2.y++;
        render();
      } else {
        clearInterval(dropTimer.current); dropTimer.current = null;
        lockTimer.current = setTimeout(lockPiece, 440);
      }
    }, speed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.activeGravity, clearTimers, render, lockPiece, collides]);

  // ── Public controls ───────────────────────────────────────────────────────
  const moveLeft = useCallback(() => {
    const g = G.current;
    if (g.phase !== "playing" || !g.piece) return;
    if (!collides(g.piece, g.rot, g.x - 1, g.y, g.board)) {
      g.x--;
      render();
      if (sfxOn.current) SFX.move();
    }
  }, [collides, render]);

  const moveRight = useCallback(() => {
    const g = G.current;
    if (g.phase !== "playing" || !g.piece) return;
    if (!collides(g.piece, g.rot, g.x + 1, g.y, g.board)) {
      g.x++;
      render();
      if (sfxOn.current) SFX.move();
    }
  }, [collides, render]);

  const softDrop = useCallback(() => {
    const g = G.current;
    if (g.phase !== "playing" || !g.piece) return;
    if (!collides(g.piece, g.rot, g.x, g.y + 1, g.board)) {
      g.y++;
      g.score++;
      render();
    }
  }, [collides, render]);

  const hardDrop = useCallback(() => {
    const g = G.current;
    if (g.phase !== "playing" || !g.piece) return;
    clearTimers();
    let gy = g.y;
    while (!collides(g.piece, g.rot, g.x, gy + 1, g.board)) gy++;
    g.score += (gy - g.y) * 2;
    g.y = gy;
    g.rStats.hardDrops++;
    render();
    if (sfxOn.current) SFX.hardDrop();
    lockTimer.current = setTimeout(lockPiece, 30);
  }, [collides, clearTimers, render, lockPiece]);

  const rotate = useCallback((dir = 1) => {
    const g = G.current;
    if (g.phase !== "playing" || !g.piece) return;
    const newRot  = ((g.rot + dir) % 4 + 4) % 4;
    const kicks   = getKicks(g.piece, g.rot);
    for (const [kx, ky] of kicks) {
      const nx = g.x + kx, ny = g.y + ky;
      if (!collides(g.piece, newRot, nx, ny, g.board)) {
        g.rot = newRot;
        g.x   = nx;
        g.y   = ny;
        render();
        if (sfxOn.current) SFX.rotate();
        if (g.piece === "T") {
          g.rStats.tspins++;
          setLastAction("T-SPIN!");
          if (sfxOn.current) SFX.tspin();
          setTimeout(() => setLastAction(a => a === "T-SPIN!" ? "" : a), 1200);
        }
        return;
      }
    }
  }, [collides, render]);

  const hold = useCallback(() => {
    const g = G.current;
    if (g.phase !== "playing" || !g.piece || !g.canHold) return;
    if (sfxOn.current) SFX.hold();
    clearTimers();
    if (g.held) {
      const prev = g.held;
      g.held   = g.piece;
      g.piece  = prev;
      g.rot    = 0;
      g.x      = spawnX(prev, 0);
      g.y      = 0;
      g.canHold = false;
      render();
      startDropLoop();
    } else {
      g.held   = g.piece;
      g.piece  = null;
      g.canHold = false;
      render();
      spawnNext();
    }
  }, [clearTimers, spawnX, render, spawnNext, startDropLoop]);

  const pauseGame = useCallback(() => {
    const g = G.current;
    if (g.phase === "playing") {
      clearTimers();
      stopMusic();
      g.phase = "paused";
      render();
    } else if (g.phase === "paused") {
      g.phase = "playing";
      render();
      if (musicOn.current) startMusic(g.level, scaleRef.current);
      startDropLoop();
    }
  }, [clearTimers, render, startDropLoop]);

  const startGame = useCallback(() => {
    clearTimers();
    stopMusic();
    const g    = G.current;
    g.board    = mkBoard();
    g.piece    = null;
    g.rot      = 0;
    g.x        = 0;
    g.y        = 0;
    g.queue    = [];
    g.bag      = [];
    g.held     = null;
    g.canHold  = true;
    g.score    = 0;
    g.lines    = 0;
    g.level    = 1;
    g.combo    = 0;
    g.phase    = "playing";
    g.rStats   = { tetris:0, tspins:0, hardDrops:0 };
    setLastAction("");
    setClearRows([]);
    fillQueue();
    render();
    if (musicOn.current) startMusic(1, scaleRef.current);
    spawnNext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimers, fillQueue, render, spawnNext]);

  const setPhase = useCallback((p) => { G.current.phase = p; render(); }, [render]);

  // Expose a snapshot of G for rendering (read-only)
  const snap = G.current;
  return {
    // render state
    board:snap.board, piece:snap.piece, rot:snap.rot, x:snap.x, y:snap.y,
    queue:snap.queue, held:snap.held, canHold:snap.canHold,
    score:snap.score, lines:snap.lines, level:snap.level, combo:snap.combo,
    phase:snap.phase, rStats:snap.rStats,
    // extra render state
    clearRows, lastAction,
    // helpers
    ghostY,
    // actions
    startGame, pauseGame, hardDrop, softDrop, hold, rotate, moveLeft, moveRight, setPhase,
    COLS, ROWS,
  };
}

// ============================================================================
// ── MAIN APP ──────────────────────────────────────────────────────────────────
// ============================================================================
export default function TetrisOverdrive() {
  const [mounted,      setMounted]      = useState(false);
  const [save,         setSave]         = useState(DEFAULT_SAVE);
  const [screen,       setScreen]       = useState("menu");
  const [shopTab,      setShopTab]      = useState("themes");
  const [notif,        setNotif]        = useState(null);

  // ── Persist ────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setSave({ ...DEFAULT_SAVE, ...p, stats:{ ...DEFAULT_SAVE.stats, ...(p.stats||{}) } });
      }
    } catch (_) {}
    setMounted(true);
  }, []);

  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; }, [save]);

  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch (_) {}
    }, 400);
    return () => clearTimeout(t);
  }, [save, mounted]);

  useEffect(() => {
    const flush = () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saveRef.current)); } catch (_) {}
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  const engine = useEngine(save);
  const theme  = THEMES[save.activeTheme] || THEMES.neon;

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    const DAS=130, ARR=38, SOFT=55;
    let dasL=null, dasR=null, arrL=null, arrR=null, softT=null;

    const kd = (e) => {
      if (e.repeat) return;
      getAC();
      switch (e.code) {
        case "ArrowLeft":
          e.preventDefault(); engine.moveLeft();
          clearTimeout(dasL); clearInterval(arrL);
          dasL = setTimeout(() => { arrL = setInterval(engine.moveLeft, ARR); }, DAS);
          break;
        case "ArrowRight":
          e.preventDefault(); engine.moveRight();
          clearTimeout(dasR); clearInterval(arrR);
          dasR = setTimeout(() => { arrR = setInterval(engine.moveRight, ARR); }, DAS);
          break;
        case "ArrowDown":
          e.preventDefault(); engine.softDrop();
          softT = setInterval(engine.softDrop, SOFT);
          break;
        case "ArrowUp":   e.preventDefault(); engine.rotate(1);  break;
        case "KeyX":      e.preventDefault(); engine.rotate(1);  break;
        case "KeyZ":      e.preventDefault(); engine.rotate(-1); break;
        case "Space":     e.preventDefault(); engine.hardDrop(); break;
        case "KeyC":
        case "ShiftLeft": e.preventDefault(); engine.hold();     break;
        case "KeyP":
        case "Escape":    e.preventDefault(); engine.pauseGame(); break;
      }
    };
    const ku = (e) => {
      if (e.code === "ArrowLeft")  { clearTimeout(dasL); clearInterval(arrL); }
      if (e.code === "ArrowRight") { clearTimeout(dasR); clearInterval(arrR); }
      if (e.code === "ArrowDown")  { clearInterval(softT); }
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      clearTimeout(dasL); clearTimeout(dasR);
      clearInterval(arrL); clearInterval(arrR); clearInterval(softT);
    };
  }, [screen, engine]);

  // ── Game-over → save stats ────────────────────────────────────────────
  useEffect(() => {
    if (engine.phase === "over" && screen === "game") {
      stopMusic();
      const bm = (save.activeBoost && save.boostGamesLeft > 0)
        ? (XP_BOOSTS[save.activeBoost]?.mult || 1) : 1;
      const earned = Math.floor(engine.score * bm);
      setSave(prev => {
        const nbl = Math.max(0, prev.boostGamesLeft - (prev.activeBoost ? 1 : 0));
        return {
          ...prev, coins: prev.coins + earned,
          activeBoost: nbl <= 0 ? null : prev.activeBoost,
          boostGamesLeft: nbl,
          stats: {
            ...prev.stats,
            totalGames:  prev.stats.totalGames + 1,
            totalLines:  prev.stats.totalLines + engine.lines,
            maxScore:    Math.max(prev.stats.maxScore, engine.score),
            maxLevel:    Math.max(prev.stats.maxLevel, engine.level),
            maxCombo:    Math.max(prev.stats.maxCombo, engine.combo),
            totalTetris: prev.stats.totalTetris + engine.rStats.tetris,
            totalTSpins: prev.stats.totalTSpins + engine.rStats.tspins,
          },
        };
      });
      setTimeout(() => setScreen("gameover"), 700);
    }
  }, [engine.phase]); // eslint-disable-line

  const notify = (msg, color) => {
    setNotif({ msg, color: color || theme.I });
    setTimeout(() => setNotif(null), 2300);
  };

  // ── Shop purchase ─────────────────────────────────────────────────────
  const purchase = (cat, key) => {
    getAC();
    if (cat === "themes") {
      if (save.sfxEnabled) SFX.menu();
      setSave(p => ({ ...p, activeTheme: key }));
      notify(`Theme: ${THEMES[key]?.name}`);
      return;
    }
    if (cat === "xpboosts") {
      const item = XP_BOOSTS[key]; if (!item) return;
      if (save.coins < item.cost) { if (save.sfxEnabled) SFX.deny(); notify("Not enough coins!", "#ff3366"); return; }
      if (save.sfxEnabled) SFX.buy();
      setSave(p => ({ ...p, coins: p.coins - item.cost, activeBoost: key, boostGamesLeft: item.uses }));
      notify(`${item.name} activated!`);
      return;
    }
    const MAP = {
      skins:   { active:"activeSkin",    unlocked:"unlockedSkins",    data:SKINS },
      boards:  { active:"activeBoard",   unlocked:"unlockedBoards",   data:BOARDS },
      gravity: { active:"activeGravity", unlocked:"unlockedGravity",  data:GRAVITY_MODES },
      titles:  { active:"activeTitle",   unlocked:"unlockedTitles",   data:TITLES },
    };
    const m = MAP[cat]; if (!m) return;
    const item = m.data[key]; if (!item) return;
    const owned = (save[m.unlocked] || []).includes(key);
    if (owned) {
      if (save.sfxEnabled) SFX.menu();
      setSave(p => ({ ...p, [m.active]: key }));
      notify(`Equipped: ${item.name}`);
    } else if (save.coins >= item.cost) {
      if (save.sfxEnabled) SFX.buy();
      setSave(p => ({
        ...p, coins: p.coins - item.cost,
        [m.unlocked]: [...(p[m.unlocked]||[]), key],
        [m.active]: key,
      }));
      notify(`Unlocked: ${item.name}!`);
    } else {
      if (save.sfxEnabled) SFX.deny();
      notify("Not enough coins!", "#ff3366");
    }
  };

  if (!mounted) return null;

  const titleDisplay = TITLES[save.activeTitle]?.display || "🎮 Newbie";

  return (
    <div style={{ minHeight:"100vh", width:"100vw", background:theme.bg, color:"#fff",
      fontFamily:"'Rajdhani','Orbitron',monospace",
      display:"flex", flexDirection:"column", alignItems:"center",
      overflow:"hidden", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box;user-select:none;-webkit-tap-highlight-color:transparent;}
        body{margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#252525;border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes floatUp{0%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-56px)}}
        @keyframes clearFlash{0%{filter:brightness(1)}40%{filter:brightness(2.8);transform:scaleX(1.04)}100%{filter:brightness(0);transform:scaleX(0);opacity:0}}
        @keyframes scanline{0%{background-position:0 0}100%{background-position:0 40px}}
        @keyframes titlePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}
        @keyframes popIn{from{opacity:0;transform:translate(-50%,0) scale(0.85)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
        @keyframes comboPop{0%{opacity:0;transform:scale(0.5)}60%{transform:scale(1.2)}100%{opacity:1;transform:scale(1)}}
      `}</style>

      {/* Scanlines */}
      <div style={{ position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:10,
        backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.09) 3px,rgba(0,0,0,0.09) 4px)",
        animation:"scanline 9s linear infinite", opacity:0.4 }} />
      {/* Grid */}
      <div style={{ position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0,
        backgroundImage:`linear-gradient(${theme.grid} 1px,transparent 1px),linear-gradient(90deg,${theme.grid} 1px,transparent 1px)`,
        backgroundSize:"42px 42px", opacity:0.26 }} />

      {/* Notification */}
      {notif && (
        <div style={{ position:"fixed",top:14,left:"50%",zIndex:999,
          padding:"9px 22px",borderRadius:8,background:"rgba(0,0,0,0.9)",
          border:`1px solid ${notif.color}`,color:notif.color,
          fontWeight:700,letterSpacing:2,fontSize:13,fontFamily:"Rajdhani",
          animation:"popIn 0.22s ease both",boxShadow:`0 0 18px ${notif.color}44`,
          whiteSpace:"nowrap" }}>{notif.msg}</div>
      )}

      <div style={{ position:"relative",zIndex:2,width:"100%",display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 10px 30px" }}>
        {screen === "menu" && (
          <MenuScreen save={save} theme={theme} titleDisplay={titleDisplay} engine={engine}
            onStart={() => { getAC(); engine.startGame(); setScreen("game"); }}
            onShop={() => { getAC(); if(save.sfxEnabled)SFX.menu(); setScreen("shop"); }}
            onStats={() => setScreen("stats")}
            onSettings={() => setScreen("settings")} />
        )}
        {screen === "game" && (
          <GameScreen engine={engine} theme={theme} save={save}
            onBack={() => { stopMusic(); engine.setPhase("idle"); setScreen("menu"); }} />
        )}
        {screen === "gameover" && (
          <GameOverScreen engine={engine} theme={theme} save={save}
            onRestart={() => { getAC(); engine.startGame(); setScreen("game"); }}
            onMenu={() => setScreen("menu")} />
        )}
        {screen === "shop" && (
          <ShopScreen save={save} theme={theme} shopTab={shopTab} setShopTab={setShopTab}
            purchase={purchase} onBack={() => { if(save.sfxEnabled)SFX.menu(); setScreen("menu"); }} />
        )}
        {screen === "settings" && (
          <SettingsScreen save={save} setSave={setSave} theme={theme} onBack={() => setScreen("menu")} />
        )}
        {screen === "stats" && (
          <StatsScreen save={save} theme={theme} onBack={() => setScreen("menu")} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ── MENU ─────────────────────────────────────────────────────────────────────
// ============================================================================
function MenuScreen({ save, theme, titleDisplay, engine, onStart, onShop, onStats, onSettings }) {
  const diffs = [
    { label:"CASUAL",  sub:"Slow & relaxed",  color:"#00ff44" },
    { label:"NORMAL",  sub:"Standard game",   color:theme.I },
    { label:"HARD",    sub:"Faster gravity",  color:"#ff9900" },
    { label:"EXPERT",  sub:"2× gravity",      color:"#ff4488" },
    { label:"GOD",     sub:"Near-instant",    color:"#ffd700" },
  ];
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",width:"100%",maxWidth:440,paddingTop:14,animation:"fadeUp 0.4s ease" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",marginBottom:18 }}>
        <div style={{ fontSize:11,color:"#444",letterSpacing:2,padding:"4px 10px",border:"1px solid #1c1c1c",borderRadius:6,fontFamily:"'Share Tech Mono'" }}>{titleDisplay}</div>
        <div style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,
          background:"rgba(255,215,0,0.07)",border:"1px solid rgba(255,215,0,0.22)",color:"#ffd700",fontWeight:700,fontSize:14,fontFamily:"'Share Tech Mono'" }}>
          {save.coins.toLocaleString()} <span style={{fontSize:11,opacity:0.6}}>⬡</span>
        </div>
      </div>

      <div style={{ textAlign:"center",marginBottom:6 }}>
        <div style={{ fontFamily:"Orbitron",fontSize:"clamp(44px,12vw,76px)",fontWeight:900,letterSpacing:5,lineHeight:1,
          background:`linear-gradient(135deg,${theme.I} 0%,${theme.T} 55%,${theme.O} 100%)`,
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",
          animation:"titlePulse 2.8s ease-in-out infinite" }}>
          TETRIS
        </div>
        <div style={{ fontFamily:"'Share Tech Mono'",fontSize:10,letterSpacing:6,color:"#2e2e2e",marginTop:2 }}>OVERDRIVE  V5</div>
      </div>

      <div style={{ display:"flex",gap:8,marginBottom:18,justifyContent:"center" }}>
        {[["BEST",save.stats.maxScore.toLocaleString()],["LV",save.stats.maxLevel],["LINES",save.stats.totalLines.toLocaleString()]].map(([l,v])=>(
          <div key={l} style={{ padding:"3px 11px",borderRadius:20,background:"rgba(255,255,255,0.03)",border:"1px solid #1a1a1a",fontSize:11 }}>
            <span style={{color:"#3a3a3a",marginRight:4,fontFamily:"'Share Tech Mono'"}}>{l}</span>
            <span style={{fontWeight:700}}>{v}</span>
          </div>
        ))}
      </div>

      {save.activeBoost && (
        <div style={{ width:"100%",marginBottom:12,padding:"7px 14px",borderRadius:8,
          background:"rgba(255,153,0,0.07)",border:"1px solid rgba(255,153,0,0.24)",
          color:"#ffaa00",fontSize:12,fontWeight:700,textAlign:"center",letterSpacing:1,fontFamily:"Rajdhani" }}>
          ⚡ {XP_BOOSTS[save.activeBoost]?.name} — {save.boostGamesLeft} GAMES LEFT
        </div>
      )}

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,width:"100%",marginBottom:10 }}>
        {diffs.map(d => <DiffBtn key={d.label} {...d} onClick={onStart} />)}
      </div>
      <DiffBtn label="⚡ QUICK START" sub="Normal difficulty" color={theme.I} onClick={onStart} full />

      <div style={{ display:"flex",gap:9,marginTop:16,flexWrap:"wrap",justifyContent:"center" }}>
        {[[onShop,"🛒 SHOP"],[onStats,"📊 STATS"],[onSettings,"⚙️ CONFIG"]].map(([fn,lbl])=>(
          <button key={lbl} onClick={fn} style={{
            padding:"9px 15px",background:"transparent",border:"1px solid #252525",color:"#4a4a4a",
            cursor:"pointer",fontWeight:700,fontSize:12,letterSpacing:2,borderRadius:8,
            transition:"all 0.18s",fontFamily:"Rajdhani",
          }} onMouseEnter={e=>{e.currentTarget.style.borderColor=theme.I+"88";e.currentTarget.style.color=theme.I;}}
             onMouseLeave={e=>{e.currentTarget.style.borderColor="#252525";e.currentTarget.style.color="#4a4a4a";}}
          >{lbl}</button>
        ))}
      </div>
      <div style={{ marginTop:12,fontSize:10,color:"#252525",letterSpacing:2,textAlign:"center",lineHeight:2,fontFamily:"'Share Tech Mono'" }}>
        ← → MOVE · ↑/X ROTATE · Z CCW · SPACE HARD DROP · C HOLD · P PAUSE
      </div>
    </div>
  );
}

function DiffBtn({ label, sub, color, onClick, full }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ gridColumn:full?"1/-1":undefined,
        padding:"12px 8px",background:h?`${color}12`:"rgba(0,0,0,0.35)",
        border:`2px solid ${h?color:color+"28"}`,color,cursor:"pointer",
        borderRadius:11,transition:"all 0.18s",textAlign:"center",fontFamily:"Rajdhani",
        boxShadow:h?`0 0 16px ${color}28`:"none" }}>
      <div style={{ fontFamily:"Orbitron",fontSize:13,fontWeight:700,letterSpacing:2 }}>{label}</div>
      <div style={{ fontSize:11,color:h?color+"aa":"#3a3a3a",marginTop:2,fontFamily:"'Share Tech Mono'" }}>{sub}</div>
    </button>
  );
}

// ============================================================================
// ── GAME SCREEN ───────────────────────────────────────────────────────────────
// ============================================================================
function GameScreen({ engine, theme, save, onBack }) {
  const { board, piece, rot, x, y, queue, held, canHold, score, lines, level, combo,
          phase, clearRows, lastAction, ghostY, hardDrop, hold, rotate,
          moveLeft, moveRight, softDrop, pauseGame, COLS, ROWS } = engine;

  // Responsive cell size
  const CELL = typeof window !== "undefined"
    ? Math.max(18, Math.min(
        Math.floor((window.innerHeight - 120) / ROWS),
        Math.floor(window.innerWidth * 0.55 / COLS)
      ))
    : 26;

  // Compute ghost
  const gy = (phase === "playing" && piece) ? ghostY() : y;

  // Build display grid
  const grid = board.map(r => [...r]);
  if (piece) {
    const cells = getRot(piece, rot);
    // Ghost first (so active piece paints over it)
    if (save.showGhost && gy !== y) {
      cells.forEach(([cx, cy]) => {
        const gx2 = x+cx, gy2 = gy+cy;
        if (gy2 >= 0 && gy2 < ROWS && gx2 >= 0 && gx2 < COLS && !grid[gy2][gx2]) {
          grid[gy2][gx2] = "__ghost__";
        }
      });
    }
    // Active piece
    cells.forEach(([cx, cy]) => {
      const px2 = x+cx, py2 = y+cy;
      if (py2 >= 0 && py2 < ROWS && px2 >= 0 && px2 < COLS) grid[py2][px2] = piece;
    });
  }

  const colorOf = (cell) => {
    if (!cell || cell === "__ghost__") return null;
    return theme[cell] || "#666";
  };

  // Touch handling
  const tRef = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    tRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  };
  const onTouchEnd = (e) => {
    if (!tRef.current) return;
    const dx = e.changedTouches[0].clientX - tRef.current.x;
    const dy = e.changedTouches[0].clientY - tRef.current.y;
    const dt = Date.now() - tRef.current.t;
    tRef.current = null;
    if (Math.abs(dx)<14 && Math.abs(dy)<14 && dt<220) { getAC(); rotate(1); return; }
    if (Math.abs(dx) > Math.abs(dy)) { getAC(); if(dx>18) moveRight(); else moveLeft(); }
    else if (dy > 24) { getAC(); hardDrop(); }
  };

  return (
    <div style={{ display:"flex",gap:10,alignItems:"flex-start",justifyContent:"center",width:"100%",maxWidth:860 }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* LEFT */}
      <div style={{ display:"flex",flexDirection:"column",gap:8,width:92,flexShrink:0 }}>
        <SidePanel label="HOLD" theme={theme}>
          <PiecePrev piece={held} theme={theme} faded={!canHold} />
        </SidePanel>
        <SidePanel label="SCORE" theme={theme}>
          <div style={{ fontFamily:"'Share Tech Mono'",fontSize:12,color:"#ffd700",textAlign:"center",fontWeight:700,wordBreak:"break-all" }}>
            {score.toLocaleString()}
          </div>
        </SidePanel>
        <SidePanel label="LEVEL" theme={theme}>
          <div style={{ fontFamily:"Orbitron",fontSize:21,fontWeight:900,color:theme.I,textAlign:"center",textShadow:`0 0 8px ${theme.I}88` }}>{level}</div>
        </SidePanel>
        <SidePanel label="LINES" theme={theme}>
          <div style={{ fontFamily:"'Share Tech Mono'",fontSize:15,color:theme.S,textAlign:"center",fontWeight:700 }}>{lines}</div>
        </SidePanel>
        {combo > 1 && (
          <SidePanel label="COMBO" theme={theme}>
            <div style={{ fontFamily:"Orbitron",fontSize:17,fontWeight:900,color:theme.O,textAlign:"center",
              textShadow:`0 0 10px ${theme.O}`,animation:"comboPop 0.25s ease" }}>×{combo}</div>
          </SidePanel>
        )}
      </div>

      {/* BOARD */}
      <div style={{ position:"relative",flexShrink:0 }}>
        {lastAction && (
          <div style={{ position:"absolute",top:-32,left:"50%",
            fontFamily:"Orbitron",fontSize:14,fontWeight:900,color:theme.T,
            textShadow:`0 0 12px ${theme.T}`,whiteSpace:"nowrap",pointerEvents:"none",zIndex:20,
            animation:"floatUp 1.6s ease forwards",letterSpacing:2 }}>{lastAction}</div>
        )}

        <div style={{
          display:"grid",
          gridTemplateColumns:`repeat(${COLS},${CELL}px)`,
          gridTemplateRows:`repeat(${ROWS},${CELL}px)`,
          gap:1, background:theme.grid,
          border:`2px solid ${theme.I}30`,
          borderRadius:4, overflow:"hidden",
          boxShadow:theme.glow?`0 0 26px ${theme.I}15,inset 0 0 24px rgba(0,0,0,0.5)`:"none",
        }}>
          {grid.map((row, ri) => row.map((cell, ci) => {
            const isGhost   = cell === "__ghost__";
            const color     = colorOf(cell);
            const isClearing = clearRows.includes(ri);
            return (
              <div key={`${ri}-${ci}`} style={{
                width:CELL, height:CELL,
                background: isGhost ? theme.ghost : (color || "rgba(0,0,0,0.5)"),
                borderRadius: save.activeSkin === "rounded" ? 3 : 1,
                border: save.showGrid
                  ? (color && !isGhost ? `1px solid ${color}60` : "1px solid rgba(255,255,255,0.022)")
                  : "none",
                boxShadow: color && !isGhost && theme.glow ? `0 0 5px ${color}50` : "none",
                animation: isClearing ? "clearFlash 0.17s ease both" : "none",
                position:"relative", overflow:"hidden",
              }}>
                {color && !isGhost && save.activeSkin === "glossy" && (
                  <div style={{ position:"absolute",top:1,left:1,width:"46%",height:"38%",background:"rgba(255,255,255,0.3)",borderRadius:2 }} />
                )}
                {color && !isGhost && save.activeSkin === "neon_edge" && (
                  <>
                    <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:color,opacity:0.85 }} />
                    <div style={{ position:"absolute",left:0,top:0,bottom:0,width:2,background:color,opacity:0.6 }} />
                  </>
                )}
                {color && !isGhost && save.activeSkin === "diamond" && (
                  <div style={{ position:"absolute",top:"10%",left:"22%",width:"54%",height:"46%",
                    background:"rgba(255,255,255,0.22)",clipPath:"polygon(50% 0%,100% 50%,50% 100%,0% 50%)" }} />
                )}
              </div>
            );
          }))}
        </div>

        {phase === "paused" && (
          <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",
            flexDirection:"column",alignItems:"center",justifyContent:"center",
            borderRadius:4,backdropFilter:"blur(5px)",zIndex:20 }}>
            <div style={{ fontFamily:"Orbitron",fontSize:24,fontWeight:900,color:theme.I,letterSpacing:4,marginBottom:6 }}>PAUSED</div>
            <div style={{ fontSize:11,color:"#3a3a3a",letterSpacing:2,fontFamily:"'Share Tech Mono'" }}>P  TO  RESUME</div>
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div style={{ display:"flex",flexDirection:"column",gap:8,width:92,flexShrink:0 }}>
        <SidePanel label="NEXT" theme={theme}>
          {/* Show only the very next piece, large and clear */}
          <PiecePrev piece={queue[0] || null} theme={theme} />
        </SidePanel>

        <div style={{ display:"flex",flexDirection:"column",gap:6,marginTop:4 }}>
          <MBtn label="↺" color={theme.T}  onClick={()=>{getAC();rotate(-1);}} big />
          <MBtn label="↻" color={theme.I}  onClick={()=>{getAC();rotate(1);}}  big />
          <MBtn label="▼ DROP"  color={theme.O}  onClick={()=>{getAC();hardDrop();}} />
          <MBtn label="HOLD"    color="#666"     onClick={()=>{getAC();hold();}} />
          <MBtn label={phase==="paused"?"▶ PLAY":"⏸ PAUSE"} color="#555" onClick={()=>{getAC();pauseGame();}} />
        </div>

        <button onClick={onBack} style={{
          marginTop:4,padding:"7px 4px",background:"transparent",border:"1px solid #1c1c1c",
          color:"#2e2e2e",cursor:"pointer",borderRadius:7,fontSize:11,fontWeight:700,fontFamily:"Rajdhani",
          transition:"all 0.18s",
        }} onMouseEnter={e=>{e.currentTarget.style.color="#ff3366";e.currentTarget.style.borderColor="#ff3366";}}
           onMouseLeave={e=>{e.currentTarget.style.color="#2e2e2e";e.currentTarget.style.borderColor="#1c1c1c";}}>
          ✕ QUIT
        </button>
      </div>
    </div>
  );
}

function MBtn({ label, color, onClick, big }) {
  return (
    <button onClick={onClick} style={{
      padding: big ? "10px 4px" : "7px 4px",
      background:"rgba(0,0,0,0.38)", border:`1px solid ${color}44`, color,
      cursor:"pointer", borderRadius:8, fontSize: big ? 18 : 11, fontWeight:700,
      fontFamily:"Rajdhani", transition:"all 0.15s", letterSpacing:1,
    }} onMouseEnter={e=>{e.currentTarget.style.background=`${color}1a`;e.currentTarget.style.borderColor=color;}}
       onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,0,0,0.38)";e.currentTarget.style.borderColor=`${color}44`;}}>
      {label}
    </button>
  );
}

// ── Piece preview — FULLY SAFE, never throws ─────────────────────────────────
function PiecePrev({ piece, theme, faded }) {
  // Guard: no piece or unknown piece
  if (!piece || !ALL_ROTS[piece]) return <div style={{ height:30 }} />;
  const cells = ALL_ROTS[piece][0];
  if (!cells || cells.length === 0) return <div style={{ height:30 }} />;
  const maxX  = Math.max(...cells.map(c => c[0]));
  const maxY  = Math.max(...cells.map(c => c[1]));
  const cs    = 10;
  const color = faded ? "#252525" : (theme[piece] || "#888");
  return (
    <div style={{ display:"flex",justifyContent:"center",alignItems:"center",padding:"3px 0" }}>
      <div style={{ display:"grid",
        gridTemplateColumns:`repeat(${maxX+1},${cs}px)`,
        gridTemplateRows:`repeat(${maxY+1},${cs}px)`,gap:1 }}>
        {Array.from({length:maxY+1},(_,cy) =>
          Array.from({length:maxX+1},(_,cx) => {
            const on = cells.some(c => c[0]===cx && c[1]===cy);
            return <div key={`${cx}-${cy}`} style={{
              width:cs, height:cs,
              background: on ? color : "transparent",
              borderRadius:1,
              boxShadow: on && theme.glow ? `0 0 4px ${color}77` : "none",
            }}/>;
          })
        )}
      </div>
    </div>
  );
}

function SidePanel({ label, children, theme }) {
  return (
    <div style={{ background:"rgba(0,0,0,0.48)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:9,padding:"7px 8px" }}>
      <div style={{ fontSize:8,letterSpacing:2,color:"#333",marginBottom:5,fontFamily:"'Share Tech Mono'" }}>{label}</div>
      {children}
    </div>
  );
}

// ============================================================================
// ── GAME OVER ─────────────────────────────────────────────────────────────────
// ============================================================================
function GameOverScreen({ engine, theme, save, onRestart, onMenu }) {
  return (
    <div style={{ textAlign:"center",width:"100%",maxWidth:400,paddingTop:18,animation:"fadeUp 0.45s ease" }}>
      <div style={{ fontFamily:"Orbitron",fontSize:"clamp(28px,8vw,46px)",fontWeight:900,color:"#ff3366",
        letterSpacing:4,textShadow:"0 0 22px #ff3366",marginBottom:4 }}>GAME OVER</div>
      <div style={{ fontSize:10,color:"#2e2e2e",letterSpacing:4,marginBottom:20,fontFamily:"'Share Tech Mono'" }}>CONNECTION TERMINATED</div>

      <div style={{ background:"rgba(0,0,0,0.48)",border:`1px solid ${theme.I}20`,borderRadius:13,padding:20,marginBottom:16,textAlign:"left" }}>
        {[
          ["FINAL SCORE",  engine.score.toLocaleString(),  "#ffd700"],
          ["LINES",        engine.lines,                   theme.S],
          ["LEVEL",        engine.level,                   theme.I],
          ["MAX COMBO",    `×${engine.combo}`,             theme.T],
          ["TETRIS",       engine.rStats.tetris,           theme.O],
          ["T-SPINS",      engine.rStats.tspins,           theme.J],
          ["HARD DROPS",   engine.rStats.hardDrops,        "#777"],
        ].map(([l,v,c]) => (
          <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ color:"#484848",fontSize:12,fontFamily:"Rajdhani",fontWeight:600,letterSpacing:1 }}>{l}</span>
            <span style={{ color:c,fontWeight:700,fontSize:13,fontFamily:"'Share Tech Mono'" }}>{v}</span>
          </div>
        ))}
        <div style={{ display:"flex",justifyContent:"space-between",paddingTop:13,fontSize:16,fontWeight:900 }}>
          <span style={{ color:"#555" }}>COINS EARNED</span>
          <span style={{ color:"#ffd700",textShadow:"0 0 8px rgba(255,215,0,0.4)" }}>+{engine.score.toLocaleString()} ⬡</span>
        </div>
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
        {[[onRestart,"⟳ PLAY AGAIN",theme.I],[onMenu,"⟵ MAIN MENU","#363636"]].map(([fn,lbl,c])=>(
          <button key={lbl} onClick={()=>{getAC();if(save.sfxEnabled)SFX.menu();fn();}} style={{
            padding:"13px",background:"rgba(0,0,0,0.48)",border:`2px solid ${c}`,
            color:c,cursor:"pointer",fontWeight:700,fontSize:13,letterSpacing:2,borderRadius:11,
            transition:"all 0.18s",fontFamily:"Rajdhani",
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
  const tabs = [
    {key:"themes",   label:"🎨 Themes"},
    {key:"skins",    label:"🧊 Skins"},
    {key:"boards",   label:"⬛ Boards"},
    {key:"gravity",  label:"⚡ Gravity"},
    {key:"titles",   label:"🏆 Titles"},
    {key:"xpboosts", label:"⬡ Boosts"},
  ];

  const items = () => {
    if (shopTab === "themes") {
      return Object.entries(THEMES).map(([k,t]) => (
        <SCard key={k} name={t.name} rarity="FREE" desc="Color theme — always free"
          cost={0} owned equip={save.activeTheme===k} canAfford onSelect={()=>purchase("themes",k)} theme={theme}>
          <div style={{ display:"flex",gap:3,marginBottom:6,flexWrap:"wrap" }}>
            {["I","O","T","S","Z","J","L"].map(pk=>(
              <div key={pk} style={{ width:11,height:11,borderRadius:2,background:t[pk],
                boxShadow:t.glow?`0 0 4px ${t[pk]}77`:"none" }} />
            ))}
          </div>
        </SCard>
      ));
    }
    if (shopTab === "xpboosts") {
      return Object.entries(XP_BOOSTS).map(([k,item]) => (
        <SCard key={k} name={item.name} rarity={item.rarity} desc={item.desc}
          cost={item.cost} owned={false} equip={save.activeBoost===k}
          canAfford={save.coins>=item.cost}
          onSelect={()=>purchase("xpboosts",k)} theme={theme}
          badge={save.activeBoost===k?`${save.boostGamesLeft} LEFT`:null} />
      ));
    }
    const DS = { skins:SKINS, boards:BOARDS, gravity:GRAVITY_MODES, titles:TITLES };
    const UM = { skins:"unlockedSkins", boards:"unlockedBoards", gravity:"unlockedGravity", titles:"unlockedTitles" };
    const AM = { skins:"activeSkin",    boards:"activeBoard",    gravity:"activeGravity",   titles:"activeTitle" };
    return Object.entries(DS[shopTab]||{}).map(([k,item]) => {
      const owned = (save[UM[shopTab]]||[]).includes(k);
      return (
        <SCard key={k} name={item.name||k} rarity={item.rarity||"FREE"} desc={item.desc||""}
          cost={item.cost||0} owned={owned} equip={save[AM[shopTab]]===k}
          canAfford={save.coins>=(item.cost||0)} onSelect={()=>purchase(shopTab,k)} theme={theme} />
      );
    });
  };

  return (
    <div style={{ width:"100%",maxWidth:900,animation:"fadeUp 0.4s ease" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,padding:"0 2px" }}>
        <div style={{ fontFamily:"Orbitron",fontSize:17,fontWeight:900,color:theme.I,letterSpacing:3 }}>BLACK MARKET</div>
        <div style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 13px",borderRadius:20,
          background:"rgba(255,215,0,0.06)",border:"1px solid rgba(255,215,0,0.2)",color:"#ffd700",fontWeight:700,fontSize:13,fontFamily:"'Share Tech Mono'" }}>
          {save.coins.toLocaleString()} ⬡
        </div>
      </div>
      <div style={{ display:"flex",overflowX:"auto",borderBottom:"1px solid #111",marginBottom:12,scrollbarWidth:"none" }}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>{if(save.sfxEnabled)SFX.menu();setShopTab(t.key);}} style={{
            flexShrink:0,padding:"9px 14px",background:"transparent",border:"none",cursor:"pointer",
            color:shopTab===t.key?theme.I:"#383838",fontSize:12,fontWeight:700,letterSpacing:1,
            borderBottom:`2px solid ${shopTab===t.key?theme.I:"transparent"}`,transition:"all 0.18s",
            fontFamily:"Rajdhani",
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(172px,1fr))",gap:9,
        maxHeight:"57vh",overflowY:"auto",padding:"2px 2px 8px" }}>
        {items()}
      </div>
      <button onClick={onBack} style={{
        marginTop:12,padding:"10px 20px",background:"transparent",border:"1px solid #252525",
        color:"#484848",cursor:"pointer",borderRadius:7,fontWeight:700,letterSpacing:2,fontSize:12,fontFamily:"Rajdhani",transition:"all 0.18s",
      }} onMouseEnter={e=>{e.currentTarget.style.borderColor=theme.I+"66";e.currentTarget.style.color=theme.I;}}
         onMouseLeave={e=>{e.currentTarget.style.borderColor="#252525";e.currentTarget.style.color="#484848";}}>
        ← EXIT MARKET
      </button>
    </div>
  );
}

function SCard({ name, rarity, desc, cost, owned, equip, canAfford, onSelect, theme, children, badge }) {
  const [h, setH] = useState(false);
  const rc = RARITY_COLORS[rarity] || "#777";
  return (
    <div onClick={onSelect}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ padding:12,borderRadius:10,cursor:"pointer",position:"relative",
        border:`2px solid ${equip?theme.I:h?"rgba(255,255,255,0.11)":"rgba(255,255,255,0.04)"}`,
        background:equip?`${theme.I}0d`:h?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.38)",
        opacity:!canAfford&&!owned?0.48:1,
        boxShadow:equip?`0 0 13px ${theme.I}28`:"none",
        transition:"all 0.18s",transform:h&&!equip?"translateY(-2px)":"none" }}>
      {badge&&<div style={{ position:"absolute",top:7,right:7,padding:"2px 7px",borderRadius:4,background:theme.I,color:"#000",fontSize:9,fontWeight:800,letterSpacing:1 }}>{badge}</div>}
      {equip&&!badge&&<div style={{ position:"absolute",top:7,right:7,padding:"2px 7px",borderRadius:4,background:theme.I,color:"#000",fontSize:9,fontWeight:800,letterSpacing:1 }}>ON</div>}
      <div style={{ fontSize:8,color:rc,fontWeight:700,letterSpacing:2,marginBottom:5,fontFamily:"'Share Tech Mono'" }}>{rarity}</div>
      {children}
      <div style={{ fontSize:13,fontWeight:700,marginBottom:2,fontFamily:"Rajdhani",letterSpacing:1 }}>{name}</div>
      <div style={{ fontSize:11,color:"#4a4a4a",marginBottom:8,lineHeight:1.4 }}>{desc}</div>
      <div style={{ fontSize:11,fontWeight:700,color:owned?theme.I:canAfford?"#ffd700":"#383838",fontFamily:"'Share Tech Mono'" }}>
        {cost===0?"FREE":owned?"OWNED":`${cost.toLocaleString()} ⬡`}
      </div>
    </div>
  );
}

// ============================================================================
// ── SETTINGS ─────────────────────────────────────────────────────────────────
// ============================================================================
function SettingsScreen({ save, setSave, theme, onBack }) {
  const tog = k => setSave(p=>({...p,[k]:!p[k]}));
  const toggles = [
    ["musicEnabled","🎵 Music",      "Background chiptune music"],
    ["sfxEnabled",  "🔊 Sound FX",   "Block sounds & feedback"],
    ["showGhost",   "👻 Ghost Piece","Show ghost piece preview"],
    ["showGrid",    "📐 Grid Lines", "Show board grid overlay"],
  ];
  return (
    <div style={{ width:"100%",maxWidth:400,animation:"fadeUp 0.4s ease" }}>
      <div style={{ fontFamily:"Orbitron",fontSize:17,fontWeight:900,color:theme.I,letterSpacing:3,marginBottom:16 }}>SETTINGS</div>
      <div style={{ background:"rgba(0,0,0,0.44)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:13,overflow:"hidden",marginBottom:12 }}>
        {toggles.map(([k,label,desc])=>(
          <div key={k} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"13px 17px",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <div>
              <div style={{ fontWeight:700,fontSize:13,fontFamily:"Rajdhani",letterSpacing:1 }}>{label}</div>
              <div style={{ fontSize:11,color:"#404040" }}>{desc}</div>
            </div>
            <div onClick={()=>tog(k)} style={{
              width:42,height:23,borderRadius:12,cursor:"pointer",position:"relative",
              background:save[k]?theme.I:"#1c1c1c",transition:"all 0.22s",
              border:`1px solid ${save[k]?theme.I+"55":"#282828"}`,
              boxShadow:save[k]?`0 0 9px ${theme.I}44`:"none",
            }}>
              <div style={{ position:"absolute",top:2,left:save[k]?19:2,width:17,height:17,
                borderRadius:"50%",background:save[k]?"#000":"#404040",transition:"left 0.22s" }} />
            </div>
          </div>
        ))}
        <div style={{ padding:"13px 17px" }}>
          <div style={{ fontWeight:700,fontSize:13,fontFamily:"Rajdhani",letterSpacing:1,marginBottom:9 }}>🎼 Music Scale</div>
          <div style={{ display:"flex",gap:7,flexWrap:"wrap" }}>
            {Object.keys(SCALES).map(s=>(
              <button key={s} onClick={()=>setSave(p=>({...p,musicScale:s}))} style={{
                padding:"5px 13px",borderRadius:6,transition:"all 0.18s",
                border:`1px solid ${save.musicScale===s?theme.I:"#252525"}`,
                background:save.musicScale===s?`${theme.I}18`:"transparent",
                color:save.musicScale===s?theme.I:"#3e3e3e",
                cursor:"pointer",fontSize:11,fontWeight:700,textTransform:"uppercase",fontFamily:"Rajdhani",
              }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{ padding:"13px 17px",borderTop:"1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontWeight:700,fontSize:13,fontFamily:"Rajdhani",letterSpacing:1,marginBottom:4 }}>⚠️ Reset Progress</div>
          <div style={{ fontSize:11,color:"#404040",marginBottom:9 }}>Wipe all coins, unlocks & stats</div>
          <button onClick={()=>{ if(window.confirm("Reset ALL progress?")){ localStorage.removeItem(STORAGE_KEY); setSave({...DEFAULT_SAVE}); } }} style={{
            padding:"7px 15px",background:"transparent",border:"1px solid #ff336640",
            color:"#ff3366",cursor:"pointer",borderRadius:7,fontSize:11,fontWeight:700,fontFamily:"Rajdhani",transition:"all 0.18s",
          }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,51,102,0.09)"}
             onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            FACTORY RESET
          </button>
        </div>
      </div>
      <button onClick={()=>{if(save.sfxEnabled)SFX.menu();onBack();}} style={{
        padding:"11px 20px",background:"rgba(0,0,0,0.38)",border:`2px solid ${theme.I}`,
        color:theme.I,cursor:"pointer",borderRadius:8,fontWeight:700,letterSpacing:2,fontSize:12,fontFamily:"Rajdhani",transition:"all 0.18s",
      }} onMouseEnter={e=>e.currentTarget.style.background=`${theme.I}18`}
         onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.38)"}>← BACK</button>
    </div>
  );
}

// ============================================================================
// ── STATS ─────────────────────────────────────────────────────────────────────
// ============================================================================
function StatsScreen({ save, theme, onBack }) {
  const rows = [
    ["Total Games",      save.stats.totalGames],
    ["Total Lines",      save.stats.totalLines.toLocaleString()],
    ["High Score",       save.stats.maxScore.toLocaleString()],
    ["Max Level",        save.stats.maxLevel],
    ["Highest Combo",    `×${save.stats.maxCombo}`],
    ["Total Tetris",     save.stats.totalTetris],
    ["Total T-Spins",    save.stats.totalTSpins],
    ["Coin Balance",     `${save.coins.toLocaleString()} ⬡`],
  ];
  return (
    <div style={{ width:"100%",maxWidth:380,animation:"fadeUp 0.4s ease" }}>
      <div style={{ fontFamily:"Orbitron",fontSize:17,fontWeight:900,color:theme.I,letterSpacing:3,marginBottom:16 }}>STATISTICS</div>
      <div style={{ background:"rgba(0,0,0,0.44)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:13 }}>
        {rows.map(([l,v],i)=>(
          <div key={l} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"11px 17px",borderBottom:i<rows.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
            <span style={{ color:"#484848",fontSize:13,fontFamily:"Rajdhani",fontWeight:600 }}>{l}</span>
            <span style={{ color:theme.I,fontWeight:700,fontSize:13,fontFamily:"'Share Tech Mono'" }}>{v}</span>
          </div>
        ))}
      </div>
      <button onClick={()=>{if(save.sfxEnabled)SFX.menu();onBack();}} style={{
        marginTop:13,padding:"11px 20px",background:"rgba(0,0,0,0.38)",border:`2px solid ${theme.I}`,
        color:theme.I,cursor:"pointer",borderRadius:8,fontWeight:700,letterSpacing:2,fontSize:12,fontFamily:"Rajdhani",transition:"all 0.18s",
      }} onMouseEnter={e=>e.currentTarget.style.background=`${theme.I}18`}
         onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0.38)"}>← BACK</button>
    </div>
  );
}