"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const CALENDLY_URL = "https://calendly.com/hello-vascora/sari-dream-call";

// Prominent, no-obligation call CTA. With `requireConfirm` the user must
// confirm they'll actually show up before the booking link is enabled.
export function BookCallButton({
  label = "Book my free audit call",
  requireConfirm = false,
  className,
}: {
  label?: string;
  requireConfirm?: boolean;
  className?: string;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const locked = requireConfirm && !confirmed;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {requireConfirm && (
        <label className="flex items-start gap-2 text-[12px] leading-snug text-slate-600 dark:text-slate-300 max-w-sm text-left">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 shrink-0 accent-kawaii-purple"
          />
          <span>
            Please only book if you'll really show up — otherwise we wait for you and waste our time.{" "}
            <b className="text-slate-900 dark:text-white">I will be there.</b>
          </span>
        </label>
      )}
      <a
        href={CALENDLY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={locked}
        onClick={(e) => {
          if (locked) e.preventDefault();
        }}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-black shadow-xl shadow-kawaii-purple/30 hover:scale-[1.03] active:scale-[0.97] transition-all squishy",
          locked && "opacity-40 pointer-events-none",
          className
        )}
      >
        🎥 {label} →
      </a>
    </div>
  );
}