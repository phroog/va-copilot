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
   cookies (GDPR/ePrivacy), initialises fbq and fires PageView on every route
   change (SPA navigation doesn't reload the page). */
export default function MetaPixel() {
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);
  const initedRef = useRef(false);

  useEffect(() => {
    setConsented(hasConsent());
  }, []);

  // Fire PageView whenever the route changes, but only after init has run.
  useEffect(() => {
    if (!consented || !initedRef.current) return;
    const url = typeof window !== "undefined" ? window.location.href : pathname;
    try {
      window.fbq?.("track", "PageView", { url });
    } catch {}
  }, [pathname, consented]);

  const onLoad = () => {
    try {
      window.fbq?.("init", PIXEL_ID);
      window.fbq?.("track", "PageView");
      initedRef.current = true;
    } catch {}
  };

  if (!consented) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive" onLoad={onLoad}>
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
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