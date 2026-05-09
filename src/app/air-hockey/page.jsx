"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Board ────────────────────────────────────────────────────────────────────
const BW      = 360;   // board width
const BH      = 580;   // board height
const HALF    = BH / 2;
const GW      = 120;   // goal mouth width
const GX      = (BW - GW) / 2;   // goal left x
const PR      = 11;    // puck radius
const MR      = 26;    // mallet radius
const WIN     = 7;

// ─── Colours / skins ─────────────────────────────────────────────────────────
const ARENAS = [
  { id:"cyber",  name:"CYBER GRID", cost:0,   bg:"#07090f", line:"#162240", p1:"#00d4ff", p2:"#ff3060" },
  { id:"retro",  name:"SYNTHWAVE",  cost:400,  bg:"#150a28", line:"#990099", p1:"#00eedd", p2:"#ff00bb" },
  { id:"blood",  name:"VAMPIRE",    cost:800,  bg:"#090000", line:"#440000", p1:"#ff3344", p2:"#ff0000" },
  { id:"ice",    name:"ICE RINK",   cost:600,  bg:"#ddeef8", line:"#88aacc", p1:"#0033bb", p2:"#bb1100" },
];
const PUCKS = [
  { id:"white", name:"STANDARD", cost:0,   col:"#ffffff", glow:"#888888" },
  { id:"cyan",  name:"PLASMA",   cost:100,  col:"#00ffff", glow:"#0077ff" },
  { id:"pink",  name:"NEON",     cost:200,  col:"#ff2288", glow:"#ff0044" },
  { id:"gold",  name:"GOLD",     cost:500,  col:"#ffd700", glow:"#ff8800" },
  { id:"green", name:"TOXIC",    cost:300,  col:"#00ff77", glow:"#00aa33" },
];

// ─── Persistence ──────────────────────────────────────────────────────────────
const SAVE_KEY = "ah_v6";
const DEF = { coins:300, puck:"white", arena:"cyber",
  ownedPucks:["white"], ownedArenas:["cyber"], wins:0, losses:0 };
function loadSD() {
  try { const s = localStorage.getItem(SAVE_KEY); if (s) return { ...DEF, ...JSON.parse(s) }; } catch (_) {}
  return { ...DEF };
}
function saveSD(d) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch (_) {} }

