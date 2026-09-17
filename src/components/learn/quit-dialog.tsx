"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MochiFace } from "@/components/learn/mochi";
import { playSound } from "@/lib/sounds";
import { mochiReact } from "@/lib/mochi";

const PLEAS = [
  "What?? You want to STOP?",
  "Mochi is CRYING. Look at those tears.",
  "Your future client is watching… 👀",
  "One more mission. Come on, you got this!",
  "Don't make Mochi sad again…",
  "QUIT?! But you're SO close!",
  "Mochi told everyone you're the best. Don't lie to Mochi.",
  "Just ONE more lesson. For Mochi. Please?",
  "The bots are catching up! Gooo!",
  "Mochi already picked out your certificate.",
  "You were THIS close to Leveling up!",
  "What would your dream client say?!",
];

export function QuitDialog({
  open,
  onClose,
  onQuit,
}: {
  open: boolean;
  onClose: () => void;
  onQuit: () => void;
}) {
  const [plea, setPlea] = useState(PLEAS[0]);

  useEffect(() => {
    if (open) {
      setPlea(PLEAS[Math.floor(Math.random() * PLEAS.length)]);
      mochiReact("sad");
      playSound("heartloss");
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              className="pointer-events-auto w-full max-w-sm rounded-3xl bg-[#1f2233] border border-white/10 p-6 text-center"
              style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
            >
              <div className="relative w-28 h-28 mx-auto mb-2">
                <span className="absolute inset-0 animate-dl-pulse">
                  <MochiFace mood="sad" size={112} />
                </span>
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-2xl animate-twinkle">💧</span>
              </div>
              <h2 className="text-xl font-extrabold text-white leading-tight">Are you sure you want to quit?</h2>
              <p className="mt-1 text-sm text-white/60 italic">&ldquo;{plea}&rdquo;</p>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl bg-dl-green text-white font-extrabold shadow-btn-green hover:brightness-105 active:translate-y-1 active:shadow-none transition-all"
                >
                  💪 Keep going!
                </button>
                <button
                  onClick={onQuit}
                  className="w-full py-3 rounded-2xl bg-white/5 border border-white/15 text-white/80 font-bold hover:bg-white/10 active:scale-[0.98] transition-all"
                >
                  Quit anyway
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}