import pdfMake from "pdfmake/build/pdfmake";
import vfs from "pdfmake/build/vfs_fonts";

// pdfmake >= 0.3 registers fonts via the virtual file system (pdfMake.vfs = ... does nothing).
pdfMake.addVirtualFileSystem(vfs as any);

export const CURRENCY = "$";

function numberToWords(n: number): string {
  const ones = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Million", "Billion", "Trillion"];
  const two = (m: number) => (m < 20 ? ones[m] : tens[Math.floor(m / 10)] + (m % 10 ? " " + ones[m % 10] : ""));
  const three = (m: number) => (m < 100 ? two(m) : ones[Math.floor(m / 100)] + " Hundred" + (m % 100 ? " " + two(m % 100) : ""));
  if (n === 0) return "Zero";
  const parts: string[] = [];
  let scale = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) parts.push(scale ? three(chunk) + " " + scales[scale] : three(chunk));
    n = Math.floor(n / 1000);
    scale++;
  }
  return parts.reverse().join(" ");
}

function amountInWords(total: number): string {
  const whole = Math.floor(total);
  const cents = Math.round((total - whole) * 100);
  if (cents === 0) return `${numberToWords(whole)} and 00/100 ${CURRENCY} ONLY`;
  return `${numberToWords(whole)} and ${String(cents).padStart(2, "0")}/100 ${CURRENCY} ONLY`;
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const due = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export function sellerSnapshot(profile: any): Record<string, string> {
  return {
    seller_name: profile?.business_name || profile?.full_name || "",
    seller_address: profile?.business_address || "",
    seller_email: profile?.business_email || "",
    seller_tax_id: profile?.tax_id || "",
    seller_bank: profile?.bank_account || "",
  };
}

export async function buildInvoicePdf(opts: {
  invoice: any;
  items?: InvoiceItem[];
  profile?: any;
}): Promise<ArrayBuffer> {
  const { invoice, profile } = opts;

  const items: InvoiceItem[] =
    opts.items ??
    (invoice.invoice_items ?? []).map((item: any) => ({
      description: String(item.description ?? ""),
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      total: Number(item.total ?? (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)) || 0,
    }));

  const subtotal = items.reduce((s: number, i) => s + i.total, 0);
  const taxRate = Number(invoice.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const daysLeft = daysUntil(invoice.due_date);
  const dueNote = invoice.due_date
    ? daysLeft !== null && daysLeft >= 0
      ? `Payment due in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (by ${invoice.due_date}).`
      : `Payment was due on ${invoice.due_date}.`
    : "Payment due within 30 days of issue date.";

  const sellerName = invoice.seller_name || profile?.business_name || profile?.full_name || "Your Business Name";
  const sellerLines: any[] = [
    { text: sellerName, bold: true, fontSize: 12 },
    ...(invoice.seller_address || profile?.business_address ? [{ text: invoice.seller_address || profile.business_address }] : []),
    ...(invoice.seller_email || profile?.business_email ? [{ text: invoice.seller_email || profile.business_email }] : []),
    ...(invoice.seller_tax_id || profile?.tax_id ? [{ text: `TIN / Tax ID: ${invoice.seller_tax_id || profile.tax_id}` }] : []),
    ...(invoice.seller_bank || profile?.bank_account ? [{ text: `Payment to: ${invoice.seller_bank || profile.bank_account}` }] : []),
  ];

  const buyerLines: any[] = [
    { text: invoice.client_name as string, bold: true },
    ...(invoice.client_address ? [{ text: invoice.client_address as string }] : []),
    ...(invoice.client_email ? [{ text: invoice.client_email as string }] : []),
  ];

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [48, 64, 48, 72],
    defaultStyle: { font: "Roboto", fontSize: 10 },
    content: [
      {
        columns: [
          { text: "INVOICE", style: "header" },
          { text: invoice.invoice_number, style: "subheader", alignment: "right" },
        ],
      },
      { text: "\n" },
      {
        columns: [
          { width: "50%", stack: [{ text: "FROM", style: "sectionLabel" }, ...sellerLines] },
          { width: "50%", alignment: "right", stack: [{ text: "BILL TO", style: "sectionLabel" }, ...buyerLines] },
        ],
      },
      { text: "\n" },
      {
        table: {
          widths: ["*", "*", "*"],
          body: [
            [
              { text: "Invoice Date", style: "metaLabel" },
              { text: "Due Date", style: "metaLabel" },
              { text: "Status", style: "metaLabel" },
            ],
            [
              { text: invoice.issue_date || "-" },
              { text: invoice.due_date || "-" },
              { text: String(invoice.status ?? "draft").toUpperCase() },
            ],
          ],
        },
        layout: "noBorders",
      },
      { text: "\n" },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto"],
          body: [
            [
              { text: "Description", style: "tableHeader" },
              { text: "Qty", style: "tableHeader" },
              { text: "Unit Price", style: "tableHeader" },
              { text: "Amount", style: "tableHeader" },
            ],
            ...(items.length
              ? items.map((item) => [
                  { text: item.description, style: "cell" },
                  { text: String(item.quantity), style: "cell", alignment: "right" },
                  { text: `${CURRENCY}${item.unit_price.toFixed(2)}`, style: "cell", alignment: "right" },
                  { text: `${CURRENCY}${item.total.toFixed(2)}`, style: "cell", alignment: "right" },
                ])
              : [[{ text: "No items", colSpan: 4, style: "cell" }, {}, {}, {}]]),
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1 ? 0.8 : 0.3),
          vLineWidth: () => 0,
          hLineColor: () => "#dddddd",
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      },
      { text: "\n" },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Amount Due (in words):", bold: true },
              { text: amountInWords(total), italics: true },
            ],
          },
          {
            width: "auto",
            stack: [
              { text: `Subtotal: ${CURRENCY}${subtotal.toFixed(2)}`, alignment: "right" },
              { text: `Tax / VAT (${taxRate}%): ${CURRENCY}${taxAmount.toFixed(2)}`, alignment: "right" },
              { text: "\n" },
              { text: `Total Due: ${CURRENCY}${total.toFixed(2)}`, alignment: "right", bold: true, fontSize: 14, color: "#6d28d9" },
            ],
          },
        ],
      },
      ...(invoice.notes
        ? [
            { text: "\n" },
            {
              stack: [
                { text: "NOTES / PAYMENT TERMS", style: "sectionLabel" },
                { text: invoice.notes as string, italics: true },
              ],
            },
          ]
        : []),
      { text: "\n" },
      {
        stack: [
          { text: dueNote, italics: true, color: "#666" },
          { text: "This is a computer-generated invoice and is valid without signature or seal." },
          ...(taxRate > 0 ? [{ text: `Includes ${taxRate}% tax / VAT as applicable under local regulations.` }] : []),
        ],
        color: "#555",
        fontSize: 9,
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: sellerName, alignment: "left", margin: [48, 0, 0, 0] },
        { text: `${invoice.invoice_number} — Page ${currentPage} of ${pageCount}`, alignment: "right", margin: [0, 0, 48, 0] },
      ],
      fontSize: 8,
      color: "#999",
      margin: [0, 20, 0, 0],
    }),
    styles: {
      header: { fontSize: 30, bold: true, color: "#6d28d9" },
      subheader: { fontSize: 16, color: "#555", marginTop: 8 },
      sectionLabel: { fontSize: 9, bold: true, color: "#888", letterSpacing: 1, marginBottom: 4 },
      metaLabel: { fontSize: 8, bold: true, color: "#888", letterSpacing: 1 },
      tableHeader: { bold: true, fillColor: "#f3e5f5", color: "#333", fontSize: 9 },
      cell: { fontSize: 10 },
    },
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  const buffer = await pdfDoc.getBuffer();
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}
