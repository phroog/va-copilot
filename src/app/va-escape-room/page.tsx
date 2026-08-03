"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ================================================================== */
/*  VA Escape Room 2.0 — multi-tab Chrome stress simulator            */
/*  Phases: 0 Catch the Job · 1 Scam Shoot · 2 Invoice Panic          */
/*          3 The Breaking Point · 4 Sari to the Rescue               */
/*  Chrome frame + tabs + Stats Popup are HTML/CSS over the canvas.   */
/* ================================================================== */

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

const SCAM_ICONS = [
  { icon: "👻", label: "Ghost client", color: "#B39DDB" },
  { icon: "💸", label: "Low budget", color: "#A8D8B9" },
  { icon: "📈", label: "Scope creep", color: "#FFDAB9" },
  { icon: "🤷", label: "Unclear brief", color: "#C5A3E0" },
];

const SCAM_RINGS = [
  { r: 1.0, points: 10 },
  { r: 0.75, points: 20 },
  { r: 0.5, points: 50 },
  { r: 0.25, points: 100 },
];

const SCAM_COLORS = ["#FFF8F0", "#B39DDB", "#FFDAB9", "#6C4E8F"];

const INVOICE_CLIENTS = [
  "Bright & Bold Agency",
  "Pixel Peaks Studio",
  "Swift Freight Co.",
  "Blossom Beauty",
  "Urban Nest Realty",
  "Nova Tech Labs",
  "Coastal Cafe Group",
  "Drift Design Co.",
];

const RESULT_JOBS = [
  { title: "E-commerce VA", company: "Modern Retail Studio", match: 94 },
  { title: "Social Media Manager", company: "Blossom Beauty", match: 89 },
  { title: "Admin Assistant", company: "Swift Freight", match: 86 },
  { title: "Executive Support", company: "Peak Founders", match: 82 },
];

const FLOATING_COLORS = [UBE, LAVENDER, PEACH, PINK, GREEN, "#F9A8D4", "#8E8FD8"];
const CONFETTI_COLORS = [GREEN, CREAM, PEACH, UBE, LAVENDER, PINK, "#FFD700"];

