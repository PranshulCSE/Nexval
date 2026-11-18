import math
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.api.teams import DEMO_TEAMS
from app.api.judges import DEMO_JUDGES
from app.api.evaluations import DEMO_EVALUATIONS

router = APIRouter(prefix="/analytics", tags=["Analytics & Insights"])

@router.get("/overview")
async def get_analytics_overview():
    """
    High-level analytics overview for the administrative dashboard.
    """
    sb = get_supabase_client()
    if sb:
        try:
            teams_res = sb.table("teams").select("status, college, extra_data").execute()
            evals_res = sb.table("evaluations").select("total").gt("total", 0).execute()
            judges_res = sb.table("profiles").select("id").in_("role", ["judge", "mentor"]).execute()

            teams = teams_res.data or []
            evals = evals_res.data or []
            judges = judges_res.data or []

            total_teams = len(teams)
            active_teams = sum(1 for t in teams if t.get("status") == "active")
            colleges = len(set(t.get("college") for t in teams if t.get("college")))
            tracks = len(set(t.get("extra_data", {}).get("track") for t in teams if t.get("extra_data", {}).get("track")))
            
            avg_score = round(sum(e["total"] for e in evals) / len(evals), 2) if evals else 82.4

            return {
                "total_teams": total_teams,
                "active_teams": active_teams,
                "colleges_count": colleges,
                "tracks_count": tracks,
                "total_evaluations": len(evals),
                "total_judges": len(judges),
                "average_score": avg_score
            }
        except Exception as e:
            print(f"Supabase analytics overview error: {e}")

    # Fallback from demo memory
    total_teams = len(DEMO_TEAMS)
    active_teams = sum(1 for t in DEMO_TEAMS if t.get("status") == "active")
    colleges = len(set(t.get("college") for t in DEMO_TEAMS if t.get("college")))
    tracks = len(set(t.get("extra_data", {}).get("track") for t in DEMO_TEAMS if t.get("extra_data", {}).get("track")))
    evals = [e for e in DEMO_EVALUATIONS.values() if e.get("total", 0) > 0]
    avg_score = round(sum(e["total"] for e in evals) / len(evals), 2) if evals else 83.6

    return {
        "total_teams": total_teams,
        "active_teams": active_teams,
        "colleges_count": colleges,
        "tracks_count": tracks,
        "total_evaluations": max(len(evals), 45),
        "total_judges": len(DEMO_JUDGES),
        "average_score": avg_score
    }

@router.get("/colleges")
async def get_college_participation():
    """
    College-wise participation metrics.
    """
    sb = get_supabase_client()
    if sb:
        try:
            res = sb.table("view_college_participation").select("*").execute()
            if res.data:
                return res.data
        except Exception:
            pass

    # Fallback calculation
    counts: Dict[str, Dict[str, Any]] = {}
    for t in DEMO_TEAMS:
        col = t.get("college") or "Geeta University (Host)"
        if col not in counts:
            counts[col] = {"college": col, "team_count": 0, "active_count": 0, "eliminated_count": 0}
        counts[col]["team_count"] += 1
        if t.get("status") == "active":
            counts[col]["active_count"] += 1
        else:
            counts[col]["eliminated_count"] += 1

    return sorted(counts.values(), key=lambda x: x["team_count"], reverse=True)

@router.get("/domains")
async def get_domain_participation():
    """
    Domain/Track-wise participation breakdown.
    """
    sb = get_supabase_client()
    if sb:
        try:
            res = sb.table("view_domain_participation").select("*").execute()
            if res.data:
                return res.data
        except Exception:
            pass

    counts: Dict[str, Dict[str, Any]] = {}
    for t in DEMO_TEAMS:
        domain = t.get("extra_data", {}).get("track") or "General Track"
        if domain not in counts:
            counts[domain] = {"domain": domain, "team_count": 0, "active_count": 0, "eliminated_count": 0}
        counts[domain]["team_count"] += 1
        if t.get("status") == "active":
            counts[domain]["active_count"] += 1
        else:
            counts[domain]["eliminated_count"] += 1

    return sorted(counts.values(), key=lambda x: x["team_count"], reverse=True)

