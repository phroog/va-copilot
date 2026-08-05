import Parser from "rss-parser";

export interface JobCandidate {
  title: string;
  description: string;
  budget: string;
  url: string;
  platform: string;
  skills: string[];
  client_name: string;
  client_country: string;
  client_rating: number | null;
  posted_at: string | null;
  external_id: string | null;
}

function normalizeUrl(raw: string, baseUrl: string): string {
  if (!raw) return baseUrl || "";
  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return raw;
  }
}

function pick(obj: Record<string, any>, keys: string[], fallback: any = ""): any {
  for (const key of keys) {
    if (obj[key] != null && obj[key] !== "") return obj[key];
  }
  return fallback;
}

function toIso(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/* ── RSS parsing via rss-parser ─────────────────────────────────── */
const rssParser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; SariJobFeed/1.0; +https://va-copilot-theta.vercel.app)",
    Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
  },
});

async function parseRss(body: string, url: string): Promise<JobCandidate[]> {
  let feed: any;
  try {
    feed = await rssParser.parseString(body);
  } catch (e: any) {
    throw new Error(`RSS parse failed: ${e.message}`);
  }

  const platform = feed?.title?.trim() || new URL(url).hostname;

  return (feed?.items ?? []).map((item: any) => ({
    title: item.title || "Untitled",
    description: item.contentSnippet || item.content || item.summary || "",
    budget: item.budget || "",
    url: normalizeUrl(item.link || item.guid || "", url),
    platform,
    skills: Array.isArray(item.skills) ? item.skills : [],
    client_name: item.creator || item.author || "",
    client_country: "",
    client_rating: null,
    posted_at: toIso(item.isoDate || item.pubDate || item.published),
    external_id: item.guid || item.id || null,
  }));
}

/* ── JSON (API) parsing ─────────────────────────────────────────── */
function extractJsonItems(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const candidates = [
    data.jobs,
    data.data,
    data.results,
    data.items,
    data.list,
    data.postings,
    data.records,
    data.offers,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  if (Array.isArray(data.response)) return data.response;
  if (data.response && Array.isArray(data.response.data)) return data.response.data;
  return [];
}

function parseJson(body: string, url: string): JobCandidate[] {
  let data: any;
  try {
    data = JSON.parse(body);
  } catch (e: any) {
    throw new Error(`JSON parse failed: ${e.message}`);
  }

  const baseUrl = url;
  return extractJsonItems(data).map((raw: any) => {
    const item = raw ?? {};
    const link = pick(item, [
      "url",
      "link",
      "apply_url",
      "job_url",
      "external_url",
      "href",
    ]);
    const desc = String(
      pick(item, ["description", "summary", "job_description", "details", "snippet", "body"], "")
    );
    const posted = pick(item, ["posted_at", "posted", "date_posted", "created_at", "created", "published", "timestamp"], null);

    return {
      title: String(pick(item, ["title", "job_title", "name", "position"], "Untitled")),
      description: desc,
      budget: String(
        pick(item, ["budget", "salary", "pay", "compensation", "rate", "budget_amount"], "")
      ),
      url: normalizeUrl(link, baseUrl),
      platform: String(pick(item, ["platform", "source"], "")),
      skills: Array.isArray(item.skills) ? item.skills.map(String) : [],
      client_name: String(pick(item, ["client_name", "company", "company_name", "employer", "client"], "")),
      client_country: String(pick(item, ["client_country", "country", "location"], "")),
      client_rating: parseFloat(pick(item, ["client_rating", "rating"], "")) || null,
      posted_at: toIso(posted),
      external_id: pick(item, ["id", "external_id", "job_id"], null)?.toString?.() ?? null,
    };
  });
}

/**
 * Fetch a job source URL and extract normalized job candidates.
 * `sourceType` is either "rss" or "api".
 */
export async function parseJobSource(url: string, sourceType: string): Promise<JobCandidate[]> {
  if (!url) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let body: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SariJobFeed/1.0; +https://va-copilot-theta.vercel.app)",
        Accept: "application/rss+xml, application/xml, text/xml, application/json;q=0.9, */*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const trimmed = body.trim();

  if (sourceType === "rss" || trimmed.startsWith("<") || trimmed.toLowerCase().startsWith("<?xml")) {
    return parseRss(trimmed, url);
  }

  return parseJson(trimmed, url);
}
