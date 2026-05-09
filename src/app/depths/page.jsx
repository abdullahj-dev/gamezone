'use client';

import React, { useState, useRef, useEffect, useCallback } from "react";
import { W, H, MAX_ACTIVE_SKILLS } from "@/utils/constants.js";
import { hasSave as checkHasSave } from "@/utils/storage.js";
import { getSkillDef } from "@/data/skills.js";

import { useInputs }    from "@/hooks/useInputs.js";
import { useMeta }      from "@/hooks/useMeta.js";
import { useGameState } from "@/hooks/useGameState.js";
import { useGameLoop }  from "@/hooks/useGameLoop.js";

import { depthsHooks, shadowHooks } from "@/core/gameHooks.js";
import { canRevive, getReviveUI, executeRevive } from "@/core/reviveSystem.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEON DESIGN TOKENS & STYLES
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:         "#05050b",
  surface:    "rgba(12, 12, 28, 0.6)",
  border:     "#1e1e40",
  text:       "#e6e6fa",
  textDim:    "#6a6a9c",
  neonCyan:   "#00f3ff",
  neonPink:   "#ff007f",
  neonPurple: "#9d4edd",
  gold:       "#ffea00",
  danger:     "#ff2a2a",
  success:    "#00ff88",
};

const HOOKS = { normal: depthsHooks, nightmare: shadowHooks };

const GAME_MODES = [
  { id: "normal", label: "NORMAL MODE", col: T.neonCyan, desc: "Balanced run. Classic mechanics with fair progression." },
  { id: "nightmare", label: "NIGHTMARE", col: T.neonPink, desc: "Brutal difficulty. Lethal enemies and unforgiving encounters." },
];

const BANNERS = {
  shrine:   { text: "✦ SHRINE ROOM ✦",   col: T.gold },
  horde:    { text: "☠ HORDE INBOUND ☠", col: T.danger },
  elite:    { text: "⚠ ELITE DETECTED ⚠", col: T.neonPink },
  cursed:   { text: "💀 CURSED ZONE 💀",  col: T.neonPurple },
  gauntlet: { text: "⚔ THE GAUNTLET ⚔",   col: T.danger },
};

const SHOP_UPGRADES = [
  { id: "startAtk",  label: "Plasma Edge",       desc: "+8 starting attack",     cost: 40,  max: 8,  col: T.neonPink },
  { id: "startHp",   label: "Kinetic Shield",    desc: "+60 starting HP",        cost: 50,  max: 8,  col: T.success },
  { id: "startDef",  label: "Aegis Plating",     desc: "+3 starting defense",    cost: 45,  max: 6,  col: T.neonCyan },
  { id: "xpBoost",   label: "Neural Link",       desc: "+20% XP gain",           cost: 60,  max: 5,  col: T.gold },
  { id: "shardMul",  label: "Loot Extractor",    desc: "+25% shard drops",       cost: 80,  max: 4,  col: T.neonPurple },
  { id: "atkSpd",    label: "Overclock",         desc: "+10% attack speed",      cost: 70,  max: 5,  col: "#ffdd00" },
  { id: "reviveSlot",label: "Quantum Backup",    desc: "Extra revive per run",   cost: 120, max: 3,  col: T.neonPink },
];

const UI_DEFAULTS = {
  hp: 100, maxHp: 100, xp: 0, xpNeeded: 55, level: 1, room: 1,
  enemies: 0, kills: 0, equippedSkills: [], passives: [], skillCds: {},
  shieldCharges: 0, revives: 0, timeWarp: false, novaCharging: false,
  shards: 0, streakActive: false, streakMult: 1, mode: "normal", roomEvent: null,
};

