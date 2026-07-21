"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
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
  created_at: string;
  invoice_items: InvoiceItem[];
}

interface JobOption {
  id: string;
  title: string;
  client_name: string;
  client_address: string;
  client_email: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
  sent: "bg-kawaii-lavender/30 text-kawaii-purple dark:text-kawaii-lavender",
  paid: "bg-kawaii-mint/30 text-green-700 dark:text-green-300",
  overdue: "bg-kawaii-coral/30 text-red-700 dark:text-red-300",
};

export default function InvoicesPage() {
  const { t } = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      setInvoices(data.invoices ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => setJobs((data.jobs ?? []).filter((j: JobOption) => j.client_name)))
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setClientName("");
    setClientAddress("");
    setClientEmail("");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setTaxRate("0");
    setNotes("");
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
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
    setNotes(inv.notes ?? "");
    setItems(inv.invoice_items?.length > 0 ? inv.invoice_items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })) : [{ description: "", quantity: 1, unit_price: 0 }]);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!clientName) return;
    setSaving(true);
    try {
      const body = {
        client_name: clientName,
        client_address: clientAddress,
        client_email: clientEmail,
        issue_date: issueDate,
        due_date: dueDate || null,
        tax_rate: parseFloat(taxRate) || 0,
        notes,
        items: items.filter((i) => i.description.trim()),
      };
      const url = editId ? `/api/invoices/${editId}` : "/api/invoices";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        resetForm();
        fetchInvoices();
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

  const selectJob = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setClientName(job.client_name);
      setClientAddress(job.client_address ?? "");
      setClientEmail(job.client_email ?? "");
    }
  };

  const calcSubtotal = () => items.reduce((s, i) => s + (parseFloat(String(i.quantity)) || 0) * (parseFloat(String(i.unit_price)) || 0), 0);
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
                    </div>
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-200">${total.toFixed(2)}</span>
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
                    onChange={(e) => e.target.value && selectJob(e.target.value)}
                    className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2.5 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
                  >
                    <option value="">— {t("typeManually")} —</option>
                    {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.client_name}</option>)}
                  </select>
                </div>
              )}

              {/* Client Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("clientName")}</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" />
                </div>
                <div>
                  <Label className="text-xs">{t("clientEmail")}</Label>
                  <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.com" />
                </div>
              </div>
              <div>
                <Label className="text-xs">{t("clientAddress")}</Label>
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Client address" />
              </div>

              {/* Dates & Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{t("issueDate")}</Label>
                  <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{t("dueDate")}</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{t("taxRate")} (%)</Label>
                  <Input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold">{t("items")}</Label>
                  <Button size="sm" variant="outline" className="text-xs" onClick={addItem}>➕ {t("addItem")}</Button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          placeholder={t("description")}
                          value={item.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                          className="text-sm"
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
                          placeholder="$"
                          value={item.unit_price}
                          onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                          className="text-sm text-center"
                        />
                      </div>
                      <div className="w-16 text-sm font-bold text-slate-600 dark:text-slate-300 text-center py-2">
                        ${((parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.unit_price)) || 0)).toFixed(2)}
                      </div>
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg pb-1">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs">{t("notes")}</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, additional notes..." />
              </div>

              {/* Totals */}
              <div className="text-right space-y-1 border-t border-kawaii-lavender/20 pt-3">
                <p className="text-sm text-slate-500">{t("subtotal")}: ${calcSubtotal().toFixed(2)}</p>
                <p className="text-sm text-slate-500">{t("tax")} ({taxRate}%): ${calcTax().toFixed(2)}</p>
                <p className="text-xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender">{t("total")}: ${calcTotal().toFixed(2)}</p>
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
