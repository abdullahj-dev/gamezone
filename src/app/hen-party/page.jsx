'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════ */
const NS = "GZ_HenParty_v1";
const LS = {
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(NS) || "{}");
      return {
        wins: d.wins ?? { p1: 0, p2: 0 },
        bestScores: d.bestScores ?? {},
        gamesPlayed: d.gamesPlayed ?? 0,
        totalHens: d.totalHens ?? 0,
        lastPlayed: d.lastPlayed ?? "",
      };
    } catch { return LS.def(); }
  },
  def: () => ({ wins:{ p1:0, p2:0 }, bestScores:{}, gamesPlayed:0, totalHens:0, lastPlayed:"" }),
  save(d) { try { localStorage.setItem(NS, JSON.stringify(d)); } catch {} },
};

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const W = 800, H = 500;
const GROUND = 390;
const GRAVITY = 0.7;
const JUMP = -15;
const PLAYER_W = 32, PLAYER_H = 48;
const COLORS = {
  sky1:"#87ceeb", sky2:"#c9e9f5",
  grass:"#5a8f3c", soil:"#8B6914",
  p1:"#e84343", p1dark:"#a82020", p1shirt:"#4488ff",
  p2:"#4488ff", p2dark:"#2255bb", p2shirt:"#e84343",
};
const GAMES = [
  { id:"henHustle",   name:"Hen Hustle",   emoji:"🐔", color:"#f97316", desc:"Smash blocks · Collect 10 hens to win",        keys:"W/S jump · A/D move | ↑/↓ jump · ←/→ move" },
  { id:"eggCatch",    name:"Egg Catch",    emoji:"🥚", color:"#a855f7", desc:"Catch eggs before they splat · Most eggs wins", keys:"W jump · A/D move | ↑ jump · ←/→ move" },
  { id:"foxChase",    name:"Fox Chase",    emoji:"🦊", color:"#ef4444", desc:"Stomp the fox · Don't let it steal your hens",  keys:"W jump · A/D move | ↑ jump · ←/→ move" },
  { id:"feedFrenzy",  name:"Feed Frenzy",  emoji:"🌾", color:"#22c55e", desc:"Throw feed · Lure hens to your side",           keys:"W throw · A/D move | ↑ throw · ←/→ move" },
];

