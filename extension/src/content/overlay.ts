(function () {
  const currentHost = window.location.hostname.toLowerCase().replace(/^www\./, "");
  const FOCUSNYX_HOSTS = ["localhost", "127.0.0.1", "focusnyx.vercel.app", "focusnyx.com"];
  const isAppDomain = FOCUSNYX_HOSTS.some((h) => currentHost === h || currentHost.endsWith("." + h));

  const syncChannel = typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("FOCUSNYX_SYNC_CHANNEL")
    : null;

  function safeSendMessage(message: any, callback?: (res: any) => void) {
    try {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) return;
      chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) return;
        if (callback) callback(res);
      });
    } catch {}
  }

  function extractEmailFromJwt(token: string): string {
    try {
      const b64 = token.split(".")[1];
      if (!b64) return "";
      const pad = b64.length % 4;
      const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
      const json = decodeURIComponent(
        atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
          .split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
      );
      return JSON.parse(json).email || "";
    } catch { return ""; }
  }

  // ── PWA / App domain: bridge only, no overlay ──
  if (isAppDomain) {
    function syncAuthFromLocalStorage() {
      try {
        let token = "", userId = localStorage.getItem("focusnyxUserId") || "", email = "", refreshToken = "";
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (!key.includes("supabase") && !key.includes("sb-") && !key.includes("auth-token") && !key.includes("auth")) continue;
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          try {
            const p = JSON.parse(raw);
            for (const c of [p.access_token, p.currentSession?.access_token, p.token, p.session?.access_token]) {
              if (c && typeof c === "string" && c.startsWith("eyJ")) { token = c; break; }
            }
            if (!userId) userId = p.user?.id || p.currentSession?.user?.id || p.session?.user?.id || "";
            if (!email) email = p.user?.email || p.currentSession?.user?.email || p.session?.user?.email || "";
            if (!refreshToken) refreshToken = p.refresh_token || p.currentSession?.refresh_token || p.session?.refresh_token || "";
            if (token) break;
          } catch {}
        }
        if (token && !email) email = extractEmailFromJwt(token);
        if (token) safeSendMessage({ action: "syncAuth", token, userId, email, refreshToken });
      } catch {}
    }

    syncAuthFromLocalStorage();
    setInterval(syncAuthFromLocalStorage, 3000);
    window.addEventListener("storage", (e) => {
      if (e.key && (e.key.includes("sb-") || e.key.includes("supabase") || e.key.includes("auth-token")))
        setTimeout(syncAuthFromLocalStorage, 100);
    });

    // localStorage polling bridge — only relay startFocus / endFocus / updateWhitelist
    let lastActionTimestamp = 0;
    function checkLocalStorageAction() {
      try {
        const raw = localStorage.getItem("focusnyx_app_focus_state");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed.timestamp || parsed.timestamp <= lastActionTimestamp) return;
        lastActionTimestamp = parsed.timestamp;
        const { action, durationMinutes, pin } = parsed;
        if (action === "startFocus") {
          safeSendMessage({
            action: "startFocus",
            duration: (durationMinutes || 25) * 60 * 1000,
            allowedUrls: parsed.allowedUrls || [],
            pin: pin || "",
          }, (res) => { if (res) safeSendMessage({ action: "getStatus" }, postStateToWebApp); });
        } else if (action === "endFocus") {
          safeSendMessage({ action: "endFocus", pin: pin || "" },
            (res) => { if (res) safeSendMessage({ action: "getStatus" }, postStateToWebApp); });
        } else if (action === "updateWhitelist") {
          safeSendMessage({ action: "updateWhitelist", allowedUrls: parsed.allowedUrls || [] });
        }
      } catch {}
    }
    window.addEventListener("storage", checkLocalStorageAction);
    setInterval(checkLocalStorageAction, 500);

    // postMessage bridge
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "FOCUSNYX_WEB_APP_ACTION") return;
      const { action } = event.data;
      const payload = event.data.payload;
      const durationMins = event.data.durationMinutes || (typeof payload === "number" ? payload : payload?.durationMinutes) || (event.data.duration ? event.data.duration / 60000 : 25);
      const pin = event.data.pin || (typeof payload === "object" ? payload?.pin : undefined);

      if (action === "startFocus") {
        safeSendMessage({
          action: "startFocus",
          duration: durationMins * 60 * 1000,
          allowedUrls: event.data.allowedUrls || (typeof payload === "object" ? payload?.allowedUrls : []) || [],
          pin: pin,
        }, (res) => { if (res) safeSendMessage({ action: "getStatus" }, postStateToWebApp); });
      } else if (action === "endFocus" || action === "pauseFocus") {
        safeSendMessage({ action: "endFocus", pin: pin },
          (res) => { if (res) safeSendMessage({ action: "getStatus" }, postStateToWebApp); });
      } else if (action === "getStatus") {
        safeSendMessage({ action: "getStatus" }, postStateToWebApp);
      } else if (action === "updateWhitelist" || action === "syncBlocklist") {
        const allowed = event.data.allowedUrls || (typeof payload === "object" ? (payload?.allowedUrls || payload?.whitelistedSites) : []) || [];
        safeSendMessage({ action: "updateWhitelist", allowedUrls: allowed });
      } else if (action === "syncPin") {
        safeSendMessage({ action: "syncPin", pin: pin || event.data.pin });
      }
    });

    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        if (!event.data || event.data.type !== "FOCUSNYX_WEB_APP_ACTION") return;
        const { action } = event.data;
        const payload = event.data.payload;
        const durationMins = event.data.durationMinutes || (typeof payload === "number" ? payload : payload?.durationMinutes) || 25;
        const pin = event.data.pin || (typeof payload === "object" ? payload?.pin : undefined);

        if (action === "startFocus") {
          safeSendMessage({
            action: "startFocus",
            duration: durationMins * 60 * 1000,
            allowedUrls: event.data.allowedUrls || (typeof payload === "object" ? payload?.allowedUrls : []) || [],
            pin: pin,
          }, (res) => { if (res) safeSendMessage({ action: "getStatus" }, postStateToWebApp); });
        } else if (action === "endFocus" || action === "pauseFocus") {
          safeSendMessage({ action: "endFocus", pin: pin },
            (res) => { if (res) safeSendMessage({ action: "getStatus" }, postStateToWebApp); });
        } else if (action === "getStatus") {
          safeSendMessage({ action: "getStatus" }, postStateToWebApp);
        } else if (action === "updateWhitelist" || action === "syncBlocklist") {
          const allowed = event.data.allowedUrls || (typeof payload === "object" ? (payload?.allowedUrls || payload?.whitelistedSites) : []) || [];
          safeSendMessage({ action: "updateWhitelist", allowedUrls: allowed });
        }
      };
    }

    try {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "focusStateChanged")
          safeSendMessage({ action: "getStatus" }, postStateToWebApp);
      });
    } catch {}

    function postStateToWebApp(state: unknown) {
      if (!state) return;
      const payload1 = { type: "FOCUSNYX_EXTENSION_EVENT", action: "FOCUS_STATE_CHANGED", state };
      const payload2 = { type: "FOCUSNYX_EXTENSION_STATE", state };
      window.postMessage(payload1, "*");
      window.postMessage(payload2, "*");
      if (syncChannel) {
        syncChannel.postMessage(payload1);
        syncChannel.postMessage(payload2);
      }
    }

    safeSendMessage({ action: "getStatus" }, postStateToWebApp);
    return; // App domain: no overlay, no keyboard blocking
  }

  // ════════════════════════════════════════════════════════════════
  // ── NON-APP DOMAIN: overlay + keyboard lock logic ──
  // ════════════════════════════════════════════════════════════════

  let overlayEl: HTMLDivElement | null = null;
  let inputBlockingActive = false;

  function normHost(raw: string): string {
    return raw.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/:.*$/, "").replace(/\/.*$/, "").trim();
  }

  // Check if this page's host is in the whitelist
  function isSiteAllowed(state: any): boolean {
    const allowedUrls: string[] = state?.allowedUrls || [];
    const systemAllowed = [
      "localhost", "127.0.0.1", "focusnyx.vercel.app", "focusnyx.com", "vavppeevglpvyfoorfje.supabase.co", "supabase.co"
    ];
    return [...systemAllowed, ...allowedUrls].some((d) => {
      const clean = normHost(d);
      return clean && (currentHost === clean || currentHost.endsWith("." + clean));
    });
  }

  function createOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement("div");
    overlayEl.id = "focusnyx-block-overlay";
    overlayEl.style.cssText = `
      position: fixed !important; top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483647 !important;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%) !important;
      display: flex !important; flex-direction: column !important;
      align-items: center !important; justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      color: white !important; cursor: not-allowed !important;
      user-select: none !important; -webkit-user-select: none !important;
    `;
    overlayEl.innerHTML = `
      <div style="text-align:center;max-width:420px;padding:40px;">
        <div style="font-size:64px;margin-bottom:16px;">🛡️</div>
        <h1 style="font-size:28px;font-weight:900;margin:0 0 8px 0;color:#fff;">Focus Lock Active</h1>
        <p style="font-size:15px;color:rgba(255,255,255,0.7);margin:0 0 24px 0;line-height:1.5;">
          This site is blocked during your focus session.<br/>Stay focused — you're building discipline! 💪
        </p>
        <div style="background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:16px;padding:16px 24px;margin-bottom:24px;">
          <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;">Attempted to visit:</p>
          <p style="font-size:16px;font-weight:700;color:#f87171;margin:0;word-break:break-all;">${currentHost}</p>
        </div>
        <button id="focusnyx-go-back" style="
          background:linear-gradient(135deg,#6366f1,#8b5cf6);border:2px solid rgba(255,255,255,0.3);
          color:white;font-size:14px;font-weight:800;padding:12px 32px;border-radius:12px;
          cursor:pointer;text-transform:uppercase;letter-spacing:1px;">← Go Back to Focusnyx</button>
      </div>
    `;
    document.documentElement.appendChild(overlayEl);
    const btn = document.getElementById("focusnyx-go-back");
    if (btn) {
      btn.addEventListener("mousedown", (e) => {
        e.stopImmediatePropagation();
        safeSendMessage({ action: "closeBlockedTab" });
      }, { capture: true });
    }
  }

  function removeOverlay() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
  }

  function blockInput(e: Event) {
    const target = e.target as HTMLElement;
    if (target?.id === "focusnyx-go-back") return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  const BLOCK_EVENTS = [
    "keydown", "keyup", "keypress",
    "mousedown", "mouseup", "click", "dblclick",
    "contextmenu", "wheel",
    "input", "change", "paste", "cut", "copy",
    "dragstart", "drop",
    "touchstart", "touchmove", "touchend",
  ];

  function enableInputBlocking() {
    if (inputBlockingActive) return;
    inputBlockingActive = true;
    BLOCK_EVENTS.forEach((evt) =>
      document.addEventListener(evt, blockInput, { capture: true, passive: false } as AddEventListenerOptions)
    );
    document.querySelectorAll("input, textarea, select, [contenteditable]").forEach((el) => {
      (el as HTMLElement).setAttribute("tabindex", "-1");
      (el as HTMLElement).blur();
    });
  }

  function disableInputBlocking() {
    if (!inputBlockingActive) return;
    inputBlockingActive = false;
    BLOCK_EVENTS.forEach((evt) =>
      document.removeEventListener(evt, blockInput, { capture: true } as EventListenerOptions)
    );
  }

  // Core logic: given current focus state, decide what to do on this page
  function applyFocusState(state: any) {
    if (!state) return;
    const active = Boolean(state.isActive ?? state.active);

    if (!active) {
      // Focus off — remove everything
      removeOverlay();
      disableInputBlocking();
      return;
    }

    // Focus is active — check if this site is whitelisted
    if (isSiteAllowed(state)) {
      // Whitelisted: full access, no overlay, no keyboard block
      removeOverlay();
      disableInputBlocking();
    } else {
      // Not whitelisted: show overlay + block all input
      createOverlay();
      enableInputBlocking();
    }
  }

  // Initial check on page load
  safeSendMessage({ action: "getStatus" }, applyFocusState);

  // React to SW push notifications
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === "focusStateChanged")
        safeSendMessage({ action: "getStatus" }, applyFocusState);
    });
  } catch {}

  // React to storage changes (catches updateWhitelist)
  try {
    chrome.storage.onChanged.addListener((changes: any, area: string) => {
      if (area === "local" && changes.focusState)
        applyFocusState(changes.focusState.newValue);
    });
  } catch {}

  // Periodic re-check every 3 seconds (safety net)
  setInterval(() => safeSendMessage({ action: "getStatus" }, applyFocusState), 3000);

  // Keep overlay on top if something tries to remove it
  const observer = new MutationObserver(() => {
    if (overlayEl && overlayEl.parentElement !== document.documentElement)
      document.documentElement.appendChild(overlayEl);
    if (inputBlockingActive) {
      document.querySelectorAll("input, textarea, select, [contenteditable]").forEach((el) => {
        (el as HTMLElement).setAttribute("tabindex", "-1");
        (el as HTMLElement).blur();
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
