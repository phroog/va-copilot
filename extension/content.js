function extractJobData() {
  const hostname = window.location.hostname;
  let platform = "";
  if (hostname.includes("upwork.com")) platform = "Upwork";
  else if (hostname.includes("onlinejobs.ph")) platform = "OnlineJobs.ph";
  else platform = hostname;

  const titleSelectors = [
    "h1",
    '[itemprop="title"]',
    ".job-title",
    '[data-test="job-title"]',
    '[data-qa="job-title"]',
    ".job-details-title",
    ".t-title",
    ".profile-title",
    "h2",
    "h3",
  ];
  let title = "";
  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) {
      title = el.textContent.trim();
      break;
    }
  }
  if (!title) title = document.title || "";

  const descSelectors = [
    '[itemprop="description"]',
    ".job-description",
    ".description",
    '[data-qa="job-description"]',
    ".job-details-description",
    '[data-test="job-description"]',
    ".break-word",
    ".TextualDisplay",
    "article",
  ];
  let description = "";
  for (const sel of descSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) {
      description = el.textContent.trim();
      break;
    }
  }
  if (!description)
    description = document.body?.textContent?.trim() || "";
  description = description.substring(0, 1000);

  return { title, description, platform };
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
