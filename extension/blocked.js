// Read the attempted URL from the referrer or query param
const params = new URLSearchParams(window.location.search);
const attemptedUrl = params.get("url") || document.referrer || "";
const attemptedHost = (() => {
  try { return attemptedUrl ? new URL(attemptedUrl).hostname : ""; } catch { return attemptedUrl; }
})();

// Show the attempted domain in the UI
const msgEl = document.getElementById("block-msg");
if (msgEl && attemptedHost) {
  msgEl.innerHTML = `<strong style="color:#f87171">${attemptedHost}</strong> is blocked during your focus session.<br/>Stay on track — you're building discipline! 💪`;
}

// Log this distraction attempt to the service worker
try {
  chrome.runtime.sendMessage({
    action: "blockAttempt",
    type: "navigation_blocked",
    url: attemptedUrl || window.location.href,
  });
} catch {}

// Countdown and redirect
let countdown = 2;
const badge = document.getElementById("countdown-badge");

const tick = setInterval(() => {
  countdown--;
  if (badge && countdown > 0) {
    badge.textContent = `⚡ Returning to your workspace in ${countdown} second${countdown !== 1 ? "s" : ""}...`;
  }
}, 1000);

setTimeout(() => {
  clearInterval(tick);
  try {
    chrome.runtime.sendMessage({ action: "redirectOrCloseBlockedTab" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        window.location.href = "https://focusnyx.vercel.app/focus";
      }
    });
  } catch {
    window.location.href = "https://focusnyx.vercel.app/focus";
  }
}, 2000);
