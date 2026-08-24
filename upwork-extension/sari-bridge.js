/* Sari bridge (polling extension) — runs on the Sari web app domain and relays
   messages from the Sari page to the extension background:
   - SARI_OPEN_JOB   → open a job's original URL in a popup window
   - SARI_SCAN_JOB   → scan a job URL in a real tab (full DOM scam scan)
   - SARI_PING       → confirm the extension is installed & reachable
   The Sari page posts a window message; we answer via a CustomEvent so the
   page can await the extension's response. */
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data || {};

  if (data.type === "SARI_OPEN_JOB") {
    chrome.runtime.sendMessage({ type: "OPEN_JOB_BY_ID", id: data.id }).catch(() => {});
  }

  if (data.type === "SARI_PING") {
    chrome.runtime.sendMessage({ type: "PING" }, (resp) => {
      document.dispatchEvent(
        new CustomEvent("sari-extension-reply", {
          detail: { ok: true, msgId: data.msgId },
        })
      );
    });
  }

  if (data.type === "SARI_SCAN_JOB") {
    chrome.runtime.sendMessage({ type: "SCAN_JOB_URL", url: data.url }, (resp) => {
      document.dispatchEvent(
        new CustomEvent("sari-extension-reply", {
          detail: { msgId: data.msgId, ok: !!(resp && resp.ok), evidence: resp && resp.evidence, error: resp && resp.error },
        })
      );
    });
  }
});
