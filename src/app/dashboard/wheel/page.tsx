"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";

const SEGMENTS = [
  { label: "+5", color: "#6C4E8F", type: "views" },
  { label: "+1", color: "#E78FB3", type: "credits" },
  { label: "+10", color: "#9A8CC9", type: "views" },
  { label: "+2", color: "#F5C9A6", type: "credits" },
  { label: "+20", color: "#E78FB3", type: "views" },
  { label: "+5", color: "#6C4E8F", type: "credits" },
];

const SEG = Math.PI * 2 / SEGMENTS.length;

function drawWheel(canvas: HTMLCanvasElement, rotation: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = Math.min(canvas.width, canvas.height);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  for (let i = 0; i < SEGMENTS.length; i++) {
    const start = i * SEG - Math.PI / 2;
    const end = start + SEG;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, start, end);
    ctx.closePath();
    ctx.fillStyle = SEGMENTS[i].color;
    ctx.fill();
    ctx.strokeStyle = "#FFF8F0";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.rotate(start + SEG / 2);
    ctx.fillStyle = "#FFF8F0";
    ctx.font = "bold 18px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(SEGMENTS[i].label, r * 0.65, 0);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fillStyle = "#FFF8F0";
  ctx.fill();
  ctx.strokeStyle = "#6C4E8F";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

export default function WheelPage() {
  const { t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spunToday, setSpunToday] = useState(false);
  const [result, setResult] = useState<{ label: string; type: string; amount: number } | null>(null);
  const rotation = useRef(0);

  const paint = useCallback(() => {
    if (canvasRef.current) drawWheel(canvasRef.current, rotation.current);
  }, []);

  useEffect(() => {
    paint();
  }, [paint]);

  useEffect(() => {
    fetch("/api/wheel").then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        setSpunToday(d.spunToday);
        if (d.reward) setResult(d.reward);
      }
    }).catch(() => {});
  }, []);

  const spin = async () => {
    if (spinning || spunToday) return;
    setSpinning(true);
    setResult(null);
    const target = rotation.current + Math.PI * 2 * (5 + Math.floor(Math.random() * 5)) + Math.random() * Math.PI * 2;
    const start = performance.now();
    const duration = 4200;
    const from = rotation.current;

    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        rotation.current = from + (target - from) * eased;
        paint();
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    const res = await fetch("/api/wheel", { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setResult(d.reward);
      setSpunToday(true);
    } else {
      const d = await res.json().catch(() => ({}));
      setResult({ label: d.error || "?", type: "views", amount: 0 });
      setSpunToday(true);
    }
    setSpinning(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{t("wheelTitle")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("wheelSubtitle")}</p>

      <Card className="border-kawaii-lavender/40 dark:border-dark-surface shadow-lg overflow-hidden">
        <CardContent className="p-8 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-3xl leading-none">👇</div>
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              className="rounded-full shadow-xl w-full max-w-[320px] h-auto aspect-square"
            />
          </div>

          <Button
            size="lg"
            onClick={spin}
            disabled={spinning || spunToday}
            className="px-10 text-base"
          >
            {spinning ? t("wheelSpinning") : spunToday ? t("wheelSpunToday") : t("wheelSpin")}
          </Button>

          {spunToday && (
            <div className="text-center">
              {result && result.amount > 0 ? (
                <div className="rounded-2xl bg-kawaii-lavender/20 dark:bg-dark-surface/50 px-6 py-3">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">{t("wheelResult")}</p>
                  <p className="text-xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender">
                    {result.type === "credits" ? `🪙 +${result.amount} Credits` : `📋 +${result.amount} Job Views`}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">{t("wheelComeBack")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-slate-400 mt-4">🎁 {t("dailyBonus")}: {t("bonusJobs")}</p>
    </div>
  );
}