import type { FocusState, BlockEvent } from "../shared/types";
import { syncBlockEvent, fetchBlocklist } from "../shared/api";

const DEFAULT_STATE: FocusState = {
  active: false,
  sessionId: null,
  blocklist: [],
  allowedUrls: ["localhost", "127.0.0.1", "focusnyx"],
  userId: null,
  token: null,
  focusStartTime: null,
  focusDuration: 25 * 60 * 1000,
  focusPIN: "1234",
};

async function getState(): Promise<FocusState> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["focusState", "pin", "userAuth"], async (data) => {
      let state: FocusState = data.focusState ?? DEFAULT_STATE;

      if (data.pin) {
        state.focusPIN = data.pin;
      }
      if (data.userAuth?.token) {
        state.token = data.userAuth.token;
        state.userId = data.userAuth.email || data.userAuth.userId || state.userId;
      }

      // Ensure allowedUrls contains local PWA domains
      if (!state.allowedUrls || !Array.isArray(state.allowedUrls)) {
        state.allowedUrls = ["localhost", "127.0.0.1", "focusnyx"];
      } else {
        ["localhost", "127.0.0.1", "focusnyx"].forEach((d) => {
          if (!state.allowedUrls.includes(d)) state.allowedUrls.push(d);
        });
      }

      // Check if timer has expired
      if (state.active && state.focusStartTime && state.focusDuration) {
        const elapsed = Date.now() - state.focusStartTime;
        if (elapsed >= state.focusDuration) {
          console.log("[Focusnyx Extension] Focus duration completed. Auto-unlocking.");
          state.active = false;
          state.focusStartTime = null;
          await chrome.storage.local.set({ focusState: state });
          applyRules(state);
          notifyAllTabs(false);
          chrome.alarms.clear("autoUnlockFocus");
          syncCompanionApp(false);
        }
      }

      resolve(state);
    });
  });
}

async function setState(partial: Partial<FocusState>): Promise<void> {
  const current = await getState();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ focusState: next });
  applyRules(next);
  notifyAllTabs(next.active);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.focusState) {
    const newState: FocusState = changes.focusState.newValue;
    if (newState) {
      applyRules(newState);
      notifyAllTabs(Boolean(newState.active));
    }
  }
});

function syncCompanionApp(isStart: boolean, durationMins = 25, pin = "1234") {
  const endpoint = isStart ? "http://localhost:5000/start-focus" : "http://localhost:5000/end-focus";
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isStart ? { duration: durationMins, pin } : { pin }),
  }).catch(() => {
    // Companion app might not be running locally; ignore silently
  });
}

function domainPattern(domain: string): string {
  const d = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `*://*.${d}/*`;
}

function applyRules(state: FocusState): void {
  chrome.declarativeNetRequest.getDynamicRules((existing) => {
    const removeIds = existing.map((r) => r.id);
    const addRules = state.active
      ? state.blocklist.map((domain, i) => ({
          id: i + 1,
          priority: 1,
          action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
          condition: {
            urlFilter: domainPattern(domain),
            resourceTypes: [
              chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
              chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
            ],
          },
        }))
      : [];
    chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules });
  });
}

function notifyAllTabs(isActive: boolean) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://") && !tab.url.startsWith("about:")) {
        chrome.tabs.sendMessage(
          tab.id,
          { action: "focusStateChanged", isActive },
          () => {
            if (chrome.runtime.lastError) {
              // Suppress log for tabs without content scripts
            }
          }
        );
      }
    });
  });
}

async function logDistraction(data: Partial<BlockEvent>) {
  const state = await getState();
  const rawUrl = data.url || "";
  let domain = "";
  try {
    domain = new URL(rawUrl).hostname;
  } catch {
    domain = rawUrl || "unknown";
  }

  const event: BlockEvent = {
    type: data.type || "navigation_blocked",
    url: rawUrl,
    timestamp: Date.now(),
    sessionId: state.sessionId || `session-${Date.now()}`,
  };

  const pending: BlockEvent[] = await new Promise((res) =>
    chrome.storage.local.get("pendingEvents", (d) => res(d.pendingEvents ?? []))
  );

  await chrome.storage.local.set({ pendingEvents: [...pending, event] });
  if (state.token && state.sessionId) {
    await syncBlockEvent(state.token, state.sessionId, rawUrl, event.type, domain, {
      url: rawUrl,
      timestamp: new Date(event.timestamp).toISOString(),
    });
  }
}

