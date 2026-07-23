const SARI_API = "https://va-copilot-theta.vercel.app";

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

/* ── DOM refs ─────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const loginView = $("login-view");
const mainView = $("main-view");
const connectBtn = $("connect-btn");
const disconnectBtn = $("disconnect-btn");
const connectStatus = $("connect-status");

const creditBar = $("credit-bar");
const creditBalance = $("credit-balance");

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

const notesTextarea = $("notes-textarea");
const notesStatus = $("notes-status");

const darkToggle = $("dark-toggle");
const jobSearchInput = $("job-search-input");
const jobSearchResults = $("job-search-results");
const followUpsContent = $("follow-ups-content");
const pomodoroDisplay = $("pomodoro-display");
const pomodoroBtn = $("pomodoro-btn");
const pomodoroStatus = $("pomodoro-status");

const vaultLocked = $("vault-locked");
const vaultUnlocked = $("vault-unlocked");
const vaultPassword = $("vault-password");
const vaultUnlockBtn = $("vault-unlock-btn");
const vaultStatus = $("vault-status");
const vaultLockBtn = $("vault-lock-btn");
const vaultItemsEl = $("vault-items");
const vaultAddBtn = $("vault-add-btn");
const vaultAddForm = $("vault-add-form");
const vaultNewTitle = $("vault-new-title");
const vaultNewUsername = $("vault-new-username");
const vaultNewUrl = $("vault-new-url");
const vaultNewPassword = $("vault-new-password");
const vaultSaveItemBtn = $("vault-save-item-btn");

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
    "savedJobId",
  ]);
  sariToken = result.sariToken || null;
  currentJob = result.currentJob || null;
  savedJobId = result.savedJobId || null;
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
    fetchCreditBalance();
  } else {
    loginView.classList.remove("hidden");
    mainView.classList.add("hidden");
  }
}

async function fetchCreditBalance() {
  try {
    const data = await apiFetch("/api/ai/credits");
    creditBalance.textContent = data.balance ?? 0;
    creditBar.classList.remove("hidden");
  } catch {
    creditBar.classList.add("hidden");
  }
}

function renderJobInfo() {
  if (currentJob && currentJob.title) {
    jobTitle.textContent = currentJob.title;
    jobPlatform.textContent = currentJob.platform || "";

    if (currentJob.descriptionFull) {
      currentJob.description = currentJob.descriptionFull;
    }

    // Enriched fields
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
      ? currentJob.description.substring(0, 200) +
        (currentJob.description.length > 200 ? "..." : "")
      : "";

    // Show save button if not already saved
    if (savedJobId) {
      saveJobBtn.classList.add("hidden");
    } else {
      saveJobBtn.classList.remove("hidden");
    }
  } else {
    jobTitle.textContent = "No job detected";
    jobPlatform.textContent = "";
    jobEnriched.classList.add("hidden");
    jobDesc.textContent =
      'Navigate to a supported job page, then click "Re-extract from page".';
    saveJobBtn.classList.add("hidden");
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
    if (tab.dataset.tab === "vault") initVault();
    if (tab.dataset.tab === "tools") initTools();
  });
});

/* ── Vault ─────────────────────────────────────────────────────── */
function vaultDeriveKey(password, salt) {
  let enc = new TextEncoder();
  let data = enc.encode(password + salt);
  for (let i = 0; i < 1000; i++) {
    let hash = nacl.hash(data);
    data = hash.slice(0, 32);
  }
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
  if (vaultKey) {
    vaultLocked.classList.add("hidden");
    vaultUnlocked.classList.remove("hidden");
    loadVaultItems();
    return;
  }

  // Check if vault is set up
  try {
    const data = await apiFetch("/api/vault/setup");
    if (data.salt && data.keyCheck) {
      vaultLocked.classList.remove("hidden");
      vaultUnlocked.classList.add("hidden");
      vaultStatus.textContent = "";
    } else {
      vaultLocked.classList.remove("hidden");
      vaultUnlocked.classList.add("hidden");
      vaultStatus.textContent = "Vault not set up. Go to Sari Dashboard to initialize.";
    }
  } catch {
    vaultStatus.textContent = "Could not check vault status";
  }
}

