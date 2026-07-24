"""
Focusnyx Windows Companion - Low-Level Keyboard Blocker
Blocks system shortcut keys (Alt+Tab, Win, Ctrl+Esc, Alt+Esc) during Focus Lock.
Uses keyboard / pynput hooks on Windows.
"""
import sys
import logging
import threading
import time

try:
    import keyboard
except ImportError:
    keyboard = None

try:
    import win32gui
except ImportError:
    win32gui = None

logger = logging.getLogger("focusnyx.keyboard_blocker")

class KeyboardBlocker:
    def __init__(self):
        self.is_blocking = False
        self.hooked_keys = ["alt+tab", "win", "ctrl+esc", "alt+esc"]
        self._thread = None
        self._listener = None

    def _filter_keys(self, event):
        if not self.is_blocking:
            return True

        # Check if the active window is Focusnyx (local or web/vercel app)
        if win32gui:
            try:
                hwnd = win32gui.GetForegroundWindow()
                if hwnd:
                    title = win32gui.GetWindowText(hwnd).lower()
                    # If focused on Focusnyx, allow all input except system keys
                    if "focusnyx" in title or "localhost:3000" in title or "127.0.0.1:3000" in title:
                        if event.name in ["win", "left windows", "right windows", "alt+tab", "alt+esc", "ctrl+esc"]:
                            return False
                        return True
            except Exception:
                pass

        # Outside Focusnyx: allow ONLY numbers and basic navigation/editing keys for PIN input correction
        name = event.name.lower() if event.name else ""

        # Allow digits 0-9
        is_num = (len(name) == 1 and name.isdigit()) or (name.startswith("numpad ") and name.split(" ")[-1].isdigit())
        if is_num:
            return True

        # Allow navigation / basic entry correction keys for PIN input
        if name in ["backspace", "delete", "enter", "escape"]:
            return True

        # Suppress everything else
        return False

    def start_blocking(self):
        if self.is_blocking:
            return
        self.is_blocking = True
        logger.info("[Focusnyx Companion] Keyboard hooks ENGAGED")

        if keyboard:
            try:
                # Install a global blocking hook
                keyboard.hook(self._filter_keys, suppress=True)
            except Exception as e:
                logger.error(f"Error starting keyboard hook: {e}")

    def stop_blocking(self):
        if not self.is_blocking:
            return
        self.is_blocking = False
        logger.info("[Focusnyx Companion] Keyboard hooks RELEASED")

        if keyboard:
            try:
                keyboard.unhook_all()
            except Exception as e:
                logger.warning(f"keyboard unhook error: {e}")

