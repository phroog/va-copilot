"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { playSound } from "@/lib/sounds";

export function RollingNumber({
  value,
  className,
  tick = true,
  duration = 900,
}: {
  value: number;
  className?: string;
  tick?: boolean;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      last.current = value;
      return;
    }
    const from = last.current;
    const controls = animate(from, value, {
      duration: duration / 1000,
      ease: "easeOut",
      onUpdate: (v) => {
        const rounded = Math.round(v);
        setDisplay(rounded);
        if (tick && rounded > 0 && rounded !== value) playSound("xp-tick");
      },
      onComplete: () => {
        last.current = value;
      },
    });
    return () => controls.stop();
  }, [value, duration, reduced, tick]);

  return <span className={className}>{display}</span>;
}