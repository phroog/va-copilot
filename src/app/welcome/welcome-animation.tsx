"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const UBE = "#6C4E8F";
const DEEP = "#1a1a2e";

const PARTICLES = [
  { top: "16%", left: "40%", size: 5, delay: 0.0, hue: UBE },
  { top: "24%", left: "60%", size: 3, delay: 0.1, hue: "#B39DDB" },
  { top: "12%", left: "52%", size: 4, delay: 0.2, hue: "#FFF8F0" },
  { top: "30%", left: "32%", size: 3, delay: 0.28, hue: "#B39DDB" },
  { top: "22%", left: "70%", size: 5, delay: 0.36, hue: UBE },
  { top: "34%", left: "58%", size: 2, delay: 0.44, hue: "#FFF8F0" },
  { top: "10%", left: "66%", size: 3, delay: 0.52, hue: UBE },
  { top: "28%", left: "24%", size: 4, delay: 0.6, hue: "#B39DDB" },
  { top: "18%", left: "76%", size: 2, delay: 0.68, hue: "#FFF8F0" },
  { top: "36%", left: "42%", size: 3, delay: 0.76, hue: UBE },
  { top: "20%", left: "26%", size: 2, delay: 0.84, hue: "#B39DDB" },
  { top: "32%", left: "72%", size: 4, delay: 0.92, hue: "#FFF8F0" },
  { top: "14%", left: "46%", size: 2, delay: 1.0, hue: "#B39DDB" },
  { top: "26%", left: "50%", size: 3, delay: 1.08, hue: UBE },
];

export default function WelcomeAnimation() {
  const router = useRouter();
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    try {
      window.sessionStorage.setItem("sari_welcome_done", "true");
    } catch {}
    router.replace("/dashboard");
  };

  useEffect(() => {
    let alreadyDone = false;
    try {
      alreadyDone = window.sessionStorage.getItem("sari_welcome_done") === "true";
    } catch {}
    if (alreadyDone) {
      router.replace("/dashboard");
      return;
    }
    const t = setTimeout(finish, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <div className="welcome-root">
      <style>{`
        .welcome-root {
          position: fixed; inset: 0; z-index: 9999; overflow: hidden;
          background: #0a0a0a; color: #fff;
          font-family: 'Nunito', system-ui, sans-serif;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          animation: welcomeBg 0.5s ease forwards;
          -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent;
          cursor: default;
        }
        @keyframes welcomeBg { from { background-color: #0a0a0a; } to { background-color: ${DEEP}; } }
        .welcome-root::after {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse at 50% 42%, rgba(108,78,143,0.16), transparent 62%);
          animation: welcomeGlowIn 2s ease forwards;
        }
        @keyframes welcomeGlowIn { from { opacity: 0; } to { opacity: 1; } }

        .welcome-stage { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }

        .welcome-svg {
          width: min(58vw, 170px); height: auto; overflow: visible;
          filter: drop-shadow(0 0 10px rgba(108,78,143,0.75)) drop-shadow(0 0 26px rgba(108,78,143,0.45));
        }
        .welcome-swoosh {
          fill: none; stroke: ${UBE}; stroke-width: 15; stroke-linecap: round; stroke-linejoin: round;
          stroke-dasharray: 100; stroke-dashoffset: 100;
          animation: welcomeDraw 1s cubic-bezier(0.65, 0, 0.35, 1) 0.5s forwards;
        }
        @keyframes welcomeDraw {
          0% { opacity: 0; stroke-dashoffset: 100; }
          12% { opacity: 1; }
          100% { opacity: 1; stroke-dashoffset: 0; }
        }

        .welcome-word {
          margin: 6px 0 0; font-size: clamp(40px, 9vw, 58px); font-weight: 800; letter-spacing: 6px;
          color: #fff; text-shadow: 0 0 16px rgba(108,78,143,0.85), 0 0 42px rgba(108,78,143,0.5);
          opacity: 0; animation: welcomeFadeIn 1s ease 1.5s forwards;
        }
        @keyframes welcomeFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        .welcome-particles { position: absolute; inset: 0; z-index: 1; pointer-events: none; }

        .welcome-particle {
          position: absolute; border-radius: 999px; pointer-events: none; opacity: 0;
          animation: welcomeParticle 1.2s ease forwards;
        }
        @keyframes welcomeParticle {
          0% { opacity: 0; transform: translateY(6px) scale(0.6); }
          25% { opacity: 0.9; }
          100% { opacity: 0; transform: translateY(-26px) scale(1); }
        }

        .welcome-skip {
          position: absolute; right: 18px; bottom: 18px; z-index: 2;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,248,240,0.18); color: #fff;
          font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: 1px;
          padding: 8px 18px; border-radius: 999px; opacity: 0.5; cursor: pointer;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .welcome-skip:hover { opacity: 1; transform: scale(1.04); }

        @media (max-width: 640px) {
          .welcome-svg { width: 46vw; }
          .welcome-word { letter-spacing: 4px; }
        }
      `}</style>

      <div className="welcome-stage">
        <svg className="welcome-svg" viewBox="0 0 120 160" aria-hidden="true">
          <path
            className="welcome-swoosh"
            pathLength={100}
            d="M38 24 C 66 8, 88 20, 76 40 C 64 58, 42 62, 40 80 C 38 98, 62 102, 74 120 C 84 136, 74 152, 52 144"
          />
        </svg>
        <h1 className="welcome-word">Sari</h1>
      </div>

      <div className="welcome-particles" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="welcome-particle"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.hue,
              animationDelay: (2.5 + p.delay).toFixed(2) + "s",
            }}
          />
        ))}
      </div>

      <button type="button" className="welcome-skip" onClick={finish}>
        Skip
      </button>
    </div>
  );
}