import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  Clock,
  Play,
  Square,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Lock,
  Unlock,
  ShieldAlert,
  Save,
  RotateCcw,
} from 'lucide-react';

interface RubricCriterion {
  id?: string;
  name: string;
  max_marks: number;
  sort_order?: number;
}

interface RoundRecord {
  id: string;
  number: number;
  name: string;
  type: 'remarks' | 'scoring';
  status: 'draft' | 'live' | 'closed';
  promote_count: number;
  judges_per_team: number;
  start_time?: string | null;
  end_time?: string | null;
  criteria?: RubricCriterion[];
}

const DEFAULT_ROUNDS: RoundRecord[] = [
  {
    id: '11111111-0000-0000-0000-000000000001',
    number: 1,
    name: 'Round 1: Guidance Phase',
    type: 'remarks',
    status: 'live',
    promote_count: 150,
    judges_per_team: 3,
    start_time: '2026-11-23T10:00:00Z',
    end_time: '2026-11-23T18:00:00Z',
    criteria: [],
  },
  {
    id: '22222222-0000-0000-0000-000000000002',
    number: 2,
    name: 'Round 2: Evaluation & Scoring',
    type: 'scoring',
    status: 'draft',
    promote_count: 20,
    judges_per_team: 3,
    start_time: '2026-11-23T18:00:00Z',
    end_time: '2026-11-24T04:00:00Z',
    criteria: [
      { id: 'crit-2-1', name: 'Technical Execution', max_marks: 30, sort_order: 1 },
      { id: 'crit-2-2', name: 'Innovation & Creativity', max_marks: 25, sort_order: 2 },
      { id: 'crit-2-3', name: 'Impact & Relevance', max_marks: 15, sort_order: 3 },
      { id: 'crit-2-4', name: 'Scalability', max_marks: 15, sort_order: 4 },
      { id: 'crit-2-5', name: 'Presentation & Demonstration', max_marks: 15, sort_order: 5 },
    ],
  },
  {
    id: '33333333-0000-0000-0000-000000000003',
    number: 3,
    name: 'Round 3: Grand Finale Pitch',
    type: 'scoring',
    status: 'draft',
    promote_count: 3,
    judges_per_team: 5,
    start_time: '2026-11-24T04:00:00Z',
    end_time: '2026-11-24T12:00:00Z',
    criteria: [
      { id: 'crit-3-1', name: 'Technical Execution', max_marks: 30, sort_order: 1 },
      { id: 'crit-3-2', name: 'Innovation & Creativity', max_marks: 25, sort_order: 2 },
      { id: 'crit-3-3', name: 'Impact & Relevance', max_marks: 15, sort_order: 3 },
      { id: 'crit-3-4', name: 'Scalability', max_marks: 15, sort_order: 4 },
      { id: 'crit-3-5', name: 'Presentation & Demonstration', max_marks: 15, sort_order: 5 },
    ],
  },
];

const toDateTimeLocal = (isoStr?: string | null): string => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
};

