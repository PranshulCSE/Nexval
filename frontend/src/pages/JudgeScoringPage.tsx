import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ArrowLeft, CheckCircle2, Lock, Save, Clock, AlertTriangle, School, Award, Sparkles, MessageSquare, Cloud, CloudOff, RefreshCw, Github, Video, FileText, Globe, ExternalLink, MapPin } from 'lucide-react';
import { useOfflineSync, saveToOfflineQueue } from '../lib/offlineQueue';

interface RubricCriterion {
  id: string;
  name: string;
  max_marks: number;
  sort_order?: number;
}

interface TeamData {
  team_id: string;
  team_name: string;
  college?: string;
  venue?: string;
  members?: string[];
  extra_data?: Record<string, any>;
  current_round?: number;
}

interface EvaluationRecord {
  id?: string;
  round_id: string;
  judge_id: string;
  team_id: string;
  scores: Record<string, number>;
  total: number;
  remarks: string;
  locked: boolean;
  version?: number;
  updated_at?: string;
}

export const JudgeScoringPage: React.FC = () => {
  const { roundId, teamId } = useParams<{ roundId: string; teamId: string }>();
  const { profile, signOut } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const { isOnline, syncStatus, pendingCount } = useOfflineSync();

  const [team, setTeam] = useState<TeamData | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [round, setRound] = useState<any>(null);
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);

  // Auto-save states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoadRef = useRef(true);

  // Compute live total score
  const liveTotal = useMemo(() => {
    return Object.values(scores).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [scores]);

  // Load team, round, criteria, and existing evaluation
  const loadData = useCallback(async () => {
    if (!roundId || !teamId || !profile) return;
    setIsLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(
        `${backendUrl}/api/v1/evaluations/${roundId}/${teamId}?judge_id=${profile.id}`
      );

      if (res.ok) {
        const data = await res.json();
        setRound(data.round);
        setCriteria(data.criteria || []);

        if (data.submission) {
          setSubmission(data.submission);
        }

        if (data.evaluation) {
          const ev: EvaluationRecord = data.evaluation;
          setEvaluationId(ev.id || null);
          setScores(ev.scores || {});
          setRemarks(ev.remarks || '');
          setIsLocked(Boolean(ev.locked));
          if (ev.updated_at) {
            setLastSavedTime(new Date(ev.updated_at).toLocaleTimeString());
          }
        }
      }
    } catch (e) {
      console.warn('Backend evaluation fetch fallback');
    }

    // Team info lookup
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const tRes = await fetch(`${backendUrl}/api/v1/teams?search=${teamId}`);
      if (tRes.ok) {
        const tData = await tRes.json();
        const found = tData.teams?.find((t: any) => t.team_id === teamId);
        if (found) setTeam(found);
      }
    } catch (e) {}

    // Fallback if not loaded
    if (!team) {
      const localTeams = JSON.parse(localStorage.getItem('nexhack_custom_teams') || '[]');
      const match = localTeams.find((t: any) => t.team_id === teamId);
      if (match) {
        setTeam(match);
      } else {
        setTeam({
          team_id: teamId || 'NEX-01',
          team_name: 'Team ' + teamId,
          college: 'Geeta University',
          extra_data: { track: 'Innovation' },
        });
      }
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const sRes = await fetch(`${backendUrl}/api/v1/submissions/${teamId}`);
      if (sRes.ok) {
        const sData = await sRes.json();
        setSubmission(sData);
      }
    } catch {}

    // Default criteria for Round 2/3 if empty
    if (criteria.length === 0 && round?.type !== 'remarks') {
      setCriteria([
        { id: 'crit-1', name: 'Technical Execution', max_marks: 30, sort_order: 1 },
        { id: 'crit-2', name: 'Innovation & Creativity', max_marks: 25, sort_order: 2 },
        { id: 'crit-3', name: 'Impact & Relevance', max_marks: 15, sort_order: 3 },
        { id: 'crit-4', name: 'Scalability', max_marks: 15, sort_order: 4 },
        { id: 'crit-5', name: 'Presentation & Demonstration', max_marks: 15, sort_order: 5 },
      ]);
    }

    setIsLoading(false);
    setTimeout(() => {
      isFirstLoadRef.current = false;
    }, 500);
  }, [roundId, teamId, profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced Auto-save draft (with IndexedDB offline queue support)
  const triggerAutoSave = useCallback(
    (currentScores: Record<string, number>, currentRemarks: string) => {
      if (isLocked || isFirstLoadRef.current) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setSaveStatus('saving');

      debounceTimerRef.current = setTimeout(async () => {
        const itemKey = `${roundId}_${teamId}_${profile?.id}`;
        const payload = {
          key: itemKey,
          round_id: roundId!,
          judge_id: profile?.id!,
          team_id: teamId!,
          scores: currentScores,
          remarks: currentRemarks,
          timestamp: Date.now(),
        };

        if (!navigator.onLine) {
          await saveToOfflineQueue(payload);
          setSaveStatus('saved');
          setLastSavedTime(new Date().toLocaleTimeString());
          return;
        }

        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
          const res = await fetch(`${backendUrl}/api/v1/evaluations/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              round_id: roundId,
              judge_id: profile?.id,
              team_id: teamId,
              scores: currentScores,
              remarks: currentRemarks,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setSaveStatus('saved');
            setLastSavedTime(new Date().toLocaleTimeString());
            if (data.evaluation?.id) setEvaluationId(data.evaluation.id);
          } else {
            setSaveStatus('error');
          }
        } catch (e) {
          // If network fails, safely save into IndexedDB offline queue
          await saveToOfflineQueue(payload);
          setSaveStatus('saved');
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      }, 800); // 800ms debounce
    },
    [isLocked, roundId, teamId, profile]
  );

  const handleScoreChange = (criterionId: string, maxMarks: number, val: string) => {
    if (isLocked) return;

    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > maxMarks) num = maxMarks; // Non-negotiable Rule 6: 0 <= score <= criterion max

    const updated = { ...scores, [criterionId]: num };
    setScores(updated);
    triggerAutoSave(updated, remarks);
  };

  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isLocked) return;
    const val = e.target.value;
    setRemarks(val);
    triggerAutoSave(scores, val);
  };

  const handleSubmitAndLock = async () => {
    if (!roundId || !teamId || !profile) return;
    setIsSubmitting(true);

    const itemKey = `${roundId}_${teamId}_${profile.id}`;
    const payload = {
      key: itemKey,
      round_id: roundId,
      judge_id: profile.id,
      team_id: teamId,
      scores,
      remarks,
      is_locked: true,
      timestamp: Date.now(),
    };

    // If offline, save into IndexedDB queue with locked flag
    if (!navigator.onLine) {
      await saveToOfflineQueue(payload);
      setIsLocked(true);
      setIsSubmitModalOpen(false);
      success(
        'Saved to Offline Queue',
        'Device is offline. Your final evaluation was securely saved locally and will auto-submit once connection is restored.'
      );
      navigate('/judge');
      setIsSubmitting(false);
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/evaluations/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: roundId,
          judge_id: profile.id,
          team_id: teamId,
          scores,
          remarks,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to submit evaluation');
      }

      setIsLocked(true);
      setIsSubmitModalOpen(false);
      success('Evaluation Locked', 'Your evaluation has been recorded and submitted to the scoring engine.');
      navigate('/judge');
    } catch (err: any) {
      // If network dropped during submit, queue offline
      await saveToOfflineQueue(payload);
      setIsLocked(true);
      setIsSubmitModalOpen(false);
      success(
        'Saved to Offline Queue',
        'Network error during submission. Your evaluation is stored in the offline queue and will sync automatically.'
      );
      navigate('/judge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRemarksOnly = round?.type === 'remarks' || round?.number === 1;
  const isMentor = profile?.role === 'mentor';
  const isMentorRestricted = isMentor && !isRemarksOnly;

  const navItems = [
    { label: 'My Teams', href: '/judge' },
    { label: 'Evaluation Guidelines', href: '/judge/guidelines' },
    { label: 'Mentor Guidelines', href: '/mentor/guidelines' },
  ];


  if (isLoading) {
    return (
      <Layout
        user={profile}
        navItems={navItems}
        onSignOut={signOut}
        syncStatus={syncStatus}
        pendingSyncCount={pendingCount}
      >
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0F172A] rounded-full animate-spin" />
          <p className="text-xs text-slate-500 mt-3 font-medium">Loading evaluation rubric...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      user={profile}
      navItems={navItems}
      onSignOut={signOut}
      maxWidth="5xl"
      syncStatus={syncStatus}
      pendingSyncCount={pendingCount}
    >
      {/* Top back button and lock banner */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/judge"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assigned Teams
        </Link>

        {/* Auto-save & Sync indicator */}
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <span className="text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
              <CloudOff className="w-3.5 h-3.5 text-slate-500" />
              Offline &bull; Saved locally
            </span>
          ) : saveStatus === 'saving' || syncStatus === 'syncing' ? (
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              Syncing...
            </span>
          ) : (
            <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {lastSavedTime ? `Saved at ${lastSavedTime}` : 'All changes saved'}
            </span>
          )}
          {isLocked && (
            <Badge variant="green" className="text-[11px] py-0.5">
              <Lock className="w-3 h-3 mr-1 inline" />
              Submitted & Locked
            </Badge>
          )}
        </div>
      </div>

      {/* Team Header Card */}
      <Card className="mb-6 p-5 sm:p-6 bg-white border-slate-200 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {team?.team_id}
              </span>
              <Badge variant={isRemarksOnly ? 'blue' : 'green'} className="text-[10px]">
                {round?.name || 'Round 1'}
              </Badge>
              {team?.extra_data?.track && (
                <Badge variant="gray" className="text-[10px]">
                  {team.extra_data.track}
                </Badge>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {team?.team_name}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-slate-400" />
                {team?.college || 'Geeta University'}
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-amber-900 bg-amber-50 border border-amber-200/90 px-2 py-0.5 rounded-md">
                <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                Venue: <strong className="font-semibold">{team?.venue || team?.extra_data?.venue || 'Room 101 - CS Lab'}</strong>
              </span>
              {team?.members && (
                <span className="text-slate-400">
                  Members:{' '}
                  <strong className="text-slate-700">
                    {Array.isArray(team.members) ? team.members.join(', ') : team.members}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* Scoring live indicator */}
          {!isRemarksOnly && (
            <div className="flex sm:flex-col items-center sm:items-end justify-between p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Score
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {liveTotal}
                </span>
                <span className="text-xs text-slate-400 font-bold font-mono">/ 100</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Project Submission Deliverables & Verification Card */}
      {submission && (
        <Card padding="md" className="mb-6 bg-white border-slate-200 shadow-subtle space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-700" /> Project Deliverables & Verification
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Artifacts submitted by team &bull; Inspected via GitHub API & Similarity Engine
              </p>
            </div>

            {submission.github_metadata?.post_start_percentage !== undefined && (
              <Badge variant={submission.github_metadata.post_start_percentage >= 80 ? 'green' : 'yellow'} className="text-[10px]">
                {submission.github_metadata.post_start_percentage}% Commits Post-Kickoff
              </Badge>
            )}
          </div>

          {/* Deliverables Link Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {submission.github_url && (
              <a
                href={submission.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-xs font-semibold text-slate-900 group"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Github className="w-4 h-4 text-slate-900 shrink-0" />
                  Code Repository
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
              </a>
            )}

            {submission.demo_video_url && (
              <a
                href={submission.demo_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-xs font-semibold text-slate-900 group"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Video className="w-4 h-4 text-red-600 shrink-0" />
                  Demo Video
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
              </a>
            )}

            {submission.ppt_pdf_url && (
              <a
                href={submission.ppt_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-xs font-semibold text-slate-900 group"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  Pitch Deck (PDF)
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
              </a>
            )}

            {submission.live_link && (
              <a
                href={submission.live_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-xs font-semibold text-slate-900 group"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                  Live Demo Link
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
              </a>
            )}
          </div>

          {/* Project Summary */}
          {submission.description && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900 block mb-0.5 font-bold">Project Overview:</strong>
              {submission.description}
            </div>
          )}

          {/* Automated Verification & Warning Flags (Never auto-reject!) */}
          {((submission.github_metadata?.flags && submission.github_metadata.flags.length > 0) ||
            (submission.similarity_flags && submission.similarity_flags.length > 0)) ? (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Automated Integrity Flags (For Human Jury Review)</span>
              </div>
              <ul className="space-y-1 text-amber-800 pl-5 list-disc text-[11px] leading-relaxed">
                {(submission.github_metadata?.flags || []).map((f: string, i: number) => (
                  <li key={`gh-${i}`}>{f}</li>
                ))}
                {(submission.similarity_flags || []).map((s: any, i: number) => (
                  <li key={`sim-${i}`}>{typeof s === 'string' ? s : s.message}</li>
                ))}
              </ul>
              <p className="text-[10px] text-amber-700 font-medium pt-1 border-t border-amber-200/60">
                * Note: Warning flags are strictly advisory. Inquire during live pitch to verify codebase originality. Never auto-disqualify.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/60 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Originality Checked: Fresh repository, no duplication detected across submitted projects.</span>
            </div>
          )}
        </Card>
      )}

      {/* Round 1 Remarks Mode Notice */}
      {isRemarksOnly && (
        <Card className="mb-6 p-4 sm:p-5 bg-blue-50/50 border-blue-200">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <p className="font-bold mb-1">Round 1: Guidance & Mentorship Phase</p>
              <p className="text-blue-800">
                Provide constructive remarks, technical guidance, and suggestions. No marks are awarded in Round 1, and all teams advance.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Mentor Role Restriction Notice */}
      {isMentorRestricted && (
        <Card className="mb-6 p-4 sm:p-5 bg-amber-50/60 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-bold mb-1">Mentor Access Restriction</p>
              <p className="text-amber-800">
                As a Mentor, you are authorized to provide qualitative guidance during Round 1. Scoring rounds (Round 2 & 3) are restricted to official judges.
              </p>
            </div>
          </div>
        </Card>
      )}


      {/* Locked Alert Banner */}
      {isLocked && (
        <Card className="mb-6 p-4 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="text-xs text-emerald-900">
              <p className="font-bold">Evaluation Locked & Submitted</p>
              <p className="text-emerald-800 mt-0.5">
                This evaluation is locked and cannot be edited. If you need to make changes, please request an administrator to unlock it.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Scoring Rubric Section (Round 2 & 3) */}
      {!isRemarksOnly && (
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Rubric Criteria (Default 100 Marks)
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {criteria.map((c) => {
              const currentScore = scores[c.id] !== undefined ? scores[c.id] : '';

              return (
                <div
                  key={c.id}
                  className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">{c.name}</h4>
                      <Badge variant="blue" className="text-[10px]">
                        Max: {c.max_marks} pts
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      Score strictly between 0 and {c.max_marks} marks
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <label className="text-xs font-semibold text-slate-500 sm:hidden">Score:</label>
                    <input
                      type="number"
                      min="0"
                      max={c.max_marks}
                      step="1"
                      disabled={isLocked}
                      value={currentScore}
                      onChange={(e) => handleScoreChange(c.id, c.max_marks, e.target.value)}
                      placeholder="0"
                      className="w-24 px-3 py-2 text-center text-lg font-bold font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      / {c.max_marks}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Remarks Section */}
      <Card className="p-5 sm:p-6 mb-8 bg-white border-slate-200">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>
            {isRemarksOnly ? 'Qualitative Mentorship Remarks *' : 'Judge Feedback & Observations *'}
          </span>
          <span className="text-[11px] text-slate-400 font-normal">Debounced Auto-save</span>
        </label>
        <textarea
          rows={5}
          disabled={isLocked}
          value={remarks}
          onChange={handleRemarksChange}
          placeholder={
            isRemarksOnly
              ? 'Provide clear technical advice on architecture, scalability, and execution for the next round...'
              : 'Add key highlights, areas of improvement, and overall impression...'
          }
          className="w-full p-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all text-slate-900 disabled:opacity-60"
        />
      </Card>

      {/* Mobile-first Bottom Action Bar */}
      <div className="sticky bottom-4 z-30 p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl flex items-center justify-between gap-4">
        <div className="text-xs">
          {!isRemarksOnly ? (
            <span className="text-slate-600 font-medium">
              Live Total: <strong className="text-slate-900 font-mono text-sm">{liveTotal} / 100</strong>
            </span>
          ) : (
            <span className="text-slate-600 font-medium">Round 1 Guidance Mode</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isLocked && !isMentorRestricted && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsSubmitModalOpen(true)}
              disabled={!remarks.trim()}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Submit & Lock
            </Button>
          )}
          {isMentorRestricted && (
            <span className="text-xs text-amber-700 font-semibold px-3 py-1.5 bg-amber-100/70 rounded-xl border border-amber-200">
              Guidance Rounds Only
            </span>
          )}
          {isLocked && (
            <Button variant="outline" size="md" onClick={() => navigate('/judge')}>
              Back to Dashboard
            </Button>
          )}
        </div>

      </div>

      {/* Submission Confirmation Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit and Lock Evaluation?"
        subtitle={`Team ${team?.team_id} — ${team?.team_name}`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsSubmitModalOpen(false)}>
              Keep Editing
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmitting}
              onClick={handleSubmitAndLock}
            >
              Yes, Submit & Lock
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              Once locked, this evaluation cannot be edited by you. Only an administrator can unlock an evaluation if an error occurred.
            </p>
          </div>
          {!isRemarksOnly && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-slate-700">Calculated Final Score:</span>
              <span className="text-lg font-bold font-mono text-slate-900">{liveTotal} / 100</span>
            </div>
          )}
          <p className="text-slate-500">
            Clicking &quot;Yes, Submit & Lock&quot; immediately transmits the scores to the scoring engine.
          </p>
        </div>
      </Modal>
    </Layout>
  );
};
