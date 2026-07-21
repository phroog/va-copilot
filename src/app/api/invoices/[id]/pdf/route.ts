import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import pdfMake from "pdfmake/build/pdfmake";
import vfs from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = vfs;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Build PDF
  const itemsBody = [
    [{ text: "Description", style: "tableHeader" }, { text: "Qty", style: "tableHeader" }, { text: "Unit Price", style: "tableHeader" }, { text: "Total", style: "tableHeader" }],
    ...(invoice.invoice_items ?? []).map((item: any) => [
      item.description,
      String(item.quantity),
      `$${Number(item.unit_price).toFixed(2)}`,
      `$${Number(item.total).toFixed(2)}`,
    ]),
  ];

  const subtotal = (invoice.invoice_items ?? []).reduce((s: number, i: any) => s + Number(i.total), 0);
  const taxAmount = subtotal * (Number(invoice.tax_rate) / 100);
  const total = subtotal + taxAmount;

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    content: [
      { text: "INVOICE", style: "header" },
      { text: invoice.invoice_number, style: "subheader" },
      { text: "\n" },
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: profile?.business_name || "Your Business Name", bold: true },
              { text: profile?.business_address || "" },
              { text: profile?.business_email || user.email || "" },
              { text: profile?.bank_account ? `Bank: ${profile.bank_account}` : "" },
              { text: profile?.tax_id ? `Tax ID: ${profile.tax_id}` : "" },
            ],
          },
          {
            width: "50%",
            alignment: "right",
            stack: [
              { text: "Bill To:", bold: true },
              { text: invoice.client_name },
              { text: invoice.client_address || "" },
              { text: invoice.client_email || "" },
            ],
          },
        ],
      },
      { text: "\n" },
      {
        columns: [
          { width: "50%", text: `Issue Date: ${invoice.issue_date}` },
          { width: "50%", text: `Due Date: ${invoice.due_date || "N/A"}`, alignment: "right" },
        ],
      },
      { text: "\n" },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto"],
          body: itemsBody,
        },
        layout: "lightHorizontalLines",
      },
      { text: "\n" },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            stack: [
              { text: `Subtotal: $${subtotal.toFixed(2)}`, alignment: "right" },
              { text: `Tax (${invoice.tax_rate}%): $${taxAmount.toFixed(2)}`, alignment: "right" },
              { text: `Total: $${total.toFixed(2)}`, alignment: "right", bold: true, fontSize: 14 },
            ],
          },
        ],
      },
      { text: "\n\n" },
      invoice.notes ? { text: `Notes: ${invoice.notes}`, italics: true, color: "gray" } : {},
      { text: "\n\nThank you for your business! 🎀", alignment: "center", color: "#b388ff" },
    ],
    styles: {
      header: { fontSize: 28, bold: true, color: "#b388ff", alignment: "center" as const },
      subheader: { fontSize: 16, color: "#555", alignment: "center" as const },
      tableHeader: { bold: true, fillColor: "#f3e5f5", color: "#333" },
    },
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  const buffer: any = await new Promise((resolve) => {
    pdfDoc.getBuffer((buf: any) => resolve(buf));
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
