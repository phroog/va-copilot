import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInvoicePdf } from "@/lib/invoices/pdf";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (invoiceError || !invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const buffer = await buildInvoicePdf({ invoice, profile });
    if (!buffer || buffer.byteLength === 0) {
      return NextResponse.json({ error: "PDF generation produced an empty file" }, { status: 500 });
    }
    return new NextResponse(new Blob([buffer], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoice_number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("PDF generation failed:", e);
    return NextResponse.json({ error: e?.message ?? "PDF generation failed" }, { status: 500 });
  }
}