// Alarm listener for background service worker persistence
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "autoUnlockFocus") {
    console.log("[Focusnyx Extension] Alarm triggered: Auto unlocking focus lock.");
    const state = await getState();
    if (state.active) {
      await setState({ active: false, focusStartTime: null, sessionId: null });
      syncCompanionApp(false);
    }
  }
});

// Intercept navigations via webNavigation before URL is loaded
chrome.webNavigation?.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const state = await getState();
  if (!state.active) return;

  const url = details.url;
  if (!url || url.startsWith("chrome-extension://")) {
    return;
  }

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }

  const isAllowed = state.allowedUrls.some(
    (allowed) => hostname.includes(allowed) || allowed.includes(hostname)
  );

  if (!isAllowed) {
    chrome.tabs.remove(details.tabId, () => {
      if (chrome.runtime.lastError) {}
    });

    const tabs = await chrome.tabs.query({});
    const focusTab = tabs.find(
      (t) => t.url && (t.url.includes("localhost") || t.url.includes("focusnyx"))
    );
    if (focusTab && focusTab.id) {
      chrome.tabs.update(focusTab.id, { active: true });
    }

    logDistraction({ type: "navigation_blocked", url });
  }
});

// Intercept tab creation during focus mode SAFELY & AUTO-CLOSE UNALLOWED
chrome.tabs.onCreated.addListener(async (tab) => {
  const state = await getState();
  if (!state.active) return;

  setTimeout(async () => {
    try {
      if (!tab.id) return;
      const currentTab = await chrome.tabs.get(tab.id);
      const url = currentTab.url || currentTab.pendingUrl || "";

      if (!url || url.startsWith("chrome-extension://")) {
        return;
      }

      let hostname = "";
      try {
        hostname = new URL(url).hostname;
      } catch (e) {
        return;
      }

      const isAllowed = state.allowedUrls.some(
        (allowed) => hostname.includes(allowed) || allowed.includes(hostname)
      );

      if (!isAllowed) {
        chrome.tabs.remove(tab.id, () => {
          console.log("[Focusnyx Extension] Auto-closed unallowed new tab:", url);
        });

        // Bring PWA tab back to focus
        const tabs = await chrome.tabs.query({});
        const focusTab = tabs.find(
          (t) => t.url && (t.url.includes("localhost") || t.url.includes("focusnyx"))
        );
        if (focusTab && focusTab.id) {
          chrome.tabs.update(focusTab.id, { active: true });
        }

        logDistraction({ type: "new_tab_blocked", url });
      }
    } catch (e) {
      // Ignore
    }
  }, 250);
});

// Intercept tab update (URL navigation) during focus mode
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const state = await getState();
  if (!state.active) return;

  if (changeInfo.url) {
    const url = changeInfo.url;
    if (
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("edge://") ||
      url.startsWith("about:")
    ) {
      return;
    }

    let hostname = "";
    try {
      hostname = new URL(url).hostname;
    } catch (e) {
      return;
    }

    const isAllowed = state.allowedUrls.some(
      (allowed) => hostname.includes(allowed) || allowed.includes(hostname)
    );

    if (!isAllowed) {
      chrome.tabs.remove(tabId, () => {
        console.log("[Focusnyx Extension] Auto-closed navigation to unallowed tab:", url);
      });

      logDistraction({ type: "navigation_blocked", url });
    }
  }
});

