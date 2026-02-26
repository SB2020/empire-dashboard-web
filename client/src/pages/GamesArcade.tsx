import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2, Trophy, Star, ArrowLeft, RotateCcw, Pause, Play,
  Zap, Grid3X3, Hash, Dices, Crown, Timer, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── 2048 Game Engine ─────────────────────────────────────────────────────
type Grid2048 = number[][];

function create2048Grid(): Grid2048 {
  const grid: Grid2048 = Array.from({ length: 4 }, () => Array(4).fill(0));
  addRandom(grid);
  addRandom(grid);
  return grid;
}

function addRandom(grid: Grid2048) {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (grid[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function slide(row: number[]): { newRow: number[]; score: number } {
  let score = 0;
  const filtered = row.filter(v => v !== 0);
  const newRow: number[] = [];
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      newRow.push(merged);
      score += merged;
      i++;
    } else {
      newRow.push(filtered[i]);
    }
  }
  while (newRow.length < 4) newRow.push(0);
  return { newRow, score };
}

function move2048(grid: Grid2048, dir: "up" | "down" | "left" | "right"): { grid: Grid2048; score: number; moved: boolean } {
  let totalScore = 0;
  const newGrid = grid.map(r => [...r]);
  let moved = false;

  const processRow = (row: number[]) => {
    const { newRow, score } = slide(row);
    totalScore += score;
    if (row.some((v, i) => v !== newRow[i])) moved = true;
    return newRow;
  };

  if (dir === "left") {
    for (let r = 0; r < 4; r++) newGrid[r] = processRow(newGrid[r]);
  } else if (dir === "right") {
    for (let r = 0; r < 4; r++) newGrid[r] = processRow([...newGrid[r]].reverse()).reverse();
  } else if (dir === "up") {
    for (let c = 0; c < 4; c++) {
      const col = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
      const newCol = processRow(col);
      for (let r = 0; r < 4; r++) newGrid[r][c] = newCol[r];
    }
  } else {
    for (let c = 0; c < 4; c++) {
      const col = [newGrid[3][c], newGrid[2][c], newGrid[1][c], newGrid[0][c]];
      const newCol = processRow(col);
      for (let r = 0; r < 4; r++) newGrid[3 - r][c] = newCol[r];
    }
  }
  if (moved) addRandom(newGrid);
  return { grid: newGrid, score: totalScore, moved };
}

function isGameOver2048(grid: Grid2048): boolean {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (grid[r][c] === 0) return false;
    if (c + 1 < 4 && grid[r][c] === grid[r][c + 1]) return false;
    if (r + 1 < 4 && grid[r][c] === grid[r + 1][c]) return false;
  }
  return true;
}

const TILE_COLORS: Record<number, string> = {
  0: "bg-zinc-800/30", 2: "bg-amber-900/60 text-amber-200", 4: "bg-amber-800/60 text-amber-100",
  8: "bg-orange-700/70 text-orange-100", 16: "bg-orange-600/70 text-orange-50",
  32: "bg-red-600/70 text-red-100", 64: "bg-red-500/70 text-red-50",
  128: "bg-yellow-500/70 text-yellow-900", 256: "bg-yellow-400/70 text-yellow-900",
  512: "bg-yellow-300/80 text-yellow-900", 1024: "bg-emerald-500/70 text-emerald-50",
  2048: "bg-cyan-400/80 text-cyan-900",
};

