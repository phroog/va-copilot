/* Sari bridge (polling extension) — runs on the Sari web app domain and relays
   the "open job in a hidden popup window" request to the extension background. */
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data || {};
  if (data.type === "SARI_OPEN_JOB") {
    chrome.runtime.sendMessage({ type: "OPEN_JOB_BY_ID", id: data.id }).catch(() => {});
  }
});