import pdfMake from "pdfmake/build/pdfmake";
import vfs from "pdfmake/build/vfs_fonts";
import type { CvData } from "@/lib/cv/types";

pdfMake.addVirtualFileSystem(vfs as any);

const ACCENT = "#6d28d9";
const DARK = "#333333";
const MUTED = "#777777";

/** Build a clean, modern CV PDF from structured CV data. */
export async function generateCvPdf(data: Partial<CvData> | null | undefined): Promise<ArrayBuffer> {
  const cv: Partial<CvData> = data || {};

  const contact = [cv.email, cv.phone, cv.location, cv.website, cv.linkedin].filter(Boolean);
  const section = (title: string, body: any[]): any[] => [
    { text: title, style: "sectionTitle" },
    { table: { widths: ["100%"], body: [[{ stack: body, style: "sectionBody" }]] }, layout: "noBorders", margin: [0, 0, 0, 10] },
  ];

  const experienceRows: any[] = (cv.experience || []).map((e) => ({
    columns: [
      { text: [e.role ? { text: e.role + "\n", bold: true, color: DARK } : {}, e.company ? { text: e.company + "\n", color: ACCENT } : {}], width: "*" },
      { text: [e.start, e.end].filter(Boolean).join(" – ") + (e.location ? "\n" + e.location : ""), alignment: "right", color: MUTED, fontSize: 9 },
    ],
    margin: [0, 0, 0, 6],
  }));

  for (const e of cv.experience || []) {
    if (e.bullets?.length) {
      experienceRows.push({ ul: e.bullets.filter(Boolean), margin: [4, 0, 0, 8], color: DARK, fontSize: 10 });
    }
  }

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 36, 40, 36],
    content: [
      // Header band
      {
        canvas: [
          { type: "rect", x: -40, y: -36, w: 595, h: 86, color: ACCENT },
        ],
      },
      {
        margin: [0, -66, 0, 20],
        columns: [
          {
            text: (cv.full_name || "Dein Name") + "\n",
            fontSize: 26,
            bold: true,
            color: "white",
          },
          {
            text: cv.headline || "",
            alignment: "right",
            fontSize: 13,
            color: "white",
            margin: [0, 14, 0, 0],
          },
        ],
      },
      contact.length
        ? { text: contact.join("   ·   "), fontSize: 9.5, color: MUTED, margin: [0, 0, 0, 14], alignment: "center" }
        : {},
      ...(cv.summary ? section("PROFIL", [{ text: cv.summary, fontSize: 10, lineHeight: 1.35, color: DARK }]) : []),
      ...(cv.skills?.length
        ? section("FÄHIGKEITEN", [
            {
              columns: (cv.skills || []).map((s) => ({
                text: "▸ " + s,
                width: "*",
                fontSize: 10,
                margin: [0, 1, 8, 1],
              })),
              columnGap: 4,
            },
          ])
        : []),
      ...(experienceRows.length ? section("ERFAHRUNG", experienceRows) : []),
      ...(cv.education?.length
        ? section("AUSBILDUNG", [
            {
              ul: (cv.education || []).map((e) => [e.degree, e.school, e.year].filter(Boolean).join(" — ")),
              fontSize: 10,
              color: DARK,
            },
          ])
        : []),
      ...(cv.certifications?.length
        ? section("ZERTIFIKATE", [
            { text: (cv.certifications || []).join("  ·  "), fontSize: 10, color: DARK },
          ])
        : []),
      ...(cv.languages?.length
        ? section("SPRACHEN", [
            { text: (cv.languages || []).map((l) => `${l.name}${l.level ? " (" + l.level + ")" : ""}`).join("  ·  "), fontSize: 10, color: DARK },
          ])
        : []),
    ],
    styles: {
      sectionTitle: { fontSize: 12, bold: true, color: ACCENT, margin: [0, 12, 0, 4], letterSpacing: 1 },
      sectionBody: {},
    },
    defaultStyle: { font: "Roboto" },
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  const buffer = await pdfDoc.getBuffer();
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}
