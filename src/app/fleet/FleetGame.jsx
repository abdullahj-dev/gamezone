'use client';
import React, { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
//  STAR-CLASH: NEXUS  —  The Ultimate Space Brawler
//  Flawless E.Code Controls | 4 Humans + 4 Bots | 60FPS Lock
// ═══════════════════════════════════════════════════════════════

const SAVE_KEY = "STAR_CLASH_PERFECT_V1";
const W = 1100, H = 700;

// Physics Constants
const FRICTION     = 0.92;
const SPEED        = 1.15;
const DASH_FORCE   = 20;
const DASH_CD      = 80;
const DASH_TIME    = 14;
const SHIP_R       = 18;
const BULLET_SPEED = 12;
const BASE_FIRE_CD = 20;

// ─── POWER-UPS ──────────────────────────────────────────────
const POWERUPS = {
  SPREAD: { id: "spread", col: "#f97316", txt: "TRIPLE", dur: 400 },
  RAIL:   { id: "rail",   col: "#a855f7", txt: "RAILGUN", dur: 300 },
  RAPID:  { id: "rapid",  col: "#facc15", txt: "RAPID FIRE", dur: 250 },
  SHIELD: { id: "shield", col: "#06b6d4", txt: "SHIELD", dur: 9999 }, // Breaks on hit
};

// ─── SHOP ASSETS ────────────────────────────────────────────
const CHASSIS = [
  { id: "striker", name: "Striker Mk-1", hex: "#f8fafc", cost: 0 },
  { id: "blood",   name: "Bloodhound",   hex: "#ef4444", cost: 0 },
  { id: "viper",   name: "Viper Green",  hex: "#10b981", cost: 200 },
  { id: "nova",    name: "Nova Blue",    hex: "#3b82f6", cost: 400 },
  { id: "monarch", name: "Solar Monarch",hex: "#facc15", cost: 800 },
  { id: "abyss",   name: "Abyssal Void", hex: "#0f172a", cost: 1500 },
];

const ENGINES = [
  { id: "combust", name: "Combustion",   col: "#f97316", cost: 0 },
  { id: "ion",     name: "Ion Thruster", col: "#06b6d4", cost: 300 },
  { id: "dark",    name: "Dark Matter",  col: "#a855f7", cost: 700 },
];

const ARENAS = [
  { id: "void",   name: "Deep Space",    desc: "No obstacles. Pure skill." },
  { id: "maze",   name: "Asteroid Base", desc: "Walls block your shots." },
  { id: "cross",  name: "Crossfire",     desc: "Central cover only." },
];

const DEFAULT_SAVE = {
  credits: 0,
  ownedChassis: ["striker", "blood"], ownedEngines: ["combust"],
  equip: {
    p1: { chassis: "blood",   engine: "combust" },
    p2: { chassis: "striker", engine: "combust" },
    p3: { chassis: "viper",   engine: "combust" },
    p4: { chassis: "monarch", engine: "combust" }
  }
};

// ─── MATH UTILS ─────────────────────────────────────────────
const rand = (a, b) => Math.random() * (b - a) + a;
const dstSq = (x1, y1, x2, y2) => (x2 - x1)**2 + (y2 - y1)**2;
const ang = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function FleetGame() {
  const canvasRef = useRef(null);
  const reqRef = useRef(null);

  const [save, setSave] = useState(DEFAULT_SAVE);
  const [screen, setScreen] = useState("menu"); 
  const [config, setConfig] = useState({ humans: 2, bots: 2, winScore: 10, arena: "maze" });
  const [shopTab, setShopTab] = useState("chassis");
  const [uiSnap, setUiSnap] = useState({ players: [] });

  const gs = useRef({ keys: {}, frame: 0, active: false });

  // ─── SECURE BOOT (No Zero-Day Errors) ───
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        let p = JSON.parse(raw);
        setSave({ 
          ...DEFAULT_SAVE, ...p, 
          equip: { 
            p1: { ...DEFAULT_SAVE.equip.p1, ...(p.equip?.p1 || {}) },
            p2: { ...DEFAULT_SAVE.equip.p2, ...(p.equip?.p2 || {}) },
            p3: { ...DEFAULT_SAVE.equip.p3, ...(p.equip?.p3 || {}) },
            p4: { ...DEFAULT_SAVE.equip.p4, ...(p.equip?.p4 || {}) },
          } 
        });
      }
    } catch(e){}

    // CRITICAL FIX: Using e.code prevents Shift/Space key clashes!
    const down = (e) => { gs.current.keys[e.code] = true; };
    const up = (e) => { gs.current.keys[e.code] = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up);
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  const saveGame = (data) => { setSave(data); try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch(e){} };

  // ─── MAP BUILDER ───
  const getWalls = (arenaId) => {
    if (arenaId === "maze") return [ 
      { x: W/4 - 20, y: H/4, w: 40, h: H/2 }, { x: 3*W/4 - 20, y: H/4, w: 40, h: H/2 },
      { x: W/2 - 120, y: H/2 - 20, w: 240, h: 40 }
    ];
    if (arenaId === "cross") return [ 
      { x: W/2 - 20, y: H/4, w: 40, h: H/2 }, { x: W/4, y: H/2 - 20, w: W/2, h: 40 } 
    ];
    return [];
  };

  // ─── INITIATE MATCH ───
  const startMatch = () => {
    // FLAWLESS E.CODE CONTROLS
    const controls = [
      { id: 1, type: "human", k: { u: "KeyW", d: "KeyS", l: "KeyA", r: "KeyD", dash: "ShiftLeft", fire: "Space" }, eq: save.equip.p1 },
      { id: 2, type: "human", k: { u: "ArrowUp", d: "ArrowDown", l: "ArrowLeft", r: "ArrowRight", dash: "ShiftRight", fire: "Enter" }, eq: save.equip.p2 },
      { id: 3, type: "human", k: { u: "KeyI", d: "KeyK", l: "KeyJ", r: "KeyL", dash: "KeyO", fire: "KeyP" }, eq: save.equip.p3 },
      { id: 4, type: "human", k: { u: "KeyT", d: "KeyG", l: "KeyF", r: "KeyH", dash: "KeyR", fire: "KeyY" }, eq: save.equip.p4 },
    ];

    let players = [], pid = 1;
    
    // Setup Humans
    for (let i=0; i<config.humans; i++) {
      players.push({
        ...controls[i], pid: pid++, 
        x: W/2 + rand(-350,350), y: H/2 + rand(-250,250), vx: 0, vy: 0, angle: rand(0, Math.PI*2),
        score: 0, state: "alive", respawn: 0, dashCd: 0, dashTime: 0, fireCd: 0,
        powerup: "none", powerupTime: 0, shield: false,
        col: CHASSIS.find(c=>c.id === controls[i].eq.chassis)?.hex || "#fff",
        engineCol: ENGINES.find(t=>t.id === controls[i].eq.engine)?.col || "#f97316"
      });
    }

    // Setup Bots
    const botCols = ["#ef4444", "#3b82f6", "#10b981", "#facc15"];
    for (let i=0; i<config.bots; i++) {
      players.push({
        id: `BOT-${i+1}`, type: "bot", pid: pid++,
        x: W/2 + rand(-400,400), y: H/2 + rand(-250,250), vx: 0, vy: 0, angle: rand(0, Math.PI*2),
        score: 0, state: "alive", respawn: 0, dashCd: 0, dashTime: 0, fireCd: 0,
        powerup: "none", powerupTime: 0, shield: false,
        col: botCols[i%botCols.length], engineCol: "#f97316"
      });
    }

    gs.current = {
      keys: gs.current.keys, frame: 0, active: true, shake: 0, hitstop: 0,
      players, bullets: [], walls: getWalls(config.arena), powerups: [], particles: [], popups: [], winner: null
    };

    setScreen("playing");
    updateUI(gs.current);
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    reqRef.current = requestAnimationFrame(loop);
  };

  const updateUI = (g) => {
    // Throttled to prevent React memory leaks
    setUiSnap({ players: g.players.map(p => ({ pid: p.pid, id: p.id, type: p.type, score: p.score, state: p.state, col: p.col, shield: p.shield, pu: p.powerup })) });
  };

  // ─── FIRE WEAPON LOGIC ───
  const fireWeapon = (g, p) => {
    let speed = p.powerup === "rail" ? BULLET_SPEED * 1.8 : BULLET_SPEED;
    let col = p.powerup !== "none" && p.powerup !== "shield" ? POWERUPS[p.powerup.toUpperCase()].col : p.col;
    let life = p.powerup === "rail" ? 35 : 90;
    
    const spawnB = (angOff) => {
      let a = p.angle + angOff;
      g.bullets.push({ 
        x: p.x + Math.cos(a)*20, y: p.y + Math.sin(a)*20, 
        vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, 
        col: col, owner: p.pid, type: p.powerup, bounces: p.powerup === "rail" ? 0 : 1, life
      });
    };

    if (p.powerup === "spread") { spawnB(-0.25); spawnB(0); spawnB(0.25); } 
    else { spawnB(0); }

    // Recoil
    p.vx -= Math.cos(p.angle) * 2; p.vy -= Math.sin(p.angle) * 2;
    for(let k=0; k<5; k++) g.particles.push({ x: p.x + Math.cos(p.angle)*20, y: p.y + Math.sin(p.angle)*20, vx: rand(-2,2), vy: rand(-2,2), col: "#fff", life: 10, s: 3 });
  };

  // ─── CORE GAME LOOP ───
  const loop = () => {
    const g = gs.current;
    if (!g.active) return;
    
    if (g.hitstop > 0) { g.hitstop--; reqRef.current = requestAnimationFrame(loop); return; }
    
    g.frame++;
    if (g.shake > 0) g.shake--;

    let highestScore = 0;
    let uiDirty = false;

    // --- Powerup Spawning ---
    if (g.frame % 400 === 0 && g.powerups.length < 4) {
      const types = Object.keys(POWERUPS);
      const type = types[Math.floor(Math.random() * types.length)];
      g.powerups.push({ x: rand(100, W-100), y: rand(100, H-100), type: type.toLowerCase(), life: 900 });
    }

    // --- Players & AI ---
    for (let i = 0; i < g.players.length; i++) {
      let p = g.players[i];
      if (p.score > highestScore) highestScore = p.score;

      if (p.state === "dead") {
        p.respawn--;
        if (p.respawn <= 0) {
          p.state = "alive"; p.x = W/2 + rand(-400,400); p.y = H/2 + rand(-250,250);
          p.vx = 0; p.vy = 0; p.dashCd = 0; p.dashTime = 0; p.shield = true; p.powerup = "shield"; // Spawn with temp shield
          uiDirty = true;
          for(let k=0; k<20; k++) g.particles.push({ x: p.x, y: p.y, vx: rand(-5,5), vy: rand(-5,5), col: p.col, life: 30, s: 5 });
        }
        continue;
      }

      // Timers
      if (p.dashCd > 0) p.dashCd--;
      if (p.dashTime > 0) p.dashTime--;
      if (p.fireCd > 0) p.fireCd--;
      if (p.powerupTime > 0) {
        p.powerupTime--;
        if (p.powerupTime <= 0 && p.powerup !== "shield") { p.powerup = "none"; uiDirty = true; }
      }

      let moveX = 0, moveY = 0, dash = false, fire = false;

      // Inputs (E.CODE)
      if (p.type === "human") {
        if (g.keys[p.k.l]) moveX -= 1;
        if (g.keys[p.k.r]) moveX += 1;
        if (g.keys[p.k.u]) moveY -= 1;
        if (g.keys[p.k.d]) moveY += 1;
        if (g.keys[p.k.dash] && p.dashCd === 0) { dash = true; g.keys[p.k.dash] = false; }
        if (g.keys[p.k.fire] && p.fireCd === 0) fire = true;
      } 
      // Advanced Bot AI
      else {
        let target = null, minDist = Infinity;
        g.players.forEach(op => {
          if (op !== p && op.state === "alive") {
            let dSq = dstSq(p.x, p.y, op.x, op.y);
            if (dSq < minDist) { minDist = dSq; target = op; }
          }
        });

        // Seek powerups
        let puTarget = null, minPuDist = Infinity;
        g.powerups.forEach(pu => {
          let dSq = dstSq(p.x, p.y, pu.x, pu.y);
          if (dSq < minPuDist) { minPuDist = dSq; puTarget = pu; }
        });

        if (puTarget && minPuDist < 50000) { 
          let a = ang(p.x, p.y, puTarget.x, puTarget.y);
          moveX = Math.cos(a); moveY = Math.sin(a);
        } else if (target) {
          let a = ang(p.x, p.y, target.x, target.y);
          // Aim at target
          let angDiff = a - p.angle;
          while (angDiff < -Math.PI) angDiff += Math.PI*2;
          while (angDiff > Math.PI) angDiff -= Math.PI*2;
          
          if (Math.abs(angDiff) < 0.25 && p.fireCd === 0) fire = true;

          // Dodge incoming bullets
          let incoming = g.bullets.find(b => b.owner !== p.pid && dstSq(p.x, p.y, b.x, b.y) < 18000);
          if (incoming) {
            moveX = Math.cos(a + Math.PI/2); moveY = Math.sin(a + Math.PI/2); // Dodge laterally
            if (p.dashCd === 0 && Math.random() < 0.15) dash = true;
          } else {
            // Keep optimum distance
            if (minDist > 100000) { moveX = Math.cos(a); moveY = Math.sin(a); } // Approach
            else if (minDist < 40000) { moveX = -Math.cos(a); moveY = -Math.sin(a); } // Retreat
            else { moveX = Math.cos(a + Math.PI/3); moveY = Math.sin(a + Math.PI/3); } // Strafe
          }
        }
      }

      // Apply Movement & Rotation
      if (moveX !== 0 || moveY !== 0) {
        if (moveX !== 0 && moveY !== 0) { moveX *= 0.707; moveY *= 0.707; }
        p.vx += moveX * SPEED; p.vy += moveY * SPEED;
        
        let targetAng = Math.atan2(moveY, moveX);
        let diff = targetAng - p.angle;
        while (diff < -Math.PI) diff += Math.PI*2;
        while (diff > Math.PI) diff -= Math.PI*2;
        p.angle += diff * 0.18; // Smooth turning
      }

      if (fire && p.dashTime === 0) {
        fireWeapon(g, p);
        p.fireCd = p.powerup === "rapid" ? 5 : BASE_FIRE_CD;
      }

      if (dash) {
        p.vx = Math.cos(p.angle) * DASH_FORCE; p.vy = Math.sin(p.angle) * DASH_FORCE;
        p.dashCd = DASH_CD; p.dashTime = DASH_TIME;
        for(let k=0; k<12; k++) g.particles.push({ x: p.x, y: p.y, vx: rand(-6,6), vy: rand(-6,6), col: p.col, life: 20, s: 6 });
      }

      p.vx *= FRICTION; p.vy *= FRICTION;
      p.x += p.vx; p.y += p.vy;

      // Thruster Trails
      if (Math.hypot(p.vx, p.vy) > 1.5 && g.frame % 2 === 0) {
        g.particles.push({ x: p.x - Math.cos(p.angle)*18, y: p.y - Math.sin(p.angle)*18, vx: rand(-1,1), vy: rand(-1,1), col: p.engineCol, life: 15, s: 4 });
      }

      // Map Boundaries
      if (p.x < SHIP_R) { p.x = SHIP_R; p.vx *= -0.5; } if (p.x > W-SHIP_R) { p.x = W-SHIP_R; p.vx *= -0.5; }
      if (p.y < SHIP_R) { p.y = SHIP_R; p.vy *= -0.5; } if (p.y > H-SHIP_R) { p.y = H-SHIP_R; p.vy *= -0.5; }

      // Map Walls
      g.walls.forEach(w => {
        let testX = Math.max(w.x, Math.min(p.x, w.x+w.w));
        let testY = Math.max(w.y, Math.min(p.y, w.y+w.h));
        if (dstSq(p.x, p.y, testX, testY) < SHIP_R**2) { p.vx *= -1; p.vy *= -1; p.x += p.vx; p.y += p.vy; }
      });

      // Powerup Pickup
      for (let k = g.powerups.length - 1; k >= 0; k--) {
        let pu = g.powerups[k];
        if (dstSq(p.x, p.y, pu.x, pu.y) < (SHIP_R + 15)**2) {
          let typeData = POWERUPS[pu.type.toUpperCase()];
          if (pu.type === "shield") { p.shield = true; p.powerup = "shield"; }
          else { p.powerup = pu.type; p.powerupTime = typeData.dur; p.shield = false; } // Replace shield if getting active PU
          
          g.popups.push({ x: p.x, y: p.y-35, txt: typeData.txt, col: typeData.col, life: 50 });
          for(let i=0; i<20; i++) g.particles.push({ x: pu.x, y: pu.y, vx: rand(-8,8), vy: rand(-8,8), col: typeData.col, life: 30, s: 5 });
          g.powerups.splice(k, 1);
          uiDirty = true;
        }
      }
    }

    // 2. Bullets
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      let b = g.bullets[i];
      b.x += b.vx; b.y += b.vy; b.life--;

      let hitWall = false;
      if (b.x < 0 || b.x > W) { b.vx *= -1; b.x += b.vx; hitWall = true; }
      if (b.y < 0 || b.y > H) { b.vy *= -1; b.y += b.vy; hitWall = true; }

      if (!hitWall) {
        g.walls.forEach(w => {
          if (b.x > w.x && b.x < w.x+w.w && b.y > w.y && b.y < w.y+w.h) {
            hitWall = true;
            let dL = Math.abs(b.x - w.x), dR = Math.abs(b.x - (w.x+w.w));
            let dT = Math.abs(b.y - w.y), dB = Math.abs(b.y - (w.y+w.h));
            let min = Math.min(dL, dR, dT, dB);
            if (min === dL || min === dR) b.vx *= -1; else b.vy *= -1;
            b.x += b.vx; b.y += b.vy;
          }
        });
      }

      if (hitWall) {
        b.bounces--;
        if (b.type === "rail") b.bounces = -1; // Railguns don't bounce
      }

      // Hit Player Check
      let hitPlayer = false;
      for (let j = 0; j < g.players.length; j++) {
        let p = g.players[j];
        if (p.state === "alive" && p.pid !== b.owner && dstSq(b.x, b.y, p.x, p.y) < SHIP_R**2) {
          
          if (p.dashTime > 0) {
            // Deflect
            b.owner = p.pid; b.vx *= -1.1; b.vy *= -1.1; b.col = p.col; b.bounces = 1;
            g.shake = 4;
            g.popups.push({ x: p.x, y: p.y-20, txt: "DEFLECT", col: "#fff", life: 30 });
          } 
          else if (p.shield) {
            // Break Shield
            p.shield = false; p.powerup = "none"; uiDirty = true; hitPlayer = true;
            g.popups.push({ x: p.x, y: p.y-20, txt: "SHIELD BROKE", col: "#06b6d4", life: 40 });
            for(let k=0; k<15; k++) g.particles.push({ x: p.x, y: p.y, vx: rand(-6,6), vy: rand(-6,6), col: "#06b6d4", life: 25, s: 4 });
          }
          else {
            // Kill
            let killer = g.players.find(kp => kp.pid === b.owner);
            killPlayer(g, p, killer);
            uiDirty = true; hitPlayer = true;
          }
          if (b.type !== "rail") break; // Railgun pierces
        }
      }

      if (hitPlayer && b.type !== "rail") b.life = 0;

      if (b.bounces < 0 || b.life <= 0) {
        g.particles.push({ x: b.x, y: b.y, vx: rand(-2,2), vy: rand(-2,2), col: b.col, life: 10, s: 3 });
        g.bullets.splice(i, 1);
      }
    }

    // 3. Ramming (Dash vs Body)
    for (let i = 0; i < g.players.length; i++) {
      for (let j = i + 1; j < g.players.length; j++) {
        let p1 = g.players[i], p2 = g.players[j];
        if (p1.state === "dead" || p2.state === "dead") continue;

        if (dstSq(p1.x, p1.y, p2.x, p2.y) < (SHIP_R * 2)**2) {
          if (p1.dashTime > 0 && p2.dashTime > 0) {
            let nx = p2.x - p1.x, ny = p2.y - p1.y;
            let len = Math.hypot(nx, ny) || 1; nx/=len; ny/=len;
            p1.vx -= nx * 18; p1.vy -= ny * 18; p2.vx += nx * 18; p2.vy += ny * 18;
            g.shake = 12;
            for(let k=0; k<20; k++) g.particles.push({ x: (p1.x+p2.x)/2, y: (p1.y+p2.y)/2, vx: rand(-8,8), vy: rand(-8,8), col: "#fff", life: 20, s: 4 });
          } else if (p1.dashTime > 0) {
            if(p2.shield) { p2.shield=false; p2.powerup="none"; p1.vx*=-1; p1.vy*=-1; uiDirty=true; } else { killPlayer(g, p2, p1); uiDirty = true; }
          } else if (p2.dashTime > 0) {
            if(p1.shield) { p1.shield=false; p1.powerup="none"; p2.vx*=-1; p2.vy*=-1; uiDirty=true; } else { killPlayer(g, p1, p2); uiDirty = true; }
          } else {
            let nx = p2.x - p1.x, ny = p2.y - p1.y;
            let len = Math.hypot(nx, ny) || 1; nx/=len; ny/=len;
            p1.vx -= nx * 5; p1.vy -= ny * 5; p2.vx += nx * 5; p2.vy += ny * 5;
          }
        }
      }
    }

    // Limits & Cleanups
    if (g.particles.length > 250) g.particles.splice(0, g.particles.length - 250);
    for (let i = g.particles.length - 1; i >= 0; i--) {
      let p = g.particles[i]; p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0) g.particles.splice(i, 1);
    }
    for (let i = g.popups.length - 1; i >= 0; i--) {
      let p = g.popups[i]; p.y -= 1.5; p.life--;
      if (p.life <= 0) g.popups.splice(i, 1);
    }
    for (let i = g.powerups.length - 1; i >= 0; i--) {
      let pu = g.powerups[i]; pu.life--;
      if (pu.life <= 0) g.powerups.splice(i, 1);
    }

    // Win Check
    if (highestScore >= config.winScore && !g.winner) {
      g.winner = g.players.find(p => p.score === highestScore);
      g.active = false;
      if (g.winner.type === "human") saveGame({ ...save, credits: save.credits + 300 });
      uiDirty = true;
      setTimeout(() => setScreen("gameover"), 3000);
    } 

    draw(g);
    if (uiDirty || g.frame % 10 === 0) updateUI(g);
    if (g.active) reqRef.current = requestAnimationFrame(loop);
  };

  const killPlayer = (g, victim, killer) => {
    victim.state = "dead";
    victim.respawn = 90; // 1.5 seconds
    if (killer) {
      killer.score += 1;
      if (killer.type === "human") saveGame({ ...save, credits: save.credits + 25 });
      g.popups.push({ x: victim.x, y: victim.y-30, txt: "OBLITERATED!", col: killer.col, life: 50 });
    }
    g.hitstop = 6; g.shake = 18;

    let partLimit = Math.min(40, 250 - g.particles.length);
    for(let k=0; k<partLimit; k++) {
      g.particles.push({ x: victim.x, y: victim.y, vx: rand(-15,15), vy: rand(-15,15), col: k%2===0?victim.col:"#fff", life: rand(30,60), s: rand(4,8) });
    }
  };

  // ─── RENDER ENGINE ───
  const draw = (g) => {
    const ctx = canvasRef.current?.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctx.save();

    if (g.shake > 0) ctx.translate(rand(-g.shake, g.shake), rand(-g.shake, g.shake));

    ctx.fillStyle = "#020617"; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<W; i+=50) { ctx.moveTo(i,0); ctx.lineTo(i,H); }
    for(let i=0; i<H; i+=50) { ctx.moveTo(0,i); ctx.lineTo(W,i); }
    ctx.stroke();

    // Walls
    ctx.fillStyle = "#0f172a"; ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2;
    g.walls.forEach(w => { ctx.fillRect(w.x, w.y, w.w, w.h); ctx.strokeRect(w.x, w.y, w.w, w.h); });

    // Powerups
    g.powerups.forEach(pu => {
      let c = POWERUPS[pu.type.toUpperCase()].col;
      ctx.shadowBlur = 15; ctx.shadowColor = c; ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(pu.x, pu.y, 14 + Math.sin(g.frame/5)*3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(pu.x, pu.y, 6, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Particles
    g.particles.forEach(p => {
      ctx.fillStyle = p.col; ctx.globalAlpha = p.life/50;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    });

    // Bullets
    ctx.globalAlpha = 1.0;
    g.bullets.forEach(b => {
      ctx.fillStyle = "#fff"; 
      if (b.type === "rail") {
        ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
        ctx.shadowBlur = 15; ctx.shadowColor = b.col;
        ctx.fillRect(-20, -3, 40, 6); ctx.fillStyle = b.col; ctx.fillRect(-15, -1, 30, 2);
        ctx.shadowBlur = 0;
        ctx.rotate(-Math.atan2(b.vy, b.vx)); ctx.translate(-b.x, -b.y);
      } else {
        ctx.shadowBlur = 10; ctx.shadowColor = b.col;
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Players
    g.players.forEach(p => {
      if (p.state === "dead") return;
      
      ctx.save();
      ctx.translate(p.x, p.y);
      
      // Shield Aura
      if (p.shield) {
        ctx.shadowBlur = 15; ctx.shadowColor = "#06b6d4";
        ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, SHIP_R + 12 + Math.sin(g.frame/4)*2, 0, Math.PI*2); ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.rotate(p.angle);

      // Dash Aura
      if (p.dashTime > 0) {
        ctx.shadowBlur = 20; ctx.shadowColor = p.col;
        ctx.fillStyle = p.col; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(-15, 20); ctx.lineTo(-15, -20); ctx.fill();
        ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;
      }

      // Ship Polygon
      ctx.beginPath();
      ctx.moveTo(24, 0); ctx.lineTo(-14, 18); ctx.lineTo(-8, 0); ctx.lineTo(-14, -18);
      ctx.closePath();
      
      ctx.fillStyle = "#020617"; ctx.fill();
      ctx.strokeStyle = p.col; ctx.lineWidth = 3; ctx.stroke();
      
      // Center Core
      if (p.powerup !== "none" && p.powerup !== "shield") {
        ctx.fillStyle = POWERUPS[p.powerup.toUpperCase()].col;
        ctx.shadowBlur = 15; ctx.shadowColor = ctx.fillStyle;
      } else {
        ctx.fillStyle = p.col; ctx.shadowBlur = 0;
      }
      ctx.beginPath(); ctx.arc(-2, 0, 5, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      // Names
      ctx.fillStyle = p.type === "bot" ? "#ef4444" : "#fff";
      ctx.font = "bold 12px monospace"; ctx.textAlign = "center";
      ctx.fillText(p.type === "human" ? `P${p.id}` : p.id, p.x, p.y - 35);
    });

    // Popups
    g.popups.forEach(p => {
      ctx.fillStyle = p.col; ctx.font = "900 24px monospace"; ctx.textAlign = "center";
      ctx.globalAlpha = p.life/50;
      ctx.fillText(p.txt, p.x, p.y);
    });
    
    ctx.restore();
  };

  // ─── SHOP ───
  const buy = (type, id, cost) => {
    if (save.credits >= cost) {
      const ns = { ...save, credits: save.credits - cost };
      if (type === "chassis") ns.ownedChassis.push(id);
      if (type === "engine") ns.ownedEngines.push(id);
      saveGame(ns);
    }
  };
  const equip = (pid, type, id) => {
    const ns = { ...save }; ns.equip[`p${pid}`][type] = id; saveGame(ns);
  };

  // ─── UI RENDER ───
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#020617", color: "#f8fafc", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>
      
      {/* ── MENU ── */}
      {screen === "menu" && (
        <div style={card}>
          <h1 style={{ fontSize: "5rem", fontWeight: "900", margin: "0 0 5px 0", fontStyle: "italic", textAlign: "center", color: "#f8fafc", textShadow: "0 0 30px rgba(255,255,255,0.4)" }}>
            STAR-CLASH <span style={{ color: "#3b82f6" }}>NEXUS</span>
          </h1>
          <p style={{ textAlign: "center", color: "#64748b", marginBottom: 30, fontSize: "1.2rem", letterSpacing: "3px" }}>MANUAL FIRE BRAWLER</p>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <Scard label="HUMANS (Controls)">
              <div style={{fontSize:"0.75rem", color:"#94a3b8", marginBottom:10}}>
                P1: WASD+Space (Dash:L.Shift)<br/>
                P2: Arrows+Enter (Dash:R.Shift)<br/>
                P3: IJKL+P (Dash:O)<br/>
                P4: TFGH+Y (Dash:R)
              </div>
              <Brow items={[1,2,3,4]} val={config.humans} col="#3b82f6" set={(v)=>setConfig({...config, humans: v})} />
            </Scard>
            <Scard label="AI BOTS">
              <div style={{fontSize:"0.75rem", color:"#94a3b8", marginBottom:10}}>Select the number of AI enemies.</div>
              <Brow items={[0,1,2,3,4]} val={config.bots} col="#ef4444" set={(v)=>setConfig({...config, bots: v})} />
            </Scard>
          </div>

          <Scard label="SECTOR SELECT">
            <div style={{ display: "flex", gap: 8 }}>
              {ARENAS.map(a => <button key={a.id} onClick={()=>setConfig({...config, arena: a.id})} style={{...btn(config.arena===a.id, "#facc15"), flex:1}}>{a.name}</button>)}
            </div>
          </Scard>

          <div style={{ display: "flex", gap: 15, marginTop: 25 }}>
            <button onClick={startMatch} style={{ ...mainBtn, background: "#3b82f6", color: "#000" }}>DEPLOY SQUADRON</button>
            <button onClick={() => setScreen("shop")} style={{ ...mainBtn, background: "#0f172a", border: "2px solid #facc15", color: "#facc15" }}>ARMORY (💳 {save.credits})</button>
          </div>
        </div>
      )}

      {/* ── SHOP ── */}
      {screen === "shop" && (
        <div style={{...card, width: 900}}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: "2.5rem", margin: 0, color: "#facc15" }}>BLACK MARKET</h2>
            <div style={{ fontSize: "1.5rem", color: "#3b82f6", fontWeight: "900" }}>💳 {save.credits} CREDITS</div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {["chassis", "engines"].map(t => (
              <button key={t} onClick={()=>setShopTab(t)} style={{...btn(shopTab===t, "#facc15"), padding: "10px 30px", textTransform: "uppercase"}}>{t}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 15, minHeight: 350 }}>
            {(shopTab === "chassis" ? CHASSIS : ENGINES).map(item => {
              const owned = shopTab==="chassis" ? save.ownedChassis.includes(item.id) : save.ownedEngines.includes(item.id);
              return (
                <div style={{ background: "#0f172a", padding: 20, borderRadius: 12, textAlign: "center", border: `2px solid ${item.hex || item.col || '#334155'}` }} key={item.id}>
                  <div style={{ fontWeight: "900", marginBottom: 20, fontSize: 18 }}>{item.name}</div>
                  {!owned ? (
                    <button onClick={()=>buy(shopTab==="chassis"?"chassis":"engine", item.id, item.cost)} disabled={save.credits < item.cost} style={{...smallBtn, opacity: save.credits<item.cost?0.3:1}}>BUY {item.cost}💳</button>
                  ) : (
                    <div style={{ display: "flex", gap: 5 }}>
                      {[1,2,3,4].map(p=>(
                        <button key={p} onClick={()=>equip(p, shopTab==="chassis"?"chassis":"engine", item.id)} style={{...smallBtn, padding: "8px 5px", flex: 1, background: save.equip[`p${p}`][shopTab==="chassis"?"chassis":"engine"]===item.id?"#facc15":"#1e293b", color: save.equip[`p${p}`][shopTab==="chassis"?"chassis":"engine"]===item.id?"#000":"#fff"}}>P{p}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={() => setScreen("menu")} style={{...mainBtn, background: "#1e293b", marginTop: 20}}>RETURN TO BASE</button>
        </div>
      )}

      {/* ── GAME CANVAS & HUD ── */}
      <div style={{ display: screen === "playing" ? "block" : "none" }}>
        
        {/* HUD */}
        <div style={{ display: "flex", gap: 15, marginBottom: 15, justifyContent: "center" }}>
          {uiSnap.players.map(p => (
            <div key={p.pid} style={{ width: 220, background: "#0f172a", borderTop: `4px solid ${p.col}`, padding: "12px 20px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: p.state === "dead" ? 0.3 : 1 }}>
              <div>
                <div style={{ fontWeight: "900", color: p.type==="bot" ? "#ef4444" : "#fff", fontSize: "1.1rem" }}>{p.type==='human' ? `P${p.id}` : p.id}</div>
                {p.pu !== "none" && <div style={{ fontSize: "0.75rem", color: POWERUPS[p.pu.toUpperCase()]?.col, fontWeight: "bold" }}>{POWERUPS[p.pu.toUpperCase()]?.txt}</div>}
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: "900", color: p.col, textShadow: p.shield ? `0 0 10px #22d3ee` : "none" }}>{p.score}</div>
            </div>
          ))}
        </div>

        <canvas ref={canvasRef} width={W} height={H} style={{ background: "#020617", borderRadius: 12, boxShadow: "0 0 60px rgba(59, 130, 246, 0.15)", border: "1px solid #1e293b" }} />
        
        <div style={{ textAlign: "center", color: "#64748b", fontWeight: "bold", marginTop: 15 }}>
          FIRST TO {config.winScore} KILLS &nbsp;|&nbsp; PRESS YOUR FIRE KEY TO SHOOT &nbsp;|&nbsp; DASH TO DEFLECT BULLETS
        </div>
      </div>

      {/* ── GAMEOVER ── */}
      {screen === "gameover" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(2, 6, 23, 0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <h2 style={{ fontSize: "8rem", color: gs.current.winner?.col, margin: 0, fontWeight: "900", fontStyle: "italic", textShadow: `0 0 60px ${gs.current.winner?.col}` }}>
            VICTORY
          </h2>
          <p style={{ fontSize: "2rem", color: "#fff", marginBottom: 10 }}>{gs.current.winner?.type === 'human' ? `PLAYER ${gs.current.winner.id}` : gs.current.winner?.id} owns the arena!</p>
          <p style={{ fontSize: "1.5rem", color: "#facc15", marginBottom: 40 }}>+300 Credits</p>
          
          <div style={{ display: "flex", gap: 20 }}>
            <button onClick={startMatch} style={{ ...mainBtn, background: "#3b82f6", color: "#000", padding: "20px 40px" }}>REMATCH</button>
            <button onClick={() => setScreen("menu")} style={{...mainBtn, background: "#1e293b", padding: "20px 40px"}}>EXIT TO MENU</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── UI COMPONENTS ─────────────────────────────────────────
function Scard({label, children, style={}}) {
  return (
    <div style={{background:"#0f172a", padding:"20px", borderRadius:12, border:"1px solid #1e293b", ...style}}>
      <div style={{fontWeight:900, color:"#64748b", fontSize:"0.8rem", letterSpacing:"2px", marginBottom:10}}>{label}</div>
      {children}
    </div>
  );
}

function Brow({items, val, col, set}) {
  return (
    <div style={{display:"flex", gap:8}}>
      {items.map(v=>(
        <button key={v} onClick={()=>set(v)} style={{
          flex:1, padding:"12px 0", border:"none", borderRadius:8, fontWeight:900, cursor:"pointer", fontSize:"1rem",
          background: val===v ? col : "#1e293b", color: val===v ? "#000" : "#cbd5e1", transition:"0.1s"
        }}>{v}</button>
      ))}
    </div>
  );
}

const card = { background: "#020617", border: "1px solid #1e293b", padding: "50px", borderRadius: "20px", width: 850, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)" };
const btn = (active, col) => ({ background: active ? col : "#1e293b", color: active ? "#000" : "#cbd5e1", border: "none", padding: "12px", borderRadius: 8, fontWeight: "900", cursor: "pointer", transition: "0.1s" });
const mainBtn = { flex: 1, padding: "20px", border: "none", borderRadius: 8, fontSize: "1.2rem", fontWeight: "900", cursor: "pointer", textTransform: "uppercase" };
const smallBtn = { width: "100%", padding: "12px", background: "#facc15", color: "#000", border: "none", borderRadius: 6, fontWeight: "900", cursor: "pointer" };