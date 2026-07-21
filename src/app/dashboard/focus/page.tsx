"use client";

import { useFocusTimer } from "@/components/focus-timer-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export default function FocusPage() {
  const { t } = useLocale();
  const timer = useFocusTimer();

  const progress =
    timer.mode === "focus"
      ? ((timer.focusDuration - timer.timeRemaining) / timer.focusDuration) * 100
      : timer.mode === "break"
        ? ((timer.breakDuration - timer.timeRemaining) / timer.breakDuration) * 100
        : 0;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            🍅 {t("focusTimer")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative w-48 h-48 mx-auto">
            <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="45"
                fill="none" stroke="#e2e8f0"
                strokeWidth="6"
                className="dark:stroke-slate-700"
              />
              <circle
                cx="50" cy="50" r="45"
                fill="none" stroke="url(#focusGrad)"
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#f472b6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-extrabold tabular-nums text-slate-800 dark:text-slate-100">
                {formatTime(timer.timeRemaining)}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            {timer.mode === "idle" && t("focusReady")}
            {timer.mode === "focus" && "🎯 " + t("focusActive")}
            {timer.mode === "break" && "☕ " + t("breakActive")}
            {timer.mode === "paused" && "⏸ " + t("paused")}
          </p>

          <div className="flex items-center justify-center gap-3">
            {timer.mode === "idle" && (
              <Button variant="primary" className="px-8" onClick={timer.start}>
                ▶ {t("startFocus")}
              </Button>
            )}
            {(timer.mode === "focus" || timer.mode === "break") && (
              <>
                <Button variant="outline" onClick={timer.pause}>⏸ {t("pause")}</Button>
                <Button variant="destructive" size="sm" onClick={timer.reset}>✕ {t("stop")}</Button>
              </>
            )}
            {timer.mode === "paused" && (
              <>
                <Button variant="primary" onClick={timer.resume}>▶ {t("resume")}</Button>
                <Button variant="destructive" size="sm" onClick={timer.reset}>✕ {t("stop")}</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
