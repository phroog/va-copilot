function getTextContent(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }
  return "";
}

function extractJobData() {
  const hostname = window.location.hostname;
  let platform = "";
  if (hostname.includes("upwork.com")) platform = "Upwork";
  else if (hostname.includes("onlinejobs.ph")) platform = "OnlineJobs.ph";
  else platform = hostname;

  const title = getTextContent([
    "h1",
    '[itemprop="title"]',
    ".job-title",
    '[data-test="job-title"]',
    '[data-qa="job-title"]',
    ".job-details-title",
    ".t-title",
    ".profile-title",
    "h2",
  ]) || document.title || "";

  const description = (getTextContent([
    '[itemprop="description"]',
    ".job-description",
    ".description",
    '[data-qa="job-description"]',
    ".job-details-description",
    '[data-test="job-description"]',
    ".break-word",
    ".TextualDisplay",
    "article",
    '[data-test="JobDescription"]',
    ".job-description-text",
  ]) || document.body?.textContent?.trim() || "").substring(0, 5000);

  const descriptionFull = getTextContent([
    '[itemprop="description"]',
    ".job-description",
    ".description",
    '[data-qa="job-description"]',
    ".job-details-description",
    '[data-test="job-description"]',
    ".break-word",
    ".TextualDisplay",
    "article",
    '[data-test="JobDescription"]',
    ".job-description-text",
  ]) || description;

  // Budget type: hourly vs fixed
  const pageText = document.body?.textContent || "";
  let budgetType = "";
  let budgetAmount = "";

  const budgetEl = getTextContent([
    '[data-test="budget"]',
    '[data-qa="budget"]',
    ".budget",
    ".job-budget",
    '[data-test="JobBudget"]',
  ]);

  if (budgetEl) {
    const lower = budgetEl.toLowerCase();
    if (lower.includes("hourly") || lower.includes("/hr")) budgetType = "hourly";
    else if (lower.includes("fixed") || lower.includes("fixed-price")) budgetType = "fixed";
    const match = budgetEl.match(/\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$?[\d,]+(?:\.\d{2})?)?/);
    if (match) budgetAmount = match[0];
  }

  if (!budgetType) {
    if (/hourly|\/hr|\$[\d.]+\/hr/i.test(pageText)) budgetType = "hourly";
    else if (/fixed|fixed.price|project.based/i.test(pageText)) budgetType = "fixed";
  }

  if (!budgetAmount) {
    const rateMatch = pageText.match(/\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$?[\d,]+(?:\.\d{2})?)?(?:\s*\/hr)?/i);
    if (rateMatch) budgetAmount = rateMatch[0];
  }

  // Client info
  const clientName = getTextContent([
    '[data-test="client-name"]',
    '[data-qa="client-name"]',
    ".client-name",
    '[data-test="ClientName"]',
    ".freelancer-name",
    ".buyer-name",
    '[itemprop="name"]',
  ]);

  const clientCountry = getTextContent([
    '[data-test="client-country"]',
    '[data-qa="client-country"]',
    ".client-country",
    ".location",
    '[data-test="ClientLocation"]',
    '[data-ng-if="country"]',
  ]);

  // Rating
  let clientRating = "";
  const ratingText = getTextContent([
    '[data-test="client-rating"]',
    '[data-qa="client-rating"]',
    ".client-rating",
    ".rating",
    '[itemprop="ratingValue"]',
  ]);
  if (ratingText) {
    const ratingMatch = ratingText.match(/[\d.]+/);
    if (ratingMatch) clientRating = ratingMatch[0];
  }

  const clientTotalSpent = getTextContent([
    '[data-test="total-spent"]',
    '[data-qa="total-spent"]',
    ".total-spent",
    ".client-spent",
  ]);

  // Skills / tags
  const skillEls = document.querySelectorAll(
    '[data-test="skill-tag"], [data-qa="skill"], .skill-tag, .skills span, [data-test="JobSkills"] span, .token'
  );
  const skills = Array.from(skillEls)
    .map((el) => el.textContent?.trim())
    .filter(Boolean)
    .slice(0, 15);

  // Posted date
  const postedDate = getTextContent([
    '[data-test="posted-date"]',
    '[data-qa="posted-date"]',
    ".posted-date",
    '[data-test="JobPosted"]",
    ".job-posted",
    '[data-test="date-posted"]',
    "time",
  ]);

  return {
    title,
    description,
    descriptionFull,
    platform,
    budgetType,
    budgetAmount,
    clientName,
    clientCountry,
    clientRating,
    clientTotalSpent,
    skills,
    postedDate,
    url: window.location.href,
  };
}

/* ── Job Listings Scanner (multi-card) ─────────────────────────── */
function scanJobListings() {
  const hostname = window.location.hostname;
  const url = window.location.href;
  let platform = "";
  if (hostname.includes("upwork.com")) platform = "Upwork";
  else if (hostname.includes("onlinejobs.ph")) platform = "OnlineJobs.ph";
  else if (hostname.includes("facebook.com")) platform = "Facebook";
  else if (hostname.includes("linkedin.com")) platform = "LinkedIn";
  else platform = hostname;

  const jobs = [];

  /* ── Upwork ──────────────────────────────────────────────────── */
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

  /* ── OnlineJobs.ph ───────────────────────────────────────────── */
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

  /* ── Facebook ────────────────────────────────────────────────── */
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

      const clientName = "";

      jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate: "", clientName });
    });
  }

  /* ── LinkedIn ────────────────────────────────────────────────── */
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

      const skills = [];

      jobs.push({ title, description: description || location, budgetAmount, budgetType: "", url: jobUrl, platform, skills, postedDate, clientName });
    });
  }

  return { platform, count: jobs.length, jobs };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getJobData") {
    sendResponse(extractJobData());
  }
  if (msg.action === "scanJobListings") {
    sendResponse(scanJobListings());
  }
  return true;
});

const jobData = extractJobData();
if (jobData.title) {
  chrome.storage.local.set({ currentJob: jobData });
}
