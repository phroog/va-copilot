const SARI_API = "https://getsari.com";

let sariToken = null;
let currentJob = null;
let timerInterval = null;
let runningEntryId = null;
let notesTimeout = null;
let pomodoroInterval = null;
let pomodoroRemaining = 0;
let pomodoroRunning = false;
let savedJobId = null;

/* ── Vault state ───────────────────────────────────────────────── */
let vaultKey = null;
let vaultItems = [];
let vaultDerivedKey = null;

/* ── Scanner state ────────────────────────────────────────────── */
let scannedJobs = [];
let scanInProgress = false;
let scanScoreEnabled = true;

/* ── DOM refs ─────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const loginView = $("login-view");
const mainView = $("main-view");
const connectBtn = $("connect-btn");
const disconnectBtn = $("disconnect-btn");
const disconnectBtnBottom = $("disconnect-btn-bottom");
const creditBalance = $("credit-balance");
const creditBalanceDisplay = $("credit-balance-display");
const settingsConnectedAs = $("settings-connected-as");

const jobTitle = $("job-title");
const jobPlatform = $("job-platform");
const jobEnriched = $("job-enriched");
const jobBudget = $("job-budget");
const jobClient = $("job-client");
const jobSkills = $("job-skills");
const jobDesc = $("job-desc");
const extractBtn = $("extract-btn");
const saveJobBtn = $("save-job-btn");
const saveStatus = $("save-status");
const generateBtn = $("generate-btn");
const pitchLoading = $("pitch-loading");
const pitchResult = $("pitch-result");
const pitchText = $("pitch-text");
const pitchStatus = $("pitch-status");
const copyBtn = $("copy-btn");
const polishBtn = $("polish-btn");
const retryBtn = $("retry-btn");

const timerDisplay = $("timer-display");
const timerBtn = $("timer-btn");
const timerStatus = $("timer-status");
const timerJobSelect = $("timer-job-select");
const timerProjectInput = $("timer-project-input");

const pomodoroDisplay = $("pomodoro-display");
const pomodoroBtn = $("pomodoro-btn");
const pomodoroStatus = $("pomodoro-status");

const screenshotToggle = $("screenshot-toggle");
const screenshotStatus = $("screenshot-status");
const screenshotThumbs = $("screenshot-thumbnails");
let screenshotInterval = null;

const notesTextarea = $("notes-textarea");
const notesStatus = $("notes-status");

const darkToggle = $("dark-toggle");
const darkToggleBottom = $("dark-toggle-bottom");

/* ── Tools grid ───────────────────────────────────────────────── */
const toolsGrid = $("tools-grid");
const toolDetail = $("tool-detail");
const toolDetailContent = $("tool-detail-content");
const toolBackBtn = $("tool-back-btn");

const TOOL_GROUPS = [
  {
    label: "👋 Work",
    items: [
      { id: "notes", icon: "📝", label: "Notes" },
      { id: "clients", icon: "📇", label: "Clients" },
      { id: "followups", icon: "📅", label: "Follow-ups" },
      { id: "search", icon: "🔍", label: "Job Search" },
    ],
  },
  {
    label: "🛡️ Security",
    items: [
      { id: "scam", icon: "🕵️", label: "Scam Check" },
      { id: "vault", icon: "🔐", label: "Vault" },
    ],
  },
  {
    label: "🤖 AI & Assistant",
    items: [
      { id: "mochi", icon: "🤖", label: "Mochi AI" },
    ],
  },
];

/* ── Scanner DOM refs ─────────────────────────────────────────── */
const scanCurrentBtn = $("scan-current-btn");
const scanStatus = $("scan-status");
const scanResults = $("scan-results");
const scanList = $("scan-list");
const scanActions = $("scan-actions");
const scanSaveBtn = $("scan-save-btn");
const scanSaveStatus = $("scan-save-status");
const scanExportBtn = $("scan-export-btn");
const scanBatchBtn = $("scan-batch-btn");
const scanProgress = $("scan-progress");
const scanProgressText = $("scan-progress-text");
const scanProgressFill = $("scan-progress-fill");
const scanUrlsInput = $("scan-urls-input");
const scanSaveUrlsBtn = $("scan-save-urls-btn");
const scanUrlsStatus = $("scan-urls-status");
const scanStartBgBtn = $("scan-start-bg-btn");
const scanScoreToggle = $("scan-score-toggle");
const scanRescoreBtn = $("scan-rescore-btn");
const scanAiBtn = $("scan-ai-btn");

/* ══════════════════════════════════════════════════════════════════
   TAB SWITCHING
   ══════════════════════════════════════════════════════════════════ */

const bottomTabs = document.querySelectorAll(".bottom-tab");
const tabContents = {
  job: $("tab-job"),
  time: $("tab-time"),
  scan: $("tab-scan"),
  tools: $("tab-tools"),
  settings: $("tab-settings"),
};

function switchTab(tabId) {
  bottomTabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tabId));
  Object.entries(tabContents).forEach(([id, el]) => el.classList.toggle("hidden", id !== tabId));

  if (tabId === "time") initTimer();
  if (tabId === "tools") initToolsGrid();
  if (tabId === "scan") initScanner();
  if (tabId === "settings") updateSettingsTab();
}

bottomTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

/* ══════════════════════════════════════════════════════════════════
   TOOLS GRID
   ══════════════════════════════════════════════════════════════════ */

function initToolsGrid() {
  if (toolsGrid.querySelector(".tool-card")) return;
  toolsGrid.innerHTML = TOOL_GROUPS.map(
    (g) =>
      `<div class="tool-group-label">${g.label}</div>` +
      g.items
        .map((t) => `<button class="tool-card" data-tool="${t.id}">${t.icon}<span>${t.label}</span></button>`)
        .join("")
  ).join("");

  toolsGrid.querySelectorAll(".tool-card").forEach((card) => {
    card.addEventListener("click", () => openTool(card.dataset.tool));
  });
}

function openTool(toolId) {
  const template = $(`template-${toolId}`);
  if (!template) return;

  toolsGrid.classList.add("hidden");
  toolDetail.classList.remove("hidden");
  toolDetailContent.innerHTML = template.innerHTML;

  // Re-attach event listeners for the tool
  initToolByName(toolId);

  // Scroll detail to top
  toolDetailContent.scrollTop = 0;
}

toolBackBtn.addEventListener("click", () => {
  toolDetail.classList.add("hidden");
  toolsGrid.classList.remove("hidden");
  toolDetailContent.innerHTML = "";
});

function initToolByName(name) {
  switch (name) {
    case "notes": loadNotes(); break;
    case "clients": initClients(); break;
    case "scam": initScamCheck(); break;
    case "vault": initVault(); break;
    case "followups": loadFollowUps(); break;
    case "mochi": initMochi(); break;
    case "search": initJobSearch(); break;
  }
}

/* ══════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════ */

function apiHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sariToken}`,
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${SARI_API}${path}`, {
    ...options,
    headers: { ...apiHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ══════════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════════ */

async function loadState() {
  const result = await chrome.storage.local.get([
    "sariToken",
    "currentJob",
    "sariDarkMode",
    "savedJobId",
  ]);
  sariToken = result.sariToken || null;
  currentJob = result.currentJob || null;
  savedJobId = result.savedJobId || null;
  if (result.sariDarkMode) {
    document.body.classList.add("dark");
    [darkToggle, darkToggleBottom].forEach((b) => { if (b) b.textContent = "☀️"; });
  }
  if (!result.sariDarkMode) {
    [darkToggle, darkToggleBottom].forEach((b) => { if (b) b.textContent = "🌙"; });
  }
}

async function clearToken() {
  sariToken = null;
  await chrome.storage.local.remove("sariToken");
}

/* ══════════════════════════════════════════════════════════════════
   RENDER
   ══════════════════════════════════════════════════════════════════ */

function render() {
  if (sariToken) {
    loginView.classList.add("hidden");
    mainView.classList.remove("hidden");
    renderJobInfo();
    fetchCreditBalance();
  } else {
    loginView.classList.remove("hidden");
    mainView.classList.add("hidden");
  }
}

function setCreditDisplay(bal) {
  const num = typeof bal === "number" ? bal : parseInt(bal, 10) || 0;
  creditBalance.textContent = `💎 ${num}`;
  creditBalance.classList.remove("hidden");
  if (creditBalanceDisplay) creditBalanceDisplay.textContent = num;
}

async function fetchCreditBalance() {
  try {
    // Read cached balance instantly for display
    const cached = await chrome.storage.local.get("cachedCredits");
    if (cached.cachedCredits != null) setCreditDisplay(cached.cachedCredits);
    // Then fetch fresh from API
    const data = await apiFetch("/api/ai/credits");
    const bal = data.balance ?? 0;
    setCreditDisplay(bal);
    await chrome.storage.local.set({ cachedCredits: bal, cachedCreditsTs: Date.now() });
  } catch {
    creditBalance.classList.add("hidden");
  }
}

// Listen for background credit polling updates
chrome.storage.onChanged.addListener((changes) => {
  if (changes.cachedCredits) {
    setCreditDisplay(changes.cachedCredits.newValue);
  }
});

function updateSettingsTab() {
  if (creditBalanceDisplay) {
    const bal = creditBalance.textContent.replace("💎 ", "");
    creditBalanceDisplay.textContent = bal;
  }
  if (settingsConnectedAs) {
    settingsConnectedAs.textContent = sariToken ? "Connected" : "Not connected";
  }
}

function renderJobInfo() {
  if (currentJob && currentJob.title) {
    jobTitle.textContent = currentJob.title;
    jobPlatform.textContent = currentJob.platform || "";

    if (currentJob.descriptionFull) {
      currentJob.description = currentJob.descriptionFull;
    }

    const parts = [];
    if (currentJob.budgetType || currentJob.budgetAmount) {
      parts.push(`💰 ${[currentJob.budgetType, currentJob.budgetAmount].filter(Boolean).join(" ")}`);
    }
    if (currentJob.clientName) {
      parts.push(`👤 ${currentJob.clientName}${currentJob.clientCountry ? " (" + currentJob.clientCountry + ")" : ""}`);
    }
    if (currentJob.clientRating) {
      parts.push(`⭐ ${currentJob.clientRating}`);
    }
    if (currentJob.skills?.length) {
      parts.push(`🏷️ ${currentJob.skills.slice(0, 8).join(", ")}`);
    }

    if (parts.length > 0) {
      jobEnriched.classList.remove("hidden");
      jobBudget.textContent = parts[0] || "";
      jobClient.textContent = parts[1] || "";
      jobSkills.textContent = parts.slice(2).join(" | ") || "";
    } else {
      jobEnriched.classList.add("hidden");
    }

    jobDesc.textContent = currentJob.description
      ? currentJob.description.substring(0, 200) + (currentJob.description.length > 200 ? "..." : "")
      : "";

    if (savedJobId) {
      saveJobBtn.classList.add("hidden");
    } else {
      saveJobBtn.classList.remove("hidden");
    }
  } else {
    jobTitle.textContent = "No job detected";
    jobPlatform.textContent = "";
    jobEnriched.classList.add("hidden");
    jobDesc.textContent = 'Navigate to a supported job page, then click "Re-extract from page".';
    saveJobBtn.classList.add("hidden");
  }
}

/* ══════════════════════════════════════════════════════════════════
   CONNECT / DISCONNECT
   ══════════════════════════════════════════════════════════════════ */

connectBtn.addEventListener("click", connectToSari);
[disconnectBtn, disconnectBtnBottom].forEach((btn) => {
  if (btn) btn.addEventListener("click", async () => { await clearToken(); render(); });
});

async function connectToSari() {
  connectBtn.disabled = true;
  connectBtn.textContent = "Opening Sari...";

  await chrome.tabs.create({ url: SARI_API + "/extension-auth" });

  try {
    const token = await pollForToken(30_000);
    sariToken = token;
    render();
  } catch (err) {
    alert("Authentication failed: " + err.message);
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect to Sari";
  }
}

function pollForToken(timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(async () => {
      const result = await chrome.storage.local.get("sariToken");
      if (result.sariToken) {
        clearInterval(interval);
        resolve(result.sariToken);
      } else if (Date.now() - start >= timeoutMs) {
        clearInterval(interval);
        reject(new Error("Timed out waiting for authentication"));
      }
    }, 1000);
  });
}

/* ══════════════════════════════════════════════════════════════════
   DARK MODE
   ══════════════════════════════════════════════════════════════════ */

[darkToggle, darkToggleBottom].forEach((btn) => {
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const isDark = document.body.classList.toggle("dark");
    const text = isDark ? "☀️" : "🌙";
    [darkToggle, darkToggleBottom].forEach((b) => { if (b) b.textContent = text; });
    await chrome.storage.local.set({ sariDarkMode: isDark });
  });
});

/* ══════════════════════════════════════════════════════════════════
   EXTRACT JOB
   ══════════════════════════════════════════════════════════════════ */

extractBtn.addEventListener("click", extractJobFromTab);

async function extractJobFromTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !supportedSite(tab.url)) {
    jobTitle.textContent = "Not on a supported job page";
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        function g(sel) {
          for (const s of sel) { const el = document.querySelector(s); if (el && el.textContent.trim()) return el.textContent.trim(); }
          return "";
        }
        const hostname = location.hostname;
        let platform = "";
        if (hostname.includes("upwork.com")) platform = "Upwork";
        else if (hostname.includes("onlinejobs.ph")) platform = "OnlineJobs.ph";
        else platform = hostname;

        const title = g(["h1", '[itemprop="title"]', ".job-title", '[data-test="job-title"]', '[data-qa="job-title"]', ".job-details-title", ".t-title", "h2"]) || document.title || "";
        const descSelectors = ['[itemprop="description"]', ".job-description", ".description", '[data-qa="job-description"]', ".job-details-description", '[data-test="job-description"]', ".break-word", ".TextualDisplay", "article", '[data-test="JobDescription"]', ".job-description-text"];
        const description = (g(descSelectors) || document.body?.textContent?.trim() || "").substring(0, 5000);
        const descriptionFull = (g(descSelectors) || "").substring(0, 10000);
        const pageText = document.body?.textContent || "";
        let budgetType = "";
        let budgetAmount = "";
        const budgetEl = g(['[data-test="budget"]', '[data-qa="budget"]', ".budget", ".job-budget", '[data-test="JobBudget"]']);
        if (budgetEl) {
          const lower = budgetEl.toLowerCase();
          if (lower.includes("hourly") || lower.includes("/hr")) budgetType = "hourly";
          else if (lower.includes("fixed")) budgetType = "fixed";
          const m = budgetEl.match(/\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$?[\d,]+(?:\.\d{2})?)?/);
          if (m) budgetAmount = m[0];
        }
        if (!budgetType) { if (/hourly|\/hr/i.test(pageText)) budgetType = "hourly"; else if (/fixed|fixed.price/i.test(pageText)) budgetType = "fixed"; }
        if (!budgetAmount) { const m = pageText.match(/\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$?[\d,]+(?:\.\d{2})?)?(?:\s*\/hr)?/i); if (m) budgetAmount = m[0]; }
        const clientName = g(['[data-test="client-name"]', '[data-qa="client-name"]', ".client-name", '[data-test="ClientName"]', ".freelancer-name", ".buyer-name"]);
        const clientCountry = g(['[data-test="client-country"]', '[data-qa="client-country"]', ".client-country", ".location", '[data-test="ClientLocation"]']);
        let clientRating = "";
        const r = g(['[data-test="client-rating"]', '[data-qa="client-rating"]', ".client-rating", ".rating"]);
        if (r) { const rm = r.match(/[\d.]+/); if (rm) clientRating = rm[0]; }
        const clientTotalSpent = g(['[data-test="total-spent"]', '[data-qa="total-spent"]', ".total-spent", ".client-spent"]);
        const skillEls = document.querySelectorAll('[data-test="skill-tag"], [data-qa="skill"], .skill-tag, .skills span, [data-test="JobSkills"] span, .token');
        const skills = Array.from(skillEls).map((el) => el.textContent?.trim()).filter(Boolean).slice(0, 15);
        const postedDate = g(['[data-test="posted-date"]', '[data-qa="posted-date"]', ".posted-date", '[data-test="JobPosted"]', ".job-posted", '[data-test="date-posted"]', "time"]);
        return { title, description, descriptionFull, platform, budgetType, budgetAmount, clientName, clientCountry, clientRating, clientTotalSpent, skills, postedDate, url: location.href };
      },
    });

    const data = results?.[0]?.result;
    if (data && data.title) {
      currentJob = data;
      savedJobId = null;
      await chrome.storage.local.set({ currentJob: data, savedJobId: null });
      renderJobInfo();
    }
  } catch (err) { console.error("Extract error:", err); }
}

