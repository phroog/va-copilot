"use client";

import { cn } from "@/lib/utils";

const CALENDLY_URL = "https://calendly.com/hello-vascora/sari-dream-call";

// One prominent, no-obligation call CTA everywhere (link, not embed).
export function BookCallButton({ label = "Book my free audit call", className }: { label?: string; className?: string }) {
  return (
    <a
      href={CALENDLY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-black shadow-xl shadow-kawaii-purple/30 hover:scale-[1.03] active:scale-[0.97] transition-all squishy",
        className
      )}
    >
      🎥 {label} →
    </a>
  );
}