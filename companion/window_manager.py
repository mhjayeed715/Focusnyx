"""
Focusnyx Windows Companion - Window Manager
Enforces browser/PWA window on top and minimizes unallowed background windows.
Uses win32gui / win32con on Windows.
"""
import time
import threading
import logging

try:
    import win32gui
    import win32con
except ImportError:
    win32gui = None
    win32con = None

logger = logging.getLogger("focusnyx.window_manager")

class WindowManager:
    def __init__(self, target_titles=None):
        self.target_titles = [t.lower() for t in (target_titles or ["chrome", "focusnyx", "edge", "brave", "firefox"])]
        self.is_running = False
        self._thread = None

    def start(self):
        if not win32gui:
            logger.warning("[Focusnyx Companion] win32gui not available, window manager skipped")
            return
        if self.is_running:
            return
        self.is_running = True
        self._thread = threading.Thread(target=self._window_loop, daemon=True)
        self._thread.start()
        logger.info("[Focusnyx Companion] Window Manager STARTED")

    def stop(self):
        self.is_running = False
        if self._thread:
            self._thread.join(timeout=2.0)
            self._thread = None
        logger.info("[Focusnyx Companion] Window Manager STOPPED")

    def _window_loop(self):
        while self.is_running:
            try:
                hwnd = win32gui.GetForegroundWindow()
                if hwnd:
                    title = win32gui.GetWindowText(hwnd).lower()
                    is_target = any(t in title for t in self.target_titles)
                    if is_target:
                        # Pin target window to always on top
                        win32gui.SetWindowPos(
                            hwnd, win32con.HWND_TOPMOST, 0, 0, 0, 0,
                            win32con.SWP_NOMOVE | win32con.SWP_NOSIZE
                        )
            except Exception as e:
                logger.error(f"[Focusnyx Companion] Window manager error: {e}")

            time.sleep(3)
