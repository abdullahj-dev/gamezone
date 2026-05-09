"use client";
import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from "react";
import Link from "next/link";

// ─── Lightning Engine ─────────────────────────────────────────────────────────
function buildBolt(x1, y1, x2, y2, spread = 80, depth = 5) {
  if (depth === 0) return [[x1, y1], [x2, y2]];
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * spread;
  const my = (y1 + y2) / 2 + (Math.random() - 0.5) * spread * 0.35;
  return [
    ...buildBolt(x1, y1, mx, my, spread * 0.58, depth - 1).slice(0, -1),
    [mx, my],
    ...buildBolt(mx, my, x2, y2, spread * 0.58, depth - 1),
  ];
}

function drawBolt(ctx, pts, alpha = 1, width = 1.5, color = "255,255,255") {
  if (pts.length < 2) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = alpha * 0.35;
  ctx.strokeStyle = `rgb(100,200,255)`;
  ctx.lineWidth = width * 5;
  ctx.shadowColor = "#00cfff";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgba(${color},${alpha})`;
  ctx.lineWidth = width;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.restore();
}

function strikeLightning(ctx, W, H, options = {}) {
  const { fromX, alpha = 1, branches = true, color } = options;
  const sx = fromX ?? Math.random() * W;
  const ex = sx + (Math.random() - 0.5) * 200;
  const pts = buildBolt(sx, 0, ex, H * (0.55 + Math.random() * 0.45), 90, 5);
  drawBolt(ctx, pts, alpha, 1.8, color || "255,255,255");
  if (branches) {
    const branchCount = Math.floor(Math.random() * 3) + 1;
    for (let b = 0; b < branchCount; b++) {
      const pivot = pts[Math.floor(pts.length * (0.25 + Math.random() * 0.5))];
      if (!pivot) continue;
      const bx = pivot[0] + (Math.random() - 0.5) * 180;
      const by = pivot[1] + Math.random() * (H * 0.3);
      const bpts = buildBolt(pivot[0], pivot[1], bx, by, 40, 4);
      drawBolt(ctx, bpts, alpha * 0.5, 0.9, "200,235,255");
    }
  }
}

const LightningCanvas = memo(({ burstRef }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize, { passive: true });
    let strikeCd = 0, flashAlpha = 0, burstFrames = 0, burstX = W / 2;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      if (burstRef.current) {
        burstX = burstRef.current.x;
        burstRef.current = null;
        burstFrames = 12;
        flashAlpha = 0.55;
        for (let i = 0; i < 4; i++) {
          strikeLightning(ctx, W, H, {
            fromX: burstX + (Math.random() - 0.5) * 150,
            alpha: 0.9 + Math.random() * 0.1,
            color: i % 2 === 0 ? "255,255,255" : "160,230,255",
          });
        }
      }
      if (burstFrames > 0) {
        ctx.fillStyle = `rgba(120,200,255,${flashAlpha * 0.12})`;
        ctx.fillRect(0, 0, W, H);
        flashAlpha *= 0.7;
        burstFrames--;
      }
      if (strikeCd <= 0) {
        strikeLightning(ctx, W, H, { alpha: 0.5 + Math.random() * 0.4 });
        strikeCd = 100 + Math.floor(Math.random() * 220);
      } else {
        strikeCd--;
      }
      animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [burstRef]);
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10 opacity-75 mix-blend-screen"
    />
  );
});
LightningCanvas.displayName = "LightningCanvas";

// ─── Title Letter Styles ──────────────────────────────────────────────────────
const LETTER_STYLES = [
  { "--glow": "#00cfff", "--alt": "#ffffff", anim: "pulse-glow 2.2s ease-in-out infinite" },
  { "--glow": "#60efff", "--alt": "#aaf0ff", anim: "stutter 0.9s steps(1) infinite" },
  { "--glow": "#ffffff", "--alt": "#b0e8ff", anim: "flare 3.1s ease-in-out infinite 0.4s" },
  { "--glow": "#00aaff", "--alt": "#ffffff", anim: "static-flicker 1.4s steps(1) infinite 0.2s" },
  { "--glow": "#ffee00", "--alt": "#ffffff", anim: "zap 0.7s steps(1) infinite 0.1s" },
  { "--glow": "#00ffcc", "--alt": "#ffffff", anim: "tesla 2.6s linear infinite 0.3s" },
  { "--glow": "#cc88ff", "--alt": "#ffffff", anim: "discharge 1.8s ease-in-out infinite 0.6s" },
  { "--glow": "#00cfff", "--alt": "#ffdd88", anim: "plasma 2.0s ease-in-out infinite 0.8s" },
];

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",         label: "ALL GAMES",   icon: "◈", color: "#00cfff" },
  { id: "multiplayer", label: "MULTIPLAYER", icon: "⚔", color: "#ff4488" },
  { id: "singleplayer",label: "SOLO PLAY",   icon: "◉", color: "#44aaff" },
  { id: "arcade",      label: "ARCADE",      icon: "▲", color: "#ff9900" },
  { id: "puzzle",      label: "PUZZLE",      icon: "◆", color: "#aa44ff" },
  { id: "strategy",    label: "STRATEGY",    icon: "⬡", color: "#00ffaa" },
  { id: "action",      label: "ACTION",      icon: "⚡", color: "#ff3344" },
  { id: "soon",        label: "COMING SOON", icon: "◌", color: "#555577" },
];

// ─── Full Game List ───────────────────────────────────────────────────────────
const GAMES = [
  // ── LIVE ──────────────────────────────────────────────────────────────────
  {
    name: "Depths",       id: "depths",       href: "/depths",
    status: "PLAY", tagline: "Dungeon crawler · endless",
    accent: "#00cfff", hot: false, cats: ["singleplayer","action"],
    players: "1P",
  },
  {
    name: "Void",         id: "void",         href: "/void",
    status: "PLAY", tagline: "Dimension rift · roguelike",
    accent: "#8855ff", hot: false, cats: ["singleplayer","action"],
    players: "1P",
  },
  {
    name: "Shadow",       id: "shadow",       href: "/shadow",
    status: "PLAY", tagline: "Stealth · action",
    accent: "#cc44ff", hot: false, cats: ["singleplayer","action"],
    players: "1P",
  },
  {
    name: "Quantum Chaos",id: "quantum",      href: "/quantum_chaos",
    status: "PLAY", tagline: "Particle physics · chaos",
    accent: "#ffdd00", hot: false, cats: ["singleplayer","puzzle"],
    players: "1P",
  },
  {
    name: "Nebula Fury",  id: "nebula",       href: "/nebula",
    status: "PLAY", tagline: "Space combat · strategy",
    accent: "#44ff88", hot: true,  cats: ["singleplayer","strategy","action"],
    players: "1P",
  },
  {
    name: "Synapse",      id: "synapse",      href: "/synapse-breaker",
    status: "PLAY", tagline: "Neural hack · puzzler",
    accent: "#ff4466", hot: false, cats: ["singleplayer","puzzle"],
    players: "1P",
  },
  {
    name: "Mnemonic",     id: "mnemonic",     href: "/Mnemonic",
    status: "PLAY", tagline: "Memory training · puzzle",
    accent: "#44dd66", hot: false, cats: ["singleplayer","puzzle","multiplayer"],
    players: "1P / 2P",
  },
  {
    name: "Flappy Bird",  id: "flappy",       href: "/flappy-bird",
    status: "PLAY", tagline: "Classic arcade · challenge",
    accent: "#ff6600", hot: false, cats: ["singleplayer","arcade"],
    players: "1P",
  },
  {
    name: "Snake",        id: "snake",        href: "/snake",
    status: "PLAY", tagline: "Classic arcade · survival",
    accent: "#008080", hot: false, cats: ["singleplayer","arcade"],
    players: "1P",
  },
  {
    name: "Bump",         id: "bump",         href: "/bump",
    status: "PLAY", tagline: "Multiplayer · challenge",
    accent: "#b6fcd5", hot: true,  cats: ["multiplayer"],
    players: "2P",
  },
  {
    name: "Fleet",        id: "fleet",        href: "/fleet",
    status: "PLAY", tagline: "Tactical navy · multiplayer",
    accent: "#ccccff", hot: false, cats: ["multiplayer","strategy"],
    players: "2P",
  },
  {
    name: "Knockout",     id: "knockout",     href: "/knockout",
    status: "PLAY", tagline: "Combat · multiplayer",
    accent: "#dddddd", hot: false, cats: ["multiplayer","action"],
    players: "2P",
  },
  {
    name: "Spinblade",    id: "spinblade",    href: "/spinblade",
    status: "PLAY", tagline: "Arena fighter · multiplayer",
    accent: "#ff6644", hot: false, cats: ["multiplayer","action"],
    players: "2P",
  },
  {
    name: "Bomb Blitz",   id: "bomb-blitz",   href: "/bomb-blitz",
    status: "PLAY", tagline: "Bomb tactics · multiplayer",
    accent: "#ffaa00", hot: false, cats: ["multiplayer","strategy"],
    players: "2P",
  },
  {
    name: "Castle Siege", id: "castle-siege", href: "/castle-siege",
    status: "PLAY", tagline: "Defense strategy · multiplayer",
    accent: "#ff8844", hot: true,  cats: ["multiplayer","strategy"],
    players: "2P",
  },
  {
    name: "Art Board",    id: "art-board",    href: "/art-board",
    status: "PLAY", tagline: "Interactive art · experience",
    accent: "#00cfff", hot: false, cats: ["singleplayer","multiplayer"],
    players: "1P / MP",
  },
  {
    name: "Battle Ship",  id: "battle-ship",  href: "/battle-ship",
    status: "PLAY", tagline: "Naval warfare · strategy",
    accent: "#4488ff", hot: false, cats: ["multiplayer","strategy"],
    players: "2P",
  },
  {
    name: "Cyber Pong",   id: "cyber-pong",   href: "/cyber-pong",
    status: "PLAY", tagline: "Neon classic · head to head",
    accent: "#cd0000", hot: false, cats: ["multiplayer","arcade"],
    players: "2P",
  },
  {
    name: "Tetris",       id: "tetris",       href: "/tetris",
    status: "PLAY", tagline: "Block puzzle · endless",
    accent: "#00ffff", hot: false, cats: ["puzzle","arcade"],
    players: "1P",
  },
  {
    name: "Minesweeper",  id: "minesweeper",  href: "/mine-sweeper",
    status: "PLAY", tagline: "Logic · danger",
    accent: "#44ffbb", hot: false, cats: ["multiplayer","puzzle"],
    players: "2P",
  },
  {
    name: "2048",         id: "2048",         href: "/2048",
    status: "PLAY", tagline: "Number merge · strategic",
    accent: "#ff9944", hot: false, cats: ["puzzle"],
    players: "1P",
  },
  {
    name: "Maze Runner",  id: "maze",         href: "/maze",
    status: "PLAY", tagline: "Procedural · escape",
    accent: "#ff44aa", hot: false, cats: ["singleplayer","puzzle","arcade"],
    players: "1P",
  },
  {
    name: "Connect Four", id: "connect4",     href: "/connect4",
    status: "PLAY", tagline: "Drop and win · tactical",
    accent: "#ffcc00", hot: true, cats: ["multiplayer","puzzle","strategy"],
    players: "1P/2P",
  },
  {
    name: "Air Hockey",   id: "air-hockey",   href: "/air-hockey",
    status: "PLAY", tagline: "Puck physics · fast",
    accent: "#00eeff", hot: true, cats: ["multiplayer","arcade","action"],
    players: "1P/2P",
  },
  {
    name: "Zombie Wave",  id: "zombie",       href: "/zombie-wave",
    status: "PLAY", tagline: "Survival horde · co-op",
    accent: "#88ff44", hot: true,  cats: ["singleplayer","multiplayer","action"],
    players: "1-2P",
  },
  {
    name: "Platform Rush",id: "platform",     href: "/platform-rush",
    status: "PLAY", tagline: "Jump · dash · endure",
    accent: "#ffee44", hot: false, cats: ["singleplayer","arcade","action"],
    players: "1P",
  },
  
  // ── COMING SOON ───────────────────────────────────────────────────────────
  {
    name: "Pac Man",      id: "pacman",       href: "#",
    status: "SOON", tagline: "Classic arcade · ghosts",
    accent: "#ffdd00", hot: false, cats: ["soon","arcade"],
    players: "1P",
  },
  {
    name: "Wall Breaker", id: "wall-breaker", href: "#",
    status: "SOON", tagline: "Breakout · classic",
    accent: "#ff00ff", hot: false, cats: ["soon","arcade"],
    players: "1P",
  },
  {
    name: "Tic Tac Toe",  id: "tic-tac-toe",  href: "#",
    status: "SOON", tagline: "Grid war · quick match",
    accent: "#ff6666", hot: false, cats: ["soon","multiplayer","puzzle"],
    players: "2P",
  },
  {
    name: "Chess Blitz",  id: "chess",        href: "#",
    status: "SOON", tagline: "Speed chess · ranked",
    accent: "#aaaaff", hot: true,  cats: ["soon","multiplayer","strategy"],
    players: "2P",
  },
  {
    name: "Asteroids",    id: "asteroids",    href: "#",
    status: "SOON", tagline: "Space shooter · survival",
    accent: "#88aaff", hot: false, cats: ["soon","singleplayer","arcade","action"],
    players: "1P",
  },
  {
    name: "Tower Defense",id: "tower-def",    href: "#",
    status: "SOON", tagline: "Build · defend · survive",
    accent: "#66ff44", hot: false, cats: ["soon","singleplayer","strategy"],
    players: "1P",
  },
  {
    name: "Word Blitz",   id: "wordblitz",    href: "#",
    status: "SOON", tagline: "Vocab speed · ranked",
    accent: "#ffaaff", hot: false, cats: ["soon","singleplayer","puzzle"],
    players: "1P",
  },
  {
    name: "Card Clash",   id: "cardclash",    href: "#",
    status: "SOON", tagline: "Deck build · duel",
    accent: "#ff7744", hot: false, cats: ["soon","multiplayer","strategy"],
    players: "2P",
  },
  {
    name: "Space Race",   id: "spacerace",    href: "#",
    status: "SOON", tagline: "Velocity · orbit",
    accent: "#44ccff", hot: false, cats: ["soon","multiplayer","arcade"],
    players: "2P",
  },
  {
    name: "Sudoku Storm", id: "sudoku",       href: "#",
    status: "SOON", tagline: "Numbers · speed · logic",
    accent: "#cc88ff", hot: false, cats: ["soon","singleplayer","puzzle"],
    players: "1P",
  },
  {
    name: "Dragon Siege", id: "dragonsiege",  href: "#",
    status: "SOON", tagline: "Fantasy · conquest",
    accent: "#ff4400", hot: true,  cats: ["soon","multiplayer","strategy","action"],
    players: "2P",
  },
  {
    name: "Pinball FX",   id: "pinball",      href: "#",
    status: "SOON", tagline: "Physics · score attack",
    accent: "#ff66bb", hot: false, cats: ["soon","singleplayer","arcade"],
    players: "1P",
  },
  {
    name: "Circuit Racer",id: "circuit",      href: "#",
    status: "SOON", tagline: "Speed · neon tracks",
    accent: "#00ffcc", hot: false, cats: ["soon","multiplayer","arcade","action"],
    players: "1-4P",
  },
];

// ─── Spark ────────────────────────────────────────────────────────────────────
const Spark = memo(({ style, color, delay = "0s" }) => (
  <span
    className="absolute w-1 h-1 rounded-full pointer-events-none"
    style={{
      ...style, background: color,
      boxShadow: `0 0 6px ${color}`,
      animation: `spark-pop 0.6s ease-out infinite`,
      animationDelay: delay,
    }}
  />
));
Spark.displayName = "Spark";

// ─── Category Pill ────────────────────────────────────────────────────────────
const CategoryPill = memo(({ cat, active, onClick }) => (
  <button
    onClick={onClick}
    className="relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-bold tracking-widest font-mono transition-all duration-200 border"
    style={{
      background: active ? `${cat.color}18` : "rgba(0,0,0,0.35)",
      borderColor: active ? `${cat.color}88` : "#1a1c2e",
      color: active ? cat.color : "#555577",
      boxShadow: active ? `0 0 14px ${cat.color}22` : "none",
      transform: active ? "translateY(-1px)" : "none",
    }}
  >
    <span style={{ fontSize: 11 }}>{cat.icon}</span>
    {cat.label}
    {active && (
      <span
        className="absolute -bottom-px left-1/2 -translate-x-1/2 h-px w-3/4"
        style={{ background: `linear-gradient(90deg, transparent, ${cat.color}, transparent)` }}
      />
    )}
  </button>
));
CategoryPill.displayName = "CategoryPill";

// ─── Game Card ────────────────────────────────────────────────────────────────
const GameCard = memo(({ game, onEnter, index }) => {
  const [hovered, setHovered] = useState(false);
  const locked = game.status === "SOON";
  const accent = game.accent;

  const catColors = {
    multiplayer: "#ff4488",
    singleplayer: "#44aaff",
    arcade: "#ff9900",
    puzzle: "#aa44ff",
    strategy: "#00ffaa",
    action: "#ff3344",
  };

  const visibleCats = game.cats.filter((c) => c !== "soon").slice(0, 2);

  return (
    <Link
      href={game.href}
      onClick={locked ? (e) => e.preventDefault() : onEnter}
      tabIndex={locked ? -1 : 0}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`relative h-56 p-5 rounded-2xl flex flex-col justify-between overflow-hidden transition-all duration-300 ease-out ${
          locked ? "opacity-45 cursor-not-allowed" : "cursor-pointer hover:-translate-y-1.5 hover:scale-[1.025]"
        }`}
        style={{
          background: `linear-gradient(135deg, #080a12 0%, #0c0e1c 60%, ${accent}08 100%)`,
          border: `1px solid ${hovered && !locked ? accent + "55" : "#181a2a"}`,
          boxShadow: hovered && !locked
            ? `0 8px 40px ${accent}18, 0 0 0 1px ${accent}22, inset 0 1px 0 ${accent}22`
            : "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 12px rgba(0,0,0,0.4)",
        }}
      >
        {/* Top glow bar */}
        <div
          className="absolute top-0 left-0 right-0 h-px transition-opacity duration-300"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            opacity: hovered && !locked ? 1 : 0.15,
          }}
        />

        {/* Corner accent */}
        <div
          className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 100% 0%, ${accent}14 0%, transparent 70%)`,
            opacity: hovered && !locked ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        />

        {/* Scan line */}
        {hovered && !locked && (
          <>
            <Spark style={{ top: 6, left: 6 }} color={accent} />
            <Spark style={{ top: 6, right: 6 }} color={accent} delay="0.15s" />
            <Spark style={{ bottom: 6, right: 6 }} color={accent} delay="0.08s" />
            <div
              className="absolute left-0 right-0 h-px pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
                animation: "scan-line 1.4s linear infinite",
                top: 0,
              }}
            />
          </>
        )}

        {/* Top row */}
        <div className="flex items-start justify-between gap-2 relative z-10">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
              {game.hot && (
                <span
                  className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full border font-mono"
                  style={{
                    background: `${accent}18`,
                    color: accent,
                    borderColor: `${accent}55`,
                  }}
                >
                  🔥 HOT
                </span>
              )}
              {locked && (
                <span className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/5 text-slate-600 border border-slate-800 font-mono">
                  ⏳ SOON
                </span>
              )}
              {visibleCats.map((c) => (
                <span
                  key={c}
                  className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full font-mono"
                  style={{
                    background: `${catColors[c] || "#ffffff"}11`,
                    color: catColors[c] ? catColors[c] + "cc" : "#666",
                  }}
                >
                  {c.toUpperCase()}
                </span>
              ))}
            </div>

            {/* Title */}
            <h2
              className="text-xl font-black tracking-tight uppercase font-mono leading-none transition-colors duration-200"
              style={{ color: hovered && !locked ? accent : "#dde2f0" }}
            >
              {game.name}
            </h2>
            <p className="text-[11px] mt-1.5 text-slate-600 font-sans leading-relaxed">
              {game.tagline}
            </p>
          </div>

          {/* Circle icon */}
          <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full border transition-all duration-300"
              style={{
                borderColor: hovered && !locked ? accent + "88" : "#1c1f30",
                boxShadow: hovered && !locked ? `0 0 16px ${accent}44` : "none",
                background: hovered && !locked ? `${accent}14` : "transparent",
              }}
            />
            <span
              className="relative text-xs transition-colors duration-200"
              style={{ color: hovered && !locked ? accent : "#2a2d45" }}
            >
              ⚡
            </span>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-[9px] tracking-widest font-mono text-slate-800">
              GZ-{9900 + index}
            </span>
            <span
              className="text-[9px] tracking-widest font-mono px-1.5 py-0.5 rounded"
              style={{
                background: "#ffffff08",
                color: "#445566",
                border: "1px solid #1a2233",
              }}
            >
              {game.players}
            </span>
          </div>
          <span
            className="text-[10px] font-bold tracking-widest transition-all duration-200 font-mono"
            style={{ color: hovered && !locked ? accent : "transparent" }}
          >
            {locked ? "" : "ENTER ▶"}
          </span>
        </div>

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}33, transparent)`,
            opacity: hovered && !locked ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        />
      </div>
    </Link>
  );
});
GameCard.displayName = "GameCard";

