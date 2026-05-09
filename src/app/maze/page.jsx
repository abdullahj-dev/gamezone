"use client";
import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import Link from "next/link";

// --- Game Configurations ---
const SAVE_KEY = "maze_runner_save_v2"; 
const ACCENT_COLOR = "#ff44aa";
const TOTAL_LEVELS = 50;

const SKINS = [
  { id: "default", name: "Cube", cost: 0, style: { borderRadius: "4px" } },
  { id: "orb", name: "Orb", cost: 10, style: { borderRadius: "50%" } },
  { id: "star", name: "Star", cost: 50, style: { clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" } },
  { id: "diamond", name: "Diamond", cost: 100, style: { transform: "rotate(45deg) scale(0.85)", borderRadius: "2px" } },
  { id: "ghost", name: "Ghost", cost: 250, style: { borderRadius: "50% 50% 0 0", opacity: 0.8, animation: "ghost-pulse 1s infinite alternate" } },
  { id: "ninja", name: "Ninja", cost: 500, style: { borderRadius: "50%", background: "linear-gradient(135deg, #222 50%, #111 50%)", border: `2px solid ${ACCENT_COLOR}` } }
];

const TRAILS = [
  { id: "none", name: "None", cost: 0, color: "transparent" },
  { id: "sparkle", name: "Sparkle", cost: 20, color: "#ffffff" },
  { id: "neon", name: "Neon", cost: 100, color: ACCENT_COLOR },
  { id: "fire", name: "Fire", cost: 300, color: "#ff5500" },
  { id: "plasma", name: "Plasma", cost: 600, color: "#00ffff" }
];

// --- Deterministic PRNG ---
function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
}

function sfc32(a, b, c, d) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b | 0) + d | 0;
      d = d + 1 | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = c << 21 | c >>> 11; c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

// --- Maze Generator ---
function generateMaze(w, h, seedStr = null, isArcade = false) {
  let rand = Math.random;
  if (seedStr) {
      const seed = cyrb128(seedStr);
      rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
  }

  let grid = [];
  for (let y = 0; y < h; y++) {
    let row = [];
    for (let x = 0; x < w; x++) {
      row.push({ x, y, walls: { t: true, r: true, b: true, l: true }, visited: false, isCoin: false, isExit: false, powerup: null });
    }
    grid.push(row);
  }

  let stack = [];
  let curr = grid[0][0];
  curr.visited = true;

  function getUnvisitedNeighbors(cell) {
    let neighbors = [];
    let { x, y } = cell;
    if (y > 0 && !grid[y - 1][x].visited) neighbors.push({ dir: 't', next: grid[y - 1][x] });
    if (x < w - 1 && !grid[y][x + 1].visited) neighbors.push({ dir: 'r', next: grid[y][x + 1] });
    if (y < h - 1 && !grid[y + 1][x].visited) neighbors.push({ dir: 'b', next: grid[y + 1][x] });
    if (x > 0 && !grid[y][x - 1].visited) neighbors.push({ dir: 'l', next: grid[y][x - 1] });
    return neighbors;
  }

  let unvisitedCount = w * h - 1;
  while (unvisitedCount > 0) {
    let neighbors = getUnvisitedNeighbors(curr);
    if (neighbors.length > 0) {
      let r = Math.floor(rand() * neighbors.length);
      let { dir, next } = neighbors[r];
      stack.push(curr);
      
      if (dir === 't') { curr.walls.t = false; next.walls.b = false; }
      if (dir === 'r') { curr.walls.r = false; next.walls.l = false; }
      if (dir === 'b') { curr.walls.b = false; next.walls.t = false; }
      if (dir === 'l') { curr.walls.l = false; next.walls.r = false; }
      
      curr = next;
      curr.visited = true;
      unvisitedCount--;
    } else if (stack.length > 0) {
      curr = stack.pop();
    } else {
      break;
    }
  }

  // Arcade Mode: Create loops (Imperfect Maze) to prevent getting stuck by enemies
  if (isArcade) {
      for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
              if (rand() > 0.85) { // 15% chance to remove a random wall
                  const dir = rand() > 0.5 ? 'r' : 'b';
                  if (dir === 'r') {
                      grid[y][x].walls.r = false; grid[y][x+1].walls.l = false;
                  } else {
                      grid[y][x].walls.b = false; grid[y+1][x].walls.t = false;
                  }
              }
          }
      }
  }

  grid[h - 1][w - 1].isExit = true;

  // Add Coins strictly within valid cells
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let cell = grid[y][x];
      if (!cell.isExit && (x !== 0 || y !== 0)) {
        let wallCount = (cell.walls.t?1:0) + (cell.walls.r?1:0) + (cell.walls.b?1:0) + (cell.walls.l?1:0);
        if (wallCount >= 3 && rand() > 0.4) cell.isCoin = true;
        else if (rand() > 0.95) cell.isCoin = true;
      }
    }
  }

  // Add Powerups (Arcade Mode Only)
  if (isArcade) {
      for(let i=0; i<Math.max(2, Math.floor(w/4)); i++) {
          let rx = Math.floor(rand() * w);
          let ry = Math.floor(rand() * h);
          let cell = grid[ry][rx];
          if (!cell.isExit && !cell.isCoin && (rx!==0 || ry!==0)) {
              cell.powerup = rand() > 0.5 ? 'flare' : 'freeze';
          }
      }
  }

  // Generate Enemy Start Positions (Arcade Mode Only)
  let enemies = [];
  if (isArcade) {
      const numEnemies = Math.max(1, Math.floor(w / 5));
      for(let i=0; i<numEnemies; i++) {
          let rx = Math.floor(rand() * w);
          let ry = Math.floor(rand() * h);
          if ((rx > 2 || ry > 2) && !grid[ry][rx].isExit) {
              enemies.push({ id: `enemy_${i}`, x: rx, y: ry });
          }
      }
  }

  return { grid, initialEnemies: enemies };
}

