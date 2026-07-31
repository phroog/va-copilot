import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sellerSnapshot } from "@/lib/invoices/pdf";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("invoices")
    .select("*, invoice_items(*), jobs(title, client_name, client_address, client_email)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoices: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { client_name, client_address, client_email, issue_date, due_date, tax_rate, notes, items, job_id, seller, time_entry_ids } = body;

  if (!client_name && !job_id) {
    return NextResponse.json({ error: "client_name or job_id is required" }, { status: 400 });
  }

  // Resolve client info + seller snapshot from job/profile when available
  let resolvedClient: any = { client_name, client_address, client_email };
  if (job_id) {
    const { data: job } = await supabase
      .from("jobs")
      .select("id, title, client_name, client_address, client_email")
      .eq("id", job_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (job) {
      resolvedClient = {
        client_name: resolvedClient.client_name || job.client_name || "",
        client_address: resolvedClient.client_address || job.client_address || "",
        client_email: resolvedClient.client_email || job.client_email || "",
      };
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, full_name, business_address, business_email, tax_id, bank_account")
    .eq("user_id", user.id)
    .maybeSingle();

  const snapshot = sellerSnapshot(profile);
  const finalSeller: Record<string, string> = {};
  for (const key of Object.keys(snapshot)) {
    finalSeller[key] = (seller && seller[key]) || snapshot[key] || "";
  }

  // Generate invoice number
  const { data: existing } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (existing && existing.length > 0) {
    const lastNum = parseInt(existing[0].invoice_number.replace("INV-", ""), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }
  const invoice_number = `INV-${String(nextNum).padStart(4, "0")}`;

  // Create invoice
  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      invoice_number,
      client_name: resolvedClient.client_name || "Client",
      client_address: resolvedClient.client_address ?? "",
      client_email: resolvedClient.client_email ?? "",
      issue_date: issue_date || new Date().toISOString().split("T")[0],
      due_date: due_date || null,
      tax_rate: tax_rate ?? 0,
      notes: notes ?? "",
      job_id: job_id ?? null,
      ...finalSeller,
    })
    .select()
    .single();

  if (invError) return NextResponse.json({ error: invError.message }, { status: 500 });

  // Create items
  if (items && items.length > 0) {
    const itemRows = items.map((item: any) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity ?? 1,
      unit_price: item.unit_price ?? 0,
    }));
    const { error: itemError } = await supabase
      .from("invoice_items")
      .insert(itemRows);
    if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });
  }

  // Link tracked time entries to this invoice for traceability
  if (time_entry_ids && time_entry_ids.length > 0) {
    const { error: linkError } = await supabase
      .from("time_entries")
      .update({ invoice_id: invoice.id })
      .in("id", time_entry_ids)
      .eq("user_id", user.id)
      .is("invoice_id", null);
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  // Fetch full invoice with items
  const { data: full } = await supabase
    .from("invoices")
    .select("*, invoice_items(*), jobs(title)")
    .eq("id", invoice.id)
    .single();

  return NextResponse.json({ invoice: full });
}
