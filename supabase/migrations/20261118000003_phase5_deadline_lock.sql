-- ====================================================================
-- PHASE 5: DB-ENFORCED DEADLINE LOCK TRIGGER FOR SUBMISSIONS
-- ====================================================================

-- Function to verify that submission is created/updated before deadline
CREATE OR REPLACE FUNCTION public.check_submission_deadline()
RETURNS TRIGGER AS $$
DECLARE
    v_round_status TEXT;
    v_end_time TIMESTAMPTZ;
BEGIN
    -- If round_id is provided, check its deadline and status
    IF NEW.round_id IS NOT NULL THEN
        SELECT status, end_time INTO v_round_status, v_end_time
        FROM public.rounds
        WHERE id = NEW.round_id;
        
        IF v_round_status = 'closed' THEN
            RAISE EXCEPTION 'Submissions cannot be submitted or edited for a closed round (round_id: %)', NEW.round_id;
        END IF;

        IF v_end_time IS NOT NULL AND timezone('utc'::text, now()) > v_end_time THEN
            RAISE EXCEPTION 'Submission deadline has passed at %. Updates are strictly locked.', v_end_time;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_enforce_submission_deadline ON public.submissions;

-- Attach trigger BEFORE INSERT OR UPDATE
CREATE TRIGGER trg_enforce_submission_deadline
    BEFORE INSERT OR UPDATE ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_submission_deadline();

-- Storage bucket creation for submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;
