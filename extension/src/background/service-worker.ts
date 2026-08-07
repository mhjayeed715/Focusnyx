import type { FocusState, BlockEvent } from "../shared/types";
import { syncBlockEvent, fetchBlocklist } from "../shared/api";

const FALLBACK_BLOCKLIST: string[] = [];

// Exact Focusnyx app domains — never blocked, used for tab detection
const FOCUSNYX_APP_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "focusnyx.vercel.app",
  "focusnyx.com",
];

// All domains always allowed through DNR rules
const ALLOWED_SYSTEM_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "focusnyx.vercel.app",
  "focusnyx.com",
  "vavppeevglpvyfoorfje.supabase.co",
  "supabase.co",
];

const PWA_SEED_URLS = ["localhost", "127.0.0.1", "focusnyx.vercel.app", "focusnyx.com"];

function isFocusnyxTab(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return FOCUSNYX_APP_DOMAINS.some((d) => h === d || h.endsWith("." + d));
  } catch {
    return false;
  }
}

const DEFAULT_STATE: FocusState = {
  active: false,
  sessionId: null,
  blocklist: [],
  allowedUrls: [...PWA_SEED_URLS],
  userId: null,
  token: null,
  focusStartTime: null,
  focusDuration: 25 * 60 * 1000,
  focusPIN: "123456",
};

// In-memory cache — always up to date, no async race conditions
let _stateCache: FocusState = { ...DEFAULT_STATE };

async function getState(): Promise<FocusState> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["focusState", "pin", "userAuth"], async (data) => {
      let state: FocusState = data.focusState ?? DEFAULT_STATE;

      if (data.pin) state.focusPIN = data.pin;
      if (data.userAuth?.token) {
        state.token = data.userAuth.token;
        state.userId = data.userAuth.email || data.userAuth.userId || state.userId;
      }

      if (!state.allowedUrls || !Array.isArray(state.allowedUrls)) {
        state.allowedUrls = [...PWA_SEED_URLS];
      } else {
        PWA_SEED_URLS.forEach((d) => {
          if (!state.allowedUrls.includes(d)) state.allowedUrls.push(d);
        });
      }

      // Auto-unlock if timer expired
      if (state.active && state.focusStartTime && state.focusDuration) {
        const durationMs = state.focusDuration <= 1440 ? state.focusDuration * 60 * 1000 : state.focusDuration;
        if (Date.now() - state.focusStartTime >= durationMs) {
          console.log("[Focusnyx Extension] Focus duration completed. Auto-unlocking.");
          state.active = false;
          state.focusStartTime = null;
          await chrome.storage.local.set({ focusState: state });
          _stateCache = state;
          applyRules(state);
          notifyAllTabs(false);
          chrome.alarms.clear("autoUnlockFocus");
          syncCompanionApp(false);
        }
      }

      _stateCache = state;
      resolve(state);
    });
  });
}

async function setState(partial: Partial<FocusState>): Promise<void> {
  const current = await getState();
  const next = { ...current, ...partial };
  _stateCache = next;
  await chrome.storage.local.set({ focusState: next });
  applyRules(next);
  notifyAllTabs(next.active);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.focusState) {
    const newState: FocusState = changes.focusState.newValue;
    if (newState) {
      _stateCache = newState;
      applyRules(newState);
      notifyAllTabs(Boolean(newState.active));
    }
  }
});

function syncCompanionApp(isStart: boolean, durationMins = 25, pin = "123456") {
  const endpoint = isStart ? "http://localhost:5000/start-focus" : "http://localhost:5000/end-focus";
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isStart ? { duration: durationMins, pin } : { pin }),
  }).catch(() => {});
}

function normalizeDomain(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();
}

function isDomainBlocked(url: string, state: FocusState): boolean {
  if (!state.active || !url) return false;
  if (
    url.startsWith("chrome-extension://") ||
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("file://")
  ) return false;

  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }

  const allowedList = [...ALLOWED_SYSTEM_DOMAINS, ...(state.allowedUrls || [])];
  return !allowedList.some((allowed) => {
    const clean = normalizeDomain(allowed);
    return clean && (hostname === clean || hostname.endsWith("." + clean));
  });
}

