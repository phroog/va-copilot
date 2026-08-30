"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AcademyComingSoon() {
  return (
    <div className="relative min-h-screen bg-[#FFF0F5] dark:bg-dark-bg overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob w-96 h-96 bg-kawaii-purple top-[-10%] left-[-10%]" />
        <div className="blob w-80 h-80 bg-kawaii-pink bottom-[-10%] right-[-15%]" />
      </div>

      <div className="relative z-10 px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-10">
            <span className="text-2xl">🍠</span>
            <span className="text-xl font-extrabold bg-gradient-to-r from-sari-ube to-sari-coral bg-clip-text text-transparent">Sari</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-purple/10 text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender mb-8">
            🎓 Academy — Coming soon
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight text-slate-800 dark:text-slate-100">
            Masterclasses are{" "}
            <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">coming soon</span>
          </h1>

          <p className="mt-6 text-lg text-slate-500 dark:text-slate-400">
            When it drops, you will need <b>not one more coach</b>. Structured masterclasses,
            real-world VA skills and certificates — built into the tools you already use.
          </p>

          <Card className="mt-10 bg-white/70 dark:bg-dark-card/70 border-kawaii-lavender/30 dark:border-dark-surface">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Meanwhile, keep winning with Sari's working tools — practice interviews,
                matching jobs, scam protection and more.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/dashboard/interview">
                  <Button variant="primary">🎙️ Try the Interview Simulator</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline">Go to Dashboard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="mt-8 text-sm text-slate-400">
            🍠 Practice now · the classroom opens soon
          </p>
        </div>
      </div>
    </div>
  );
}