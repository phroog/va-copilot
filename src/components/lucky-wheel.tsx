"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SEGMENTS = [
  { label: "Extra Pitch Token 📝", color: "#F9A8D4" },
  { label: "Double Happiness 💖", color: "#C084FC" },
  { label: "Pet Treat 🍬", color: "#FDE68A" },
  { label: "Inspiration Boost ✨", color: "#6EE7B7" },
  { label: "Lucky Streak 🍀", color: "#FCA5A5" },
  { label: "Better Luck Next 😅", color: "#E9D5FF" },
  { label: "Bonus XP ⚡", color: "#A5B4FC" },
  { label: "Sticker Pack 🎨", color: "#FDBA74" },
];

export default function LuckyWheel() {
  const [spinning, setSpinning] = useState(false);
  const [alreadySpun, setAlreadySpun] = useState(false);
  const [prize, setPrize] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    fetch("/api/wheel")
      .then((r) => r.json())
      .then((data) => {
        if (data.alreadySpun) {
          setAlreadySpun(true);
          setPrize(data.prize);
        }
      })
      .catch(() => {});
  }, []);

  const spin = async () => {
    if (spinning || alreadySpun) return;
    setSpinning(true);
    setPrize(null);

    const res = await fetch("/api/wheel", { method: "POST" });
    const data = await res.json();

    if (data.error) {
      setAlreadySpun(true);
      setSpinning(false);
      return;
    }

    const segAngle = 360 / SEGMENTS.length;
    const targetIndex = data.index;
    const targetAngle = 360 - (targetIndex * segAngle + segAngle / 2);
    const fullSpins = 5 * 360;
    const finalRotation = rotation + fullSpins + targetAngle;

    setRotation(finalRotation);

    setTimeout(() => {
      setPrize(data.prize);
      setAlreadySpun(true);
      setSpinning(false);
    }, 4000);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl">🎡 Daily Lucky Wheel</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {alreadySpun && prize ? (
          <div className="text-center py-6 animate-fade-in">
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-lg font-bold text-kawaii-purple">You got:</p>
            <p className="text-2xl font-extrabold mt-1">{prize}</p>
            <p className="text-sm text-slate-400 mt-2">Come back tomorrow! 🌙</p>
          </div>
        ) : (
          <>
            <div className="relative w-56 h-56">
              <div
                className="w-full h-full rounded-full overflow-hidden shadow-xl transition-transform ease-out"
                style={{
                  transitionDuration: "4s",
                  transform: `rotate(${rotation}deg)`,
                  background: `conic-gradient(${SEGMENTS.map(
                    (s, i) => `${s.color} ${(i * 100) / SEGMENTS.length}% ${((i + 1) * 100) / SEGMENTS.length}%`
                  ).join(", ")})`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white dark:bg-dark-card shadow-inner flex items-center justify-center text-xl font-bold text-kawaii-purple">
                    🎯
                  </div>
                </div>
              </div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-kawaii-purple drop-shadow-lg" />
            </div>
            <Button
              onClick={spin}
              disabled={spinning || alreadySpun}
              size="lg"
              variant="primary"
              className="text-lg px-10"
            >
              {spinning ? "Spinning..." : "🎡 Spin!"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
