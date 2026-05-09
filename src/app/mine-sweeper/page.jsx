'use client';

import { useState, useEffect, useRef } from "react";

// ─── STORAGE KEY ────────────────────────────────────────────────
const SAVE_KEY = "__VSWEEPER_X7K9_v3__";

// ─── DIFFICULTY CONFIG ──────────────────────────────────────────
const DIFFS = {
  easy:      { label: "EASY",      rows: 8,  cols: 8,  mines: 8,   reward: 80   },
  medium:    { label: "MEDIUM",    rows: 10, cols: 10, mines: 18,  reward: 200  },
  hard:      { label: "HARD",      rows: 14, cols: 14, mines: 40,  reward: 500  },
  nightmare: { label: "NIGHTMARE", rows: 18, cols: 18, mines: 80,  reward: 1200 },
  god:       { label: "GOD TIER",  rows: 22, cols: 22, mines: 140, reward: 4000 },
};

// ─── SHOP DATA ──────────────────────────────────────────────────
const THEMES = {
  void:     { name: "VOID",     cost: 0,     p: "#00e5ff", bg: "#04060f", panel: "rgba(0,229,255,0.06)",   acc: "#ff00cc" },
  blood:    { name: "BLOOD",    cost: 500,   p: "#ff2244", bg: "#0b0305", panel: "rgba(255,34,68,0.06)",   acc: "#ff8800" },
  matrix:   { name: "MATRIX",   cost: 900,   p: "#00ff66", bg: "#020b04", panel: "rgba(0,255,102,0.06)",   acc: "#00ffcc" },
  ghost:    { name: "GHOST",    cost: 2000,  p: "#bb88ff", bg: "#07040f", panel: "rgba(170,136,255,0.06)", acc: "#ff44ee" },
  solar:    { name: "SOLAR",    cost: 4000,  p: "#ffcc00", bg: "#0b0900", panel: "rgba(255,204,0,0.06)",   acc: "#ff6600" },
  obsidian: { name: "OBSIDIAN", cost: 8000,  p: "#ffffff", bg: "#000000", panel: "rgba(255,255,255,0.05)", acc: "#888888" },
  aurora:   { name: "AURORA",   cost: 18000, p: "#66ffcc", bg: "#020c10", panel: "rgba(102,255,204,0.06)", acc: "#ff66aa" },
  inferno:  { name: "INFERNO",  cost: 35000, p: "#ff4400", bg: "#0b0200", panel: "rgba(255,68,0,0.06)",    acc: "#ffdd00" },
};
const FLAGS = {
  classic: { name: "Classic Flag", cost: 0,     sym: "⚑" },
  skull:   { name: "Skull Mark",   cost: 300,   sym: "☠" },
  fire:    { name: "Fire Torch",   cost: 700,   sym: "🔥" },
  crown:   { name: "Royal Banner", cost: 1500,  sym: "♔" },
  void:    { name: "Void Sigil",   cost: 3000,  sym: "◈" },
  eye:     { name: "All-Seeing",   cost: 7000,  sym: "👁" },
  omega:   { name: "Omega Mark",   cost: 15000, sym: "Ω" },
};
const MINES = {
  bomb:    { name: "Classic Bomb", cost: 0,     sym: "💣" },
  skull:   { name: "Skull Charge", cost: 400,   sym: "☠" },
  virus:   { name: "Bio Hazard",   cost: 900,   sym: "🦠" },
  vortex:  { name: "Dark Matter",  cost: 2000,  sym: "🕳" },
  dragon:  { name: "Dragonhead",   cost: 4500,  sym: "🐉" },
  nuclear: { name: "Nuclear Core", cost: 9000,  sym: "☢" },
  divine:  { name: "Divine Wrath", cost: 22000, sym: "⛧" },
};
const DIGITS = {
  neon:   { name: "Neon",   cost: 0,     map: ["","1","2","3","4","5","6","7","8"] },
  roman:  { name: "Roman",  cost: 600,   map: ["","I","II","III","IV","V","VI","VII","VIII"] },
  rune:   { name: "Runic",  cost: 1200,  map: ["","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ","ᚷ","ᚹ","ᚺ"] },
  kanji:  { name: "Kanji",  cost: 2500,  map: ["","一","二","三","四","五","六","七","八"] },
  binary: { name: "Binary", cost: 5000,  map: ["","01","10","11","100","101","110","111","1000"] },
  hex:    { name: "Hex",    cost: 10000, map: ["","0x1","0x2","0x3","0x4","0x5","0x6","0x7","0x8"] },
};
const PERKS = {
  ghostStep:  { name: "Ghost Step",   cost: 1500,  desc: "Undo one fatal click per game" },
  creditSurge:{ name: "Credit Surge", cost: 12000, desc: "All rewards x1.5" },
  extraLife:  { name: "Extra Life",   cost: 50000, desc: "Survive one mine hit per game" },
};
const TITLES = {
  recruit:    { name: "RECRUIT",     cost: 0     },
  operative:  { name: "OPERATIVE",   cost: 1000  },
  sentinel:   { name: "SENTINEL",    cost: 4000  },
  voidwalker: { name: "VOIDWALKER",  cost: 10000 },
  annihilator:{ name: "ANNIHILATOR", cost: 25000 },
  deity:      { name: "DEITY",       cost: 70000 },
};

const NUM_COLORS = ["","#4fc3f7","#81c784","#e57373","#7986cb","#ff7043","#4dd0e1","#f06292","#bcaaa4"];

const DEFAULT_SAVE = {
  coins: 0,
  theme: "void", flag: "classic", mine: "bomb", digit: "neon", title: "recruit",
  unlockedThemes: ["void"], unlockedFlags: ["classic"],
  unlockedMines: ["bomb"], unlockedDigits: ["neon"], unlockedTitles: ["recruit"],
  unlockedPerks: [], activePerks: [],
  stats: { wins: 0, losses: 0, perfect: 0, played: 0, totalCoins: 0, bestTimes: {} },
};

