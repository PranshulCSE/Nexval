-- ====================================================================
-- PHASE 6: ANALYTICS SQL VIEWS
-- ====================================================================

-- 1. College-wise Participation View
CREATE OR REPLACE VIEW public.view_college_participation AS
SELECT 
    COALESCE(NULLIF(TRIM(college), ''), 'Geeta University (Host)') AS college,
    COUNT(*) AS team_count,
    COUNT(*) FILTER (WHERE status = 'active') AS active_count,
    COUNT(*) FILTER (WHERE status = 'eliminated') AS eliminated_count
FROM public.teams
GROUP BY COALESCE(NULLIF(TRIM(college), ''), 'Geeta University (Host)')
ORDER BY team_count DESC;

-- 2. Domain / Track-wise Participation View
CREATE OR REPLACE VIEW public.view_domain_participation AS
SELECT 
    COALESCE(NULLIF(TRIM(extra_data->>'track'), ''), 'General Track') AS domain,
    COUNT(*) AS team_count,
    COUNT(*) FILTER (WHERE status = 'active') AS active_count,
    COUNT(*) FILTER (WHERE status = 'eliminated') AS eliminated_count
FROM public.teams
GROUP BY COALESCE(NULLIF(TRIM(extra_data->>'track'), ''), 'General Track')
ORDER BY team_count DESC;

-- 3. Score Distribution Buckets View (from locked/submitted evaluations)
CREATE OR REPLACE VIEW public.view_score_distribution AS
SELECT 
    bucket,
    sort_order,
    COUNT(e.id) AS evaluation_count,
    ROUND(COUNT(e.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM public.evaluations WHERE total > 0), 0), 1) AS percentage
FROM (
    VALUES 
        ('90 - 100 (Exceptional)', 1, 90.0, 100.0),
        ('80 - 89 (Proficient)',   2, 80.0, 89.99),
        ('70 - 79 (Competent)',    3, 70.0, 79.99),
        ('60 - 69 (Developing)',   4, 60.0, 69.99),
        ('< 60 (Needs Work)',      5, 0.0,  59.99)
) AS b(bucket, sort_order, min_score, max_score)
LEFT JOIN public.evaluations e ON e.total >= b.min_score AND e.total <= b.max_score
GROUP BY bucket, sort_order
ORDER BY sort_order ASC;

-- 4. Judge Strictness Comparison View
CREATE OR REPLACE VIEW public.view_judge_strictness AS
SELECT 
    p.id AS judge_id,
    p.name AS judge_name,
    p.email AS judge_email,
    p.role AS role,
    COUNT(e.id) AS total_evaluations,
    ROUND(AVG(e.total)::numeric, 2) AS avg_score_given,
    ROUND(MIN(e.total)::numeric, 2) AS min_score_given,
    ROUND(MAX(e.total)::numeric, 2) AS max_score_given,
    ROUND(COALESCE(STDDEV_POP(e.total), 0)::numeric, 2) AS stddev_score,
    CASE 
        WHEN AVG(e.total) < 70 THEN 'Strict'
        WHEN AVG(e.total) > 85 THEN 'Lenient'
        ELSE 'Balanced'
    END AS strictness_index
FROM public.profiles p
JOIN public.evaluations e ON e.judge_id = p.id
WHERE e.total > 0
GROUP BY p.id, p.name, p.email, p.role
ORDER BY avg_score_given ASC;

-- 5. Round Funnel Progression View
CREATE OR REPLACE VIEW public.view_round_funnel AS
SELECT 
    stage_order,
    stage_name,
    team_count,
    round_number
FROM (
    VALUES 
        (1, 'Registered Teams (Round 1 Guidance)', (SELECT COUNT(*) FROM public.teams), 1),
        (2, 'Round 2 Scoring Contenders', (SELECT COUNT(*) FROM public.teams WHERE current_round >= 2), 2),
        (3, 'Round 3 Finalists (Top 20)', (SELECT COUNT(*) FROM public.teams WHERE current_round >= 3), 3),
        (4, 'Grand Champions & Winners (Top 3)', (SELECT COUNT(*) FROM public.teams WHERE extra_data->>'winner_rank' IS NOT NULL), 3)
) AS f(stage_order, stage_name, team_count, round_number)
ORDER BY stage_order ASC;
