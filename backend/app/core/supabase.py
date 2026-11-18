from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

def get_supabase_client() -> Optional[Client]:
    if (
        settings.SUPABASE_URL 
        and settings.SUPABASE_SERVICE_ROLE_KEY 
        and "placeholder" not in settings.SUPABASE_URL
        and "your-supabase" not in settings.SUPABASE_URL
    ):
        try:
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        except Exception:
            return None
    return None
