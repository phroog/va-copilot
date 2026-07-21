"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { VaultProvider, useVault } from "@/lib/vault/vault-provider";

interface VaultItem {
  id: string;
  title: string;
  url: string;
  username: string;
  encrypted_password: string;
  notes: string;
  created_at: string;
}

function VaultInner() {
  const { t } = useLocale();
  const vault = useVault();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterPw, setMasterPw] = useState("");
  const [setupPw, setSetupPw] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetPw, setResetPw] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [error, setError] = useState("");
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/vault");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (vault.unlocked) fetchItems();
  }, [vault.unlocked]);

  // Setup
  if (vault.checking) {
    return <div className="flex items-center justify-center h-64"><p className="text-slate-400 animate-pulse">{t("loading")}...</p></div>;
  }

  if (vault.needsSetup) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">🔐 {t("vaultSetup")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">{t("vaultSetupDesc")}</p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div>
              <Label>{t("masterPassword")}</Label>
              <Input type="password" value={setupPw} onChange={(e) => setSetupPw(e.target.value)} placeholder="Your master password" />
            </div>
            <div>
              <Label>{t("confirmPassword")}</Label>
              <Input type="password" value={setupConfirm} onChange={(e) => setSetupConfirm(e.target.value)} placeholder="Confirm password" />
            </div>
            <Button variant="primary" className="w-full" onClick={async () => {
              setError("");
              if (setupPw.length < 4) { setError(t("passwordTooShort")); return; }
              if (setupPw !== setupConfirm) { setError(t("passwordsDontMatch")); return; }
              const ok = await vault.setup(setupPw);
              if (!ok) setError(t("vaultSetupError"));
            }}>🔐 {t("setupVault")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vault.locked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {showReset ? (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">🔄 {t("vaultReset")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-red-500 font-semibold">⚠️ {t("vaultResetWarning")}</p>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label>{t("newMasterPassword")}</Label>
                <Input type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="New master password" />
              </div>
              <div>
                <Label>{t("confirmPassword")}</Label>
                <Input type="password" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} placeholder="Confirm new password" />
              </div>
              <Button variant="destructive" className="w-full" onClick={async () => {
                setError("");
                if (resetPw.length < 4) { setError(t("passwordTooShort")); return; }
                if (resetPw !== resetConfirm) { setError(t("passwordsDontMatch")); return; }
                const ok = await vault.resetVault(resetPw);
                if (!ok) setError(t("vaultResetError"));
              }}>🔄 {t("resetVaultBtn")}</Button>
              <Button variant="outline" className="w-full" onClick={() => { setShowReset(false); setError(""); }}>← {t("back")}</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">🔒 {t("vaultLocked")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">{t("vaultUnlockDesc")}</p>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <Label>{t("masterPassword")}</Label>
                <Input type="password" value={masterPw} onChange={(e) => setMasterPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (async () => { setError(""); const ok = await vault.unlock(masterPw); if (!ok) setError(t("wrongPassword")); })()} placeholder="Enter master password" />
              </div>
              <Button variant="primary" className="w-full" onClick={async () => {
                setError("");
                const ok = await vault.unlock(masterPw);
                if (!ok) setError(t("wrongPassword"));
              }}>🔓 {t("unlock")}</Button>
              <div className="text-center pt-2">
                <button onClick={() => setShowReset(true)} className="text-sm text-slate-400 hover:text-kawaii-purple dark:hover:text-kawaii-lavender squishy underline">
                  {t("forgotPassword")}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Unlocked vault
  const resetForm = () => {
    setFormTitle(""); setFormUrl(""); setFormUsername(""); setFormPassword(""); setFormNotes(""); setEditId(null); setShowForm(false);
  };

  const openNew = () => { resetForm(); setShowForm(true); };

  const openEdit = (item: VaultItem) => {
    setEditId(item.id);
    setFormTitle(item.title);
    setFormUrl(item.url);
    setFormUsername(item.username);
    setFormPassword(vault.decrypt(item.encrypted_password));
    setFormNotes(item.notes);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formTitle || !formPassword) return;
    const encrypted = vault.encrypt(formPassword);
    const body = { title: formTitle, url: formUrl, username: formUsername, encrypted_password: encrypted, notes: formNotes };
    const url = editId ? `/api/vault/${editId}` : "/api/vault";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    resetForm();
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/vault/${id}`, { method: "DELETE" });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">🔐 {t("vault")}</h1>
        <div className="flex gap-2">
          <Button variant="primary" onClick={openNew}>➕ {t("addItem")}</Button>
          <Button variant="outline" onClick={vault.lock}>🔒 {t("lock")}</Button>
        </div>
      </div>

      {/* Item form dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 max-w-md w-full shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold">{editId ? "✏️ " + t("editItem") : "➕ " + t("addItem")}</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">{t("jobTitle")}</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Upwork login" />
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
              <Button variant="primary" className="w-full" onClick={handleSave} disabled={!formTitle || !formPassword}>
                💾 {t("save")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-5xl mb-3">🔐</p>
            <p className="text-slate-400">{t("noVaultItems")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const decryptedPw = revealedIds.has(item.id) ? vault.decrypt(item.encrypted_password) : "••••••••";
            return (
              <Card key={item.id} className="squishy">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{item.title}</span>
                        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-kawaii-purple dark:text-kawaii-lavender">↗</a>}
                      </div>
                      {item.username && <p className="text-sm text-slate-500">{item.username}</p>}
                      <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm font-mono text-slate-600 dark:text-slate-300">{decryptedPw}</span>
                        <button onClick={() => reveal(item.id)} className="text-xs text-kawaii-purple dark:text-kawaii-lavender squishy">
                          {revealedIds.has(item.id) ? "🙈" : "👁️"}
                        </button>
                        <button onClick={() => copyPw(item)} className="text-xs text-kawaii-purple dark:text-kawaii-lavender squishy">
                          {copied === item.id ? "✅" : "📋"}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(item)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 squishy">✏️</button>
                      <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 squishy">🗑️</button>
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

export default function VaultPage() {
  return (
    <VaultProvider>
      <VaultInner />
    </VaultProvider>
  );
}
