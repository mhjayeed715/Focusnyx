"""
Focusnyx Windows Companion - Low-Level Keyboard Blocker
Blocks system shortcut keys (Alt+Tab, Win, Ctrl+Esc, Alt+Esc) during Focus Lock.
Allows all normal typing inside Focusnyx window.
Outside Focusnyx: blocks typing but allows scroll/navigation keys.
"""
import logging

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

    # Keys that switch away from the current app — always blocked
    SYSTEM_SHORTCUTS = {"win", "left windows", "right windows", "ctrl+esc", "alt+esc"}

    # Keys allowed outside Focusnyx: scroll, navigation, digits for PIN dialogs
    ALLOWED_OUTSIDE = {
        "up", "down", "left", "right",
        "page up", "page down", "home", "end",
        "space", "backspace", "delete", "enter", "escape", "tab",
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    }

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

        # Always block OS-level system shortcuts
        if name in self.SYSTEM_SHORTCUTS:
            return False

        # Block Alt+Tab
        try:
            import keyboard as kb
            if name == "tab" and kb.is_pressed("alt"):
                return False
        except Exception:
            pass

        # Inside Focusnyx: allow everything
        if self._is_focusnyx_window():
            return True

        # Outside Focusnyx: allow scroll/navigation/digits, block all typing
        if name in self.ALLOWED_OUTSIDE:
            return True
        # Allow numpad digits
        if name.startswith("numpad ") and name.split(" ")[-1].isdigit():
            return True

        return False

    def start_blocking(self):
        if self.is_blocking:
            return
        self.is_blocking = True
        logger.info("[Focusnyx Companion] Keyboard hooks ENGAGED")
        if keyboard:
            try:
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

