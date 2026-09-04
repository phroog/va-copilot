"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const PIXEL_ID = "1068796469204800";
const CONSENT_KEY = "sari-cookie-consent";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/* Tiny typed wrapper around Meta's `fbq`. Safe no-op if the pixel hasn't loaded
   (e.g. consent not given or script still loading). */
export function trackEvent(event: string, params?: Record<string, unknown>) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", event, params);
    }
  } catch {}
}

export function trackCustom(event: string, params?: Record<string, unknown>) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("trackCustom", event, params);
    }
  } catch {}
}

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

/* Meta Pixel loader. Injects the base snippet only after the visitor accepted
   cookies (GDPR/ePrivacy), initialises fbq, fires the first PageView, and fires
   a fresh PageView on every subsequent route change (SPA navigation). */
export default function MetaPixel() {
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    setConsented(hasConsent());
    // If the user accepts cookies after mount (the banner appears late), the
    // pixel must load right away — listen for the consent-granted event.
    const onGranted = () => setConsented(true);
    try { window.addEventListener("sari-consent-granted", onGranted); } catch {}
    return () => { try { window.removeEventListener("sari-consent-granted", onGranted); } catch {} };
  }, []);

  // Fire PageView on route changes after the initial load (the inline script
  // handles the very first PageView).
  useEffect(() => {
    if (!consented) return;
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname; // initial render — inline script already fired
      return;
    }
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      try {
        window.fbq?.("track", "PageView", { url: typeof window !== "undefined" ? window.location.href : pathname });
      } catch {}
    }
  }, [pathname, consented]);

  if (!consented) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('consent', 'grant');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}