function Game2048() {
  const [grid, setGrid] = useState<Grid2048>(create2048Grid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("2048-best") || 0));
  const [gameOver, setGameOver] = useState(false);

  const handleMove = useCallback((dir: "up" | "down" | "left" | "right") => {
    if (gameOver) return;
    setGrid(prev => {
      const result = move2048(prev, dir);
      if (result.moved) {
        setScore(s => {
          const newScore = s + result.score;
          if (newScore > best) { setBest(newScore); localStorage.setItem("2048-best", String(newScore)); }
          return newScore;
        });
        if (isGameOver2048(result.grid)) setGameOver(true);
        return result.grid;
      }
      return prev;
    });
  }, [gameOver, best]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      if (map[e.key]) { e.preventDefault(); handleMove(map[e.key]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleMove]);

  const reset = () => { setGrid(create2048Grid()); setScore(0); setGameOver(false); };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 w-full max-w-[320px]">
        <div className="flex-1">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Score</div>
          <div className="text-xl font-bold font-mono text-neon-amber">{score}</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Best</div>
          <div className="text-xl font-bold font-mono text-neon-cyan">{best}</div>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="gap-1">
          <RotateCcw className="w-3 h-3" /> New
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg glass-panel w-[320px] h-[320px] relative">
        {grid.flat().map((val, i) => (
          <motion.div
            key={`${i}-${val}`}
            initial={{ scale: val ? 0.8 : 1 }}
            animate={{ scale: 1 }}
            className={`rounded-md flex items-center justify-center font-bold font-mono text-sm ${TILE_COLORS[val] || "bg-purple-500/70 text-white"}`}
          >
            {val || ""}
          </motion.div>
        ))}
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center gap-3"
          >
            <span className="text-2xl font-bold font-mono text-neon-red">GAME OVER</span>
            <span className="text-lg font-mono text-neon-amber">Score: {score}</span>
            <Button onClick={reset} className="gap-1"><RotateCcw className="w-4 h-4" /> Try Again</Button>
          </motion.div>
        )}
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">Arrow keys or WASD to move tiles</p>
    </div>
  );
}

// ─── Snake Game Engine ────────────────────────────────────────────────────
type Pos = { x: number; y: number };

function GameSnake() {
  const GRID = 20;
  const CELL = 15;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("snake-best") || 0));
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const gameRef = useRef({
    snake: [{ x: 10, y: 10 }] as Pos[],
    dir: { x: 1, y: 0 },
    food: { x: 15, y: 10 } as Pos,
    alive: true,
  });

  const reset = useCallback(() => {
    gameRef.current = {
      snake: [{ x: 10, y: 10 }],
      dir: { x: 1, y: 0 },
      food: { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) },
      alive: true,
    };
    setScore(0);
    setGameOver(false);
    setPaused(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (e.key === "p" || e.key === " ") { setPaused(p => !p); return; }
      const dirs: Record<string, Pos> = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
      };
      if (dirs[e.key]) {
        const nd = dirs[e.key];
        if (nd.x !== -g.dir.x || nd.y !== -g.dir.y) g.dir = nd;
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const interval = setInterval(() => {
      const g = gameRef.current;
      if (!g.alive || paused) return;

      const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || g.snake.some(s => s.x === head.x && s.y === head.y)) {
        g.alive = false;
        setGameOver(true);
        setScore(s => { if (s > best) { setBest(s); localStorage.setItem("snake-best", String(s)); } return s; });
        return;
      }

      g.snake.unshift(head);
      if (head.x === g.food.x && head.y === g.food.y) {
        setScore(s => s + 10);
        g.food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
      } else {
        g.snake.pop();
      }

      // Draw
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);
      // Grid lines
      ctx.strokeStyle = "rgba(0,255,200,0.05)";
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, GRID * CELL); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(GRID * CELL, i * CELL); ctx.stroke();
      }
      // Snake
      g.snake.forEach((s, i) => {
        const alpha = 1 - (i / g.snake.length) * 0.5;
        ctx.fillStyle = i === 0 ? `rgba(0,255,200,${alpha})` : `rgba(0,200,160,${alpha})`;
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });
      // Food
      ctx.fillStyle = "rgba(255,100,100,0.9)";
      ctx.beginPath();
      ctx.arc(g.food.x * CELL + CELL / 2, g.food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }, 120);

    return () => clearInterval(interval);
  }, [paused, best]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 w-full max-w-[320px]">
        <div className="flex-1">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Score</div>
          <div className="text-xl font-bold font-mono text-neon-green">{score}</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Best</div>
          <div className="text-xl font-bold font-mono text-neon-cyan">{best}</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPaused(p => !p)} className="gap-1">
          {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
        </Button>
        <Button variant="outline" size="sm" onClick={reset} className="gap-1">
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
      <div className="relative rounded-lg overflow-hidden glass-panel p-1">
        <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} className="rounded" />
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3"
          >
            <span className="text-2xl font-bold font-mono text-neon-red">GAME OVER</span>
            <span className="text-lg font-mono text-neon-green">Score: {score}</span>
            <Button onClick={reset} className="gap-1"><RotateCcw className="w-4 h-4" /> Try Again</Button>
          </motion.div>
        )}
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">Arrow keys / WASD to move · Space to pause</p>
    </div>
  );
}

