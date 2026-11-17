# NexHack Judging Portal (NexHack 2.0)

A fast, reliable web portal for judging ~150 teams with 5-6 judges across 3 rounds during NexHack 2.0, Geeta University's 24-hour hackathon.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + React Router + TanStack Query
- **Backend**: Python FastAPI (CSV parsing/validation, assignment, promote, exports)
- **Database / Auth / Realtime**: Supabase (PostgreSQL, Row Level Security, Triggers)
- **Design System**: Clean, minimal plain white admin UI (`#F4F5F9` background, `#0F172A` primary, 16px radius cards, soft pastel status badges)

---

## Project Structure

```
NexVal/
├── frontend/             # React + Vite + Tailwind CSS UI
│   ├── public/           # Static assets & University/Hackathon logos
│   ├── src/
│   │   ├── components/   # Design system tokens & reusable UI components
│   │   │   ├── ui/       # Button, Card, Badge, PillTabs, Table, Modal, Toast, EmptyState, PageHeader
│   │   │   └── Navbar.tsx
│   │   ├── context/      # AuthContext & ToastContext
│   │   ├── lib/          # Supabase client & helpers
│   │   ├── pages/        # Login, Admin Dashboard, Judge Dashboard
│   │   └── App.tsx
│   └── tailwind.config.js
├── backend/              # Python FastAPI service
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Settings & configurations
│   │   └── main.py       # FastAPI application entry point
│   ├── scripts/          # Database seeding scripts
│   └── requirements.txt
├── supabase/
│   ├── migrations/       # SQL migrations with append-only triggers & RLS
│   └── seed.sql          # Seed script for 1 Admin and 3 Judges
├── .env.example          # Root environment template
└── README.md             # Setup and developer guide
```

---

## Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- Python (3.9+)
- Supabase Project or local Supabase CLI

### 2. Configure Environment Variables
Copy `.env.example` in both `frontend` and `backend`:

```bash
# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp backend/.env.example backend/.env
```

Populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with your Supabase credentials.

### 3. Database Setup (Supabase)
Run the migration file in your Supabase SQL editor or CLI:
1. `supabase/migrations/20261117000000_init_phase0.sql` (Creates `profiles`, `audit_log`, append-only triggers, and RLS policies)
2. `supabase/seed.sql` (Seeds 1 admin and 3 judges)

**Default Seed Credentials:**
- **Admin**: `admin@nexhack.com` / `password123`
- **Judge 1**: `judge1@nexhack.com` / `password123`
- **Judge 2**: `judge2@nexhack.com` / `password123`
- **Judge 3**: `judge3@nexhack.com` / `password123`

### 4. Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will start at `http://localhost:5173`.

### 5. Running the Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
The backend API docs will be accessible at `http://localhost:8000/api/v1/docs`.
