window.addEventListener("SariExtensionAuth", (event) => {
  const token = event.detail?.token;
  if (token) {
    chrome.storage.local.set({ sariToken: token });
  }
});
