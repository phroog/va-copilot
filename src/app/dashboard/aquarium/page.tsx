"use client";

import Aquarium from "@/components/aquarium";

export default function AquariumPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">🐠 Aquarium</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            A little break in between — tap the glass or throw some food.
          </p>
        </div>
      </div>
      <div className="h-[calc(100vh-190px)] min-h-[420px]">
        <Aquarium />
      </div>
    </div>
  );
}