"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface GrantData {
  user: { id: string; email: string | null; created_at: string | null };
  profile: any;
  subscription: any;
  grants: { user_id: string; unlimited_playtime: boolean; note: string | null; updated_at: string | null };
  lead: any;
}

export default function AdminUserPage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const [data, setData] = useState<GrantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlimited, setUnlimited] = useState(false);
  const [note, setNote] = useState("");
  const [gift, setGift] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  // feed message
  const [sender, setSender] = useState("Sari Team");
  const [mtitle, setMtitle] = useState("");
  const [mbody, setMbody] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/grants/${params.userId}`);
      if (res.status === 401) { router.push("/admin/login"); return; }
      const d = await res.json();
      setData(d);
      setUnlimited(!!d?.grants?.unlimited_playtime);
      setNote(d?.grants?.note ?? "");
    })().finally(() => setLoading(false));
  }, [params.userId, router]);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/grants/${params.userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlimited_playtime: unlimited, note, grant_lessons: gift }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed");
      }
      setGift(0);
      setMsg("✅ Saved");
    } catch (e: any) {
      setMsg("❌ " + (e.message || "Failed"));
    } finally {
      setSaving(false);
    }
  };

  const sendMsg = async () => {
    setMsg("");
    const email = data?.user.email;
    if (!email || !mtitle.trim() || !mbody.trim()) { setMsg("❌ email, title and body required"); return; }
    try {
      const res = await fetch("/api/admin/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: email, sender_name: sender, title: mtitle, body: mbody }),
      });
      if (!res.ok) throw new Error("Failed");
      setMtitle("");
      setMbody("");
      setMsg("✅ Message sent to their feed");
    } catch {
      setMsg("❌ Failed to send");
    }
  };

  if (loading) return <div className="p-6"><p className="text-slate-400">Loading…</p></div>;
  if (!data) return <div className="p-6"><p className="text-slate-400">Not found.</p></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">🧑‍💼 User management</h1>
          <p className="text-sm text-slate-500">{data.user.email || "no email"} · joined {data.user.created_at ? new Date(data.user.created_at).toLocaleDateString() : "—"}</p>
        </div>
        <Link href="/admin" className="text-sm font-bold text-kawaii-purple hover:underline">← Admin</Link>
      </div>

      {/* overview */}
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl border border-kawaii-lavender/20 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subscription</p>
          <p className="mt-1 font-bold">
            {data.subscription ? `${data.subscription.plan} · ${data.subscription.status}` : "free / no subscription"}
          </p>
          {data.subscription?.access_until && <p className="text-xs text-slate-400">until {new Date(data.subscription.access_until).toLocaleDateString()}</p>}
        </div>
        <div className="rounded-2xl border border-kawaii-lavender/20 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profile</p>
          <p className="mt-1 font-bold">{data.profile?.full_name || "—"}</p>
          <p className="text-xs text-slate-400">XP {data.profile?.xp ?? 0} · streak {data.profile?.streak_count ?? 0}</p>
        </div>
        {data.lead && (
          <div className="rounded-2xl border border-kawaii-purple/30 bg-kawaii-purple/5 p-4 sm:col-span-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">🎯 Funnel lead</p>
            <p className="mt-1 font-bold">{data.lead.persona || "—"} · {data.lead.path || "—"}</p>
            <p className="text-xs text-slate-400">
              WhatsApp {data.lead.whatsapp ? <a href={`https://wa.me/${data.lead.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="font-bold text-green-600 underline">+{data.lead.whatsapp}</a> : "—"} · plan {data.lead.plan || "—"}
            </p>
          </div>
        )}
      </div>

      {/* grants */}
      <div className="rounded-2xl border border-kawaii-lavender/20 dark:border-dark-surface p-4 space-y-3">
        <p className="font-extrabold">🎁 Grants</p>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} className="w-5 h-5" />
          <span><b>Unlimited playtime</b> — bypasses daily lesson &amp; sim limits (acts like Money Club)</span>
        </label>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">Gift lessons today</label>
            <input type="number" min={0} value={gift} onChange={(e) => setGift(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl border border-kawaii-lavender/30 bg-white dark:bg-dark-card text-sm" />
          </div>
          <button onClick={save} disabled={saving} className="px-4 py-2.5 rounded-xl bg-dl-green text-white text-sm font-bold disabled:opacity-50">{saving ? "…" : "💾 Save"}</button>
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Internal note…" className="w-full px-3 py-2 rounded-xl border border-kawaii-lavender/30 bg-white dark:bg-dark-card text-sm" />
        {msg && <p className="text-sm text-slate-500">{msg}</p>}
      </div>

      {/* feed message */}
      <div className="rounded-2xl border border-kawaii-lavender/20 dark:border-dark-surface p-4 space-y-3">
        <p className="font-extrabold">📨 Send feed message</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="Sender name" className="h-10 px-3 rounded-xl border border-kawaii-lavender/30 bg-white dark:bg-dark-card text-sm" />
          <input value={mtitle} onChange={(e) => setMtitle(e.target.value)} placeholder="Title" className="h-10 px-3 rounded-xl border border-kawaii-lavender/30 bg-white dark:bg-dark-card text-sm" />
        </div>
        <textarea value={mbody} onChange={(e) => setMbody(e.target.value)} rows={3} placeholder="Message body…" className="w-full px-3 py-2 rounded-xl border border-kawaii-lavender/30 bg-white dark:bg-dark-card text-sm" />
        <button onClick={sendMsg} className="px-4 py-2.5 rounded-xl bg-kawaii-purple text-white text-sm font-bold">📨 Send</button>
      </div>
    </div>
  );
}