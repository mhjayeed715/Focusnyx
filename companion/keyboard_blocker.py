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

        # Approach 1: Python keyboard library hotkey suppression
        if keyboard:
            try:
                for key in self.hooked_keys:
                    try:
                        keyboard.block_key(key)
                    except Exception:
                        pass
            except Exception as e:
                logger.warning(f"keyboard module hook error: {e}")

        # Approach 2: pynput listener fallback / complement
        if pynput_keyboard:
            def on_press(key):
                if not self.is_blocking:
                    return True
                # Suppress Win key, Alt+Tab, etc.
                try:
                    if key in (pynput_keyboard.Key.cmd, pynput_keyboard.Key.cmd_r, pynput_keyboard.Key.alt_l, pynput_keyboard.Key.alt_r):
                        return False
                except Exception:
                    pass
                return True

            try:
                self._listener = pynput_keyboard.Listener(on_press=on_press, suppress=True)
                self._listener.start()
            except Exception as e:
                logger.warning(f"pynput listener start error: {e}")

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

        if self._listener:
            try:
                self._listener.stop()
                self._listener = None
            except Exception as e:
                logger.warning(f"pynput listener stop error: {e}")
