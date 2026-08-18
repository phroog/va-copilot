const $ = (id) => document.getElementById(id);
const KEYS = ["upwork", "onlinejobs", "guru", "freelancer", "workingnomads", "remoteok", "jobspresso", "peopleperhour", "indeed", "hubstaff", "reddit", "facebook"];

function sendMsg(msg, timeoutMs = 60000) {
  return Promise.race([
    chrome.runtime.sendMessage(msg),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout – Background antwortet nicht (Erweiterung neu laden?)")), timeoutMs)),
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
      id.textContent = p.sourceId ? "✓ Source-ID" : "keine Source-ID";
      row.appendChild(id);
    } else {
      const u = document.createElement("input");
      u.type = "text";
      u.value = p.url || "";
      u.dataset.urlKey = k;
      u.className = "purl";
      u.placeholder = "Jobs-URL";
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
    el.textContent = s && s.error ? "Fehler: " + s.error : "Noch kein Poll.";
    el.className = s && s.error ? "err" : "";
    return;
  }
  const lines = [`Letzter Poll: ${when}`];
  const keys = Object.keys(s.platforms);
  if (!keys.length) lines.push(s.note || "keine Plattform aktiviert");
  for (const k of keys) {
    const r = s.platforms[k];
    const dbg = r.debug
      ? `\n   art=${r.debug.articles} feed=${r.debug.feeds} unit=${r.debug.feedUnits} imgs=${r.debug.imgs} len=${r.debug.bodyLen}\n   text: ${(r.debug.bodyHead || "").replace(/\n+/g, " | ").slice(0, 220)}`
      : "";
    lines.push(
      r.ok
        ? `✓ ${k}: ${r.got} geladen · ${r.fresh} neu · ${r.inserted} eingefügt (${r.mode})${r.warning ? ` ⚠ ${r.warning}` : ""}${dbg}`
        : `✗ ${k}: FEHLER – ${r.error}`
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
    $("status").textContent += `\nAdmin-Secret gespeichert: ${len === 0 ? "LEER (bitte unten eintippen)" : "Länge " + len}`;
  } catch (err) {
    $("status").textContent = "Fehler: " + err.message;
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
  $("status").textContent = "Speichere & polle …";
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
      $("status").textContent += `\n\nSecret gespeichert: Länge ${res.savedSecretLen} (Feld: ${cfg.adminSecret.length})`;
      $("status").className = res.status && res.status.ok ? "ok" : "err";
    } else {
      $("status").textContent = "Fehler: " + (res && res.error ? res.error : "unbekannt");
      $("status").className = "err";
    }
  } catch (err) {
    $("status").textContent = "Fehler: " + err.message;
    $("status").className = "err";
  }
});

$("now").addEventListener("click", async () => {
  $("status").textContent = "Poll läuft…";
  $("status").className = "";
  try {
    const status = await sendMsg({ type: "POLL_NOW" });
    renderStatus(status);
  } catch (err) {
    $("status").textContent = "Fehler: " + err.message;
    $("status").className = "err";
  }
});

$("test").addEventListener("click", async () => {
  $("status").textContent = "Teste API…";
  $("status").className = "";
  const cfg = {
    apiUrl: $("apiUrl").value.trim(),
    adminSecret: $("adminSecret").value.trim(),
  };
  try {
    const r = await sendMsg({ type: "TEST_API", cfg }, 15000);
    if (r && r.ok) {
      $("status").textContent = "API OK – Secret gültig.";
      $("status").className = "ok";
    } else {
      $("status").textContent = "API-Fehler: " + (r && r.error ? r.error : "unbekannt");
      $("status").className = "err";
    }
  } catch (err) {
    $("status").textContent = "Fehler: " + err.message;
    $("status").className = "err";
  }
});

$("cleanup").addEventListener("click", async () => {
  $("status").textContent = "Cleanup läuft…";
  $("status").className = "";
  try {
    const r = await sendMsg({ type: "CLEANUP_FUTURE" }, 90000);
    if (r && r.ok) {
      $("status").textContent =
        `Cleanup OK – Zukunfts-datiert: ${r.deletedFuture ?? 0} · Irrelevante: ${r.purged ?? 0} · Alt (>72h, ungespeichert): ${r.removedOld ?? 0}.` +
        ` Nächster Poll spielt aktuelle Jobs neu ein.`;
      $("status").className = "ok";
    } else {
      $("status").textContent = "Cleanup-Fehler: " + (r && r.error ? r.error : "unbekannt");
      $("status").className = "err";
    }
  } catch (err) {
    $("status").textContent = "Fehler: " + err.message;
    $("status").className = "err";
  }
});

load();