// ─── Math ─────────────────────────────────────────────────────────────────────
function mag(vx, vy)    { return Math.sqrt(vx * vx + vy * vy); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// ─── Game state factory ───────────────────────────────────────────────────────
/*
  PHASES:
    "aim"     – active player is dragging in their half; mallet follows finger
    "strike"  – mallet is animating toward the puck (player already released)
    "rolling" – puck is moving; both mallets spring back to home; nobody can drag
    "scored"  – brief pause after goal
*/
function mkGame(mode) {
  return {
    mode,               // "bot" | "local"
    turn: "p1",         // "p1" | "p2"  — who is acting RIGHT NOW
    phase: "aim",

    puck: { x: BW / 2, y: BH / 2, vx: 0, vy: 0 },

    // p1 lives in BOTTOM half (y > HALF), p2 lives in TOP half (y < HALF)
    m1: { x: BW/2, y: BH - 90,  vx: 0, vy: 0, hx: BW/2, hy: BH - 90  },
    m2: { x: BW/2, y: 90,       vx: 0, vy: 0, hx: BW/2, hy: 90       },

    // drag info (only valid during "aim")
    drag: { active: false, ox: 0, oy: 0 },   // ox/oy = pointer-down position

    // strike target (only valid during "strike")
    strikeTarget: { x: 0, y: 0 },

    score: { p1: 0, p2: 0 },
    flash: { alpha: 0, col: "#fff" },
    shake: 0,
    botTimeout: null,
    goalLock: false,   // prevents double-counting
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AirHockey() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const G         = useRef(null);     // live game state — RAF reads this directly
  const SD        = useRef(loadSD()); // save data — same pattern

  // React state only for screens + HUD numbers
  const [screen, setScreen] = useState("menu");
  const [hud,    setHud]    = useState({ p1: 0, p2: 0, turn: "p1", phase: "aim", mode: "bot" });
  const [power,  setPower]  = useState(0);
  const [sd,     setSd]     = useState(null);
  const [tab,    setTab]    = useState("pucks");
  const [scale,  setScale]  = useState(1);

  // ── bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const d = loadSD();
    setSd(d); SD.current = d;
  }, []);

  useEffect(() => {
    const resize = () => {
      setScale(Math.min(
        window.innerWidth  * 0.97 / BW,
        window.innerHeight * 0.63 / BH,
        1.6
      ));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); }, []);

  // ── persistence helper ─────────────────────────────────────────────────────
  function persist(fn) {
    setSd(prev => {
      const next = fn(prev || DEF);
      SD.current = next;
      saveSD(next);
      return next;
    });
  }

  // ── canvas → board coordinates ─────────────────────────────────────────────
  function toBoard(clientX, clientY) {
    const r = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (BW / r.width),
      y: (clientY - r.top)  * (BH / r.height),
    };
  }

  // ── sync HUD from G.current (called only at phase transitions) ─────────────
  function syncHud() {
    const g = G.current;
    setHud({ p1: g.score.p1, p2: g.score.p2, turn: g.turn, phase: g.phase, mode: g.mode });
  }

  // ── game start ─────────────────────────────────────────────────────────────
  function startGame(mode) {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(G.current?.botTimeout);
    G.current = mkGame(mode);
    setScreen("playing");
    setPower(0);
    setHud({ p1: 0, p2: 0, turn: "p1", phase: "aim", mode });
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── reset after a goal ─────────────────────────────────────────────────────
  function resetRound(nextTurn) {
    const g = G.current;
    g.puck  = { x: BW/2, y: BH/2, vx: 0, vy: 0 };
    // mallets return to fixed home positions
    g.m1 = { x: BW/2, y: BH-90, vx: 0, vy: 0, hx: BW/2, hy: BH-90 };
    g.m2 = { x: BW/2, y: 90,    vx: 0, vy: 0, hx: BW/2, hy: 90    };
    g.drag          = { active: false, ox: 0, oy: 0 };
    g.strikeTarget  = { x: 0, y: 0 };
    g.phase         = "aim";
    g.turn          = nextTurn;
    g.goalLock      = false;
    syncHud();
    setPower(0);
    if (nextTurn === "p2" && g.mode === "bot") scheduleBotShot();
  }

  // ── goal ───────────────────────────────────────────────────────────────────
  function onGoal(scorer) {
    const g = G.current;
    if (g.goalLock) return;
    g.goalLock = true;
    g.score[scorer]++;
    g.phase    = "scored";
    g.puck.vx  = 0; g.puck.vy = 0;
    const arena = getArena();
    g.flash     = { alpha: 0.7, col: scorer === "p1" ? arena.p1 : arena.p2 };
    g.shake     = 20;
    syncHud();

    if (g.score.p1 >= WIN || g.score.p2 >= WIN) {
      setTimeout(() => {
        cancelAnimationFrame(rafRef.current);
        if (g.mode === "bot") {
          if (scorer === "p1") persist(p => ({ ...p, coins: p.coins + 150, wins: p.wins + 1 }));
          else                 persist(p => ({ ...p, losses: p.losses + 1 }));
        }
        setScreen("gameover");
      }, 1400);
    } else {
      // the player who was scored ON goes next (they start the next round)
      setTimeout(() => resetRound(scorer === "p1" ? "p2" : "p1"), 1800);
    }
  }

  // ── bot AI ─────────────────────────────────────────────────────────────────
  function scheduleBotShot() {
    clearTimeout(G.current.botTimeout);
    G.current.botTimeout = setTimeout(() => {
      const g = G.current;
      if (g.phase !== "aim" || g.turn !== "p2") return;

      // Bot picks a point near the puck, within its half
      const px = g.puck.x, py = g.puck.y;
      const tx = clamp(px + (Math.random() - 0.5) * 80, MR, BW - MR);
      const ty = clamp(py + (Math.random() - 0.5) * 50, MR, HALF - MR);

      // Move mallet home to a reasonable pre-shot position
      const bx = clamp(px + (Math.random() - 0.5) * 40, MR, BW - MR);
      const by = clamp(90 + (Math.random() - 0.5) * 30, MR, HALF - MR);
      g.m2.x = bx; g.m2.y = by; g.m2.hx = bx; g.m2.hy = by;

      g.strikeTarget = { x: tx, y: ty };
      g.phase        = "strike";
      syncHud();
    }, 700 + Math.random() * 800);
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  function getArena() { return ARENAS.find(a => a.id === SD.current.arena) || ARENAS[0]; }
  function getPuck()  { return PUCKS.find(p => p.id === SD.current.puck)   || PUCKS[0]; }

  // Elastic collision: puck hits wall
  // Elastic collision: mallet hits puck (mallet treated as heavy, puck light)
  function malletToPuck(m, p) {
    const dx = p.x - m.x, dy = p.y - m.y;
    const d  = mag(dx, dy);
    if (d === 0 || d >= PR + MR) return;

    const nx = dx / d, ny = dy / d;

    // Separate them
    const overlap = PR + MR - d;
    p.x += nx * overlap;
    p.y += ny * overlap;

    // Relative velocity of mallet toward puck
    const rvx = m.vx - p.vx, rvy = m.vy - p.vy;
    const rv   = rvx * nx + rvy * ny;
    if (rv <= 0) return;   // already separating

    // Transfer: mallet is ~8x heavier than puck
    const restitution = 0.85;
    const mMass = 8, pMass = 1;
    const j = (1 + restitution) * rv / (1/pMass + 1/mMass);

    p.vx -= (j / pMass) * nx;
    p.vy -= (j / pMass) * ny;
    m.vx += (j / mMass) * nx;
    m.vy += (j / mMass) * ny;
  }

  // Spring a mallet back toward its home position
  function springToHome(m) {
    const dx = m.hx - m.x, dy = m.hy - m.y;
    m.vx = dx * 0.15;
    m.vy = dy * 0.15;
    m.x += m.vx;
    m.y += m.vy;
  }

  // ── RAF loop ───────────────────────────────────────────────────────────────
  // IMPORTANT: this function is never recreated. It always reads G.current fresh.
  function loop() {
    const g   = G.current;
    const el  = canvasRef.current;
    if (!el || !g) { rafRef.current = requestAnimationFrame(loop); return; }
    const ctx = el.getContext("2d");

    // ── PHASE: strike ────────────────────────────────────────────────────────
    // Active mallet lunges toward strikeTarget
    if (g.phase === "strike") {
      const m  = g.turn === "p1" ? g.m1 : g.m2;
      const tx = g.strikeTarget.x, ty = g.strikeTarget.y;

      // Accelerate toward target (spring-style so it's smooth)
      m.vx += (tx - m.x) * 0.35;
      m.vy += (ty - m.y) * 0.35;
      m.vx *= 0.6;   // heavy damping so it snaps then stops
      m.vy *= 0.6;
      m.x  += m.vx;
      m.y  += m.vy;

      // Clamp to own half
      m.x = clamp(m.x, MR, BW - MR);
      if (g.turn === "p1") m.y = clamp(m.y, HALF + MR, BH - MR);
      else                 m.y = clamp(m.y, MR, HALF - MR);

      // Check collision with puck every frame
      malletToPuck(m, g.puck);

      // Transition to rolling once mallet nearly reaches target
      const dist = mag(tx - m.x, ty - m.y);
      if (dist < 4) {
        // Update mallet home to wherever it landed
        m.hx = m.x; m.hy = m.y;
        g.phase = "rolling";
        syncHud();
      }
    }

    // ── PHASE: rolling ───────────────────────────────────────────────────────
    // Puck moves. Both mallets spring back to home. Nobody can drag.
    if (g.phase === "rolling") {
      const p = g.puck;

      // Move puck
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.989; p.vy *= 0.989;

      // Bounce off left/right walls
      if (p.x - PR < 0)  { p.x = PR;      p.vx = Math.abs(p.vx) * 0.75; }
      if (p.x + PR > BW) { p.x = BW - PR; p.vx = -Math.abs(p.vx) * 0.75; }

      // Top wall — P2's goal
      if (p.y - PR < 0) {
        if (p.x > GX && p.x < GX + GW) { onGoal("p1"); }
        else { p.y = PR; p.vy = Math.abs(p.vy) * 0.75; }
      }
      // Bottom wall — P1's goal
      if (p.y + PR > BH) {
        if (p.x > GX && p.x < GX + GW) { onGoal("p2"); }
        else { p.y = BH - PR; p.vy = -Math.abs(p.vy) * 0.75; }
      }

      // Puck can deflect off BOTH mallets while rolling
      malletToPuck(g.m1, p);
      malletToPuck(g.m2, p);

      // Both mallets spring home while rolling
      springToHome(g.m1);
      springToHome(g.m2);

      // Clamp mallets to their halves while springing
      g.m1.x = clamp(g.m1.x, MR, BW - MR);
      g.m1.y = clamp(g.m1.y, HALF + MR, BH - MR);
      g.m2.x = clamp(g.m2.x, MR, BW - MR);
      g.m2.y = clamp(g.m2.y, MR, HALF - MR);

      // Tiny velocity → zero
      if (Math.abs(p.vx) < 0.08) p.vx = 0;
      if (Math.abs(p.vy) < 0.08) p.vy = 0;

      // Puck fully stopped → switch turn
      if (!g.goalLock && p.vx === 0 && p.vy === 0) {
        const next = g.turn === "p1" ? "p2" : "p1";
        g.turn  = next;
        g.phase = "aim";
        g.drag  = { active: false, ox: 0, oy: 0 };
        syncHud();
        setPower(0);
        if (next === "p2" && g.mode === "bot") scheduleBotShot();
      }
    }

    // ── PHASE: aim ───────────────────────────────────────────────────────────
    // During aim: the active mallet follows the drag (pointer move updates m.x/m.y directly).
    // The inactive mallet sits still at its home.
    // Nothing to compute here in the physics sense — pointer events handle it.

    // ── RENDER ───────────────────────────────────────────────────────────────
    const A  = getArena();
    const PK = getPuck();

    ctx.save();
    if (g.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7);
      g.shake--;
    }

    // Background
    ctx.fillStyle = A.bg;
    ctx.fillRect(0, 0, BW, BH);

    // Centre line + circles
    ctx.strokeStyle = A.line + "88"; ctx.lineWidth = 1.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, HALF); ctx.lineTo(BW, HALF); ctx.stroke();
    ctx.beginPath(); ctx.arc(BW/2, HALF, 44, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([5, 8]);
    ctx.beginPath(); ctx.arc(BW/2, HALF, 90, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);

    // Goals
    // P2 goal = top, P1 goal = bottom
    ctx.fillStyle = A.p2 + "50"; ctx.fillRect(GX, 0, GW, 10);
    ctx.fillStyle = A.p2;        ctx.fillRect(GX, 0, GW, 4);
    ctx.fillStyle = A.p1 + "50"; ctx.fillRect(GX, BH - 10, GW, 10);
    ctx.fillStyle = A.p1;        ctx.fillRect(GX, BH - 4, GW, 4);

    // Goal labels
    ctx.font = "bold 9px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillStyle = A.p2 + "88";
    ctx.fillText("P2 GOAL", BW/2, 18);
    ctx.fillStyle = A.p1 + "88";
    ctx.fillText("P1 GOAL", BW/2, BH - 8);

    // Half labels (faint)
    ctx.font = "bold 8px 'Courier New'";
    ctx.fillStyle = A.p2 + "33";
    ctx.fillText("P2 ZONE", BW/2, HALF - 6);
    ctx.fillStyle = A.p1 + "33";
    ctx.fillText("P1 ZONE", BW/2, HALF + 14);

    // Aim arrow — shown only for the human player in aim phase with drag active
    const isHumanTurn = g.phase === "aim" && (g.mode === "local" || g.turn === "p1");
    if (isHumanTurn && g.drag.active) {
      const m    = g.turn === "p1" ? g.m1 : g.m2;
      const acol = g.turn === "p1" ? A.p1 : A.p2;
      // Arrow: from current mallet position, pointing in pull direction
      const dx = g.drag.ox - m.x;   // drag origin → current mallet pos = pull direction inverted
      const dy = g.drag.oy - m.y;
      const d  = mag(dx, dy);
      if (d > 4) {
        const ratio = Math.min(d, 110) / 110;
        const ex = m.x + (dx / d) * Math.min(d, 90);
        const ey = m.y + (dy / d) * Math.min(d, 90);
        drawArrow(ctx, m.x, m.y, ex, ey, acol, ratio);
      }
    }

    // Mallets — draw inactive first (z-order)
    if (g.turn === "p1") {
      drawMallet(ctx, g.m2, A.p2, false);
      drawMallet(ctx, g.m1, A.p1, g.phase === "aim");
    } else {
      drawMallet(ctx, g.m1, A.p1, false);
      drawMallet(ctx, g.m2, A.p2, g.phase === "aim");
    }

    // Puck
    ctx.save();
    ctx.shadowBlur = 18; ctx.shadowColor = PK.glow;
    ctx.fillStyle  = PK.col;
    ctx.beginPath(); ctx.arc(g.puck.x, g.puck.y, PR, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle  = "rgba(255,255,255,0.4)";
    ctx.beginPath(); ctx.arc(g.puck.x - 3, g.puck.y - 3, PR * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Flash overlay
    if (g.flash.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = g.flash.alpha;
      ctx.fillStyle   = g.flash.col;
      ctx.fillRect(0, 0, BW, BH);
      ctx.restore();
      g.flash.alpha = Math.max(0, g.flash.alpha - 0.04);
    }

    // Border
    ctx.strokeStyle = A.line + "cc"; ctx.lineWidth = 5;
    rrect(ctx, 0, 0, BW, BH, 18); ctx.stroke();

    ctx.restore();
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── Pointer events ─────────────────────────────────────────────────────────
  function onPointerDown(e) {
    const g = G.current;
    if (!g || g.phase !== "aim") return;
    if (g.turn === "p2" && g.mode === "bot") return;  // bot handles its own turn

    const pos = toBoard(e.clientX, e.clientY);

    // HARD rule: each player can ONLY interact with their own half
    if (g.turn === "p1" && pos.y < HALF) return;
    if (g.turn === "p2" && pos.y > HALF) return;

    // Clamp touch to mallet's legal zone
    const m = g.turn === "p1" ? g.m1 : g.m2;
    m.x = clamp(pos.x, MR, BW - MR);
    m.y = g.turn === "p1"
      ? clamp(pos.y, HALF + MR, BH - MR)
      : clamp(pos.y, MR, HALF - MR);
    m.hx = m.x; m.hy = m.y;

    // Save drag origin = where finger first touched (mallet's new position)
    g.drag = { active: true, ox: m.x, oy: m.y };

    canvasRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    const g = G.current;
    if (!g || !g.drag.active || g.phase !== "aim") return;

    const pos = toBoard(e.clientX, e.clientY);
    const m   = g.turn === "p1" ? g.m1 : g.m2;

    // Mallet follows finger — clamped to own half
    m.x = clamp(pos.x, MR, BW - MR);
    m.y = g.turn === "p1"
      ? clamp(pos.y, HALF + MR, BH - MR)
      : clamp(pos.y, MR, HALF - MR);

    // Power = how far from drag origin
    const d = mag(g.drag.ox - m.x, g.drag.oy - m.y);
    setPower(Math.min(d / 110, 1));
    e.preventDefault();
  }

  function onPointerUp(e) {
    const g = G.current;
    if (!g || !g.drag.active || g.phase !== "aim") return;

    const m  = g.turn === "p1" ? g.m1 : g.m2;
    const dx = g.drag.ox - m.x;
    const dy = g.drag.oy - m.y;
    const d  = mag(dx, dy);

    g.drag.active = false;
    setPower(0);

    if (d < 6) return;   // too small — stay in aim

    // Strike target = mallet home + pull direction * reach
    const ratio = Math.min(d, 110) / 110;
    const reach = 45 + ratio * 80;
    const nx = dx / d, ny = dy / d;

    g.strikeTarget = {
      x: clamp(m.x + nx * reach, MR, BW - MR),
      y: g.turn === "p1"
        ? clamp(m.y + ny * reach, HALF + MR, BH - MR)
        : clamp(m.y + ny * reach, MR, HALF - MR),
    };

    g.phase = "strike";
    syncHud();
    e.preventDefault();
  }

  // ── Shop helpers ────────────────────────────────────────────────────────────
  function buyPuck(pk) {
    if (!sd) return;
    if (sd.ownedPucks.includes(pk.id)) { persist(p => ({ ...p, puck: pk.id })); return; }
    if (sd.coins >= pk.cost) persist(p => ({ ...p, coins: p.coins - pk.cost,
      ownedPucks: [...p.ownedPucks, pk.id], puck: pk.id }));
  }
  function buyArena(ar) {
    if (!sd) return;
    if (sd.ownedArenas.includes(ar.id)) { persist(p => ({ ...p, arena: ar.id })); return; }
    if (sd.coins >= ar.cost) persist(p => ({ ...p, coins: p.coins - ar.cost,
      ownedArenas: [...p.ownedArenas, ar.id], arena: ar.id }));
  }

  // ── Derived values for JSX ──────────────────────────────────────────────────
  if (!sd) return (
    <div style={{ minHeight:"100vh", background:"#07090f", display:"flex",
      alignItems:"center", justifyContent:"center",
      fontFamily:"monospace", color:"#00d4ff", letterSpacing:4 }}>
      LOADING...
    </div>
  );

  const A     = ARENAS.find(a => a.id === sd.arena) || ARENAS[0];
  const gs    = G.current;
  const p1Won = gs?.score?.p1 >= WIN;

  const badgeLabel =
    hud.phase === "scored"  ? "⚡ GOAL!" :
    hud.phase === "strike"  ? "STRIKING..." :
    hud.phase === "rolling" ? "BALL MOVING..." :
    hud.turn  === "p1"      ? "● P1 — AIM & DRAG" :
    hud.mode  === "bot"     ? "AI COMPUTING..." : "● P2 — AIM & DRAG";

  const badgeColor =
    hud.phase === "rolling" || hud.phase === "strike" || hud.phase === "scored"
      ? "#ffffff"
      : hud.turn === "p1" ? A.p1 : A.p2;

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", overflow:"hidden",
      background: screen === "playing" ? A.bg : "#07090f",
      color:"#fff", fontFamily:"'Courier New',monospace", userSelect:"none" }}>

      <header style={{ width:"100%", maxWidth:480, padding:"10px 16px",
        display:"flex", justifyContent:"space-between" }}>
        <Link href="/" style={{ color:"#444", fontSize:11, letterSpacing:3, textDecoration:"none" }}>◀ EXIT</Link>
        <span style={{ color:"#ffd700", fontSize:11, letterSpacing:2 }}>CR {sd.coins}</span>
      </header>

      {/* ═══════ MENU ═══════ */}
      {screen === "menu" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
          gap:18, width:"100%", maxWidth:300, padding:"0 16px", marginTop:8 }}>

          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:9, letterSpacing:6, color:"#333", marginBottom:4 }}>TURN-BASED</div>
            <h1 style={{ fontSize:40, fontWeight:900, letterSpacing:5, margin:0, lineHeight:1 }}>
              AIR <span style={{ color:"#00d4ff" }}>HOCKEY</span>
            </h1>
            <div style={{ fontSize:9, color:"#333", marginTop:6, letterSpacing:2 }}>
              W {sd.wins} · L {sd.losses}
            </div>
          </div>

          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10 }}>
            <MenuBtn col="#00d4ff" onClick={() => startGame("bot")}>VS MACHINE</MenuBtn>
            <MenuBtn col="#ff3060" onClick={() => startGame("local")}>LOCAL 2P</MenuBtn>
          </div>

          {/* Shop */}
          <div style={{ width:"100%", background:"#0d1220", borderRadius:14,
            padding:12, border:"1px solid #1a2a40" }}>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              {["pucks","arenas"].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ flex:1, padding:"5px 0", borderRadius:7, fontSize:9, fontWeight:700,
                    letterSpacing:2, fontFamily:"inherit", cursor:"pointer",
                    background: tab===t ? "#00d4ff22" : "transparent",
                    color: tab===t ? "#00d4ff" : "#444",
                    border: tab===t ? "1px solid #00d4ff44" : "1px solid #1a2a40" }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            {tab === "pucks" && PUCKS.map(pk => {
              const owned = sd.ownedPucks.includes(pk.id);
              const eq    = sd.puck === pk.id;
              const can   = sd.coins >= pk.cost;
              return (
                <ShopRow key={pk.id}
                  icon={<ColorDot col={pk.col} glow={pk.glow} />}
                  name={pk.name}
                  owned={owned} eq={eq} can={can} cost={pk.cost}
                  onClick={() => buyPuck(pk)} />
              );
            })}

            {tab === "arenas" && ARENAS.map(ar => {
              const owned = sd.ownedArenas.includes(ar.id);
              const eq    = sd.arena === ar.id;
              const can   = sd.coins >= ar.cost;
              return (
                <ShopRow key={ar.id}
                  icon={<ArenaBox bg={ar.bg} line={ar.line} />}
                  name={ar.name}
                  owned={owned} eq={eq} can={can} cost={ar.cost}
                  onClick={() => buyArena(ar)} />
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ PLAYING ═══════ */}
      {screen === "playing" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
          width:"100%", maxWidth:480, flex:1, padding:"0 6px" }}>

          {/* HUD bar */}
          <div style={{ width:"100%", display:"flex", justifyContent:"space-between",
            alignItems:"center", padding:"8px 14px", marginBottom:6, borderRadius:14,
            background:"rgba(0,0,0,0.6)", border:"1px solid #1a2a40" }}>

            <ScoreBlock score={hud.p2} color={A.p2}
              label={hud.mode === "bot" ? "MACHINE" : "PLAYER 2"} />

            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:8, letterSpacing:3, color:"#2a2a2a" }}>FIRST TO {WIN}</span>
              <div style={{ padding:"5px 12px", borderRadius:20, fontSize:10, fontWeight:900,
                letterSpacing:2, transition:"all .25s",
                background: badgeColor + "22", color: badgeColor,
                border: `1px solid ${badgeColor}44` }}>
                {badgeLabel}
              </div>
              {hud.phase === "aim" && (hud.mode === "local" || hud.turn === "p1") && (
                <span style={{ fontSize:8, letterSpacing:1, color:"#2a2a2a" }}>
                  touch & drag your half → release
                </span>
              )}
            </div>

            <ScoreBlock score={hud.p1} color={A.p1} label="PLAYER 1" />
          </div>

          {/* Canvas */}
          <div style={{ width: BW * scale, height: BH * scale }}>
            <canvas ref={canvasRef} width={BW} height={BH}
              style={{ width: BW * scale, height: BH * scale,
                display:"block", touchAction:"none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          </div>

          {/* Power bar */}
          <div style={{ width:"100%", marginTop:6, padding:"0 10px" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              fontSize:8, letterSpacing:2, color:"#2a2a2a", marginBottom:3 }}>
              <span>STRIKE POWER</span><span>{Math.round(power * 100)}%</span>
            </div>
            <div style={{ background:"#111", borderRadius:4, height:5, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:4, transition:"width .06s",
                width: `${power * 100}%`,
                background: power > 0.7 ? "#ff3060" : power > 0.4 ? "#ffaa00" : A.p1 }} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════ GAME OVER ═══════ */}
      {screen === "gameover" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
          gap:20, width:"100%", maxWidth:260, padding:"0 16px", marginTop:40 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:8, letterSpacing:4, color:"#333", marginBottom:6 }}>MATCH OVER</div>
            <h2 style={{ fontSize:30, fontWeight:900, letterSpacing:4, margin:0,
              color: p1Won ? A.p1 : A.p2 }}>
              {p1Won ? "PLAYER 1 WINS" : gs?.mode === "bot" ? "MACHINE WINS" : "PLAYER 2 WINS"}
            </h2>
            <div style={{ fontSize:40, fontWeight:900, color:"#ffffff18",
              marginTop:6, letterSpacing:6 }}>
              {gs?.score?.p1} – {gs?.score?.p2}
            </div>
            {p1Won && gs?.mode === "bot" && (
              <div style={{ color:"#ffd700", fontSize:15, fontWeight:700,
                marginTop:8, letterSpacing:2 }}>+150 CREDITS</div>
            )}
          </div>
          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10 }}>
            <MenuBtn col={p1Won ? A.p1 : A.p2} onClick={() => startGame(gs.mode)}>REMATCH</MenuBtn>
            <button onClick={() => { cancelAnimationFrame(rafRef.current); setScreen("menu"); }}
              style={{ width:"100%", padding:"12px 0", borderRadius:12, fontFamily:"inherit",
                fontSize:11, fontWeight:700, letterSpacing:3, cursor:"pointer",
                background:"transparent", color:"#444", border:"1px solid #1a2a40" }}>
              MAIN MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Canvas draw helpers (module-level — never recreated) ─────────────────────
