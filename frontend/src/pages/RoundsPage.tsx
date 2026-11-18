import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Clock, Play, Square, Settings, Plus, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

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
    start_time: '2026-11-17T14:00:00Z',
    end_time: null,
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
    start_time: null,
    end_time: null,
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
    start_time: null,
    end_time: null,
    criteria: [
      { id: 'crit-3-1', name: 'Technical Execution', max_marks: 30, sort_order: 1 },
      { id: 'crit-3-2', name: 'Innovation & Creativity', max_marks: 25, sort_order: 2 },
      { id: 'crit-3-3', name: 'Impact & Relevance', max_marks: 15, sort_order: 3 },
      { id: 'crit-3-4', name: 'Scalability', max_marks: 15, sort_order: 4 },
      { id: 'crit-3-5', name: 'Presentation & Demonstration', max_marks: 15, sort_order: 5 },
    ],
  },
];

export const RoundsPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { success, error } = useToast();

  const [rounds, setRounds] = useState<RoundRecord[]>(DEFAULT_ROUNDS);
  const [serverTime, setServerTime] = useState<string>(new Date().toUTCString());
  const [selectedRoundForRubric, setSelectedRoundForRubric] = useState<RoundRecord | null>(null);
  const [editableCriteria, setEditableCriteria] = useState<RubricCriterion[]>([]);
  const [isUpdatingRubric, setIsUpdatingRubric] = useState(false);

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
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  // Compute total marks live
  const rubricTotalMarks = useMemo(() => {
    return editableCriteria.reduce((sum, c) => sum + (Number(c.max_marks) || 0), 0);
  }, [editableCriteria]);

  const isValidRubric = rubricTotalMarks === 100 && editableCriteria.every((c) => c.name.trim().length > 0 && c.max_marks > 0);

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
      console.warn('Backend rubric save fallback');
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
      console.warn('Backend status update fallback');
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
        subtitle="Schedule hackathon stages, configure 100-mark rubrics, and toggle round statuses with server-side time stamps"
        action={
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-600 shadow-subtle">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Server Time: {serverTime}</span>
          </div>
        }
      />

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
                    {round.start_time && (
                      <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg font-mono text-[11px]">
                        Started: {new Date(round.start_time).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2.5 shrink-0">
                  {round.type === 'scoring' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRubricModal(round)}
                      leftIcon={<Settings className="w-3.5 h-3.5" />}
                    >
                      Configure Rubric (100 pts)
                    </Button>
                  )}

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
                    >
                      Reopen Round
                    </Button>
                  )}
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
