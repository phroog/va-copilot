window.addEventListener("SariExtensionAuth", (event) => {
  const token = event.detail?.token;
  if (token) {
    chrome.storage.local.set({ sariToken: token });
  }
});

/* Relay on-demand detail fetches from the Sari web app to the polling extension:
   the Sari page asks for a global job's real detail (by id), the bridge forwards
   it, and posts the result back to the page. */
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data || {};
  if (data.type !== "SARI_FETCH_DETAIL") return;
  const requestId = data.requestId;
  chrome.runtime
    .sendMessage({ type: "FETCH_DETAIL_BY_ID", id: data.id })
    .then((resp) => {
      window.postMessage(
        {
          type: "SARI_FETCH_DETAIL_RESULT",
          requestId,
          ok: !!(resp && resp.ok),
          detail: resp && resp.detail,
          error: resp && resp.error,
        },
        "*"
      );
    })
    .catch((err) => {
      window.postMessage({ type: "SARI_FETCH_DETAIL_RESULT", requestId, ok: false, error: err.message }, "*");
    });
});
