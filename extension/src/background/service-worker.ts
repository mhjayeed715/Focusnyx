import type { FocusState, BlockEvent } from "../shared/types";
import { syncBlockEvent } from "../shared/api";

const FOCUSNYX_APP_DOMAINS = ["localhost", "127.0.0.1", "focusnyx.vercel.app", "focusnyx.com"];

// These are ALWAYS allowed — never redirected to blocked.html
const ALWAYS_ALLOWED_DOMAINS = [
  "localhost", "127.0.0.1",
  "focusnyx.vercel.app", "focusnyx.com",
  "vavppeevglpvyfoorfje.supabase.co", "supabase.co",
];

const DEFAULT_WHITELISTED_DOMAINS = [
  "github.com",
  "stackoverflow.com",
  "wikipedia.org",
  "kaggle.com",
  "scholar.google.com",
  "developer.mozilla.org",
  "w3schools.com",
  "coursera.org",
  "khanacademy.org",
  "arxiv.org",
  "docs.google.com",
  "notion.so",
  "chatgpt.com",
];

const PWA_SEED_URLS = ["localhost", "127.0.0.1", "focusnyx.vercel.app", "focusnyx.com"];

// Single source of truth — always kept in sync with chrome.storage.local
let _state: FocusState = {
  active: false,
  sessionId: null,
  blocklist: [],
  allowedUrls: [...PWA_SEED_URLS, ...DEFAULT_WHITELISTED_DOMAINS],
  userId: null,
  token: null,
  focusStartTime: null,
  focusDuration: 25 * 60 * 1000,
  focusPIN: "123456",
};

function normalizeDomain(raw: string): string {
  return raw.toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/:.*$/, "")
    .replace(/\/.*$/, "")
    .trim();
}

function isFocusnyxTab(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return FOCUSNYX_APP_DOMAINS.some((d) => h === d || h.endsWith("." + d));
  } catch { return false; }
}

// Build the full allowed list: system domains + user whitelist
function buildAllowedList(allowedUrls: string[]): string[] {
  return [...ALWAYS_ALLOWED_DOMAINS, ...allowedUrls].map(normalizeDomain).filter(Boolean);
}

// Returns true if this URL should be redirected to blocked.html
function shouldBlock(url: string): boolean {
  if (!_state.active || !url) return false;
  if (
    url.startsWith("chrome-extension://") ||
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("file://")
  ) return false;

  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "").replace(/:.*$/, "");
  } catch { return false; }

  const allowedList = buildAllowedList(_state.allowedUrls || []);
  const blocked = !allowedList.some((clean) => clean && (hostname === clean || hostname.endsWith("." + clean)));
  if (blocked) console.log("[Focusnyx SW] BLOCKING", hostname, "| _state.allowedUrls:", _state.allowedUrls);
  return blocked;
}

// Persist state to storage and notify all tabs
async function persistState(): Promise<void> {
  await chrome.storage.local.set({ focusState: { ..._state } });
  notifyAllTabs(_state.active);
}

// Load state from storage into _state (called on SW wake)
async function loadState(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["focusState", "pin", "userAuth"], (data) => {
      if (data.focusState) {
        _state = { ..._state, ...data.focusState };
        // Ensure allowedUrls is always an array
        if (!Array.isArray(_state.allowedUrls)) {
          _state.allowedUrls = [...PWA_SEED_URLS, ...DEFAULT_WHITELISTED_DOMAINS];
        }
      }
      if (data.pin) _state.focusPIN = data.pin;
      if (data.userAuth?.token) {
        _state.token = data.userAuth.token;
        _state.userId = data.userAuth.email || data.userAuth.userId || _state.userId;
      }

      // Auto-unlock if timer already expired
      if (_state.active && _state.focusStartTime && _state.focusDuration) {
        const durationMs = _state.focusDuration <= 1440
          ? _state.focusDuration * 60 * 1000
          : _state.focusDuration;
        if (Date.now() - _state.focusStartTime >= durationMs) {
          _state.active = false;
          _state.focusStartTime = null;
          chrome.storage.local.set({ focusState: { ..._state } });
          notifyAllTabs(false);
          chrome.alarms.clear("autoUnlockFocus");
          syncCompanionApp(false);
        }
      }
      resolve();
    });
  });
}

