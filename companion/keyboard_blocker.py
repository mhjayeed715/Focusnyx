"""
Focusnyx Windows Companion - Low-Level Keyboard Blocker
Blocks system shortcut keys (Alt+Tab, Win, Ctrl+Esc, Alt+Esc) during Focus Lock.
Allows all normal typing inside Focusnyx window.
Outside Focusnyx: blocks typing but allows scroll/navigation/digit keys.
"""
import logging
import threading

try:
    import keyboard
except ImportError:
    keyboard = None

try:
    import win32gui
    import win32process
    import win32con
except ImportError:
    win32gui = None
    win32process = None
    win32con = None

try:
    import psutil
except ImportError:
    psutil = None

logger = logging.getLogger("focusnyx.keyboard_blocker")

# Keys that are always allowed outside Focusnyx (navigation, digits for PIN)
ALLOWED_OUTSIDE = {
    "up", "down", "left", "right",
    "page up", "page down", "home", "end",
    "space", "backspace", "delete", "enter", "escape", "tab",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "numpad 0", "numpad 1", "numpad 2", "numpad 3", "numpad 4",
    "numpad 5", "numpad 6", "numpad 7", "numpad 8", "numpad 9",
}

EXCLUDED_PROCESSES = {
    "code.exe", "devenv.exe", "idea64.exe", "pycharm64.exe",
    "webstorm64.exe", "sublime_text.exe", "notepad.exe",
    "notepad++.exe", "cmd.exe", "powershell.exe",
    "windows-terminal.exe", "openconsole.exe",
}

BROWSER_PROCESSES = {
    "chrome.exe", "msedge.exe", "firefox.exe", "brave.exe",
    "opera.exe", "vivaldi.exe", "arc.exe",
}

FOCUSNYX_TITLES = {
    "focusnyx", "localhost:3000", "127.0.0.1:3000",
    "localhost:3001", "focusnyx.vercel.app",
}


def _get_foreground_proc_and_title():
    if not win32gui:
        return "", ""
    try:
        hwnd = win32gui.GetForegroundWindow()
        if not hwnd:
            return "", ""
        title = win32gui.GetWindowText(hwnd).lower()
        proc_name = ""
        if win32process and psutil:
            try:
                _, pid = win32process.GetWindowThreadProcessId(hwnd)
                if pid:
                    proc_name = psutil.Process(pid).name().lower()
            except Exception:
                pass
        return proc_name, title
    except Exception:
        return "", ""


def _is_focusnyx_window():
    proc_name, title = _get_foreground_proc_and_title()
    if proc_name in EXCLUDED_PROCESSES:
        return False
    # Companion app GUI
    if ("python" in proc_name or "focusnyxcompanion" in proc_name) and "focusnyx" in title:
        return True
    # Browser with Focusnyx tab active
    if proc_name in BROWSER_PROCESSES or not proc_name:
        return any(t in title for t in FOCUSNYX_TITLES)
    return False


class KeyboardBlocker:
    def __init__(self):
        self.is_blocking = False
        self._hook_handle = None
        self._hotkey_handles = []

    def _on_key_event(self, event):
        """Called for every key event when hook is active (suppress=True blocks all by default).
        We selectively allow keys by returning False to suppress or True to pass through."""
        if not self.is_blocking:
            return True  # pass through

        name = (event.name or "").lower()

        # Always suppress OS-level system shortcuts
        if name in ("left windows", "right windows"):
            return False
        if name == "escape" and _is_ctrl_pressed():
            return False  # Ctrl+Esc
        if name == "tab" and _is_alt_pressed():
            return False  # Alt+Tab
        if name == "escape" and _is_alt_pressed():
            return False  # Alt+Esc

        # Inside Focusnyx window: allow everything
        if _is_focusnyx_window():
            return True

        # Outside Focusnyx: allow only navigation/digit keys
        if name in ALLOWED_OUTSIDE:
            return True

        # Block everything else outside Focusnyx
        return False

    def start_blocking(self):
        if self.is_blocking or not keyboard:
            return
        self.is_blocking = True
        logger.info("[Focusnyx Companion] Keyboard hooks ENGAGED")
        try:
            # suppress=True means keyboard library suppresses ALL events by default;
            # we use the hook callback to selectively re-inject allowed keys
            self._hook_handle = keyboard.hook(self._on_key_event, suppress=True)
        except Exception as e:
            logger.error(f"Error starting keyboard hook: {e}")

    def stop_blocking(self):
        if not self.is_blocking or not keyboard:
            return
        self.is_blocking = False
        logger.info("[Focusnyx Companion] Keyboard hooks RELEASED")
        try:
            keyboard.unhook_all()
            self._hook_handle = None
        except Exception as e:
            logger.warning(f"keyboard unhook error: {e}")


def _is_alt_pressed():
    try:
        return keyboard.is_pressed("alt")
    except Exception:
        return False


def _is_ctrl_pressed():
    try:
        return keyboard.is_pressed("ctrl")
    except Exception:
        return False
