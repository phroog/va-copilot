/* Sari Job Radar â€” content script. Runs on every supported platform and
   fetches jobs in the page context (real cookies/headers = same as a normal
   tab request). Background asks via chrome.tabs.sendMessage. */

const PLATFORMS = {
  upwork: { name: "Upwork", kind: "graphql", host: "upwork.com" },
  onlinejobs: { name: "OnlineJobs.ph", kind: "html", host: "onlinejobs.ph" },
  guru: { name: "Guru", kind: "html", host: "guru.com" },
  freelancer: { name: "Freelancer", kind: "api", host: "freelancer.com" },
  workingnomads: { name: "WorkingNomads", kind: "api", host: "workingnomads.com" },
  remoteok: { name: "RemoteOK", kind: "api", host: "remoteok.com" },
  jobspresso: { name: "Jobspresso", kind: "rss", host: "jobspresso.co" },
  peopleperhour: { name: "PeoplePerHour", kind: "html", host: "peopleperhour.com" },
  indeed: { name: "Indeed", kind: "html", host: "indeed.com" },
  reddit: { name: "Reddit", kind: "reddit", host: "reddit.com" },
  facebook: { name: "Facebook", kind: "facebook", host: "facebook.com" },
  hubstaff: { name: "Hubstaff Talent", kind: "hubstaff", host: "hubstafftalent.net" },
};

