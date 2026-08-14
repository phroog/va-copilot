"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScamGauge } from "@/components/scam-gauge";

interface ClientLink {
  id: string;
  user_id: string;
  job_id: string | null;
  client_name: string;
  title: string;
  url: string;
  link_type: string;
  created_at: string;
}

interface Job {
  id: string;
  title: string;
  client_name?: string;
}

const LINK_TYPE_ICONS: Record<string, string> = {
  website: "🌐",
  project: "📋",
  communication: "💬",
  other: "🔗",
};

const LINK_TYPES = [
  { value: "website", label: "Website" },
  { value: "project", label: "Project" },
  { value: "communication", label: "Communication" },
  { value: "other", label: "Other" },
];

export default function ClientsPage() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [links, setLinks] = useState<ClientLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scamChecking, setScamChecking] = useState<string | null>(null);
  const [scamResult, setScamResult] = useState<{ score: number; analysis: string } | null>(null);

  // Form state
  const [formClientName, setFormClientName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formLinkType, setFormLinkType] = useState("other");
  const [formJobId, setFormJobId] = useState("");

  useEffect(() => {
    // Prefill client name from ?name= (e.g. "Client anlegen" from a job).
    try {
      const name = new URLSearchParams(window.location.search).get("name");
      if (name) setFormClientName(name);
    } catch {}
    fetchLinks();
    fetch("/api/jobs").then(r => r.json()).then(d => setJobs(d.jobs || [])).catch(() => showToast("Failed to load jobs", "error"));
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/client-links");
      const data = await res.json();
      setLinks(data.links || []);
    } catch (e) {
      showToast((e as any)?.message ?? "Failed to load client links", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formClientName.trim() || !formTitle.trim() || !formUrl.trim()) {
      showToast("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/client-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: formClientName.trim(),
          title: formTitle.trim(),
          url: formUrl.trim(),
          link_type: formLinkType,
          job_id: formJobId || null,
        }),
      });
      const data = await res.json();
      if (data.link) {
        setLinks(prev => [data.link, ...prev]);
        setDialogOpen(false);
        resetForm();
        showToast("Link added!");
      }
    } catch {
      showToast("Failed to add link");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    try {
      await fetch(`/api/client-links/${id}`, { method: "DELETE" });
      setLinks(prev => prev.filter(l => l.id !== id));
      showToast("Link deleted");
    } catch {
      showToast("Failed to delete");
    }
  };

  const handleScamCheck = async (clientName: string, url: string) => {
    setScamChecking(clientName);
    try {
      const res = await fetch("/api/ai/scam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: clientName, website_url: url }),
      });
      const data = await res.json();
      if (res.status === 402) {
        showToast(data.error || "Insufficient credits");
        return;
      }
      setScamResult(data);
    } catch {
      showToast("Scam check failed");
    } finally {
      setScamChecking(null);
    }
  };

  const resetForm = () => {
    setFormClientName("");
    setFormTitle("");
    setFormUrl("");
    setFormLinkType("other");
    setFormJobId("");
  };

  const filtered = links.filter(l =>
    l.client_name.toLowerCase().includes(search.toLowerCase()) ||
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, ClientLink[]> = {};
  filtered.forEach(l => {
    if (!grouped[l.client_name]) grouped[l.client_name] = [];
    grouped[l.client_name].push(l);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-extrabold">📇 {t("clients")}</h1>
        <div className="flex gap-2">
          <Input
            placeholder="🔍 Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button variant="primary" onClick={() => { resetForm(); setDialogOpen(true); }}>
            ➕ {t("addLink")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-5 w-3/4 bg-kawaii-lavender/30 rounded-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-4xl mb-3">📇</p>
            <p className="text-slate-400">{t("noClientLinks")}</p>
            <Button variant="primary" className="mt-4" onClick={() => setDialogOpen(true)}>
              ➕ {t("addLink")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([clientName, clientLinks]) => (
            <Card key={clientName}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-extrabold flex items-center gap-2">
                  👤 {clientName}
                  <span className="text-xs text-slate-400 font-normal">({clientLinks.length} links)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {clientLinks.map(link => (
                    <div key={link.id} className="relative group">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-kawaii-lavender/30 dark:bg-dark-surface text-slate-700 dark:text-slate-200 hover:bg-kawaii-lavender/50 dark:hover:bg-kawaii-purple/30 transition-all squishy"
                      >
                        {LINK_TYPE_ICONS[link.link_type] || "🔗"} {link.title}
                      </a>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-400 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity squishy"
                      >
                        ✕
                      </button>
                      {link.link_type === "website" && (
                        <button
                          onClick={() => handleScamCheck(clientName, link.url)}
                          disabled={scamChecking === clientName}
                          className="ml-1 text-xs text-kawaii-purple hover:text-kawaii-coral transition-colors squishy"
                          title="Scam Check"
                        >
                          {scamChecking === clientName ? "⏳" : "🕵️"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Link Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>➕ {t("addLink")}</DialogTitle>
            <DialogDescription>{t("addLinkDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-semibold">{t("clientName")} *</Label>
              <Input
                placeholder="Acme Corp"
                value={formClientName}
                onChange={(e) => setFormClientName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">{t("title")} *</Label>
              <Input
                placeholder="Trello Board"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">URL *</Label>
              <Input
                placeholder="https://..."
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">{t("linkType")}</Label>
              <select
                value={formLinkType}
                onChange={(e) => setFormLinkType(e.target.value)}
                className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2.5 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
              >
                {LINK_TYPES.map(lt => (
                  <option key={lt.value} value={lt.value}>{LINK_TYPE_ICONS[lt.value]} {lt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-semibold">{t("linkJob")}</Label>
              <select
                value={formJobId}
                onChange={(e) => setFormJobId(e.target.value)}
                className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2.5 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
              >
                <option value="">-- {t("none")} --</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}{j.client_name ? ` (${j.client_name})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
              <Button variant="primary" onClick={handleAdd} disabled={saving}>
                {saving ? "⏳..." : "💾 " + t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scam Check Result Dialog */}
      <Dialog open={!!scamResult} onOpenChange={() => setScamResult(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>🕵️ {t("scamCheck")}</DialogTitle>
          </DialogHeader>
          {scamResult && (
            <div className="flex flex-col items-center gap-4 py-4">
              <ScamGauge score={scamResult.score} />
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">{scamResult.analysis}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
