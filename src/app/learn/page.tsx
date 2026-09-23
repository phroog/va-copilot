"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { sortNodes } from "@/lib/learn/gate";
import { modeForLevel } from "@/lib/learn/modes";
import type { PathWithNodes, NodeWithStatus } from "@/lib/learn/types";
import type { HudUser } from "@/components/learn/rank-hud";
import { ClientSim } from "@/components/learn/client-sim";
import { UpgradeCta } from "@/components/learn/upgrade-cta";
import { startMusic, stopMusic } from "@/lib/music";
import { cn } from "@/lib/utils";

const NODE = 70;
const STEP = 122;
const CENTER = 240;
const OFFSET = 50;
const CHUNK = 9;
const DIVIDER_H = 88;

const MODE_ICON: Record<string, string> = { story: "📖", rapid: "⭐", chat: "💬" };
const CHAPTER_TITLES = ["Foundations", "Core Skills", "Growth", "Mastery", "Expertise", "Legendary"];
const DECOS = ["✨", "🌸", "🏮", "🌱", "⭐", "🎀", "🎋", "⛩️"];

function NearMissBanner({ user }: { user: { xp: number; level: number; xpIntoLevel: number; xpForNextLevel: number; streak: number; lastActive?: string | null } | null }) {
  if (!user) return null;
  const xpToNext = Math.max(0, (user.xpForNextLevel ?? 0) - (user.xpIntoLevel ?? 0));
  const nextLevel = (user.level ?? 1) + 1;

  const today = new Date().toISOString().slice(0, 10);
  const streakAtRisk = user.streak > 0 && user.lastActive != null && user.lastActive !== today;

  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const ms = Math.max(0, midnight.getTime() - now.getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);

  return (
    <div className="max-w-[480px] mx-auto px-4 mt-3 space-y-2">
      <div className="rounded-2xl bg-[#1f2233] border border-white/10 px-4 py-2.5 flex items-center justify-between">
        <p className="text-[13px] font-bold text-white/85">
          {xpToNext > 0 ? (
            <>
              <span className="text-dl-purpleLight font-extrabold">{xpToNext} XP</span> to Level {nextLevel}!
            </>
          ) : (
            <>You've reached Level {user.level} — keep going!</>
          )}
        </p>
        <span className="text-lg">⚡</span>
      </div>
      {streakAtRisk && (
        <div className="rounded-2xl bg-dl-red/20 border border-dl-red/50 px-4 py-2.5 flex items-center justify-between animate-fade-in">
          <p className="text-[13px] font-bold text-white/90">
            🔥 {h}h {m}m left to save your streak!
          </p>
          <span className="text-dl-red font-extrabold text-sm">Play now</span>
        </div>
      )}
    </div>
  );
}

interface PathRow {
  node: NodeWithStatus;
  index: number;
  isCurrent: boolean;
  isTrophy: boolean;
  isChest: boolean;
}

type Item =
  | { kind: "divider"; title: string; y: number; chapter: number }
  | { kind: "node"; row: PathRow; y: number };

