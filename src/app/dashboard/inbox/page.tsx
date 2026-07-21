"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";

interface InboxMessage {
  id: string;
  from_address: string;
  subject: string;
  body: string;
  received_at: string;
  read: boolean;
  platform: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const platformColors: Record<string, string> = {
  Upwork: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "OnlineJobs.ph": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Fiverr: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Facebook: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  LinkedIn: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};

const avatarColors = [
  "bg-kawaii-pink",
  "bg-kawaii-purple",
  "bg-kawaii-peach",
  "bg-kawaii-mint",
  "bg-kawaii-coral",
];

export default function InboxPage() {
  const { t } = useLocale();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inserting, setInserting] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox/messages");
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const markAsRead = async (id: string) => {
    await fetch("/api/inbox/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    });
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, read: true } : m))
    );
  };

  const handleExpand = (id: string, read: boolean) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!read) markAsRead(id);
    }
  };

  const insertTestMessage = async () => {
    setInserting(true);
    try {
      const res = await fetch("/api/inbox/test-insert", { method: "POST" });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [data.message, ...prev]);
      }
    } catch {
      // silent
    } finally {
      setInserting(false);
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            💌 {t("inbox")}
            {unreadCount > 0 && (
              <span className="text-sm px-3 py-1 rounded-full bg-kawaii-coral/20 text-red-500 font-bold">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t("inboxDescription")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={insertTestMessage} disabled={inserting}>
          {inserting ? "..." : "📨 Test Insert"}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-kawaii-lavender/30 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-kawaii-lavender/30 rounded-full" />
                  <div className="h-3 w-2/3 bg-kawaii-lavender/20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg font-bold text-slate-600 dark:text-slate-300">{t("inboxEmpty")}</p>
            <p className="text-sm text-slate-400 mt-1">{t("inboxEmptyHint")}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={insertTestMessage}>
              📨 {t("inboxTestInsert")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const colorIndex = msg.from_address.length % avatarColors.length;
            const avatarColor = avatarColors[colorIndex];
            const isExpanded = expandedId === msg.id;

            return (
              <Card
                key={msg.id}
                className={`cursor-pointer transition-all squishy ${!msg.read ? "ring-2 ring-kawaii-purple/20 dark:ring-kawaii-purple/40" : ""}`}
                onClick={() => handleExpand(msg.id, msg.read)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                    >
                      {msg.from_address.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-100">
                          {msg.from_address}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {msg.platform && (
                            <Badge className={`text-xs px-2 py-0.5 ${platformColors[msg.platform] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                              {msg.platform}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {timeAgo(msg.received_at)}
                          </span>
                          {!msg.read && <span className="w-2 h-2 rounded-full bg-kawaii-purple shrink-0" />}
                        </div>
                      </div>
                      <p className="text-sm font-bold mt-1 text-slate-700 dark:text-slate-200">
                        {msg.subject || "(No subject)"}
                      </p>
                      {!isExpanded ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {msg.body?.slice(0, 80) || ""}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">
                          {msg.body || "(No content)"}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
