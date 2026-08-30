const $ = (id) => document.getElementById(id);

const KEYS = ["upwork", "onlinejobs", "guru", "freelancer", "workingnomads", "remoteok", "jobspresso", "peopleperhour", "indeed", "hubstaff", "reddit", "facebook"];

// Grouping shown in the popup (verified vs best-effort).
const GROUPS = [
  { label: "Verified", keys: ["upwork", "onlinejobs", "guru", "freelancer", "reddit", "hubstaff", "facebook"] },
  { label: "Best-effort", keys: ["workingnomads", "remoteok", "jobspresso", "peopleperhour", "indeed"] },
];

function sendMsg(msg, timeoutMs = 60000) {
  return Promise.race([
    chrome.runtime.sendMessage(msg),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout – background not responding (try reloading the extension?)")), timeoutMs)),
  ]);
}

function buildRows(platforms) {
  const wrap = $("platforms");
  wrap.innerHTML = "";
  for (const group of GROUPS) {
    const label = document.createElement("div");
    label.className = "pgroup";
    label.textContent = group.label;
    wrap.appendChild(label);
    for (const k of group.keys) {
      const p = (platforms || {})[k];
      if (!p) continue;
      const row = document.createElement("div");
      row.className = "prow";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "switch";
      cb.checked = p.enabled !== false;
      cb.dataset.key = k;
      const lbl = document.createElement("span");
      lbl.className = "pname";
      lbl.textContent = p.name;
      row.appendChild(cb);
      row.appendChild(lbl);
      if (k === "upwork") {
        const id = document.createElement("span");
        id.className = "pid";
        id.textContent = p.sourceId ? "✓ source ID" : "no source ID";
        row.appendChild(id);
      } else {
        const u = document.createElement("input");
        u.type = "text";
        u.value = p.url || "";
        u.dataset.urlKey = k;
        u.className = "purl";
        u.placeholder = "Jobs URL";
        row.appendChild(u);
      }
      wrap.appendChild(row);
    }
  }
}

function collectPlatforms() {
  const platforms = {};
  document.querySelectorAll(".prow").forEach((row) => {
    const cb = row.querySelector('input[type="checkbox"]');
    const u = row.querySelector("input.purl");
    if (!cb) return;
    const key = cb.dataset.key;
    platforms[key] = {
      enabled: cb.checked,
      url: u ? u.value.trim() : "",
    };
  });
  return platforms;
}

const PILL = {
  ok: '<span class="pill ok">ok</span>',
  err: '<span class="pill err">error</span>',
  warn: '<span class="pill warn">⚠</span>',
};

