"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/toast";
import { formatMoney, normalizeCurrency, CURRENCIES, CURRENCY_SYMBOLS } from "@/lib/currency";
import Link from "next/link";

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_address: string;
  client_email: string;
  issue_date: string;
  due_date: string;
  status: string;
  notes: string;
  tax_rate: number;
  currency: string;
  created_at: string;
  invoice_items: InvoiceItem[];
  job_id?: string | null;
  jobs?: { title: string } | null;
}

interface JobOption {
  id: string;
  title: string;
  client_name: string;
  client_address: string;
  client_email: string;
  budget?: string | null;
  budget_amount?: number | null;
}

interface TrackedEntry {
  id: string;
  date: string;
  description: string;
  hours: number;
  hourly_rate: number;
  amount: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
  sent: "bg-kawaii-lavender/30 text-kawaii-purple dark:text-kawaii-lavender",
  paid: "bg-kawaii-mint/30 text-green-700 dark:text-green-300",
  overdue: "bg-kawaii-coral/30 text-red-700 dark:text-red-300",
};

export default function InvoicesPage() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Job & time tracking linkage
  const [jobId, setJobId] = useState<string | null>(null);
  const [trackedEntries, setTrackedEntries] = useState<TrackedEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [trackedLoaded, setTrackedLoaded] = useState(false);
  const [trackedLoading, setTrackedLoading] = useState(false);

  // Form fields
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerTaxId, setSellerTaxId] = useState("");

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      setInvoices(data.invoices ?? []);
    } catch (e) {
      showToast((e as any)?.message ?? "Failed to load invoices", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.jobs ?? []).filter((j: JobOption) => j.client_name);
        setJobs(list);
        const url = new URL(window.location.href);
        const jobParam = url.searchParams.get("job");
        if (jobParam) {
          openNew();
          const match = list.find((j: JobOption) => j.id === jobParam);
          if (match) {
            selectJob(match.id);
          }
        }
      })
      .catch(() => showToast("Failed to load jobs", "error"));

    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        const p = data.profile;
        if (p) {
          if (p.base_currency) setCurrency(normalizeCurrency(p.base_currency));
          setSellerName(p.business_name || p.full_name || "");
          setSellerEmail(p.business_email || "");
          setSellerTaxId(p.tax_id || "");
        }
      })
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setClientName("");
    setClientAddress("");
    setClientEmail("");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setTaxRate("0");
    setCurrency(normalizeCurrency(currency));
    setNotes("");
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setJobId(null);
    setTrackedEntries([]);
    setSelectedIds(new Set());
    setTrackedLoaded(false);
    setEditId(null);
    setShowForm(false);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditId(inv.id);
    setClientName(inv.client_name);
    setClientAddress(inv.client_address ?? "");
    setClientEmail(inv.client_email ?? "");
    setIssueDate(inv.issue_date);
    setDueDate(inv.due_date ?? "");
    setTaxRate(String(inv.tax_rate));
    setCurrency(normalizeCurrency(inv.currency));
    setNotes(inv.notes ?? "");
    setItems(inv.invoice_items?.length > 0 ? inv.invoice_items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })) : [{ description: "", quantity: 1, unit_price: 0 }]);
    setJobId(inv.job_id ?? null);
    setTrackedEntries([]);
    setSelectedIds(new Set());
    setTrackedLoaded(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!clientName) return;
    setSaving(true);
    try {
      const body: Record<string, any> = {
        client_name: clientName,
        client_address: clientAddress,
        client_email: clientEmail,
        issue_date: issueDate,
        due_date: dueDate || null,
        tax_rate: parseFloat(taxRate) || 0,
        currency: normalizeCurrency(currency),
        notes,
        items: allItems.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })).filter((i) => i.description.trim()),
        job_id: jobId || null,
      };
      if (trackedLoaded) body.time_entry_ids = Array.from(selectedIds);
      const url = editId ? `/api/invoices/${editId}` : "/api/invoices";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        resetForm();
        fetchInvoices();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast((err as any)?.error ?? "Failed to save invoice", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    fetchInvoices();
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchInvoices();
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const copy = [...items];
    (copy[index] as any)[field] = value;
    setItems(copy);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const addFixedPriceFromJob = () => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    let price = typeof job.budget_amount === "number" ? job.budget_amount : NaN;
    if (!isFinite(price)) {
      const parsed = parseFloat(String(job.budget || "").replace(/[^0-9.]/g, ""));
      price = isNaN(parsed) ? 0 : parsed;
    }
    if (price <= 0) {
      showToast("No budget available for this job", "error");
      return;
    }
    setItems((prev) => [
      ...prev,
      { description: `${job.title} — Fixed price (one-time)`, quantity: 1, unit_price: price },
    ]);
    showToast(`Fixed price of ${formatMoney(price, currency)} added 💰`);
  };

  // ── Compliance check (before you send a real invoice) ─────────────
  const selectJob = (selectedId: string) => {
    setJobId(selectedId || null);
    setTrackedEntries([]);
    setSelectedIds(new Set());
    setTrackedLoaded(false);
    const job = jobs.find((j) => j.id === selectedId);
    if (job) {
      setClientName(job.client_name);
      setClientAddress(job.client_address ?? "");
      setClientEmail(job.client_email ?? "");
    }
    if (selectedId) {
      setTrackedLoading(true);
      fetch(`/api/invoices/suggest-items?job_id=${selectedId}`)
        .then(async (r) => {
          if (!r.ok) throw new Error("Failed to load tracked time");
          return r.json();
        })
        .then((d) => {
          const list: TrackedEntry[] = d.entries ?? [];
          setTrackedEntries(list);
          setSelectedIds(new Set(list.map((e) => e.id)));
          setTrackedLoaded(true);
        })
        .catch((e) => {
          showToast((e as any)?.message ?? "Failed to load tracked time", "error");
        })
        .finally(() => setTrackedLoading(false));
    }
  };

  const toggleEntry = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllTracked = () => setSelectedIds(new Set(trackedEntries.map((e) => e.id)));
  const clearTracked = () => setSelectedIds(new Set());

  const trackedItems: InvoiceItem[] = trackedEntries
    .filter((e) => selectedIds.has(e.id))
    .map((e) => ({ description: `${e.date} — ${e.description}`, quantity: e.hours, unit_price: e.hourly_rate, total: e.amount }));

  const allItems: InvoiceItem[] = [...items, ...trackedItems];

  // ── Compliance check (before you send a real invoice) ─────────────
  const compliance = useMemo(() => {
    const validItems = allItems.filter((i) => i.description.trim() && (parseFloat(String(i.quantity)) || 0) > 0 && (parseFloat(String(i.unit_price)) || 0) >= 0);
    const checks = [
      { label: "Client name", field: "clientName", ok: !!clientName.trim(), critical: true },
      { label: "Client email", field: "clientEmail", ok: /^\S+@\S+\.\S+$/.test(clientEmail.trim()), critical: false },
      { label: "At least one line item", field: "items", ok: validItems.length > 0, critical: true },
      { label: "Seller (your name/company)", field: "seller", ok: !!sellerName.trim(), critical: true },
      { label: "Tax ID (TIN/VAT)", field: "taxId", ok: !!sellerTaxId.trim(), critical: false },
      { label: "Due date set", field: "dueDate", ok: !!dueDate, critical: false },
      { label: "Payment terms (notes)", field: "notes", ok: notes.trim().length >= 10, critical: false },
    ];
    const passed = checks.filter((c) => c.ok).length;
    const criticalMissing = checks.filter((c) => c.critical && !c.ok).length;
    return { checks, passed, total: checks.length, criticalMissing, ready: criticalMissing === 0 };
  }, [clientName, clientEmail, allItems, sellerName, sellerTaxId, dueDate, notes]);

  // Clicking a failed check jumps to the field so the user can fix it.
  const focusField = (field: string) => {
    if (field === "seller" || field === "taxId") {
      window.location.href = "/dashboard/settings";
      return;
    }
    if (field === "items") {
      const first = document.querySelector<HTMLInputElement>(".invoice-item-desc");
      if (first) { first.focus(); first.scrollIntoView({ behavior: "smooth", block: "center" }); }
      return;
    }
    const el = document.getElementById(`inv-${field}`) as HTMLInputElement | null;
    if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
  };

  const calcSubtotal = () => allItems.reduce((s, i) => s + (parseFloat(String(i.quantity)) || 0) * (parseFloat(String(i.unit_price)) || 0), 0);
  const calcTax = () => calcSubtotal() * ((parseFloat(taxRate) || 0) / 100);
  const calcTotal = () => calcSubtotal() + calcTax();

  const generatePdf = (id: string) => {
    window.open(`/api/invoices/${id}/pdf`, "_blank");
  };

  const statusBadge = (status: string) => (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">📄 {t("invoices")}</h1>
        <Button variant="primary" onClick={openNew}>➕ {t("newInvoice")}</Button>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)}
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-5xl mb-3">📄</p>
            <p className="text-slate-400">{t("noInvoices")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const sub = (inv.invoice_items ?? []).reduce((s, i) => s + Number(i.total || i.quantity * i.unit_price), 0);
            const total = sub + sub * (Number(inv.tax_rate) / 100);
            return (
              <Card key={inv.id} className="squishy cursor-pointer" onClick={() => openEdit(inv)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-kawaii-purple dark:text-kawaii-lavender">{inv.invoice_number}</span>
                        {statusBadge(inv.status)}
                      </div>
                      <p className="text-sm font-semibold mt-1">{inv.client_name}</p>
                      <p className="text-xs text-slate-400">
                        {inv.issue_date} {inv.due_date ? `— Due: ${inv.due_date}` : ""}
                      </p>
                      {inv.jobs?.title && (
                        <p className="text-xs text-kawaii-purple dark:text-kawaii-lavender mt-0.5">💼 {inv.jobs.title}</p>
                      )}
                    </div>
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{formatMoney(total, inv.currency)}</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {inv.status === "draft" && (
                      <>
                        <Button size="sm" variant="outline" className="text-xs" onClick={(e) => { e.stopPropagation(); generatePdf(inv.id); }}>📥 PDF</Button>
                        <Button size="sm" variant="outline" className="text-xs" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(inv.id, "sent"); }}>📤 {t("markSent")}</Button>
                      </>
                    )}
                    {inv.status === "sent" && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(inv.id, "paid"); }}>✅ {t("markPaid")}</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-xs" onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}>🗑️</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Invoice Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-dark-card rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-slide-up my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold">{editId ? "✏️ " + t("editInvoice") : "➕ " + t("newInvoice")}</h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl">✕</button>
            </div>

            <div className="space-y-4">
              {/* Client from Job */}
              {jobs.length > 0 && (
                <div>
                  <Label className="text-xs">{t("selectClientFromJob")}</Label>
                  <select
                    value={jobId ?? ""}
                    onChange={(e) => selectJob(e.target.value)}
                    className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2.5 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
                  >
                    <option value="">— {t("typeManually")} —</option>
                    {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.client_name}</option>)}
                  </select>
                  {jobId && (
                    <div className="mt-3 rounded-2xl border border-kawaii-lavender/30 dark:border-dark-surface p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">⏱ Unbilled tracked time</p>
                        {trackedEntries.length > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <button onClick={selectAllTracked} className="text-kawaii-purple dark:text-kawaii-lavender hover:underline">Select all</button>
                            <button onClick={clearTracked} className="text-slate-400 hover:underline">Clear</button>
                          </div>
                        )}
                      </div>
                      {trackedLoading ? (
                        <p className="text-xs text-slate-400 animate-pulse">Loading tracked time...</p>
                      ) : trackedEntries.length === 0 ? (
                        <p className="text-xs text-slate-400">No unbilled tracked time for this job.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {trackedEntries.map((entry) => {
                            const checked = selectedIds.has(entry.id);
                            return (
                              <label key={entry.id} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer text-sm transition-all ${checked ? "bg-kawaii-lavender/20 dark:bg-kawaii-purple/20" : "bg-white/50 dark:bg-dark-surface/40 hover:bg-kawaii-lavender/10"}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleEntry(entry.id)} className="rounded border-kawaii-lavender/40 text-kawaii-purple focus:ring-kawaii-purple" />
                                <span className="flex-1 min-w-0">
                                  <span className="block text-slate-700 dark:text-slate-200 truncate">{entry.date} — {entry.description}</span>
                                  <span className="block text-xs text-slate-400">{entry.hours.toFixed(2)}h @ {formatMoney(entry.hourly_rate, currency)}</span>
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-200 shrink-0">{formatMoney(entry.amount, currency)}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <button
                        onClick={addFixedPriceFromJob}
                        className="mt-2 w-full text-xs font-bold text-kawaii-purple dark:text-kawaii-lavender border border-dashed border-kawaii-purple/40 rounded-xl py-2 hover:bg-kawaii-purple/10 transition-colors"
                      >
                        💰 Add fixed price from job budget as a line item (one-time project)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Client Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("clientName")}</Label>
                  <Input id="inv-clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" />
                </div>
                <div>
                  <Label className="text-xs">{t("clientEmail")}</Label>
                  <Input id="inv-clientEmail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.com" />
                </div>
              </div>
              <div>
                <Label className="text-xs">{t("clientAddress")}</Label>
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Client address" />
              </div>

              {/* Dates, Currency & Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">{t("issueDate")}</Label>
                  <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{t("dueDate")}</Label>
                  <Input id="inv-dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2.5 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">{t("taxRate")} (%)</Label>
                  <Input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold">{t("items")} ({allItems.length})</Label>
                  <Button size="sm" variant="outline" className="text-xs" onClick={addItem}>➕ {t("addItem")}</Button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={`m${i}`} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          placeholder={t("description")}
                          value={item.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                          className="text-sm invoice-item-desc"
                        />
                      </div>
                      <div className="w-16">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                          className="text-sm text-center"
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unit_price}
                          onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                          className="text-sm text-center"
                        />
                      </div>
                      <div className="w-20 text-sm font-bold text-slate-600 dark:text-slate-300 text-center py-2">
                        {formatMoney((parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.unit_price)) || 0), currency)}
                      </div>
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg pb-1">✕</button>
                    </div>
                  ))}
                  {trackedItems.map((item, i) => (
                    <div key={`t${i}`} className="flex gap-2 items-end rounded-xl bg-kawaii-lavender/10 dark:bg-kawaii-purple/10 px-2">
                      <div className="flex-1 text-sm text-slate-700 dark:text-slate-200 py-2 truncate">🕐 {item.description}</div>
                      <div className="w-16 text-sm text-center py-2 text-slate-600 dark:text-slate-300">{item.quantity}</div>
                      <div className="w-20 text-sm text-center py-2 text-slate-600 dark:text-slate-300">{formatMoney(item.unit_price, currency)}</div>
                      <div className="w-20 text-sm font-bold text-slate-700 dark:text-slate-200 text-center py-2">{formatMoney(item.total ?? 0, currency)}</div>
                      <button onClick={() => toggleEntry(trackedEntries.filter((e) => selectedIds.has(e.id))[i]?.id ?? "")} className="text-slate-400 text-lg pb-1" title="Remove from invoice">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs">{t("notes")}</Label>
                <Input id="inv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, additional notes..." />
              </div>

              {/* Compliance check */}
              <div className={`rounded-2xl border p-4 ${compliance.ready ? "border-green-300/60 bg-green-50/60 dark:bg-green-900/10" : "border-kawaii-coral/40 bg-kawaii-coral/10 dark:bg-red-900/10"}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    {compliance.ready ? "✅ Compliance passed" : "⚠️ Compliance check"}
                  </p>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{compliance.passed}/{compliance.total} checks</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {compliance.checks.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => !c.ok && focusField(c.field)}
                      disabled={c.ok}
                      className={`flex items-center gap-2 text-xs text-left rounded-lg px-1.5 py-1 transition-colors ${!c.ok ? "hover:bg-kawaii-lavender/20 cursor-pointer" : "cursor-default"}`}
                    >
                      <span className={c.ok ? "text-green-600 dark:text-green-400" : "text-red-500"}>{c.ok ? "✓" : c.critical ? "✗" : "⚠"}</span>
                      <span className={`text-slate-600 dark:text-slate-300 ${!c.ok && c.critical ? "font-bold" : ""}`}>{c.label}</span>
                      {!c.ok && <span className="ml-auto text-kawaii-purple dark:text-kawaii-lavender underline shrink-0">Fill in →</span>}
                    </button>
                  ))}
                </div>
                {!compliance.ready && (
                  <p className="text-xs text-red-500 mt-2 font-medium">Required fields are missing — you can save as a draft, but not mark it as "Sent" yet. Click a check to jump to the field.</p>
                )}
              </div>

              {/* Totals */}
              <div className="text-right space-y-1 border-t border-kawaii-lavender/20 pt-3">
                <p className="text-sm text-slate-500">{t("subtotal")}: {formatMoney(calcSubtotal(), currency)}</p>
                <p className="text-sm text-slate-500">{t("tax")} ({taxRate}%): {formatMoney(calcTax(), currency)}</p>
                <p className="text-xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender">{t("total")}: {formatMoney(calcTotal(), currency)}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="primary" className="flex-1" onClick={handleSave} disabled={!clientName || saving}>
                  💾 {saving ? t("saving") + "..." : t("save")}
                </Button>
                <Button variant="ghost" onClick={resetForm}>{t("cancel")}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
