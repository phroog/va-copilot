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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getJobData") {
    sendResponse(extractJobData());
  }
  return true;
});

const jobData = extractJobData();
if (jobData.title) {
  chrome.storage.local.set({ currentJob: jobData });
}
