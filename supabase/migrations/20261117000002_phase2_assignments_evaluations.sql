-- ====================================================================
-- PHASE 2: ASSIGNMENTS & EVALUATIONS WITH STRICT DATABASE ENFORCEMENT
-- ====================================================================

-- 1. ASSIGNMENTS TABLE
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

-- 2. EVALUATIONS TABLE
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
-- 3. STRICT BUSINESS RULES ENFORCED IN DATABASE TRIGGERS
-- ====================================================================

-- Trigger Function: Enforce round is live, judge is assigned, evaluation is not locked,
-- and compute total marks strictly from rubric criteria in DB.
CREATE OR REPLACE FUNCTION public.process_and_validate_evaluation()
RETURNS TRIGGER AS $$
DECLARE
    v_round_status TEXT;
    v_round_type TEXT;
    v_computed_total NUMERIC(6, 2) := 0.00;
    v_criterion RECORD;
    v_criterion_score NUMERIC(6, 2);
    v_score_raw TEXT;
BEGIN
    -- Get round status and type
    SELECT status, type INTO v_round_status, v_round_type 
    FROM public.rounds 
    WHERE id = NEW.round_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referenced round does not exist.';
    END IF;

    -- Rule 1: A judge can write an evaluation only if the round is live
    IF v_round_status != 'live' AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Evaluations can only be created or modified while round is live. Current round status is "%".', v_round_status;
    END IF;

    -- Rule 2: A judge can write an evaluation only if assigned to that team in that round
    IF NOT EXISTS (
        SELECT 1 FROM public.assignments 
        WHERE round_id = NEW.round_id AND judge_id = NEW.judge_id AND team_id = NEW.team_id
    ) AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Judge is not assigned to team "%" in this round.', NEW.team_id;
    END IF;

    -- Rule 3: Locked check. An evaluation cannot be modified once locked, unless an admin is unlocking it.
    IF TG_OP = 'UPDATE' THEN
        IF OLD.locked = true THEN
            -- If already locked, only allow update if setting locked = false (admin unlocking)
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
        -- Round 1: Guidance remarks only, no marks allowed
        NEW.total := 0.00;
        NEW.scores := '{}'::jsonb;
    ELSE
        -- Round 2 / 3: Scoring mode
        -- Compute total by iterating rubric_criteria for this round
        FOR v_criterion IN 
            SELECT id, name, max_marks 
            FROM public.rubric_criteria 
            WHERE round_id = NEW.round_id
        LOOP
            -- Check if score exists by criterion id or name
            v_score_raw := COALESCE(
                NEW.scores->>v_criterion.id::text, 
                NEW.scores->>v_criterion.name
            );

            IF v_score_raw IS NOT NULL AND v_score_raw != '' THEN
                v_criterion_score := v_score_raw::NUMERIC;
                -- Rule 6: Validate 0 <= score <= criterion max
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

-- Trigger Function: Append to audit log on evaluation changes
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
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- ASSIGNMENTS RLS
-- Non-negotiable Rule 2: Judges only see their own assigned teams
CREATE POLICY "Admins full access to assignments"
    ON public.assignments
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Judges read own assignments"
    ON public.assignments
    FOR SELECT
    TO authenticated
    USING (judge_id = auth.uid());

-- EVALUATIONS RLS
CREATE POLICY "Admins full access to evaluations"
    ON public.evaluations
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Judges read own evaluations"
    ON public.evaluations
    FOR SELECT
    TO authenticated
    USING (judge_id = auth.uid());

CREATE POLICY "Judges insert own evaluations"
    ON public.evaluations
    FOR INSERT
    TO authenticated
    WITH CHECK (judge_id = auth.uid());

CREATE POLICY "Judges update own unlocked evaluations"
    ON public.evaluations
    FOR UPDATE
    TO authenticated
    USING (judge_id = auth.uid())
    WITH CHECK (judge_id = auth.uid());
