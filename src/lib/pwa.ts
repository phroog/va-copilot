"use client";

// PWA: service worker registration + install-to-home-screen handling.
let deferredPrompt: any = null;

export function setupPWA() {
  if (typeof window === "undefined") return;
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
  });
}

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua);
  const ipadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return ios || ipadOS;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

export async function promptInstall(): Promise<boolean> {
  const dp = deferredPrompt;
  if (!dp) return false;
  dp.prompt();
  try {
    await dp.userChoice;
  } catch {}
  deferredPrompt = null;
  return true;
}