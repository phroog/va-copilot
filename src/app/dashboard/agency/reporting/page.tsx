"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";

interface MemberReport {
  user_id: string;
  full_name: string;
  total_hours: number;
  pitches_count: number;
  invoices_count: number;
  total_revenue: number;
  jobs_won: number;
}

interface ReportData {
  org_name: string;
  start: string;
  end: string;
  total_agency_hours: number;
  total_revenue: number;
  total_pitches: number;
  total_invoices: number;
  active_members: number;
  members: MemberReport[];
}

export default function AgencyReportingPage() {
  const { t } = useLocale();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const today = now.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async (start: string, end: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/agency/reporting?start=${start}&end=${end}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to load report");
        return;
      }
      const d = await res.json();
      setData(d);
    } catch {
      setError("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(startDate, endDate);
  }, []);

  const handleSearch = () => {
    fetchReport(startDate, endDate);
  };

  const exportCsv = () => {
    window.open(`/api/agency/reporting?start=${startDate}&end=${endDate}&export=csv`, "_blank");
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-extrabold">📊 {t("reporting")}</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-4xl mb-3">🚫</p>
            <p className="text-slate-500">{error}</p>
            <p className="text-sm text-slate-400 mt-2">{t("notAdmin")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">📊 {t("reporting")}</h1>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data}>
          📥 {t("exportCsv")}
        </Button>
      </div>

      {/* Date Range */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">{t("startDate")}</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">{t("endDate")}</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-44" />
            </div>
            <Button variant="primary" size="sm" onClick={handleSearch} disabled={loading}>
              {loading ? "⏳..." : "🔍 Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-24" />
            </Card>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Aggregated Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-kawaii-purple/10 to-kawaii-pink/5 dark:from-dark-surface/30 dark:to-dark-surface/10">
              <CardContent className="p-6 text-center">
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{data.total_agency_hours.toFixed(1)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("totalHours")}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-900/10">
              <CardContent className="p-6 text-center">
                <p className="text-2xl font-extrabold text-green-700 dark:text-green-300">${data.total_revenue.toFixed(2)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("totalRevenue")}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/10">
              <CardContent className="p-6 text-center">
                <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-300">{data.total_pitches}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("pitches")}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-900/10">
              <CardContent className="p-6 text-center">
                <p className="text-2xl font-extrabold text-orange-700 dark:text-orange-300">{data.active_members}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("activeMembers")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Team Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("teamOverview")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-kawaii-lavender/20 dark:border-dark-surface/50">
                    <th className="text-left p-4 font-bold text-slate-600 dark:text-slate-300">{t("member")}</th>
                    <th className="text-right p-4 font-bold text-slate-600 dark:text-slate-300">{t("hours")}</th>
                    <th className="text-right p-4 font-bold text-slate-600 dark:text-slate-300">{t("pitches")}</th>
                    <th className="text-right p-4 font-bold text-slate-600 dark:text-slate-300">{t("invoices")}</th>
                    <th className="text-right p-4 font-bold text-slate-600 dark:text-slate-300">{t("revenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((m) => (
                    <tr key={m.user_id} className="border-b border-kawaii-lavender/10 dark:border-dark-surface/30 hover:bg-kawaii-lavender/5 dark:hover:bg-dark-surface/30">
                      <td className="p-4 font-medium text-slate-700 dark:text-slate-200">{m.full_name}</td>
                      <td className="p-4 text-right text-slate-600 dark:text-slate-300">{m.total_hours.toFixed(1)}</td>
                      <td className="p-4 text-right text-slate-600 dark:text-slate-300">{m.pitches_count}</td>
                      <td className="p-4 text-right text-slate-600 dark:text-slate-300">{m.invoices_count}</td>
                      <td className="p-4 text-right font-semibold text-green-600 dark:text-green-400">${m.total_revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
