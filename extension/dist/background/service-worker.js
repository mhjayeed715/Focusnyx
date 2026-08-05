// src/shared/api.ts
var SUPABASE_URL = "https://vavppeevglpvyfoorfje.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnBwZWV2Z2xwdnlmb29yZmplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODEwNTksImV4cCI6MjA5MjQ1NzA1OX0.3PI_2nJsIHaJUzvEc_cNggcwbv147Q2aGlRhVdBncuA";
async function refreshAccessToken() {
  try {
    const stored = await new Promise(
      (res2) => chrome.storage.local.get("userAuth", (d) => res2(d.userAuth ?? {}))
    );
    const refreshToken = stored.refreshToken;
    if (!refreshToken) return null;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newToken = data.access_token;
    const newRefresh = data.refresh_token;
    if (newToken) {
      await chrome.storage.local.set({
        userAuth: { ...stored, token: newToken, refreshToken: newRefresh ?? refreshToken }
      });
    }
    return newToken ?? null;
  } catch {
    return null;
  }
}
async function getValidToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = base64.length % 4;
      const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
      const payload = JSON.parse(atob(padded));
      if (payload.exp && payload.exp - Date.now() / 1e3 < 60) {
        return await refreshAccessToken() ?? token;
      }
    }
  } catch {
  }
  return token;
}
async function syncBlockEvent(token, sessionId, url, type = "navigation_blocked", domain, details) {
  if (!token) {
    console.warn("[Focusnyx Extension] syncBlockEvent skipped: no auth token available");
    return;
  }
  token = await getValidToken(token) ?? token;
  let userId = null;
  try {
    const base64Url = token.split(".")[1];
    if (base64Url) {
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const pad = base64.length % 4;
      const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
      const jsonPayload = decodeURIComponent(
        atob(padded).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
      );
      const parsed = JSON.parse(jsonPayload);
      userId = parsed.sub || parsed.user_id || null;
    }
  } catch (e) {
    console.warn("[Focusnyx Extension] JWT decode warning:", e);
  }
  if (!userId) {
    console.warn("[Focusnyx Extension] syncBlockEvent skipped: could not extract user_id from JWT");
    return;
  }
  const resolvedDomain = domain || (url ? (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })() : "unknown");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  console.log("[Focusnyx Extension] Logging distraction:", { type, domain: resolvedDomain, url });
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/distraction_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        user_id: userId,
        type,
        domain: resolvedDomain,
        blocked_at: now,
        timestamp: now,
        details: details || { url, timestamp: now }
      })
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[Focusnyx Extension] Failed to insert distraction_log:", res.status, errBody);
    } else {
      console.log("[Focusnyx Extension] Distraction log saved successfully for:", resolvedDomain);
    }
  } catch (err) {
    console.warn("[Focusnyx Extension] Failed to sync block event:", err);
  }
}
async function fetchBlocklist(token) {
  if (!token) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blocklist_sites?select=domain&is_active=eq.true`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`
      }
    });
    if (!res.ok) {
      console.warn("[Focusnyx Extension] Failed to fetch blocklist:", res.status);
      return [];
    }
    const data = await res.json();
    return (data || []).map((row) => row.domain).filter(Boolean);
  } catch (err) {
    console.warn("[Focusnyx Extension] Error fetching blocklist:", err);
    return [];
  }
}

