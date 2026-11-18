import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from app.core.supabase import get_supabase_client
from app.core.config import settings

router = APIRouter(prefix="/announcements", tags=["Announcements"])

# In-memory fallback announcements
MOCK_ANNOUNCEMENTS = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "title": "Welcome to NexHack 2.0",
        "message": "Judges and mentors, please review your assigned teams on your dashboard. Evaluations are live.",
        "priority": "info",
        "target_role": "all",
        "is_active": True,
        "created_at": "2026-11-18T09:00:00Z",
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "title": "Round 2 Submission Window",
        "message": "Scoring for Round 2 is now open. All rubrics must be completed before the timer ends.",
        "priority": "warning",
        "target_role": "judge",
        "is_active": True,
        "created_at": "2026-11-18T10:30:00Z",
    }
]

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    priority: str = "info"  # info, warning, urgent
    target_role: str = "all"  # all, judge, mentor, admin

class AnnouncementResponse(BaseModel):
    id: str
    title: str
    message: str
    priority: str
    target_role: str
    is_active: bool
    created_at: str

@router.get("", response_model=List[AnnouncementResponse])
async def list_announcements(
    active_only: bool = True,
    role: Optional[str] = None
):
    """
    List announcements. If Supabase is connected, fetches from database.
    Otherwise returns fallback list.
    """
    if "your-supabase" not in settings.SUPABASE_URL:
        try:
            supabase = get_supabase_client()
            query = supabase.table("announcements").select("*")
            if active_only:
                query = query.eq("is_active", True)
            if role and role != "admin":
                query = query.in_("target_role", ["all", role])
            res = query.order("created_at", desc=True).execute()
            if res.data:
                return res.data
        except Exception as e:
            print(f"Supabase announcements fetch error, using fallback: {e}")

    results = [a for a in MOCK_ANNOUNCEMENTS]
    if active_only:
        results = [a for a in results if a.get("is_active", True)]
    if role and role != "admin":
        results = [a for a in results if a.get("target_role") in ["all", role]]
    
    return sorted(results, key=lambda x: x["created_at"], reverse=True)

@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(payload: AnnouncementCreate):
    """
    Post a new announcement. Available to admins.
    """
    announcement_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    new_announcement = {
        "id": announcement_id,
        "title": payload.title.strip(),
        "message": payload.message.strip(),
        "priority": payload.priority.lower() if payload.priority in ["info", "warning", "urgent"] else "info",
        "target_role": payload.target_role.lower() if payload.target_role in ["all", "judge", "mentor", "admin"] else "all",
        "is_active": True,
        "created_at": now_iso,
    }

    if "your-supabase" not in settings.SUPABASE_URL:
        try:
            supabase = get_supabase_client()
            res = supabase.table("announcements").insert(new_announcement).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"Supabase announcements insert error, using fallback: {e}")

    # Fallback in-memory
    MOCK_ANNOUNCEMENTS.insert(0, new_announcement)
    return new_announcement

@router.patch("/{announcement_id}/toggle")
async def toggle_announcement(announcement_id: str):
    """
    Toggle an announcement active/inactive status.
    """
    if "your-supabase" not in settings.SUPABASE_URL:
        try:
            supabase = get_supabase_client()
            res = supabase.table("announcements").select("is_active").eq("id", announcement_id).execute()
            if res.data:
                current_status = res.data[0]["is_active"]
                upd = supabase.table("announcements").update({"is_active": not current_status}).eq("id", announcement_id).execute()
                return {"success": True, "is_active": not current_status}
        except Exception as e:
            print(f"Supabase announcement toggle error: {e}")

    for a in MOCK_ANNOUNCEMENTS:
        if a["id"] == announcement_id:
            a["is_active"] = not a["is_active"]
            return {"success": True, "is_active": a["is_active"]}

    raise HTTPException(status_code=404, detail="Announcement not found")

@router.delete("/{announcement_id}")
async def delete_announcement(announcement_id: str):
    """
    Delete an announcement.
    """
    if "your-supabase" not in settings.SUPABASE_URL:
        try:
            supabase = get_supabase_client()
            supabase.table("announcements").delete().eq("id", announcement_id).execute()
            return {"success": True, "message": "Announcement deleted"}
        except Exception as e:
            print(f"Supabase announcement delete error: {e}")

    global MOCK_ANNOUNCEMENTS
    MOCK_ANNOUNCEMENTS = [a for a in MOCK_ANNOUNCEMENTS if a["id"] != announcement_id]
    return {"success": True, "message": "Announcement deleted"}
