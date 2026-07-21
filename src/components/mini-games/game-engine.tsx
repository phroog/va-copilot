"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface GameEngineProps {
  game: "flappy" | "snake";
  onGameEnd: (score: number) => void;
}

export function GameEngine({ game, onGameEnd }: GameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const animRef = useRef<number>(0);

  // --- Flappy Bird ---
  const flappyState = useRef({
    bird: { x: 50, y: 150, vy: 0, size: 12 },
    pipes: [] as { x: number; gapY: number; gapH: number; scored: boolean }[],
    frame: 0,
  });

  const startFlappy = useCallback(() => {
    const state = flappyState.current;
    state.bird = { x: 50, y: 150, vy: 0, size: 12 };
    state.pipes = [];
    state.frame = 0;
    setScore(0);
    setGameOver(false);
    setStarted(true);
  }, []);

  // --- Snake ---
  const snakeState = useRef({
    snake: [{ x: 5, y: 5 }],
    food: { x: 10, y: 10 },
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    gridSize: 20,
    cellSize: 10,
    speed: 150,
    lastMove: 0,
  });

  const startSnake = useCallback(() => {
    const state = snakeState.current;
    state.snake = [{ x: 5, y: 5 }];
    state.food = { x: 10, y: 10 };
    state.dir = { x: 1, y: 0 };
    state.nextDir = { x: 1, y: 0 };
    state.speed = 150;
    state.lastMove = 0;
    setScore(0);
    setGameOver(false);
    setStarted(true);
  }, []);

  // Keyboard handler for snake
  useEffect(() => {
    if (game !== "snake") return;
    const handleKey = (e: KeyboardEvent) => {
      const state = snakeState.current;
      switch (e.key) {
        case "ArrowUp": if (state.dir.y !== 1) state.nextDir = { x: 0, y: -1 }; break;
        case "ArrowDown": if (state.dir.y !== -1) state.nextDir = { x: 0, y: 1 }; break;
        case "ArrowLeft": if (state.dir.x !== 1) state.nextDir = { x: -1, y: 0 }; break;
        case "ArrowRight": if (state.dir.x !== -1) state.nextDir = { x: 1, y: 0 }; break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [game]);

  // Click/tap for flappy
  const handleCanvasClick = useCallback(() => {
    if (game === "flappy" && started && !gameOver) {
      flappyState.current.bird.vy = -5;
    }
    if (game === "snake" && !started) {
      startSnake();
    }
    if (game === "flappy" && !started) {
      startFlappy();
    }
  }, [game, started, gameOver, startFlappy, startSnake]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 300;
    const H = 200;
    canvas.width = W;
    canvas.height = H;

    const loop = (timestamp: number) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "#f8f0ff";
      ctx.fillRect(0, 0, W, H);

      if (game === "flappy") {
        const state = flappyState.current;
        state.frame++;

        if (started && !gameOver) {
          // Gravity
          state.bird.vy += 0.3;
          state.bird.y += state.bird.vy;

          // Spawn pipes
          if (state.frame % 60 === 0) {
            const gapY = 40 + Math.random() * 80;
            state.pipes.push({ x: W, gapY, gapH: 50, scored: false });
          }

          // Move pipes
          for (const p of state.pipes) p.x -= 2;

          // Collision - ground/ceiling
          if (state.bird.y < 0 || state.bird.y > H) {
            setGameOver(true);
            setStarted(false);
            onGameEnd(score);
          }

          // Collision - pipes
          for (const p of state.pipes) {
            if (
              state.bird.x + state.bird.size > p.x &&
              state.bird.x - state.bird.size < p.x + 25 &&
              (state.bird.y - state.bird.size < p.gapY || state.bird.y + state.bird.size > p.gapY + p.gapH)
            ) {
              setGameOver(true);
              setStarted(false);
              onGameEnd(score);
            }
            if (!p.scored && p.x + 25 < state.bird.x) {
              p.scored = true;
              setScore((s) => s + 1);
            }
          }

          // Cleanup
          state.pipes = state.pipes.filter((p) => p.x > -30);
        }

        // Draw bird
        ctx.fillStyle = "#ffd54f";
        ctx.shadowColor = "rgba(255, 213, 79, 0.5)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(state.bird.x, state.bird.y, state.bird.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(state.bird.x + 3, state.bird.y - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw pipes
        for (const p of state.pipes) {
          ctx.fillStyle = "#81c784";
          ctx.shadowColor = "rgba(129, 199, 132, 0.3)";
          ctx.shadowBlur = 4;
          ctx.fillRect(p.x, 0, 25, p.gapY);
          ctx.fillRect(p.x, p.gapY + p.gapH, 25, H - p.gapY - p.gapH);
          ctx.shadowBlur = 0;
          // Pipe caps
          ctx.fillStyle = "#66bb6a";
          ctx.fillRect(p.x - 2, p.gapY - 5, 29, 5);
          ctx.fillRect(p.x - 2, p.gapY + p.gapH, 29, 5);
        }

        // Score
        ctx.fillStyle = "#7c3aed";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`Score: ${score}`, W / 2, 25);

        if (!started && !gameOver) {
          ctx.fillStyle = "#7c3aed";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.fillText("Click to Start!", W / 2, H / 2);
        }
        if (gameOver) {
          ctx.fillStyle = "#e53935";
          ctx.font = "bold 16px monospace";
          ctx.textAlign = "center";
          ctx.fillText("Game Over!", W / 2, H / 2 - 10);
          ctx.fillStyle = "#7c3aed";
          ctx.font = "12px monospace";
          ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 15);
        }
      }

      if (game === "snake") {
        const state = snakeState.current;

        if (started && !gameOver) {
          if (timestamp - state.lastMove > state.speed) {
            state.lastMove = timestamp;
            state.dir = { ...state.nextDir };

            const head = state.snake[0];
            const newHead = {
              x: head.x + state.dir.x,
              y: head.y + state.dir.y,
            };

            // Wall collision
            if (newHead.x < 0 || newHead.x >= state.gridSize || newHead.y < 0 || newHead.y >= state.gridSize) {
              setGameOver(true);
              setStarted(false);
              onGameEnd(score);
            }

            // Self collision
            for (const seg of state.snake) {
              if (seg.x === newHead.x && seg.y === newHead.y) {
                setGameOver(true);
                setStarted(false);
                onGameEnd(score);
              }
            }

            state.snake.unshift(newHead);

            // Food
            if (newHead.x === state.food.x && newHead.y === state.food.y) {
              setScore((s) => s + 1);
              state.speed = Math.max(60, state.speed - 5);
              state.food = {
                x: Math.floor(Math.random() * state.gridSize),
                y: Math.floor(Math.random() * state.gridSize),
              };
            } else {
              state.snake.pop();
            }
          }
        }

        const cs = state.cellSize;
        // Draw food
        ctx.fillStyle = "#e57373";
        ctx.shadowColor = "rgba(229, 115, 115, 0.5)";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(state.food.x * cs + cs / 2, state.food.y * cs + cs / 2, cs / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw snake
        state.snake.forEach((seg, i) => {
          const hue = i === 0 ? 144 : 120 + (i % 3) * 10;
          ctx.fillStyle = `hsl(${hue}, 60%, 60%)`;
          ctx.shadowColor = "rgba(76, 175, 80, 0.3)";
          ctx.shadowBlur = 4;
          const r = 3;
          ctx.beginPath();
          ctx.moveTo(seg.x * cs + 1 + r, seg.y * cs + 1);
          ctx.lineTo(seg.x * cs + cs - 1 - r, seg.y * cs + 1);
          ctx.quadraticCurveTo(seg.x * cs + cs - 1, seg.y * cs + 1, seg.x * cs + cs - 1, seg.y * cs + 1 + r);
          ctx.lineTo(seg.x * cs + cs - 1, seg.y * cs + cs - 1 - r);
          ctx.quadraticCurveTo(seg.x * cs + cs - 1, seg.y * cs + cs - 1, seg.x * cs + cs - 1 - r, seg.y * cs + cs - 1);
          ctx.lineTo(seg.x * cs + 1 + r, seg.y * cs + cs - 1);
          ctx.quadraticCurveTo(seg.x * cs + 1, seg.y * cs + cs - 1, seg.x * cs + 1, seg.y * cs + cs - 1 - r);
          ctx.lineTo(seg.x * cs + 1, seg.y * cs + 1 + r);
          ctx.quadraticCurveTo(seg.x * cs + 1, seg.y * cs + 1, seg.x * cs + 1 + r, seg.y * cs + 1);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          if (i === 0) {
            ctx.fillStyle = "#333";
            ctx.beginPath();
            ctx.arc(seg.x * cs + 3, seg.y * cs + 3, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(seg.x * cs + cs - 3, seg.y * cs + 3, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Grid lines
        ctx.strokeStyle = "#e0e0e0";
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= state.gridSize; i++) {
          ctx.beginPath();
          ctx.moveTo(i * cs, 0);
          ctx.lineTo(i * cs, H);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i * cs);
          ctx.lineTo(W, i * cs);
          ctx.stroke();
        }

        // Score
        ctx.fillStyle = "#7c3aed";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`Score: ${score}`, W / 2, 20);

        if (!started && !gameOver) {
          ctx.fillStyle = "#7c3aed";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.fillText("Press any arrow key to start!", W / 2, H / 2);
        }
        if (gameOver) {
          ctx.fillStyle = "#e53935";
          ctx.font = "bold 16px monospace";
          ctx.textAlign = "center";
          ctx.fillText("Game Over!", W / 2, H / 2 - 10);
          ctx.fillStyle = "#7c3aed";
          ctx.font = "12px monospace";
          ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 15);
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [game, started, gameOver, score, onGameEnd]);

  // Restart handler
  const handleRestart = () => {
    if (game === "flappy") startFlappy();
    if (game === "snake") startSnake();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="rounded-2xl border-2 border-kawaii-lavender/30 cursor-pointer w-[300px] h-[200px]"
        style={{ imageRendering: "pixelated" }}
      />
      {gameOver && (
        <Button variant="primary" size="sm" onClick={handleRestart}>
          🔄 Play Again
        </Button>
      )}
    </div>
  );
}

export function MiniGamesDialog({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const [activeGame, setActiveGame] = useState<"flappy" | "snake">("flappy");
  const [lastScore, setLastScore] = useState<number>(0);

  const handleGameEnd = (score: number) => {
    setLastScore(score);
    onGameEnd(score);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveGame("flappy")}
          className={`flex-1 py-2 px-3 rounded-2xl text-sm font-bold transition-all ${
            activeGame === "flappy"
              ? "bg-kawaii-purple text-white shadow-md"
              : "bg-kawaii-lavender/20 text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/30"
          }`}
        >
          🐤 Flappy Bird
        </button>
        <button
          onClick={() => setActiveGame("snake")}
          className={`flex-1 py-2 px-3 rounded-2xl text-sm font-bold transition-all ${
            activeGame === "snake"
              ? "bg-kawaii-purple text-white shadow-md"
              : "bg-kawaii-lavender/20 text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/30"
          }`}
        >
          🐍 Snake
        </button>
      </div>
      <GameEngine game={activeGame} onGameEnd={handleGameEnd} />
      {lastScore > 0 && (
        <p className="text-center text-sm text-slate-500 mt-2">Last score: {lastScore}</p>
      )}
    </div>
  );
}
