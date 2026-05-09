'use client';
import dynamic from "next/dynamic";

const FleetGame = dynamic(() => import("./FleetGame"), {
  ssr: false,
  loading: () => (
    <div style={{ backgroundColor: "#020617", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#38bdf8", fontFamily: "monospace" }}>
      <h1 style={{ fontSize: "3rem", textShadow: "0 0 20px #38bdf8", letterSpacing: "4px" }}>UPLINKING TO SATELLITE...</h1>
      <p style={{ color: "#64748b", marginTop: "10px" }}>Securing Tactical Grid</p>
    </div>
  ),
});

export default function FleetWrapper() {
  return <FleetGame />;
}