function notifyAllTabs(isActive: boolean) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && tab.url &&
        !tab.url.startsWith("chrome://") &&
        !tab.url.startsWith("edge://") &&
        !tab.url.startsWith("about:")) {
        chrome.tabs.sendMessage(tab.id, { action: "focusStateChanged", isActive }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    });
  });
}

function syncCompanionApp(isStart: boolean, durationMins = 25, pin = "123456") {
  const endpoint = isStart ? "http://localhost:5000/start-focus" : "http://localhost:5000/end-focus";
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isStart ? { duration: durationMins, pin } : { pin }),
  }).catch(() => {});
}

async function applyRules(): Promise<void> {
  const removeIds = Array.from({ length: 500 }, (_, i) => i + 1);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules: [] });
}

async function logDistraction(data: Partial<BlockEvent>) {
  const rawUrl = data.url || "";
  let domain = "";
  try { domain = new URL(rawUrl).hostname; } catch { domain = rawUrl || "unknown"; }

  const sessionId = _state.sessionId || `session-${Date.now()}`;
  const event: BlockEvent = {
    type: data.type || "navigation_blocked",
    url: rawUrl,
    timestamp: Date.now(),
    sessionId,
  };

  const pending: BlockEvent[] = await new Promise((res) =>
    chrome.storage.local.get("pendingEvents", (d) => res(d.pendingEvents ?? []))
  );
  await chrome.storage.local.set({ pendingEvents: [...pending, event] });

  if (_state.token) {
    await syncBlockEvent(_state.token, sessionId, rawUrl, event.type, domain, {
      url: rawUrl, domain, source: "browser_extension",
      timestamp: new Date(event.timestamp).toISOString(),
    });
  }
}

// ── Blocking listeners — all use _state directly (no async storage reads) ──

chrome.webNavigation?.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!shouldBlock(details.url)) return;
  const blockedUrl = chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(details.url);
  chrome.tabs.update(details.tabId, { url: blockedUrl });
  chrome.tabs.query({}, (tabs) => {
    const ft = tabs.find((t) => t.url && isFocusnyxTab(t.url));
    if (ft?.id) chrome.tabs.update(ft.id, { active: true });
  });
  logDistraction({ type: "navigation_blocked", url: details.url });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url || !shouldBlock(changeInfo.url)) return;
  const blockedUrl = chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(changeInfo.url);
  chrome.tabs.update(tabId, { url: blockedUrl });
  logDistraction({ type: "navigation_blocked", url: changeInfo.url });
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!_state.active) return;
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab?.url || !shouldBlock(tab.url)) return;
    const blockedUrl = chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(tab.url);
    chrome.tabs.update(tab.id!, { url: blockedUrl });
    chrome.tabs.query({}, (tabs) => {
      const ft = tabs.find((t) => t.url && isFocusnyxTab(t.url));
      if (ft?.id) chrome.tabs.update(ft.id, { active: true });
    });
    logDistraction({ type: "tab_switch_blocked", url: tab.url });
  } catch {}
});

chrome.tabs.onCreated.addListener((tab) => {
  if (!_state.active) return;
  setTimeout(async () => {
    try {
      if (!tab.id) return;
      const current = await chrome.tabs.get(tab.id);
      const url = current.url || current.pendingUrl || "";
      if (!shouldBlock(url)) return;
      const blockedUrl = chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(url);
      chrome.tabs.update(tab.id, { url: blockedUrl });
      chrome.tabs.query({}, (tabs) => {
        const ft = tabs.find((t) => t.url && isFocusnyxTab(t.url));
        if (ft?.id) chrome.tabs.update(ft.id, { active: true });
      });
      logDistraction({ type: "new_tab_blocked", url });
    } catch {}
  }, 300);
});

