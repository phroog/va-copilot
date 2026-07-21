import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
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
  const { client_name, client_address, client_email, issue_date, due_date, tax_rate, notes, status, items } = body;

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

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from("invoices")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

  // Return updated invoice
  const { data: full } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
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