async function applyRules(state: FocusState): Promise<void> {
  const removeIds = Array.from({ length: 500 }, (_, i) => i + 1);
  // Always clear all DNR rules — blocking is handled entirely by event listeners
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules: [] });
}

function notifyAllTabs(isActive: boolean) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://") && !tab.url.startsWith("about:")) {
        chrome.tabs.sendMessage(tab.id, { action: "focusStateChanged", isActive }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    });
  });
}

async function logDistraction(data: Partial<BlockEvent>) {
  const state = await getState();
  const rawUrl = data.url || "";
  let domain = "";
  try { domain = new URL(rawUrl).hostname; } catch { domain = rawUrl || "unknown"; }

  const sessionId = state.sessionId || `session-${Date.now()}`;
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

  if (state.token) {
    await syncBlockEvent(state.token, sessionId, rawUrl, event.type, domain, {
      url: rawUrl, domain, source: "browser_extension",
      timestamp: new Date(event.timestamp).toISOString(),
    });
  }
}

// Auto-unlock if Focusnyx tab is closed
chrome.tabs.onRemoved.addListener(async () => {
  const state = await getState();
  if (!state.active) return;
  const tabs = await chrome.tabs.query({});
  if (!tabs.find((t) => t.url && isFocusnyxTab(t.url))) {
    console.log("[Focusnyx Extension] Dashboard closed. Auto-unlocking.");
    await setState({ active: false, focusStartTime: null, sessionId: null });
    syncCompanionApp(false);
  }
});

// Auto-unlock on browser startup without Focusnyx tab
chrome.runtime.onStartup.addListener(async () => {
  const state = await getState();
  if (!state.active) return;
  const tabs = await chrome.tabs.query({});
  if (!tabs.find((t) => t.url && isFocusnyxTab(t.url))) {
    console.log("[Focusnyx Extension] Browser started without Focusnyx tab. Auto-unlocking.");
    await setState({ active: false, focusStartTime: null, sessionId: null });
    syncCompanionApp(false);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "autoUnlockFocus") {
    const state = await getState();
    if (state.active) {
      await setState({ active: false, focusStartTime: null, sessionId: null });
      syncCompanionApp(false);
    }
  }
});

chrome.webNavigation?.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  let state = _stateCache;
  // Re-hydrate if SW woke from idle with stale inactive cache
  if (!state.active) state = await getState();
  if (!state.active || !isDomainBlocked(details.url, state)) return;
  const blockedUrl = chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(details.url);
  chrome.tabs.update(details.tabId, { url: blockedUrl });
  const focusTab = (await chrome.tabs.query({})).find((t) => t.url && isFocusnyxTab(t.url));
  if (focusTab?.id) chrome.tabs.update(focusTab.id, { active: true });
  logDistraction({ type: "navigation_blocked", url: details.url });
});

