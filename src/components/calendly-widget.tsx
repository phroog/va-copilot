"use client";

import { useEffect, useRef } from "react";

// Calendly inline booking for the free audit call (no sales pitch — it's a
// no-obligation call). Loads Calendly's widget once and re-inits inline.
const CALENDLY_URL = "https://calendly.com/hello-vascora/sari-dream-call?primary_color=667282";

export function CalendlyWidget({ height = 640 }: { height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let script = document.querySelector('script[src*="calendly.com/assets/external/widget.js"]') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      document.head.appendChild(script);
    }
    const init = () => {
      const C = (window as any).Calendly;
      if (C?.initInlineWidget && ref.current) {
        C.initInlineWidget({ url: CALENDLY_URL, parentElement: ref.current });
      }
    };
    if ((window as any).Calendly?.initInlineWidget) {
      init();
    } else {
      script.addEventListener("load", init);
    }
    return () => {
      script?.removeEventListener("load", init);
    };
  }, []);

  return <div ref={ref} className="w-full rounded-2xl overflow-hidden" style={{ minWidth: 320, height }} />;
}