'use client';
import dynamic from "next/dynamic";

const BombBlitzGame = dynamic(() => import("./BombBlitzGame"), {
  ssr: false,
  loading: () => (
    <div style={{
      backgroundColor: "#06060a",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "#ff4d00",
      fontFamily: "'Trebuchet MS', system-ui, sans-serif",
      gap: 16,
    }}>
      <div style={{ fontSize: "3.5rem", fontWeight: 900, fontStyle: "italic", letterSpacing: "-2px" }}>
        <span style={{ color: "#ff4d00" }}>BOMB</span>
        <span style={{ color: "#f8fafc" }}> BLITZ</span>
      </div>
      <div style={{ fontSize: "0.9rem", letterSpacing: "6px", color: "#52525b", fontWeight: 700 }}>
        IGNITING OVERDRIVE ENGINE...
      </div>
      <div style={{ width: 200, height: 3, background: "#18181b", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
        <div style={{
          height: "100%", width: "60%", background: "#ff4d00", borderRadius: 99,
          animation: "load 1.2s ease-in-out infinite alternate",
        }}/>
      </div>
      <style>{`@keyframes load { from { width: 20%; } to { width: 90%; } }`}</style>
    </div>
  ),
});

export default function BombBlitzWrapper() {
  return <BombBlitzGame />;
}