async function unlockVault() {
  const password = vaultPassword.value;
  if (!password) { vaultStatus.textContent = "Enter your master password"; return; }

  vaultUnlockBtn.disabled = true;
  vaultStatus.textContent = "Unlocking...";

  try {
    const setup = await apiFetch("/api/vault/setup");
    if (!setup.salt || !setup.keyCheck) {
      vaultStatus.textContent = "Vault not set up yet. Use the Sari Dashboard.";
      vaultUnlockBtn.disabled = false;
      return;
    }

    const key = vaultDeriveKey(password, setup.salt);
    const [nonceB64, cipherB64] = setup.keyCheck.split(":");
    const nonce = nacl_util.decodeBase64(nonceB64);
    const cipher = nacl_util.decodeBase64(cipherB64);
    const decrypted = nacl.secretbox.open(cipher, nonce, key);

    if (decrypted) {
      vaultKey = key;
      vaultLocked.classList.add("hidden");
      vaultUnlocked.classList.remove("hidden");
      vaultPassword.value = "";
      vaultStatus.textContent = "";
      loadVaultItems();
    } else {
      vaultStatus.textContent = "Wrong password";
    }
  } catch (err) {
    vaultStatus.textContent = "Unlock failed: " + err.message;
  } finally {
    vaultUnlockBtn.disabled = false;
  }
}

function lockVault() {
  vaultKey = null;
  vaultLocked.classList.remove("hidden");
  vaultUnlocked.classList.add("hidden");
  vaultItems = [];
}

async function loadVaultItems() {
  try {
    const data = await apiFetch("/api/vault");
    vaultItems = data.items || [];
    renderVaultItems();
  } catch (err) {
    vaultItemsEl.innerHTML = "<p class='status-text'>Failed to load vault items</p>";
  }
}

function renderVaultItems() {
  if (vaultItems.length === 0) {
    vaultItemsEl.innerHTML = "<p class='status-text'>No vault items yet</p>";
    return;
  }

  vaultItemsEl.innerHTML = vaultItems.map((item, idx) => {
    let uname = "";
    try { uname = item.username ? vaultDecrypt(vaultKey, item.username) : ""; } catch {}
    return `<div class="vault-item">
      <span class="vault-item-title">${item.title}</span>
      <span class="vault-item-uname">${uname}</span>
      <div class="vault-item-actions">
        <button class="vault-reveal-btn" data-idx="${idx}">👁️</button>
        <button class="vault-copy-btn" data-idx="${idx}">📋</button>
        <button class="vault-del-btn" data-idx="${idx}">🗑️</button>
      </div>
    </div>`;
  }).join("");

  vaultItemsEl.querySelectorAll(".vault-reveal-btn").forEach((btn) => {
    btn.addEventListener("click", () => revealVaultItem(parseInt(btn.dataset.idx)));
  });
  vaultItemsEl.querySelectorAll(".vault-copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => copyVaultItem(parseInt(btn.dataset.idx)));
  });
  vaultItemsEl.querySelectorAll(".vault-del-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteVaultItem(parseInt(btn.dataset.idx)));
  });
}

function revealVaultItem(idx) {
  const item = vaultItems[idx];
  if (!item) return;
  try {
    const pwd = vaultDecrypt(vaultKey, item.encrypted_password);
    alert("Password: " + pwd);
  } catch {
    alert("Could not decrypt password");
  }
}

function copyVaultItem(idx) {
  const item = vaultItems[idx];
  if (!item) return;
  try {
    const pwd = vaultDecrypt(vaultKey, item.encrypted_password);
    navigator.clipboard.writeText(pwd).catch(() => {});
  } catch {}
}

async function deleteVaultItem(idx) {
  const item = vaultItems[idx];
  if (!item || !confirm(`Delete "${item.title}"?`)) return;
  try {
    await apiFetch(`/api/vault/${item.id}`, { method: "DELETE" });
    vaultItems.splice(idx, 1);
    renderVaultItems();
  } catch {}
}