/* ═══════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════ */
export default function HenParty() {
  const [screen, setScreen] = useState("menu");   // menu | playing | result
  const [activeGame, setActiveGame] = useState(null);
  const [result, setResult] = useState(null);
  const [store, setStore] = useState(LS.load);
  const [showStats, setShowStats] = useState(false);

  const updateStore = useCallback((fn) => {
    setStore(prev => { const next = fn(prev); LS.save(next); return next; });
  }, []);

  const handleResult = useCallback((winner, scores, gameId) => {
    updateStore(s => ({
      ...s,
      wins: { p1: s.wins.p1 + (winner === 1 ? 1 : 0), p2: s.wins.p2 + (winner === 2 ? 1 : 0) },
      gamesPlayed: s.gamesPlayed + 1,
      bestScores: {
        ...s.bestScores,
        [gameId]: { p1: Math.max(scores.p1, s.bestScores[gameId]?.p1 ?? 0), p2: Math.max(scores.p2, s.bestScores[gameId]?.p2 ?? 0) },
      },
      lastPlayed: new Date().toLocaleDateString(),
    }));
    setResult({ winner, scores, gameId });
    setScreen("result");
  }, [updateStore]);

  return (
    <div style={{ width:"100vw", height:"100vh", background:"#1a1a2e", display:"flex", alignItems:"center",
      justifyContent:"center", overflow:"hidden", fontFamily:"'Press Start 2P', 'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@700;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        button { cursor:pointer; font-family:inherit; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
        @keyframes float { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-6px) rotate(3deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes sway { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
        .btn-pixel { image-rendering:pixelated; border:3px solid rgba(0,0,0,0.3); box-shadow:0 4px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3); transition:all 0.1s; }
        .btn-pixel:hover { transform:translateY(-2px); box-shadow:0 6px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3); }
        .btn-pixel:active { transform:translateY(2px); box-shadow:0 2px 0 rgba(0,0,0,0.4); }
      `}</style>

      {screen === "menu"    && <MenuScreen store={store} onPlay={(g) => { setActiveGame(g); setScreen("playing"); }} onShowStats={() => setShowStats(true)} />}
      {screen === "playing" && activeGame && <GameEngine game={activeGame} onResult={handleResult} onQuit={() => setScreen("menu")} />}
      {screen === "result"  && result && <ResultScreen result={result} store={store} onRematch={() => { setScreen("playing"); }}
        onMenu={() => setScreen("menu")} />}

      {showStats && <StatsModal store={store} onClose={() => setShowStats(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MENU
═══════════════════════════════════════════════════════════ */
function MenuScreen({ store, onPlay, onShowStats }) {
  const [hov, setHov] = useState(null);
  return (
    <div style={{ width:W, maxWidth:"100vw", animation:"fadeUp 0.4s ease" }}>
      {/* Title */}
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:"clamp(20px,5vw,36px)", color:"#fbbf24", textShadow:"3px 3px 0 #92400e, 6px 6px 0 rgba(0,0,0,0.3)",
          letterSpacing:2, animation:"bounce 2s infinite" }}>🐔 HEN PARTY 🐔</div>
        <div style={{ fontSize:9, color:"#94a3b8", marginTop:8, letterSpacing:1 }}>2-PLAYER MINI-GAME COLLECTION</div>
      </div>

      {/* Score banner */}
      <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:20 }}>
        <ScoreBadge label="P1 WINS" val={store.wins.p1} color={COLORS.p1} />
        <ScoreBadge label="GAMES" val={store.gamesPlayed} color="#64748b" />
        <ScoreBadge label="P2 WINS" val={store.wins.p2} color={COLORS.p2} />
      </div>

      {/* Game cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 8px" }}>
        {GAMES.map(g => (
          <button key={g.id} className="btn-pixel" onClick={() => onPlay(g)}
            onMouseEnter={() => setHov(g.id)} onMouseLeave={() => setHov(null)}
            style={{ background: hov === g.id ? g.color : `${g.color}cc`,
              borderRadius:10, padding:"14px 10px", textAlign:"left",
              border:`3px solid ${g.color}`, color:"#fff" }}>
            <div style={{ fontSize:28, marginBottom:6, display:"block" }}>{g.emoji}</div>
            <div style={{ fontSize:10, fontWeight:900, marginBottom:4, letterSpacing:0.5 }}>{g.name}</div>
            <div style={{ fontSize:7, color:"rgba(255,255,255,0.8)", lineHeight:1.6, fontFamily:"Nunito,sans-serif", fontWeight:700 }}>{g.desc}</div>
          </button>
        ))}
      </div>

      {/* Controls reminder */}
      <div style={{ marginTop:14, textAlign:"center", fontSize:7, color:"#475569", lineHeight:2 }}>
        <div>P1: WASD to move/jump &nbsp;|&nbsp; P2: ARROWS to move/jump</div>
      </div>

      <div style={{ textAlign:"center", marginTop:10 }}>
        <button onClick={onShowStats} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid #334155",
          borderRadius:6, padding:"6px 16px", fontSize:8, color:"#94a3b8", cursor:"pointer" }}>
          📊 STATS
        </button>
      </div>
    </div>
  );
}

function ScoreBadge({ label, val, color }) {
  return (
    <div style={{ background:`${color}22`, border:`2px solid ${color}`, borderRadius:8, padding:"6px 14px", textAlign:"center" }}>
      <div style={{ fontSize:16, fontWeight:900, color }}>{val}</div>
      <div style={{ fontSize:7, color:"#64748b", marginTop:2 }}>{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RESULT SCREEN
═══════════════════════════════════════════════════════════ */
function ResultScreen({ result, store, onRematch, onMenu }) {
  const { winner, scores, gameId } = result;
  const g = GAMES.find(x => x.id === gameId);
  const wc = winner === 1 ? COLORS.p1 : COLORS.p2;
  return (
    <div style={{ textAlign:"center", animation:"pop 0.5s ease", padding:20 }}>
      <div style={{ fontSize:48, marginBottom:12, animation:"bounce 1s infinite" }}>
        {winner === 1 ? "🏆" : "🏆"}
      </div>
      <div style={{ fontSize:"clamp(14px,4vw,24px)", color:wc, textShadow:`2px 2px 0 rgba(0,0,0,0.5)`, marginBottom:6 }}>
        PLAYER {winner} WINS!
      </div>
      <div style={{ fontSize:9, color:"#94a3b8", marginBottom:20 }}>{g?.name}</div>
      <div style={{ display:"flex", gap:16, justifyContent:"center", marginBottom:24 }}>
        {[1,2].map(p => (
          <div key={p} style={{ background:`${p===1?COLORS.p1:COLORS.p2}22`, border:`2px solid ${p===1?COLORS.p1:COLORS.p2}`,
            borderRadius:10, padding:"12px 20px", minWidth:100 }}>
            <div style={{ fontSize:9, color:p===1?COLORS.p1:COLORS.p2, marginBottom:4 }}>PLAYER {p}</div>
            <div style={{ fontSize:28, fontWeight:900, color:"#fff" }}>{scores[`p${p}`]}</div>
            {p === winner && <div style={{ fontSize:7, color:"#fbbf24", marginTop:4 }}>★ WINNER</div>}
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
        <PixelBtn onClick={onRematch} color="#22c55e">🔄 REMATCH</PixelBtn>
        <PixelBtn onClick={onMenu} color="#64748b">🏠 MENU</PixelBtn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STATS MODAL
═══════════════════════════════════════════════════════════ */
function StatsModal({ store, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:100 }} onClick={onClose}>
      <div style={{ background:"#1e293b", border:"2px solid #334155", borderRadius:16, padding:24,
        minWidth:300, animation:"pop 0.3s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:12, color:"#fbbf24", marginBottom:16, textAlign:"center" }}>📊 STATS</div>
        {[["Total Games Played", store.gamesPlayed],
          ["P1 Total Wins", store.wins.p1],
          ["P2 Total Wins", store.wins.p2],
          ["Last Played", store.lastPlayed || "Never"],
        ].map(([l,v]) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0",
            borderBottom:"1px solid #334155", fontSize:8, color:"#94a3b8" }}>
            <span>{l}</span><span style={{ color:"#e2e8f0" }}>{v}</span>
          </div>
        ))}
        <div style={{ marginTop:16, textAlign:"center" }}>
          <PixelBtn onClick={onClose} color="#64748b">CLOSE</PixelBtn>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GAME ENGINE ROUTER
═══════════════════════════════════════════════════════════ */
function GameEngine({ game, onResult, onQuit }) {
  switch (game.id) {
    case "henHustle":  return <HenHustle  onResult={onResult} onQuit={onQuit} />;
    case "eggCatch":   return <EggCatch   onResult={onResult} onQuit={onQuit} />;
    case "foxChase":   return <FoxChase   onResult={onResult} onQuit={onQuit} />;
    case "feedFrenzy": return <FeedFrenzy onResult={onResult} onQuit={onQuit} />;
    default: return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   SHARED HOOKS
═══════════════════════════════════════════════════════════ */
function useKeys() {
  const keys = useRef({});
  useEffect(() => {
    const down = e => { keys.current[e.code] = true; };
    const up   = e => { keys.current[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);
  return keys;
}

function useGameLoop(tick, running = true) {
  const raf = useRef(null);
  const last = useRef(0);
  useEffect(() => {
    if (!running) return;
    const loop = ts => {
      const dt = Math.min((ts - last.current) / 16.67, 3);
      last.current = ts;
      tick(dt);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [tick, running]);
}

/* ═══════════════════════════════════════════════════════════
   SHARED CANVAS SCENE RENDERER
═══════════════════════════════════════════════════════════ */
function drawScene(ctx, bgColor1 = COLORS.sky1, bgColor2 = COLORS.sky2, theme = "farm") {
  // Sky gradient
  const sg = ctx.createLinearGradient(0, 0, 0, GROUND);
  sg.addColorStop(0, bgColor1); sg.addColorStop(1, bgColor2);
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, GROUND);

  // Clouds
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  [[80,60,50],[200,40,35],[400,70,55],[600,50,40],[700,35,28]].forEach(([x,y,r]) => {
    ctx.beginPath(); ctx.ellipse(x, y, r, r*0.6, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+r*0.6, y+4, r*0.7, r*0.45, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x-r*0.5, y+5, r*0.65, r*0.4, 0, 0, Math.PI*2); ctx.fill();
  });

  // Theme decorations
  if (theme === "farm") {
    // Barn silhouette
    ctx.fillStyle = "#8B3A3A";
    ctx.fillRect(680, 260, 90, 120);
    ctx.fillStyle = "#6B2A2A";
    ctx.beginPath(); ctx.moveTo(675,260); ctx.lineTo(725,220); ctx.lineTo(775,260); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#4a2a00";
    ctx.fillRect(705, 310, 28, 50);
    // fence posts left
    [20,50,80,110].forEach(x => {
      ctx.fillStyle = "#c8a86b"; ctx.fillRect(x, 340, 8, 50);
      ctx.fillRect(x-2, 360, 12, 6); ctx.fillRect(x-2, 380, 12, 6);
    });
  } else if (theme === "night") {
    // Stars
    ctx.fillStyle = "#fbbf24";
    [[50,30],[150,50],[300,20],[500,40],[650,25],[720,60],[100,80]].forEach(([x,y]) => {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
    });
    // Moon
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath(); ctx.arc(700, 60, 30, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = bgColor1;
    ctx.beginPath(); ctx.arc(715, 55, 26, 0, Math.PI*2); ctx.fill();
  } else if (theme === "forest") {
    // Trees
    [[60,200],[160,180],[640,195],[730,185],[770,200]].forEach(([x,y]) => {
      ctx.fillStyle = "#2d5a1b";
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-30,y+80); ctx.lineTo(x+30,y+80); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x,y-20); ctx.lineTo(x-22,y+50); ctx.lineTo(x+22,y+50); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#5a3010";
      ctx.fillRect(x-7,y+78,14,30);
    });
  } else if (theme === "market") {
    // Market stalls
    [[50,240],[180,240],[580,240],[700,240]].forEach(([x,y],i) => {
      const cs = ["#ef4444","#3b82f6","#22c55e","#f59e0b"];
      ctx.fillStyle = cs[i];
      ctx.fillRect(x,y,90,8);
      ctx.fillStyle = "#fff8"; ctx.fillRect(x,y+8,90,70);
      ctx.fillStyle = "#4a3728"; ctx.fillRect(x+8,y+78,8,30); ctx.fillRect(x+74,y+78,8,30);
    });
  }

  // Ground
  const gg = ctx.createLinearGradient(0, GROUND, 0, H);
  gg.addColorStop(0, COLORS.grass); gg.addColorStop(0.15, "#4a7c30"); gg.addColorStop(1, COLORS.soil);
  ctx.fillStyle = gg; ctx.fillRect(0, GROUND, W, H - GROUND);

  // Ground highlight
  ctx.fillStyle = "#7abf52";
  ctx.fillRect(0, GROUND, W, 6);
}

function drawPlayer(ctx, p, idx, frame) {
  const { x, y, w, h, facing, dead, stunTimer } = p;
  if (dead) return;

  ctx.save();
  if (stunTimer > 0) ctx.globalAlpha = Math.floor(frame/4)%2 === 0 ? 0.4 : 1;
  ctx.translate(x + w/2, y + h/2);
  if (facing < 0) ctx.scale(-1,1);
  ctx.translate(-w/2, -h/2);

  const bc = idx === 0 ? COLORS.p1 : COLORS.p2;
  const dc = idx === 0 ? COLORS.p1dark : COLORS.p2dark;
  const sc = idx === 0 ? COLORS.p1shirt : COLORS.p2shirt;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath(); ctx.ellipse(w/2, h+2, w*0.45, 5, 0, 0, Math.PI*2); ctx.fill();

  // Legs (animated)
  const legSwing = p.onGround && Math.abs(p.vx) > 0.5 ? Math.sin(frame * 0.25) * 8 : 0;
  ctx.fillStyle = "#2d1b69";
  ctx.fillRect(2, h-16, 10, 16); // left leg
  ctx.fillRect(w-12, h-16, 10, 16); // right leg
  // shoes
  ctx.fillStyle = "#1a0a00";
  ctx.fillRect(0, h-6, 14, 6); ctx.fillRect(w-14, h-6, 14, 6);

  // Body
  ctx.fillStyle = sc;
  ctx.beginPath(); ctx.roundRect(2, h*0.4, w-4, h*0.45, 4); ctx.fill();
  // overalls
  ctx.fillStyle = dc;
  ctx.fillRect(6, h*0.4, w-12, 6);

  // Arms
  ctx.fillStyle = bc;
  ctx.fillRect(-4, h*0.42, 8, h*0.3);
  ctx.fillRect(w-4, h*0.42, 8, h*0.3);

  // Head
  ctx.fillStyle = bc;
  ctx.beginPath(); ctx.roundRect(2, 2, w-4, h*0.4, [8,8,4,4]); ctx.fill();
  ctx.fillStyle = dc;
  ctx.beginPath(); ctx.roundRect(2, 2, w-4, 8, [8,8,0,0]); ctx.fill(); // hair

  // Eyes
  ctx.fillStyle = "#fff";
  ctx.fillRect(w*0.55, 12, 8, 8);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(w*0.57, 14, 5, 5);
  // highlight
  ctx.fillStyle = "#fff";
  ctx.fillRect(w*0.57+3, 14, 2, 2);

  // Mouth smile
  ctx.strokeStyle = "#1a1a2e"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(w*0.6+2, 20, 4, 0.2, Math.PI-0.2); ctx.stroke();

  // Player number badge
  ctx.fillStyle = idx===0 ? COLORS.p1 : COLORS.p2;
  ctx.beginPath(); ctx.arc(-6, 4, 8, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(idx+1, -6, 8);

  ctx.restore();
}

function drawHen(ctx, hen, frame) {
  const { x, y, dir, state, float } = hen;
  ctx.save();
  ctx.translate(x, y + (float||0));
  if (dir < 0) { ctx.scale(-1,1); ctx.translate(-28,0); }

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath(); ctx.ellipse(14, 30, 12, 4, 0, 0, Math.PI*2); ctx.fill();

  // Body
  ctx.fillStyle = state==="golden" ? "#fbbf24" : state==="ghost" ? "#a5f3fc" : "#f5f0e8";
  ctx.beginPath(); ctx.ellipse(14, 18, 12, 10, 0, 0, Math.PI*2); ctx.fill();
  // Wing
  ctx.fillStyle = state==="golden" ? "#f59e0b" : "#e8e0d0";
  ctx.beginPath(); ctx.ellipse(14, 18, 8, 6, 0.3, 0, Math.PI*2); ctx.fill();
  // Head
  ctx.fillStyle = state==="golden" ? "#fbbf24" : "#f5f0e8";
  ctx.beginPath(); ctx.arc(22, 8, 7, 0, Math.PI*2); ctx.fill();
  // Beak
  ctx.fillStyle = "#f97316";
  ctx.beginPath(); ctx.moveTo(28,8); ctx.lineTo(34,10); ctx.lineTo(28,12); ctx.closePath(); ctx.fill();
  // Eye
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath(); ctx.arc(24, 7, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(25, 6, 1, 0, Math.PI*2); ctx.fill();
  // Comb
  ctx.fillStyle = "#ef4444";
  [21,24,27].forEach(cx => { ctx.beginPath(); ctx.arc(cx, 3, 3, 0, Math.PI*2); ctx.fill(); });
  // Feet
  ctx.fillStyle = "#f97316";
  ctx.fillRect(8, 26, 4, 6); ctx.fillRect(16, 26, 4, 6);
  ctx.fillRect(5, 32, 8, 3); ctx.fillRect(13, 32, 8, 3);

  if (state === "golden") {
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(14, 14, 18, 0, Math.PI*2); ctx.stroke();
  }
  ctx.restore();
}

function drawBasket(ctx, x, y, player, henCount) {
  const c = player === 0 ? "#c2410c" : "#1d4ed8";
  // weave
  ctx.fillStyle = "#92400e";
  ctx.beginPath(); ctx.roundRect(x, y, 80, 50, [0,0,10,10]); ctx.fill();
  ctx.fillStyle = c;
  for (let i = 0; i < 4; i++) { ctx.fillRect(x + i*22, y, 8, 50); }
  for (let i = 0; i < 3; i++) { ctx.fillRect(x, y + i*17, 80, 5); }
  // handle
  ctx.strokeStyle = "#92400e"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x+40, y-10, 35, Math.PI, 0); ctx.stroke();
  // player label
  ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`P${player+1}`, x+40, y+28);
  // hen count
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.arc(x+40, y-2, 12, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 11px sans-serif";
  ctx.fillText(henCount, x+40, y+2);
}

/* ═══════════════════════════════════════════════════════════
   GAME 1: HEN HUSTLE
   Center platform with blocks. Jump to headbutt = egg/tnt/nothing.
   Egg → hen falls to your side, +1. TNT → stunned. First to 10 wins.
═══════════════════════════════════════════════════════════ */
function HenHustle({ onResult, onQuit }) {
  const cvs = useRef(null);
  const keys = useKeys();
  const state = useRef(initHenHustle());
  const [ui, setUi] = useState({ p1:0, p2:0, countdown:3 });
  const frame = useRef(0);

  function initHenHustle() {
    const blocks = [];
    for (let i = 0; i < 10; i++) {
      blocks.push({ x: 150 + i*51, y: 170, w:44, h:44, state:"hidden",
        content: Math.random()<0.5?"egg":Math.random()<0.3?"tnt":"empty",
        revealTimer:0, hen:null });
    }
    return {
      players: [
        { x:60, y:GROUND-PLAYER_H, vx:0, vy:0, w:PLAYER_W, h:PLAYER_H, onGround:true, facing:1, stunTimer:0, dead:false, side:0 },
        { x:W-60-PLAYER_W, y:GROUND-PLAYER_H, vx:0, vy:0, w:PLAYER_W, h:PLAYER_H, onGround:true, facing:-1, stunTimer:0, dead:false, side:1 },
      ],
      blocks,
      hens: [], // active hens floating/falling
      particles: [],
      scores: [0, 0],
      platform: { x:130, y:220, w:540, h:18 },
      phase: "countdown", // countdown | playing | done
      countdown: 3,
      countdownTimer: 60,
      winner: null,
      frame: 0,
    };
  }

  const tick = useCallback((dt) => {
    const s = state.current;
    frame.current++;
    s.frame++;

    if (s.phase === "countdown") {
      s.countdownTimer -= dt;
      if (s.countdownTimer <= 0) {
        s.countdown--;
        s.countdownTimer = 60;
        if (s.countdown <= 0) s.phase = "playing";
      }
      setUi({ p1: s.scores[0], p2: s.scores[1], countdown: s.countdown });
      renderHenHustle(cvs.current, s, frame.current);
      return;
    }
    if (s.phase === "done") return;

    // Input
    const P = s.players;
    // P1: WASD
    if (P[0].stunTimer <= 0) {
      P[0].vx = (keys.current["KeyD"]?3.5:0) - (keys.current["KeyA"]?3.5:0);
      if (keys.current["KeyW"] && P[0].onGround) { P[0].vy = JUMP; P[0].onGround = false; }
    }
    // P2: Arrows
    if (P[1].stunTimer <= 0) {
      P[1].vx = (keys.current["ArrowRight"]?3.5:0) - (keys.current["ArrowLeft"]?3.5:0);
      if (keys.current["ArrowUp"] && P[1].onGround) { P[1].vy = JUMP; P[1].onGround = false; }
    }

    P.forEach((p, pi) => {
      if (p.stunTimer > 0) { p.stunTimer -= dt; p.vx *= 0.9; }
      if (p.vx !== 0) p.facing = p.vx > 0 ? 1 : -1;
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Clamp X
      p.x = Math.max(0, Math.min(W - p.w, p.x));
      // Ground
      if (p.y + p.h >= GROUND) { p.y = GROUND - p.h; p.vy = 0; p.onGround = true; }
      else p.onGround = false;
      // Platform collision
      const pl = s.platform;
      if (p.vy >= 0 && p.x + p.w > pl.x && p.x < pl.x + pl.w && p.y + p.h >= pl.y && p.y + p.h <= pl.y + pl.h + 12) {
        p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
      }
      // Head-butt block
      if (p.vy < 0) {
        s.blocks.forEach(b => {
          if (b.state === "done") return;
          const headX = p.x + p.w/2, headY = p.y;
          if (headX > b.x && headX < b.x+b.w && headY > b.y && headY < b.y+b.h+10 && headY > b.y-10) {
            // hit!
            if (b.state === "hidden") {
              b.state = "revealed";
              b.revealTimer = 80;
              b.hitter = pi;
              if (b.content === "egg") {
                spawnHen(s, b.x + b.w/2, b.y, pi);
              } else if (b.content === "tnt") {
                explodeBlock(s, b, p, pi);
              } else {
                spawnParticles(s, b.x+b.w/2, b.y, "#94a3b8", 6);
              }
            }
            p.vy = 4; // bounce back down
          }
        });
      }
    });

    // Block timers
    s.blocks.forEach(b => {
      if (b.revealTimer > 0) { b.revealTimer -= dt; if (b.revealTimer <= 0) b.state = "done"; }
    });

    // Hens
    s.hens.forEach(h => {
      h.vy = (h.vy || 0) + GRAVITY * 0.4 * dt;
      h.x += (h.vx||0) * dt;
      h.y += h.vy * dt;
      if (h.y + 32 >= GROUND) { h.y = GROUND - 32; h.vy = 0; h.vx = 0; h.landed = true; }
      // scored?
      if (!h.scored && h.landed) {
        h.scored = true;
        // assign to nearest basket
        const side = h.targetSide ?? (h.x < W/2 ? 0 : 1);
        s.scores[side]++;
        if (s.scores[side] >= 10) { s.phase = "done"; s.winner = side + 1; }
      }
    });

    // Particles
    s.particles = s.particles.filter(p => { p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 0.2*dt; return p.life > 0; });

    setUi({ p1: s.scores[0], p2: s.scores[1], countdown: s.countdown });

    if (s.phase === "done" && s.winner) {
      onResult(s.winner, { p1: s.scores[0], p2: s.scores[1] }, "henHustle");
      s.phase = "over";
    }

    renderHenHustle(cvs.current, s, frame.current);
  }, [keys, onResult]);

  useGameLoop(tick);

  function spawnHen(s, x, y, hitter) {
    s.hens.push({
      x: x-14, y: y-40,
      vx: (hitter === 0 ? -2 : 2) + (Math.random()-0.5)*2,
      vy: -6,
      dir: hitter===0 ? -1 : 1,
      targetSide: hitter,
      state: "normal",
      landed: false, scored: false,
    });
    spawnParticles(s, x, y, "#fbbf24", 10);
  }

  function explodeBlock(s, b, p, pi) {
    b.content = "exploded";
    spawnParticles(s, b.x+b.w/2, b.y+b.h/2, "#f97316", 20);
    spawnParticles(s, b.x+b.w/2, b.y+b.h/2, "#ef4444", 15);
    p.stunTimer = 120; p.vy = -8; p.vx = pi===0?-5:5;
    // scatter nearby hens
    s.hens.forEach(h => { h.vx += (Math.random()-0.5)*8; h.vy -= 4; });
  }

  function spawnParticles(s, x, y, color, count) {
    for (let i=0;i<count;i++) {
      const a = Math.random()*Math.PI*2;
      const spd = 1+Math.random()*4;
      s.particles.push({ x, y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd-2, color, life:30+Math.random()*20, maxLife:50, r:3+Math.random()*4 });
    }
  }

  return (
    <div style={{ position:"relative" }}>
      <GameHUD scores={ui} game={GAMES[0]} onQuit={onQuit} target={10} />
      <canvas ref={cvs} width={W} height={H} style={{ display:"block", borderRadius:12,
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)", maxWidth:"100vw" }} />
    </div>
  );
}

function renderHenHustle(canvas, s, frame) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  drawScene(ctx, "#87ceeb", "#c9e9f5", "farm");

  // Platform
  const pl = s.platform;
  const pg = ctx.createLinearGradient(0, pl.y, 0, pl.y+pl.h);
  pg.addColorStop(0, "#8B7355"); pg.addColorStop(1, "#6B5335");
  ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(pl.x, pl.y, pl.w, pl.h, 4); ctx.fill();
  ctx.strokeStyle = "#a89070"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pl.x+6, pl.y); ctx.lineTo(pl.x+pl.w-6, pl.y); ctx.stroke();

  // Baskets
  drawBasket(ctx, 20, GROUND-60, 0, s.scores[0]);
  drawBasket(ctx, W-100, GROUND-60, 1, s.scores[1]);

  // Progress bars
  drawProgressBar(ctx, 20, GROUND-72, 80, s.scores[0], 10, COLORS.p1);
  drawProgressBar(ctx, W-100, GROUND-72, 80, s.scores[1], 10, COLORS.p2);

  // Blocks
  s.blocks.forEach((b, i) => {
    if (b.state === "done") {
      ctx.fillStyle = "#6b6b6b44";
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill();
      return;
    }
    const bounce = b.state==="revealed" ? Math.sin(b.revealTimer*0.2)*3 : 0;
    const bg = b.state==="revealed"
      ? (b.content==="egg"?"#fbbf24":b.content==="tnt"?"#ef4444":"#94a3b8")
      : (i%2===0 ? "#c8a86b":"#b89658");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(b.x+2, b.y+bounce, b.w-4, b.h-2, 4); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1;
    ctx.strokeRect(b.x+2, b.y+bounce, b.w-4, b.h-2);
    // Question mark or reveal
    ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
    if (b.state === "hidden") {
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillText("?", b.x+b.w/2, b.y+b.h/2+7+bounce);
    } else {
      ctx.fillText(b.content==="egg"?"🥚":b.content==="tnt"?"💥":"💨", b.x+b.w/2, b.y+b.h/2+7+bounce);
    }
  });

  // Hens
  s.hens.forEach(h => drawHen(ctx, h, frame));

  // Players
  s.players.forEach((p, i) => drawPlayer(ctx, p, i, frame));

  // Particles
  drawParticles(ctx, s.particles);

  // Countdown overlay
  if (s.phase === "countdown" && s.countdown > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0,0,W,H);
    ctx.font = "bold 80px 'Press Start 2P', monospace";
    ctx.fillStyle = "#fbbf24"; ctx.textAlign = "center";
    ctx.fillText(s.countdown, W/2, H/2+28);
    ctx.font = "bold 16px 'Press Start 2P', monospace";
    ctx.fillStyle = "#fff"; ctx.fillText("GET READY!", W/2, H/2-40);
  }
}

/* ═══════════════════════════════════════════════════════════
   GAME 2: EGG CATCH
   Hens sit on top bar. They randomly lay eggs. Players catch in baskets.
   Eggs that hit ground = -1. Most eggs after 60s wins.
═══════════════════════════════════════════════════════════ */
function EggCatch({ onResult, onQuit }) {
  const cvs = useRef(null);
  const keys = useKeys();
  const state = useRef(initEggCatch());
  const [ui, setUi] = useState({ p1:0, p2:0, time:60 });
  const frame = useRef(0);

  function initEggCatch() {
    // 8 hens sit on top perch
    const hens = Array.from({length:8}, (_,i) => ({
      x: 80 + i*85, y: 150, dir: i%2===0?1:-1,
      layTimer: 60 + Math.random()*120,
      side: i < 4 ? 0 : 1,
      state: "normal",
    }));
    return {
      players: [
        { x:30, y:GROUND-PLAYER_H, vx:0, vy:0, w:PLAYER_W, h:PLAYER_H, onGround:true, facing:1, stunTimer:0, dead:false },
        { x:W-30-PLAYER_W, y:GROUND-PLAYER_H, vx:0, vy:0, w:PLAYER_W, h:PLAYER_H, onGround:true, facing:-1, stunTimer:0, dead:false },
      ],
      hens,
      eggs: [],
      particles: [],
      scores: [0, 0],
      perch: { x:40, y:160, w:W-80, h:14 },
      timer: 60*60, // 60 seconds
      phase: "countdown",
      countdown: 3, countdownTimer: 60,
      baskets: [
        { x:0, y:GROUND-55, w:90, h:55 },
        { x:W-90, y:GROUND-55, w:90, h:55 },
      ],
    };
  }

  const tick = useCallback((dt) => {
    const s = state.current;
    frame.current++;

    if (s.phase === "countdown") {
      s.countdownTimer -= dt;
      if (s.countdownTimer <= 0) { s.countdown--; s.countdownTimer = 60; if (s.countdown <= 0) s.phase = "playing"; }
      renderEggCatch(cvs.current, s, frame.current);
      setUi({ p1:s.scores[0], p2:s.scores[1], time:Math.ceil(s.timer/60) });
      return;
    }
    if (s.phase === "done") return;

    s.timer -= dt;
    if (s.timer <= 0) {
      s.phase = "done";
      const w = s.scores[0] > s.scores[1] ? 1 : s.scores[1] > s.scores[0] ? 2 : 1;
      onResult(w, { p1:s.scores[0], p2:s.scores[1] }, "eggCatch");
      return;
    }

    // Players
    const P = s.players;
    if (P[0].stunTimer <= 0) {
      P[0].vx = (keys.current["KeyD"]?4:0) - (keys.current["KeyA"]?4:0);
      if (keys.current["KeyW"] && P[0].onGround) { P[0].vy = JUMP; P[0].onGround = false; }
    }
    if (P[1].stunTimer <= 0) {
      P[1].vx = (keys.current["ArrowRight"]?4:0) - (keys.current["ArrowLeft"]?4:0);
      if (keys.current["ArrowUp"] && P[1].onGround) { P[1].vy = JUMP; P[1].onGround = false; }
    }
    P.forEach(p => {
      if (p.stunTimer > 0) { p.stunTimer -= dt; p.vx *= 0.9; }
      if (p.vx !== 0) p.facing = p.vx > 0 ? 1 : -1;
      p.vy += GRAVITY * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = Math.max(0, Math.min(W-p.w, p.x));
      if (p.y + p.h >= GROUND) { p.y = GROUND-p.h; p.vy = 0; p.onGround = true; }
      else p.onGround = false;
    });

    // Hens lay eggs
    s.hens.forEach(h => {
      h.layTimer -= dt;
      if (h.layTimer <= 0) {
        h.layTimer = 80 + Math.random() * 100;
        s.eggs.push({ x:h.x+10, y:h.y+28, vy:1, vx:(Math.random()-0.5)*1.5, caught:false, splat:false });
      }
    });

    // Eggs
    s.eggs = s.eggs.filter(e => {
      if (e.caught || e.splat) return e.life-- > 0;
      e.vy += 0.35 * dt; e.x += e.vx * dt; e.y += e.vy * dt;

      // Check players catch
      P.forEach((p, pi) => {
        const bx = pi === 0 ? 0 : W-90, bw = 90, by = GROUND-55, bh = 55;
        if (!e.caught && e.x > bx && e.x < bx+bw && e.y+14 >= by && e.y < by+bh) {
          // Who owns this basket?
          s.scores[pi]++;
          e.caught = true; e.life = 20;
          spawnParticles2(s, e.x, e.y, "#fbbf24", 8);
        }
      });

      // Ground splat
      if (e.y + 14 >= GROUND && !e.caught) {
        e.splat = true; e.life = 30;
        spawnParticles2(s, e.x, GROUND, "#fbbf24", 5);
        // penalty for nearest player
        const pi = e.x < W/2 ? 0 : 1;
        s.scores[pi] = Math.max(0, s.scores[pi] - 1);
      }
      return true;
    });

    // Particles
    s.particles = s.particles.filter(p => { p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; return p.life > 0; });

    setUi({ p1:s.scores[0], p2:s.scores[1], time:Math.ceil(s.timer/60) });
    renderEggCatch(cvs.current, s, frame.current);
  }, [keys, onResult]);

  function spawnParticles2(s, x, y, color, count) {
    for (let i=0;i<count;i++) {
      const a = Math.random()*Math.PI*2; const spd = 1+Math.random()*3;
      s.particles.push({ x, y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd-1, color, life:25+Math.random()*15 });
    }
  }

  useGameLoop(tick);

  return (
    <div style={{ position:"relative" }}>
      <GameHUD scores={ui} game={GAMES[1]} onQuit={onQuit} timer showTimer />
      <canvas ref={cvs} width={W} height={H} style={{ display:"block", borderRadius:12,
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)", maxWidth:"100vw" }} />
    </div>
  );
}

function renderEggCatch(canvas, s, frame) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  drawScene(ctx, "#9fd8f5", "#c9e9f5", "forest");

  // Perch
  const pl = s.perch;
  ctx.fillStyle = "#8B7355"; ctx.beginPath(); ctx.roundRect(pl.x, pl.y, pl.w, pl.h, 4); ctx.fill();
  // Poles
  ctx.fillStyle = "#6B5335";
  ctx.fillRect(pl.x, pl.y, 8, GROUND-pl.y);
  ctx.fillRect(pl.x+pl.w-8, pl.y, 8, GROUND-pl.y);

  // Baskets
  drawBasket(ctx, 5, GROUND-55, 0, s.scores[0]);
  drawBasket(ctx, W-85, GROUND-55, 1, s.scores[1]);

  // Hens on perch
  s.hens.forEach(h => drawHen(ctx, h, frame));

  // Eggs
  s.eggs.forEach(e => {
    if (e.splat) {
      ctx.globalAlpha = e.life / 30;
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.ellipse(e.x, GROUND-2, 14, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    if (e.caught) return;
    // Egg
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath(); ctx.ellipse(e.x, e.y, 8, 11, 0.1, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Players
  s.players.forEach((p,i) => drawPlayer(ctx, p, i, frame));

  // Timer bar
  const timeLeft = s.timer / (60*60);
  ctx.fillStyle = "#1e293b"; ctx.fillRect(W/2-100, 10, 200, 14);
  ctx.fillStyle = timeLeft > 0.5 ? "#22c55e" : timeLeft > 0.25 ? "#f59e0b" : "#ef4444";
  ctx.fillRect(W/2-100, 10, 200*timeLeft, 14);
  ctx.strokeStyle = "#334155"; ctx.lineWidth = 2; ctx.strokeRect(W/2-100, 10, 200, 14);
  ctx.font = "10px 'Press Start 2P'"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(s.timer/60)}s`, W/2, 21);

  // Countdown
  if (s.phase === "countdown" && s.countdown > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0,0,W,H);
    ctx.font = "bold 80px 'Press Start 2P',monospace";
    ctx.fillStyle = "#a855f7"; ctx.textAlign = "center";
    ctx.fillText(s.countdown, W/2, H/2+28);
  }

  drawParticles(ctx, s.particles);
}

/* ═══════════════════════════════════════════════════════════
   GAME 3: FOX CHASE
   Fox runs across. Players stomp it to protect hens. Fox steals if not stopped.
   5 stomps wins. Fox gets faster each round.
═══════════════════════════════════════════════════════════ */
function FoxChase({ onResult, onQuit }) {
  const cvs = useRef(null);
  const keys = useKeys();
  const state = useRef(initFoxChase());
  const [ui, setUi] = useState({ p1:0, p2:0 });
  const frame = useRef(0);

  function initFoxChase() {
    return {
      players: [
        { x:80, y:GROUND-PLAYER_H, vx:0, vy:0, w:PLAYER_W, h:PLAYER_H, onGround:true, facing:1, stunTimer:0, dead:false },
        { x:W-80-PLAYER_W, y:GROUND-PLAYER_H, vx:0, vy:0, w:PLAYER_W, h:PLAYER_H, onGround:true, facing:-1, stunTimer:0, dead:false },
      ],
      fox: spawnFox(),
      hens: Array.from({length:6}, (_,i) => ({
        x: 100+i*100, y:GROUND-30, dir:1, state:"normal", stolen:false,
        wobble: Math.random()*Math.PI*2,
      })),
      particles: [],
      scores: [0,0],
      foxRound: 1,
      phase: "countdown", countdown:3, countdownTimer:60,
      floatTexts: [],
    };
  }

  function spawnFox(round=1) {
    const fromLeft = Math.random() > 0.5;
    return {
      x: fromLeft ? -60 : W+60, y: GROUND-36,
      vx: fromLeft ? (3+round*0.7) : -(3+round*0.7),
      w:50, h:36, dir: fromLeft ? 1 : -1,
      state: "running", stunned:0,
      stealTimer: 0, stolenHen: null,
    };
  }

  const tick = useCallback((dt) => {
    const s = state.current;
    frame.current++;

    if (s.phase === "countdown") {
      s.countdownTimer -= dt;
      if (s.countdownTimer <= 0) { s.countdown--; s.countdownTimer=60; if(s.countdown<=0) s.phase="playing"; }
      setUi({ p1:s.scores[0], p2:s.scores[1] });
      renderFoxChase(cvs.current, s, frame.current);
      return;
    }
    if (s.phase === "done") return;

    const P = s.players;
    if (P[0].stunTimer<=0) { P[0].vx=(keys.current["KeyD"]?4:0)-(keys.current["KeyA"]?4:0); if(keys.current["KeyW"]&&P[0].onGround){P[0].vy=JUMP;P[0].onGround=false;} }
    if (P[1].stunTimer<=0) { P[1].vx=(keys.current["ArrowRight"]?4:0)-(keys.current["ArrowLeft"]?4:0); if(keys.current["ArrowUp"]&&P[1].onGround){P[1].vy=JUMP;P[1].onGround=false;} }
    P.forEach(p => {
      if(p.stunTimer>0){p.stunTimer-=dt;p.vx*=0.9;}
      if(p.vx!==0)p.facing=p.vx>0?1:-1;
      p.vy+=GRAVITY*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
      p.x=Math.max(0,Math.min(W-p.w,p.x));
      if(p.y+p.h>=GROUND){p.y=GROUND-p.h;p.vy=0;p.onGround=true;}else p.onGround=false;
    });

    const fox = s.fox;
    if (fox.state !== "fleeing" && fox.stunned <= 0) {
      fox.x += fox.vx * dt;
      fox.dir = fox.vx > 0 ? 1 : -1;

      // Fox near a hen → steal!
      if (!fox.stolenHen) {
        s.hens.filter(h=>!h.stolen).forEach(h => {
          if (Math.abs(fox.x - h.x) < 50) {
            fox.stealTimer++;
            if (fox.stealTimer > 60) {
              h.stolen = true; fox.stolenHen = h;
              addFloatText(s, fox.x, fox.y-30, "STOLEN! 🐔", "#ef4444");
            }
          }
        });
      }
    }
    if (fox.stunned > 0) { fox.stunned -= dt; }

    // Fox off screen → respawn or score penalty
    if (fox.x < -100 || fox.x > W+100) {
      if (fox.stolenHen) { addFloatText(s, W/2, 150, "FOX GOT AWAY!", "#ef4444"); }
      s.fox = spawnFox(s.foxRound++);
    }

    // Player stomp fox
    P.forEach((p, pi) => {
      if (fox.stunned > 0 || fox.state==="fleeing") return;
      if (p.vy > 0 && p.x+p.w > fox.x && p.x < fox.x+fox.w && p.y+p.h >= fox.y && p.y+p.h <= fox.y+fox.h+12) {
        // Stomp!
        fox.stunned = 120; fox.stolenHen = null;
        p.vy = -10;
        s.scores[pi]++;
        addFloatText(s, p.x, p.y-20, `+1 P${pi+1}!`, pi===0?COLORS.p1:COLORS.p2);
        spawnParticlesF(s, fox.x+fox.w/2, fox.y, "#f97316", 15);
        if (s.scores[pi] >= 5) {
          s.phase = "done";
          onResult(pi+1, { p1:s.scores[0], p2:s.scores[1] }, "foxChase");
        }
      }
    });

    // Hens wobble
    s.hens.forEach(h => { h.wobble += 0.03 * dt; });
    // Floats
    s.floatTexts = s.floatTexts.filter(ft => { ft.life-=dt; ft.y-=0.5*dt; return ft.life>0; });
    s.particles = s.particles.filter(p => { p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=0.2*dt; return p.life>0; });

    setUi({ p1:s.scores[0], p2:s.scores[1] });
    renderFoxChase(cvs.current, s, frame.current);
  }, [keys, onResult]);

  function spawnParticlesF(s, x, y, color, count) {
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2;const spd=1+Math.random()*4;s.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,color,life:30+Math.random()*20,maxLife:50,r:3+Math.random()*4});}
  }

  function addFloatText(s, x, y, text, color) {
    s.floatTexts.push({ x, y, text, color, life:90 });
  }

  useGameLoop(tick);
  return (
    <div style={{ position:"relative" }}>
      <GameHUD scores={ui} game={GAMES[2]} onQuit={onQuit} target={5} />
      <canvas ref={cvs} width={W} height={H} style={{ display:"block", borderRadius:12, boxShadow:"0 20px 60px rgba(0,0,0,0.5)", maxWidth:"100vw" }} />
    </div>
  );
}

