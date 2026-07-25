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
    import win32process
except ImportError:
    win32gui = None
    win32process = None

try:
    import psutil
except ImportError:
    psutil = None

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

    # IDEs, Code Editors, Terminals, and System tools to strictly exclude (never treat as Focusnyx window)
    EXCLUDED_PROCESSES = {
        "code.exe", "devenv.exe", "idea64.exe", "pycharm64.exe",
        "webstorm64.exe", "sublime_text.exe", "notepad.exe",
        "notepad++.exe", "cmd.exe", "powershell.exe",
        "windows-terminal.exe", "openconsole.exe", "discord.exe",
        "slack.exe", "telegram.exe", "whatsapp.exe", "explorer.exe"
    }

    # Supported Web Browsers
    BROWSER_PROCESSES = {
        "chrome.exe", "msedge.exe", "firefox.exe", "brave.exe",
        "opera.exe", "vivaldi.exe", "arc.exe"
    }

    def _is_focusnyx_window(self):
        if not win32gui:
            return False
        try:
            hwnd = win32gui.GetForegroundWindow()
            if not hwnd:
                return False

            proc_name = ""
            if win32process and psutil:
                try:
                    _, pid = win32process.GetWindowThreadProcessId(hwnd)
                    if pid:
                        proc_name = psutil.Process(pid).name().lower()
                except Exception:
                    pass

            # Explicitly reject IDEs, terminals, and non-browser apps even if "focusnyx" is in the folder name / title
            if proc_name in self.EXCLUDED_PROCESSES:
                return False

            title = win32gui.GetWindowText(hwnd).lower()

            # Companion App GUI window itself
            if ("python" in proc_name or "focusnyxcompanion" in proc_name) and "focusnyx" in title:
                return True

            # If it's a browser, check that the tab title actually belongs to Focusnyx web app
            if proc_name in self.BROWSER_PROCESSES or not proc_name:
                return (
                    "focusnyx" in title
                    or "localhost:3000" in title
                    or "127.0.0.1:3000" in title
                    or "localhost:3001" in title
                    or "focusnyx.vercel.app" in title
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