// ─── Tic-Tac-Toe vs AI ───────────────────────────────────────────────────
type TTTBoard = (null | "X" | "O")[];

function checkWinner(board: TTTBoard): null | "X" | "O" | "draw" {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
  }
  if (board.every(c => c !== null)) return "draw";
  return null;
}

function minimax(board: TTTBoard, isMax: boolean): number {
  const w = checkWinner(board);
  if (w === "O") return 10;
  if (w === "X") return -10;
  if (w === "draw") return 0;
  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) { board[i] = "O"; best = Math.max(best, minimax(board, false)); board[i] = null; }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) { board[i] = "X"; best = Math.min(best, minimax(board, true)); board[i] = null; }
    }
    return best;
  }
}

function aiMove(board: TTTBoard): number {
  let bestScore = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "O";
      const score = minimax(board, false);
      board[i] = null;
      if (score > bestScore) { bestScore = score; bestMove = i; }
    }
  }
  return bestMove;
}

function GameTicTacToe() {
  const [board, setBoard] = useState<TTTBoard>(Array(9).fill(null));
  const [winner, setWinner] = useState<null | "X" | "O" | "draw">(null);
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem("ttt-stats");
    return saved ? JSON.parse(saved) : { wins: 0, losses: 0, draws: 0 };
  });

  const handleClick = (i: number) => {
    if (board[i] || winner) return;
    const newBoard = [...board];
    newBoard[i] = "X";
    const w = checkWinner(newBoard);
    if (w) {
      setBoard(newBoard);
      setWinner(w);
      updateStats(w);
      return;
    }
    const ai = aiMove(newBoard);
    if (ai >= 0) newBoard[ai] = "O";
    const w2 = checkWinner(newBoard);
    setBoard(newBoard);
    if (w2) { setWinner(w2); updateStats(w2); }
  };

  const updateStats = (w: "X" | "O" | "draw") => {
    setStats((prev: typeof stats) => {
      const next = { ...prev };
      if (w === "X") next.wins++;
      else if (w === "O") next.losses++;
      else next.draws++;
      localStorage.setItem("ttt-stats", JSON.stringify(next));
      return next;
    });
  };

  const reset = () => { setBoard(Array(9).fill(null)); setWinner(null); };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6 text-center">
        <div><div className="text-[10px] font-mono text-muted-foreground">WINS</div><div className="text-lg font-bold font-mono text-neon-green">{stats.wins}</div></div>
        <div><div className="text-[10px] font-mono text-muted-foreground">DRAWS</div><div className="text-lg font-bold font-mono text-neon-amber">{stats.draws}</div></div>
        <div><div className="text-[10px] font-mono text-muted-foreground">LOSSES</div><div className="text-lg font-bold font-mono text-neon-red">{stats.losses}</div></div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg glass-panel">
        {board.map((cell, i) => (
          <motion.button
            key={i}
            whileHover={!cell && !winner ? { scale: 1.05 } : {}}
            whileTap={!cell && !winner ? { scale: 0.95 } : {}}
            onClick={() => handleClick(i)}
            className={`w-20 h-20 rounded-md flex items-center justify-center text-2xl font-bold font-mono transition-colors ${
              cell === "X" ? "bg-cyan-500/20 text-neon-cyan" : cell === "O" ? "bg-red-500/20 text-neon-red" : "bg-zinc-800/40 hover:bg-zinc-700/40"
            }`}
          >
            {cell}
          </motion.button>
        ))}
      </div>
      {winner && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
          <span className={`text-lg font-bold font-mono ${winner === "X" ? "text-neon-green" : winner === "O" ? "text-neon-red" : "text-neon-amber"}`}>
            {winner === "X" ? "YOU WIN!" : winner === "O" ? "AI WINS" : "DRAW"}
          </span>
          <Button onClick={reset} className="gap-1"><RotateCcw className="w-4 h-4" /> Play Again</Button>
        </motion.div>
      )}
      <p className="text-[10px] font-mono text-muted-foreground">You are X · AI is O (unbeatable minimax)</p>
    </div>
  );
}

