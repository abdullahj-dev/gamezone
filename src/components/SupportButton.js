"use client";
import React, { useState } from "react";

export default function SupportButton({ account }) {
  const [status, setStatus] = useState("SUPPORT");

  const handlePayment = () => {
    // JazzCash doesn't have a direct "Send Money" URL scheme for personal accounts,
    // so we trigger a copy-to-clipboard and open a helper modal or the app.
    navigator.clipboard.writeText(account);
    setStatus("NUMBER COPIED!");
    
    // Attempt to open JazzCash app (works on some mobile browsers)
    window.location.href = "jazzcash://"; 

    setTimeout(() => setStatus("SUPPORT"), 3000);
  };

  return (
    <button
      onClick={handlePayment}
      className="group relative px-8 py-3 bg-transparent border border-cyan-500/30 rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
    >
      <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="relative z-10 font-mono text-xs tracking-[0.3em] text-cyan-400 group-hover:text-cyan-200">
        {status}
      </span>
      {/* Glitch Effect Line */}
      <div className="absolute top-0 left-0 w-full h-px bg-cyan-400 opacity-0 group-hover:animate-scan-line" />
    </button>
  );
}
