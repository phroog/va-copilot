"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/context";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function MochiChat() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      fetch("/api/ai/credits").then(async (r) => {
        if (r.ok) { const d = await r.json(); setBalance(d.balance); }
      }).catch(() => {});
    }
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/mochi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        setBalance(data.balance);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error || "Mochi error" }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error" }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "📊 " + t("mochiSummarizeWeek"), message: "Please summarize my week." },
    { label: "🧠 " + t("mochiProductivityTip"), message: "Give me a productivity tip based on my recent activity." },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-4 left-4 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink shadow-lg shadow-kawaii-purple/20 flex items-center justify-center text-xl squishy animate-float hover:scale-110 transition-transform"
          title={t("mochiChat")}
        >
          💬
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🤖 Mochi AI</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3" style={{ maxHeight: "70vh" }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-1 min-h-[300px] max-h-[400px]">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">{t("mochiNoMessages")}</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-kawaii-purple text-white rounded-br-md"
                      : "bg-kawaii-lavender/20 dark:bg-dark-surface/50 text-slate-700 dark:text-slate-200 rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-2xl rounded-bl-md bg-kawaii-lavender/20 dark:bg-dark-surface/50 text-sm text-slate-400 animate-pulse">
                  {t("mochiThinking")}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("mochiInputPlaceholder")}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" variant="primary" size="sm" disabled={loading || !input.trim()}>
              {t("send")}
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.message}
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => sendMessage(action.message)}
                disabled={loading}
              >
                {action.label}
              </Button>
            ))}
          </div>

          {balance !== null && (
            <p className="text-xs text-slate-400 text-center">
              💎 {balance} {t("credits")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
