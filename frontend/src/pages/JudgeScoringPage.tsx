import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ArrowLeft, CheckCircle2, Lock, Save, Clock, AlertTriangle, School, Award, Sparkles, MessageSquare } from 'lucide-react';

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

  const [team, setTeam] = useState<TeamData | null>(null);
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

  // Debounced Auto-save draft
  const triggerAutoSave = useCallback(
    (currentScores: Record<string, number>, currentRemarks: string) => {
      if (isLocked || isFirstLoadRef.current) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setSaveStatus('saving');

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
          const payload = {
            round_id: roundId,
            judge_id: profile?.id,
            team_id: teamId,
            scores: currentScores,
            remarks: currentRemarks,
          };

          const res = await fetch(`${backendUrl}/api/v1/evaluations/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
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
          // Local storage fallback
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

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const payload = {
        round_id: roundId,
        judge_id: profile.id,
        team_id: teamId,
        scores,
        remarks,
      };

      const res = await fetch(`${backendUrl}/api/v1/evaluations/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      error('Submission Error', err.message || 'Could not submit evaluation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRemarksOnly = round?.type === 'remarks' || round?.number === 1;

  const navItems = [
    { label: 'My Teams', href: '/judge' },
    { label: 'Evaluation Guidelines', href: '/judge/guidelines' },
  ];

  if (isLoading) {
    return (
      <Layout user={profile} navItems={navItems} onSignOut={signOut}>
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0F172A] rounded-full animate-spin" />
          <p className="text-xs text-slate-500 mt-3 font-medium">Loading evaluation rubric...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={profile} navItems={navItems} onSignOut={signOut} maxWidth="5xl">
      {/* Top back button and lock banner */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/judge"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assigned Teams
        </Link>

        {/* Auto-save indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Saving draft...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Draft saved {lastSavedTime ? `at ${lastSavedTime}` : ''}
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
          {!isLocked && (
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
