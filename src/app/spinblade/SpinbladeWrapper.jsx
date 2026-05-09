'use client';
import dynamic from "next/dynamic";

const SpinbladeGame = dynamic(() => import("./SpinbladeGame"), {
  ssr: false,
  loading: () => (
    <div style={{ backgroundColor: "#020205", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#f97316", fontFamily: "monospace" }}>
      <h1 style={{ fontSize: "3rem", textShadow: "0 0 20px #f97316" }}>CALIBRATING GYROSCOPES...</h1>
      <p style={{ color: "#888", marginTop: "10px" }}>Securing Physics Engine</p>
    </div>
  ),
});

export default function SpinbladeWrapper() {
  return <SpinbladeGame />;
}