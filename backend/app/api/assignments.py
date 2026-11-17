from datetime import datetime, timezone
import random
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.core.config import settings
from supabase import create_client, Client

router = APIRouter(prefix="/assignments", tags=["Assignments"])

def get_supabase_client() -> Optional[Client]:
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY and "placeholder" not in settings.SUPABASE_URL:
        try:
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        except Exception:
            return None
    return None

# In-memory store for fallback/demo
DEMO_ASSIGNMENTS: List[Dict[str, Any]] = []

class AutoAssignPayload(BaseModel):
    round_id: Optional[str] = None
    round_number: Optional[int] = 1
    judges_per_team: Optional[int] = 3
    actor_id: Optional[str] = None

class ManualAssignPayload(BaseModel):
    round_id: str
    judge_id: str
    team_id: str
    action: str = "assign" # "assign" | "unassign"
    actor_id: Optional[str] = None


@router.post("/auto-assign")
async def auto_assign_teams(payload: AutoAssignPayload):
    """
    Balanced auto-assignment:
    N judges per team (default 3), no judge overloaded.
    Uses balanced round-robin with minimum variance.
    """
    sb = get_supabase_client()
    judges: List[Dict[str, Any]] = []
    teams: List[Dict[str, Any]] = []
    target_round_id = payload.round_id

    # 1. Fetch judges and teams
    if sb:
        try:
            if not target_round_id and payload.round_number:
                r_res = sb.table("rounds").select("id, judges_per_team").eq("number", payload.round_number).single().execute()
                if r_res.data:
                    target_round_id = r_res.data["id"]
                    if not payload.judges_per_team:
                        payload.judges_per_team = r_res.data.get("judges_per_team", 3)

            j_res = sb.table("profiles").select("id, name, email").eq("role", "judge").execute()
            judges = j_res.data or []

            t_res = sb.table("teams").select("team_id, team_name").eq("status", "active").execute()
            teams = t_res.data or []
        except Exception:
            pass

    if not judges:
        # Fallback to demo judges
        from app.api.judges import DEMO_JUDGES
        judges = [j for j in DEMO_JUDGES if j.get("role") == "judge"]
    if not teams:
        from app.api.teams import DEMO_TEAMS
        teams = [t for t in DEMO_TEAMS if t.get("status") == "active"]

    if not target_round_id:
        target_round_id = "11111111-0000-0000-0000-000000000001"

    if len(judges) == 0:
        raise HTTPException(status_code=400, detail="Cannot assign: No active judges registered in system.")
    if len(teams) == 0:
        raise HTTPException(status_code=400, detail="Cannot assign: No active teams registered.")

    k = min(payload.judges_per_team or 3, len(judges))
    new_assignments = []
    
    # Balanced assignment algorithm:
    # Track load per judge
    judge_load: Dict[str, int] = {j["id"]: 0 for j in judges}

    for team in teams:
        t_id = team["team_id"]
        # Sort judges by current load ascending, break ties randomly for uniform distribution
        available_judges = sorted(judges, key=lambda j: (judge_load[j["id"]], random.random()))
        selected = available_judges[:k]

        for j in selected:
            judge_load[j["id"]] += 1
            new_assignments.append({
                "round_id": target_round_id,
                "judge_id": j["id"],
                "team_id": t_id
            })

    if sb:
        try:
            # Clear previous assignments for this round
            sb.table("assignments").delete().eq("round_id", target_round_id).execute()
            # Bulk insert new assignments
            sb.table("assignments").insert(new_assignments).execute()

            # Non-negotiable Rule 4: Append to audit_log
            sb.table("audit_log").insert({
                "actor_id": payload.actor_id,
                "action": "TEAMS_AUTO_ASSIGNED",
                "entity_type": "ASSIGNMENTS",
                "entity_id": target_round_id,
                "details": {
                    "teams_count": len(teams),
                    "judges_count": len(judges),
                    "judges_per_team": k,
                    "total_assignments": len(new_assignments),
                    "distribution": {j["name"]: judge_load[j["id"]] for j in judges}
                }
            }).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Update DEMO_ASSIGNMENTS
        DEMO_ASSIGNMENTS.clear()
        for idx, a in enumerate(new_assignments):
            DEMO_ASSIGNMENTS.append({
                "id": f"assign-{idx+1}",
                **a,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    return {
        "status": "success",
        "round_id": target_round_id,
        "total_teams": len(teams),
        "total_judges": len(judges),
        "judges_per_team": k,
        "total_assignments": len(new_assignments),
        "distribution": {j.get("name", j["id"]): judge_load[j["id"]] for j in judges},
        "message": f"Successfully auto-assigned {len(teams)} teams with {k} judges each in a balanced distribution."
    }


@router.get("/my")
async def get_my_assignments(
    judge_id: str = Query(...),
    round_id: Optional[str] = None
):
    """
    Judge view:
    Returns list of assigned teams with evaluation status (pending / draft / submitted),
    progress count (e.g. 12/25 done), active round info, and SERVER time for countdown timer.
    """
    server_time = datetime.now(timezone.utc).isoformat()
    sb = get_supabase_client()

    assigned_team_ids = []
    evaluations_map = {}
    active_round = None

    if sb:
        try:
            # 1. Get live round if round_id not provided
            if not round_id:
                r_res = sb.table("rounds").select("*").eq("status", "live").limit(1).execute()
                if r_res.data:
                    active_round = r_res.data[0]
                    round_id = active_round["id"]
                else:
                    # Fallback to round 1
                    r_res = sb.table("rounds").select("*").eq("number", 1).single().execute()
                    active_round = r_res.data
                    round_id = active_round["id"] if active_round else None
            else:
                r_res = sb.table("rounds").select("*").eq("id", round_id).single().execute()
                active_round = r_res.data

            # 2. Get assignments for this judge
            a_res = sb.table("assignments").select("team_id").eq("judge_id", judge_id).eq("round_id", round_id).execute()
            assigned_team_ids = [r["team_id"] for r in (a_res.data or [])]

            # 3. Get existing evaluations
            if assigned_team_ids:
                e_res = sb.table("evaluations").select("*").eq("judge_id", judge_id).eq("round_id", round_id).execute()
                evaluations_map = {e["team_id"]: e for e in (e_res.data or [])}

            # 4. Fetch team details
            teams_data = []
            if assigned_team_ids:
                t_res = sb.table("teams").select("*").in_("team_id", assigned_team_ids).execute()
                teams_data = t_res.data or []
        except Exception:
            pass

    # Demo fallback if needed
    if not active_round:
        from app.api.rounds import DEMO_ROUNDS
        active_round = next((r for r in DEMO_ROUNDS if r["status"] == "live"), DEMO_ROUNDS[0])
        round_id = active_round["id"]

    if not assigned_team_ids:
        # If no assignments exist yet, auto assign demo
        matching_demo = [a["team_id"] for a in DEMO_ASSIGNMENTS if a.get("judge_id") == judge_id]
        if not matching_demo:
            from app.api.teams import DEMO_TEAMS
            # Give judge a balanced subset of 5-8 teams for instant demo
            assigned_team_ids = [t["team_id"] for t in DEMO_TEAMS[:8]]
            for t_id in assigned_team_ids:
                DEMO_ASSIGNMENTS.append({
                    "round_id": round_id,
                    "judge_id": judge_id,
                    "team_id": t_id,
                    "created_at": server_time
                })
        else:
            assigned_team_ids = matching_demo

        from app.api.teams import DEMO_TEAMS
        teams_data = [t for t in DEMO_TEAMS if t["team_id"] in assigned_team_ids]

    # Combine teams with evaluation status
    team_items = []
    done_count = 0
    draft_count = 0
    pending_count = 0

    for team in teams_data:
        t_id = team["team_id"]
        ev = evaluations_map.get(t_id)

        if ev:
            if ev.get("locked"):
                status = "submitted"
                done_count += 1
            else:
                status = "draft"
                draft_count += 1
        else:
            status = "pending"
            pending_count += 1

        team_items.append({
            **team,
            "evaluation_status": status,
            "evaluation": ev
        })

    total_assigned = len(team_items)
    progress_percent = int((done_count / total_assigned) * 100) if total_assigned > 0 else 0

    return {
        "server_time": server_time,
        "round": active_round,
        "total_assigned": total_assigned,
        "done_count": done_count,
        "draft_count": draft_count,
        "pending_count": pending_count,
        "progress_percent": progress_percent,
        "progress_label": f"{done_count}/{total_assigned} done",
        "teams": team_items
    }
