-- ====================================================================
-- PHASE 3: MENTOR ROLE RESTRICTION & EXCEL EXPORT AUDIT LOGGING
-- ====================================================================

-- Update evaluation validation trigger to enforce mentor restrictions
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

    -- Rule 2: A judge/mentor can write an evaluation only if assigned to that team
    IF NOT EXISTS (
        SELECT 1 FROM public.assignments 
        WHERE round_id = NEW.round_id AND judge_id = NEW.judge_id AND team_id = NEW.team_id
    ) AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Evaluator is not assigned to team "%" in this round.', NEW.team_id;
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
