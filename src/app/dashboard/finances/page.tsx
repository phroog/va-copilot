"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/toast";

interface IncomeEntry {
  id: string;
  source: string;
  amount: number;
  description: string;
  earned_at: string;
  created_at: string;
}

export default function FinancesPage() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [totalMonth, setTotalMonth] = useState(0);
  const [totalYear, setTotalYear] = useState(0);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<{ month: string; total: number }[]>([]);
  const [recent, setRecent] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Manual income form
  const [showAdd, setShowAdd] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addDate, setAddDate] = useState(new Date().toISOString().split("T")[0]);
  const [addSaving, setAddSaving] = useState(false);

  const fetchFinances = async () => {
    try {
      const res = await fetch("/api/finances");
      const data = await res.json();
      setTotalMonth(data.totalMonth ?? 0);
      setTotalYear(data.totalYear ?? 0);
      setMonthlyBreakdown(data.monthlyBreakdown ?? []);
      setRecent(data.recent ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFinances(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/finances/sync", { method: "POST" });
      const data = await res.json();
      showToast(`Synced ${data.synced ?? 0} new entries!`);
      fetchFinances();
    } catch {
      showToast("Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleAddIncome = async () => {
    if (!addAmount || parseFloat(addAmount) <= 0) return;
    setAddSaving(true);
    try {
      const res = await fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: addAmount, description: addDesc, earned_at: addDate }),
      });
      const data = await res.json();
      if (data.entry) {
        showToast("Income added!");
        setAddAmount(""); setAddDesc(""); setAddDate(new Date().toISOString().split("T")[0]);
        setShowAdd(false);
        fetchFinances();
      }
    } catch {
      showToast("Failed to add income", "error");
    } finally {
      setAddSaving(false);
    }
  };

  const sourceIcon = (s: string) => s === "time" ? "⏱" : s === "job" ? "💼" : "✍️";

  const maxTotal = Math.max(...monthlyBreakdown.map((m) => m.total), 1);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-extrabold">💰 {t("finances")}</h1>
        <Card className="animate-pulse"><CardContent className="p-8 h-40" /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">💰 {t("finances")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? "⏳ Syncing..." : "🔄 " + t("sync")}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAdd(!showAdd)}>
            ✍️ {t("addIncome")}
          </Button>
        </div>
      </div>

      {/* Monthly Total */}
      <Card className="bg-gradient-to-r from-kawaii-purple/20 to-kawaii-pink/10 dark:from-kawaii-purple/10 dark:to-kawaii-pink/5 border-kawaii-purple/20">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">✨ {t("earnedThisMonth")}</p>
          <p className="text-5xl font-extrabold bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
            ${totalMonth.toFixed(2)}
          </p>
          <p className="text-sm text-slate-400 mt-1">{t("earnedThisYear")}: ${totalYear.toFixed(2)}</p>
        </CardContent>
      </Card>

      {/* Monthly breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">📊 {t("monthlyBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {monthlyBreakdown.map((m) => {
            const pct = maxTotal > 0 ? (m.total / maxTotal) * 100 : 0;
            const [y, mo] = m.month.split("-");
            const label = new Date(parseInt(y), parseInt(mo) - 1).toLocaleString("default", { month: "short", year: "2-digit" });
            return (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 w-14 shrink-0">{label}</span>
                <div className="flex-1 h-5 bg-kawaii-lavender/20 dark:bg-dark-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-20 text-right">
                  ${m.total.toFixed(2)}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Add Income Form */}
      {showAdd && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-lg">✍️ {t("addIncome")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">{t("amount")}</Label>
                <Input type="number" step="0.01" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs">{t("description")}</Label>
                <Input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} placeholder="Bonus, tip, etc." />
              </div>
              <div>
                <Label className="text-xs">{t("date")}</Label>
                <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} />
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={handleAddIncome} disabled={addSaving || !addAmount}>
              {addSaving ? "Saving..." : "💾 " + t("save")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent earnings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">🕐 {t("recentEarnings")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">{t("noIncomeYet")}</p>
          ) : (
            <div className="space-y-2">
              {recent.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-kawaii-lavender/10 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">{sourceIcon(entry.source)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">
                        {entry.description || entry.source}
                      </p>
                      <p className="text-xs text-slate-400">{entry.earned_at}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender shrink-0">
                    +${parseFloat(String(entry.amount)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
