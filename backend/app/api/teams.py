import io
import csv
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from pydantic import BaseModel, Field
import openpyxl

from app.core.config import settings
from supabase import create_client, Client

router = APIRouter(prefix="/teams", tags=["Teams"])

# In-memory store for fallback/demo mode when Supabase is not configured
DEMO_TEAMS: List[Dict[str, Any]] = [
    {
        "id": "t-001",
        "team_id": "NEX-01",
        "team_name": "Quantum Coders",
        "college": "Geeta University",
        "members": ["Aarav Sharma", "Pooja Patel", "Rohan Gupta"],
        "extra_data": {"project": "AI Disaster Response", "track": "AI & ML"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T12:00:00Z"
    },
    {
        "id": "t-002",
        "team_id": "NEX-02",
        "team_name": "Binary Beasts",
        "college": "IIT Delhi",
        "members": ["Vikram Malhotra", "Sneha Rao"],
        "extra_data": {"project": "Decentralized Identity", "track": "Web3"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T12:05:00Z"
    },
    {
        "id": "t-003",
        "team_id": "NEX-03",
        "team_name": "Cyber Hawks",
        "college": "DTU",
        "members": ["Kabir Singh", "Neha Verma", "Aditya Joshi"],
        "extra_data": {"project": "Smart Grid Monitor", "track": "IoT"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T12:10:00Z"
    },
    {
        "id": "t-004",
        "team_id": "NEX-04",
        "team_name": "AlgoRhythm",
        "college": "Geeta University",
        "members": ["Ananya Roy", "Karan Mehra"],
        "extra_data": {"project": "Automated Healthcare Triage", "track": "Healthcare"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T12:15:00Z"
    },
    {
        "id": "t-005",
        "team_id": "NEX-05",
        "team_name": "Code Catalyst",
        "college": "NSUT",
        "members": ["Meera Nair", "Devansh Sen"],
        "extra_data": {"project": "FinTech Fraud Shield", "track": "Fintech"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T12:20:00Z"
    },
    {
        "id": "t-006",
        "team_id": "NEX-06",
        "team_name": "NeuroBytes",
        "college": "Thapar University",
        "members": ["Simran Kaur", "Harsh Vardhan"],
        "extra_data": {"project": "Assistive Vision AI", "track": "Accessibility"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T12:25:00Z"
    },
    {
        "id": "t-007",
        "team_id": "NEX-07",
        "team_name": "Glitch Hunters",
        "college": "Chitkara University",
        "members": ["Arjun Kapoor", "Bhavna Joshi"],
        "extra_data": {"project": "AgriDrone Crop Scout", "track": "AgriTech"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T12:30:00Z"
    },
    {
        "id": "t-008",
        "team_id": "NEX-08",
        "team_name": "DevForge",
        "college": "Geeta University",
        "members": ["Rishi Prasad", "Tanvi Bhatia"],
        "extra_data": {"project": "Green Logistics Route Optimizer", "track": "CleanTech"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T12:35:00Z"
    },
    {
        "id": "t-009",
        "team_id": "NEX-09",
        "team_name": "ByteBenders",
        "college": "PEC Chandigarh",
        "members": ["Deepak Saini", "Ishita Grover"],
        "extra_data": {"project": "Campus Safety Guardian", "track": "EdTech"},
        "status": "eliminated",
        "current_round": 1,
        "created_at": "2026-11-17T12:40:00Z"
    },
    {
        "id": "t-010",
        "team_id": "NEX-10",
        "team_name": "Apex Legends",
        "college": "Kurukshetra University",
        "members": ["Naveen Hooda", "Poonam Rani"],
        "extra_data": {"project": "Clean Energy Microgrid", "track": "CleanTech"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T12:45:00Z"
    },
    {
        "id": "t-011",
        "team_id": "NEX-11",
        "team_name": "Neural Net Ninjas",
        "college": "BITS Pilani",
        "members": ["Rohan Sengupta", "Diya Banerjee"],
        "extra_data": {"project": "Sign Language Voice Synth", "track": "Accessibility"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T12:50:00Z"
    },
    {
        "id": "t-012",
        "team_id": "NEX-12",
        "team_name": "Cloud Crafters",
        "college": "Geeta University",
        "members": ["Manish Kumar", "Sakshi Malik"],
        "extra_data": {"project": "Autonomous Serverless Scaling", "track": "DevOps"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T12:55:00Z"
    },
    {
        "id": "t-013",
        "team_id": "NEX-13",
        "team_name": "ZeroKnowledge",
        "college": "IIIT Delhi",
        "members": ["Tarun Gill", "Komal Sethi"],
        "extra_data": {"project": "Private Medical Ledger", "track": "Web3"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:00:00Z"
    },
    {
        "id": "t-014",
        "team_id": "NEX-14",
        "team_name": "EcoPulse",
        "college": "Chitkara University",
        "members": ["Abhinav Bansal", "Rhea Jain"],
        "extra_data": {"project": "Smart EV Fleet Routing", "track": "CleanTech"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:05:00Z"
    },
    {
        "id": "t-015",
        "team_id": "NEX-15",
        "team_name": "HyperLoop Devs",
        "college": "Geeta University",
        "members": ["Gaurav Soni", "Anushka Tyagi"],
        "extra_data": {"project": "AI Traffic Signal Harmonizer", "track": "Smart Cities"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:10:00Z"
    },
    {
        "id": "t-016",
        "team_id": "NEX-16",
        "team_name": "Data Dragons",
        "college": "IIT Roorkee",
        "members": ["Siddharth Das", "Pragya Mishra"],
        "extra_data": {"project": "Subsurface Water Aquifer Radar", "track": "AgriTech"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:15:00Z"
    },
    {
        "id": "t-017",
        "team_id": "NEX-17",
        "team_name": "Pixel Pioneers",
        "college": "DTU",
        "members": ["Kunal Khanna", "Ritu Rawat"],
        "extra_data": {"project": "Real-Time Deepfake Sentinel", "track": "Cybersecurity"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:20:00Z"
    },
    {
        "id": "t-018",
        "team_id": "NEX-18",
        "team_name": "BioSensors X",
        "college": "Geeta University",
        "members": ["Sameer Khan", "Tanya Dutta"],
        "extra_data": {"project": "Non-Invasive Glucose Patch", "track": "Healthcare"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:25:00Z"
    },
    {
        "id": "t-019",
        "team_id": "NEX-19",
        "team_name": "BlockChamps",
        "college": "NSUT",
        "members": ["Varun Chawla", "Palak Gandhi"],
        "extra_data": {"project": "Carbon Credit Exchange", "track": "Web3"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:30:00Z"
    },
    {
        "id": "t-020",
        "team_id": "NEX-20",
        "team_name": "RoboRaptors",
        "college": "Thapar University",
        "members": ["Karanbir Dhillon", "Jasleen Sandhu"],
        "extra_data": {"project": "Warehouse Micro-Swarm", "track": "Robotics"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:35:00Z"
    },
    {
        "id": "t-021",
        "team_id": "NEX-21",
        "team_name": "Aegis Sentinel",
        "college": "PEC Chandigarh",
        "members": ["Nitesh Mittal", "Shreya Sood"],
        "extra_data": {"project": "Critical Infrastructure Honeypot", "track": "Cybersecurity"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:40:00Z"
    },
    {
        "id": "t-022",
        "team_id": "NEX-22",
        "team_name": "Zenith AI",
        "college": "Geeta University",
        "members": ["Akhil Bhardwaj", "Neha Chhabra"],
        "extra_data": {"project": "Mental Health Companion Bot", "track": "Healthcare"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:45:00Z"
    },
    {
        "id": "t-023",
        "team_id": "NEX-23",
        "team_name": "Solaris Minds",
        "college": "Kurukshetra University",
        "members": ["Ajay Ahlawat", "Jyoti Sharma"],
        "extra_data": {"project": "Solar Cell Thermal Dissipater", "track": "CleanTech"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:50:00Z"
    },
    {
        "id": "t-024",
        "team_id": "NEX-24",
        "team_name": "FinNova",
        "college": "IIT Delhi",
        "members": ["Udit Narayan", "Chhavi Agarwal"],
        "extra_data": {"project": "Micro-Lending Underwriting AI", "track": "Fintech"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T13:55:00Z"
    },
    {
        "id": "t-025",
        "team_id": "NEX-25",
        "team_name": "AquaRescue",
        "college": "Geeta University",
        "members": ["Vikas Yadav", "Suman Lata"],
        "extra_data": {"project": "Smart Flood Sensor Buoys", "track": "IoT"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T14:00:00Z"
    },
    {
        "id": "t-026",
        "team_id": "NEX-26",
        "team_name": "MetaMinds",
        "college": "Chitkara University",
        "members": ["Devanshu Garg", "Nikita Goyal"],
        "extra_data": {"project": "Haptic Surgical Training VR", "track": "Healthcare"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T14:05:00Z"
    },
    {
        "id": "t-027",
        "team_id": "NEX-27",
        "team_name": "Spectra Dynamics",
        "college": "DTU",
        "members": ["Aniket Saxena", "Suhani Taneja"],
        "extra_data": {"project": "Satellite Methane Plume Spotter", "track": "CleanTech"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T14:10:00Z"
    },
    {
        "id": "t-028",
        "team_id": "NEX-28",
        "team_name": "SecureMesh",
        "college": "Geeta University",
        "members": ["Pankaj Dhiman", "Deepika Kaushik"],
        "extra_data": {"project": "Peer-to-Peer Disaster Mesh", "track": "Cybersecurity"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T14:15:00Z"
    },
    {
        "id": "t-029",
        "team_id": "NEX-29",
        "team_name": "Veloce AI",
        "college": "BITS Pilani",
        "members": ["Rishabh Bajaj", "Manya Singhania"],
        "extra_data": {"project": "Autonomous Delivery Rover", "track": "Robotics"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T14:20:00Z"
    },
    {
        "id": "t-030",
        "team_id": "NEX-30",
        "team_name": "Genesis Labs",
        "college": "Geeta University",
        "members": ["Harshit Tanwar", "Simran Walia"],
        "extra_data": {"project": "Zero-Waste Supply Chain Tracker", "track": "CleanTech"},
        "status": "active",
        "current_round": 1,
        "created_at": "2026-11-17T14:25:00Z"
    }
]

# Pre-seed realistic venue rooms for demo teams
DEFAULT_VENUES = [
    "Room 101 - CS Lab", "Room 102 - IoT Lab", "Room 201 - AI & Robotics Lab",
    "Room 202 - Cloud Lab", "Room 301 - Data Science Lab", "Auditorium - Station 1",
    "Auditorium - Station 2", "Innovation Hub - Station 1", "Innovation Hub - Station 2"
]
for idx, t in enumerate(DEMO_TEAMS):
    v = DEFAULT_VENUES[idx % len(DEFAULT_VENUES)]
    t["venue"] = v
    if "extra_data" not in t or not isinstance(t["extra_data"], dict):
        t["extra_data"] = {}
    t["extra_data"]["venue"] = v

def get_supabase_client() -> Optional[Client]:
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY and "placeholder" not in settings.SUPABASE_URL:
        try:
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        except Exception:
            return None
    return None

class TeamCommitItem(BaseModel):
    team_id: str
    team_name: str
    college: Optional[str] = None
    members: Optional[List[str]] = Field(default_factory=list)
    passcode: Optional[str] = "NEX-7K9P"
    extra_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    current_round: Optional[int] = 1
    status: Optional[str] = "active"

class CommitPayload(BaseModel):
    teams: List[TeamCommitItem]
    actor_id: Optional[str] = None

class StatusUpdatePayload(BaseModel):
    status: str
    actor_id: Optional[str] = None


@router.post("/upload/preview")
async def preview_upload(file: UploadFile = File(...)):
    """
    Step 1: Parse CSV or Excel file, validate mandatory fields, 
    detect duplicates and errors, group extra columns into extra_data.
    SAVES NOTHING.
    """
    filename = file.filename or ""
    content = await file.read()
    
    rows_raw: List[Dict[str, str]] = []

    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        # Excel parsing
        try:
            workbook = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            sheet = workbook.active
            headers = []
            for col_idx, cell in enumerate(sheet.iter_rows(values_only=True)):
                if col_idx == 0:
                    headers = [str(h).strip() if h is not None else f"col_{i}" for i, h in enumerate(cell)]
                else:
                    if any(cell):
                        row_dict = {}
                        for i, h in enumerate(headers):
                            val = cell[i] if i < len(cell) else ""
                            row_dict[h] = str(val).strip() if val is not None else ""
                        rows_raw.append(row_dict)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {str(e)}")
    else:
        # CSV parsing
        try:
            text = content.decode("utf-8-sig", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                cleaned = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
                if any(cleaned.values()):
                    rows_raw.append(cleaned)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if not rows_raw:
        raise HTTPException(status_code=400, detail="The uploaded file contains no data rows.")

    # Standardize column mappings (case-insensitive)
    first_row = rows_raw[0]
    headers_original = list(first_row.keys())

    def find_key(candidates: List[str]) -> Optional[str]:
        for k in headers_original:
            clean = k.lower().replace("_", "").replace(" ", "").replace("-", "")
            for c in candidates:
                if clean == c.lower().replace("_", "").replace(" ", ""):
                    return k
        return None

    k_team_id = find_key(["teamid", "team_id", "teamno", "id", "code"])
    k_team_name = find_key(["teamname", "team_name", "name"])
    k_college = find_key(["college", "university", "institution", "institute", "school"])
    k_members = find_key(["members", "team_members", "teammates", "students", "participants"])
    k_passcode = find_key(["passcode", "password", "pin", "teampasscode"])

    # Collect existing team IDs to check against database/demo
    existing_team_ids = set()
    sb = get_supabase_client()
    if sb:
        try:
            res = sb.table("teams").select("team_id").execute()
            existing_team_ids = {r["team_id"] for r in (res.data or [])}
        except Exception:
            existing_team_ids = {t["team_id"] for t in DEMO_TEAMS}
    else:
        existing_team_ids = {t["team_id"] for t in DEMO_TEAMS}

    seen_ids_in_file = set()
    valid_rows = []
    error_rows = []

    for idx, row in enumerate(rows_raw, start=2): # 1-based header is line 1
        errors = []
        
        # 1. Team ID validation
        raw_id = row.get(k_team_id, "").strip() if k_team_id else ""
        if not raw_id:
            errors.append("Missing required team_id")
        elif raw_id in seen_ids_in_file:
            errors.append(f"Duplicate team_id in file: '{raw_id}'")
        else:
            seen_ids_in_file.add(raw_id)

        # 2. Team Name validation
        raw_name = row.get(k_team_name, "").strip() if k_team_name else ""
        if not raw_name:
            errors.append("Missing required team_name")

        # 3. College
        raw_college = row.get(k_college, "").strip() if k_college else ""

        # 4. Members parsing
        raw_members = row.get(k_members, "").strip() if k_members else ""
        members_list = []
        if raw_members:
            if raw_members.startswith("[") and raw_members.endswith("]"):
                try:
                    members_list = json.loads(raw_members)
                except Exception:
                    members_list = [m.strip() for m in raw_members.strip("[]").split(",") if m.strip()]
            else:
                members_list = [m.strip() for m in raw_members.replace(";", ",").split(",") if m.strip()]

        # 5. Passcode (optional in CSV, defaults to standard NEX-7K9P)
        raw_passcode = row.get(k_passcode, "").strip() if k_passcode else ""
        if not raw_passcode:
            raw_passcode = "NEX-7K9P"

        # 6. Extra data collection: any column not mapped above
        standard_keys = {k for k in [k_team_id, k_team_name, k_college, k_members, k_passcode] if k}
        extra_data = {}
        for k, v in row.items():
            if k not in standard_keys and v:
                extra_data[k] = v

        row_payload = {
            "row_number": idx,
            "team_id": raw_id,
            "team_name": raw_name,
            "college": raw_college,
            "members": members_list,
            "passcode": raw_passcode,
            "extra_data": extra_data,
            "already_exists": raw_id in existing_team_ids,
            "status": "active",
            "current_round": 1
        }

        if errors:
            error_rows.append({
                **row_payload,
                "errors": errors
            })
        else:
            valid_rows.append(row_payload)

    return {
        "status": "preview_ready",
        "total_rows": len(rows_raw),
        "valid_count": len(valid_rows),
        "error_count": len(error_rows),
        "headers": headers_original,
        "valid_rows": valid_rows,
        "error_rows": error_rows,
        "message": f"Parsed {len(rows_raw)} rows: {len(valid_rows)} valid, {len(error_rows)} errors."
    }


@router.post("/upload/commit")
async def commit_upload(payload: CommitPayload):
    """
    Step 2: Bulk commit verified teams into database.
    Appends an immutable record into audit_log.
    """
    if not payload.teams:
        raise HTTPException(status_code=400, detail="No valid teams provided to commit.")

    sb = get_supabase_client()
    committed_count = 0

    records = [
        {
            "team_id": t.team_id,
            "team_name": t.team_name,
            "college": t.college,
            "members": t.members or [],
            "passcode": t.passcode or "NEX-7K9P",
            "extra_data": t.extra_data or {},
            "status": t.status or "active",
            "current_round": t.current_round or 1
        }
        for t in payload.teams
    ]

    if sb:
        try:
            # Upsert into Supabase teams table
            res = sb.table("teams").upsert(records, on_conflict="team_id").execute()
            committed_count = len(res.data) if res.data else len(records)

            # Non-negotiable Rule 4: Append to audit_log
            sb.table("audit_log").insert({
                "actor_id": payload.actor_id,
                "action": "TEAMS_BULK_IMPORT",
                "entity_type": "TEAMS",
                "entity_id": "BATCH",
                "details": {
                    "count": committed_count,
                    "team_ids": [t.team_id for t in payload.teams]
                }
            }).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database commit error: {str(e)}")
    else:
        # Update in-memory DEMO_TEAMS
        for r in records:
            existing = next((t for t in DEMO_TEAMS if t["team_id"] == r["team_id"]), None)
            if existing:
                existing.update(r)
            else:
                DEMO_TEAMS.append({
                    "id": f"t-{len(DEMO_TEAMS)+1:03d}",
                    **r,
                    "created_at": "2026-11-17T15:00:00Z"
                })
        committed_count = len(records)

    return {
        "status": "success",
        "committed_count": committed_count,
        "message": f"Successfully imported and committed {committed_count} teams into the system."
    }


@router.get("")
async def list_teams(
    search: Optional[str] = None,
    status: Optional[str] = Query("all", pattern="^(all|active|eliminated)$"),
    round: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):

    """
    List teams with search, filter by status and current round, and pagination.
    """
    sb = get_supabase_client()
    if sb:
        try:
            query = sb.table("teams").select("*", count="exact")
            if status and status != "all":
                query = query.eq("status", status)
            if round:
                query = query.eq("current_round", round)
            if search:
                # ilike search across team_id, team_name, college
                query = query.or_(f"team_id.ilike.%{search}%,team_name.ilike.%{search}%,college.ilike.%{search}%")

            offset = (page - 1) * page_size
            query = query.order("team_id").range(offset, offset + page_size - 1)
            res = query.execute()

            total = res.count if res.count is not None else len(res.data or [])
            total_pages = (total + page_size - 1) // page_size if total > 0 else 1

            return {
                "teams": res.data or [],
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
        except Exception:
            pass

    # In-memory demo fallback
    filtered = list(DEMO_TEAMS)

    if status and status != "all":
        filtered = [t for t in filtered if t.get("status") == status]
    if round:
        filtered = [t for t in filtered if t.get("current_round") == round]
    if search:
        s = search.lower()
        filtered = [
            t for t in filtered
            if s in t.get("team_id", "").lower()
            or s in t.get("team_name", "").lower()
            or s in (t.get("college") or "").lower()
        ]

    total = len(filtered)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    start = (page - 1) * page_size
    end = start + page_size
    sliced = filtered[start:end]

    return {
        "teams": sliced,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.patch("/{team_id}/status")
async def update_team_status(team_id: str, payload: StatusUpdatePayload):
    """
    Update team status (active / eliminated).
    """
    if payload.status not in ("active", "eliminated"):
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'eliminated'")

    sb = get_supabase_client()
    if sb:
        try:
            sb.table("teams").update({"status": payload.status}).eq("team_id", team_id).execute()
            try:
                import uuid
                valid_actor = str(uuid.UUID(str(payload.actor_id))) if payload.actor_id else None
                sb.table("audit_log").insert({
                    "actor_id": valid_actor,
                    "action": "TEAM_STATUS_UPDATE",
                    "entity_type": "TEAM",
                    "entity_id": team_id,
                    "details": {"new_status": payload.status}
                }).execute()
            except Exception as e:
                print(f"Audit log warning: {e}")
        except Exception as e:
            print(f"Supabase team update warning: {e}")

    for t in DEMO_TEAMS:
        if t["team_id"] == team_id:
            t["status"] = payload.status
            break

    return {"status": "success", "team_id": team_id, "new_status": payload.status}
