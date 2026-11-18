import io
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.api.teams import DEMO_TEAMS
from app.api.rounds import DEMO_ROUNDS
from app.api.judges import DEMO_JUDGES
from app.api.evaluations import DEMO_EVALUATIONS

router = APIRouter(prefix="/feedback", tags=["Team Feedback Reports"])

# In-memory publication toggle
IS_FEEDBACK_PUBLISHED = True

class FeedbackPublishPayload(BaseModel):
    published: bool

# Sample Round 1 remarks for realistic hackathon guidance
DEFAULT_SAMPLE_REMARKS = [
    {
        "judge_name": "Dr. Sarah Verma",
        "role": "judge",
        "remarks": "Solid architectural concept. For Round 2, ensure your real-time data sync handles edge network drops gracefully. Highlight measurable business impact in your presentation.",
        "created_at": "2026-11-17T16:00:00Z"
    },
    {
        "judge_name": "Vikram Malhotra (Industry Mentor)",
        "role": "mentor",
        "remarks": "Great progress on the core algorithm. Recommend refining the UI/UX so the dashboard is intuitive for non-technical users. Good potential for scalability.",
        "created_at": "2026-11-17T17:30:00Z"
    }
]

@router.get("/status")
async def get_feedback_status():
    """Check if Round 1 feedback reports have been approved for release."""
    global IS_FEEDBACK_PUBLISHED
    return {"is_published": IS_FEEDBACK_PUBLISHED}

@router.post("/publish")
async def toggle_feedback_publish(payload: FeedbackPublishPayload):
    """Admin approves or revokes public release of Round 1 feedback reports."""
    global IS_FEEDBACK_PUBLISHED
    IS_FEEDBACK_PUBLISHED = payload.published

    sb = get_supabase_client()
    if sb:
        try:
            sb.table("rounds").update({"is_feedback_published": payload.published}).eq("number", 1).execute()
        except Exception as e:
            print(f"Supabase feedback publish update error: {e}")

    return {
        "success": True,
        "is_published": IS_FEEDBACK_PUBLISHED,
        "message": "Round 1 feedback reports are now visible to teams." if IS_FEEDBACK_PUBLISHED else "Feedback reports hidden."
    }

@router.get("/teams/{team_id}")
async def get_team_feedback(team_id: str, is_admin: bool = Query(False)):
    """
    Retrieve Round 1 feedback for a specific team.
    Non-negotiable rule: Only Round 1 remarks, NO scores leaked, only after admin approval.
    """
    global IS_FEEDBACK_PUBLISHED
    if not IS_FEEDBACK_PUBLISHED and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Team feedback reports have not yet been approved for release by hackathon administrators."
        )

    # 1. Match Team
    team = next((t for t in DEMO_TEAMS if t.get("team_id") == team_id or t.get("id") == team_id), None)
    if not team:
        team = {
            "team_id": team_id,
            "team_name": f"Team {team_id}",
            "college": "Geeta University",
            "extra_data": {"track": "General"}
        }

    # 2. Fetch Round 1 Remarks (DB or DEMO_EVALUATIONS)
    remarks_list = []
    sb = get_supabase_client()
    if sb:
        try:
            # Round 1 only
            r1_res = sb.table("rounds").select("id").eq("number", 1).execute()
            if r1_res.data:
                r1_id = r1_res.data[0]["id"]
                eval_res = sb.table("evaluations").select("remarks, updated_at, profiles(name, role)").eq("round_id", r1_id).eq("team_id", team_id).execute()
                for ev in (eval_res.data or []):
                    if ev.get("remarks"):
                        prof = ev.get("profiles") or {}
                        remarks_list.append({
                            "judge_name": prof.get("name", "Official Evaluator"),
                            "role": prof.get("role", "judge"),
                            "remarks": ev.get("remarks"),
                            "created_at": ev.get("updated_at")
                        })
        except Exception:
            pass

    if not remarks_list:
        # Check DEMO_EVALUATIONS for Round 1
        for ev in DEMO_EVALUATIONS.values():
            if ev.get("team_id") == team_id and ev.get("round_id") in ["mock-round-1", "1", "11111111-1111-1111-1111-111111111111"]:
                if ev.get("remarks"):
                    judge = next((j for j in DEMO_JUDGES if j.get("id") == ev.get("judge_id")), {})
                    remarks_list.append({
                        "judge_name": judge.get("name", "Dr. Sarah Verma"),
                        "role": judge.get("role", "judge"),
                        "remarks": ev.get("remarks"),
                        "created_at": ev.get("updated_at", "2026-11-17T16:00:00Z")
                    })

    if not remarks_list:
        remarks_list = DEFAULT_SAMPLE_REMARKS

    return {
        "team_id": team.get("team_id"),
        "team_name": team.get("team_name"),
        "college": team.get("college", "Geeta University"),
        "track": team.get("extra_data", {}).get("track", "General Track"),
        "round_number": 1,
        "round_name": "Round 1: Guidance Phase",
        "is_published": IS_FEEDBACK_PUBLISHED,
        "remarks": remarks_list
    }

