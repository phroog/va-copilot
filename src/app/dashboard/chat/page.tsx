"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

const AVATAR_COLORS = [
  "bg-kawaii-pink", "bg-kawaii-purple", "bg-kawaii-coral",
  "bg-kawaii-peach", "bg-kawaii-mint", "bg-blue-400", "bg-teal-400",
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ChatPage() {
  const { t } = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });

    // Load initial messages
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Subscribe to realtime
    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      <h1 className="text-3xl font-extrabold mb-4">💬 {t("chat")}</h1>

      <Card className="flex-1 flex flex-col overflow-hidden rounded-3xl">
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-kawaii-lavender/5 to-white/50 dark:from-dark-surface/30 dark:to-dark-card/30">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400 animate-pulse">{t("loading")}...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-4xl mb-2">💬</p>
              <p className="text-slate-400">{t("noMessages")}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.user_id === currentUserId;
              return (
                <div key={msg.id} className={`flex items-start gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full ${getAvatarColor(msg.user_id)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      {!isMine && <span className="text-xs font-semibold text-slate-500">{msg.username}</span>}
                      <span className="text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
                    </div>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? "bg-kawaii-purple text-white rounded-tr-md"
                          : "bg-white dark:bg-dark-surface border border-kawaii-lavender/20 dark:border-dark-surface/50 rounded-tl-md"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-kawaii-lavender/20 dark:border-dark-surface/50 bg-white/80 dark:bg-dark-card/80">
          <div className="flex gap-2">
            <Input
              ref={inputRef as any}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chatPlaceholder")}
              className="flex-1 rounded-2xl"
            />
            <Button onClick={sendMessage} disabled={!input.trim()} variant="primary" className="rounded-2xl px-5">
              💬 {t("send")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
