// Determine the correct PWA URL to redirect back to
function getPwaUrl() {
  try {
    // Check if we're in a localhost dev environment by asking the service worker
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getStatus" }, (res) => {
        if (chrome.runtime.lastError || !res) {
          resolve("https://focusnyx.vercel.app/focus");
          return;
        }
        // Service worker is alive — try to find the PWA tab
        chrome.runtime.sendMessage({ action: "redirectOrCloseBlockedTab" }, () => {
          if (chrome.runtime.lastError) {
            resolve("https://focusnyx.vercel.app/focus");
          }
          // redirectOrCloseBlockedTab handles the navigation itself
          resolve(null);
        });
      });
    });
  } catch {
    return Promise.resolve("https://focusnyx.vercel.app/focus");
  }
}

// Update countdown display
let countdown = 2;
const badge = document.querySelector(".redirect-badge");

const tick = setInterval(() => {
  countdown--;
  if (badge && countdown > 0) {
    badge.textContent = `⚡ Returning to your workspace in ${countdown} second${countdown !== 1 ? "s" : ""}...`;
  }
}, 1000);

setTimeout(async () => {
  clearInterval(tick);
  try {
    const url = await getPwaUrl();
    if (url) {
      window.location.href = url;
    }
    // If url is null, redirectOrCloseBlockedTab already handled it
  } catch {
    window.location.href = "https://focusnyx.vercel.app/focus";
  }
}, 2000);
