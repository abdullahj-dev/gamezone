"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";

// --- Configuration & Constants ---
const SAVE_KEY = "connect4_save_v1";
const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const P1 = 1; // Yellow / Gold
const P2 = 2; // Cyan
const ACCENT = "#ffcc00";

const POWERUP_DEFS = {
  bomb: { id: "bomb", name: "BOMB", cost: 50, icon: "💣", desc: "Destroys up to 3 pieces at the bottom of a column." },
  anvil: { id: "anvil", name: "ANVIL", cost: 100, icon: "⚓", desc: "Completely obliterates an entire column." },
  doubleTurn: { id: "doubleTurn", name: "DOUBLE", cost: 150, icon: "⚡", desc: "Take two turns back-to-back." }
};

// --- Bot Logic (Minimax with Alpha-Beta Pruning) ---
function evaluateWindow(window, piece) {
  let score = 0;
  const oppPiece = piece === P1 ? P2 : P1;
  let countPiece = 0;
  let countEmpty = 0;
  let countOpp = 0;

  for (let i = 0; i < 4; i++) {
    if (window[i] === piece) countPiece++;
    else if (window[i] === EMPTY) countEmpty++;
    else if (window[i] === oppPiece) countOpp++;
  }

  if (countPiece === 4) score += 1000;
  else if (countPiece === 3 && countEmpty === 1) score += 50;
  else if (countPiece === 2 && countEmpty === 2) score += 10;
  if (countOpp === 3 && countEmpty === 1) score -= 80;

  return score;
}

function scorePosition(board, piece) {
  let score = 0;
  
  // Center column preference
  let centerArray = [];
  for (let r = 0; r < ROWS; r++) centerArray.push(board[r][Math.floor(COLS/2)]);
  let centerCount = centerArray.filter(p => p === piece).length;
  score += centerCount * 30;

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let rowArray = board[r];
    for (let c = 0; c < COLS - 3; c++) {
      let window = rowArray.slice(c, c + 4);
      score += evaluateWindow(window, piece);
    }
  }

  // Vertical
  for (let c = 0; c < COLS; c++) {
    let colArray = [];
    for (let r = 0; r < ROWS; r++) colArray.push(board[r][c]);
    for (let r = 0; r < ROWS - 3; r++) {
      let window = colArray.slice(r, r + 4);
      score += evaluateWindow(window, piece);
    }
  }

  // Positive Diagonal
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      let window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
      score += evaluateWindow(window, piece);
    }
  }

  // Negative Diagonal
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      let window = [board[r+3][c], board[r+2][c+1], board[r+1][c+2], board[r][c+3]];
      score += evaluateWindow(window, piece);
    }
  }

  return score;
}

function getValidLocations(board) {
  let validLocations = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === EMPTY) validLocations.push(c);
  }
  return validLocations;
}

function checkWin(board, piece) {
  // Horizontal
  for (let c = 0; c < COLS - 3; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c] === piece && board[r][c+1] === piece && board[r][c+2] === piece && board[r][c+3] === piece) return true;
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      if (board[r][c] === piece && board[r+1][c] === piece && board[r+2][c] === piece && board[r+3][c] === piece) return true;
    }
  }
  // Positive Diagonals
  for (let c = 0; c < COLS - 3; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      if (board[r][c] === piece && board[r+1][c+1] === piece && board[r+2][c+2] === piece && board[r+3][c+3] === piece) return true;
    }
  }
  // Negative Diagonals
  for (let c = 0; c < COLS - 3; c++) {
    for (let r = 3; r < ROWS; r++) {
      if (board[r][c] === piece && board[r-1][c+1] === piece && board[r-2][c+2] === piece && board[r-3][c+3] === piece) return true;
    }
  }
  return false;
}

function isTerminalNode(board) {
  return checkWin(board, P1) || checkWin(board, P2) || getValidLocations(board).length === 0;
}

function getNextOpenRow(board, c) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][c] === EMPTY) return r;
  }
  return -1;
}