function supportedSite(url) {
  if (!url) return false;
  return url.includes("upwork.com") || url.includes("onlinejobs.ph");
}

/* ══════════════════════════════════════════════════════════════════
   SAVE JOB
   ══════════════════════════════════════════════════════════════════ */

saveJobBtn.addEventListener("click", async () => {
  if (!currentJob || !currentJob.title) return;
  saveJobBtn.disabled = true;
  saveStatus.textContent = "Saving...";
  saveStatus.classList.remove("hidden");

  try {
    const payload = {
      title: currentJob.title,
      description: currentJob.descriptionFull || currentJob.description || "",
      platform: currentJob.platform || "Unknown",
      url: currentJob.url || "",
      budget_type: currentJob.budgetType || null,
      budget_amount: currentJob.budgetAmount || null,
      client_name: currentJob.clientName || null,
      client_country: currentJob.clientCountry || null,
      client_rating: currentJob.clientRating ? parseFloat(currentJob.clientRating) : null,
      client_total_spent: currentJob.clientTotalSpent || null,
      skills: currentJob.skills?.length ? currentJob.skills : null,
    };

    const { job } = await apiFetch("/api/jobs", { method: "POST", body: JSON.stringify(payload) });
    savedJobId = job.id;
    await chrome.storage.local.set({ savedJobId: job.id });
    saveStatus.textContent = "Job saved! ✅";
    saveJobBtn.classList.add("hidden");
    await doGeneratePitch(job.id);
  } catch (err) {
    saveStatus.textContent = "Save failed: " + err.message;
  } finally {
    saveJobBtn.disabled = false;
  }
});

/* ══════════════════════════════════════════════════════════════════
   GENERATE PITCH
   ══════════════════════════════════════════════════════════════════ */

generateBtn.addEventListener("click", async () => {
  if (!currentJob || !currentJob.title) { alert("No job data available. Extract a job first."); return; }
  pitchLoading.classList.remove("hidden");
  pitchResult.classList.add("hidden");
  pitchStatus.classList.add("hidden");
  retryBtn.classList.add("hidden");
  generateBtn.disabled = true;
  try {
    let jobId = savedJobId;
    if (!jobId) {
      const payload = {
        title: currentJob.title,
        description: currentJob.descriptionFull || currentJob.description || "",
        platform: currentJob.platform || "Unknown",
        url: currentJob.url || "",
        budget_type: currentJob.budgetType || null,
        budget_amount: currentJob.budgetAmount || null,
        client_name: currentJob.clientName || null,
        client_country: currentJob.clientCountry || null,
        client_rating: currentJob.clientRating ? parseFloat(currentJob.clientRating) : null,
        client_total_spent: currentJob.clientTotalSpent || null,
        skills: currentJob.skills?.length ? currentJob.skills : null,
      };
      const { job } = await apiFetch("/api/jobs", { method: "POST", body: JSON.stringify(payload) });
      jobId = job.id;
      savedJobId = job.id;
      await chrome.storage.local.set({ savedJobId: job.id });
    }
    await doGeneratePitch(jobId);
  } catch (err) {
    pitchStatus.textContent = "Failed: " + err.message;
    pitchStatus.classList.remove("hidden");
    retryBtn.classList.remove("hidden");
  } finally {
    pitchLoading.classList.add("hidden");
    generateBtn.disabled = false;
  }
});

async function doGeneratePitch(jobId) {
  pitchLoading.classList.remove("hidden");
  pitchResult.classList.add("hidden");
  pitchStatus.classList.add("hidden");
  retryBtn.classList.add("hidden");
  try {
    const data = await apiFetch("/api/generate-pitch", { method: "POST", body: JSON.stringify({ jobId }) });
    pitchText.textContent = data.pitch || JSON.stringify(data);
    pitchResult.classList.remove("hidden");
    syncCachedCredits();
  } catch (err) {
    pitchStatus.textContent = "AI failed: " + err.message;
    pitchStatus.classList.remove("hidden");
    retryBtn.classList.remove("hidden");
  } finally {
    pitchLoading.classList.add("hidden");
  }
}

retryBtn.addEventListener("click", () => { if (savedJobId) doGeneratePitch(savedJobId); });
copyBtn.addEventListener("click", () => { navigator.clipboard.writeText(pitchText.textContent).catch(() => {}); });
polishBtn.addEventListener("click", async () => {
  const text = pitchText.textContent;
  if (!text) return;
  polishBtn.disabled = true;
  try {
    const data = await apiFetch("/api/polish-text", { method: "POST", body: JSON.stringify({ text }) });
    pitchText.textContent = data.polished || JSON.stringify(data);
    syncCachedCredits();
  } catch (err) { alert("Polish failed: " + err.message); } finally { polishBtn.disabled = false; }
});

/* ══════════════════════════════════════════════════════════════════
   TIME TRACKING
   ══════════════════════════════════════════════════════════════════ */

async function loadTimerJobs() {
  try {
    const data = await apiFetch("/api/jobs");
    const jobs = data.jobs || data || [];
    const currentVal = timerJobSelect.value;
    timerJobSelect.innerHTML = '<option value="">-- Select job (optional) --</option>';
    (Array.isArray(jobs) ? jobs : []).forEach((j) => {
      const opt = document.createElement("option");
      opt.value = j.id;
      opt.textContent = (j.title || "Untitled").substring(0, 60) + (j.platform ? " | " + j.platform : "");
      timerJobSelect.appendChild(opt);
    });
    if (currentVal) timerJobSelect.value = currentVal;
  } catch (err) { /* silently fail, jobs are optional */ }
}

timerJobSelect.addEventListener("change", () => {
  if (timerJobSelect.value) timerProjectInput.value = "";
});

async function initTimer() {
  try {
    const data = await apiFetch("/api/time-entries");
    if (data.running) {
      runningEntryId = data.running.id;
      timerBtn.textContent = "Stop Timer";
      startTimerDisplay(data.running.start_time);
      timerStatus.textContent = data.running.description ? "Tracking: " + data.running.description : "";
    } else {
      runningEntryId = null;
      timerBtn.textContent = "Start Timer";
      stopTimerDisplay();
      timerDisplay.textContent = "00:00:00";
      timerStatus.textContent = "";
    }
    await loadTimerJobs();
  } catch (err) { timerStatus.textContent = "Could not load timer"; }
}

timerBtn.addEventListener("click", async () => {
  if (timerBtn.textContent === "Start Timer") { await startTimer(); }
  else { await stopTimer(); }
});

async function startTimer() {
  const startTime = new Date().toISOString();
  timerBtn.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const jobId = timerJobSelect.value || null;
    const projectName = timerProjectInput.value.trim() ||
      (jobId ? timerJobSelect.options[timerJobSelect.selectedIndex]?.text?.split(" | ")[0] : "") ||
      "Browser work";
    const currentUrl = tab?.url || "";
    const data = await apiFetch("/api/time-entries", { method: "POST", body: JSON.stringify({ description: currentUrl, start_time: startTime, project_name: projectName, job_id: jobId }) });
    runningEntryId = data.entry.id;
    timerBtn.textContent = "Stop Timer";
    startTimerDisplay(startTime);
    timerStatus.textContent = currentUrl ? "Tracking: " + currentUrl : "";
    if (screenshotToggle.checked) startScreenshotCapture();
  } catch (err) { timerStatus.textContent = "Failed to start: " + err.message; } finally { timerBtn.disabled = false; }
}

async function stopTimer() {
  if (!runningEntryId) return;
  const endTime = new Date().toISOString();
  timerBtn.disabled = true;
  try {
    await apiFetch(`/api/time-entries/${runningEntryId}`, { method: "PATCH", body: JSON.stringify({ end_time: endTime }) });
    stopScreenshotCapture();
    runningEntryId = null;
    timerBtn.textContent = "Start Timer";
    stopTimerDisplay();
    timerDisplay.textContent = "00:00:00";
    timerStatus.textContent = "";
  } catch (err) { timerStatus.textContent = "Failed to stop: " + err.message; } finally { timerBtn.disabled = false; }
}

