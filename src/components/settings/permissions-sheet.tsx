"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSoundSettings } from "@/lib/sounds";
import { getDeferredPrompt, isIOS, promptInstall } from "@/lib/pwa";
import { getPushStatus, enablePush } from "@/lib/push";
import { cn } from "@/lib/utils";

export function PermissionsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, toggleSound } = useSoundSettings();
  const [pushState, setPushState] = useState<{ supported: boolean; permission: any; subscribed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);

  const isIOSDevice = isIOS();
  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  const platformLabel = isIOSDevice ? "iPhone / iPad" : isAndroid ? "Android" : "Desktop";

  useEffect(() => {
    if (!open) return;
    getPushStatus().then(setPushState).catch(() => {});
  }, [open]);

  const refreshPush = async () => {
    const st = await getPushStatus();
    setPushState(st);
  };

  const onEnablePush = async () => {
    setBusy(true);
    setMsg(null);
    const res = await enablePush();
    setBusy(false);
    if (res.ok) {
      setMsg("Notifications enabled 🎉");
    } else {
      setMsg(res.error || "Couldn't enable notifications.");
    }
    refreshPush();
  };

  const onSendTest = async () => {
    setBusy(true);
    setMsg(null);
    try {
      // Re-save the current browser subscription first (idempotent) so a failed
      // earlier save self-heals.
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const sr = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: sub.toJSON() }),
          });
          if (!sr.ok) {
            const sd = await sr.json().catch(() => ({}));
            setMsg(`Save failed: ${sd?.error || sr.status}`);
            setBusy(false);
            return;
          }
        }
      } catch {}

      const res = await fetch("/api/push/test", { method: "POST" });
      const d = await res.json();
      setMsg(res.ok ? `Test sent to ${d.sent} device${d.sent === 1 ? "" : "s"}` : d.error || "Failed");
    } catch {
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const onInstall = async () => {
    if (await promptInstall()) {
      setInstalled(true);
      setMsg("App installed 🎉");
    }
  };

  const canInstall = !!getDeferredPrompt();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[480px] z-[70] bg-[#1f2233] rounded-t-3xl border-t border-x border-white/10 flex flex-col"
            style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.5)", maxHeight: "68vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="pt-3 flex justify-center">
              <span className="w-10 h-1.5 rounded-full bg-white/15" />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-white/5">
              <p className="text-lg font-extrabold text-white">Permissions</p>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-3">
              {/* device */}
              <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5 flex items-center justify-between">
                <p className="text-[12px] font-extrabold text-white/70">📱 Device</p>
                <span className="text-[12px] font-bold text-dl-purpleLight">{platformLabel}</span>
              </div>

              {/* Sound */}
              <PermRow
                icon={settings.sound ? "🔊" : "🔇"}
                title="Sound"
                desc={settings.sound ? "Sounds are on" : "Sounds are muted"}
                status="toggle"
                on={settings.sound}
                onToggle={toggleSound}
              />

              {/* Install */}
              <PermRow
                icon="📲"
                title="Save as app"
                desc={installed || isStandalone() ? "Sari is on your home screen" : canInstall ? "Install Sari as an app" : isIOS() ? "Add to Home Screen on your iPhone" : "Install from your browser menu"}
                status={installed || isStandalone() ? "done" : canInstall || isIOS() ? "action" : "hint"}
                onAction={onInstall}
                actionLabel="Install"
              >
                {!canInstall && isIOS() && (
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    Tap <b>Share</b> <span className="text-dl-purpleLight">⎋</span> in Safari, then choose{" "}
                    <b>Add to Home Screen</b>.
                  </p>
                )}
              </PermRow>

              {/* Push */}
              <PermRow
                icon="🔔"
                title="Notifications"
                desc={
                  pushState?.supported === false
                    ? "Not supported on this device"
                    : pushState?.permission === "granted" && pushState.subscribed
                    ? "Notifications are on"
                    : pushState?.permission === "denied"
                    ? "Blocked in browser settings"
                    : isIOSDevice
                    ? "Install Sari first, then enable (iOS 16.4+)"
                    : "Get alerts, drops and FOMO reminders"
                }
                status={
                  pushState?.supported === false
                    ? "hint"
                    : pushState?.permission === "granted" && pushState.subscribed
                    ? "done"
                    : pushState?.permission === "denied"
                    ? "hint"
                    : "action"
                }
                onAction={onEnablePush}
                actionLabel="Enable"
              >
                {isIOSDevice && !isStandalone() && (
                  <p className="text-[11px] text-white/45 leading-relaxed mt-2">
                    On iPhone, notifications need Sari installed: <b>Share</b> <span className="text-dl-purpleLight">⎋</span> →
                    <b> Add to Home Screen</b>, then open Sari and enable here.
                  </p>
                )}
                {isAndroid && pushState?.permission !== "granted" && (
                  <p className="text-[11px] text-white/45 leading-relaxed mt-2">
                    Chrome/Android allows notifications right away — tap Enable and accept the prompt.
                  </p>
                )}
                {pushState?.permission === "granted" && pushState.subscribed && (
                  <button
                    onClick={onSendTest}
                    disabled={busy}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-dl-blue text-white text-xs font-extrabold shadow-btn-blue hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
                  >
                    {busy ? "Sending…" : "Send test notification"}
                  </button>
                )}
              </PermRow>

              {msg && (
                <p className="text-center text-[13px] font-bold text-dl-green bg-dl-green/10 rounded-xl px-3 py-2">{msg}</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PermRow({
  icon,
  title,
  desc,
  status,
  on,
  onToggle,
  onAction,
  actionLabel,
  children,
}: {
  icon: string;
  title: string;
  desc: string;
  status: "toggle" | "action" | "done" | "hint";
  on?: boolean;
  onToggle?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-white text-[15px]">{title}</p>
          <p className="text-[12px] text-white/55">{desc}</p>
        </div>
        {status === "toggle" && (
          <button
            onClick={onToggle}
            className={cn("relative w-12 h-7 rounded-full transition-colors", on ? "bg-dl-green" : "bg-white/15")}
          >
            <span className={cn("absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
          </button>
        )}
        {status === "action" && (
          <button
            onClick={onAction}
            className="px-4 py-2 rounded-xl bg-dl-purple text-white text-sm font-extrabold shadow-btn-purple hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
          >
            {actionLabel}
          </button>
        )}
        {status === "done" && <span className="text-dl-green text-lg">✓</span>}
        {status === "hint" && <span className="text-white/30 text-sm">—</span>}
      </div>
      {children}
    </div>
  );
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}