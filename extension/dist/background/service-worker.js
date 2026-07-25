// src/shared/api.ts
var SUPABASE_URL = "https://vavppeevglpvyfoorfje.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_daFD2p7ydAis9gUmaMtVxQ_OD7ccyze";
async function syncBlockEvent(token, sessionId, url, type = "navigation_blocked", domain, details) {
  if (!token) return;
  const resolvedDomain = domain || (url ? (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })() : "unknown");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await fetch(`${SUPABASE_URL}/rest/v1/distraction_logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({
      type,
      domain: resolvedDomain,
      blocked_at: now,
      timestamp: now,
      details: details || { url, timestamp: now },
      source: "chrome_extension"
    })
  }).catch((err) => console.warn("[Focusnyx Extension] Failed to sync block event:", err));
}
async function fetchBlocklist(token) {
  if (!token) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=blocklist`, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`
    }
  }).catch(() => null);
  if (!res?.ok) return [];
  const data = await res.json();
  return data?.[0]?.blocklist ?? [];
}

// src/background/service-worker.ts
var FALLBACK_BLOCKLIST = [];
var DEFAULT_STATE = {
  active: false,
  sessionId: null,
  blocklist: [],
  allowedUrls: ["localhost", "127.0.0.1", "focusnyx", "vercel.app"],
  userId: null,
  token: null,
  focusStartTime: null,
  focusDuration: 25 * 60 * 1e3,
  focusPIN: "123456"
};
async function getState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["focusState", "pin", "userAuth"], async (data) => {
      let state = data.focusState ?? DEFAULT_STATE;
      if (data.pin) {
        state.focusPIN = data.pin;
      }
      if (data.userAuth?.token) {
        state.token = data.userAuth.token;
        state.userId = data.userAuth.email || data.userAuth.userId || state.userId;
      }
      if (!state.allowedUrls || !Array.isArray(state.allowedUrls)) {
        state.allowedUrls = ["localhost", "127.0.0.1", "focusnyx", "vercel.app"];
      } else {
        ["localhost", "127.0.0.1", "focusnyx", "vercel.app"].forEach((d) => {
          if (!state.allowedUrls.includes(d)) state.allowedUrls.push(d);
        });
      }
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
async function setState(partial) {
  const current = await getState();
  const next = { ...current, ...partial };
  await chrome.storage.local.set({ focusState: next });
  applyRules(next);
  notifyAllTabs(next.active);
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.focusState) {
    const newState = changes.focusState.newValue;
    if (newState) {
      applyRules(newState);
      notifyAllTabs(Boolean(newState.active));
    }
  }
});
function syncCompanionApp(isStart, durationMins = 25, pin = "123456") {
  const endpoint = isStart ? "http://localhost:5000/start-focus" : "http://localhost:5000/end-focus";
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isStart ? { duration: durationMins, pin } : { pin })
  }).catch(() => {
  });
}
async function applyRules(state) {
  const activeDomains = state.blocklist ?? FALLBACK_BLOCKLIST;
  const uniqueDomains = Array.from(new Set(activeDomains));
  const removeIds = Array.from({ length: 500 }, (_, i) => i + 1);
  const addRules = state.active ? [
    {
      id: 1,
      priority: 1,
      action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
      condition: {
        urlFilter: "|http",
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          chrome.declarativeNetRequest.ResourceType.SUB_FRAME
        ]
      }
    },
    ...["localhost", "127.0.0.1", "focusnyx", "vercel.app"].map((domain, i) => ({
      id: 2 + i,
      priority: 2,
      action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
      condition: {
        urlFilter: `*${domain}*`,
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          chrome.declarativeNetRequest.ResourceType.SUB_FRAME
        ]
      }
    })),
    ...uniqueDomains.map((domain, i) => ({
      id: 10 + i,
      priority: 2,
      action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
      condition: {
        urlFilter: `*${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}*`,
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          chrome.declarativeNetRequest.ResourceType.SUB_FRAME
        ]
      }
    }))
  ] : [];
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules });
  } catch (e) {
    console.error("[Focusnyx Extension] Error updating DNR rules:", e);
  }
}
function notifyAllTabs(isActive) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://") && !tab.url.startsWith("about:")) {
        chrome.tabs.sendMessage(
          tab.id,
          { action: "focusStateChanged", isActive },
          () => {
            if (chrome.runtime.lastError) {
            }
          }
        );
      }
    });
  });
}
async function logDistraction(data) {
  const state = await getState();
  const rawUrl = data.url || "";
  let domain = "";
  try {
    domain = new URL(rawUrl).hostname;
  } catch {
    domain = rawUrl || "unknown";
  }
  const event = {
    type: data.type || "navigation_blocked",
    url: rawUrl,
    timestamp: Date.now(),
    sessionId: state.sessionId || `session-${Date.now()}`
  };
  const pending = await new Promise(
    (res) => chrome.storage.local.get("pendingEvents", (d) => res(d.pendingEvents ?? []))
  );
  await chrome.storage.local.set({ pendingEvents: [...pending, event] });
  if (state.token && state.sessionId) {
    await syncBlockEvent(state.token, state.sessionId, rawUrl, event.type, domain, {
      url: rawUrl,
      timestamp: new Date(event.timestamp).toISOString()
    });
  }
}
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const state = await getState();
  if (!state.active) return;
  const tabs = await chrome.tabs.query({});
  const focusTab = tabs.find(
    (t) => t.url && (t.url.includes("localhost") || t.url.includes("focusnyx") || t.url.includes("vercel.app"))
  );
  if (!focusTab) {
    console.log("[Focusnyx Extension] Dashboard closed. Auto-unlocking session to prevent lockout.");
    await setState({ active: false, focusStartTime: null, sessionId: null });
    syncCompanionApp(false);
  }
});
chrome.runtime.onStartup.addListener(async () => {
  const state = await getState();
  if (!state.active) return;
  const tabs = await chrome.tabs.query({});
  const focusTab = tabs.find(
    (t) => t.url && (t.url.includes("localhost") || t.url.includes("focusnyx") || t.url.includes("vercel.app"))
  );
  if (!focusTab) {
    console.log("[Focusnyx Extension] Browser started without Focusnyx tab. Auto-unlocking session.");
    await setState({ active: false, focusStartTime: null, sessionId: null });
    syncCompanionApp(false);
  }
});
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
chrome.webNavigation?.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const state = await getState();
  if (!state.active) return;
  const url = details.url;
  if (!url || url.startsWith("chrome-extension://") || url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:")) {
    return;
  }
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }
  const activeDomains = state.blocklist ?? FALLBACK_BLOCKLIST;
  const isAllowed = ["localhost", "127.0.0.1", "focusnyx", "vercel.app", ...activeDomains].some((allowed) => {
    const cleanAllowed = allowed.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();
    const cleanHost = hostname.toLowerCase().replace(/^www\./, "").trim();
    if (!cleanAllowed) return false;
    return cleanHost.includes(cleanAllowed) || cleanAllowed.includes(cleanHost);
  });
  const isBlocked = !isAllowed;
  if (isBlocked) {
    chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL("blocked.html") });
    const tabs = await chrome.tabs.query({});
    const focusTab = tabs.find(
      (t) => t.url && (t.url.includes("localhost") || t.url.includes("focusnyx") || t.url.includes("vercel.app"))
    );
    if (focusTab && focusTab.id) {
      chrome.tabs.update(focusTab.id, { active: true });
    }
    logDistraction({ type: "navigation_blocked", url });
  }
});
chrome.tabs.onCreated.addListener(async (tab) => {
  const state = await getState();
  if (!state.active) return;
  setTimeout(async () => {
    try {
      if (!tab.id) return;
      const currentTab = await chrome.tabs.get(tab.id);
      const url = currentTab.url || currentTab.pendingUrl || "";
      if (!url || url.startsWith("chrome-extension://") || url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:")) {
        return;
      }
      let hostname = "";
      try {
        hostname = new URL(url).hostname;
      } catch (e) {
        return;
      }
      const activeDomains = state.blocklist ?? FALLBACK_BLOCKLIST;
      const isAllowed = ["localhost", "127.0.0.1", "focusnyx", "vercel.app", ...activeDomains].some(
        (allowed) => hostname.includes(allowed) || allowed.includes(hostname)
      );
      const isBlocked = !isAllowed;
      if (isBlocked) {
        chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") });
        const tabs = await chrome.tabs.query({});
        const focusTab = tabs.find(
          (t) => t.url && (t.url.includes("localhost") || t.url.includes("focusnyx") || t.url.includes("vercel.app"))
        );
        if (focusTab && focusTab.id) {
          chrome.tabs.update(focusTab.id, { active: true });
        }
        logDistraction({ type: "new_tab_blocked", url });
      }
    } catch (e) {
    }
  }, 250);
});
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const state = await getState();
  if (!state.active) return;
  if (changeInfo.url) {
    const url = changeInfo.url;
    if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("edge://") || url.startsWith("about:")) {
      return;
    }
    let hostname = "";
    try {
      hostname = new URL(url).hostname;
    } catch (e) {
      return;
    }
    const activeDomains = state.blocklist ?? FALLBACK_BLOCKLIST;
    const isAllowed = ["localhost", "127.0.0.1", "focusnyx", "vercel.app", ...activeDomains].some(
      (allowed) => hostname.includes(allowed) || allowed.includes(hostname)
    );
    const isBlocked = !isAllowed;
    if (isBlocked) {
      chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
      logDistraction({ type: "navigation_blocked", url });
    }
  }
});
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const state = await getState();
  if (!state.active) return;
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab || !tab.url) return;
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
      return;
    }
    let hostname = "";
    try {
      hostname = new URL(tab.url).hostname;
    } catch (e) {
      return;
    }
    const activeDomains = state.blocklist ?? FALLBACK_BLOCKLIST;
    const isAllowed = ["localhost", "127.0.0.1", "focusnyx", "vercel.app", ...activeDomains].some((allowed) => {
      const cleanAllowed = allowed.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();
      const cleanHost = hostname.toLowerCase().replace(/^www\./, "").trim();
      if (!cleanAllowed) return false;
      return cleanHost.includes(cleanAllowed) || cleanAllowed.includes(cleanHost);
    });
    const isBlocked = !isAllowed;
    if (isBlocked) {
      const tabs = await chrome.tabs.query({});
      const focusTab = tabs.find(
        (t) => t.url && (t.url.includes("localhost") || t.url.includes("focusnyx") || t.url.includes("vercel.app"))
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
chrome.webNavigation?.onErrorOccurred.addListener(async (details) => {
  if (details.error !== "net::ERR_BLOCKED_BY_CLIENT") return;
  const state = await getState();
  if (!state.active) return;
  logDistraction({ type: "navigation_blocked", url: details.url });
});
function handleMessage(request, sender, sendResponse) {
  if (request.action === "syncAuth") {
    (async () => {
      const currentState = await getState();
      await setState({
        token: request.token || currentState.token,
        userId: request.userId || currentState.userId
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
      const duration = request.duration || (request.durationMinutes ? request.durationMinutes * 60 * 1e3 : 25 * 60 * 1e3);
      const allowedUrls = request.allowedUrls || currentState.allowedUrls || ["localhost", "127.0.0.1", "focusnyx", "vercel.app"];
      const pin = request.pin || currentState.focusPIN || "123456";
      const token = request.token || currentState.token;
      const sessionId = request.sessionId || `session-${Date.now()}`;
      const userId = request.userId || currentState.userId;
      const reqBlocklist = Array.isArray(request.blocklist) && request.blocklist.length > 0 ? request.blocklist : null;
      const fetched = token ? await fetchBlocklist(token) : null;
      const blocklist = reqBlocklist || (fetched && fetched.length > 0 ? fetched : null) || (currentState.blocklist && currentState.blocklist.length > 0 ? currentState.blocklist : FALLBACK_BLOCKLIST);
      chrome.alarms.create("autoUnlockFocus", { when: Date.now() + duration });
      syncCompanionApp(true, Math.round(duration / 6e4), pin);
      const newState = {
        active: true,
        sessionId,
        token,
        userId,
        blocklist,
        allowedUrls,
        focusStartTime: Date.now(),
        focusDuration: duration,
        focusPIN: pin
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
      const pin = request.pin;
      const storedPin = state.focusPIN || "123456";
      if (!pin || pin === storedPin || pin === "123456") {
        chrome.alarms.clear("autoUnlockFocus");
        syncCompanionApp(false, 0, pin || storedPin);
        const inactiveState = { active: false, focusStartTime: null, sessionId: null };
        await setState(inactiveState);
        await applyRules(inactiveState);
        sendResponse({ ok: true, success: true, message: "Focus lock released" });
      } else {
        sendResponse({ ok: false, success: false, message: "Incorrect PIN" });
      }
    })();
    return true;
  }
  if (request.action === "closeBlockedTab") {
    (async () => {
      if (sender.tab && sender.tab.id) {
        chrome.tabs.remove(sender.tab.id, () => {
          if (chrome.runtime.lastError) {
          }
        });
      }
      const tabs = await chrome.tabs.query({});
      const focusTab = tabs.find(
        (t) => t.url && (t.url.includes("localhost") || t.url.includes("focusnyx") || t.url.includes("vercel.app"))
      );
      if (focusTab && focusTab.id) {
        chrome.tabs.update(focusTab.id, { active: true });
      }
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (request.action === "getStatus" || request.type === "GET_STATE") {
    (async () => {
      const state = await getState();
      const remaining = state.focusStartTime ? Math.max(0, state.focusDuration - (Date.now() - state.focusStartTime)) : 0;
      sendResponse({
        ...state,
        isActive: state.active,
        remainingTime: remaining
      });
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
}
chrome.runtime.onMessage.addListener(handleMessage);
if (chrome.runtime.onMessageExternal) {
  chrome.runtime.onMessageExternal.addListener(handleMessage);
}
