"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  VA Escape Room — full-screen interactive landing experience        */
/*  Phases: 1) Catch the Jobs  2) The Overwhelm  3) Sari Magic  4) CTA */
/*  Canvas for particles/wave/confetti + CSS/DOM for the UI.           */
/* ------------------------------------------------------------------ */

const UBE = "#6C4E8F";
const LAVENDER = "#B39DDB";
const PEACH = "#FFDAB9";
const PINK = "#E8A598";
const CREAM = "#FFF8F0";
const DARK = "#1a1a2e";
const RED = "#E15554";
const GREEN = "#4CAF50";

const JOKE_JOBS = [
  "VA needed – $20/hr",
  "High paying client",
  "Urgent hire",
  "Easy money 🤑",
  "5-star rating ready",
  "Unlimited hours",
  "Google for scale",
  "No skills needed",
  "Reply within 2 mins",
  "Dream client TODAY",
];

const OVERWHELM_TABS = [
  "Upwork",
  "Facebook",
  "LinkedIn",
  "Indeed",
  "OnlineJobs.ph",
  "Gmail",
  "Slack",
  "Trello",
  "Asana",
  "Notion",
  "Zoom",
  "Inbox (42)",
  "Calendar",
  "PayPal",
  "Canva",
];

const RESULT_JOBS = [
  { title: "E-commerce VA", company: "Modern Retail Studio", match: 94 },
  { title: "Social Media Manager", company: "Blossom Beauty", match: 89 },
  { title: "Admin Assistant", company: "Swift Freight", match: 86 },
  { title: "Executive Support", company: "Peak Founders", match: 82 },
];

const FLOATING_COLORS = [UBE, LAVENDER, PEACH, PINK, GREEN, "#F9A8D4", "#8E8FD8"];
const CONFETTI_COLORS = [GREEN, CREAM, PEACH, UBE, LAVENDER, PINK, "#FFD700"];

type Sfx = ReturnType<typeof createSfx>;

/* ------------------------- tiny audio helpers ---------------------- */
function createSfx() {
  let ctx: AudioContext | null = null;
  let muted = true;

  function get() {
    if (ctx) return ctx;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  function tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
    if (muted) return;
    const c = get();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime + at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + at + dur);
    g.gain.setValueAtTime(0, c.currentTime + at);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(c.currentTime + at);
    o.stop(c.currentTime + at + dur + 0.03);
  }

  function noise(at: number, dur: number, vol: number, freq: number) {
    if (muted) return;
    const c = get();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(c.currentTime + at);
  }

  return {
    unmute() {
      muted = false;
      const c = get();
      if (c && c.state === "suspended") c.resume();
    },
    mute() {
      muted = true;
    },
    click() {
      tone(1200, 0, 0.05, "triangle", 0.1, 700);
    },
    thud() {
      noise(0, 0.16, 0.25, 200);
      tone(140, 0, 0.16, "sine", 0.2, 60);
    },
    frantic() {
      for (let i = 0; i < 5; i++) tone(900, i * 0.06, 0.03, "square", 0.05, 500);
    },
    shatter() {
      noise(0, 0.45, 0.4, 7000);
      noise(0.05, 0.4, 0.3, 3500);
      for (let i = 0; i < 4; i++) tone(2200 - i * 350, i * 0.05, 0.1, "square", 0.08, 400);
    },
    sweep() {
      tone(200, 0, 0.9, "sine", 0.1, 900);
    },
    chime() {
      tone(523.25, 0, 0.28, "sine", 0.14);
      tone(659.25, 0.09, 0.28, "sine", 0.14);
      tone(783.99, 0.18, 0.4, "sine", 0.16);
      tone(1046.5, 0.28, 0.55, "sine", 0.16);
    },
    win() {
      tone(523.25, 0, 0.3, "triangle", 0.14);
      tone(659.25, 0.1, 0.3, "triangle", 0.14);
      tone(783.99, 0.2, 0.3, "triangle", 0.14);
      tone(1046.5, 0.3, 0.6, "triangle", 0.18);
      noise(0.3, 0.3, 0.12, 8000);
    },
  };
}

