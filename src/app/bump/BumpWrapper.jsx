'use client';
import dynamic from "next/dynamic";

const BumpGame = dynamic(() => import("./BumpGame"), {
  ssr: false,
  loading: () => (
    <div style={{ backgroundColor: "#09090b", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", fontFamily: "system-ui", fontSize: "2rem", fontWeight: "900" }}>
      BOOTING OVERDRIVE ENGINE...
    </div>
  ),
});

export default function BumpWrapper() {
  return <BumpGame />;
}