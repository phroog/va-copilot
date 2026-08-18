import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sellerSnapshot } from "@/lib/invoices/pdf";
import { normalizeCurrency } from "@/lib/currency";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*), jobs(title)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { client_name, client_address, client_email, issue_date, due_date, tax_rate, notes, status, items, job_id, seller, time_entry_ids, currency } = body;

  // Update invoice fields
  const update: Record<string, any> = {};
  if (client_name !== undefined) update.client_name = client_name;
  if (client_address !== undefined) update.client_address = client_address;
  if (client_email !== undefined) update.client_email = client_email;
  if (issue_date !== undefined) update.issue_date = issue_date;
  if (due_date !== undefined) update.due_date = due_date;
  if (tax_rate !== undefined) update.tax_rate = tax_rate;
  if (notes !== undefined) update.notes = notes;
  if (status !== undefined) update.status = status;
  if (job_id !== undefined) update.job_id = job_id;
  if (currency !== undefined) update.currency = normalizeCurrency(currency);

  // Refresh seller snapshot from profile when not explicitly provided
  if (seller || job_id !== undefined) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name, full_name, business_address, business_email, tax_id, bank_account")
      .eq("user_id", user.id)
      .maybeSingle();
    const snapshot = sellerSnapshot(profile);
    for (const key of Object.keys(snapshot)) {
      const val = (seller && seller[key]) || snapshot[key];
      if (val !== undefined && val !== null) update[key] = val;
    }
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from("invoices")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // When an invoice is marked paid, its total automatically lands in finances
  // (source "invoice"), so income and invoices stay in sync.
  if (status === "paid") {
    const { data: inv } = await supabase
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (inv) {
      const { data: already } = await supabase
        .from("income_log")
        .select("id")
        .eq("user_id", user.id)
        .eq("source", "invoice")
        .eq("invoice_id", id)
        .maybeSingle();

      if (!already) {
        const sub = (inv.invoice_items ?? []).reduce((s: number, i: any) => s + (Number(i.total ?? Number(i.quantity || 0) * Number(i.unit_price || 0)) || 0), 0);
        const total = sub + sub * (Number(inv.tax_rate) || 0) / 100;
        if (total > 0) {
          await supabase.from("income_log").insert({
            user_id: user.id,
            source: "invoice",
            invoice_id: id,
            amount: Math.round(total * 100) / 100,
            description: `Invoice ${inv.invoice_number} — ${inv.client_name}`,
            earned_at: new Date().toISOString().split("T")[0],
            currency: normalizeCurrency(inv.currency),
          });
        }
      }
    }
  }

  // Replace items if provided
  if (items) {
    await supabase.from("invoice_items").delete().eq("invoice_id", id);
    if (items.length > 0) {
      const itemRows = items.map((item: any) => ({
        invoice_id: id,
        description: item.description,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? 0,
      }));
      const { error: itemError } = await supabase.from("invoice_items").insert(itemRows);
      if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });
    }
  }

  // Re-link tracked time entries for traceability
  if (time_entry_ids !== undefined) {
    const selected = new Set(time_entry_ids);
    const { data: linked } = await supabase
      .from("time_entries")
      .select("id")
      .eq("invoice_id", id)
      .eq("user_id", user.id);

    const toUnlink = (linked ?? []).map((l: any) => l.id).filter((tid: string) => !selected.has(tid));
    if (toUnlink.length > 0) {
      const { error: unlinkError } = await supabase
        .from("time_entries")
        .update({ invoice_id: null })
        .in("id", toUnlink)
        .eq("user_id", user.id);
      if (unlinkError) return NextResponse.json({ error: unlinkError.message }, { status: 500 });
    }

    if (time_entry_ids.length > 0) {
      const { error: linkError } = await supabase
        .from("time_entries")
        .update({ invoice_id: id })
        .in("id", time_entry_ids)
        .eq("user_id", user.id)
        .is("invoice_id", null);
      if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  }

  // Return updated invoice
  const { data: full } = await supabase
    .from("invoices")
    .select("*, invoice_items(*), jobs(title)")
    .eq("id", id)
    .single();

  return NextResponse.json({ invoice: full });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
