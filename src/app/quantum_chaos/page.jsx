"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── CONSTANTS & CONFIG ─────────────────────────────────────────────────────
const ACCENT = "#00e5ff"; 
const DANGER = "#ff0055";
const GOLD = "#ffdd00";
const SAVE_KEY = "GZ_QUANTUM_SAVE_V1"; // Unique local storage key

const ENEMY_TYPES = {
  GRUNT: { hp: 1, speed: 1.8, radius: 8, color: "#8800ff", xp: 10, type: "melee" },
  TRACKER: { hp: 1, speed: 2.8, radius: 6, color: DANGER, xp: 15, type: "melee" },
  BRUTE: { hp: 4, speed: 1.0, radius: 14, color: "#ff8800", xp: 30, type: "melee" },
  SNIPER: { hp: 2, speed: 0.5, radius: 10, color: "#00ffaa", xp: 25, type: "ranged", fireRate: 120 }
};

const SKILL_POOL = [
  { id: "pierce", name: "QUANTUM TUNNELING", desc: "+1 Projectile Pierce", type: "buff" },
  { id: "capacity", name: "ELECTRON SHELL", desc: "+2 Max Orbital Capacity", type: "buff" },
  { id: "force", name: "RAILGUN ACCELERATOR", desc: "+30% Fire Velocity", type: "buff" },
  { id: "magnet", name: "EVENT HORIZON", desc: "+25% Catch Radius", type: "buff" },
  { id: "nova", name: "NOVA CORE", desc: "Detonating fires 8 micro-shrapnel", type: "buff" },
  { id: "vampire", name: "NANO-SIPHON", desc: "2% chance to heal on kill", type: "buff" },
  { id: "heal", name: "EMERGENCY REPAIR", desc: "Instantly restore 50% HP", type: "instant" }
];

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function QuantumChaos() {
  const canvasRef = useRef(null);
  
  // App States
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState("START"); 
  
  // Meta Stats (Saved to LocalStorage)
  const [stats, setStats] = useState({ volts: 0, highscore: 0 }); 
  const [metaUpgrades, setMetaUpgrades] = useState({ 
    baseCapacity: 5,  
    baseRadius: 100,  
    baseForce: 15,
    magnetRange: 50, 
    maxHp: 100,
    dashCooldown: 120 // Frames between dashes (lower is better)
  });

  // Current Run State (For UI)
  const [runStats, setRunStats] = useState({ score: 0, level: 1, xp: 0, nextXp: 100, hp: 100, maxHp: 100, capacity: 5 });
  const [dashState, setDashState] = useState({ ready: true, progress: 100 });
  const [skillChoices, setSkillChoices] = useState([]);

  // Mutable Game Engine State
  const engine = useRef({
    mouse: { x: 0, y: 0 },
    player: { x: 0, y: 0, hp: 100, maxHp: 100, vx: 0, vy: 0 },
    runModifiers: { pierce: 1, capacity: 5, radius: 100, force: 15, magnet: 50, nova: false, vampire: false },
    orbitals: [], enemies: [], enemyProjectiles: [], projectiles: [], particles: [], quarks: [], boss: null,
    isCatching: false, frame: 0, shake: 0, multiplier: 1, comboTimer: 0,
    dash: { timer: 0, isDashing: false, invuln: 0 }
  });

  // ─── LOCAL STORAGE SYNC ───
  useEffect(() => {
    // Load data on mount
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.metaUpgrades) setMetaUpgrades(parsed.metaUpgrades);
      } catch (e) { console.error("Save corrupted"); }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    // Save data when it changes
    if (mounted) {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ stats, metaUpgrades }));
    }
  }, [stats, metaUpgrades, mounted]);

  // ─── SYSTEMS ──────────────────────────────────────────────────────────────
  const initGame = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    engine.current = {
      ...engine.current,
      player: { x: w / 2, y: h / 2, hp: metaUpgrades.maxHp, maxHp: metaUpgrades.maxHp, vx: 0, vy: 0 },
      runModifiers: { 
        pierce: 1, capacity: metaUpgrades.baseCapacity, radius: metaUpgrades.baseRadius, 
        force: metaUpgrades.baseForce, magnet: metaUpgrades.magnetRange, nova: false, vampire: false 
      },
      orbitals: [], enemies: [], enemyProjectiles: [], projectiles: [], particles: [], quarks: [], boss: null,
      frame: 0, shake: 0, multiplier: 1, comboTimer: 0,
      dash: { timer: 0, isDashing: false, invuln: 0 }
    };
    setRunStats({ score: 0, level: 1, xp: 0, nextXp: 100, hp: metaUpgrades.maxHp, maxHp: metaUpgrades.maxHp, capacity: metaUpgrades.baseCapacity });
    setView("PLAYING");
  };

  const spawnParticles = (x, y, color, count, speed = 10) => {
    for (let i = 0; i < count; i++) {
      engine.current.particles.push({
        x, y, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed,
        life: 1, color
      });
    }
  };

  const triggerLevelUp = () => {
    setView("LEVEL_UP");
    const shuffled = [...SKILL_POOL].sort(() => 0.5 - Math.random());
    setSkillChoices(shuffled.slice(0, 3));
  };

  const selectSkill = (skill) => {
    const st = engine.current;
    if (skill.id === "pierce") st.runModifiers.pierce += 1;
    if (skill.id === "capacity") st.runModifiers.capacity += 2;
    if (skill.id === "force") st.runModifiers.force *= 1.3;
    if (skill.id === "magnet") st.runModifiers.radius *= 1.25;
    if (skill.id === "nova") st.runModifiers.nova = true;
    if (skill.id === "vampire") st.runModifiers.vampire = true;
    if (skill.id === "heal") st.player.hp = Math.min(st.player.maxHp, st.player.hp + (st.player.maxHp * 0.5));
    
    setRunStats(s => ({ ...s, capacity: st.runModifiers.capacity, hp: st.player.hp }));
    setView("PLAYING");
  };

  // ─── MAIN GAME LOOP ───────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== "PLAYING") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    let animationId;

    const onMove = (e) => { engine.current.mouse = { x: e.clientX, y: e.clientY }; };
    const onDown = () => { engine.current.isCatching = true; };
    const onUp = () => {
      const state = engine.current;
      state.isCatching = false;
      if (state.orbitals.length > 0) {
        state.shake = 10 + (state.orbitals.length); 
        
        // Nova Core Skill
        if (state.runModifiers.nova) {
          for(let i=0; i<8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            state.projectiles.push({ x: state.player.x, y: state.player.y, vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8, pierce: 1, size: 2 });
          }
        }

        // Fire Orbitals
        state.orbitals.forEach(orb => {
          state.projectiles.push({
            x: orb.x, y: orb.y, vx: Math.cos(orb.angle) * state.runModifiers.force, vy: Math.sin(orb.angle) * state.runModifiers.force,
            pierce: state.runModifiers.pierce, size: 4
          });
        });
        state.orbitals = [];
      }
    };

    const onKeyDown = (e) => {
      const state = engine.current;
      if (e.code === "Space" && state.dash.timer <= 0) {
         // Dash Logic
         const angle = Math.atan2(state.mouse.y - state.player.y, state.mouse.x - state.player.x);
         state.player.vx = Math.cos(angle) * 35;
         state.player.vy = Math.sin(angle) * 35;
         state.dash.timer = metaUpgrades.dashCooldown;
         state.dash.invuln = 15; // 15 frames of invincibility
         state.shake = 15;
         spawnParticles(state.player.x, state.player.y, ACCENT, 30, 15);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKeyDown);

    const loop = () => {
      const W = canvas.width = window.innerWidth;
      const H = canvas.height = window.innerHeight;
      const state = engine.current;
      state.frame++;

      // Screen Shake
      let dx = 0, dy = 0;
      if (state.shake > 0) {
        dx = (Math.random() - 0.5) * state.shake; dy = (Math.random() - 0.5) * state.shake;
        state.shake *= 0.85; if (state.shake < 0.5) state.shake = 0;
      }

      // Render Background
      ctx.fillStyle = "rgba(4, 4, 10, 0.35)";
      ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(dx, dy);

      // Dash & Movement Physics
      if (state.dash.timer > 0) state.dash.timer--;
      if (state.dash.invuln > 0) state.dash.invuln--;
      
      // Update Dash UI
      if (state.frame % 5 === 0) {
         setDashState({ ready: state.dash.timer <= 0, progress: Math.max(0, 100 - (state.dash.timer / metaUpgrades.dashCooldown) * 100) });
      }

      // Smooth vs Dash movement
      state.player.x += state.player.vx;
      state.player.y += state.player.vy;
      state.player.vx *= 0.8; // Friction
      state.player.vy *= 0.8;
      
      if (state.dash.invuln <= 0) {
        state.player.x += (state.mouse.x - state.player.x) * 0.12;
        state.player.y += (state.mouse.y - state.player.y) * 0.12;
      }

      // Combo System
      if (state.comboTimer > 0) {
          state.comboTimer--;
          if (state.comboTimer <= 0) state.multiplier = 1;
      }

      // Overload Penalty
      if (state.orbitals.length > state.runModifiers.capacity) {
        state.player.hp -= 0.8;
        state.shake = 4;
        ctx.fillStyle = "rgba(255, 0, 85, 0.15)"; ctx.fillRect(-dx, -dy, W, H);
        if (state.player.hp <= 0) handleGameOver(state);
      }

      // ─── SPAWN LOGIC ───
      const difficulty = 1 + (state.frame / 2500);
      if (state.frame % Math.max(8, Math.floor(35 / difficulty)) === 0 && !state.boss) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(W, H) / 2 + 150;
        const rand = Math.random();
        
        let type = ENEMY_TYPES.GRUNT;
        if (rand > 0.75) type = ENEMY_TYPES.TRACKER;
        if (rand > 0.90) type = ENEMY_TYPES.BRUTE;
        if (rand > 0.96) type = ENEMY_TYPES.SNIPER;

        state.enemies.push({ x: state.player.x + Math.cos(angle)*dist, y: state.player.y + Math.sin(angle)*dist, ...type, currentHp: type.hp, timer: 0 });
      }

      // Boss Spawn
      if (runStats.level > 0 && runStats.level % 5 === 0 && !state.boss && state.frame % 300 === 0) {
        state.boss = { x: W/2, y: -200, hp: 250 * difficulty, maxHp: 250 * difficulty, phase: 1, timer: 0 };
      }

      // ─── VISUALS: PLAYER & HORIZON ───
      if (state.isCatching) {
        ctx.beginPath(); ctx.arc(state.player.x, state.player.y, state.runModifiers.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 255, ${Math.sin(state.frame*0.1)*0.05 + 0.05})`; ctx.fill();
        ctx.strokeStyle = "rgba(0, 229, 255, 0.5)"; ctx.lineWidth = 2; ctx.setLineDash([5, 15]); ctx.lineDashOffset = -state.frame*2; ctx.stroke(); ctx.setLineDash([]);
      }

      // Orbitals
      state.orbitals.forEach((orb) => {
        orb.angle += 0.08 + (state.orbitals.length * 0.01); 
        orb.dist = Math.max(30, orb.dist - 2); 
        orb.x = state.player.x + Math.cos(orb.angle) * orb.dist; orb.y = state.player.y + Math.sin(orb.angle) * orb.dist;

        ctx.strokeStyle = "rgba(0, 229, 255, 0.4)"; ctx.beginPath(); ctx.moveTo(state.player.x, state.player.y); ctx.lineTo(orb.x, orb.y); ctx.stroke();
        ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(orb.x, orb.y, 5, 0, Math.PI*2); ctx.fill();
      });

      // Player Core
      ctx.shadowBlur = 30; ctx.shadowColor = state.dash.invuln > 0 ? "#fff" : ACCENT;
      ctx.fillStyle = state.orbitals.length > state.runModifiers.capacity ? DANGER : (state.dash.invuln > 0 ? "#fff" : "#fff");
      ctx.beginPath(); ctx.arc(state.player.x, state.player.y, 14, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

      // ─── XP GEMS (QUARKS) ───
      for (let i = state.quarks.length - 1; i >= 0; i--) {
        const q = state.quarks[i];
        const dist = Math.hypot(state.player.x - q.x, state.player.y - q.y);
        
        if (dist < state.runModifiers.magnet) { q.x += (state.player.x - q.x) * 0.25; q.y += (state.player.y - q.y) * 0.25; }
        
        if (dist < 20) {
          state.quarks.splice(i, 1);
          setRunStats(prev => {
            let newXp = prev.xp + q.amount;
            if (newXp >= prev.nextXp) {
               triggerLevelUp();
               return { ...prev, level: prev.level + 1, xp: newXp - prev.nextXp, nextXp: Math.floor(prev.nextXp * 1.6) };
            }
            return { ...prev, xp: newXp };
          });
          continue;
        }
        ctx.fillStyle = GOLD; ctx.shadowBlur = 10; ctx.shadowColor = GOLD;
        ctx.beginPath(); ctx.arc(q.x, q.y, 4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
      }

      // ─── ENEMIES ───
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const en = state.enemies[i];
        en.timer++;
        const dist = Math.hypot(state.player.x - en.x, state.player.y - en.y);

        // Catch Logic (Only Melee enemies can be caught)
        if (state.isCatching && dist < state.runModifiers.radius && en.currentHp <= 1 && en.type === "melee") {
          state.orbitals.push({ x: en.x, y: en.y, angle: Math.atan2(en.y - state.player.y, en.x - state.player.x), dist: dist });
          state.enemies.splice(i, 1);
          continue;
        }

        // Behavior
        const angle = Math.atan2(state.player.y - en.y, state.player.x - en.x);
        if (en.type === "melee") {
           en.x += Math.cos(angle) * en.speed * (state.isCatching ? 0.2 : 1);
           en.y += Math.sin(angle) * en.speed * (state.isCatching ? 0.2 : 1);
        } else if (en.type === "ranged") {
           if (dist > 300) { en.x += Math.cos(angle) * en.speed; en.y += Math.sin(angle) * en.speed; }
           else { en.x -= Math.cos(angle) * en.speed; en.y -= Math.sin(angle) * en.speed; } // Retreat
           
           if (en.timer % en.fireRate === 0) {
               state.enemyProjectiles.push({ x: en.x, y: en.y, vx: Math.cos(angle)*6, vy: Math.sin(angle)*6 });
           }
        }

        // Collision with Player
        if (dist < en.radius + 14 && state.dash.invuln <= 0) {
          state.player.hp -= 20; state.shake = 25;
          spawnParticles(en.x, en.y, DANGER, 25);
          state.enemies.splice(i, 1);
          state.multiplier = 1; 
          if (state.player.hp <= 0) handleGameOver(state);
          continue;
        }

        // Draw Enemy
        ctx.shadowBlur = 15; ctx.shadowColor = en.color; ctx.fillStyle = en.color;
        ctx.beginPath(); 
        if (en.type === "ranged") { ctx.moveTo(en.x, en.y-10); ctx.lineTo(en.x+10, en.y+10); ctx.lineTo(en.x-10, en.y+10); } 
        else if (en.radius === 14) ctx.rect(en.x-7, en.y-7, 14, 14); 
        else ctx.arc(en.x, en.y, en.radius, 0, Math.PI*2); 
        ctx.fill(); ctx.shadowBlur = 0;
      }

      // ─── ENEMY PROJECTILES ───
      for(let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
         const p = state.enemyProjectiles[i];
         p.x += p.vx; p.y += p.vy;
         ctx.fillStyle = "#ff00aa"; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
         
         if (Math.hypot(state.player.x - p.x, state.player.y - p.y) < 15 && state.dash.invuln <= 0) {
            state.player.hp -= 10; state.shake = 15; state.multiplier = 1;
            state.enemyProjectiles.splice(i, 1);
            if (state.player.hp <= 0) handleGameOver(state);
         } else if (p.x < -100 || p.x > W+100 || p.y < -100 || p.y > H+100) state.enemyProjectiles.splice(i, 1);
      }

      // ─── PLAYER PROJECTILES ───
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.x += p.vx; p.y += p.vy;

        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        if (p.size > 2) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx*1.5, p.y - p.vy*1.5); ctx.strokeStyle = ACCENT; ctx.lineWidth=4; ctx.stroke(); }

        let hit = false;
        // Boss Hit
        if (state.boss && Math.hypot(p.x - state.boss.x, p.y - state.boss.y) < 60) {
            state.boss.hp -= 1; spawnParticles(p.x, p.y, GOLD, 10);
            p.pierce--; hit = true;
            if (state.boss.hp <= 0) {
                spawnParticles(state.boss.x, state.boss.y, DANGER, 300, 25);
                for(let k=0; k<80; k++) state.quarks.push({x: state.boss.x + (Math.random()-0.5)*150, y: state.boss.y + (Math.random()-0.5)*150, amount: 50});
                state.boss = null;
            }
        }

        // Enemy Hit
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          if (hit || p.pierce <= 0) break;
          const en = state.enemies[j];
          if (Math.hypot(p.x - en.x, p.y - en.y) < en.radius + 8) {
            en.currentHp -= 1;
            spawnParticles(en.x, en.y, en.color, 15);
            p.pierce--; hit = true;
            
            if (en.currentHp <= 0) {
              state.enemies.splice(j, 1);
              state.multiplier = Math.min(5.0, state.multiplier + 0.1); // Cap combo at 5x
              state.comboTimer = 150;
              state.quarks.push({ x: en.x, y: en.y, amount: en.xp });
              
              if (state.runModifiers.vampire && Math.random() < 0.02) state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5);
              
              setRunStats(s => {
                const addScore = Math.floor(10 * state.multiplier);
                setStats(ms => ({ ...ms, volts: ms.volts + 1 })); 
                return { ...s, score: s.score + addScore };
              });
            }
          }
        }
        if (p.pierce <= 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) state.projectiles.splice(i, 1);
      }

      // ─── PARTICLES ───
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.03;
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life); ctx.fillRect(p.x, p.y, 4, 4); ctx.globalAlpha = 1;
        if (p.life <= 0) state.particles.splice(i, 1);
      }

      if (state.frame % 5 === 0) setRunStats(s => ({ ...s, hp: state.player.hp }));
      ctx.restore();
      animationId = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [view]);

  const handleGameOver = (state) => {
    setStats(s => ({ ...s, highscore: Math.max(s.highscore, runStats.score) }));
    setView("GAMEOVER");
  };

  const buyMetaUpgrade = (key, cost, increment, max) => {
    if (stats.volts >= cost && (key === 'dashCooldown' ? metaUpgrades[key] > max : metaUpgrades[key] < max)) {
      setStats(s => ({ ...s, volts: s.volts - cost }));
      setMetaUpgrades(m => ({ ...m, [key]: key === 'dashCooldown' ? m[key] - increment : m[key] + increment }));
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#05050c] flex justify-center items-center text-cyan-500 font-mono">INITIALIZING QUANTUM CORE...</div>;

  // ─── UI RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#05050c] text-white font-mono select-none overflow-hidden cursor-crosshair">
      
      {/* 1. START SCREEN */}
      {view === "START" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <Link href="/" className="absolute top-8 left-8 text-zinc-500 hover:text-cyan-400 tracking-widest text-xs transition-colors border border-zinc-800 px-4 py-2 hover:border-cyan-400">
            ◀ RETURN TO HUB
          </Link>
          <div className="absolute top-8 right-8 text-right">
             <p className="text-xs text-zinc-500 tracking-widest">ALL-TIME HIGH SCORE</p>
             <p className="text-2xl font-black text-white shadow-cyan-500 drop-shadow-lg">{stats.highscore}</p>
          </div>

          <p className="text-[10px] tracking-[0.5em] text-cyan-800 mb-2 font-bold animate-pulse">SYSTEM_ONLINE</p>
          <h1 className="text-7xl md:text-9xl font-black mb-2 tracking-tighter uppercase" style={{ color: ACCENT, textShadow: `0 0 40px ${ACCENT}88` }}>
            QUANTUM<br/><span className="text-white">CHAOS 3.0</span>
          </h1>
          <p className="text-zinc-400 mb-12 tracking-[0.4em] uppercase text-sm font-bold">Competitive Bullet Hell</p>
          
          <div className="flex gap-6">
            <button onClick={initGame} className="px-12 py-5 bg-cyan-400 text-black font-black tracking-widest hover:scale-105 hover:bg-white transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)]">
              INITIATE DIVE
            </button>
            <button onClick={() => setView("SHOP")} className="px-12 py-5 border border-zinc-700 text-zinc-300 hover:text-white hover:border-cyan-400 hover:bg-cyan-400/10 transition-all tracking-widest font-bold flex flex-col items-center justify-center leading-none">
              <span>LABORATORY</span>
              <span className="text-xs text-cyan-500 mt-2">{stats.volts} VOLTS STORED</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. HUD (PLAYING) */}
      {view === "PLAYING" && (
        <div className="absolute inset-0 z-30 pointer-events-none p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] text-cyan-800 tracking-widest font-bold">CORE INTEGRITY</div>
              <div className="w-64 h-4 bg-zinc-900 mt-1 border border-zinc-800 relative">
                <div className="h-full transition-all duration-200" style={{ width: `${Math.max(0, (runStats.hp / runStats.maxHp) * 100)}%`, background: runStats.hp < 30 ? DANGER : ACCENT }} />
              </div>
              
              <div className="mt-4 text-[10px] text-zinc-500 tracking-widest">QUANTUM DASH [SPACE]</div>
              <div className="w-48 h-2 bg-zinc-900 mt-1 border border-zinc-800 relative">
                <div className="h-full bg-white transition-all duration-100" style={{ width: `${dashState.progress}%`, boxShadow: dashState.ready ? '0 0 10px #fff' : 'none' }} />
              </div>

              <div className="mt-4 text-[10px] text-zinc-500 tracking-widest">ORBITAL CAPACITY</div>
              <div className="flex gap-1 mt-1">
                {Array.from({length: runStats.capacity}).map((_, i) => (
                  <div key={i} className={`h-3 w-4 border border-black ${i < engine.current.orbitals.length ? 'bg-cyan-400 shadow-[0_0_10px_#00e5ff]' : 'bg-zinc-800'} transition-all`} />
                ))}
              </div>
            </div>
            
            <div className="text-right flex flex-col items-end">
              <div className="text-6xl font-black tabular-nums tracking-tighter" style={{ textShadow: `0 0 20px ${ACCENT}44` }}>
                {runStats.score}
              </div>
              <div className={`font-black text-xl tracking-widest ${engine.current.multiplier > 1 ? 'text-yellow-400 animate-pulse' : 'text-cyan-800'}`}>
                COMBO x{engine.current.multiplier.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="w-full">
             <div className="flex justify-between text-xs font-bold text-[#ffdd00] mb-2">
               <span>LEVEL {runStats.level}</span>
               <span>{runStats.xp} / {runStats.nextXp} XP</span>
             </div>
             <div className="w-full h-2 bg-zinc-900 border border-zinc-800">
                <div className="h-full bg-[#ffdd00] shadow-[0_0_10px_#ffdd00] transition-all" style={{ width: `${(runStats.xp / runStats.nextXp) * 100}%` }} />
             </div>
          </div>
        </div>
      )}

      {/* 3. LEVEL UP MODAL */}
      {view === "LEVEL_UP" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
          <h2 className="text-6xl font-black text-[#ffdd00] mb-2 tracking-tighter animate-pulse shadow-yellow-500 drop-shadow-2xl">SYSTEM OVERRIDE</h2>
          <p className="text-zinc-400 tracking-widest text-sm mb-12">SELECT COMBAT AUGMENTATION</p>
          
          <div className="flex gap-6 max-w-5xl px-4">
            {skillChoices.map((skill, i) => (
              <button key={i} onClick={() => selectSkill(skill)} className="flex-1 p-8 border border-zinc-700 bg-zinc-900/50 hover:bg-cyan-900/30 hover:border-cyan-400 hover:scale-105 transition-all group text-left relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 group-hover:bg-cyan-400 transition-colors" />
                <h3 className="text-xl font-black text-white group-hover:text-cyan-400 mb-4">{skill.name}</h3>
                <p className="text-sm text-zinc-400 font-bold">{skill.desc}</p>
                <div className="mt-8 text-[10px] tracking-widest text-zinc-600 group-hover:text-cyan-800">ACQUIRE [X]</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. SHOP / LABORATORY */}
      {view === "SHOP" && (
        <div className="absolute inset-0 z-50 bg-[#050505] p-12 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-12 border-b border-zinc-800 pb-6">
              <div>
                 <h2 className="text-5xl font-black tracking-widest text-white">LABORATORY</h2>
                 <p className="text-cyan-500 tracking-widest text-xs mt-2">DATA PERSISTENT ACROSS SESSIONS</p>
              </div>
              <div className="text-4xl text-cyan-400 font-black tracking-tighter">{stats.volts} <span className="text-xl">VOLTS</span></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { key: 'baseCapacity', name: 'BASE CAPACITY', desc: 'Start with higher orbital slots.', cost: 200, inc: 1, max: 10, format: v=>v },
                { key: 'baseRadius', name: 'HORIZON EXPANSION', desc: 'Larger base catch radius.', cost: 150, inc: 15, max: 200, format: v=>v+'px' },
                { key: 'baseForce', name: 'RAILGUN CALIBRATION', desc: 'Higher base projectile speed.', cost: 300, inc: 5, max: 40, format: v=>v+'m/s' },
                { key: 'magnetRange', name: 'QUARK MAGNET', desc: 'Pull XP gems from further away.', cost: 100, inc: 25, max: 200, format: v=>v+'px' },
                { key: 'maxHp', name: 'HULL REINFORCEMENT', desc: 'Increase maximum integrity.', cost: 250, inc: 50, max: 500, format: v=>v+' HP' },
                { key: 'dashCooldown', name: 'THRUSTER COOLING', desc: 'Reduce Dash cooldown time.', cost: 400, inc: 15, max: 45, format: v=>v+' frames' }
              ].map(item => {
                const isMaxed = item.key === 'dashCooldown' ? metaUpgrades[item.key] <= item.max : metaUpgrades[item.key] >= item.max;
                return (
                  <div key={item.key} className="p-6 bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg mb-2 text-white">{item.name}</h3>
                      <p className="text-xs text-zinc-400 mb-6 min-h-8">{item.desc}</p>
                      <div className="text-sm font-bold text-cyan-500 mb-4">Current: {item.format(metaUpgrades[item.key])}</div>
                    </div>
                    <button 
                      onClick={() => buyMetaUpgrade(item.key, item.cost, item.inc, item.max)}
                      disabled={stats.volts < item.cost || isMaxed}
                      className="w-full py-3 bg-black border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-400 hover:text-black font-bold tracking-widest transition-all text-xs"
                    >
                      {isMaxed ? 'MAX LEVEL' : `UPGRADE - ${item.cost}V`}
                    </button>
                  </div>
                )
              })}
            </div>
            <button onClick={() => setView("START")} className="mt-12 text-zinc-500 hover:text-white tracking-widest text-sm font-bold border-b border-transparent hover:border-white transition-all pb-1">
              ◀ RETURN TO HUB
            </button>
          </div>
        </div>
      )}

      {/* 5. GAME OVER */}
      {view === "GAMEOVER" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-md">
          <p className="text-xs tracking-[1em] text-red-500 mb-4 font-bold">SIGNAL LOST</p>
          <h2 className="text-8xl font-black text-white mb-2 tracking-tighter">CORE COLLAPSE</h2>
          <div className="flex gap-12 mb-16 text-zinc-300 font-mono text-lg mt-8 bg-black/50 p-6 rounded-xl border border-red-900 shadow-[0_0_40px_rgba(255,0,0,0.2)]">
             <div className="text-center">
                 <div className="text-xs text-zinc-500 tracking-widest mb-1">FINAL SCORE</div>
                 <div className="text-4xl font-black text-white">{runStats.score}</div>
             </div>
             <div className="text-center border-l border-red-900 pl-12">
                 <div className="text-xs text-zinc-500 tracking-widest mb-1">VOLTS EXTRACTED</div>
                 <div className="text-4xl font-black text-cyan-400">+{runStats.score > 0 ? Math.floor(runStats.score / 10) : 0}</div>
             </div>
          </div>
          <div className="flex gap-4">
             <button onClick={initGame} className="px-10 py-4 bg-white text-black font-black tracking-widest hover:scale-105 transition-transform">RESTART RUN</button>
             <button onClick={() => setView("SHOP")} className="px-10 py-4 border border-zinc-700 text-zinc-300 hover:text-white hover:border-white tracking-widest font-bold bg-black/50">LABORATORY</button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none mix-blend-screen" />
      <div className="fixed inset-0 pointer-events-none z-40 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.7)_100%)] mix-blend-overlay" />
    </div>
  );
}