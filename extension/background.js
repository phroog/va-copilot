/* â”€â”€ Credit Balance Poller â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SARI_API = "https://va-copilot-theta.vercel.app";async function pollCredits() {
  try {
    const { sariToken } = await chrome.storage.local.get("sariToken");
    if (!sariToken) return;
    const res = await fetch(`${SARI_API}/api/ai/credits`, {
      headers: { Authorization: `Bearer ${sariToken}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    await chrome.storage.local.set({ cachedCredits: data.balance ?? 0, cachedCreditsTs: Date.now() });
  } catch { /* background poll fails silently */ }
}

/* Show a red timer badge while a time entry is running, so tracking is visible
   even when the popup is closed. Refreshed on the same 30s interval. */
async function updateTimerBadge() {
  try {
    const { sariToken } = await chrome.storage.local.get("sariToken");
    if (!sariToken) { await chrome.action.setBadgeText({ text: "" }); return; }
    const res = await fetch(`${SARI_API}/api/time-entries`, {
      headers: { Authorization: `Bearer ${sariToken}` },
    });
    if (!res.ok) { return; }
    const data = await res.json();
    if (data.running && data.running.start_time) {
      const secs = Math.floor((Date.now() - new Date(data.running.start_time).getTime()) / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
      await chrome.action.setBadgeText({ text: h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${m}m` });
    } else {
      await chrome.action.setBadgeText({ text: "" });
    }
  } catch { /* badge update fails silently */ }
}

function poll() { pollCredits(); updateTimerBadge(); }
chrome.runtime.onStartup.addListener(() => { poll(); setInterval(poll, 30000); });
chrome.runtime.onInstalled.addListener(() => { poll(); setInterval(poll, 30000); });
setInterval(poll, 30000);
poll();

/* â”€â”€ Background Scanner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "startBackgroundScan") {
    startBackgroundScan(msg.urls, sendResponse);
    return true;
  }
  if (msg.type === "GET_AUTOFILL") {
    (async () => {
      try {
        const { vaultCache } = await chrome.storage.session.get("vaultCache");
        const arr = Array.isArray(vaultCache) ? vaultCache : [];
        const host = safeHost(msg.url);
        let match = null;
        for (const item of arr) {
          const ih = safeHost(item.url || "");
          if (ih && (ih === host || ih.includes(host) || host.includes(ih))) {
            match = item;
            break;
          }
        }
        sendResponse(
          match && match.password
            ? { ok: true, username: match.username || "", password: match.password }
            : { ok: false }
        );
      } catch {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }
});

function safeHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

async function startBackgroundScan(urls, sendResponse) {
  const allJobs = [];
  const sources = new Set();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    try {
      await chrome.storage.session.set({
        scanProgress: { current: i + 1, total: urls.length, currentUrl: url },
      });

      const tab = await chrome.tabs.create({ url, active: false });

      await waitForTabLoad(tab.id, 30000);
      await waitForContent(tab.id, 25000);

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scanPageForJobs,
      });

      const data = results?.[0]?.result;
      if (data && data.jobs && data.jobs.length > 0) {
        for (const job of data.jobs) {
          job._sourceUrl = url;
          allJobs.push(job);
        }
        sources.add(data.platform || url);
      }

      await chrome.tabs.remove(tab.id);
    } catch (err) {
      console.error(`Background scan failed for ${url}:`, err);
    }
  }

  await chrome.storage.session.set({ scanProgress: null });
  sendResponse({ jobs: allJobs, sources: sources.size });
}

function waitForTabLoad(tabId, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);

    const listener = (id, info) => {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 1000);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

function waitForContent(tabId, timeoutMs) {
  return new Promise((resolve) => {
    const end = Date.now() + timeoutMs;
    const poll = () => {
      if (Date.now() >= end) { resolve(); return; }
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const s = ['section[data-test="JobCard"]','.joblist-item','.job-card-container','div[role="article"]'];
          return s.some((sel) => document.querySelector(sel));
        },
      }).then((r) => {
        if (r?.[0]?.result) { setTimeout(resolve, 1000); }
        else { setTimeout(poll, 800); }
      }).catch(() => setTimeout(poll, 800));
    };
    poll();
  });
}

function scanPageForJobs() {
  const hostname = window.location.hostname;
  const url = window.location.href;
  let platform = "";
  if (hostname.includes("upwork.com")) platform = "Upwork";
  else if (hostname.includes("onlinejobs.ph")) platform = "OnlineJobs.ph";
  else if (hostname.includes("facebook.com")) platform = "Facebook";
  else if (hostname.includes("linkedin.com")) platform = "LinkedIn";
  else platform = hostname;

  const jobs = [];

  /* Upwork */
  if (platform === "Upwork") {
    const cards = document.querySelectorAll(
      'section[data-test="JobCard"], section[class*="job-tile"], div[class*="job-card"], article[class*="job"]'
    );
    cards.forEach((card) => {
      const titleEl = card.querySelector(
        '[data-test="job-title"], .job-title-link, h2 a, h3 a, a[class*="job-title"]'
      );
      const title = titleEl?.textContent?.trim() || "";
      if (!title) return;

      const descEl = card.querySelector(
        '[data-test="job-description"], .job-description, .break-word, p[class*="description"]'
      );
      const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";

      const budgetEl = card.querySelector(
        '[data-test="budget"], [data-test="JobBudget"], .job-budget, [class*="budget"]'
      );
      const budgetText = budgetEl?.textContent?.trim() || "";
      let budgetAmount = "";
      let budgetType = "";
      if (budgetText) {
        const m = budgetText.match(/\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$?[\d,]+(?:\.\d{2})?)?/);
        if (m) budgetAmount = m[0];
        if (/hourly|\/hr/i.test(budgetText)) budgetType = "hourly";
        else if (/fixed/i.test(budgetText)) budgetType = "fixed";
      }

      const linkEl = titleEl?.closest("a") || card.querySelector("a[href*='/job/']");
      const jobUrl = linkEl?.href
        ? (linkEl.href.startsWith("http") ? linkEl.href : "https://www.upwork.com" + linkEl.getAttribute("href"))
        : url;

      const skills = [];
      const skillEls = card.querySelectorAll('[data-test="skill-tag"], .skill-tag, [class*="skill"]');
      skillEls.forEach((el) => {
        const t = el.textContent?.trim();
        if (t) skills.push(t);
      });

      const postedEl = card.querySelector('[data-test="posted-date"], time, [class*="posted"]');
      const postedDate = postedEl?.textContent?.trim() || "";

      jobs.push({ title, description, budgetAmount, budgetType, url: jobUrl, platform, skills, postedDate, clientName: "" });
    });
  }

  /* OnlineJobs.ph */
  else if (platform === "OnlineJobs.ph") {
    const items = document.querySelectorAll(
      '.joblist-item, .job-post-item, #joblist > li, div[class*="job-listing"], tr[class*="job"]'
    );
    items.forEach((item) => {
      const titleEl = item.querySelector(
        '.joblist-item-title a, .job-title a, h4 a, h3 a, a[class*="title"], a[href*="/jobseekers/job/"]'
      );
      const title = titleEl?.textContent?.trim() || "";
      if (!title) return;

      const descEl = item.querySelector(
        '.joblist-item-description, .job-description, p[class*="desc"]'
      );
      const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";

      const salaryEl = item.querySelector(
        '.joblist-item-salary, .salary, [class*="salary"], [class*="budget"]'
      );
      const budgetAmount = salaryEl?.textContent?.trim() || "";

      const linkHref = titleEl?.getAttribute("href") || "";
      const jobUrl = linkHref.startsWith("http")
        ? linkHref
        : "https://www.onlinejobs.ph" + (linkHref.startsWith("/") ? "" : "/") + linkHref;

      const companyEl = item.querySelector(
        '.joblist-item-company, .company, [class*="company"]'
      );
      const clientName = companyEl?.textContent?.trim() || "";

      const postedEl = item.querySelector(
        '.joblist-item-date, .date, time, [class*="posted"]'
      );
      const postedDate = postedEl?.textContent?.trim() || "";

      jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate, clientName });
    });
  }

  /* Facebook */
  else if (platform === "Facebook") {
    const postSelectors = [
      'div[data-pagelet] div[role="article"]',
      'div[role="article"]',
      '.userContentWrapper',
      'div[class*="post"]',
    ];
    let posts = [];
    for (const sel of postSelectors) {
      posts = document.querySelectorAll(sel);
      if (posts.length > 0) break;
    }

    const keywords = /\b(looking for|hiring|need a|job|vacancy|open position|freelancer|virtual assistant|va)\b/i;
    posts.forEach((post) => {
      const text = post.textContent || "";
      if (!keywords.test(text)) return;

      const title = text.split("\n").find((l) => keywords.test(l))?.trim()?.substring(0, 200) || text.substring(0, 120).trim();
      const description = text.substring(0, 2000).trim();

      const linkEl = post.querySelector('a[href*="/posts/"], a[href*="story"], a[href*="permalink"]');
      const jobUrl = linkEl?.href || url;

      const budgetMatch = text.match(/\$\s*[\d,]+(?:\s*-\s*\$?\s*[\d,]+)?(?:\s*\/\s*hr)?/i);
      const budgetAmount = budgetMatch ? budgetMatch[0] : "";

      jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate: "", clientName: "" });
    });
  }

  /* LinkedIn */
  else if (platform === "LinkedIn") {
    const cards = document.querySelectorAll(
      '.job-card-container, .job-search-card, .job-card, article[class*="job"], li[class*="job"]'
    );
    cards.forEach((card) => {
      const titleEl = card.querySelector(
        '.job-card-list__title, .job-card-container__link, artdeco-entity-lockup__title a, a[class*="job-title"], h3 a, a[class*="job-card"]'
      );
      const title = titleEl?.textContent?.trim() || "";
      if (!title) return;

      const companyEl = card.querySelector(
        '.job-card-container__company-name, .job-search-card__subtitle, [class*="company"]'
      );
      const clientName = companyEl?.textContent?.trim() || "";

      const locationEl = card.querySelector(
        '.job-card-container__metadata-item, .job-search-card__location, [class*="location"]'
      );
      const location = locationEl?.textContent?.trim() || "";

      const linkHref = titleEl?.getAttribute("href") || "";
      const jobUrl = linkHref.startsWith("http")
        ? linkHref
        : "https://www.linkedin.com" + (linkHref.startsWith("/") ? "" : "/") + linkHref;

      const descEl = card.querySelector(
        '.job-card-container__description, .job-search-card__snippet, [class*="description"], [class*="snippet"]'
      );
      const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";

      const budgetEl = card.querySelector('[class*="salary"], [class*="pay"], [class*="compensation"]');
      const budgetAmount = budgetEl?.textContent?.trim() || "";

      const postedEl = card.querySelector('time, [class*="posted"], [class*="date"]');
      const postedDate = postedEl?.textContent?.trim() || "";

      jobs.push({ title, description: description || location, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate, clientName });
    });
  }

  return { platform, count: jobs.length, jobs };
}

