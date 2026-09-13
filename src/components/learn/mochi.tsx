"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { mochiReact, subscribeMochi, mochiEffective, type MochiMood } from "@/lib/mochi";
import { playSound } from "@/lib/sounds";

function MochiFace({ mood }: { mood: MochiMood }) {
  const eyeColor = "#2e1e3a";
  const eyes =
    mood === "sleeping" ? (
      <>
        <path d="M32 42 Q38 37 44 42" stroke={eyeColor} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M56 42 Q62 37 68 42" stroke={eyeColor} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      </>
    ) : mood === "sad" ? (
      <>
        <path d="M34 45 Q39 40 44 44" stroke={eyeColor} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M56 44 Q61 40 66 45" stroke={eyeColor} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      </>
    ) : mood === "excited" ? (
      <>
        <circle cx="39" cy="42" r="5.5" fill={eyeColor} />
        <circle cx="61" cy="42" r="5.5" fill={eyeColor} />
        <circle cx="41" cy="40" r="1.6" fill="#fff" />
        <circle cx="63" cy="40" r="1.6" fill="#fff" />
      </>
    ) : mood === "happy" ? (
      <>
        <path d="M33 44 Q39 38 45 43" stroke={eyeColor} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M55 43 Q61 38 67 44" stroke={eyeColor} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      </>
    ) : mood === "thinking" ? (
      <>
        <circle cx="40" cy="43" r="4" fill={eyeColor} />
        <circle cx="60" cy="40" r="2.4" fill={eyeColor} />
      </>
    ) : (
      <>
        <circle cx="40" cy="43" r="4" fill={eyeColor} />
        <circle cx="60" cy="43" r="4" fill={eyeColor} />
      </>
    );

  const mouth =
    mood === "sad" ? (
      <path d="M42 66 Q50 60 58 66" stroke={eyeColor} strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : mood === "happy" || mood === "excited" ? (
      <path d="M40 62 Q50 74 60 62" stroke={eyeColor} strokeWidth="3.2" fill="none" strokeLinecap="round" />
    ) : mood === "thinking" ? (
      <circle cx="50" cy="68" r="1.8" fill={eyeColor} />
    ) : mood === "sleeping" ? (
      <path d="M43 64 Q50 68 57 64" stroke={eyeColor} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M43 65 Q50 60 57 65" stroke={eyeColor} strokeWidth="3" fill="none" strokeLinecap="round" />
    );

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <radialGradient id="mochiBody" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#c79bf5" />
          <stop offset="55%" stopColor="#a560f0" />
          <stop offset="100%" stopColor="#7d3fbf" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="56" rx="38" ry="40" fill="url(#mochiBody)" />
      <ellipse cx="34" cy="34" rx="10" ry="7" fill="#ffffff" opacity="0.25" transform="rotate(-20 34 34)" />
      <ellipse cx="29" cy="70" rx="8" ry="5" fill="#ff8ba7" opacity="0.6" />
      <ellipse cx="71" cy="70" rx="8" ry="5" fill="#ff8ba7" opacity="0.6" />
      {eyes}
      {mouth}
      {mood === "thinking" && (
        <g fill={eyeColor} opacity="0.7">
          <circle cx="78" cy="26" r="3" />
          <circle cx="85" cy="18" r="2.2" />
          <circle cx="91" cy="11" r="1.5" />
        </g>
      )}
      {mood === "sleeping" && (
        <g fill="#fff" opacity="0.9" fontWeight="900" fontSize="13">
          <text x="80" y="26">z</text>
          <text x="88" y="16">z</text>
        </g>
      )}
    </svg>
  );
}

export function Mochi() {
  const reduced = useReducedMotion();
  const [mood, setMood] = useState<MochiMood>("neutral");

  useEffect(() => {
    const unsub = subscribeMochi(setMood);
    const tick = setInterval(() => {
      setMood(mochiEffective(Date.now()));
    }, 4000);
    return () => {
      unsub();
      clearInterval(tick);
    };
  }, []);

  return (
    <motion.button
      onClick={() => {
        mochiReact("happy");
        playSound("tap");
      }}
      className="fixed z-40 bottom-24 right-4 lg:bottom-6 lg:right-8 w-16 h-16 lg:w-20 lg:h-20 cursor-pointer select-none"
      animate={
        reduced
          ? { opacity: 1 }
          : mood === "sleeping"
          ? { scale: [1, 1.02, 1] }
          : mood === "excited"
          ? { y: [0, -10, 0], rotate: [0, -6, 6, 0] }
          : mood === "happy"
          ? { y: [0, -6, 0] }
          : mood === "sad"
          ? { x: [0, -3, 3, 0] }
          : { scale: [1, 1.03, 1] }
      }
      transition={
        mood === "excited"
          ? { duration: 0.6, repeat: 2 }
          : mood === "happy"
          ? { duration: 0.4, repeat: 2 }
          : mood === "sad"
          ? { duration: 0.3, repeat: 4 }
          : { duration: 3, repeat: Infinity, ease: "easeInOut" }
      }
      title="Mochi"
    >
      <span className="absolute inset-0 drop-shadow-[0_4px_8px_rgba(165,96,240,0.4)]">
        <MochiFace mood={mood} />
      </span>
    </motion.button>
  );
}