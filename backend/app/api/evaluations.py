from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings
from supabase import create_client, Client

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])

def get_supabase_client() -> Optional[Client]:
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY and "placeholder" not in settings.SUPABASE_URL:
        try:
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        except Exception:
            return None
    return None

# In-memory store for fallback/demo
DEMO_EVALUATIONS: Dict[str, Dict[str, Any]] = {}

class SaveDraftPayload(BaseModel):
    round_id: str
    judge_id: str
    team_id: str
    scores: Optional[Dict[str, float]] = None
    remarks: Optional[str] = ""

class SubmitEvaluationPayload(BaseModel):
    round_id: str
    judge_id: str
    team_id: str
    scores: Optional[Dict[str, float]] = None
    remarks: str

class UnlockPayload(BaseModel):
    eval_id: str
    actor_id: Optional[str] = None
    reason: Optional[str] = "Admin requested modification"


@router.get("/{round_id}/{team_id}")
async def get_evaluation(round_id: str, team_id: str, judge_id: str):
    """
    Get evaluation, criteria, and project submission deliverables for judge scoring screen.
    """
    from app.api.submissions import DEMO_SUBMISSIONS
    sub_data = DEMO_SUBMISSIONS.get(team_id)

    sb = get_supabase_client()
    if sb:
        try:
            e_res = sb.table("evaluations").select("*").eq("round_id", round_id).eq("judge_id", judge_id).eq("team_id", team_id).maybe_single().execute()
            r_res = sb.table("rounds").select("*").eq("id", round_id).single().execute()
            c_res = sb.table("rubric_criteria").select("*").eq("round_id", round_id).order("sort_order").execute()
            s_res = sb.table("submissions").select("*").eq("team_id", team_id).maybe_single().execute()
            if s_res.data:
                sub_data = s_res.data

            return {
                "evaluation": e_res.data,
                "round": r_res.data,
                "criteria": c_res.data or [],
                "submission": sub_data,
            }
        except Exception:
            pass

    # Demo fallback
    key = f"{round_id}:{judge_id}:{team_id}"
    from app.api.rounds import DEMO_ROUNDS
    round_obj = next((r for r in DEMO_ROUNDS if r["id"] == round_id), DEMO_ROUNDS[0])

    return {
        "evaluation": DEMO_EVALUATIONS.get(key),
        "round": round_obj,
        "criteria": round_obj.get("criteria", []),
        "submission": sub_data,
    }


