'use client';
import dynamic from "next/dynamic";

const CastleSiegeGame = dynamic(() => import("./CastleSiegeGame"), {
  ssr: false,
  loading: () => (
    <div style={{
      background: "#0a0806",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      gap: 18,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Stone texture overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,200,80,0.015) 2px,rgba(255,200,80,0.015) 4px), repeating-linear-gradient(90deg,transparent,transparent 3px,rgba(255,200,80,0.01) 3px,rgba(255,200,80,0.01) 6px)",
        pointerEvents: "none",
      }}/>
      <div style={{ fontSize: "0.75rem", letterSpacing: "8px", color: "#5a4a2a", fontWeight: 700, textTransform: "uppercase" }}>
        Iron &amp; Flame
      </div>
      <div style={{ fontSize: "3.8rem", fontWeight: 900, fontStyle: "italic", letterSpacing: "-2px", lineHeight: 1 }}>
        <span style={{ color: "#f59e0b", textShadow: "0 0 40px rgba(245,158,11,0.6), 0 2px 0 rgba(0,0,0,0.8)" }}>CASTLE</span>
        <span style={{ color: "#e5e0d8", textShadow: "0 2px 0 rgba(0,0,0,0.8)" }}> SIEGE</span>
      </div>
      <div style={{ width: 220, height: 2, background: "linear-gradient(90deg,transparent,#f59e0b88,transparent)", marginTop: 6 }}/>
      <div style={{ fontSize: "0.78rem", letterSpacing: "4px", color: "#3d3020", fontWeight: 700, marginTop: 4 }}>
        FORGING THE BATTLEFIELD...
      </div>
      <div style={{ width: 200, height: 3, background: "#1a1408", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
        <div style={{
          height: "100%", background: "linear-gradient(90deg, #b45309, #f59e0b)",
          borderRadius: 99, animation: "siegeLoad 1.4s ease-in-out infinite alternate",
        }}/>
      </div>
      <style>{`@keyframes siegeLoad { from{width:15%} to{width:92%} }`}</style>
    </div>
  ),
});

export default function CastleSiegeWrapper() {
  return <CastleSiegeGame />;
}