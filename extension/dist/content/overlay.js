// src/content/overlay.ts
(function() {
  const currentHost = window.location.hostname;
  const isAppDomain = currentHost.includes("localhost") || currentHost.includes("127.0.0.1") || currentHost.includes("focusnyx") || currentHost.includes("vercel.app");
  const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("FOCUSNYX_SYNC_CHANNEL") : null;
  function safeSendMessage(message, callback) {
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
    }
  }
  if (isAppDomain) {
    let syncAuthFromLocalStorage2 = function() {
      try {
        let token = "";
        let userId = localStorage.getItem("focusnyxUserId") || "";
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes("supabase") || key.includes("sb-") || key.includes("auth"))) {
            const raw = localStorage.getItem(key);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                token = parsed.access_token || parsed.currentSession?.access_token || parsed.token || parsed.session?.access_token || "";
                if (!userId) {
                  userId = parsed.user?.id || parsed.currentSession?.user?.id || parsed.session?.user?.id || parsed.user?.email || "";
                }
                if (token) break;
              } catch {
              }
            }
          }
        }
        if (token) {
          safeSendMessage({ action: "syncAuth", token, userId });
        }
      } catch {
      }
    }, checkLocalStorageAction2 = function() {
      try {
        const raw = localStorage.getItem("focusnyx_app_focus_state");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.timestamp && parsed.timestamp > lastActionTimestamp) {
            lastActionTimestamp = parsed.timestamp;
            const { action, durationMinutes, pin } = parsed;
            if (action === "startFocus") {
              const durationMs = (durationMinutes || 25) * 60 * 1e3;
              safeSendMessage(
                { action: "startFocus", duration: durationMs, pin: pin || "123456" },
                (res) => {
                  if (res) {
                    safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp2(status));
                  }
                }
              );
            } else if (action === "endFocus") {
              safeSendMessage(
                { action: "endFocus", pin: pin || "123456" },
                (res) => {
                  if (res) {
                    safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp2(status));
                  }
                }
              );
            }
          }
        }
      } catch {
      }
    }, postStateToWebApp2 = function(state) {
      if (!state) return;
      const payload = {
        type: "FOCUSNYX_EXTENSION_EVENT",
        action: "FOCUS_STATE_CHANGED",
        state
      };
      window.postMessage(payload, "*");
      if (syncChannel) syncChannel.postMessage(payload);
    };
    var syncAuthFromLocalStorage = syncAuthFromLocalStorage2, checkLocalStorageAction = checkLocalStorageAction2, postStateToWebApp = postStateToWebApp2;
    syncAuthFromLocalStorage2();
    setInterval(syncAuthFromLocalStorage2, 3e3);
    let lastActionTimestamp = Date.now();
    window.addEventListener("storage", checkLocalStorageAction2);
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "FOCUSNYX_WEB_APP_ACTION") return;
      const { action, duration, durationMinutes, pin } = event.data;
      const durationMins = durationMinutes || (duration ? duration / 6e4 : 25);
      if (action === "startFocus") {
        const durationMs = durationMins * 60 * 1e3;
        safeSendMessage(
          { action: "startFocus", duration: durationMs, blocklist: event.data.blocklist || event.data.blockedSites, pin: pin || "123456" },
          (res) => {
            if (res) {
              safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp2(status));
            }
          }
        );
      } else if (action === "endFocus") {
        safeSendMessage(
          { action: "endFocus", pin: pin || "123456" },
          (res) => {
            if (res) {
              safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp2(status));
            }
          }
        );
      } else if (action === "getStatus") {
        safeSendMessage({ action: "getStatus" }, (res) => {
          if (res) postStateToWebApp2(res);
        });
      } else if (action === "updateBlocklist") {
        safeSendMessage({ action: "updateBlocklist", blocklist: event.data.blocklist }, (res) => {
          if (res) postStateToWebApp2(res);
        });
      } else if (action === "updateWhitelist") {
        safeSendMessage({ action: "updateWhitelist", allowedUrls: event.data.allowedUrls }, (res) => {
          if (res) postStateToWebApp2(res);
        });
      } else if (action === "syncPin") {
        safeSendMessage({ action: "syncPin", pin: event.data.pin });
      }
    });
    document.addEventListener("FOCUSNYX_DOM_ACTION", (event) => {
      if (!event.detail) return;
      const { action, durationMinutes, pin } = event.detail;
      const durationMins = durationMinutes || 25;
      if (action === "startFocus") {
        safeSendMessage({ action: "startFocus", duration: durationMins * 60 * 1e3, pin: pin || "123456" }, (res) => {
          if (res) {
            safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp2(status));
          }
        });
      } else if (action === "endFocus") {
        safeSendMessage({ action: "endFocus", pin: pin || "123456" }, (res) => {
          if (res) {
            safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp2(status));
          }
        });
      } else if (action === "getStatus") {
        safeSendMessage({ action: "getStatus" }, (res) => {
          if (res) postStateToWebApp2(res);
        });
      }
    });
    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        if (!event.data || event.data.type !== "FOCUSNYX_WEB_APP_ACTION") return;
        const { action, durationMinutes, pin } = event.data;
        if (action === "startFocus") {
          const durationMs = (durationMinutes || 25) * 60 * 1e3;
          safeSendMessage({ action: "startFocus", duration: durationMs, pin: pin || "123456" }, (res) => {
            if (res) {
              safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp2(status));
            }
          });
        } else if (action === "endFocus") {
          safeSendMessage({ action: "endFocus", pin: pin || "123456" }, (res) => {
            if (res) {
              safeSendMessage({ action: "getStatus" }, (status) => postStateToWebApp2(status));
            }
          });
        } else if (action === "getStatus") {
          safeSendMessage({ action: "getStatus" }, (res) => {
            if (res) postStateToWebApp2(res);
          });
        }
      };
    }
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg) => {
          if (msg.action === "focusStateChanged") {
            safeSendMessage({ action: "getStatus" }, (res) => {
              if (res) postStateToWebApp2(res);
            });
          }
        });
      }
    } catch {
    }
    safeSendMessage({ action: "getStatus" }, (res) => {
      if (res) postStateToWebApp2(res);
    });
    return;
  }
})();
