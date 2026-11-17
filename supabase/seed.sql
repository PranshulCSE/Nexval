-- Phase 0: Seed Data
-- 1 Admin and 3 Judges

DO $$
DECLARE
    admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
    judge1_id UUID := 'b0000000-0000-0000-0000-000000000001';
    judge2_id UUID := 'b0000000-0000-0000-0000-000000000002';
    judge3_id UUID := 'b0000000-0000-0000-0000-000000000003';
    encrypted_pw TEXT := crypt('password123', gen_salt('bf'));
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

    -- 2. Insert into public.profiles (in case auth trigger is bypassed or existing)
    INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
    VALUES
    (admin_id, 'Chief Admin', 'admin@nexhack.com', 'admin', now(), now()),
    (judge1_id, 'Dr. Sarah Verma', 'judge1@nexhack.com', 'judge', now(), now()),
    (judge2_id, 'Prof. Rajesh Kumar', 'judge2@nexhack.com', 'judge', now(), now()),
    (judge3_id, 'Ananya Sharma (Tech Lead)', 'judge3@nexhack.com', 'judge', now(), now())
    ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name,
        role = EXCLUDED.role;

    -- 3. Seed an initial audit log record
    INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, details)
    VALUES 
    (admin_id, 'SYSTEM_INIT', 'SYSTEM', 'INITIALIZATION', '{"note":"Initial system seeded with 1 admin and 3 judges"}'::jsonb);

END $$;
