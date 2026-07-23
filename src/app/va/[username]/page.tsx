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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      } catch { setError("Failed to load profile"); } finally { setLoading(false); }
    })();
  }, [params]);

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

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg">
      {/* Background blobs */}
      <div className="fixed blob w-72 h-72 bg-kawaii-pink top-[-5%] left-[-10%] -z-0" />
      <div className="fixed blob w-64 h-64 bg-kawaii-lavender bottom-[-5%] right-[-10%] -z-0" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="text-2xl">🍠</Link>
        </div>

        {/* Profile card */}
        <Card className="text-center bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-white text-3xl font-bold mx-auto">
                {(profile.display_name || profile.username).charAt(0).toUpperCase()}
              </div>
              {profile.verified && (
                <span className="absolute -top-1 -right-1 text-lg" title="Verified">✅</span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-slate-100">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-sm text-slate-400">@{profile.username}</p>
            {profile.bio && (
              <p className="text-slate-600 dark:text-slate-300 mt-3 max-w-lg mx-auto">{profile.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="text-center bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-extrabold text-kawaii-purple">{stats.completedJobs}</p>
                <p className="text-xs text-slate-400">Jobs Done</p>
              </CardContent>
            </Card>
            <Card className="text-center bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-extrabold text-kawaii-purple">{stats.totalHours}</p>
                <p className="text-xs text-slate-400">Hours Logged</p>
              </CardContent>
            </Card>
            <Card className="text-center bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-2xl font-extrabold text-kawaii-purple">{stats.avgRating}</p>
                <p className="text-xs text-slate-400">Avg Rating</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Skills */}
        {skillList.length > 0 && (
          <Card className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm">
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
        <Card className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <h2 className="font-extrabold text-base mb-4 flex items-center gap-2">
              ⭐ Reviews {stats && <span className="text-sm text-slate-400">({stats.reviewCount})</span>}
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No reviews yet.</p>
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

        <p className="text-center text-xs text-slate-400">— Powered by <Link href="/" className="text-kawaii-purple underline">Sari 🍠</Link> —</p>
      </div>
    </div>
  );
}
