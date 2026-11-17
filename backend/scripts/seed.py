"""
Seed script for NexHack Judging Portal (Phase 0)
Creates 1 admin and 3 judges.
Can run via Supabase admin API if credentials are provided in .env,
or output SQL.
"""
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

SEED_USERS = [
    {
        "email": "admin@nexhack.com",
        "password": "password123",
        "name": "Chief Admin",
        "role": "admin"
    },
    {
        "email": "judge1@nexhack.com",
        "password": "password123",
        "name": "Dr. Sarah Verma",
        "role": "judge"
    },
    {
        "email": "judge2@nexhack.com",
        "password": "password123",
        "name": "Prof. Rajesh Kumar",
        "role": "judge"
    },
    {
        "email": "judge3@nexhack.com",
        "password": "password123",
        "name": "Ananya Sharma (Tech Lead)",
        "role": "judge"
    }
]

def seed():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Note: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not configured in backend/.env.")
        print("To seed directly into Postgres, run the migration and seed SQL in `supabase/seed.sql`.")
        return

    print(f"Connecting to Supabase at {SUPABASE_URL}...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    for user_info in SEED_USERS:
        email = user_info["email"]
        password = user_info["password"]
        name = user_info["name"]
        role = user_info["role"]
        
        try:
            # Check or create user via admin auth api
            res = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "name": name,
                    "role": role
                }
            })
            user_id = res.user.id
            print(f"Created auth user: {email} ({user_id})")
        except Exception as e:
            print(f"Notice for {email}: {e}")
            # Try to fetch existing user
            users = supabase.auth.admin.list_users()
            user_id = None
            for u in users:
                if u.email == email:
                    user_id = u.id
                    break
        
        if user_id:
            # Upsert into public.profiles
            supabase.table("profiles").upsert({
                "id": user_id,
                "name": name,
                "email": email,
                "role": role
            }).execute()
            print(f"Upserted profile: {name} as {role}")

    print("Phase 0 seeding complete!")

if __name__ == "__main__":
    seed()
