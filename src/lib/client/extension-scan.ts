"use client";

/* Detect the Sari polling extension from the web app (desktop only) via the
   sari-bridge content script. Returns { installed: boolean }. */

let counter = 0;

export function detectExtension(timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const chrome = (window as any).chrome;
    // The bridge content script is present → extension is installed.
    if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
      return resolve(false);
    }
    const msgId = "ping" + ++counter;
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d && d.msgId === msgId) {
        window.removeEventListener("sari-extension-reply", handler);
        resolve(true);
      }
    };
    window.addEventListener("sari-extension-reply", handler);
    window.postMessage({ type: "SARI_PING", msgId }, "*");
    setTimeout(() => {
      window.removeEventListener("sari-extension-reply", handler);
      resolve(false);
    }, timeoutMs);
  });
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export interface ExtensionScanResult {
  ok: boolean;
  evidence?: any;
  error?: string;
}

/* Ask the extension to scan a URL in a real tab (full DOM). */
export function scanWithExtension(url: string, timeoutMs = 30000): Promise<ExtensionScanResult> {
  return new Promise((resolve) => {
    const msgId = "scan" + ++counter;
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d && d.msgId === msgId) {
        window.removeEventListener("sari-extension-reply", handler);
        resolve({ ok: !!d.ok, evidence: d.evidence, error: d.error });
      }
    };
    window.addEventListener("sari-extension-reply", handler);
    window.postMessage({ type: "SARI_SCAN_JOB", url, msgId }, "*");
    setTimeout(() => {
      window.removeEventListener("sari-extension-reply", handler);
      resolve({ ok: false, error: "Zeitüberschreitung" });
    }, timeoutMs);
  });
}