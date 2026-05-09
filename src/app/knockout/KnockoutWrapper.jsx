'use client';
import dynamic from "next/dynamic";

const KnockoutGame = dynamic(() => import("./KnockoutGame"), {
  ssr: false,
  loading: () => (
    <div style={{ backgroundColor: "#020617", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#facc15", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "3rem", fontWeight: "900", letterSpacing: "5px", margin: 0 }}>INITIALIZING ARENA</h1>
      <p style={{ color: "#64748b", marginTop: "10px", fontWeight: "bold" }}>Loading physics engine...</p>
    </div>
  ),
});

export default function KnockoutWrapper() {
  return <KnockoutGame />;
}