const GlobalStyles = () => (
  <style>{`
    @keyframes neonPulse {
      0% { box-shadow: 0 0 5px currentColor, inset 0 0 2px currentColor; }
      50% { box-shadow: 0 0 15px currentColor, inset 0 0 8px currentColor; }
      100% { box-shadow: 0 0 5px currentColor, inset 0 0 2px currentColor; }
    }
    @keyframes lightningFlash {
      0%, 95%, 98% { opacity: 0; background: transparent; }
      96%, 99% { opacity: 0.8; background: #fff; }
      100% { opacity: 0; }
    }
    @keyframes particleFloat {
      0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
      20% { opacity: 0.8; }
      80% { opacity: 0.5; }
      100% { transform: translateY(-10vh) scale(1.5); opacity: 0; }
    }
    .neon-text { text-shadow: 0 0 5px currentColor, 0 0 10px currentColor; }
    .glass-panel { backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
  `}</style>
);

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function BackgroundEffects() {
  const particles = Array.from({ length: 20 });
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, animation: "lightningFlash 10s infinite", mixBlendMode: "overlay" }} />
      {particles.map((_, i) => {
        const left = `${Math.random() * 100}vw`;
        const size = `${Math.random() * 4 + 2}px`;
        const delay = `${Math.random() * 5}s`;
        const duration = `${Math.random() * 10 + 5}s`;
        const color = i % 2 === 0 ? T.neonCyan : T.neonPink;
        return (
          <div key={i} style={{
            position: "absolute", left, width: size, height: size, background: color,
            borderRadius: "50%", boxShadow: `0 0 10px ${color}`,
            animation: `particleFloat ${duration} linear ${delay} infinite`, opacity: 0
          }} />
        );
      })}
    </div>
  );
}

function Pill({ color, children, style }) {
  return (
    <span style={{
      display: "inline-block", padding: "4px 12px", borderRadius: 20,
      border: `1px solid ${color}88`, background: `linear-gradient(90deg, ${color}22, transparent)`,
      boxShadow: `0 0 8px ${color}33`, color: "#fff", textShadow: `0 0 5px ${color}`,
      fontSize: 10, fontWeight: "bold", letterSpacing: "0.08em", ...style,
    }}>{children}</span>
  );
}

function Panel({ children, style, glowColor = T.border }) {
  return (
    <div className="glass-panel" style={{
      background: T.surface, border: `1px solid ${glowColor}66`,
      boxShadow: `0 4px 20px rgba(0,0,0,0.5), inset 0 0 15px ${glowColor}11`,
      borderRadius: 16, padding: "20px 24px", position: "relative", overflow: "hidden", ...style,
    }}>
      <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }} />
      {children}
    </div>
  );
}

function Btn({ children, onClick, color = T.neonCyan, disabled, style, active = false }) {
  const [hov, setHov] = useState(false);
  const isGlowing = hov || active;
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: disabled ? "transparent" : (isGlowing ? `linear-gradient(45deg, ${color}33, ${color}11)` : `linear-gradient(45deg, transparent, ${color}0a)`),
        border: `1px solid ${disabled ? T.border : isGlowing ? color : color + "55"}`,
        boxShadow: disabled ? "none" : (isGlowing ? `0 0 15px ${color}66, inset 0 0 10px ${color}33` : `0 0 5px ${color}22`),
        borderRadius: 24, color: disabled ? T.textDim : "#fff",
        textShadow: disabled ? "none" : (isGlowing ? `0 0 8px ${color}` : "none"),
        padding: "10px 24px", cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "monospace", fontSize: 12, fontWeight: "bold", letterSpacing: "0.1em",
        transition: "all 0.2s ease-out", transform: isGlowing && !disabled ? "scale(1.02)" : "scale(1)", ...style,
      }}
    >{children}</button>
  );
}