let timerStartTs = null;
function startTimerDisplay(startTime) {
  timerStartTs = new Date(startTime).getTime();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - timerStartTs;
    const hrs = Math.floor(elapsed / 3600000);
    const mins = Math.floor((elapsed % 3600000) / 60000);
    const secs = Math.floor((elapsed % 60000) / 1000);
    timerDisplay.textContent = String(hrs).padStart(2, "0") + ":" + String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }, 1000);
}

function stopTimerDisplay() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

/* Screenshots */
screenshotToggle.addEventListener("change", () => {
  if (screenshotToggle.checked && runningEntryId) startScreenshotCapture();
  else stopScreenshotCapture();
});

async function captureScreenshot() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    if (!dataUrl) return;
    const ssRes = await fetch(`${SARI_API}/api/screenshots`, { method: "POST", headers: { ...apiHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ image_data_url: dataUrl, time_entry_id: runningEntryId }) });
    const ssData = await ssRes.json();
    if (ssData.screenshot) showScreenshotThumb(ssData.screenshot.image_url);
  } catch (err) { console.error("Screenshot capture failed:", err); }
}

function showScreenshotThumb(url) {
  const img = document.createElement("a");
  img.href = url;
  img.target = "_blank";
  img.innerHTML = `<img src="${url}" class="screenshot-thumb" />`;
  screenshotThumbs.prepend(img);
  screenshotThumbs.classList.remove("hidden");
}

function startScreenshotCapture() {
  if (screenshotInterval) clearInterval(screenshotInterval);
  screenshotStatus.textContent = "📸 Screenshot capture active";
  screenshotStatus.classList.remove("hidden");
  const capture = () => { captureScreenshot(); const nextDelay = 300000 + Math.random() * 300000; setTimeout(capture, nextDelay); };
  capture();
}

function stopScreenshotCapture() {
  if (screenshotInterval) { clearInterval(screenshotInterval); screenshotInterval = null; }
  screenshotStatus.textContent = "";
  screenshotStatus.classList.add("hidden");
}

/* ══════════════════════════════════════════════════════════════════
   POMODORO
   ══════════════════════════════════════════════════════════════════ */

pomodoroBtn.addEventListener("click", () => {
  if (!pomodoroRunning) startPomodoro();
  else stopPomodoro();
});

function startPomodoro() {
  pomodoroRunning = true;
  pomodoroRemaining = 25 * 60;
  pomodoroBtn.textContent = "Stop";
  pomodoroStatus.textContent = "Focus time! 🍅";
  if (pomodoroInterval) clearInterval(pomodoroInterval);
  pomodoroInterval = setInterval(() => {
    pomodoroRemaining--;
    const mins = Math.floor(pomodoroRemaining / 60);
    const secs = pomodoroRemaining % 60;
    pomodoroDisplay.textContent = String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    if (pomodoroRemaining <= 0) {
      stopPomodoro();
      pomodoroStatus.textContent = "Time's up! 🎉";
      if (Notification.permission === "granted") new Notification("Sari Pomodoro", { body: "Pomodoro complete! Take a break." });
    }
  }, 1000);
}

function stopPomodoro() {
  pomodoroRunning = false;
  pomodoroRemaining = 0;
  pomodoroBtn.textContent = "Start Pomodoro";
  if (pomodoroInterval) { clearInterval(pomodoroInterval); pomodoroInterval = null; }
  pomodoroDisplay.textContent = "25:00";
}

/* ══════════════════════════════════════════════════════════════════
   NOTES
   ══════════════════════════════════════════════════════════════════ */

async function loadNotes() {
  try {
    const data = await apiFetch("/api/notes");
    notesTextarea.value = data.notes || "";
    notesStatus.textContent = "Auto-saves on change";
  } catch (err) { notesStatus.textContent = "Could not load notes"; }
}

notesTextarea.addEventListener("input", () => {
  notesStatus.textContent = "Unsaved changes...";
  if (notesTimeout) clearTimeout(notesTimeout);
  notesTimeout = setTimeout(saveNotes, 1000);
});

async function saveNotes() {
  const text = notesTextarea.value;
  notesStatus.textContent = "Saving...";
  try { await apiFetch("/api/notes", { method: "PUT", body: JSON.stringify({ notes: text }) }); notesStatus.textContent = "Saved"; }
  catch { notesStatus.textContent = "Save failed"; }
}

/* ══════════════════════════════════════════════════════════════════
   CLIENTS
   ══════════════════════════════════════════════════════════════════ */

function maybeShowQuickAdd() {
  if (currentJob && currentJob.clientName) {
    const el = $("clients-quick-add");
    if (el) {
      el.classList.remove("hidden");
      $("clients-new-name").value = currentJob.clientName;
      $("clients-new-title").value = "Website";
    }
  }
}

async function initClients() {
  const content = $("clients-content");
  const viewAll = $("clients-view-all");
  if (!content) return;
  content.innerHTML = "<p class='status-text'>Loading...</p>";
  try {
    const data = await apiFetch("/api/client-links");
    const links = data.links || [];
    if (links.length === 0) {
      content.innerHTML = "<p class='status-text'>No client links yet</p>";
      if (viewAll) viewAll.classList.add("hidden");
      maybeShowQuickAdd();
      return;
    }
    const grouped = {};
    links.slice(0, 10).forEach(l => {
      if (!grouped[l.client_name]) grouped[l.client_name] = [];
      grouped[l.client_name].push(l);
    });
    let html = "";
    Object.entries(grouped).forEach(([name, items]) => {
      html += `<div class="client-group"><div class="client-group-name">👤 ${name}</div>`;
      items.forEach(item => { html += `<a href="${item.url}" target="_blank" class="client-link-btn">${item.title}</a>`; });
      html += "</div>";
    });
    content.innerHTML = html;
    if (viewAll) {
      if (links.length > 10) { viewAll.classList.remove("hidden"); viewAll.onclick = () => chrome.tabs.create({ url: SARI_API + "/dashboard/clients" }); }
      else { viewAll.classList.add("hidden"); }
    }
    maybeShowQuickAdd();
  } catch { content.innerHTML = "<p class='status-text'>Could not load client links</p>"; }
}

const clientsRefreshBtn = $("clients-refresh-btn");
if (clientsRefreshBtn) clientsRefreshBtn.addEventListener("click", initClients);

const clientsSaveBtn = $("clients-save-btn");
if (clientsSaveBtn) {
  clientsSaveBtn.addEventListener("click", async () => {
    const name = $("clients-new-name")?.value?.trim();
    const title = $("clients-new-title")?.value?.trim() || "Website";
    const status = $("clients-status");
    if (!name) { if (status) status.textContent = "Client name required"; return; }
    if (clientsSaveBtn) clientsSaveBtn.disabled = true;
    if (status) status.textContent = "Saving...";
    try {
      await apiFetch("/api/client-links", { method: "POST", body: JSON.stringify({ client_name: name, title, url: currentJob?.url || location.href, link_type: "website" }) });
      if (status) status.textContent = "Saved! ✅";
      initClients();
    } catch (err) { if (status) status.textContent = "Save failed: " + err.message; } finally { if (clientsSaveBtn) clientsSaveBtn.disabled = false; }
  });
}

/* ══════════════════════════════════════════════════════════════════
   SCAM CHECK
   ══════════════════════════════════════════════════════════════════ */

function initScamCheck() {
  const clientNameEl = $("scam-client-name");
  const urlEl = $("scam-url");
  const checkBtn = $("scam-check-btn");
  const resultEl = $("scam-result");
  const statusEl = $("scam-status");
  if (!clientNameEl) return;
  if (currentJob) {
    clientNameEl.textContent = "👤 " + (currentJob.clientName || "Unknown client");
    if (urlEl) urlEl.textContent = currentJob.url ? "🔗 " + currentJob.url : "";
    if (checkBtn) checkBtn.classList.remove("hidden");
  } else {
    clientNameEl.textContent = "No client detected on current page";
    if (urlEl) urlEl.textContent = "";
    if (checkBtn) checkBtn.classList.add("hidden");
  }
  if (resultEl) resultEl.classList.add("hidden");
  if (statusEl) statusEl.classList.add("hidden");
}

