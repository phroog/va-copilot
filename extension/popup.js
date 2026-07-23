const SARI_API = "https://va-copilot-theta.vercel.app";

let sariToken = null;
let currentJob = null;
let timerInterval = null;
let runningEntryId = null;
let notesTimeout = null;

/* ── DOM refs ─────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const loginView = $("login-view");
const mainView = $("main-view");
const connectBtn = $("connect-btn");
const disconnectBtn = $("disconnect-btn");
const connectStatus = $("connect-status");

const jobTitle = $("job-title");
const jobPlatform = $("job-platform");
const jobDesc = $("job-desc");
const extractBtn = $("extract-btn");
const generateBtn = $("generate-btn");
const pitchLoading = $("pitch-loading");
const pitchResult = $("pitch-result");
const pitchText = $("pitch-text");
const pitchStatus = $("pitch-status");
const copyBtn = $("copy-btn");
const polishBtn = $("polish-btn");

const timerDisplay = $("timer-display");
const timerBtn = $("timer-btn");
const timerStatus = $("timer-status");

const notesTextarea = $("notes-textarea");
const notesStatus = $("notes-status");

const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

/* ── Helpers ──────────────────────────────────────────────────── */
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

/* ── State ────────────────────────────────────────────────────── */
async function loadState() {
  const result = await chrome.storage.local.get(["sariToken", "currentJob"]);
  sariToken = result.sariToken || null;
  currentJob = result.currentJob || null;
}

async function clearToken() {
  sariToken = null;
  await chrome.storage.local.remove("sariToken");
}

/* ── Render ───────────────────────────────────────────────────── */
function render() {
  if (sariToken) {
    loginView.classList.add("hidden");
    mainView.classList.remove("hidden");
    renderJobInfo();
  } else {
    loginView.classList.remove("hidden");
    mainView.classList.add("hidden");
  }
}

function renderJobInfo() {
  if (currentJob && currentJob.title) {
    jobTitle.textContent = currentJob.title;
    jobPlatform.textContent = currentJob.platform || "";
    jobDesc.textContent = currentJob.description
      ? currentJob.description.substring(0, 200) +
        (currentJob.description.length > 200 ? "..." : "")
      : "";
  } else {
    jobTitle.textContent = "No job detected";
    jobPlatform.textContent = "";
    jobDesc.textContent =
      'Navigate to a supported job page, then click "Re-extract from page".';
  }
}

/* ── Tab switching ────────────────────────────────────────────── */
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    tabContents.forEach((tc) => tc.classList.add("hidden"));
    const target = $("tab-" + tab.dataset.tab);
    if (target) target.classList.remove("hidden");
    if (tab.dataset.tab === "time") initTimer();
    if (tab.dataset.tab === "notes") loadNotes();
  });
});

/* ── Connect / Disconnect ─────────────────────────────────────── */
connectBtn.addEventListener("click", connectToSari);
disconnectBtn.addEventListener("click", async () => {
  await clearToken();
  render();
});

async function connectToSari() {
  connectBtn.disabled = true;
  connectBtn.textContent = "Opening Sari...";
  if (connectStatus) connectStatus.classList.remove("hidden");

  await chrome.tabs.create({ url: SARI_API + "/extension-auth" });

  setConnectStatus(
    "Waiting for you to log in and authorize the extension..."
  );

  try {
    const token = await pollForToken(30_000);
    sariToken = token;
    render();
    setConnectStatus("Connected!");
  } catch (err) {
    setConnectStatus("Timed out. Please try again.");
    alert("Authentication failed: " + err.message);
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect to Sari";
  }
}

function setConnectStatus(msg) {
  if (connectStatus) connectStatus.textContent = msg;
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

/* ── Extract job from active tab ──────────────────────────────── */
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
        const hostname = location.hostname;
        let platform = "";
        if (hostname.includes("upwork.com")) platform = "Upwork";
        else if (hostname.includes("onlinejobs.ph")) platform = "OnlineJobs.ph";
        else platform = hostname;

        const titleSel = [
          "h1",
          '[itemprop="title"]',
          ".job-title",
          '[data-test="job-title"]',
          '[data-qa="job-title"]',
          ".job-details-title",
          ".t-title",
          "h2",
        ];
        let title = "";
        for (const s of titleSel) {
          const el = document.querySelector(s);
          if (el && el.textContent.trim()) {
            title = el.textContent.trim();
            break;
          }
        }
        if (!title) title = document.title || "";

        const descSel = [
          '[itemprop="description"]',
          ".job-description",
          ".description",
          '[data-qa="job-description"]',
          ".job-details-description",
          "article",
        ];
        let desc = "";
        for (const s of descSel) {
          const el = document.querySelector(s);
          if (el && el.textContent.trim()) {
            desc = el.textContent.trim();
            break;
          }
        }
        if (!desc) desc = document.body?.textContent?.trim() || "";
        desc = desc.substring(0, 1000);

        return { title, description: desc, platform };
      },
    });

    const data = results?.[0]?.result;
    if (data && data.title) {
      currentJob = data;
      await chrome.storage.local.set({ currentJob: data });
      renderJobInfo();
    }
  } catch (err) {
    console.error("Extract error:", err);
  }
}