function renderFoxChase(canvas, s, frame) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  drawScene(ctx, "#fef9c3", "#fde68a", "night");

  // Hens on ground
  s.hens.forEach(h => {
    if (h.stolen) return;
    const bob = Math.sin(h.wobble) * 3;
    drawHen(ctx, { ...h, y: h.y+bob }, frame);
  });

  // Fox
  const fox = s.fox;
  drawFox(ctx, fox, frame);

  // Players
  s.players.forEach((p,i) => drawPlayer(ctx, p, i, frame));

  // Score targets (stars)
  [0,1].forEach(pi => {
    const sx = pi===0 ? 30 : W-30;
    for (let i=0;i<5;i++) {
      const filled = i < s.scores[pi];
      ctx.font = "18px sans-serif"; ctx.textAlign = "center";
      ctx.globalAlpha = filled ? 1 : 0.3;
      ctx.fillText("⭐", sx, 30+i*22);
    }
    ctx.globalAlpha = 1;
  });

  // Float texts
  s.floatTexts.forEach(ft => {
    ctx.globalAlpha = ft.life/90;
    ctx.font = "bold 14px 'Press Start 2P',sans-serif"; ctx.fillStyle = ft.color; ctx.textAlign = "center";
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.globalAlpha = 1;
  });

  drawParticles(ctx, s.particles);

  if (s.phase==="countdown"&&s.countdown>0) {
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(0,0,W,H);
    ctx.font="bold 80px 'Press Start 2P',monospace"; ctx.fillStyle="#ef4444"; ctx.textAlign="center";
    ctx.fillText(s.countdown,W/2,H/2+28);
  }
}

