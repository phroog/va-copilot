"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/toast";
import { VaultProvider, useVault } from "@/lib/vault/vault-provider";

interface Org {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  org_members?: any[];
}

interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

interface VaultItem {
  id: string;
  org_id: string;
  title: string;
  url: string;
  username: string;
  encrypted_password: string;
  notes: string;
  created_at: string;
}

function AgencyVault({ orgId }: { orgId: string }) {
  const { t } = useLocale();
  const vault = useVault();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/org/${orgId}/vault`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { if (orgId) fetchItems(); }, [orgId]);

  const resetForm = () => {
    setFormTitle(""); setFormUrl(""); setFormUsername(""); setFormPassword(""); setFormNotes(""); setShowForm(false);
  };

  const handleSave = async () => {
    if (!formTitle || !formPassword) return;
    const encrypted = vault.encrypt(formPassword);
    const body = { title: formTitle, url: formUrl, username: formUsername, encrypted_password: encrypted, notes: formNotes };
    await fetch(`/api/org/${orgId}/vault`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    resetForm();
    fetchItems();
  };

  const reveal = (id: string) => {
    setRevealedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const copyPw = (item: VaultItem) => {
    const pw = vault.decrypt(item.encrypted_password);
    navigator.clipboard.writeText(pw);
    setCopied(item.id);
    setTimeout(() => setCopied(""), 1500);
  };

  if (vault.checking) {
    return <div className="flex items-center justify-center h-32"><p className="text-slate-400 animate-pulse">{t("loading")}...</p></div>;
  }

  if (vault.needsSetup || vault.locked) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="text-slate-500">{t("vaultLocked")}</p>
          <p className="text-xs text-slate-400 mt-1">{t("vaultUnlockDesc")}</p>
          <a href="/dashboard/vault" className="text-sm text-kawaii-purple underline mt-2 inline-block">{t("unlock")}</a>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-extrabold">🔐 {t("sharedVault")}</h3>
        <Button variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(true); }}>➕ {t("addItem")}</Button>
      </div>

      {showForm && (
        <Card className="border-kawaii-purple/30">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs">{t("jobTitle")}</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Shared login" />
            </div>
            <div>
              <Label className="text-xs">URL</Label>
              <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">{t("username")}</Label>
              <Input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="username@email.com" />
            </div>
            <div>
              <Label className="text-xs">{t("password")}</Label>
              <Input type="text" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Password (encrypted client-side)" />
            </div>
            <div>
              <Label className="text-xs">{t("notes")}</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes" />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleSave} disabled={!formTitle || !formPassword}>💾 {t("save")}</Button>
              <Button variant="ghost" size="sm" onClick={resetForm}>{t("cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-12" /></Card>)}</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-3xl mb-2">🔐</p>
            <p className="text-sm text-slate-400">{t("noVaultItems")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const decryptedPw = revealedIds.has(item.id) ? vault.decrypt(item.encrypted_password) : "••••••••";
            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{item.title}</span>
                        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-kawaii-purple">↗</a>}
                      </div>
                      {item.username && <p className="text-xs text-slate-500">{item.username}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-mono text-slate-600">{decryptedPw}</span>
                        <button onClick={() => reveal(item.id)} className="text-xs text-kawaii-purple squishy">
                          {revealedIds.has(item.id) ? "🙈" : "👁️"}
                        </button>
                        <button onClick={() => copyPw(item)} className="text-xs text-kawaii-purple squishy">
                          {copied === item.id ? "✅" : "📋"}
                        </button>
                      </div>
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

const AVATAR_COLORS = [
  "bg-kawaii-pink", "bg-kawaii-purple", "bg-kawaii-coral",
  "bg-kawaii-peach", "bg-kawaii-mint", "bg-blue-400", "bg-teal-400",
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function TeamChat({ orgId, currentUserId }: { orgId: string; currentUserId: string }) {
  const { t } = useLocale();
  const supabase = createClient();
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch rooms
  const fetchRooms = async () => {
    try {
      const res = await fetch(`/api/org/${orgId}/rooms`);
      const data = await res.json();
      const list = data.rooms ?? [];
      setRooms(list);
      if (list.length > 0 && !activeRoomId) {
        setActiveRoomId(list[0].id);
      }
    } catch {} finally { setLoadingRooms(false); }
  };

  useEffect(() => { fetchRooms(); }, [orgId]);

  // Fetch messages for active room
  const fetchMessages = async (roomId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/org/${orgId}/rooms/${roomId}/messages`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {} finally { setLoadingMessages(false); }
  };

  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId);
    }
  }, [activeRoomId]);

  // Realtime subscription
  useEffect(() => {
    if (!activeRoomId) return;

    const channel = supabase
      .channel(`org_chat_${activeRoomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "org_chat_messages", filter: `room_id=eq.${activeRoomId}` },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeRoomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !activeRoomId) return;
    const text = input.trim();
    setInput("");
    await fetch(`/api/org/${orgId}/rooms/${activeRoomId}/messages`, {
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

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    const res = await fetch(`/api/org/${orgId}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoomName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setRooms((prev) => [...prev, data.room]);
      setActiveRoomId(data.room.id);
      setNewRoomName("");
      setShowCreateRoom(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-16rem)]">
      {/* Room sidebar */}
      <div className="w-56 shrink-0 flex flex-col bg-white/60 dark:bg-dark-card/60 rounded-2xl border border-kawaii-lavender/20 dark:border-dark-surface/50 p-2">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("rooms")}</span>
          <button onClick={() => setShowCreateRoom(!showCreateRoom)} className="text-slate-400 hover:text-kawaii-purple squishy text-sm">➕</button>
        </div>
        {showCreateRoom && (
          <div className="px-2 pb-2 flex gap-1">
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
              placeholder="Room name"
              className="flex-1 text-xs rounded-xl border border-kawaii-lavender/30 bg-white/80 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-kawaii-purple dark:bg-dark-card"
            />
            <button onClick={createRoom} className="text-xs text-kawaii-purple font-bold squishy">{t("add")}</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {loadingRooms ? (
            <div className="p-4 text-center"><p className="text-xs text-slate-400 animate-pulse">{t("loading")}...</p></div>
          ) : rooms.length === 0 ? (
            <div className="p-4 text-center"><p className="text-xs text-slate-400">{t("noRooms")}</p></div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all squishy ${
                  activeRoomId === room.id
                    ? "bg-kawaii-purple/20 text-kawaii-purple dark:bg-dark-surface"
                    : "text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/20 dark:hover:bg-dark-surface/50"
                }`}
              >
                💬 {room.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white/60 dark:bg-dark-card/60 rounded-2xl border border-kawaii-lavender/20 dark:border-dark-surface/50 overflow-hidden">
        {activeRoomId ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-kawaii-lavender/5 to-white/50 dark:from-dark-surface/30 dark:to-dark-card/30">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-400 animate-pulse">{t("loading")}...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-4xl mb-2">💬</p>
                  <p className="text-slate-400">{t("noMessages")}</p>
                </div>
              ) : (
                messages.map((msg: any) => {
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
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("chatPlaceholder")}
                  className="flex-1 rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple dark:border-dark-surface dark:bg-dark-card"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold rounded-full px-5 py-2 bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white hover:from-purple-400 hover:to-pink-400 shadow-lg shadow-kawaii-purple/20 disabled:opacity-50 squishy"
                >
                  💬 {t("send")}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-4xl mb-2">💬</p>
              <p className="text-slate-400">{t("selectRoom")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AgencyInner() {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  // Tab state
  const [tab, setTab] = useState<"members" | "vault" | "chat">("members");

  // Members
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchOrgs = async () => {
    try {
      const res = await fetch("/api/org");
      const data = await res.json();
      const list = data.orgs ?? [];
      setOrgs(list);
      if (list.length > 0) {
        setActiveOrg(list[0]);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
    fetchOrgs();
  }, []);

  const fetchMembers = async (orgId: string) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/org/${orgId}/members`);
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch {} finally { setMembersLoading(false); }
  };

  useEffect(() => {
    if (activeOrg) {
      setTab("members");
      fetchMembers(activeOrg.id);
    }
  }, [activeOrg]);

  const handleCreate = async () => {
    if (!orgName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Failed to create agency", "error");
        return;
      }
      showToast("Agency created!");
      setOrgName("");
      setShowCreate(false);
      fetchOrgs();
    } catch { showToast("Failed to create agency", "error"); } finally { setCreating(false); }
  };

  const handleInvite = async () => {
    if (!inviteUserId.trim() || !activeOrg) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/org/${activeOrg.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: inviteUserId.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Failed to invite", "error");
        return;
      }
      showToast("Member invited!");
      setInviteUserId("");
      fetchMembers(activeOrg.id);
    } catch { showToast("Failed to invite member", "error"); } finally { setInviting(false); }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!activeOrg) return;
    try {
      const res = await fetch(`/api/org/${activeOrg.id}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchMembers(activeOrg.id);
        showToast("Role updated");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update role", "error");
      }
    } catch { showToast("Failed to update role", "error"); }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeOrg || !window.confirm("Remove this member?")) return;
    try {
      const res = await fetch(`/api/org/${activeOrg.id}/members/${userId}`, { method: "DELETE" });
      if (res.ok) {
        fetchMembers(activeOrg.id);
        showToast("Member removed");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to remove", "error");
      }
    } catch { showToast("Failed to remove member", "error"); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-slate-400 animate-pulse">{t("loading")}...</p></div>;
  }

  // No orgs — show create form
  if (orgs.length === 0 && !showCreate) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏢</span>
          <div>
            <h1 className="text-3xl font-extrabold">{t("agency")}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t("agencyDesc")}</p>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-kawaii-purple/10 to-kawaii-pink/5 dark:from-dark-surface/30 dark:to-dark-surface/10 border-kawaii-purple/20 text-center">
          <CardContent className="p-12">
            <p className="text-6xl mb-4">🏢</p>
            <h2 className="text-2xl font-extrabold mb-2">{t("createAgency")}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">{t("createAgencyDesc")}</p>
            <Button variant="primary" onClick={() => setShowCreate(true)}>🏢 {t("createAgency")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showCreate || orgs.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in max-w-lg mx-auto mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">🏢 {t("createAgency")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("agencyName")}</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="My Agency" />
            </div>
            <Button variant="primary" className="w-full" onClick={handleCreate} disabled={creating || !orgName.trim()}>
              {creating ? "⏳..." : "🏢 " + t("createAgency")}
            </Button>
            {orgs.length > 0 && (
              <Button variant="ghost" className="w-full" onClick={() => setShowCreate(false)}>← {t("back")}</Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = activeOrg && currentUserId ? members.some((m) => m.user_id === currentUserId && m.role === "admin") : false;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏢</span>
          <div>
            <h1 className="text-3xl font-extrabold">{activeOrg?.name || t("agency")}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{members.length} {t("members")}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>➕ {t("newAgency")}</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab("members")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all squishy ${
            tab === "members"
              ? "bg-kawaii-purple text-white shadow-lg shadow-kawaii-purple/30"
              : "bg-white/80 dark:bg-dark-card text-slate-600 border-2 border-kawaii-lavender/30 hover:border-kawaii-purple/50"
          }`}
        >
          👥 {t("members")}
        </button>
        <button
          onClick={() => setTab("vault")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all squishy ${
            tab === "vault"
              ? "bg-kawaii-purple text-white shadow-lg shadow-kawaii-purple/30"
              : "bg-white/80 dark:bg-dark-card text-slate-600 border-2 border-kawaii-lavender/30 hover:border-kawaii-purple/50"
          }`}
        >
          🔐 {t("sharedVault")}
        </button>
        <button
          onClick={() => setTab("chat")}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all squishy ${
            tab === "chat"
              ? "bg-kawaii-purple text-white shadow-lg shadow-kawaii-purple/30"
              : "bg-white/80 dark:bg-dark-card text-slate-600 border-2 border-kawaii-lavender/30 hover:border-kawaii-purple/50"
          }`}
        >
          💬 {t("teamChat")}
        </button>
      </div>

      {/* Members Tab */}
      {tab === "members" && (
        <div className="space-y-4">
          {/* Invite form */}
          <Card className="border-kawaii-purple/20 dark:border-kawaii-purple/30 bg-gradient-to-r from-kawaii-lavender/10 to-kawaii-pink/5">
            <CardContent className="p-4 sm:p-6">
              <h3 className="font-extrabold text-sm mb-3 flex items-center gap-2">✉️ {t("inviteMember")}</h3>
              <div className="flex gap-2">
                <Input
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  placeholder={t("invitePlaceholder")}
                  className="flex-1"
                />
                <Button variant="primary" size="sm" onClick={handleInvite} disabled={inviting || !inviteUserId.trim()}>
                  {inviting ? "⏳..." : "✉️ " + t("invite")}
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-1">{t("inviteHint")}</p>
            </CardContent>
          </Card>

          {/* Members list */}
          {membersLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-14" /></Card>)}</div>
          ) : members.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><p className="text-slate-400">{t("noMembers")}</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const isAdminMember = member.role === "admin";
                return (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-white text-sm font-bold">
                            {member.user_id.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{member.user_id}</p>
                            <Badge variant={isAdminMember ? "default" : "outline"}>
                              {isAdminMember ? "Admin" : t("member")}
                            </Badge>
                          </div>
                        </div>
                        {isAdminMember && (
                          <div className="flex gap-1">
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                              className="text-xs rounded-full border border-kawaii-lavender/30 bg-transparent px-2 py-1"
                            >
                              <option value="member">{t("member")}</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.user_id)}
                              className="text-slate-400 hover:text-red-500 squishy text-sm"
                              title={t("remove")}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Vault Tab */}
      {tab === "vault" && activeOrg && (
        <VaultProvider>
          <AgencyVault orgId={activeOrg.id} />
        </VaultProvider>
      )}

      {/* Chat Tab */}
      {tab === "chat" && activeOrg && currentUserId && (
        <TeamChat orgId={activeOrg.id} currentUserId={currentUserId} />
      )}
    </div>
  );
}

export default function AgencyPage() {
  return <AgencyInner />;
}
