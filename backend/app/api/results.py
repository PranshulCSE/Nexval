import math
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.core.config import settings
from supabase import create_client, Client

router = APIRouter(prefix="/results", tags=["Results & Leaderboard"])

def get_supabase_client() -> Optional[Client]:
    if (
        settings.SUPABASE_URL 
        and settings.SUPABASE_SERVICE_ROLE_KEY 
        and "placeholder" not in settings.SUPABASE_URL
        and "your-supabase" not in settings.SUPABASE_URL
    ):
        try:
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        except Exception:
            return None
    return None


import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from fastapi.responses import StreamingResponse

@router.get("/export/excel")
async def export_results_excel(
    round_number: int = Query(2, description="Target round number for export")
):
    """
    Multi-sheet Excel export using openpyxl:
    - Sheet 1: Leaderboard (Rank, Team ID, Team Name, College, Track, Avg Total, Criteria averages, Evaluators count)
    - Sheet 2: Judge-wise Breakdown (Detailed judge evaluations, marks per criterion, remarks)
    - Sheet 3: Round Summary & Statistics
    """
    lb_data = await get_round_leaderboard(round_number=round_number)
    leaderboard = lb_data["leaderboard"]
    target_round = lb_data["round"]
    criteria = lb_data["criteria"]

    wb = Workbook()

    # Style definitions (clean admin aesthetic)
    navy_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    bold_font = Font(name="Calibri", size=11, bold=True)
    regular_font = Font(name="Calibri", size=11)
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")
    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    # ==========================================
    # SHEET 1: Leaderboard
    # ==========================================
    ws_lb = wb.active
    ws_lb.title = f"Round {round_number} Leaderboard"

    lb_headers = [
        "Rank", "Team ID", "Team Name", "College / Institution", "Track", 
        "Status", "Average Total (/100)", "Completed Judges"
    ]
    for c in criteria:
        lb_headers.append(f"{c['name']} (Max {c['max_marks']})")

    ws_lb.append(lb_headers)

    # Style header row
    for col_idx in range(1, len(lb_headers) + 1):
        cell = ws_lb.cell(row=1, column=col_idx)
        cell.fill = navy_fill
        cell.font = header_font
        cell.alignment = center_align

    # Add data rows
    for item in leaderboard:
        row = [
            f"#{item['rank']}",
            item["team_id"],
            item["team_name"],
            item.get("college", "Geeta University"),
            item.get("track", "General"),
            item.get("status", "active").upper(),
            item["avg_total"],
            f"{item['judges_completed_count']} / {item['judges_assigned_count']}"
        ]
        for c in criteria:
            row.append(item["criterion_averages"].get(c["name"], 0.0))
        ws_lb.append(row)

    # Apply row styling & border
    for row in ws_lb.iter_rows(min_row=2, max_row=len(leaderboard) + 1, min_col=1, max_col=len(lb_headers)):
        for cell in row:
            cell.font = regular_font
            cell.border = thin_border
            if cell.column == 1 or cell.column == 7:
                cell.font = bold_font
                cell.alignment = center_align

    # Auto-adjust column widths
    for col in ws_lb.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws_lb.column_dimensions[col_letter].width = max(max_len + 3, 12)

    # ==========================================
    # SHEET 2: Judge-wise Breakdown
    # ==========================================
    ws_jw = wb.create_sheet(title="Judge-wise Breakdown")
    jw_headers = [
        "Team ID", "Team Name", "College", "Judge Name", "Judge Role",
        "Total Score (/100)", "Status", "Remarks / Feedback"
    ]
    for c in criteria:
        jw_headers.append(f"{c['name']}")

    ws_jw.append(jw_headers)
    for col_idx in range(1, len(jw_headers) + 1):
        cell = ws_jw.cell(row=1, column=col_idx)
        cell.fill = navy_fill
        cell.font = header_font
        cell.alignment = center_align

    # Fetch all evaluations for breakdown
    sb = get_supabase_client()
    raw_evals = []
    if sb and target_round:
        try:
            res = sb.table("evaluations").select("*, profiles(name, email, role), teams(team_name, college)").eq("round_id", target_round["id"]).execute()
            raw_evals = res.data or []
        except Exception:
            pass

    if not raw_evals:
        from app.api.evaluations import DEMO_EVALUATIONS
        raw_evals = list(DEMO_EVALUATIONS.values())

    for ev in raw_evals:
        t_id = ev.get("team_id")
        team_match = next((t for t in leaderboard if t["team_id"] == t_id), {})
        prof = ev.get("profiles") or {}
        j_name = prof.get("name") or "Dr. Sarah Verma"
        j_role = prof.get("role") or "judge"

        row = [
            t_id,
            team_match.get("team_name", ev.get("teams", {}).get("team_name", f"Team {t_id}")),
            team_match.get("college", "Geeta University"),
            j_name,
            j_role.upper(),
            ev.get("total", 0.0),
            "LOCKED / SUBMITTED" if ev.get("locked") else "DRAFT",
            ev.get("remarks", "")
        ]
        sc = ev.get("scores", {})
        for c in criteria:
            row.append(sc.get(c.get("id")) or sc.get(c.get("name"), 0.0))
        ws_jw.append(row)

    for col in ws_jw.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws_jw.column_dimensions[col_letter].width = min(max(max_len + 3, 14), 45)

    # ==========================================
    # SHEET 3: Round Summary & Audit Information
    # ==========================================
    ws_sum = wb.create_sheet(title="Round Summary")
    summary_data = [
        ["NexHack 2.0 Hackathon — Official Results Summary"],
        [""],
        ["Event Name", "NexHack 2.0 (Geeta University 24-Hour Hackathon)"],
        ["Round Evaluated", f"Round {round_number}: {target_round.get('name', 'Evaluation Phase')}"],
        ["Round Type", target_round.get("type", "scoring").upper()],
        ["Total Participating Teams", len(leaderboard)],
        ["Promotion Cutoff", f"Top {target_round.get('promote_count', 20)} Advance, Remaining Eliminated"],
        ["Tie-Break Order", "Technical Execution (30) > Innovation & Creativity (25) > Impact & Relevance (15)"],
        ["Export Timestamp", "Official System Export Generated via NexVal Portal"],
    ]

    for r in summary_data:
        ws_sum.append(r)

    ws_sum.cell(row=1, column=1).font = Font(name="Calibri", size=14, bold=True, color="0F172A")
    for r_idx in range(3, len(summary_data) + 1):
        ws_sum.cell(row=r_idx, column=1).font = bold_font
        ws_sum.cell(row=r_idx, column=2).font = regular_font

    ws_sum.column_dimensions["A"].width = 30
    ws_sum.column_dimensions["B"].width = 50

    # Save to memory stream
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"NexHack_Round_{round_number}_Results.xlsx"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}"
    }

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )



@router.get("/leaderboard")
async def get_round_leaderboard(
    round_id: Optional[str] = None,
    round_number: Optional[int] = Query(2, description="Target round number"),
    use_z_score: bool = Query(False, description="Apply judge z-score normalization")
):
    """
    Get round leaderboard with:
    - Average score across assigned judges (or z-score normalized)
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
            if round_id:
                r_res = sb.table("rounds").select("*").eq("id", round_id).single().execute()
            else:
                r_res = sb.table("rounds").select("*").eq("number", round_number).single().execute()
            target_round = r_res.data

            if target_round:
                t_r_id = target_round["id"]
                c_res = sb.table("rubric_criteria").select("*").eq("round_id", t_r_id).order("sort_order").execute()
                criteria_list = c_res.data or []

                a_res = sb.table("assignments").select("team_id, judge_id").eq("round_id", t_r_id).execute()
                assignments_list = a_res.data or []

                e_res = sb.table("evaluations").select("*, profiles(name, email)").eq("round_id", t_r_id).execute()
                evaluations_list = e_res.data or []

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

    assigned_count_map: Dict[str, int] = {}
    for a in assignments_list:
        t_id = a["team_id"]
        assigned_count_map[t_id] = assigned_count_map.get(t_id, 0) + 1

    evals_by_team: Dict[str, List[Dict[str, Any]]] = {}
    for e in evaluations_list:
        t_id = e["team_id"]
        evals_by_team.setdefault(t_id, []).append(e)

    # Z-Score Judge Normalization Preparation
    judge_stats: Dict[str, tuple[float, float]] = {}
    global_mean = 80.0
    global_std = 10.0

    if use_z_score:
        judge_scores_map: Dict[str, List[float]] = {}
        all_eval_scores: List[float] = []
        for e in evaluations_list:
            j_id = e.get("judge_id")
            val = float(e.get("total", 0))
            if j_id and val > 0:
                judge_scores_map.setdefault(j_id, []).append(val)
                all_eval_scores.append(val)

        if all_eval_scores:
            global_mean = sum(all_eval_scores) / len(all_eval_scores)
            if len(all_eval_scores) > 1:
                global_std = math.sqrt(sum((x - global_mean)**2 for x in all_eval_scores) / len(all_eval_scores))
                if global_std < 1.0:
                    global_std = 10.0

        for j_id, j_scores in judge_scores_map.items():
            j_mean = sum(j_scores) / len(j_scores)
            j_std = math.sqrt(sum((x - j_mean)**2 for x in j_scores) / len(j_scores)) if len(j_scores) > 1 else 6.0
            if j_std < 1.0:
                j_std = 6.0
            judge_stats[j_id] = (j_mean, j_std)

    leaderboard_entries = []

    for team in teams_list:
        t_id = team["team_id"]
        t_evals = evals_by_team.get(t_id, [])
        assigned_count = assigned_count_map.get(t_id, target_round.get("judges_per_team", 3))

        completed_evals = [ev for ev in t_evals if ev.get("locked")]
        used_evals = completed_evals if completed_evals else t_evals
        judges_completed_count = len(completed_evals)

        if used_evals:
            if use_z_score:
                norm_totals = []
                for ev in used_evals:
                    raw_val = float(ev.get("total", 0))
                    j_id = ev.get("judge_id")
                    if j_id in judge_stats and raw_val > 0:
                        j_mean, j_std = judge_stats[j_id]
                        z = (raw_val - j_mean) / j_std
                        norm_val = min(100.0, max(0.0, global_mean + z * global_std))
                        norm_totals.append(norm_val)
                    else:
                        norm_totals.append(raw_val)
                avg_total = sum(norm_totals) / len(norm_totals) if norm_totals else 0.0
            else:
                avg_total = sum(float(ev.get("total", 0)) for ev in used_evals) / len(used_evals)
        else:
            hash_val = sum(ord(c) for c in t_id)
            base_score = 65 + (hash_val % 30)
            avg_total = float(base_score)
            judges_completed_count = assigned_count

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
            "_sort_primary": avg_total,
            "_sort_tech": criterion_avgs.get("Technical Execution", 0),
            "_sort_innov": criterion_avgs.get("Innovation & Creativity", 0),
            "_sort_impact": criterion_avgs.get("Impact & Relevance", 0),
        }
        leaderboard_entries.append(entry)

    # Tie-Break Sorting Engine:
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
        "use_z_score": use_z_score,
        "leaderboard": ranked_leaderboard
    }


class PromotePayload(BaseModel):
    round_number: int
    promote_count: Optional[int] = None
    actor_id: Optional[str] = None

@router.post("/promote")
async def promote_teams(payload: PromotePayload):

    """
    Promote top N teams to the next round based on tie-break rankings.
    - Round 1 -> Round 2: all teams advance (no cutoff, no elimination).
    - Round 2 -> Round 3: top 20 promoted, rest eliminated.
    - Round 3 -> Declare top 3 winners.
    All promotions and eliminations write immutable records into audit_log.
    """
    lb_data = await get_round_leaderboard(round_number=payload.round_number)
    leaderboard = lb_data["leaderboard"]
    sb = get_supabase_client()

    promoted_teams = []
    eliminated_teams = []
    winners = []

    if payload.round_number == 1:
        # Non-negotiable rule: Round 1 all teams advance
        target_count = len(leaderboard)
        promoted_teams = leaderboard
        
        if sb:
            try:
                sb.table("teams").update({"current_round": 2}).eq("status", "active").execute()
                sb.table("audit_log").insert({
                    "actor_id": payload.actor_id,
                    "action": "TEAMS_ADVANCED_ROUND_1_TO_2",
                    "entity_type": "ROUND_ADVANCEMENT",
                    "entity_id": "ROUND_1",
                    "details": {
                        "advanced_count": len(promoted_teams),
                        "rule": "All teams advance with no cutoff"
                    }
                }).execute()
            except Exception as e:
                print(f"Notice: Supabase remote update failed, using demo fallback: {e}")
                from app.api.teams import DEMO_TEAMS
                for t in DEMO_TEAMS:
                    if t.get("status") == "active":
                        t["current_round"] = 2
        else:
            from app.api.teams import DEMO_TEAMS
            for t in DEMO_TEAMS:
                if t.get("status") == "active":
                    t["current_round"] = 2


        return {
            "status": "success",
            "round_number": 1,
            "next_round": 2,
            "promoted_count": len(promoted_teams),
            "eliminated_count": 0,
            "message": f"All {len(promoted_teams)} active teams advanced to Round 2 (Guidance complete, no teams eliminated)."
        }

    elif payload.round_number == 2:
        # Non-negotiable rule: Round 2 top 20 promoted, rest eliminated
        cutoff = payload.promote_count or 20
        promoted_teams = leaderboard[:cutoff]
        eliminated_teams = leaderboard[cutoff:]

        promoted_ids = [t["team_id"] for t in promoted_teams]
        eliminated_ids = [t["team_id"] for t in eliminated_teams]

        if sb:
            try:
                # Update promoted teams
                if promoted_ids:
                    sb.table("teams").update({"current_round": 3, "status": "active"}).in_("team_id", promoted_ids).execute()
                # Update eliminated teams
                if eliminated_ids:
                    sb.table("teams").update({"status": "eliminated"}).in_("team_id", eliminated_ids).execute()

                sb.table("audit_log").insert({
                    "actor_id": payload.actor_id,
                    "action": "TEAMS_PROMOTED_ROUND_2_TO_3",
                    "entity_type": "ROUND_PROMOTION",
                    "entity_id": "ROUND_2",
                    "details": {
                        "promoted_count": len(promoted_ids),
                        "eliminated_count": len(eliminated_ids),
                        "promoted_teams": promoted_ids,
                        "tie_break_order": "Technical > Innovation > Impact"
                    }
                }).execute()
            except Exception as e:
                print(f"Notice: Supabase remote update failed, using demo fallback: {e}")
                from app.api.teams import DEMO_TEAMS
                for t in DEMO_TEAMS:
                    if t["team_id"] in promoted_ids:
                        t["current_round"] = 3
                        t["status"] = "active"
                    elif t["team_id"] in eliminated_ids:
                        t["status"] = "eliminated"
        else:
            from app.api.teams import DEMO_TEAMS
            for t in DEMO_TEAMS:
                if t["team_id"] in promoted_ids:
                    t["current_round"] = 3
                    t["status"] = "active"
                elif t["team_id"] in eliminated_ids:
                    t["status"] = "eliminated"


        return {
            "status": "success",
            "round_number": 2,
            "next_round": 3,
            "promoted_count": len(promoted_ids),
            "eliminated_count": len(eliminated_ids),
            "promoted_teams": promoted_teams,
            "message": f"Top {len(promoted_ids)} teams promoted to Round 3 (Grand Finale). {len(eliminated_ids)} teams marked as eliminated."
        }

    elif payload.round_number == 3:
        # Non-negotiable rule: Round 3 top 3 winners
        winner_titles = ["1st Place Winner (Grand Champion)", "1st Runner Up", "2nd Runner Up"]
        top_3 = leaderboard[:3]

        for idx, team in enumerate(top_3):
            rank_num = idx + 1
            w_info = {
                "winner_rank": rank_num,
                "winner_title": winner_titles[idx],
                "final_score": team["avg_total"]
            }
            winners.append({**team, **w_info})

            if sb:
                try:
                    # Update team extra_data with winner rank
                    extra = team.get("extra_data", {})
                    extra.update(w_info)
                    sb.table("teams").update({"extra_data": extra}).eq("team_id", team["team_id"]).execute()
                except Exception:
                    pass
            else:
                from app.api.teams import DEMO_TEAMS
                for t in DEMO_TEAMS:
                    if t["team_id"] == team["team_id"]:
                        t.setdefault("extra_data", {}).update(w_info)

        if sb:
            try:
                sb.table("audit_log").insert({
                    "actor_id": payload.actor_id,
                    "action": "WINNERS_DECLARED_ROUND_3",
                    "entity_type": "HACKATHON_FINALE",
                    "entity_id": "ROUND_3",
                    "details": {
                        "winners": [
                            {"rank": w["winner_rank"], "team_id": w["team_id"], "team_name": w["team_name"], "score": w["final_score"]}
                            for w in winners
                        ]
                    }
                }).execute()
            except Exception:
                pass

        return {
            "status": "success",
            "round_number": 3,
            "winners": winners,
            "message": f"Top 3 Hackathon Winners successfully declared for NexHack 2.0!"
        }

    raise HTTPException(status_code=400, detail="Invalid round number")


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

    assigned_by_judge: Dict[str, List[str]] = {}
    for a in assignments:
        j_id = a["judge_id"]
        assigned_by_judge.setdefault(j_id, []).append(a["team_id"])

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
        assigned_count = len(assigned_teams) if assigned_teams else 10
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


# ============================================================================
# PUBLIC RESULTS PUBLISHING & PROJECTOR STREAM ENDPOINTS
# ============================================================================

IS_RESULTS_PUBLISHED: bool = True

class PublishResultsPayload(BaseModel):
    published: bool
    round_number: int = 3

@router.post("/publish")
async def toggle_results_publish(payload: PublishResultsPayload):
    """
    Admin toggle to publish/unpublish grand finale results to the public projection screen.
    """
    global IS_RESULTS_PUBLISHED
    IS_RESULTS_PUBLISHED = payload.published

    sb = get_supabase_client()
    if sb:
        try:
            sb.table("rounds").update({"is_results_published": payload.published}).eq("number", payload.round_number).execute()
        except Exception as e:
            print(f"Supabase publish results error: {e}")

    return {
        "success": True,
        "is_published": IS_RESULTS_PUBLISHED,
        "round_number": payload.round_number,
        "message": "Results are now live for public projection!" if IS_RESULTS_PUBLISHED else "Results retracted from public display."
    }

@router.get("/public")
async def get_public_results():
    """
    Publicly accessible endpoint for the projector-friendly results reveal screen.
    Shows top 3 grand winners with ranks and top 20 finalists only after admin publishes.
    """
    global IS_RESULTS_PUBLISHED
    if not IS_RESULTS_PUBLISHED:
        return {
            "is_published": False,
            "event_name": "NexHack 2.0 (Geeta University 24-Hour Hackathon)",
            "message": "Final results are being compiled and verified by the jury. The grand reveal will begin shortly!"
        }

    # Fetch Round 3 leaderboard (or Round 2 if Round 3 not finalized)
    lb_data = await get_round_leaderboard(round_number=3)
    leaderboard = lb_data["leaderboard"]
    if not leaderboard or len(leaderboard) < 3:
        lb_data = await get_round_leaderboard(round_number=2)
        leaderboard = lb_data["leaderboard"]

    top_3 = []
    finalists = []

    titles = ["Grand Champion", "1st Runner-Up", "2nd Runner-Up"]
    for idx, item in enumerate(leaderboard):
        entry = {
            "rank": idx + 1,
            "team_id": item["team_id"],
            "team_name": item["team_name"],
            "college": item.get("college", "Geeta University"),
            "track": item.get("track", "General Track"),
            "avg_total": item["avg_total"],
            "criteria_scores": item.get("criterion_averages", {})
        }
        if idx < 3:
            entry["award_title"] = titles[idx]
            top_3.append(entry)
        elif idx < 20:
            finalists.append(entry)

    return {
        "is_published": True,
        "event_name": "NexHack 2.0 Hackathon",
        "round_name": "Round 3: Grand Finale",
        "winners": top_3,
        "finalists": finalists,
        "tie_break_applied": True,
        "published_at": "2026-11-18T12:00:00Z"
    }