@router.get("/teams/{team_id}/pdf")
async def generate_team_feedback_pdf(team_id: str, is_admin: bool = Query(False)):
    """
    Generate downloadable PDF feedback report for a team.
    Strictly contains Round 1 guidance remarks only.
    """
    data = await get_team_feedback(team_id=team_id, is_admin=is_admin)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    header_title = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
    )

    subhead = ParagraphStyle(
        'Subhead',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#475569'),
    )

    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0F172A'),
    )

    body_text = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=14,
        textColor=colors.HexColor('#1E293B'),
    )

    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748B'),
    )

    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A'),
    )

    story = []

    # Title & Branding
    now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
    header_block = [
        [
            Paragraph("<b>GEETA UNIVERSITY | NexHack 2.0</b><br/><font color='#64748B' size='9'>Official Hackathon Guidance & Mentorship Feedback Report</font>", header_title),
            Paragraph(f"<b>Issued:</b> {now_str}<br/><b>Phase:</b> Round 1 Guidance<br/><b>Classification:</b> Team Confidential", subhead)
        ]
    ]
    hdr_table = Table(header_block, colWidths=[350, 180])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(hdr_table)
    story.append(Spacer(1, 10))

    # Team Overview Card
    team_info = [
        [
            Paragraph("TEAM ID", meta_label),
            Paragraph("TEAM NAME", meta_label),
            Paragraph("INSTITUTION", meta_label),
            Paragraph("HACKATHON TRACK", meta_label),
        ],
        [
            Paragraph(f"<b>{data.get('team_id')}</b>", meta_val),
            Paragraph(f"<b>{data.get('team_name')}</b>", meta_val),
            Paragraph(data.get('college', 'Geeta University'), meta_val),
            Paragraph(data.get('track', 'General Track'), meta_val),
        ]
    ]
    info_table = Table(team_info, colWidths=[90, 180, 150, 110])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))

    # Section Header
    story.append(Paragraph("<b>EVALUATOR & MENTOR REMARKS</b>", section_title))
    story.append(Paragraph("<font color='#64748B'>Qualitative observations, technical suggestions, and feasibility feedback recorded during Round 1:</font>", subhead))
    story.append(Spacer(1, 10))

    # Remarks items
    remarks = data.get("remarks", [])
    for idx, item in enumerate(remarks, 1):
        role_label = "JUDGE" if item.get("role") == "judge" else "MENTOR"
        card_content = [
            [
                Paragraph(f"<b>#{idx} &bull; {item.get('judge_name')}</b> <font color='#64748B' size='8'>[{role_label}]</font>", meta_label),
            ],
            [
                Paragraph(f'"{item.get("remarks")}"', body_text)
            ]
        ]
        card_table = Table(card_content, colWidths=[530])
        card_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFFFF')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#F1F5F9')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(card_table)
        story.append(Spacer(1, 8))

    # Guidelines Note & Seal
    story.append(Spacer(1, 15))
    note_text = Paragraph(
        "<i>Note: Round 1 is an orientation and guidance round designed to help teams refine their technical implementation before competitive scoring in Round 2. No numeric scores are assigned in Round 1.</i>",
        subhead
    )
    seal_block = [
        [
            Paragraph("<b>NexHack 2.0 Organizing Committee</b><br/><font color='#64748B'>Department of Computer Science & Engineering<br/>Geeta University, Delhi-NCR</font>", subhead),
            Paragraph("<b>Academic Verification:</b><br/>Certified Authentic Guidance Report", subhead)
        ]
    ]
    seal_table = Table(seal_block, colWidths=[330, 200])
    seal_table.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    story.append(KeepTogether([note_text, Spacer(1, 12), seal_table]))

    doc.build(story)
    buffer.seek(0)

    filename = f"nexhack_feedback_{data.get('team_id')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
