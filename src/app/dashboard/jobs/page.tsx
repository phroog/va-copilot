"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Tab = "url" | "manual" | "screenshot";

interface Job {
  id: string;
  title: string;
  platform: string;
  budget: string;
  description: string;
  url: string;
  created_at: string;
}

interface ImportedJob {
  title: string;
  description: string;
  budget: string;
  platform: string;
  url: string;
}

function platformOptions(t: (k: string) => string) {
  return [
    { value: "Upwork", label: t("upwork") },
    { value: "OnlineJobs.ph", label: t("onlinejobsPh") },
    { value: "Facebook", label: t("facebook") },
    { value: "LinkedIn", label: t("linkedin") },
    { value: "Other", label: t("other") },
  ];
}

export default function JobsPage() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [pitchResult, setPitchResult] = useState<string | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [pitchDialogOpen, setPitchDialogOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("url");

  // URL import state
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importedJob, setImportedJob] = useState<ImportedJob | null>(null);
  const [savingImport, setSavingImport] = useState(false);

  // Manual form state
  const [manualTitle, setManualTitle] = useState("");
  const [manualPlatform, setManualPlatform] = useState("Upwork");
  const [manualDesc, setManualDesc] = useState("");
  const [manualBudget, setManualBudget] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState("");

  // Screenshot state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extractedJob, setExtractedJob] = useState<ImportedJob | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [savingExtracted, setSavingExtracted] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  // --- URL tab ---

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError("");
    setImportedJob(null);
    try {
      const res = await fetch("/api/import-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Import failed");
      } else {
        setImportedJob(data);
      }
    } catch {
      setImportError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const handleSaveImported = async () => {
    if (!importedJob) return;
    setSavingImport(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importedJob),
      });
      const data = await res.json();
      if (data.job) {
        setJobs((prev) => [data.job, ...prev]);
        setImportedJob(null);
        setImportUrl("");
        showToast(t("jobSavedSuccess"));
      }
    } catch {
    } finally {
      setSavingImport(false);
    }
  };

  // --- Manual tab ---

  const handleSaveManual = async () => {
    if (!manualTitle.trim()) {
      setManualError("Job title is required");
      return;
    }
    setManualSaving(true);
    setManualError("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle.trim(),
          platform: manualPlatform,
          description: manualDesc.trim(),
          budget: manualBudget.trim(),
          url: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setManualError(data.error ?? "Failed to save job");
        return;
      }
      if (data.job) {
        setJobs((prev) => [data.job, ...prev]);
        setManualTitle("");
        setManualPlatform("Upwork");
        setManualDesc("");
        setManualBudget("");
        showToast(t("jobSavedSuccess"));
      }
    } catch {
      setManualError("Network error. Please try again.");
    } finally {
      setManualSaving(false);
    }
  };

  // --- Screenshot tab ---

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setExtractError("Please select a PNG or JPG image");
      return;
    }
    setExtractError("");
    setExtractedJob(null);
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file ?? null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleExtract = async () => {
    if (!screenshotFile) return;
    setExtracting(true);
    setExtractError("");
    setExtractedJob(null);
    try {
      const formData = new FormData();
      formData.append("screenshot", screenshotFile);
      const res = await fetch("/api/import-job/screenshot", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error ?? t("extractionFailed"));
        return;
      }
      if (data.success && data.data) {
        setExtractedJob({
          title: data.data.title ?? "",
          platform: data.data.platform ?? "",
          description: data.data.description ?? "",
          budget: data.data.budget ?? "",
          url: "",
        });
      }
    } catch {
      setExtractError(t("extractionFailed"));
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveExtracted = async () => {
    if (!extractedJob) return;
    setSavingExtracted(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extractedJob),
      });
      const data = await res.json();
      if (data.job) {
        setJobs((prev) => [data.job, ...prev]);
        setExtractedJob(null);
        setScreenshotFile(null);
        setScreenshotPreview(null);
        showToast(t("jobSavedSuccess"));
      }
    } catch {
    } finally {
      setSavingExtracted(false);
    }
  };

  const discardExtracted = () => {
    setExtractedJob(null);
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  // --- Delete Job ---
  const deleteJob = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== id));
        showToast("Job deleted");
      }
    } catch {}
  };

  // --- Pitch ---

  const generatePitch = async (jobId: string, title: string) => {
    setGenerating(jobId);
    try {
      const res = await fetch("/api/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, jobTitle: title }),
      });
      const data = await res.json();
      if (data.pitch) {
        setPitchResult(data.pitch);
        setPitchDialogOpen(true);
      }
    } catch {
    } finally {
      setGenerating(null);
    }
  };

  const polishText = async () => {
    if (!pitchResult) return;
    setPolishing(true);
    try {
      const res = await fetch("/api/polish-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pitchResult }),
      });
      const data = await res.json();
      if (data.polished) setPitchResult(data.polished);
    } catch {
    } finally {
      setPolishing(false);
    }
  };

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.platform.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "url", label: t("importFromUrl"), icon: "🔗" },
    { key: "manual", label: t("manualCreate"), icon: "✍️" },
    { key: "screenshot", label: t("importFromScreenshot"), icon: "📸" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-extrabold">💼 {t("jobs")}</h1>
        <Input
          placeholder="🔍 Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all squishy ${
              activeTab === tab.key
                ? "bg-kawaii-purple text-white shadow-lg shadow-kawaii-purple/30"
                : "bg-white/80 dark:bg-dark-card text-slate-600 dark:text-slate-300 border-2 border-kawaii-lavender/30 dark:border-dark-surface hover:border-kawaii-purple/50"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Import Card */}
      <Card className="border-kawaii-purple/20 dark:border-kawaii-purple/30 bg-gradient-to-r from-kawaii-lavender/10 to-kawaii-pink/5 dark:from-dark-surface/30 dark:to-dark-surface/10">
        <CardContent className="p-4 sm:p-6">
          {/* URL Tab */}
          {activeTab === "url" && (
            <div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1 w-full">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-1.5">
                    🔗 {t("importJobLabel")}
                  </Label>
                  <Input
                    placeholder={t("importJobPlaceholder")}
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleImport()}
                    className="w-full"
                  />
                  <p className="text-xs text-amber-500 dark:text-amber-400 mt-1 flex items-center gap-1">
                    ⚠️ {t("importExperimental")}
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={handleImport}
                  disabled={importing || !importUrl.trim()}
                  className="shrink-0"
                >
                  {importing ? "⏳ Importing..." : "📋 Import"}
                </Button>
              </div>
              {importError && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                  <span>⚠️</span> {importError}
                </p>
              )}
              {importedJob && (
                <div className="mt-4 p-4 bg-white dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface rounded-2xl animate-slide-up">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">
                        {importedJob.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {importedJob.platform}
                        </Badge>
                        {importedJob.budget && (
                          <Badge variant="secondary" className="text-xs">
                            💰 {importedJob.budget}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">
                        {importedJob.description?.slice(0, 500)}
                        {importedJob.description?.length > 500 ? "..." : ""}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="primary" onClick={handleSaveImported} disabled={savingImport}>
                          {savingImport ? "Saving..." : "💾 " + t("saveJob")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setImportedJob(null)}>
                          {t("discard")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Tab */}
          {activeTab === "manual" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">
                    📝 {t("jobTitle")} <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    placeholder="Senior React Developer"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">
                    🌐 {t("platform")}
                  </Label>
                  <select
                    value={manualPlatform}
                    onChange={(e) => setManualPlatform(e.target.value)}
                    className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2.5 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple focus-visible:ring-offset-2"
                  >
                    {platformOptions(t).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">
                    💰 {t("budget")}
                  </Label>
                  <Input
                    placeholder="$50/hr or Fixed: $500"
                    value={manualBudget}
                    onChange={(e) => setManualBudget(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">
                  📄 {t("description")}
                </Label>
                <Textarea
                  placeholder="Job description..."
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  rows={3}
                />
              </div>
              {manualError && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span>⚠️</span> {manualError}
                </p>
              )}
              <Button
                variant="primary"
                onClick={handleSaveManual}
                disabled={manualSaving || !manualTitle.trim()}
              >
                {manualSaving ? "⏳ Saving..." : "💾 " + t("saveJob")}
              </Button>
            </div>
          )}

          {/* Screenshot Tab */}
          {activeTab === "screenshot" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                📸 {t("screenshotTabDesc")}
              </p>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-kawaii-purple bg-kawaii-lavender/20 dark:bg-kawaii-purple/20"
                    : "border-kawaii-lavender/40 dark:border-dark-surface bg-white/50 dark:bg-dark-card/50 hover:border-kawaii-purple/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
                {screenshotPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={screenshotPreview}
                      alt="Preview"
                      className="max-h-40 rounded-xl shadow-sm object-contain"
                    />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {screenshotFile?.name}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-4xl mb-2">📸</p>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {t("dropZoneText")}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{t("dropZoneHint")}</p>
                  </div>
                )}
              </div>

              {extractError && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span>⚠️</span> {extractError}
                </p>
              )}

              <Button
                variant="primary"
                onClick={handleExtract}
                disabled={!screenshotFile || extracting}
              >
                {extracting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("extracting")}
                  </span>
                ) : (
                  "🔍 " + t("extractJobDetails")
                )}
              </Button>

              {/* Extracted preview */}
              {extractedJob && (
                <div className="p-4 bg-white dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface rounded-2xl animate-slide-up">
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <span>✨</span> {t("extractedData")}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-500">{t("jobTitle")}</Label>
                      <Input
                        value={extractedJob.title}
                        onChange={(e) => setExtractedJob({ ...extractedJob, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">{t("platform")}</Label>
                      <Input
                        value={extractedJob.platform}
                        onChange={(e) => setExtractedJob({ ...extractedJob, platform: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">{t("budget")}</Label>
                      <Input
                        value={extractedJob.budget}
                        onChange={(e) => setExtractedJob({ ...extractedJob, budget: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">{t("description")}</Label>
                      <Textarea
                        value={extractedJob.description}
                        onChange={(e) => setExtractedJob({ ...extractedJob, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleSaveExtracted}
                        disabled={savingExtracted}
                      >
                        {savingExtracted ? "⏳ Saving..." : "💾 " + t("saveJob")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={discardExtracted}>
                        {t("discard")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jobs List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-5 w-3/4 bg-kawaii-lavender/30 rounded-full mb-3" />
                <div className="h-4 w-1/2 bg-kawaii-lavender/20 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-slate-400">{t("noJobsYet")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((job) => (
                <JobCard
                  job={job}
                  generating={generating}
                  generatePitch={generatePitch}
                  deleteJob={deleteJob}
                  t={t}
                />
          ))}
        </div>
      )}

      {/* Pitch Dialog */}
      <Dialog open={pitchDialogOpen} onOpenChange={setPitchDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🚀 Generated Pitch</DialogTitle>
            <DialogDescription>AI-crafted pitch for this job</DialogDescription>
          </DialogHeader>
          <div className="bg-kawaii-lavender/10 dark:bg-dark-surface/50 rounded-2xl p-4 mt-2">
            <p className="text-sm whitespace-pre-wrap">{pitchResult}</p>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={polishText}
              disabled={polishing}
            >
              {polishing ? "Polishing..." : "✨ Polish English"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (pitchResult) navigator.clipboard.writeText(pitchResult);
              }}
            >
              📋 Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobCard({ job, generating, generatePitch, deleteJob, t }: { job: any; generating: string | null; generatePitch: (id: string, title: string) => void; deleteJob: (id: string, title: string) => void; t: any }) {
  const [portalOpen, setPortalOpen] = useState(false);
  const [tokenLink, setTokenLink] = useState("");
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateToken = async () => {
    setGeneratingToken(true);
    try {
      const res = await fetch("/api/client-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id }),
      });
      const data = await res.json();
      if (data.token) {
        setTokenLink(`${window.location.origin}/portal/${data.token.token}`);
      }
    } catch {} finally { setGeneratingToken(false); }
  };

  return (
    <Card key={job.id}>
      <CardHeader>
        <CardTitle className="text-lg">{job.title}</CardTitle>
        <p className="text-sm text-kawaii-purple dark:text-kawaii-lavender font-medium">
          {job.platform} — {job.budget}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
          {job.description}
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" variant="primary" onClick={() => generatePitch(job.id, job.title)} disabled={generating === job.id}>
            {generating === job.id ? "Generating..." : "🚀 Generate Pitch"}
          </Button>
          {job.url && (
            <Button size="sm" variant="outline" asChild>
              <a href={job.url} target="_blank" rel="noopener noreferrer">View Job ↗</a>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setPortalOpen(!portalOpen)}>
            🔗 {t("clientPortal")}
          </Button>
          <button onClick={() => deleteJob(job.id, job.title)} className="ml-auto text-slate-400 hover:text-red-500 transition-colors squishy" title="Delete job">
            🗑️
          </button>
        </div>

        {portalOpen && (
          <div className="mt-4 p-4 bg-white dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface rounded-2xl animate-slide-up">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">🔗 {t("clientPortal")}</p>
            <p className="text-xs text-slate-500 mb-3">{t("clientPortalDesc")}</p>
            {tokenLink ? (
              <div className="flex items-center gap-2">
                <Input value={tokenLink} readOnly className="text-sm font-mono" />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(tokenLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? "✅" : "📋"}
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="primary" onClick={generateToken} disabled={generatingToken}>
                {generatingToken ? "Generating..." : "🔗 " + t("generateLink")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
