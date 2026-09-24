"use client";

import { useEffect, useRef } from "react";

// Calendly inline booking for the free audit call. Loads Calendly's widget once
// and re-inits inline; shows a direct link as a fallback if the embed can't render.
const CALENDLY_URL = "https://calendly.com/hello-vascora/sari-dream-call?primary_color=667282";

export function CalendlyWidget({ height = 540 }: { height?: number }) {
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
        try {
          C.initInlineWidget({ url: CALENDLY_URL, parentElement: ref.current });
        } catch {}
      }
    };
    if ((window as any).Calendly?.initInlineWidget) {
      const t = setTimeout(init, 150);
      return () => {
        clearTimeout(t);
        script?.removeEventListener("load", init);
      };
    }
    script.addEventListener("load", init);
    return () => script?.removeEventListener("load", init);
  }, []);

  return (
    <div>
      <div ref={ref} className="calendly-inline-widget w-full" data-url={CALENDLY_URL} style={{ minWidth: 320, height }} />
      <a
        href={CALENDLY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block w-full text-center text-sm font-bold text-white/60 hover:text-white underline"
      >
        📅 Calendar not loading? Book your spot here →
      </a>
    </div>
  );
}