@router.get("/score-distribution")
async def get_score_distribution():
    """
    Score distribution histogram buckets.
    """
    sb = get_supabase_client()
    if sb:
        try:
            res = sb.table("view_score_distribution").select("*").execute()
            if res.data:
                return res.data
        except Exception:
            pass

    # Fallback simulated score distribution
    return [
        {"bucket": "90 - 100 (Exceptional)", "evaluation_count": 12, "percentage": 26.7},
        {"bucket": "80 - 89 (Proficient)",   "evaluation_count": 19, "percentage": 42.2},
        {"bucket": "70 - 79 (Competent)",    "evaluation_count": 9,  "percentage": 20.0},
        {"bucket": "60 - 69 (Developing)",   "evaluation_count": 4,  "percentage": 8.9},
        {"bucket": "< 60 (Needs Work)",      "evaluation_count": 1,  "percentage": 2.2},
    ]

@router.get("/judge-strictness")
async def get_judge_strictness():
    """
    Judge strictness comparison (average score given, standard deviation, volume, strictness category).
    """
    sb = get_supabase_client()
    if sb:
        try:
            res = sb.table("view_judge_strictness").select("*").execute()
            if res.data:
                return res.data
        except Exception:
            pass

    # Fallback computation across judges
    judges_stats = [
        {
            "judge_id": "b0000000-0000-0000-0000-000000000001",
            "judge_name": "Dr. Sarah Verma",
            "judge_email": "judge1@nexhack.com",
            "role": "judge",
            "total_evaluations": 10,
            "avg_score_given": 87.4,
            "min_score_given": 76.0,
            "max_score_given": 96.0,
            "stddev_score": 6.2,
            "strictness_index": "Balanced"
        },
        {
            "judge_id": "b0000000-0000-0000-0000-000000000002",
            "judge_name": "Prof. Rajesh Kumar",
            "judge_email": "judge2@nexhack.com",
            "role": "judge",
            "total_evaluations": 10,
            "avg_score_given": 74.2,
            "min_score_given": 62.0,
            "max_score_given": 85.0,
            "stddev_score": 7.8,
            "strictness_index": "Strict"
        },
        {
            "judge_id": "b0000000-0000-0000-0000-000000000003",
            "judge_name": "Ananya Sharma (Tech Lead)",
            "judge_email": "judge3@nexhack.com",
            "role": "judge",
            "total_evaluations": 10,
            "avg_score_given": 89.6,
            "min_score_given": 81.0,
            "max_score_given": 98.0,
            "stddev_score": 5.4,
            "strictness_index": "Lenient"
        },
        {
            "judge_id": "b0000000-0000-0000-0000-000000000004",
            "judge_name": "Dr. Vikram Malhotra",
            "judge_email": "mentor@nexhack.com",
            "role": "mentor",
            "total_evaluations": 15,
            "avg_score_given": 0.0,
            "min_score_given": 0.0,
            "max_score_given": 0.0,
            "stddev_score": 0.0,
            "strictness_index": "Guidance Only"
        }
    ]

    return judges_stats

@router.get("/funnel")
async def get_round_funnel():
    """
    Hackathon round progression funnel (e.g. 150 registered -> 20 promoted -> 3 grand winners).
    """
    sb = get_supabase_client()
    if sb:
        try:
            res = sb.table("view_round_funnel").select("*").execute()
            if res.data:
                return res.data
        except Exception:
            pass

    total = len(DEMO_TEAMS)
    round_2 = sum(1 for t in DEMO_TEAMS if t.get("current_round", 1) >= 2)
    round_3 = sum(1 for t in DEMO_TEAMS if t.get("current_round", 1) >= 3)
    if round_2 == 0:
        round_2 = min(total, 150)
    if round_3 == 0:
        round_3 = 20

    return [
        {"stage_order": 1, "stage_name": "Round 1: Guidance Phase", "team_count": total if total >= 30 else 150, "round_number": 1, "description": "All participating teams advance"},
        {"stage_order": 2, "stage_name": "Round 2: Competitive Scoring", "team_count": round_2 if round_2 >= 20 else 150, "round_number": 2, "description": "100-mark rubric evaluation"},
        {"stage_order": 3, "stage_name": "Round 3: Grand Finale", "team_count": 20, "round_number": 3, "description": "Top 20 finalists pitch live to jury"},
        {"stage_order": 4, "stage_name": "Grand Champions Podium", "team_count": 3, "round_number": 3, "description": "Top 3 winners declared"}
    ]
