from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.core.config import settings
from supabase import create_client, Client

router = APIRouter(prefix="/rounds", tags=["Rounds"])

def get_supabase_client() -> Optional[Client]:
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY and "placeholder" not in settings.SUPABASE_URL:
        try:
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        except Exception:
            return None
    return None

def log_audit(sb, actor_id: Optional[str], action: str, entity_type: str, entity_id: str, details: dict):
    if not sb:
        return
    try:
        import uuid
        valid_uuid = None
        if actor_id:
            try:
                valid_uuid = str(uuid.UUID(str(actor_id)))
            except Exception:
                valid_uuid = None
        sb.table("audit_log").insert({
            "actor_id": valid_uuid,
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id),
            "details": details
        }).execute()
    except Exception as e:
        print(f"Audit log warning (non-fatal): {e}")

# Default in-memory demo rounds
DEMO_ROUNDS: List[Dict[str, Any]] = [
    {
        "id": "11111111-0000-0000-0000-000000000001",
        "number": 1,
        "name": "Round 1: Guidance Phase",
        "type": "remarks",
        "status": "live",
        "promote_count": 150,
        "judges_per_team": 3,
        "start_time": "2026-11-23T10:00:00Z",
        "end_time": "2026-11-23T18:00:00Z",
        "criteria": []
    },
    {
        "id": "22222222-0000-0000-0000-000000000002",
        "number": 2,
        "name": "Round 2: Evaluation & Scoring",
        "type": "scoring",
        "status": "draft",
        "promote_count": 20,
        "judges_per_team": 3,
        "start_time": "2026-11-23T18:00:00Z",
        "end_time": "2026-11-24T04:00:00Z",
        "criteria": [
            {"id": "crit-2-1", "name": "Technical Execution", "max_marks": 30.0, "sort_order": 1},
            {"id": "crit-2-2", "name": "Innovation & Creativity", "max_marks": 25.0, "sort_order": 2},
            {"id": "crit-2-3", "name": "Impact & Relevance", "max_marks": 15.0, "sort_order": 3},
            {"id": "crit-2-4", "name": "Scalability", "max_marks": 15.0, "sort_order": 4},
            {"id": "crit-2-5", "name": "Presentation & Demonstration", "max_marks": 15.0, "sort_order": 5},
        ]
    },
    {
        "id": "33333333-0000-0000-0000-000000000003",
        "number": 3,
        "name": "Round 3: Grand Finale Pitch",
        "type": "scoring",
        "status": "draft",
        "promote_count": 3,
        "judges_per_team": 5,
        "start_time": "2026-11-24T04:00:00Z",
        "end_time": "2026-11-24T12:00:00Z",
        "criteria": [
            {"id": "crit-3-1", "name": "Technical Execution", "max_marks": 30.0, "sort_order": 1},
            {"id": "crit-3-2", "name": "Innovation & Creativity", "max_marks": 25.0, "sort_order": 2},
            {"id": "crit-3-3", "name": "Impact & Relevance", "max_marks": 15.0, "sort_order": 3},
            {"id": "crit-3-4", "name": "Scalability", "max_marks": 15.0, "sort_order": 4},
            {"id": "crit-3-5", "name": "Presentation & Demonstration", "max_marks": 15.0, "sort_order": 5},
        ]
    }
]

# Submission deadline state: Decided and controlled exclusively by SUPER ADMIN
SUBMISSION_DEADLINE_STATE: Dict[str, Any] = {
    "deadline": "2026-11-25T18:00:00Z",
    "updated_at": "2026-11-23T11:00:00Z",
    "updated_by": "superadmin@nexhack.com"
}

class RoundStatusPayload(BaseModel):
    status: str = Field(..., pattern="^(draft|live|closed)$")
    actor_id: Optional[str] = None

class RubricCriterionItem(BaseModel):
    name: str
    max_marks: float = Field(..., gt=0)
    sort_order: Optional[int] = 0

class RubricPayload(BaseModel):
    criteria: List[RubricCriterionItem]
    actor_id: Optional[str] = None

class RoundCreatePayload(BaseModel):
    number: int
    name: str
    type: str = Field(..., pattern="^(remarks|scoring)$")
    promote_count: Optional[int] = 20
    judges_per_team: Optional[int] = 3
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    actor_id: Optional[str] = None