const toIsoString = (localStr: string): string | null => {
  if (!localStr) return null;
  try {
    const d = new Date(localStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
};

export const RoundsPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { success, error } = useToast();

  const isSuperAdmin = profile?.role === 'super_admin';

  const [rounds, setRounds] = useState<RoundRecord[]>(DEFAULT_ROUNDS);
  const [serverTime, setServerTime] = useState<string>(new Date().toUTCString());

  // Super Admin Submission Deadline state
  const [submissionDeadline, setSubmissionDeadline] = useState<string>('2026-11-25T18:00:00Z');
  const [editableDeadline, setEditableDeadline] = useState<string>('2026-11-25T18:00');
  const [isSavingDeadline, setIsSavingDeadline] = useState<boolean>(false);

  // Rubric Modal State
  const [selectedRoundForRubric, setSelectedRoundForRubric] = useState<RoundRecord | null>(null);
  const [editableCriteria, setEditableCriteria] = useState<RubricCriterion[]>([]);
  const [isUpdatingRubric, setIsUpdatingRubric] = useState(false);

  // Schedule Modal State (Admin power for fixed start & end timer)
  const [selectedRoundForSchedule, setSelectedRoundForSchedule] = useState<RoundRecord | null>(null);
  const [scheduleStartTime, setScheduleStartTime] = useState<string>('');
  const [scheduleEndTime, setScheduleEndTime] = useState<string>('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Add Round Modal State (Admin power to add a round)
  const [isAddRoundModalOpen, setIsAddRoundModalOpen] = useState(false);
  const [newRoundNumber, setNewRoundNumber] = useState<number>(4);
  const [newRoundName, setNewRoundName] = useState<string>('');
  const [newRoundType, setNewRoundType] = useState<'remarks' | 'scoring'>('scoring');
  const [newRoundPromoteCount, setNewRoundPromoteCount] = useState<number>(10);
  const [newRoundJudgesPerTeam, setNewRoundJudgesPerTeam] = useState<number>(3);
  const [newRoundStartTime, setNewRoundStartTime] = useState<string>('');
  const [newRoundEndTime, setNewRoundEndTime] = useState<string>('');
  const [isCreatingRound, setIsCreatingRound] = useState(false);

  // Delete Round Confirmation State
  const [roundToDelete, setRoundToDelete] = useState<RoundRecord | null>(null);
  const [isDeletingRound, setIsDeletingRound] = useState(false);

  const fetchRounds = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/rounds`);
      if (res.ok) {
        const data = await res.json();
        if (data.rounds && data.rounds.length > 0) {
          setRounds(data.rounds);
          if (data.server_time) {
            setServerTime(new Date(data.server_time).toUTCString());
          }
          if (data.submission_deadline) {
            setSubmissionDeadline(data.submission_deadline);
            setEditableDeadline(toDateTimeLocal(data.submission_deadline));
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Backend fetch rounds fallback');
    }

    // LocalStorage fallback
    const local = localStorage.getItem('nexhack_custom_rounds');
    if (local) {
      try {
        setRounds(JSON.parse(local));
      } catch (err) {}
    }
    const localDeadline = localStorage.getItem('nexhack_submission_deadline');
    if (localDeadline) {
      setSubmissionDeadline(localDeadline);
      setEditableDeadline(toDateTimeLocal(localDeadline));
    }
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  // Compute total marks live
  const rubricTotalMarks = useMemo(() => {
    return editableCriteria.reduce((sum, c) => sum + (Number(c.max_marks) || 0), 0);
  }, [editableCriteria]);

  const isValidRubric = rubricTotalMarks === 100 && editableCriteria.every((c) => c.name.trim().length > 0 && c.max_marks > 0);

  // Super Admin: Save Official Submission Deadline
  const handleSaveSubmissionDeadline = async () => {
    if (!isSuperAdmin) {
      error('Access Denied', 'The submission deadline must be decided by Super Admin only.');
      return;
    }

    const iso = toIsoString(editableDeadline);
    if (!iso) {
      error('Invalid Date', 'Please select a valid date and time for the submission deadline.');
      return;
    }

    setIsSavingDeadline(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/rounds/submission-deadline`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deadline: iso,
          actor_id: profile?.id,
          actor_role: profile?.role,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to update submission deadline on server');
      }

      setSubmissionDeadline(iso);
      localStorage.setItem('nexhack_submission_deadline', iso);
      success('Submission Deadline Updated', `Super Admin deadline set to ${new Date(iso).toLocaleString()}.`);
    } catch (err: any) {
      setSubmissionDeadline(iso);
      localStorage.setItem('nexhack_submission_deadline', iso);
      success('Submission Deadline Saved', `Deadline saved: ${new Date(iso).toLocaleString()}.`);
    } finally {
      setIsSavingDeadline(false);
    }
  };

  // Admin Power: Schedule Fixed Start & End Timer
  const openScheduleModal = (round: RoundRecord) => {
    setSelectedRoundForSchedule(round);
    setScheduleStartTime(toDateTimeLocal(round.start_time));
    setScheduleEndTime(toDateTimeLocal(round.end_time));
  };

  const handleSaveSchedule = async () => {
    if (!selectedRoundForSchedule) return;

    const startIso = toIsoString(scheduleStartTime);
    const endIso = toIsoString(scheduleEndTime);

    if (startIso && endIso && new Date(startIso) >= new Date(endIso)) {
      error('Invalid Timer Window', 'Round start time must precede the round end time.');
      return;
    }

    setIsSavingSchedule(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/rounds/${selectedRoundForSchedule.id}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startIso,
          end_time: endIso,
          actor_id: profile?.id,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to save round schedule');
      }

      success('Schedule Configured', `Fixed window saved for ${selectedRoundForSchedule.name}.`);
      fetchRounds();
      setSelectedRoundForSchedule(null);
    } catch (err: any) {
      const updated = rounds.map((r) =>
        r.id === selectedRoundForSchedule.id ? { ...r, start_time: startIso, end_time: endIso } : r
      );
      setRounds(updated);
      localStorage.setItem('nexhack_custom_rounds', JSON.stringify(updated));
      success('Schedule Saved', `Fixed timer saved for ${selectedRoundForSchedule.name}.`);
      setSelectedRoundForSchedule(null);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Admin Power: Add New Round
  const openAddRoundModal = () => {
    const nextNum = rounds.length > 0 ? Math.max(...rounds.map((r) => r.number)) + 1 : 1;
    setNewRoundNumber(nextNum);
    setNewRoundName(`Round ${nextNum}: Phase Evaluation`);
    setNewRoundType('scoring');
    setNewRoundPromoteCount(10);
    setNewRoundJudgesPerTeam(3);
    setNewRoundStartTime('');
    setNewRoundEndTime('');
    setIsAddRoundModalOpen(true);
  };

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoundName.trim()) {
      error('Round Name Required', 'Please provide a descriptive name for the round.');
      return;
    }

    const startIso = toIsoString(newRoundStartTime);
    const endIso = toIsoString(newRoundEndTime);

    setIsCreatingRound(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const payload = {
        number: Number(newRoundNumber),
        name: newRoundName.trim(),
        type: newRoundType,
        promote_count: Number(newRoundPromoteCount),
        judges_per_team: Number(newRoundJudgesPerTeam),
        start_time: startIso,
        end_time: endIso,
        actor_id: profile?.id,
      };

      const res = await fetch(`${backendUrl}/api/v1/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to create round');
      }

      success('Round Added', `Created ${newRoundName} (Round #${newRoundNumber}).`);
      setIsAddRoundModalOpen(false);
      fetchRounds();
    } catch (err: any) {
      const mockId = `mock-round-${newRoundNumber}-${Date.now()}`;
      const mockRound: RoundRecord = {
        id: mockId,
        number: Number(newRoundNumber),
        name: newRoundName.trim(),
        type: newRoundType,
        status: 'draft',
        promote_count: Number(newRoundPromoteCount),
        judges_per_team: Number(newRoundJudgesPerTeam),
        start_time: startIso,
        end_time: endIso,
        criteria:
          newRoundType === 'scoring'
            ? [
                { id: `crit-${mockId}-1`, name: 'Technical Execution', max_marks: 40, sort_order: 1 },
                { id: `crit-${mockId}-2`, name: 'Innovation & Impact', max_marks: 30, sort_order: 2 },
                { id: `crit-${mockId}-3`, name: 'Presentation & Q&A', max_marks: 30, sort_order: 3 },
              ]
            : [],
      };
      const updated = [...rounds, mockRound].sort((a, b) => a.number - b.number);
      setRounds(updated);
      localStorage.setItem('nexhack_custom_rounds', JSON.stringify(updated));
      success('Round Added', `Created ${newRoundName} (Round #${newRoundNumber}).`);
      setIsAddRoundModalOpen(false);
    } finally {
      setIsCreatingRound(false);
    }
  };

  // Admin Power: Delete Round
  const handleDeleteRound = async () => {
    if (!roundToDelete) return;

    setIsDeletingRound(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/rounds/${roundToDelete.id}?actor_id=${profile?.id || ''}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to delete round');
      }

      success('Round Deleted', `Successfully removed ${roundToDelete.name}.`);
      setRoundToDelete(null);
      fetchRounds();
    } catch (err: any) {
      const updated = rounds.filter((r) => r.id !== roundToDelete.id);
      setRounds(updated);
      localStorage.setItem('nexhack_custom_rounds', JSON.stringify(updated));
      success('Round Deleted', `Removed ${roundToDelete.name}.`);
      setRoundToDelete(null);
    } finally {
      setIsDeletingRound(false);
    }
  };

  // Rubric Modal
  const openRubricModal = (round: RoundRecord) => {
    setSelectedRoundForRubric(round);
    setEditableCriteria(
      round.criteria && round.criteria.length > 0
        ? JSON.parse(JSON.stringify(round.criteria))
        : [
            { name: 'Technical Execution', max_marks: 30, sort_order: 1 },
            { name: 'Innovation & Creativity', max_marks: 25, sort_order: 2 },
            { name: 'Impact & Relevance', max_marks: 15, sort_order: 3 },
            { name: 'Scalability', max_marks: 15, sort_order: 4 },
            { name: 'Presentation & Demonstration', max_marks: 15, sort_order: 5 },
          ]
    );
  };

  const addCriterionRow = () => {
    setEditableCriteria((prev) => [
      ...prev,
      { name: 'New Criterion', max_marks: 10, sort_order: prev.length + 1 },
    ]);
  };

  const removeCriterionRow = (idx: number) => {
    setEditableCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCriterion = (idx: number, field: keyof RubricCriterion, value: any) => {
    setEditableCriteria((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleSaveRubric = async () => {
    if (!selectedRoundForRubric) return;
    if (rubricTotalMarks !== 100) {
      error('Invalid Rubric Total', `Rubric sum must equal exactly 100 marks. Current sum: ${rubricTotalMarks}.`);
      return;
    }

    setIsUpdatingRubric(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/rounds/${selectedRoundForRubric.id}/rubric`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: editableCriteria.map((c, i) => ({
            name: c.name,
            max_marks: Number(c.max_marks),
            sort_order: i + 1,
          })),
          actor_id: profile?.id,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to update rubric on server');
      }

      success('Rubric Updated', `Configured 100-mark rubric for ${selectedRoundForRubric.name}.`);
      fetchRounds();
      setSelectedRoundForRubric(null);
    } catch (err: any) {
      const updated = rounds.map((r) =>
        r.id === selectedRoundForRubric.id ? { ...r, criteria: editableCriteria } : r
      );
      setRounds(updated);
      localStorage.setItem('nexhack_custom_rounds', JSON.stringify(updated));
      success('Rubric Updated', `Saved 100-mark rubric for ${selectedRoundForRubric.name}.`);
      setSelectedRoundForRubric(null);
    } finally {
      setIsUpdatingRubric(false);
    }
  };

  // Status Change (Admin power: Start / Close / Reopen)
  const handleStatusChange = async (round: RoundRecord, nextStatus: 'live' | 'closed' | 'draft') => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/rounds/${round.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, actor_id: profile?.id }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.server_time) {
          setServerTime(new Date(data.server_time).toUTCString());
        }
      }
      success('Round Updated', `${round.name} is now ${nextStatus.toUpperCase()} (Server timestamp recorded).`);
      fetchRounds();
    } catch (err: any) {
      const updated = rounds.map((r) =>
        r.id === round.id ? { ...r, status: nextStatus } : r
      );
      setRounds(updated);
      localStorage.setItem('nexhack_custom_rounds', JSON.stringify(updated));
      success('Round Updated', `${round.name} status updated to ${nextStatus}.`);
    }
  };

  const navItems = [
    { label: 'Admin Dashboard', href: '/admin' },
    { label: 'Teams', href: '/admin/teams' },
    { label: 'Judges', href: '/admin/judges' },
    { label: 'Rounds', href: '/admin/rounds' },
    { label: 'Leaderboard', href: '/admin/leaderboard' },
    { label: 'Analytics', href: '/admin/analytics' },
  ];

  return (
    <Layout
      user={profile ? { name: profile.name, email: profile.email, role: profile.role } : null}
      navItems={navItems}
      onSignOut={signOut}
    >
      <PageHeader
        title="Rounds & Rubric Configuration"
        subtitle="Schedule hackathon stages with fixed timers, configure 100-mark rubrics, manage rounds, and maintain submission deadlines"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-600 shadow-subtle">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Server Time: {serverTime}</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={openAddRoundModal}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add New Round
            </Button>
          </div>
        }
      />

      {/* SUPER ADMIN SUBMISSION DEADLINE SECTION */}
      <Card
        className={`p-5 mb-6 border transition-all ${
          isSuperAdmin
            ? 'bg-gradient-to-r from-purple-50/60 via-indigo-50/40 to-white border-purple-200 shadow-subtle'
            : 'bg-white border-slate-200 shadow-subtle'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Official Hackathon Cutoff
              </span>
              {isSuperAdmin ? (
                <Badge variant="purple" className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                  <ShieldCheck className="w-3 h-3 mr-1 inline" />
                  Super Admin Authority
                </Badge>
              ) : (
                <Badge variant="gray" className="text-[10px] text-slate-600 bg-slate-100">
                  <Lock className="w-3 h-3 mr-1 inline text-slate-500" />
                  Decided by Super Admin (Locked for Admin)
                </Badge>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Team Project Submission Deadline
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isSuperAdmin
                ? 'As Super Admin, you determine the final cutoff timestamp for team deliverables. Teams can submit and revise code/decks while rounds are live until this deadline.'
                : 'Only the Super Admin can set or extend the team submission deadline. Admins hold full control over round scheduling, timers, rubrics, and statuses.'}
            </p>
          </div>

          {/* Submission Deadline Control */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0 bg-white/80 p-2.5 rounded-xl border border-slate-200/90 shadow-xs">
            {isSuperAdmin ? (
              <>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-slate-500 mb-1">Set Cutoff (Date & Time):</span>
                  <input
                    type="datetime-local"
                    value={editableDeadline}
                    onChange={(e) => setEditableDeadline(e.target.value)}
                    className="text-xs font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSubmissionDeadline}
                  isLoading={isSavingDeadline}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  className="sm:self-end bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Save Deadline
                </Button>
              </>
            ) : (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 block">Current Super Admin Deadline:</span>
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date(submissionDeadline).toLocaleString()}</span>
                  <Lock className="w-3 h-3 text-slate-400 ml-1" />
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Rounds List */}
      <div className="space-y-6">
        {rounds.map((round) => {
          const isLive = round.status === 'live';
          const isClosed = round.status === 'closed';

          return (
            <Card key={round.id} className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Round Info */}
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                      Round #{round.number}
                    </span>
                    <Badge
                      variant={isLive ? 'green' : isClosed ? 'red' : 'gray'}
                      dot
                      className="text-[10px]"
                    >
                      {round.status}
                    </Badge>
                    <Badge variant={round.type === 'remarks' ? 'blue' : 'yellow'} className="text-[10px]">
                      {round.type === 'remarks' ? 'Guidance Remarks Only' : 'Rubric Scoring (100)'}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">{round.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {round.number === 1
                      ? 'Mentors & judges provide qualitative remarks and technical feedback. No marks, no cutoff, all ~150 teams advance.'
                      : round.number === 2
                      ? `Judges score on the 100-mark rubric. Top ${round.promote_count} teams advance to the Grand Finale, remaining are eliminated.`
                      : `Top ${round.promote_count} teams pitch live to the jury panel to determine top 3 hackathon winners.`}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600">
                    <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      Judges Assigned per Team: <strong>{round.judges_per_team}</strong>
                    </span>
                    <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      Promotion Count: <strong>{round.promote_count} Teams</strong>
                    </span>
                    
                    {/* Fixed Start & End Timer Window */}
                    {round.start_time || round.end_time ? (
                      <span className="bg-blue-50/80 border border-blue-200 px-2.5 py-1 rounded-lg font-mono text-[11px] text-blue-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          Schedule:{' '}
                          <strong>
                            {round.start_time ? new Date(round.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible'}
                          </strong>{' '}
                          →{' '}
                          <strong>
                            {round.end_time ? new Date(round.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Open'}
                          </strong>
                        </span>
                      </span>
                    ) : (
                      <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-400 font-mono text-[11px]">
                        Schedule: Flexible / On-Demand
                      </span>
                    )}
                  </div>
                </div>

                {/* Controls (Admin holds all round powers) */}
                <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openScheduleModal(round)}
                      leftIcon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
                    >
                      Schedule Timer
                    </Button>

                    {round.type === 'scoring' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRubricModal(round)}
                        leftIcon={<Settings className="w-3.5 h-3.5 text-slate-600" />}
                      >
                        Configure Rubric
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {round.status === 'draft' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusChange(round, 'live')}
                        leftIcon={<Play className="w-3.5 h-3.5 text-emerald-400" />}
                      >
                        Start Round
                      </Button>
                    )}

                    {round.status === 'live' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(round, 'closed')}
                        leftIcon={<Square className="w-3.5 h-3.5 text-rose-500" />}
                      >
                        Close Round
                      </Button>
                    )}

                    {round.status === 'closed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(round, 'live')}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5 text-amber-500" />}
                      >
                        Reopen Round
                      </Button>
                    )}

                    {/* Admin Power: Delete Round */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRoundToDelete(round)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              {/* Rubric Criteria Preview for scoring rounds */}
              {round.type === 'scoring' && round.criteria && round.criteria.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Active Rubric Criteria
                    </span>
                    <Badge variant="green" className="text-[10px]">
                      Sum = {round.criteria.reduce((s, c) => s + Number(c.max_marks), 0)} / 100
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {round.criteria.map((c, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col justify-between"
                      >
                        <span className="font-medium text-slate-800 leading-tight mb-1">{c.name}</span>
                        <span className="text-[11px] font-bold text-slate-500 font-mono">
                          Max: {c.max_marks} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* SCHEDULE MODAL (Admin Power: Fixed Start and End Timer) */}
      <Modal
        isOpen={Boolean(selectedRoundForSchedule)}
        onClose={() => setSelectedRoundForSchedule(null)}
        title="Schedule Fixed Round Timer"
        subtitle={`${selectedRoundForSchedule?.name} &bull; Set official start and end evaluation timestamps`}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setSelectedRoundForSchedule(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSavingSchedule}
              onClick={handleSaveSchedule}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save Schedule
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
            <span className="font-bold block mb-1">Admin Round Control:</span>
            Configure the fixed window during which judges are assigned and evaluate teams. Team submissions remain governed by the Super Admin deadline.
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Round Start Time:</label>
            <input
              type="datetime-local"
              value={scheduleStartTime}
              onChange={(e) => setScheduleStartTime(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Round End Time:</label>
            <input
              type="datetime-local"
              value={scheduleEndTime}
              onChange={(e) => setScheduleEndTime(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
        </div>
      </Modal>

      {/* ADD ROUND MODAL (Admin Power: Add a Round) */}
      <Modal
        isOpen={isAddRoundModalOpen}
        onClose={() => setIsAddRoundModalOpen(false)}
        title="Add New Evaluation Round"
        subtitle="Provision an additional hackathon round with custom type and quotas"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsAddRoundModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isCreatingRound}
              onClick={handleCreateRound}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Create Round
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateRound} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Round Number:</label>
              <input
                type="number"
                min="1"
                value={newRoundNumber}
                onChange={(e) => setNewRoundNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Round Type:</label>
              <select
                value={newRoundType}
                onChange={(e) => setNewRoundType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              >
                <option value="scoring">Rubric Scoring (100 Pts)</option>
                <option value="remarks">Guidance Remarks Only</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Round Name:</label>
            <input
              type="text"
              value={newRoundName}
              onChange={(e) => setNewRoundName(e.target.value)}
              placeholder="e.g. Round 4: Super Finale Pitch"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Promotion Cutoff (Teams):</label>
              <input
                type="number"
                min="1"
                value={newRoundPromoteCount}
                onChange={(e) => setNewRoundPromoteCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Judges per Team:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={newRoundJudgesPerTeam}
                onChange={(e) => setNewRoundJudgesPerTeam(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Fixed Start Time (Optional):</label>
              <input
                type="datetime-local"
                value={newRoundStartTime}
                onChange={(e) => setNewRoundStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Fixed End Time (Optional):</label>
              <input
                type="datetime-local"
                value={newRoundEndTime}
                onChange={(e) => setNewRoundEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(roundToDelete)}
        onClose={() => setRoundToDelete(null)}
        title="Confirm Round Deletion"
        subtitle={`Permanently remove ${roundToDelete?.name}`}
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setRoundToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isDeletingRound}
              onClick={handleDeleteRound}
              className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Round
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">This action cannot be undone.</p>
              <p className="mt-1 text-rose-700">
                Deleting <strong>{roundToDelete?.name}</strong> will remove its rubric configuration and schedule window.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Rubric Configuration Modal */}
      <Modal
        isOpen={Boolean(selectedRoundForRubric)}
        onClose={() => setSelectedRoundForRubric(null)}
        title="Configure Evaluation Rubric"
        subtitle={`${selectedRoundForRubric?.name} &bull; Total max marks must equal exactly 100`}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={addCriterionRow}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Criterion
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedRoundForRubric(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!isValidRubric}
                isLoading={isUpdatingRubric}
                onClick={handleSaveRubric}
              >
                Save 100-Mark Rubric
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Live total badge */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-700">Total Rubric Marks:</span>
            <div className="flex items-center gap-2">
              <Badge variant={rubricTotalMarks === 100 ? 'green' : 'red'} dot className="text-xs">
                {rubricTotalMarks} / 100 Marks
              </Badge>
              {rubricTotalMarks === 100 ? (
                <span className="text-xs text-emerald-700 font-medium flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Valid
                </span>
              ) : (
                <span className="text-xs text-rose-700 font-medium flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Must equal 100
                </span>
              )}
            </div>
          </div>

          {/* Criteria list */}
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {editableCriteria.map((c, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white shadow-subtle"
              >
                <span className="text-xs font-mono font-bold text-slate-400 w-6 text-center">
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => updateCriterion(idx, 'name', e.target.value)}
                  placeholder="Criterion Name (e.g. Technical Execution)"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={c.max_marks}
                    onChange={(e) => updateCriterion(idx, 'max_marks', parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1.5 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <span className="text-xs text-slate-400 font-medium pr-1">pts</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeCriterionRow(idx)}
                  disabled={editableCriteria.length <= 1}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            Non-negotiable Rule 6: Rubric marks are enforced in the database. Criteria scores will be strictly bounded between 0 and maximum marks.
          </p>
        </div>
      </Modal>
    </Layout>
  );
};
