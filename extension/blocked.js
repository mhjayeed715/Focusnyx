setTimeout(() => {
  try {
    chrome.runtime.sendMessage({ action: "redirectOrCloseBlockedTab" });
  } catch (e) {
    window.location.href = "http://localhost:3000/focus";
  }
}, 2000);
