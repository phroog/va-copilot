/* Sari Job Radar — background service worker.
   Schedules per-platform polls and uploads fresh jobs to Sari's upload-web. */

const DEFAULTS = {
  apiUrl: "https://va-copilot-theta.vercel.app",
  adminSecret: "",
  intervalMin: 5,
  count: 50,
  enabled: true,
  platforms: {
    upwork: { name: "Upwork", url: "", sourceId: "" },
    onlinejobs: { name: "OnlineJobs.ph", url: "https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword=&skill_tags=&gig=on&partTime=on&fullTime=on&isFromJobsearchForm=1", sourceId: "" },
    guru: { name: "Guru", url: "https://www.guru.com/d/jobs/", sourceId: "" },
    freelancer: { name: "Freelancer", url: "https://www.freelancer.com/jobs", sourceId: "" },
    workingnomads: { name: "WorkingNomads", url: "https://www.workingnomads.com/jobs", sourceId: "" },
    remoteok: { name: "RemoteOK", url: "https://remoteok.com/", sourceId: "" },
    jobspresso: { name: "Jobspresso", url: "https://jobspresso.co/", sourceId: "" },
    peopleperhour: { name: "PeoplePerHour", url: "https://www.peopleperhour.com/freelance-jobs", sourceId: "" },
    indeed: { name: "Indeed", url: "https://ph.indeed.com/jobs?q=&l=remote", sourceId: "" },
    reddit: { name: "Reddit", url: "forhire,virtualassistants,slavelabour,freelance", sourceId: "" },
    facebook: { name: "Facebook", url: "https://www.facebook.com/?filter=groups&sk=h_chr", sourceId: "" },
    hubstaff: { name: "Hubstaff Talent", url: "https://hubstafftalent.net/search/jobs", sourceId: "" },
  },
};

const HOST_PATTERNS = {
  upwork: "https://*.upwork.com/*",
  onlinejobs: "https://www.onlinejobs.ph/*",
  guru: "https://www.guru.com/*",
  freelancer: "https://*.freelancer.com/*",
  workingnomads: "https://www.workingnomads.com/*",
  remoteok: "https://remoteok.com/*",
  jobspresso: "https://jobspresso.co/*",
  peopleperhour: "https://www.peopleperhour.com/*",
  indeed: ["https://*.indeed.com/*", "https://indeed.ph/*"],
  hubstaff: "https://hubstafftalent.net/*",
  reddit: "https://www.reddit.com/*",
  facebook: "https://*.facebook.com/*",
};

const STATUS_KEY = "lastStatus";
const SEEN_KEY = "seenIds";
const COOLDOWN_KEY = "cooldowns";
const REFRESH_KEY = "sessionRefreshes";
const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/* How often to re-open the Upwork tab to keep the session token warm
   (Upwork rotates UniversalSearchNuxt_vt on page load). */
const SESSION_REFRESH_MIN = 60;

async function getCooldown(key) {
  const s = await chrome.storage.local.get(COOLDOWN_KEY);
  return (s[COOLDOWN_KEY] || {})[key] || 0;
}

async function setCooldown(key, minutes) {
  const s = await chrome.storage.local.get(COOLDOWN_KEY);
  const all = s[COOLDOWN_KEY] || {};
  all[key] = Date.now() + minutes * 60 * 1000;
  await chrome.storage.local.set({ [COOLDOWN_KEY]: all });
}

async function getLastRefresh(key) {
  const s = await chrome.storage.local.get(REFRESH_KEY);
  return (s[REFRESH_KEY] || {})[key] || 0;
}

async function setLastRefresh(key, ts) {
  const s = await chrome.storage.local.get(REFRESH_KEY);
  await chrome.storage.local.set({ [REFRESH_KEY]: { ...(s[REFRESH_KEY] || {}), [key]: ts } });
}

/* Re-open the platform tab in the SAME window: create a fresh tab with the
   current URL, wait for it to load, then close the old one. Mimics a manual
   refresh and re-runs the site's JS (rotates session cookies/tokens). */
