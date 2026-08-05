(function () {
  const currentHost = window.location.hostname;
  const FOCUSNYX_HOSTS = ["localhost", "127.0.0.1", "focusnyx.vercel.app", "focusnyx.com"];
  const isAppDomain = FOCUSNYX_HOSTS.some((h) => currentHost === h || currentHost.endsWith("." + h));

  const syncChannel = typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("FOCUSNYX_SYNC_CHANNEL")
    : null;

  // Safe wrapper for chrome.runtime.sendMessage to prevent 'Extension context invalidated' errors
  function safeSendMessage(message: any, callback?: (res: any) => void) {
    try {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
        return;
      }
      chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) {
          return;
        }
        if (callback) callback(res);
      });
    } catch (e) {
      // Extension context invalidated when extension is reloaded in browser
    }
  }

  // Helper: Extract email from JWT token payload
  function extractEmailFromJwt(token: string): string {
    try {
      const base64Url = token.split(".")[1];
      if (!base64Url) return "";
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const pad = base64.length % 4;
      const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
      const jsonPayload = decodeURIComponent(
        atob(padded)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const parsed = JSON.parse(jsonPayload);
      return parsed.email || "";
    } catch {
      return "";
    }
  }

  // ── Web App Sync Bridge for PWA local / app domain ──
  if (isAppDomain) {
    // Automatically extract and sync auth token from PWA storage to Extension
    function syncAuthFromLocalStorage() {
      try {
        let token = "";
        let userId = localStorage.getItem("focusnyxUserId") || "";
        let email = "";
        let refreshToken = "";

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;

          const isSupabaseKey = key.includes("supabase") || key.includes("sb-") || key.includes("auth-token") || key.includes("auth");
          if (!isSupabaseKey) continue;

          const raw = localStorage.getItem(key);
          if (!raw) continue;

          try {
            const parsed = JSON.parse(raw);
            const candidates = [
              parsed.access_token,
              parsed.currentSession?.access_token,
              parsed.token,
              parsed.session?.access_token,
            ];
            for (const candidate of candidates) {
              if (candidate && typeof candidate === "string" && candidate.startsWith("eyJ")) {
                token = candidate;
                break;
              }
            }
            if (!userId) {
              userId = parsed.user?.id || parsed.currentSession?.user?.id || parsed.session?.user?.id || "";
            }
            if (!email) {
              email = parsed.user?.email || parsed.currentSession?.user?.email || parsed.session?.user?.email || "";
            }
            if (!refreshToken) {
              refreshToken = parsed.refresh_token || parsed.currentSession?.refresh_token || parsed.session?.refresh_token || "";
            }
            if (token) break;
          } catch {}
        }

        // Fallback: extract email from JWT if not found in parsed object
        if (token && !email) {
          email = extractEmailFromJwt(token);
        }

        if (token) {
          safeSendMessage({ action: "syncAuth", token, userId, email, refreshToken });
        }
      } catch {}
    }

    syncAuthFromLocalStorage();
    setInterval(syncAuthFromLocalStorage, 3000);

    window.addEventListener("storage", (e) => {
      if (e.key && (e.key.includes("sb-") || e.key.includes("supabase") || e.key.includes("auth-token"))) {
        setTimeout(syncAuthFromLocalStorage, 100);
      }
    });

    let lastActionTimestamp = Date.now();
    function checkLocalStorageAction() {
      try {
        const raw = localStorage.getItem("focusnyx_app_focus_state");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.timestamp && parsed.timestamp > lastActionTimestamp) {
            lastActionTimestamp = parsed.timestamp;
            const { action, durationMinutes, pin } = parsed;
            if (action === "startFocus") {
              const durationMs = (durationMinutes || 25) * 60 * 1000;
              safeSendMessage(
                {
                  action: "startFocus",
                  duration: durationMs,
                  allowedUrls: parsed.allowedUrls,
                  blocklist: parsed.blocklist || parsed.allowedUrls,
                  pin: pin || "123456",
                },
                (res) => {
                  if (res) {
                    safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
                  }
                }
              );
            } else if (action === "endFocus") {
              safeSendMessage(
                { action: "endFocus", pin: pin || "123456" },
                (res) => {
                  if (res) {
                    safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
                  }
                }
              );
            }
          }
        }
      } catch {}
    }

    window.addEventListener("storage", checkLocalStorageAction);
    // Also poll every 500ms — storage events don't fire in the same tab that wrote the value
    setInterval(checkLocalStorageAction, 500);

    // Listen for requests from Web App DOM
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "FOCUSNYX_WEB_APP_ACTION") return;
      const { action, duration, durationMinutes, pin } = event.data;
      const durationMins = durationMinutes || (duration ? duration / 60000 : 25);

      if (action === "startFocus") {
        const durationMs = durationMins * 60 * 1000;
        safeSendMessage(
          {
            action: "startFocus",
            duration: durationMs,
            allowedUrls: event.data.allowedUrls,
            blocklist: event.data.blocklist || event.data.blockedSites || event.data.allowedUrls,
            pin: pin || "123456",
          },
          (res) => {
            if (res) {
              safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
            }
          }
        );
      } else if (action === "endFocus") {
        safeSendMessage(
          { action: "endFocus", pin: pin || "123456" },
          (res) => {
            if (res) {
              safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
            }
          }
        );
      } else if (action === "getStatus") {
        safeSendMessage({ action: "getStatus" }, (res) => {
          if (res) postStateToWebApp(res);
        });
      } else if (action === "updateBlocklist") {
        safeSendMessage({ action: "updateBlocklist", blocklist: event.data.blocklist }, (res) => {
          if (res) postStateToWebApp(res);
        });
      } else if (action === "updateWhitelist") {
        safeSendMessage({ action: "updateWhitelist", allowedUrls: event.data.allowedUrls }, (res) => {
          if (res) postStateToWebApp(res);
        });
      } else if (action === "syncPin") {
        safeSendMessage({ action: "syncPin", pin: event.data.pin });
      }
    });

    document.addEventListener("FOCUSNYX_DOM_ACTION", (event: any) => {
      if (!event.detail) return;
      const { action, durationMinutes, pin } = event.detail;
      const durationMins = durationMinutes || 25;
      if (action === "startFocus") {
        safeSendMessage({
          action: "startFocus",
          duration: durationMins * 60 * 1000,
          allowedUrls: event.detail.allowedUrls,
          blocklist: event.detail.blocklist || event.detail.allowedUrls,
          pin: pin || "123456",
        }, (res) => {
          if (res) {
            safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
          }
        });
      } else if (action === "endFocus") {
        safeSendMessage({ action: "endFocus", pin: pin || "123456" }, (res) => {
          if (res) {
            safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
          }
        });
      } else if (action === "getStatus") {
        safeSendMessage({ action: "getStatus" }, (res) => {
          if (res) postStateToWebApp(res);
        });
      }
    });

    // Listen to BroadcastChannel messages from Web App
    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        if (!event.data || event.data.type !== "FOCUSNYX_WEB_APP_ACTION") return;
        const { action, durationMinutes, pin } = event.data;
        if (action === "startFocus") {
          const durationMs = (durationMinutes || 25) * 60 * 1000;
          safeSendMessage({
            action: "startFocus",
            duration: durationMs,
            allowedUrls: event.data.allowedUrls,
            blocklist: event.data.blocklist || event.data.allowedUrls,
            pin: pin || "123456",
          }, (res) => {
            if (res) {
              safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
            }
          });
        } else if (action === "endFocus") {
          safeSendMessage({ action: "endFocus", pin: pin || "123456" }, (res) => {
            if (res) {
              safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
            }
          });
        } else if (action === "getStatus") {
          safeSendMessage({ action: "getStatus" }, (res) => {
            if (res) postStateToWebApp(res);
          });
        }
      };
    }

    // Forward Extension State changes to Web App
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg) => {
          if (msg.action === "focusStateChanged") {
            safeSendMessage({ action: "getStatus" }, (res) => {
              if (res) postStateToWebApp(res);
            });
          }
        });
      }
    } catch {}

    function postStateToWebApp(state: unknown) {
      if (!state) return;
      const payload = {
        type: "FOCUSNYX_EXTENSION_EVENT",
        action: "FOCUS_STATE_CHANGED",
        state,
      };
      window.postMessage(payload, "*");
      if (syncChannel) syncChannel.postMessage(payload);
    }

    // Initial status fetch on app load
    safeSendMessage({ action: "getStatus" }, (res) => {
      if (res) postStateToWebApp(res);
    });

    // App domain does not render block overlay
    return;
  }

  // ════════════════════════════════════════════════════════════════
  // ── NON-APP DOMAIN: Full-page blocking overlay + keyboard lock ──
  // ════════════════════════════════════════════════════════════════

  let overlayEl: HTMLDivElement | null = null;
  let isOverlayActive = false;

  function createBlockOverlay() {
    if (overlayEl) return;

    overlayEl = document.createElement("div");
    overlayEl.id = "focusnyx-block-overlay";
    overlayEl.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483647 !important;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%) !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      color: white !important;
      cursor: not-allowed !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    `;

    overlayEl.innerHTML = `
      <div style="text-align: center; max-width: 420px; padding: 40px;">
        <div style="font-size: 64px; margin-bottom: 16px;">🛡️</div>
        <h1 style="font-size: 28px; font-weight: 900; margin: 0 0 8px 0; letter-spacing: -0.5px; color: #fff;">
          Focus Lock Active
        </h1>
        <p style="font-size: 15px; color: rgba(255,255,255,0.7); margin: 0 0 24px 0; line-height: 1.5;">
          This site is blocked during your focus session.<br/>
          Stay focused — you're building discipline! 💪
        </p>
        <div style="
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 16px;
          padding: 16px 24px;
          margin-bottom: 24px;
        ">
          <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin: 0 0 4px 0;">Attempted to visit:</p>
          <p style="font-size: 16px; font-weight: 700; color: #f87171; margin: 0; word-break: break-all;">
            ${currentHost}
          </p>
        </div>
        <button id="focusnyx-go-back" style="
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: 2px solid rgba(255,255,255,0.3);
          color: white;
          font-size: 14px;
          font-weight: 800;
          padding: 12px 32px;
          border-radius: 12px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.2s;
        ">← Go Back to Focusnyx</button>
      </div>
    `;

    document.documentElement.appendChild(overlayEl);

    // Go back button — must use mousedown since click is blocked
    const goBackBtn = document.getElementById("focusnyx-go-back");
    if (goBackBtn) {
      goBackBtn.addEventListener("mousedown", (e) => {
        e.stopImmediatePropagation();
        safeSendMessage({ action: "closeBlockedTab" });
      }, { capture: true });
    }

    isOverlayActive = true;
  }

  function removeBlockOverlay() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    isOverlayActive = false;
  }

  // ── Keyboard, mouse, and input blocking ──
  function blockAllInput(e: Event) {
    if (!isOverlayActive) return;

    // Allow the go-back button to work
    const target = e.target as HTMLElement;
    if (target && target.id === "focusnyx-go-back") return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }

  function enableInputBlocking() {
    const blockEvents = [
      "keydown", "keyup", "keypress",
      "mousedown", "mouseup", "click", "dblclick",
      "contextmenu", "wheel",
      "input", "change", "paste", "cut", "copy",
      "dragstart", "drop",
      "touchstart", "touchmove", "touchend",
    ];
    blockEvents.forEach((evt) => {
      document.addEventListener(evt, blockAllInput, { capture: true, passive: false } as AddEventListenerOptions);
    });

    // Also blur all form elements
    document.querySelectorAll("input, textarea, select, [contenteditable]").forEach((el) => {
      (el as HTMLElement).setAttribute("tabindex", "-1");
      (el as HTMLElement).blur();
    });
  }

  function disableInputBlocking() {
    const blockEvents = [
      "keydown", "keyup", "keypress",
      "mousedown", "mouseup", "click", "dblclick",
      "contextmenu", "wheel",
      "input", "change", "paste", "cut", "copy",
      "dragstart", "drop",
      "touchstart", "touchmove", "touchend",
    ];
    blockEvents.forEach((evt) => {
      document.removeEventListener(evt, blockAllInput, { capture: true } as EventListenerOptions);
    });
  }

  // ── Check focus state and activate/deactivate overlay ──
  function handleFocusState(state: any) {
    if (!state) return;
    const active = Boolean(state.isActive ?? state.active);
    if (active && !isOverlayActive) {
      createBlockOverlay();
      enableInputBlocking();

      // Log this distraction attempt to the service worker
      safeSendMessage({
        action: "blockAttempt",
        type: "site_visit_blocked",
        url: window.location.href,
      });
    } else if (!active && isOverlayActive) {
      removeBlockOverlay();
      disableInputBlocking();
    }
  }

  // Check status on page load
  safeSendMessage({ action: "getStatus" }, (res) => {
    handleFocusState(res);
  });

  // Listen for focus state changes from service worker
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "focusStateChanged") {
          safeSendMessage({ action: "getStatus" }, (res) => {
            handleFocusState(res);
          });
        }
      });
    }
  } catch {}

  // Listen for storage changes (focus state updates)
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes: any, area: string) => {
        if (area === "local" && changes.focusState) {
          const newState = changes.focusState.newValue;
          handleFocusState(newState);
        }
      });
    }
  } catch {}

  // Periodic re-check every 2 seconds (catches edge cases)
  setInterval(() => {
    safeSendMessage({ action: "getStatus" }, (res) => {
      handleFocusState(res);
    });
  }, 2000);

  // Block any new elements added dynamically (mutation observer)
  const observer = new MutationObserver(() => {
    if (isOverlayActive) {
      // Re-block any new input elements
      document.querySelectorAll("input, textarea, select, [contenteditable]").forEach((el) => {
        (el as HTMLElement).setAttribute("tabindex", "-1");
        (el as HTMLElement).blur();
      });
      // Make sure overlay stays on top
      if (overlayEl && overlayEl.parentElement !== document.documentElement) {
        document.documentElement.appendChild(overlayEl);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
