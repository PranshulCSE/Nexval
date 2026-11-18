-- Phase 4: Announcements & Public Results Schema
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

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policies for announcements
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

-- Add publish_results flag to rounds table if not present
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

-- Enable Realtime for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;

-- Seed default initial announcements
INSERT INTO announcements (title, message, priority, target_role)
VALUES 
('Welcome to NexHack 2.0', 'Judges and mentors, please review your assigned teams on your dashboard. Evaluations are live.', 'info', 'all'),
('Round 2 Submission Window', 'Scoring for Round 2 is now open. All rubrics must be completed before the timer ends.', 'warning', 'judge')
ON CONFLICT DO NOTHING;