function supportedSite(url) {
  if (!url) return false;
  return url.includes("upwork.com") || url.includes("onlinejobs.ph");
}

/* ── Generate Pitch ───────────────────────────────────────────── */
generateBtn.addEventListener("click", async () => {
  if (!currentJob || !currentJob.title) {
    alert("No job data available. Extract a job first.");
    return;
  }

  pitchLoading.classList.remove("hidden");
  pitchResult.classList.add("hidden");
  pitchStatus.classList.add("hidden");
  generateBtn.disabled = true;

  try {
    const pitch = await generatePitch(
      currentJob.title,
      currentJob.description,
      currentJob.platform
    );
    pitchText.textContent = pitch;
    pitchResult.classList.remove("hidden");
  } catch (err) {
    pitchStatus.textContent = "Failed: " + err.message;
    pitchStatus.classList.remove("hidden");
  } finally {
    pitchLoading.classList.add("hidden");
    generateBtn.disabled = false;
  }
});

async function generatePitch(title, description, platform) {
  const { job } = await apiFetch("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      title,
      description: description || "",
      platform: platform || "Unknown",
      status: "draft",
    }),
  });

  const data = await apiFetch("/api/generate-pitch", {
    method: "POST",
    body: JSON.stringify({ jobId: job.id }),
  });

  return data.pitch || JSON.stringify(data);
}

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(pitchText.textContent).catch(() => {});
});

polishBtn.addEventListener("click", async () => {
  const text = pitchText.textContent;
  if (!text) return;
  polishBtn.disabled = true;

  try {
    const data = await apiFetch("/api/polish-text", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    pitchText.textContent = data.polished || JSON.stringify(data);
  } catch (err) {
    alert("Polish failed: " + err.message);
  } finally {
    polishBtn.disabled = false;
  }
});

/* ── Timer ────────────────────────────────────────────────────── */
async function initTimer() {
  try {
    const data = await apiFetch("/api/time-entries");
    if (data.running) {
      runningEntryId = data.running.id;
      timerBtn.textContent = "Stop Timer";
      startTimerDisplay(data.running.start_time);
      timerStatus.textContent = "";
    } else {
      runningEntryId = null;
      timerBtn.textContent = "Start Timer";
      stopTimerDisplay();
      timerDisplay.textContent = "00:00:00";
      timerStatus.textContent = "";
    }
  } catch (err) {
    timerStatus.textContent = "Could not load timer";
  }
}

timerBtn.addEventListener("click", async () => {
  if (timerBtn.textContent === "Start Timer") {
    await startTimer();
  } else {
    await stopTimer();
  }
});

async function startTimer() {
  const startTime = new Date().toISOString();
  timerBtn.disabled = true;
  try {
    const data = await apiFetch("/api/time-entries", {
      method: "POST",
      body: JSON.stringify({ start_time: startTime }),
    });
    runningEntryId = data.entry.id;
    timerBtn.textContent = "Stop Timer";
    startTimerDisplay(startTime);
    timerStatus.textContent = "";
  } catch (err) {
    timerStatus.textContent = "Failed to start: " + err.message;
  } finally {
    timerBtn.disabled = false;
  }
}

async function stopTimer() {
  if (!runningEntryId) return;
  const endTime = new Date().toISOString();
  timerBtn.disabled = true;
  try {
    await apiFetch(`/api/time-entries/${runningEntryId}`, {
      method: "PUT",
      body: JSON.stringify({ end_time: endTime }),
    });
    runningEntryId = null;
    timerBtn.textContent = "Start Timer";
    stopTimerDisplay();
    timerDisplay.textContent = "00:00:00";
    timerStatus.textContent = "";
  } catch (err) {
    timerStatus.textContent = "Failed to stop: " + err.message;
  } finally {
    timerBtn.disabled = false;
  }
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
    timerDisplay.textContent =
      String(hrs).padStart(2, "0") +
      ":" +
      String(mins).padStart(2, "0") +
      ":" +
      String(secs).padStart(2, "0");
  }, 1000);
}

function stopTimerDisplay() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/* ── Notes ────────────────────────────────────────────────────── */
async function loadNotes() {
  try {
    const data = await apiFetch("/api/notes");
    notesTextarea.value = data.notes || "";
    notesStatus.textContent = "Auto-saves on change";
  } catch (err) {
    notesStatus.textContent = "Could not load notes";
  }
}

notesTextarea.addEventListener("input", () => {
  notesStatus.textContent = "Unsaved changes...";
  if (notesTimeout) clearTimeout(notesTimeout);
  notesTimeout = setTimeout(saveNotes, 1000);
});

async function saveNotes() {
  const text = notesTextarea.value;
  notesStatus.textContent = "Saving...";
  try {
    await apiFetch("/api/notes", {
      method: "PUT",
      body: JSON.stringify({ notes: text }),
    });
    notesStatus.textContent = "Saved";
  } catch {
    notesStatus.textContent = "Save failed";
  }
}

/* ── Init ─────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  render();
});
