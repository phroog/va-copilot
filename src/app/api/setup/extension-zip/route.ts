import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

/* GET /api/setup/extension-zip
 * Authenticated: streams the user extension (this repo's `extension/` folder)
 * as a ZIP so users can install it without the Chrome Web Store yet.
 * Builds the ZIP in-process with a tiny stored-only writer (no deps). */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const extDir = path.join(process.cwd(), "extension");
  if (!fs.existsSync(path.join(extDir, "manifest.json"))) {
    return NextResponse.json({ error: "Extension not bundled on this deployment" }, { status: 500 });
  }

  const files = collectFiles(extDir, extDir);
  const buf = buildZip(files);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="sari-extension.zip"`,
    },
  });
}

function collectFiles(dir: string, root: string): { rel: string; data: Buffer }[] {
  const out: { rel: string; data: Buffer }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(abs, root));
    } else {
      out.push({ rel: path.relative(root, abs).split(path.sep).join("/"), data: fs.readFileSync(abs) });
    }
  }
  return out;
}

/* Minimal ZIP writer (stored entries). Small enough for an extension folder. */
function buildZip(files: { rel: string; data: Buffer }[]): Buffer {
  const crcTable = makeCrcTable();
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  const chunks: Buffer[] = [];
  const localOffsets: number[] = [];
  let offset = 0;

  for (const f of files) {
    const name = Buffer.from(f.rel, "utf8");
    const crc = crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(crc, 16);
    local.writeUInt32LE(f.data.length, 20);
    local.writeUInt32LE(f.data.length, 24);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, f.data);
    localOffsets.push(offset);
    offset += 30 + name.length + f.data.length;
  }

  const centralStart = offset;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const name = Buffer.from(f.rel, "utf8");
    const crc = crc32(f.data);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(f.data.length, 20);
    cen.writeUInt32LE(f.data.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(localOffsets[i], 42);
    chunks.push(cen, name);
    offset += 46 + name.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(offset - centralStart, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20);
  chunks.push(eocd);

  return Buffer.concat(chunks);
}

function makeCrcTable(): number[] {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}