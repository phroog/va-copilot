"use client";

/* Browser-native speech-to-text (Web Speech API). Works in Chrome on desktop
   and Android. Returns a stop() handle; transcript is delivered via onResult.
   Graceful: if unsupported, start() returns false and the UI hides the mic. */

export function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).webkitSpeechRecognition || !!(window as any).SpeechRecognition;
}

export function startSpeech(opts: {
  onResult: (text: string) => void;
  onEnd?: () => void;
  onError?: () => void;
}): { stop: () => void } | null {
  if (!speechSupported()) return null;

  const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  let finalText = "";
  rec.onresult = (e: any) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      finalText += (e.results[i][0]?.transcript || "") + " ";
    }
  };
  rec.onend = () => {
    if (finalText.trim()) opts.onResult(finalText.trim());
    opts.onEnd?.();
  };
  rec.onerror = () => opts.onError?.();

  try {
    rec.start();
  } catch {
    return null;
  }

  return {
    stop: () => { try { rec.stop(); } catch {} },
  };
}