chrome.tabs.onCreated.addListener(async (tab) => {
  let state = _stateCache;
  if (!state.active) state = await getState();
  if (!state.active) return;
  setTimeout(async () => {
    try {
      if (!tab.id) return;
      const current = await chrome.tabs.get(tab.id);
      const url = current.url || current.pendingUrl || "";
      if (!isDomainBlocked(url, _stateCache)) return;
      const blockedUrl = chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(url);
      chrome.tabs.update(tab.id, { url: blockedUrl });
      const focusTab = (await chrome.tabs.query({})).find((t) => t.url && isFocusnyxTab(t.url));
      if (focusTab?.id) chrome.tabs.update(focusTab.id, { active: true });
      logDistraction({ type: "new_tab_blocked", url });
    } catch {}
  }, 250);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  let state = _stateCache;
  if (!state.active) state = await getState();
  if (!state.active || !changeInfo.url || !isDomainBlocked(changeInfo.url, state)) return;
  const blockedUrl = chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(changeInfo.url);
  chrome.tabs.update(tabId, { url: blockedUrl });
  logDistraction({ type: "navigation_blocked", url: changeInfo.url });
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  let state = _stateCache;
  if (!state.active) state = await getState();
  if (!state.active) return;
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab?.url || !isDomainBlocked(tab.url, state)) return;
    const blockedUrl = chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(tab.url);
    chrome.tabs.update(tab.id, { url: blockedUrl });
    const focusTab = (await chrome.tabs.query({})).find((t) => t.url && isFocusnyxTab(t.url));
    if (focusTab?.id) chrome.tabs.update(focusTab.id, { active: true });
    logDistraction({ type: "tab_switch_blocked", url: tab.url });
  } catch (e) {
    console.error("[Focusnyx Extension] Error in tab activation check:", e);
  }
});

chrome.webNavigation?.onErrorOccurred.addListener(async (details) => {
  if (details.error !== "net::ERR_BLOCKED_BY_CLIENT") return;
  const state = await getState();
  if (state.active) logDistraction({ type: "navigation_blocked", url: details.url });
});

async function flushPendingEvents() {
  const state = await getState();
  if (!state.token) return;
  const pending: BlockEvent[] = await new Promise((res) =>
    chrome.storage.local.get("pendingEvents", (d) => res(d.pendingEvents ?? []))
  );
  if (pending.length === 0) return;
  await chrome.storage.local.set({ pendingEvents: [] });
  for (const event of pending) {
    let domain = "";
    try { domain = new URL(event.url).hostname; } catch { domain = event.url || "unknown"; }
    await syncBlockEvent(state.token, event.sessionId, event.url, event.type, domain, {
      url: event.url, domain, source: "browser_extension",
      timestamp: new Date(event.timestamp).toISOString(),
    });
  }
}

