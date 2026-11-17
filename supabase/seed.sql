-- Phase 0 & Phase 1: Full Seed Data
-- 1 Admin, 3 Judges, 3 Rounds with Default Rubrics, and Sample Teams

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
    -- 1. Insert into auth.users (if not already existing)
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at
    )
    VALUES 
    (
        admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'admin@nexhack.com', encrypted_pw, now(),
        '{"provider":"email","providers":["email"]}',
        '{"name":"Chief Admin", "role":"admin"}',
        now(), now()
    ),
    (
        judge1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'judge1@nexhack.com', encrypted_pw, now(),
        '{"provider":"email","providers":["email"]}',
        '{"name":"Dr. Sarah Verma", "role":"judge"}',
        now(), now()
    ),
    (
        judge2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'judge2@nexhack.com', encrypted_pw, now(),
        '{"provider":"email","providers":["email"]}',
        '{"name":"Prof. Rajesh Kumar", "role":"judge"}',
        now(), now()
    ),
    (
        judge3_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'judge3@nexhack.com', encrypted_pw, now(),
        '{"provider":"email","providers":["email"]}',
        '{"name":"Ananya Sharma (Tech Lead)", "role":"judge"}',
        now(), now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert into public.profiles
    INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
    VALUES
    (admin_id, 'Chief Admin', 'admin@nexhack.com', 'admin', now(), now()),
    (judge1_id, 'Dr. Sarah Verma', 'judge1@nexhack.com', 'judge', now(), now()),
    (judge2_id, 'Prof. Rajesh Kumar', 'judge2@nexhack.com', 'judge', now(), now()),
    (judge3_id, 'Ananya Sharma (Tech Lead)', 'judge3@nexhack.com', 'judge', now(), now())
    ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name,
        role = EXCLUDED.role;

    -- 3. Seed Rounds
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

    -- 4. Seed Rubrics for Round 2 & 3
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

    -- 5. Seed Teams
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

    -- 6. Initial Audit Log
    INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, details)
    VALUES 
    (admin_id, 'SYSTEM_INIT', 'SYSTEM', 'PHASE_1_SCHEMA', '{"note":"Phase 1 schema, default rounds, default rubrics, and sample teams initialized"}'::jsonb);

END $$;
