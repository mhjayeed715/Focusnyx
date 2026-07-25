setTimeout(() => {
  // Try to redirect to the Focusnyx focus page instead of closing the tab
  chrome.storage.local.get(["focusState"], (data) => {
    const state = data.focusState;
    // Find the Focusnyx PWA tab and switch to it
    chrome.runtime.sendMessage({ action: "closeBlockedTab" });
  });
}, 2000);
