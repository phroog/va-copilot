chrome.runtime.onInstalled.addListener(() => {
  console.log("Sari extension installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_TOKEN") {
    chrome.storage.local.get("sariToken", (result) => {
      sendResponse({ token: result.sariToken || null });
    });
    return true;
  }
});
