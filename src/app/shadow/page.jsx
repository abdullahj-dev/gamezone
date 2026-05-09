'use client';

import React, { useState, useRef, useEffect } from "react";

// --- SKILL POOL ---
const SKILL_POOL = [
  { id: 'scythe', name: 'Void Scythe', desc: 'Summons rotating blades. Stacks increase blade count.', maxLv: 5, color: '#d500f9' },
  { id: 'tentacle', name: 'Abyssal Whip', desc: 'Lashes at nearby enemies. Stacks reduce cooldown.', maxLv: 5, color: '#00e5ff' },
  { id: 'swarm', name: 'Phantom Swarm', desc: 'Defeated enemies spawn homing shadows. Stacks increase count.', maxLv: 5, color: '#b388ff' },
  { id: 'aegis', name: 'Aegis Field', desc: 'Aura destroys enemy projectiles occasionally. Stacks increase chance.', maxLv: 3, color: '#76ff03' },
  { id: 'nova', name: 'Supernova', desc: 'Releases a massive energy pulse periodically.', maxLv: 5, color: '#ffea00' },
  { id: 'chronos', name: 'Chronos Shift', desc: 'Periodically slows all enemies drastically.', maxLv: 3, color: '#2979ff' },
  { id: 'reach', name: 'Dark Expanse', desc: 'Increases Aura size by 15%.', maxLv: 5, color: '#651fff' },
  { id: 'rot', name: 'Decay', desc: 'Increases Aura damage output by 20%.', maxLv: 5, color: '#f50057' }
];

