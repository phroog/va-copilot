"use client";

import { useEffect, useRef, useState } from "react";

interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
  wiggle: number;
  scareUntil: number;
  scareX: number;
  scareY: number;
  eatUntil: number;
}

interface Food {
  x: number;
  y: number;
  born: number;
}

interface Ripple {
  x: number;
  y: number;
  born: number;
}

const COLORS = ["#ff8a5c", "#ffd166", "#06d6a0", "#4cc9f0", "#f15bb5", "#9b5de5", "#fca311", "#00b4d8"];
const BUBBLE_KEYS = Array.from({ length: 14 }, (_, i) => i);
const SEAWEED_X = [0.08, 0.18, 0.85, 0.93, 0.5];

function rnd(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function makeFish(w: number, h: number): Fish {
  return {
    x: rnd(40, w - 40),
    y: rnd(60, h - 120),
    vx: rnd(-1, 1),
    vy: rnd(-0.5, 0.5),
    size: rnd(14, 30),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    speed: rnd(0.6, 1.6),
    phase: Math.random() * Math.PI * 2,
    wiggle: rnd(4, 8),
    scareUntil: 0,
    scareX: 0,
    scareY: 0,
    eatUntil: 0,
  };
}

export default function Aquarium({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fishRef = useRef<Fish[]>([]);
  const foodRef = useRef<Food[]>([]);
  const rippleRef = useRef<Ripple[]>([]);
  const [count, setCount] = useState(8);
  const [mode, setMode] = useState<"knock" | "feed">("knock");
  const [sound, setSound] = useState(false);
  const soundRef = useRef<{ ctx: AudioContext | null; last: number }>({ ctx: null, last: 0 });

  function resetFish(n: number) {
    const c = canvasRef.current;
    const w = c ? c.width : 800;
    const h = c ? c.height : 500;
    fishRef.current = Array.from({ length: n }, () => makeFish(w, h));
  }

  useEffect(() => {
    resetFish(count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current!;
    if (!wrap) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = wrap.clientWidth * dpr;
      canvas.height = wrap.clientHeight * dpr;
      canvas.style.width = wrap.clientWidth + "px";
      canvas.style.height = wrap.clientHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (fishRef.current.length === 0) resetFish(count);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const bubbles = BUBBLE_KEYS.map((i) => ({
      x: rnd(20, canvas.clientWidth - 20),
      y: rnd(40, canvas.clientHeight - 40),
      r: rnd(2, 6),
      vy: rnd(0.3, 0.9),
      phase: rnd(0, 6),
    }));
    const seaweed = SEAWEED_X.map((fx) => ({
      x: fx,
      h: rnd(40, 90),
      phase: rnd(0, 6),
      w: rnd(5, 8),
    }));

    const now = () => Date.now();

    function knock(x: number, y: number) {
      rippleRef.current.push({ x, y, born: now() });
      const radius = 240;
      for (const f of fishRef.current) {
        const d = Math.hypot(f.x - x, f.y - y);
        if (d < radius) {
          f.scareUntil = now() + 900;
          f.scareX = x;
          f.scareY = y;
        }
      }
      if (soundRef.current.ctx) {
        const c = soundRef.current.ctx;
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.setValueAtTime(180 + Math.random() * 60, c.currentTime);
        g.gain.setValueAtTime(0.03, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
        o.connect(g);
        g.connect(c.destination);
        o.start();
        o.stop(c.currentTime + 0.25);
      }
    }

    function feed(x: number, y: number) {
      if (foodRef.current.length > 20) foodRef.current = foodRef.current.slice(-20);
      foodRef.current.push({ x, y, born: now() });
      if (soundRef.current.ctx) {
        const c = soundRef.current.ctx;
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.setValueAtTime(600 + Math.random() * 200, c.currentTime);
        g.gain.setValueAtTime(0.02, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12);
        o.connect(g);
        g.connect(c.destination);
        o.start();
        o.stop(c.currentTime + 0.12);
      }
    }

    function onClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (mode === "knock") knock(x, y);
      else feed(x, y);
    }
    canvas.addEventListener("pointerdown", onClick);

    // ── Draw helpers ──
    function drawFish(f: Fish, t: number) {
      ctx.save();
      const ang = Math.atan2(f.vy, f.vx);
      const fl = f.vx < 0 ? -1 : 1;
      ctx.translate(f.x, f.y);
      ctx.rotate(ang);
      ctx.scale(fl, 1);
      const s = f.size;
      // tail
      const wag = Math.sin(t * 0.01 + f.phase) * 0.5;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, 0);
      ctx.lineTo(-s * 1.45, -s * 0.42 + wag * s * 0.35);
      ctx.lineTo(-s * 1.45, s * 0.42 + wag * s * 0.35);
      ctx.closePath();
      ctx.fill();
      // body
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      // stripe
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.ellipse(s * 0.15, 0, s * 0.28, s * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s * 0.55, -s * 0.2, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(s * 0.6, -s * 0.2, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function frame() {
      const t = now();
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // water gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0b2a4a");
      grad.addColorStop(0.55, "#0e3d66");
      grad.addColorStop(1, "#0a2438");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // light shaft
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.moveTo(w * 0.3, 0);
      ctx.lineTo(w * 0.42, h);
      ctx.lineTo(w * 0.3, h);
      ctx.closePath();
      ctx.fill();

      // bubbles
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        b.y -= b.vy;
        b.x += Math.sin(t * 0.001 + b.phase) * 0.3;
        if (b.y < -10) {
          b.y = h + 10;
          b.x = rnd(10, w - 10);
        }
        ctx.strokeStyle = "rgba(190,230,255,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // seaweed
      for (const sw of seaweed) {
        ctx.strokeStyle = "#0f7a4d";
        ctx.lineWidth = sw.w;
        ctx.lineCap = "round";
        ctx.beginPath();
        const baseX = sw.x * w;
        ctx.moveTo(baseX, h - 18);
        const sway = Math.sin(t * 0.0015 + sw.phase) * 8;
        ctx.quadraticCurveTo(baseX + sway, h - sw.h * 0.6, baseX - sway, h - sw.h);
        ctx.stroke();
      }

      // sand
      ctx.fillStyle = "#c9a56a";
      ctx.fillRect(0, h - 18, w, 18);

      // ripples (knock)
      rippleRef.current = rippleRef.current.filter((r) => t - r.born < 700);
      for (const r of rippleRef.current) {
        const p = (t - r.born) / 700;
        ctx.strokeStyle = `rgba(255,255,255,${0.4 * (1 - p)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 10 + p * 90, 0, Math.PI * 2);
        ctx.stroke();
      }

      // food
      foodRef.current = foodRef.current.filter((fd) => t - fd.born < 20000);
      for (const fd of foodRef.current) {
        const fade = Math.max(0, 1 - (t - fd.born) / 20000);
        ctx.fillStyle = `rgba(255,215,120,${fade})`;
        ctx.beginPath();
        ctx.arc(fd.x, fd.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // fish
      for (const f of fishRef.current) {
        // steering
        f.vx += rnd(-0.04, 0.04);
        f.vy += rnd(-0.04, 0.04);
        // wall avoidance
        if (f.x < 30) f.vx += 0.12;
        if (f.x > w - 30) f.vx -= 0.12;
        if (f.y < 30) f.vy += 0.12;
        if (f.y > h - 60) f.vy -= 0.12;
        // scare (knock) reaction
        if (t < f.scareUntil) {
          const dx = f.x - f.scareX;
          const dy = f.y - f.scareY;
          const d = Math.hypot(dx, dy) || 1;
          f.vx += (dx / d) * 0.6;
          f.vy += (dy / d) * 0.6;
        } else {
          // feed attraction
          let fx = 0;
          let fy = 0;
          for (const fd of foodRef.current) {
            const d = Math.hypot(fd.x - f.x, fd.y - f.y);
            if (d < 180 && d > 8) {
              fx += (fd.x - f.x) / d;
              fy += (fd.y - f.y) / d;
            }
            if (d < 12) {
              f.eatUntil = t + 600;
            }
          }
          if (fx || fy) {
            f.vx += fx * 0.04;
            f.vy += fy * 0.04;
          }
        }
        foodRef.current = foodRef.current.filter((fd) => Math.hypot(fd.x - f.x, fd.y - f.y) > 12);
        // clamp speed
        const sp = Math.hypot(f.vx, f.vy);
        const max = f.speed * 2.6;
        if (sp > max) {
          f.vx = (f.vx / sp) * max;
          f.vy = (f.vy / sp) * max;
        }
        if (sp < 0.15) {
          f.vx = Math.cos(f.phase) * f.speed * 0.5;
          f.vy = Math.sin(f.phase) * f.speed * 0.5;
        }
        f.x += f.vx;
        f.y += f.vy;
        f.x = Math.max(20, Math.min(w - 20, f.x));
        f.y = Math.max(20, Math.min(h - 40, f.y));
        // eat bounce
        const scale = t < f.eatUntil ? 1 + 0.15 * Math.sin((f.eatUntil - t) * 0.04) : 1;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.scale(scale, scale);
        ctx.translate(-f.x, -f.y);
        drawFish(f, t);
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    // sound toggle
    if (sound && !soundRef.current.ctx) {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        soundRef.current.ctx = new AC();
      } catch {}
    }
    if (!sound) {
      try { soundRef.current.ctx?.close(); } catch {}
      soundRef.current.ctx = null;
    }

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onClick);
      window.removeEventListener("resize", resize);
      try { soundRef.current.ctx?.close(); } catch {}
      soundRef.current.ctx = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sound]);

  return (
    <div ref={wrapRef} className={"relative w-full h-full overflow-hidden rounded-3xl border border-kawaii-lavender/30 dark:border-dark-surface " + className}>
      <canvas ref={canvasRef} className="block w-full h-full cursor-pointer" />
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-2xl bg-white/70 dark:bg-dark-card/70 backdrop-blur px-1.5 py-1 gap-1">
          <button
            onClick={() => setMode("knock")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${mode === "knock" ? "bg-kawaii-purple text-white" : "text-slate-500 hover:bg-kawaii-lavender/20"}`}
            title="Tap the glass to scare the fish"
          >
            👋 Knock
          </button>
          <button
            onClick={() => setMode("feed")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${mode === "feed" ? "bg-kawaii-purple text-white" : "text-slate-500 hover:bg-kawaii-lavender/20"}`}
            title="Click to throw food"
          >
            🐟 Feed
          </button>
        </div>
        <div className="flex rounded-2xl bg-white/70 dark:bg-dark-card/70 backdrop-blur px-1.5 py-1 gap-1">
          <button onClick={() => setCount((c) => Math.max(2, c - 1))} className="px-2 py-1.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/20" title="Fewer fish">−</button>
          <span className="px-1 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 self-center">{count}</span>
          <button onClick={() => setCount((c) => Math.min(30, c + 1))} className="px-2 py-1.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/20" title="More fish">+</button>
        </div>
        <button
          onClick={() => setSound((s) => !s)}
          className={`rounded-2xl px-2.5 py-1.5 text-sm backdrop-blur ${sound ? "bg-kawaii-purple text-white" : "bg-white/70 dark:bg-dark-card/70 text-slate-500"}`}
          title="Sound on/off"
        >
          {sound ? "🔊" : "🔇"}
        </button>
      </div>
      <p className="absolute bottom-2 right-3 text-[11px] text-white/50 font-medium pointer-events-none select-none">
        {mode === "knock" ? "👋 Click on the glass to knock" : "🐟 Click to throw food"}
      </p>
    </div>
  );
}
