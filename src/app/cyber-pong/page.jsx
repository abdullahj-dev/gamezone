'use client';
import dynamic from "next/dynamic";

const CyberBreaker = dynamic(() => import("./CyberBreaker"), {
  ssr: false,
  loading: () => (
    <div style={{ background: "#06060a", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#06b6d4", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ fontStyle: "italic", fontSize: "3rem", fontWeight: 900, letterSpacing: "-2px" }}>
        <span style={{ color: "#fff" }}>CYBER</span>BREAKER
      </div>
      <div style={{ color: "#52525b", letterSpacing: "4px", fontSize: "0.9rem", marginTop: 10, fontWeight: "bold" }}>INITIALIZING PHYSICS ENGINE...</div>
    </div>
  )
});

export default function CyberPage() {
  return <CyberBreaker />;
}