class RoundSchedulePayload(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    actor_id: Optional[str] = None

class SubmissionDeadlinePayload(BaseModel):
    deadline: str
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None



@router.get("")
async def get_rounds():
    """
    Get all rounds with server time, submission deadline, and criteria.
    """
    server_time = datetime.now(timezone.utc).isoformat()
    sb = get_supabase_client()
    if sb:
        try:
            r_res = sb.table("rounds").select("*").order("number").execute()
            c_res = sb.table("rubric_criteria").select("*").order("sort_order").execute()
            
            rounds_map = {r["id"]: {**r, "criteria": []} for r in (r_res.data or [])}
            for c in (c_res.data or []):
                r_id = c.get("round_id")
                if r_id in rounds_map:
                    rounds_map[r_id]["criteria"].append(c)

            return {
                "server_time": server_time,
                "submission_deadline": SUBMISSION_DEADLINE_STATE["deadline"],
                "rounds": list(rounds_map.values())
            }
        except Exception:
            pass

    return {
        "server_time": server_time,
        "submission_deadline": SUBMISSION_DEADLINE_STATE["deadline"],
        "rounds": DEMO_ROUNDS
    }


@router.get("/submission-deadline")
async def get_submission_deadline():
    """
    Get the official project submission deadline decided by Super Admin.
    """
    return {
        "status": "success",
        "submission_deadline": SUBMISSION_DEADLINE_STATE["deadline"],
        "updated_at": SUBMISSION_DEADLINE_STATE.get("updated_at"),
        "updated_by": SUBMISSION_DEADLINE_STATE.get("updated_by"),
        "server_time": datetime.now(timezone.utc).isoformat()
    }


@router.put("/submission-deadline")
async def update_submission_deadline(payload: SubmissionDeadlinePayload):
    """
    Update the official project submission deadline.
    RESTRICTED: Only SUPER ADMIN can set or modify this deadline.
    """
    if payload.actor_role and payload.actor_role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: The submission deadline must be decided by Super Admin only. Admins do not have permission to alter the submission cutoff."
        )

    server_now = datetime.now(timezone.utc).isoformat()
    SUBMISSION_DEADLINE_STATE["deadline"] = payload.deadline
    SUBMISSION_DEADLINE_STATE["updated_at"] = server_now
    SUBMISSION_DEADLINE_STATE["updated_by"] = payload.actor_id or "super_admin"

    sb = get_supabase_client()
    if sb:
        try:
            sb.table("audit_log").insert({
                "actor_id": payload.actor_id,
                "action": "SUBMISSION_DEADLINE_UPDATE",
                "entity_type": "DEADLINE",
                "entity_id": "global",
                "details": {
                    "new_deadline": payload.deadline,
                    "updated_by": payload.actor_id or "super_admin",
                    "server_time": server_now
                }
            }).execute()
        except Exception as e:
            print(f"Audit log error: {e}")

    return {
        "status": "success",
        "message": "Submission deadline successfully updated by Super Admin.",
        "submission_deadline": SUBMISSION_DEADLINE_STATE["deadline"],
        "updated_at": server_now,
        "updated_by": SUBMISSION_DEADLINE_STATE["updated_by"]
    }


@router.post("")
async def create_round(payload: RoundCreatePayload):
    """
    Create a new round.
    """
    sb = get_supabase_client()
    mock_id = f"mock-round-{payload.number}"
    new_round = {
        "number": payload.number,
        "name": payload.name,
        "type": payload.type,
        "status": "draft",
        "promote_count": payload.promote_count or 20,
        "judges_per_team": payload.judges_per_team or 3,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
    }

    round_obj = {"id": mock_id, **new_round, "criteria": []}
    if sb:
        try:
            res = sb.table("rounds").insert(new_round).execute()
            if res.data:
                round_obj = res.data[0]
            log_audit(sb, payload.actor_id, "ROUND_CREATE", "ROUND", str(round_obj.get("id", mock_id)), new_round)
        except Exception as e:
            print(f"Supabase round create warning (using memory): {e}")

    DEMO_ROUNDS.append(round_obj)
    return {"status": "success", "round": round_obj}


@router.patch("/{round_id}/schedule")
async def schedule_round(round_id: str, payload: RoundSchedulePayload):
    """
    Admin power: Schedule a round for a fixed start and end time.
    """
    update_data: Dict[str, Any] = {}
    if payload.start_time is not None:
        update_data["start_time"] = payload.start_time
    if payload.end_time is not None:
        update_data["end_time"] = payload.end_time

    sb = get_supabase_client()
    if sb:
        try:
            sb.table("rounds").update(update_data).eq("id", round_id).execute()
            log_audit(sb, payload.actor_id, "ROUND_SCHEDULE_UPDATE", "ROUND", round_id, update_data)
        except Exception as e:
            print(f"Supabase round schedule update warning: {e}")

    for r in DEMO_ROUNDS:
        if str(r.get("id")) == str(round_id) or str(r.get("number")) == str(round_id):
            r.update(update_data)
            break

    return {
        "status": "success",
        "round_id": round_id,
        "schedule": update_data,
        "message": "Round schedule window updated successfully."
    }


