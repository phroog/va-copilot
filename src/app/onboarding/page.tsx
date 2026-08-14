"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/toast";

const VECTOR_AXES = [
  { key: "erfahrung", label: "Erfahrung", opts: ["Anfänger", "Grundkenntnisse", "Erfahren (2–4 J)", "Fortgeschritten", "Experte (5+ J)"] },
  { key: "technik", label: "Technik", opts: ["Reine Admin/VA", "Büro/Support", "Social Media/Content", "Tools (Excel/WordPress/Video)", "Dev/Data/Engineering"] },
  { key: "kundenkontakt", label: "Kundenkontakt", opts: ["Backoffice/Daten", "E-Mail/Inbox", "Allg. Admin/Chat", "Support/Rezeption", "Telefon/Verkauf"] },
  { key: "auslastung", label: "Auslastung", opts: ["Einmal-Gig", "Wenige Std", "Teilzeit", "~30 Std", "Fulltime"] },
  { key: "budget", label: "Budget", opts: ["< 5$/h · < 200$ fest", "< 15$/h", "< 25$/h", "< 45$/h", "45$+/h · Premium"] },
];

function ChipInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (v && !(values || []).includes(v)) onChange([...(values || []), v]);
    setText("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1">
        {(values || []).map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface text-slate-700 dark:text-slate-200">
            {v}
            <button type="button" onClick={() => onChange((values || []).filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
      />
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [jobVector, setJobVector] = useState<number[]>([3, 3, 3, 3, 3]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          if (res.status === 401) { router.replace("/auth/login?returnUrl=/onboarding"); return; }
          setLoading(false);
          return;
        }
        const { profile } = await res.json();
        const hasSkills = Array.isArray(profile?.skills) && profile.skills.length > 0;
        const hasVector = Array.isArray(profile?.job_vector) && profile.job_vector.length === 5;
        // Already set up -> straight to the dashboard.
        if (hasSkills && hasVector) {
          router.replace("/dashboard");
          return;
        }
        if (Array.isArray(profile?.skills)) setSkills(profile.skills);
        if (hasVector) setJobVector(profile.job_vector);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  }, [router]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, job_vector: jobVector }),
      });
      if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.error || "Speichern fehlgeschlagen"); }
      showToast("Profil gespeichert 🎉");
      router.replace("/dashboard");
    } catch (e: any) {
      showToast(e?.message || "Speichern fehlgeschlagen", "error");
    } finally {
      setSaving(false);
    }
  };

  const canSave = skills.length >= 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Lade Profil…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">👋 Willkommen bei Sari</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Ein kurzer Schritt, damit wir die besten Jobs für dich finden.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-base">🎯 Deine Fähigkeiten</Label>
              <ChipInput values={skills} onChange={setSkills} placeholder="Fähigkeit eingeben + Enter (z. B. Email Management, Data Entry)" />
              <p className="text-xs text-slate-400">Gibt an, worauf die Jobs gematcht werden.</p>
            </div>

            <div className="space-y-3 pt-1">
              <Label className="text-base">📊 Dein Job-Profil (1–5)</Label>
              <p className="text-xs text-slate-400 -mt-2">
                Wir teilen Jobs nach demselben Muster ein — je näher deine Zahlen, desto besser der Match.
              </p>
              {VECTOR_AXES.map((ax, i) => (
                <div key={ax.key} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm flex-1">{ax.label}</Label>
                    <select
                      value={jobVector[i] ?? 3}
                      onChange={(e) => {
                        const arr = [...jobVector];
                        arr[i] = parseInt(e.target.value, 10);
                        setJobVector(arr);
                      }}
                      className="w-40 h-10 px-2 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n} · {ax.opts[n - 1]}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    1 = {ax.opts[0]} · 3 = {ax.opts[2]} · 5 = {ax.opts[4]}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={save} disabled={saving || !canSave} className="w-full">
                {saving ? "Speichere…" : "🚀 Loslegen"}
              </Button>
              <Button variant="ghost" onClick={() => router.replace("/dashboard")}>Überspringen</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}