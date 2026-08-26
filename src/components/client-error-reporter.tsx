"use client";

import { useEffect, useState } from "react";

/* Shows any uncaught client error (window.onerror / unhandledrejection) as a
   small on-screen overlay so the real error message is visible on any device
   (especially mobile, where the browser console is hard to reach).
   WebSocket/Supabase-realtime rejections are marked handled (non-fatal; pages
   fall back to polling) and not shown as scary errors. */
export default function ClientErrorReporter() {
  const [errs, setErrs] = useState<{ msg: string; src?: string }[]>([]);

  useEffect(() => {
    const isNoise = (msg: string) => /websocket|operation is insecure|realtime|unavailable/i.test(msg);
    const onError = (e: ErrorEvent) => {
      const msg = e.message || "Unknown error";
      if (isNoise(msg)) return;
      const src = e.filename ? `${e.filename}:${e.lineno}` : undefined;
      setErrs((prev) => [...prev.slice(-2), { msg, src }]);
    };
    const onRej = (e: PromiseRejectionEvent) => {
      const raw = String((e.reason && (e.reason as any)?.message) || e.reason || "Unknown rejection");
      if (isNoise(raw)) {
        e.preventDefault(); // mark as handled so it isn't reported as unhandled
        return;
      }
      setErrs((prev) => [...prev.slice(-2), { msg: raw }]);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  if (errs.length === 0) return null;

  return (
    <div className="fixed bottom-2 right-2 z-[999] max-w-sm rounded-2xl bg-red-600/95 text-white text-xs p-3 space-y-1 shadow-2xl">
      <p className="font-extrabold">Client error:</p>
      {errs.map((e, i) => (
        <p key={i} className="break-all">
          {e.msg}
          {e.src ? <span className="opacity-70"> ({e.src})</span> : null}
        </p>
      ))}
    </div>
  );
}