vaultUnlockBtn.addEventListener("click", unlockVault);
vaultPassword.addEventListener("keydown", (e) => { if (e.key === "Enter") unlockVault(); });
vaultLockBtn.addEventListener("click", lockVault);
vaultAddBtn.addEventListener("click", () => {
  vaultAddForm.classList.toggle("hidden");
});
vaultSaveItemBtn.addEventListener("click", async () => {
  const title = vaultNewTitle.value.trim();
  const username = vaultNewUsername.value.trim();
  const url = vaultNewUrl.value.trim();
  const password = vaultNewPassword.value.trim();
  if (!title || !password) { vaultStatus.textContent = "Title and password required"; return; }

  vaultSaveItemBtn.disabled = true;
  try {
    const encPwd = vaultEncrypt(vaultKey, password);
    const encUname = username ? vaultEncrypt(vaultKey, username) : "";
    const payload = { title, encrypted_password: encPwd, username: encUname, url, notes: "" };
    const data = await apiFetch("/api/vault", { method: "POST", body: JSON.stringify(payload) });
    if (data.item) {
      vaultItems.unshift(data.item);
      renderVaultItems();
      vaultNewTitle.value = "";
      vaultNewUsername.value = "";
      vaultNewUrl.value = "";
      vaultNewPassword.value = "";
      vaultAddForm.classList.add("hidden");
    }
  } catch (err) {
    vaultStatus.textContent = "Save failed: " + err.message;
  } finally {
    vaultSaveItemBtn.disabled = false;
  }
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
  setConnectStatus("Waiting for you to log in and authorize the extension...");

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

/* ── Extract job from active tab (enriched) ───────────────────── */
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
          for (const s of sel) {
            const el = document.querySelector(s);
            if (el && el.textContent.trim()) return el.textContent.trim();
          }
          return "";
        }
        const hostname = location.hostname;
        let platform = "";
        if (hostname.includes("upwork.com")) platform = "Upwork";
        else if (hostname.includes("onlinejobs.ph")) platform = "OnlineJobs.ph";
        else platform = hostname;

        const title = g([
          "h1", '[itemprop="title"]', ".job-title",
          '[data-test="job-title"]', '[data-qa="job-title"]',
          ".job-details-title", ".t-title", "h2",
        ]) || document.title || "";

        const descSelectors = [
          '[itemprop="description"]', ".job-description", ".description",
          '[data-qa="job-description"]', ".job-details-description",
          '[data-test="job-description"]', ".break-word", ".TextualDisplay",
          "article", '[data-test="JobDescription"]', ".job-description-text",
        ];
        const description = (g(descSelectors) || document.body?.textContent?.trim() || "").substring(0, 5000);
        const descriptionFull = (g(descSelectors) || "").substring(0, 10000);

        const pageText = document.body?.textContent || "";
        let budgetType = "";
        let budgetAmount = "";
        const budgetEl = g([
          '[data-test="budget"]', '[data-qa="budget"]', ".budget",
          ".job-budget", '[data-test="JobBudget"]',
        ]);
        if (budgetEl) {
          const lower = budgetEl.toLowerCase();
          if (lower.includes("hourly") || lower.includes("/hr")) budgetType = "hourly";
          else if (lower.includes("fixed")) budgetType = "fixed";
          const m = budgetEl.match(/\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$?[\d,]+(?:\.\d{2})?)?/);
          if (m) budgetAmount = m[0];
        }
        if (!budgetType) {
          if (/hourly|\/hr/i.test(pageText)) budgetType = "hourly";
          else if (/fixed|fixed.price/i.test(pageText)) budgetType = "fixed";
        }
        if (!budgetAmount) {
          const m = pageText.match(/\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$?[\d,]+(?:\.\d{2})?)?(?:\s*\/hr)?/i);
          if (m) budgetAmount = m[0];
        }

        const clientName = g([
          '[data-test="client-name"]', '[data-qa="client-name"]',
          ".client-name", '[data-test="ClientName"]',
          ".freelancer-name", ".buyer-name",
        ]);
        const clientCountry = g([
          '[data-test="client-country"]', '[data-qa="client-country"]',
          ".client-country", ".location", '[data-test="ClientLocation"]',
        ]);
        let clientRating = "";
        const r = g([
          '[data-test="client-rating"]', '[data-qa="client-rating"]',
          ".client-rating", ".rating",
        ]);
        if (r) { const rm = r.match(/[\d.]+/); if (rm) clientRating = rm[0]; }
        const clientTotalSpent = g([
          '[data-test="total-spent"]', '[data-qa="total-spent"]',
          ".total-spent", ".client-spent",
        ]);
        const skillEls = document.querySelectorAll(
          '[data-test="skill-tag"], [data-qa="skill"], .skill-tag, .skills span, [data-test="JobSkills"] span, .token'
        );
        const skills = Array.from(skillEls).map((el) => el.textContent?.trim()).filter(Boolean).slice(0, 15);

        const postedDate = g([
          '[data-test="posted-date"]', '[data-qa="posted-date"]',
          ".posted-date", '[data-test="JobPosted"]', ".job-posted",
          '[data-test="date-posted"]', "time",
        ]);

        return {
          title, description, descriptionFull, platform,
          budgetType, budgetAmount,
          clientName, clientCountry, clientRating, clientTotalSpent,
          skills, postedDate, url: location.href,
        };
      },
    });

    const data = results?.[0]?.result;
    if (data && data.title) {
      currentJob = data;
      savedJobId = null;
      await chrome.storage.local.set({ currentJob: data, savedJobId: null });
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

/* ── Save Job to Sari ─────────────────────────────────────────── */
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

    const { job } = await apiFetch("/api/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    savedJobId = job.id;
    await chrome.storage.local.set({ savedJobId: job.id });
    saveStatus.textContent = "Job saved! ✅";
    saveJobBtn.classList.add("hidden");

    // After saving, auto-generate pitch
    await doGeneratePitch(job.id);
  } catch (err) {
    saveStatus.textContent = "Save failed: " + err.message;
  } finally {
    saveJobBtn.disabled = false;
  }
});

