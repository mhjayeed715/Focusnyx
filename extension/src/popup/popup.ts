declare const chrome: any;

import type { FocusState } from "../shared/types";
import { authenticateUser } from "../shared/api";

let selectedDuration = 25 * 60 * 1000;
let allowedUrls: string[] = ["localhost", "127.0.0.1", "focusnyx"];
let focusActive = false;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let savedEmergencyPin = "";

// DOM Elements
const tabFocusBtn = document.getElementById("tabFocusBtn") as HTMLButtonElement;
const tabSettingsBtn = document.getElementById("tabSettingsBtn") as HTMLButtonElement;
const tabFocus = document.getElementById("tabFocus")!;
const tabSettings = document.getElementById("tabSettings")!;

const statusDot = document.getElementById("statusDot")!;
const statusText = document.getElementById("statusText")!;
const timerDisplay = document.getElementById("timerDisplay")!;
const timerText = document.getElementById("timerText")!;
const statsDisplay = document.getElementById("statsDisplay")!;
const blockCount = document.getElementById("blockCount")!;

const durationBtns = document.querySelectorAll<HTMLButtonElement>(".duration-btn");
const durationSection = document.getElementById("durationSection")!;
const manualDurationInput = document.getElementById("manualDurationInput") as HTMLInputElement;

const focusBtn = document.getElementById("focusBtn") as HTMLButtonElement;

const authProfileCard = document.getElementById("authProfileCard")!;
const authLoginForm = document.getElementById("authLoginForm")!;
const profileEmail = document.getElementById("profileEmail")!;
const authLogoutBtn = document.getElementById("authLogoutBtn") as HTMLButtonElement;

const authEmail = document.getElementById("authEmail") as HTMLInputElement;
const authPassword = document.getElementById("authPassword") as HTMLInputElement;
const authLoginBtn = document.getElementById("authLoginBtn") as HTMLButtonElement;
const authStatus = document.getElementById("authStatus")!;

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
  // Duration preset buttons
  durationBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      durationBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      manualDurationInput.value = "";
      const mins = parseInt(btn.dataset.minutes || "25", 10);
      selectedDuration = mins * 60 * 1000;
    });
  });

  // Manual custom duration input
  manualDurationInput?.addEventListener("input", () => {
    const val = parseInt(manualDurationInput.value, 10);
    if (!isNaN(val) && val > 0 && val <= 180) {
      durationBtns.forEach((b) => b.classList.remove("active"));
      selectedDuration = val * 60 * 1000;
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
  chrome.storage.local.get(["allowedUrls", "pin", "userAuth"], (result: any) => {
    if (result.allowedUrls && Array.isArray(result.allowedUrls)) {
      allowedUrls = result.allowedUrls;
    }

    if (result.userAuth?.email) {
      authProfileCard.style.display = "block";
      authLoginForm.style.display = "none";
      profileEmail.textContent = result.userAuth.email;
    } else {
      authProfileCard.style.display = "none";
      authLoginForm.style.display = "block";
    }
  });
}

function checkFocusStatus() {
  chrome.runtime.sendMessage({ action: "getStatus" }, (response: FocusState & { isActive?: boolean; remainingTime?: number }) => {
    if (chrome.runtime.lastError) return;
    if (response && (response.isActive || response.active)) {
      focusActive = true;
      // Use focusStartTime + focusDuration to calculate accurate remaining time
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

// Re-poll every 2 seconds while popup is open to stay in sync with web app
let statusPollInterval: ReturnType<typeof setInterval> | null = null;
function startStatusPolling() {
  if (statusPollInterval) clearInterval(statusPollInterval);
  statusPollInterval = setInterval(checkFocusStatus, 2000);
}

// Listen for storage changes from service worker state updates
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

function updateUIForActive(remainingMs: number) {
  statusDot.className = "status-dot active";
  statusText.textContent = "Active (Locked)";
  focusBtn.style.display = "none";
  timerDisplay.style.display = "block";
  statsDisplay.style.display = "flex";

  durationSection.style.display = "none";

  startTimerDisplay(remainingMs);

  chrome.storage.local.get("pendingEvents", (res: any) => {
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
}

function startTimerDisplay(durationMs: number) {
  if (timerInterval) clearInterval(timerInterval);
  let remaining = durationMs;

  function update() {
    if (remaining <= 0) {
      if (timerInterval) clearInterval(timerInterval);
      updateUIForInactive();
      return;
    }
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    timerText.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    remaining -= 1000;
  }

  update();
  timerInterval = setInterval(update, 1000);
}

function startFocus() {
  if (!savedEmergencyPin || savedEmergencyPin.length !== 4) {
    savedEmergencyPin = "123456";
  }

  chrome.runtime.sendMessage(
    {
      action: "startFocus",
      duration: selectedDuration,
      allowedUrls,
      pin: savedEmergencyPin,
    },
    (res: any) => {
      if (chrome.runtime.lastError) return;
      if (res && res.success) {
        focusActive = true;
        updateUIForActive(selectedDuration);
      }
    }
  );
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
  chrome.storage.local.set({ userAuth, focusState: { token: res.token, userId: res.userId } }, () => {
    chrome.runtime.sendMessage({ action: "syncAuth", token: res.token, userId: res.userId });
    authProfileCard.style.display = "block";
    authLoginForm.style.display = "none";
    profileEmail.textContent = res.email || email;
  });
}

init();