async function refreshSessionTab(key, p) {
  try {
    const pattern = HOST_PATTERNS[key];
    if (!pattern) return false;
    const tabs = await chrome.tabs.query({ url: Array.isArray(pattern) ? pattern : [pattern] });
    const old = tabs.find((t) => t.active) || tabs[0];
    if (!old) return false;
    const url = old.url || p.url;
    const tab = await chrome.tabs.create({ url, windowId: old.windowId, active: false });
    const started = Date.now();
    await new Promise((resolve) => {
      const iv = setInterval(async () => {
        try {
          const t = await chrome.tabs.get(tab.id);
          if (t.status === "complete" || Date.now() - started > 25000) {
            clearInterval(iv);
            resolve();
          }
        } catch {
          clearInterval(iv);
          resolve();
        }
      }, 1200);
    });
    await new Promise((r) => setTimeout(r, 4000));
    await chrome.tabs.remove(old.id).catch(() => {});
    log(key, "session tab refreshed:", url);
    return true;
  } catch (err) {
    log(key, "refresh failed:", err.message);
    return false;
  }
}

function log(...a) {
  console.log("[sari-radar]", ...a);
}

async function config() {
  const stored = await chrome.storage.local.get(null);
  const cfg = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS)) {
    if (k === "platforms") {
      cfg.platforms = {};
      for (const pk of Object.keys(DEFAULTS.platforms)) {
        cfg.platforms[pk] = { ...DEFAULTS.platforms[pk], ...((stored.platforms || {})[pk] || {}) };
      }
    } else if (stored[k] !== undefined) {
      cfg[k] = stored[k];
    }
  }
  return cfg;
}

async function store(cfg) {
  await chrome.storage.local.set(cfg);
}

/* Auto-map platform sourceIds from the backend's /api/jobs/keywords. */
async function loadSourceIds(cfg) {
  if (!cfg.adminSecret) return cfg;
  try {
    const res = await fetch(cfg.apiUrl + "/api/jobs/keywords", {
      headers: { "x-admin-secret": cfg.adminSecret },
    });
    if (!res.ok) return cfg;
    const j = await res.json();
    const byName = new Map();
    for (const s of j.sources || []) byName.set(String(s.name).toLowerCase(), s.id);
    for (const pk of Object.keys(cfg.platforms)) {
      const p = cfg.platforms[pk];
      const match = byName.get(p.name.toLowerCase());
      if (match && !UUID_RE.test(p.sourceId || "")) p.sourceId = match;
    }
    return cfg;
  } catch {
    return cfg;
  }
}

async function setStatus(status) {
  await chrome.storage.local.set({ [STATUS_KEY]: { ...status, ts: Date.now() } });
}

async function getSeen(key) {
  const s = await chrome.storage.local.get(SEEN_KEY);
  return new Set(Array.isArray(s[SEEN_KEY]?.[key]) ? s[SEEN_KEY][key] : []);
}

async function addSeen(key, ids) {
  const s = await chrome.storage.local.get(SEEN_KEY);
  const all = s[SEEN_KEY] || {};
  const arr = new Set(Array.isArray(all[key]) ? all[key] : []);
  for (const id of ids) if (id) arr.add(id);
  all[key] = Array.from(arr).slice(-3000);
  await chrome.storage.local.set({ [SEEN_KEY]: all });
}

/* Fetch one platform's feed from an open tab (page context). */
async function fetchViaTab(key, url, cfg) {
  const pattern = HOST_PATTERNS[key];
  if (!pattern) return null;
  const tabs = await chrome.tabs.query({ url: Array.isArray(pattern) ? pattern : [pattern] });
  if (!tabs.length) return null;
  const ordered = [...tabs].sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
  for (const tab of ordered) {
    try {
      let resp;
      try {
        resp = await chrome.tabs.sendMessage(tab.id, { type: "FETCH_FEED", platform: key, url, count: cfg.count });
      } catch {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        resp = await chrome.tabs.sendMessage(tab.id, { type: "FETCH_FEED", platform: key, url, count: cfg.count });
      }
      if (resp && resp.ok) return resp;
      if (resp && resp.error) log(key, "tab error:", resp.error);
    } catch (err) {
      log(key, "tab unreachable:", err.message);
    }
  }
  return null;
}

