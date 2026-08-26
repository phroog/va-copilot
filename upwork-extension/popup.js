const $ = (id) => document.getElementById(id);
const KEYS = ["upwork", "onlinejobs", "guru", "freelancer", "workingnomads", "remoteok", "jobspresso", "peopleperhour", "indeed", "hubstaff", "reddit", "facebook"];

function sendMsg(msg, timeoutMs = 60000) {
  return Promise.race([
    chrome.runtime.sendMessage(msg),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout – background not responding (try reloading the extension?)")), timeoutMs)),
  ]);
}

function buildRows(platforms) {
  const wrap = $("platforms");
  wrap.innerHTML = "";
  for (const k of KEYS) {
    const p = (platforms || {})[k];
    if (!p) continue;
    const row = document.createElement("div");
    row.className = "prow";
    const cb = document.createElement("input");
    cb.type = "checkbox";
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

function renderStatus(s) {
  const el = $("status");
  const when = s && s.ts ? new Date(s.ts).toLocaleTimeString() : "–";
  if (!s || !s.platforms) {
    el.textContent = s && s.error ? "Error: " + s.error : "No poll yet.";
    el.className = s && s.error ? "err" : "";
    return;
  }
  const lines = [`Last poll: ${when}`];
  const keys = Object.keys(s.platforms);
  if (!keys.length) lines.push(s.note || "no platform enabled");
  for (const k of keys) {
    const r = s.platforms[k];
    const dbg = r.debug
      ? `\n   art=${r.debug.articles} feed=${r.debug.feeds} unit=${r.debug.feedUnits} imgs=${r.debug.imgs} len=${r.debug.bodyLen}\n   text: ${(r.debug.bodyHead || "").replace(/\n+/g, " | ").slice(0, 220)}`
      : "";
    lines.push(
      r.ok
        ? `✓ ${k}: ${r.got} loaded · ${r.fresh} new · ${r.inserted} inserted (${r.mode})${r.warning ? ` ⚠ ${r.warning}` : ""}${dbg}`
        : `✗ ${k}: ERROR – ${r.error}`
    );
  }
  el.textContent = lines.join("\n");
  el.className = s.ok ? "ok" : "err";
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
    $("status").textContent += `\nAdmin secret saved: ${len === 0 ? "EMPTY (please type below)" : "length " + len}`;
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
      $("status").textContent += `\n\nSecret saved: length ${res.savedSecretLen} (Feld: ${cfg.adminSecret.length})`;
      $("status").className = res.status && res.status.ok ? "ok" : "err";
    } else {
      $("status").textContent = "Error: " + (res && res.error ? res.error : "unbekannt");
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
      $("status").textContent = "API-Error: " + (r && r.error ? r.error : "unbekannt");
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
        `Cleanup OK – future-dated: ${r.deletedFuture ?? 0} · irrelevant: ${r.purged ?? 0} · old (>72h, unsaved): ${r.removedOld ?? 0}.` +
        ` Next poll will re-ingest current jobs.`;
      $("status").className = "ok";
    } else {
      $("status").textContent = "Cleanup-Error: " + (r && r.error ? r.error : "unbekannt");
      $("status").className = "err";
    }
  } catch (err) {
    $("status").textContent = "Error: " + err.message;
    $("status").className = "err";
  }
});

load();