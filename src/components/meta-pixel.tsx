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

/* Tiny typed wrapper around Meta's `fbq`. Safe no-op if the pixel hasn't loaded. */
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

/* Meta Pixel. The pixel loads and fires PageView IMMEDIATELY (before consent),
   so every landing-page visit is tracked. Consent only gates the EU consent
   signal (fbq consent grant) and the richer conversion events — those are
   additionally sent server-side via CAPI, so registrations & purchases are
   always captured regardless. */
export default function MetaPixel() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  // Fire PageView on every route change (SPA navigation).
  useEffect(() => {
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname;
      return;
    }
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      try {
        window.fbq?.("track", "PageView", { url: typeof window !== "undefined" ? window.location.href : pathname });
      } catch {}
    }
  }, [pathname]);

  // When the user accepts cookies (late), send the EU consent-grant signal.
  useEffect(() => {
    const onGranted = () => {
      try { window.fbq?.("consent", "grant"); } catch {}
    };
    try { window.addEventListener("sari-consent-granted", onGranted); } catch {}
    return () => { try { window.removeEventListener("sari-consent-granted", onGranted); } catch {} };
  }, []);

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
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
          if (localStorage.getItem('${CONSENT_KEY}') === 'accepted') { fbq('consent', 'grant'); }
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