// ─── Memory Match Game ────────────────────────────────────────────────────
const EMOJIS = ["⚡", "🔥", "💎", "🌊", "🎯", "🚀", "🧠", "👁️"];

function GameMemory() {
  const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("memory-best") || 999));
  const [complete, setComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const init = useCallback(() => {
    const pairs = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    setCards(pairs);
    setFlipped([]);
    setMoves(0);
    setComplete(false);
  }, []);

  useEffect(() => { init(); }, [init]);

  const handleFlip = (id: number) => {
    if (flipped.length >= 2) return;
    const card = cards[id];
    if (card.flipped || card.matched) return;

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    const newFlipped = [...flipped, id];
    setCards(newCards);
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (newCards[a].emoji === newCards[b].emoji) {
        const matched = newCards.map(c => c.id === a || c.id === b ? { ...c, matched: true } : c);
        setCards(matched);
        setFlipped([]);
        if (matched.every(c => c.matched)) {
          const finalMoves = moves + 1;
          setComplete(true);
          if (finalMoves < best) { setBest(finalMoves); localStorage.setItem("memory-best", String(finalMoves)); }
        }
      } else {
        timerRef.current = setTimeout(() => {
          setCards(prev => prev.map(c => c.id === a || c.id === b ? { ...c, flipped: false } : c));
          setFlipped([]);
        }, 800);
      }
    }
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 w-full max-w-[320px]">
        <div className="flex-1">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Moves</div>
          <div className="text-xl font-bold font-mono text-neon-magenta">{moves}</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Best</div>
          <div className="text-xl font-bold font-mono text-neon-cyan">{best < 999 ? best : "—"}</div>
        </div>
        <Button variant="outline" size="sm" onClick={init} className="gap-1">
          <RotateCcw className="w-3 h-3" /> New
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg glass-panel">
        {cards.map((card) => (
          <motion.button
            key={card.id}
            whileHover={!card.flipped && !card.matched ? { scale: 1.05 } : {}}
            onClick={() => handleFlip(card.id)}
            className={`w-16 h-16 rounded-md flex items-center justify-center text-xl transition-all duration-300 ${
              card.matched ? "bg-emerald-500/20 border border-emerald-500/30" :
              card.flipped ? "bg-cyan-500/20 border border-cyan-500/30" :
              "bg-zinc-800/40 hover:bg-zinc-700/40 border border-transparent"
            }`}
          >
            <AnimatePresence mode="wait">
              {(card.flipped || card.matched) ? (
                <motion.span key="emoji" initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} exit={{ rotateY: 90 }}>
                  {card.emoji}
                </motion.span>
              ) : (
                <motion.span key="hidden" className="text-zinc-600 text-sm font-mono">?</motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
      {complete && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
          <span className="text-lg font-bold font-mono text-neon-green">COMPLETE! {moves} moves</span>
          <Button onClick={init} className="gap-1"><RotateCcw className="w-4 h-4" /> Play Again</Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Minesweeper ──────────────────────────────────────────────────────────
type MineCell = { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number };

function createMineField(rows: number, cols: number, mines: number): MineCell[][] {
  const field: MineCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!field[r][c].mine) { field[r][c].mine = true; placed++; }
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (field[r][c].mine) continue;
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && field[nr][nc].mine) count++;
    }
    field[r][c].adjacent = count;
  }
  return field;
}

function GameMinesweeper() {
  const ROWS = 10, COLS = 10, MINES = 15;
  const [field, setField] = useState(() => createMineField(ROWS, COLS, MINES));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const reveal = (r: number, c: number) => {
    if (gameOver || won) return;
    const newField = field.map(row => row.map(cell => ({ ...cell })));
    const cell = newField[r][c];
    if (cell.revealed || cell.flagged) return;
    if (cell.mine) { setGameOver(true); newField.forEach(row => row.forEach(c => { if (c.mine) c.revealed = true; })); setField(newField); return; }

    const flood = (r: number, c: number) => {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      const cell = newField[r][c];
      if (cell.revealed || cell.mine || cell.flagged) return;
      cell.revealed = true;
      if (cell.adjacent === 0) {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(r + dr, c + dc);
      }
    };
    flood(r, c);
    setField(newField);

    const unrevealed = newField.flat().filter(c => !c.revealed && !c.mine).length;
    if (unrevealed === 0) setWon(true);
  };

  const flag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameOver || won || field[r][c].revealed) return;
    setField(prev => prev.map((row, ri) => row.map((cell, ci) =>
      ri === r && ci === c ? { ...cell, flagged: !cell.flagged } : cell
    )));
  };

  const reset = () => { setField(createMineField(ROWS, COLS, MINES)); setGameOver(false); setWon(false); };
  const flagCount = field.flat().filter(c => c.flagged).length;

  const ADJ_COLORS = ["", "text-blue-400", "text-green-400", "text-red-400", "text-purple-400", "text-amber-400", "text-cyan-400", "text-pink-400", "text-white"];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 w-full max-w-[320px]">
        <div className="flex-1">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Mines</div>
          <div className="text-xl font-bold font-mono text-neon-red">{MINES - flagCount}</div>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="gap-1">
          <RotateCcw className="w-3 h-3" /> New
        </Button>
      </div>
      <div className="p-1.5 rounded-lg glass-panel">
        <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {field.map((row, r) => row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => reveal(r, c)}
              onContextMenu={(e) => flag(e, r, c)}
              className={`w-7 h-7 text-xs font-bold font-mono flex items-center justify-center rounded-sm transition-colors ${
                cell.revealed
                  ? cell.mine ? "bg-red-500/40" : "bg-zinc-700/40"
                  : "bg-zinc-800/60 hover:bg-zinc-700/60"
              }`}
            >
              {cell.revealed
                ? cell.mine ? "💣" : cell.adjacent > 0 ? <span className={ADJ_COLORS[cell.adjacent]}>{cell.adjacent}</span> : ""
                : cell.flagged ? "🚩" : ""}
            </button>
          )))}
        </div>
      </div>
      {(gameOver || won) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
          <span className={`text-lg font-bold font-mono ${won ? "text-neon-green" : "text-neon-red"}`}>
            {won ? "CLEARED!" : "BOOM!"}
          </span>
          <Button onClick={reset} className="gap-1"><RotateCcw className="w-4 h-4" /> Play Again</Button>
        </motion.div>
      )}
      <p className="text-[10px] font-mono text-muted-foreground">Click to reveal · Right-click to flag</p>
    </div>
  );
}