function drawMallet(ctx, m, col, glowing) {
  ctx.save();
  if (glowing) { ctx.shadowBlur = 28; ctx.shadowColor = col; }
  const gr = ctx.createRadialGradient(m.x - 5, m.y - 5, 2, m.x, m.y, MR);
  gr.addColorStop(0, col + "ee"); gr.addColorStop(1, col + "44");
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(m.x, m.y, MR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.arc(m.x, m.y, MR * 0.36, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawArrow(ctx, x1, y1, x2, y2, col, ratio) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  // glow blob
  ctx.globalAlpha = 0.12 + ratio * 0.18;
  ctx.strokeStyle = col; ctx.lineWidth = 16 + ratio * 14; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + (x2-x1)*0.5, y1 + (y2-y1)*0.5); ctx.stroke();
  // dashed line
  ctx.globalAlpha = 0.85; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  // arrowhead
  ctx.fillStyle = col; ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(x2 + Math.cos(angle)*11, y2 + Math.sin(angle)*11);
  ctx.lineTo(x2 + Math.cos(angle+2.4)*7, y2 + Math.sin(angle+2.4)*7);
  ctx.lineTo(x2 + Math.cos(angle-2.4)*7, y2 + Math.sin(angle-2.4)*7);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────
function MenuBtn({ col, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ width:"100%", padding:"13px 0", borderRadius:12, fontFamily:"inherit",
        fontSize:12, fontWeight:900, letterSpacing:3, cursor:"pointer",
        background:"transparent", color:col, border:`2px solid ${col}` }}
      onMouseEnter={e => e.currentTarget.style.background = col + "22"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {children}
    </button>
  );
}

function ScoreBlock({ score, color, label }) {
  return (
    <div style={{ textAlign:"center", minWidth:52 }}>
      <div style={{ fontSize:34, fontWeight:900, color, lineHeight:1 }}>{score}</div>
      <div style={{ fontSize:8, letterSpacing:2, color:"#444", marginTop:2 }}>{label}</div>
    </div>
  );
}

function ShopRow({ icon, name, owned, eq, can, cost, onClick }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"5px 8px", borderRadius:8, background:"#07090f", marginBottom:4 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {icon}
        <span style={{ fontSize:10, letterSpacing:1 }}>{name}</span>
      </div>
      <button onClick={onClick} disabled={!owned && !can}
        style={{ padding:"3px 9px", borderRadius:6, fontFamily:"inherit", fontSize:9,
          fontWeight:700, letterSpacing:1, cursor: owned||can ? "pointer" : "default",
          background: eq?"#00d4ff22": owned?"#ffffff11": can?"#ff306018":"#111",
          color: eq?"#00d4ff": owned?"#ccc": can?"#ff3060":"#333",
          border: eq?"1px solid #00d4ff44":"1px solid #222" }}>
        {eq ? "EQUIPPED" : owned ? "EQUIP" : `${cost} CR`}
      </button>
    </div>
  );
}

function ColorDot({ col, glow }) {
  return <div style={{ width:13, height:13, borderRadius:"50%",
    background:col, boxShadow:`0 0 6px ${glow}` }} />;
}
function ArenaBox({ bg, line }) {
  return <div style={{ width:20, height:12, borderRadius:3,
    background:bg, border:`1px solid ${line}` }} />;
}