export default function LearnHome() {
  const [paths, setPaths] = useState<PathWithNodes[]>([]);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [user, setUser] = useState<HudUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState(false);
  const [mode, setMode] = useState<"rank" | "sim">(() => {
    try {
      return (localStorage.getItem("sari_learn_mode") as "rank" | "sim") || "rank";
    } catch {
      return "rank";
    }
  });
  const lastLoadRef = useRef(0);
  const [nudgePlan, setNudgePlan] = useState<string | null>(null);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [railEnergy, setRailEnergy] = useState<{ plan: string; lessonsLeft: number; lessonsLimit: number } | null>(null);

  const load = async () => {
    lastLoadRef.current = Date.now();
    try {
      const res = await fetch("/api/learn/tree");
      if (res.status === 401) {
        window.location.href = "/auth/login?returnUrl=/learn";
        return;
      }
      const data = await res.json();
      setPaths(data.paths ?? []);
      setUser(data.user ?? null);
      const active = data.activePathId ?? data.paths?.[0]?.id ?? null;
      setActivePathId(active);
      setChosen(!!data.activePathId);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Categories are switched only via the header Courses menu — reload the tree
  // when the course changes, and refresh on focus at most once a minute (keeps
  // it fast on slow connections and cheap on Vercel).
  useEffect(() => {
    const reload = () => {
      if (Date.now() - lastLoadRef.current < 60_000) return;
      load();
    };
    const courseReload = () => load();
    window.addEventListener("sari:course-changed", courseReload);
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener("sari:course-changed", courseReload);
      window.removeEventListener("focus", reload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choosePath = async (pathId: string) => {
    setActivePathId(pathId);
    setChosen(true);
    try {
      await fetch("/api/learn/select-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path_id: pathId }),
      });
    } catch {
      // ignore
    }
  };

  // Client Sim needs a category context — auto-select the first path if none is chosen.
  useEffect(() => {
    if (mode === "sim" && !chosen && paths.length > 0) {
      choosePath(paths[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, paths, chosen]);

  // Calm map theme on the rank tree; ClientSim manages its own music.
  useEffect(() => {
    if (mode === "rank") startMusic("map");
    return () => stopMusic();
  }, [mode]);

  // One polite, dismissible upgrade nudge per session for Free users.
  useEffect(() => {
    (async () => {
      try {
        const seen = sessionStorage.getItem("sari_nudge_seen") === "1";
        if (seen) return;
        const d = await fetch("/api/learn/energy").then((r) => r.json());
        const plan = d?.energy?.plan ?? "free";
        setNudgePlan(plan);
        setRailEnergy(d?.energy ?? null);
        if (plan !== "pro") {
          sessionStorage.setItem("sari_nudge_seen", "1");
          setTimeout(() => setNudgeVisible(true), 2500);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePath = paths.find((p) => p.id === activePathId) ?? null;

  const rows = useMemo<PathRow[]>(() => {
    if (!activePath) return [];
    const sorted = sortNodes(activePath.nodes);
    const firstAvailable = sorted.findIndex((n) => n.status === "available");
    const n = sorted.length;
    return sorted.map((node, i) => ({
      node,
      index: i,
      isCurrent: i === firstAvailable,
      isTrophy: i === n - 1,
      isChest: i > 0 && i % 5 === 0,
    }));
  }, [activePath]);

  const { items, containerH, currentChapter } = useMemo(() => {
    const chapters: PathRow[][] = [];
    for (let i = 0; i < rows.length; i += CHUNK) chapters.push(rows.slice(i, i + CHUNK));
    const list: Item[] = [];
    let y = 0;
    let cur = 0;
    chapters.forEach((chunk, ci) => {
      list.push({ kind: "divider", title: CHAPTER_TITLES[ci % CHAPTER_TITLES.length], y, chapter: ci });
      y += DIVIDER_H;
      chunk.forEach((row) => {
        if (row.isCurrent) cur = ci;
        list.push({ kind: "node", row, y });
        y += STEP;
      });
      y += 16;
    });
    return { items: list, containerH: y + 80, currentChapter: cur };
  }, [rows]);

  const currentTitle = rows.find((r) => r.isCurrent)?.node.title ?? activePath?.title ?? "";

  if (loading) {
    return (
      <div className="pb-6 max-w-[480px] mx-auto">
        <div className="flex gap-1.5 px-4 pt-4 pb-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="px-4">
          <div className="rounded-t-3xl bg-[#1f2233] px-5 py-4 space-y-2 border border-white/5">
            <div className="h-3 w-28 rounded-full bg-white/10 animate-pulse" />
            <div className="h-5 w-44 rounded-full bg-white/10 animate-pulse" />
          </div>
        </div>
        <div className="px-4 mt-3">
          <div className="h-11 rounded-2xl bg-white/5 animate-pulse" />
        </div>
        <div className="relative max-w-[480px] mx-auto" style={{ height: 900 }}>
          {Array.from({ length: 9 }).map((_, i) => {
            const x = CENTER + (i % 2 === 0 ? OFFSET : -OFFSET);
            return (
              <div key={i} className="absolute flex flex-col items-center" style={{ left: x - 35, top: i * 95 }}>
                <div className="w-[70px] h-[70px] rounded-full bg-white/5 border border-white/10 animate-pulse" />
                <div className="mt-2 h-3 w-20 rounded-full bg-white/5 animate-pulse" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!chosen) {
    return (
      <div className="py-10 px-4 max-w-[480px] mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-float">🍠</div>
          <h1 className="text-3xl font-extrabold text-white leading-tight">
            What do you want to <span className="text-dl-purpleLight">become</span>?
          </h1>
          <p className="mt-2 text-[15px] text-white/60">Pick your dream. Your path grows from there.</p>
        </div>
        <div className="space-y-3">
          {paths.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => choosePath(p.id)}
              className="w-full text-left rounded-2xl bg-[#1f2233] border border-white/5 p-4 flex items-center gap-4 hover:border-dl-purple/60 transition-colors"
            >
              <span className="text-3xl">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-white">{p.title}</p>
                <p className="text-sm text-white/50 truncate">{p.subtitle}</p>
              </div>
              <span className="text-dl-purpleLight font-extrabold">→</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="pb-6">
      <div className="xl:flex xl:justify-center xl:items-start xl:gap-6 xl:max-w-[1180px] xl:mx-auto xl:px-4">
      <div className="xl:flex-1 xl:min-w-0">
      {/* mode toggle: rank climb / client sim */}
      <div className="max-w-[480px] mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#1f2233] border border-white/10">
          <button
            onClick={() => setMode("rank")}
            className={cn(
              "py-2 rounded-xl text-[13px] font-extrabold transition-all squishy",
              mode === "rank" ? "bg-dl-purple text-white shadow-btn-purple" : "text-white/50 hover:text-white"
            )}
          >
            🌳 Rank climb
          </button>
          <button
            onClick={() => setMode("sim")}
            className={cn(
              "py-2 rounded-xl text-[13px] font-extrabold transition-all squishy",
              mode === "sim" ? "bg-dl-green text-white shadow-btn-green" : "text-white/50 hover:text-white"
            )}
          >
            💬 Client Sim
          </button>
        </div>
      </div>

      {nudgeVisible && nudgePlan && nudgePlan !== "pro" && (
        <div className="max-w-[480px] mx-auto px-4 mt-2">
          <div className="relative">
            <button
              onClick={() => setNudgeVisible(false)}
              className="absolute -top-1.5 -right-1.5 z-10 w-6 h-6 rounded-full bg-[#1f2233] border border-white/15 flex items-center justify-center text-white/60 hover:text-white text-xs"
              aria-label="Dismiss"
            >
              ✕
            </button>
            <UpgradeCta plan={nudgePlan} />
          </div>
        </div>
      )}

      {/* categories are switched via the header Courses menu (CourseSheet) */}

      {mode === "sim" && (
        <div className="mt-2">
          <ClientSim path={activePath} onBack={() => setMode("rank")} />
        </div>
      )}

      {mode === "rank" && (<>

      {/* green progress header */}
      {activePath && (
        <div className="max-w-[480px] mx-auto px-4">
          <div className="rounded-t-3xl bg-dl-green px-5 py-4 flex items-center justify-between shadow-[0_4px_0_0_#46a302]">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                Level 1 · Section {currentChapter + 1}
              </p>
              <p className="text-lg font-extrabold text-white leading-tight truncate">{currentTitle}</p>
            </div>
            <span className="flex items-center gap-3 shrink-0">
              <span className="w-px h-9 bg-white/25" />
              <span className="text-2xl">📋</span>
            </span>
          </div>
        </div>
      )}

      {/* near-miss banners */}
      <NearMissBanner user={user} />

      {/* serpentine path with chapters */}
      <div className="relative max-w-[480px] mx-auto" style={{ height: containerH }}>
        {/* decorative background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          <div className="absolute left-1/2 top-[18%] -translate-x-1/2 w-[440px] h-[440px] rounded-full bg-dl-purple/10 blur-3xl" />
          <div className="absolute left-1/2 bottom-[4%] -translate-x-1/2 w-[380px] h-[380px] rounded-full bg-[#ff8ba7]/10 blur-3xl" />
          <div
            className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)", backgroundSize: "26px 26px", opacity: 0.12 }}
          />
          <span className="absolute text-2xl animate-drift" style={{ left: 18, top: 110, opacity: 0.5 }}>✨</span>
          <span className="absolute text-3xl animate-drift" style={{ right: 16, top: 230, opacity: 0.45, animationDelay: "1.1s" }}>🌱</span>
          <span className="absolute text-2xl animate-drift" style={{ left: 26, bottom: 130, opacity: 0.5, animationDelay: "2s" }}>🏮</span>
          <span className="absolute text-3xl animate-drift" style={{ right: 28, bottom: 60, opacity: 0.4, animationDelay: "0.6s" }}>🌸</span>
          <span className="absolute w-20 h-20 rounded-full border border-dl-purple/15" style={{ left: 30, top: 180 }} />
          <span className="absolute w-14 h-14 rounded-full border border-[#ff8ba7]/15" style={{ right: 34, top: 320 }} />
        </div>

        {/* goal marker at top */}
        <div className="absolute left-1/2 top-1 -translate-x-1/2 text-2xl text-white/40 animate-float">🏮</div>

        <svg className="absolute inset-0 pointer-events-none" width={480} height={containerH}>
          {items.map((it, i) => {
            if (it.kind !== "node") return null;
            const next = items.slice(i + 1).find((x) => x.kind === "node") as Extract<Item, { kind: "node" }> | undefined;
            if (!next) return null;
            const x1 = CENTER + (it.row.index % 2 === 0 ? OFFSET : -OFFSET);
            const x2 = CENTER + (next.row.index % 2 === 0 ? OFFSET : -OFFSET);
            const y1 = it.y + 40;
            const y2 = next.y + 40;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} Q ${CENTER} ${(y1 + y2) / 2} ${x2} ${y2}`}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={4}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {items.map((it, i) => {
          if (it.kind === "divider") {
            return (
              <div key={`d${i}`} className="absolute left-0 right-0 flex items-center gap-2.5 px-5" style={{ top: it.y + 34 }}>
                <span className="flex-1 h-px bg-white/15" />
                <span className="text-[11px] opacity-70">🌸</span>
                <span className="text-[13px] font-extrabold text-white/50 whitespace-nowrap">{it.title}</span>
                <span className="text-[11px] opacity-70">🌸</span>
                <span className="flex-1 h-px bg-white/15" />
              </div>
            );
          }
          const x = CENTER + (it.row.index % 2 === 0 ? OFFSET : -OFFSET);
          const side = it.row.index % 3;
          const deco = DECOS[it.row.index % DECOS.length];
          return (
            <div key={it.row.node.id}>
              {side === 1 && (
                <span className="absolute pointer-events-none text-xl animate-float opacity-50" style={{ left: 10, top: it.y + 14, animationDelay: `${(it.row.index % 5) * 0.6}s` }}>
                  {deco}
                </span>
              )}
              {side === 2 && (
                <span className="absolute pointer-events-none text-xl animate-float opacity-50" style={{ right: 10, top: it.y + 14, animationDelay: `${(it.row.index % 5) * 0.6}s` }}>
                  {deco}
                </span>
              )}
              <PathNode row={it.row} x={x} y={it.y} />
              {it.row.isCurrent && <RewardTile x={CENTER - (it.row.index % 2 === 0 ? OFFSET : -OFFSET)} y={it.y + 6} />}
            </div>
          );
        })}

        {/* start marker at bottom */}
        <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 text-2xl text-white/35 animate-float">⛩️</div>
      </div>

      {/* practice mastered */}
      {activePath && (() => {
        const mastered = sortNodes(activePath.nodes).filter((n) => n.status === "completed");
        if (mastered.length === 0) return null;
        return (
          <div className="max-w-[480px] mx-auto px-4 mt-2">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/40 mb-2">Mastered — practice again</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {mastered.map((n) => {
                const lvl = n.levels[0];
                if (!lvl) return null;
                return (
                  <Link key={n.id} href={`/learn/play/${n.nextLevelId ?? lvl.id}`} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#1f2233] border border-dl-green/40 text-white/80 text-xs font-bold hover:border-dl-green transition-colors">
                    <span className="text-dl-green font-extrabold">✓</span> {n.title}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}
      </>)}

      </div>
      <LearnRail user={user} energy={railEnergy} />
      </div>
    </motion.div>
  );
}

function PathNode({ row, x, y }: { row: PathRow; x: number; y: number }) {
  const { node, isCurrent, isTrophy, isChest } = row;
  const level = node.levels[0];
  const size = isTrophy ? 92 : NODE;
  const locked = node.status === "locked";
  const mode = level ? modeForLevel(level.id) : "story";

  const style = isCurrent
    ? "bg-dl-green shadow-node-green"
    : node.status === "completed"
    ? "bg-dl-green shadow-node-green"
    : node.status === "available"
    ? "bg-dl-purple shadow-node-purple"
    : isChest
    ? "bg-dl-gold shadow-node-gold"
    : "bg-dl-greyDark shadow-node-grey";

  const icon = isTrophy
    ? "🏆"
    : isChest && node.status !== "completed" && !isCurrent
    ? "📦"
    : node.status === "completed"
    ? "✓"
    : isCurrent
    ? "⭐"
    : MODE_ICON[mode] ?? "⭐";

  const ringD = size + 16;
  const ringR = ringD / 2 - 3;
  const circ = 2 * Math.PI * ringR;
  const ringPct = node.lessonTotal ? Math.max(0.06, node.lessonDone / node.lessonTotal) : 0.62;
  const nextLevelId = node.nextLevelId ?? level?.id ?? null;

  const inner = (
    <div className="flex flex-col items-center" style={{ width: size + 8 }}>
      <div className="relative" style={{ width: ringD, height: ringD }}>
        {/* auras */}
        {isCurrent && <span className="absolute -inset-3 rounded-full bg-dl-green/25 blur-lg pointer-events-none" />}
        {isChest && node.status !== "completed" && !isCurrent && <span className="absolute -inset-2 rounded-full bg-dl-gold/20 blur-md pointer-events-none" />}
        {node.status === "completed" && <span className="absolute -inset-2 rounded-full bg-dl-green/15 blur-sm pointer-events-none" />}

        {isCurrent && (
          <svg className="absolute inset-0 -rotate-90" width={ringD} height={ringD}>
            <circle cx={ringD / 2} cy={ringD / 2} r={ringR} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={5} />
            <circle cx={ringD / 2} cy={ringD / 2} r={ringR} fill="none" stroke="#58cc02" strokeWidth={5} strokeLinecap="round" strokeDasharray={`${circ * ringPct} ${circ}`} />
          </svg>
        )}
        <motion.button
          animate={node.status === "completed" ? { scale: [0.6, 1.12, 1] } : {}}
          transition={node.status === "completed" ? { type: "spring", stiffness: 300, damping: 12 } : {}}
          disabled={locked}
          title={locked ? "Locked — keep going" : node.title}
          className={cn(
            "absolute rounded-full border-4 flex items-center justify-center transition-all will-change-transform",
            style,
            isCurrent && "border-white/30 animate-dl-pulse",
            locked ? "cursor-not-allowed" : "cursor-pointer hover:brightness-110"
          )}
          style={{ width: size, height: size, left: (ringD - size) / 2, top: (ringD - size) / 2 }}
        >
          <span className={cn("font-extrabold leading-none", isTrophy ? "text-[40px]" : "text-[30px]", locked && "opacity-40")}>
            {icon}
          </span>
          {node.status === "completed" && (
            <motion.span
              className="absolute -top-3 -right-2 text-sm pointer-events-none animate-twinkle"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.1 }}
            >
              ✨
            </motion.span>
          )}
        </motion.button>
      </div>
      <span className={cn("mt-2 text-[12px] font-bold text-center leading-tight max-w-[110px]", locked ? "text-white/30" : "text-white")}>
        {node.title}
      </span>
      {isCurrent && node.lessonTotal > 1 && (
        <span className="text-[10px] font-bold text-white/50">
          Lesson {Math.min(node.lessonDone + 1, node.lessonTotal)} of {node.lessonTotal}
        </span>
      )}
    </div>
  );

  if (locked) {
    return <div className="absolute" style={{ left: x - size / 2, top: y }}>{inner}</div>;
  }
  return (
    <Link href={nextLevelId ? `/learn/play/${nextLevelId}` : "/learn/tree"} className="absolute" style={{ left: x - size / 2, top: y }}>
      {inner}
    </Link>
  );
}

function RewardTile({ x, y }: { x: number; y: number }) {
  return (
    <Link href="/dashboard/wheel" className="absolute flex flex-col items-center gap-1" style={{ left: x - 36, top: y }}>
      <span className="w-[72px] h-[72px] rounded-2xl bg-dl-purple flex items-center justify-center text-[36px] shadow-[0_4px_0_0_#7d3fbf]">
        🎁
      </span>
      <span className="text-[11px] font-extrabold text-white">Claim</span>
    </Link>
  );
}

// Desktop-only right rail (Duolingo-style side panel) for the Learn page.
function LearnRail({
  user,
  energy,
}: {
  user: HudUser | null;
  energy: { plan: string; lessonsLeft: number; lessonsLimit: number } | null;
}) {
  const plan = energy?.plan ?? "free";
  const lessons = energy?.lessonsLeft === Infinity ? "∞" : String(energy?.lessonsLeft ?? "–");
  return (
    <aside className="hidden xl:block w-72 shrink-0 space-y-3 sticky top-20 pb-10">
      <div className="rounded-3xl bg-[#1f2233] border border-white/10 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Daily energy</p>
        <p className="mt-1 text-2xl font-extrabold text-white">
          ⚡ {lessons} <span className="text-sm font-bold text-white/40">lessons left</span>
        </p>
        <p className="text-[11px] text-white/50 mt-0.5">
          {plan === "pro" ? "👑 Money Club · unlimited" : plan === "basic" ? "🌸 BLOOM" : "🌱 Free"}
        </p>
      </div>
      <div className="rounded-3xl bg-[#1f2233] border border-white/10 p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Streak</p>
          <p className="text-xl font-extrabold text-white">🔥 {user?.streak ?? 0}</p>
        </div>
        <span className="text-3xl">{user?.rankEmoji ?? "🏅"}</span>
      </div>
      <Link href="/badge" className="block rounded-3xl bg-[#1f2233] border border-dl-gold/30 p-4 hover:border-dl-gold/60 transition-colors">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Your badge</p>
        <p className="text-sm font-extrabold text-white mt-0.5">🏅 Put it in your bio</p>
      </Link>
      <Link href="/learn/leaderboard" className="block rounded-3xl bg-[#1f2233] border border-white/10 p-4 hover:border-white/25 transition-colors">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Ranks</p>
        <p className="text-sm font-extrabold text-white mt-0.5">🏆 See where you stand</p>
      </Link>
      {plan !== "pro" && <UpgradeCta plan={plan} />}
    </aside>
  );
}

// Categories are switched via the header Courses menu only.