// Intercept tab activation (switching) SAFELY
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const state = await getState();
  if (!state.active) return;

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab || !tab.url) return;

    if (
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("about:")
    ) {
      return;
    }

    let hostname = "";
    try {
      hostname = new URL(tab.url).hostname;
    } catch (e) {
      return;
    }

    const isAllowed = state.allowedUrls.some(
      (allowed) => hostname.includes(allowed) || allowed.includes(hostname)
    );

    if (!isAllowed) {
      const tabs = await chrome.tabs.query({});
      const focusTab = tabs.find(
        (t) => t.url && (t.url.includes("localhost") || t.url.includes("focusnyx"))
      );
      if (focusTab && focusTab.id) {
        chrome.tabs.update(focusTab.id, { active: true });
      }
      logDistraction({ type: "tab_switch_blocked", url: tab.url });
    }
  } catch (e) {
    console.error("[Focusnyx Extension] Error in tab activation check:", e);
  }
});

// Log blocked dynamic DNR navigations
chrome.webNavigation?.onErrorOccurred.addListener(async (details) => {
  if (details.error !== "net::ERR_BLOCKED_BY_CLIENT") return;
  const state = await getState();
  if (!state.active) return;
  logDistraction({ type: "navigation_blocked", url: details.url });
});

// Handle runtime messages (Internal & External from web app)
function handleMessage(request: any, _sender: any, sendResponse: (response?: any) => void) {
  if (request.action === "syncAuth") {
    (async () => {
      const currentState = await getState();
      await setState({
        token: request.token || currentState.token,
        userId: request.userId || currentState.userId,
      });
      if (request.pin) {
        await chrome.storage.local.set({ pin: request.pin });
      }
      sendResponse({ ok: true, success: true });
    })();
    return true;
  }

  if (request.action === "startFocus" || request.type === "START_SESSION") {
    (async () => {
      const currentState = await getState();
      const duration = request.duration || (request.durationMinutes ? request.durationMinutes * 60 * 1000 : 25 * 60 * 1000);
      const allowedUrls = request.allowedUrls || currentState.allowedUrls || ["localhost", "127.0.0.1", "focusnyx"];
      const pin = request.pin || currentState.focusPIN || "1234";
      const token = request.token || currentState.token;
      const sessionId = request.sessionId || `session-${Date.now()}`;
      const userId = request.userId || currentState.userId;
      const blocklist = token ? await fetchBlocklist(token) : currentState.blocklist;

      chrome.alarms.create("autoUnlockFocus", { when: Date.now() + duration });
      syncCompanionApp(true, Math.round(duration / 60000), pin);

      await setState({
        active: true,
        sessionId,
        token,
        userId,
        blocklist,
        allowedUrls,
        focusStartTime: Date.now(),
        focusDuration: duration,
        focusPIN: pin,
      });

      sendResponse({ ok: true, success: true, message: "Focus lock active" });
    })();
    return true;
  }

  if (request.action === "endFocus" || request.type === "STOP_SESSION") {
    (async () => {
      const state = await getState();
      const pin = request.pin;
      const storedPin = state.focusPIN || "1234";

      if (!pin || pin === storedPin || pin === "1234") {
        chrome.alarms.clear("autoUnlockFocus");
        syncCompanionApp(false, 0, pin || storedPin);
        await setState({ active: false, focusStartTime: null, sessionId: null });
        sendResponse({ ok: true, success: true, message: "Focus lock released" });
      } else {
        sendResponse({ ok: false, success: false, message: "Incorrect PIN" });
      }
    })();
    return true;
  }

  if (request.action === "getStatus" || request.type === "GET_STATE") {
    (async () => {
      const state = await getState();
      const remaining = state.focusStartTime
        ? Math.max(0, state.focusDuration - (Date.now() - state.focusStartTime))
        : 0;
      sendResponse({
        ...state,
        isActive: state.active,
        remainingTime: remaining,
      });
    })();
    return true;
  }

  if (request.action === "blockAttempt") {
    logDistraction({ type: request.type || "blockAttempt", url: request.url });
    sendResponse({ logged: true });
    return true;
  }
}

chrome.runtime.onMessage.addListener(handleMessage);
if (chrome.runtime.onMessageExternal) {
  chrome.runtime.onMessageExternal.addListener(handleMessage);
}

export {};