/* ── Generate Pitch ────────────────────────────────────────────── */
generateBtn.addEventListener("click", async () => {
  if (!currentJob || !currentJob.title) {
    alert("No job data available. Extract a job first.");
    return;
  }

  pitchLoading.classList.remove("hidden");
  pitchResult.classList.add("hidden");
  pitchStatus.classList.add("hidden");
  retryBtn.classList.add("hidden");
  generateBtn.disabled = true;

  try {
    // Save job first if not already saved
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
    const data = await apiFetch("/api/generate-pitch", {
      method: "POST",
      body: JSON.stringify({ jobId }),
    });
    pitchText.textContent = data.pitch || JSON.stringify(data);
    pitchResult.classList.remove("hidden");
  } catch (err) {
    pitchStatus.textContent = "AI failed: " + err.message;
    pitchStatus.classList.remove("hidden");
    retryBtn.classList.remove("hidden");
  } finally {
    pitchLoading.classList.add("hidden");
  }
}

retryBtn.addEventListener("click", () => {
  if (savedJobId) {
    doGeneratePitch(savedJobId);
  }
});

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
      .map((j) =>
        `<div class="search-result-item" data-id="${j.id}">${j.title}</div>`
      )
      .join("");
  } catch {
    jobSearchResults.innerHTML = "<p class='status-text'>Search failed</p>";
  }
}

async function loadFollowUps() {
  try {
    const data = await apiFetch("/api/follow-ups");
    const items = data.followUps || [];
    const pending = items.filter((f) => f.status === "pending");

    if (pending.length === 0) {
      followUpsContent.innerHTML = "<p class='status-text'>No pending follow-ups ✨</p>";
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
    followUpsContent.innerHTML = "<p class='status-text'>Could not load follow-ups</p>";
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
