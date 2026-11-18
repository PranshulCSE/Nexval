-- ====================================================================
-- NEXHACK JUDGING PORTAL — ALL-IN-ONE SUPABASE SETUP
-- Includes Phase 0, Phase 1, Phase 2 (Schema, Triggers, RLS & Seed Data)
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ====================================================================

-- Enable cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. BASE TABLES: PROFILES & AUDIT LOG
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'judge', 'mentor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Security Definer Role Helpers (prevents infinite recursion in RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
    );
$$;

-- Strictly Append-Only Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Non-negotiable Rule 4: Append-Only Audit Enforcement
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are strictly append-only. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER enforce_append_only_audit_log
    BEFORE UPDATE OR DELETE ON public.audit_log
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- ====================================================================
-- 2. CORE HACKATHON TABLES: TEAMS, ROUNDS, RUBRIC CRITERIA
-- ====================================================================
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

CREATE OR REPLACE TRIGGER set_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

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

CREATE OR REPLACE TRIGGER set_rubric_criteria_updated_at
    BEFORE UPDATE ON public.rubric_criteria
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 3. ASSIGNMENTS & EVALUATIONS TABLES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    judge_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_round_judge_team UNIQUE (round_id, judge_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_judge ON public.assignments(judge_id);
CREATE INDEX IF NOT EXISTS idx_assignments_round ON public.assignments(round_id);
CREATE INDEX IF NOT EXISTS idx_assignments_team ON public.assignments(team_id);

CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    judge_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    total NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    remarks TEXT NOT NULL DEFAULT '',
    locked BOOLEAN NOT NULL DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_eval_round_judge_team UNIQUE (round_id, judge_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluations_judge ON public.evaluations(judge_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_round ON public.evaluations(round_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_team ON public.evaluations(team_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_locked ON public.evaluations(locked);

-- ====================================================================
-- 4. STRICT DATABASE VALIDATION & TOTAL COMPUTATION TRIGGER
-- ====================================================================
CREATE OR REPLACE FUNCTION public.process_and_validate_evaluation()
RETURNS TRIGGER AS $$
DECLARE
    v_round_status TEXT;
    v_round_type TEXT;
    v_user_role TEXT;
    v_computed_total NUMERIC(6, 2) := 0.00;

    v_criterion RECORD;
    v_criterion_score NUMERIC(6, 2);
    v_score_raw TEXT;
BEGIN
    SELECT status, type INTO v_round_status, v_round_type 
    FROM public.rounds 
    WHERE id = NEW.round_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referenced round does not exist.';
    END IF;

    -- Check user role
    SELECT role INTO v_user_role FROM public.profiles WHERE id = NEW.judge_id;

    -- Non-negotiable Rule 5: Mentors can only evaluate in remarks-only rounds
    IF v_user_role = 'mentor' AND v_round_type != 'remarks' THEN
        RAISE EXCEPTION 'Mentors are only permitted to evaluate in guidance/remarks rounds. Scoring rounds are reserved for official judges.';
    END IF;


    -- Rule 1: A judge can write an evaluation only if round is live
    IF v_round_status != 'live' AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Evaluations can only be modified while the round is live. Current round status is "%".', v_round_status;
    END IF;

    -- Rule 2: A judge can write an evaluation only if assigned to that team
    IF NOT EXISTS (
        SELECT 1 FROM public.assignments 
        WHERE round_id = NEW.round_id AND judge_id = NEW.judge_id AND team_id = NEW.team_id
    ) AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Judge is not assigned to team "%" in this round.', NEW.team_id;
    END IF;

    -- Rule 3: Locked check. Once locked, only admin can unlock
    IF TG_OP = 'UPDATE' THEN
        IF OLD.locked = true THEN
            IF NEW.locked = true THEN
                RAISE EXCEPTION 'This evaluation is locked and cannot be modified.';
            END IF;
            IF NOT public.is_admin(auth.uid()) THEN
                RAISE EXCEPTION 'Only administrators can unlock an evaluation.';
            END IF;
        END IF;
        NEW.version := COALESCE(OLD.version, 1) + 1;
    END IF;

    -- Rule 4: Compute Total from rubric and validate 0 <= score <= max_marks
    IF v_round_type = 'remarks' THEN
        NEW.total := 0.00;
        NEW.scores := '{}'::jsonb;
    ELSE
        FOR v_criterion IN 
            SELECT id, name, max_marks 
            FROM public.rubric_criteria 
            WHERE round_id = NEW.round_id
        LOOP
            v_score_raw := COALESCE(
                NEW.scores->>v_criterion.id::text, 
                NEW.scores->>v_criterion.name
            );

            IF v_score_raw IS NOT NULL AND v_score_raw != '' THEN
                v_criterion_score := v_score_raw::NUMERIC;
                IF v_criterion_score < 0 THEN
                    RAISE EXCEPTION 'Score for criterion "%" cannot be negative.', v_criterion.name;
                END IF;
                IF v_criterion_score > v_criterion.max_marks THEN
                    RAISE EXCEPTION 'Score % for criterion "%" exceeds maximum allowed marks of %.', 
                        v_criterion_score, v_criterion.name, v_criterion.max_marks;
                END IF;
                v_computed_total := v_computed_total + v_criterion_score;
            END IF;
        END LOOP;

        NEW.total := v_computed_total;
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_validate_evaluation
    BEFORE INSERT OR UPDATE ON public.evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.process_and_validate_evaluation();

-- Audit log trigger on evaluation lifecycle
CREATE OR REPLACE FUNCTION public.audit_evaluation_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := CASE WHEN NEW.locked THEN 'EVALUATION_SUBMITTED_AND_LOCKED' ELSE 'EVALUATION_DRAFT_CREATED' END;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.locked = false AND NEW.locked = true THEN
            v_action := 'EVALUATION_LOCKED';
        ELSIF OLD.locked = true AND NEW.locked = false THEN
            v_action := 'EVALUATION_UNLOCKED';
        ELSE
            v_action := 'EVALUATION_DRAFT_UPDATED';
        END IF;
    END IF;

    INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, details)
    VALUES (
        auth.uid(),
        v_action,
        'EVALUATION',
        NEW.id::text,
        jsonb_build_object(
            'round_id', NEW.round_id,
            'judge_id', NEW.judge_id,
            'team_id', NEW.team_id,
            'total', NEW.total,
            'locked', NEW.locked,
            'version', NEW.version
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_audit_evaluation
    AFTER INSERT OR UPDATE ON public.evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_evaluation_changes();

-- ====================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile or admins read all" ON public.profiles;
CREATE POLICY "Users can read own profile or admins read all"
    ON public.profiles FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles, users can update own name" ON public.profiles;
CREATE POLICY "Admins can update all profiles, users can update own name"
    ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()) OR (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())));

-- Audit Log Policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_log FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_log;
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_log FOR INSERT TO authenticated
    WITH CHECK (actor_id IS NULL OR actor_id = auth.uid());

-- Teams Policies
DROP POLICY IF EXISTS "Admins full access to teams" ON public.teams;
CREATE POLICY "Admins full access to teams"
    ON public.teams FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Judges can read teams" ON public.teams;
CREATE POLICY "Judges can read teams"
    ON public.teams FOR SELECT TO authenticated
    USING (true);

-- Rounds Policies
DROP POLICY IF EXISTS "Admins full access to rounds" ON public.rounds;
CREATE POLICY "Admins full access to rounds"
    ON public.rounds FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users view rounds" ON public.rounds;
CREATE POLICY "Authenticated users view rounds"
    ON public.rounds FOR SELECT TO authenticated
    USING (true);

-- Rubric Policies
DROP POLICY IF EXISTS "Admins full access to rubric" ON public.rubric_criteria;
CREATE POLICY "Admins full access to rubric"
    ON public.rubric_criteria FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users view rubric" ON public.rubric_criteria;
CREATE POLICY "Authenticated users view rubric"
    ON public.rubric_criteria FOR SELECT TO authenticated
    USING (true);

-- Assignments Policies (Rule 2: Judges only see own assigned teams)
DROP POLICY IF EXISTS "Admins full access to assignments" ON public.assignments;
CREATE POLICY "Admins full access to assignments"
    ON public.assignments FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Judges read own assignments" ON public.assignments;
CREATE POLICY "Judges read own assignments"
    ON public.assignments FOR SELECT TO authenticated
    USING (judge_id = auth.uid());

-- Evaluations Policies
DROP POLICY IF EXISTS "Admins full access to evaluations" ON public.evaluations;
CREATE POLICY "Admins full access to evaluations"
    ON public.evaluations FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Judges read own evaluations" ON public.evaluations;
CREATE POLICY "Judges read own evaluations"
    ON public.evaluations FOR SELECT TO authenticated
    USING (judge_id = auth.uid());

DROP POLICY IF EXISTS "Judges insert own evaluations" ON public.evaluations;
CREATE POLICY "Judges insert own evaluations"
    ON public.evaluations FOR INSERT TO authenticated
    WITH CHECK (judge_id = auth.uid());

DROP POLICY IF EXISTS "Judges update own unlocked evaluations" ON public.evaluations;
CREATE POLICY "Judges update own unlocked evaluations"
    ON public.evaluations FOR UPDATE TO authenticated
    USING (judge_id = auth.uid())
    WITH CHECK (judge_id = auth.uid());

-- ====================================================================
-- 6. SEED DATA (ROUNDS, RUBRICS, 30 TEAMS, ADMIN & JUDGES)
-- ====================================================================
DO $$
DECLARE
    admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
    judge1_id UUID := 'b0000000-0000-0000-0000-000000000001';
    judge2_id UUID := 'b0000000-0000-0000-0000-000000000002';
    judge3_id UUID := 'b0000000-0000-0000-0000-000000000003';
    encrypted_pw TEXT := crypt('password123', gen_salt('bf'));

    r1_id UUID := '11111111-0000-0000-0000-000000000001';
    r2_id UUID := '22222222-0000-0000-0000-000000000002';
    r3_id UUID := '33333333-0000-0000-0000-000000000003';
BEGIN
    -- 1. Auth Users
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
    (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@nexhack.com', encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"name":"Chief Admin", "role":"admin"}', now(), now()),
    (judge1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'judge1@nexhack.com', encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Sarah Verma", "role":"judge"}', now(), now()),
    (judge2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'judge2@nexhack.com', encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"name":"Prof. Rajesh Kumar", "role":"judge"}', now(), now()),
    (judge3_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'judge3@nexhack.com', encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"name":"Ananya Sharma (Tech Lead)", "role":"judge"}', now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- 2. Profiles
    INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
    VALUES
    (admin_id, 'Chief Admin', 'admin@nexhack.com', 'admin', now(), now()),
    (judge1_id, 'Dr. Sarah Verma', 'judge1@nexhack.com', 'judge', now(), now()),
    (judge2_id, 'Prof. Rajesh Kumar', 'judge2@nexhack.com', 'judge', now(), now()),
    (judge3_id, 'Ananya Sharma (Tech Lead)', 'judge3@nexhack.com', 'judge', now(), now())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- 3. Rounds
    INSERT INTO public.rounds (id, number, name, type, status, promote_count, judges_per_team, start_time)
    VALUES
    (r1_id, 1, 'Round 1: Guidance Phase', 'remarks', 'live', 150, 3, timezone('utc'::text, now())),
    (r2_id, 2, 'Round 2: Evaluation & Scoring', 'scoring', 'draft', 20, 3, NULL),
    (r3_id, 3, 'Round 3: Grand Finale Pitch', 'scoring', 'draft', 3, 5, NULL)
    ON CONFLICT (number) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type;

    -- 4. Rubrics (Default 100 marks)
    DELETE FROM public.rubric_criteria WHERE round_id IN (r2_id, r3_id);
    INSERT INTO public.rubric_criteria (round_id, name, max_marks, sort_order)
    VALUES
    (r2_id, 'Technical Execution', 30, 1),
    (r2_id, 'Innovation & Creativity', 25, 2),
    (r2_id, 'Impact & Relevance', 15, 3),
    (r2_id, 'Scalability', 15, 4),
    (r2_id, 'Presentation & Demonstration', 15, 5),
    (r3_id, 'Technical Execution', 30, 1),
    (r3_id, 'Innovation & Creativity', 25, 2),
    (r3_id, 'Impact & Relevance', 15, 3),
    (r3_id, 'Scalability', 15, 4),
    (r3_id, 'Presentation & Demonstration', 15, 5);

    -- 5. Seed Initial Audit Record
    INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, details)
    VALUES (admin_id, 'SYSTEM_INIT', 'SYSTEM', 'COMPLETE_SETUP', '{"status":"ready","version":"phase_2"}'::jsonb);

END $$;

-- 6. Seed 30 Demo Teams
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
('NEX-10', 'Apex Legends', 'Kurukshetra University', '["Naveen Hooda", "Poonam Rani"]'::jsonb, 'active', 1, '{"project":"Clean Energy Microgrid","track":"CleanTech"}'::jsonb),
('NEX-11', 'Neural Net Ninjas', 'BITS Pilani', '["Rohan Sengupta", "Diya Banerjee"]'::jsonb, 'active', 1, '{"project":"Sign Language Voice Synth","track":"Accessibility"}'::jsonb),
('NEX-12', 'Cloud Crafters', 'Geeta University', '["Manish Kumar", "Sakshi Malik"]'::jsonb, 'active', 1, '{"project":"Autonomous Serverless Scaling","track":"DevOps"}'::jsonb),
('NEX-13', 'ZeroKnowledge', 'IIIT Delhi', '["Tarun Gill", "Komal Sethi"]'::jsonb, 'active', 1, '{"project":"Private Medical Ledger","track":"Web3"}'::jsonb),
('NEX-14', 'EcoPulse', 'Chitkara University', '["Abhinav Bansal", "Rhea Jain"]'::jsonb, 'active', 1, '{"project":"Smart EV Fleet Routing","track":"CleanTech"}'::jsonb),
('NEX-15', 'HyperLoop Devs', 'Geeta University', '["Gaurav Soni", "Anushka Tyagi"]'::jsonb, 'active', 1, '{"project":"AI Traffic Signal Harmonizer","track":"Smart Cities"}'::jsonb),
('NEX-16', 'Data Dragons', 'IIT Roorkee', '["Siddharth Das", "Pragya Mishra"]'::jsonb, 'active', 1, '{"project":"Subsurface Water Aquifer Radar","track":"AgriTech"}'::jsonb),
('NEX-17', 'Pixel Pioneers', 'DTU', '["Kunal Khanna", "Ritu Rawat"]'::jsonb, 'active', 1, '{"project":"Real-Time Deepfake Sentinel","track":"Cybersecurity"}'::jsonb),
('NEX-18', 'BioSensors X', 'Geeta University', '["Sameer Khan", "Tanya Dutta"]'::jsonb, 'active', 1, '{"project":"Non-Invasive Glucose Patch","track":"Healthcare"}'::jsonb),
('NEX-19', 'BlockChamps', 'NSUT', '["Varun Chawla", "Palak Gandhi"]'::jsonb, 'active', 1, '{"project":"Carbon Credit Exchange","track":"Web3"}'::jsonb),
('NEX-20', 'RoboRaptors', 'Thapar University', '["Karanbir Dhillon", "Jasleen Sandhu"]'::jsonb, 'active', 1, '{"project":"Warehouse Micro-Swarm","track":"Robotics"}'::jsonb),
('NEX-21', 'Aegis Sentinel', 'PEC Chandigarh', '["Nitesh Mittal", "Shreya Sood"]'::jsonb, 'active', 1, '{"project":"Critical Infrastructure Honeypot","track":"Cybersecurity"}'::jsonb),
('NEX-22', 'Zenith AI', 'Geeta University', '["Akhil Bhardwaj", "Neha Chhabra"]'::jsonb, 'active', 1, '{"project":"Mental Health Companion Bot","track":"Healthcare"}'::jsonb),
('NEX-23', 'Solaris Minds', 'Kurukshetra University', '["Ajay Ahlawat", "Jyoti Sharma"]'::jsonb, 'active', 1, '{"project":"Solar Cell Thermal Dissipater","track":"CleanTech"}'::jsonb),
('NEX-24', 'FinNova', 'IIT Delhi', '["Udit Narayan", "Chhavi Agarwal"]'::jsonb, 'active', 1, '{"project":"Micro-Lending Underwriting AI","track":"Fintech"}'::jsonb),
('NEX-25', 'AquaRescue', 'Geeta University', '["Vikas Yadav", "Suman Lata"]'::jsonb, 'active', 1, '{"project":"Smart Flood Sensor Buoys","track":"IoT"}'::jsonb),
('NEX-26', 'MetaMinds', 'Chitkara University', '["Devanshu Garg", "Nikita Goyal"]'::jsonb, 'active', 1, '{"project":"Haptic Surgical Training VR","track":"Healthcare"}'::jsonb),
('NEX-27', 'Spectra Dynamics', 'DTU', '["Aniket Saxena", "Suhani Taneja"]'::jsonb, 'active', 1, '{"project":"Satellite Methane Plume Spotter","track":"CleanTech"}'::jsonb),
('NEX-28', 'SecureMesh', 'Geeta University', '["Pankaj Dhiman", "Deepika Kaushik"]'::jsonb, 'active', 1, '{"project":"Peer-to-Peer Disaster Mesh","track":"Cybersecurity"}'::jsonb),
('NEX-29', 'Veloce AI', 'BITS Pilani', '["Rishabh Bajaj", "Manya Singhania"]'::jsonb, 'active', 1, '{"project":"Autonomous Delivery Rover","track":"Robotics"}'::jsonb),
('NEX-30', 'Genesis Labs', 'Geeta University', '["Harshit Tanwar", "Simran Walia"]'::jsonb, 'active', 1, '{"project":"Zero-Waste Supply Chain Tracker","track":"CleanTech"}'::jsonb)
ON CONFLICT (team_id) DO UPDATE
SET team_name = EXCLUDED.team_name,
    college = EXCLUDED.college,
    members = EXCLUDED.members,
    extra_data = EXCLUDED.extra_data;


-- ============================================================================
-- PHASE 4: ANNOUNCEMENTS & RESULTS PUBLISHING SCHEMA
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'info' CHECK (priority IN ('info', 'warning', 'urgent')),
    target_role TEXT NOT NULL DEFAULT 'all' CHECK (target_role IN ('all', 'judge', 'mentor', 'admin')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read announcements"
    ON announcements FOR SELECT
    TO authenticated
    USING (is_active = true OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can insert announcements"
    ON announcements FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update announcements"
    ON announcements FOR UPDATE
    TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
    WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete announcements"
    ON announcements FOR DELETE
    TO authenticated
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rounds' AND column_name = 'is_results_published'
    ) THEN
        ALTER TABLE rounds ADD COLUMN is_results_published BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rounds' AND column_name = 'is_feedback_published'
    ) THEN
        ALTER TABLE rounds ADD COLUMN is_feedback_published BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

INSERT INTO announcements (title, message, priority, target_role)
VALUES 
('Welcome to NexHack 2.0', 'Judges and mentors, please review your assigned teams on your dashboard. Evaluations are live.', 'info', 'all'),
('Round 2 Submission Window', 'Scoring for Round 2 is now open. All rubrics must be completed before the timer ends.', 'warning', 'judge')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- PHASE 5: SUBMISSIONS & TEAM ACCESS SCHEMA
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' AND column_name = 'passcode'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN passcode TEXT NOT NULL DEFAULT 'NEX-7K9P';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
    round_id UUID REFERENCES public.rounds(id) ON DELETE SET NULL,
    github_url TEXT NOT NULL,
    ppt_pdf_url TEXT,
    demo_video_url TEXT NOT NULL,
    live_link TEXT,
    description TEXT NOT NULL,
    readme_content TEXT,
    readme_hash TEXT,
    github_metadata JSONB DEFAULT '{}'::jsonb,
    similarity_flags JSONB DEFAULT '[]'::jsonb,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_team_round_submission UNIQUE (team_id, round_id)
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