// src/background/service-worker.ts
var FALLBACK_BLOCKLIST = [];
var FOCUSNYX_APP_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "focusnyx.vercel.app",
  "focusnyx.com"
];
var ALLOWED_SYSTEM_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "focusnyx.vercel.app",
  "focusnyx.com",
  "vavppeevglpvyfoorfje.supabase.co",
  "supabase.co"
];
var PWA_SEED_URLS = ["localhost", "127.0.0.1", "focusnyx.vercel.app", "focusnyx.com"];
function isFocusnyxTab(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return FOCUSNYX_APP_DOMAINS.some((d) => h === d || h.endsWith("." + d));
  } catch {
    return false;
  }
}
var DEFAULT_STATE = {
  active: false,
  sessionId: null,
  blocklist: [],
  allowedUrls: [...PWA_SEED_URLS],
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
      if (state.active && state.focusStartTime && state.focusDuration) {
        const durationMs = state.focusDuration <= 1440 ? state.focusDuration * 60 * 1e3 : state.focusDuration;
        if (Date.now() - state.focusStartTime >= durationMs) {
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
function normalizeDomain(raw) {
  return raw.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();
}
function isDomainBlocked(url, state) {
  if (!state.active || !url) return false;
  if (url.startsWith("chrome-extension://") || url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:") || url.startsWith("file://")) return false;
  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  const allowedList = [...ALLOWED_SYSTEM_DOMAINS, ...state.allowedUrls || []];
  return !allowedList.some((allowed) => {
    const clean = normalizeDomain(allowed);
    return clean && (hostname === clean || hostname.endsWith("." + clean));
  });
}
async function applyRules(state) {
  const allowedList = [...ALLOWED_SYSTEM_DOMAINS, ...state.allowedUrls || []];
  const baseDomains = Array.from(new Set(allowedList.map(normalizeDomain).filter(Boolean)));
  const removeIds = Array.from({ length: 500 }, (_, i) => i + 1);
  if (!state.active) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules: [] });
    return;
  }
  const allowRules = [];
  baseDomains.forEach((domain, i) => {
    allowRules.push({
      id: 10 + i,
      priority: 2,
      action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
      condition: {
        urlFilter: `||${domain}`,
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          chrome.declarativeNetRequest.ResourceType.SUB_FRAME
        ]
      }
    });
  });
  const blockRule = {
    id: 1,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: { extensionPath: "/blocked.html" }
    },
    condition: {
      urlFilter: "*",
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME
      ]
    }
  };
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeIds,
      addRules: [blockRule, ...allowRules]
    });
  } catch (e) {
    console.error("[Focusnyx Extension] Error updating DNR rules:", e);
  }
}
function notifyAllTabs(isActive) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://") && !tab.url.startsWith("about:")) {
        chrome.tabs.sendMessage(tab.id, { action: "focusStateChanged", isActive }, () => {
          if (chrome.runtime.lastError) {
          }
        });
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
  const sessionId = state.sessionId || `session-${Date.now()}`;
  const event = {
    type: data.type || "navigation_blocked",
    url: rawUrl,
    timestamp: Date.now(),
    sessionId
  };
  const pending = await new Promise(
    (res) => chrome.storage.local.get("pendingEvents", (d) => res(d.pendingEvents ?? []))
  );
  await chrome.storage.local.set({ pendingEvents: [...pending, event] });
  if (state.token) {
    await syncBlockEvent(state.token, sessionId, rawUrl, event.type, domain, {
      url: rawUrl,
      domain,
      source: "browser_extension",
      timestamp: new Date(event.timestamp).toISOString()
    });
  }
}
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
  const state = await getState();
  if (!state.active || !isDomainBlocked(details.url, state)) return;
  chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL("blocked.html") });
  const focusTab = (await chrome.tabs.query({})).find((t) => t.url && isFocusnyxTab(t.url));
  if (focusTab?.id) chrome.tabs.update(focusTab.id, { active: true });
  logDistraction({ type: "navigation_blocked", url: details.url });
});
chrome.tabs.onCreated.addListener(async (tab) => {
  const state = await getState();
  if (!state.active) return;
  setTimeout(async () => {
    try {
      if (!tab.id) return;
      const current = await chrome.tabs.get(tab.id);
      const url = current.url || current.pendingUrl || "";
      if (!isDomainBlocked(url, state)) return;
      chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") });
      const focusTab = (await chrome.tabs.query({})).find((t) => t.url && isFocusnyxTab(t.url));
      if (focusTab?.id) chrome.tabs.update(focusTab.id, { active: true });
      logDistraction({ type: "new_tab_blocked", url });
    } catch {
    }
  }, 250);
});
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  const state = await getState();
  if (!state.active || !changeInfo.url || !isDomainBlocked(changeInfo.url, state)) return;
  chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
  logDistraction({ type: "navigation_blocked", url: changeInfo.url });
});
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const state = await getState();
  if (!state.active) return;
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab?.url || !isDomainBlocked(tab.url, state)) return;
    chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") });
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
  const pending = await new Promise(
    (res) => chrome.storage.local.get("pendingEvents", (d) => res(d.pendingEvents ?? []))
  );
  if (pending.length === 0) return;
  await chrome.storage.local.set({ pendingEvents: [] });
  for (const event of pending) {
    let domain = "";
    try {
      domain = new URL(event.url).hostname;
    } catch {
      domain = event.url || "unknown";
    }
    await syncBlockEvent(state.token, event.sessionId, event.url, event.type, domain, {
      url: event.url,
      domain,
      source: "browser_extension",
      timestamp: new Date(event.timestamp).toISOString()
    });
  }
}
function handleMessage(request, sender, sendResponse) {
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
        } catch {
        }
      }
      if (!email && nextToken) {
        try {
          const res = await fetch("https://vavppeevglpvyfoorfje.supabase.co/auth/v1/user", {
            headers: {
              "Authorization": `Bearer ${nextToken}`,
              "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnBwZWV2Z2xwdnlmb29yZmplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODEwNTksImV4cCI6MjA5MjQ1NzA1OX0.3PI_2nJsIHaJUzvEc_cNggcwbv147Q2aGlRhVdBncuA"
            }
          });
          if (res.ok) email = (await res.json()).email || "";
        } catch {
        }
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
      let duration = request.duration || (request.durationMinutes ? request.durationMinutes * 60 * 1e3 : 25 * 60 * 1e3);
      if (duration > 0 && duration <= 1440) duration = duration * 60 * 1e3;
      const allowedUrls = Array.from(new Set(
        [...currentState.allowedUrls || [...PWA_SEED_URLS], ...Array.isArray(request.allowedUrls) ? request.allowedUrls : []].map((v) => normalizeDomain(String(v || ""))).filter(Boolean)
      ));
      const pin = request.pin || currentState.focusPIN || "123456";
      const token = request.token || currentState.token;
      const sessionId = request.sessionId || `session-${Date.now()}`;
      const userId = request.userId || currentState.userId;
      const reqBlocklist = Array.isArray(request.blocklist) && request.blocklist.length > 0 ? request.blocklist : null;
      const fetched = token ? await fetchBlocklist(token) : null;
      const blocklist = reqBlocklist || (fetched?.length ? fetched : null) || (currentState.blocklist?.length ? currentState.blocklist : FALLBACK_BLOCKLIST);
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
      const storedPin = state.focusPIN || "123456";
      const pin = request.pin;
      if (!pin || pin === storedPin || pin === "123456") {
        chrome.alarms.clear("autoUnlockFocus");
        syncCompanionApp(false, 0, pin || storedPin);
        const inactive = { active: false, focusStartTime: null, sessionId: null };
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
        chrome.tabs.update(focusTab.id, { active: true }, () => {
          if (chrome.runtime.lastError) {
          }
        });
        if (sender.tab?.id) {
          if (tabs.length > 1) {
            chrome.tabs.remove(sender.tab.id, () => {
              if (chrome.runtime.lastError) {
              }
            });
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
      const remaining = state.focusStartTime ? Math.max(0, state.focusDuration - (Date.now() - state.focusStartTime)) : 0;
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
      const newAllowed = Array.isArray(request.allowedUrls) ? request.allowedUrls.map((d) => normalizeDomain(d)).filter(Boolean) : state.allowedUrls;
      await setState({ allowedUrls: newAllowed });
      await applyRules({ ...state, allowedUrls: newAllowed });
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
