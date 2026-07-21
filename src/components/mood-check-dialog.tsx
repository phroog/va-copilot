"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const moods = [
  { emoji: "😄", label: "happy", color: "bg-green-100 dark:bg-green-900/30 hover:bg-green-200" },
  { emoji: "🙂", label: "okay", color: "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200" },
  { emoji: "😴", label: "tired", color: "bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200" },
  { emoji: "💪", label: "motivated", color: "bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200" },
  { emoji: "😢", label: "down", color: "bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200" },
];

export default function MoodCheckDialog() {
  const [open, setOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  useEffect(() => {
    const checkMood = async () => {
      try {
        const res = await fetch("/api/mood");
        const data = await res.json();
        if (!data.mood) setOpen(true);
      } catch {
        // silent
      }
    };
    checkMood();
  }, []);

  const submitMood = async (mood: string) => {
    setSelectedMood(mood);
    try {
      await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood }),
      });
    } catch {
      // silent
    }
    setTimeout(() => setOpen(false), 800);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">🌸 How are you feeling today?</DialogTitle>
          <DialogDescription className="text-center">
            Pick a mood to personalize your experience!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-center gap-3 py-4">
          {moods.map((m) => (
            <button
              key={m.label}
              onClick={() => submitMood(m.label)}
              className={`flex flex-col items-center gap-1 rounded-2xl p-4 text-2xl transition-all squishy ${m.color} ${
                selectedMood === m.label ? "ring-2 ring-kawaii-purple scale-110" : ""
              }`}
            >
              <span>{m.emoji}</span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 capitalize">
                {m.label}
              </span>
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400">(Just once a day!)</p>
      </DialogContent>
    </Dialog>
  );
}