function drawFox(ctx, fox, frame) {
  const { x, y, dir, stunned } = fox;
  ctx.save();
  ctx.translate(x + fox.w/2, y + fox.h/2);
  if (dir < 0) ctx.scale(-1,1);
  const cx = -fox.w/2, cy = -fox.h/2;

  if (stunned > 0) { ctx.globalAlpha = Math.floor(frame/4)%2===0?0.5:1; }

  // Body
  ctx.fillStyle = "#f97316";
  ctx.beginPath(); ctx.ellipse(cx+fox.w/2, cy+fox.h*0.6, fox.w*0.45, fox.h*0.4, 0, 0, Math.PI*2); ctx.fill();
  // Head
  ctx.beginPath(); ctx.arc(cx+fox.w*0.75, cy+fox.h*0.3, 14, 0, Math.PI*2); ctx.fill();
  // Ears
  ctx.fillStyle = "#f97316";
  ctx.beginPath(); ctx.moveTo(cx+fox.w*0.68,cy+fox.h*0.15); ctx.lineTo(cx+fox.w*0.72,cy); ctx.lineTo(cx+fox.w*0.82,cy+fox.h*0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fca5a5";
  ctx.beginPath(); ctx.moveTo(cx+fox.w*0.7,cy+fox.h*0.15); ctx.lineTo(cx+fox.w*0.73,cy+fox.h*0.06); ctx.lineTo(cx+fox.w*0.8,cy+fox.h*0.2); ctx.closePath(); ctx.fill();
  // Snout
  ctx.fillStyle = "#fde68a";
  ctx.beginPath(); ctx.ellipse(cx+fox.w*0.92, cy+fox.h*0.35, 8, 5, 0, 0, Math.PI*2); ctx.fill();
  // Nose
  ctx.fillStyle = "#1a1a2e"; ctx.beginPath(); ctx.arc(cx+fox.w*0.98, cy+fox.h*0.3, 2.5, 0, Math.PI*2); ctx.fill();
  // Eye
  ctx.fillStyle = "#1a1a2e"; ctx.beginPath(); ctx.arc(cx+fox.w*0.82, cy+fox.h*0.22, 3, 0, Math.PI*2); ctx.fill();
  if (stunned>0) {
    ctx.font = "12px sans-serif"; ctx.textAlign="center"; ctx.fillText("😵", cx+fox.w*0.82, cy+fox.h*0.1);
  }
  // Tail
  ctx.fillStyle = "#f97316";
  ctx.beginPath(); ctx.moveTo(cx+fox.w*0.1,cy+fox.h*0.5); ctx.quadraticCurveTo(cx-20,cy+fox.h*0.2,cx,cy+fox.h*0.1); ctx.quadraticCurveTo(cx+10,cy+fox.h*0.05,cx+20,cy+fox.h*0.3); ctx.fill();
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath(); ctx.arc(cx+5, cy+fox.h*0.12, 8, 0, Math.PI*2); ctx.fill();
  // Legs
  ctx.fillStyle = "#c2410c";
  const lx = Math.sin(frame*0.25)*5;
  ctx.fillRect(cx+fox.w*0.25, cy+fox.h*0.8, 8, 14+lx);
  ctx.fillRect(cx+fox.w*0.5, cy+fox.h*0.8, 8, 14-lx);

  ctx.globalAlpha=1;
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════
   GAME 4: FEED FRENZY
   Players run and throw feed pellets toward center.
   Hens walk to whichever side has more feed. Most hens after 45s wins.
   Theme: colorful market.
═══════════════════════════════════════════════════════════ */
function FeedFrenzy({ onResult, onQuit }) {
  const cvs = useRef(null);
  const keys = useKeys();
  const state = useRef(initFeedFrenzy());
  const [ui, setUi] = useState({ p1:0, p2:0, time:45 });
  const frame = useRef(0);

  function initFeedFrenzy() {
    return {
      players: [
        { x:60, y:GROUND-PLAYER_H, vx:0, vy:0, w:PLAYER_W, h:PLAYER_H, onGround:true, facing:1, stunTimer:0, dead:false, throwCooldown:0, feed:20 },
        { x:W-60-PLAYER_W, y:GROUND-PLAYER_H, vx:0, vy:0, w:PLAYER_W, h:PLAYER_H, onGround:true, facing:-1, stunTimer:0, dead:false, throwCooldown:0, feed:20 },
      ],
      hens: Array.from({length:10}, (_,i) => ({
        x: 200+i*40, y:GROUND-30, dir:Math.random()>0.5?1:-1,
        side:"neutral", wobble:Math.random()*Math.PI*2, speed:0.6+Math.random()*0.4,
        state:"normal",
      })),
      pellets: [], // { x,y,vx,vy,owner,life }
      feedPiles: [], // { x,y,owner,amount,life }
      particles:[],
      scores:[0,0],
      timer:45*60,
      phase:"countdown", countdown:3, countdownTimer:60,
      feedRespawnTimer: 200,
      floatTexts:[],
    };
  }

  const tick = useCallback((dt) => {
    const s = state.current;
    frame.current++;

    if (s.phase==="countdown") {
      s.countdownTimer-=dt; if(s.countdownTimer<=0){s.countdown--;s.countdownTimer=60;if(s.countdown<=0)s.phase="playing";}
      renderFeedFrenzy(cvs.current, s, frame.current);
      setUi({p1:s.scores[0],p2:s.scores[1],time:Math.ceil(s.timer/60)});
      return;
    }
    if (s.phase==="done") return;

    s.timer-=dt;
    if (s.timer<=0) {
      s.phase="done";
      const w=s.scores[0]>s.scores[1]?1:s.scores[1]>s.scores[0]?2:1;
      onResult(w,{p1:s.scores[0],p2:s.scores[1]},"feedFrenzy");
      return;
    }

    const P = s.players;
    // P1
    if(P[0].stunTimer<=0){
      P[0].vx=(keys.current["KeyD"]?4:0)-(keys.current["KeyA"]?4:0);
      if(keys.current["KeyW"]&&P[0].onGround){P[0].vy=JUMP;P[0].onGround=false;}
      if(keys.current["KeyS"]&&P[0].throwCooldown<=0&&P[0].feed>0){throwFeed(s,P[0],0);P[0].throwCooldown=20;P[0].feed--;}
    }
    // P2
    if(P[1].stunTimer<=0){
      P[1].vx=(keys.current["ArrowRight"]?4:0)-(keys.current["ArrowLeft"]?4:0);
      if(keys.current["ArrowUp"]&&P[1].onGround){P[1].vy=JUMP;P[1].onGround=false;}
      if(keys.current["ArrowDown"]&&P[1].throwCooldown<=0&&P[1].feed>0){throwFeed(s,P[1],1);P[1].throwCooldown=20;P[1].feed--;}
    }
    P.forEach(p => {
      if(p.throwCooldown>0)p.throwCooldown-=dt;
      if(p.stunTimer>0){p.stunTimer-=dt;p.vx*=0.9;}
      if(p.vx!==0)p.facing=p.vx>0?1:-1;
      p.vy+=GRAVITY*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      p.x=Math.max(0,Math.min(W-p.w,p.x));
      if(p.y+p.h>=GROUND){p.y=GROUND-p.h;p.vy=0;p.onGround=true;}else p.onGround=false;
    });

    // Feed respawn
    s.feedRespawnTimer-=dt;
    if(s.feedRespawnTimer<=0){s.feedRespawnTimer=180;P.forEach(p=>{if(p.feed<20)p.feed++;});}

    // Pellets
    s.pellets=s.pellets.filter(pe=>{
      pe.vy+=0.4*dt;pe.x+=pe.vx*dt;pe.y+=pe.vy*dt;pe.life-=dt;
      if(pe.y+6>=GROUND){
        s.feedPiles.push({x:pe.x,y:GROUND-4,owner:pe.owner,amount:3,life:200});
        spawnFF(s,pe.x,GROUND,"#a3e635",5);
        return false;
      }
      return pe.life>0;
    });

    // Feed piles decay
    s.feedPiles=s.feedPiles.filter(fp=>{fp.life-=dt;return fp.life>0&&fp.amount>0;});

    // Hens attracted to nearest feed pile
    s.hens.forEach(h=>{
      h.wobble+=0.04*dt;
      // find nearest pile
      let nearest=null,nearDist=Infinity;
      s.feedPiles.forEach(fp=>{
        const d=Math.abs(fp.x-h.x);
        if(d<nearDist){nearDist=d;nearest=fp;}
      });
      if(nearest&&nearDist<200){
        h.dir=nearest.x>h.x?1:-1;
        h.x+=h.dir*h.speed*1.5*dt;
        // eat
        if(nearDist<20){nearest.amount=Math.max(0,nearest.amount-0.05*dt);}
      } else {
        // wander
        if(Math.random()<0.005)h.dir=-h.dir;
        h.x+=h.dir*h.speed*dt;
        h.x=Math.max(20,Math.min(W-20,h.x));
      }
      // assign side
      h.side = h.x < W/2 ? 0 : 1;
    });

    // Score = hens on your side
    s.scores[0]=s.hens.filter(h=>h.side===0).length;
    s.scores[1]=s.hens.filter(h=>h.side===1).length;

    // Floats
    s.floatTexts=s.floatTexts.filter(ft=>{ft.life-=dt;ft.y-=0.4*dt;return ft.life>0;});
    s.particles=s.particles.filter(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;return p.life>0;});

    setUi({p1:s.scores[0],p2:s.scores[1],time:Math.ceil(s.timer/60)});
    renderFeedFrenzy(cvs.current, s, frame.current);
  }, [keys, onResult]);

  function throwFeed(s,p,pi){
    s.pellets.push({x:p.x+p.w/2,y:p.y+p.h*0.4,vx:p.facing*7+(Math.random()-0.5)*2,vy:-5+Math.random()*2,owner:pi,life:60});
  }
  function spawnFF(s,x,y,color,count){
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2;const spd=1+Math.random()*2;s.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-1,color,life:20+Math.random()*15,r:3});}
  }

  useGameLoop(tick);

  return (
    <div style={{ position:"relative" }}>
      <GameHUD scores={ui} game={GAMES[3]} onQuit={onQuit} showTimer extraInfo={(s) => `🌾 P1:${s?.p1feed??20} P2:${s?.p2feed??20}`} />
      <canvas ref={cvs} width={W} height={H} style={{ display:"block", borderRadius:12, boxShadow:"0 20px 60px rgba(0,0,0,0.5)", maxWidth:"100vw" }} />
    </div>
  );
}

