"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
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
}

export default function SettingsPage() {
  const { t } = useLocale();
  const [profile, setProfile] = useState<Profile>({ full_name: "", desired_rate: "", bio: "", inbox_email_alias: "", business_name: "", business_address: "", business_email: "", bank_account: "", tax_id: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hourly rate settings
  const [defaultRate, setDefaultRate] = useState("0");
  const [rateSaving, setRateSaving] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/user-settings").then((r) => r.json()),
    ])
      .then(([profileData, settingsData]) => {
        if (profileData.profile) setProfile(profileData.profile);
        if (settingsData.settings) setDefaultRate(String(settingsData.settings.default_hourly_rate ?? "0"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      fetch("/api/profile").then(r => r.json()).then(d => { if (d.profile) setProfile(d.profile); });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
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
    } catch {
      // silent
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
      .catch(() => {});
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