function minimax(board, depth, alpha, beta, maximizingPlayer) {
  let validLocations = getValidLocations(board);
  let isTerminal = isTerminalNode(board);
  
  if (depth === 0 || isTerminal) {
    if (isTerminal) {
      if (checkWin(board, P2)) return { score: 10000000000000, col: null };
      else if (checkWin(board, P1)) return { score: -10000000000000, col: null };
      else return { score: 0, col: null };
    } else {
      return { score: scorePosition(board, P2), col: null };
    }
  }

  if (maximizingPlayer) {
    let value = -Infinity;
    let bestCol = validLocations[Math.floor(Math.random() * validLocations.length)];
    for (let c of validLocations) {
      let r = getNextOpenRow(board, c);
      let bCopy = board.map(row => [...row]);
      bCopy[r][c] = P2;
      let newScore = minimax(bCopy, depth - 1, alpha, beta, false).score;
      if (newScore > value) {
        value = newScore;
        bestCol = c;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return { score: value, col: bestCol };
  } else {
    let value = Infinity;
    let bestCol = validLocations[Math.floor(Math.random() * validLocations.length)];
    for (let c of validLocations) {
      let r = getNextOpenRow(board, c);
      let bCopy = board.map(row => [...row]);
      bCopy[r][c] = P1;
      let newScore = minimax(bCopy, depth - 1, alpha, beta, true).score;
      if (newScore < value) {
        value = newScore;
        bestCol = c;
      }
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return { score: value, col: bestCol };
  }
}

// --- Save Hook ---
function useSaveData() {
  const [data, setData] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const defaultData = {
      coins: 200, 
      inventory: { bomb: 0, anvil: 0, doubleTurn: 0 },
      stats: { wins: 0, losses: 0, draws: 0 }
    };
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed) {
        setData({
          coins: parsed.coins || 0,
          inventory: { ...defaultData.inventory, ...(parsed.inventory || {}) },
          stats: { ...defaultData.stats, ...(parsed.stats || {}) }
        });
      } else {
        setData(defaultData);
      }
    } catch (e) {
      setData(defaultData);
    }
    setIsLoaded(true);
  }, []);

  const save = useCallback((newData) => {
    setData(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem(SAVE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { data, save, isLoaded };
}

// --- Main Game Component ---
export default function ConnectFour() {
  const { data, save, isLoaded } = useSaveData();
  const [gameState, setGameState] = useState("menu"); // menu, mode_select, shop, playing, gameover
  const [mode, setMode] = useState("bot"); // bot, local, practice
  const [board, setBoard] = useState(Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY)));
  
  const [currentPlayer, setCurrentPlayer] = useState(P1);
  const [winner, setWinner] = useState(null); // P1, P2, 'draw'
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [hoverCol, setHoverCol] = useState(null);
  const [activePowerup, setActivePowerup] = useState(null); // null, 'bomb', 'anvil', 'doubleTurn'
  const [doubleTurnActive, setDoubleTurnActive] = useState(false);

  // Pieces array for rendering absolute positioned elements (for gravity animation)
  const [pieces, setPieces] = useState([]); 

  const pathData = useMemo(() => {
    let d = "M0,0 H700 V600 H0 Z ";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let cx = c * 100 + 50;
        let cy = r * 100 + 50;
        let rad = 38;
        d += `M${cx + rad},${cy} a${rad},${rad} 0 1,0 -${rad*2},0 a${rad},${rad} 0 1,0 ${rad*2},0 Z `;
      }
    }
    return d;
  }, []);

  const initGame = (selectedMode) => {
    setMode(selectedMode);
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY)));
    setPieces([]);
    setCurrentPlayer(P1);
    setWinner(null);
    setActivePowerup(null);
    setDoubleTurnActive(false);
    setGameState("playing");
  };

  const handleWin = useCallback((w) => {
    setWinner(w);
    if (mode === "bot") {
      if (w === P1) {
        save({ 
          coins: (data?.coins || 0) + 50, 
          stats: { ...(data?.stats || {}), wins: (data?.stats?.wins || 0) + 1 }
        });
      } else if (w === P2) {
        save({ stats: { ...(data?.stats || {}), losses: (data?.stats?.losses || 0) + 1 } });
      } else {
        save({ 
          coins: (data?.coins || 0) + 10,
          stats: { ...(data?.stats || {}), draws: (data?.stats?.draws || 0) + 1 }
        });
      }
    }
    setTimeout(() => setGameState("gameover"), 1500);
  }, [mode, data, save]);

  // Handle human move or bot move
  const dropPiece = useCallback(async (col) => {
    if (winner || isAnimating) return;

    // Powerup logic
    if (activePowerup) {
      let bCopy = board.map(row => [...row]);
      let valid = false;

      if (activePowerup === "bomb") {
        let count = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (bCopy[r][col] !== EMPTY && count < 3) {
            bCopy[r][col] = EMPTY;
            count++;
          }
        }
        if (count > 0) valid = true;
      } else if (activePowerup === "anvil") {
        let count = 0;
        for (let r = 0; r < ROWS; r++) {
          if (bCopy[r][col] !== EMPTY) {
            bCopy[r][col] = EMPTY;
            count++;
          }
        }
        if (count > 0) valid = true;
      }

      if (valid) {
        // consume powerup
        const inv = { ...(data?.inventory || {}) };
        inv[activePowerup]--;
        save({ inventory: inv });

        // Force pieces to match board state (remove destroyed pieces)
        setBoard(bCopy);
        setPieces(prev => prev.filter(p => {
           // Keep only if bCopy has a piece there
           return bCopy[p.r][p.c] !== EMPTY;
        }));

        setActivePowerup(null);
        // Switch turn after powerup (powerup uses a turn)
        setCurrentPlayer(currentPlayer === P1 ? P2 : P1);
        return;
      } else {
        // If they clicked an empty column for bomb/anvil, just cancel it
        setActivePowerup(null);
      }
    }

    const r = getNextOpenRow(board, col);
    if (r === -1) return; // Full column

    setIsAnimating(true);
    
    // Add piece to state for rendering
    const newPiece = { id: Date.now() + Math.random(), r, c: col, player: currentPlayer };
    setPieces(prev => [...prev, newPiece]);

    // Update logical board
    const newBoard = board.map(row => [...row]);
    newBoard[r][col] = currentPlayer;
    setBoard(newBoard);

    // Wait for animation (CSS gravity takes ~0.4s)
    await new Promise(res => setTimeout(res, 400));
    setIsAnimating(false);

    if (checkWin(newBoard, currentPlayer)) {
      handleWin(currentPlayer);
      return;
    }

    if (getValidLocations(newBoard).length === 0) {
      handleWin('draw');
      return;
    }

    if (doubleTurnActive) {
      setDoubleTurnActive(false); // second turn used
    } else {
      setCurrentPlayer(currentPlayer === P1 ? P2 : P1);
    }

  }, [board, currentPlayer, winner, isAnimating, activePowerup, data, save, handleWin, doubleTurnActive]);

  // Bot Turn Trigger
  useEffect(() => {
    if (gameState === "playing" && mode === "bot" && currentPlayer === P2 && !winner && !isAnimating) {
      // Small delay for realism
      const timer = setTimeout(() => {
        const { col } = minimax(board, 5, -Infinity, Infinity, true);
        if (col !== null) {
          dropPiece(col);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameState, mode, winner, isAnimating, board, dropPiece]);

  const useDoubleTurn = () => {
    if ((data?.inventory?.doubleTurn || 0) > 0 && !activePowerup && !doubleTurnActive) {
      const inv = { ...(data?.inventory || {}) };
      inv.doubleTurn--;
      save({ inventory: inv });
      setDoubleTurnActive(true);
    }
  };

  const buyPowerup = (id, cost) => {
    if ((data?.coins || 0) >= cost) {
      save({
        coins: (data?.coins || 0) - cost,
        inventory: { ...(data?.inventory || {}), [id]: (data?.inventory?.[id] || 0) + 1 }
      });
    }
  };

  if (!isLoaded || !data) return <div className="min-h-screen bg-[#060813] text-white flex items-center justify-center font-mono">LOADING SYSTEM...</div>;

  return (
    <div className="min-h-screen bg-[#060813] text-white font-mono flex flex-col items-center select-none overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: "radial-gradient(circle at 50% -20%, #1a2a50 0%, #060813 80%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      {/* Header */}
      <header className="w-full max-w-4xl p-6 flex items-center justify-between z-20">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-2 group">
          <span className="group-hover:-translate-x-1 transition-transform">◀</span> SYSTEM.EXIT
        </Link>
        <div className="flex gap-4 items-center bg-[#0d1222] px-4 py-2 rounded-xl border border-[#1e2a4a] shadow-lg">
          <div className="w-3 h-3 rounded-full bg-[#ffcc00] shadow-[0_0_10px_#ffcc00]" />
          <span className="font-bold text-[#ffcc00]">{data?.coins || 0} <span className="text-slate-500 text-xs ml-1">CR</span></span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center p-4 z-10">
        
        {/* MENU */}
        {gameState === "menu" && (
          <div className="flex flex-col items-center gap-8 w-full max-w-sm animate-fade-in-up">
            <div className="text-center">
              <h1 className="text-6xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_4px_20px_rgba(255,204,0,0.2)] mb-2">
                CONNECT
              </h1>
              <h1 className="text-8xl font-black uppercase tracking-widest text-[#ffcc00] drop-shadow-[0_0_30px_rgba(255,204,0,0.4)]">
                FOUR
              </h1>
            </div>

            <div className="w-full flex flex-col gap-4 mt-4">
              <button onClick={() => setGameState("mode_select")} className="w-full py-5 rounded-2xl text-xl font-black tracking-widest text-black bg-gradient-to-br from-[#ffcc00] to-[#e6b800] hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(255,204,0,0.3)]">
                INITIALIZE
              </button>
              <button onClick={() => setGameState("shop")} className="w-full py-4 rounded-2xl text-sm font-bold tracking-widest bg-[#0d1222] border border-[#1e2a4a] hover:bg-[#1a2540] transition-colors text-slate-300">
                BLACK MARKET
              </button>
            </div>
          </div>
        )}

        {/* MODE SELECT */}
        {gameState === "mode_select" && (
          <div className="flex flex-col items-center gap-6 w-full max-w-md animate-fade-in-up">
            <h2 className="text-3xl font-black tracking-widest mb-4">SELECT PROTOCOL</h2>
            
            <button onClick={() => initGame("bot")} className="w-full p-6 rounded-2xl bg-[#0d1222] border border-[#1e2a4a] hover:border-[#ffcc00] hover:bg-[#1a2540] transition-all text-left flex items-center justify-between group">
              <div>
                <h3 className="text-xl font-bold text-[#ffcc00] mb-1">VS MACHINE</h3>
                <p className="text-xs text-slate-400">Play against the tactical AI</p>
              </div>
              <span className="text-2xl opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">▶</span>
            </button>

            <button onClick={() => initGame("local")} className="w-full p-6 rounded-2xl bg-[#0d1222] border border-[#1e2a4a] hover:border-[#00ffff] hover:bg-[#1a2540] transition-all text-left flex items-center justify-between group">
              <div>
                <h3 className="text-xl font-bold text-[#00ffff] mb-1">LOCAL CO-OP</h3>
                <p className="text-xs text-slate-400">Play side-by-side with a human</p>
              </div>
              <span className="text-2xl opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">▶</span>
            </button>

            <button onClick={() => initGame("practice")} className="w-full p-6 rounded-2xl bg-[#0d1222] border border-[#1e2a4a] hover:border-[#ff0055] hover:bg-[#1a2540] transition-all text-left flex items-center justify-between group">
              <div>
                <h3 className="text-xl font-bold text-[#ff0055] mb-1">SANDBOX</h3>
                <p className="text-xs text-slate-400">Control both sides to test strategies</p>
              </div>
              <span className="text-2xl opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">▶</span>
            </button>

            <button onClick={() => setGameState("menu")} className="mt-4 text-sm text-slate-500 hover:text-white transition-colors">CANCEL</button>
          </div>
        )}

        {/* SHOP */}
        {gameState === "shop" && (
          <div className="flex flex-col items-center gap-8 w-full max-w-2xl animate-fade-in-up">
            <div className="text-center">
              <h2 className="text-3xl font-black tracking-widest text-[#ffcc00] drop-shadow-[0_0_10px_#ffcc00]">BLACK MARKET</h2>
              <p className="text-slate-400 text-sm mt-2">Purchase tactical advantages</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {Object.values(POWERUP_DEFS).map(p => {
                const canAfford = (data?.coins || 0) >= p.cost;
                return (
                  <div key={p.id} className="bg-[#0d1222] border border-[#1e2a4a] p-6 rounded-2xl flex flex-col items-center text-center hover:border-[#ffcc0055] transition-colors relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#ffcc0011] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <span className="text-5xl mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{p.icon}</span>
                    <h3 className="text-lg font-black tracking-wider mb-2">{p.name}</h3>
                    <p className="text-xs text-slate-400 mb-6 flex-1">{p.desc}</p>
                    
                    <div className="w-full flex items-center justify-between border-t border-[#1e2a4a] pt-4 mt-auto">
                      <span className="text-xs font-bold text-slate-500">OWNED: {data?.inventory?.[p.id] || 0}</span>
                      <button 
                        disabled={!canAfford}
                        onClick={() => buyPowerup(p.id, p.cost)}
                        className={`text-sm px-4 py-1.5 rounded-lg font-bold flex items-center gap-2 ${canAfford ? 'bg-[#ffcc00] text-black hover:scale-105 transition-transform shadow-[0_0_10px_rgba(255,204,0,0.3)]' : 'bg-[#1a2540] text-slate-500 cursor-not-allowed'}`}
                      >
                        {p.cost} CR
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={() => setGameState("menu")} className="mt-4 px-8 py-3 rounded-xl border border-[#1e2a4a] hover:bg-[#1a2540] text-sm font-bold tracking-widest text-slate-300">RETURN TO BASE</button>
          </div>
        )}

        {/* PLAYING GRID */}
        {(gameState === "playing" || gameState === "gameover") && (
          <div className="flex flex-col items-center w-full max-w-3xl animate-fade-in-up">
            
            {/* HUD */}
            <div className="w-full flex items-center justify-between mb-8 px-8 py-4 bg-[#0d1222]/80 backdrop-blur-md border border-[#1e2a4a] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              {/* P1 Stats */}
              <div className={`flex items-center gap-4 transition-opacity ${currentPlayer === P1 ? 'opacity-100 scale-105' : 'opacity-40 grayscale'}`}>
                <div className="w-12 h-12 rounded-full border-4 border-[#0d1222] bg-[#ffcc00] shadow-[0_0_20px_#ffcc00]" />
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 font-bold tracking-widest">PLAYER 1</span>
                  <span className="text-xl font-black text-[#ffcc00]">HUMAN</span>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-bold tracking-widest mb-1">STATUS</span>
                {doubleTurnActive ? (
                  <span className="px-4 py-1 rounded bg-[#ff005522] border border-[#ff0055] text-[#ff0055] text-xs font-black tracking-widest animate-pulse">DOUBLE TURN</span>
                ) : activePowerup ? (
                  <span className="px-4 py-1 rounded bg-white/10 border border-white text-white text-xs font-black tracking-widest animate-pulse">DEPLOYING {activePowerup.toUpperCase()}</span>
                ) : (
                  <span className="text-sm font-bold tracking-widest">{currentPlayer === P1 ? "AWAITING P1" : mode === "bot" ? "CPU COMPUTING..." : "AWAITING P2"}</span>
                )}
              </div>

              {/* P2 Stats */}
              <div className={`flex items-center gap-4 transition-opacity text-right flex-row-reverse ${currentPlayer === P2 ? 'opacity-100 scale-105' : 'opacity-40 grayscale'}`}>
                <div className="w-12 h-12 rounded-full border-4 border-[#0d1222] bg-[#00ffff] shadow-[0_0_20px_#00ffff]" />
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 font-bold tracking-widest">PLAYER 2</span>
                  <span className="text-xl font-black text-[#00ffff]">{mode === "bot" ? "MACHINE" : "HUMAN"}</span>
                </div>
              </div>
            </div>

            {/* Board Container */}
            <div className="relative w-full max-w-2xl aspect-[7/6] mx-auto bg-[#060813] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_0_4px_#2a3a60]">
              
              {/* Absolute Falling Pieces Layer */}
              <div className="absolute inset-0 z-0">
                {pieces.map(p => {
                  const xPos = (p.c / COLS) * 100;
                  const yPos = (p.r / ROWS) * 100;
                  const color = p.player === P1 ? "#ffcc00" : "#00ffff";
                  const glow = p.player === P1 ? "rgba(255,204,0,0.6)" : "rgba(0,255,255,0.6)";
                  
                  return (
                    <div 
                      key={p.id}
                      className="absolute animate-drop-piece flex items-center justify-center"
                      style={{
                        left: `${xPos}%`, top: `${yPos}%`,
                        width: `${100/COLS}%`, height: `${100/ROWS}%`,
                      }}
                    >
                      <div className="w-[80%] h-[80%] rounded-full shadow-inner" style={{ background: color, boxShadow: `inset 0 -10px 20px rgba(0,0,0,0.5), 0 0 30px ${glow}` }} />
                    </div>
                  )
                })}
              </div>

              {/* The SVG Board Plate */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] z-10" viewBox="0 0 700 600" preserveAspectRatio="none">
                <defs>
                  <filter id="inner-shadow">
                    <feOffset dx="0" dy="8"/>
                    <feGaussianBlur stdDeviation="6" result="offset-blur"/>
                    <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                    <feFlood floodColor="black" floodOpacity="0.8" result="color"/>
                    <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                    <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                  </filter>
                </defs>
                <path d={pathData} fill="#12182b" filter="url(#inner-shadow)" />
              </svg>

              {/* Interaction Layer (invisible grid on top) */}
              <div className="absolute inset-0 grid z-20" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
                {Array.from({ length: ROWS * COLS }).map((_, i) => {
                  const r = Math.floor(i / COLS);
                  const c = i % COLS;
                  const isHovered = hoverCol === c && currentPlayer === P1 && !winner && !isAnimating;
                  return (
                    <div 
                      key={i}
                      onClick={() => {
                        if (mode === "bot" && currentPlayer === P2) return;
                        dropPiece(c);
                      }}
                      onMouseEnter={() => setHoverCol(c)}
                      onMouseLeave={() => setHoverCol(null)}
                      className="relative w-full h-full flex items-center justify-center cursor-pointer"
                    >
                      {/* Hover Indicator inside hole (only render in row 0) */}
                      {isHovered && !activePowerup && r === 0 && (
                         <div className="w-[80%] h-[80%] rounded-full border-4 border-dashed border-white/30 animate-[spin_4s_linear_infinite] shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                      )}
                      {isHovered && activePowerup === "bomb" && r === ROWS - 1 && (
                         <div className="w-[80%] h-[80%] rounded-full bg-red-500/20 animate-pulse flex items-center justify-center text-3xl">💣</div>
                      )}
                      {isHovered && activePowerup === "anvil" && r === ROWS - 1 && (
                         <div className="w-[80%] h-[80%] rounded-full bg-slate-500/30 animate-pulse flex items-center justify-center text-3xl">⚓</div>
                      )}
                      {/* Active Hover Glow column highlight (very faint) */}
                      {isHovered && (
                        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Top Hover Glow */}
              {hoverCol !== null && currentPlayer === P1 && !winner && !isAnimating && (
                <div 
                  className="absolute top-0 z-30 h-1 rounded-full blur-[2px] transition-all duration-200"
                  style={{ 
                    left: `${(hoverCol / COLS) * 100}%`, 
                    width: `${100/COLS}%`,
                    background: activePowerup ? '#ff0055' : (currentPlayer === P1 ? '#ffcc00' : '#00ffff')
                  }}
                />
              )}
            </div>

            {/* Power-ups Tray (Only visible for P1 or human turn) */}
            {(mode !== "bot" || currentPlayer === P1) && !winner && (
              <div className="mt-8 flex gap-4 w-full justify-center">
                <button 
                  onClick={() => setActivePowerup(activePowerup === "bomb" ? null : "bomb")}
                  disabled={(data?.inventory?.bomb || 0) === 0 || isAnimating}
                  className={`relative p-4 rounded-xl border-2 transition-all ${(data?.inventory?.bomb || 0) === 0 ? 'border-slate-800 opacity-50 grayscale' : activePowerup === "bomb" ? 'border-[#ff0055] bg-[#ff005522] scale-110 shadow-[0_0_20px_#ff005555]' : 'border-[#1e2a4a] bg-[#0d1222] hover:border-white/30'}`}
                >
                  <span className="text-2xl block mb-1">💣</span>
                  <span className="text-[10px] font-bold block">BOMB ({data?.inventory?.bomb || 0})</span>
                </button>

                <button 
                  onClick={() => setActivePowerup(activePowerup === "anvil" ? null : "anvil")}
                  disabled={(data?.inventory?.anvil || 0) === 0 || isAnimating}
                  className={`relative p-4 rounded-xl border-2 transition-all ${(data?.inventory?.anvil || 0) === 0 ? 'border-slate-800 opacity-50 grayscale' : activePowerup === "anvil" ? 'border-[#ffcc00] bg-[#ffcc0022] scale-110 shadow-[0_0_20px_#ffcc0055]' : 'border-[#1e2a4a] bg-[#0d1222] hover:border-white/30'}`}
                >
                  <span className="text-2xl block mb-1">⚓</span>
                  <span className="text-[10px] font-bold block">ANVIL ({data?.inventory?.anvil || 0})</span>
                </button>

                <button 
                  onClick={useDoubleTurn}
                  disabled={(data?.inventory?.doubleTurn || 0) === 0 || isAnimating || activePowerup || doubleTurnActive}
                  className={`relative p-4 rounded-xl border-2 transition-all ${(data?.inventory?.doubleTurn || 0) === 0 ? 'border-slate-800 opacity-50 grayscale' : doubleTurnActive ? 'border-[#00ffff] bg-[#00ffff22] scale-110 shadow-[0_0_20px_#00ffff55]' : 'border-[#1e2a4a] bg-[#0d1222] hover:border-white/30'}`}
                >
                  <span className="text-2xl block mb-1">⚡</span>
                  <span className="text-[10px] font-bold block">DOUBLE ({data?.inventory?.doubleTurn || 0})</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* GAMEOVER OVERLAY */}
        {gameState === "gameover" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0d1222] border border-[#1e2a4a] p-10 rounded-3xl max-w-sm w-full text-center flex flex-col items-center shadow-2xl relative overflow-hidden">
              
              {winner === 'draw' ? (
                <>
                  <h2 className="text-4xl font-black tracking-widest text-white mb-2">STALEMATE</h2>
                  <p className="text-slate-400 text-sm mb-8">No tactical options remain.</p>
                  {mode === "bot" && <div className="text-yellow-400 font-bold mb-8">+10 CR</div>}
                </>
              ) : (
                <>
                  <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: `radial-gradient(circle at center, ${winner === P1 ? '#ffcc00' : '#00ffff'}, transparent 70%)`}} />
                  <h2 className="text-4xl font-black tracking-widest mb-2 relative z-10" style={{ color: winner === P1 ? '#ffcc00' : '#00ffff', textShadow: `0 0 20px ${winner === P1 ? '#ffcc00' : '#00ffff'}88` }}>
                    {winner === P1 ? 'PLAYER 1 WINS' : mode === "bot" ? 'MACHINE WINS' : 'PLAYER 2 WINS'}
                  </h2>
                  <p className="text-slate-400 text-sm mb-8 relative z-10">Flawless tactical execution.</p>
                  
                  {mode === "bot" && winner === P1 && (
                    <div className="flex items-center gap-2 bg-[#ffcc0022] border border-[#ffcc00] px-6 py-2 rounded-full mb-8 relative z-10">
                      <span className="font-bold text-[#ffcc00] text-xl">+50 CR</span>
                      <div className="w-3 h-3 rounded-full bg-[#ffcc00] shadow-[0_0_10px_#ffcc00]" />
                    </div>
                  )}
                </>
              )}

              <button onClick={() => initGame(mode)} className="w-full py-4 rounded-xl text-black font-black tracking-widest mb-4 hover:scale-[1.02] transition-transform relative z-10 bg-white">
                REMATCH
              </button>
              <button onClick={() => setGameState("menu")} className="w-full py-4 rounded-xl text-sm font-bold tracking-widest border border-[#1e2a4a] hover:bg-[#1a2540] text-slate-300 relative z-10">
                RETURN TO BASE
              </button>
            </div>
          </div>
        )}

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes drop-piece {
          0% { transform: translateY(-600%); opacity: 0; }
          40% { opacity: 1; }
          80% { transform: translateY(10%); }
          100% { transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-drop-piece { animation: drop-piece 0.4s cubic-bezier(0.5, 0, 0.8, 0.2) forwards; }
      `}} />
    </div>
  );
}
