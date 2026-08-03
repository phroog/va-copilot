"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const RING_COLORS = ["#FFF8F0", "#B39DDB", "#FFDAB9", "#6C4E8F"];
const RING_PTS = [10, 20, 50, 100];
const EMOJIS = ["👻", "💸", "📈", "⏰", "🤷"];

export default function StressBusterWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const emojiPos = useMemo(() => {
    const R = 64; // target radius in 140px canvas
    const cx = 70;
    const cy = 70;
    const chosen = EMOJIS.sort(() => Math.random() - 0.5).slice(0, 3);
    const positions: { icon: string; x: number; y: number }[] = [];
    let tries = 0;
    while (positions.length < chosen.length && tries < 200) {
      tries++;
      const ang = Math.random() * Math.PI * 2;
      const rad = R * (0.35 + Math.random() * 0.5);
      const p = { icon: chosen[positions.length], x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad };
      if (positions.every((o) => Math.hypot(o.x - p.x, o.y - p.y) > 18)) positions.push(p);
    }
    return positions;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 140;
    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.46;
    ctx.clearRect(0, 0, size, size);

    RING_PTS.forEach((_, i) => {
      const radius = R * (1 - i * 0.25);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = RING_COLORS[i];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#6C4E8F";
      ctx.stroke();
    });

    emojiPos.forEach((em) => {
      ctx.beginPath();
      ctx.arc(em.x, em.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(108,78,143,0.3)";
      ctx.stroke();
      ctx.font = "17px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(em.icon, em.x, em.y + 1);
    });
  }, [emojiPos]);

  return (
    <Card className="bg-gradient-to-r from-kawaii-purple/10 to-kawaii-pink/10 dark:from-kawaii-purple/5 dark:to-kawaii-pink/5 border-none">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/80 dark:bg-dark-card shadow-sm p-1.5">
            <canvas
              ref={canvasRef}
              width={140}
              height={140}
              className="w-[96px] h-[96px] sm:w-[120px] sm:h-[120px] drop-shadow"
              style={{ imageRendering: "auto" }}
            />
          </div>
          <div>
            <p className="font-bold text-slate-700 dark:text-slate-200">🎯 Stress Buster</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[220px]">
              Need a 30-second break? Pop some client frustrations.
            </p>
          </div>
        </div>
        <Link href="/dashboard/stress-buster">
          <Button variant="primary" size="sm" className="shrink-0">
            Play →
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}