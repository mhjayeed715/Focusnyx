"""
Focusnyx Windows Companion - Process Monitor & App Killer
Scans running processes and terminates unauthorized/distracting applications (Discord, Spotify, Steam, etc.) during active Focus Lock.
"""
import time
import threading
import logging
import psutil

logger = logging.getLogger("focusnyx.process_monitor")

DEFAULT_BLACKLIST = [
    "discord.exe",
    "spotify.exe",
    "steam.exe",
    "epicgameslauncher.exe",
    "telegram.exe",
    "whatsapp.exe",
    "slack.exe",
    "battle.net.exe",
    "origin.exe",
]

class ProcessMonitor:
    def __init__(self, blacklist=None, log_callback=None):
        self.blacklist = [app.lower() for app in (blacklist or DEFAULT_BLACKLIST)]
        self.log_callback = log_callback
        self.is_running = False
        self._thread = None
        self.block_count = 0

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()
        logger.info("[Focusnyx Companion] Process monitor STARTED")

    def stop(self):
        self.is_running = False
        if self._thread:
            self._thread.join(timeout=2.0)
            self._thread = None
        logger.info("[Focusnyx Companion] Process monitor STOPPED")

    def _monitor_loop(self):
        while self.is_running:
            try:
                for proc in psutil.process_iter(['pid', 'name']):
                    if not self.is_running:
                        break
                    try:
                        pname = proc.info['name']
                        if pname and pname.lower() in self.blacklist:
                            proc.kill()
                            self.block_count += 1
                            logger.info(f"[Focusnyx Companion] Terminated distraction process: {pname} (PID {proc.info['pid']})")
                            if self.log_callback:
                                self.log_callback("process_terminated", pname)
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        pass
            except Exception as e:
                logger.error(f"[Focusnyx Companion] Process scan error: {e}")
            
            time.sleep(2)