// ── HUD ──────────────────────────────────────────────────────────────────────
function HUD({ ui }) {
  const modeCol = { normal: T.neonCyan, nightmare: T.neonPink }[ui.mode] || T.neonCyan;
  const hpPct   = ui.maxHp > 0 ? ui.hp / ui.maxHp : 0;
  const xpPct   = ui.xpNeeded > 0 ? ui.xp / ui.xpNeeded : 0;
  const hpCol   = hpPct > 0.6 ? T.success : hpPct > 0.3 ? T.gold : T.danger;

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none", fontFamily: "monospace", zIndex: 10 }}>
      <div className="glass-panel" style={{
        display: "flex", alignItems: "center", gap: 12, background: "rgba(5,5,11,0.8)",
        borderBottom: `1px solid ${modeCol}55`, boxShadow: `0 4px 20px rgba(0,0,0,0.8), 0 0 10px ${modeCol}33`,
        padding: "8px 16px", fontSize: 11,
      }}>
        <span style={{ color: T.textDim, fontWeight: "bold" }}>HP</span>
        <div style={{ width: 140, height: 8, background: "#0a0a1a", borderRadius: 4, overflow: "hidden", border: `1px solid ${T.border}` }}>
          <div style={{ width: `${hpPct * 100}%`, height: "100%", background: hpCol, boxShadow: `0 0 10px ${hpCol}`, transition: "width 0.2s ease-out" }} />
        </div>
        <span style={{ color: hpCol, fontWeight: "bold", minWidth: 60, textShadow: `0 0 5px ${hpCol}` }}>{Math.ceil(ui.hp)}/{ui.maxHp}</span>
        <span style={{ color: T.border, margin: "0 4px" }}>|</span>

        <span style={{ color: T.textDim, fontWeight: "bold" }}>XP</span>
        <div style={{ width: 100, height: 6, background: "#0a0a1a", borderRadius: 3, overflow: "hidden", border: `1px solid ${T.border}` }}>
          <div style={{ width: `${xpPct * 100}%`, height: "100%", background: T.gold, boxShadow: `0 0 10px ${T.gold}` }} />
        </div>
        <span style={{ color: T.gold, fontWeight: "bold", textShadow: `0 0 5px ${T.gold}`, minWidth: 35 }}>Lv.{ui.level}</span>
        <span style={{ color: T.border, margin: "0 4px" }}>|</span>

        <span style={{ color: T.textDim }}>ZONE</span>
        <span style={{ color: modeCol, fontWeight: "bold", textShadow: `0 0 8px ${modeCol}`, fontSize: 13 }}>{ui.room}</span>
        <span style={{ color: T.border, margin: "0 4px" }}>|</span>

        <span style={{ color: T.textDim }}>KILLS</span>
        <span style={{ color: "#fff", fontWeight: "bold" }}>{ui.kills}</span>
        <span style={{ color: T.border, margin: "0 4px" }}>|</span>

        <span style={{ color: T.neonCyan, textShadow: `0 0 5px ${T.neonCyan}` }}>💎 {ui.shards}</span>

        {ui.shieldCharges > 0 && <><span style={{ color: T.border, margin: "0 4px" }}>|</span><Pill color={T.neonCyan}>⬡ {ui.shieldCharges}</Pill></>}
        {ui.streakActive && <><span style={{ color: T.border, margin: "0 4px" }}>|</span><Pill color={T.neonPink}>🔥 ×{ui.streakMult.toFixed(1)}</Pill></>}
      </div>

      {ui.equippedSkills.length > 0 && (
        <div style={{ position: "absolute", bottom: -50, right: 16, display: "flex", gap: 10, pointerEvents: "none" }}>
          {ui.equippedSkills.map((id, i) => {
            const def = getSkillDef(id);
            const cd  = ui.skillCds[id] || 0;
            const rdy = cd === 0;
            return (
              <div key={id} className="glass-panel" style={{
                position: "relative", width: 48, height: 48, border: `2px solid ${rdy ? modeCol : T.border}`,
                background: rdy ? `${modeCol}22` : "rgba(5,5,11,0.9)", boxShadow: rdy ? `0 0 15px ${modeCol}44, inset 0 0 10px ${modeCol}22` : "none",
                borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transition: "all 0.2s"
              }}>
                <span style={{ position: "absolute", top: -8, left: -6, background: T.bg, border: `1px solid ${T.border}`, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: T.textDim }}>{i + 1}</span>
                <span style={{ fontSize: 10, color: rdy ? "#fff" : T.textDim, fontWeight: "bold", textAlign: "center", textShadow: rdy ? `0 0 5px ${modeCol}` : "none" }}>
                  {def?.label?.slice(0, 5) || id.slice(0, 5)}
                </span>
                {!rdy && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 11, color: T.danger, fontWeight: "bold", textShadow: `0 0 5px ${T.danger}` }}>{Math.ceil(cd / 60)}s</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoomBanner({ banner }) {
  if (!banner) return null;
  return (
    <div className="glass-panel" style={{
      position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
      background: "rgba(5,5,11,0.8)", border: `1px solid ${banner.col}`,
      boxShadow: `0 0 30px ${banner.col}66, inset 0 0 15px ${banner.col}33`,
      borderRadius: 8, padding: "12px 36px", color: "#fff", fontFamily: "monospace",
      fontSize: 16, fontWeight: 900, letterSpacing: "0.2em", textShadow: `0 0 10px ${banner.col}`,
      pointerEvents: "none", zIndex: 20, whiteSpace: "nowrap", animation: "neonPulse 2s infinite"
    }}>{banner.text}</div>
  );
}

// ── Screens ──────────────────────────────────────────────────────────────────
function MenuScreen({ meta, hasSave, selectedMode, setSelectedMode, onNew, onLoad, onShop }) {
  const modeCol = { normal: T.neonCyan, nightmare: T.neonPink }[selectedMode] || T.neonCyan;
  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "monospace", color: T.text, position: "relative" }}>
      <BackgroundEffects />
      <Panel glowColor={modeCol} style={{ width: 600, zIndex: 10, padding: "40px" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div className="neon-text" style={{ fontSize: 48, fontWeight: 900, letterSpacing: "0.2em", color: modeCol, lineHeight: 1, animation: "neonPulse 3s infinite" }}>Depths</div>
          <div style={{ fontSize: 12, color: T.textDim, letterSpacing: "0.5em", marginTop: 12 }}>SYSTEM INITIALIZED</div>
        </div>

        {meta && (
          <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: 12, marginBottom: 30, background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: 12, border: `1px solid ${T.border}` }}>
            <span style={{ color: T.textDim }}>BEST RUN: <span style={{ color: "#fff", textShadow: "0 0 5px #fff" }}>ZONE {meta.bestRoom || 0}</span></span>
            <span style={{ color: T.textDim }}>KILLS: <span style={{ color: "#fff" }}>{meta.totalKills || 0}</span></span>
            <span style={{ color: T.neonCyan, textShadow: `0 0 5px ${T.neonCyan}` }}>💎 {meta.shards || 0}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 30 }}>
          {GAME_MODES.map(m => (
            <div key={m.id} onClick={() => setSelectedMode(m.id)} style={{
              padding: "16px", border: `1px solid ${selectedMode === m.id ? m.col : T.border}`, borderRadius: 16,
              background: selectedMode === m.id ? `linear-gradient(180deg, ${m.col}11, transparent)` : "rgba(0,0,0,0.4)",
              boxShadow: selectedMode === m.id ? `0 0 15px ${m.col}44, inset 0 0 10px ${m.col}22` : "none",
              cursor: "pointer", transition: "all 0.2s ease", textAlign: "center"
            }}>
              <div className="neon-text" style={{ fontWeight: 900, color: selectedMode === m.id ? m.col : T.textDim, fontSize: 16, letterSpacing: "0.1em" }}>{m.label}</div>
              <div style={{ color: T.textDim, fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>{m.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16, flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 16 }}>
            <Btn onClick={onNew} color={modeCol} glowing style={{ flex: 1, padding: "16px 0", fontSize: 16 }}>INITIALIZE RUN</Btn>
            {hasSave && <Btn onClick={onLoad} color={T.gold} glowing style={{ flex: 1, padding: "16px 0", fontSize: 16 }}>RESUME SESSION</Btn>}
          </div>
          <Btn onClick={onShop} color={T.neonPurple} style={{ width: "100%", padding: "12px 0" }}>UPGRADE MATRIX (SHOP)</Btn>
        </div>
      </Panel>
    </div>
  );
}

function SkillCard({ skillId, isEquipped, onClick, selected }) {
  const def = getSkillDef(skillId);
  const [hov, setHov] = useState(false);
  if (!def) return null;

  const col = def.type === "active" ? T.neonCyan : T.success;
  const active = hov || selected;

  return (
    <div onClick={() => onClick(skillId)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      padding: "16px", border: `1px solid ${active ? col : T.border}`, borderRadius: 16,
      background: active ? `linear-gradient(180deg, ${col}22, transparent)` : "rgba(0,0,0,0.5)",
      boxShadow: active ? `0 0 15px ${col}44, inset 0 0 10px ${col}22` : "none",
      cursor: "pointer", transition: "all 0.2s ease", position: "relative", transform: active ? "translateY(-2px)" : "none"
    }}>
      {isEquipped && <div style={{ position: "absolute", top: 10, right: 12, fontSize: 9, color: T.textDim, letterSpacing: "0.1em" }}>EQUIPPED</div>}
      <div style={{ fontWeight: 900, color: active ? "#fff" : T.text, textShadow: active ? `0 0 8px ${col}` : "none", fontSize: 14, marginBottom: 8, letterSpacing: "0.05em" }}>{def.label || skillId}</div>
      <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.6, minHeight: 30 }}>{def.description || ""}</div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Pill color={col}>{def.type.toUpperCase()}</Pill>
        {def.cdFrames && <Pill color={T.textDim}>{Math.round(def.cdFrames / 60)}S CD</Pill>}
      </div>
    </div>
  );
}

function LevelUp({ choices, equippedSkills, onChoose }) {
  return (
    <div className="glass-panel" style={{
      position: "absolute", inset: 0, background: "rgba(5,5,11,0.85)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 24, fontFamily: "monospace", zIndex: 30,
    }}>
      <div style={{ fontSize: 14, color: T.textDim, letterSpacing: "0.4em" }}>SYSTEM UPGRADE AVAILABLE</div>
      <div className="neon-text" style={{ fontSize: 32, fontWeight: 900, color: T.gold, letterSpacing: "0.15em", animation: "neonPulse 2s infinite" }}>SELECT ENHANCEMENT</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 640, width: "90%" }}>
        {choices.map(id => <SkillCard key={id} skillId={id} isEquipped={equippedSkills.includes(id)} onClick={onChoose} />)}
      </div>
    </div>
  );
}

function SwapSkillOverlay({ swapSkill, equippedSkills, onSwap }) {
  const newDef = getSkillDef(swapSkill);
  return (
    <div className="glass-panel" style={{
      position: "absolute", inset: 0, background: "rgba(5,5,11,0.9)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 20, fontFamily: "monospace", zIndex: 30,
    }}>
      <div style={{ fontSize: 12, color: T.danger, letterSpacing: "0.4em", textShadow: `0 0 5px ${T.danger}` }}>MEMORY BANKS FULL</div>
      <div style={{ fontSize: 18, fontWeight: "bold", color: "#fff", letterSpacing: "0.1em" }}>OVERWRITE SKILL WITH: <span className="neon-text" style={{ color: T.neonCyan }}>{newDef?.label || swapSkill}</span></div>
      <div style={{ display: "flex", gap: 16 }}>
        {equippedSkills.map(id => <SkillCard key={id} skillId={id} isEquipped onClick={(dropId) => onSwap(dropId, swapSkill)} />)}
      </div>
      <div style={{ fontSize: 11, color: T.textDim, letterSpacing: "0.1em" }}>Select a module to delete.</div>
    </div>
  );
}

function ReviveScreen({ reviveUI, onConfirm, onDie }) {
  const [selected, setSelected] = useState([]);
  if (!reviveUI) return null;

  const isDepths  = reviveUI.type === "shard_skills";
  const isVoid    = reviveUI.type === "boss_tribute";
  const isShadow  = reviveUI.type === "fade";
  const pickCount = reviveUI.pickCount || 0;
  const canConfirm = !isDepths || selected.length === pickCount;

  function toggleSkill(id) {
    if (selected.includes(id)) { setSelected(s => s.filter(x => x !== id)); return; }
    if (selected.length < pickCount) setSelected(s => [...s, id]);
  }

  return (
    <div className="glass-panel" style={{
      position: "absolute", inset: 0, background: "rgba(5,5,11,0.95)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 20, fontFamily: "monospace", zIndex: 40,
    }}>
      <div className="neon-text" style={{ fontSize: 40, fontWeight: 900, color: T.danger, letterSpacing: "0.3em" }}>CRITICAL FAILURE</div>

      {isDepths && (
        <Panel glowColor={T.neonCyan} style={{ maxWidth: 600, width: "90%", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: "bold", color: T.neonCyan, marginBottom: 12, textShadow: `0 0 8px ${T.neonCyan}` }}>SYSTEM RESTORE</div>
          <div style={{ fontSize: 12, color: T.textDim, marginBottom: 20 }}>
            Reboot costs <span style={{ color: T.gold }}>💎 {reviveUI.cost}</span> shards. You have <span style={{ color: reviveUI.canAfford ? T.gold : T.danger }}>💎 {reviveUI.shards}</span>.<br/>Restores <span style={{ color: T.success }}>{reviveUI.hpRestore} HP</span>.
          </div>
          {reviveUI.canAfford ? (
            <>
              <div style={{ fontSize: 12, color: "#fff", marginBottom: 12 }}>Select {pickCount} backup modules: <span style={{ color: T.neonCyan }}> ({selected.length}/{pickCount})</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "0 auto" }}>
                {(reviveUI.skillChoices || []).map(id => <SkillCard key={id} skillId={id} selected={selected.includes(id)} onClick={toggleSkill} />)}
              </div>
            </>
          ) : <div style={{ color: T.danger, fontSize: 14, fontWeight: "bold", textShadow: `0 0 5px ${T.danger}` }}>INSUFFICIENT FUNDS</div>}
        </Panel>
      )}

      {isVoid && (
        <Panel glowColor={T.neonPurple} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: "bold", color: T.neonPurple, textShadow: `0 0 8px ${T.neonPurple}` }}>BOSS TRIBUTE</div>
          <div style={{ fontSize: 12, color: T.textDim, marginTop: 10 }}><span style={{ color: T.success }}>Full HP restore.</span> Tributes remaining: <span style={{ color: T.neonPurple, fontWeight: "bold" }}>{reviveUI.tributes}</span></div>
        </Panel>
      )}

      {isShadow && (
        <Panel glowColor={T.neonPink} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: "bold", color: T.neonPink, textShadow: `0 0 8px ${T.neonPink}` }}>VOID FADE</div>
          <div style={{ fontSize: 12, color: T.textDim, marginTop: 10 }}>Restore <span style={{ color: T.success }}>{reviveUI.hpRestore} HP</span>.{reviveUI.loseSkill && <> Module corrupted: <span style={{ color: T.danger }}>{reviveUI.loseSkill}</span>.</>}</div>
        </Panel>
      )}

      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        {(reviveUI.canAfford !== false) && <Btn onClick={() => onConfirm({ chosenSkillIds: selected })} color={T.success} disabled={!canConfirm} glowing={canConfirm} style={{ fontSize: 14, padding: "12px 32px" }}>{isDepths ? "INITIATE REBOOT" : isVoid ? "CLAIM TRIBUTE" : "FADE IN"}</Btn>}
        <Btn onClick={onDie} color={T.danger} style={{ fontSize: 14, padding: "12px 24px" }}>ACCEPT TERMINATION</Btn>
      </div>
    </div>
  );
}

