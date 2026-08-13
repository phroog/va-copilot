import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { upsertGlobalJob } from "@/lib/jobs/global";
import { isRelevantJob } from "@/lib/jobs/relevance";
import { isJobPosting } from "@/lib/jobs/job-intent";
import { classifyJobVector } from "@/lib/jobs/profile-vector";

/**
 * POST /api/jobs/facebook  (x-admin-secret)
 * Ingests posts read from an open Facebook groups feed. Posts that are posted
 * as images are OCR'd (tesseract) so the text can be judged. Only posts that
 * look like real job offers pass the intent + relevance filters and are
 * inserted into global_jobs. Returns per-post statistics.
 *
 * Body: { posts: RawPost[], sourceId?: string }
 * RawPost = { text, imageUrls: string[], url, groupName?, postedAt? }
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse500("ADMIN_SECRET is not configured");
  if (request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const posts: any[] = Array.isArray(body.posts) ? body.posts : [];
  const sourceId: string | null = body.sourceId ?? null;

  const supabase = createServiceRoleClient();
  let scanned = 0;
  let inserted = 0;
  let duplicates = 0;
  let filtered = 0;
  let ocrErrors = 0;

  for (const raw of posts) {
    scanned++;
    let text = String(raw.text || "").trim();

    // Image-only posts: OCR the first couple of images to get text.
    const images: string[] = Array.isArray(raw.imageUrls) ? raw.imageUrls : [];
    if (text.length < 60 && images.length) {
      for (const img of images.slice(0, 2)) {
        const ocr = await ocrImage(img).catch(() => "");
        if (ocr.trim()) {
          text += "\n" + ocr.trim();
          break;
        }
        ocrErrors++;
      }
    }

    const url = String(raw.url || "").split("?")[0].split("#")[0];
    if (!url) continue;

    const job = {
      title: (text.split("\n").find((l) => l.trim().length > 3) || "Facebook Job Post").slice(0, 120),
      description: text.slice(0, 4000),
      url: url.startsWith("http") ? url : `https://www.facebook.com${url}`,
      platform: "Facebook",
      skills: [] as string[],
      posted_at: raw.postedAt || null,
      client_name: raw.groupName || "",
    };

    // Noise gate + relevance.
    if (!isJobPosting(text) || !isRelevantJob(job)) {
      filtered++;
      continue;
    }

    const profileVector = classifyJobVector(job).vector;
    const { job: insertedJob, inserted: isNew } = await upsertGlobalJob({
      ...job,
      source_id: sourceId,
      profile_vector: profileVector,
    });

    if (insertedJob?.id) {
      if (isNew) inserted++;
      else duplicates++;
    } else {
      filtered++;
    }
  }

  return NextResponse.json({ ok: true, scanned, inserted, duplicates, filtered, ocrErrors });
}

function NextResponse500(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

async function ocrImage(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) return "";
  const buffer = Buffer.from(await res.arrayBuffer());
  const Tesseract = require("tesseract.js");
  const { data } = await Tesseract.recognize(buffer, "eng");
  return data?.text ?? "";
}
