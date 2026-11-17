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
        "start_time": "2026-11-17T14:00:00Z",
        "end_time": None,
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
        "start_time": None,
        "end_time": None,
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
        "start_time": None,
        "end_time": None,
        "criteria": [
            {"id": "crit-3-1", "name": "Technical Execution", "max_marks": 30.0, "sort_order": 1},
            {"id": "crit-3-2", "name": "Innovation & Creativity", "max_marks": 25.0, "sort_order": 2},
            {"id": "crit-3-3", "name": "Impact & Relevance", "max_marks": 15.0, "sort_order": 3},
            {"id": "crit-3-4", "name": "Scalability", "max_marks": 15.0, "sort_order": 4},
            {"id": "crit-3-5", "name": "Presentation & Demonstration", "max_marks": 15.0, "sort_order": 5},
        ]
    }
]

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
    actor_id: Optional[str] = None



@router.get("")
async def get_rounds():
    """
    Get all rounds with server time and criteria.
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
                "rounds": list(rounds_map.values())
            }
        except Exception:
            pass

    return {
        "server_time": server_time,
        "rounds": DEMO_ROUNDS
    }


@router.post("")
async def create_round(payload: RoundCreatePayload):
    """
    Create a new round.
    """
    sb = get_supabase_client()
    new_round = {
        "number": payload.number,
        "name": payload.name,
        "type": payload.type,
        "status": "draft",
        "promote_count": payload.promote_count or 20,
        "judges_per_team": payload.judges_per_team or 3,
    }

    if sb:
        try:
            res = sb.table("rounds").insert(new_round).execute()
            round_obj = res.data[0]
            sb.table("audit_log").insert({
                "actor_id": payload.actor_id,
                "action": "ROUND_CREATE",
                "entity_type": "ROUND",
                "entity_id": str(round_obj["id"]),
                "details": new_round
            }).execute()
            return {"status": "success", "round": round_obj}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        mock_id = f"mock-round-{payload.number}"
        mock_entry = {"id": mock_id, **new_round, "criteria": []}
        DEMO_ROUNDS.append(mock_entry)
        return {"status": "success", "round": mock_entry}


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
            # Non-negotiable Rule 4: Append to audit log
            sb.table("audit_log").insert({
                "actor_id": payload.actor_id,
                "action": f"ROUND_{payload.status.upper()}",
                "entity_type": "ROUND",
                "entity_id": round_id,
                "details": {
                    "new_status": payload.status,
                    "server_time": server_now
                }
            }).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
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
