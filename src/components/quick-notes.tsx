"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

export default function QuickNotes() {
  const { t } = useLocale();
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((data) => { setContent(data.notes ?? ""); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: text }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 800);
  };

  if (!loaded) return null;

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-700/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">📝 {t("quickNotes")}</CardTitle>
          {saved && <span className="text-xs text-green-500 animate-fade-in">✅ {t("saved")}</span>}
        </div>
      </CardHeader>
      <CardContent>
        <textarea
          value={content}
          onChange={handleChange}
          placeholder={t("quickNotesPlaceholder")}
          className="w-full h-28 bg-transparent border-none resize-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
        />
      </CardContent>
    </Card>
  );
}