async function runScamCheck(clientName, url) {
  const statusEl = $("scam-status");
  const resultEl = $("scam-result");
  const scoreEl = $("scam-score-display");
  const analysisEl = $("scam-analysis");
  if (!statusEl) return;
  statusEl.classList.remove("hidden");
  statusEl.textContent = "Checking...";
  if (resultEl) resultEl.classList.add("hidden");
  try {
    const data = await apiFetch("/api/ai/scam-check", { method: "POST", body: JSON.stringify({ client_name: clientName || undefined, website_url: url || undefined }) });
    if (scoreEl) { scoreEl.textContent = data.score; scoreEl.className = "scam-score " + (data.score >= 70 ? "scam-score-high" : data.score >= 40 ? "scam-score-med" : "scam-score-low"); }
    if (analysisEl) analysisEl.textContent = data.analysis;
    if (resultEl) resultEl.classList.remove("hidden");
    statusEl.classList.add("hidden");
    syncCachedCredits();
  } catch (err) { statusEl.textContent = "Check failed: " + err.message; }
}

const scamCheckBtn = $("scam-check-btn");
if (scamCheckBtn) scamCheckBtn.addEventListener("click", () => { runScamCheck(currentJob?.clientName || "", currentJob?.url || ""); });

const scamManualBtn = $("scam-manual-btn");
if (scamManualBtn) scamManualBtn.addEventListener("click", () => {
  const name = $("scam-manual-name")?.value?.trim() || "";
  const url = $("scam-manual-url")?.value?.trim() || "";
  if (!name && !url) { const s = $("scam-status"); if (s) { s.textContent = "Enter a name or URL"; s.classList.remove("hidden"); } return; }
  runScamCheck(name, url);
});

const scamManualUrl = $("scam-manual-url");
if (scamManualUrl) scamManualUrl.addEventListener("keydown", (e) => { if (e.key === "Enter") $("scam-manual-btn")?.click(); });

/* ══════════════════════════════════════════════════════════════════
   VAULT
   ══════════════════════════════════════════════════════════════════ */

function vaultDeriveKey(password, salt) {
  let enc = new TextEncoder();
  let data = enc.encode(password + salt);
  for (let i = 0; i < 1000; i++) { let hash = nacl.hash(data); data = hash.slice(0, 32); }
  return data;
}

function vaultEncrypt(key, plaintext) {
  let enc = new TextEncoder();
  let nonce = nacl.randomBytes(24);
  let cipher = nacl.secretbox(enc.encode(plaintext), nonce, key);
  return nacl_util.encodeBase64(nonce) + ":" + nacl_util.encodeBase64(cipher);
}

function vaultDecrypt(key, ciphertext) {
  let [nonceB64, cipherB64] = ciphertext.split(":");
  let nonce = nacl_util.decodeBase64(nonceB64);
  let cipher = nacl_util.decodeBase64(cipherB64);
  let plain = nacl.secretbox.open(cipher, nonce, key);
  if (!plain) throw new Error("Decryption failed");
  return new TextDecoder().decode(plain);
}

async function initVault() {
  const locked = $("vault-locked");
  const unlocked = $("vault-unlocked");
  const status = $("vault-status");
  if (!locked || !unlocked) return;
  if (vaultKey) {
    locked.classList.add("hidden");
    unlocked.classList.remove("hidden");
    loadVaultItems();
    return;
  }
  try {
    const data = await apiFetch("/api/vault/setup");
    if (data.salt && data.keyCheck) {
      locked.classList.remove("hidden");
      unlocked.classList.add("hidden");
      if (status) status.textContent = "";
    } else {
      locked.classList.remove("hidden");
      unlocked.classList.add("hidden");
      if (status) status.textContent = "Vault not set up. Go to Sari Dashboard to initialize.";
    }
  } catch { if (status) status.textContent = "Could not check vault status"; }
}

const vaultUnlockBtn = $("vault-unlock-btn");
const vaultPassword = $("vault-password");
if (vaultUnlockBtn) vaultUnlockBtn.addEventListener("click", unlockVault);
if (vaultPassword) vaultPassword.addEventListener("keydown", (e) => { if (e.key === "Enter") unlockVault(); });

async function unlockVault() {
  const password = vaultPassword?.value;
  const status = $("vault-status");
  if (!password) { if (status) status.textContent = "Enter your master password"; return; }
  if (vaultUnlockBtn) vaultUnlockBtn.disabled = true;
  if (status) status.textContent = "Unlocking...";
  try {
    const setup = await apiFetch("/api/vault/setup");
    if (!setup.salt || !setup.keyCheck) { if (status) status.textContent = "Vault not set up yet. Use the Sari Dashboard."; return; }
    const key = vaultDeriveKey(password, setup.salt);
    const [nonceB64, cipherB64] = setup.keyCheck.split(":");
    const nonce = nacl_util.decodeBase64(nonceB64);
    const cipher = nacl_util.decodeBase64(cipherB64);
    const decrypted = nacl.secretbox.open(cipher, nonce, key);
    if (decrypted) {
      vaultKey = key;
      const locked = $("vault-locked");
      const unlocked = $("vault-unlocked");
      if (locked) locked.classList.add("hidden");
      if (unlocked) unlocked.classList.remove("hidden");
      if (vaultPassword) vaultPassword.value = "";
      if (status) status.textContent = "";
      loadVaultItems();
    } else { if (status) status.textContent = "Wrong password"; }
  } catch (err) { if (status) status.textContent = "Unlock failed: " + err.message; } finally { if (vaultUnlockBtn) vaultUnlockBtn.disabled = false; }
}

const vaultLockBtn = $("vault-lock-btn");
if (vaultLockBtn) vaultLockBtn.addEventListener("click", () => { vaultKey = null; const l = $("vault-locked"); const u = $("vault-unlocked"); if (l) l.classList.remove("hidden"); if (u) u.classList.add("hidden"); vaultItems = []; chrome.storage.session.remove("vaultCache").catch(() => {}); });

async function loadVaultItems() {
  const container = $("vault-items");
  if (!container) return;
  try { const data = await apiFetch("/api/vault"); vaultItems = data.items || []; renderVaultItems(); syncVaultAutofillCache(); }
  catch { container.innerHTML = "<p class='status-text'>Failed to load vault items</p>"; }
}

/* Share the DECRYPTED credentials with the background (session storage only,
   cleared on lock) so the content script can autofill login forms. */
async function syncVaultAutofillCache() {
  try {
    if (!vaultKey || !Array.isArray(vaultItems)) {
      await chrome.storage.session.remove("vaultCache");
      return;
    }
    const cache = [];
    for (const item of vaultItems) {
      try {
        cache.push({
          url: item.url || "",
          username: item.username ? vaultDecrypt(vaultKey, item.username) : "",
          password: item.encrypted_password ? vaultDecrypt(vaultKey, item.encrypted_password) : "",
        });
      } catch {}
    }
    await chrome.storage.session.set({ vaultCache: cache });
  } catch {}
}

function renderVaultItems() {
  const container = $("vault-items");
  if (!container) return;
  if (vaultItems.length === 0) { container.innerHTML = "<p class='status-text'>No vault items yet</p>"; return; }
  container.innerHTML = vaultItems.map((item, idx) => {
    let uname = "";
    try { uname = item.username ? vaultDecrypt(vaultKey, item.username) : ""; } catch {}
    return `<div class="vault-item"><span class="vault-item-title">${item.title}</span><span class="vault-item-uname">${uname}</span><div class="vault-item-actions"><button class="vault-reveal-btn" data-idx="${idx}">👁️</button><button class="vault-copy-btn" data-idx="${idx}">📋</button><button class="vault-del-btn" data-idx="${idx}">🗑️</button></div></div>`;
  }).join("");
  container.querySelectorAll(".vault-reveal-btn").forEach((btn) => btn.addEventListener("click", () => { const item = vaultItems[parseInt(btn.dataset.idx)]; if (!item) return; try { alert("Password: " + vaultDecrypt(vaultKey, item.encrypted_password)); } catch { alert("Could not decrypt password"); } }));
  container.querySelectorAll(".vault-copy-btn").forEach((btn) => btn.addEventListener("click", () => { const item = vaultItems[parseInt(btn.dataset.idx)]; if (!item) return; try { navigator.clipboard.writeText(vaultDecrypt(vaultKey, item.encrypted_password)).catch(() => {}); } catch {} }));
  container.querySelectorAll(".vault-del-btn").forEach((btn) => btn.addEventListener("click", async () => { const item = vaultItems[parseInt(btn.dataset.idx)]; if (!item || !confirm(`Delete "${item.title}"?`)) return; try { await apiFetch(`/api/vault/${item.id}`, { method: "DELETE" }); vaultItems.splice(parseInt(btn.dataset.idx), 1); renderVaultItems(); } catch {} }));
}

