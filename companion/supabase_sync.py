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
        if create_client and url and "your-supabase" not in url:
            try:
                self.client = create_client(url, key)
                logger.info("[Focusnyx Companion] Supabase client initialized")
            except Exception as e:
                logger.warning(f"[Focusnyx Companion] Supabase connection failed: {e}")

    def log_event(self, event_type, details):
        data = {
            "event_type": event_type,
            "details": str(details),
            "timestamp": datetime.utcnow().isoformat(),
            "source": "windows_companion"
        }
        if self.client:
            try:
                self.client.table("distraction_logs").insert(data).execute()
                logger.info(f"[Focusnyx Companion] Logged event to Supabase: {event_type}")
            except Exception as e:
                logger.warning(f"[Focusnyx Companion] Failed to push event to Supabase: {e}")
        else:
            logger.info(f"[Focusnyx Companion] Local log: {data}")
