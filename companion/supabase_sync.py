"""
Focusnyx Windows Companion - Supabase Logger
Syncs desktop distraction logs and focus events with Supabase database.
"""
import os
import logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None

logger = logging.getLogger("focusnyx.supabase_sync")

class SupabaseSync:
    def __init__(self):
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
        self.client = None
        self.user_id = None
        if create_client and url and "your-supabase" not in url:
            try:
                self.client = create_client(url, key)
                logger.info("[Focusnyx Companion] Supabase client initialized")
            except Exception as e:
                logger.warning(f"[Focusnyx Companion] Supabase connection failed: {e}")

    def set_user_id(self, user_id: str):
        """Set the current user ID for log attribution."""
        self.user_id = user_id

    def log_event(self, event_type, details, app_name=None, url=None):
        data = {
            "type": event_type,
            "details": {
                "detail": str(details),
                "app": app_name or "",
                "url": url or "",
                "source": "windows_companion"
            },
            "timestamp": datetime.utcnow().isoformat(),
            "blocked_at": datetime.utcnow().isoformat(),
        }
        if self.user_id:
            data["user_id"] = self.user_id
        if app_name:
            data["domain"] = app_name
        if url:
            data["domain"] = url

        if self.client:
            try:
                self.client.table("distraction_logs").insert(data).execute()
                logger.info(f"[Focusnyx Companion] Logged event to Supabase: {event_type}")
            except Exception as e:
                logger.warning(f"[Focusnyx Companion] Failed to push event to Supabase: {e}")
        else:
            logger.info(f"[Focusnyx Companion] Local log: {data}")
