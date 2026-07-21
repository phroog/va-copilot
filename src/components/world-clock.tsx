"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";

interface TimezoneEntry {
  id: string;
  label: string;
  timezone: string;
}

export default function WorldClock() {
  const { t } = useLocale();
  const [timezones, setTimezones] = useState<TimezoneEntry[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetch("/api/timezones")
      .then((r) => r.json())
      .then((data) => setTimezones(data.timezones ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (timezones.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">🕒 {t("worldClock")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {timezones.map((tz) => {
          const time = now.toLocaleTimeString(undefined, {
            timeZone: tz.timezone,
            hour: "2-digit",
            minute: "2-digit",
          });
          const date = now.toLocaleDateString(undefined, {
            timeZone: tz.timezone,
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          return (
            <div key={tz.id} className="flex items-center justify-between p-2 rounded-xl bg-kawaii-lavender/20 dark:bg-dark-surface/50 squishy">
              <div>
                <p className="font-semibold text-sm">{tz.label}</p>
                <p className="text-xs text-slate-400">{date}</p>
              </div>
              <span className="text-xl font-extrabold tabular-nums text-kawaii-purple dark:text-kawaii-lavender">{time}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
