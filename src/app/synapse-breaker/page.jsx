'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function SynapseBreaker() {
  // --- UI & Meta State ---
  const [gameState, setGameState] = useState('menu'); // 'menu', 'shop', 'playing', 'skill', 'gameover'
  const [shopTab, setShopTab] = useState('upgrades'); // 'upgrades', 'skins'
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [skillOptions, setSkillOptions] = useState([]);

  // --- Persistent Data ---
  const [upgrades, setUpgrades] = useState({ dmgLvl: 0, nodeLvl: 0, speedLvl: 0, magnetLvl: 0, hpLvl: 0 });
  const [unlockedSkins, setUnlockedSkins] = useState(['#00ffff']);
  const [equippedSkin, setEquippedSkin] = useState('#00ffff');

  // --- Game Engine Refs ---
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const gameData = useRef({
    player: { x: 500, y: 350, radius: 14, hp: 100, maxHp: 100, invuln: 0 },
    stats: { damage: 1, maxNodes: 2, speed: 4, magnet: 80, nodeLife: 300 },
    nodes: [], enemies: [], projectiles: [], particles: [], pickups: [], floatingTexts: [],
    keys: {},
    exp: 0, expToNext: 50, frames: 0, revivesUsed: 0, spacePressed: false
  });

  // --- Initialization & Local Storage ---
  useEffect(() => {
    const sCoins = localStorage.getItem('gz_syn_coins');
    const sUpgrades = localStorage.getItem('gz_syn_upgrades');
    const sSkins = localStorage.getItem('gz_syn_skins');
    const sEq = localStorage.getItem('gz_syn_eq');
    
    if (sCoins) setCoins(parseInt(sCoins));
    if (sUpgrades) setUpgrades(JSON.parse(sUpgrades));
    if (sSkins) setUnlockedSkins(JSON.parse(sSkins));
    if (sEq) setEquippedSkin(sEq);

    const handleKeyDown = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      gameData.current.keys[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e) => gameData.current.keys[e.key.toLowerCase()] = false;

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const saveMoney = (amount) => { setCoins(amount); localStorage.setItem('gz_syn_coins', amount); };

  const buyUpgrade = (type, cost) => {
    if (coins >= cost) {
      saveMoney(coins - cost);
      const n = { ...upgrades, [type]: upgrades[type] + 1 };
      setUpgrades(n); localStorage.setItem('gz_syn_upgrades', JSON.stringify(n));
    }
  };

  const buyOrEquipSkin = (id, cost) => {
    if (unlockedSkins.includes(id)) {
      setEquippedSkin(id); localStorage.setItem('gz_syn_eq', id);
    } else if (coins >= cost) {
      saveMoney(coins - cost);
      const n = [...unlockedSkins, id];
      setUnlockedSkins(n); localStorage.setItem('gz_syn_skins', JSON.stringify(n));
    }
  };

  // --- Math Helpers ---
  const distSq = (p1, p2) => Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
  const distToSegmentSq = (p, v, w) => {
    const l2 = distSq(v, w);
    if (l2 === 0) return distSq(p, v);
    let t = Math.max(0, Math.min(1, ((p.x - v.x)*(w.x - v.x) + (p.y - v.y)*(w.y - v.y)) / l2));
    return distSq(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
  };

  // --- Core Game Loop ---
  const updateGame = () => {
    if (gameState !== 'playing') return;
    const cvs = canvasRef.current;
    const ctx = cvs.getContext('2d');
    const st = gameData.current;

    ctx.fillStyle = '#06060a';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    
    // Background Grid
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1; ctx.beginPath();
    for(let x = 0; x < cvs.width; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, cvs.height); }
    for(let y = 0; y < cvs.height; y += 50) { ctx.moveTo(0, y); ctx.lineTo(cvs.width, y); }
    ctx.stroke();

    st.frames++;
    if (st.player.invuln > 0) st.player.invuln--;

    // Player Movement
    const p = st.player, s = st.stats, k = st.keys;
    if ((k['w'] || k['arrowup']) && p.y > p.radius) p.y -= s.speed;
    if ((k['s'] || k['arrowdown']) && p.y < cvs.height - p.radius) p.y += s.speed;
    if ((k['a'] || k['arrowleft']) && p.x > p.radius) p.x -= s.speed;
    if ((k['d'] || k['arrowright']) && p.x < cvs.width - p.radius) p.x += s.speed;

    // Node Dropping
    if (k[' '] && !st.spacePressed) {
      st.nodes.push({ x: p.x, y: p.y, life: s.nodeLife });
      if (st.nodes.length > s.maxNodes) st.nodes.shift();
      st.spacePressed = true;
    }
    if (!k[' ']) st.spacePressed = false;

    // Nodes Update
    st.nodes.forEach(n => n.life--);
    st.nodes = st.nodes.filter(n => n.life > 0);

    // Draw Lasers
    if (st.nodes.length > 1) {
      ctx.beginPath(); ctx.moveTo(st.nodes[0].x, st.nodes[0].y);
      for (let i = 1; i < st.nodes.length; i++) ctx.lineTo(st.nodes[i].x, st.nodes[i].y);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = `${equippedSkin}44`; ctx.lineWidth = 10; ctx.stroke(); // Glow
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke(); // Core
    }

    // Dynamic Progression Spawns
    const spawnRate = Math.max(10, 80 - Math.floor(st.frames / 100));
    if (st.frames % spawnRate === 0) {
      const wantBoss = level % 5 === 0 && st.enemies.filter(e => e.type === 'boss').length === 0;
      let types = ['basic'];
      if (level >= 2) types.push('fast');
      if (level >= 4) types.push('tank');
      if (level >= 6) types.push('shooter');
      
      let eType = wantBoss ? 'boss' : types[Math.floor(Math.random() * types.length)];
      
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = cvs.width / 2 + 100;
      const ex = cvs.width / 2 + Math.cos(angle) * spawnDist;
      const ey = cvs.height / 2 + Math.sin(angle) * spawnDist;

      const hpScale = 1 + (level * 0.2);
      let e = { hp: 30*hpScale, speed: 1.5 + Math.random(), radius: 12, color: '#ff5500' };
      if (eType === 'fast') e = { hp: 15*hpScale, speed: 2.8 + Math.random(), radius: 9, color: '#ffff00' };
      if (eType === 'tank') e = { hp: 100*hpScale, speed: 0.8, radius: 18, color: '#aa00ff' };
      if (eType === 'shooter') e = { hp: 40*hpScale, speed: 1.2, radius: 14, color: '#00ffaa', lastShot: st.frames };
      if (eType === 'boss') e = { hp: 500*level, speed: 1.0, radius: 35, color: '#ff0055' };

      st.enemies.push({ x: ex, y: ey, type: eType, maxHp: e.hp, ...e });
    }

    // Enemies Update
    for (let i = st.enemies.length - 1; i >= 0; i--) {
      let e = st.enemies[i];
      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // AI Logic
      if (e.type === 'shooter' && dist < 300) {
        // Run away slightly, and shoot
        if (st.frames - e.lastShot > 100) {
          st.projectiles.push({ x: e.x, y: e.y, vx: (dx/dist)*3, vy: (dy/dist)*3, life: 200 });
          e.lastShot = st.frames;
        }
      } else {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      }

      // Player Collision
      if (dist < e.radius + p.radius && p.invuln <= 0) {
        p.hp -= e.type === 'boss' ? 20 : (e.type === 'tank' ? 10 : 5);
        p.invuln = 10;
        if (p.hp <= 0) gameOver();
      }

      // Laser Collision
      let touching = false;
      for (let j = 0; j < st.nodes.length - 1; j++) {
        if (distToSegmentSq(e, st.nodes[j], st.nodes[j+1]) < Math.pow(e.radius + 6, 2)) {
          e.hp -= s.damage; touching = true;
          if (Math.random() > 0.7) createParticles(e.x, e.y, equippedSkin, 1);
        }
      }

      // Death
      if (e.hp <= 0) {
        createParticles(e.x, e.y, e.color, e.type === 'boss' ? 60 : 15);
        setScore(c => c + (e.type === 'boss' ? 500 : 10));
        
        if (Math.random() > 0.5 || e.type === 'boss') st.pickups.push({ x: e.x, y: e.y, type: 'coin', val: e.type === 'boss' ? 100 : (level >= 5 ? 2 : 1) });
        st.pickups.push({ x: e.x, y: e.y, type: 'exp', val: e.type === 'boss' ? 300 : (e.type === 'tank' ? 20 : 10) });
        
        st.enemies.splice(i, 1); continue;
      }

      // Draw Enemy
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = touching ? '#ffffff' : e.color; ctx.fill();
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = touching ? equippedSkin : '#222'; ctx.fill();

      if (e.type === 'boss') {
        ctx.fillStyle = '#222'; ctx.fillRect(e.x - 25, e.y - e.radius - 10, 50, 5);
        ctx.fillStyle = '#ff0055'; ctx.fillRect(e.x - 25, e.y - e.radius - 10, (e.hp/e.maxHp)*50, 5);
      }
    }

    // Projectiles
    for (let i = st.projectiles.length - 1; i >= 0; i--) {
      let pr = st.projectiles[i];
      pr.x += pr.vx; pr.y += pr.vy; pr.life--;
      const dx = p.x - pr.x, dy = p.y - pr.y;
      if (Math.sqrt(dx*dx + dy*dy) < p.radius + 4 && p.invuln <= 0) {
        p.hp -= 8; p.invuln = 10;
        st.projectiles.splice(i, 1);
        if (p.hp <= 0) gameOver();
        continue;
      }
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 4, 0, Math.PI*2);
      ctx.fillStyle = '#ff00aa'; ctx.fill();
      if(pr.life <= 0) st.projectiles.splice(i, 1);
    }

    // Pickups
    for (let i = st.pickups.length - 1; i >= 0; i--) {
      let pk = st.pickups[i];
      const dist = Math.sqrt(Math.pow(p.x - pk.x, 2) + Math.pow(p.y - pk.y, 2));
      if (dist < s.magnet) { pk.x += ((p.x - pk.x)/dist)*8; pk.y += ((p.y - pk.y)/dist)*8; }
      if (dist < p.radius + 10) {
        if (pk.type === 'coin') saveMoney(coins + pk.val);
        if (pk.type === 'exp') handleExp(pk.val);
        st.pickups.splice(i, 1); continue;
      }
      ctx.beginPath(); ctx.arc(pk.x, pk.y, pk.type === 'coin' ? 4 : 5, 0, Math.PI * 2);
      ctx.fillStyle = pk.type === 'coin' ? '#ffd700' : '#00ffaa'; ctx.fill();
    }

    // Draw Traps & Player
    st.nodes.forEach(n => {
      ctx.beginPath(); ctx.arc(n.x, n.y, 6, 0, Math.PI * 2); ctx.fillStyle = equippedSkin; ctx.fill();
      ctx.beginPath(); ctx.arc(n.x, n.y, 10, -Math.PI/2, (Math.PI*2 * (n.life/s.nodeLife)) - Math.PI/2);
      ctx.strokeStyle = equippedSkin; ctx.lineWidth = 2; ctx.stroke();
    });

    if (p.invuln % 10 < 5) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = equippedSkin; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
    }

    // Effects
    for (let i = st.floatingTexts.length - 1; i >= 0; i--) {
      let ft = st.floatingTexts[i]; ft.y -= 1; ft.life--;
      ctx.fillStyle = `rgba(0, 255, 170, ${ft.life / 30})`; ctx.font = "14px monospace";
      ctx.fillText(ft.text, ft.x, ft.y);
      if (ft.life <= 0) st.floatingTexts.splice(i, 1);
    }
    st.particles.forEach((pt, i) => {
      pt.x += pt.vx; pt.y += pt.vy; pt.life--;
      ctx.fillStyle = pt.color; ctx.globalAlpha = pt.life/pt.maxLife;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2); ctx.fill();
      if(pt.life <= 0) st.particles.splice(i, 1);
    });
    ctx.globalAlpha = 1;

    // HUD
    ctx.fillStyle = '#222'; ctx.fillRect(20, 20, 200, 15);
    ctx.fillStyle = p.invuln > 0 ? '#ffffff' : '#ff0055'; ctx.fillRect(20, 20, (p.hp / p.maxHp) * 200, 15);
    ctx.strokeStyle = '#555'; ctx.strokeRect(20, 20, 200, 15);

    requestRef.current = requestAnimationFrame(updateGame);
  };

  useEffect(() => {
    if (gameState === 'playing') requestRef.current = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, coins, equippedSkin]);

  // --- Mechanics ---
  const createParticles = (x, y, color, amount) => {
    for (let i=0; i<amount; i++) gameData.current.particles.push({
      x, y, color, vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12, life: 30, maxLife: 30, size: Math.random()*3+1
    });
  };

  const handleExp = (amt) => {
    const s = gameData.current; s.exp += amt;
    if (s.exp >= s.expToNext) {
      s.exp -= s.expToNext; s.expToNext = Math.floor(s.expToNext * 1.5);
      setLevel(l => l + 1);
      const pool = [
        { id: 'nodes', n: '+1 Node', d: 'More traps', c: '#00ffff' },
        { id: 'dmg', n: 'Overclock', d: '+25% Dmg', c: '#ff0055' },
        { id: 'spd', n: 'Agility', d: '+15% Spd', c: '#00ffaa' },
        { id: 'life', n: 'Battery', d: 'Nodes last +1.5s', c: '#ffaa00' },
        { id: 'mag', n: 'Attract', d: '+30% Magnet', c: '#aa00ff' },
        { id: 'heal', n: 'Patch', d: 'Heal 50% HP', c: '#00ff00' }
      ];
      setSkillOptions(pool.sort(() => 0.5 - Math.random()).slice(0, 3));
      setGameState('skill');
    }
  };

  const applySkill = (id) => {
    const s = gameData.current.stats, p = gameData.current.player;
    if (id==='nodes') s.maxNodes++; if (id==='dmg') s.damage*=1.25;
    if (id==='spd') s.speed*=1.15; if (id==='life') s.nodeLife+=90;
    if (id==='mag') s.magnet*=1.3; if (id==='heal') p.hp=Math.min(p.maxHp, p.hp+(p.maxHp*0.5));
    gameData.current.floatingTexts.push({ x: p.x, y: p.y - 20, text: 'SYSTEM UPGRADED', life: 45 });
    setGameState('playing');
  };

  const startGame = () => {
    const bDmg = 1 + (upgrades.dmgLvl * 0.5), bNodes = 2 + upgrades.nodeLvl;
    const bSpd = 4 + (upgrades.speedLvl * 0.5), bMag = 80 + (upgrades.magnetLvl * 20);
    const bHp = 100 + (upgrades.hpLvl * 25);
    gameData.current = {
      player: { x: 500, y: 350, radius: 14, hp: bHp, maxHp: bHp, invuln: 30 },
      stats: { damage: bDmg, maxNodes: bNodes, speed: bSpd, magnet: bMag, nodeLife: 300 },
      nodes: [], enemies: [], projectiles: [], particles: [], pickups: [], floatingTexts: [],
      keys: {}, exp: 0, expToNext: 50, frames: 0, revivesUsed: 0, spacePressed: false
    };
    setLevel(1); setScore(0); setGameState('playing');
  };

  const gameOver = () => setGameState('gameover');
  
  const reviveCost = 150 * Math.pow(2, gameData.current.revivesUsed);
  const revivePlayer = () => {
    if (coins >= reviveCost) {
      saveMoney(coins - reviveCost);
      const st = gameData.current;
      st.player.hp = st.player.maxHp * 0.5;
      st.player.invuln = 120; // 2 seconds invuln
      st.revivesUsed++;
      
      // EMP Explosion
      createParticles(st.player.x, st.player.y, '#00ffff', 100);
      st.enemies.forEach(e => {
        const d = Math.sqrt(Math.pow(e.x-st.player.x,2)+Math.pow(e.y-st.player.y,2));
        if(d < 250) e.hp = 0; // Wipe nearby
      });
      st.projectiles = []; // Clear bullets
      
      setGameState('playing');
    }
  };

  // --- Render ---
  return (
    <>
      <style>{`
        @keyframes pulseGlow { 0% { text-shadow: 0 0 10px #00ffff; } 50% { text-shadow: 0 0 30px #00ffff, 0 0 50px #00ffff; } 100% { text-shadow: 0 0 10px #00ffff; } }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        .synapse-title { font-size: 6rem; color: #fff; margin: 0; animation: pulseGlow 2s infinite, float 4s ease-in-out infinite; letter-spacing: 8px; }
        .glass-panel { background: rgba(10, 10, 15, 0.7); backdrop-filter: blur(10px); border: 1px solid #333; border-radius: 12px; }
        .tab-btn { background: transparent; border: none; color: #888; font-size: 1.5rem; cursor: pointer; padding: 10px 20px; transition: 0.3s; }
        .tab-btn.active { color: #00ffff; border-bottom: 2px solid #00ffff; }
      `}</style>
      
      <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#020204', color: '#fff', fontFamily: 'monospace' }}>
        
        {/* Top UI */}
        <div style={{ position: 'absolute', top: 20, right: 30, zIndex: 100, display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ color: '#ffd700', fontSize: '1.4rem', fontWeight: 'bold', textShadow: '0 0 15px #ffd700' }}>DATACOINS: {coins}</div>
          {(gameState === 'menu' || gameState === 'shop') && (
            <a href="/" style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none', borderRadius: '5px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              ← BACK TO HUB
            </a>
          )}
        </div>

        {/* Main Menu */}
        {gameState === 'menu' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, #1a1a2e 0%, #020204 80%)' }}>
            <h1 className="synapse-title">SYNAPSE</h1>
            <h2 style={{ fontSize: '2.5rem', color: '#ff0055', letterSpacing: '15px', marginTop: '-10px', textShadow: '0 0 20px #ff0055' }}>BREAKER</h2>
            <div className="glass-panel" style={{ padding: '20px', marginTop: '40px', textAlign: 'center', color: '#aaa', maxWidth: '500px' }}>
              <p style={{ margin: 0, fontSize: '1.1rem', lineHeight: '1.6' }}>WASD/ARROWS to move.<br/>SPACEBAR to lay data nodes.<br/>Trap viruses in the grid. Survive the breach.</p>
            </div>
            <div style={{ display: 'flex', gap: '30px', marginTop: '40px' }}>
              <button onClick={startGame} style={btnStyle('#00ffaa')}>INITIALIZE HACK</button>
              <button onClick={() => setGameState('shop')} style={btnStyle('#ff00ff')}>BLACK MARKET</button>
            </div>
          </div>
        )}

        {/* Dynamic Shop */}
        {gameState === 'shop' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#020204', overflowY: 'auto', padding: '60px 20px' }}>
            <h1 style={{ color: '#ff00ff', fontSize: '3.5rem', textShadow: '0 0 30px #ff00ff', margin: 0 }}>THE BLACK MARKET</h1>
            
            <div style={{ display: 'flex', gap: '30px', margin: '30px 0' }}>
              <button className={`tab-btn ${shopTab === 'upgrades' ? 'active' : ''}`} onClick={() => setShopTab('upgrades')}>HARDWARE UPGRADES</button>
              <button className={`tab-btn ${shopTab === 'skins' ? 'active' : ''}`} onClick={() => setShopTab('skins')}>COSMETIC SKINS</button>
            </div>

            <div style={{ width: '100%', maxWidth: '900px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              {shopTab === 'upgrades' && (
                <>
                  <ShopItem title="Base Laser Damage" lvl={upgrades.dmgLvl} cost={50*(upgrades.dmgLvl+1)} onBuy={()=>buyUpgrade('dmgLvl', 50*(upgrades.dmgLvl+1))} coins={coins} />
                  <ShopItem title="Max Synapse Nodes" lvl={upgrades.nodeLvl} cost={200*(upgrades.nodeLvl+1)} onBuy={()=>buyUpgrade('nodeLvl', 200*(upgrades.nodeLvl+1))} coins={coins} />
                  <ShopItem title="Thruster Speed" lvl={upgrades.speedLvl} cost={75*(upgrades.speedLvl+1)} onBuy={()=>buyUpgrade('speedLvl', 75*(upgrades.speedLvl+1))} coins={coins} />
                  <ShopItem title="Magnetic Radius" lvl={upgrades.magnetLvl} cost={60*(upgrades.magnetLvl+1)} onBuy={()=>buyUpgrade('magnetLvl', 60*(upgrades.magnetLvl+1))} coins={coins} />
                  <ShopItem title="Hull Integrity (HP)" lvl={upgrades.hpLvl} cost={100*(upgrades.hpLvl+1)} onBuy={()=>buyUpgrade('hpLvl', 100*(upgrades.hpLvl+1))} coins={coins} />
                </>
              )}
              {shopTab === 'skins' && [
                { id: '#00ffff', name: 'Cyan Core', cost: 0 }, { id: '#ff00ff', name: 'Plasma Pink', cost: 150 },
                { id: '#00ff00', name: 'Matrix Green', cost: 300 }, { id: '#ffaa00', name: 'Solar Flare', cost: 600 },
                { id: '#aa00ff', name: 'Void Purple', cost: 1000 }
              ].map(s => (
                <div key={s.id} className="glass-panel" style={{ padding: '20px', textAlign: 'center', border: `1px solid ${equippedSkin === s.id ? s.id : '#333'}` }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:s.id, margin:'0 auto 15px', boxShadow:`0 0 20px ${s.id}` }} />
                  <h3 style={{ color: '#fff', margin: '0 0 15px 0' }}>{s.name}</h3>
                  <button onClick={() => buyOrEquipSkin(s.id, s.cost)} disabled={!unlockedSkins.includes(s.id) && coins < s.cost}
                    style={{ ...btnStyle(s.id), padding: '10px', fontSize: '1rem', width: '100%', opacity: (!unlockedSkins.includes(s.id) && coins < s.cost) ? 0.5 : 1 }}>
                    {equippedSkin === s.id ? 'EQUIPPED' : unlockedSkins.includes(s.id) ? 'EQUIP' : `BUY - ${s.cost}`}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setGameState('menu')} style={{ ...btnStyle('#fff'), marginTop: '50px' }}>RETURN TO MENU</button>
          </div>
        )}

        {/* Game Canvas Container */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: (gameState === 'playing' || gameState === 'skill' || gameState === 'gameover') ? 'block' : 'none' }}>
          <canvas ref={canvasRef} width={1000} height={700} style={{ 
            maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain',
            border: `2px solid ${equippedSkin}`, boxShadow: `0 0 40px ${equippedSkin}33`, borderRadius: '8px' 
          }} />
        </div>

        {/* Overlays */}
        {gameState === 'skill' && (
          <div style={overlayStyle}>
            <h2 style={{ color: '#00ffaa', fontSize: '4rem', textShadow: '0 0 30px #00ffaa', margin: 0, animation: 'float 3s infinite' }}>SYSTEM UPGRADE</h2>
            <p style={{ fontSize: '1.2rem', color: '#ccc', marginBottom: '40px' }}>Select an enhancement protocol</p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {skillOptions.map(skill => (
                <div key={skill.id} className="glass-panel" onClick={() => applySkill(skill.id)} style={{ padding: '30px', width: '220px', cursor: 'pointer', textAlign: 'center', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.border = `2px solid ${skill.c}`} onMouseOut={(e) => e.currentTarget.style.border = '1px solid #333'}>
                  <h3 style={{ color: skill.c, textShadow: `0 0 10px ${skill.c}`, margin: '0 0 15px 0' }}>{skill.n}</h3>
                  <p style={{ color: '#ccc', margin: 0 }}>{skill.d}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div style={overlayStyle}>
            <h2 style={{ color: '#ff0055', fontSize: '5rem', textShadow: '0 0 40px #ff0055', margin: '0 0 10px 0', animation: 'pulseGlow 2s infinite' }}>SYSTEM FAILURE</h2>
            <p style={{ fontSize: '1.5rem', color: '#aaa', margin: '0 0 40px 0' }}>Final Score: {score} | Level Reached: {level}</p>
            
            <div style={{ display: 'flex', gap: '20px', flexDirection: 'column', alignItems: 'center' }}>
              <button 
                onClick={revivePlayer} 
                disabled={coins < reviveCost} 
                style={{ 
                  ...btnStyle('#00ffff'), 
                  opacity: coins < reviveCost ? 0.5 : 1, 
                  width: '350px' 
                }}
              >
                DEFIBRILLATE ({reviveCost} COINS)
              </button>
              
              <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                <button onClick={startGame} style={btnStyle('#00ffaa')}>REBOOT SYSTEM</button>
                <button onClick={() => setGameState('menu')} style={btnStyle('#aaa')}>MAIN MENU</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// --- Helper Styles & Sub-Components ---

const btnStyle = (color) => ({
  padding: '15px 30px',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  color: color,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  border: `2px solid ${color}`,
  borderRadius: '4px',
  cursor: 'pointer',
  textShadow: `0 0 10px ${color}`,
  boxShadow: `0 0 15px ${color}44`,
  transition: 'all 0.2s ease-in-out',
  fontFamily: 'monospace',
  textTransform: 'uppercase'
});

const overlayStyle = {
  position: 'absolute', 
  inset: 0,
  backgroundColor: 'rgba(2, 2, 4, 0.85)',
  backdropFilter: 'blur(8px)',
  display: 'flex', 
  flexDirection: 'column',
  alignItems: 'center', 
  justifyContent: 'center',
  zIndex: 50
};

function ShopItem({ title, lvl, cost, onBuy, coins }) {
  const isMaxed = lvl >= 10; // Capping upgrades at level 10 visually
  
  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <h3 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '1.1rem' }}>{title}</h3>
        <p style={{ color: '#00ffff', margin: '0 0 15px 0' }}>Level: {lvl} {isMaxed && '(MAX)'}</p>
      </div>
      <button 
        onClick={onBuy} 
        disabled={isMaxed || coins < cost}
        style={{
          ...btnStyle(isMaxed ? '#555' : (coins >= cost ? '#00ffaa' : '#ff0055')),
          padding: '10px', 
          fontSize: '1rem', 
          width: '100%',
          opacity: (isMaxed || coins < cost) ? 0.5 : 1
        }}
      >
        {isMaxed ? 'MAX UPGRADE' : `UPGRADE - ${cost} ¢`}
      </button>
    </div>
  );
}