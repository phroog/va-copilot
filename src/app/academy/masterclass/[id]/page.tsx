"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/context";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export default function MasterclassPage({ params }: { params: { id: string } }) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [mc, setMc] = useState<any>(null);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [markedDone, setMarkedDone] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/academy/login"); return; }
      fetch(`/api/academy/masterclasses/${params.id}`)
        .then((r) => r.json())
        .then((data) => {
          setMc(data.masterclass);
          setQuiz(data.quiz);
          setProgress(data.progress);
          if (data.progress?.completed) setMarkedDone(true);
          if (data.quiz) setAnswers(new Array(data.quiz.length).fill(-1));
        })
        .finally(() => setLoading(false));
    });
  }, [supabase, router, params.id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><p className="text-slate-400 animate-pulse">{t("loading")}...</p></div>;
  }

  if (!mc) {
    return <div className="text-center py-12 text-slate-400">{t("notFound")}</div>;
  }

  const handleMarkComplete = async () => {
    setSaving(true);
    await fetch("/api/academy/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masterclass_id: params.id }),
    });
    setMarkedDone(true);
    setSaving(false);
  };

  const handleSubmitQuiz = async () => {
    const answered = answers.filter((a) => a >= 0).length;
    if (answered < (quiz?.length ?? 0)) return;

    let score = 0;
    quiz?.forEach((q, i) => {
      if (answers[i] === q.correctIndex) score++;
    });

    setQuizScore(score);
    setSubmitted(true);

    await fetch("/api/academy/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masterclass_id: params.id, quiz_score: score }),
    });
    setMarkedDone(true);
  };

  const levelColors: Record<string, string> = {
    beginner: "bg-kawaii-mint/30 text-green-700 dark:text-green-300",
    intermediate: "bg-kawaii-peach/30 text-yellow-700 dark:text-yellow-300",
    advanced: "bg-kawaii-lavender/30 text-kawaii-purple",
    expert: "bg-kawaii-pink/30 text-pink-700 dark:text-pink-300",
    business: "bg-blue-200/30 text-blue-700 dark:text-blue-300",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <Link href="/academy/dashboard" className="text-sm text-kawaii-purple dark:text-kawaii-lavender hover:underline">
        ← {t("backToDashboard")}
      </Link>

      {/* Video embed */}
      {mc.video_url ? (
        <div className="aspect-video rounded-3xl overflow-hidden shadow-lg">
          <iframe
            src={mc.video_url}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="aspect-video rounded-3xl bg-gradient-to-br from-kawaii-lavender/30 to-kawaii-pink/30 flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-3">🎬</p>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t("videoComingSoon")}</p>
          </div>
        </div>
      )}

      {/* Info */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${levelColors[mc.level] ?? ""}`}>
            {mc.level.charAt(0).toUpperCase() + mc.level.slice(1)}
          </span>
          <span className="text-xs text-slate-400">⏱ {mc.duration_minutes} {t("minutes")}</span>
          {markedDone && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold">✅ {t("completed")}</span>}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100">{mc.title}</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400">{mc.description}</p>
      </div>

      {/* Mark complete */}
      {!markedDone && (
        <Button variant="primary" onClick={handleMarkComplete} disabled={saving}>
          {saving ? t("saving") + "..." : "✅ " + t("markComplete")}
        </Button>
      )}

      {/* Quiz */}
      {quiz && quiz.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">📝 {t("quiz")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {quiz.map((q, qi) => (
              <div key={qi}>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">
                  {qi + 1}. {q.question}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    let optStyle = "text-slate-700 dark:text-slate-200 hover:bg-kawaii-lavender/20";
                    if (submitted) {
                      if (oi === q.correctIndex) optStyle = "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700";
                      else if (answers[qi] === oi && oi !== q.correctIndex) optStyle = "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700";
                    } else if (answers[qi] === oi) {
                      optStyle = "bg-kawaii-lavender/30 text-kawaii-purple dark:text-kawaii-lavender border-kawaii-lavender";
                    }
                    return (
                      <button
                        key={oi}
                        onClick={() => {
                          if (submitted) return;
                          const next = [...answers];
                          next[qi] = oi;
                          setAnswers(next);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm border border-transparent transition-all ${optStyle} squishy`}
                        disabled={submitted}
                      >
                        {String.fromCharCode(65 + oi)}. {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {!submitted && (
              <Button
                variant="primary"
                onClick={handleSubmitQuiz}
                disabled={answers.some((a) => a < 0)}
              >
                📤 {t("submitQuiz")}
              </Button>
            )}

            {submitted && (
              <div className="text-center p-4 rounded-2xl bg-gradient-to-r from-kawaii-purple/10 to-kawaii-pink/10">
                <p className="text-2xl mb-1">🎉</p>
                <p className="font-extrabold text-lg text-slate-700 dark:text-slate-200">
                  {t("youScored")} {quizScore}/{quiz.length}!
                </p>
                {quizScore === quiz.length && <p className="text-sm text-green-600 dark:text-green-400 mt-1">🌟 {t("perfectScore")}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resources link */}
      <div className="text-center pt-4">
        <p className="text-sm text-slate-400">
          📚 {t("academyResourcesHint")}{" "}
          <a href={`/resources/${mc.level}/cheatsheet-${mc.level}.md`} target="_blank" className="text-kawaii-purple dark:text-kawaii-lavender underline" rel="noreferrer">
            {t("downloadCheatsheets")}
          </a>
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Link href="/academy/masterclasses">
          <Button variant="outline">📚 {t("allMasterclasses")}</Button>
        </Link>
        <Link href="/academy/dashboard">
          <Button variant="outline">📊 {t("dashboard")}</Button>
        </Link>
      </div>
    </div>
  );
}