// ─── AUDIO ───────────────────────────────────────────────────────
let _ac = null;
function getAC() {
  if (typeof window === "undefined") return null;
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === "suspended") _ac.resume();
  return _ac;
}
function beep(type) {
  const ac = getAC(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  const t = ac.currentTime;
  ({
    click:   () => { o.type="sine";     o.frequency.setValueAtTime(700,t); o.frequency.linearRampToValueAtTime(500,t+.05); g.gain.setValueAtTime(.08,t); g.gain.linearRampToValueAtTime(0,t+.05); o.start(t); o.stop(t+.05); },
    flag:    () => { o.type="square";   o.frequency.setValueAtTime(440,t); o.frequency.setValueAtTime(660,t+.06); g.gain.setValueAtTime(.1,t); g.gain.linearRampToValueAtTime(0,t+.12); o.start(t); o.stop(t+.12); },
    reveal:  () => { o.type="sine";     o.frequency.setValueAtTime(350,t); o.frequency.linearRampToValueAtTime(560,t+.07); g.gain.setValueAtTime(.05,t); g.gain.linearRampToValueAtTime(0,t+.07); o.start(t); o.stop(t+.07); },
    pop:     () => { o.type="sawtooth"; o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(30,t+.25); g.gain.setValueAtTime(.18,t); g.gain.linearRampToValueAtTime(0,t+.25); o.start(t); o.stop(t+.25); },
    bigboom: () => { o.type="sawtooth"; o.frequency.setValueAtTime(180,t); o.frequency.exponentialRampToValueAtTime(15,t+.8); g.gain.setValueAtTime(.3,t); g.gain.linearRampToValueAtTime(0,t+.8); o.start(t); o.stop(t+.8); },
    win:     () => { [440,554,659,880,1100].forEach((f,i) => { const oo=ac.createOscillator(),gg=ac.createGain(); oo.connect(gg); gg.connect(ac.destination); oo.type="triangle"; oo.frequency.value=f; gg.gain.setValueAtTime(0,t+i*.11); gg.gain.linearRampToValueAtTime(.15,t+i*.11+.02); gg.gain.linearRampToValueAtTime(0,t+i*.11+.22); oo.start(t+i*.11); oo.stop(t+i*.11+.3); }); },
    shop:    () => { o.type="sine"; o.frequency.setValueAtTime(900,t); o.frequency.setValueAtTime(1200,t+.07); g.gain.setValueAtTime(.09,t); g.gain.linearRampToValueAtTime(0,t+.14); o.start(t); o.stop(t+.14); },
    nav:     () => { o.type="triangle"; o.frequency.setValueAtTime(600,t); g.gain.setValueAtTime(.06,t); g.gain.linearRampToValueAtTime(0,t+.07); o.start(t); o.stop(t+.07); },
  })[type]?.();
}

// ─── BOARD HELPERS ───────────────────────────────────────────────
function makeBlank(rows, cols) {
  return Array.from({ length: rows * cols }, (_, i) => ({
    idx: i, r: Math.floor(i / cols), c: i % cols,
    mine: false, revealed: false, flagged: false, count: 0,
  }));
}

function placeMines(rows, cols, mineCount, safeR, safeC) {
  const safeIdx = safeR * cols + safeC;
  const total = rows * cols;
  const mineSet = new Set();
  while (mineSet.size < Math.min(mineCount, total - 1)) {
    const idx = Math.floor(Math.random() * total);
    if (idx !== safeIdx) mineSet.add(idx);
  }
  const board = Array.from({ length: total }, (_, i) => ({
    idx: i, r: Math.floor(i / cols), c: i % cols,
    mine: mineSet.has(i), revealed: false, flagged: false, count: 0,
  }));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r*cols+c].mine) continue;
      let cnt = 0;
      for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
        if (!dr && !dc) continue;
        const nr=r+dr, nc=c+dc;
        if (nr>=0&&nr<rows&&nc>=0&&nc<cols&&board[nr*cols+nc].mine) cnt++;
      }
      board[r*cols+c].count = cnt;
    }
  }
  return board;
}

function flood(board, rows, cols, r, c) {
  const next = board.map(x => ({...x}));
  const queue = [[r,c]];
  const seen = new Set();
  while (queue.length) {
    const [cr,cc] = queue.shift();
    const key = cr*cols+cc;
    if (seen.has(key)||cr<0||cr>=rows||cc<0||cc>=cols) continue;
    seen.add(key);
    const cell = next[key];
    if (cell.revealed||cell.flagged||cell.mine) continue;
    cell.revealed = true;
    if (cell.count===0) for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) if (dr||dc) queue.push([cr+dr,cc+dc]);
  }
  return next;
}

function unrevealedSafe(board) {
  return board.filter(c => !c.revealed && !c.mine).length;
}

