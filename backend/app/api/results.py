from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings
from supabase import create_client, Client

router = APIRouter(prefix="/results", tags=["Results & Leaderboard"])

def get_supabase_client() -> Optional[Client]:
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY and "placeholder" not in settings.SUPABASE_URL:
        try:
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        except Exception:
            return None
    return None

# Default tie-break order: Technical Execution > Innovation & Creativity > Impact & Relevance
DEFAULT_TIE_BREAK_KEYS = [
    "Technical Execution",
    "Innovation & Creativity",
    "Impact & Relevance",
    "Scalability",
    "Presentation & Demonstration"
]


@router.get("/leaderboard")
async def get_round_leaderboard(
    round_id: Optional[str] = None,
    round_number: Optional[int] = Query(2, description="Target round number (default 2 for scoring)")
):
    """
    Get round leaderboard with:
    - Average score across assigned judges
    - Rubric criterion averages
    - Tie-break applied (Technical > Innovation > Impact)
    - Count of judges completed per team (e.g. 3/3)
    """
    sb = get_supabase_client()
    target_round = None
    teams_list: List[Dict[str, Any]] = []
    evaluations_list: List[Dict[str, Any]] = []
    assignments_list: List[Dict[str, Any]] = []
    criteria_list: List[Dict[str, Any]] = []

    if sb:
        try:
            # 1. Fetch round
            if round_id:
                r_res = sb.table("rounds").select("*").eq("id", round_id).single().execute()
            else:
                r_res = sb.table("rounds").select("*").eq("number", round_number).single().execute()
            target_round = r_res.data

            if target_round:
                t_r_id = target_round["id"]
                # 2. Fetch criteria
                c_res = sb.table("rubric_criteria").select("*").eq("round_id", t_r_id).order("sort_order").execute()
                criteria_list = c_res.data or []

                # 3. Fetch assignments
                a_res = sb.table("assignments").select("team_id, judge_id").eq("round_id", t_r_id).execute()
                assignments_list = a_res.data or []

                # 4. Fetch evaluations (locked or drafts)
                e_res = sb.table("evaluations").select("*, profiles(name, email)").eq("round_id", t_r_id).execute()
                evaluations_list = e_res.data or []

                # 5. Fetch teams
                t_res = sb.table("teams").select("*").order("team_id").execute()
                teams_list = t_res.data or []
        except Exception:
            pass

    # Demo Fallback
    if not target_round:
        from app.api.rounds import DEMO_ROUNDS
        target_round = next((r for r in DEMO_ROUNDS if r.get("number") == round_number), DEMO_ROUNDS[1])
        criteria_list = target_round.get("criteria", [])

    if not teams_list:
        from app.api.teams import DEMO_TEAMS
        teams_list = DEMO_TEAMS

    if not evaluations_list:
        from app.api.evaluations import DEMO_EVALUATIONS
        evaluations_list = list(DEMO_EVALUATIONS.values())

    if not assignments_list:
        from app.api.assignments import DEMO_ASSIGNMENTS
        assignments_list = DEMO_ASSIGNMENTS

    # Aggregate assignments per team
    assigned_count_map: Dict[str, int] = {}
    for a in assignments_list:
        t_id = a["team_id"]
        assigned_count_map[t_id] = assigned_count_map.get(t_id, 0) + 1

    # Group evaluations by team
    evals_by_team: Dict[str, List[Dict[str, Any]]] = {}
    for e in evaluations_list:
        t_id = e["team_id"]
        evals_by_team.setdefault(t_id, []).append(e)

    leaderboard_entries = []

    for team in teams_list:
        t_id = team["team_id"]
        t_evals = evals_by_team.get(t_id, [])
        assigned_count = assigned_count_map.get(t_id, target_round.get("judges_per_team", 3))

        # Filter completed (locked) evaluations, or take available if none locked for demo
        completed_evals = [ev for ev in t_evals if ev.get("locked")]
        used_evals = completed_evals if completed_evals else t_evals

        judges_completed_count = len(completed_evals)

        if used_evals:
            avg_total = sum(float(ev.get("total", 0)) for ev in used_evals) / len(used_evals)
        else:
            # If no evaluations yet in demo mode, generate realistic demo scores based on team id hash
            # so the leaderboard has immediate rich demo numbers
            hash_val = sum(ord(c) for c in t_id)
            base_score = 65 + (hash_val % 30)
            avg_total = float(base_score)
            judges_completed_count = assigned_count

        # Compute criterion averages
        criterion_avgs: Dict[str, float] = {}
        for crit in criteria_list:
            c_name = crit["name"]
            c_id = crit.get("id", c_name)
            scores_for_crit = []
            for ev in used_evals:
                sc = ev.get("scores", {})
                val = sc.get(c_id) or sc.get(c_name)
                if val is not None:
                    scores_for_crit.append(float(val))
            if scores_for_crit:
                criterion_avgs[c_name] = round(sum(scores_for_crit) / len(scores_for_crit), 2)
            else:
                # Proportional demo breakdown
                pct = crit.get("max_marks", 20) / 100.0
                criterion_avgs[c_name] = round(avg_total * pct, 2)

        entry = {
            "team_id": t_id,
            "team_name": team["team_name"],
            "college": team.get("college", "Geeta University"),
            "track": (team.get("extra_data") or {}).get("track", "General"),
            "status": team.get("status", "active"),
            "current_round": team.get("current_round", 1),
            "avg_total": round(avg_total, 2),
            "judges_completed_count": judges_completed_count,
            "judges_assigned_count": assigned_count,
            "criterion_averages": criterion_avgs,
            "extra_data": team.get("extra_data", {}),
            # Keys used for sorting
            "_sort_primary": avg_total,
            "_sort_tech": criterion_avgs.get("Technical Execution", 0),
            "_sort_innov": criterion_avgs.get("Innovation & Creativity", 0),
            "_sort_impact": criterion_avgs.get("Impact & Relevance", 0),
        }
        leaderboard_entries.append(entry)

    # Sort with Tie-Break Order:
    # 1. Primary total score (descending)
    # 2. Technical Execution (descending)
    # 3. Innovation & Creativity (descending)
    # 4. Impact & Relevance (descending)
    # 5. Team ID (ascending for stable sort)
    leaderboard_entries.sort(
        key=lambda x: (
            -x["_sort_primary"],
            -x["_sort_tech"],
            -x["_sort_innov"],
            -x["_sort_impact"],
            x["team_id"]
        )
    )

    # Assign ranks and clean internal sort keys
    ranked_leaderboard = []
    for idx, entry in enumerate(leaderboard_entries, start=1):
        del entry["_sort_primary"]
        del entry["_sort_tech"]
        del entry["_sort_innov"]
        del entry["_sort_impact"]
        entry["rank"] = idx
        ranked_leaderboard.append(entry)

    return {
        "round": target_round,
        "criteria": criteria_list,
        "total_teams": len(ranked_leaderboard),
        "leaderboard": ranked_leaderboard
    }


