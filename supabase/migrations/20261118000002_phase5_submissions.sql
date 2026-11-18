-- ====================================================================
-- PHASE 5: SUBMISSIONS & TEAM ACCESS SCHEMA
-- ====================================================================

-- 1. Add passcode to teams table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' AND column_name = 'passcode'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN passcode TEXT NOT NULL DEFAULT 'NEX-7K9P';
    END IF;
END $$;

-- 2. Submissions Table
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

CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON public.submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_round_id ON public.submissions(round_id);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Submissions RLS Policies
CREATE POLICY "Public read submissions for authenticated users"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teams and admins can insert or update submissions"
    ON public.submissions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Enable Realtime for submissions
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