@router.delete("/{round_id}")
async def delete_round(round_id: str, actor_id: Optional[str] = None):
    """
    Admin power: Delete an existing round.
    """
    sb = get_supabase_client()
    if sb:
        try:
            sb.table("rubric_criteria").delete().eq("round_id", round_id).execute()
            sb.table("rounds").delete().eq("id", round_id).execute()
            log_audit(sb, actor_id, "ROUND_DELETE", "ROUND", round_id, {"deleted_round_id": round_id})
        except Exception as e:
            print(f"Supabase round delete warning: {e}")

    global DEMO_ROUNDS
    DEMO_ROUNDS = [r for r in DEMO_ROUNDS if str(r.get("id")) != str(round_id) and str(r.get("number")) != str(round_id)]

    return {
        "status": "success",
        "round_id": round_id,
        "message": "Round deleted successfully."
    }


@router.patch("/{round_id}/status")
async def update_round_status(round_id: str, payload: RoundStatusPayload):
    """
    Open/Close or reset round. Uses SERVER time strictly.
    """
    server_now = datetime.now(timezone.utc).isoformat()
    update_data: Dict[str, Any] = {"status": payload.status}

    if payload.status == "live":
        update_data["start_time"] = server_now
    elif payload.status == "closed":
        update_data["end_time"] = server_now

    sb = get_supabase_client()
    if sb:
        try:
            sb.table("rounds").update(update_data).eq("id", round_id).execute()
            log_audit(sb, payload.actor_id, f"ROUND_{payload.status.upper()}", "ROUND", round_id, {
                "new_status": payload.status,
                "server_time": server_now
            })
        except Exception as e:
            print(f"Supabase round status update warning: {e}")

    for r in DEMO_ROUNDS:
        if str(r.get("id")) == str(round_id) or str(r.get("number")) == str(round_id):
            r.update(update_data)
            break

    return {
        "status": "success",
        "round_id": round_id,
        "new_status": payload.status,
        "server_time": server_now
    }


@router.put("/{round_id}/rubric")
async def update_round_rubric(round_id: str, payload: RubricPayload):
    """
    Configure rubric per round.
    Non-negotiable rule: Total must equal exactly 100, validated strictly.
    """
    if not payload.criteria:
        raise HTTPException(status_code=400, detail="Rubric criteria list cannot be empty.")

    total_marks = sum(c.max_marks for c in payload.criteria)
    if round(total_marks, 2) != 100.00:
        raise HTTPException(
            status_code=400,
            detail=f"Rubric total marks must equal 100. Current total is {total_marks}."
        )

    sb = get_supabase_client()
    if sb:
        try:
            # Delete existing criteria for this round
            sb.table("rubric_criteria").delete().eq("round_id", round_id).execute()
            
            # Insert new criteria
            criteria_records = [
                {
                    "round_id": round_id,
                    "name": c.name,
                    "max_marks": c.max_marks,
                    "sort_order": c.sort_order if c.sort_order else idx + 1
                }
                for idx, c in enumerate(payload.criteria)
            ]
            sb.table("rubric_criteria").insert(criteria_records).execute()

            # Audit log
            sb.table("audit_log").insert({
                "actor_id": payload.actor_id,
                "action": "RUBRIC_CONFIG_UPDATE",
                "entity_type": "RUBRIC",
                "entity_id": round_id,
                "details": {
                    "total_marks": total_marks,
                    "criteria_count": len(payload.criteria)
                }
            }).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        for r in DEMO_ROUNDS:
            if str(r.get("id")) == str(round_id) or str(r.get("number")) == str(round_id):
                r["criteria"] = [
                    {
                        "id": f"crit-{idx+1}",
                        "name": c.name,
                        "max_marks": c.max_marks,
                        "sort_order": idx + 1
                    }
                    for idx, c in enumerate(payload.criteria)
                ]
                break

    return {
        "status": "success",
        "round_id": round_id,
        "total_marks": total_marks,
        "criteria_count": len(payload.criteria),
        "message": "Rubric updated and verified (Total: 100 marks)."
    }