const vaultAddBtn = $("vault-add-btn");
if (vaultAddBtn) vaultAddBtn.addEventListener("click", () => { const f = $("vault-add-form"); if (f) f.classList.toggle("hidden"); });

const vaultSaveItemBtn = $("vault-save-item-btn");
if (vaultSaveItemBtn) vaultSaveItemBtn.addEventListener("click", async () => {
  const title = $("vault-new-title")?.value?.trim();
  const username = $("vault-new-username")?.value?.trim();
  const url = $("vault-new-url")?.value?.trim();
  const password = $("vault-new-password")?.value?.trim();
  const status = $("vault-status");
  if (!title || !password) { if (status) status.textContent = "Title and password required"; return; }
  if (vaultSaveItemBtn) vaultSaveItemBtn.disabled = true;
  try {
    const encPwd = vaultEncrypt(vaultKey, password);
    const encUname = username ? vaultEncrypt(vaultKey, username) : "";
    const data = await apiFetch("/api/vault", { method: "POST", body: JSON.stringify({ title, encrypted_password: encPwd, username: encUname, url, notes: "" }) });
    if (data.item) { vaultItems.unshift(data.item); renderVaultItems(); if ($("vault-new-title")) $("vault-new-title").value = ""; if ($("vault-new-username")) $("vault-new-username").value = ""; if ($("vault-new-url")) $("vault-new-url").value = ""; if ($("vault-new-password")) $("vault-new-password").value = ""; const f = $("vault-add-form"); if (f) f.classList.add("hidden"); }
  } catch (err) { if (status) status.textContent = "Save failed: " + err.message; } finally { if (vaultSaveItemBtn) vaultSaveItemBtn.disabled = false; }
});

/* ══════════════════════════════════════════════════════════════════
   FOLLOW-UPS
   ══════════════════════════════════════════════════════════════════ */

async function loadFollowUps() {
  const content = $("follow-ups-content");
  if (!content) return;
  try {
    const data = await apiFetch("/api/follow-ups");
    const items = data.followUps || [];
    const pending = items.filter((f) => f.status === "pending");
    if (pending.length === 0) { content.innerHTML = "<p class='status-text'>No pending follow-ups ✨</p>"; return; }
    content.innerHTML = pending.slice(0, 5).map((f) => `<div class="follow-up-item" data-id="${f.id}"><span class="follow-up-title">${f.jobs?.title || "Job"}</span><span class="follow-up-due">${f.due_date}</span><button class="follow-up-done-btn" data-id="${f.id}">Done</button></div>`).join("");
    content.querySelectorAll(".follow-up-done-btn").forEach((btn) => btn.addEventListener("click", async () => { try { await apiFetch("/api/follow-ups", { method: "PATCH", body: JSON.stringify({ id: btn.dataset.id, status: "completed" }) }); loadFollowUps(); } catch (err) { alert("Failed to update: " + err.message); } }));
  } catch { content.innerHTML = "<p class='status-text'>Could not load follow-ups</p>"; }
}

/* ══════════════════════════════════════════════════════════════════
   MOCHI AI CHAT
   ══════════════════════════════════════════════════════════════════ */

function mochiStorageKey() {
  return "mochiMessages_" + (sariToken ? sariToken.substring(0, 12) : "anon");
}

