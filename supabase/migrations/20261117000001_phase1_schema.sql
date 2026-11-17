-- ====================================================================
-- PHASE 1: TEAMS, ROUNDS, AND RUBRIC CRITERIA SCHEMA + RLS
-- ====================================================================

-- 1. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL UNIQUE,
    team_name TEXT NOT NULL,
    college TEXT,
    members JSONB NOT NULL DEFAULT '[]'::jsonb,
    extra_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('active', 'eliminated')) DEFAULT 'active',
    current_round INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_teams_team_id ON public.teams(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_current_round ON public.teams(current_round);
CREATE INDEX IF NOT EXISTS idx_teams_college ON public.teams(college);

CREATE OR REPLACE TRIGGER set_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 2. ROUNDS TABLE
CREATE TABLE IF NOT EXISTS public.rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('remarks', 'scoring')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'live', 'closed')) DEFAULT 'draft',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    promote_count INTEGER NOT NULL DEFAULT 20,
    judges_per_team INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rounds_number ON public.rounds(number);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON public.rounds(status);

CREATE OR REPLACE TRIGGER set_rounds_updated_at
    BEFORE UPDATE ON public.rounds
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. RUBRIC CRITERIA TABLE
CREATE TABLE IF NOT EXISTS public.rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    max_marks NUMERIC(5, 2) NOT NULL CHECK (max_marks > 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rubric_round_id ON public.rubric_criteria(round_id);
CREATE INDEX IF NOT EXISTS idx_rubric_sort_order ON public.rubric_criteria(round_id, sort_order);

CREATE OR REPLACE TRIGGER set_rubric_criteria_updated_at
    BEFORE UPDATE ON public.rubric_criteria
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;

-- TEAMS RLS:
-- Admins have full access
CREATE POLICY "Admins full access to teams"
    ON public.teams
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Judges/Mentors can read active teams
CREATE POLICY "Judges can read teams"
    ON public.teams
    FOR SELECT
    TO authenticated
    USING (true);

-- ROUNDS RLS:
-- Admins have full access
CREATE POLICY "Admins full access to rounds"
    ON public.rounds
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Authenticated judges/mentors can view rounds
CREATE POLICY "Authenticated users view rounds"
    ON public.rounds
    FOR SELECT
    TO authenticated
    USING (true);

-- RUBRIC CRITERIA RLS:
-- Admins have full access
CREATE POLICY "Admins full access to rubric"
    ON public.rubric_criteria
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Authenticated judges/mentors can view rubric criteria
CREATE POLICY "Authenticated users view rubric"
    ON public.rubric_criteria
    FOR SELECT
    TO authenticated
    USING (true);

-- ====================================================================
-- 5. SEED DEFAULT ROUNDS & DEFAULT RUBRIC (Stored in DB, NOT hardcoded)
-- ====================================================================
DO $$
DECLARE
    r1_id UUID := '11111111-0000-0000-0000-000000000001';
    r2_id UUID := '22222222-0000-0000-0000-000000000002';
    r3_id UUID := '33333333-0000-0000-0000-000000000003';
BEGIN
    -- Seed default rounds
    INSERT INTO public.rounds (id, number, name, type, status, promote_count, judges_per_team, start_time)
    VALUES
    (r1_id, 1, 'Round 1: Guidance Phase', 'remarks', 'live', 150, 3, timezone('utc'::text, now())),
    (r2_id, 2, 'Round 2: Evaluation & Scoring', 'scoring', 'draft', 20, 3, NULL),
    (r3_id, 3, 'Round 3: Grand Finale Pitch', 'scoring', 'draft', 3, 5, NULL)
    ON CONFLICT (number) DO UPDATE
    SET name = EXCLUDED.name,
        type = EXCLUDED.type,
        promote_count = EXCLUDED.promote_count,
        judges_per_team = EXCLUDED.judges_per_team;

    -- Seed Default Rubric for Round 2 (Total = 100)
    -- Innovation & Creativity 25, Technical Execution 30, Impact & Relevance 15, Scalability 15, Presentation & Demonstration 15
    DELETE FROM public.rubric_criteria WHERE round_id IN (r2_id, r3_id);

    INSERT INTO public.rubric_criteria (round_id, name, max_marks, sort_order)
    VALUES
    (r2_id, 'Technical Execution', 30, 1),
    (r2_id, 'Innovation & Creativity', 25, 2),
    (r2_id, 'Impact & Relevance', 15, 3),
    (r2_id, 'Scalability', 15, 4),
    (r2_id, 'Presentation & Demonstration', 15, 5);

    -- Seed Default Rubric for Round 3 (Total = 100)
    INSERT INTO public.rubric_criteria (round_id, name, max_marks, sort_order)
    VALUES
    (r3_id, 'Technical Execution', 30, 1),
    (r3_id, 'Innovation & Creativity', 25, 2),
    (r3_id, 'Impact & Relevance', 15, 3),
    (r3_id, 'Scalability', 15, 4),
    (r3_id, 'Presentation & Demonstration', 15, 5);

    -- Seed Sample Demo Teams for Instant Testing
    INSERT INTO public.teams (team_id, team_name, college, members, status, current_round, extra_data)
    VALUES
    ('NEX-01', 'Quantum Coders', 'Geeta University', '["Aarav Sharma", "Pooja Patel", "Rohan Gupta"]'::jsonb, 'active', 1, '{"project":"AI Disaster Response","track":"AI & ML"}'::jsonb),
    ('NEX-02', 'Binary Beasts', 'IIT Delhi', '["Vikram Malhotra", "Sneha Rao"]'::jsonb, 'active', 1, '{"project":"Decentralized Identity","track":"Web3"}'::jsonb),
    ('NEX-03', 'Cyber Hawks', 'DTU', '["Kabir Singh", "Neha Verma", "Aditya Joshi"]'::jsonb, 'active', 1, '{"project":"Smart Grid Monitor","track":"IoT"}'::jsonb),
    ('NEX-04', 'AlgoRhythm', 'Geeta University', '["Ananya Roy", "Karan Mehra"]'::jsonb, 'active', 1, '{"project":"Automated Healthcare Triage","track":"Healthcare"}'::jsonb),
    ('NEX-05', 'Code Catalyst', 'NSUT', '["Meera Nair", "Devansh Sen"]'::jsonb, 'active', 1, '{"project":"FinTech Fraud Shield","track":"Fintech"}'::jsonb),
    ('NEX-06', 'NeuroBytes', 'Thapar University', '["Simran Kaur", "Harsh Vardhan"]'::jsonb, 'active', 1, '{"project":"Assistive Vision AI","track":"Accessibility"}'::jsonb),
    ('NEX-07', 'Glitch Hunters', 'Chitkara University', '["Arjun Kapoor", "Bhavna Joshi"]'::jsonb, 'active', 1, '{"project":"AgriDrone Crop Scout","track":"AgriTech"}'::jsonb),
    ('NEX-08', 'DevForge', 'Geeta University', '["Rishi Prasad", "Tanvi Bhatia"]'::jsonb, 'active', 1, '{"project":"Green Logistics Route Optimizer","track":"CleanTech"}'::jsonb),
    ('NEX-09', 'ByteBenders', 'PEC Chandigarh', '["Deepak Saini", "Ishita Grover"]'::jsonb, 'active', 1, '{"project":"Campus Safety Guardian","track":"EdTech"}'::jsonb),
    ('NEX-10', 'Apex Legends', 'Kurukshetra University', '["Naveen Hooda", "Poonam Rani"]'::jsonb, 'active', 1, '{"project":"Clean Energy Microgrid","track":"CleanTech"}'::jsonb)
    ON CONFLICT (team_id) DO NOTHING;

END $$;