function renderStatus(s) {
  const el = $("status");
  if (!s || !s.platforms) {
    el.innerHTML = s && s.error ? `<b>Error:</b> ${escapeHtml(s.error)}` : "No poll yet. Press <b>Save &amp; Poll</b>.";
    el.className = s && s.error ? "err" : "";
    return;
  }
  const when = s.ts ? new Date(s.ts).toLocaleTimeString() : "–";
  const keys = Object.keys(s.platforms);
  let html = `<b>Last poll:</b> ${when}<br>`;
  if (!keys.length) html += (s.note || "no platform enabled");
  for (const k of keys) {
    const r = s.platforms[k];
    const name = (k[0].toUpperCase() + k.slice(1)).replace("onlinejobs", "OnlineJobs.ph").replace("peopleperhour", "PeoplePerHour");
    if (r.ok) {
      html += `${PILL.ok} <b>${name}</b>: ${r.got} loaded · ${r.fresh} new · ${r.inserted} inserted (${r.mode})`;
      if (r.duplicates > 0) html += ` · ${r.duplicates} duplicates`;
      if (r.filtered > 0) html += ` · ${r.filtered} filtered (not VA/WFH)`;
      if (r.warning) html += ` ${PILL.warn} ${escapeHtml(r.warning)}`;
    } else {
      html += `${PILL.err} <b>${name}</b>: ${escapeHtml(r.error || "failed")}`;
    }
    html += "<br>";
  }
  el.innerHTML = html;
  el.className = s.ok ? "ok" : "err";
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function load() {
  try {
    const { cfg, status } = await sendMsg({ type: "GET_STATE" });
    $("enabled").checked = cfg.enabled;
    $("apiUrl").value = cfg.apiUrl;
    $("adminSecret").value = cfg.adminSecret;
    $("intervalMin").value = cfg.intervalMin;
    $("count").value = cfg.count;
    buildRows(cfg.platforms);
    renderStatus(status);
    const len = cfg.adminSecret ? cfg.adminSecret.length : 0;
    const secretNote = len === 0 ? "Admin secret not set (type it below)" : `Admin secret saved (length ${len})`;
    $("status").innerHTML += `<div class="meta">${secretNote}</div>`;
  } catch (err) {
    $("status").textContent = "Error: " + err.message;
    $("status").className = "err";
  }
}

// Persist config fields immediately while typing — nothing is lost even if the
// popup closes before "Save & Poll" is clicked.
["adminSecret", "apiUrl", "intervalMin", "count"].forEach((id) => {
  const el = $(id);
  if (!el) return;
  el.addEventListener("input", () => {
    const patch = {};
    if (id === "adminSecret") patch.adminSecret = el.value.trim();
    else if (id === "apiUrl") patch.apiUrl = el.value.trim();
    else if (id === "intervalMin") patch.intervalMin = parseFloat(el.value) || 5;
    else if (id === "count") patch.count = parseInt(el.value, 10) || 50;
    chrome.storage.local.set(patch);
  });
});

$("save").addEventListener("click", async () => {
  $("status").textContent = "Saving & polling…";
  $("status").className = "";
  const cfg = {
    enabled: $("enabled").checked,
    apiUrl: $("apiUrl").value.trim(),
    adminSecret: $("adminSecret").value.trim(),
    intervalMin: parseFloat($("intervalMin").value) || 5,
    count: parseInt($("count").value, 10) || 50,
    platforms: collectPlatforms(),
  };
  try {
    const res = await sendMsg({ type: "SAVE_CONFIG", cfg });
    if (res && res.ok) {
      renderStatus(res.status);
      $("status").innerHTML += `<div class="meta">Secret saved (length ${res.savedSecretLen})</div>`;
      $("status").className = res.status && res.status.ok ? "ok" : "err";
    } else {
      $("status").innerHTML = `Error: ${escapeHtml(res && res.error ? res.error : "unknown")}`;
      $("status").className = "err";
    }
  } catch (err) {
    $("status").textContent = "Error: " + err.message;
    $("status").className = "err";
  }
});

$("now").addEventListener("click", async () => {
  $("status").textContent = "Polling…";
  $("status").className = "";
  try {
    const status = await sendMsg({ type: "POLL_NOW" });
    renderStatus(status);
  } catch (err) {
    $("status").textContent = "Error: " + err.message;
    $("status").className = "err";
  }
});

$("test").addEventListener("click", async () => {
  $("status").textContent = "Testing API…";
  $("status").className = "";
  const cfg = {
    apiUrl: $("apiUrl").value.trim(),
    adminSecret: $("adminSecret").value.trim(),
  };
  try {
    const r = await sendMsg({ type: "TEST_API", cfg }, 15000);
    if (r && r.ok) {
      $("status").textContent = "API OK – secret valid.";
      $("status").className = "ok";
    } else {
      $("status").innerHTML = `API error: ${escapeHtml(r && r.error ? r.error : "unknown")}`;
      $("status").className = "err";
    }
  } catch (err) {
    $("status").textContent = "Error: " + err.message;
    $("status").className = "err";
  }
});

$("cleanup").addEventListener("click", async () => {
  $("status").textContent = "Cleanup running…";
  $("status").className = "";
  try {
    const r = await sendMsg({ type: "CLEANUP_FUTURE" }, 90000);
    if (r && r.ok) {
      $("status").textContent =
        `Cleanup OK – future-dated: ${r.deletedFuture ?? 0} · irrelevant: ${r.purged ?? 0} · old (>72h, unsaved): ${r.removedOld ?? 0}. ` +
        `Next poll will re-ingest current jobs.`;
      $("status").className = "ok";
    } else {
      $("status").innerHTML = `Cleanup error: ${escapeHtml(r && r.error ? r.error : "unknown")}`;
      $("status").className = "err";
    }
  } catch (err) {
    $("status").textContent = "Error: " + err.message;
    $("status").className = "err";
  }
});

load();