function loadMochiMessages() {
  try {
    const raw = localStorage.getItem(mochiStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMochiMessages(msgs) {
  try { localStorage.setItem(mochiStorageKey(), JSON.stringify(msgs)); } catch {}
}

function renderMochiMessages() {
  const container = $("mochi-messages");
  if (!container) return;
  const msgs = loadMochiMessages();
  container.innerHTML = msgs.map((m) =>
    `<div class="mochi-msg ${m.role}"><span class="mochi-msg-icon">${m.role === "user" ? "👤" : "🤖"}</span><div class="mochi-msg-bubble">${escapeHtml(m.text)}</div></div>`
  ).join("");
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function addMochiMessage(role, text) {
  const msgs = loadMochiMessages();
  msgs.push({ role, text, ts: Date.now() });
  if (msgs.length > 50) msgs.splice(0, msgs.length - 50);
  saveMochiMessages(msgs);
  renderMochiMessages();
}

async function initMochi() {
  const statusEl = $("mochi-status");
  if (statusEl) statusEl.classList.add("hidden");
  renderMochiMessages();
  const input = $("mochi-input");
  const sendBtn = $("mochi-send-btn");
  if (input) { input.onkeydown = (e) => { if (e.key === "Enter") sendMochiMessage(); }; }
  if (sendBtn) { sendBtn.onclick = sendMochiMessage; }
  try {
    const data = await apiFetch("/api/ai/credits");
    const balanceEl = $("mochi-balance");
    if (balanceEl) balanceEl.textContent = `${data.balance ?? "?"} 🪙`;
  } catch {}
}

async function syncCachedCredits() {
  try {
    const data = await apiFetch("/api/ai/credits");
    const bal = data.balance ?? 0;
    setCreditDisplay(bal);
    await chrome.storage.local.set({ cachedCredits: bal, cachedCreditsTs: Date.now() });
  } catch {}
}

async function sendMochiMessage() {
  const input = $("mochi-input");
  const statusEl = $("mochi-status");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  if (statusEl) statusEl.classList.add("hidden");
  addMochiMessage("user", text);
  const msgs = loadMochiMessages();
  const history = msgs.slice(0, -1).slice(-6).map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
  try {
    const data = await apiFetch("/api/mochi/chat", { method: "POST", body: JSON.stringify({ message: text, history }) });
    addMochiMessage("ai", data.reply || "🤔 Mochi is thinking...");
    const balanceEl = $("mochi-balance");
    if (balanceEl && data.balance != null) balanceEl.textContent = `${data.balance} 🪙`;
    setCreditDisplay(data.balance);
    await chrome.storage.local.set({ cachedCredits: data.balance, cachedCreditsTs: Date.now() });
  } catch (err) {
    addMochiMessage("ai", "⚠️ Error: " + (err.message || "Try again later"));
  }
}

/* ══════════════════════════════════════════════════════════════════
   JOB SEARCH
   ══════════════════════════════════════════════════════════════════ */

function initJobSearch() {
  const input = $("job-search-input");
  const results = $("job-search-results");
  if (input) input.value = "";
  if (results) results.innerHTML = "";
}

const jobSearchInput = $("job-search-input");
if (jobSearchInput) {
  jobSearchInput.addEventListener("input", () => {
    const q = jobSearchInput.value.trim();
    const results = $("job-search-results");
    if (!results) return;
    if (q.length < 2) { results.innerHTML = ""; return; }
    clearTimeout(jobSearchInput._timer);
    jobSearchInput._timer = setTimeout(() => searchJobs(q), 400);
  });
}

async function searchJobs(query) {
  const results = $("job-search-results");
  if (!results) return;
  results.innerHTML = "<p class='status-text'>Searching...</p>";
  try {
    const data = await apiFetch(`/api/jobs?search=${encodeURIComponent(query)}`);
    const jobs = data.jobs || [];
    if (jobs.length === 0) { results.innerHTML = "<p class='status-text'>No matches found</p>"; return; }
    results.innerHTML = jobs.slice(0, 5).map((j) => `<div class="search-result-item" data-id="${j.id}">${j.title}</div>`).join("");
  } catch { results.innerHTML = "<p class='status-text'>Search failed</p>"; }
}

/* ══════════════════════════════════════════════════════════════════
   SCANNER
   ══════════════════════════════════════════════════════════════════ */

scanCurrentBtn.addEventListener("click", scanCurrentPage);
scanSaveBtn.addEventListener("click", saveSelectedJobs);
scanExportBtn.addEventListener("click", () => {
  const selected = scannedJobs.filter((j) => j._selected);
  if (selected.length === 0) return;
  const text = selected.map((j) => `${j.title} [${j.platform}]${j.budgetAmount ? " " + j.budgetAmount : ""}\n  ${j.url}`).join("\n\n");
  navigator.clipboard.writeText(text).catch(() => {});
  scanSaveStatus.textContent = "📋 Copied to clipboard";
  scanSaveStatus.classList.remove("hidden");
  setTimeout(() => { scanSaveStatus.classList.add("hidden"); }, 2000);
});

scanSaveUrlsBtn.addEventListener("click", saveScanUrls);
scanStartBgBtn.addEventListener("click", startBackgroundScan);
scanBatchBtn.addEventListener("click", startBackgroundScan);
scanScoreToggle.addEventListener("change", () => {
  scanScoreEnabled = scanScoreToggle.checked;
  renderScanList();
  scanRescoreBtn.classList.toggle("hidden", !scanScoreEnabled);
});
scanRescoreBtn.addEventListener("click", async () => {
  if (scannedJobs.length === 0) return;
  scanRescoreBtn.disabled = true;
  scanRescoreBtn.textContent = "Scoring...";
  const scored = await fetchScoresForJobs(scannedJobs);
  if (scored.length > 0) {
    scannedJobs = scored.map((sj, i) => ({ ...(scannedJobs[i] || sj), ...sj, _selected: scannedJobs[i]?._selected !== false, _idx: i }));
    renderScanList();
  }
  scanRescoreBtn.disabled = false;
  scanRescoreBtn.textContent = "💡 Re-score";
});
scanAiBtn.addEventListener("click", () => {
  scanStatus.textContent = "🧠 AI Deep Match coming soon!";
  scanStatus.classList.remove("hidden");
  setTimeout(() => { scanStatus.classList.add("hidden"); }, 2500);
});

async function saveScanUrls() {
  const raw = scanUrlsInput.value.trim();
  const urls = raw ? raw.split("\n").map((u) => u.trim()).filter(Boolean) : [];
  await chrome.storage.local.set({ scanUrls: urls });
  scanUrlsStatus.textContent = `Saved ${urls.length} URL(s)`;
  setTimeout(() => { scanUrlsStatus.textContent = ""; }, 2000);
}

function detectPlatform(url) {
  if (!url) return "";
  if (url.includes("upwork.com")) return "Upwork";
  if (url.includes("onlinejobs.ph")) return "OnlineJobs.ph";
  if (url.includes("facebook.com")) return "Facebook";
  if (url.includes("linkedin.com")) return "LinkedIn";
  return "";
}

function supportedScanSite(url) { return !!detectPlatform(url); }

async function scanCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !supportedScanSite(tab.url)) {
    scanStatus.textContent = "❌ Not on a supported job page (Upwork, OnlineJobs.ph, Facebook, LinkedIn)";
    scanStatus.classList.remove("hidden");
    return;
  }
  scanStatus.textContent = "🔍 Scanning page for job listings...";
  scanStatus.className = "status-text";
  scanStatus.classList.remove("hidden");
  scanCurrentBtn.disabled = true;
  scanResults.classList.add("hidden");
  scanActions.classList.add("hidden");

  try {
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
      const hostname = window.location.hostname, url = window.location.href;
      let platform = "";
      if (hostname.includes("upwork.com")) platform = "Upwork";
      else if (hostname.includes("onlinejobs.ph")) platform = "OnlineJobs.ph";
      else if (hostname.includes("facebook.com")) platform = "Facebook";
      else if (hostname.includes("linkedin.com")) platform = "LinkedIn";
      else platform = hostname;
      const jobs = [];
      if (platform === "Upwork") {
        const cards = document.querySelectorAll('section[data-test="JobCard"], section[class*="job-tile"], div[class*="job-card"], article[class*="job"]');
        cards.forEach((card) => {
          const titleEl = card.querySelector('[data-test="job-title"], .job-title-link, h2 a, h3 a, a[class*="job-title"]');
          const title = titleEl?.textContent?.trim() || ""; if (!title) return;
          const descEl = card.querySelector('[data-test="job-description"], .job-description, .break-word, p[class*="description"]');
          const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";
          const budgetEl = card.querySelector('[data-test="budget"], [data-test="JobBudget"], .job-budget, [class*="budget"]');
          const budgetText = budgetEl?.textContent?.trim() || "";
          let budgetAmount = "", budgetType = "";
          if (budgetText) { const m = budgetText.match(/\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$?[\d,]+(?:\.\d{2})?)?/); if (m) budgetAmount = m[0]; if (/hourly|\/hr/i.test(budgetText)) budgetType = "hourly"; else if (/fixed/i.test(budgetText)) budgetType = "fixed"; }
          const linkEl = titleEl?.closest("a") || card.querySelector("a[href*='/job/']");
          const jobUrl = linkEl?.href ? (linkEl.href.startsWith("http") ? linkEl.href : "https://www.upwork.com" + linkEl.getAttribute("href")) : url;
          const skills = []; card.querySelectorAll('[data-test="skill-tag"], .skill-tag, [class*="skill"]').forEach((el) => { const t = el.textContent?.trim(); if (t) skills.push(t); });
          const postedEl = card.querySelector('[data-test="posted-date"], time, [class*="posted"]');
          const postedDate = postedEl?.textContent?.trim() || "";
          jobs.push({ title, description, budgetAmount, budgetType, url: jobUrl, platform, skills, postedDate, clientName: "" });
        });
      } else if (platform === "OnlineJobs.ph") {
        const items = document.querySelectorAll('.joblist-item, .job-post-item, #joblist > li, div[class*="job-listing"], tr[class*="job"]');
        items.forEach((item) => {
          const titleEl = item.querySelector('.joblist-item-title a, .job-title a, h4 a, h3 a, a[class*="title"], a[href*="/jobseekers/job/"]');
          const title = titleEl?.textContent?.trim() || ""; if (!title) return;
          const descEl = item.querySelector('.joblist-item-description, .job-description, p[class*="desc"]');
          const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";
          const salaryEl = item.querySelector('.joblist-item-salary, .salary, [class*="salary"], [class*="budget"]');
          const budgetAmount = salaryEl?.textContent?.trim() || "";
          const linkHref = titleEl?.getAttribute("href") || "";
          const jobUrl = linkHref.startsWith("http") ? linkHref : "https://www.onlinejobs.ph" + (linkHref.startsWith("/") ? "" : "/") + linkHref;
          const companyEl = item.querySelector('.joblist-item-company, .company, [class*="company"]');
          const clientName = companyEl?.textContent?.trim() || "";
          const postedEl = item.querySelector('.joblist-item-date, .date, time, [class*="posted"]');
          const postedDate = postedEl?.textContent?.trim() || "";
          jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate, clientName });
        });
      } else if (platform === "Facebook") {
        const postSelectors = ['div[data-pagelet] div[role="article"]', 'div[role="article"]', '.userContentWrapper', 'div[class*="post"]'];
        let posts = []; for (const sel of postSelectors) { posts = document.querySelectorAll(sel); if (posts.length > 0) break; }
        const keywords = /\b(looking for|hiring|need a|job|vacancy|open position|freelancer|virtual assistant|va)\b/i;
        posts.forEach((post) => {
          const text = post.textContent || ""; if (!keywords.test(text)) return;
          const title = text.split("\n").find((l) => keywords.test(l))?.trim()?.substring(0, 200) || text.substring(0, 120).trim();
          const description = text.substring(0, 2000).trim();
          const linkEl = post.querySelector('a[href*="/posts/"], a[href*="story"], a[href*="permalink"]');
          const jobUrl = linkEl?.href || url;
          const budgetMatch = text.match(/\$\s*[\d,]+(?:\s*-\s*\$?\s*[\d,]+)?(?:\s*\/\s*hr)?/i);
          const budgetAmount = budgetMatch ? budgetMatch[0] : "";
          jobs.push({ title, description, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate: "", clientName: "" });
        });
      } else if (platform === "LinkedIn") {
        const cards = document.querySelectorAll('.job-card-container, .job-search-card, .job-card, article[class*="job"], li[class*="job"]');
        cards.forEach((card) => {
          const titleEl = card.querySelector('.job-card-list__title, .job-card-container__link, artdeco-entity-lockup__title a, a[class*="job-title"], h3 a, a[class*="job-card"]');
          const title = titleEl?.textContent?.trim() || ""; if (!title) return;
          const companyEl = card.querySelector('.job-card-container__company-name, .job-search-card__subtitle, [class*="company"]');
          const clientName = companyEl?.textContent?.trim() || "";
          const locationEl = card.querySelector('.job-card-container__metadata-item, .job-search-card__location, [class*="location"]');
          const location = locationEl?.textContent?.trim() || "";
          const linkHref = titleEl?.getAttribute("href") || "";
          const jobUrl = linkHref.startsWith("http") ? linkHref : "https://www.linkedin.com" + (linkHref.startsWith("/") ? "" : "/") + linkHref;
          const descEl = card.querySelector('.job-card-container__description, .job-search-card__snippet, [class*="description"], [class*="snippet"]');
          const description = descEl?.textContent?.trim()?.substring(0, 1000) || "";
          const budgetEl = card.querySelector('[class*="salary"], [class*="pay"], [class*="compensation"]');
          const budgetAmount = budgetEl?.textContent?.trim() || "";
          const postedEl = card.querySelector('time, [class*="posted"], [class*="date"]');
          const postedDate = postedEl?.textContent?.trim() || "";
          jobs.push({ title, description: description || location, budgetAmount, budgetType: "", url: jobUrl, platform, skills: [], postedDate, clientName });
        });
      }
      return { platform, count: jobs.length, jobs };
    }});

    const data = results?.[0]?.result;
    if (!data || !data.jobs || data.jobs.length === 0) {
      scanStatus.textContent = "No job listings found on this page. The page structure may have changed. Try manual import.";
      return;
    }
    scanStatus.textContent = `Found ${data.jobs.length} job(s) on ${data.platform}`;
    scanResults.classList.remove("hidden");
    await renderScanResults(data.jobs);
  } catch (err) { scanStatus.textContent = "Scan failed: " + err.message; console.error("Scan error:", err); }
  finally { scanCurrentBtn.disabled = false; }
}

