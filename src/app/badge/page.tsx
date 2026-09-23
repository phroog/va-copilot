"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sortNodes } from "@/lib/learn/gate";
import { fingerprintId } from "@/lib/learn/tree-gen";
import type { PathWithNodes } from "@/lib/learn/types";
import type { HudUser } from "@/components/learn/rank-hud";
import { cn } from "@/lib/utils";

const TIER_META: Record<string, { label: string; emoji: string }> = {
  platinum: { label: "Platinum", emoji: "💎" },
  gold: { label: "Gold", emoji: "🥇" },
  silver: { label: "Silver", emoji: "🥈" },
  bronze: { label: "Bronze", emoji: "🥉" },
};

interface BadgeData {
  profile: {
    name: string;
    xp: number;
    streak: number;
    publicId: string | null;
    tagline: string;
    plan: string;
    verified: boolean;
    scout: "top" | "pool" | "none";
    rank: HudUser;
  };
  portfolio: { activities: string[]; projects: string[]; tagline: string };
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
  const [tagline, setTagline] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

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
        setTagline(b?.portfolio?.tagline ?? b?.profile?.tagline ?? "");
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activePath = paths.find((p) => p.id === (user as any)?.activePathId) ?? paths[0] ?? null;

  // Overall across ALL categories + fingerprint of the active path.
  const overall = useMemo(() => {
    let mastered = 0;
    let total = 0;
    for (const p of paths) {
      mastered += p.completedNodes ?? 0;
      total += p.totalNodes ?? 0;
    }
    const fpId = activePath ? fingerprintId(sortNodes(activePath.nodes)) : "";
    return { mastered, total, pct: total > 0 ? mastered / total : 0, fpId };
  }, [paths, activePath]);

  const ringR = 42;
  const ringC = 2 * Math.PI * ringR;

  const name = data?.profile.name || "Virtual Assistant";
  const stats = data?.stats ?? { lessonsDone: 0, avgAccuracy: 0, bestSpeedTier: "bronze", bestAccuracyTier: "bronze", masteredPct: null };
  const speedTierInfo = TIER_META[stats.bestSpeedTier] ?? TIER_META.bronze;
  const accTierInfo = TIER_META[stats.bestAccuracyTier] ?? TIER_META.bronze;

  // All categories the user actually touched (not just the active one).
  const specialties = paths.filter((p) => p.completedNodes > 0 || p.nodes.some((n) => n.status !== "locked"));

