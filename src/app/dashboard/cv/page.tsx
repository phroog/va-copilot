"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/toast";
import { EMPTY_CV, type CvData, type CvExperience, type CvEducation, type CvLanguage } from "@/lib/cv/types";

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

const inputCls = "w-full h-10 px-3 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200";

export default function CvPage() {
  const { showToast } = useToast();
  const [cv, setCv] = useState<CvData>(EMPTY_CV);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const set = (patch: Partial<CvData>) => setCv((c) => ({ ...c, ...patch }));

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/cv");
        const data = await res.json();
        if (data.cv) {
          setCv({ ...EMPTY_CV, ...(data.cv.data || {}) });
          setFileUrl(data.cv.file_url ?? null);
          setFileName(data.cv.file_name ?? null);
        }
      } catch { showToast("Failed to load CV", "error"); } finally { setLoading(false); }

      fetch("/api/profile/public").then((r) => r.json()).then((d) => {
        if (d.profile?.username) setUsername(d.profile.username);
      }).catch(() => {});
    })();
  }, [showToast]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: cv }),
      });
      if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.error || "Failed to save"); }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      showToast(e?.message || "Failed to save CV", "error");
    } finally { setSaving(false); }
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const res = await fetch("/api/cv/pdf", { method: "POST" });
      if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.error || "PDF generation failed"); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cv.pdf";
      a.click();
      URL.revokeObjectURL(url);
      const cvUrl = res.headers.get("X-CV-URL");
      if (cvUrl) setFileUrl(decodeURIComponent(cvUrl));
    } catch (e: any) {
      showToast(e?.message || "Failed to generate PDF", "error");
    } finally { setPdfBusy(false); }
  };

  const upload = async (f: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/cv/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setFileUrl(data.url);
      setFileName(data.fileName);
      showToast("CV-Datei hochgeladen");
    } catch (e: any) {
      showToast(e?.message || "Upload failed", "error");
    } finally { setUploading(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-extrabold">📄 CV</h1>
        <Card className="animate-pulse"><CardContent className="p-6 space-y-3"><div className="h-10 w-full bg-kawaii-lavender/30 rounded-xl" /><div className="h-10 w-full bg-kawaii-lavender/30 rounded-xl" /><div className="h-24 w-full bg-kawaii-lavender/30 rounded-xl" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">📄 Mein CV</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dein CV wird automatisch in jeden generierten Pitch eingebaut und als schönes PDF exportiert.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadPdf} disabled={pdfBusy}>
            {pdfBusy ? "Generiere…" : "📥 PDF"}
          </Button>
          {username && (
            <Link href={`/va/${username}`} target="_blank">
              <Button variant="ghost" size="sm">🌐 Öffentliches Profil</Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>👤 Persönliche Daten</CardTitle>
          <CardDescription>Grunddaten, die oben auf dem CV stehen.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Vollständiger Name</Label><Input value={cv.full_name || ""} onChange={(e) => set({ full_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Titel / Headline</Label><Input value={cv.headline || ""} onChange={(e) => set({ headline: e.target.value })} placeholder="z. B. Virtual Assistant" /></div>
          <div className="space-y-1"><Label>E-Mail</Label><Input value={cv.email || ""} onChange={(e) => set({ email: e.target.value })} /></div>
          <div className="space-y-1"><Label>Telefon</Label><Input value={cv.phone || ""} onChange={(e) => set({ phone: e.target.value })} /></div>
          <div className="space-y-1"><Label>Standort</Label><Input value={cv.location || ""} onChange={(e) => set({ location: e.target.value })} /></div>
          <div className="space-y-1"><Label>Website</Label><Input value={cv.website || ""} onChange={(e) => set({ website: e.target.value })} /></div>
          <div className="space-y-1 sm:col-span-2"><Label>LinkedIn</Label><Input value={cv.linkedin || ""} onChange={(e) => set({ linkedin: e.target.value })} /></div>
          <div className="space-y-1 sm:col-span-2"><Label>Profil / Zusammenfassung</Label><Textarea rows={4} value={cv.summary || ""} onChange={(e) => set({ summary: e.target.value })} placeholder="Kurze Zusammenfassung deiner Erfahrung…" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>🎯 Fähigkeiten</CardTitle><CardDescription>Enter oder Komma fügt einen Begriff hinzu.</CardDescription></CardHeader>
        <CardContent><ChipInput values={cv.skills || []} onChange={(v) => set({ skills: v })} placeholder="Skill eingeben + Enter" /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>💼 Erfahrung</CardTitle>
          <CardDescription>Deine bisherigen Positionen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(cv.experience || []).map((exp, i) => (
            <div key={i} className="rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Position {i + 1}</span>
                <button type="button" onClick={() => set({ experience: (cv.experience || []).filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500 text-sm">🗑️</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="Rolle" value={exp.role || ""} onChange={(e) => { const a = [...(cv.experience || [])]; a[i] = { ...exp, role: e.target.value }; set({ experience: a }); }} />
                <Input placeholder="Firma" value={exp.company || ""} onChange={(e) => { const a = [...(cv.experience || [])]; a[i] = { ...exp, company: e.target.value }; set({ experience: a }); }} />
                <Input placeholder="Start (z. B. 2021)" value={exp.start || ""} onChange={(e) => { const a = [...(cv.experience || [])]; a[i] = { ...exp, start: e.target.value }; set({ experience: a }); }} />
                <Input placeholder="Ende (z. B. 2024)" value={exp.end || ""} onChange={(e) => { const a = [...(cv.experience || [])]; a[i] = { ...exp, end: e.target.value }; set({ experience: a }); }} />
              </div>
              <ChipInput
                values={exp.bullets || []}
                onChange={(v) => { const a = [...(cv.experience || [])]; a[i] = { ...exp, bullets: v }; set({ experience: a }); }}
                placeholder="Aufgabe/Bullet + Enter"
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set({ experience: [...(cv.experience || []), { role: "", company: "", bullets: [] } as CvExperience] })}>➕ Erfahrung hinzufügen</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>🎓 Ausbildung</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(cv.education || []).map((ed, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_auto] gap-2 items-center">
              <Input placeholder="Abschluss" value={ed.degree || ""} onChange={(e) => { const a = [...(cv.education || [])]; a[i] = { ...ed, degree: e.target.value }; set({ education: a }); }} />
              <Input placeholder="Schule/Uni" value={ed.school || ""} onChange={(e) => { const a = [...(cv.education || [])]; a[i] = { ...ed, school: e.target.value }; set({ education: a }); }} />
              <Input placeholder="Jahr" value={ed.year || ""} onChange={(e) => { const a = [...(cv.education || [])]; a[i] = { ...ed, year: e.target.value }; set({ education: a }); }} />
              <button type="button" onClick={() => set({ education: (cv.education || []).filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500">🗑️</button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set({ education: [...(cv.education || []), { degree: "", school: "" } as CvEducation] })}>➕ Ausbildung hinzufügen</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>📜 Zertifikate</CardTitle></CardHeader>
        <CardContent><ChipInput values={cv.certifications || []} onChange={(v) => set({ certifications: v })} placeholder="Zertifikat + Enter" /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>🗣️ Sprachen</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(cv.languages || []).map((l, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <Input placeholder="Sprache" value={l.name || ""} onChange={(e) => { const a = [...(cv.languages || [])]; a[i] = { ...l, name: e.target.value }; set({ languages: a }); }} />
              <Input placeholder="Niveau" value={l.level || ""} onChange={(e) => { const a = [...(cv.languages || [])]; a[i] = { ...l, level: e.target.value }; set({ languages: a }); }} />
              <button type="button" onClick={() => set({ languages: (cv.languages || []).filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500">🗑️</button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set({ languages: [...(cv.languages || []), { name: "" } as CvLanguage] })}>➕ Sprache hinzufügen</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📎 CV-Datei hochladen</CardTitle>
          <CardDescription>Falls du bereits eine fertige CV-Datei hast (PDF/PNG/JPG/DOCX/TXT).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
            className="text-sm text-slate-500 dark:text-slate-400"
          />
          {uploading && <p className="text-xs text-slate-400 animate-pulse">Lädt hoch…</p>}
          {fileUrl && (
            <div className="flex items-center gap-2 text-sm">
              <span>📄 {fileName || "CV-Datei"}:</span>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-kawaii-purple underline">Öffnen</a>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pb-8">
        <Button onClick={save} disabled={saving}>{saving ? "Speichere…" : "💾 CV Speichern"}</Button>
        {saved && <span className="text-sm text-green-500 animate-fade-in">✅ Gespeichert!</span>}
      </div>
    </div>
  );
}