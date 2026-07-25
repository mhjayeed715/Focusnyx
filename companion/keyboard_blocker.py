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

    SYSTEM_SHORTCUTS = {"win", "left windows", "right windows", "ctrl+esc", "alt+esc"}

    def _is_focusnyx_window(self):
        if not win32gui:
            return False
        try:
            hwnd = win32gui.GetForegroundWindow()
            if hwnd:
                title = win32gui.GetWindowText(hwnd).lower()
                return (
                    "focusnyx" in title
                    or "localhost:3000" in title
                    or "127.0.0.1:3000" in title
                    or "localhost:3001" in title
                )
        except Exception:
            pass
        return False

    def _filter_keys(self, event):
        if not self.is_blocking:
            return True

        name = event.name.lower() if event.name else ""

        # Always block OS-level system shortcuts regardless of window
        if name in self.SYSTEM_SHORTCUTS:
            return False

        # Block Alt+Tab combination
        try:
            import keyboard as kb
            if name == "tab" and kb.is_pressed("alt"):
                return False
        except Exception:
            pass

        # Inside Focusnyx: allow all normal keyboard input
        if self._is_focusnyx_window():
            return True

        # Outside Focusnyx: block all typing to prevent using other apps
        # but allow digits and basic keys for any PIN dialogs
        is_digit = (len(name) == 1 and name.isdigit()) or (
            name.startswith("numpad ") and name.split(" ")[-1].isdigit()
        )
        if is_digit or name in ["backspace", "delete", "enter", "escape"]:
            return True

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

