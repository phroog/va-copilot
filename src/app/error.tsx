"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Sari client error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center rounded-3xl bg-white/80 dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface p-8 shadow-lg">
        <p className="text-5xl mb-4">😵‍💫</p>
        <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Something went wrong</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          An unexpected error occurred. Please reload the page — your data is safe.
        </p>
        <div className="mt-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Error:</p>
          <p className="text-xs text-red-600 dark:text-red-300 break-all font-mono">
            {error?.message || "Unknown client error"}
            {error?.digest ? ` (${error.digest})` : ""}
          </p>
        </div>
        <button
          onClick={() => reset()}
          className="mt-6 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white text-sm font-bold shadow-md hover:opacity-90 transition-opacity"
        >
          🔄 Reload page
        </button>
      </div>
    </div>
  );
}