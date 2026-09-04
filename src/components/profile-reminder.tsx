"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* Gentle nudge: if the matching profile is still incomplete (no skills or a
   neutral/default job vector), remind the user to finish it so matches actually
   fit them. Appears in the dashboard until the profile is complete. */

export default function ProfileReminder() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const { profile } = await res.json();
        const skills = Array.isArray(profile?.skills) ? profile.skills : [];
        const vec = Array.isArray(profile?.job_vector) ? profile.job_vector : null;
        const neutral = !vec || vec.every((n: number) => n === 3);
        if (active && (skills.length === 0 || neutral)) setShow(true);
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  if (!show) return null;

  return (
    <div className="mb-4 rounded-2xl border-2 border-kawaii-purple/40 dark:border-kawaii-lavender/40 bg-gradient-to-r from-kawaii-purple/10 to-kawaii-pink/10 dark:from-kawaii-purple/15 dark:to-kawaii-pink/10 px-4 py-3 flex items-center gap-3">
      <span className="text-2xl shrink-0">🎯</span>
      <p className="text-sm text-slate-600 dark:text-slate-300 flex-1">
        <b>Your job matches are only as good as your profile.</b> Add your skills and job
        profile so Sari finds jobs that actually fit you.
      </p>
      <Link
        href="/dashboard/settings"
        className="shrink-0 px-4 py-2 rounded-xl bg-kawaii-purple text-white text-xs font-bold hover:opacity-90"
      >
        Complete it →
      </Link>
    </div>
  );
}