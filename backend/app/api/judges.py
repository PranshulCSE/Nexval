import csv
import io
import secrets
import string
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from app.core.config import settings
from supabase import create_client, Client

router = APIRouter(prefix="/judges", tags=["Judges"])


def get_supabase_client() -> Optional[Client]:
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY and "placeholder" not in settings.SUPABASE_URL:
        try:
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        except Exception:
            return None
    return None

def generate_secure_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

# Default in-memory demo judges
DEMO_JUDGES: List[Dict[str, Any]] = [
    {
        "id": "b0000000-0000-0000-0000-000000000001",
        "name": "Dr. Sarah Verma",
        "email": "judge1@nexhack.com",
        "role": "judge",
        "password": "password123",
        "created_at": "2026-11-17T14:30:00Z"
    },
    {
        "id": "b0000000-0000-0000-0000-000000000002",
        "name": "Prof. Rajesh Kumar",
        "email": "judge2@nexhack.com",
        "role": "judge",
        "password": "password123",
        "created_at": "2026-11-17T14:30:00Z"
    },
    {
        "id": "b0000000-0000-0000-0000-000000000003",
        "name": "Ananya Sharma (Tech Lead)",
        "email": "judge3@nexhack.com",
        "role": "judge",
        "password": "password123",
        "created_at": "2026-11-17T14:30:00Z"
    }
]

class JudgeCreateItem(BaseModel):
    name: str
    email: str
    role: Optional[str] = "judge"
    password: Optional[str] = None


class BulkJudgesPayload(BaseModel):
    judges: List[JudgeCreateItem]
    actor_id: Optional[str] = None


@router.get("")
async def list_judges():
    """
    List all judges and mentors.
    """
    sb = get_supabase_client()
    if sb:
        try:
            res = sb.table("profiles").select("*").in_("role", ["judge", "mentor"]).order("created_at").execute()
            if res.data:
                return {"judges": res.data}
        except Exception:
            pass

    return {"judges": DEMO_JUDGES}


@router.post("/bulk")
async def bulk_create_judges(payload: BulkJudgesPayload):
    """
    Bulk create judges. Auto-generates passwords if not provided,
    creates auth users & profiles, and returns credentials for CSV export.
    """
    if not payload.judges:
        raise HTTPException(status_code=400, detail="No judges provided.")

    created_judges = []
    sb = get_supabase_client()

    for item in payload.judges:
        raw_pw = item.password.strip() if item.password else generate_secure_password(10)
        judge_role = item.role if item.role in ("judge", "mentor") else "judge"
        
        user_id = None
        if sb:
            try:
                # Create via Supabase Auth Admin API
                res = sb.auth.admin.create_user({
                    "email": item.email,
                    "password": raw_pw,
                    "email_confirm": True,
                    "user_metadata": {
                        "name": item.name,
                        "role": judge_role
                    }
                })
                user_id = res.user.id
            except Exception as e:
                # If user already exists in auth, lookup ID
                try:
                    users = sb.auth.admin.list_users()
                    for u in users:
                        if u.email == item.email:
                            user_id = u.id
                            break
                except Exception:
                    pass

            if user_id:
                try:
                    sb.table("profiles").upsert({
                        "id": user_id,
                        "name": item.name,
                        "email": item.email,
                        "role": judge_role
                    }).execute()
                except Exception:
                    pass
        else:
            user_id = f"judge-{len(DEMO_JUDGES) + 1:03d}"

        record = {
            "id": user_id or f"judge-{len(DEMO_JUDGES) + 1:03d}",
            "name": item.name,
            "email": item.email,
            "role": judge_role,
            "password": raw_pw,
            "created_at": "2026-11-17T16:00:00Z"
        }

        # Check if already in DEMO_JUDGES
        existing = next((j for j in DEMO_JUDGES if j["email"] == item.email), None)
        if existing:
            existing.update(record)
        else:
            DEMO_JUDGES.append(record)

        created_judges.append(record)

    # Non-negotiable Rule 4: Append to audit_log
    if sb:
        try:
            sb.table("audit_log").insert({
                "actor_id": payload.actor_id,
                "action": "JUDGES_BULK_CREATE",
                "entity_type": "PROFILES",
                "entity_id": "BATCH",
                "details": {
                    "count": len(created_judges),
                    "emails": [j["email"] for j in created_judges]
                }
            }).execute()
        except Exception:
            pass

    return {
        "status": "success",
        "count": len(created_judges),
        "judges": created_judges,
        "message": f"Successfully created {len(created_judges)} judges."
    }
