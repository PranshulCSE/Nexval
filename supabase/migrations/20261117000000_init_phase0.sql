-- Phase 0: Schema Foundation (Profiles, Audit Log, Append-Only Enforcements, RLS)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. PROFILES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'judge', 'mentor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookup by role and email
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Trigger for updating updated_at timestamp
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

-- ====================================================================
-- 2. HELPER FUNCTIONS FOR ROLES (SECURITY DEFINER to avoid RLS recursion)
-- ====================================================================
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

-- ====================================================================
-- 3. AUDIT LOG TABLE (Strictly append-only)
-- ====================================================================
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

-- Non-negotiable Rule 4: Append-only enforcement via Trigger
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

-- Helper function to write to audit log conveniently
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- ====================================================================
-- 4. AUTH TRIGGER (Auto-create profile when user signs up)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_name TEXT;
BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'judge');
    IF v_role NOT IN ('admin', 'judge', 'mentor') THEN
        v_role := 'judge';
    END IF;

    v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

    INSERT INTO public.profiles (id, name, email, role)
    VALUES (NEW.id, v_name, NEW.email, v_role)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles:
-- Users can read their own profile, Admins can read all profiles
CREATE POLICY "Users can read own profile or admins read all"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id OR public.is_admin(auth.uid())
    );

-- Profiles: Users can update their own display name, Admins can update any profile
CREATE POLICY "Admins can update all profiles, users can update own name"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        public.is_admin(auth.uid()) OR (
            auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
        )
    );

-- Audit Log:
-- Admins can read all audit logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_log
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin(auth.uid())
    );

-- Authenticated users can insert audit logs (logging their actions)
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (
        actor_id IS NULL OR actor_id = auth.uid()
    );