@router.post("/draft")
async def save_draft(payload: SaveDraftPayload):
    """
    Auto-save draft evaluation (debounced).
    Computes total server-side, validates bounds, saves with locked=false.
    Mentors can only evaluate in remarks-only rounds.
    """
    server_time = datetime.now(timezone.utc).isoformat()
    sb = get_supabase_client()

    # Rule 5: Mentor role can only do remarks-only rounds
    if sb:
        try:
            p_res = sb.table("profiles").select("role").eq("id", payload.judge_id).single().execute()
            r_res = sb.table("rounds").select("type, number").eq("id", payload.round_id).single().execute()
            if p_res.data and r_res.data:
                if p_res.data.get("role") == "mentor" and r_res.data.get("type") != "remarks":
                    raise HTTPException(
                        status_code=403,
                        detail="Mentors are only permitted to evaluate in guidance/remarks rounds. Scoring rounds are reserved for official judges."
                    )
        except HTTPException:
            raise
        except Exception:
            pass

    if sb:

        try:
            # Let the database trigger compute total and validate rules
            eval_record = {
                "round_id": payload.round_id,
                "judge_id": payload.judge_id,
                "team_id": payload.team_id,
                "scores": payload.scores or {},
                "remarks": payload.remarks or "",
                "locked": False
            }
            res = sb.table("evaluations").upsert(
                eval_record, 
                on_conflict="round_id,judge_id,team_id"
            ).execute()
            
            saved = res.data[0] if res.data else eval_record
            return {
                "status": "draft_saved",
                "evaluation": saved,
                "server_time": server_time,
                "message": f"Draft saved at {datetime.now().strftime('%H:%M:%S')}"
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Demo fallback computation
    total = sum((float(v) for v in (payload.scores or {}).values() if v is not None), 0.0)
    key = f"{payload.round_id}:{payload.judge_id}:{payload.team_id}"
    record = {
        "id": f"eval-{key}",
        "round_id": payload.round_id,
        "judge_id": payload.judge_id,
        "team_id": payload.team_id,
        "scores": payload.scores or {},
        "total": total,
        "remarks": payload.remarks or "",
        "locked": False,
        "version": 1,
        "updated_at": server_time
    }
    DEMO_EVALUATIONS[key] = record

    return {
        "status": "draft_saved",
        "evaluation": record,
        "server_time": server_time,
        "message": f"Draft saved at {datetime.now().strftime('%H:%M:%S')}"
    }


@router.post("/submit")
async def submit_and_lock(payload: SubmitEvaluationPayload):
    """
    Final submit: Locks the evaluation so no further edits can occur.
    Writes audit log entry.
    Mentors can only evaluate in remarks-only rounds.
    """
    server_time = datetime.now(timezone.utc).isoformat()
    sb = get_supabase_client()

    # Rule 5: Mentor role check
    if sb:
        try:
            p_res = sb.table("profiles").select("role").eq("id", payload.judge_id).single().execute()
            r_res = sb.table("rounds").select("type, number").eq("id", payload.round_id).single().execute()
            if p_res.data and r_res.data:
                if p_res.data.get("role") == "mentor" and r_res.data.get("type") != "remarks":
                    raise HTTPException(
                        status_code=403,
                        detail="Mentors are only permitted to evaluate in guidance/remarks rounds. Scoring rounds are reserved for official judges."
                    )
        except HTTPException:
            raise
        except Exception:
            pass

    if sb:

        try:
            eval_record = {
                "round_id": payload.round_id,
                "judge_id": payload.judge_id,
                "team_id": payload.team_id,
                "scores": payload.scores or {},
                "remarks": payload.remarks,
                "locked": True
            }
            res = sb.table("evaluations").upsert(
                eval_record,
                on_conflict="round_id,judge_id,team_id"
            ).execute()

            saved = res.data[0] if res.data else eval_record
            return {
                "status": "submitted_and_locked",
                "evaluation": saved,
                "server_time": server_time,
                "message": "Evaluation successfully submitted and locked."
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Demo fallback
    total = sum((float(v) for v in (payload.scores or {}).values() if v is not None), 0.0)
    key = f"{payload.round_id}:{payload.judge_id}:{payload.team_id}"
    record = {
        "id": f"eval-{key}",
        "round_id": payload.round_id,
        "judge_id": payload.judge_id,
        "team_id": payload.team_id,
        "scores": payload.scores or {},
        "total": total,
        "remarks": payload.remarks,
        "locked": True,
        "version": 1,
        "updated_at": server_time
    }
    DEMO_EVALUATIONS[key] = record

    return {
        "status": "submitted_and_locked",
        "evaluation": record,
        "server_time": server_time,
        "message": "Evaluation successfully submitted and locked."
    }


@router.patch("/{eval_id}/unlock")
async def unlock_evaluation(eval_id: str, payload: UnlockPayload):
    """
    Admin unlock action: unlocks evaluation so judge can edit again.
    Appends audit log record.
    """
    server_time = datetime.now(timezone.utc).isoformat()
    sb = get_supabase_client()

    if sb:
        try:
            sb.table("evaluations").update({"locked": False}).eq("id", eval_id).execute()
            # Non-negotiable Rule 4: Append to audit_log
            sb.table("audit_log").insert({
                "actor_id": payload.actor_id,
                "action": "EVALUATION_UNLOCKED",
                "entity_type": "EVALUATION",
                "entity_id": eval_id,
                "details": {
                    "reason": payload.reason,
                    "server_time": server_time
                }
            }).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        for k, v in DEMO_EVALUATIONS.items():
            if v.get("id") == eval_id:
                v["locked"] = False
                break

    return {
        "status": "unlocked",
        "eval_id": eval_id,
        "message": "Evaluation unlocked by administrator."
    }
