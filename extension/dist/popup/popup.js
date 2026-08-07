// src/shared/api.ts
var SUPABASE_URL = "https://vavppeevglpvyfoorfje.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnBwZWV2Z2xwdnlmb29yZmplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODEwNTksImV4cCI6MjA5MjQ1NzA1OX0.3PI_2nJsIHaJUzvEc_cNggcwbv147Q2aGlRhVdBncuA";
async function authenticateUser(email, password) {
  try {
    console.log("[Focusnyx Extension] Authenticating user:", email);
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.error_description || data.message || data.msg || "Invalid email or password";
      console.error("[Focusnyx Extension] Auth failed:", errorMsg);
      return { success: false, error: errorMsg };
    }
    console.log("[Focusnyx Extension] Auth successful. User ID:", data.user?.id);
    return {
      success: true,
      token: data.access_token,
      userId: data.user?.id,
      email: data.user?.email || email
    };
  } catch (err) {
    console.error("[Focusnyx Extension] Auth network error:", err);
    return { success: false, error: "Network error connecting to authentication server." };
  }
}

// src/popup/popup.ts
var selectedDuration = 25 * 60 * 1e3;
var FOCUSNYX_APP_DOMAINS = ["localhost", "127.0.0.1", "focusnyx.vercel.app", "focusnyx.com"];
var allowedUrls = [...FOCUSNYX_APP_DOMAINS];
var focusActive = false;
var timerInterval = null;
var savedEmergencyPin = "";
var tabFocusBtn = document.getElementById("tabFocusBtn");
var tabSettingsBtn = document.getElementById("tabSettingsBtn");
var tabFocus = document.getElementById("tabFocus");
var tabSettings = document.getElementById("tabSettings");
var statusDot = document.getElementById("statusDot");
var statusText = document.getElementById("statusText");
var timerDisplay = document.getElementById("timerDisplay");
var timerText = document.getElementById("timerText");
var statsDisplay = document.getElementById("statsDisplay");
var blockCount = document.getElementById("blockCount");
var durationBtns = document.querySelectorAll(".duration-btn");
var durationSection = document.getElementById("durationSection");
var manualDurationInput = document.getElementById("manualDurationInput");
var focusBtn = document.getElementById("focusBtn");
var authProfileCard = document.getElementById("authProfileCard");
var authLoginForm = document.getElementById("authLoginForm");
var profileEmail = document.getElementById("profileEmail");
var authLogoutBtn = document.getElementById("authLogoutBtn");
var authEmail = document.getElementById("authEmail");
var authPassword = document.getElementById("authPassword");
var authLoginBtn = document.getElementById("authLoginBtn");
var authStatus = document.getElementById("authStatus");
function init() {
  setupTabs();
  loadSavedSettings();
  checkFocusStatus();
  startStatusPolling();
  setupEventListeners();
}
function setupTabs() {
  tabFocusBtn.addEventListener("click", () => {
    tabFocusBtn.classList.add("active");
    tabSettingsBtn.classList.remove("active");
    tabFocus.classList.add("active");
    tabSettings.classList.remove("active");
  });
  tabSettingsBtn.addEventListener("click", () => {
    tabSettingsBtn.classList.add("active");
    tabFocusBtn.classList.remove("active");
    tabSettings.classList.add("active");
    tabFocus.classList.remove("active");
  });
}
function setupEventListeners() {
  durationBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      durationBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      manualDurationInput.value = "";
      const mins = parseInt(btn.dataset.minutes || "25", 10);
      selectedDuration = mins * 60 * 1e3;
    });
  });
  manualDurationInput?.addEventListener("input", () => {
    const val = parseInt(manualDurationInput.value, 10);
    if (!isNaN(val) && val > 0 && val <= 180) {
      durationBtns.forEach((b) => b.classList.remove("active"));
      selectedDuration = val * 60 * 1e3;
    }
  });
  focusBtn.addEventListener("click", startFocus);
  authLoginBtn.addEventListener("click", handleAuthLogin);
  authLogoutBtn.addEventListener("click", () => {
    chrome.storage.local.remove(["userAuth"], () => {
      chrome.runtime.sendMessage({ action: "syncAuth", token: null, userId: null });
      authProfileCard.style.display = "none";
      authLoginForm.style.display = "block";
      authEmail.value = "";
      authPassword.value = "";
      authStatus.textContent = "";
    });
  });
}
function loadSavedSettings() {
  chrome.storage.local.get(["focusState", "pin", "userAuth"], (result) => {
    if (result.focusState?.allowedUrls && Array.isArray(result.focusState.allowedUrls)) {
      const stored = result.focusState.allowedUrls;
      allowedUrls = Array.from(/* @__PURE__ */ new Set([...FOCUSNYX_APP_DOMAINS, ...stored]));
    }
    if (result.userAuth?.token) {
      authProfileCard.style.display = "block";
      authLoginForm.style.display = "none";
      let displayEmail = result.userAuth.email || "";
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(displayEmail);
      if (!displayEmail || isUuid) {
        try {
          const token = result.userAuth.token;
          const base64Url = token.split(".")[1];
          if (base64Url) {
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const pad = base64.length % 4;
            const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
            const payload = JSON.parse(atob(padded));
            if (payload.email) {
              displayEmail = payload.email;
            }
          }
        } catch {
        }
        if (!displayEmail || isUuid) {
          fetch("https://vavppeevglpvyfoorfje.supabase.co/auth/v1/user", {
            headers: {
              "Authorization": `Bearer ${result.userAuth.token}`,
              "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnBwZWV2Z2xwdnlmb29yZmplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODEwNTksImV4cCI6MjA5MjQ1NzA1OX0.3PI_2nJsIHaJUzvEc_cNggcwbv147Q2aGlRhVdBncuA"
            }
          }).then((res) => res.ok ? res.json() : null).then((data) => {
            if (data?.email) {
              profileEmail.textContent = data.email;
              chrome.storage.local.set({
                userAuth: { ...result.userAuth, email: data.email }
              });
            } else {
              profileEmail.textContent = displayEmail || "Authenticated";
            }
          }).catch(() => {
            profileEmail.textContent = displayEmail || "Authenticated";
          });
          return;
        }
      }
      profileEmail.textContent = displayEmail;
    } else {
      authProfileCard.style.display = "none";
      authLoginForm.style.display = "block";
    }
  });
}
function checkFocusStatus() {
  chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && (response.isActive || response.active)) {
      focusActive = true;
      let remainingMs = response.remainingTime || 0;
      if (response.focusStartTime && response.focusDuration) {
        const elapsed = Date.now() - response.focusStartTime;
        remainingMs = Math.max(0, response.focusDuration - elapsed);
      }
      updateUIForActive(remainingMs);
    } else {
      focusActive = false;
      updateUIForInactive();
    }
  });
}
var statusPollInterval = null;
function startStatusPolling() {
  if (statusPollInterval) clearInterval(statusPollInterval);
  statusPollInterval = setInterval(checkFocusStatus, 2e3);
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.focusState) {
    const newState = changes.focusState.newValue;
    if (newState) {
      if (newState.active) {
        focusActive = true;
        let remainingMs = 0;
        if (newState.focusStartTime && newState.focusDuration) {
          remainingMs = Math.max(0, newState.focusDuration - (Date.now() - newState.focusStartTime));
        }
        updateUIForActive(remainingMs);
      } else {
        focusActive = false;
        updateUIForInactive();
      }
    }
  }
});
function updateUIForActive(remainingMs) {
  statusDot.className = "status-dot active";
  statusText.textContent = "Active (Locked)";
  focusBtn.style.display = "none";
  timerDisplay.style.display = "block";
  statsDisplay.style.display = "flex";
  durationSection.style.display = "none";
  startTimerDisplay(remainingMs);
  chrome.storage.local.get("pendingEvents", (res) => {
    const events = res.pendingEvents || [];
    blockCount.textContent = String(events.length);
  });
}
function updateUIForInactive() {
  statusDot.className = "status-dot idle";
  statusText.textContent = "Inactive";
  focusBtn.style.display = "block";
  timerDisplay.style.display = "none";
  statsDisplay.style.display = "none";
  durationSection.style.display = "block";
  focusBtn.disabled = false;
  focusBtn.style.opacity = "1";
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerEndAt = null;
}
var timerEndAt = null;
function startTimerDisplay(remainingMs) {
  const newEndAt = Date.now() + remainingMs;
  if (timerInterval && timerEndAt !== null && Math.abs(timerEndAt - newEndAt) < 5e3) {
    return;
  }
  if (timerInterval) clearInterval(timerInterval);
  timerEndAt = newEndAt;
  function update() {
    const remaining = Math.max(0, timerEndAt - Date.now());
    if (remaining <= 0) {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      timerEndAt = null;
      updateUIForInactive();
      return;
    }
    const mins = Math.floor(remaining / 6e4);
    const secs = Math.floor(remaining % 6e4 / 1e3);
    timerText.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  update();
  timerInterval = setInterval(update, 1e3);
}
function startFocus() {
  if (!savedEmergencyPin || savedEmergencyPin.length < 4) {
    savedEmergencyPin = "123456";
  }
  chrome.runtime.sendMessage(
    {
      action: "startFocus",
      duration: selectedDuration,
      allowedUrls,
      pin: savedEmergencyPin
    },
    (res) => {
      if (chrome.runtime.lastError) return;
      if (res && res.success) {
        focusActive = true;
        updateUIForActive(selectedDuration);
        openFocusnyxTab();
      }
    }
  );
}
function openFocusnyxTab() {
  const pwaUrls = [
    "http://localhost:3000",
    "https://focusnyx.vercel.app",
    "https://focusnyx.com"
  ];
  chrome.tabs.query({}, (tabs) => {
    const existing = tabs.find(
      (t) => t.url && pwaUrls.some((u) => t.url.startsWith(u))
    );
    if (existing?.id) {
      chrome.tabs.update(existing.id, { active: true });
    } else {
      chrome.tabs.create({ url: "https://focusnyx.vercel.app/focus" });
    }
  });
}
async function handleAuthLogin() {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  if (!email || !password) {
    authStatus.style.color = "#ef4444";
    authStatus.textContent = "Please enter both email and password.";
    return;
  }
  authStatus.style.color = "#94a3b8";
  authStatus.textContent = "Authenticating with Supabase server...";
  const res = await authenticateUser(email, password);
  if (!res.success) {
    authStatus.style.color = "#ef4444";
    authStatus.textContent = res.error || "Authentication failed.";
    return;
  }
  const userAuth = { email: res.email, token: res.token, userId: res.userId };
  chrome.storage.local.set({ userAuth }, () => {
    chrome.runtime.sendMessage({ action: "syncAuth", token: res.token, userId: res.userId, email: res.email });
    authProfileCard.style.display = "block";
    authLoginForm.style.display = "none";
    profileEmail.textContent = res.email || email;
    authStatus.style.color = "#22c55e";
    authStatus.textContent = "Authentication successful! Distraction logging active.";
  });
}
init();