// ─── BOT AI ──────────────────────────────────────────────────────
function botMove(board, rows, cols) {
  const get = (r,c) => (r>=0&&r<rows&&c>=0&&c<cols) ? board[r*cols+c] : null;
  const nbrs = (r,c) => {
    const ns = [];
    for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
      if (!dr&&!dc) continue;
      const n = get(r+dr,c+dc);
      if (n) ns.push(n);
    }
    return ns;
  };
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
    const cell = get(r,c);
    if (!cell||!cell.revealed||cell.count===0) continue;
    const ns = nbrs(r,c);
    const hidden = ns.filter(n=>!n.revealed&&!n.flagged);
    const flagged = ns.filter(n=>n.flagged);
    if (!hidden.length) continue;
    if (flagged.length===cell.count) return { action:"reveal", r:hidden[0].r, c:hidden[0].c };
    if (flagged.length+hidden.length===cell.count) return { action:"flag", r:hidden[0].r, c:hidden[0].c };
  }
  const pool = board.filter(c=>!c.revealed&&!c.flagged);
  if (!pool.length) return null;
  const pick = pool[Math.floor(Math.random()*pool.length)];
  return { action:"reveal", r:pick.r, c:pick.c };
}

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
export default function VoidSweeper() {
  const [save, setSave] = useState(null);
  const [screen, setScreen] = useState("menu");
  const [shopTab, setShopTab] = useState("themes");
  const [toast, setToast] = useState(null);

  // Menu
  const [selDiff, setSelDiff] = useState("medium");
  const [selMode, setSelMode] = useState("solo");
  const [p1Name, setP1Name] = useState("PLAYER 1");
  const [p2Name, setP2Name] = useState("PLAYER 2");
  const [editName, setEditName] = useState(null);

  // ── GAME STATE ──
  // mode: "solo" | "robot" | "versus"
  //
  // SOLO: one board. Player clicks. No turns.
  //
  // ROBOT: one shared board. Player and bot alternate.
  //   turn: "player" | "robot"
  //   They click the SAME board. Bot uses AI. First click is always player's.
  //
  // VERSUS: two separate boards side by side.
  //   turn: "p1" | "p2"
  //   p1 clicks board1, p2 clicks board2 (same mouse, same screen).
  //   After every cell reveal, turn passes to opponent.
  //   The board that hits a mine first loses.
  //
  const [conf, setConf] = useState(null);
  // board1 = solo/robot/p1's board. board2 = p2's board (versus only)
  const [b1, setB1] = useState([]);
  const [b2, setB2] = useState([]);
  const [b1Ready, setB1Ready] = useState(false); // mines placed
  const [b2Ready, setB2Ready] = useState(false);
  // "playing" | "won" | "dead"
  const [s1, setS1] = useState("playing");
  const [s2, setS2] = useState("playing");
  // whose turn (robot/versus)
  const [turn, setTurn] = useState("player");
  const [fc1, setFc1] = useState(0); // flag counts
  const [fc2, setFc2] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  // exploding mine indices (for animation)
  const [exploding1, setExploding1] = useState(new Set());
  const [exploding2, setExploding2] = useState(new Set());
  const [usedUndo, setUsedUndo] = useState(false);
  const [usedLife, setUsedLife] = useState(false);
  const [result, setResult] = useState(null);

  // refs so async callbacks get fresh values without stale closures
  const confRef = useRef(null);
  const b1Ref = useRef([]);
  const s1Ref = useRef("playing");
  const turnRef = useRef("player");
  const elapsedRef = useRef(0);
  const fc1Ref = useRef(0);
  const timerRef = useRef(null);
  const botRef = useRef(null);
  const gameOverRef = useRef(false); // prevents double endGame

  // sync refs
  useEffect(() => { confRef.current = conf; }, [conf]);
  useEffect(() => { b1Ref.current = b1; }, [b1]);
  useEffect(() => { s1Ref.current = s1; }, [s1]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);
  useEffect(() => { fc1Ref.current = fc1; }, [fc1]);

  // ── Load/save ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      setSave(raw ? { ...DEFAULT_SAVE, ...JSON.parse(raw), stats: { ...DEFAULT_SAVE.stats, ...JSON.parse(raw).stats } } : { ...DEFAULT_SAVE });
    } catch { setSave({ ...DEFAULT_SAVE }); }
  }, []);
  useEffect(() => { if (save) try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {} }, [save]);

  const showToast = (msg, color = "#00e5ff") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2200);
  };

  const T = save ? (THEMES[save.theme] || THEMES.void) : THEMES.void;
  const flagSym = save ? (FLAGS[save.flag]?.sym || "⚑") : "⚑";
  const mineSym = save ? (MINES[save.mine]?.sym || "💣") : "💣";
  const digitMap = save ? (DIGITS[save.digit]?.map || DIGITS.neon.map) : DIGITS.neon.map;
  const hasPerk = (id) => save?.activePerks?.includes(id);

  // ── Timer ──
  useEffect(() => {
    if (screen === "game" && s1 === "playing") {
      timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [screen, s1]);

  // ── BOT TURN (robot mode only) ──
  // Fires when turn==="robot", s1==="playing", b1Ready
  const botTurnPending = screen === "game" && conf?.mode === "robot" && s1 === "playing" && turn === "robot" && b1Ready;
  useEffect(() => {
    if (!botTurnPending) return;
    clearTimeout(botRef.current);
    botRef.current = setTimeout(() => {
      const board = b1Ref.current;
      const c = confRef.current;
      if (!c || s1Ref.current !== "playing" || turnRef.current !== "robot") return;

      const step = botMove(board, c.rows, c.cols);
      if (!step) { setTurn("player"); return; }

      if (step.action === "flag") {
        setB1(prev => {
          const cell = prev[step.r * c.cols + step.c];
          if (!cell || cell.revealed) return prev;
          beep("flag");
          const next = prev.map(x => x.idx === cell.idx ? { ...x, flagged: !x.flagged } : x);
          setFc1(f => cell.flagged ? f - 1 : f + 1);
          return next;
        });
        setTurn("player");
        return;
      }

      // reveal
      const cell = board[step.r * c.cols + step.c];
      if (!cell || cell.revealed || cell.flagged) { setTurn("player"); return; }

      if (cell.mine) {
        // Bot hit mine → BOT loses, player wins
        const mineIdxs = board.filter(x => x.mine).map(x => x.idx);
        explodeBoard(mineIdxs, false, () => {
          setB1(prev => prev.map(x => x.mine ? { ...x, revealed: true } : x));
          setS1("dead");
          doEndGame({ winner: "player", mode: "robot", time: elapsedRef.current });
        });
        return;
      }

      beep("reveal");
      const next = flood(board, c.rows, c.cols, step.r, step.c);
      setB1(next);
      if (unrevealedSafe(next) === 0) {
        setS1("won");
        doEndGame({ winner: "robot", mode: "robot", time: elapsedRef.current });
      } else {
        setTurn("player");
      }
    }, 550 + Math.random() * 550);
    return () => clearTimeout(botRef.current);
  }, [botTurnPending]);

  // ─── START GAME ─────────────────────────────────────────────────
  function startGame(diffKey, mode) {
    getAC();
    beep("click");
    clearTimeout(botRef.current);
    clearInterval(timerRef.current);
    gameOverRef.current = false;

    const cfg = DIFFS[diffKey];
    const blank1 = makeBlank(cfg.rows, cfg.cols);
    const blank2 = mode === "versus" ? makeBlank(cfg.rows, cfg.cols) : [];

    const c = { mode, diffKey, rows: cfg.rows, cols: cfg.cols, mines: cfg.mines, reward: cfg.reward, p1: p1Name, p2: p2Name };
    setConf(c);
    confRef.current = c;
    setB1(blank1);
    setB2(blank2);
    setB1Ready(false);
    setB2Ready(false);
    setS1("playing");
    setS2("playing");
    s1Ref.current = "playing";
    setTurn(mode === "versus" ? "p1" : "player");
    turnRef.current = mode === "versus" ? "p1" : "player";
    setFc1(0);
    setFc2(0);
    fc1Ref.current = 0;
    setElapsed(0);
    elapsedRef.current = 0;
    setExploding1(new Set());
    setExploding2(new Set());
    setUsedUndo(false);
    setUsedLife(false);
    setResult(null);
    setScreen("game");
  }

  // ─── EXPLOSION ANIMATION ─────────────────────────────────────────
  function explodeBoard(mineIdxs, isB2, onDone) {
    const setter = isB2 ? setExploding2 : setExploding1;
    setter(new Set());
    mineIdxs.forEach((idx, i) => {
      setTimeout(() => {
        beep("pop");
        setter(prev => new Set([...prev, idx]));
      }, i * 120);
    });
    setTimeout(() => {
      beep("bigboom");
      onDone();
    }, mineIdxs.length * 120 + 250);
  }

  // ─── END GAME ────────────────────────────────────────────────────
  function doEndGame(info) {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    clearInterval(timerRef.current);
    clearTimeout(botRef.current);

    const isWin = (info.mode === "solo" && info.won) ||
                  (info.mode === "robot" && info.winner === "player") ||
                  (info.mode === "versus" && info.winner === "p1");

    if (isWin) beep("win");

    const cfg = confRef.current;
    let coins = 0;
    if (isWin && cfg) {
      coins = cfg.reward;
      if (hasPerk("creditSurge")) coins = Math.floor(coins * 1.5);
      if (info.perfect) coins = Math.floor(coins * 1.5);
      setSave(prev => ({ ...prev, coins: prev.coins + coins, stats: { ...prev.stats, totalCoins: prev.stats.totalCoins + coins } }));
    }
    setSave(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        wins: prev.stats.wins + (isWin ? 1 : 0),
        losses: prev.stats.losses + (isWin ? 0 : 1),
        perfect: prev.stats.perfect + (info.perfect ? 1 : 0),
        played: prev.stats.played + 1,
        bestTimes: isWin && cfg
          ? { ...prev.stats.bestTimes, [cfg.diffKey]: Math.min(prev.stats.bestTimes?.[cfg.diffKey] ?? Infinity, info.time) }
          : prev.stats.bestTimes,
      },
    }));

    setResult({ ...info, coins, isWin, time: info.time });
    setTimeout(() => setScreen("result"), 600);
  }

  // ─── CELL CLICK ─────────────────────────────────────────────────
  // board: "b1" | "b2"
  function handleReveal(r, c, board) {
    if (!conf) return;
    const isB2 = board === "b2";

    // Turn guard
    if (conf.mode === "solo" && s1 !== "playing") return;
    if (conf.mode === "robot") {
      if (s1 !== "playing") return;
      if (turn !== "player") return;
      if (isB2) return; // robot mode has only one board
    }
    if (conf.mode === "versus") {
      if (!isB2 && (s1 !== "playing" || turn !== "p1")) return;
      if (isB2 && (s2 !== "playing" || turn !== "p2")) return;
    }

    const myBoard = isB2 ? b2 : b1;
    const myReady = isB2 ? b2Ready : b1Ready;
    const cell = myBoard[r * conf.cols + c];
    if (!cell || cell.revealed || cell.flagged) return;

    // ── First click: place mines ──
    if (!myReady) {
      beep("reveal");
      const newBoard = placeMines(conf.rows, conf.cols, conf.mines, r, c);
      const revealed = flood(newBoard, conf.rows, conf.cols, r, c);
      if (isB2) { setB2(revealed); setB2Ready(true); }
      else { setB1(revealed); b1Ref.current = revealed; setB1Ready(true); }
      afterReveal(revealed, isB2, r, c, false);
      return;
    }

    // ── Mine hit ──
    if (cell.mine) {
      if (!isB2 && hasPerk("extraLife") && !usedLife) {
        setUsedLife(true);
        showToast("❤ Extra Life used! Survived.", "#ff4466");
        return;
      }
      const mineIdxs = myBoard.filter(x => x.mine).map(x => x.idx);
      // Show all mines on the dead board
      if (isB2) { setS2("dead"); setB2(prev => prev.map(x => x.mine ? { ...x, revealed: true } : x)); }
      else { setS1("dead"); s1Ref.current = "dead"; setB1(prev => prev.map(x => x.mine ? { ...x, revealed: true } : x)); }
      explodeBoard(mineIdxs, isB2, () => {
        if (conf.mode === "solo") {
          doEndGame({ mode: "solo", won: false, time: elapsedRef.current });
        } else if (conf.mode === "robot") {
          doEndGame({ winner: "robot", mode: "robot", time: elapsedRef.current });
        } else {
          // In versus: the board that exploded loses
          const winner = isB2 ? "p1" : "p2";
          doEndGame({ winner, mode: "versus", time: elapsedRef.current });
        }
      });
      return;
    }

    // ── Normal reveal ──
    beep("reveal");
    const next = flood(myBoard, conf.rows, conf.cols, r, c);
    if (isB2) setB2(next);
    else { setB1(next); b1Ref.current = next; }
    afterReveal(next, isB2, r, c, true);
  }

  function afterReveal(boardAfter, isB2, r, c, minesWerePlaced) {
    const rem = unrevealedSafe(boardAfter);
    if (rem === 0) {
      // Board cleared = that player wins
      if (isB2) setS2("won");
      else { setS1("won"); s1Ref.current = "won"; }
      const perfect = !isB2 ? (fc1Ref.current === conf.mines) : false;
      if (conf.mode === "solo") {
        doEndGame({ mode: "solo", won: true, time: elapsedRef.current, perfect });
      } else if (conf.mode === "robot") {
        doEndGame({ winner: "player", mode: "robot", time: elapsedRef.current, perfect });
      } else {
        const winner = isB2 ? "p2" : "p1";
        doEndGame({ winner, mode: "versus", time: elapsedRef.current, perfect });
      }
      return;
    }
    // Pass the turn
    if (conf.mode === "robot") {
      setTurn("robot");
      turnRef.current = "robot";
    } else if (conf.mode === "versus") {
      const next = isB2 ? "p1" : "p2";
      setTurn(next);
      turnRef.current = next;
    }
    // solo: no turn management needed
  }

  // ─── FLAG ────────────────────────────────────────────────────────
  function handleFlag(e, r, c, board) {
    e.preventDefault();
    if (!conf) return;
    const isB2 = board === "b2";
    const myStatus = isB2 ? s2 : s1;
    const myReady = isB2 ? b2Ready : b1Ready;
    if (myStatus !== "playing" || !myReady) return;
    if (conf.mode === "robot" && (isB2 || turn !== "player")) return;
    if (conf.mode === "versus") {
      if (!isB2 && turn !== "p1") return;
      if (isB2 && turn !== "p2") return;
    }
    const myBoard = isB2 ? b2 : b1;
    const cell = myBoard[r * conf.cols + c];
    if (!cell || cell.revealed) return;
    beep("flag");
    const next = myBoard.map(x => x.idx === cell.idx ? { ...x, flagged: !x.flagged } : x);
    if (isB2) { setB2(next); setFc2(f => cell.flagged ? f-1 : f+1); }
    else { setB1(next); b1Ref.current = next; setFc1(f => cell.flagged ? f-1 : f+1); fc1Ref.current = cell.flagged ? fc1Ref.current-1 : fc1Ref.current+1; }
  }

  // ─── UNDO ────────────────────────────────────────────────────────
  function handleUndo() {
    if (!hasPerk("ghostStep") || usedUndo || s1 !== "dead" || conf?.mode === "versus") return;
    setUsedUndo(true);
    setB1(prev => prev.map(c => c.mine ? { ...c, revealed: false } : c));
    b1Ref.current = b1Ref.current.map(c => c.mine ? { ...c, revealed: false } : c);
    setS1("playing");
    s1Ref.current = "playing";
    setExploding1(new Set());
    gameOverRef.current = false;
    setTurn("player");
    turnRef.current = "player";
    showToast("↩ Ghost Step — survived!", "#aa88ff");
  }

  // ─── SHOP ────────────────────────────────────────────────────────
  function purchase(category, key) {
    if (!save) return;
    beep("shop");
    const data = { themes: THEMES, flags: FLAGS, mines: MINES, digits: DIGITS, perks: PERKS, titles: TITLES };
    const ukMap = { themes: "unlockedThemes", flags: "unlockedFlags", mines: "unlockedMines", digits: "unlockedDigits", titles: "unlockedTitles" };
    const akMap = { themes: "theme", flags: "flag", mines: "mine", digits: "digit", titles: "title" };
    const item = data[category]?.[key];
    if (!item) return;
    if (category === "perks") {
      const owned = save.unlockedPerks?.includes(key);
      if (owned) {
        setSave(prev => ({ ...prev, activePerks: prev.activePerks?.includes(key) ? prev.activePerks.filter(x=>x!==key) : [...(prev.activePerks||[]),key] }));
        return;
      }
      if (save.coins < item.cost) { showToast("Not enough credits.", "#ff3366"); return; }
      setSave(prev => ({ ...prev, coins: prev.coins - item.cost, unlockedPerks: [...(prev.unlockedPerks||[]),key], activePerks: [...(prev.activePerks||[]),key] }));
      return;
    }
    const uk = ukMap[category], ak = akMap[category];
    if (!uk) return;
    const owned = save[uk]?.includes(key);
    if (owned) { setSave(prev => ({ ...prev, [ak]: key })); return; }
    if (save.coins < item.cost) { showToast("Not enough credits.", "#ff3366"); return; }
    setSave(prev => ({ ...prev, coins: prev.coins - item.cost, [uk]: [...(prev[uk]||[]),key], [ak]: key }));
  }

  if (!save) return (
    <div style={{ minHeight:"100vh", background:"#04060f", display:"flex", alignItems:"center", justifyContent:"center", color:"#00e5ff", fontFamily:"monospace", fontSize:20 }}>
      LOADING...
    </div>
  );

  return (
    <div style={{ "--P":T.p, "--BG":T.bg, "--PAN":T.panel, "--ACC":T.acc, minHeight:"100vh", background:T.bg, color:"#ddeeff", fontFamily:"'Rajdhani',sans-serif", position:"relative", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Share+Tech+Mono&display=swap');
        *,*::before,*::after{box-sizing:border-box;user-select:none;}
        body{margin:0;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{background:var(--P);border-radius:3px;}
        .btn{background:transparent;border:1.5px solid var(--P);color:var(--P);font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:10px 22px;cursor:pointer;border-radius:6px;transition:all .15s;font-size:14px;white-space:nowrap;}
        .btn:hover:not(:disabled){background:var(--P);color:#000;box-shadow:0 0 18px var(--P);transform:translateY(-1px);}
        .btn:disabled{opacity:.3;cursor:not-allowed;}
        .btn.sel{background:var(--P);color:#000;}
        .btn.red{border-color:#ff3366;color:#ff3366;}
        .btn.red:hover:not(:disabled){background:#ff3366;color:#fff;box-shadow:0 0 18px #ff3366;}
        .btn.sm{padding:7px 13px;font-size:12px;}
        .glass{background:var(--PAN);border:1px solid rgba(255,255,255,0.09);border-radius:12px;}
        .cell{display:flex;align-items:center;justify-content:center;border-radius:3px;border:1px solid rgba(255,255,255,0.08);font-family:'Share Tech Mono',monospace;font-weight:700;transition:background .08s,transform .1s,box-shadow .1s;}
        .cell.clickable:hover{transform:scale(1.12);border-color:var(--P)!important;z-index:3;box-shadow:0 0 8px var(--P)55;cursor:pointer;}
        .cell.flg{border-color:var(--P)!important;background:rgba(0,229,255,0.07)!important;}
        @keyframes explodeCell{0%{transform:scale(1);}25%{transform:scale(1.7);background:#ff3366!important;box-shadow:0 0 14px #ff3366;border-color:#ff3366!important;}60%{transform:scale(.85);background:#ff6600!important;}100%{transform:scale(1);}}
        .cell.exploding{animation:explodeCell .45s ease forwards;}
        @keyframes winPulse{0%,100%{box-shadow:0 0 4px var(--P)55;}50%{box-shadow:0 0 14px var(--P);}}
        .cell.won-cell{animation:winPulse 1.4s ease infinite;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        .fadein{animation:fadeUp .4s ease;}
        .grid{display:grid;gap:3px;}
        .board-active{outline:2.5px solid var(--P);outline-offset:5px;border-radius:5px;box-shadow:0 0 22px var(--P)44;}
        .board-active2{outline:2.5px solid #ff3366;outline-offset:5px;border-radius:5px;box-shadow:0 0 22px #ff336644;}
        .hud-l{font-family:'Share Tech Mono',monospace;font-size:10px;color:#555;letter-spacing:3px;text-transform:uppercase;margin-bottom:3px;}
        .hud-v{font-family:'Share Tech Mono',monospace;font-size:20px;font-weight:700;color:var(--P);text-shadow:0 0 8px var(--P)66;}
        .tab{flex:1;padding:11px 6px;text-align:center;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:2px;font-size:12px;text-transform:uppercase;border-bottom:2px solid transparent;color:#555;transition:.18s;}
        .tab.on{border-bottom-color:var(--P);color:var(--P);}
        .srow{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-radius:9px;margin-bottom:7px;border:1px solid rgba(255,255,255,0.07);background:rgba(0,0,0,.3);transition:border-color .15s;}
        .srow.sel{border-color:var(--P);background:rgba(255,255,255,.04);}
        .gridlines{position:fixed;top:0;left:0;width:100%;height:100%;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:44px 44px;pointer-events:none;z-index:0;}
        .scanline{position:fixed;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.04) 2px,rgba(0,0,0,.04) 4px);pointer-events:none;z-index:9999;}
        .toast{position:fixed;top:18px;left:50%;transform:translateX(-50%);padding:10px 22px;border-radius:7px;font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:2px;font-size:15px;z-index:10000;animation:fadeUp .3s ease;pointer-events:none;white-space:nowrap;}
        .turn-badge{font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:3px;padding:5px 14px;border-radius:20px;font-weight:700;transition:all .2s;}
        input[type=text]{background:transparent;border:none;border-bottom:1.5px solid var(--P);color:var(--P);font-family:'Rajdhani',sans-serif;font-weight:700;font-size:15px;letter-spacing:2px;outline:none;width:110px;text-align:center;text-transform:uppercase;}
      `}</style>

      <div className="scanline"/>
      <div className="gridlines"/>
      {toast && <div className="toast" style={{ background:T.bg, border:`1.5px solid ${toast.color}`, color:toast.color }}>{toast.msg}</div>}

      {/* ═══ MENU ═══ */}
      {screen === "menu" && (
        <div className="fadein" style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 16px", position:"relative", zIndex:1 }}>
          <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:"clamp(50px,12vw,100px)", color:T.p, textShadow:`0 0 60px ${T.p}`, letterSpacing:10, lineHeight:1, textAlign:"center", marginBottom:6 }}>VOID<br/>SWEEPER</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:7, color:"#444", marginBottom:4 }}>NEURAL DEFUSAL PROTOCOL</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, letterSpacing:4, color:T.acc, marginBottom:28 }}>{TITLES[save.title]?.name || "RECRUIT"}</div>

          <div className="glass" style={{ padding:"11px 26px", marginBottom:24, display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:"#666", letterSpacing:3 }}>CREDITS</span>
            <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:26, color:"#ffd700", textShadow:"0 0 10px rgba(255,215,0,.4)" }}>◈ {save.coins.toLocaleString()}</span>
          </div>

          {/* Mode select */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:3, color:"#444", textAlign:"center", marginBottom:9 }}>GAME MODE</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
              {[["solo","SOLO"],["robot","VS ROBOT"],["versus","VS PLAYER"]].map(([id,lbl]) => (
                <button key={id} className={`btn${selMode===id?" sel":""}`} style={{ fontSize:13, padding:"9px 16px" }} onClick={() => { beep("nav"); setSelMode(id); }}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* VS Player name edit */}
          {selMode === "versus" && (
            <div className="glass fadein" style={{ padding:"13px 22px", marginBottom:14, display:"flex", gap:28, alignItems:"center" }}>
              {[[p1Name,setP1Name,"p1"],[p2Name,setP2Name,"p2"]].map(([name,setFn,id],i) => (
                <div key={id} style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:"#555", letterSpacing:2, marginBottom:5 }}>PLAYER {i+1}</div>
                  {editName === id
                    ? <input type="text" maxLength={10} defaultValue={name} autoFocus
                        onBlur={e => { setFn(e.target.value.trim().toUpperCase()||name); setEditName(null); }}
                        onKeyDown={e => { if (e.key==="Enter") { setFn(e.target.value.trim().toUpperCase()||name); setEditName(null); } }} />
                    : <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:16, color:T.p, cursor:"pointer", letterSpacing:2 }} onClick={() => setEditName(id)}>{name} ✎</div>
                  }
                </div>
              ))}
            </div>
          )}

          {/* Mode description */}
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:"#444", letterSpacing:2, textAlign:"center", marginBottom:14, maxWidth:380 }}>
            {selMode==="solo"  && "SOLO — clear all mines alone"}
            {selMode==="robot" && "VS ROBOT — you and the bot take turns on the SAME board. Hit a mine, opponent wins."}
            {selMode==="versus"&& "VS PLAYER — two boards, same mouse. Alternate turns. First to clear wins."}
          </div>

          {/* Difficulty */}
          <div style={{ display:"flex", flexDirection:"column", gap:7, width:"100%", maxWidth:370, marginBottom:22 }}>
            {Object.entries(DIFFS).map(([key,cfg]) => (
              <button key={key} className="btn" style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                ...(key==="god" ? {borderColor:"#ff3366",color:"#ff3366"} : key==="nightmare" ? {borderColor:"#ffaa00",color:"#ffaa00"} : {}),
              }} onClick={() => { setSelDiff(key); startGame(key,selMode); }}>
                <span>{cfg.label}</span>
                <span style={{ opacity:.5, fontWeight:400, fontSize:11 }}>{cfg.rows}×{cfg.cols} · {cfg.mines} mines · ◈{cfg.reward}</span>
              </button>
            ))}
          </div>

          <div style={{ display:"flex", gap:9, flexWrap:"wrap", justifyContent:"center" }}>
            <button className="btn" onClick={() => { beep("nav"); setShopTab("themes"); setScreen("shop"); }}>◈ ARMORY</button>
            <button className="btn" onClick={() => { beep("nav"); setScreen("stats"); }}>▦ RECORDS</button>
          </div>
        </div>
      )}

      {/* ═══ GAME ═══ */}
      {screen === "game" && conf && (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 8px", position:"relative", zIndex:1 }}>

          {/* HUD */}
          <div className="glass" style={{ width:"100%", maxWidth: conf.mode==="versus" ? 1100 : 680, padding:"10px 16px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <div style={{ textAlign:"center" }}>
              <div className="hud-l">MINES LEFT</div>
              <div className="hud-v">{mineSym} {conf.mines - fc1}</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div className="hud-l">DIFFICULTY</div>
              <div className="hud-v" style={{ fontSize:14 }}>{DIFFS[conf.diffKey]?.label}</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div className="hud-l">TIME</div>
              <div className="hud-v" style={ elapsed>90 ? {color:"#ff3366",textShadow:"0 0 10px #ff3366"} : {} }>{elapsed}s</div>
            </div>

            {conf.mode === "robot" && s1 === "playing" && (
              <div className="turn-badge" style={{ background:turn==="player" ? `${T.p}22` : "rgba(255,51,102,.15)", color:turn==="player" ? T.p : "#ff3366", border:`1px solid ${turn==="player" ? T.p : "#ff3366"}` }}>
                {turn === "player" ? "YOUR TURN" : "BOT THINKING..."}
              </div>
            )}
            {conf.mode === "versus" && s1 === "playing" && s2 === "playing" && (
              <div className="turn-badge" style={{ background:turn==="p1" ? `${T.p}22` : "rgba(255,51,102,.15)", color:turn==="p1" ? T.p : "#ff3366", border:`1px solid ${turn==="p1" ? T.p : "#ff3366"}` }}>
                {turn === "p1" ? `${conf.p1}'S TURN` : `${conf.p2}'S TURN`}
              </div>
            )}

            <div style={{ display:"flex", gap:7, flexWrap:"wrap", justifyContent:"center" }}>
              {hasPerk("ghostStep") && !usedUndo && s1==="dead" && conf.mode!=="versus" && (
                <button className="btn sm" onClick={handleUndo}>↩ UNDO</button>
              )}
              <button className="btn sm red" onClick={() => { clearInterval(timerRef.current); clearTimeout(botRef.current); gameOverRef.current=true; setScreen("menu"); }}>ABORT</button>
            </div>
          </div>

          {/* Boards */}
          <div style={{ display:"flex", gap:18, alignItems:"flex-start", justifyContent:"center", flexWrap:"wrap" }}>

            {/* Board 1 */}
            <div>
              {(conf.mode==="versus"||conf.mode==="robot") && (
                <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13, letterSpacing:4, color:T.p, textAlign:"center", marginBottom:7, textShadow:`0 0 8px ${T.p}66` }}>
                  {conf.mode==="versus" ? conf.p1 : "YOUR FIELD"}
                  {" · "}{flagSym} {fc1}
                  {s1==="won"&&" · ✓ CLEARED"}
                  {s1==="dead"&&" · ✗ DEAD"}
                </div>
              )}
              <div className={
                conf.mode==="robot" && turn==="player" && s1==="playing" ? "board-active" :
                conf.mode==="versus" && turn==="p1" && s1==="playing" ? "board-active" : ""
              }>
                <Board
                  cells={b1} rows={conf.rows} cols={conf.cols}
                  status={s1} exploding={exploding1}
                  mineSym={mineSym} flagSym={flagSym} digitMap={digitMap} themeP={T.p}
                  canClick={ (conf.mode==="solo" && s1==="playing") || (conf.mode==="robot" && s1==="playing" && turn==="player") || (conf.mode==="versus" && s1==="playing" && turn==="p1") }
                  onReveal={(r,c) => handleReveal(r,c,"b1")}
                  onFlag={(e,r,c) => handleFlag(e,r,c,"b1")}
                />
              </div>
            </div>

            {/* Board 2 — versus only */}
            {conf.mode === "versus" && (
              <div>
                <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13, letterSpacing:4, color:"#ff3366", textAlign:"center", marginBottom:7, textShadow:"0 0 8px #ff336666" }}>
                  {conf.p2}
                  {" · "}{flagSym} {fc2}
                  {s2==="won"&&" · ✓ CLEARED"}
                  {s2==="dead"&&" · ✗ DEAD"}
                </div>
                <div className={turn==="p2" && s2==="playing" ? "board-active2" : ""}>
                  <Board
                    cells={b2} rows={conf.rows} cols={conf.cols}
                    status={s2} exploding={exploding2}
                    mineSym={mineSym} flagSym={flagSym} digitMap={digitMap} themeP="#ff3366"
                    canClick={s2==="playing" && turn==="p2"}
                    onReveal={(r,c) => handleReveal(r,c,"b2")}
                    onFlag={(e,r,c) => handleFlag(e,r,c,"b2")}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ RESULT ═══ */}
      {screen === "result" && result && conf && (
        <div className="fadein" style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, position:"relative", zIndex:1 }}>

          {conf.mode === "solo" && (
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:"clamp(42px,9vw,80px)", letterSpacing:6, textAlign:"center", marginBottom:14, color:result.isWin?T.p:"#ff3366", textShadow:`0 0 28px ${result.isWin?T.p:"#ff3366"}` }}>
              {result.isWin ? "SECTOR CLEARED" : "DETONATED"}
            </div>
          )}
          {conf.mode === "robot" && (
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:"clamp(38px,8vw,72px)", letterSpacing:6, textAlign:"center", marginBottom:14, color:result.winner==="player"?T.p:"#ff3366", textShadow:`0 0 28px ${result.winner==="player"?T.p:"#ff3366"}` }}>
              {result.winner === "player" ? "YOU WIN" : "BOT WINS"}
            </div>
          )}
          {conf.mode === "versus" && (
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:"clamp(38px,8vw,72px)", letterSpacing:6, textAlign:"center", marginBottom:20, color:result.winner==="p1"?T.p:"#ff3366", textShadow:`0 0 28px ${result.winner==="p1"?T.p:"#ff3366"}` }}>
              {result.winner==="p1" ? conf.p1 : conf.p2} WINS!
            </div>
          )}

          {conf.mode === "versus" && (
            <div style={{ display:"flex", gap:14, marginBottom:20, justifyContent:"center", flexWrap:"wrap" }}>
              {[[conf.p1,"p1",T.p],[conf.p2,"p2","#ff3366"]].map(([name,id,col]) => (
                <div key={id} style={{ minWidth:140, textAlign:"center", padding:"14px 18px", borderRadius:10, border:`1.5px solid ${result.winner===id?col:"rgba(255,255,255,.08)"}`, background:result.winner===id?`${col}11`:"transparent" }}>
                  <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:18, color:col, letterSpacing:2 }}>{name}</div>
                  <div style={{ fontSize:28, marginTop:8 }}>{result.winner===id?"✓":"✗"}</div>
                </div>
              ))}
            </div>
          )}

          <div className="glass" style={{ padding:"20px 28px", marginBottom:20, minWidth:260, width:"100%", maxWidth:380 }}>
            <SRow label="Mode" val={conf.mode.toUpperCase()} />
            <SRow label="Difficulty" val={DIFFS[conf.diffKey]?.label} />
            <SRow label="Time" val={`${result.time}s`} />
            {result.perfect && <SRow label="Perfect Sweep" val="+50%" color={T.p} />}
            {result.coins > 0 && hasPerk("creditSurge") && <SRow label="Credit Surge" val="×1.5" color="#ffd700"/>}
            <div style={{ height:1, background:"rgba(255,255,255,.07)", margin:"12px 0" }}/>
            <SRow label="PAYOUT" val={`◈ ${result.coins?.toLocaleString()}`} big color={result.coins>0?"#ffd700":"#555"} />
          </div>

          <div style={{ display:"flex", gap:9, flexWrap:"wrap", justifyContent:"center" }}>
            <button className="btn" onClick={() => startGame(conf.diffKey, conf.mode)}>RETRY</button>
            <button className="btn" style={{ borderColor:"#444", color:"#666" }} onClick={() => { beep("nav"); setScreen("menu"); }}>RETURN TO HUB</button>
          </div>
        </div>
      )}

      {/* ═══ SHOP ═══ */}
      {screen === "shop" && (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
            <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:24, color:T.p, letterSpacing:5 }}>ARMORY</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:18, color:"#ffd700" }}>◈ {save.coins.toLocaleString()}</div>
          </div>
          <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,.07)", overflowX:"auto" }}>
            {[["themes","THEMES"],["flags","FLAGS"],["mines","MINES"],["digits","DIGITS"],["perks","PERKS"],["titles","TITLES"]].map(([k,l]) => (
              <div key={k} className={`tab${shopTab===k?" on":""}`} onClick={() => { beep("nav"); setShopTab(k); }}>{l}</div>
            ))}
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 12px", maxWidth:660, width:"100%", margin:"0 auto" }}>
            <ShopPanel tab={shopTab} save={save} T={T} onBuy={purchase} />
          </div>
          <div style={{ padding:12, borderTop:"1px solid rgba(255,255,255,.07)" }}>
            <button className="btn" style={{ width:"100%" }} onClick={() => { beep("nav"); setScreen("menu"); }}>← EXIT ARMORY</button>
          </div>
        </div>
      )}

      {/* ═══ STATS ═══ */}
      {screen === "stats" && (
        <div className="fadein" style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, position:"relative", zIndex:1 }}>
          <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:36, color:T.p, letterSpacing:6, marginBottom:26 }}>RECORDS</div>
          <div className="glass" style={{ padding:"22px 30px", width:"100%", maxWidth:400 }}>
            <SRow label="Games Played" val={save.stats.played} />
            <SRow label="Missions Won" val={save.stats.wins} color={T.p} />
            <SRow label="Missions Lost" val={save.stats.losses} />
            <SRow label="Perfect Sweeps" val={save.stats.perfect} color={T.acc} />
            <SRow label="Total Credits" val={`◈ ${save.stats.totalCoins?.toLocaleString()}`} color="#ffd700" />
            <div style={{ height:1, background:"rgba(255,255,255,.07)", margin:"12px 0" }}/>
            {Object.entries(DIFFS).map(([key,cfg]) =>
              save.stats.bestTimes?.[key] != null
                ? <SRow key={key} label={`Best · ${cfg.label}`} val={`${save.stats.bestTimes[key]}s`} />
                : null
            )}
          </div>
          <button className="btn" style={{ marginTop:22 }} onClick={() => { beep("nav"); setScreen("menu"); }}>← RETURN</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOARD COMPONENT
// ═══════════════════════════════════════════════════════════════
function Board({ cells, rows, cols, status, exploding, mineSym, flagSym, digitMap, themeP, canClick, onReveal, onFlag }) {
  if (!cells.length) return null;
  const vw = typeof window !== "undefined" ? window.innerWidth : 700;
  const maxW = Math.min(vw * 0.46, 460);
  const cs = Math.min(Math.floor((maxW - 10) / cols), 42);
  const fs = Math.max(cs * 0.46, 12);

  return (
    <div className="grid" style={{ gridTemplateColumns:`repeat(${cols},${cs}px)` }}>
      {cells.map(cell => {
        const isExpl = exploding.has(cell.idx);
        const isMineDead = cell.revealed && cell.mine;
        const isFlagged = cell.flagged && !cell.revealed;
        const isRevNum = cell.revealed && !cell.mine && cell.count > 0;
        const isRevEmpty = cell.revealed && !cell.mine && cell.count === 0;
        const isWon = status === "won" && cell.revealed && !cell.mine;

        let bg = "rgba(255,255,255,0.04)";
        let bc = "rgba(255,255,255,0.08)";
        let content = null;
        let extraClass = "";

        if (isExpl) {
          extraClass = " exploding";
          bg = "#1a0008"; bc = "#ff3366";
          content = <span style={{ fontSize:fs }}>{mineSym}</span>;
        } else if (isMineDead) {
          bg = "#1a0008"; bc = "#ff3366";
          content = <span style={{ fontSize:fs }}>{mineSym}</span>;
        } else if (isFlagged) {
          extraClass = " flg";
          content = <span style={{ fontSize:fs }}>{flagSym}</span>;
        } else if (isRevNum) {
          bg = "rgba(0,0,0,.45)"; bc = "rgba(255,255,255,.05)";
          content = <span style={{ fontSize:Math.max(cs*0.44,11), color:NUM_COLORS[cell.count], textShadow:`0 0 6px ${NUM_COLORS[cell.count]}` }}>{digitMap[cell.count]}</span>;
        } else if (isRevEmpty) {
          bg = "rgba(0,0,0,.5)"; bc = "rgba(255,255,255,.03)";
        }

        if (isWon) extraClass += " won-cell";
        const clickClass = canClick && !cell.revealed ? " clickable" : "";

        return (
          <div key={cell.idx}
            className={`cell${extraClass}${clickClass}`}
            style={{ width:cs, height:cs, background:bg, borderColor:bc }}
            onClick={() => canClick && onReveal(cell.r, cell.c)}
            onContextMenu={e => { e.preventDefault(); canClick && onFlag(e, cell.r, cell.c); }}
          >{content}</div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHOP PANEL
// ═══════════════════════════════════════════════════════════════
function ShopPanel({ tab, save, T, onBuy }) {
  const entries = (() => {
    if (tab === "themes") return Object.entries(THEMES).map(([k,v]) => ({
      key:k, label:<><span style={{color:v.p,textShadow:`0 0 6px ${v.p}`,marginRight:8}}>█</span>{v.name}</>,
      cost:v.cost, owned:save.unlockedThemes?.includes(k), active:save.theme===k,
    }));
    if (tab === "flags") return Object.entries(FLAGS).map(([k,v]) => ({
      key:k, label:<><span style={{marginRight:8}}>{v.sym}</span>{v.name}</>,
      cost:v.cost, owned:save.unlockedFlags?.includes(k), active:save.flag===k,
    }));
    if (tab === "mines") return Object.entries(MINES).map(([k,v]) => ({
      key:k, label:<><span style={{marginRight:8}}>{v.sym}</span>{v.name}</>,
      cost:v.cost, owned:save.unlockedMines?.includes(k), active:save.mine===k,
    }));
    if (tab === "digits") return Object.entries(DIGITS).map(([k,v]) => ({
      key:k, label:v.name, sub:v.map.slice(1,6).join("  "),
      cost:v.cost, owned:save.unlockedDigits?.includes(k), active:save.digit===k,
    }));
    if (tab === "perks") return Object.entries(PERKS).map(([k,v]) => ({
      key:k, label:v.name, sub:v.desc, isPerk:true,
      cost:v.cost, owned:save.unlockedPerks?.includes(k), active:save.activePerks?.includes(k),
    }));
    if (tab === "titles") return Object.entries(TITLES).map(([k,v]) => ({
      key:k, label:v.name,
      cost:v.cost, owned:save.unlockedTitles?.includes(k), active:save.title===k,
    }));
    return [];
  })();

  return entries.map(({ key, label, sub, cost, owned, active, isPerk }) => (
    <div key={key} className={`srow${active?" sel":""}`}>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:16, color:owned?"#ddeeff":"#666" }}>{label}</div>
        {sub && <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:"#555", marginTop:3, letterSpacing:1 }}>{sub}</div>}
      </div>
      <button className={`btn sm${active?" sel":""}`} onClick={() => onBuy(tab, key)} style={{ minWidth:105 }}>
        {active ? (isPerk?"ACTIVE":"EQUIPPED") : owned ? (isPerk?"ENABLE":"EQUIP") : `◈ ${cost.toLocaleString()}`}
      </button>
    </div>
  ));
}

function SRow({ label, val, big, color }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:11 }}>
      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:big?14:11, color:"#666", letterSpacing:2 }}>{label}</span>
      <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:big?26:17, color:color||"#ddeeff" }}>{val}</span>
    </div>
  );
}