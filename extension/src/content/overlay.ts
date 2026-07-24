(function () {
  const currentHost = window.location.hostname;
  const isAppDomain =
    currentHost.includes("localhost") ||
    currentHost.includes("127.0.0.1") ||
    currentHost.includes("focusnyx") ||
    currentHost.includes("vercel.app");

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
                { action: "startFocus", duration: durationMs, pin: pin || "123456" },
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

    // 1. Listen for requests from Web App DOM
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "FOCUSNYX_WEB_APP_ACTION") return;
      const { action, duration, durationMinutes, pin } = event.data;
      const durationMins = durationMinutes || (duration ? duration / 60000 : 25);

      if (action === "startFocus") {
        const durationMs = durationMins * 60 * 1000;
        safeSendMessage(
          { action: "startFocus", duration: durationMs, blocklist: event.data.blocklist || event.data.blockedSites, pin: pin || "123456" },
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
      }
    });

    document.addEventListener("FOCUSNYX_DOM_ACTION", (event: any) => {
      if (!event.detail) return;
      const { action, durationMinutes, pin } = event.detail;
      const durationMins = durationMinutes || 25;
      if (action === "startFocus") {
        safeSendMessage({ action: "startFocus", duration: durationMins * 60 * 1000, pin: pin || "123456" }, (res) => {
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
          safeSendMessage({ action: "startFocus", duration: durationMs, pin: pin || "123456" }, (res) => {
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
})();
