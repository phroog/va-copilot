"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScamGauge } from "@/components/scam-gauge";

export default function ScamCheckPage() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [clientName, setClientName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ score: number; analysis: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCheck = async () => {
    if (!clientName && !websiteUrl && !jobDescription && !paymentInfo) {
      showToast("Please fill in at least one field");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/ai/scam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName || undefined,
          website_url: websiteUrl || undefined,
          job_description: jobDescription || undefined,
          payment_info: paymentInfo || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        showToast(data.error || "Insufficient credits");
        return;
      }
      setResult(data);
      setDialogOpen(true);
    } catch {
      showToast("Scam check failed");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-3xl font-extrabold">🕵️ {t("scamCheck")}</h1>
      <p className="text-slate-500 dark:text-slate-400">{t("scamCheckDesc")}</p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("clientInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">{t("clientName")}</Label>
            <Input
              placeholder="Client name or username"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">Website URL</Label>
            <Input
              placeholder="https://..."
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">{t("description")}</Label>
            <Textarea
              placeholder="Job description or context..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">{t("paymentInfo")}</Label>
            <Input
              placeholder="Payment terms, amounts, etc."
              value={paymentInfo}
              onChange={(e) => setPaymentInfo(e.target.value)}
            />
          </div>
          <Button variant="primary" onClick={handleCheck} disabled={checking}>
            {checking ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("checking")}
              </span>
            ) : (
              `🕵️ ${t("runScamCheck")} (1🪙)`
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>🕵️ {t("scamCheckResult")}</DialogTitle>
          </DialogHeader>
          {result && (
            <div className="flex flex-col items-center gap-4 py-4">
              <ScamGauge score={result.score} />
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">{result.analysis}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