function ShopScreen({ meta, onPurchase, onBack }) {
  // Ensure we safely fallback to an empty object if meta hasn't loaded yet
  const shards = meta?.shards || 0;
  const upgrades = meta?.upgrades || {};

  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "monospace", color: T.text, position: "relative" }}>
      <BackgroundEffects />
      <div style={{ width: 600, zIndex: 10 }}>
        <Panel glowColor={T.neonPurple} style={{ padding: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
            <div>
              <div className="neon-text" style={{ fontSize: 24, fontWeight: 900, color: T.neonPurple, letterSpacing: "0.15em" }}>UPGRADE MATRIX</div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 6, letterSpacing: "0.05em" }}>Permanent structural enhancements.</div>
            </div>
            <div className="neon-text" style={{ fontSize: 18, color: T.neonCyan, background: "rgba(0,243,255,0.1)", padding: "10px 20px", borderRadius: 20, border: `1px solid ${T.neonCyan}44` }}>💎 {shards}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SHOP_UPGRADES.map(upg => {
              const lv      = upgrades[upg.id] || 0;
              const maxed   = lv >= upg.max;
              const canBuy  = !maxed && shards >= upg.cost;
              return (
                <div key={upg.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px", background: "rgba(0,0,0,0.4)", borderRadius: 16, border: `1px solid ${maxed ? T.border : upg.col}44`, boxShadow: maxed ? "none" : `inset 0 0 10px ${upg.col}11` }}>
                  <div style={{ width: 4, alignSelf: "stretch", background: upg.col, borderRadius: 4, boxShadow: `0 0 8px ${upg.col}` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontWeight: 900, color: maxed ? T.textDim : "#fff", textShadow: maxed ? "none" : `0 0 5px ${upg.col}`, fontSize: 13, letterSpacing: "0.05em" }}>{upg.label}</span><Pill color={maxed ? T.success : T.neonCyan}>LVL {lv}/{upg.max}</Pill></div>
                    <div style={{ fontSize: 10, color: T.textDim, marginTop: 6 }}>{upg.desc}</div>
                  </div>
                  {maxed ? <span style={{ fontSize: 12, color: T.success, fontWeight: "bold", textShadow: `0 0 5px ${T.success}`, padding: "10px 20px" }}>MAXED</span> : <Btn onClick={() => onPurchase(upg.id, upg.cost)} color={canBuy ? T.neonCyan : T.textDim} disabled={!canBuy} glowing={canBuy} style={{ fontSize: 12, padding: "8px 20px", whiteSpace: "nowrap" }}>💎 {upg.cost}</Btn>}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 30, textAlign: "center" }}><Btn onClick={onBack} color={T.textDim} style={{ width: "100%" }}>RETURN TO MAIN MENU</Btn></div>
        </Panel>
      </div>
    </div>
  );
}

