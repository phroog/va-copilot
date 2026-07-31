import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInvoicePdf } from "@/lib/invoices/pdf";

export async function GET(request: Request, { params }: { params: Promise<{ token: string; invoiceId: string }> }) {
  const supabase = createClient();
  const { token, invoiceId } = await params;

  const { data: tokenData } = await supabase
    .from("client_access_tokens")
    .select("id, job_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenData) return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 410 });
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", invoiceId)
    .maybeSingle();

  // Only expose invoices that belong to the job this token grants access to
  if (!invoice || invoice.job_id !== tokenData.job_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await buildInvoicePdf({ invoice });
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
    console.error("Portal PDF generation failed:", e);
    return NextResponse.json({ error: e?.message ?? "PDF generation failed" }, { status: 500 });
  }
}
