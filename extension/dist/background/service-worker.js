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

// src/background/service-worker.ts
var FOCUSNYX_APP_DOMAINS = ["localhost", "127.0.0.1", "focusnyx.vercel.app", "focusnyx.com"];
var ALWAYS_ALLOWED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "focusnyx.vercel.app",
  "focusnyx.com",
  "vavppeevglpvyfoorfje.supabase.co",
  "supabase.co"
];
var DEFAULT_WHITELISTED_DOMAINS = [
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
  "chatgpt.com"
];
var PWA_SEED_URLS = ["localhost", "127.0.0.1", "focusnyx.vercel.app", "focusnyx.com"];
var _state = {
  active: false,
  sessionId: null,
  blocklist: [],
  allowedUrls: [...PWA_SEED_URLS, ...DEFAULT_WHITELISTED_DOMAINS],
  userId: null,
  token: null,
  focusStartTime: null,
  focusDuration: 25 * 60 * 1e3,
  focusPIN: "123456"
};
function normalizeDomain(raw) {
  return raw.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/:.*$/, "").replace(/\/.*$/, "").trim();
}
function isFocusnyxTab(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return FOCUSNYX_APP_DOMAINS.some((d) => h === d || h.endsWith("." + d));
  } catch {
    return false;
  }
}
function buildAllowedList(allowedUrls) {
  return [...ALWAYS_ALLOWED_DOMAINS, ...DEFAULT_WHITELISTED_DOMAINS, ...allowedUrls].map(normalizeDomain).filter(Boolean);
}
function shouldBlock(url) {
  if (!_state.active || !url) return false;
  if (url.startsWith("chrome-extension://") || url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:") || url.startsWith("file://")) return false;
  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "").replace(/:.*$/, "");
  } catch {
    return false;
  }
  const allowedList = buildAllowedList(_state.allowedUrls || []);
  const blocked = !allowedList.some((clean) => clean && (hostname === clean || hostname.endsWith("." + clean)));
  if (blocked) console.log("[Focusnyx SW] BLOCKING", hostname, "| _state.allowedUrls:", _state.allowedUrls);
  return blocked;
}
async function persistState() {
  await chrome.storage.local.set({ focusState: { ..._state } });
  notifyAllTabs(_state.active);
}
async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["focusState", "pin", "userAuth"], (data) => {
      if (data.focusState) {
        _state = { ..._state, ...data.focusState };
        if (!Array.isArray(_state.allowedUrls) || _state.allowedUrls.length === 0) {
          _state.allowedUrls = [...PWA_SEED_URLS, ...DEFAULT_WHITELISTED_DOMAINS];
        } else {
          _state.allowedUrls = Array.from(/* @__PURE__ */ new Set([..._state.allowedUrls, ...DEFAULT_WHITELISTED_DOMAINS]));
        }
      }
      if (data.pin) _state.focusPIN = data.pin;
      if (data.userAuth?.token) {
        _state.token = data.userAuth.token;
        _state.userId = data.userAuth.email || data.userAuth.userId || _state.userId;
      }
      if (_state.active && _state.focusStartTime && _state.focusDuration) {
        const durationMs = _state.focusDuration <= 1440 ? _state.focusDuration * 60 * 1e3 : _state.focusDuration;
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
function syncCompanionApp(isStart, durationMins = 25, pin = "123456") {
  const endpoint = isStart ? "http://localhost:5000/start-focus" : "http://localhost:5000/end-focus";
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isStart ? { duration: durationMins, pin } : { pin })
  }).catch(() => {
  });
}
async function applyRules() {
  const removeIds = Array.from({ length: 500 }, (_, i) => i + 1);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules: [] });
}
async function logDistraction(data) {
  const rawUrl = data.url || "";
  let domain = "";
  try {
    domain = new URL(rawUrl).hostname;
  } catch {
    domain = rawUrl || "unknown";
  }
  const sessionId = _state.sessionId || `session-${Date.now()}`;
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
  if (_state.token) {
    await syncBlockEvent(_state.token, sessionId, rawUrl, event.type, domain, {
      url: rawUrl,
      domain,
      source: "browser_extension",
      timestamp: new Date(event.timestamp).toISOString()
    });
  }
}
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
    chrome.tabs.update(tab.id, { url: blockedUrl });
    chrome.tabs.query({}, (tabs) => {
      const ft = tabs.find((t) => t.url && isFocusnyxTab(t.url));
      if (ft?.id) chrome.tabs.update(ft.id, { active: true });
    });
    logDistraction({ type: "tab_switch_blocked", url: tab.url });
  } catch {
  }
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
    } catch {
    }
  }, 300);
});
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
chrome.webNavigation?.onErrorOccurred.addListener((details) => {
  if (details.error !== "net::ERR_BLOCKED_BY_CLIENT") return;
  if (_state.active) logDistraction({ type: "navigation_blocked", url: details.url });
});
function handleMessage(request, sender, sendResponse) {
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
        } catch {
        }
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
      let duration = request.duration || (request.durationMinutes ? request.durationMinutes * 60 * 1e3 : 25 * 60 * 1e3);
      if (duration > 0 && duration <= 1440) duration = duration * 60 * 1e3;
      const incoming = Array.isArray(request.allowedUrls) ? request.allowedUrls : [];
      console.log("[Focusnyx SW] startFocus received. incoming allowedUrls:", incoming);
      const allowedUrls = Array.from(new Set(
        [...PWA_SEED_URLS, ...DEFAULT_WHITELISTED_DOMAINS, ...incoming].map((v) => normalizeDomain(String(v || ""))).filter(Boolean)
      ));
      const pin = request.pin || _state.focusPIN || "123456";
      const token = request.token || _state.token;
      const sessionId = request.sessionId || `session-${Date.now()}`;
      const userId = request.userId || _state.userId;
      _state = {
        active: true,
        sessionId,
        token,
        userId,
        blocklist: [],
        allowedUrls,
        focusStartTime: Date.now(),
        focusDuration: duration,
        focusPIN: pin
      };
      chrome.alarms.create("autoUnlockFocus", { when: Date.now() + duration });
      syncCompanionApp(true, Math.round(duration / 6e4), pin);
      await applyRules();
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
      const incoming = Array.isArray(request.allowedUrls) ? request.allowedUrls : [];
      _state.allowedUrls = Array.from(new Set(
        [...PWA_SEED_URLS, ...incoming].map((d) => normalizeDomain(d)).filter(Boolean)
      ));
      await chrome.storage.local.set({ focusState: { ..._state } });
      sendResponse({ ok: true, success: true });
    })();
    return true;
  }
  if (request.action === "getStatus" || request.type === "GET_STATE") {
    const remaining = _state.focusStartTime ? Math.max(0, _state.focusDuration - (Date.now() - _state.focusStartTime)) : 0;
    sendResponse({ ..._state, isActive: _state.active, remainingTime: remaining });
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
loadState().then(() => {
  console.log("[Focusnyx SW] Initialized. active:", _state.active, "allowedUrls:", _state.allowedUrls);
});
