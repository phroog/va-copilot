"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/toast";
import { Textarea } from "@/components/ui/textarea";

interface Profile {
  full_name: string;
  desired_rate: string;
  bio: string;
  inbox_email_alias: string;
  business_name: string;
  business_address: string;
  business_email: string;
  bank_account: string;
  tax_id: string;
  public_id: string;
  skills?: string[];
  experience_level?: string;
  job_categories?: string[];
  job_vector?: number[];
}

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

interface PublicProfile {
  username: string;
  display_name: string;
  bio: string;
  skills: string;
  photo_url: string;
}

export default function SettingsPage() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile>({ full_name: "", desired_rate: "", bio: "", inbox_email_alias: "", business_name: "", business_address: "", business_email: "", bank_account: "", tax_id: "", public_id: "", skills: [], experience_level: "beginner", job_categories: [], job_vector: [3, 3, 3, 3, 3] });
  const [publicProfile, setPublicProfile] = useState<PublicProfile>({ username: "", display_name: "", bio: "", skills: "", photo_url: "" });
  const [pubSaving, setPubSaving] = useState(false);
  const [pubSaved, setPubSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hourly rate settings
  const [defaultRate, setDefaultRate] = useState("0");
  const [rateSaving, setRateSaving] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);

  // Agency visibility (paid plan later)
  const [agencyEnabled, setAgencyEnabled] = useState(false);

  // Google Calendar integration
  const [hasGoogleCal, setHasGoogleCal] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(true);

  // Backup
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/user-settings").then((r) => r.json()),
      fetch("/api/profile/public").then((r) => r.json()),
      fetch("/api/user-integrations").then((r) => r.json()),
    ])
      .then(([profileData, settingsData, pubData, integData]) => {
        if (profileData.profile) {
          const p = profileData.profile;
          if (!Array.isArray(p.job_vector) || p.job_vector.length !== 5) p.job_vector = [3, 3, 3, 3, 3];
          setProfile(p);
        }
        if (settingsData.settings) {
          setDefaultRate(String(settingsData.settings.default_hourly_rate ?? "0"));
          setAgencyEnabled(settingsData.settings.agency_enabled === true);
        }
        if (pubData.profile) setPublicProfile(pubData.profile);
        const gcal = (integData.integrations ?? []).find((i: any) => i.provider === "google_calendar");
        setHasGoogleCal(!!gcal);
      })
      .catch(() => showToast("Failed to load settings", "error"))
      .finally(() => {
        setLoading(false);
        setCheckingGoogle(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to save profile");
      }
      const d = await res.json();
      if (d.profile) {
        const p = d.profile;
        if (!Array.isArray(p.job_vector) || p.job_vector.length !== 5) p.job_vector = [3, 3, 3, 3, 3];
        setProfile(p);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      showToast((e as any)?.message ?? "Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveRate = async () => {
    setRateSaving(true);
    try {
      await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_hourly_rate: parseFloat(defaultRate) || 0 }),
      });
      setRateSaved(true);
      setTimeout(() => setRateSaved(false), 2000);
    } catch (e) {
      showToast((e as any)?.message ?? "Failed to save rate", "error");
    } finally {
      setRateSaving(false);
    }
  };

  const copyAlias = () => {
    if (profile.inbox_email_alias) {
      const fullEmail = `user+${profile.inbox_email_alias}@parse.va-copilot.com`;
      navigator.clipboard.writeText(fullEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch("/api/backup/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sari-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Backup failed", "error");
    } finally {
      setBackingUp(false);
    }
  };

  const connectGoogleCalendar = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      showToast("Google OAuth not configured. Set NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID env var.", "error");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = "https://www.googleapis.com/auth/calendar.events";
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=google_calendar`;
    window.location.href = url;
  };

  const disconnectGoogleCalendar = async () => {
    await fetch("/api/user-integrations?provider=google_calendar", { method: "DELETE" });
    setHasGoogleCal(false);
    showToast("Google Calendar disconnected");
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-extrabold">⚙️ {t("settings")}</h1>
        <Card className="animate-pulse">
          <CardContent className="p-6 space-y-4">
            <div className="h-10 w-full bg-kawaii-lavender/30 rounded-xl" />
            <div className="h-10 w-full bg-kawaii-lavender/30 rounded-xl" />
            <div className="h-20 w-full bg-kawaii-lavender/30 rounded-xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const inboxEmail = profile.inbox_email_alias
    ? `user+${profile.inbox_email_alias}@parse.va-copilot.com`
    : "";

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-3xl font-extrabold">⚙️ {t("settings")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">👤 Profile</CardTitle>
          <CardDescription>Update your freelancer profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Desired Rate</Label>
            <Input id="rate" value={profile.desired_rate} onChange={(e) => setProfile({ ...profile, desired_rate: e.target.value })} placeholder="e.g. $50/hr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell potential clients about yourself..." rows={4} />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save Profile"}</Button>
            {saved && <span className="text-sm text-green-500 animate-fade-in">✅ Saved!</span>}
          </div>
        </CardContent>
      </Card>

      {/* Job Matching Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🎯 Job Matching Profile</CardTitle>
          <CardDescription>Set up your skills and preferences for the extension's job matching score.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Skills</Label>
            <ChipInput
              values={profile.skills || []}
              onChange={(v) => setProfile({ ...profile, skills: v })}
              placeholder="Skill eingeben + Enter oder Komma"
            />
            <p className="text-xs text-slate-400">Used to match job descriptions against your skill set.</p>
          </div>
          <div className="space-y-2">
            <Label>Experience Level</Label>
            <select
              value={profile.experience_level || "beginner"}
              onChange={(e) => setProfile({ ...profile, experience_level: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Job Categories</Label>
            <ChipInput
              values={profile.job_categories || []}
              onChange={(v) => setProfile({ ...profile, job_categories: v })}
              placeholder="Kategorie eingeben + Enter oder Komma"
            />
            <p className="text-xs text-slate-400">Categories help match jobs to your preferred work areas.</p>
          </div>
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-400">
              <strong>5-Achsen-Profil (1–5):</strong> Jobs werden beim Einsammeln nach demselben Muster eingeteilt.
              Je näher deine Zahlen an denen des Jobs liegen, desto höher der Match im Live-Feed.
            </p>
            {VECTOR_AXES.map((ax, i) => (
              <div key={ax.key} className="space-y-1">
                <div className="flex items-center gap-3">
                  <Label className="text-sm flex-1">{ax.label}</Label>
                  <select
                    value={(profile.job_vector || [3, 3, 3, 3, 3])[i] ?? 3}
                    onChange={(e) => {
                      const arr = [...(profile.job_vector || [3, 3, 3, 3, 3])];
                      arr[i] = parseInt(e.target.value, 10);
                      setProfile({ ...profile, job_vector: arr });
                    }}
                    className="w-40 h-10 px-2 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} · {ax.opts[n - 1]}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  1 = {ax.opts[0]} · 2 = {ax.opts[1]} · 3 = {ax.opts[2]} · 4 = {ax.opts[3]} · 5 = {ax.opts[4]}
                </p>
              </div>
            ))}
            <p className="text-xs text-slate-400">
              Dein Vektor: <strong>[{(profile.job_vector || [3, 3, 3, 3, 3]).join(" ")}]</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save Matching Profile"}</Button>
            {saved && <span className="text-sm text-green-500 animate-fade-in">✅ Saved!</span>}
          </div>
        </CardContent>
      </Card>

      {/* Public ID */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🆔 Your Public ID</CardTitle>
          <CardDescription>Share this ID so agency admins can find and invite you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.public_id ? (
            <div className="flex items-center gap-2">
              <Input value={profile.public_id} readOnly className="font-mono text-sm bg-kawaii-lavender/10 dark:bg-dark-surface/50 max-w-xs" />
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(profile.public_id); showToast("Copied!"); }}>
                📋 Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={async () => {
                const newId = window.prompt("Enter your new Public ID (letters, numbers, underscores only):", profile.public_id);
                if (!newId || newId === profile.public_id) return;
                const res = await fetch("/api/profile", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...profile, public_id: newId }),
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.profile) setProfile(data.profile);
                  showToast("Public ID updated!");
                } else {
                  const err = await res.json();
                  showToast(err.error || "Failed to update", "error");
                }
              }}>
                ✏️ Edit
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Loading...</p>
          )}
          <p className="text-xs text-slate-400">
            Your unique tag: <strong>@{profile.public_id || "..."}</strong>. Give this to agency admins so they can find you instantly.
          </p>
        </CardContent>
      </Card>

      {/* Public Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🌐 {t("publicProfile")}</CardTitle>
          <CardDescription>{t("publicProfileDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Username *</Label>
            <Input value={publicProfile.username} onChange={(e) => setPublicProfile({ ...publicProfile, username: e.target.value })} placeholder="your-vaname" />
            <p className="text-xs text-slate-400">Letters, numbers, underscores only. This is your public URL: <strong>sari.ai/va/{publicProfile.username || "..."}</strong></p>
          </div>
          <div className="space-y-2">
            <Label>{t("displayName")}</Label>
            <Input value={publicProfile.display_name} onChange={(e) => setPublicProfile({ ...publicProfile, display_name: e.target.value })} placeholder="Your VA Name" />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={publicProfile.bio} onChange={(e) => setPublicProfile({ ...publicProfile, bio: e.target.value })} placeholder="Tell potential clients about yourself..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>{t("skills")}</Label>
            <Input value={publicProfile.skills} onChange={(e) => setPublicProfile({ ...publicProfile, skills: e.target.value })} placeholder="e.g. Admin Support, Social Media, Email Management" />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={async () => {
              setPubSaving(true);
              try {
                const res = await fetch("/api/profile/public", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(publicProfile),
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.profile) setPublicProfile(data.profile);
                  setPubSaved(true);
                  setTimeout(() => setPubSaved(false), 2000);
                } else {
                  const err = await res.json();
                  showToast(err.error || "Failed to save", "error");
                }
              } catch { showToast("Network error", "error"); } finally { setPubSaving(false); }
            }} disabled={pubSaving || !publicProfile.username.trim()}>
              {pubSaving ? "Saving..." : t("savePublicProfile")}
            </Button>
            {pubSaved && <span className="text-sm text-green-500 animate-fade-in">✅ Saved!</span>}
          </div>
          {publicProfile.username && (
            <p className="text-xs text-slate-400">
              {t("profileUrl")}: <a href={`/va/${publicProfile.username}`} target="_blank" className="text-kawaii-purple underline">/va/{publicProfile.username}</a>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Business Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🏢 {t("businessDetails")}</CardTitle>
          <CardDescription>{t("businessDetailsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bizName">{t("businessName")}</Label>
            <Input id="bizName" value={profile.business_name} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} placeholder="Your Business Name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizAddress">{t("businessAddress")}</Label>
            <Input id="bizAddress" value={profile.business_address} onChange={(e) => setProfile({ ...profile, business_address: e.target.value })} placeholder="Business address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bizEmail">{t("businessEmail")}</Label>
            <Input id="bizEmail" type="email" value={profile.business_email} onChange={(e) => setProfile({ ...profile, business_email: e.target.value })} placeholder="business@email.com" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bankAccount">{t("bankAccount")}</Label>
              <Input id="bankAccount" value={profile.bank_account} onChange={(e) => setProfile({ ...profile, bank_account: e.target.value })} placeholder="IBAN or account details" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">{t("taxId")}</Label>
              <Input id="taxId" value={profile.tax_id} onChange={(e) => setProfile({ ...profile, tax_id: e.target.value })} placeholder="Tax ID / VAT" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "💾 Save Business Details"}</Button>
            {saved && <span className="text-sm text-green-500 animate-fade-in">✅ Saved!</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🛰️ {t("jobSources")}</CardTitle>
          <CardDescription>Manage the RSS/API/web sources that feed the centralized Live Feed.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/settings/job-sources">
              <Button variant="primary">🛰️ Manage Job Sources</Button>
            </Link>
            <p className="text-xs text-slate-400">
              Toggle “Include in Live Feed”, check last-collected time, and add custom RSS/API/web sources.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🏢 Agency</CardTitle>
          <CardDescription>Agency-Features freischalten (langfristig ein Paid-Plan).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={agencyEnabled}
              onChange={async (e) => {
                const next = e.target.checked;
                setAgencyEnabled(next);
                try {
                  const res = await fetch("/api/user-settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ agency_enabled: next }),
                  });
                  if (!res.ok) { setAgencyEnabled(!next); throw new Error("Update failed"); }
                  showToast(next ? "Agency aktiviert" : "Agency deaktiviert");
                } catch { setAgencyEnabled(!next); showToast("Agency-Update fehlgeschlagen", "error"); }
              }}
              className="w-5 h-5"
            />
            <span className="text-sm text-slate-600 dark:text-slate-300">Agency im Menü anzeigen</span>
          </div>
        </CardContent>
      </Card>

      {/* Default Hourly Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">💰 {t("defaultHourlyRate")}</CardTitle>
          <CardDescription>{t("defaultRateDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-xs">
              <Input
                type="number"
                step="0.01"
                value={defaultRate}
                onChange={(e) => setDefaultRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button onClick={saveRate} disabled={rateSaving}>
              {rateSaving ? "Saving..." : "💾 Save"}
            </Button>
            {rateSaved && <span className="text-sm text-green-500 animate-fade-in">✅ Saved!</span>}
          </div>
        </CardContent>
      </Card>

      {/* Inbox Email Alias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">💌 Unified Inbox Email</CardTitle>
          <CardDescription>Forward your platform notifications here</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set this email address as the forwarding address on Upwork, OnlineJobs.ph, Facebook, and other platforms.
          </p>
          {inboxEmail ? (
            <div className="flex items-center gap-2">
              <Input value={inboxEmail} readOnly className="font-mono text-sm bg-kawaii-lavender/10 dark:bg-dark-surface/50" />
              <Button variant="outline" size="sm" onClick={copyAlias}>{copied ? "✅ Copied!" : "📋 Copy"}</Button>
            </div>
          ) : (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Loading email alias...</p>
          )}
          <div className="bg-kawaii-peach/20 dark:bg-yellow-900/20 rounded-2xl p-4 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-bold mb-1">📌 How to set up:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Copy the email address above</li>
              <li>Go to your platform&apos;s notification settings</li>
              <li>Set email forwarding to your Sari inbox address</li>
              <li>Messages will appear automatically in your inbox!</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{t("googleCalendar")}</CardTitle>
          <CardDescription>{t("googleCalendarDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {checkingGoogle ? (
            <p className="text-sm text-slate-400 animate-pulse">{t("checking")}</p>
          ) : hasGoogleCal ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                {t("connected")}
              </span>
              <Button variant="outline" size="sm" onClick={disconnectGoogleCalendar}>
                {t("disconnect")}
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                {t("googleCalendarText")}
              </p>
              <Button variant="primary" onClick={connectGoogleCalendar}>
                {t("connectGoogle")}
              </Button>
              <p className="text-xs text-slate-400 mt-2">
                {!process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID && t("googleNotConfigured")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup & Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{t("backupExport")}</CardTitle>
          <CardDescription>{t("backupExportDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {t("backupExportText")}
          </p>
          <Button variant="primary" onClick={handleBackup} disabled={backingUp}>
            {backingUp ? t("exporting") : t("exportAllData")}
          </Button>
        </CardContent>
      </Card>

      {/* World Clock Timezones */}
      <WorldClockSettings />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🔔 Notifications</CardTitle>
          <CardDescription>Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">Coming soon... 🚧</p>
        </CardContent>
      </Card>
    </div>
  );
}

function WorldClockSettings() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [timezones, setTimezones] = useState<{ id: string; label: string; timezone: string }[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newTimezone, setNewTimezone] = useState("UTC");
  const [availableTimezones] = useState(() => {
    try { return Intl.supportedValuesOf("timeZone"); } catch { return ["UTC", "America/New_York", "Asia/Manila", "Europe/London"]; }
  });

  useEffect(() => {
    fetch("/api/timezones")
      .then((r) => r.json())
      .then((data) => setTimezones(data.timezones ?? []))
      .catch(() => showToast("Failed to load timezones", "error"));
  }, []);

  const addTimezone = async () => {
    if (!newLabel || !newTimezone) return;
    const res = await fetch("/api/timezones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel, timezone: newTimezone }),
    });
    if (res.ok) {
      const data = await res.json();
      setTimezones((prev) => [...prev, data.timezone]);
      setNewLabel("");
    }
  };

  const deleteTimezone = async (id: string) => {
    await fetch(`/api/timezones/${id}`, { method: "DELETE" });
    setTimezones((prev) => prev.filter((tz) => tz.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">🕒 {t("worldClock")}</CardTitle>
        <CardDescription>{t("worldClockDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">{t("worldClockLabel")}</Label>
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Client – New York" />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">{t("timezone")}</Label>
            <select
              value={newTimezone}
              onChange={(e) => setNewTimezone(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
            >
              {availableTimezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <Button variant="primary" size="sm" onClick={addTimezone} disabled={!newLabel || !newTimezone}>➕ {t("add")}</Button>
        </div>
        {timezones.length > 0 && (
          <div className="space-y-2">
            {timezones.map((tz) => (
              <div key={tz.id} className="flex items-center justify-between p-2 rounded-xl bg-kawaii-lavender/20 dark:bg-dark-surface/50">
                <div>
                  <p className="text-sm font-semibold">{tz.label}</p>
                  <p className="text-xs text-slate-400">{tz.timezone}</p>
                </div>
                <button onClick={() => deleteTimezone(tz.id)} className="text-slate-400 hover:text-red-500 squishy">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