/* ---------------------------- pixel cat ---------------------------- */
function PixelMochi() {
  return (
    <svg viewBox="0 0 64 64" width="72" height="72" className="ve-mochi" aria-hidden="true">
      <rect x="6" y="30" width="8" height="6" fill={UBE} />
      <rect x="2" y="26" width="6" height="6" fill={UBE} />
      <rect x="14" y="34" width="34" height="20" fill={UBE} />
      <rect x="12" y="38" width="38" height="12" fill={UBE} />
      <rect x="14" y="52" width="8" height="6" fill={UBE} />
      <rect x="40" y="52" width="8" height="6" fill={UBE} />
      <rect x="12" y="14" width="40" height="24" fill={UBE} />
      <rect x="20" y="8" width="6" height="10" fill={UBE} />
      <rect x="38" y="8" width="6" height="10" fill={UBE} />
      <rect x="22" y="10" width="3" height="6" fill={PINK} />
      <rect x="39" y="10" width="3" height="6" fill={PINK} />
      <g className="ve-mochi-eyes">
        <rect x="20" y="22" width="6" height="6" fill={DARK} />
        <rect x="38" y="22" width="6" height="6" fill={DARK} />
      </g>
      <g className="ve-mochi-wink">
        <rect x="38" y="24" width="7" height="3" fill={DARK} />
      </g>
      <rect x="30" y="29" width="4" height="3" fill={DARK} />
      <rect x="24" y="32" width="4" height="2" fill={DARK} />
      <rect x="36" y="32" width="4" height="2" fill={DARK} />
      <rect x="6" y="26" width="8" height="2" fill={DARK} />
      <rect x="6" y="32" width="8" height="2" fill={DARK} />
      <rect x="50" y="26" width="8" height="2" fill={DARK} />
      <rect x="50" y="32" width="8" height="2" fill={DARK} />
    </svg>
  );
}