function renderFeedFrenzy(canvas, s, frame) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  drawScene(ctx, "#f0fdf4", "#dcfce7", "market");

  // Center divider line
  ctx.strokeStyle = "#86efac"; ctx.lineWidth = 2; ctx.setLineDash([8,8]);
  ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, GROUND); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = "11px 'Press Start 2P'"; ctx.textAlign="center";
  ctx.fillStyle="#16a34a"; ctx.fillText("P1 SIDE", W/4, 30);
  ctx.fillStyle="#1d4ed8"; ctx.fillText("P2 SIDE", W*3/4, 30);

  // Feed piles
  s.feedPiles.forEach(fp => {
    const alpha = Math.min(1, fp.life/100);
    ctx.globalAlpha=alpha*0.8;
    ctx.fillStyle=fp.owner===0?"#f97316":"#3b82f6";
    ctx.beginPath(); ctx.ellipse(fp.x, fp.y, 12*(fp.amount/3), 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle="#a3e635"; ctx.font="10px sans-serif"; ctx.textAlign="center";
    ctx.fillText("🌾", fp.x, fp.y-2);
    ctx.globalAlpha=1;
  });

  // Hens
  s.hens.forEach(h => drawHen(ctx, {...h,y:h.y+Math.sin(h.wobble)*3}, frame));

  // Pellets in air
  s.pellets.forEach(pe => {
    ctx.fillStyle=pe.owner===0?"#f97316":"#3b82f6";
    ctx.beginPath(); ctx.arc(pe.x,pe.y,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#a3e635"; ctx.font="10px sans-serif"; ctx.textAlign="center";
    ctx.fillText("•",pe.x,pe.y+3);
  });

  // Feed indicators
  s.players.forEach((p,pi)=>{
    const bx=pi===0?10:W-90, by=GROUND-20;
    ctx.fillStyle=pi===0?COLORS.p1:COLORS.p2;
    ctx.font="9px 'Press Start 2P'"; ctx.textAlign="left";
    ctx.fillText(`🌾×${p.feed}`,bx,by);
  });

  // Players
  s.players.forEach((p,i)=>drawPlayer(ctx,p,i,frame));

  // Timer
  const tl=s.timer/(45*60);
  ctx.fillStyle="#1e293b"; ctx.fillRect(W/2-80,10,160,12);
  ctx.fillStyle=tl>0.5?"#22c55e":tl>0.25?"#f59e0b":"#ef4444";
  ctx.fillRect(W/2-80,10,160*tl,12);
  ctx.strokeStyle="#334155"; ctx.lineWidth=2; ctx.strokeRect(W/2-80,10,160,12);
  ctx.font="8px 'Press Start 2P'"; ctx.fillStyle="#fff"; ctx.textAlign="center";
  ctx.fillText(`${Math.ceil(s.timer/60)}s`,W/2,19);

  // Float texts
  s.floatTexts.forEach(ft=>{
    ctx.globalAlpha=ft.life/90;
    ctx.font="bold 13px sans-serif"; ctx.fillStyle=ft.color; ctx.textAlign="center";
    ctx.fillText(ft.text,ft.x,ft.y); ctx.globalAlpha=1;
  });

  drawParticles(ctx, s.particles);

  if(s.phase==="countdown"&&s.countdown>0){
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(0,0,W,H);
    ctx.font="bold 80px 'Press Start 2P',monospace"; ctx.fillStyle="#22c55e"; ctx.textAlign="center";
    ctx.fillText(s.countdown,W/2,H/2+28);
  }
}

/* ═══════════════════════════════════════════════════════════
   SHARED RENDER HELPERS
═══════════════════════════════════════════════════════════ */
function drawParticles(ctx, particles) {
  particles.forEach(p => {
    ctx.globalAlpha = p.life / (p.maxLife||50);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, (p.r||4)*(p.life/(p.maxLife||50)), 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawProgressBar(ctx, x, y, w, val, max, color) {
  ctx.fillStyle = "#1e293b"; ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = color; ctx.fillRect(x, y, w*(val/max), 8);
  ctx.strokeStyle = "#334155"; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, 8);
}

/* ═══════════════════════════════════════════════════════════
   GAME HUD OVERLAY (React)
═══════════════════════════════════════════════════════════ */
function GameHUD({ scores, game, onQuit, target, showTimer }) {
  return (
    <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:10, padding:"6px 10px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      background:"linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
      pointerEvents:"none" }}>
      {/* P1 */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ background:`${COLORS.p1}33`, border:`2px solid ${COLORS.p1}`, borderRadius:8,
          padding:"4px 12px", textAlign:"center", minWidth:70 }}>
          <div style={{ fontSize:7, color:COLORS.p1, letterSpacing:1 }}>P1</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#fff", lineHeight:1 }}>{scores.p1}</div>
          {target && <div style={{ fontSize:6, color:"#64748b" }}>/ {target}</div>}
        </div>
      </div>

      {/* Center */}
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:8, color:"#94a3b8" }}>{game.emoji} {game.name.toUpperCase()}</div>
        {showTimer && scores.time !== undefined && (
          <div style={{ fontSize:10, color: scores.time > 15 ? "#22c55e" : "#ef4444",
            animation: scores.time <= 10 ? "pulse 0.5s infinite" : "none" }}>
            ⏱ {scores.time}s
          </div>
        )}
        <button onClick={onQuit}
          style={{ fontSize:7, color:"#94a3b8", background:"rgba(255,255,255,0.08)",
            border:"1px solid #334155", borderRadius:4, padding:"2px 8px", cursor:"pointer", pointerEvents:"all", marginTop:2 }}>
          QUIT
        </button>
      </div>

      {/* P2 */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ background:`${COLORS.p2}33`, border:`2px solid ${COLORS.p2}`, borderRadius:8,
          padding:"4px 12px", textAlign:"center", minWidth:70 }}>
          <div style={{ fontSize:7, color:COLORS.p2, letterSpacing:1 }}>P2</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#fff", lineHeight:1 }}>{scores.p2}</div>
          {target && <div style={{ fontSize:6, color:"#64748b" }}>/ {target}</div>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PIXEL BUTTON
═══════════════════════════════════════════════════════════ */
function PixelBtn({ children, onClick, color="#22c55e" }) {
  return (
    <button className="btn-pixel" onClick={onClick}
      style={{ background:color, borderRadius:8, padding:"8px 18px",
        fontSize:9, color:"#fff", fontFamily:"'Press Start 2P',monospace",
        letterSpacing:0.5 }}>
      {children}
    </button>
  );
}