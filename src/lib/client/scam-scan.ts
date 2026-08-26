/* Client-side scam scanning. Runs in the user's browser (works on desktop AND
   mobile). Opens the target URL in a new tab and extracts evidence by scanning
   the real page DOM + link targets + common scam strings. Nothing is sent to
   the server except the (optional) AI interpretation.

   IMPORTANT: a normal <script> cannot read another origin's DOM (CORS). So the
   scanner runs in a tiny same-origin scanner popup: if the Sari page itself is
   opened on the target domain it can read it; otherwise we rely on the
   deterministic heuristic below, which is honest about what it could inspect. */

export interface ScamEvidence {
  score: number; // 0-100 risk
  level: "green" | "yellow" | "orange" | "red";
  flags: { label: string; severity: number }[];
  signals: {
    offPlatformLinks: string[];
    paymentMethods: string[];
    requestedData: string[];
    suspiciousSites: string[];
    generic: string[];
  };
  pageTitle?: string;
  pageUrl?: string;
  checkedAt: string;
  inspected: boolean; // true when we could read the actual page DOM
}

const SUSPICIOUS_TLDS = /\.(zip|mov|country|click|gq|top|xyz|tk|ml|cf|ga|date|icu|work|racing)$/i;
const HOTMAIL_FREE = /@(gmail|hotmail|yahoo|outlook|protonmail|mail\.com|icloud|aol)\./i;
const PAYMENT_METHODS = /western union|moneygram|wire transfer|gift card|bitcoin|crypto|paypal\s*(friends|family)|zelle|remitly/i;
const DATA_REQUESTS = /credit card|card details|bank account (number|details)|ssn|social security|passport|id copy|driver'?s license copy|copy of (id|passport)/i;
const UPFRONT = /processing|application|registration|activation|training|service fee|pay to (register|apply)|deposit.*(secure|reserve)|payment.*(upfront|in advance)/i;
const TOO_GOOD = /unlimited earning|guaranteed (income|salary|profit|earnings)|get rich|residual income|passive income|no experience.*(high|big|\$)/i;
const MLM = /recruiters? needed|referral (bonus|commission)|build (your|our) (own )?team|network marketing|multi[- ]level/i;
const UNPAID = /(work|do|test|sample).*(free|without pay)|unpaid (trial|test|task)/i;
const URGENCY = /urgent|start (immediately|now|today)|no interview|hire (you )?(now|immediately|today)/i;

function isOffPlatformUrl(url: string, baseHost: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const h = u.hostname.replace(/^www\./, "");
    const b = baseHost.replace(/^www\./, "");
    if (h === b) return false;
    if (h.endsWith("." + b)) return false;
    return true;
  } catch {
    return false;
  }
}

function pushFlag(flags: ScamEvidence["flags"], label: string, severity: number, seen: Set<string>) {
  if (seen.has(label)) return;
  seen.add(label);
  flags.push({ label, severity });
}