function DeadScreen({ deathInfo, meta, hasSave, onNew, onLoad, onMenu }) {
  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "monospace", color: T.text, position: "relative" }}>
      <BackgroundEffects />
      <div style={{ width: 480, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 24, zIndex: 10 }}>
        <div className="neon-text" style={{ fontSize: 56, fontWeight: 900, color: T.danger, letterSpacing: "0.2em", animation: "neonPulse 2s infinite" }}>TERMINATED</div>
        {deathInfo && (
          <Panel glowColor={T.danger} style={{ width: "100%", textAlign: "left", padding: "30px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[{ label: "ZONES CLEARED", val: deathInfo.room, col: T.neonCyan }, { label: "FINAL LEVEL", val: deathInfo.level, col: T.gold }, { label: "ENEMIES PURGED", val: deathInfo.kills, col: "#fff" }, { label: "SHARDS EXTRACTED", val: deathInfo.shards, col: T.neonPurple }].map(r => (
                <div key={r.label} style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: 12, border: `1px solid ${r.col}33` }}>
                  <div style={{ fontSize: 10, color: T.textDim, letterSpacing: "0.1em", marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontWeight: 900, color: r.col, fontSize: 20, textShadow: `0 0 8px ${r.col}` }}>{r.val}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}
        {meta && <div style={{ fontSize: 11, color: T.textDim, letterSpacing: "0.1em", background: "rgba(0,0,0,0.5)", padding: "10px 20px", borderRadius: 20, border: `1px solid ${T.border}` }}>VAULT BALANCE: <span style={{ color: T.neonCyan, textShadow: `0 0 5px ${T.neonCyan}` }}>💎 {meta.shards || 0}</span></div>}
        <div style={{ display: "flex", gap: 16, width: "100%" }}>
          <Btn onClick={onNew} color={T.neonCyan} glowing style={{ flex: 1, fontSize: 14, padding: "14px 0" }}>RESTART</Btn>
          <Btn onClick={onMenu} color={T.textDim} style={{ flex: 1, fontSize: 14, padding: "14px 0" }}>MAIN MENU</Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GAME COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Game() {
  const canvasRef   = useRef(null);
  const bannerTimer = useRef(null);

  const { keysRef, mouseRef }                         = useInputs(canvasRef);
  const { meta, metaRef, earnShards, recordRun,
          purchaseUpgrade }                           = useMeta();
  const { gsRef, overlayRef,
          startNew, loadAndResume, nextRoom }         = useGameState();

  const [screen,     setScreen]     = useState("menu");
  const [hasSave,    setHasSave]    = useState(false);
  const [mode,       setMode]       = useState("normal");
  const [choices,    setChoices]    = useState([]);
  const [swapSkill,  setSwapSkill]  = useState(null);
  const [deathInfo,  setDeathInfo]  = useState(null);
  const [roomBanner, setRoomBanner] = useState(null);
  const [reviveUI,   setReviveUI]   = useState(null);
  const [ui,         setUi]         = useState(UI_DEFAULTS);

  useEffect(() => {
    checkHasSave().then(setHasSave);
    return () => clearTimeout(bannerTimer.current);
  }, []);

  const showBanner = useCallback((event) => {
    const b = BANNERS[event];
    if (!b) return;
    setRoomBanner(b);
    clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setRoomBanner(null), 2600);
  }, []);

  const commitDeath = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;
    earnShards(gs.player?.shards || 0);
    recordRun(gs.room, gs.totalKills);
    setDeathInfo({ room: gs.room, level: gs.player.level, kills: gs.totalKills, shards: gs.player?.shards || 0 });
    overlayRef.current = "dead";
    setScreen("dead");
  }, [gsRef, earnShards, recordRun, overlayRef]);

  // PURE: Stripped out all 'gameId' and 'config' references completely.
  const handleDeath = useCallback(() => {
    const gs = gsRef.current;
    if (!gs) return;

    try {
      if (canRevive(gs)) {
        setReviveUI(getReviveUI(gs));
        overlayRef.current = "revive";
        setScreen("revive");
      } else {
        commitDeath();
      }
    } catch (err) {
      console.error("Death handling failed:", err);
      commitDeath(); 
    }
  }, [gsRef, overlayRef, commitDeath]);

  // PURE: Stripped out 'gameId' here as well.
  const handleReviveConfirm = useCallback((options = {}) => {
    const gs = gsRef.current;
    if (!gs) return;
    executeRevive(gs, options);
    setReviveUI(null);
    overlayRef.current = "playing";
    setScreen("playing");
  }, [gsRef, overlayRef]);

  useGameLoop({
    canvasRef, gsRef, overlayRef, keysRef, mouseRef, screen,
    hooks: HOOKS[mode] || depthsHooks,
    onNextRoom:      () => { const ev = nextRoom(); if (ev) showBanner(ev); },
    onLevelUp:       (ids) => { setChoices(ids); overlayRef.current = "levelup"; setScreen("levelup"); },
    onDeath:         handleDeath,
    onShrineReached: (ids) => { setChoices(ids); overlayRef.current = "levelup"; setScreen("levelup"); },
    setUi,
  });

  const doStartNew = useCallback(() => {
    startNew(metaRef.current.upgrades, mode);
    setRoomBanner(null);
    const ev = gsRef.current?.roomEvent;
    if (ev) showBanner(ev);
    overlayRef.current = "playing";
    setScreen("playing");
  }, [startNew, metaRef, mode, gsRef, showBanner, overlayRef]);

  const doLoad = useCallback(async () => {
    const gs = await loadAndResume(metaRef.current.upgrades);
    if (!gs) { doStartNew(); return; }
    overlayRef.current = "playing";
    setScreen("playing");
  }, [loadAndResume, metaRef, doStartNew, overlayRef]);

  const handleLevelUpChoice = useCallback((skillId) => {
    const gs = gsRef.current;
    if (!gs) return;
    const p   = gs.player;
    const def = getSkillDef(skillId);
    if (!def) return;

    // Mutating gs directly as per proper game loop pattern
    if (skillId === "vitality")  { p.maxHp += 80; p.hp = p.maxHp; }
    if (skillId === "sharpen")   p.atk += 12;
    if (skillId === "ironSkin")  p.def += 7;
    if (skillId === "swiftness") p.spd *= 1.3;

    if (!p.unlockedSkills.includes(skillId)) p.unlockedSkills.push(skillId);

    if (def.type === "active") {
      if (p.equippedSkills.length < MAX_ACTIVE_SKILLS) {
        p.equippedSkills.push(skillId);
      } else {
        setSwapSkill(skillId);
        setChoices([]);
        overlayRef.current = "swap";
        setScreen("swap");
        return;
      }
    }
    setChoices([]);
    overlayRef.current = "playing";
    setScreen("playing");
  }, [gsRef, overlayRef]);

  const handleSwap = useCallback((dropId, newId) => {
    const p = gsRef.current?.player;
    if (!p) return;
    p.equippedSkills = p.equippedSkills.filter(id => id !== dropId);
    p.equippedSkills.push(newId);
    setSwapSkill(null);
    overlayRef.current = "playing";
    setScreen("playing");
  }, [gsRef, overlayRef]);

  const isGameScreen = ["playing", "levelup", "swap", "revive"].includes(screen);

  return (
    <>
      <GlobalStyles />
      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', Courier, monospace", color: T.text, userSelect: "none", overflow: "hidden" }}>
        {screen === "menu" && <MenuScreen meta={meta} hasSave={hasSave} selectedMode={mode} setSelectedMode={setMode} onNew={doStartNew} onLoad={doLoad} onShop={() => setScreen("shop")} />}
        {screen === "shop" && <ShopScreen meta={meta} onPurchase={(id, cost) => purchaseUpgrade(id, cost)} onBack={() => setScreen("menu")} />}
        
        {isGameScreen && (
          <div style={{ position: "relative", display: "inline-block", borderRadius: 16, padding: 8, background: "rgba(20,20,40,0.5)", boxShadow: `0 0 30px rgba(0,243,255,0.1), inset 0 0 20px ${T.border}` }}>
            <canvas ref={canvasRef} width={W} height={H} style={{ display: "block", borderRadius: 12, boxShadow: "0 0 20px rgba(0,0,0,0.8)" }} />
            <HUD ui={ui} />
            <RoomBanner banner={roomBanner} />
            {screen === "levelup" && <LevelUp choices={choices} equippedSkills={ui.equippedSkills} onChoose={handleLevelUpChoice} />}
            {screen === "swap" && swapSkill && <SwapSkillOverlay swapSkill={swapSkill} equippedSkills={ui.equippedSkills} onSwap={handleSwap} />}
            {screen === "revive" && reviveUI && <ReviveScreen reviveUI={reviveUI} onConfirm={handleReviveConfirm} onDie={commitDeath} />}
          </div>
        )}

        {screen === "dead" && <DeadScreen deathInfo={deathInfo} meta={meta} hasSave={hasSave} onNew={doStartNew} onLoad={doLoad} onMenu={() => setScreen("menu")} />}
      </div>
    </>
  );
}