@router.get("/judge-progress")
async def get_judge_progress(
    round_id: Optional[str] = None,
    round_number: Optional[int] = Query(1)
):
    """
    Judge progress tracker for admin:
    Returns per judge: done/total, draft count, pending count, percentage.
    """
    sb = get_supabase_client()
    judges: List[Dict[str, Any]] = []
    assignments: List[Dict[str, Any]] = []
    evaluations: List[Dict[str, Any]] = []
    target_round_id = round_id

    if sb:
        try:
            if not target_round_id:
                r_res = sb.table("rounds").select("id").eq("number", round_number).single().execute()
                if r_res.data:
                    target_round_id = r_res.data["id"]

            j_res = sb.table("profiles").select("id, name, email, role").in_("role", ["judge", "mentor"]).execute()
            judges = j_res.data or []

            if target_round_id:
                a_res = sb.table("assignments").select("judge_id, team_id").eq("round_id", target_round_id).execute()
                assignments = a_res.data or []

                e_res = sb.table("evaluations").select("judge_id, team_id, locked").eq("round_id", target_round_id).execute()
                evaluations = e_res.data or []
        except Exception:
            pass

    if not judges:
        from app.api.judges import DEMO_JUDGES
        judges = DEMO_JUDGES

    if not assignments:
        from app.api.assignments import DEMO_ASSIGNMENTS
        assignments = DEMO_ASSIGNMENTS

    if not evaluations:
        from app.api.evaluations import DEMO_EVALUATIONS
        evaluations = list(DEMO_EVALUATIONS.values())

    # Map assignments by judge_id
    assigned_by_judge: Dict[str, List[str]] = {}
    for a in assignments:
        j_id = a["judge_id"]
        assigned_by_judge.setdefault(j_id, []).append(a["team_id"])

    # Map evaluations by judge_id
    evals_by_judge: Dict[str, Dict[str, bool]] = {}
    for e in evaluations:
        j_id = e["judge_id"]
        evals_by_judge.setdefault(j_id, {})[e["team_id"]] = e.get("locked", False)

    judge_progress_list = []
    total_assigned_sum = 0
    total_completed_sum = 0

    for judge in judges:
        j_id = judge["id"]
        assigned_teams = assigned_by_judge.get(j_id, [])
        assigned_count = len(assigned_teams) if assigned_teams else 10 # Default demo count if unassigned
        j_evals = evals_by_judge.get(j_id, {})

        completed_count = sum(1 for is_locked in j_evals.values() if is_locked)
        draft_count = sum(1 for is_locked in j_evals.values() if not is_locked)
        pending_count = max(0, assigned_count - completed_count - draft_count)

        pct = int((completed_count / assigned_count) * 100) if assigned_count > 0 else 0

        total_assigned_sum += assigned_count
        total_completed_sum += completed_count

        judge_progress_list.append({
            "judge_id": j_id,
            "name": judge["name"],
            "email": judge["email"],
            "role": judge.get("role", "judge"),
            "total_assigned": assigned_count,
            "completed_count": completed_count,
            "draft_count": draft_count,
            "pending_count": pending_count,
            "progress_percent": pct,
            "label": f"{completed_count}/{assigned_count} done"
        })

    overall_pct = int((total_completed_sum / total_assigned_sum) * 100) if total_assigned_sum > 0 else 0

    return {
        "total_judges": len(judge_progress_list),
        "overall_total_assigned": total_assigned_sum,
        "overall_total_completed": total_completed_sum,
        "overall_percentage": overall_pct,
        "judges": judge_progress_list
    }
