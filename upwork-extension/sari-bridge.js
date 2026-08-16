/* Sari bridge (polling extension) — runs on the Sari web app domain and relays
   on-demand detail requests to the extension background. This is what lets the
   web app live-fetch a job's real detail page without exposing the URL. */
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data || {};
  if (data.type === "SARI_FETCH_DETAIL") {
    chrome.runtime
      .sendMessage({ type: "FETCH_DETAIL_BY_ID", id: data.id })
      .then((resp) => {
        window.postMessage(
          {
            type: "SARI_FETCH_DETAIL_RESULT",
            requestId: data.requestId,
            ok: !!(resp && resp.ok),
            detail: resp && resp.detail,
            error: resp && resp.error,
          },
          "*"
        );
      })
      .catch((err) => {
        window.postMessage({ type: "SARI_FETCH_DETAIL_RESULT", requestId: data.requestId, ok: false, error: err.message }, "*");
      });
  }
  if (data.type === "SARI_OPEN_JOB") {
    chrome.runtime.sendMessage({ type: "OPEN_JOB_BY_ID", id: data.id }).catch(() => {});
  }
});