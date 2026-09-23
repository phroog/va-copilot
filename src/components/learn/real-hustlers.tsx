"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getDeferredPrompt, isIOS, isStandalone, promptInstall } from "@/lib/pwa";
import { getPushStatus, enablePush } from "@/lib/push";
import { cn } from "@/lib/utils";

// Post-funnel onboarding: "Real hustlers take risks." — 3 device steps
// (install → notifications → badge). Shown once for funnel users.
export function RealHustlersSheet() {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [push, setPush] = useState<{ supported: boolean; permission: any; subscribed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("sari_hustlers_done") === "1") return;
      if (!localStorage.getItem("sari_dream")) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    setInstalled(isStandalone());
    getPushStatus().then(setPush).catch(() => {});
  }, [open]);

  const install = async () => {
    if (await promptInstall()) setInstalled(true);
  };
  const enable = async () => {
    setBusy(true);
    await enablePush();
    setBusy(false);
    getPushStatus().then(setPush).catch(() => {});
  };
  const done = () => {
    try {
      localStorage.setItem("sari_hustlers_done", "1");
    } catch {}
    setOpen(false);
  };

  const isIOSDevice = isIOS();
  const canInstall = !!getDeferredPrompt();
  const pushOn = push?.permission === "granted" && push.subscribed;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => {}} />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-5 pointer-events-none">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="pointer-events-auto w-full max-w-sm rounded-3xl bg-[#1f2233] border border-white/10 p-6"
            >
              <div className="text-center">
                <div className="text-5xl">🎤</div>
                <h2 className="mt-3 text-2xl font-black text-white">Real hustlers take risks.</h2>
                <p className="mt-1 text-sm text-white/60">Three steps so you never miss the call.</p>
              </div>

              <div className="mt-5 space-y-2.5">
                {/* step 1 — install */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 flex items-center gap-3">
                  <span className="text-2xl">{installed ? "✅" : "📲"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-white">Save Sari to your home screen</p>
                    <p className="text-[11px] text-white/50">
                      {installed ? "Installed — nice." : isIOSDevice ? "Share ⎋ → Add to Home Screen" : canInstall ? "One tap, done." : "Use your browser's install option."}
                    </p>
                  </div>
                  {!installed && !isIOSDevice && canInstall && (
                    <button onClick={install} className="shrink-0 px-3 py-1.5 rounded-xl bg-dl-purple text-white text-xs font-extrabold hover:brightness-110 transition-all">
                      Install
                    </button>
                  )}
                </div>

                {/* step 2 — notifications */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 flex items-center gap-3">
                  <span className="text-2xl">{pushOn ? "✅" : "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-white">Turn on notifications</p>
                    <p className="text-[11px] text-white/50">
                      {pushOn ? "You'll hear every agency move." : push?.permission === "denied" ? "Blocked in browser settings — enable manually." : "FOMO reminders. The good kind."}
                    </p>
                  </div>
                  {!pushOn && push?.permission !== "denied" && (
                    <button onClick={enable} disabled={busy} className="shrink-0 px-3 py-1.5 rounded-xl bg-dl-purple text-white text-xs font-extrabold hover:brightness-110 transition-all disabled:opacity-50">
                      {busy ? "…" : "Enable"}
                    </button>
                  )}
                </div>

                {/* step 3 — badge */}
                <div className={cn("rounded-2xl bg-dl-gold/10 border border-dl-gold/30 p-3.5 flex items-center gap-3")}>
                  <span className="text-2xl">🏅</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-white">Start your live badge</p>
                    <p className="text-[11px] text-white/55">Seal your first skill and your certificate goes live.</p>
                  </div>
                  <a href="/learn" className="shrink-0 px-3 py-1.5 rounded-xl bg-dl-gold text-[#854c00] text-xs font-extrabold hover:brightness-110 transition-all">
                    Play
                  </a>
                </div>
              </div>

              <button onClick={done} className="mt-5 w-full py-3.5 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-black">
                I'm ready — let me in →
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}