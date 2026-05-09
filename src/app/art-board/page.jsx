'use client';
import dynamic from "next/dynamic";

// Dynamically import the Canvas component to prevent Next.js Server-Side Rendering errors
const ArtBoard = dynamic(() => import("./ArtBoard"), {
  ssr: false,
  loading: () => (
    <div style={{
      backgroundColor: "#06060a", height: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", color: "#ff4d00",
      fontFamily: "'Trebuchet MS', system-ui, sans-serif", gap: 16
    }}>
      <div style={{ fontSize: "3.5rem", fontWeight: 900, fontStyle: "italic", letterSpacing: "-2px" }}>
        ART<span style={{ color: "#f8fafc" }}> BOARD</span>
      </div>
      <div style={{ fontSize: "0.9rem", letterSpacing: "6px", color: "#52525b", fontWeight: 700 }}>
        INITIALIZING RENDERING ENGINE...
      </div>
    </div>
  )
});

export default function DrawPage() {
  return <ArtBoard />;
}