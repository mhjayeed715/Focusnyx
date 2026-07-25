setTimeout(() => {
  try {
    chrome.runtime.sendMessage({ action: "redirectOrCloseBlockedTab" });
  } catch (e) {
    window.location.href = "https://focusnyx.vercel.app/focus";
  }
}, 2000);
