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
    from pynput import keyboard as pynput_keyboard
except ImportError:
    pynput_keyboard = None

logger = logging.getLogger("focusnyx.keyboard_blocker")

class KeyboardBlocker:
    def __init__(self):
        self.is_blocking = False
        self.hooked_keys = ["alt+tab", "win", "ctrl+esc", "alt+esc"]
        self._thread = None
        self._listener = None

    def start_blocking(self):
        if self.is_blocking:
            return
        self.is_blocking = True
        logger.info("[Focusnyx Companion] Keyboard hooks ENGAGED")

        # Approach 1: Python keyboard library for hotkey suppression
        if keyboard:
            for k in ["win", "left windows", "right windows", "alt+tab", "alt+esc", "ctrl+esc"]:
                try:
                    keyboard.block_key(k)
                except Exception:
                    pass

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
