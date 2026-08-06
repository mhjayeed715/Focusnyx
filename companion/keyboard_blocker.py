"""
Focusnyx Windows Companion - Low-Level Keyboard Blocker
Uses ctypes WH_KEYBOARD_LL to strictly block keys.
Inside Focusnyx window: allows normal typing but blocks Ctrl+W, Alt+F4, Win, Alt+Tab, etc.
Outside Focusnyx window: blocks ALL normal typing (except navigation if needed).
"""
import logging
import threading
import ctypes
from ctypes import wintypes
import time

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
    # Browser with Focusnyx tab active — always check this first
    if proc_name in BROWSER_PROCESSES or not proc_name:
        return any(t in title for t in FOCUSNYX_TITLES)
    # Companion app GUI
    if ("python" in proc_name or "focusnyxcompanion" in proc_name) and "focusnyx" in title:
        return True
    # Non-browser, non-companion process = outside the app
    return False

# User32 types and constants
user32 = ctypes.WinDLL('user32', use_last_error=True)
WH_KEYBOARD_LL = 13
WM_KEYDOWN = 0x0100
WM_KEYUP = 0x0101
WM_SYSKEYDOWN = 0x0104
WM_SYSKEYUP = 0x0105

# Virtual Key Codes
VK_TAB = 0x09
VK_CONTROL = 0x11
VK_MENU = 0x12 # Alt
VK_ESCAPE = 0x1B
VK_LWIN = 0x5B
VK_RWIN = 0x5C
VK_F4 = 0x73
VK_W = 0x57

class KBDLLHOOKSTRUCT(ctypes.Structure):
    _fields_ = [
        ("vkCode", wintypes.DWORD),
        ("scanCode", wintypes.DWORD),
        ("flags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(wintypes.ULONG))
    ]

HOOKPROC = ctypes.WINFUNCTYPE(wintypes.LPARAM, wintypes.INT, wintypes.WPARAM, wintypes.LPARAM)

class KeyboardBlocker:
    def __init__(self):
        self.is_blocking = False
        self._hook_id = None
        self._hook_proc = None
        self._thread = None

    def _hook_callback(self, nCode, wParam, lParam):
        if nCode >= 0:
            kbd_struct = ctypes.cast(lParam, ctypes.POINTER(KBDLLHOOKSTRUCT)).contents
            vk_code = kbd_struct.vkCode
            
            # Check if Ctrl or Alt are pressed
            ctrl_pressed = (user32.GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0
            alt_pressed = (user32.GetAsyncKeyState(VK_MENU) & 0x8000) != 0

            # 1. ALWAYS block system shortcuts globally (regardless of window)
            if vk_code in (VK_LWIN, VK_RWIN):
                return 1
            if alt_pressed and vk_code == VK_TAB:
                return 1
            if alt_pressed and vk_code == VK_ESCAPE:
                return 1
            if ctrl_pressed and vk_code == VK_ESCAPE:
                return 1
            
            is_app = _is_focusnyx_window()
            
            if is_app:
                # Inside the Focusnyx browser tab: only block close shortcuts
                if ctrl_pressed and vk_code == VK_W:
                    return 1
                if alt_pressed and vk_code == VK_F4:
                    return 1
                if ctrl_pressed and vk_code == VK_F4:
                    return 1
                # Allow all other typing inside the app
            else:
                # Outside the Focusnyx app: block ALL keys except pure navigation
                # Navigation keys: Left/Right/Up/Down arrows, PageUp/Down, Home, End
                NAVIGATION_KEYS = {0x25, 0x26, 0x27, 0x28, 0x21, 0x22, 0x23, 0x24}
                if vk_code not in NAVIGATION_KEYS:
                    return 1

        return user32.CallNextHookEx(self._hook_id, nCode, wParam, lParam)

    def _run_hook(self):
        self._thread_id = ctypes.windll.kernel32.GetCurrentThreadId()
        self._hook_proc = HOOKPROC(self._hook_callback)
        self._hook_id = user32.SetWindowsHookExW(WH_KEYBOARD_LL, self._hook_proc, 0, 0)
        if not self._hook_id:
            logger.error("Failed to install keyboard hook")
            return

        msg = wintypes.MSG()
        while True:
            bRet = user32.GetMessageW(ctypes.byref(msg), None, 0, 0)
            if bRet <= 0:
                break
            # Use WM_USER + 1 as custom quit to avoid GetMessage returning 0 prematurely if not intended
            if msg.message == 0x0401: 
                break
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))

        user32.UnhookWindowsHookEx(self._hook_id)
        self._hook_id = None
        self._hook_proc = None

    def start_blocking(self):
        if self.is_blocking:
            return
        self.is_blocking = True
        logger.info("[Focusnyx Companion] Keyboard hooks ENGAGED")
        
        self._thread = threading.Thread(target=self._run_hook, daemon=True)
        self._thread.start()

    def stop_blocking(self):
        if not self.is_blocking:
            return
        self.is_blocking = False
        logger.info("[Focusnyx Companion] Keyboard hooks RELEASED")
        if getattr(self, '_thread_id', None):
            user32.PostThreadMessageW(self._thread_id, 0x0401, 0, 0)
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None