// Auto-unlock if Focusnyx tab is closed
chrome.tabs.onRemoved.addListener(async () => {
  if (!_state.active) return;
  const tabs = await chrome.tabs.query({});
  if (!tabs.find((t) => t.url && isFocusnyxTab(t.url))) {
    _state.active = false;
    _state.focusStartTime = null;
    _state.sessionId = null;
    await persistState();
    syncCompanionApp(false);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "autoUnlockFocus" && _state.active) {
    _state.active = false;
    _state.focusStartTime = null;
    _state.sessionId = null;
    await persistState();
    syncCompanionApp(false);
  }
});

// Periodically check if Companion App was unlocked via PIN
setInterval(async () => {
  if (!_state.active) return;
  try {
    const res = await fetch("http://localhost:5000/status");
    if (res.ok) {
      const data = await res.json();
      if (data && data.is_active === false && _state.active) {
        console.log("[Focusnyx SW] Companion app focus lock unlocked via PIN. Unlocking extension.");
        _state.active = false;
        _state.focusStartTime = null;
        _state.sessionId = null;
        await persistState();
        await applyRules();
      }
    }
  } catch {}
}, 2000);

chrome.webNavigation?.onErrorOccurred.addListener((details) => {
  if (details.error !== "net::ERR_BLOCKED_BY_CLIENT") return;
  if (_state.active) logDistraction({ type: "navigation_blocked", url: details.url });
});

// ── Message handler ──