async function fetchScoresForJobs(jobs) {
  if (!jobs || jobs.length === 0) return [];
  try {
    const payload = jobs.map((j) => ({ title: j.title, description: j.description || "", budget: j.budget || j.budgetAmount || "", budget_amount: j.budgetAmount || "", skills: j.skills || [], platform: j.platform || "" }));
    const data = await apiFetch("/api/jobs/score-batch", { method: "POST", body: JSON.stringify({ jobs: payload }) });
    return data.jobs || [];
  } catch { return []; }
}

async function renderScanResults(jobs) {
  scannedJobs = jobs.map((j, i) => ({ ...j, _selected: true, _idx: i }));
  if (scanScoreEnabled && jobs.length > 0) {
    const scored = await fetchScoresForJobs(jobs);
    if (scored.length > 0) scannedJobs = scored.map((sj, i) => ({ ...(scannedJobs[i] || sj), ...sj, _selected: true, _idx: i }));
  }
  renderScanList();
  scanActions.classList.remove("hidden");
  scanSaveBtn.textContent = `Save ${jobs.length} jobs to Sari`;
  scanExportBtn.classList.remove("hidden");
  scanRescoreBtn.classList.toggle("hidden", !scanScoreEnabled);
}

function renderScanList() {
  if (scannedJobs.length === 0) { scanList.innerHTML = "<p class='status-text'>No jobs found</p>"; return; }
  scanList.innerHTML = scannedJobs.map((j, i) => {
    const scoreHtml = scanScoreEnabled && j.score != null ? `<span class="scan-score scan-score-${j.score >= 70 ? "high" : j.score >= 40 ? "med" : "low"}">${j.score}</span>` : "";
    return `<label class="scan-item ${j._selected ? "" : "scan-item-deselected"}"><input type="checkbox" class="scan-checkbox" data-idx="${i}" ${j._selected ? "checked" : ""}>${scoreHtml}<div class="scan-item-body"><span class="scan-item-title">${j.title}</span><span class="scan-item-meta">${j.platform}${j.budgetAmount ? " | " + j.budgetAmount : ""}${j.clientName ? " | " + j.clientName : ""}</span><span class="scan-item-desc">${(j.description || "").substring(0, 150)}${j.match_reason ? " — " + j.match_reason : ""}</span></div></label>`;
  }).join("");
  scanList.querySelectorAll(".scan-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => {
      const idx = parseInt(cb.dataset.idx);
      if (scannedJobs[idx]) {
        scannedJobs[idx]._selected = cb.checked;
        const selected = scannedJobs.filter((j) => j._selected);
        scanSaveBtn.textContent = `Save ${selected.length} job(s) to Sari`;
        cb.closest(".scan-item").classList.toggle("scan-item-deselected", !cb.checked);
      }
    });
  });
}

async function saveSelectedJobs() {
  const selected = scannedJobs.filter((j) => j._selected);
  if (selected.length === 0) { scanSaveStatus.textContent = "No jobs selected"; scanSaveStatus.classList.remove("hidden"); return; }
  scanSaveBtn.disabled = true;
  scanSaveStatus.textContent = `Saving ${selected.length} job(s)...`;
  scanSaveStatus.className = "status-text";
  scanSaveStatus.classList.remove("hidden");
  try {
    const payload = selected.map((j) => ({ title: j.title, description: j.description || "", platform: j.platform || "Unknown", url: j.url || "", budget_type: j.budgetType || null, budget_amount: j.budgetAmount || null, client_name: j.clientName || null, skills: j.skills?.length ? j.skills : null, score: j.score ?? null, match_reason: j.match_reason ?? null }));
    const data = await apiFetch("/api/jobs/bulk", { method: "POST", body: JSON.stringify({ jobs: payload }) });
    scanSaveStatus.textContent = `✅ Saved ${data.count || selected.length} job(s) to Sari!`;
    scanSaveStatus.className = "status-text";
    scanSaveBtn.classList.add("hidden");
    setTimeout(() => { scanSaveStatus.textContent = ""; scanSaveStatus.classList.add("hidden"); }, 4000);
  } catch (err) { scanSaveStatus.textContent = "Save failed: " + err.message; scanSaveBtn.disabled = false; }
}

function initScanner() {
  loadScanUrls();
  scannedJobs = [];
  scanResults.classList.add("hidden");
  scanActions.classList.add("hidden");
  scanProgress.classList.add("hidden");
  scanSaveBtn.classList.remove("hidden");
}

async function loadScanUrls() {
  const result = await chrome.storage.local.get("scanUrls");
  if (result.scanUrls) scanUrlsInput.value = result.scanUrls.join("\n");
}

async function startBackgroundScan() {
  const result = await chrome.storage.local.get("scanUrls");
  let urls = result.scanUrls || [];
  if (urls.length === 0) {
    scanStatus.textContent = "⚠️ No search URLs saved. Add URLs in Scanner Settings.";
    scanStatus.classList.remove("hidden");
    setTimeout(() => { scanStatus.classList.add("hidden"); }, 3000);
    return;
  }
  scanStatus.textContent = "Starting background scan...";
  scanStatus.classList.remove("hidden");
  scanProgress.classList.remove("hidden");
  scanResults.classList.add("hidden");
  scanActions.classList.add("hidden");
  scanInProgress = true;
  scanStartBgBtn.disabled = true;
  scanBatchBtn.disabled = true;
  pollScanProgress();
  try {
    const data = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "startBackgroundScan", urls }, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });
    if (data && data.jobs && data.jobs.length > 0) {
      scanStatus.textContent = `Background scan complete: ${data.jobs.length} job(s) found across ${data.sources} source(s)`;
      scanResults.classList.remove("hidden");
      await renderScanResults(data.jobs);
    } else {
      scanStatus.textContent = "Background scan complete. No jobs found on the scanned pages.";
    }
  } catch (err) { scanStatus.textContent = "Background scan failed: " + err.message; }
  finally { scanProgress.classList.add("hidden"); scanInProgress = false; scanStartBgBtn.disabled = false; scanBatchBtn.disabled = false; }
}

async function pollScanProgress() {
  while (scanInProgress) {
    const result = await chrome.storage.session?.get(["scanProgress"]) || {};
    if (result.scanProgress) {
      const p = result.scanProgress;
      scanProgressFill.style.width = p.total > 0 ? `${(p.current / p.total) * 100}%` : "0%";
      scanProgressText.textContent = `Scanning ${p.current}/${p.total}: ${p.currentUrl || ""}`;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

/* ══════════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  render();
});

// Refresh credits when popup regains focus
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && sariToken) fetchCreditBalance();
});