/* --------------------------- pixel cat ----------------------------- */
function PixelMochi() {
  return (
    <svg viewBox="0 0 64 64" width="76" height="76" className="ve-mochi" aria-hidden="true">
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

/* --------------------- small sfx (muted by default) ---------------- */
type Sfx = ReturnType<typeof createSfx>;
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
    pling() {
      tone(1400, 0, 0.06, "triangle", 0.09, 900);
    },
    thud() {
      noise(0, 0.16, 0.25, 200);
      tone(140, 0, 0.16, "sine", 0.2, 60);
    },
    ding() {
      tone(880, 0, 0.14, "sine", 0.14, 660);
    },
    whoosh() {
      noise(0, 0.22, 0.16, 1600);
      tone(500, 0, 0.2, "sine", 0.06, 200);
    },
    shatter() {
      noise(0, 0.5, 0.4, 7000);
      noise(0.05, 0.45, 0.3, 3200);
      for (let i = 0; i < 5; i++) tone(2200 - i * 300, i * 0.05, 0.1, "square", 0.08, 400);
    },
    sweep() {
      tone(200, 0, 0.9, "sine", 0.1, 950);
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

/* ================================================================== */
export default function VaEscapeRoom() {
  const router = useRouter();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scamCanvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<0 | 1 | 2 | 3 | 4>(0);

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

  /* ------------------------------ state ----------------------------- */
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [jobs, setJobs] = useState<{ id: number; title: string; left: number; dur: number }[]>([]);
  const [invoices, setInvoices] = useState<{ id: number; client: string; amount: number; side: "L" | "R"; top: number }[]>([]);
  const [scamWarning, setScamWarning] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [blackout, setBlackout] = useState(false);
  const [sari, setSari] = useState(false);
  const [results, setResults] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [cta, setCta] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const [tabs, setTabs] = useState([
    { id: 1, label: "Upwork – Job Search", url: "upwork.com/jobs/search", badge: 0 },
  ]);
  const [activeTab, setActiveTab] = useState(0);

  const [stats, setStats] = useState({
    jobs: 0,
    earnings: 0,
    todos: 3,
    deadlines: 1,
    notif: 0,
    stress: 20,
  });

  /* ------------------------- refs for counters ---------------------- */
  const caughtRef = useRef(0);
  const scamArrowsRef = useRef(0);
  const scamDoneRef = useRef(false);
  const dismissedRef = useRef(0);

  /* ------------------------ fx / canvas helpers --------------------- */
  function burstAt(x: number, y: number, n: number, palette: string[], s = 6) {
    const fx = fxRef.current;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 5;
      fx.burst.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1.5,
        size: 2 + Math.random() * s,
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
  function floater(x: number, y: number, text: string, color: string) {
    fxRef.current.flo.push({ x, y, text, life: 0, ttl: 60, color });
  }

  /* --------------------------- phase machine ------------------------ */
  const goNext = useCallback(() => {
    const p = phaseRef.current;
    if (p === 0) {
      setStats({ jobs: 0, earnings: 0, todos: 12, deadlines: 4, notif: 5, stress: 45 });
      setTabs((t) => [...t, { id: 2, label: "Client Verification", url: "verify-clients.io/check", badge: 0 }]);
      setActiveTab(1);
      phaseRef.current = 1;
      setPhase(1);
    } else if (p === 1) {
      setStats({ jobs: 0, earnings: 0, todos: 25, deadlines: 7, notif: 15, stress: 70 });
      setTabs((t) => [...t, { id: 3, label: "Invoices – Overdue", url: "invoices.sari.io/overdue", badge: 0 }]);
      setActiveTab(2);
      phaseRef.current = 2;
      setPhase(2);
    } else if (p === 2) {
      setStats({ jobs: 0, earnings: 0, todos: 48, deadlines: 12, notif: 30, stress: 95 });
      phaseRef.current = 3;
      setPhase(3);
    } else if (p === 3) {
      setStats({ jobs: 5, earnings: 1250, todos: 0, deadlines: 0, notif: 0, stress: 10 });
      setTabs([{ id: 9, label: "Sari Dashboard", url: "app.sari.ph/dashboard", badge: 0 }]);
      setActiveTab(0);
      phaseRef.current = 4;
      setPhase(4);
    }
  }, []);

  /* --------------------- main canvas init + loop -------------------- */
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d")!;

    const fx = fxRef.current;
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

    let last = performance.now();
    let raf = 0;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(50, now - last);
      last = now;

      /* base background by phase */
      const p = phaseRef.current;
      if (p === 4) ctx.fillStyle = CREAM;
      else if (p === 3) ctx.fillStyle = "#000";
      else ctx.fillStyle = DARK;
      ctx.fillRect(0, 0, W, H);

      /* purple wave washing away the broken browser */
      if (fx.wave.active) {
        fx.wave.t += dt / 1500;
        const edge = H - fx.wave.t * (H + 160);
        ctx.fillStyle = CREAM;
        ctx.fillRect(0, 0, W, Math.max(0, edge));
        const g = ctx.createLinearGradient(0, Math.max(0, edge), 0, H);
        g.addColorStop(0, UBE);
        g.addColorStop(0.4, "#4a3560");
        g.addColorStop(1, DARK);
        ctx.fillStyle = g;
        ctx.fillRect(0, Math.max(0, edge), W, H - Math.max(0, edge));
        if (fx.wave.t >= 1) {
          fx.wave.active = false;
          ctx.fillStyle = CREAM;
          ctx.fillRect(0, 0, W, H);
        }
      }

      /* burst particles */
      for (let i = fx.burst.length - 1; i >= 0; i--) {
        const p2 = fx.burst[i];
        p2.life++;
        if (p2.life >= p2.ttl) {
          fx.burst.splice(i, 1);
          continue;
        }
        p2.vy += 0.18;
        p2.x += p2.vx;
        p2.y += p2.vy;
        p2.rot += p2.vr;
        ctx.save();
        ctx.translate(p2.x, p2.y);
        ctx.rotate(p2.rot);
        ctx.globalAlpha = 1 - p2.life / p2.ttl;
        ctx.fillStyle = p2.color;
        ctx.fillRect(-p2.size / 2, -p2.size / 2, p2.size, p2.size);
        ctx.restore();
      }

      /* confetti */
      for (let i = fx.confetti.length - 1; i >= 0; i--) {
        const c = fx.confetti[i];
        c.life++;
        if (c.life >= c.ttl) {
          fx.confetti.splice(i, 1);
          continue;
        }
        c.vy += 0.12;
        c.x += c.vx * 0.98;
        c.y += c.vy;
        c.rot += c.vr;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.globalAlpha = 1 - c.life / c.ttl;
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.7);
        ctx.restore();
      }

      /* floaters */
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
        ctx.font = "800 18px Nunito, sans-serif";
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
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* -------------------- per-phase game controllers ------------------- */
  /* Phase 0 — Catch the Job */
  useEffect(() => {
    if (phase !== 0) return;
    caughtRef.current = 0;
    setJobs([]);

    let id = 0;
    let spawn: ReturnType<typeof setTimeout> | null = null;
    const spawnJob = () => {
      id++;
      const jid = id;
      const dur = 3400 + Math.random() * 2200;
      const left = 4 + Math.random() * 84;
      const title = JOKE_JOBS[Math.floor(Math.random() * JOKE_JOBS.length)];
      setJobs((j) => [...j, { id: jid, title, left, dur }]);
      const miss = setTimeout(() => setJobs((j) => j.filter((c) => c.id !== jid)), dur);
      spawn = setTimeout(spawnJob, 620);
    };
    spawnJob();

    const cap = setTimeout(goNext, 8000);

    return () => {
      if (spawn) clearTimeout(spawn);
      clearTimeout(cap);
      setJobs([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* Phase 1 — Scam Shoot */
  useEffect(() => {
    if (phase !== 1) return;
    scamArrowsRef.current = 0;
    scamDoneRef.current = false;
    setScamWarning(false);

    const cv = scamCanvasRef.current!;
    if (!cv) return;
    const c2 = cv.getContext("2d")!;
    if (!c2) return;

    const size = 320;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * DPR;
    cv.height = size * DPR;
    c2.setTransform(DPR, 0, 0, DPR, 0, 0);

    const R = size * 0.46;
    const EMOJI_R = Math.max(18, R * 0.14);
    const cx = size / 2;
    const cy = size / 2;

    const emojis: { x: number; y: number; icon: string; color: string; radius: number }[] = [];
    {
      let placed = 0;
      let tries = 0;
      while (placed < 4 && tries < 400) {
        tries++;
        const ang = Math.random() * Math.PI * 2;
        const rad = R * (0.24 + Math.random() * 0.68);
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;
        let ok = true;
        for (const e of emojis) {
          if (Math.hypot(x - e.x, y - e.y) < EMOJI_R * 2.2) {
            ok = false;
            break;
          }
        }
        if (ok) {
          const k = SCAM_ICONS[Math.floor(Math.random() * SCAM_ICONS.length)];
          emojis.push({ x, y, icon: k.icon, color: k.color, radius: EMOJI_R });
          placed++;
        }
      }
    }

    const g = {
      flying: null as null | { fromX: number; fromY: number; toX: number; toY: number; mx: number; my: number; start: number; dur: number },
      parts: [] as any[],
      text: [] as any[],
      fired: 0,
    };

    function draw() {
      c2.clearRect(0, 0, size, size);
      for (let i = 0; i < SCAM_RINGS.length; i++) {
        c2.beginPath();
        c2.arc(cx, cy, R * SCAM_RINGS[i].r, 0, Math.PI * 2);
        c2.fillStyle = SCAM_COLORS[i];
        c2.fill();
        c2.lineWidth = 2;
        c2.strokeStyle = UBE;
        c2.stroke();
      }
      for (const em of emojis) {
        c2.beginPath();
        c2.arc(em.x, em.y, EMOJI_R + 3, 0, Math.PI * 2);
        c2.fillStyle = "rgba(255,255,255,0.85)";
        c2.fill();
        c2.lineWidth = 2;
        c2.strokeStyle = "rgba(108,78,143,0.25)";
        c2.stroke();
        c2.font = EMOJI_R * 1.15 + "px serif";
        c2.textAlign = "center";
        c2.textBaseline = "middle";
        c2.fillText(em.icon, em.x, em.y + 1);
      }
      /* flying arrow */
      if (g.flying) {
        const t = Math.min(1, (performance.now() - g.flying.start) / g.flying.dur);
        const t1 = 1 - t;
        const f = g.flying;
        const x = t1 * t1 * f.fromX + 2 * t1 * t * f.mx + t * t * f.toX;
        const y = t1 * t1 * f.fromY + 2 * t1 * t * f.my + t * t * f.toY;
        const t2 = Math.min(1, t + 0.02);
        const q1 = 1 - t2;
        const x2 = q1 * q1 * f.fromX + 2 * q1 * t2 * f.mx + t2 * t2 * f.toX;
        const y2 = q1 * q1 * f.fromY + 2 * q1 * t2 * f.my + t2 * t2 * f.toY;
        const ang = Math.atan2(y2 - y, x2 - x);
        c2.save();
        c2.translate(x, y);
        c2.rotate(ang);
        c2.strokeStyle = "#8B5E3C";
        c2.lineWidth = 3;
        c2.lineCap = "round";
        c2.beginPath();
        c2.moveTo(-10, 0);
        c2.lineTo(8, 0);
        c2.stroke();
        c2.fillStyle = UBE;
        c2.beginPath();
        c2.moveTo(8, 0);
        c2.lineTo(2, -4);
        c2.lineTo(2, 4);
        c2.closePath();
        c2.fill();
        c2.restore();
        if (t >= 1) resolve(f);
      }
      /* particles */
      for (let i = g.parts.length - 1; i >= 0; i--) {
        const p = g.parts[i];
        p.life++;
        if (p.life >= p.ttl) {
          g.parts.splice(i, 1);
          continue;
        }
        p.vy += 0.15;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        c2.save();
        c2.translate(p.x, p.y);
        c2.rotate(p.rot);
        c2.globalAlpha = 1 - p.life / p.ttl;
        c2.fillStyle = p.color;
        c2.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        c2.restore();
      }
      /* floating texts */
      for (let i = g.text.length - 1; i >= 0; i--) {
        const tx = g.text[i];
        tx.life++;
        if (tx.life >= tx.ttl) {
          g.text.splice(i, 1);
          continue;
        }
        tx.y -= 1;
        c2.globalAlpha = 1 - tx.life / tx.ttl;
        c2.font = "800 14px Nunito, sans-serif";
        c2.textAlign = "center";
        c2.fillStyle = tx.color;
        c2.fillText(tx.text, tx.x, tx.y);
        c2.globalAlpha = 1;
      }
      if (g.flying) {
        rafId = requestAnimationFrame(loop);
      } else if (g.parts.length || g.text.length) {
        rafId = requestAnimationFrame(loop);
      }
    }

    function resolve(f: NonNullable<typeof g.flying>) {
      g.flying = null;
      const d = Math.hypot(f.toX - cx, f.toY - cy) / R;
      let points = 10;
      if (d < 0.75) points = 20;
      if (d < 0.5) points = 50;
      if (d < 0.25) points = 100;
      let hit: (typeof emojis)[number] | null = null;
      for (const em of emojis) {
        if (Math.hypot(f.toX - em.x, f.toY - em.y) <= em.radius + 4) hit = em;
      }
      g.fired++;
      scamArrowsRef.current = g.fired;
      if (hit) {
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 1.5 + Math.random() * 4;
          g.parts.push({ x: hit.x, y: hit.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, size: 2 + Math.random() * 5, life: 0, ttl: 34 + Math.random() * 22, color: hit.color, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4 });
        }
      }
      const score = 80 + Math.floor(Math.random() * 16);
      g.text.push({ x: f.toX, y: f.toY - 8, text: "Scam score: " + score + "% risky", life: 0, ttl: 58, color: hit ? RED : UBE });
      sfxRef.current?.pling();
      const r = cv.getBoundingClientRect();
      burstAt(r.left + (f.toX / size) * r.width, r.top + (f.toY / size) * r.height, hit ? 22 : 8, FLOATING_COLORS);

      if (g.fired >= 4) {
        scamDoneRef.current = true;
        setScamWarning(true);
        sfxRef.current?.thud();
        setTimeout(goNext, 2000);
      }
    }

    function shoot(e: PointerEvent) {
      if (scamDoneRef.current) return;
      if (g.flying) return;
      const r = cv.getBoundingClientRect();
      let x = ((e.clientX - r.left) / r.width) * size;
      let y = ((e.clientY - r.top) / r.height) * size;
      const dx = x - cx;
      const dy = y - cy;
      const dd = Math.hypot(dx, dy);
      if (dd > R) {
        x = cx + (dx / dd) * R;
        y = cy + (dy / dd) * R;
      }
      const mx = (cx + x) / 2;
      const my = (size - 6 + y) / 2 - Math.min(R * 0.5, dd * 0.45) - 6;
      g.flying = { fromX: cx, fromY: size - 6, toX: x, toY: y, mx, my, start: performance.now(), dur: 430 };
      rafId = requestAnimationFrame(loop);
    }

    let rafId = 0;
    function loop() {
      draw();
    }

    cv.addEventListener("pointerdown", shoot);
    return () => {
      cancelAnimationFrame(rafId);
      cv.removeEventListener("pointerdown", shoot);
      setScamWarning(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* Phase 2 — Invoice Panic */
  useEffect(() => {
    if (phase !== 2) return;
    dismissedRef.current = 0;
    setInvoices([]);

    let invId = 0;
    let delay = 620;
    let chain: ReturnType<typeof setTimeout> | null = null;
    const spawn = () => {
      invId++;
      const amount = 180 + Math.floor(Math.random() * 520);
      setInvoices((l) => [
        ...l,
        {
          id: invId,
          client: INVOICE_CLIENTS[Math.floor(Math.random() * INVOICE_CLIENTS.length)],
          amount,
          side: Math.random() > 0.5 ? "L" : "R",
          top: 8 + Math.random() * 46,
        },
      ]);
      delay = Math.max(160, delay * 0.85);
      chain = setTimeout(spawn, delay);
    };
    spawn();

    const ding = setInterval(() => {
      sfxRef.current?.ding();
      setStats((s) => ({ ...s, notif: Math.min(29, s.notif + 1) }));
    }, 2000);

    const cap = setTimeout(goNext, 11000);

    return () => {
      if (chain) clearTimeout(chain);
      clearInterval(ding);
      clearTimeout(cap);
      setInvoices([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* Phase 3 — Breaking point */
  useEffect(() => {
    if (phase !== 3) return;
    setShaking(true);
    sfxRef.current?.shatter();
    const t1 = setTimeout(() => {
      setShaking(false);
      setBlackout(true);
    }, 1200);
    const t2 = setTimeout(() => {
      const wave = fxRef.current.wave;
      wave.active = true;
      wave.t = 0;
      setBlackout(false);
      setSari(true);
      sfxRef.current?.sweep();
      goNext();
    }, 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setShaking(false);
      setBlackout(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

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

  /* ------------------------------ handlers --------------------------- */
  const catchCard = (e: React.MouseEvent, el: HTMLElement) => {
    if (phaseRef.current !== 0) return;
    sfxRef.current?.pling();
    sfxRef.current?.thud();
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    burstAt(x, y, 26, FLOATING_COLORS);
    floater(x, y, "Nope!", RED);
    setJobs((j) => j.filter((c) => c.id !== Number(el.dataset.id)));
    caughtRef.current++;
    if (caughtRef.current >= 5) goNext();
  };

  const dismissInvoice = (id: number, amount: number, x: number, y: number) => {
    if (phaseRef.current !== 2) return;
    sfxRef.current?.whoosh();
    setInvoices((l) => l.filter((v) => v.id !== id));
    floater(x, y, "-$" + amount + " lost", RED);
    dismissedRef.current++;
    if (dismissedRef.current >= 6) goNext();
  };

  const scan = () => {
    sfxRef.current?.chime();
    setResults(true);
  };

  const pickJob = (e: React.MouseEvent, idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    sfxRef.current?.win();
    const el = (e.target as HTMLElement).closest(".ve-sresult");
    if (el) {
      const r = el.getBoundingClientRect();
      confettiAt(r.left + r.width / 2, r.top + 30);
    }
    setTimeout(() => setCta(true), 1600);
  };

  const toggleSound = () => {
    setSoundOn((s) => {
      if (s) sfxRef.current?.mute();
      else sfxRef.current?.unmute();
      return !s;
    });
  };

  const statsRows = [
    { emoji: "💼", label: "Jobs found", value: stats.jobs.toString() },
    { emoji: "💰", label: "Earnings", value: "$" + stats.earnings.toLocaleString() },
    { emoji: "📋", label: "To-dos", value: stats.todos.toString() },
    { emoji: "⏰", label: "Deadlines", value: stats.deadlines.toString() },
    { emoji: "🔔", label: "Notifications", value: stats.notif.toString() },
  ];

  const InvoiceCard = ({ c }: { c: { id: number; client: string; amount: number; side: "L" | "R"; top: number } }) => {
    const drag = useRef({ on: false, sx: 0, sy: 0, dx: 0, dy: 0 });
    const elRef = useRef<HTMLDivElement>(null);

    const down = (e: React.PointerEvent) => {
      drag.current = { on: true, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0 };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };
    const move = (e: React.PointerEvent) => {
      if (!drag.current.on) return;
      drag.current.dx = e.clientX - drag.current.sx;
      drag.current.dy = e.clientY - drag.current.sy;
      const el = elRef.current;
      if (el) el.style.transform = "translate(" + drag.current.dx + "px," + drag.current.dy + "px) rotate(" + drag.current.dx * 0.06 + "deg)";
    };
    const up = (e: React.PointerEvent) => {
      if (!drag.current.on) return;
      drag.current.on = false;
      const r = elRef.current?.getBoundingClientRect();
      if (r && (Math.abs(drag.current.dx) > 120 || Math.abs(drag.current.dy) > 150)) {
        dismissInvoice(c.id, c.amount, r.left + r.width / 2, r.top);
        return;
      }
      const el = elRef.current;
      if (el) el.style.transform = "translate(0,0)";
    };

    return (
      <div
        ref={elRef}
        data-id={c.id}
        className={"ve-invoice side-" + c.side}
        style={{ top: c.top + "%" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div className="ve-inv-head">
          <span className="ve-inv-amt">${c.amount.toLocaleString()}</span>
          <span className="ve-inv-stamp">OVERDUE</span>
        </div>
        <div className="ve-inv-client">{c.client}</div>
        <div className="ve-inv-sub">Invoice #00{1000 + c.id}</div>
        <div className="ve-inv-hint">swipe away ⇤</div>
      </div>
    );
  };

  /* ================================================================== */
  return (
    <div className="ve-root" ref={wrapRef}>
      <style>{`
        .ve-root {
          position: fixed; inset: 0; overflow: hidden; background: ${DARK}; color: ${CREAM};
          font-family: 'Nunito', system-ui, sans-serif;
          -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        * { box-sizing: border-box; }
        .ve-canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }

        /* ---------------- chrome browser frame ---------------- */
        .ve-browser {
          position: absolute; inset: 0; z-index: 5;
          display: flex; flex-direction: column;
          transition: opacity .4s, transform .5s;
        }
        .ve-browser.sari { opacity: 0; transform: scale(.94); pointer-events: none; }
        .ve-browser.shake { animation: veShake .55s ease-in-out infinite; }
        @keyframes veShake { 0%,100% { transform: translate(0,0);} 20% { transform: translate(-9px,3px);} 40% { transform: translate(8px,-4px);} 60% { transform: translate(-7px,-3px);} 80% { transform: translate(6px,4px);} }

        .ve-titlebar { background: #221f35; display: flex; align-items: flex-end; height: 46px; padding: 7px 8px 0; }
        .ve-tabs { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; flex: 1; align-items: flex-end; }
        .ve-tabs::-webkit-scrollbar { display: none; }
        .ve-tab {
          position: relative; flex: 0 0 auto; max-width: 150px; min-width: 74px; height: 34px;
          background: #191631; color: rgba(232,230,240,.6); border-radius: 9px 9px 0 0; cursor: default;
          display: flex; align-items: center; gap: 6px; padding: 0 10px; font-size: 12px; font-weight: 700;
          white-space: nowrap; overflow: hidden; border: 1px solid rgba(179,157,219,.12); border-bottom: none;
          transition: background .15s, color .15s;
        }
        .ve-tab .ve-dot { width: 7px; height: 7px; border-radius: 999px; flex: 0 0 auto; }
        .ve-tab.active { background: #2a2742; color: #fff; }
        .ve-tab-label { overflow: hidden; text-overflow: ellipsis; }
        .ve-tab .ve-close { margin-left: auto; font-size: 10px; color: rgba(232,230,240,.5); padding: 0 2px; }
        .ve-tab .ve-badge {
          position: absolute; top: -5px; right: -4px; background: ${RED}; color: #fff; font-size: 9px; font-weight: 900;
          min-width: 15px; height: 15px; border-radius: 999px; display: flex; align-items: center; justify-content: center;
          padding: 0 3px; animation: veBadgePop .3s ease;
        }
        @keyframes veBadgePop { 0% { transform: scale(.2); } 100% { transform: scale(1); } }
        .ve-newtab { flex: 0 0 auto; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: rgba(232,230,240,.5); font-size: 16px; }
        .ve-winctrl { display: flex; gap: 4px; padding: 4px 8px; align-items: center; }
        .ve-wctrl { width: 11px; height: 11px; border-radius: 999px; }
        .ve-wctrl.r { background: ${RED}; } .ve-wctrl.y { background: "#E8B931"; } .ve-wctrl.g { background: "#38C172"; }

        .ve-addr { display: flex; align-items: center; gap: 8px; background: #161430; padding: 7px 12px; }
        .ve-addr-pill {
          flex: 1; max-width: 460px; margin: 0 auto; background: #241f3d; border-radius: 999px; padding: 6px 14px;
          display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(232,230,240,.85);
        }
        .ve-addr-pill .ve-lock { font-size: 11px; }
        .ve-addr-url { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ve-menu { color: rgba(232,230,240,.7); font-weight: 900; padding: 0 4px; }

        .ve-content { flex: 1; position: relative; overflow: hidden; background: #1b1830; }

        /* phase tag */
        .ve-phasetag { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 3; background: rgba(26,26,46,.8); border: 1px solid rgba(255,248,240,.2); padding: 5px 14px; border-radius: 999px; font-size: 11px; font-weight: 800; }

        /* ---- phase 0: falling job cards ---- */
        .ve-cards { position: absolute; inset: 0; overflow: hidden; z-index: 2; padding-top: 40px; }
        .ve-card {
          position: absolute; top: 0; left: 0; margin-left: var(--left); width: 168px; padding: 13px 15px;
          background: ${CREAM}; color: ${UBE}; border-radius: 16px; box-shadow: 0 8px 22px rgba(0,0,0,.4), 0 0 0 2px rgba(179,157,219,.5);
          font-weight: 800; font-size: 13px; text-align: center; cursor: pointer; animation: veFall var(--dur) linear forwards;
        }
        .ve-card span { display: inline-block; padding: 2px 9px; border-radius: 999px; background: ${LAVENDER}; color: #fff; font-size: 9px; font-weight: 800; margin-bottom: 5px; }
        .ve-card b { display: block; }
        @keyframes veFall { 0% { transform: translateY(-140px) rotate(-2deg); opacity: 0; } 8% { opacity: 1; } 100% { transform: translateY(105vh) rotate(3deg); opacity: .95; } }
        .ve-goal { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); z-index: 3; background: rgba(26,26,46,.85); border: 1px solid rgba(179,157,219,.4); padding: 7px 16px; border-radius: 999px; font-size: 12px; font-weight: 800; }

        /* ---- phase 1: scam target ---- */
        .ve-scam { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; z-index: 2; }
        .ve-scam-hint { font-size: 13px; font-weight: 800; color: rgba(232,230,240,.75); }
        .ve-scam canvas { max-width: 82vw; border-radius: 22px; box-shadow: 0 16px 44px rgba(0,0,0,.5); background: ${CREAM}; touch-action: manipulation; cursor: crosshair; }
        .ve-warn {
          position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 4;
          background: #3a1518; border: 2px solid ${RED}; color: #ffd6d6; border-radius: 14px; padding: 10px 16px;
          font-size: 13px; font-weight: 800; text-align: center; animation: veFadeIn .3s ease-out; max-width: 86vw;
        }

        /* ---- phase 2: invoice panic ---- */
        .ve-invoices { position: absolute; inset: 0; overflow: hidden; z-index: 2; }
        .ve-invoice {
          position: absolute; width: 210px; background: ${CREAM}; color: #2a2a44; border-radius: 14px; padding: 13px 14px;
          box-shadow: 0 10px 26px rgba(0,0,0,.45); cursor: grab; touch-action: none; z-index: 2;
          animation: veInvIn .35s ease-out; will-change: transform;
        }
        .ve-invoice.side-L { animation-name: veInvInL; }
        .ve-invoice.side-R { animation-name: veInvInR; }
        @keyframes veInvInL { 0% { transform: translateX(-115vw) rotate(-8deg); } 100% { transform: translateX(0); } }
        @keyframes veInvInR { 0% { transform: translateX(115vw) rotate(8deg); } 100% { transform: translateX(0); } }
        .ve-inv-head { display: flex; align-items: center; justify-content: space-between; }
        .ve-inv-amt { font-weight: 900; font-size: 17px; color: ${UBE}; }
        .ve-inv-stamp { border: 2px solid ${RED}; color: ${RED}; font-weight: 900; font-size: 10px; padding: 2px 6px; border-radius: 4px; transform: rotate(-6deg); }
        .ve-inv-client { font-weight: 800; font-size: 12px; margin-top: 6px; }
        .ve-inv-sub { font-size: 10px; color: #8b8baa; }
        .ve-inv-hint { margin-top: 8px; font-size: 10px; font-weight: 800; color: #8b8baa; }

        /* ---- breaking ---- */
        .ve-overload {
          position: absolute; inset: 0; z-index: 8; display: flex; align-items: center; justify-content: center;
          background: rgba(225,85,84,.2); color: #ffd6d6; font-size: 30px; font-weight: 900; letter-spacing: 2px;
          animation: veOverloadPulse .6s ease-in-out infinite; pointer-events: none;
        }
        @keyframes veOverloadPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .ve-blackout { position: absolute; inset: 0; z-index: 40; background: #000; opacity: 0; pointer-events: none; transition: opacity .25s; }
        .ve-blackout.show { opacity: 1; }

        /* ---- phase 4: Sari window ---- */
        .ve-sari {
          position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column; opacity: 0; pointer-events: none;
          transition: opacity .45s;
        }
        .ve-sari.show { opacity: 1; pointer-events: auto; }
        .ve-sari-bar { display: flex; align-items: center; gap: 10px; background: #fff; color: #2a2a44; padding: 10px 14px; }
        .ve-sari-dots { display: flex; gap: 5px; }
        .ve-sari-dots span { width: 10px; height: 10px; border-radius: 999px; }
        .ve-sari-url { flex: 1; background: #f0eef7; border-radius: 999px; padding: 5px 14px; font-size: 12px; }
        .ve-sari-body {
          flex: 1; background: linear-gradient(160deg, ${CREAM}, #efe5fb); overflow-y: auto; display: flex;
          flex-direction: column; align-items: center; padding: 18px 16px 30px; gap: 14px;
        }
        .ve-sari-logo { display: flex; align-items: center; gap: 8px; }
        .ve-sari-logo .ve-logo { font-size: 34px; }
        .ve-sari-logo .ve-wordmark { font-size: 26px; font-weight: 900; background: linear-gradient(90deg, ${UBE}, ${PINK}); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .ve-sari-mini { display: flex; gap: 8px; width: 100%; max-width: 420px; }
        .ve-mini {
          flex: 1; background: #fff; border-radius: 14px; padding: 10px; text-align: center; box-shadow: 0 6px 18px rgba(108,78,143,.15);
        }
        .ve-mini .ve-m-v { font-weight: 900; font-size: 18px; color: ${UBE}; }
        .ve-mini .ve-m-l { font-size: 10px; color: #8b8baa; font-weight: 700; }
        .ve-scan {
          border: none; cursor: pointer; font-family: inherit; font-weight: 900; font-size: 19px; color: #fff;
          background: linear-gradient(90deg, ${UBE}, ${PINK}); padding: 16px 42px; border-radius: 999px;
          box-shadow: 0 12px 32px rgba(108,78,143,.55); animation: vePulse 1.6s ease-in-out infinite;
        }
        .ve-scan:hover { transform: scale(1.05); }
        @keyframes vePulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }

        .ve-sresults { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 420px; }
        .ve-sresult {
          background: #fff; color: #2a2a44; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer;
          box-shadow: 0 8px 22px rgba(108,78,143,.2); opacity: 0; transform: translateY(22px);
          animation: veUpIn .45s ease-out forwards;
        }
        .ve-sresult.picked { background: ${GREEN}; color: #fff; }
        .ve-match { font-weight: 900; color: ${GREEN}; }
        .ve-sresult.picked .ve-match { color: #fff; }
        .ve-apply { background: ${UBE}; color: #fff; font-weight: 800; font-size: 12px; padding: 7px 14px; border-radius: 999px; white-space: nowrap; }
        .ve-sresult.picked .ve-apply { background: #fff; color: ${GREEN}; }
        @keyframes veUpIn { to { opacity: 1; transform: translateY(0); } }

        .ve-success { position: absolute; inset: 0; z-index: 9; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 12px; pointer-events: none; }
        .ve-success.show { display: flex; }
        .ve-check { width: 88px; height: 88px; border-radius: 999px; background: ${GREEN}; display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 40px rgba(76,175,80,.5); animation: veBounce .6s ease; }
        .ve-check svg { width: 52px; height: 52px; stroke: #fff; stroke-width: 6; fill: none; stroke-linecap: round; stroke-linejoin: round; }
        @keyframes veBounce { 0% { transform: scale(.2); } 55% { transform: scale(1.15); } 100% { transform: scale(1); } }

        /* ---- stats popup ---- */
        .ve-stats { position: absolute; right: 10px; bottom: 12px; z-index: 50; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .ve-stats-toggle {
          background: rgba(26,26,46,.85); border: 1px solid rgba(255,248,240,.25); color: ${CREAM};
          border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; gap: 7px; backdrop-filter: blur(4px); box-shadow: 0 6px 20px rgba(0,0,0,.4);
        }
        .ve-stats-toggle .ve-stress-dot { width: 9px; height: 9px; border-radius: 999px; }
        .ve-stats-panel {
          background: rgba(26,26,46,.92); border: 1px solid rgba(255,248,240,.22); border-radius: 16px;
          padding: 12px 14px; min-width: 190px; display: flex; flex-direction: column; gap: 7px;
          box-shadow: 0 12px 34px rgba(0,0,0,.5); animation: veFadeIn .25s ease-out; backdrop-filter: blur(6px);
        }
        .ve-stat-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; font-weight: 700; }
        .ve-stat-row .ve-sv { color: #fff; font-weight: 900; }
        .ve-stressbar { height: 8px; border-radius: 999px; background: rgba(255,255,255,.15); overflow: hidden; margin-top: 3px; }
        .ve-stressbar i { display: block; height: 100%; border-radius: 999px; transition: width .4s, background .3s; }

        /* ---- CTA ---- */
        .ve-cta { position: absolute; inset: 0; z-index: 60; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 26px; text-align: center; background: rgba(26,26,46,.6); backdrop-filter: blur(6px); }
        .ve-cta.show { display: flex; animation: veFadeIn .4s ease-out; }
        .ve-cta-panel { background: rgba(255,248,240,.14); border: 1px solid rgba(255,248,240,.22); border-radius: 26px; padding: 30px 26px; width: min(92vw, 400px); display: flex; flex-direction: column; align-items: center; gap: 13px; box-shadow: 0 24px 70px rgba(0,0,0,.5); }
        .ve-cta .ve-logo { font-size: 44px; line-height: 1; filter: drop-shadow(0 6px 16px rgba(108,78,143,.6)); }
        .ve-cta .ve-wordmark { font-size: 30px; font-weight: 900; background: linear-gradient(90deg, ${CREAM}, ${PEACH}); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .ve-cta .ve-tag { font-size: 18px; font-weight: 800; color: ${CREAM}; line-height: 1.5; margin: 0; max-width: 300px; }
        .ve-mochi-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .ve-mochi-caption { font-size: 11px; font-weight: 800; color: rgba(255,248,240,.75); }
        .ve-cta-btn { border: none; cursor: pointer; font-family: inherit; font-weight: 900; font-size: 18px; color: ${UBE}; background: linear-gradient(90deg, ${CREAM}, ${PEACH}); padding: 16px 44px; border-radius: 999px; box-shadow: 0 12px 36px rgba(0,0,0,.4); text-decoration: none; transition: transform .15s ease; }
        .ve-cta-btn:hover { transform: scale(1.06); }
        .ve-learn { color: rgba(255,248,240,.8); font-size: 13px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; background: none; border: none; font-family: inherit; cursor: pointer; }

        /* misc */
        .ve-corner { position: absolute; top: 10px; right: 10px; z-index: 70; display: flex; gap: 8px; }
        .ve-cbtn { background: rgba(26,26,46,.45); color: rgba(255,248,240,.85); border: 1px solid rgba(255,248,240,.25); padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; cursor: pointer; backdrop-filter: blur(4px); transition: transform .15s; }
        .ve-cbtn:hover { transform: scale(1.06); }

        .ve-mochi .ve-mochi-eyes { animation: veBlink 3.4s infinite; }
        .ve-mochi .ve-mochi-wink { opacity: 0; animation: veWink 3.4s infinite; }
        @keyframes veBlink { 0%, 92%, 100% { opacity: 1; } 94% { opacity: 0; } 96% { opacity: 1; } }
        @keyframes veWink { 0%, 92%, 100% { opacity: 0; } 94% { opacity: 1; } 96% { opacity: 0; } }
        @keyframes veFadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* responsive */
        @media (max-width: 640px) {
          .ve-stats { right: 8px; top: 8px; bottom: auto; }
          .ve-tab { min-width: 60px; max-width: 108px; padding: 0 7px; font-size: 10.5px; }
          .ve-titlebar { height: 42px; }
          .ve-invoice { width: 178px; }
          .ve-scam canvas { max-width: 76vw; }
          .ve-overload { font-size: 22px; }
        }
      `}</style>

      <canvas ref={canvasRef} className="ve-canvas" />

      {/* unmute corner */}
      <div className="ve-corner">
        <button type="button" className="ve-cbtn" onClick={toggleSound} aria-label="Toggle sound">
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>

      {/* ---------------- Chrome browser frame ---------------- */}
      <div className={`ve-browser ${sari ? "sari" : ""} ${shaking ? "shake" : ""}`}>
        <div className="ve-titlebar">
          <div className="ve-tabs">
            {tabs.map((t, i) => (
              <div key={t.id} className={"ve-tab" + (i === activeTab ? " active" : "")}>
                <span className="ve-dot" style={{ background: i === activeTab ? LAVENDER : "#4a4470" }} />
                <span className="ve-tab-label">{t.label}</span>
                <span className="ve-close">✕</span>
                {t.badge > 0 && <span className="ve-badge">{t.badge}</span>}
              </div>
            ))}
            <div className="ve-newtab">＋</div>
          </div>
          <div className="ve-winctrl">
            <span className="ve-wctrl r" />
            <span className="ve-wctrl y" />
            <span className="ve-wctrl g" />
          </div>
        </div>

        <div className="ve-addr">
          <div className="ve-addr-pill">
            <span className="ve-lock">🔒</span>
            <span className="ve-addr-url">{tabs[activeTab]?.url ?? ""}</span>
            <span className="ve-menu">⋮</span>
          </div>
        </div>

        <div className="ve-content">
          {phase === 0 && <div className="ve-phasetag">Tab 1 · Upwork</div>}
          {phase === 1 && <div className="ve-phasetag">Tab 2 · Client Verification</div>}
          {phase === 2 && <div className="ve-phasetag">Tab 3 · Invoices — Overdue</div>}
          {phase === 3 && <div className="ve-overload">⚠ SYSTEM OVERLOAD ⚠</div>}

          {/* Phase 0 — Catch the Job */}
          {phase === 0 && (
            <div className="ve-cards">
              {jobs.map((c) => (
                <div
                  key={c.id}
                  data-id={c.id}
                  className="ve-card"
                  style={{ "--left": c.left + "%", "--dur": c.dur + "ms" } as React.CSSProperties}
                  onClick={(e) => catchCard(e, e.currentTarget)}
                >
                  <span>JOB</span>
                  <b>{c.title}</b>
                </div>
              ))}
              <div className="ve-goal">Tap 5 cards before the tab crashes…</div>
            </div>
          )}

          {/* Phase 1 — Scam Shoot */}
          {phase === 1 && (
            <div className="ve-scam">
              <div className="ve-scam-hint">Shoot 4 targets — everyone looks risky.</div>
              <canvas ref={scamCanvasRef} />
              {scamWarning && (
                <div className="ve-warn">⚠️ Warning: 3 of 4 clients look suspicious</div>
              )}
            </div>
          )}

          {/* Phase 2 — Invoice Panic */}
          {phase === 2 && (
            <div className="ve-invoices">
              {invoices.map((c) => (
                <InvoiceCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* blackout + Sari window */}
      <div className={`ve-blackout ${blackout ? "show" : ""}`} />

      <div className={`ve-sari ${sari ? "show" : ""}`}>
        <div className="ve-sari-bar">
          <div className="ve-sari-dots">
            <span style={{ background: RED }} />
            <span style={{ background: "#E8B931" }} />
            <span style={{ background: "#38C172" }} />
          </div>
          <div className="ve-sari-url">app.sari.ph/dashboard</div>
        </div>
        <div className="ve-sari-body">
          <div className="ve-sari-logo">
            <span className="ve-logo">🍠</span>
            <span className="ve-wordmark">Sari</span>
          </div>

          {!results ? (
            <>
              <div className="ve-sari-mini">
                <div className="ve-mini">
                  <div className="ve-m-v">5</div>
                  <div className="ve-m-l">Jobs found</div>
                </div>
                <div className="ve-mini">
                  <div className="ve-m-v">$1,250</div>
                  <div className="ve-m-l">Earnings</div>
                </div>
                <div className="ve-mini">
                  <div className="ve-m-v" style={{ color: GREEN }}>0</div>
                  <div className="ve-m-l">To-dos</div>
                </div>
              </div>
              <p style={{ textAlign: "center", fontWeight: 700, color: "#6b5b8a", margin: 0, fontSize: 14 }}>
                “All your chaos. One click away.”
              </p>
              <button type="button" className="ve-scan" onClick={scan}>
                ✨ Scan with Sari
              </button>
            </>
          ) : (
            <div className="ve-sresults">
              <div style={{ fontWeight: 900, color: UBE, fontSize: 18 }}>Here are your matched jobs 🎉</div>
              {RESULT_JOBS.map((job, i) => (
                <div
                  key={job.title}
                  className={"ve-sresult" + (picked === i ? " picked" : "")}
                  style={{ animationDelay: i * 0.14 + "s" }}
                  onClick={(e) => pickJob(e, i)}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>{job.title}</div>
                    <div style={{ fontSize: 11, color: "#8b8baa" }}>{job.company}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="ve-match">{job.match}%</span>
                    <span className="ve-apply">Apply</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* success check */}
      <div className={`ve-success ${picked !== null ? "show" : ""}`}>
        <div className="ve-check">
          <svg viewBox="0 0 24 24">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, color: GREEN, textShadow: "0 2px 8px rgba(255,255,255,.5)" }}>
          Job matched!
        </div>
      </div>

      {/* CTA */}
      <div className={`ve-cta ${cta ? "show" : ""}`}>
        <div className="ve-cta-panel">
          <div className="ve-logo">🍠</div>
          <div className="ve-wordmark">Sari</div>
          <p className="ve-tag">All your chaos. One click away.</p>
          <div className="ve-mochi-wrap">
            <PixelMochi />
            <span className="ve-mochi-caption">mochi approves this 🐾</span>
          </div>
          <a href="/auth/signup" className="ve-cta-btn">
            Try Sari Free →
          </a>
          <a href="/" className="ve-learn">
            Skip
          </a>
        </div>
      </div>

      {/* Stats popup */}
      <div className="ve-stats">
        <button type="button" className="ve-stats-toggle" onClick={() => setStatsOpen((o) => !o)}>
          <span className="ve-stress-dot" style={{ background: stats.stress > 70 ? RED : stats.stress > 40 ? "#E8B931" : GREEN }} />
          <span>😩 {stats.stress}%</span>
          <span>{statsOpen ? "▾" : "▴"}</span>
        </button>
        {statsOpen && (
          <div className="ve-stats-panel">
            {statsRows.map((r) => (
              <div key={r.label} className="ve-stat-row">
                <span>
                  {r.emoji} {r.label}
                </span>
                <span className="ve-sv">{r.value}</span>
              </div>
            ))}
            <div className="ve-stat-row">
              <span>😰 Stress level</span>
              <span className="ve-sv">{stats.stress}%</span>
            </div>
            <div className="ve-stressbar">
              <i style={{ width: stats.stress + "%", background: stats.stress > 70 ? RED : stats.stress > 40 ? "#E8B931" : GREEN }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}