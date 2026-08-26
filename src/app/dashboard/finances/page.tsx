"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/toast";
import { formatMoney, CURRENCIES, CURRENCY_SYMBOLS, normalizeCurrency } from "@/lib/currency";

interface IncomeEntry {
  id: string;
  source: string;
  amount: number;
  amount_base: number;
  currency: string;
  description: string;
  earned_at: string;
  created_at: string;
}

export default function FinancesPage() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [totalMonth, setTotalMonth] = useState(0);
  const [totalYear, setTotalYear] = useState(0);
  const [baseCurrency, setBaseCurrency] = useState("EUR");
  const [taxRate, setTaxRate] = useState(0);
  const [estimatedTax, setEstimatedTax] = useState(0);
  const [netYear, setNetYear] = useState(0);
  const [byCurrency, setByCurrency] = useState<Record<string, number>>({});
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<{ month: string; total: number }[]>([]);
  const [recent, setRecent] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Manual income form
  const [showAdd, setShowAdd] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addDate, setAddDate] = useState(new Date().toISOString().split("T")[0]);
  const [addCurrency, setAddCurrency] = useState("USD");
  const [addSaving, setAddSaving] = useState(false);

  const fetchFinances = async () => {
    try {
      const res = await fetch("/api/finances");
      const data = await res.json();
      setTotalMonth(data.totalMonth ?? 0);
      setTotalYear(data.totalYear ?? 0);
      setBaseCurrency(normalizeCurrency(data.baseCurrency || "EUR"));
      setTaxRate(data.taxRate ?? 0);
      setEstimatedTax(data.estimatedTax ?? 0);
      setNetYear(data.netYear ?? 0);
      setByCurrency(data.byCurrency ?? {});
      setMonthlyBreakdown(data.monthlyBreakdown ?? []);
      setRecent(data.recent ?? []);
    } catch (e) {
      showToast((e as any)?.message ?? "Failed to load finances", "error");
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
        body: JSON.stringify({ amount: addAmount, description: addDesc, earned_at: addDate, currency: addCurrency }),
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

  const sourceIcon = (s: string) => s === "time" ? "⏱" : s === "job" ? "💼" : s === "invoice" ? "📄" : "✍️";

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 bg-gradient-to-r from-kawaii-purple/20 to-kawaii-pink/10 dark:from-kawaii-purple/10 dark:to-kawaii-pink/5 border-kawaii-purple/20">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">✨ {t("earnedThisMonth")}</p>
            <p className="text-5xl font-extrabold bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
              {formatMoney(totalMonth, baseCurrency)}
            </p>
            <p className="text-sm text-slate-400 mt-1">{t("earnedThisYear")}: {formatMoney(totalYear, baseCurrency)}</p>
          </CardContent>
        </Card>

        {/* Tax estimate */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">🧾 Tax estimate (year)</p>
            <p className="text-2xl font-extrabold text-kawaii-coral">{formatMoney(estimatedTax, baseCurrency)}</p>
            <p className="text-xs text-slate-400 mt-1">at {taxRate}% tax rate</p>
            <div className="border-t border-kawaii-lavender/20 mt-3 pt-3">
              <p className="text-sm text-slate-500 flex justify-between"><span>Gross</span><span className="font-semibold">{formatMoney(totalYear, baseCurrency)}</span></p>
              <p className="text-sm text-slate-500 flex justify-between mt-1"><span>Net (estimated)</span><span className="font-semibold text-green-600 dark:text-green-400">{formatMoney(netYear, baseCurrency)}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-currency totals */}
      {Object.keys(byCurrency).length > 0 && (
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2">
            {Object.entries(byCurrency).map(([code, val]) => (
              <span key={code} className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-kawaii-lavender/20 dark:bg-dark-surface text-kawaii-purple dark:text-kawaii-lavender">
                {formatMoney(val, code)}
                <span className="text-slate-400 font-medium">({code})</span>
              </span>
            ))}
            <span className="text-xs text-slate-400 self-center">→ converted to {baseCurrency}</span>
          </CardContent>
        </Card>
      )}

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
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-24 text-right">
                  {formatMoney(m.total, baseCurrency)}
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">{t("amount")}</Label>
                <Input type="number" step="0.01" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <select
                  value={addCurrency}
                  onChange={(e) => setAddCurrency(e.target.value)}
                  className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2.5 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>
                  ))}
                </select>
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
                      <p className="text-xs text-slate-400">
                        {entry.earned_at}
                        {entry.currency !== baseCurrency && (
                          <span className="text-kawaii-purple dark:text-kawaii-lavender"> · ≈ {formatMoney(entry.amount_base, baseCurrency)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender shrink-0">
                    +{formatMoney(parseFloat(String(entry.amount)), entry.currency)}
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