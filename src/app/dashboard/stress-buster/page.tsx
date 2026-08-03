"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StressBusterApi {
  destroy: () => void;
  restart: () => void;
  getScore: () => number;
}

declare global {
  interface Window {
    SariStressBuster?: (
      mount: HTMLElement,
      options: Record<string, unknown>
    ) => StressBusterApi;
  }
}

export default function StressBusterPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<StressBusterApi | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let game: StressBusterApi | null = null;

    const start = () => {
      if (window.SariStressBuster && mountRef.current) {
        game = window.SariStressBuster(mountRef.current, {
          arrows: 5,
          builtInEnd: true,
          sound: true,
          onGameOver: () => {},
        });
        gameRef.current = game;
      }
    };

    if (window.SariStressBuster) {
      start();
    } else {
      const script = document.createElement("script");
      script.src = "/stress-buster.js";
      script.onload = start;
      document.head.appendChild(script);
      return () => {
        script.remove();
        game?.destroy();
        gameRef.current = null;
      };
    }

    return () => {
      game?.destroy();
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="animate-fade-in flex flex-col items-center">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
          🎯 Sari Stress Buster
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Shoot the client frustrations away. 5 arrows. Watch your stress pop!
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-center gap-2 text-center text-lg">
            💨 Pop-a-stress mini-game
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div ref={mountRef} />
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 text-center">
            Hit a 👻 💸 📈 ⏰ 🤷 for a 2× bonus. Tap the 🔊 button to turn sound on.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}