"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sortNodes } from "@/lib/learn/gate";
import { fingerprintId } from "@/lib/learn/tree-gen";
import type { PathWithNodes, NodeWithStatus } from "@/lib/learn/types";
import type { HudUser } from "@/components/learn/rank-hud";
import { cn } from "@/lib/utils";

const TIER_META: Record<string, { label: string; emoji: string }> = {
  platinum: { label: "Platinum", emoji: "💎" },
  gold: { label: "Gold", emoji: "🥇" },
  silver: { label: "Silver", emoji: "🥈" },
  bronze: { label: "Bronze", emoji: "🥉" },
};

interface BadgeData {
  profile: { name: string; xp: number; streak: number; rank: HudUser };
  portfolio: { activities: string[]; projects: string[] };
  stats: { lessonsDone: number; avgAccuracy: number; bestSpeedTier: string; bestAccuracyTier: string; masteredPct: number | null };
}

export default function BadgePage() {
  const [paths, setPaths] = useState<PathWithNodes[]>([]);
  const [user, setUser] = useState<HudUser | null>(null);
  const [data, setData] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);

  // portfolio editing state
  const [editing, setEditing] = useState(false);
  const [activities, setActivities] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [newActivity, setNewActivity] = useState("");
  const [newProject, setNewProject] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/learn/tree");
        if (res.status === 401) {
          window.location.href = "/auth/login?returnUrl=/badge";
          return;
        }
        const d = await res.json();
        setPaths(d?.paths ?? []);
        setUser(d?.user ?? null);
        const b = await fetch("/api/profile/badge").then((r) => r.json());
        setData(b);
        setActivities(b?.portfolio?.activities ?? []);
        setProjects(b?.portfolio?.projects ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activePath = paths.find((p) => p.id === (user as any)?.activePathId) ?? paths[0] ?? null;

  const { mastered, sorted, pct, fpId } = useMemo(() => {
    if (!activePath) return { mastered: [], sorted: [], pct: 0, fpId: "" };
    const sorted = sortNodes(activePath.nodes);
    const mastered = sorted.filter((n) => n.status === "completed");
    const pct = activePath.totalNodes ? mastered.length / activePath.totalNodes : 0;
    return { mastered, sorted, pct, fpId: fingerprintId(sorted) };
  }, [activePath]);

  const ringR = 42;
  const ringC = 2 * Math.PI * ringR;

  const name = data?.profile.name || "Virtual Assistant";
  const stats = data?.stats ?? { lessonsDone: 0, avgAccuracy: 0, bestSpeedTier: "bronze", bestAccuracyTier: "bronze", masteredPct: null };
  const speedTierInfo = TIER_META[stats.bestSpeedTier] ?? TIER_META.bronze;
  const accTierInfo = TIER_META[stats.bestAccuracyTier] ?? TIER_META.bronze;

  const addItem = (list: string[], set: (s: string[]) => void, val: string) => {
    const v = val.trim();
    if (!v) return;
    if (list.includes(v)) return;
    set([...list, v]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/badge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activities, projects }),
      });
      if (!res.ok) throw new Error("save failed");
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 px-4 max-w-[480px] mx-auto space-y-4">
        <div className="h-10 w-44 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-80 rounded-3xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-6 px-4 max-w-[480px] mx-auto pb-12">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-extrabold text-white">Your Badge</h1>
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-dl-purpleLight bg-dl-purple/15 px-2 py-1 rounded-full animate-twinkle">
          <span className="w-1.5 h-1.5 rounded-full bg-dl-purpleLight" /> LIVE
        </span>
      </div>

      {/* scouted banner */}
      <div className="mt-3 mb-5 rounded-2xl border border-kawaii-purple/40 bg-gradient-to-r from-kawaii-purple/15 to-kawaii-pink/15 p-4">
        <p className="text-sm font-extrabold text-white">✨ This is what gets you scouted</p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/60">
          The best VAs get a shot at being matched with our partner agencies. Keep your badge sharp — every mission, project and skill
          you seal makes you stand out.
        </p>
      </div>

      {/* certificate / business card */}
      <div className="relative rounded-3xl p-6 border-2 border-dl-gold/40 bg-gradient-to-b from-[#2a2d3f] to-[#1f2233] shadow-[0_0_60px_rgba(255,200,0,0.08)]">
        <div className="absolute inset-2.5 rounded-2xl border border-dashed border-dl-gold/30 pointer-events-none" />

        <div className="relative flex justify-center -mt-3 mb-3">
          <div className="relative px-8 py-2 bg-dl-gold rounded-b-xl shadow-btn-gold">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#854c00] text-center leading-tight">
              Sari · VA
              <br />
              Profile Card
            </p>
          </div>
          <span className="absolute -left-1 top-0 h-3 w-3 bg-dl-gold rotate-45" style={{ transformOrigin: "top left" }} />
        </div>

        <div className="relative text-center">
          <div className="text-4xl mb-1">{user?.rankEmoji ?? "🏅"}</div>
          <p className="text-xl font-extrabold text-white leading-tight">{name}</p>
          <p className="text-[13px] text-white/60">{user?.rankTitle} · Level {user?.level ?? 1}</p>
          {activePath && <p className="text-[11px] font-bold text-dl-gold mt-0.5">{activePath.emoji} {activePath.title}</p>}
        </div>

        {/* mastery ring */}
        <div className="relative flex items-center justify-center my-5">
          <svg width={110} height={110} className="-rotate-90">
            <circle cx={55} cy={55} r={ringR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={9} />
            <circle
              cx={55}
              cy={55}
              r={ringR}
              fill="none"
              stroke="#58cc02"
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={`${ringC * pct} ${ringC}`}
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-2xl font-extrabold text-white leading-none">{Math.round(pct * 100)}%</p>
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-white/40">mastered</p>
          </div>
        </div>

        {/* seals */}
        <div className="relative">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 mb-3 text-center">
            {mastered.length}/{sorted.length} skills sealed
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            {sorted.map((n, i) => (
              <Seal key={n.id} node={n} index={i} />
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="relative mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-white/35">
          <span>Issued {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</span>
          <span className="text-dl-gold/70">{fpId}</span>
        </div>
      </div>

      {/* performance */}
      <div className="mt-5">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/40 mb-2">Performance</p>
        <div className="grid grid-cols-2 gap-3">
          <PerfCard label="Best speed" emoji="⚡" value={speedTierInfo.emoji} sub={speedTierInfo.label} />
          <PerfCard label="Best accuracy" emoji="🎯" value={accTierInfo.emoji} sub={accTierInfo.label} />
          <PerfCard label="Missions done" emoji="📚" value={String(stats.lessonsDone)} sub="completed" />
          <PerfCard label="Day streak" emoji="🔥" value={String(data?.profile.streak ?? 0)} sub="in a row" />
        </div>
      </div>

      {/* portfolio */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/40">What you do</p>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-[12px] font-extrabold text-kawaii-purple dark:text-kawaii-lavender hover:underline">
              ✏️ Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={save} disabled={saving} className="px-3 py-1 rounded-full bg-dl-green text-white text-[12px] font-extrabold hover:brightness-105 transition-all squishy">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setActivities(data?.portfolio.activities ?? []); setProjects(data?.portfolio.projects ?? []); }} className="px-3 py-1 rounded-full border border-white/15 text-white/70 text-[12px] font-bold hover:bg-white/5 transition-all">
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1f2233] p-4">
          <p className="text-[12px] font-extrabold text-white mb-2">🛠️ Services &amp; activities</p>
          {activities.length === 0 && !editing && <p className="text-[11px] text-white/35 mb-2">Add what you handle — inbox, calendars, CRM, social, travel…</p>}
          <div className="flex flex-wrap gap-2">
            {activities.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-kawaii-purple/15 border border-kawaii-purple/40 text-[12px] font-bold text-white/90">
                {a}
                {editing && (
                  <button onClick={() => setActivities(activities.filter((x) => x !== a))} className="text-white/40 hover:text-dl-red transition-colors">✕</button>
                )}
              </span>
            ))}
          </div>
          {editing && (
            <div className="mt-3 flex gap-2">
              <input
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { addItem(activities, setActivities, newActivity); setNewActivity(""); } }}
                placeholder="e.g. Email management"
                className="flex-1 h-10 px-3 rounded-xl border-2 border-kawaii-lavender/40 bg-white/5 text-white text-sm font-semibold placeholder:text-white/30 focus:border-kawaii-purple outline-none"
              />
              <button
                onClick={() => { addItem(activities, setActivities, newActivity); setNewActivity(""); }}
                className="px-4 rounded-xl bg-kawaii-purple text-white text-sm font-extrabold hover:brightness-110 transition-all squishy"
              >
                +
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1f2233] p-4 mt-3">
          <p className="text-[12px] font-extrabold text-white mb-2">📁 Projects &amp; wins</p>
          {projects.length === 0 && !editing && <p className="text-[11px] text-white/35 mb-2">Show real work — revamped a CRM, booked 40 trips, shipped a newsletter…</p>}
          <div className="flex flex-wrap gap-2">
            {projects.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-dl-green/15 border border-dl-green/40 text-[12px] font-bold text-white/90">
                {p}
                {editing && (
                  <button onClick={() => setProjects(projects.filter((x) => x !== p))} className="text-white/40 hover:text-dl-red transition-colors">✕</button>
                )}
              </span>
            ))}
          </div>
          {editing && (
            <div className="mt-3 flex gap-2">
              <input
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { addItem(projects, setProjects, newProject); setNewProject(""); } }}
                placeholder="e.g. Rebuilt client onboarding flow"
                className="flex-1 h-10 px-3 rounded-xl border-2 border-kawaii-lavender/40 bg-white/5 text-white text-sm font-semibold placeholder:text-white/30 focus:border-kawaii-purple outline-none"
              />
              <button
                onClick={() => { addItem(projects, setProjects, newProject); setNewProject(""); }}
                className="px-4 rounded-xl bg-dl-green text-white text-sm font-extrabold hover:brightness-110 transition-all squishy"
              >
                +
              </button>
            </div>
          )}
        </div>

        {saved && <p className="mt-3 text-center text-[12px] font-bold text-dl-green animate-pop-in">Saved — your badge looks sharp. ✨</p>}
      </div>

      <p className="text-center text-[11px] text-white/40 mt-5">
        Master missions to seal more skills. Top performers get scouted by partner agencies. 🚀
      </p>
    </motion.div>
  );
}

function PerfCard({ label, emoji, value, sub }: { label: string; emoji: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1f2233] p-3.5">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-white">{emoji} {value}</p>
      <p className="text-[10px] text-white/40">{sub}</p>
    </div>
  );
}

function Seal({ node, index }: { node: NodeWithStatus; index: number }) {
  const done = node.status === "completed";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.05 + index * 0.015, type: "spring", stiffness: 260, damping: 16 }}
      className="flex flex-col items-center gap-1"
    >
      <span
        className={cn(
          "relative w-14 h-14 rounded-full flex items-center justify-center text-[26px] transition-all",
          done
            ? "bg-gradient-to-br from-dl-gold to-dl-goldDark text-white shadow-[0_4px_0_0_#e5a500]"
            : "bg-white/5 border-2 border-dashed border-white/15 opacity-45"
        )}
        title={node.title}
      >
        {node.emoji}
        {done && (
          <motion.span
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-dl-green text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-[#2a2d3f]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + index * 0.015, type: "spring", stiffness: 300, damping: 12 }}
          >
            ✓
          </motion.span>
        )}
      </span>
      <span className="text-[9px] font-bold text-white/70 text-center leading-tight max-w-[72px]">{node.title}</span>
    </motion.div>
  );
}