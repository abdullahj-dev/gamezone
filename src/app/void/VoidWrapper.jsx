'use client';

import dynamic from "next/dynamic";

// Dynamically import the game component and strictly disable SSR
const VoidGame = dynamic(() => import("./VoidGame.jsx"), {
  ssr: false,
  loading: () => (
    <div style={{ backgroundColor: "#000", height: "100vh", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      Initializing Void...
    </div>
  ),
});

export default function VoidWrapper() {
  return <VoidGame />;
}