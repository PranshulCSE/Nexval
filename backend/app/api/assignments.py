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
    round_id: Optional[str] = None
    round_number: Optional[int] = 1
    judge_id: str
    team_id: str
    venue: Optional[str] = None
    action: str = "assign" # "assign" | "unassign"
    actor_id: Optional[str] = None

class UpdateVenuePayload(BaseModel):
    team_id: str
    venue: str
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

        venue = team.get("venue") or team.get("extra_data", {}).get("venue") or f"Room {(abs(hash(t_id)) % 5) + 101} - Lab {(abs(hash(t_id)) % 4) + 1}"
        team_items.append({
            **team,
            "venue": venue,
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


@router.post("/manual-assign")
async def manual_assign_team(payload: ManualAssignPayload):
    """
    Manually assign or unassign a specific team to/from a judge, with venue/room assignment.
    Logged to audit trail.
    """
    sb = get_supabase_client()
    target_round_id = payload.round_id or "11111111-0000-0000-0000-000000000001"
    clean_team_id = payload.team_id.strip().upper()

    if sb and payload.round_number and not payload.round_id:
        try:
            r_res = sb.table("rounds").select("id").eq("number", payload.round_number).single().execute()
            if r_res.data:
                target_round_id = r_res.data["id"]
        except Exception:
            pass

    # Update venue if provided
    if payload.venue:
        if sb:
            try:
                # Fetch team extra_data and update venue
                t_res = sb.table("teams").select("extra_data").eq("team_id", clean_team_id).single().execute()
                extra = (t_res.data or {}).get("extra_data") or {}
                extra["venue"] = payload.venue
                sb.table("teams").update({"extra_data": extra}).eq("team_id", clean_team_id).execute()
            except Exception as e:
                print(f"Supabase venue update error: {e}")
        from app.api.teams import DEMO_TEAMS
        for t in DEMO_TEAMS:
            if t["team_id"].upper() == clean_team_id:
                if "extra_data" not in t or not isinstance(t["extra_data"], dict):
                    t["extra_data"] = {}
                t["extra_data"]["venue"] = payload.venue
                t["venue"] = payload.venue
                break

    if payload.action == "unassign":
        if sb:
            try:
                sb.table("assignments").delete().eq("round_id", target_round_id).eq("judge_id", payload.judge_id).eq("team_id", clean_team_id).execute()
                sb.table("audit_log").insert({
                    "actor_id": payload.actor_id,
                    "action": "TEAM_MANUALLY_UNASSIGNED",
                    "entity_type": "ASSIGNMENT",
                    "entity_id": f"{payload.judge_id}:{clean_team_id}",
                    "details": {"round_id": target_round_id, "judge_id": payload.judge_id, "team_id": clean_team_id}
                }).execute()
            except Exception as e:
                print(f"Supabase unassign error: {e}")

        # Update in-memory DEMO_ASSIGNMENTS
        global DEMO_ASSIGNMENTS
        DEMO_ASSIGNMENTS = [
            a for a in DEMO_ASSIGNMENTS
            if not (a.get("round_id") == target_round_id and a.get("judge_id") == payload.judge_id and a.get("team_id") == clean_team_id)
        ]
        return {
            "status": "success",
            "action": "unassign",
            "team_id": clean_team_id,
            "judge_id": payload.judge_id,
            "message": f"Successfully removed judge assignment for team {clean_team_id}."
        }
    else:
        # action == "assign"
        if sb:
            try:
                sb.table("assignments").upsert({
                    "round_id": target_round_id,
                    "judge_id": payload.judge_id,
                    "team_id": clean_team_id
                }, on_conflict="round_id,judge_id,team_id").execute()

                sb.table("audit_log").insert({
                    "actor_id": payload.actor_id,
                    "action": "TEAM_MANUALLY_ASSIGNED",
                    "entity_type": "ASSIGNMENT",
                    "entity_id": f"{payload.judge_id}:{clean_team_id}",
                    "details": {
                        "round_id": target_round_id,
                        "judge_id": payload.judge_id,
                        "team_id": clean_team_id,
                        "venue": payload.venue
                    }
                }).execute()
            except Exception as e:
                print(f"Supabase manual assign error: {e}")

        # In-memory assignment
        exists = any(
            a.get("round_id") == target_round_id and a.get("judge_id") == payload.judge_id and a.get("team_id") == clean_team_id
            for a in DEMO_ASSIGNMENTS
        )
        if not exists:
            DEMO_ASSIGNMENTS.append({
                "id": f"assign-man-{len(DEMO_ASSIGNMENTS)+1}",
                "round_id": target_round_id,
                "judge_id": payload.judge_id,
                "team_id": clean_team_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

        return {
            "status": "success",
            "action": "assign",
            "team_id": clean_team_id,
            "judge_id": payload.judge_id,
            "venue": payload.venue,
            "message": f"Successfully assigned team {clean_team_id} to judge with venue room {payload.venue or 'Default'}."
        }


@router.patch("/venue")
async def update_team_venue(payload: UpdateVenuePayload):
    """
    Update venue room for a team.
    """
    clean_team_id = payload.team_id.strip().upper()
    venue = payload.venue.strip()

    sb = get_supabase_client()
    if sb:
        try:
            t_res = sb.table("teams").select("extra_data").eq("team_id", clean_team_id).single().execute()
            extra = (t_res.data or {}).get("extra_data") or {}
            extra["venue"] = venue
            sb.table("teams").update({"extra_data": extra}).eq("team_id", clean_team_id).execute()

            sb.table("audit_log").insert({
                "actor_id": payload.actor_id,
                "action": "TEAM_VENUE_UPDATED",
                "entity_type": "TEAM",
                "entity_id": clean_team_id,
                "details": {"venue": venue}
            }).execute()
        except Exception as e:
            print(f"Supabase venue update error: {e}")

    from app.api.teams import DEMO_TEAMS
    for t in DEMO_TEAMS:
        if t["team_id"].upper() == clean_team_id:
            if "extra_data" not in t or not isinstance(t["extra_data"], dict):
                t["extra_data"] = {}
            t["extra_data"]["venue"] = venue
            t["venue"] = venue
            break

    return {
        "status": "success",
        "team_id": clean_team_id,
        "venue": venue,
        "message": f"Updated venue room for team {clean_team_id} to '{venue}'."
    }


@router.get("/overview")
async def get_assignments_overview(round_number: int = 1):
    """
    Admin overview: all teams with their assigned judges and venue rooms.
    """
    sb = get_supabase_client()
    teams: List[Dict[str, Any]] = []
    judges: List[Dict[str, Any]] = []
    assignments: List[Dict[str, Any]] = []
    round_id = "11111111-0000-0000-0000-000000000001"

    if sb:
        try:
            r_res = sb.table("rounds").select("*").eq("number", round_number).single().execute()
            if r_res.data:
                round_id = r_res.data["id"]

            t_res = sb.table("teams").select("team_id, team_name, college, extra_data, status").eq("status", "active").execute()
            teams = t_res.data or []

            j_res = sb.table("profiles").select("id, name, email, role").in_("role", ["judge", "mentor"]).execute()
            judges = j_res.data or []

            a_res = sb.table("assignments").select("judge_id, team_id").eq("round_id", round_id).execute()
            assignments = a_res.data or []
        except Exception:
            pass

    if not teams:
        from app.api.teams import DEMO_TEAMS
        teams = [t for t in DEMO_TEAMS if t.get("status") == "active"]
    if not judges:
        from app.api.judges import DEMO_JUDGES
        judges = DEMO_JUDGES
    if not assignments:
        assignments = DEMO_ASSIGNMENTS

    # Build judge map
    judge_map = {j["id"]: j for j in judges}

    # Build team assignments
    team_rows = []
    for team in teams:
        t_id = team["team_id"]
        venue = team.get("venue") or team.get("extra_data", {}).get("venue") or f"Room {(abs(hash(t_id)) % 5) + 101} - Lab {(abs(hash(t_id)) % 4) + 1}"
        
        assigned_judge_ids = [a["judge_id"] for a in assignments if a.get("team_id") == t_id]
        assigned_judges = [
            {"id": j_id, "name": judge_map.get(j_id, {}).get("name", "Judge"), "role": judge_map.get(j_id, {}).get("role", "judge")}
            for j_id in assigned_judge_ids
            if j_id in judge_map
        ]

        team_rows.append({
            "team_id": t_id,
            "team_name": team["team_name"],
            "college": team.get("college", "Geeta University"),
            "venue": venue,
            "assigned_judges": assigned_judges
        })

    return {
        "round_id": round_id,
        "round_number": round_number,
        "teams": team_rows,
        "judges": judges
    }