// --- Hooks ---
function useSaveData() {
  const [data, setData] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      if (stored) {
        setData(JSON.parse(stored));
      } else {
        setData({
          coins: 0,
          highLevel: 1,
          arcadeHighScore: 0,
          stars: {},
          unlockedSkins: ["default"],
          equippedSkin: "default",
          unlockedTrails: ["none"],
          equippedTrail: "none"
        });
      }
    } catch (e) {
      console.error("Failed to load save data", e);
      setData({
        coins: 0, highLevel: 1, arcadeHighScore: 0, stars: {}, unlockedSkins: ["default"], equippedSkin: "default", unlockedTrails: ["none"], equippedTrail: "none"
      });
    }
    setIsLoaded(true);
  }, []);

  const save = useCallback((newData) => {
    setData((prev) => {
      const updated = { ...prev, ...newData };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save data", e);
      }
      return updated;
    });
  }, []);

  return { data, save, isLoaded };
}

// --- Components ---
const SVGGameBoard = memo(({ grid, playerPos, skinStyle, trailType, trails, collectedCoins, enemies, activePowerup, isDashing, isDanger }) => {
  if (!grid || grid.length === 0) return null;
  const H = grid.length;
  const W = grid[0].length;
  
  const playerX = ((playerPos.x + 0.5) / W) * 100;
  const playerY = ((playerPos.y + 0.5) / H) * 100;

  const lines = useMemo(() => {
    const lns = [];
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        const px = (x/W)*100; const py = (y/H)*100;
        const nextPx = ((x+1)/W)*100; const nextPy = ((y+1)/H)*100;

        if (cell.walls.t) lns.push(<line key={`t-${x}-${y}`} x1={`${px}%`} y1={`${py}%`} x2={`${nextPx}%`} y2={`${py}%`} />);
        if (cell.walls.l) lns.push(<line key={`l-${x}-${y}`} x1={`${px}%`} y1={`${py}%`} x2={`${px}%`} y2={`${nextPy}%`} />);
        if (x === W - 1 && cell.walls.r) lns.push(<line key={`r-${x}-${y}`} x1={`${nextPx}%`} y1={`${py}%`} x2={`${nextPx}%`} y2={`${nextPy}%`} />);
        if (y === H - 1 && cell.walls.b) lns.push(<line key={`b-${x}-${y}`} x1={`${px}%`} y1={`${nextPy}%`} x2={`${nextPx}%`} y2={`${nextPy}%`} />);
      });
    });
    return lns;
  }, [grid, W, H]);

  const flareActive = activePowerup?.type === 'flare' && Date.now() < activePowerup.endTime;
  const freezeActive = activePowerup?.type === 'freeze' && Date.now() < activePowerup.endTime;

  return (
    <div className={`relative w-full max-w-2xl aspect-square bg-[#03040a] rounded-2xl border border-[#2a2d45] overflow-hidden shadow-[0_0_60px_rgba(255,68,170,0.15)] flex items-center justify-center p-2 ${isDanger ? 'animate-screen-shake' : ''}`}>
      <div className="relative w-full h-full border border-[#ff44aa44] rounded">
        {/* SVG Walls */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-10" 
          style={{ 
            stroke: ACCENT_COLOR, 
            strokeWidth: "2px", 
            strokeLinecap: "round",
            filter: `drop-shadow(0 0 6px ${ACCENT_COLOR})`
          }}
        >
          {lines}
        </svg>

        {/* Exit Goal */}
        <div 
          className="absolute flex items-center justify-center z-10"
          style={{
            left: `${((W-1)/W)*100}%`, top: `${((H-1)/H)*100}%`,
            width: `${100/W}%`, height: `${100/H}%`,
          }}
        >
          <div className="w-[80%] h-[80%] rounded bg-[#ff44aa] animate-pulse blur-[4px] opacity-60" />
          <div className="absolute w-[60%] h-[60%] rounded bg-white shadow-[0_0_15px_#ff44aa]" />
        </div>

        {/* Coins & Powerups */}
        {grid.map((row, y) => 
          row.map((cell, x) => {
            const key = `${x}-${y}`;
            if (collectedCoins.has(key)) return null;

            if (cell.isCoin) {
                return (
                  <div 
                    key={`coin-${key}`}
                    className="absolute flex items-center justify-center z-10"
                    style={{ left: `${(x/W)*100}%`, top: `${(y/H)*100}%`, width: `${100/W}%`, height: `${100/H}%` }}
                  >
                    <div className="w-[35%] h-[35%] rounded-full bg-[#fbbf24] shadow-[0_0_12px_#fbbf24] animate-bounce" style={{ transformOrigin: "bottom" }} />
                  </div>
                )
            }
            if (cell.powerup) {
                const color = cell.powerup === 'flare' ? '#00ffff' : '#55ff55';
                return (
                  <div 
                    key={`powerup-${key}`}
                    className="absolute flex items-center justify-center z-10"
                    style={{ left: `${(x/W)*100}%`, top: `${(y/H)*100}%`, width: `${100/W}%`, height: `${100/H}%` }}
                  >
                    <div className="w-[45%] h-[45%] rounded-sm rotate-45 shadow-[0_0_15px_currentColor] animate-pulse" style={{ background: color, color }} />
                  </div>
                )
            }
            return null;
          })
        )}

        {/* Trails */}
        {trails.map((t, i) => {
          if (trailType.id === "none") return null;
          return (
            <div
              key={`trail-${i}`}
              className="absolute pointer-events-none z-10"
              style={{
                left: `calc(${(t.x + 0.5) / W * 100}% - 4px)`,
                top: `calc(${(t.y + 0.5) / H * 100}% - 4px)`,
                width: "8px", height: "8px", borderRadius: "50%",
                background: trailType.color,
                opacity: 1 - (i / trails.length),
                transform: `scale(${1 - (i / trails.length)})`,
                transition: "all 0.1s linear",
                boxShadow: `0 0 10px ${trailType.color}`,
              }}
            />
          )
        })}

        {/* Enemies (Sentinels) Under Fog but Glow Over Fog */}
        {enemies && enemies.map((e) => (
            <div
              key={`enemy_base_${e.id}`}
              className="absolute pointer-events-none flex items-center justify-center z-20"
              style={{
                left: `${(e.x / W) * 100}%`, top: `${(e.y / H) * 100}%`,
                width: `${100/W}%`, height: `${100/H}%`,
                transition: "all 0.4s linear",
              }}
            >
              <div 
                className={`w-[60%] h-[60%] rounded bg-red-600 shadow-[0_0_20px_red] ${freezeActive ? 'grayscale opacity-50' : 'animate-pulse'}`}
              />
            </div>
        ))}

        {/* Player */}
        <div
          className="absolute pointer-events-none flex items-center justify-center z-30"
          style={{
            left: `${(playerPos.x / W) * 100}%`,
            top: `${(playerPos.y / H) * 100}%`,
            width: `${100/W}%`, height: `${100/H}%`,
            transition: "all 0.12s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div 
            className={`w-[60%] h-[60%] ${isDashing ? 'shadow-[0_0_30px_#00ffff] bg-[#00ffff] opacity-80 blur-[2px]' : 'shadow-[0_0_20px_#fff]'}`}
            style={!isDashing ? { background: "#fff", ...skinStyle } : { ...skinStyle }} 
          />
        </div>
      </div>

      {/* Fog of War / Spotlight effect */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-300 z-40"
        style={{
          background: flareActive 
            ? `radial-gradient(circle 800px at ${playerX}% ${playerY}%, transparent 50%, rgba(0,0,0,0.5) 100%)`
            : `radial-gradient(circle 250px at ${playerX}% ${playerY}%, transparent 10%, rgba(3,4,10,0.96) 80%, rgba(0,0,0,1) 100%)`,
        }}
      />

      {/* Enemy Glow Over Fog */}
      <div className="absolute inset-0 pointer-events-none z-50">
        {enemies && enemies.map((e) => (
            <div
              key={`enemy_glow_${e.id}`}
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                left: `${(e.x / W) * 100}%`, top: `${(e.y / H) * 100}%`,
                width: `${100/W}%`, height: `${100/H}%`,
                transition: "all 0.4s linear",
              }}
            >
              <div className={`w-[120%] h-[120%] rounded-full bg-red-600/60 blur-[15px] ${freezeActive ? 'opacity-0' : 'animate-pulse'}`} />
            </div>
        ))}
      </div>
    </div>
  );
});
SVGGameBoard.displayName = "SVGGameBoard";