  const shareLink = data?.profile.publicId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${data.profile.publicId}`
    : "";
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

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
        body: JSON.stringify({ activities, projects, tagline }),
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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-6 px-4 max-w-[480px] lg:max-w-[680px] mx-auto pb-12">
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
          {data?.profile.scout === "top"
            ? "You're in the Top Scout Pool — partner agencies get you first. Keep your badge sharp."
            : data?.profile.scout === "pool"
            ? "You're in the Scout Pool — agencies can find you. Keep your badge sharp to stand out."
            : "Free members aren't in the scout pool yet. Upgrade to BLOOM+ to get found by partner agencies."}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border",
            data?.profile.scout === "top" ? "bg-dl-gold/20 border-dl-gold/50 text-dl-gold" : data?.profile.scout === "pool" ? "bg-kawaii-purple/20 border-kawaii-purple/50 text-kawaii-lavender" : "bg-white/5 border-white/15 text-white/40"
          )}>
            🏢 {data?.profile.scout === "top" ? "Top Scout Pool" : data?.profile.scout === "pool" ? "Scout Pool" : "Not in scout pool"}
          </span>
          {data?.profile.verified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-dl-green/15 border border-dl-green/50 text-dl-green text-[10px] font-extrabold">
              ✓ Verified badge
            </span>
          )}
        </div>
      </div>

      {data?.profile.plan === "free" && (
        <div className="mb-4 rounded-2xl border border-dl-red/40 bg-dl-red/10 p-3 text-center">
          <p className="text-[12px] font-extrabold text-dl-red">Badge updates are paused on Free</p>
          <p className="text-[11px] text-white/60 mt-0.5">Upgrade to BLOOM to keep your badge live &amp; shareable.</p>
        </div>
      )}

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
          <p className="text-xl font-extrabold text-white leading-tight inline-flex items-center justify-center gap-2">
            {name}
            {data?.profile.verified && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-dl-green text-white text-[10px] font-extrabold">✓ Verified</span>
            )}
          </p>
          <p className="text-[13px] text-white/60">{user?.rankTitle} · Level {user?.level ?? 1}</p>
          {data?.profile.tagline && <p className="mt-2 text-[13px] italic text-white/70">{data.profile.tagline}</p>}
          {specialties.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {specialties.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-dl-gold/15 border border-dl-gold/40 text-[10px] font-extrabold text-dl-gold">
                  {s.emoji} {s.title}
                  {s.completedNodes >= s.totalNodes && " ✓"}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* mastery ring (all categories) */}
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
              strokeDasharray={`${ringC * overall.pct} ${ringC}`}
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-2xl font-extrabold text-white leading-none">{Math.round(overall.pct * 100)}%</p>
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-white/40">mastered</p>
          </div>
        </div>

        {/* footer */}
        <div className="relative mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-white/35">
          <span>Issued {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</span>
          <span className="text-dl-gold/70">{overall.fpId}</span>
        </div>
      </div>

      {/* share */}
      {shareLink && (
        <div className="mt-4">
          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold text-sm shadow-btn-purple hover:brightness-110 active:translate-y-1 active:shadow-none transition-all squishy"
          >
            {copied ? "✅ Link copied!" : "🔗 Share my badge (put it in your bio)"}
          </button>
          {copied && <p className="mt-1.5 text-center text-[11px] text-white/40">{shareLink}</p>}
        </div>
      )}

      {/* per-category badges */}
      {paths.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/40 mb-2">
            Your category badges · {overall.mastered}/{overall.total} skills sealed
          </p>
          <div className="grid grid-cols-2 gap-3">
            {paths.map((p) => (
              <CategoryBadge key={p.id} path={p} active={p.id === activePath?.id} />
            ))}
          </div>
        </div>
      )}

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

        {editing && (
          <div className="rounded-2xl border border-white/10 bg-[#1f2233] p-4 mb-3">
            <p className="text-[12px] font-extrabold text-white mb-2">💬 Badge tagline</p>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={80}
              placeholder="e.g. Your friendly VA for busy founders"
              className="w-full h-11 px-3 rounded-xl border-2 border-kawaii-lavender/40 bg-white/5 text-white text-sm font-semibold placeholder:text-white/30 focus:border-kawaii-purple outline-none"
            />
            <p className="mt-1 text-[10px] text-white/35">{tagline.length}/80 — shown on your public profile</p>
          </div>
        )}

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

function CategoryBadge({ path, active }: { path: PathWithNodes; active: boolean }) {
  const pct = path.totalNodes > 0 ? path.completedNodes / path.totalNodes : 0;
  const done = pct >= 1;
  return (
    <div className={cn("rounded-2xl border p-3.5", active ? "border-dl-purple/60 bg-dl-purple/10" : "border-white/10 bg-[#1f2233]")}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{path.emoji}</span>
        {done ? (
          <span className="text-[10px] font-extrabold text-dl-green bg-dl-green/15 px-1.5 py-0.5 rounded-full">SEALED ✓</span>
        ) : (
          <span className="text-[10px] font-extrabold text-white/40">{path.completedNodes}/{path.totalNodes}</span>
        )}
      </div>
      <p className="mt-1.5 text-[12px] font-extrabold text-white leading-tight">{path.title}</p>
      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-dl-green" style={{ width: `${Math.round(pct * 100)}%` }} />
      </div>
    </div>
  );
}