// ─── Stats Banner ─────────────────────────────────────────────────────────────
const StatBadge = ({ label, value, color }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="font-black font-mono text-2xl" style={{ color }}>
      {value}
    </span>
    <span className="text-[9px] tracking-[0.3em] font-mono text-slate-700">
      {label}
    </span>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const PHONE_NUMBER = "03001234567";

export default function Home() {
  const burstRef = useRef(null);
  const [clickPos, setClickPos] = useState(null);
  const [supportLabel, setSupportLabel] = useState("BUY ME A COFFEE");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const timeoutRef = useRef(null);

  const liveCount = useMemo(() => GAMES.filter((g) => g.status === "PLAY").length, []);
  const soonCount = useMemo(() => GAMES.filter((g) => g.status === "SOON").length, []);
  const mpCount = useMemo(() => GAMES.filter((g) => g.cats.includes("multiplayer")).length, []);

  const filteredGames = useMemo(() => {
    let result = GAMES;
    if (activeCategory === "soon") {
      result = result.filter((g) => g.status === "SOON");
    } else if (activeCategory !== "all") {
      result = result.filter((g) => g.cats.includes(activeCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.tagline.toLowerCase().includes(q) ||
          g.cats.some((c) => c.includes(q))
      );
    }
    return result;
  }, [activeCategory, searchQuery]);

  const handleClick = useCallback((e) => {
    if (e.target.closest(".support-btn-area") || e.target.closest(".search-area")) return;
    burstRef.current = { x: e.clientX };
    setClickPos({ x: e.clientX, y: e.clientY });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setClickPos(null), 500);
  }, []);

  const handleSupportClick = useCallback((e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(PHONE_NUMBER).catch(() => {});
    setSupportLabel("NUMBER COPIED!");
    window.location.href = "jazzcash://";
    burstRef.current = { x: window.innerWidth / 2 };
    setTimeout(() => setSupportLabel("BUY ME A COFFEE"), 3000);
  }, []);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return (
    <div
      className="min-h-screen text-white flex flex-col items-center px-4 py-16 relative overflow-hidden select-none bg-[#020308] cursor-crosshair font-sans"
      onClick={handleClick}
    >
      <LightningCanvas burstRef={burstRef} />

      {/* Ambient gradients */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% -10%, rgba(0,140,220,0.07) 0%, transparent 55%),
            radial-gradient(ellipse at 10% 80%, rgba(80,0,180,0.05) 0%, transparent 45%),
            radial-gradient(ellipse at 90% 85%, rgba(0,180,120,0.04) 0%, transparent 45%)
          `,
        }}
      />

      {/* Subtle grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(#00cfff 1px, transparent 1px), linear-gradient(90deg, #00cfff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Click ripple */}
      {clickPos && (
        <div className="fixed inset-0 pointer-events-none z-20">
          <div className="absolute inset-0 animate-screen-flash bg-cyan-400/5" />
          <div
            className="absolute w-56 h-56 rounded-full animate-shockwave-out border border-cyan-400/30 bg-cyan-500/5"
            style={{ left: clickPos.x - 112, top: clickPos.y - 112 }}
          />
        </div>
      )}

      {/* ── HERO ── */}
      <div className="relative z-20 mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-5">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-500/40" />
          <p className="text-[9px] tracking-[0.7em] text-cyan-700 font-mono font-bold">
            ENTER THE ARENA
          </p>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500/40" />
        </div>

        <h1 className="font-black uppercase leading-none font-mono tracking-[0.15em] text-[clamp(44px,9vw,100px)]">
          {"GAMEZONE".split("").map((letter, i) => {
            const cfg = LETTER_STYLES[i];
            return (
              <span
                key={i}
                className="relative inline-block"
                style={{
                  "--glow": cfg["--glow"],
                  "--alt": cfg["--alt"],
                  animation: cfg.anim,
                }}
              >
                <span
                  className="absolute inset-0 select-none pointer-events-none opacity-50 blur-[10px]"
                  aria-hidden
                  style={{ color: "var(--glow)" }}
                >
                  {letter}
                </span>
                <span
                  className="absolute inset-0 select-none pointer-events-none opacity-35 blur-[3px]"
                  aria-hidden
                  style={{ color: "var(--alt)" }}
                >
                  {letter}
                </span>
                <span
                  className="relative z-10 text-white"
                  style={{ textShadow: `0 0 2px var(--alt)` }}
                >
                  {letter}
                </span>
              </span>
            );
          })}
        </h1>

        {/* Stats bar */}
        <div
          className="inline-flex items-center gap-8 mt-8 px-8 py-4 rounded-2xl"
          style={{
            background: "rgba(5,6,15,0.7)",
            border: "1px solid #1a1c2e",
            backdropFilter: "blur(12px)",
          }}
        >
          <StatBadge label="LIVE NOW" value={liveCount} color="#00cfff" />
          <div className="w-px h-8 bg-white/5" />
          <StatBadge label="COMING SOON" value={soonCount} color="#8855ff" />
          <div className="w-px h-8 bg-white/5" />
          <StatBadge label="MULTIPLAYER" value={mpCount} color="#ff4488" />
          <div className="w-px h-8 bg-white/5" />
          <StatBadge label="TOTAL" value={GAMES.length} color="#44ff88" />
        </div>
      </div>

      {/* ── SEARCH + FILTER ── */}
      <div className="search-area relative z-20 w-full max-w-5xl mb-8 flex flex-col gap-4">
        {/* Search input */}
        <div className="relative">
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none font-mono text-sm"
          >
            ⌕
          </div>
          <input
            type="text"
            placeholder="SEARCH GAMES..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl font-mono text-[11px] tracking-widest outline-none transition-all duration-200"
            style={{
              background: "rgba(5,6,15,0.85)",
              border: `1px solid ${searchQuery ? "#00cfff44" : "#181a2a"}`,
              color: "#c8d0e8",
              backdropFilter: "blur(12px)",
              boxShadow: searchQuery ? "0 0 20px rgba(0,207,255,0.08)" : "none",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 font-mono text-xs transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat.id}
              cat={cat}
              active={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
            />
          ))}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-mono text-slate-700 tracking-widest">
            {filteredGames.length} GAME{filteredGames.length !== 1 ? "S" : ""} FOUND
          </p>
          {(searchQuery || activeCategory !== "all") && (
            <button
              onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
              className="text-[10px] font-mono text-slate-600 hover:text-slate-400 tracking-widest transition-colors"
            >
              CLEAR FILTERS ✕
            </button>
          )}
        </div>
      </div>

      {/* ── GAME GRID ── */}
      <div className="relative z-20 w-full max-w-5xl">
        {filteredGames.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 rounded-2xl"
            style={{ border: "1px dashed #1a1c2e", background: "rgba(5,6,15,0.5)" }}
          >
            <span className="text-4xl mb-4 opacity-30">◌</span>
            <p className="text-slate-700 font-mono text-sm tracking-widest">NO GAMES FOUND</p>
            <p className="text-slate-800 font-mono text-[10px] tracking-widest mt-1">
              TRY A DIFFERENT SEARCH
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGames.map((g, index) => (
              <GameCard
                key={g.id}
                game={g}
                index={index}
                onEnter={() => { burstRef.current = { x: window.innerWidth / 2 }; }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── SUPPORT BUTTON ── */}
      <div className="support-btn-area relative z-30 mt-20 flex flex-col items-center gap-3">
        <button
          onClick={handleSupportClick}
          className="group relative px-10 py-4 rounded-full overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(0,207,255,0.25)",
            boxShadow: "0 0 30px rgba(0,207,255,0.06)",
          }}
        >
          <div
            className="absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{ background: "rgba(0,207,255,0.06)" }}
          />
          <div
            className="absolute left-0 right-0 h-px pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: "linear-gradient(90deg, transparent, #00cfff88, transparent)",
              animation: "scan-line 1.4s linear infinite",
              top: 0,
            }}
          />
          <span className="relative z-10 font-mono text-[11px] tracking-[0.4em] text-cyan-500 group-hover:text-cyan-300 transition-colors duration-300">
            {supportLabel}
          </span>
        </button>
        <p className="text-[9px] font-mono text-slate-800 tracking-[0.25em] uppercase">
          AUTO-COPIES JAZZCASH & OPENS APP
        </p>
      </div>

      <p className="relative z-20 mt-8 text-[9px] tracking-[0.35em] font-mono text-slate-900 font-bold">
        © 2077 GAMEZONE · CLICK ANYWHERE TO STRIKE
      </p>

      {/* ── STYLES ── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        .font-mono { font-family: 'Share Tech Mono', monospace; }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes pulse-glow {
          0%,100% { filter: brightness(1) drop-shadow(0 0 4px var(--glow)); }
          50%      { filter: brightness(1.35) drop-shadow(0 0 14px var(--glow)); }
        }
        @keyframes stutter {
          0%,100% { opacity:1; transform:none; }
          10%     { opacity:0.5; transform:translateX(1px); }
          20%     { opacity:1; transform:none; }
          55%     { opacity:0.8; transform:translateX(-1px) skewX(-2deg); }
          60%     { opacity:1; transform:none; }
          80%     { opacity:0.6; transform:translateX(1px); }
          85%     { opacity:1; }
        }
        @keyframes flare {
          0%,100% { filter:brightness(1); }
          45%     { filter:brightness(1.9) drop-shadow(0 0 18px #ffffff); }
          50%     { filter:brightness(1); }
        }
        @keyframes static-flicker {
          0%,100% { opacity:1; clip-path:none; }
          15%     { opacity:0.6; clip-path:inset(20% 0 60% 0); transform:translateX(1px); }
          16%     { opacity:1; clip-path:none; transform:none; }
          60%     { opacity:0.8; clip-path:inset(50% 0 20% 0); transform:translateX(-1px); }
          61%     { opacity:1; clip-path:none; transform:none; }
        }
        @keyframes zap {
          0%,90%,100% { opacity:1; filter:none; }
          92%  { opacity:0.5; filter:brightness(2) drop-shadow(0 0 10px #ffee00); transform:scaleY(1.02); }
          94%  { opacity:1; filter:brightness(1.5); }
          96%  { opacity:0.7; filter:none; }
        }
        @keyframes tesla {
          0%,50%,100% { filter:drop-shadow(0 0 2px var(--glow)); }
          25%  { filter:drop-shadow(0 0 12px var(--glow)) brightness(1.2); }
          75%  { filter:drop-shadow(0 0 14px var(--alt)) brightness(1.4); }
        }
        @keyframes discharge {
          0%,100% { opacity:1; transform:none; }
          30%     { opacity:0.7; transform:translateY(-1px); }
          70%     { opacity:0.9; transform:translateY(1px); }
        }
        @keyframes plasma {
          0%,100%,46% { filter:brightness(1) drop-shadow(0 0 3px var(--glow)); }
          40%  { filter:brightness(1.5) drop-shadow(0 0 18px var(--glow)) hue-rotate(10deg); }
          42%  { filter:brightness(0.9); }
          44%  { filter:brightness(1.5); }
        }
        @keyframes scan-line {
          0%   { top:0%; opacity:1; }
          100% { top:100%; opacity:0.1; }
        }
        @keyframes spark-pop {
          0%   { opacity:1; transform:scale(0.5); }
          50%  { opacity:0.8; transform:scale(1.6); }
          100% { opacity:0; transform:scale(0.2); }
        }
        @keyframes screen-flash {
          0%,100% { opacity:0; }
          10%     { opacity:1; }
          40%     { opacity:0; }
        }
        @keyframes shockwave-out {
          0%   { transform:scale(0.1); opacity:1; }
          100% { transform:scale(3);   opacity:0; }
        }
        .animate-screen-flash  { animation: screen-flash 0.3s ease-out forwards; }
        .animate-shockwave-out { animation: shockwave-out 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}