// --- Main Page Component ---
export default function MazeRunner() {
  const { data, save, isLoaded } = useSaveData();
  const [gameState, setGameState] = useState("menu"); // menu, campaign, playing, arcade, shop, victory, gameover
  
  const [grid, setGrid] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [collectedCoins, setCollectedCoins] = useState(new Set());
  const [sessionCoins, setSessionCoins] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [level, setLevel] = useState(1);
  const [trails, setTrails] = useState([]);
  const [earnedStars, setEarnedStars] = useState(0);
  const [activePowerup, setActivePowerup] = useState(null);
  
  // Dash Mechanics
  const [dashCooldown, setDashCooldown] = useState(0);
  const [isDashing, setIsDashing] = useState(false);

  const timerRef = useRef(null);

  const getLevelConfig = (lvl) => {
    const size = Math.min(5 + Math.floor(lvl * 1.5), 35);
    const limit = 10 + Math.floor(size * 1.8);
    return { size, timeLimit: limit };
  };

  const initLevel = useCallback((lvl, mode = "campaign") => {
    const isArcade = mode === "arcade";
    const { size, timeLimit } = getLevelConfig(lvl);
    
    // Campaign is deterministic based on level string. Arcade uses pure random.
    const seed = isArcade ? null : `maze_level_${lvl}_v1`;
    const { grid: newGrid, initialEnemies } = generateMaze(size, size, seed, isArcade);
    
    setGrid(newGrid);
    setEnemies(initialEnemies);
    setPlayerPos({ x: 0, y: 0 });
    setCollectedCoins(new Set());
    if (lvl === 1) setSessionCoins(0); // Only reset coins if it's the start of an arcade run or campaign start
    setTrails([]);
    setTimeLeft(timeLimit);
    setMaxTime(timeLimit);
    setLevel(lvl);
    setActivePowerup(null);
    setDashCooldown(0);
    setIsDashing(false);
    setGameState(isArcade ? "arcade" : "playing");
  }, []);

  // Timer logic
  useEffect(() => {
    if (gameState === "playing" || gameState === "arcade") {
      timerRef.current = setInterval(() => {
        // Handle freeze powerup
        if (activePowerup?.type === 'freeze' && Date.now() < activePowerup.endTime) {
            return; // pause timer
        }

        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setGameState("gameover");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, activePowerup]);

  // Powerup & Dash Expiration check
  useEffect(() => {
      const check = setInterval(() => {
          if (activePowerup && Date.now() > activePowerup.endTime) {
              setActivePowerup(null);
          }
      }, 100);
      return () => clearInterval(check);
  }, [activePowerup]);

  useEffect(() => {
      if (dashCooldown > 0) {
          const t = setTimeout(() => setDashCooldown(c => c - 1), 1000);
          return () => clearTimeout(t);
      }
  }, [dashCooldown]);

  // Enemy movement logic (Arcade Mode)
  useEffect(() => {
    if (gameState !== "arcade" || !enemies.length) return;

    if (activePowerup?.type === 'freeze' && Date.now() < activePowerup.endTime) {
        return; // Enemies don't move
    }

    const interval = setInterval(() => {
        setEnemies(prev => {
            let hitPlayer = false;
            const nextEnemies = prev.map(e => {
                const cell = grid[e.y][e.x];
                const moves = [];
                if (!cell.walls.t) moves.push({dx: 0, dy: -1});
                if (!cell.walls.r) moves.push({dx: 1, dy: 0});
                if (!cell.walls.b) moves.push({dx: 0, dy: 1});
                if (!cell.walls.l) moves.push({dx: -1, dy: 0});
                
                if (moves.length === 0) return e;
                
                const m = moves[Math.floor(Math.random() * moves.length)];
                const nx = e.x + m.dx;
                const ny = e.y + m.dy;
                
                if (!isDashing && nx === playerPos.x && ny === playerPos.y) hitPlayer = true;
                
                return { ...e, x: nx, y: ny };
            });
            if (hitPlayer) setGameState("gameover");
            return nextEnemies;
        });
    }, 400);
    return () => clearInterval(interval);
  }, [gameState, grid, playerPos, activePowerup, enemies.length, isDashing]);

  const movePlayer = useCallback((dx, dy) => {
    if (gameState !== "playing" && gameState !== "arcade") return;
    
    setPlayerPos((prev) => {
      const cell = grid[prev.y][prev.x];
      let canMove = false;
      if (dy === -1 && !cell.walls.t) canMove = true;
      if (dx === 1 && !cell.walls.r) canMove = true;
      if (dy === 1 && !cell.walls.b) canMove = true;
      if (dx === -1 && !cell.walls.l) canMove = true;

      if (canMove) {
        const nx = prev.x + dx;
        const ny = prev.y + dy;
        
        setTrails(t => {
          const newTrails = [{ x: prev.x, y: prev.y }, ...t];
          if (newTrails.length > 12) newTrails.pop();
          return newTrails;
        });

        // Collision with enemy (Arcade)
        if (gameState === "arcade" && !isDashing) {
            const hitEnemy = enemies.some(e => e.x === nx && e.y === ny);
            if (hitEnemy) {
                setGameState("gameover");
                return { x: nx, y: ny };
            }
        }

        const nCell = grid[ny][nx];
        const key = `${nx}-${ny}`;

        // Coin collection
        if (nCell.isCoin && !collectedCoins.has(key)) {
          setCollectedCoins(c => {
            const nc = new Set(c);
            nc.add(key);
            setSessionCoins(sc => sc + 1);
            return nc;
          });
        }

        // Powerup collection
        if (nCell.powerup && !collectedCoins.has(key)) {
            setCollectedCoins(c => {
                const nc = new Set(c);
                nc.add(key);
                return nc;
            });
            const duration = nCell.powerup === 'flare' ? 10000 : 5000;
            setActivePowerup({ type: nCell.powerup, endTime: Date.now() + duration });
        }

        if (nCell.isExit) {
            if (gameState === "arcade") {
                // Instantly advance to next level in arcade
                setTimeout(() => initLevel(level + 1, "arcade"), 50);
            } else {
                // Campaign victory
                let stars = 1;
                if (timeLeft > maxTime * 0.5) stars = 3;
                else if (timeLeft > maxTime * 0.25) stars = 2;
                
                setEarnedStars(stars);
                setGameState("victory");
            }
        }
        return { x: nx, y: ny };
      }
      return prev;
    });
  }, [gameState, grid, timeLeft, maxTime, collectedCoins, enemies, initLevel, level, isDashing]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["ArrowUp", "w", "W"].includes(e.key)) movePlayer(0, -1);
      if (["ArrowRight", "d", "D"].includes(e.key)) movePlayer(1, 0);
      if (["ArrowDown", "s", "S"].includes(e.key)) movePlayer(0, 1);
      if (["ArrowLeft", "a", "A"].includes(e.key)) movePlayer(-1, 0);
      if (e.code === "Space" && dashCooldown === 0 && (gameState === "playing" || gameState === "arcade")) {
          setIsDashing(true);
          setDashCooldown(10);
          setTimeout(() => setIsDashing(false), 2500);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movePlayer, dashCooldown, gameState]);

  // Saves logic
  useEffect(() => {
    if (gameState === "victory" && isLoaded) {
      const currentStars = data.stars[level] || 0;
      const newStarsObj = { ...data.stars };
      if (earnedStars > currentStars) {
        newStarsObj[level] = earnedStars;
      }
      save({
        coins: data.coins + sessionCoins,
        highLevel: Math.max(data.highLevel || 1, level + 1),
        stars: newStarsObj
      });
      setSessionCoins(0); // Bank coins on victory screen
    } else if (gameState === "gameover" && isLoaded) {
      save({ 
          coins: data.coins + sessionCoins,
          arcadeHighScore: Math.max(data.arcadeHighScore || 0, level - 1)
      });
    }
  }, [gameState, isLoaded, earnedStars, level, save, data, sessionCoins]);

  const buyItem = (type, item) => {
    if (data.coins >= item.cost) {
      if (type === "skin") {
        save({ 
          coins: data.coins - item.cost,
          unlockedSkins: [...data.unlockedSkins, item.id],
          equippedSkin: item.id
        });
      } else {
        save({ 
          coins: data.coins - item.cost,
          unlockedTrails: [...data.unlockedTrails, item.id],
          equippedTrail: item.id
        });
      }
    }
  };

  const equipItem = (type, id) => {
    if (type === "skin") save({ equippedSkin: id });
    else save({ equippedTrail: id });
  };

  if (!isLoaded) return <div className="min-h-screen bg-[#020308] text-white flex items-center justify-center font-mono">INITIALIZING SYSTEM...</div>;

  const currentSkin = SKINS.find(s => s.id === data.equippedSkin) || SKINS[0];
  const currentTrail = TRAILS.find(t => t.id === data.equippedTrail) || TRAILS[0];

  // Danger calculation for screen shake
  const isDanger = gameState === "arcade" && !isDashing && enemies.some(e => Math.abs(e.x - playerPos.x) <= 2 && Math.abs(e.y - playerPos.y) <= 2);

  return (
    <div className="min-h-screen bg-[#020308] text-white flex flex-col font-mono relative overflow-hidden select-none">
      
      {/* Dynamic Grid Background */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]" 
        style={{ 
          backgroundImage: `linear-gradient(${ACCENT_COLOR} 1px, transparent 1px), linear-gradient(90deg, ${ACCENT_COLOR} 1px, transparent 1px)`, 
          backgroundSize: "60px 60px",
          transform: "perspective(500px) rotateX(60deg) translateY(-100px)",
          transformOrigin: "top center"
        }} 
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#020308_80%)]" />

      {/* Header */}
      <header className="w-full p-4 flex items-center justify-between z-20 bg-[#020308]/60 border-b border-[#1a1c2e] backdrop-blur-md">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2 group">
          <span className="group-hover:-translate-x-1 transition-transform">◀</span> SYSTEM.EXIT
        </Link>
        <div className="flex gap-4 items-center bg-[#080a12] px-4 py-1.5 rounded-full border border-[#1a1c2e]">
          <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_#fbbf24]" />
          <span className="font-bold text-yellow-400">{data.coins}</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10 relative overflow-y-auto">
        
        {/* MENU */}
        {gameState === "menu" && (
          <div className="flex flex-col items-center gap-6 max-w-md w-full animate-fade-in-up text-center pb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-[#ff44aa] blur-[60px] opacity-20" />
              <h1 className="relative text-6xl md:text-8xl font-black uppercase tracking-[0.1em] text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500" style={{ textShadow: "0 4px 20px rgba(255,68,170,0.3)" }}>
                MAZE<br/>RUNNER
              </h1>
            </div>
            
            <div className="w-full flex flex-col gap-4 mt-8">
              <button 
                onClick={() => setGameState("campaign")}
                className="group relative w-full py-5 rounded-2xl text-xl font-black tracking-widest overflow-hidden transition-all hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${ACCENT_COLOR}, #cc3388)`, boxShadow: `0 10px 30px ${ACCENT_COLOR}44` }}
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                CAMPAIGN
              </button>
              
              <button 
                onClick={() => initLevel(1, "arcade")}
                className="group relative w-full py-5 rounded-2xl text-xl font-black tracking-widest overflow-hidden transition-all hover:scale-[1.02] border-2 border-[#00ffff] bg-[#080a12]"
                style={{ boxShadow: `0 0 20px #00ffff22` }}
              >
                <div className="absolute inset-0 bg-[#00ffff] opacity-0 group-hover:opacity-10 transition-opacity" />
                <span className="text-[#00ffff] drop-shadow-[0_0_8px_#00ffff]">ENDLESS ARCADE</span>
                {data.arcadeHighScore > 0 && <span className="block text-[10px] text-slate-400 mt-1">HIGH SCORE: SECTOR {data.arcadeHighScore}</span>}
              </button>

              <button 
                onClick={() => setGameState("shop")}
                className="w-full py-4 rounded-2xl text-sm font-bold tracking-widest bg-[#080a12] border border-[#1a1c2e] hover:border-[#ff44aa66] hover:bg-[#ffffff05] transition-all"
              >
                GEAR & LOADOUT
              </button>
            </div>
          </div>
        )}

        {/* CAMPAIGN LEVEL SELECT */}
        {gameState === "campaign" && (
          <div className="flex flex-col items-center w-full max-w-4xl animate-fade-in-up pb-20">
            <div className="flex justify-between items-center w-full mb-8">
              <h2 className="text-3xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_10px_#ff44aa]">CAMPAIGN SECTOR</h2>
              <button onClick={() => setGameState("menu")} className="text-slate-400 hover:text-white px-4 py-2 border border-[#2a2d45] rounded-lg">RETURN</button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-4 w-full">
              {Array.from({ length: TOTAL_LEVELS }).map((_, i) => {
                const lvl = i + 1;
                const isUnlocked = lvl <= data.highLevel;
                const stars = data.stars[lvl] || 0;
                
                return (
                  <button
                    key={`lvl-${lvl}`}
                    disabled={!isUnlocked}
                    onClick={() => initLevel(lvl, "campaign")}
                    className={`relative aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border transition-all duration-300 ${
                      isUnlocked 
                        ? 'border-[#ff44aa55] bg-[#ff44aa11] hover:-translate-y-1 hover:shadow-[0_5px_15px_#ff44aa33] cursor-pointer' 
                        : 'border-[#1a1c2e] bg-[#04050a] opacity-50 cursor-not-allowed grayscale'
                    }`}
                  >
                    <span className={`text-xl font-black ${isUnlocked ? 'text-white' : 'text-slate-600'}`}>{lvl}</span>
                    
                    {isUnlocked && (
                      <div className="flex gap-1">
                        {[1, 2, 3].map(s => (
                          <span key={`star-${s}`} className={`text-[10px] ${stars >= s ? 'text-yellow-400 drop-shadow-[0_0_4px_#fbbf24]' : 'text-slate-700'}`}>★</span>
                        ))}
                      </div>
                    )}
                    
                    {!isUnlocked && <span className="absolute text-xs">🔒</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* SHOP */}
        {gameState === "shop" && (
          <div className="flex flex-col items-center gap-6 max-w-4xl w-full animate-fade-in-up pb-20">
            <div className="flex justify-between items-center w-full mb-4">
              <h2 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-[#ff44aa]">ARMORY</h2>
              <button onClick={() => setGameState("menu")} className="text-slate-400 hover:text-white px-4 py-2 border border-[#2a2d45] rounded-lg">RETURN</button>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* SKINS */}
              <div className="bg-[#080a12] border border-[#1a1c2e] rounded-2xl p-6 shadow-xl">
                <h3 className="text-xl font-bold mb-6 text-slate-300 flex items-center gap-3">
                  <span className="w-2 h-6 bg-[#ff44aa] rounded" /> CHASSIS
                </h3>
                <div className="flex flex-col gap-3">
                  {SKINS.map(item => {
                    const unlocked = data.unlockedSkins.includes(item.id);
                    const equipped = data.equippedSkin === item.id;
                    const canAfford = data.coins >= item.cost;
                    
                    return (
                      <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${equipped ? 'border-['+ACCENT_COLOR+'] bg-[#ff44aa0a] shadow-[inset_0_0_20px_#ff44aa11]' : 'border-[#1a1c2e] bg-[#04050a] hover:border-[#3a3d55]'}`}>
                        <div className="flex items-center gap-5">
                          <div className="w-10 h-10 bg-white shadow-[0_0_10px_#fff]" style={item.style} />
                          <span className="font-bold text-lg">{item.name}</span>
                        </div>
                        {equipped ? (
                          <span className="text-xs px-3 py-1.5 rounded bg-white text-black font-black tracking-widest">EQUIPPED</span>
                        ) : unlocked ? (
                          <button onClick={() => equipItem("skin", item.id)} className="text-xs px-4 py-1.5 rounded border border-[#ff44aa] text-[#ff44aa] hover:bg-[#ff44aa22] font-bold tracking-widest transition-colors">EQUIP</button>
                        ) : (
                          <button 
                            onClick={() => buyItem("skin", item)}
                            disabled={!canAfford}
                            className={`text-sm px-4 py-1.5 rounded-lg flex items-center gap-2 font-bold transition-all ${canAfford ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]' : 'opacity-40 grayscale cursor-not-allowed border border-slate-700'}`}
                          >
                            <span>{item.cost}</span>
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* TRAILS */}
              <div className="bg-[#080a12] border border-[#1a1c2e] rounded-2xl p-6 shadow-xl">
                <h3 className="text-xl font-bold mb-6 text-slate-300 flex items-center gap-3">
                  <span className="w-2 h-6 bg-[#ff44aa] rounded" /> EXHAUST
                </h3>
                <div className="flex flex-col gap-3">
                  {TRAILS.map(item => {
                    const unlocked = data.unlockedTrails.includes(item.id);
                    const equipped = data.equippedTrail === item.id;
                    const canAfford = data.coins >= item.cost;
                    
                    return (
                      <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${equipped ? 'border-['+ACCENT_COLOR+'] bg-[#ff44aa0a] shadow-[inset_0_0_20px_#ff44aa11]' : 'border-[#1a1c2e] bg-[#04050a] hover:border-[#3a3d55]'}`}>
                        <div className="flex items-center gap-5">
                          <div className="w-6 h-6 rounded-full" style={{ background: item.color !== 'transparent' ? item.color : '#333', boxShadow: item.color !== 'transparent' ? `0 0 10px ${item.color}` : 'none' }} />
                          <span className="font-bold text-lg">{item.name}</span>
                        </div>
                        {equipped ? (
                          <span className="text-xs px-3 py-1.5 rounded bg-white text-black font-black tracking-widest">EQUIPPED</span>
                        ) : unlocked ? (
                          <button onClick={() => equipItem("trail", item.id)} className="text-xs px-4 py-1.5 rounded border border-[#ff44aa] text-[#ff44aa] hover:bg-[#ff44aa22] font-bold tracking-widest transition-colors">EQUIP</button>
                        ) : (
                          <button 
                            onClick={() => buyItem("trail", item)}
                            disabled={!canAfford}
                            className={`text-sm px-4 py-1.5 rounded-lg flex items-center gap-2 font-bold transition-all ${canAfford ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]' : 'opacity-40 grayscale cursor-not-allowed border border-slate-700'}`}
                          >
                            <span>{item.cost}</span>
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PLAYING GRID */}
        {(gameState === "playing" || gameState === "arcade" || gameState === "gameover" || gameState === "victory") && (
          <div className="flex flex-col items-center w-full max-w-2xl animate-fade-in-up">
            
            {/* HUD */}
            <div className={`w-full flex justify-between items-center mb-6 px-6 py-4 bg-[#080a12] border ${gameState === 'arcade' ? 'border-[#00ffff44]' : 'border-[#1a1c2e]'} rounded-2xl shadow-xl backdrop-blur-sm relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 h-1 transition-all duration-1000 ${gameState === 'arcade' ? 'bg-[#00ffff]' : 'bg-[#ff44aa]'}`} style={{ width: `${(timeLeft / maxTime) * 100}%` }} />
              
              <div className="flex flex-col">
                <span className={`text-[10px] tracking-widest font-bold ${gameState === 'arcade' ? 'text-[#00ffff]' : 'text-slate-500'}`}>{gameState === 'arcade' ? 'WAVE' : 'SECTOR'}</span>
                <span className="text-2xl font-black text-white">{level}</span>
              </div>
              
              <div className="flex flex-col items-center">
                <span className={`text-[10px] tracking-widest font-bold ${activePowerup?.type === 'freeze' ? 'text-[#55ff55]' : 'text-slate-500'}`}>{activePowerup?.type === 'freeze' ? 'FROZEN' : 'LIFELINE'}</span>
                <span className={`text-3xl font-black tracking-wider ${activePowerup?.type === 'freeze' ? 'text-[#55ff55] drop-shadow-[0_0_8px_#55ff55]' : timeLeft <= Math.floor(maxTime*0.2) ? 'text-red-500 animate-pulse drop-shadow-[0_0_10px_red]' : 'text-white'}`}>
                  {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
              
              <div className="flex flex-col items-center border-l border-r border-[#1a1c2e] px-4">
                  <span className="text-[10px] text-[#00ffff] tracking-widest font-bold">PHASE DASH</span>
                  {dashCooldown > 0 ? (
                      <span className="text-xl font-bold text-slate-500">{dashCooldown}s</span>
                  ) : (
                      <span className="text-xl font-bold text-[#00ffff] drop-shadow-[0_0_8px_#00ffff] animate-pulse">READY</span>
                  )}
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-500 tracking-widest font-bold">DATA</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-yellow-400">+{sessionCoins}</span>
                  <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_#fbbf24]" />
                </div>
              </div>
            </div>

            <SVGGameBoard 
              grid={grid} 
              playerPos={playerPos} 
              skinStyle={currentSkin.style} 
              trailType={currentTrail}
              trails={trails}
              collectedCoins={collectedCoins}
              enemies={gameState === 'arcade' ? enemies : []}
              activePowerup={activePowerup}
              isDashing={isDashing}
              isDanger={isDanger}
            />

            {/* Mobile Controls */}
            <div className="mt-8 grid grid-cols-4 gap-3 md:hidden">
              <div />
              <button onClick={() => movePlayer(0, -1)} className="w-16 h-16 bg-[#080a12] border border-[#2a2d45] rounded-2xl flex items-center justify-center active:bg-[#ff44aa22] active:border-[#ff44aa] active:scale-95 transition-all shadow-lg">
                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-slate-400" />
              </button>
              <div />
              {/* Dash Button */}
              <button 
                  onClick={() => {
                      if(dashCooldown === 0 && (gameState === "playing" || gameState === "arcade")) {
                          setIsDashing(true);
                          setDashCooldown(10);
                          setTimeout(() => setIsDashing(false), 2500);
                      }
                  }} 
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${dashCooldown === 0 ? 'bg-[#00ffff22] border border-[#00ffff] active:scale-95 text-[#00ffff] drop-shadow-[0_0_10px_#00ffff]' : 'bg-[#080a12] border border-[#2a2d45] text-slate-600'}`}
              >
                 <span className="font-bold text-xs">{dashCooldown > 0 ? `${dashCooldown}s` : 'DASH'}</span>
              </button>
              
              <button onClick={() => movePlayer(-1, 0)} className="w-16 h-16 bg-[#080a12] border border-[#2a2d45] rounded-2xl flex items-center justify-center active:bg-[#ff44aa22] active:border-[#ff44aa] active:scale-95 transition-all shadow-lg">
                <div className="w-0 h-0 border-t-[8px] border-b-[8px] border-r-[12px] border-t-transparent border-b-transparent border-r-slate-400" />
              </button>
              <button onClick={() => movePlayer(0, 1)} className="w-16 h-16 bg-[#080a12] border border-[#2a2d45] rounded-2xl flex items-center justify-center active:bg-[#ff44aa22] active:border-[#ff44aa] active:scale-95 transition-all shadow-lg">
                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-slate-400" />
              </button>
              <button onClick={() => movePlayer(1, 0)} className="w-16 h-16 bg-[#080a12] border border-[#2a2d45] rounded-2xl flex items-center justify-center active:bg-[#ff44aa22] active:border-[#ff44aa] active:scale-95 transition-all shadow-lg">
                <div className="w-0 h-0 border-t-[8px] border-b-[8px] border-l-[12px] border-t-transparent border-b-transparent border-l-slate-400" />
              </button>
              <div />
            </div>

            <div className="hidden md:block mt-6 text-center text-slate-500 text-sm">
                USE <span className="font-bold text-white bg-slate-800 px-2 py-1 rounded">W A S D</span> OR <span className="font-bold text-white bg-slate-800 px-2 py-1 rounded">ARROWS</span> TO MOVE. PRESS <span className="font-bold text-[#00ffff] bg-slate-800 px-2 py-1 rounded">SPACEBAR</span> TO PHASE DASH.
            </div>

          </div>
        )}

        {/* GAMEOVER OVERLAY */}
        {gameState === "gameover" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="bg-[#0a0505] border border-red-500/40 p-10 rounded-3xl max-w-sm w-full text-center flex flex-col items-center shadow-[0_0_80px_rgba(239,68,68,0.2)]">
              <span className="text-7xl mb-6 drop-shadow-[0_0_20px_red]">💀</span>
              <h2 className="text-4xl font-black text-red-500 tracking-widest mb-2">SIGNAL LOST</h2>
              <p className="text-slate-400 text-sm mb-8 font-bold tracking-widest">
                {level > 1 && enemies.length ? `SURVIVED ${level - 1} WAVES` : 'LIFELINE EXPIRED'}
              </p>
              
              <div className="flex items-center gap-3 mb-10 bg-red-950/30 px-6 py-3 rounded-full border border-red-900/50">
                <span className="text-xs font-bold text-red-400 tracking-widest">RECOVERED</span>
                <span className="font-black text-yellow-400 text-xl">+{sessionCoins}</span>
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 shadow-[0_0_10px_#fbbf24]" />
              </div>

              <button 
                onClick={() => {
                    if (enemies.length) {
                        initLevel(1, "arcade");
                    } else {
                        initLevel(level, "campaign");
                    }
                }}
                className="w-full py-5 rounded-xl text-lg font-black tracking-widest mb-4 hover:scale-[1.02] transition-transform bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                REBOOT
              </button>
              <button 
                onClick={() => setGameState("campaign")}
                className="w-full py-4 rounded-xl text-sm font-bold tracking-widest border border-[#2a2d45] hover:bg-[#ffffff0a] text-slate-300"
              >
                ABORT
              </button>
            </div>
          </div>
        )}

        {/* VICTORY OVERLAY (Campaign Only) */}
        {gameState === "victory" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="bg-[#080a12] border border-[#ff44aa44] p-10 rounded-3xl max-w-sm w-full text-center flex flex-col items-center shadow-[0_0_80px_rgba(255,68,170,0.2)] relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ff44aa22_0%,_transparent_70%)] pointer-events-none" />
              
              <div className="flex gap-2 mb-6 relative z-10">
                {[1,2,3].map(s => (
                  <span key={s} className={`text-5xl transition-all duration-500 transform ${s <= earnedStars ? 'text-yellow-400 drop-shadow-[0_0_20px_#fbbf24] scale-110' : 'text-slate-800 scale-90'}`}>★</span>
                ))}
              </div>

              <h2 className="text-4xl font-black tracking-widest mb-2 relative z-10 text-transparent bg-clip-text bg-gradient-to-b from-white to-[#ff44aa] drop-shadow-[0_0_10px_#ff44aa]">ESCAPED</h2>
              <p className="text-slate-400 text-sm mb-8 font-bold tracking-widest relative z-10">SECTOR {level} CLEARED</p>
              
              <div className="flex gap-4 w-full mb-10 relative z-10">
                <div className="flex-1 bg-[#ffffff05] border border-[#1a1c2e] p-4 rounded-2xl flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 tracking-widest font-bold mb-2">DATA</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-2xl text-yellow-400">+{sessionCoins}</span>
                    <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_#fbbf24]" />
                  </div>
                </div>
                <div className="flex-1 bg-[#ffffff05] border border-[#1a1c2e] p-4 rounded-2xl flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 tracking-widest font-bold mb-2">SPEED</span>
                  <span className="font-black text-2xl text-white drop-shadow-[0_0_5px_#fff]">{timeLeft}s</span>
                </div>
              </div>

              {level < TOTAL_LEVELS ? (
                <button 
                  onClick={() => initLevel(level + 1, "campaign")}
                  className="w-full py-5 rounded-xl text-lg font-black tracking-widest mb-4 hover:scale-[1.02] transition-transform relative z-10 text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT_COLOR}, #cc3388)`, boxShadow: `0 10px 30px ${ACCENT_COLOR}44` }}
                >
                  NEXT SECTOR
                </button>
              ) : (
                <div className="w-full py-5 rounded-xl text-lg font-black tracking-widest mb-4 bg-yellow-500 text-black">
                  CAMPAIGN COMPLETE
                </div>
              )}
              
              <button 
                onClick={() => setGameState("campaign")}
                className="w-full py-4 rounded-xl text-sm font-bold tracking-widest border border-[#2a2d45] hover:bg-[#ffffff0a] text-slate-300 relative z-10"
              >
                SECTOR MAP
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Global Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ghost-pulse {
          0% { transform: translateY(0); filter: drop-shadow(0 0 5px rgba(255,255,255,0.8)); }
          100% { transform: translateY(-4px); filter: drop-shadow(0 0 15px rgba(255,255,255,1)); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; backdrop-filter: blur(0); }
          to { opacity: 1; backdrop-filter: blur(12px); }
        }
        @keyframes screen-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(2px, 2px) rotate(0.5deg); }
          50% { transform: translate(-2px, -2px) rotate(-0.5deg); }
          75% { transform: translate(-2px, 2px) rotate(0.5deg); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-screen-shake { animation: screen-shake 0.3s ease-in-out infinite; }
      `}} />
    </div>
  );
}