export default function ShadowEclipse() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  // Dynamic screen dimensions
  const [dim, setDim] = useState({ w: 1000, h: 700 });
  const keys = useRef({});
  
  // UI & Meta State
  const [screen, setScreen] = useState("menu"); 
  const [meta, setMeta] = useState({ shards: 0, upgHp: 0, upgSpeed: 0, upgAura: 0, upgDmg: 0, upgHarvest: 0, upgMagnet: 0 });
  const [ui, setUi] = useState({ hp: 100, maxHp: 100, souls: 0, maxSouls: 40, kills: 0, wave: 1, bossActive: false, level: 1 });
  const [choices, setChoices] = useState([]);
  
  // Core Game State (Persists across renders without triggering them)
  const gs = useRef(null);

  // Initialize Window & Keys
  useEffect(() => {
    const handleResize = () => setDim({ w: window.innerWidth, h: window.innerHeight });
    handleResize();
    window.addEventListener("resize", handleResize);

    const saved = localStorage.getItem("shadowEclipseMeta");
    if (saved) setMeta(JSON.parse(saved));
    
    const onKd = (e) => { keys.current[e.key.toLowerCase()] = true; };
    const onKu = (e) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", onKd);
    window.addEventListener("keyup", onKu);
    
    return () => { 
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", onKd); 
      window.removeEventListener("keyup", onKu); 
    };
  }, []);

  const saveMeta = (newMeta) => {
    setMeta(newMeta);
    localStorage.setItem("shadowEclipseMeta", JSON.stringify(newMeta));
  };

  // --- ENGINE INITIALIZATION ---
  const initGame = () => {
    gs.current = {
      player: {
        x: 0, y: 0, // World coordinates
        hp: 100 + (meta.upgHp * 25), maxHp: 100 + (meta.upgHp * 25),
        souls: meta.upgMagnet * 10, maxSouls: 30, level: 1,
        scale: 1, baseSpeed: 4.5 + (meta.upgSpeed * 0.4),
        auraRadius: 80 + (meta.upgAura * 15), auraDamage: 1.0 + (meta.upgDmg * 0.2),
        eclipseTimer: 0, spacePressed: false,
        skills: { scythe: 0, tentacle: 0, swarm: 0, aegis: 0, nova: 0, chronos: 0, reach: 0, rot: 0 }
      },
      enemies: [], projectiles: [], particles: [], floatTexts: [],
      wave: 1, frameCount: 0, totalKills: 0,
      bossActive: false, bossHp: 0, bossMaxHp: 0,
      state: "playing",
      globalSlow: 0 // For Chronos skill
    };
    setScreen("playing");
  };

  // --- UPDATE LOGIC ---
  const updateEngine = () => {
    const state = gs.current;
    if (state.state !== "playing") return;
    const p = state.player;
    state.frameCount++;

    // 1. Meta / Difficulty Directors
    if (state.globalSlow > 0) state.globalSlow--;

    if (state.frameCount % 1800 === 0 && !state.bossActive) { // ~30 seconds per wave
      state.wave++;
      if (state.wave % 5 === 0) {
        state.bossActive = true;
        state.bossMaxHp = 1500 * (state.wave / 5);
        state.bossHp = state.bossMaxHp;
        // Boss spawns slightly above player
        state.enemies.push({ x: p.x, y: p.y - dim.h*0.6, hp: state.bossMaxHp, maxHp: state.bossMaxHp, type: 'boss', state: 'enter', timer: 0, size: 60 });
      }
    }

    // 2. Player Movement & Eclipse Logic
    const spaceKey = keys.current[' '] || keys.current['space'];
    let currentSpeed = p.baseSpeed;
    let currentAura = p.auraRadius * (1 + (p.skills.reach * 0.15));

    if (p.eclipseTimer > 0) {
      p.eclipseTimer--;
      currentSpeed *= 1.6;
      currentAura *= 3;
      p.scale = 2.5;
    } else {
      const growth = Math.min(p.souls / p.maxSouls, 1);
      p.scale = 1 + (growth * 1.5);
      currentSpeed /= (p.scale * 0.85); // Mass slows you down
      currentAura *= p.scale;

      // TRIGGER ECLIPSE
      if (spaceKey && !p.spacePressed && p.souls >= p.maxSouls) {
        p.eclipseTimer = 400; // ~6.5s God Mode
        p.souls = 0;
        p.maxSouls = Math.floor(p.maxSouls * 1.35);
        state.particles.push({ x: p.x, y: p.y, r: 20, maxR: dim.w, life: 1, maxLife: 60, type: 'blast', color: '#00e5ff' });
        
        state.state = "harvest"; // Pause physical updates
        const available = SKILL_POOL.filter(s => (p.skills[s.id] || 0) < s.maxLv);
        const shuffled = [...available].sort(() => 0.5 - Math.random());
        setChoices(shuffled.slice(0, 3));
        setScreen("harvest"); // Show UI
        return; 
      }
    }
    p.spacePressed = spaceKey;

    let dx = 0, dy = 0;
    if (keys.current['w'] || keys.current['arrowup']) dy -= 1;
    if (keys.current['s'] || keys.current['arrowdown']) dy += 1;
    if (keys.current['a'] || keys.current['arrowleft']) dx -= 1;
    if (keys.current['d'] || keys.current['arrowright']) dx += 1;
    if (dx !== 0 && dy !== 0) { const len = Math.hypot(dx, dy); dx /= len; dy /= len; }
    
    p.x += dx * currentSpeed;
    p.y += dy * currentSpeed;

    // 3. Enemy Spawning (Outside Camera View)
    if (!state.bossActive && state.frameCount % Math.max(12, 50 - state.wave * 2) === 0) {
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(dim.w, dim.h) * 0.6; 
      const ex = p.x + Math.cos(angle) * spawnDist;
      const ey = p.y + Math.sin(angle) * spawnDist;
      
      let type = 'grunt';
      const r = Math.random();
      if (state.wave >= 2 && r < 0.25) type = 'phantom';
      if (state.wave >= 3 && r < 0.45) type = 'weaver';
      if (state.wave >= 4 && r < 0.60) type = 'stalker';
      if (state.wave >= 6 && r < 0.70) type = 'sniper';
      if (state.wave >= 7 && r < 0.80) type = 'brute';

      const stats = {
        grunt:   { hp: 15 * state.wave, speed: 2.0, size: 14 },
        phantom: { hp: 10 * state.wave, speed: 2.8, size: 12 },
        weaver:  { hp: 20 * state.wave, speed: 1.2, size: 16 },
        stalker: { hp: 15 * state.wave, speed: 1.0, size: 14, timer: 0 },
        sniper:  { hp: 12 * state.wave, speed: 0.8, size: 16, timer: 0 },
        brute:   { hp: 120 * state.wave, speed: 0.6, size: 28 }
      };
      state.enemies.push({ x: ex, y: ey, type, ...stats[type] });
    }

    // --- SKILL ACTIVATIONS ---
    // Chronos
    if (p.skills.chronos > 0 && state.frameCount % (600 - p.skills.chronos * 100) === 0) {
      state.globalSlow = 180; // 3 seconds
      state.particles.push({ x: p.x, y: p.y, r: 10, maxR: dim.w, life: 1, maxLife: 40, type: 'blast', color: '#2979ff' });
    }
    // Nova
    if (p.skills.nova > 0 && state.frameCount % (300 - p.skills.nova * 30) === 0) {
      state.particles.push({ x: p.x, y: p.y, r: 10, maxR: currentAura * 2.5, life: 1, maxLife: 30, type: 'nova', dmg: 50 * p.skills.nova });
    }

    // 4. Enemy AI & Collision
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      let e = state.enemies[i];
      const dist = Math.hypot(p.x - e.x, p.y - e.y);
      const angleToPlayer = Math.atan2(p.y - e.y, p.x - e.x);
      const moveMult = state.globalSlow > 0 ? 0.2 : 1;

      // AI
      if (e.type === 'grunt' || e.type === 'phantom' || e.type === 'brute') {
        e.x += Math.cos(angleToPlayer) * e.speed * moveMult;
        e.y += Math.sin(angleToPlayer) * e.speed * moveMult;
      } 
      else if (e.type === 'weaver') {
        if (dist > 350) { e.x += Math.cos(angleToPlayer) * e.speed * moveMult; e.y += Math.sin(angleToPlayer) * e.speed * moveMult; }
        else if (dist < 250) { e.x -= Math.cos(angleToPlayer) * e.speed * moveMult; e.y -= Math.sin(angleToPlayer) * e.speed * moveMult; }
        if (state.frameCount % 100 === 0 && state.globalSlow <= 0) {
          state.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(angleToPlayer)*6, vy: Math.sin(angleToPlayer)*6, isEnemy: true, type: 'orb' });
        }
      } 
      else if (e.type === 'stalker') {
        e.timer += moveMult;
        if (e.timer < 90) { e.x += Math.cos(angleToPlayer)*0.8*moveMult; e.y += Math.sin(angleToPlayer)*0.8*moveMult; }
        else if (e.timer >= 90 && e.timer < 91) { e.vx = Math.cos(angleToPlayer)*18; e.vy = Math.sin(angleToPlayer)*18; }
        else if (e.timer < 110) { e.x += e.vx*moveMult; e.y += e.vy*moveMult; }
        else { e.timer = 0; }
      } 
      else if (e.type === 'sniper') {
        if (dist > 500) { e.x += Math.cos(angleToPlayer) * e.speed * moveMult; e.y += Math.sin(angleToPlayer) * e.speed * moveMult; }
        e.timer += moveMult;
        if (e.timer > 150 && state.globalSlow <= 0) {
          state.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(angleToPlayer)*12, vy: Math.sin(angleToPlayer)*12, isEnemy: true, type: 'laser' });
          e.timer = 0;
        }
      }
      else if (e.type === 'boss') {
        e.timer += moveMult;
        e.x += Math.cos(state.frameCount * 0.01) * 2 * moveMult;
        e.y += Math.sin(state.frameCount * 0.005) * 1 * moveMult;
        
        if (e.timer > 80 && state.globalSlow <= 0) {
            for(let j=0; j<12; j++) {
                const a = (j/12) * Math.PI*2 + (e.timer * 0.1);
                state.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(a)*5, vy: Math.sin(a)*5, isEnemy: true, type: 'orb' });
            }
            e.timer = 0;
        }
        state.bossHp = e.hp;
      }

      // Despawn if too far (Optimization)
      if (dist > dim.w * 1.5) { state.enemies.splice(i, 1); continue; }

      let damageTaken = 0;

      // Aura Damage
      if (dist < currentAura + e.size) {
        let dmg = p.auraDamage * (1 + (p.skills.rot * 0.25));
        if (p.eclipseTimer > 0) dmg *= 6; // Eclipse Melts heavily
        e.hp -= dmg;
        damageTaken += dmg;
        
        // Pushback
        if (e.type !== 'boss' && e.type !== 'brute') {
           e.x -= Math.cos(angleToPlayer) * 0.8; e.y -= Math.sin(angleToPlayer) * 0.8;
        }
      }

      // Scythe Skill
      if (p.skills.scythe > 0) {
        for (let s = 0; s < p.skills.scythe + 1; s++) {
          const sAngle = (state.frameCount * 0.06) + (s * (Math.PI * 2 / (p.skills.scythe + 1)));
          const sx = p.x + Math.cos(sAngle) * (currentAura + 15);
          const sy = p.y + Math.sin(sAngle) * (currentAura + 15);
          if (Math.hypot(sx - e.x, sy - e.y) < e.size + 20) {
            e.hp -= 6; damageTaken += 6;
            if(state.frameCount%5===0) state.particles.push({x: sx, y: sy, r: 3, life: 1, maxLife: 10, type: 'spark', color: '#d500f9'});
          }
        }
      }

      // Floating Numbers
      if (damageTaken > 15 && state.frameCount % 8 === 0) {
        state.floatTexts.push({ x: e.x, y: e.y - 20, text: Math.floor(damageTaken).toString(), life: 30, color: '#ff1744' });
      }

      // Player taking damage (Collision)
      if (dist < 12 * p.scale + e.size && p.eclipseTimer <= 0) {
        p.hp -= (e.type === 'boss' ? 5 : (e.type === 'brute' ? 3 : 0.5));
        if (e.type === 'grunt' || e.type === 'phantom') e.hp = 0; // Small ones pop
      }

      // Death Processing
      if (e.hp <= 0) {
        state.totalKills++;
        if (p.eclipseTimer <= 0 && e.type !== 'boss') {
          p.souls = Math.min(p.maxSouls, p.souls + (e.type === 'brute' ? 6 : 1));
        }
        state.particles.push({ x: e.x, y: e.y, r: e.size, life: 1, maxLife: 25, type: 'death' });

        // Spawn Swarm
        if (p.skills.swarm > 0) {
          for(let k=0; k<p.skills.swarm; k++) {
            state.projectiles.push({ x: e.x, y: e.y, target: null, life: 200, isEnemy: false, dmg: 35 });
          }
        }

        if (e.type === 'boss') {
          state.bossActive = false;
          state.particles.push({ x: e.x, y: e.y, r: 60, maxR: 1200, life: 1, maxLife: 80, type: 'blast', color: '#ff1744' });
          p.hp = Math.min(p.maxHp, p.hp + 60); // Heal
          state.totalKills += 100; // Boss kill bonus
        }
        state.enemies.splice(i, 1);
      }
    }

    // 5. Skill: Whip (Tentacle)
    if (p.skills.tentacle > 0 && state.frameCount % Math.max(12, 50 - (p.skills.tentacle * 8)) === 0) {
      const target = state.enemies.find(e => Math.hypot(e.x - p.x, e.y - p.y) < dim.w*0.4);
      if (target) {
        target.hp -= 50;
        state.floatTexts.push({ x: target.x, y: target.y, text: "50", life: 30, color: '#00e5ff' });
        state.particles.push({ x: p.x, y: p.y, tx: target.x, ty: target.y, life: 1, maxLife: 15, type: 'whip' });
      }
    }

    // 6. Projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      let proj = state.projectiles[i];
      if (proj.isEnemy) {
        let inAura = Math.hypot(p.x - proj.x, p.y - proj.y) < currentAura;
        let pSpeed = inAura ? 0.35 : (state.globalSlow > 0 ? 0.2 : 1); 

        // Aegis Field destroys bullets in aura
        if (inAura && p.skills.aegis > 0 && Math.random() < (p.skills.aegis * 0.25)) {
           state.particles.push({ x: proj.x, y: proj.y, r: 6, life: 1, maxLife: 15, type: 'spark', color: '#76ff03' });
           state.projectiles.splice(i, 1);
           continue;
        }

        proj.x += proj.vx * pSpeed; 
        proj.y += proj.vy * pSpeed;

        if (p.eclipseTimer <= 0 && Math.hypot(p.x - proj.x, p.y - proj.y) < 12 * p.scale) {
          p.hp -= (proj.type === 'laser' ? 25 : 12);
          state.projectiles.splice(i, 1);
        } else if (Math.hypot(p.x - proj.x, p.y - proj.y) > dim.w) {
          state.projectiles.splice(i, 1); // Clean up far bullets
        }
      } else {
        // Homing Swarm
        proj.life--;
        if (!proj.target || proj.target.hp <= 0) {
          let closest = null, minDist = Infinity;
          state.enemies.forEach(e => {
            let d = Math.hypot(e.x - proj.x, e.y - proj.y);
            if(d < minDist) { minDist = d; closest = e; }
          });
          proj.target = closest;
        }

        if (proj.target) {
          const a = Math.atan2(proj.target.y - proj.y, proj.target.x - proj.x);
          proj.x += Math.cos(a) * 10; proj.y += Math.sin(a) * 10;
          if (Math.hypot(proj.target.x - proj.x, proj.target.y - proj.y) < proj.target.size + 15) {
            proj.target.hp -= proj.dmg;
            state.particles.push({ x: proj.x, y: proj.y, r: 15, life: 1, maxLife: 15, type: 'death' });
            state.projectiles.splice(i, 1);
          }
        } else {
          proj.y -= 8; 
        }
        if (proj.life <= 0) state.projectiles.splice(i, 1);
      }
    }

    // 7. Process Nova Particle Collision
    state.particles.forEach(pt => {
        if (pt.type === 'nova') {
            const currentR = pt.r + (pt.maxR * (pt.life / pt.maxLife));
            state.enemies.forEach(e => {
                if (Math.hypot(p.x - e.x, p.y - e.y) < currentR && Math.hypot(p.x - e.x, p.y - e.y) > currentR - 30) {
                    e.hp -= pt.dmg * 0.1; // Deals tick damage as it passes
                }
            });
        }
    });

    // 8. Cleanup Arrays
    state.particles = state.particles.filter(pt => pt.life++ < pt.maxLife);
    state.floatTexts = state.floatTexts.filter(ft => ft.life-- > 0);

    // Death
    if (p.hp <= 0) {
      state.state = "dead";
      const shardsEarned = Math.floor(state.totalKills / 4) * (1 + (meta.upgHarvest * 0.2));
      saveMeta({ ...meta, shards: meta.shards + Math.floor(shardsEarned) });
      setScreen("dead");
    }
  };

  // --- RENDER LOGIC ---
  const renderEngine = (ctx) => {
    const state = gs.current;
    if (!state) return;
    const p = state.player;

    // CAMERA LOGIC: Center on player
    const camX = p.x - dim.w / 2;
    const camY = p.y - dim.h / 2;

    // Background Layer
    ctx.fillStyle = state.bossActive ? "#0d0000" : "#020104";
    ctx.fillRect(0, 0, dim.w, dim.h);

    ctx.save();
    // Screen Shake
    if (state.bossActive && state.state === "playing") {
      ctx.translate((Math.random()-0.5)*4, (Math.random()-0.5)*4);
    }
    
    // Move world inverse to camera
    ctx.translate(-camX, -camY);

    // Grid (Infinite)
    ctx.strokeStyle = state.bossActive ? "rgba(100, 0, 0, 0.15)" : "rgba(30, 15, 60, 0.25)";
    ctx.lineWidth = 1;
    const startX = Math.floor(camX / 50) * 50;
    const startY = Math.floor(camY / 50) * 50;
    for(let i = startX; i < camX + dim.w + 50; i+=50) { ctx.beginPath(); ctx.moveTo(i, camY); ctx.lineTo(i, camY + dim.h); ctx.stroke(); }
    for(let i = startY; i < camY + dim.h + 50; i+=50) { ctx.beginPath(); ctx.moveTo(camX, i); ctx.lineTo(camX + dim.w, i); ctx.stroke(); }

    // Render Aura
    const currentAura = p.eclipseTimer > 0 ? p.auraRadius * 3 : p.auraRadius * p.scale * (1 + (p.skills.reach * 0.15));
    const auraColor = p.eclipseTimer > 0 ? "0, 229, 255" : "156, 39, 176";
    const gradient = ctx.createRadialGradient(p.x, p.y, currentAura * 0.1, p.x, p.y, currentAura);
    gradient.addColorStop(0, `rgba(${auraColor}, ${p.eclipseTimer > 0 ? 0.35 : 0.15})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(p.x, p.y, currentAura, 0, Math.PI * 2); ctx.fill();

    // Scythe Visuals
    if (p.skills.scythe > 0) {
      ctx.strokeStyle = '#d500f9'; ctx.lineWidth = 3;
      for (let s = 0; s < p.skills.scythe + 1; s++) {
        const sAngle = (state.frameCount * 0.06) + (s * (Math.PI * 2 / (p.skills.scythe + 1)));
        const sx = p.x + Math.cos(sAngle) * (currentAura + 15);
        const sy = p.y + Math.sin(sAngle) * (currentAura + 15);
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI*2); ctx.stroke();
      }
    }

    // Enemies
    state.enemies.forEach(e => {
      // Don't render if completely offscreen
      if (e.x < camX - 100 || e.x > camX + dim.w + 100 || e.y < camY - 100 || e.y > camY + dim.h + 100) return;

      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.type === 'boss') ctx.rotate(state.frameCount * 0.02);
      else ctx.rotate(Math.atan2(p.y - e.y, p.x - e.x));

      ctx.shadowBlur = 10;
      if (e.type === 'grunt') {
        ctx.fillStyle = '#ff1744'; ctx.shadowColor = '#ff1744';
        ctx.beginPath(); ctx.moveTo(e.size, 0); ctx.lineTo(-e.size, e.size*0.8); ctx.lineTo(-e.size*0.5, 0); ctx.lineTo(-e.size, -e.size*0.8); ctx.fill();
      } else if (e.type === 'phantom') {
        ctx.fillStyle = `rgba(100, 255, 218, ${0.2 + Math.abs(Math.sin(state.frameCount*0.1))*0.6})`;
        ctx.beginPath(); ctx.arc(0, 0, e.size, 0, Math.PI*2); ctx.fill();
      } else if (e.type === 'weaver') {
        ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = 3; ctx.shadowColor = '#ffeb3b';
        ctx.beginPath(); ctx.moveTo(e.size, 0); ctx.lineTo(0, e.size); ctx.lineTo(-e.size, 0); ctx.lineTo(0, -e.size); ctx.closePath(); ctx.stroke();
      } else if (e.type === 'stalker') {
        ctx.fillStyle = e.timer > 80 ? "#fff" : '#ff9100'; ctx.shadowColor = '#ff9100';
        ctx.beginPath(); ctx.moveTo(e.size*1.5, 0); ctx.lineTo(-e.size, e.size*0.5); ctx.lineTo(-e.size, -e.size*0.5); ctx.fill();
      } else if (e.type === 'sniper') {
        ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2; ctx.shadowColor = '#00e5ff';
        ctx.beginPath(); ctx.moveTo(e.size, 0); ctx.lineTo(-e.size, e.size); ctx.lineTo(-e.size*0.5, 0); ctx.lineTo(-e.size, -e.size); ctx.closePath(); ctx.stroke();
        // Laser sight
        if (e.timer > 50 && state.globalSlow <= 0) {
            ctx.strokeStyle = `rgba(0, 229, 255, ${(e.timer-50)/100})`;
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(e.size, 0); ctx.lineTo(1000, 0); ctx.stroke();
        }
      } else if (e.type === 'brute') {
        ctx.fillStyle = '#d32f2f'; ctx.shadowColor = '#d32f2f';
        ctx.fillRect(-e.size, -e.size, e.size*2, e.size*2);
      } else if (e.type === 'boss') {
        ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 6; ctx.fillStyle = "#1a0000"; ctx.shadowColor = '#ff1744';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i/10) * Math.PI*2; ctx.lineTo(Math.cos(a)*e.size, Math.sin(a)*e.size);
          const a2 = ((i+0.5)/10) * Math.PI*2; ctx.lineTo(Math.cos(a2)*(e.size*0.4), Math.sin(a2)*(e.size*0.4));
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    });

    // Player
    ctx.shadowBlur = 20; ctx.shadowColor = p.eclipseTimer > 0 ? "#00e5ff" : "#9c27b0";
    ctx.fillStyle = p.eclipseTimer > 0 ? "#fff" : "#000";
    ctx.strokeStyle = p.eclipseTimer > 0 ? "#00e5ff" : "#9c27b0";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 14 * p.scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    if (p.eclipseTimer <= 0) {
      const corePulse = Math.floor((p.souls / p.maxSouls) * 255);
      ctx.fillStyle = `rgb(${corePulse}, ${corePulse/3}, 255)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6 * p.scale, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Projectiles
    state.projectiles.forEach(proj => {
      ctx.fillStyle = proj.isEnemy ? (proj.type === 'laser' ? '#00e5ff' : '#ffeb3b') : "#b388ff";
      ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.isEnemy ? (proj.type === 'laser' ? 4 : 6) : 7, 0, Math.PI * 2); ctx.fill();
    });

    // Particles
    state.particles.forEach(pt => {
      const progress = pt.life / pt.maxLife;
      if (pt.type === 'death') {
        ctx.fillStyle = `rgba(156, 39, 176, ${1 - progress})`;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r + (progress*20), 0, Math.PI * 2); ctx.fill();
      } else if (pt.type === 'blast' || pt.type === 'nova') {
        ctx.strokeStyle = `rgba(${pt.color === '#ff1744' ? '255,23,68' : (pt.color === '#2979ff' ? '41,121,255' : (pt.type==='nova' ? '255,234,0' : '0,229,255'))}, ${1 - progress})`;
        ctx.lineWidth = pt.type === 'nova' ? 8 * (1 - progress) : 20 * (1 - progress);
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r + (pt.maxR * progress), 0, Math.PI * 2); ctx.stroke();
      } else if (pt.type === 'whip') {
        ctx.strokeStyle = `rgba(0, 229, 255, ${1 - progress})`;
        ctx.lineWidth = 6 * (1 - progress);
        ctx.beginPath(); ctx.moveTo(pt.x, pt.y);
        ctx.quadraticCurveTo(pt.x + (pt.tx - pt.x)/2 + (Math.random()*150 - 75), pt.y + (pt.ty - pt.y)/2 + (Math.random()*150 - 75), pt.tx, pt.ty);
        ctx.stroke();
      } else if (pt.type === 'spark') {
         ctx.fillStyle = pt.color || `rgba(255, 255, 255, ${1 - progress})`;
         ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      }
    });

    // Floating Text
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    state.floatTexts.forEach(ft => {
       ctx.fillStyle = ft.color;
       ctx.globalAlpha = ft.life / 30;
       ctx.fillText(ft.text, ft.x, ft.y - (30 - ft.life));
       ctx.globalAlpha = 1.0;
    });

    // Chronos Effect Overlay
    if (state.globalSlow > 0) {
        ctx.fillStyle = `rgba(41, 121, 255, ${0.1 * (state.globalSlow/180)})`;
        ctx.fillRect(camX, camY, dim.w, dim.h);
    }

    ctx.restore(); // Restore Camera Transform
  };

  // --- GAME LOOP ---
  useEffect(() => {
    if (!["playing", "harvest"].includes(screen)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const loop = () => {
      if (gs.current?.state === "playing") {
        updateEngine();
      }
      
      // Always render, even if physics are paused for Harvest
      if (gs.current) {
        renderEngine(ctx);
        // Sync UI React State periodically to prevent heavy re-renders
        if (gs.current.frameCount % 5 === 0) {
            setUi({
              hp: gs.current.player.hp, maxHp: gs.current.player.maxHp,
              souls: gs.current.player.souls, maxSouls: gs.current.player.maxSouls,
              kills: gs.current.totalKills, wave: gs.current.wave,
              bossActive: gs.current.bossActive, bossHp: gs.current.bossHp, bossMaxHp: gs.current.bossMaxHp,
              level: gs.current.player.level
            });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screen, dim]); // Restart loop if screen changes or window resizes

  // --- LEVEL UP HANDLER ---
  const handleLevelUp = (choiceId) => {
    const p = gs.current.player;
    p.skills[choiceId] = (p.skills[choiceId] || 0) + 1;
    p.level++;
    gs.current.state = "playing"; // Resume physics
    setScreen("playing");
  };

  // --- UI COMPONENTS ---
  const btnStyle = { padding: "16px 36px", background: "#050510", border: "2px solid #00e5ff", color: "#fff", cursor: "pointer", fontFamily: "monospace", fontSize: 18, letterSpacing: 2, borderRadius: 6, textTransform: "uppercase", transition: "all 0.2s" };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#000", display: "flex", justifyContent: "center", alignItems: "center", userSelect: "none", fontFamily: "monospace", color: "#fff" }}>
      
      {/* MENU */}
      {screen === "menu" && (
        <div style={{ textAlign: "center", zIndex: 10 }}>
          <h1 style={{ fontSize: 100, margin: "0 0 20px", textShadow: "0 0 40px #d500f9, 0 0 80px #7c4dff", fontWeight: 900, letterSpacing: 6 }}>ECLIPSE</h1>
          <p style={{ color: "#aaa", fontSize: 16, marginBottom: 50, lineHeight: 2, letterSpacing: 1 }}>
            WASD to Move. Your aura slows and destroys.<br/>
            Hit [SPACE] when your soul mass peaks to unleash an Eclipse.
          </p>
          <div style={{ display: "flex", gap: 30, justifyContent: "center" }}>
            <button style={{ ...btnStyle, boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)" }} onClick={initGame}
              onMouseOver={(e)=>e.currentTarget.style.transform="scale(1.05)"} onMouseOut={(e)=>e.currentTarget.style.transform="scale(1)"}>
              Descend
            </button>
            <button style={{ ...btnStyle, borderColor: "#b388ff", color: "#b388ff" }} onClick={() => setScreen("shop")}
              onMouseOver={(e)=>e.currentTarget.style.transform="scale(1.05)"} onMouseOut={(e)=>e.currentTarget.style.transform="scale(1)"}>
              Void Shop
            </button>
          </div>
        </div>
      )}

      {/* VOID SHOP */}
      {screen === "shop" && (
        <div style={{ textAlign: "center", zIndex: 10, width: 800, maxHeight: "90vh", overflowY: "auto", padding: 20 }}>
          <h2 style={{ fontSize: 48, color: "#b388ff", marginBottom: 10, textShadow: "0 0 20px #b388ff" }}>VOID SHOP</h2>
          <div style={{ color: "#00e5ff", fontSize: 24, marginBottom: 30, fontWeight: "bold" }}>SHARDS: {meta.shards}</div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40, textAlign: "left" }}>
            {[
              { id: 'upgHp', name: 'Vessel Integrity (+HP)', cost: 50 * (meta.upgHp + 1), lvl: meta.upgHp },
              { id: 'upgSpeed', name: 'Drift Speed (+Mov)', cost: 100 * (meta.upgSpeed + 1), lvl: meta.upgSpeed },
              { id: 'upgAura', name: 'Event Horizon (+Radius)', cost: 150 * (meta.upgAura + 1), lvl: meta.upgAura },
              { id: 'upgDmg', name: 'Void Catalyst (+Dmg)', cost: 200 * (meta.upgDmg + 1), lvl: meta.upgDmg },
              { id: 'upgMagnet', name: 'Soul Magnet (+Start Mass)', cost: 300 * (meta.upgMagnet + 1), lvl: meta.upgMagnet },
              { id: 'upgHarvest', name: 'Shard Harvester (+%)', cost: 500 * (meta.upgHarvest + 1), lvl: meta.upgHarvest }
            ].map(upg => (
              <div key={upg.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0a15", padding: 20, border: "1px solid #333", borderRadius: 8 }}>
                <div style={{ fontSize: 18, color: "#fff", marginBottom: 10 }}>{upg.name} <span style={{color:"#888"}}>[Lv {upg.lvl}]</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <div style={{ fontSize: 14, color: "#00e5ff" }}>{upg.cost} Shards</div>
                   <button 
                     onClick={() => {
                       if (meta.shards >= upg.cost) saveMeta({ ...meta, shards: meta.shards - upg.cost, [upg.id]: meta[upg.id] + 1 });
                     }}
                     style={{ padding: "8px 16px", background: meta.shards >= upg.cost ? "#b388ff" : "#222", color: meta.shards >= upg.cost ? "#000" : "#555", border: "none", cursor: meta.shards >= upg.cost ? "pointer" : "not-allowed", fontWeight: "bold", borderRadius: 4 }}
                   >Buy</button>
                </div>
              </div>
            ))}
          </div>
          <button style={{ ...btnStyle, borderColor: "#444", color: "#bbb" }} onClick={() => setScreen("menu")}>Back to Menu</button>
        </div>
      )}

      {/* GAME CANVAS & HUD */}
      {["playing", "harvest"].includes(screen) && (
        <>
          <canvas ref={canvasRef} width={dim.w} height={dim.h} style={{ display: "block" }} />
          
          {/* HUD Layer */}
          {screen === "playing" && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", padding: 30 }}>
              {/* Top Left: HP */}
              <div style={{ width: 300 }}>
                <div style={{ fontSize: 14, color: '#ff1744', letterSpacing: 2, marginBottom: 8, fontWeight: "bold" }}>VESSEL: {Math.floor(ui.hp)} / {ui.maxHp}</div>
                <div style={{ height: 10, background: "#2b0000", border: `1px solid #ff1744` }}>
                  <div style={{ height: "100%", width: `${Math.max(0, (ui.hp / ui.maxHp) * 100)}%`, background: '#ff1744', transition: "width 0.1s" }} />
                </div>
              </div>

              {/* Top Center: BOSS HP */}
              {ui.bossActive && (
                <div style={{ position: "absolute", top: 30, left: "50%", transform: "translateX(-50%)", width: "40vw", textAlign: "center" }}>
                  <div style={{ fontSize: 24, color: '#ff1744', letterSpacing: 10, marginBottom: 10, fontWeight: 900, textShadow: `0 0 15px #ff1744` }}>VOID WARDEN</div>
                  <div style={{ height: 20, background: "#110000", border: `2px solid #ff1744` }}>
                    <div style={{ height: "100%", width: `${Math.max(0, (ui.bossHp / ui.bossMaxHp) * 100)}%`, background: '#ff1744' }} />
                  </div>
                </div>
              )}

              {/* Bottom Center: OVERCHARGE */}
              <div style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", width: "40vw", textAlign: "center" }}>
                {ui.souls >= ui.maxSouls ? (
                   <div style={{ fontSize: 20, color: '#00e5ff', marginBottom: 15, letterSpacing: 6, fontWeight: "bold", textShadow: `0 0 15px #00e5ff`, animation: "pulse 1s infinite" }}>PRESS [SPACE] TO ECLIPSE</div>
                ) : (
                   <div style={{ fontSize: 14, color: "#fff", opacity: 0.7, marginBottom: 10, letterSpacing: 3 }}>SOUL MASS (LVL {ui.level})</div>
                )}
                <div style={{ height: 14, background: "#050510", border: `2px solid ${ui.souls >= ui.maxSouls ? '#00e5ff' : "#9c27b0"}` }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (ui.souls / ui.maxSouls) * 100)}%`, background: ui.souls >= ui.maxSouls ? '#00e5ff' : "linear-gradient(90deg, #6a1b9a, #d500f9)", transition: "width 0.2s" }} />
                </div>
              </div>

              {/* Top Right: Stats */}
              <div style={{ position: "absolute", top: 30, right: 30, textAlign: "right" }}>
                <div style={{ fontSize: 48, color: "#fff", fontWeight: 900, textShadow: "0 0 15px #b388ff" }}>{ui.kills}</div>
                <div style={{ fontSize: 14, color: "#aaa", letterSpacing: 3 }}>KILLS</div>
                <div style={{ fontSize: 24, color: '#00e5ff', marginTop: 20, letterSpacing: 3, fontWeight: "bold" }}>WAVE {ui.wave}</div>
              </div>
            </div>
          )}

          {/* HARVEST / LEVEL UP LAYER */}
          {screen === "harvest" && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(2, 1, 4, 0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
              <div style={{ fontSize: 18, color: '#00e5ff', letterSpacing: 12, marginBottom: 15 }}>ECLIPSE TRIGGERED</div>
              <h2 style={{ fontSize: 60, color: "#fff", margin: "0 0 60px", textShadow: `0 0 30px #00e5ff` }}>EVOLVE SHADOW</h2>
              
              <div style={{ display: "flex", gap: 30, flexWrap: "wrap", justifyContent: "center" }}>
                {choices.map(c => {
                  const currentLvl = gs.current.player.skills[c.id] || 0;
                  return (
                    <button key={c.id} onClick={() => handleLevelUp(c.id)}
                      style={{ width: 280, padding: 30, background: "#0a0a1a", border: `2px solid ${c.color}`, borderRadius: 12, color: "#ddd", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
                      onMouseOver={(e) => { e.currentTarget.style.boxShadow = `0 0 40px ${c.color}60`; e.currentTarget.style.transform = "translateY(-15px) scale(1.02)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                        <span style={{ color: c.color, fontSize: 22, fontWeight: "bold" }}>{c.name}</span>
                        <span style={{ color: "#fff", background: "#333", padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>Lv {currentLvl + 1}</span>
                      </div>
                      <div style={{ fontSize: 15, lineHeight: 1.6, color: "#bbb" }}>{c.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* GAME OVER */}
      {screen === "dead" && (
        <div style={{ textAlign: "center", zIndex: 10 }}>
          <h2 style={{ color: '#ff1744', fontSize: 100, margin: "0 0 10px", textShadow: `0 0 50px #ff1744`, fontWeight: 900 }}>SHATTERED</h2>
          <p style={{ color: "#aaa", fontSize: 24, marginBottom: 20, letterSpacing: 4 }}>SURVIVED TO WAVE {ui.wave}</p>
          <p style={{ color: '#00e5ff', fontSize: 20, marginBottom: 60, letterSpacing: 2 }}>+{Math.floor(ui.kills / 4) * (1 + (meta.upgHarvest * 0.2))} SHARDS EXTRACTED</p>
          
          <div style={{ display: "flex", gap: 30, justifyContent: "center" }}>
            <button style={{ ...btnStyle, borderColor: '#ff1744', background: "#1a0000" }} onClick={initGame}
              onMouseOver={(e)=>e.currentTarget.style.transform="scale(1.05)"} onMouseOut={(e)=>e.currentTarget.style.transform="scale(1)"}>
              RETRY
            </button>
            <button style={{ ...btnStyle, borderColor: "#444", color: "#bbb" }} onClick={() => setScreen("menu")}
              onMouseOver={(e)=>e.currentTarget.style.transform="scale(1.05)"} onMouseOut={(e)=>e.currentTarget.style.transform="scale(1)"}>
              MAIN MENU
            </button>
          </div>
        </div>
      )}

    </div>
  );
}