/* ================================================================== */
export default function VaEscapeRoom() {
  const router = useRouter();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overloadBarRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<1 | 2 | 3 | 4>(1);

  const fxRef = useRef<{ confetti: any[]; flo: any[]; burst: any[]; wave: { active: boolean; t: number } }>({
    confetti: [],
    flo: [],
    burst: [],
    wave: { active: false, t: 0 },
  });
  const sfxRef = useRef<Sfx>(null as unknown as Sfx);

  useEffect(() => {
    sfxRef.current = createSfx();
    return () => {
      sfxRef.current = null as unknown as Sfx;
    };
  }, []);

  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [jobs, setJobs] = useState<{ id: number; title: string; left: number; dur: number }[]>([]);
  const [tabs, setTabs] = useState<{ id: number; label: string; left: number; top: number; size: number }[]>([]);
  const [cracked, setCracked] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [results, setResults] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [cta, setCta] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  /* --------------------------- main effect -------------------------- */
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    const fx = fxRef.current;
    const sfx = sfxRef.current;

    let W = 0;
    let H = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const timers: ReturnType<typeof setTimeout>[] = [];
    function at(ms: number, fn: () => void) {
      timers.push(setTimeout(fn, ms));
    }

    /* Phase 1 — falling job cards */
    let cardId = 0;
    let jobTimer: ReturnType<typeof setTimeout> | null = null;
    const spawnJob = () => {
      cardId++;
      const id = cardId;
      const dur = 3400 + Math.random() * 2200;
      const left = 4 + Math.random() * 84;
      const title = JOKE_JOBS[Math.floor(Math.random() * JOKE_JOBS.length)];
      setJobs((j) => [...j, { id, title, left, dur }]);
      timers.push(setTimeout(() => setJobs((j) => j.filter((c) => c.id !== id)), dur));
      jobTimer = setTimeout(spawnJob, 620);
    };

    /* Phase 2: overwhelm tabs */
    let tabId = 0;
    let tabDelay = 560;
    let tabChain: ReturnType<typeof setTimeout> | null = null;
    const spawnTab = () => {
      tabId++;
      const id = tabId;
      const label = OVERWHELM_TABS[Math.floor(Math.random() * OVERWHELM_TABS.length)];
      setTabs((t) => [
        ...t,
        { id, label, left: 2 + Math.random() * 76, top: 8 + Math.random() * 70, size: 9 + Math.random() * 7 },
      ]);
      setTabs((t) => (t.length > 90 ? t.slice(t.length - 90) : t));
      tabDelay = Math.max(120, tabDelay * 0.82);
      tabChain = setTimeout(spawnTab, tabDelay);
    };

    /* overload + wave */
    let overload = 0;
    const overloaded = { val: false };
    const wave = fx.wave;

    /* phase scheduling */
    at(0, () => {
      setPhase(1);
      phaseRef.current = 1;
      jobTimer = setTimeout(spawnJob, 400);
    });
    at(5000, () => {
      if (jobTimer) clearTimeout(jobTimer);
      setJobs([]);
      setPhase(2);
      phaseRef.current = 2;
      spawnTab();
      sfx.thud();
    });
    at(6500, () => sfx.frantic());

    /* render loop */
    let last = performance.now();
    let raf = 0;

    function step(dt: number) {
      if (phaseRef.current === 2 && !overloaded.val) {
        overload = Math.min(100, overload + (dt / 4200) * 100);
        if (overloadBarRef.current) {
          overloadBarRef.current.style.width = overload.toFixed(1) + "%";
          overloadBarRef.current.style.background = overload > 75 ? RED : "#F59E0B";
        }
        if (overload >= 100) {
          overloaded.val = true;
          sfx.shatter();
          setCracked(true);
          setTabs([]);
          setPhase(3);
          phaseRef.current = 3;
          at(1500, () => {
            setCracked(false);
            sfx.sweep();
            wave.active = true;
            wave.t = 0;
          });
        }
      }

      /* purple wave sweeping bottom → top */
      if (wave.active) {
        wave.t += dt / 1500;
        const edge = H - wave.t * (H + 160);
        ctx.fillStyle = CREAM;
        ctx.fillRect(0, 0, W, Math.max(0, edge));
        const g = ctx.createLinearGradient(0, Math.max(0, edge), 0, H);
        g.addColorStop(0, UBE);
        g.addColorStop(0.4, "#4a3560");
        g.addColorStop(1, DARK);
        ctx.fillStyle = g;
        ctx.fillRect(0, Math.max(0, edge), W, H - Math.max(0, edge));
        if (wave.t >= 1) {
          wave.active = false;
          ctx.fillStyle = CREAM;
          ctx.fillRect(0, 0, W, H);
          setShowSearch(true);
        }
      }

      /* burst particles */
      for (let i = fx.burst.length - 1; i >= 0; i--) {
        const p = fx.burst[i];
        p.life++;
        if (p.life >= p.ttl) {
          fx.burst.splice(i, 1);
          continue;
        }
        p.vy += 0.18;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 1 - p.life / p.ttl;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      /* confetti */
      for (let i = fx.confetti.length - 1; i >= 0; i--) {
        const p = fx.confetti[i];
        p.life++;
        if (p.life >= p.ttl) {
          fx.confetti.splice(i, 1);
          continue;
        }
        p.vy += 0.12;
        p.x += p.vx * 0.98;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 1 - p.life / p.ttl;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      }

      /* floaters ("Nope!") */
      for (let i = fx.flo.length - 1; i >= 0; i--) {
        const f = fx.flo[i];
        f.life++;
        if (f.life >= f.ttl) {
          fx.flo.splice(i, 1);
          continue;
        }
        f.y -= 1.2;
        const a = 1 - f.life / f.ttl;
        ctx.globalAlpha = Math.min(1, a * 2.5);
        ctx.font = "800 20px Nunito, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(26,26,46,0.7)";
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      }
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(50, now - last);
      last = now;
      ctx.clearRect(0, 0, W, H);
      step(dt);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      if (jobTimer) clearTimeout(jobTimer);
      if (tabChain) clearTimeout(tabChain);
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", resize);
      setJobs([]);
      setTabs([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------- CTA inactivity redirect ------------------- */
  useEffect(() => {
    if (!cta) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const reset = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => router.push("/auth/signup"), 10000);
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [cta, router]);

  /* --------------------------- helpers / handlers -------------------- */
  function burstAt(x: number, y: number, n: number, palette: string[]) {
    const fx = fxRef.current;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 5;
      fx.burst.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1.5,
        size: 2 + Math.random() * 6,
        life: 0,
        ttl: 40 + Math.random() * 30,
        color: palette[Math.floor(Math.random() * palette.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
      });
    }
  }

  function confettiAt(x: number, y: number) {
    const fx = fxRef.current;
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 7;
      fx.confetti.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 3,
        size: 4 + Math.random() * 6,
        life: 0,
        ttl: 80 + Math.random() * 60,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.5,
      });
    }
  }

  const grabCard = (e: React.MouseEvent, el: HTMLElement) => {
    sfxRef.current?.click();
    sfxRef.current?.thud();
    const r = el.getBoundingClientRect();
    burstAt(r.left + r.width / 2, r.top + r.height / 2, 26, FLOATING_COLORS);
    fxRef.current.flo.push({ x: r.left + r.width / 2, y: r.top, text: "Nope!", life: 0, ttl: 60, color: RED });
    setJobs((j) => j.filter((c) => c.id !== Number(el.dataset.id)));
  };

  const closeTab = (e: React.MouseEvent, el: HTMLElement) => {
    sfxRef.current?.click();
    const r = el.getBoundingClientRect();
    burstAt(r.left + r.width / 2, r.top + r.height / 2, 10, [LAVENDER, UBE, "#8E8FD8"]);
    setTabs((t) => t.filter((x) => x.id !== Number(el.dataset.id)));
    if (overloadBarRef.current) {
      const cur = parseFloat(overloadBarRef.current.style.width || "0");
      overloadBarRef.current.style.width = Math.max(0, cur - 6) + "%";
    }
  };

  const scan = () => {
    sfxRef.current?.chime();
    setResults(true);
  };

  const pickJob = (e: React.MouseEvent, idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    sfxRef.current?.win();
    const el = (e.target as HTMLElement).closest(".ve-result");
    if (el) confettiAt(el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2, el.getBoundingClientRect().top + 30);
    setTimeout(() => setCta(true), 1500);
  };

  const toggleSound = () => {
    setSoundOn((s) => {
      if (s) sfxRef.current?.mute();
      else sfxRef.current?.unmute();
      return !s;
    });
  };

  const skip = () => setCta(true);

  /* ------------------------------------------------------------------ */
  return (
    <div className="ve-root" ref={wrapRef}>
      <style>{`
        .ve-root {
          position: fixed; inset: 0; overflow: hidden;
          background: ${DARK}; color: ${CREAM};
          font-family: 'Nunito', system-ui, sans-serif;
          -webkit-user-select: none; user-select: none;
          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
        }
        * { box-sizing: border-box; }

        .ve-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }

        .ve-hud { position: absolute; top: 0; left: 0; right: 0; padding: 14px 16px; display: flex; justify-content: center; pointer-events: none; z-index: 5; }
        .ve-count { background: rgba(26,26,46,.75); border: 1px solid rgba(255,248,240,.2); padding: 8px 18px; border-radius: 999px; font-weight: 800; font-size: 14px; letter-spacing: .3px; }

        .ve-overload { position: absolute; top: 0; left: 0; right: 0; z-index: 5; }
        .ve-overload-track { height: 14px; background: rgba(26,26,46,.7); }
        .ve-overload-fill { height: 100%; width: 0%; background: ${RED}; transition: background .2s; }
        .ve-overload-label { text-align: center; padding: 4px; font-weight: 800; font-size: 13px; color: #ffd6d6; text-shadow: 0 1px 3px rgba(0,0,0,.6); }

        .ve-corners { position: absolute; top: 10px; right: 10px; z-index: 20; display: flex; gap: 8px; }
        .ve-cbtn { background: rgba(26,26,46,.45); color: rgba(255,248,240,.85); border: 1px solid rgba(255,248,240,.25); padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; cursor: pointer; backdrop-filter: blur(4px); transition: background .15s, transform .15s; }
        .ve-cbtn:hover { background: rgba(26,26,46,.7); transform: scale(1.05); }

        .ve-cards { position: absolute; inset: 0; overflow: hidden; z-index: 2; }
        .ve-card { position: absolute; top: 0; left: 0; margin-left: var(--left); width: 170px; padding: 14px 16px; background: ${CREAM}; color: ${UBE}; border-radius: 18px; box-shadow: 0 8px 24px rgba(0,0,0,.35), 0 0 0 2px rgba(179,157,219,.5); font-weight: 800; font-size: 14px; text-align: center; cursor: pointer; animation: veFall var(--dur) linear forwards; }
        .ve-card span { display: inline-block; padding: 3px 10px; border-radius: 999px; background: ${LAVENDER}; color: #fff; font-size: 10px; font-weight: 800; margin-bottom: 6px; }
        .ve-card b { display: block; }
        @keyframes veFall { 0% { transform: translateY(-140px) rotate(-2deg); opacity: 0; } 8% { opacity: 1; } 100% { transform: translateY(115vh) rotate(3deg); opacity: .95; } }

        .ve-tabs { position: absolute; inset: 0; overflow: hidden; z-index: 2; }
        .ve-tab { position: absolute; left: var(--left); top: var(--top); padding: 6px 12px; background: rgba(255,248,240,.9); color: #2a2a44; border-radius: 8px 8px 2px 2px; font-size: var(--size); font-weight: 700; border-top: 4px solid ${LAVENDER}; box-shadow: 0 3px 10px rgba(0,0,0,.4); cursor: pointer; white-space: nowrap; animation: vePop .18s ease-out; }
        @keyframes vePop { 0% { transform: scale(.4); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

        .ve-crack { position: absolute; inset: 0; z-index: 6; pointer-events: none; opacity: 0; transition: opacity .2s; }
        .ve-crack.show { opacity: 1; }
        .ve-crack svg { width: 100%; height: 100%; }

        .ve-search { position: absolute; inset: 0; z-index: 8; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 22px; padding: 24px; }
        .ve-search.show { display: flex; animation: veFadeIn .6s ease-out; }
        .ve-search-bar { background: ${CREAM}; color: #2a2a44; border-radius: 999px; padding: 16px 22px; width: min(90vw, 480px); font-size: 17px; font-weight: 700; text-align: center; box-shadow: 0 14px 40px rgba(0,0,0,.4), 0 0 0 3px rgba(179,157,219,.5); }
        .ve-scan { border: none; cursor: pointer; font-family: inherit; font-weight: 900; font-size: 19px; color: #fff; background: linear-gradient(90deg, ${UBE}, ${PINK}); padding: 18px 44px; border-radius: 999px; box-shadow: 0 12px 32px rgba(108,78,143,.55); animation: vePulse 1.6s ease-in-out infinite; }
        .ve-scan:hover { transform: scale(1.05); }
        @keyframes vePulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }

        .ve-results { position: absolute; inset: 0; z-index: 9; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 24px; overflow-y: auto; }
        .ve-results.show { display: flex; animation: veFadeIn .5s ease-out; }
        .ve-results-title { font-size: 20px; font-weight: 900; color: ${UBE}; margin-bottom: 6px; text-align: center; }
        .ve-result { width: min(92vw, 420px); background: ${CREAM}; color: #2a2a44; border-radius: 20px; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; cursor: pointer; box-shadow: 0 12px 30px rgba(0,0,0,.35); transform: perspective(600px) rotateY(-90deg); opacity: 0; animation: veFlip .5s ease-out forwards; transition: transform .15s ease; }
        .ve-result:hover { transform: scale(1.03) translateY(-2px); }
        .ve-result.picked { animation: none; opacity: 1; background: ${GREEN}; color: #fff; }
        .ve-result .ve-match { font-weight: 900; color: ${GREEN}; }
        .ve-result.picked .ve-match { color: #fff; }
        .ve-apply { background: ${UBE}; color: #fff; font-weight: 800; font-size: 13px; padding: 8px 18px; border-radius: 999px; white-space: nowrap; }
        .ve-result.picked .ve-apply { background: #fff; color: ${GREEN}; }
        @keyframes veFlip { 0% { opacity: 0; transform: perspective(600px) rotateY(-90deg); } 100% { opacity: 1; transform: perspective(600px) rotateY(0deg); } }
        @keyframes veFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .ve-success { position: absolute; inset: 0; z-index: 10; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 14px; pointer-events: none; }
        .ve-success.show { display: flex; animation: veFadeIn .3s ease-out; }
        .ve-check { width: 92px; height: 92px; border-radius: 999px; background: ${GREEN}; display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 40px rgba(76,175,80,.5); animation: veBounce .6s ease; }
        .ve-check svg { width: 54px; height: 54px; stroke: #fff; stroke-width: 6; fill: none; stroke-linecap: round; stroke-linejoin: round; }
        @keyframes veBounce { 0% { transform: scale(.2); } 55% { transform: scale(1.15); } 100% { transform: scale(1); } }

        .ve-cta { position: absolute; inset: 0; z-index: 30; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 28px; text-align: center; background: rgba(26,26,46,.6); backdrop-filter: blur(6px); animation: veFadeIn .5s ease-out; }
        .ve-cta.show { display: flex; }
        .ve-cta-panel { background: rgba(255,248,240,.14); border: 1px solid rgba(255,248,240,.22); border-radius: 28px; padding: 34px 30px; width: min(92vw, 400px); display: flex; flex-direction: column; align-items: center; gap: 14px; box-shadow: 0 24px 70px rgba(0,0,0,.5); }
        .ve-logo { font-size: 46px; line-height: 1; filter: drop-shadow(0 6px 16px rgba(108,78,143,.6)); }
        .ve-wordmark { font-size: 30px; font-weight: 900; letter-spacing: .5px; background: linear-gradient(90deg, ${CREAM}, ${PEACH}); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .ve-tag { font-size: 18px; font-weight: 800; color: ${CREAM}; line-height: 1.5; max-width: 300px; margin: 0; }
        .ve-mochi-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .ve-mochi-caption { font-size: 11px; font-weight: 800; color: rgba(255,248,240,.75); letter-spacing: .3px; }
        .ve-cta-btn { border: none; cursor: pointer; font-family: inherit; font-weight: 900; font-size: 18px; color: ${UBE}; background: linear-gradient(90deg, ${CREAM}, ${PEACH}); padding: 16px 44px; border-radius: 999px; box-shadow: 0 12px 36px rgba(0,0,0,.4); transition: transform .15s ease; text-decoration: none; }
        .ve-cta-btn:hover { transform: scale(1.06); }
        .ve-learn { color: rgba(255,248,240,.8); font-size: 13px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; background: none; border: none; font-family: inherit; }
        .ve-learn:hover { color: ${CREAM}; }

        .ve-mochi .ve-mochi-eyes { animation: veBlink 3.4s infinite; }
        .ve-mochi .ve-mochi-wink { opacity: 0; animation: veWink 3.4s infinite; }
        @keyframes veBlink { 0%, 92%, 100% { opacity: 1; } 94% { opacity: 0; } 96% { opacity: 1; } }
        @keyframes veWink { 0%, 92%, 100% { opacity: 0; } 94% { opacity: 1; } 96% { opacity: 0; } }
      `}</style>

      <canvas ref={canvasRef} className="ve-canvas" />

      <div className="ve-corners">
        <button type="button" className="ve-cbtn" onClick={toggleSound} aria-label="Toggle sound">
          {soundOn ? "🔊" : "🔇"}
        </button>
        <button type="button" className="ve-cbtn" onClick={skip} aria-label="Skip to sign up">
          Skip ⏭
        </button>
      </div>

      {phase === 1 && (
        <div className="ve-hud">
          <div className="ve-count">🔍 Jobs found: 0</div>
        </div>
      )}

      {phase === 2 && (
        <div className="ve-overload">
          <div className="ve-overload-track">
            <div ref={overloadBarRef} className="ve-overload-fill" />
          </div>
          <div className="ve-overload-label">⚠️ Overload incoming…</div>
        </div>
      )}

      <div className="ve-cards">
        {jobs.map((c) => (
          <div
            key={c.id}
            data-id={c.id}
            className="ve-card"
            style={{ "--left": c.left + "%", "--dur": c.dur + "ms" } as React.CSSProperties}
            onClick={(e) => grabCard(e, e.currentTarget)}
          >
            <span>JOB</span>
            <b>{c.title}</b>
          </div>
        ))}
      </div>

      <div className="ve-tabs">
        {tabs.map((t) => (
          <div
            key={t.id}
            data-id={t.id}
            className="ve-tab"
            style={{ "--left": t.left + "%", "--top": t.top + "%", "--size": t.size + "px" } as React.CSSProperties}
            onClick={(e) => closeTab(e, e.currentTarget)}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div className={`ve-crack ${cracked ? "show" : ""}`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline points="50,50 38,20 30,12" fill="none" stroke="rgba(255,248,240,.85)" strokeWidth="0.4" />
          <polyline points="50,50 62,28 70,10" fill="none" stroke="rgba(255,248,240,.85)" strokeWidth="0.45" />
          <polyline points="50,50 30,60 18,82" fill="none" stroke="rgba(255,248,240,.8)" strokeWidth="0.4" />
          <polyline points="50,50 70,62 88,88" fill="none" stroke="rgba(255,248,240,.8)" strokeWidth="0.45" />
          <polyline points="50,50 40,38 20,34" fill="none" stroke="rgba(255,248,240,.55)" strokeWidth="0.3" />
          <polyline points="50,50 58,40 82,42" fill="none" stroke="rgba(255,248,240,.55)" strokeWidth="0.3" />
          <polyline points="50,50 22,52 8,60" fill="none" stroke="rgba(255,248,240,.6)" strokeWidth="0.3" />
          <polyline points="50,50 76,52 92,46" fill="none" stroke="rgba(255,248,240,.6)" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="8" fill="none" stroke="rgba(255,248,240,.6)" strokeWidth="0.4" />
        </svg>
      </div>

      <div className={`ve-search ${showSearch && !results ? "show" : ""}`}>
        <div className="ve-search-bar">What job do you want?</div>
        <button type="button" className="ve-scan" onClick={scan}>
          ✨ Scan with Sari
        </button>
      </div>

      <div className={`ve-results ${results ? "show" : ""}`}>
        <div className="ve-results-title">Here are your matched jobs 🎉</div>
        {RESULT_JOBS.map((job, i) => (
          <div
            key={job.title}
            className={`ve-result ${picked === i ? "picked" : ""}`}
            style={{ animationDelay: i * 0.13 + "s" }}
            onClick={(e) => pickJob(e, i)}
          >
            <div>
              <div style={{ fontWeight: 800 }}>{job.title}</div>
              <div style={{ fontSize: 12, color: "#6b6b8a" }}>{job.company}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="ve-match">{job.match}% Match</span>
              <span className="ve-apply">Apply</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`ve-success ${picked !== null ? "show" : ""}`}>
        <div className="ve-check">
          <svg viewBox="0 0 24 24">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, color: UBE, textShadow: "0 2px 8px rgba(255,255,255,.4)" }}>
          Job matched!
        </div>
      </div>

      <div className={`ve-cta ${cta ? "show" : ""}`}>
        <div className="ve-cta-panel">
          <div className="ve-logo">🍠</div>
          <div className="ve-wordmark">Sari</div>
          <p className="ve-tag">All your jobs. One click away. With Sari.</p>
          <div className="ve-mochi-wrap">
            <PixelMochi />
            <span className="ve-mochi-caption">mochi approves this 🐾</span>
          </div>
          <a href="/auth/signup" className="ve-cta-btn">
            Try Sari Free →
          </a>
          <a href="/" className="ve-learn">
            Learn more
          </a>
        </div>
      </div>
    </div>
  );
}