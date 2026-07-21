import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("invoices")
    .select("*, invoice_items(*)")
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
  const { client_name, client_address, client_email, issue_date, due_date, tax_rate, notes, items } = body;

  if (!client_name) {
    return NextResponse.json({ error: "client_name is required" }, { status: 400 });
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
      client_name,
      client_address: client_address ?? "",
      client_email: client_email ?? "",
      issue_date: issue_date || new Date().toISOString().split("T")[0],
      due_date: due_date || null,
      tax_rate: tax_rate ?? 0,
      notes: notes ?? "",
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

  // Fetch full invoice with items
  const { data: full } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", invoice.id)
    .single();

  return NextResponse.json({ invoice: full });
}