/* Upwork fallback from the service worker (no open tab needed). */
async function fetchUpworkWorker(cfg) {
  const cookie = await chrome.cookies.get({ url: "https://www.upwork.com/", name: "UniversalSearchNuxt_vt" });
  if (!cookie || !cookie.value) return null;
  const query = `query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) {
  search { universalSearchNuxt { visitorJobSearchV1(request: $requestVariables) {
    paging { total offset count }
    results {
      id title description
      ontologySkills { uid prefLabel highlighted }
      jobTile { job {
        id ciphertext: cipherText jobType hourlyBudgetMax hourlyBudgetMin contractorTier createTime publishTime
        hourlyEngagementDuration { rid label weeks }
        fixedPriceAmount { isoCurrencyCode amount }
        fixedPriceEngagementDuration { rid label weeks }
      } }
    }
  } } } }`;
  const res = await fetch("https://www.upwork.com/api/graphql/v1?alias=visitorJobSearch", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer " + cookie.value,
      "x-upwork-accept-language": "en-US",
      "referer": "https://www.upwork.com/nx/search/jobs?sort=recency",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({ query, variables: { requestVariables: { sort: "recency", highlight: true, paging: { offset: 0, count: cfg.count } } } }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error("Worker-Fetch Upwork HTTP " + res.status + ": " + text.slice(0, 200));
  const j = JSON.parse(text);
  const feed = j && j.data && j.data.search && j.data.search.universalSearchNuxt && j.data.search.universalSearchNuxt.visitorJobSearchV1;
  if (!feed) throw new Error("Unbekannte Feed-Struktur");
  return { total: feed.paging ? feed.paging.total : null, jobs: (feed.results || []).map(mapWorkerUpworkJob) };
}

function mapWorkerUpworkJob(r) {
  const job = (r.jobTile && r.jobTile.job) || {};
  let budget = null;
  let budgetType = null;
  if (job.jobType === "FIXED") {
    budgetType = "fixed";
    if (job.fixedPriceAmount && job.fixedPriceAmount.amount != null) budget = "$" + job.fixedPriceAmount.amount;
  } else if (job.jobType === "HOURLY" && job.hourlyBudgetMin != null) {
    budgetType = "hourly";
    budget = "$" + job.hourlyBudgetMin;
    if (job.hourlyBudgetMax != null && job.hourlyBudgetMax !== job.hourlyBudgetMin) budget += "-$" + job.hourlyBudgetMax;
    budget += "/hr";
  }
  const cipher = job.ciphertext || "~0" + (job.id || r.id);
  const slug =
    (r.title || "job").toLowerCase().normalize("NFKD").replace(/[^\x00-\x7f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 100) || "job";
  return {
    title: (r.title || "").replace(/\uFFFD/g, "").trim(),
    description: (r.description || "").replace(/\uFFFD/g, "").trim(),
    budget,
    budget_type: budgetType,
    url: "https://www.upwork.com/jobs/" + slug + "_" + cipher + "/",
    platform: "Upwork",
    skills: ((r.ontologySkills || []).map((s) => s && s.prefLabel)).filter(Boolean),
    posted_at: job.publishTime ? new Date(job.publishTime).toISOString() : null,
    client_name: "",
    experience_level: job.contractorTier || "",
    external_id: String(job.id || r.id),
  };
}

/* Reddit fallback from the service worker (public .json feeds, no tab needed). */
async function fetchRedditWorker(cfg) {
  const subs = String(cfg.platforms.reddit?.url || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!subs.length) throw new Error("Keine Subreddits konfiguriert");
  const out = [];
  const seen = new Set();
  for (const sub of subs) {
    const res = await fetch(`https://www.reddit.com/r/${encodeURIComponent(sub)}/new.json?limit=${Math.min(50, cfg.count || 25)}`, {
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36", "accept": "application/json" },
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) throw new Error(`Reddit ${sub} HTTP ${res.status}`);
      continue;
    }
    const j = await res.json();
    for (const c of (j?.data?.children || [])) {
      const d = c?.data;
      if (!d || d.stickied || d.over_18) continue;
      const id = "reddit:" + d.id;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        title: (d.title || "").replace(/\uFFFD/g, "").trim(),
        description: (d.selftext || "").replace(/\uFFFD/g, "").trim().slice(0, 1500),
        budget: null,
        budget_type: null,
        url: "https://www.reddit.com" + (d.permalink || "/r/" + sub),
        platform: "Reddit",
        skills: [],
        posted_at: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : null,
        client_name: "",
        experience_level: "",
        external_id: id,
      });
    }
  }
  return { total: out.length, jobs: out };
}

async function uploadJobs(cfg, jobs, sourceId) {
  if (!cfg.adminSecret) throw new Error("Kein ADMIN_SECRET konfiguriert (gespeicherte Länge: " + String(cfg.adminSecret || "").length + ")");
  if (!jobs.length) return { inserted: 0 };
  const payload = { jobs };
  if (sourceId && UUID_RE.test(sourceId.trim())) payload.sourceId = sourceId.trim();
  const res = await fetch(cfg.apiUrl + "/api/jobs/upload-web", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-secret": cfg.adminSecret },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error("upload-web HTTP " + res.status + ": " + (text || "").slice(0, 200) + " (secret: …" + String(cfg.adminSecret).slice(-3) + ")");
  try { return JSON.parse(text); } catch { return { inserted: 0 }; }
}

async function testApi(cfg) {
  if (!cfg.adminSecret) return { ok: false, error: "Kein ADMIN_SECRET konfiguriert" };
  try {
    const res = await fetch(cfg.apiUrl + "/api/jobs/pending-web-sources", {
      headers: { "x-admin-secret": cfg.adminSecret },
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: "API HTTP " + res.status + ": " + (text || "").slice(0, 200) };
    }
    const j = await res.json();
    return { ok: true, error: null, sources: (j.sources || []).length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* Fetch platform data once (per-platform branch). */
async function fetchPlatformData(key, p, cfg) {
  if (key === "upwork") {
    // Periodic session keep-alive: re-open the tab so Upwork rotates the
    // visitor token before it goes stale.
    if (Date.now() - (await getLastRefresh(key)) > SESSION_REFRESH_MIN * 60 * 1000) {
      const didRefresh = await refreshSessionTab(key, p);
      if (didRefresh) {
        await setLastRefresh(key, Date.now());
        await setCooldown(key, 0);
      }
    }
    let data = await fetchViaTab(key, p.url, cfg);
    if (data) return { data, mode: "tab" };
    const w = await fetchUpworkWorker(cfg);
    if (w) return { data: w, mode: "worker" };
    throw new Error("Upwork-Daten nicht abrufbar");
  }
  if (key === "reddit") {
    let data = await fetchViaTab(key, p.url, cfg);
    if (data) return { data, mode: "tab" };
    const w = await fetchRedditWorker(cfg);
    if (w) return { data: w, mode: "worker" };
    throw new Error("Reddit-Daten nicht abrufbar");
  }
  if (key === "facebook") {
    const data = await fetchViaTab(key, p.url, cfg);
    if (!data || !data.posts) throw new Error("Kein Facebook-Tab offen (Groups-Feed öffnen)");
    return { data, mode: "tab" };
  }
  // HTML/DOM platforms need an open tab (same-origin fetch / DOM reader).
  const data = await fetchViaTab(key, p.url, cfg);
  if (!data) throw new Error("Kein " + p.name + "-Tab offen");
  return { data, mode: "tab" };
}

/* Fetch with one automatic session-refresh retry: if the platform fetch fails
   with a session/block signal (401, auth failed, blocked, missing tab), re-open
   the tab (new tab, close old) and try once more — a stale session self-heals
   without user interaction. */
async function fetchWithSessionRetry(key, p, cfg) {
  try {
    return await fetchPlatformData(key, p, cfg);
  } catch (err) {
    const msg = err.message || "";
    const isSession = /401|authentication failed|auth failed|blocked|unreachable|Kein .*Tab offen/i.test(msg);
    if (isSession) {
      log(key, "fetch fehlgeschlagen → Session-Refresh: " + msg.slice(0, 80));
      const refreshed = await refreshSessionTab(key, p);
      if (refreshed) {
        await setLastRefresh(key, Date.now());
        await setCooldown(key, 0);
        await new Promise((r) => setTimeout(r, 2500));
        return await fetchPlatformData(key, p, cfg); // one retry with the fresh tab
      }
    }
    throw err;
  }
}

async function pollPlatform(key, p, cfg) {
  const result = { ok: true, mode: "tab", got: 0, fresh: 0, total: null, inserted: 0, error: null };
  try {
    const { data, mode } = await fetchWithSessionRetry(key, p, cfg);
    result.mode = mode;

    if (key === "facebook") {
      // Facebook: OCR + filter happen in the backend. Only NEW posts are sent
      // so images are not re-OCR'd every poll.
      const seen = await getSeen(key);
      const posts = data.posts.filter((post) => post.url && !seen.has(post.url));
      result.total = data.posts.length;
      result.got = posts.length;
      result.debug = data.debug || null;
      if (posts.length) {
        if (!cfg.adminSecret) throw new Error("Kein ADMIN_SECRET konfiguriert");
        const res = await fetch(cfg.apiUrl + "/api/jobs/facebook", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-secret": cfg.adminSecret },
          body: JSON.stringify({ posts, sourceId: p.sourceId || undefined }),
        });
        const text = await res.text();
        if (!res.ok) throw new Error("facebook HTTP " + res.status + ": " + (text || "").slice(0, 200));
        const r = JSON.parse(text);
        result.inserted = r.inserted || 0;
        result.fresh = r.inserted || 0;
        await addSeen(key, posts.map((post) => post.url));
      }
      await setCooldown(key, 0);
      return result;
    }

    result.total = data.total;
    result.got = data.jobs.length;

    const seen = await getSeen(key);
    const fresh = data.jobs.filter((j) => !seen.has(j.external_id));
    result.fresh = fresh.length;

    const up = await uploadJobs(cfg, fresh, p.sourceId);
    result.inserted = up.inserted || 0;

    await addSeen(key, data.jobs.map((j) => j.external_id));
    await setCooldown(key, 0); // success resets any backoff
  } catch (err) {
    result.ok = false;
    result.error = err.message || "unbekannt";
    if (key === "upwork" && /401|authentication failed/i.test(result.error)) {
      result.error = "⚠ Upwork-Session abgelaufen – bitte neu einloggen (Upwork-Tab öffnen).";
      await setCooldown(key, 30);
    }
  }
  return result;
}

async function poll() {
  const cfg = await config();
  if (!cfg.enabled) {
    await setStatus({ ok: true, ts: Date.now(), platforms: {}, note: "Polling deaktiviert (Enabled ist aus)" });
    return;
  }
  const results = {};
  let any = false;
  let allOk = true;
  for (const key of Object.keys(cfg.platforms)) {
    const p = cfg.platforms[key];
    if (!p || p.enabled === false) continue;
    const until = await getCooldown(key);
    if (until > Date.now()) {
      const mins = Math.max(1, Math.ceil((until - Date.now()) / 60000));
      results[key] = { ok: false, mode: null, got: 0, fresh: 0, total: null, inserted: 0, error: key === "upwork" ? `⏸ Upwork pausiert (Retry in ${mins} Min)` : `⏸ ${key} pausiert (Retry in ${mins} Min)` };
      any = true;
      continue;
    }
    any = true;
    const r = await pollPlatform(key, p, cfg);
    results[key] = r;
    if (!r.ok) allOk = false;
    log(`${key}: ok=${r.ok} got=${r.got} fresh=${r.fresh} inserted=${r.inserted} via=${r.mode} ${r.error || ""}`);
    await new Promise((res) => setTimeout(res, 800 + Math.random() * 1200));
  }
  if (!any) {
    await setStatus({ ok: true, ts: Date.now(), platforms: {}, note: "keine Plattform aktiviert" });
    return;
  }
  await setStatus({ ok: allOk, platforms: results, ts: Date.now() });
}

/* Human-like poll timing: each poll schedules the NEXT one with a random
   delay (jitter ±35% + occasional longer pauses), so requests never happen at
   a fixed machine-precise rhythm. */
function nextDelayMs(minutes) {
  const base = minutes * 60000;
  let d = base * (1 + (Math.random() * 0.7 - 0.35)); // ±35% around the interval
  if (Math.random() < 0.15) d *= 2 + Math.random(); // occasional longer human pause
  return Math.max(30000, Math.round(d)); // never below 30s
}

async function schedule(cfg) {
  await chrome.alarms.clear("sari-poll");
  if (cfg.enabled) {
    const minutes = Math.max(0.5, parseFloat(cfg.intervalMin) || DEFAULTS.intervalMin);
    const delayMin = nextDelayMs(minutes) / 60000;
    chrome.alarms.create("sari-poll", { delayInMinutes: delayMin });
    log("next poll in ~", Math.round(delayMin * 60), "s (±Jitter)");
  }
}

async function scheduleNext() {
  await schedule(await config());
}

chrome.runtime.onInstalled.addListener(async () => {
  const cfg = await config();
  await loadSourceIds(cfg);
  await store(cfg);
  await schedule(cfg);
  await poll();
});

chrome.runtime.onStartup.addListener(async () => {
  await schedule(await config());
});

let pollingBusy = false;
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "sari-poll" || pollingBusy) return;
  pollingBusy = true;
  try {
    await scheduleNext(); // ensure a pending alarm even if the SW dies mid-poll
    await poll();
  } finally {
    pollingBusy = false;
    await scheduleNext(); // re-schedule with a fresh random delay
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "POLL_NOW") {
    poll()
      .then(() => chrome.storage.local.get(STATUS_KEY))
      .then((s) => sendResponse(s[STATUS_KEY] || {}))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg.type === "SAVE_CONFIG") {
    (async () => {
      const cfg = await config();
      const next = { ...cfg, ...msg.cfg };
      next.platforms = { ...cfg.platforms };
      for (const k of Object.keys(msg.cfg.platforms || {})) {
        next.platforms[k] = { ...next.platforms[k], ...msg.cfg.platforms[k] };
      }
      await loadSourceIds(next);
      await store(next);
      await schedule(next);
      await poll();
      const s = await chrome.storage.local.get(STATUS_KEY);
      sendResponse({ ok: true, status: s[STATUS_KEY] || {}, cfg: next, savedSecretLen: String(next.adminSecret || "").length });
    })().catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg.type === "GET_STATE") {
    (async () => {
      const cfg = await config();
      const s = await chrome.storage.local.get(STATUS_KEY);
      sendResponse({ cfg, status: s[STATUS_KEY] || null });
    })().catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg.type === "TEST_API") {
    (async () => {
      const cfg = await config();
      const next = { ...cfg, ...(msg.cfg || {}) };
      const r = await testApi(next);
      sendResponse(r);
    })().catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg.type === "CLEANUP_FUTURE") {
    (async () => {
      const cfg = await config();
      if (!cfg.adminSecret) return sendResponse({ ok: false, error: "Kein ADMIN_SECRET konfiguriert" });
      const headers = { "x-admin-secret": cfg.adminSecret };
      const [futureRes, purgeRes, oldRes] = await Promise.all([
        fetch(cfg.apiUrl + "/api/jobs/cleanup-future", { method: "POST", headers }).catch(() => null),
        fetch(cfg.apiUrl + "/api/jobs/purge-irrelevant", { method: "POST", headers }).catch(() => null),
        fetch(cfg.apiUrl + "/api/jobs/cleanup-old?hours=72", { method: "POST", headers }).catch(() => null),
      ]);
      const parse = async (r) => {
        if (!r) return null;
        const t = await r.text();
        if (!r.ok) return { error: "HTTP " + r.status + ": " + (t || "").slice(0, 200) };
        try { return JSON.parse(t); } catch { return { error: "Ungültige Antwort" }; }
      };
      const future = await parse(futureRes);
      const purge = await parse(purgeRes);
      const old = await parse(oldRes);
      if ((future && future.error) || (purge && purge.error) || (old && old.error)) {
        return sendResponse({ ok: false, error: "future: " + (future?.error || "ok") + " | purge: " + (purge?.error || "ok") + " | old: " + (old?.error || "ok") });
      }
      // Reset the seen-id cache so the next poll re-ingests current jobs with
      // the corrected posted_at (deleted ones come back; the rest dedupe).
      await chrome.storage.local.set({ [SEEN_KEY]: {} });
      return sendResponse({ ok: true, deletedFuture: future?.deleted ?? 0, purged: purge?.removed ?? 0, removedOld: old?.removed ?? 0, ...future, ...purge, ...old });
    })().catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  return false;
});