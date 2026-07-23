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
const allowedSection = document.getElementById("allowedSection")!;
const pinRequiredBanner = document.getElementById("pinRequiredBanner")!;
const goToSettingsBtn = document.getElementById("goToSettingsBtn") as HTMLButtonElement;

const urlInput = document.getElementById("urlInput") as HTMLInputElement;
const addUrlBtn = document.getElementById("addUrlBtn") as HTMLButtonElement;
const allowedUrlsList = document.getElementById("allowedUrlsList")!;

const focusBtn = document.getElementById("focusBtn") as HTMLButtonElement;
const endFocusBtn = document.getElementById("endFocusBtn") as HTMLButtonElement;

const endFocusPinContainer = document.getElementById("endFocusPinContainer")!;
const unlockPinInput = document.getElementById("unlockPinInput") as HTMLInputElement;
const confirmUnlockBtn = document.getElementById("confirmUnlockBtn") as HTMLButtonElement;
const cancelUnlockBtn = document.getElementById("cancelUnlockBtn") as HTMLButtonElement;
const unlockErrorMessage = document.getElementById("unlockErrorMessage")!;

const emergencyPinInput = document.getElementById("emergencyPinInput") as HTMLInputElement;
const savePinBtn = document.getElementById("savePinBtn") as HTMLButtonElement;
const pinStatusMessage = document.getElementById("pinStatusMessage")!;

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

  goToSettingsBtn?.addEventListener("click", () => {
    tabSettingsBtn.click();
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

  // Emergency PIN save handler
  savePinBtn.addEventListener("click", saveEmergencyPin);
  emergencyPinInput.addEventListener("input", () => {
    emergencyPinInput.value = emergencyPinInput.value.replace(/\D/g, "").slice(0, 4);
  });

  addUrlBtn.addEventListener("click", addUrl);
  urlInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addUrl();
  });

  focusBtn.addEventListener("click", startFocus);
  endFocusBtn.addEventListener("click", showInlineUnlockModal);

  confirmUnlockBtn.addEventListener("click", handleInlineUnlock);
  cancelUnlockBtn.addEventListener("click", () => {
    endFocusPinContainer.style.display = "none";
    unlockPinInput.value = "";
    unlockErrorMessage.textContent = "";
  });

  unlockPinInput.addEventListener("input", () => {
    unlockPinInput.value = unlockPinInput.value.replace(/\D/g, "").slice(0, 4);
    unlockErrorMessage.textContent = "";
  });
  unlockPinInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleInlineUnlock();
  });

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
    renderAllowedUrls();

    if (result.pin && /^\d{4}$/.test(result.pin)) {
      savedEmergencyPin = result.pin;
      emergencyPinInput.value = result.pin;
    } else {
      savedEmergencyPin = "1234";
      emergencyPinInput.value = "1234";
      chrome.storage.local.set({ pin: "1234" });
    }
    pinRequiredBanner.style.display = "none";
    focusBtn.disabled = false;
    focusBtn.style.opacity = "1";

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

function saveEmergencyPin() {
  const pinVal = emergencyPinInput.value.replace(/\D/g, "").slice(0, 4);
  if (pinVal.length !== 4) {
    pinStatusMessage.style.color = "#ef4444";
    pinStatusMessage.textContent = "Emergency PIN must be exactly 4 numeric digits.";
    return;
  }

  savedEmergencyPin = pinVal;
  chrome.storage.local.set({ pin: pinVal }, () => {
    pinStatusMessage.style.color = "#22c55e";
    pinStatusMessage.textContent = "Emergency PIN saved successfully!";
    pinRequiredBanner.style.display = "none";
    focusBtn.disabled = false;
    focusBtn.style.opacity = "1";
  });
}

function renderAllowedUrls() {
  allowedUrlsList.innerHTML = allowedUrls
    .map(
      (url) => `
    <div class="url-item">
      <span>${url}</span>
      <button class="remove-btn" data-url="${url}">Remove</button>
    </div>
  `
    )
    .join("");

  allowedUrlsList.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const urlToRemove = target.dataset.url;
      if (urlToRemove) removeUrl(urlToRemove);
    });
  });
}

function addUrl() {
  const val = urlInput.value.trim().toLowerCase();
  if (!val) return;
  const clean = val.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!allowedUrls.includes(clean)) {
    allowedUrls.push(clean);
    chrome.storage.local.set({ allowedUrls });
    renderAllowedUrls();
  }
  urlInput.value = "";
}

function removeUrl(url: string) {
  if (url === "localhost" || url === "127.0.0.1" || url === "focusnyx") return;
  allowedUrls = allowedUrls.filter((u) => u !== url);
  chrome.storage.local.set({ allowedUrls });
  renderAllowedUrls();
}

function checkFocusStatus() {
  chrome.runtime.sendMessage({ action: "getStatus" }, (response: FocusState & { isActive?: boolean; remainingTime?: number }) => {
    if (chrome.runtime.lastError) return;
    if (response && (response.isActive || response.active)) {
      focusActive = true;
      updateUIForActive(response.remainingTime || 0);
    } else {
      focusActive = false;
      updateUIForInactive();
    }
  });
}

function updateUIForActive(remainingMs: number) {
  statusDot.className = "status-dot active";
  statusText.textContent = "Active (Locked)";
  focusBtn.style.display = "none";
  endFocusBtn.style.display = "block";
  timerDisplay.style.display = "block";
  statsDisplay.style.display = "flex";

  durationSection.style.display = "none";
  allowedSection.style.display = "none";
  pinRequiredBanner.style.display = "none";
  endFocusPinContainer.style.display = "none";

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
  endFocusBtn.style.display = "none";
  timerDisplay.style.display = "none";
  statsDisplay.style.display = "none";

  durationSection.style.display = "block";
  allowedSection.style.display = "block";
  endFocusPinContainer.style.display = "none";

  if (!savedEmergencyPin) {
    pinRequiredBanner.style.display = "block";
    focusBtn.disabled = true;
    focusBtn.style.opacity = "0.5";
  } else {
    pinRequiredBanner.style.display = "none";
    focusBtn.disabled = false;
    focusBtn.style.opacity = "1";
  }

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
    tabSettingsBtn.click();
    pinStatusMessage.style.color = "#f59e0b";
    pinStatusMessage.textContent = "Please set your 4-digit Emergency Exit PIN first.";
    return;
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

function showInlineUnlockModal() {
  endFocusPinContainer.style.display = "block";
  unlockPinInput.value = "";
  unlockErrorMessage.textContent = "";
  unlockPinInput.focus();
}

function handleInlineUnlock() {
  const enteredPin = unlockPinInput.value.replace(/\D/g, "");
  if (enteredPin.length !== 4) {
    unlockErrorMessage.textContent = "PIN must be exactly 4 numeric digits.";
    return;
  }

  chrome.runtime.sendMessage(
    {
      action: "endFocus",
      pin: enteredPin,
    },
    (res: any) => {
      if (chrome.runtime.lastError) return;
      if (res && res.success) {
        focusActive = false;
        updateUIForInactive();
        endFocusPinContainer.style.display = "none";
      } else {
        unlockErrorMessage.textContent = "Incorrect PIN. Focus Lock remains active.";
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
