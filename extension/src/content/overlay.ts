(function () {
  const currentHost = window.location.hostname;
  const isAppDomain =
    currentHost.includes("localhost") ||
    currentHost.includes("127.0.0.1") ||
    currentHost.includes("focusnyx");

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

  // ── Web App Sync Bridge for PWA local / app domain ──
  if (isAppDomain) {
    // Automatically extract and sync auth token from PWA storage to Extension
    function syncAuthFromLocalStorage() {
      try {
        let token = "";
        let userId = "";

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes("supabase.auth.token") || key.includes("sb-") || key.includes("auth"))) {
            const raw = localStorage.getItem(key);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                token = parsed.access_token || parsed.currentSession?.access_token || parsed.token || "";
                userId = parsed.user?.id || parsed.user?.email || "";
                if (token) break;
              } catch {}
            }
          }
        }

        if (token) {
          safeSendMessage({ action: "syncAuth", token, userId });
        }
      } catch {}
    }

    syncAuthFromLocalStorage();
    setTimeout(syncAuthFromLocalStorage, 2000);

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
                { action: "startFocus", duration: durationMs, pin: pin || "1234" },
                (res) => {
                  if (res) {
                    safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
                  }
                }
              );
            } else if (action === "endFocus") {
              safeSendMessage(
                { action: "endFocus", pin: pin || "1234" },
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
    setInterval(checkLocalStorageAction, 1000);



    // 1. Listen for requests from Web App DOM
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "FOCUSNYX_WEB_APP_ACTION") return;
      const { action, duration, durationMinutes, pin } = event.data;
      const durationMins = durationMinutes || (duration ? duration / 60000 : 25);

      if (action === "startFocus") {
        try {
          if (document.documentElement && !document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } catch {}

        const durationMs = durationMins * 60 * 1000;
        safeSendMessage(
          { action: "startFocus", duration: durationMs, pin: pin || "1234" },
          (res) => {
            if (res) {
              safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
            }
          }
        );
      } else if (action === "endFocus") {
        try {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        } catch {}

        safeSendMessage(
          { action: "endFocus", pin: pin || "1234" },
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
      }
    });

    document.addEventListener("FOCUSNYX_DOM_ACTION", (event: any) => {
      if (!event.detail) return;
      const { action, durationMinutes, pin } = event.detail;
      const durationMins = durationMinutes || 25;
      if (action === "startFocus") {
        safeSendMessage({ action: "startFocus", duration: durationMins * 60 * 1000, pin: pin || "1234" }, (res) => {
          if (res) {
            safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
          }
        });
      } else if (action === "endFocus") {
        safeSendMessage({ action: "endFocus", pin: pin || "1234" }, (res) => {
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
          safeSendMessage({ action: "startFocus", duration: durationMs, pin: pin || "1234" }, (res) => {
            if (res) {
              safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp(status));
            }
          });
        } else if (action === "endFocus") {
          safeSendMessage({ action: "endFocus", pin: pin || "1234" }, (res) => {
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

    // App domain does not render the block overlay
    return;
  }

  // Never show block overlay on internal browser pages
  if (window.location.protocol.startsWith("chrome")) return;

  // ── Block Overlay Rendering for Distraction Sites ──
  function showOverlay() {
    if (document.getElementById("fnyx-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "fnyx-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8fafc;
      text-align: center;
      padding: 20px;
    `;

    overlay.innerHTML = `
      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #311b92 100%); padding: 40px 52px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.12); max-width: 460px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);">
        <div style="margin-bottom: 16px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h1 style="margin: 0 0 12px 0; font-size: 26px; font-weight: 700; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Focusnyx Focus Lock Active</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px 0; line-height: 1.5;">This site is blocked during your Pomodoro focus session. Attempt logged to your Focusnyx report.</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="fnyx-back" style="padding: 12px 24px; background: #6366f1; color: #fff; border: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;">Go Back</button>
          <button id="fnyx-app" style="padding: 12px 24px; background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.25); border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;">Return to Focusnyx</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    document.getElementById("fnyx-back")?.addEventListener("click", () => history.back());
    document.getElementById("fnyx-app")?.addEventListener("click", () => {
      window.location.href = "http://localhost:3000";
    });
  }

  function removeOverlay() {
    const existing = document.getElementById("fnyx-overlay");
    if (existing) existing.remove();
  }

  safeSendMessage({ action: "getStatus" }, (res) => {
    if (res && res.isActive) {
      const allowed = res.allowedUrls || ["localhost", "127.0.0.1", "focusnyx"];
      const isAllowed = allowed.some(
        (a: string) => currentHost.includes(a) || a.includes(currentHost)
      );
      if (!isAllowed) {
        showOverlay();
      }
    }
  });

  try {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "focusStateChanged") {
          if (msg.isActive) {
            safeSendMessage({ action: "getStatus" }, (res) => {
              if (res && res.isActive) {
                const allowed = res.allowedUrls || ["localhost", "127.0.0.1", "focusnyx"];
                const isAllowed = allowed.some(
                  (a: string) => currentHost.includes(a) || a.includes(currentHost)
                );
                if (!isAllowed) showOverlay();
              }
            });
          } else {
            removeOverlay();
          }
        }
      });
    }
  } catch {}
})();