function parseManilaDate(t) {
  if (!t) return null;
  const m = String(t).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):?(\d{2})?/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || "00"}+08:00`;
  const ts = Date.parse(iso);
  return isNaN(ts) ? null : new Date(ts).toISOString();
}

function parseAgo(text) {
  const t = (text || "").toLowerCase();
  const m = t.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/);
  if (m) {
    const ms = { minute: 60e3, hour: 36e5, day: 864e5, week: 7 * 864e5, month: 30 * 864e5, year: 365 * 864e5 }[m[2]];
    return new Date(Date.now() - parseInt(m[1], 10) * ms).toISOString();
  }
  if (/just now|moments?\s*ago|a few seconds/i.test(t)) return new Date().toISOString();
  if (/today/i.test(t)) return new Date().toISOString();
  if (/yesterday/i.test(t)) return new Date(Date.now() - 864e5).toISOString();
  return null;
}

/* Selector adapters for server-rendered pages. Reuse the collector's known
   selectors; each card yields title/url/description and (where available) the
   posted timestamp. OnlineJobs.ph shows Manila local time (UTC+8). */
const HTML_SELECTORS = {
  onlinejobs: {
    items: 'a[href*="/jobseekers/job/"]',
    title: (it) => {
      const h = it.querySelector("h4");
      if (!h) return null;
      return h.textContent.replace((h.querySelector(".badge")?.textContent || ""), "").trim();
    },
    url: (it) => it.href,
    desc: (it) => (it.querySelector(".desc, .job-desc")?.textContent || "").trim().slice(0, 1000),
    posted: (it) => parseManilaDate(it.querySelector("p[data-temp]")?.getAttribute("data-temp")),
  },
  guru: {
    items: ".jobRecord",
    title: (it) => it.querySelector(".jobRecord__title a, h2 a")?.textContent?.trim() || null,
    url: (it) => {
      const a = it.querySelector(".jobRecord__title a, h2 a");
      return a ? a.href : "";
    },
    desc: (it) => (it.querySelector(".jobRecord__description, .jobRecord__desc")?.textContent || "").trim().slice(0, 1000),
  },
  freelancer: {
    items: ".JobSearchCard-item",
    title: (it) => it.querySelector(".JobSearchCard-primary-heading-link")?.textContent?.trim() || null,
    url: (it) => {
      const a = it.querySelector(".JobSearchCard-primary-heading-link");
      return a ? a.href : "";
    },
    desc: (it) => (it.querySelector(".JobSearchCard-primary-description, .JobSearchCard-secondary-description")?.textContent || "").trim().slice(0, 1000),
  },
  workingnomads: {
    items: "a.job-desktop",
    title: (it) => it.querySelector("h4")?.textContent?.trim() || null,
    url: (it) => it.href,
    desc: (it) => (it.querySelector("h4, .job-desktop")?.textContent || "").trim().slice(0, 1000),
  },
  remoteok: {
    items: "tr.job",
    title: (it) => it.querySelector("a[class*='preventLink'], td[class*='position'] a, h2 a")?.textContent?.trim() || null,
    url: (it) => {
      const a = it.querySelector("a[class*='preventLink'], td[class*='position'] a, h2 a");
      return a ? a.href : "";
    },
    desc: (it) => (it.querySelector("td[class*='description']")?.textContent || "").trim().slice(0, 1000),
  },
  jobspresso: {
    items: ".entry-title a",
    title: (it) => it.textContent.trim(),
    url: (it) => it.href,
    desc: () => "",
  },
  peopleperhour: {
    items: 'a[href*="freelance-jobs/"], a.item__url',
    title: (it) => it.textContent.trim(),
    url: (it) => it.href,
    desc: () => "",
  },
  indeed: {
    items: ".job_seen_beacon, .jobsearch-ResultJob",
    title: (it) => it.querySelector("a.jcs-JobTitle, h3 a")?.textContent?.trim() || null,
    url: (it) => {
      const a = it.querySelector("a.jcs-JobTitle, h3 a");
      return a ? a.href : "";
    },
    desc: (it) => (it.querySelector(".job-snippet, [class*='snippet']")?.textContent || "").trim().slice(0, 1000),
  },
  hubstaff: {
    items: 'a[href^="/jobs/"]',
    title: (it) => {
      const h = it.getAttribute("href") || "";
      if (h === "/jobs/new" || h.length <= "/jobs/".length) return null;
      const t = (it.textContent || "").trim();
      return t.length > 3 ? t : null;
    },
    url: (it) => "https://hubstafftalent.net" + (it.getAttribute("href") || ""),
    desc: (it) => {
      let n = it.parentElement;
      let t = "";
      for (let i = 0; i < 5 && n && n !== document.body; i++) {
        t = (n.innerText || "").trim();
        if (t.length > 6 && t.length < 500) break;
        n = n.parentElement;
      }
      return t.slice(0, 400);
    },
  },
};

function clean(t) {
  return (t || "").replace(/\uFFFD/g, "").trim();
}

function slugify(title) {
  return (
    clean(title)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\x00-\x7f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 100) || "job"
  );
}

/* ---------- Upwork (GraphQL) ---------- */

function upworkToken() {
  const m = document.cookie.match(/(?:^|;\s*)UniversalSearchNuxt_vt=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

const UPWORK_QUERY = `query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) {
  search {
    universalSearchNuxt {
      visitorJobSearchV1(request: $requestVariables) {
        paging { total offset count }
        results {
          id
          title
          description
          ontologySkills { uid prefLabel highlighted }
          jobTile {
            job {
              id
              ciphertext: cipherText
              jobType
              weeklyRetainerBudget
              hourlyBudgetMax
              hourlyBudgetMin
              contractorTier
              createTime
              publishTime
              hourlyEngagementDuration { rid label weeks }
              fixedPriceAmount { isoCurrencyCode amount }
              fixedPriceEngagementDuration { rid label weeks }
            }
          }
        }
      }
    }
  }
}`;

function mapUpworkJob(r) {
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
  return {
    title: clean(r.title),
    description: clean(r.description),
    budget,
    budget_type: budgetType,
    url: "https://www.upwork.com/jobs/" + slugify(r.title) + "_" + cipher + "/",
    platform: "Upwork",
    skills: ((r.ontologySkills || []).map((s) => s && s.prefLabel)).filter(Boolean),
    posted_at: job.publishTime ? new Date(job.publishTime).toISOString() : null,
    client_name: "",
    experience_level: job.contractorTier || "",
    external_id: String(job.id || r.id),
  };
}

async function fetchUpwork(count) {
  const token = upworkToken();
  if (!token) throw new Error("Kein Upwork-Token (UniversalSearchNuxt_vt) gefunden");
  const res = await fetch("/api/graphql/v1?alias=visitorJobSearch", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer " + token,
      "x-upwork-accept-language": "en-US",
      "referer": "https://www.upwork.com/nx/search/jobs?sort=recency",
    },
    body: JSON.stringify({
      query: UPWORK_QUERY,
      variables: { requestVariables: { sort: "recency", highlight: true, paging: { offset: 0, count } } },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error("Upwork GraphQL HTTP " + res.status + ": " + (text || "").slice(0, 200));
  const j = JSON.parse(text);
  const feed =
    j && j.data && j.data.search && j.data.search.universalSearchNuxt && j.data.search.universalSearchNuxt.visitorJobSearchV1;
  if (!feed) throw new Error("Unbekannte Feed-Struktur in Upwork-Antwort");
  return { total: feed.paging ? feed.paging.total : null, jobs: (feed.results || []).map(mapUpworkJob) };
}

/* ---------- HTML platforms ---------- */

async function fetchHtml(platform, url) {
  // Same-origin guarantee: if the configured URL is on a different host than
  // the open tab (e.g. www.indeed.com vs at.indeed.com), fetch the tab's own
  // URL instead â€” that also reflects the user's chosen locale/search.
  let targetUrl = url;
  try {
    if (!targetUrl || new URL(targetUrl).hostname !== location.hostname) targetUrl = location.href;
  } catch {
    targetUrl = location.href;
  }
  const res = await fetch(targetUrl, { credentials: "include" });
  const text = await res.text();
  if (!res.ok) throw new Error(platform + " HTTP " + res.status);
  const doc = new DOMParser().parseFromString(text, "text/html");
  const cfg = HTML_SELECTORS[platform];
  const out = [];
  doc.querySelectorAll(cfg.items).forEach((it) => {
    const title = clean(cfg.title(it));
    const urlStr = (cfg.url(it) || "").split("#")[0];
    if (!title || !urlStr) return;
    const desc = clean(cfg.desc(it));
    if (title.length < 3) return;
    const posted = cfg.posted ? cfg.posted(it) : parseAgo(it.textContent);
    out.push({
      title,
      description: desc,
      budget: null,
      budget_type: null,
      url: urlStr,
      platform: PLATFORMS[platform].name,
      skills: [],
      posted_at: posted,
      client_name: "",
      experience_level: "",
      external_id: urlStr,
    });
  });
  return { total: out.length, jobs: out };
}

/* ---------- Reddit (subreddit JSON feeds) ---------- */

/* `url` is a comma-separated list of subreddits, e.g. "forhire,virtualassistants". */
async function fetchReddit(url, count) {
  const subs = String(url || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!subs.length) throw new Error("Keine Subreddits konfiguriert (komma-getrennt)");
  const limit = Math.min(50, count || 25);
  const seen = new Set();
  const out = [];
  for (const sub of subs) {
    const res = await fetch(`https://www.reddit.com/r/${encodeURIComponent(sub)}/new.json?limit=${limit}`, {
      credentials: "include",
      headers: { "accept": "application/json" },
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) throw new Error(`Reddit ${sub} HTTP ${res.status} (Rate-Limit/Block)`);
      continue;
    }
    const j = await res.json();
    const children = (j && j.data && j.data.children) || [];
    for (const c of children) {
      const d = c && c.data;
      if (!d || d.stickied || d.over_18) continue;
      const id = "reddit:" + d.id;
      if (seen.has(id)) continue;
      seen.add(id);
      const title = clean(d.title);
      const body = clean(d.selftext || "");
      if (title.length < 3) continue;
      out.push({
        title,
        description: body.slice(0, 1500),
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

/* ---------- Facebook (reads the rendered groups feed on the open tab) ---------- */

/* No network calls to Facebook â€” we only read what is already rendered.
   Returns raw posts + debug info; OCR + filtering happen in the backend. */
async function fetchFacebookFeed() {
  const posts = [];
  const seen = new Set();
  const pushPost = (a) => {
    try {
      const textEls = a.querySelectorAll('[dir="auto"]');
      const text = Array.from(textEls)
        .map((e) => (e.textContent || "").trim())
        .filter(Boolean)
        .join("\n")
        .slice(0, 3000);
      const images = Array.from(a.querySelectorAll('img[src*="fbcdn.net"]'))
        .map((i) => i.getAttribute("src") || "")
        .filter((s) => /^https?:/.test(s))
        .slice(0, 3);
      const perm = a.querySelector('a[href*="/posts/"], a[href*="?story_fbid="], a[href*="/groups/"][role="link"], a[href*="/reel/"]');
      const href = perm ? perm.getAttribute("href") || "" : "";
      const url = href.split("?")[0].split("#")[0];
      const key = url || (images[0] || "") + "|" + text.slice(0, 40);
      if (!key || seen.has(key)) return;
      const groupEl = a.querySelector('a[href*="/groups/"]');
      const groupName = groupEl ? (groupEl.textContent || "").trim() : "";
      if (!text && !images.length) return;
      seen.add(key);
      posts.push({ text, imageUrls: images, url, groupName });
    } catch {}
  };

  // 1) Classic post containers.
  document.querySelectorAll('[role="article"]').forEach(pushPost);

  // 2) Newer UI: direct children of the feed scroll container.
  const feeds = document.querySelectorAll('[role="feed"]');
  feeds.forEach((f) => {
    Array.from(f.children).forEach((c) => {
      if (c && c.querySelector && (c.querySelector('[dir="auto"]') || c.querySelector('img[src*="fbcdn.net"]'))) {
        pushPost(c);
      }
    });
  });

  // 3) data-pagelet FeedUnit containers (modern FB layout).
  document.querySelectorAll('[data-pagelet^="FeedUnit"]').forEach(pushPost);

  const bodyText = document.body && document.body.innerText ? document.body.innerText : "";
  const artSamples = Array.from(document.querySelectorAll('[role="article"]'))
    .slice(0, 3)
    .map((a) => (a.innerText || "").replace(/\n+/g, " | ").slice(0, 160));
  const debug = {
    articles: document.querySelectorAll('[role="article"]').length,
    feeds: feeds.length,
    feedUnits: document.querySelectorAll('[data-pagelet^="FeedUnit"]').length,
    imgs: document.querySelectorAll('img[src*="fbcdn.net"]').length,
    bodyLen: bodyText.length,
    bodyHead: bodyText.slice(0, 300),
    artSamples,
    url: location.href.slice(0, 90),
  };
  return { total: posts.length, posts, debug };
}

/* ---------- Hubstaff Talent (reads the rendered job list on the open tab) ---------- */

/* The job list is loaded via JS, so we read the live DOM (like the Facebook
   reader) instead of fetching â€” no extra network calls to the site. */
async function fetchHubstaffDom() {
  const out = [];
  const seen = new Set();
  document.querySelectorAll('a[href^="/jobs/"]').forEach((it) => {
    const h = it.getAttribute("href") || "";
    if (h === "/jobs/new" || h.length <= "/jobs/".length) return;
    const title = clean(it.textContent);
    if (title.length < 3) return;
    const url = "https://hubstafftalent.net" + h.split("?")[0].split("#")[0];
    if (seen.has(url)) return;
    seen.add(url);
    let n = it.parentElement;
    let t = "";
    for (let i = 0; i < 5 && n && n !== document.body; i++) {
      t = (n.innerText || "").trim();
      if (t.length > 6 && t.length < 500) break;
      n = n.parentElement;
    }
    out.push({
      title,
      description: t.slice(0, 400),
      budget: null,
      budget_type: null,
      url,
      platform: "Hubstaff Talent",
      skills: [],
      posted_at: null,
      client_name: "",
      experience_level: "",
      external_id: url,
    });
  });
  return { total: out.length, jobs: out };
}

/* ---------- Dispatcher ---------- */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "FETCH_FEED") {
    const platform = PLATFORMS[msg.platform];
    if (!platform) {
      sendResponse({ ok: false, error: "Unbekannte Plattform: " + msg.platform });
      return;
    }
    const p =
      platform.kind === "graphql"
        ? fetchUpwork(msg.count || 50)
        : platform.kind === "reddit"
          ? fetchReddit(msg.url, msg.count || 25)
          : platform.kind === "facebook"
            ? fetchFacebookFeed()
            : platform.kind === "hubstaff"
              ? fetchHubstaffDom()
              : platform.kind === "api"
                ? msg.platform === "workingnomads"
                  ? fetchWorkingNomads()
                  : msg.platform === "remoteok"
                    ? fetchRemoteOkApi()
                    : fetchFreelancerApi()
                : platform.kind === "rss"
                  ? fetchJobspressoRss()
                  : fetchHtml(msg.platform, msg.url);
    p.then((data) => sendResponse({ ok: true, ...data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  return false;
});