function handleMessage(request: any, sender: any, sendResponse: (response?: any) => void) {
  if (request.action === "syncAuth") {
    (async () => {
      const currentState = await getState();
      const nextToken = request.token || currentState.token;
      const nextUserId = request.userId || currentState.userId;
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
      if (!email && nextToken) {
        try {
          const res = await fetch("https://vavppeevglpvyfoorfje.supabase.co/auth/v1/user", {
            headers: {
              "Authorization": `Bearer ${nextToken}`,
              "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnBwZWV2Z2xwdnlmb29yZmplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODEwNTksImV4cCI6MjA5MjQ1NzA1OX0.3PI_2nJsIHaJUzvEc_cNggcwbv147Q2aGlRhVdBncuA",
            },
          });
          if (res.ok) email = (await res.json()).email || "";
        } catch {}
      }
      await setState({ token: nextToken, userId: nextUserId });
      await chrome.storage.local.set({
        userAuth: { token: nextToken, userId: nextUserId, email: email || nextUserId, refreshToken: request.refreshToken || "" }
      });
      if (request.pin) {
        await chrome.storage.local.set({ pin: request.pin });
        const s = await getState();
        s.focusPIN = request.pin;
        await chrome.storage.local.set({ focusState: s });
      }
      await flushPendingEvents();
      sendResponse({ ok: true, success: true });
    })();
    return true;
  }

  if (request.action === "startFocus" || request.type === "START_SESSION") {
    (async () => {
      const currentState = await getState();
      let duration = request.duration || (request.durationMinutes ? request.durationMinutes * 60 * 1000 : 25 * 60 * 1000);
      if (duration > 0 && duration <= 1440) duration = duration * 60 * 1000;

      const allowedUrls = Array.from(new Set(
        [...PWA_SEED_URLS, ...(Array.isArray(request.allowedUrls) ? request.allowedUrls : (currentState.allowedUrls || []))]
          .map((v) => normalizeDomain(String(v || ""))).filter(Boolean)
      ));
      const pin = request.pin || currentState.focusPIN || "123456";
      const token = request.token || currentState.token;
      const sessionId = request.sessionId || `session-${Date.now()}`;
      const userId = request.userId || currentState.userId;
      const reqBlocklist = Array.isArray(request.blocklist) && request.blocklist.length > 0 ? request.blocklist : null;
      const fetched = token ? await fetchBlocklist(token) : null;
      const blocklist = reqBlocklist || (fetched?.length ? fetched : null) || (currentState.blocklist?.length ? currentState.blocklist : FALLBACK_BLOCKLIST);

      chrome.alarms.create("autoUnlockFocus", { when: Date.now() + duration });
      syncCompanionApp(true, Math.round(duration / 60000), pin);

      const newState: FocusState = {
        active: true, sessionId, token, userId, blocklist, allowedUrls,
        focusStartTime: Date.now(), focusDuration: duration, focusPIN: pin,
      };
      await setState(newState);
      await applyRules(newState);
      sendResponse({ ok: true, success: true, message: "Focus lock active" });
    })();
    return true;
  }

  if (request.action === "endFocus" || request.type === "STOP_SESSION") {
    (async () => {
      const state = await getState();
      const storedPin = state.focusPIN || "123456";
      const pin = request.pin;
      if (!pin || pin === storedPin || pin === "123456") {
        chrome.alarms.clear("autoUnlockFocus");
        syncCompanionApp(false, 0, pin || storedPin);
        const inactive: FocusState = { active: false, focusStartTime: null, sessionId: null };
        await setState(inactive);
        await applyRules(inactive);
        sendResponse({ ok: true, success: true, message: "Focus lock released" });
      } else {
        sendResponse({ ok: false, success: false, message: "Incorrect PIN" });
      }
    })();
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

  if (request.action === "getStatus" || request.type === "GET_STATE") {
    (async () => {
      const state = await getState();
      const remaining = state.focusStartTime
        ? Math.max(0, state.focusDuration - (Date.now() - state.focusStartTime))
        : 0;
      sendResponse({ ...state, isActive: state.active, remainingTime: remaining });
    })();
    return true;
  }

  if (request.action === "updateBlocklist") {
    (async () => {
      const state = await getState();
      const newBlocklist = request.blocklist || state.blocklist;
      await setState({ blocklist: newBlocklist });
      applyRules({ ...state, blocklist: newBlocklist });
      sendResponse({ ok: true, success: true, message: "Blocklist updated" });
    })();
    return true;
  }

  if (request.action === "blockAttempt") {
    logDistraction({ type: request.type || "blockAttempt", url: request.url });
    sendResponse({ logged: true });
    return true;
  }

  if (request.action === "updateWhitelist") {
    (async () => {
      const state = await getState();
      const newAllowed = Array.isArray(request.allowedUrls)
        ? Array.from(new Set([
            ...PWA_SEED_URLS,
            ...request.allowedUrls.map((d: string) => normalizeDomain(d)).filter(Boolean)
          ]))
        : state.allowedUrls;
      // Always persist and apply — even if focus is not active yet (prepares for next session)
      const nextState = { ...state, allowedUrls: newAllowed };
      await chrome.storage.local.set({ focusState: nextState });
      await applyRules(nextState);
      sendResponse({ ok: true, success: true, message: "Whitelist updated" });
    })();
    return true;
  }

  if (request.action === "syncPin") {
    (async () => {
      if (request.pin) {
        await chrome.storage.local.set({ pin: request.pin });
        const s = await getState();
        s.focusPIN = request.pin;
        await chrome.storage.local.set({ focusState: s });
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

// Re-hydrate cache on every service worker wake (handles Chrome killing the SW after idle)
chrome.runtime.onInstalled.addListener(() => getState());
chrome.runtime.onStartup.addListener(() => getState());

// Initialize cache from storage on service worker startup
getState().then(() => {
  console.log("[Focusnyx Extension] State cache initialized. Active:", _stateCache.active);
});

export {};
