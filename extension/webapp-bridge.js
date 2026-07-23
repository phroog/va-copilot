window.addEventListener("SariExtensionAuth", (event) => {
  const token = event.detail?.token;
  if (token) {
    chrome.runtime.sendMessage({ type: "SARI_AUTH_TOKEN", token });
  }
});
