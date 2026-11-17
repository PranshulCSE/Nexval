from typing import Optional
from fastapi import APIRouter, Query
from app.core.config import settings
from supabase import create_client, Client

router = APIRouter(prefix="/audit-log", tags=["Audit Log"])

def get_supabase_client() -> Optional[Client]:
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY and "placeholder" not in settings.SUPABASE_URL:
        try:
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        except Exception:
            return None
    return None

DEMO_AUDIT_LOGS = [
    {
        "id": "aud-001",
        "actor_id": "a0000000-0000-0000-0000-000000000001",
        "actor": "admin@nexhack.com",
        "action": "SYSTEM_INIT",
        "entity_type": "SYSTEM",
        "entity_id": "INITIALIZATION",
        "details": {"note": "System initialized with append-only triggers and RLS"},
        "created_at": "2026-11-17T14:30:00Z"
    },
    {
        "id": "aud-002",
        "actor_id": "a0000000-0000-0000-0000-000000000001",
        "actor": "admin@nexhack.com",
        "action": "TEAMS_AUTO_ASSIGNED",
        "entity_type": "ASSIGNMENTS",
        "entity_id": "11111111-0000-0000-0000-000000000001",
        "details": {"judges_per_team": 3, "total_teams": 30, "total_judges": 3},
        "created_at": "2026-11-17T15:00:00Z"
    },
    {
        "id": "aud-003",
        "actor_id": "b0000000-0000-0000-0000-000000000001",
        "actor": "judge1@nexhack.com",
        "action": "EVALUATION_LOCKED",
        "entity_type": "EVALUATION",
        "entity_id": "NEX-01",
        "details": {"team_id": "NEX-01", "total": 85.0, "locked": True},
        "created_at": "2026-11-17T15:15:00Z"
    }
]

@router.get("")
async def list_audit_logs(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1)):
    """
    List immutable audit log entries.
    """
    sb = get_supabase_client()
    if sb:
        try:
            offset = (page - 1) * page_size
            res = sb.table("audit_log").select("*, profiles(name, email)").order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
            if res.data:
                formatted = []
                for row in res.data:
                    prof = row.get("profiles") or {}
                    formatted.append({
                        "id": row["id"],
                        "actor": prof.get("email") or row.get("actor_id") or "system",
                        "action": row["action"],
                        "entity_type": row["entity_type"],
                        "entity_id": row.get("entity_id"),
                        "details": row.get("details", {}),
                        "created_at": row["created_at"]
                    })
                return {"audit_logs": formatted, "total": len(formatted)}
        except Exception:
            pass

    return {"audit_logs": DEMO_AUDIT_LOGS, "total": len(DEMO_AUDIT_LOGS)}