export function scanPageDom(doc: Document, baseUrl: string): Partial<ScamEvidence> {
  const flags: ScamEvidence["flags"] = [];
  const seen = new Set<string>();
  const signals: ScamEvidence["signals"] = {
    offPlatformLinks: [],
    paymentMethods: [],
    requestedData: [],
    suspiciousSites: [],
    generic: [],
  };
  const baseHost = (() => { try { return new URL(baseUrl).hostname; } catch { return ""; } })();
  const text = (doc.body?.innerText || "").toLowerCase();

  const links: string[] = [];
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    try { links.push(new URL(href, baseUrl).href); } catch {}
  });

  for (const link of links) {
    if (!isOffPlatformUrl(link, baseHost)) continue;
    const host = new URL(link).hostname;
    if (!signals.offPlatformLinks.includes(host)) signals.offPlatformLinks.push(host);
    if (SUSPICIOUS_TLDS.test(host)) {
      if (!signals.suspiciousSites.includes(host)) signals.suspiciousSites.push(host);
    }
  }

  let mailCount = 0;
  for (const a of Array.from(doc.querySelectorAll('a[href^="mailto:"]'))) {
    const addr = a.getAttribute("href") || "";
    if (HOTMAIL_FREE.test(addr)) mailCount++;
  }
  const telegram = Array.from(doc.querySelectorAll('a[href*="t.me"], a[href*="telegram"]')).length;
  const whatsapp = Array.from(doc.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]')).length;

  if (PAYMENT_METHODS.test(text)) {
    const m = text.match(PAYMENT_METHODS);
    if (m && !signals.paymentMethods.includes(m[0])) signals.paymentMethods.push(m[0]);
    pushFlag(flags, "Payment via bank transfer/gift card", 30, seen);
  }
  if (DATA_REQUESTS.test(text)) {
    const m = text.match(DATA_REQUESTS);
    if (m && !signals.requestedData.includes(m[0])) signals.requestedData.push(m[0]);
    pushFlag(flags, "Sensitive data requested", 25, seen);
  }
  if (UPFRONT.test(text)) pushFlag(flags, "Upfront fee / payment required", 30, seen);
  if (TOO_GOOD.test(text)) pushFlag(flags, "Too good to be true", 25, seen);
  if (MLM.test(text)) pushFlag(flags, "MLM/recruiting pattern", 20, seen);
  if (UNPAID.test(text)) pushFlag(flags, "Unpaid test work", 25, seen);
  if (URGENCY.test(text)) pushFlag(flags, "Urgency/pressure", 10, seen);

  if (mailCount >= 2) pushFlag(flags, "Contact via free email addresses", 20, seen);
  if (telegram > 0 || whatsapp > 0) pushFlag(flags, "Contact via Telegram/WhatsApp", 25, seen);
  if (signals.suspiciousSites.length > 0) pushFlag(flags, "Suspicious links/downloads on page", 25, seen);

  let score = 10;
  for (const f of flags) score += f.severity;
  score = Math.max(0, Math.min(100, score));
  const level: ScamEvidence["level"] = score >= 70 ? "red" : score >= 50 ? "orange" : score >= 30 ? "yellow" : "green";

  const title = doc.title || undefined;
  const pageUrl = (() => { try { return doc.location?.href || baseUrl; } catch { return baseUrl; } })();

  return { score, level, flags, signals, pageTitle: title, pageUrl };
}

/* Pre-screen a URL before opening it (block obvious phishing patterns early). */
export function quickUrlCheck(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (SUSPICIOUS_TLDS.test(host)) return "Suspicious domain ending (spam TLD).";
    if (/paypal|account|verify|login|secure|update|billing/i.test(host) && !/paypal\.com$/.test(host)) {
      return "Domain looks like a phishing/login fake.";
    }
    return null;
  } catch {
    return "Not a valid URL.";
  }
}

/* Deterministic estimate used when the live DOM can't be read (cross-origin). */
export function heuristicEvidence(url: string): ScamEvidence {
  const u = (() => { try { return new URL(url); } catch { return null; } })();
  const host = u?.hostname || url;
  const flags: { label: string; severity: number }[] = [];
  if (SUSPICIOUS_TLDS.test(host)) flags.push({ label: "Suspicious domain ending", severity: 25 });
  if (/paypal|verify|login|secure|update|billing/i.test(host) && !/paypal\.com$/.test(host)) {
    flags.push({ label: "Domain looks like a phishing fake", severity: 30 });
  }
  let score = 10;
  for (const f of flags) score += f.severity;
  score = Math.max(0, Math.min(100, score));
  const level: ScamEvidence["level"] = score >= 70 ? "red" : score >= 50 ? "orange" : score >= 30 ? "yellow" : "green";
  return {
    score,
    level,
    flags,
    signals: { offPlatformLinks: [], paymentMethods: [], requestedData: [], suspiciousSites: [], generic: [] },
    pageTitle: host,
    pageUrl: url,
    checkedAt: new Date().toISOString(),
    inspected: false,
  };
}