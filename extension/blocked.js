setTimeout(() => {
  chrome.runtime.sendMessage({ action: "closeBlockedTab" });
}, 2000);
