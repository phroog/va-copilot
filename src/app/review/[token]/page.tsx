"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [job, setJob] = useState<{ id: string; title: string; platform: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    (async () => {
      const { token: t } = await params;
      setToken(t);
      try {
        const res = await fetch(`/api/review/${t}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Invalid link");
          return;
        }
        const data = await res.json();
        setJob(data.job);
      } catch { setError("Failed to load"); } finally { setLoading(false); }
    })();
  }, [params]);

  const handleSubmit = async () => {
    if (!name.trim() || rating === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/review/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_name: name.trim(), reviewer_email: email.trim(), rating, comment: comment.trim() }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to submit");
      }
    } catch { setError("Network error"); } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (error && !done) {
    return (
      <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <p className="text-5xl mb-4">{error.includes("used") ? "✅" : "🔒"}</p>
            <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
              {error.includes("used") ? "Already Reviewed" : "Link Expired"}
            </h1>
            <p className="text-slate-500 text-sm">{error}</p>
            <Link href="/" className="text-kawaii-purple underline text-sm mt-4 inline-block">← Back to Sari</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <p className="text-5xl mb-4">🎉</p>
            <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">Thank You!</h1>
            <p className="text-slate-500 text-sm">Your review has been submitted successfully.</p>
            <Link href="/" className="text-kawaii-purple underline text-sm mt-4 inline-block">← Back to Sari</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg">
      <div className="fixed blob w-72 h-72 bg-kawaii-pink top-[-5%] left-[-10%] -z-0" />
      <div className="fixed blob w-64 h-64 bg-kawaii-lavender bottom-[-5%] right-[-10%] -z-0" />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl">🍠</Link>
        </div>

        <Card className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">⭐ Leave a Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {job && (
              <div className="p-3 rounded-2xl bg-kawaii-lavender/20 dark:bg-dark-surface/50">
                <p className="text-sm font-semibold">{job.title}</p>
                <p className="text-xs text-slate-400">{job.platform}</p>
              </div>
            )}

            <div>
              <Label>Your Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
            </div>

            <div>
              <Label>Your Email (optional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@email.com" />
            </div>

            <div>
              <Label>Rating *</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={`text-2xl transition-all squishy ${s <= (hoverRating || rating) ? "scale-110" : ""}`}
                  >
                    {s <= (hoverRating || rating) ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Comment (optional)</Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience..." rows={4} />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={submitting || !name.trim() || rating === 0}>
              {submitting ? "Submitting..." : "⭐ Submit Review"}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-6">— Powered by <Link href="/" className="text-kawaii-purple underline">Sari 🍠</Link> —</p>
      </div>
    </div>
  );
}