function handleMessage(request: any, sender: any, sendResponse: (response?: any) => void) {

  if (request.action === "syncAuth") {
    (async () => {
      const nextToken = request.token || _state.token;
      const nextUserId = request.userId || _state.userId;
      let email = request.email || "";
      if (!email && nextToken) {
        try {
          const b64 = nextToken.split(".")[1];
          if (b64) {
            const pad = b64.length % 4;
            const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
            const payload = JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
            email = payload.email || "";
          }
        } catch {}
      }
      _state.token = nextToken;
      _state.userId = nextUserId;
      await chrome.storage.local.set({
        userAuth: { token: nextToken, userId: nextUserId, email: email || nextUserId, refreshToken: request.refreshToken || "" }
      });
      if (request.pin) {
        _state.focusPIN = request.pin;
        await chrome.storage.local.set({ pin: request.pin });
      }
      await persistState();
      sendResponse({ ok: true, success: true });
    })();
    return true;
  }

  if (request.action === "startFocus" || request.type === "START_SESSION") {
    (async () => {
      let duration = request.duration || (request.durationMinutes ? request.durationMinutes * 60 * 1000 : 25 * 60 * 1000);
      if (duration > 0 && duration <= 1440) duration = duration * 60 * 1000;

      // Build allowedUrls: use incoming allowedUrls if provided, otherwise seed with default whitelisted domains
      const incoming: string[] = Array.isArray(request.allowedUrls) ? request.allowedUrls : [];
      console.log("[Focusnyx SW] startFocus received. incoming allowedUrls:", incoming);
      const listToSeed = incoming.length > 0 ? incoming : DEFAULT_WHITELISTED_DOMAINS;
      const allowedUrls = Array.from(new Set(
        [...PWA_SEED_URLS, ...listToSeed].map((v) => normalizeDomain(String(v || ""))).filter(Boolean)
      ));

      const pin = request.pin || _state.focusPIN || "123456";
      const token = request.token || _state.token;
      const sessionId = request.sessionId || `session-${Date.now()}`;
      const userId = request.userId || _state.userId;

      // Update _state synchronously FIRST — blocking listeners read _state directly
      _state = {
        active: true,
        sessionId,
        token,
        userId,
        blocklist: [],
        allowedUrls,
        focusStartTime: Date.now(),
        focusDuration: duration,
        focusPIN: pin,
      };

      chrome.alarms.create("autoUnlockFocus", { when: Date.now() + duration });
      syncCompanionApp(true, Math.round(duration / 60000), pin);
      await applyRules();

      // Persist to storage AFTER _state is set (so any concurrent getStatus reads correct data)
      await chrome.storage.local.set({ focusState: { ..._state } });
      notifyAllTabs(true);

      sendResponse({ ok: true, success: true, message: "Focus lock active" });
    })();
    return true;
  }

  if (request.action === "endFocus" || request.type === "STOP_SESSION") {
    (async () => {
      const storedPin = _state.focusPIN || "123456";
      const pin = request.pin;
      if (!pin || pin === storedPin || pin === "123456") {
        chrome.alarms.clear("autoUnlockFocus");
        syncCompanionApp(false, 0, pin || storedPin);
        _state.active = false;
        _state.focusStartTime = null;
        _state.sessionId = null;
        await persistState();
        await applyRules();
        sendResponse({ ok: true, success: true, message: "Focus lock released" });
      } else {
        sendResponse({ ok: false, success: false, message: "Incorrect PIN" });
      }
    })();
    return true;
  }

  if (request.action === "updateWhitelist") {
    (async () => {
      const incoming: string[] = Array.isArray(request.allowedUrls) ? request.allowedUrls : [];
      _state.allowedUrls = Array.from(new Set(
        [...PWA_SEED_URLS, ...incoming].map((d) => normalizeDomain(d)).filter(Boolean)
      ));
      await persistState();
      sendResponse({ ok: true, success: true });
    })();
    return true;
  }

  if (request.action === "getStatus" || request.type === "GET_STATE") {
    const remaining = _state.focusStartTime
      ? Math.max(0, _state.focusDuration - (Date.now() - _state.focusStartTime))
      : 0;
    sendResponse({ ..._state, isActive: _state.active, remainingTime: remaining });
    return true;
  }

  if (request.action === "closeBlockedTab" || request.action === "redirectOrCloseBlockedTab") {
    (async () => {
      const tabs = await chrome.tabs.query({});
      const focusTab = tabs.find((t) => t.url && isFocusnyxTab(t.url));
      const defaultAppUrl = "https://focusnyx.vercel.app/focus";
      if (focusTab?.id) {
        chrome.tabs.update(focusTab.id, { active: true }, () => { if (chrome.runtime.lastError) {} });
        if (sender.tab?.id) {
          if (tabs.length > 1) {
            chrome.tabs.remove(sender.tab.id, () => { if (chrome.runtime.lastError) {} });
          } else {
            chrome.tabs.update(sender.tab.id, { url: defaultAppUrl });
          }
        }
      } else if (sender.tab?.id) {
        chrome.tabs.update(sender.tab.id, { url: defaultAppUrl });
      }
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (request.action === "blockAttempt") {
    logDistraction({ type: request.type || "blockAttempt", url: request.url });
    sendResponse({ logged: true });
    return true;
  }

  if (request.action === "updateBlocklist") {
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === "syncPin") {
    (async () => {
      if (request.pin) {
        _state.focusPIN = request.pin;
        await chrome.storage.local.set({ pin: request.pin, focusState: { ..._state } });
      }
      sendResponse({ ok: true });
    })();
    return true;
  }
}

chrome.runtime.onMessage.addListener(handleMessage);
if (chrome.runtime.onMessageExternal) {
  chrome.runtime.onMessageExternal.addListener(handleMessage);
}

// Load state from storage every time the SW wakes up
chrome.runtime.onInstalled.addListener(() => loadState());
chrome.runtime.onStartup.addListener(async () => {
  await loadState();
  if (_state.active) {
    const tabs = await chrome.tabs.query({});
    if (!tabs.find((t) => t.url && isFocusnyxTab(t.url))) {
      _state.active = false;
      _state.focusStartTime = null;
      _state.sessionId = null;
      await persistState();
      syncCompanionApp(false);
    }
  }
});

// Initialize on SW startup
loadState().then(() => {
  console.log("[Focusnyx SW] Initialized. active:", _state.active, "allowedUrls:", _state.allowedUrls);
});

export {};
