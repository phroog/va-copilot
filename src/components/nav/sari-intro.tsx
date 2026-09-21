"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setIntroActive } from "@/lib/sounds";
import { playSound } from "@/lib/sounds";

const KEY = "sari_intro_seen";

// Brief, non-blocking brand intro shown when the app opens (once per session).
// The chime plays on the first user gesture — that's the only moment browsers
// reliably allow audio. It never blocks interaction (pointer-events-none).
export function SariIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1") return;
      sessionStorage.setItem(KEY, "1");
    } catch {}

    setIntroActive(true);
    setVisible(true);
    playSound("chime"); // attempts immediately; blocked until first gesture on mobile
    const t = setTimeout(() => {
      setVisible(false);
      setIntroActive(false);
    }, 2300);
    return () => {
      clearTimeout(t);
      setIntroActive(false);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[85] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="flex flex-col items-center text-center px-6"
            initial={{ scale: 0.8, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
          >
            <span className="text-7xl animate-float drop-shadow-[0_8px_24px_rgba(165,96,240,0.45)]">🍠</span>
            <p className="mt-3 text-4xl font-extrabold bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
              Sari
            </p>
            <p className="mt-1 text-sm font-bold text-white/50">Your VA training dojo</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}