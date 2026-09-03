"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PublicProfile {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  skills: string;
  photo_url: string;
  verified: boolean;
}

interface Review {
  id: string;
  job_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Stats {
  completedJobs: number;
  totalHours: number;
  avgRating: number;
  reviewCount: number;
}

export default function VAPublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cv, setCv] = useState<{ url: string; fileName?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { username } = await params;
      try {
        const res = await fetch(`/api/va/${username}`);
        if (!res.ok) { setError("Profile not found"); return; }
        const data = await res.json();
        setProfile(data.profile);
        setStats(data.stats);
        setReviews(data.reviews);
        setCv(data.cv ?? null);
      } catch { setError("Failed to load profile"); } finally { setLoading(false); }
    })();
  }, [params]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <p className="text-5xl mb-4">🔍</p>
            <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">Not Found</h1>
            <p className="text-slate-500 text-sm">{error}</p>
            <Link href="/" className="text-kawaii-purple underline text-sm mt-4 inline-block">← Back to Sari</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const skillList = profile.skills ? profile.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
  const stars = stats ? Math.round(stats.avgRating) : 0;
  const displayName = profile.display_name || profile.username;

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg">
      {/* Background blobs */}
      <div className="fixed blob w-72 h-72 bg-kawaii-pink top-[-5%] left-[-10%] -z-0" />
      <div className="fixed blob w-64 h-64 bg-kawaii-lavender bottom-[-5%] right-[-10%] -z-0" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl">🍠</Link>
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-kawaii-purple text-white text-sm font-bold hover:bg-kawaii-purple/90 transition-colors squishy"
          >
            {copied ? "✅ Copied!" : "🔗 Share profile"}
          </button>
        </div>

        {/* Hero */}
        <Card className="text-center bg-gradient-to-br from-kawaii-lavender/20 to-kawaii-pink/10 dark:from-kawaii-purple/20 dark:to-kawaii-pink/10 border-2 border-kawaii-lavender/40 dark:border-dark-surface">
          <CardContent className="p-8">
            <div className="relative inline-block">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={displayName} className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-white dark:border-dark-card shadow-sari" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-white text-4xl font-bold mx-auto border-4 border-white dark:border-dark-card shadow-sari">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {profile.verified && (
                <span className="absolute -top-1 -right-1 text-2xl" title="Verified professional">✅</span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-slate-100">
              {displayName}
            </h1>
            <p className="text-sm text-slate-400">@{profile.username}</p>
            {profile.bio && (
              <p className="text-slate-600 dark:text-slate-300 mt-3 max-w-lg mx-auto">{profile.bio}</p>
            )}

            {/* Trust strip */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
              {stats && stats.avgRating > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-bold">
                  {"⭐".repeat(Math.min(stars, 5))} {stats.avgRating}
                </span>
              )}
              {stats && stats.completedJobs > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold">
                  ✅ {stats.completedJobs} job{stats.completedJobs === 1 ? "" : "s"} done
                </span>
              )}
              {profile.verified && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-bold">
                  🛡️ Verified
                </span>
              )}
            </div>

            {cv && (
              <a
                href={cv.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-kawaii-purple text-white text-sm font-bold hover:bg-kawaii-purple/90 transition-colors"
              >
                📄 View CV
              </a>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="text-center bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm border-kawaii-lavender/30 dark:border-dark-surface">
              <CardContent className="p-4">
                <p className="text-2xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender">{stats.completedJobs}</p>
                <p className="text-xs text-slate-400">Jobs Done</p>
              </CardContent>
            </Card>
            <Card className="text-center bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm border-kawaii-lavender/30 dark:border-dark-surface">
              <CardContent className="p-4">
                <p className="text-2xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender">{stats.totalHours}</p>
                <p className="text-xs text-slate-400">Hours Logged</p>
              </CardContent>
            </Card>
            <Card className="text-center bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm border-kawaii-lavender/30 dark:border-dark-surface">
              <CardContent className="p-4">
                <p className="text-2xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender">{stats.avgRating || "—"}</p>
                <p className="text-xs text-slate-400">Avg Rating</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Skills */}
        {skillList.length > 0 && (
          <Card className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm border-kawaii-lavender/30 dark:border-dark-surface">
            <CardContent className="p-6">
              <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-500 mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skillList.map((skill: string) => (
                  <Badge key={skill} variant="default">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews */}
        <Card className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm border-kawaii-lavender/30 dark:border-dark-surface">
          <CardContent className="p-6">
            <h2 className="font-extrabold text-base mb-4 flex items-center gap-2">
              ⭐ Reviews {stats && <span className="text-sm text-slate-400">({stats.reviewCount})</span>}
            </h2>
            {reviews.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">🤝</p>
                <p className="text-sm text-slate-400">No reviews yet — be the first to work together!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="p-4 rounded-2xl bg-kawaii-lavender/15 dark:bg-dark-surface/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{review.reviewer_name}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={s <= review.rating ? "text-yellow-400" : "text-slate-300"}>⭐</span>
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-slate-600 dark:text-slate-300">{review.comment}</p>}
                    <p className="text-xs text-slate-400 mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Why work with me */}
        <Card className="bg-gradient-to-br from-kawaii-purple/15 to-kawaii-pink/10 dark:from-kawaii-purple/20 dark:to-kawaii-pink/10 border-kawaii-lavender/40 dark:border-dark-surface">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Why work with {displayName.split(" ")[0]}?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
              Reliable, transparent, and results-driven. Every hour is tracked and every deliverable
              is documented — so you always know what's being done for you.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>⏱️ Tracked hours</span>
              <span>📸 Proof of work</span>
              <span>📄 Clean invoices</span>
              <span>⚡ Fast replies</span>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">— Powered by <Link href="/" className="text-kawaii-purple underline">Sari 🍠</Link> —</p>
      </div>
    </div>
  );
}