r"""
Focusnyx Windows Companion - Registry Manager
Toggles Windows Policy registry keys to disable/enable Task Manager during focus lock sessions.
Path: HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System
"""
import winreg
import logging

logger = logging.getLogger("focusnyx.registry_manager")

REG_PATH = r"Software\Microsoft\Windows\CurrentVersion\Policies\System"

class RegistryManager:
    @staticmethod
    def disable_task_manager():
        """Disables Task Manager via HKCU Policy registry."""
        try:
            key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_PATH)
            winreg.SetValueEx(key, "DisableTaskMgr", 0, winreg.REG_DWORD, 1)
            winreg.CloseKey(key)
            logger.info("[Focusnyx Companion] Task Manager DISABLED via Registry policy")
            return True
        except Exception as e:
            logger.error(f"[Focusnyx Companion] Failed to disable Task Manager: {e}")
            return False

    @staticmethod
    def enable_task_manager():
        """Re-enables Task Manager via HKCU Policy registry."""
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_PATH, 0, winreg.KEY_SET_VALUE)
            winreg.SetValueEx(key, "DisableTaskMgr", 0, winreg.REG_DWORD, 0)
            winreg.CloseKey(key)
            logger.info("[Focusnyx Companion] Task Manager ENABLED via Registry policy")
            return True
        except Exception as e:
            logger.error(f"[Focusnyx Companion] Failed to enable Task Manager: {e}")
            return False
