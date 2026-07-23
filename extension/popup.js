const SARI_API = "https://va-copilot-theta.vercel.app";

let sariToken = null;
let currentJob = null;
let timerInterval = null;
let runningEntryId = null;
let notesTimeout = null;
let pomodoroInterval = null;
let pomodoroRemaining = 0;
let pomodoroRunning = false;

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

const darkToggle = $("dark-toggle");
const jobSearchInput = $("job-search-input");
const jobSearchResults = $("job-search-results");
const followUpsContent = $("follow-ups-content");
const pomodoroDisplay = $("pomodoro-display");
const pomodoroBtn = $("pomodoro-btn");
const pomodoroStatus = $("pomodoro-status");

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
  const result = await chrome.storage.local.get([
    "sariToken",
    "currentJob",
    "sariDarkMode",
  ]);
  sariToken = result.sariToken || null;
  currentJob = result.currentJob || null;
  if (result.sariDarkMode) {
    document.body.classList.add("dark");
    darkToggle.textContent = "☀️";
  }
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
    if (tab.dataset.tab === "tools") initTools();
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

/* ── Dark mode toggle ─────────────────────────────────────────── */
darkToggle.addEventListener("click", async () => {
  const isDark = document.body.classList.toggle("dark");
  darkToggle.textContent = isDark ? "☀️" : "🌙";
  await chrome.storage.local.set({ sariDarkMode: isDark });
});

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
          "h1", '[itemprop="title"]', ".job-title",
          '[data-test="job-title"]', '[data-qa="job-title"]',
          ".job-details-title", ".t-title", "h2",
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
          '[itemprop="description"]', ".job-description", ".description",
          '[data-qa="job-description"]', ".job-details-description", "article",
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

/* ── Generate Pitch ────────────────────────────────────────────── */
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

/* ── Time Tracking (PATCH-based) ───────────────────────────────── */
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
      body: JSON.stringify({
        description: "Extension timer",
        start_time: startTime,
        project_name: "Browser work",
      }),
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
      method: "PATCH",
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
      String(hrs).padStart(2, "0") + ":" +
      String(mins).padStart(2, "0") + ":" +
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

/* ── Tools Tab ────────────────────────────────────────────────── */
function initTools() {
  loadFollowUps();
}

/* Job search */
jobSearchInput.addEventListener("input", () => {
  const q = jobSearchInput.value.trim();
  if (q.length < 2) {
    jobSearchResults.innerHTML = "";
    return;
  }
  clearTimeout(jobSearchInput._timer);
  jobSearchInput._timer = setTimeout(() => searchJobs(q), 400);
});

async function searchJobs(query) {
  jobSearchResults.innerHTML = "<p class='status-text'>Searching...</p>";
  try {
    const data = await apiFetch(`/api/jobs?search=${encodeURIComponent(query)}`);
    const jobs = data.jobs || [];
    if (jobs.length === 0) {
      jobSearchResults.innerHTML = "<p class='status-text'>No matches found</p>";
      return;
    }
    jobSearchResults.innerHTML = jobs
      .slice(0, 5)
      .map(
        (j) =>
          `<div class="search-result-item" data-id="${j.id}">${j.title}</div>`
      )
      .join("");
  } catch {
    jobSearchResults.innerHTML = "<p class='status-text'>Search failed</p>";
  }
}

/* Follow-ups */
async function loadFollowUps() {
  try {
    const data = await apiFetch("/api/follow-ups");
    const items = data.followUps || [];
    const pending = items.filter((f) => f.status === "pending");

    if (pending.length === 0) {
      followUpsContent.innerHTML =
        "<p class='status-text'>No pending follow-ups ✨</p>";
      return;
    }

    followUpsContent.innerHTML = pending
      .slice(0, 5)
      .map(
        (f) =>
          `<div class="follow-up-item" data-id="${f.id}">
            <span class="follow-up-title">${f.jobs?.title || "Job"}</span>
            <span class="follow-up-due">${f.due_date}</span>
            <button class="follow-up-done-btn" data-id="${f.id}">Done</button>
          </div>`
      )
      .join("");

    followUpsContent.querySelectorAll(".follow-up-done-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await apiFetch("/api/follow-ups", {
            method: "PATCH",
            body: JSON.stringify({ id: btn.dataset.id, status: "completed" }),
          });
          loadFollowUps();
        } catch (err) {
          alert("Failed to update: " + err.message);
        }
      });
    });
  } catch {
    followUpsContent.innerHTML =
      "<p class='status-text'>Could not load follow-ups</p>";
  }
}

/* Pomodoro */
pomodoroBtn.addEventListener("click", () => {
  if (!pomodoroRunning) {
    startPomodoro();
  } else {
    stopPomodoro();
  }
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
    pomodoroDisplay.textContent =
      String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");

    if (pomodoroRemaining <= 0) {
      stopPomodoro();
      pomodoroStatus.textContent = "Time's up! 🎉";
      if (Notification.permission === "granted") {
        new Notification("Sari Pomodoro", { body: "Pomodoro complete! Take a break." });
      }
    }
  }, 1000);
}

function stopPomodoro() {
  pomodoroRunning = false;
  pomodoroRemaining = 0;
  pomodoroBtn.textContent = "Start Pomodoro";
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
  }
  pomodoroDisplay.textContent = "25:00";
}

/* ── Init ─────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  render();
});
