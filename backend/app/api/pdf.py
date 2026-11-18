import io
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from app.core.supabase import get_supabase_client
from app.core.config import settings
from app.api.teams import DEMO_TEAMS
from app.api.rounds import DEMO_ROUNDS
from app.api.judges import DEMO_JUDGES
from app.api.assignments import DEMO_ASSIGNMENTS

router = APIRouter(prefix="/pdf", tags=["PDF Generation"])

@router.get("/judgement-sheet")
async def generate_judgement_sheet(
    round_id: Optional[str] = None,
    judge_id: Optional[str] = None
):
    """
    Generate official NexHack 2.0 Printable Judgement Sheet PDF.
    Matches layout: Sr No, Team Name, Team ID, dynamic criteria columns, Total, Remarks, signature line.
    """
    buffer = io.BytesIO()
    # Landscape Letter (11 x 8.5 inches) for wide tabular rubric layout
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    # 1. Fetch Round Info
    round_obj = None
    if round_id:
        for r in DEMO_ROUNDS:
            if str(r.get("id")) == str(round_id) or str(r.get("number")) == str(round_id):
                round_obj = r
                break
    if not round_obj:
        round_obj = DEMO_ROUNDS[1] if len(DEMO_ROUNDS) > 1 else DEMO_ROUNDS[0]  # Round 2 by default

    # 2. Fetch Criteria
    criteria = round_obj.get("criteria", [])
    if not criteria:
        criteria = [
            {"name": "Innovation & Creativity", "max_marks": 25},
            {"name": "Technical Execution", "max_marks": 30},
            {"name": "Impact & Relevance", "max_marks": 15},
            {"name": "Scalability", "max_marks": 15},
            {"name": "Presentation & Demo", "max_marks": 15},
        ]

    # 3. Fetch Judge Info
    judge_name = "All / Walk-in Judge"
    judge_email = "evaluation@nexhack.com"
    if judge_id:
        for j in DEMO_JUDGES:
            if str(j.get("id")) == str(judge_id):
                judge_name = j.get("name")
                judge_email = j.get("email")
                break

    # 4. Fetch Assigned Teams
    assigned_team_ids = set()
    if judge_id:
        for a in DEMO_ASSIGNMENTS:
            if str(a.get("judge_id")) == str(judge_id):
                assigned_team_ids.add(a.get("team_id"))

    teams_to_show = []
    if assigned_team_ids:
        teams_to_show = [t for t in DEMO_TEAMS if t.get("team_id") in assigned_team_ids or t.get("id") in assigned_team_ids]
    if not teams_to_show:
        # If no specific assignments or judge_id is none, display active teams
        teams_to_show = [t for t in DEMO_TEAMS if t.get("status") == "active"][:15]

    # Prepare ReportLab document elements
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#0F172A'),
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569'),
    )

    cell_bold_style = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        alignment=1, # Center
        textColor=colors.HexColor('#FFFFFF'),
    )

    cell_text_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1E293B'),
    )

    cell_center_style = ParagraphStyle(
        'CellCenter',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        alignment=1,
        textColor=colors.HexColor('#1E293B'),
    )

    story = []

    # Header block
    now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
    header_table_data = [
        [
            Paragraph("<b>GEETA UNIVERSITY | NexHack 2.0</b><br/><font color='#64748B' size='8'>Official Hackathon Judging & Evaluation Sheet</font>", title_style),
            Paragraph(f"<b>Round:</b> Round {round_obj.get('number', 2)} ({round_obj.get('name', 'Scoring')})<br/><b>Judge:</b> {judge_name}<br/><b>Date:</b> {now_str}", subtitle_style)
        ]
    ]
    header_table = Table(header_table_data, colWidths=[420, 300])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # Build evaluation table
    # Columns: Sr No (35), Team ID (65), Team Name (130), [Criteria columns], Total (45), Remarks (130)
    col_widths = [32, 65, 120]
    headers = [
        Paragraph("Sr", cell_bold_style),
        Paragraph("Team ID", cell_bold_style),
        Paragraph("Team Name", cell_bold_style),
    ]

    # Calculate remaining width for dynamic criteria
    # Total available width = 792 - 72 = 720pt
    fixed_width = 32 + 65 + 120 + 45 + 130 # 392pt
    remaining_width = 720 - fixed_width # 328pt
    criteria_col_width = max(55, remaining_width / max(1, len(criteria)))

    for crit in criteria:
        short_name = crit.get("name", "")
        # Shorten very long names for header readability
        if "Innovation" in short_name:
            short_name = "Innovation"
        elif "Technical" in short_name:
            short_name = "Technical"
        elif "Impact" in short_name:
            short_name = "Impact"
        elif "Scalability" in short_name:
            short_name = "Scalability"
        elif "Presentation" in short_name or "Demo" in short_name:
            short_name = "Pitch/Demo"
        
        headers.append(Paragraph(f"{short_name}<br/>(Max {crit.get('max_marks', 0)})", cell_bold_style))
        col_widths.append(criteria_col_width)

    # Add Total and Remarks
    headers.append(Paragraph("Total<br/>(100)", cell_bold_style))
    col_widths.append(45)

    headers.append(Paragraph("Remarks / Notes", cell_bold_style))
    col_widths.append(130)

    table_data = [headers]

    for idx, team in enumerate(teams_to_show, 1):
        row = [
            Paragraph(str(idx), cell_center_style),
            Paragraph(f"<b>{team.get('team_id', '')}</b>", cell_center_style),
            Paragraph(f"<b>{team.get('team_name', '')}</b><br/><font color='#64748B' size='7'>{team.get('college', '')[:25]}</font>", cell_text_style),
        ]
        # Blank cells for judge scoring
        for _ in criteria:
            row.append(Paragraph("", cell_center_style))
        row.append(Paragraph("", cell_center_style)) # Total
        row.append(Paragraph("", cell_text_style))   # Remarks
        table_data.append(row)

    eval_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    eval_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#0F172A')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        # Light alternating row shading
        *[('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F8FAFC')) for i in range(2, len(table_data), 2)]
    ]))

    story.append(eval_table)
    story.append(Spacer(1, 15))

    # Signature & verification footer
    footer_text = Paragraph(
        "<i>I hereby verify that all evaluations recorded above are independent, accurate, and judged strictly in accordance with the NexHack 2.0 Code of Conduct.</i>",
        subtitle_style
    )
    sig_block = [
        [
            Paragraph("<b>Date of Evaluation:</b> ____________________", subtitle_style),
            Paragraph("<b>Evaluator Signature:</b> ____________________________________", subtitle_style)
        ]
    ]
    sig_table = Table(sig_block, colWidths=[360, 360])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))

    story.append(KeepTogether([footer_text, Spacer(1, 8), sig_table]))

    doc.build(story)
    buffer.seek(0)

    filename = f"nexhack_judgement_sheet_{round_obj.get('number', 2)}_{judge_name.replace(' ', '_').lower()}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