// ─── Typing Speed Test ────────────────────────────────────────────────────
const SENTENCES = [
  "The quick brown fox jumps over the lazy dog near the riverbank",
  "Intelligence is the ability to adapt to change in real time",
  "Every great empire was built on information and decisive action",
  "The art of war is of vital importance to the state and its people",
  "Knowledge is power and those who control it shape the future",
  "In the digital age surveillance is both a shield and a weapon",
  "The best defense against chaos is a well organized system of order",
  "Data flows like water finding every crack in the wall of secrecy",
];

function GameTypingTest() {
  const [sentence, setSentence] = useState("");
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [best, setBest] = useState(() => Number(localStorage.getItem("typing-best") || 0));
  const inputRef = useRef<HTMLInputElement>(null);

  const init = useCallback(() => {
    setSentence(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
    setInput("");
    setStarted(false);
    setFinished(false);
    setWpm(0);
    setAccuracy(100);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => { init(); }, [init]);

  const handleInput = (val: string) => {
    if (finished) return;
    if (!started) { setStarted(true); setStartTime(Date.now()); }
    setInput(val);
    if (val.length >= sentence.length) {
      const elapsed = (Date.now() - startTime) / 60000;
      const words = sentence.split(" ").length;
      const calcWpm = Math.round(words / elapsed);
      let correct = 0;
      for (let i = 0; i < sentence.length; i++) if (val[i] === sentence[i]) correct++;
      const calcAcc = Math.round((correct / sentence.length) * 100);
      setWpm(calcWpm);
      setAccuracy(calcAcc);
      setFinished(true);
      if (calcWpm > best) { setBest(calcWpm); localStorage.setItem("typing-best", String(calcWpm)); }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[500px]">
      <div className="flex items-center gap-4 w-full">
        <div className="flex-1">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">WPM</div>
          <div className="text-xl font-bold font-mono text-neon-cyan">{wpm || "—"}</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Accuracy</div>
          <div className="text-xl font-bold font-mono text-neon-green">{finished ? `${accuracy}%` : "—"}</div>
        </div>
        <div className="flex-1 text-right">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Best WPM</div>
          <div className="text-xl font-bold font-mono text-neon-amber">{best || "—"}</div>
        </div>
      </div>
      <div className="glass-panel p-4 rounded-lg w-full">
        <p className="font-mono text-sm leading-relaxed">
          {sentence.split("").map((char, i) => (
            <span key={i} className={
              i < input.length
                ? input[i] === char ? "text-neon-green" : "text-neon-red bg-red-500/20"
                : i === input.length ? "bg-cyan-500/30 text-foreground" : "text-muted-foreground/60"
            }>{char}</span>
          ))}
        </p>
      </div>
      <input
        ref={inputRef}
        value={input}
        onChange={e => handleInput(e.target.value)}
        disabled={finished}
        className="w-full bg-zinc-900/50 border border-border/30 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-neon-cyan/50"
        placeholder={finished ? "Test complete!" : "Start typing..."}
      />
      {finished && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={init} className="gap-1"><RotateCcw className="w-4 h-4" /> New Test</Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Built-in Game Registry ──────────────────────────────────────────────
const BUILTIN_GAMES = [
  { id: "2048", name: "2048", icon: Grid3X3, color: "text-neon-amber", desc: "Slide & merge tiles to reach 2048", component: Game2048, genre: "puzzle", source: "builtin" as const, multiplayer: false },
  { id: "snake", name: "Snake", icon: Zap, color: "text-neon-green", desc: "Classic snake — eat, grow, survive", component: GameSnake, genre: "arcade", source: "builtin" as const, multiplayer: false },
  { id: "tictactoe", name: "Tic-Tac-Toe", icon: Hash, color: "text-neon-cyan", desc: "Challenge the unbeatable minimax AI", component: GameTicTacToe, genre: "board", source: "builtin" as const, multiplayer: true },
  { id: "memory", name: "Memory Match", icon: Dices, color: "text-neon-magenta", desc: "Find all matching pairs in fewest moves", component: GameMemory, genre: "puzzle", source: "builtin" as const, multiplayer: false },
  { id: "minesweeper", name: "Minesweeper", icon: Crown, color: "text-neon-red", desc: "Clear the field without hitting mines", component: GameMinesweeper, genre: "puzzle", source: "builtin" as const, multiplayer: false },
  { id: "typing", name: "Typing Test", icon: Timer, color: "text-neon-blue", desc: "Test your typing speed and accuracy", component: GameTypingTest, genre: "word", source: "builtin" as const, multiplayer: false },
];

// ─── External Games Catalog (from gamesData.json) ────────────────────────
import catalogData from "./gamesData.json";

type CatalogGame = {
  id: string;
  name: string;
  source: "flashpoint" | "internet_arcade" | "html5_opensource";
  genre: string;
  year: number;
  multiplayer: boolean;
  players: string;
  rating: number;
  plays: number;
  description: string;
  tags: string[];
  embedType: string;
};

const CATALOG: CatalogGame[] = catalogData as CatalogGame[];

const SOURCE_LABELS: Record<string, { label: string; color: string; badge: string }> = {
  builtin: { label: "BUILT-IN", color: "text-neon-cyan", badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  flashpoint: { label: "FLASHPOINT", color: "text-neon-amber", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  internet_arcade: { label: "INTERNET ARCADE", color: "text-neon-green", badge: "bg-green-500/20 text-green-300 border-green-500/30" },
  html5_opensource: { label: "HTML5 OPEN-SOURCE", color: "text-neon-magenta", badge: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
};

const GENRE_ICONS: Record<string, string> = {
  action: "⚔️", puzzle: "🧩", arcade: "🕹️", platformer: "🏃", racing: "🏎️",
  shooter: "🔫", strategy: "♟️", rpg: "🗡️", sports: "⚽", fighting: "🥊",
  adventure: "🗺️", simulation: "🏗️", card: "🃏", board: "♟️", word: "📝",
  music: "🎵", horror: "👻", educational: "📚",
};

const ALL_GENRES = Array.from(new Set([...BUILTIN_GAMES.map(g => g.genre), ...CATALOG.map(g => g.genre)])).sort();
const ALL_SOURCES = ["builtin", "flashpoint", "internet_arcade", "html5_opensource"];
const ITEMS_PER_PAGE = 48;

// ─── Main Page ────────────────────────────────────────────────────────────
export default function GamesArcade() {
  const [activeBuiltinGame, setActiveBuiltinGame] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [multiplayerOnly, setMultiplayerOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [view, setView] = useState<"grid" | "list">("grid");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const builtinGame = BUILTIN_GAMES.find(g => g.id === activeBuiltinGame);

  // Filter catalog
  const filteredCatalog = useMemo(() => {
    let items = [...CATALOG];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(g => g.name.toLowerCase().includes(q) || g.tags.some(t => t.includes(q)));
    }
    if (selectedGenre !== "all") items = items.filter(g => g.genre === selectedGenre);
    if (selectedSource !== "all") {
      if (selectedSource === "builtin") items = [];
      else items = items.filter(g => g.source === selectedSource);
    }
    if (multiplayerOnly) items = items.filter(g => g.multiplayer);
    return items;
  }, [searchQuery, selectedGenre, selectedSource, multiplayerOnly]);

  const showBuiltins = selectedSource === "all" || selectedSource === "builtin";
  const filteredBuiltins = useMemo(() => {
    let items = [...BUILTIN_GAMES];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(g => g.name.toLowerCase().includes(q));
    }
    if (selectedGenre !== "all") items = items.filter(g => g.genre === selectedGenre);
    if (multiplayerOnly) items = items.filter(g => g.multiplayer);
    return items;
  }, [searchQuery, selectedGenre, multiplayerOnly]);

  const visibleCatalog = filteredCatalog.slice(0, visibleCount);
  const totalCount = (showBuiltins ? filteredBuiltins.length : 0) + filteredCatalog.length;
  const mpCount = CATALOG.filter(g => g.multiplayer).length + BUILTIN_GAMES.filter(g => g.multiplayer).length;

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && visibleCount < filteredCatalog.length) {
        setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredCatalog.length));
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, filteredCatalog.length]);

  // Reset visible count on filter change
  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [searchQuery, selectedGenre, selectedSource, multiplayerOnly]);

  if (activeBuiltinGame && builtinGame) {
    return (
      <div className="p-4 md:p-6 space-y-6 min-h-screen">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveBuiltinGame(null)} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center">
              <builtinGame.icon className={`w-5 h-5 ${builtinGame.color}`} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono tracking-tight">{builtinGame.name}</h1>
              <p className="text-xs font-mono text-muted-foreground">{builtinGame.desc}</p>
            </div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center py-8"
        >
          <builtinGame.component />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-neon-magenta" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight">GAMES ARCADE</h1>
            <p className="text-xs font-mono text-muted-foreground">
              {totalCount.toLocaleString()} titles · {mpCount} multiplayer · 3 sources + built-in
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("grid")}
            className="gap-1 h-8 text-xs"
          >
            <Grid3X3 className="w-3 h-3" /> Grid
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
            className="gap-1 h-8 text-xs"
          >
            <Hash className="w-3 h-3" /> List
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-2 flex-wrap">
        {ALL_SOURCES.map(src => {
          const info = SOURCE_LABELS[src];
          const count = src === "builtin" ? BUILTIN_GAMES.length : CATALOG.filter(g => g.source === src).length;
          return (
            <button
              key={src}
              onClick={() => setSelectedSource(selectedSource === src ? "all" : src)}
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold border transition-all ${
                selectedSource === src ? info.badge + " ring-1 ring-white/20" : "border-border/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              {info.label} ({count})
            </button>
          );
        })}
        <button
          onClick={() => setMultiplayerOnly(!multiplayerOnly)}
          className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold border transition-all ${
            multiplayerOnly ? "bg-red-500/20 text-red-300 border-red-500/30 ring-1 ring-white/20" : "border-border/20 text-muted-foreground hover:text-foreground"
          }`}
        >
          🎮 MULTIPLAYER ({mpCount})
        </button>
      </div>

      {/* Search + Genre Filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search games..."
            className="w-full bg-zinc-900/50 border border-border/30 rounded-lg px-4 py-2 pl-9 font-mono text-sm focus:outline-none focus:border-neon-cyan/50"
          />
          <Star className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        </div>
        <select
          value={selectedGenre}
          onChange={e => setSelectedGenre(e.target.value)}
          className="bg-zinc-900/50 border border-border/30 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-neon-cyan/50 text-foreground"
        >
          <option value="all">All Genres</option>
          {ALL_GENRES.map(g => (
            <option key={g} value={g}>{GENRE_ICONS[g] || "🎮"} {g.charAt(0).toUpperCase() + g.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Built-in Games Section */}
      {showBuiltins && filteredBuiltins.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/30 to-transparent" />
            <span className="text-[10px] font-mono font-bold text-neon-cyan tracking-widest">PLAYABLE NOW — BUILT-IN</span>
            <div className="h-px flex-1 bg-gradient-to-l from-cyan-500/30 to-transparent" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {filteredBuiltins.map((g) => (
              <motion.button
                key={g.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveBuiltinGame(g.id)}
                className="glass-panel rounded-xl p-4 text-left group hover:border-teal-glow/30 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-2 right-2">
                  <span className="text-[8px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded-full">PLAY</span>
                </div>
                <div className={`w-10 h-10 rounded-lg glass-panel flex items-center justify-center ${g.color} mb-2`}>
                  <g.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold font-mono text-sm mb-0.5 truncate">{g.name}</h3>
                <p className="text-[10px] font-mono text-muted-foreground truncate">{g.desc}</p>
                {g.multiplayer && <span className="text-[8px] font-mono text-red-400 mt-1 block">🎮 Multiplayer</span>}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Catalog Games */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 to-transparent" />
          <span className="text-[10px] font-mono font-bold text-neon-amber tracking-widest">
            CATALOG — {filteredCatalog.length.toLocaleString()} TITLES
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-amber-500/30 to-transparent" />
        </div>

        {view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {visibleCatalog.map((g) => {
              const srcInfo = SOURCE_LABELS[g.source];
              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-xl p-3 group hover:border-teal-glow/20 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-2 right-2">
                    <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${srcInfo.badge}`}>
                      {srcInfo.label}
                    </span>
                  </div>
                  <div className="text-2xl mb-2">{GENRE_ICONS[g.genre] || "🎮"}</div>
                  <h3 className="font-bold font-mono text-xs mb-0.5 truncate pr-8" title={g.name}>{g.name}</h3>
                  <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
                    <span>{g.genre}</span>
                    <span>·</span>
                    <span>{g.year}</span>
                    <span>·</span>
                    <span className="text-amber-400">★{g.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {g.multiplayer && (
                      <span className="text-[8px] font-mono bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded-full">
                        🎮 {g.players}
                      </span>
                    )}
                    <span className="text-[8px] font-mono text-muted-foreground">
                      {g.plays > 999999 ? `${(g.plays/1000000).toFixed(1)}M` : g.plays > 999 ? `${(g.plays/1000).toFixed(0)}K` : g.plays} plays
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {visibleCatalog.map((g) => {
              const srcInfo = SOURCE_LABELS[g.source];
              return (
                <div
                  key={g.id}
                  className="glass-panel rounded-lg px-4 py-2 flex items-center gap-3 hover:border-teal-glow/20 transition-all"
                >
                  <span className="text-lg w-8 text-center">{GENRE_ICONS[g.genre] || "🎮"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold font-mono text-sm truncate">{g.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {g.genre} · {g.year} · {g.embedType}
                    </div>
                  </div>
                  <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border ${srcInfo.badge}`}>
                    {srcInfo.label}
                  </span>
                  {g.multiplayer && (
                    <span className="text-[8px] font-mono bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full">
                      🎮 {g.players}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-amber-400">★{g.rating}</span>
                  <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">
                    {g.plays > 999999 ? `${(g.plays/1000000).toFixed(1)}M` : g.plays > 999 ? `${(g.plays/1000).toFixed(0)}K` : g.plays}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-8" />
        {visibleCount < filteredCatalog.length && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <div className="w-4 h-4 border-2 border-neon-cyan/50 border-t-transparent rounded-full animate-spin" />
              Loading more games...
            </div>
          </div>
        )}
        {filteredCatalog.length === 0 && (
          <div className="text-center py-12">
            <Gamepad2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-mono text-sm text-muted-foreground">No games match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
