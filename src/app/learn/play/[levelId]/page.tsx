"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LessonPlayer } from "@/components/learn/lesson-player";
import { RankHud, type HudUser } from "@/components/learn/rank-hud";
import type { LessonContent } from "@/lib/learn/types";
import { Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompleteResult {
  xp_earned: number;
  stars: number;
  firstCompletion: boolean;
  user: HudUser;
  rankUp: { from: string; to: string; levelBefore: number; levelAfter: number } | null;
  unlockedNodes: { id: string; title: string; emoji: string }[];
}

export default function PlayLevel({ params }: { params: { levelId: string } }) {
  const router = useRouter();
  const [content, setContent] = useState<LessonContent | null>(null);
  const [title, setTitle] = useState("");
  const [nodeTitle, setNodeTitle] = useState("");
  const [xpReward, setXpReward] = useState(30);
  const [takeaway, setTakeaway] = useState("");
  const [locked, setLocked] = useState<{ reason: string; requiresPaid: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/learn/level/${params.levelId}`);
        if (res.status === 401) {
          router.replace("/auth/login?returnUrl=/learn/play/" + params.levelId);
          return;
        }
        const data = await res.json();
        if (res.status === 402 || res.status === 403) {
          setLocked({ reason: data.reason ?? "locked", requiresPaid: data.requiresPaid ?? false });
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error(data.error || "Failed to load level");
        setContent(data.level.content);
        setTitle(data.level.title);
        setNodeTitle(data.node?.title ?? "");
        setXpReward(data.level.xp_reward ?? 30);
        setTakeaway(data.level.content?.takeaway ?? "");
        setLoading(false);
      } catch (e: any) {
        setError(e.message || "Something went wrong");
        setLoading(false);
      }
    })();
  }, [params.levelId, router]);

  const handleComplete = async (r: { accuracy: number; stars: number }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/learn/level/${params.levelId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accuracy: r.accuracy, stars: r.stars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save progress");
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to save your progress");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Preparing your mission…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-4">
        <div className="text-5xl">😅</div>
        <p className="text-slate-500">{error}</p>
        <Link href="/learn"><Button>Back to my tree</Button></Link>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-kawaii-coral to-kawaii-pink flex items-center justify-center text-4xl mb-4 animate-glow-pulse">
          <Lock className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
          {locked.requiresPaid ? "This skill is locked" : "Complete the previous skill first"}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md">
          {locked.requiresPaid
            ? "You've mastered the free skills. Go pro to unlock the full skill tree and keep climbing toward agency-ready."
            : "Skills unlock in order. Finish the one before it and this one opens up."}
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/learn"><Button variant="outline">Back to my tree</Button></Link>
          {locked.requiresPaid && (
            <Link href="/pricing">
              <Button variant="primary" className="inline-flex items-center gap-2">
                <Crown className="w-4 h-4" /> Unlock with Sari Money Club
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="py-10 px-4 animate-pop-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3 flex justify-center gap-1">
            {[1, 2, 3].map((s) => (
              <span key={s} className={cn("transition-transform", s <= result.stars ? "scale-110" : "opacity-25 grayscale")}>⭐</span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">
            {result.firstCompletion ? "Mission complete! 🎉" : "Practice logged!"}
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{takeaway}</p>
        </div>

        {result.firstCompletion && (
          <div className="max-w-md mx-auto space-y-3">
            <Card className="border-kawaii-lavender/30 dark:border-dark-surface bg-white/80 dark:bg-dark-card/80">
              <CardContent className="p-4 flex items-center justify-center gap-3">
                <span className="text-2xl">⚡</span>
                <span className="text-2xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender">+{result.xp_earned} XP</span>
              </CardContent>
            </Card>

            {result.rankUp && (
              <Card className="border-kawaii-purple/40 dark:border-dark-surface bg-gradient-to-br from-kawaii-purple/10 to-kawaii-pink/10">
                <CardContent className="p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Rank up</p>
                  <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                    {result.user.rankEmoji} {result.rankUp.to} <span className="text-sm font-bold text-kawaii-purple">· Level {result.rankUp.levelAfter}</span>
                  </p>
                </CardContent>
              </Card>
            )}

            {result.unlockedNodes.length > 0 && (
              <Card className="border-kawaii-mint/40 dark:border-dark-surface bg-kawaii-mint/10">
                <CardContent className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">New skill unlocked</p>
                  <div className="space-y-1">
                    {result.unlockedNodes.map((n) => (
                      <p key={n.id} className="font-bold text-slate-800 dark:text-slate-100">{n.emoji} {n.title}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mt-2">
              <RankHud user={result.user} compact />
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          <Button size="lg" onClick={() => router.push("/learn")} className="px-10">
            Continue my journey →
          </Button>
          <Link href="/learn/leaderboard" className="text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender hover:underline">
            🏆 See where I rank now
          </Link>
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="py-6">
      <div className="mb-2 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-kawaii-purple dark:text-kawaii-lavender">{nodeTitle}</p>
        <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{title}</h1>
      </div>
      {submitting && <p className="text-center text-sm text-slate-400 animate-pulse">Saving your XP…</p>}
      <LessonPlayer content={content} xpReward={xpReward} onComplete={handleComplete} />
    </div>
  );
}
