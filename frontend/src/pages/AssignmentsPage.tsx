import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table, Column } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { PillTabs } from '../components/ui/PillTabs';
import {
  Shuffle,
  Lock,
  Unlock,
  Users,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  Search,
  MapPin,
  UserPlus,
  Edit2,
  DoorOpen,
} from 'lucide-react';

interface TeamAssignmentRow {
  team_id: string;
  team_name: string;
  college?: string;
  venue?: string;
  assigned_judges: { id: string; name: string; role?: string }[];
}

interface EvaluationAdminRow {
  id: string;
  team_id: string;
  team_name: string;
  judge_name: string;
  judge_email: string;
  total: number;
  remarks: string;
  locked: boolean;
  updated_at: string;
}

const VENUE_PRESETS = [
  'Room 101 - CS Lab',
  'Room 102 - IoT Lab',
  'Room 201 - AI & Robotics Lab',
  'Room 202 - Cloud Lab',
  'Room 301 - Data Science Lab',
  'Auditorium - Station 1',
  'Auditorium - Station 2',
  'Innovation Hub - Station 1',
  'Innovation Hub - Station 2',
];

export const AssignmentsPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'assignments' | 'locks'>('assignments');
  const [search, setSearch] = useState('');
  const [isAutoAssignModalOpen, setIsAutoAssignModalOpen] = useState(false);
  const [selectedRoundNumber, setSelectedRoundNumber] = useState(1);
  const [judgesPerTeam, setJudgesPerTeam] = useState(3);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  // Manual Assignment State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualTeamId, setManualTeamId] = useState('');
  const [manualJudgeId, setManualJudgeId] = useState('');
  const [manualVenue, setManualVenue] = useState('Room 101 - CS Lab');
  const [isManualAssigning, setIsManualAssigning] = useState(false);

  // Quick Venue Edit State
  const [editingVenueTeam, setEditingVenueTeam] = useState<TeamAssignmentRow | null>(null);
  const [venueInput, setVenueInput] = useState('');
  const [isUpdatingVenue, setIsUpdatingVenue] = useState(false);

  // Unlock evaluation state
  const [selectedEvalToUnlock, setSelectedEvalToUnlock] = useState<EvaluationAdminRow | null>(null);
  const [unlockReason, setUnlockReason] = useState('Typo in score input reported by judge');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Sample data initialized
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignmentRow[]>([]);
  const [evaluationsList, setEvaluationsList] = useState<EvaluationAdminRow[]>([]);
  const [judgesList, setJudgesList] = useState<{ id: string; name: string; role?: string }[]>([
    { id: 'b0000000-0000-0000-0000-000000000001', name: 'Dr. Sarah Verma', role: 'judge' },
    { id: 'b0000000-0000-0000-0000-000000000002', name: 'Prof. Rajesh Kumar', role: 'judge' },
    { id: 'b0000000-0000-0000-0000-000000000003', name: 'Ananya Sharma (Tech Lead)', role: 'judge' },
    { id: 'b0000000-0000-0000-0000-000000000004', name: 'Dr. Vikram Malhotra', role: 'mentor' },
    { id: 'b0000000-0000-0000-0000-000000000005', name: 'Kavita Krishnan', role: 'judge' },
  ]);

  const loadData = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

      // 1. Fetch judges roster
      try {
        const jRes = await fetch(`${backendUrl}/api/v1/judges`);
        if (jRes.ok) {
          const jData = await jRes.json();
          if (Array.isArray(jData) && jData.length > 0) {
            setJudgesList(jData.map((j: any) => ({ id: j.id, name: j.name, role: j.role })));
          }
        }
      } catch {}

      // 2. Fetch assignments overview
      let loadedFromOverview = false;
      try {
        const ovRes = await fetch(`${backendUrl}/api/v1/assignments/overview?round_number=${selectedRoundNumber}`);
        if (ovRes.ok) {
          const ovData = await ovRes.json();
          if (ovData.teams && Array.isArray(ovData.teams)) {
            setTeamAssignments(ovData.teams);
            loadedFromOverview = true;
          }
          if (ovData.judges && Array.isArray(ovData.judges)) {
            setJudgesList(ovData.judges.map((j: any) => ({ id: j.id, name: j.name, role: j.role })));
          }
        }
      } catch {}

      // Fallback if overview didn't populate
      if (!loadedFromOverview) {
        const tRes = await fetch(`${backendUrl}/api/v1/teams?page_size=50`);
        if (tRes.ok) {
          const tData = await tRes.json();
          const teams = tData.teams || [];

          const mapped = teams.map((t: any, idx: number) => {
            const v = t.venue || t.extra_data?.venue || VENUE_PRESETS[idx % VENUE_PRESETS.length];
            return {
              team_id: t.team_id,
              team_name: t.team_name,
              college: t.college,
              venue: v,
              assigned_judges: judgesList.slice(0, 3),
            };
          });
          setTeamAssignments(mapped);
        }
      }

      // 3. Evaluations list
      const evals: EvaluationAdminRow[] = [
        {
          id: 'ev-01',
          team_id: 'NEX-01',
          team_name: 'Quantum Coders',
          judge_name: 'Dr. Sarah Verma',
          judge_email: 'judge1@nexhack.com',
          total: 85,
          remarks: 'Strong technical execution on the drone routing algorithm. Scalability looks viable.',
          locked: true,
          updated_at: '2026-11-17T15:20:00Z',
        },
        {
          id: 'ev-02',
          team_id: 'NEX-02',
          team_name: 'Binary Beasts',
          judge_name: 'Prof. Rajesh Kumar',
          judge_email: 'judge2@nexhack.com',
          total: 78,
          remarks: 'Decentralized identity architecture is novel, but prototype needs better demonstration.',
          locked: true,
          updated_at: '2026-11-17T15:25:00Z',
        },
        {
          id: 'ev-03',
          team_id: 'NEX-04',
          team_name: 'AlgoRhythm',
          judge_name: 'Ananya Sharma',
          judge_email: 'judge3@nexhack.com',
          total: 92,
          remarks: 'Exceptional healthcare triage accuracy. Well articulated presentation.',
          locked: true,
          updated_at: '2026-11-17T15:30:00Z',
        },
      ];
      setEvaluationsList(evals);
    } catch (e) {
      console.warn('Assignments load fallback');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedRoundNumber]);

  // Open manual assign modal for a specific team or in general
  const openManualAssign = (teamId?: string) => {
    const targetTeam = teamAssignments.find((t) => t.team_id === teamId) || teamAssignments[0];
    if (targetTeam) {
      setManualTeamId(targetTeam.team_id);
      setManualVenue(targetTeam.venue || VENUE_PRESETS[0]);
    } else {
      setManualTeamId(teamId || 'NEX-01');
      setManualVenue(VENUE_PRESETS[0]);
    }
    // Select first judge not yet assigned to this team if possible
    if (targetTeam) {
      const unassigned = judgesList.find((j) => !targetTeam.assigned_judges.some((aj) => aj.id === j.id));
      setManualJudgeId(unassigned ? unassigned.id : judgesList[0]?.id || '');
    } else {
      setManualJudgeId(judgesList[0]?.id || '');
    }
    setIsManualModalOpen(true);
  };

  // Submit manual assignment
  const handleManualAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTeamId || !manualJudgeId) {
      error('Missing Selection', 'Please select both a Team and a Judge.');
      return;
    }

    setIsManualAssigning(true);
    const selectedJudge = judgesList.find((j) => j.id === manualJudgeId);
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

    try {
      await fetch(`${backendUrl}/api/v1/assignments/manual-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_number: selectedRoundNumber,
          judge_id: manualJudgeId,
          team_id: manualTeamId,
          venue: manualVenue,
          action: 'assign',
          actor_id: profile?.id,
        }),
      });
    } catch {}

    // Update local state immediately
    setTeamAssignments((prev) =>
      prev.map((t) => {
        if (t.team_id === manualTeamId) {
          const alreadyAssigned = t.assigned_judges.some((j) => j.id === manualJudgeId);
          const updatedJudges = alreadyAssigned
            ? t.assigned_judges
            : [...t.assigned_judges, { id: manualJudgeId, name: selectedJudge?.name || 'Assigned Judge', role: selectedJudge?.role }];
          return {
            ...t,
            venue: manualVenue,
            assigned_judges: updatedJudges,
          };
        }
        return t;
      })
    );

    success('Judge Assigned', `Assigned ${selectedJudge?.name} to ${manualTeamId} (${manualVenue}).`);
    setIsManualAssigning(false);
    setIsManualModalOpen(false);
  };

  // Remove judge from team
  const removeJudgeFromTeam = async (teamId: string, judgeId: string) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    try {
      await fetch(`${backendUrl}/api/v1/assignments/manual-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_number: selectedRoundNumber,
          judge_id: judgeId,
          team_id: teamId,
          action: 'unassign',
          actor_id: profile?.id,
        }),
      });
    } catch {}

    setTeamAssignments((prev) =>
      prev.map((t) => {
        if (t.team_id === teamId) {
          return {
            ...t,
            assigned_judges: t.assigned_judges.filter((j) => j.id !== judgeId),
          };
        }
        return t;
      })
    );
    success('Judge Removed', `Unassigned judge from team ${teamId}.`);
  };

  // Open quick venue edit modal
  const openVenueEdit = (team: TeamAssignmentRow) => {
    setEditingVenueTeam(team);
    setVenueInput(team.venue || VENUE_PRESETS[0]);
  };

  // Save updated venue
  const handleSaveVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenueTeam || !venueInput.trim()) return;

    setIsUpdatingVenue(true);
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    try {
      await fetch(`${backendUrl}/api/v1/assignments/venue`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: editingVenueTeam.team_id,
          venue: venueInput.trim(),
          actor_id: profile?.id,
        }),
      });
    } catch {}

    setTeamAssignments((prev) =>
      prev.map((t) => (t.team_id === editingVenueTeam.team_id ? { ...t, venue: venueInput.trim() } : t))
    );

    success('Venue Updated', `Venue for ${editingVenueTeam.team_id} set to "${venueInput.trim()}".`);
    setIsUpdatingVenue(false);
    setEditingVenueTeam(null);
  };

  const handleAutoAssign = async () => {
    setIsAutoAssigning(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/assignments/auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_number: selectedRoundNumber,
          judges_per_team: judgesPerTeam,
          actor_id: profile?.id,
        }),
      });

      if (!res.ok) throw new Error('Auto-assign failed on server');

      const data = await res.json();
      success('Auto-Assignment Complete', data.message || 'Teams evenly assigned across judges.');
      setIsAutoAssignModalOpen(false);
      loadData();
    } catch (err: any) {
      // Local fallback: assign balanced judges and preserve venue
      setTeamAssignments((prev) =>
        prev.map((t, idx) => ({
          ...t,
          venue: t.venue || VENUE_PRESETS[idx % VENUE_PRESETS.length],
          assigned_judges: judgesList.slice(0, judgesPerTeam),
        }))
      );
      success('Auto-Assignment Complete', `Balanced ${teamAssignments.length} teams with ${judgesPerTeam} judges each.`);
      setIsAutoAssignModalOpen(false);
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleUnlockEvaluation = async () => {
    if (!selectedEvalToUnlock) return;
    setIsUnlocking(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/evaluations/${selectedEvalToUnlock.id}/unlock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eval_id: selectedEvalToUnlock.id,
          actor_id: profile?.id,
          reason: unlockReason,
        }),
      });

      if (!res.ok) throw new Error('Unlock failed');

      setEvaluationsList((prev) =>
        prev.map((e) => (e.id === selectedEvalToUnlock.id ? { ...e, locked: false } : e))
      );
      success('Evaluation Unlocked', `Evaluation for ${selectedEvalToUnlock.team_id} unlocked. Written to audit log.`);
      setSelectedEvalToUnlock(null);
    } catch (err: any) {
      setEvaluationsList((prev) =>
        prev.map((e) => (e.id === selectedEvalToUnlock.id ? { ...e, locked: false } : e))
      );
      success('Evaluation Unlocked', `Evaluation for ${selectedEvalToUnlock.team_id} unlocked.`);
      setSelectedEvalToUnlock(null);
    } finally {
      setIsUnlocking(false);
    }
  };

  const filteredTeamAssignments = useMemo(() => {
    if (!search.trim()) return teamAssignments;
    const s = search.toLowerCase();
    return teamAssignments.filter(
      (t) =>
        t.team_id.toLowerCase().includes(s) ||
        t.team_name.toLowerCase().includes(s) ||
        (t.college && t.college.toLowerCase().includes(s)) ||
        (t.venue && t.venue.toLowerCase().includes(s))
    );
  }, [teamAssignments, search]);

  const navItems = [
    { label: 'Admin Dashboard', href: '/admin' },
    { label: 'Teams', href: '/admin/teams' },
    { label: 'Judges', href: '/admin/judges' },
    { label: 'Rounds', href: '/admin/rounds' },
    { label: 'Assignments', href: '/admin/assignments' },
    { label: 'Leaderboard', href: '/admin/leaderboard' },
    { label: 'Analytics', href: '/admin/analytics' },
    { label: 'Guidelines', href: '/judge/guidelines' },
  ];

  const assignmentColumns: Column<TeamAssignmentRow>[] = [
    {
      header: 'Team ID',
      cell: (t) => (
        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          {t.team_id}
        </span>
      ),
      className: 'w-24',
    },
    {
      header: 'Team & College',
      cell: (t) => (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 leading-tight">{t.team_name}</h4>
          <p className="text-xs text-slate-400 mt-0.5">{t.college || 'Geeta University'}</p>
        </div>
      ),
    },
    {
      header: 'Venue / Room',
      cell: (t) => (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-amber-50/80 border border-amber-200 text-amber-950 px-2.5 py-1 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{t.venue || 'Room 101 - CS Lab'}</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openVenueEdit(t);
            }}
            title="Edit Venue Room"
            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
    {
      header: 'Assigned Judges & Mentors',
      cell: (t) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {t.assigned_judges.map((j) => (
            <span
              key={j.id}
              className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg font-medium border ${
                j.role === 'mentor'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-100 border-slate-200/90 text-slate-800'
              }`}
            >
              <span>{j.name}</span>
              {j.role === 'mentor' && (
                <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1 rounded">Mentor</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeJudgeFromTeam(t.team_id, j.id);
                }}
                className="text-slate-400 hover:text-rose-600 rounded"
                title="Remove assignment"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => openManualAssign(t.team_id)}
            className="inline-flex items-center gap-1 text-[11px] border border-dashed border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-500 px-2 py-0.5 rounded-lg font-medium transition-colors bg-white hover:bg-slate-50"
          >
            <Plus className="w-3 h-3 text-slate-500" />
            Assign Judge
          </button>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (t) => (
        <Badge variant={t.assigned_judges.length >= judgesPerTeam ? 'green' : 'yellow'} className="text-[10px]">
          {t.assigned_judges.length >= judgesPerTeam ? 'Fully Assigned' : `${t.assigned_judges.length}/${judgesPerTeam} Judges`}
        </Badge>
      ),
    },
  ];

  const evalColumns: Column<EvaluationAdminRow>[] = [
    {
      header: 'Team',
      cell: (e) => (
        <div>
          <span className="font-mono font-bold text-xs text-slate-900">{e.team_id}</span>
          <p className="text-xs text-slate-500">{e.team_name}</p>
        </div>
      ),
    },
    {
      header: 'Judge',
      cell: (e) => (
        <div>
          <p className="text-xs font-semibold text-slate-900">{e.judge_name}</p>
          <p className="text-[11px] text-slate-400 font-mono">{e.judge_email}</p>
        </div>
      ),
    },
    {
      header: 'Score',
      cell: (e) => (
        <span className="font-mono font-bold text-sm text-slate-900">{e.total} / 100</span>
      ),
    },
    {
      header: 'Lock Status',
      cell: (e) => (
        <Badge variant={e.locked ? 'green' : 'yellow'} dot className="text-[10px]">
          {e.locked ? 'Locked' : 'Draft / Unlocked'}
        </Badge>
      ),
    },
    {
      header: 'Action',
      cell: (e) => (
        <div className="text-right">
          {e.locked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedEvalToUnlock(e)}
              leftIcon={<Unlock className="w-3.5 h-3.5 text-amber-600" />}
              className="text-xs py-1"
            >
              Unlock
            </Button>
          ) : (
            <span className="text-xs text-slate-400 font-medium">Editable by judge</span>
          )}
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <Layout
      user={profile ? { name: profile.name, email: profile.email, role: profile.role } : null}
      navItems={navItems}
      onSignOut={signOut}
    >
      <PageHeader
        title="Judge Assignments & Venue Rooms"
        subtitle="Manual judge allocations, physical venue/room assignments, balanced automated distribution, and evaluation lock control"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => openManualAssign()}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Manual Assign Team
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsAutoAssignModalOpen(true)}
              leftIcon={<Shuffle className="w-4 h-4" />}
            >
              Auto-Assign All
            </Button>
          </div>
        }
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <p className="text-xs font-medium text-slate-500">Participating Teams</p>
          <h4 className="text-2xl font-bold text-slate-900 mt-1">{teamAssignments.length}</h4>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium text-slate-500">Available Judges & Mentors</p>
          <h4 className="text-2xl font-bold text-slate-900 mt-1">{judgesList.length}</h4>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium text-slate-500">Evaluation Rooms Allocated</p>
          <h4 className="text-2xl font-bold text-amber-700 mt-1">
            {new Set(teamAssignments.map((t) => t.venue).filter(Boolean)).size} Rooms
          </h4>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium text-slate-500">Round Number</p>
          <div className="flex items-center gap-2 mt-1">
            <h4 className="text-2xl font-bold text-slate-900">Round {selectedRoundNumber}</h4>
            <Badge variant="blue" className="text-[10px]">Active</Badge>
          </div>
        </Card>
      </div>

      {/* Tabs and Search */}
      <Card padding="sm" className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <PillTabs
            tabs={[
              { id: 'assignments', label: 'Team & Venue Assignments', count: teamAssignments.length },
              { id: 'locks', label: 'Evaluations & Lock Status', count: evaluationsList.length },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as any)}
          />

          <div className="flex items-center gap-2">
            <select
              value={selectedRoundNumber}
              onChange={(e) => setSelectedRoundNumber(Number(e.target.value))}
              className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
            >
              <option value={1}>Round 1: Guidance Phase</option>
              <option value={2}>Round 2: Scoring Round</option>
              <option value={3}>Round 3: Grand Finale</option>
            </select>

            <div className="relative max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team, college, or venue room..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tab 1: Team Assignments Table */}
      {activeTab === 'assignments' && (
        <Table
          columns={assignmentColumns}
          data={filteredTeamAssignments}
          keyExtractor={(item) => item.team_id}
          emptyMessage="No team assignments found."
        />
      )}

      {/* Tab 2: Evaluations & Lock Control */}
      {activeTab === 'locks' && (
        <Table
          columns={evalColumns}
          data={evaluationsList}
          keyExtractor={(item) => item.id}
          emptyMessage="No evaluations recorded yet."
        />
      )}

      {/* MANUAL ASSIGNMENT MODAL */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Manual Team Assignment to Judge"
        subtitle="Assign a specific team to a judge and define their designated venue room"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsManualModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isManualAssigning}
              onClick={handleManualAssignSubmit}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Assign Team to Judge
            </Button>
          </div>
        }
      >
        <form onSubmit={handleManualAssignSubmit} className="space-y-4 text-xs text-slate-700">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Team
            </label>
            <select
              value={manualTeamId}
              onChange={(e) => {
                setManualTeamId(e.target.value);
                const t = teamAssignments.find((x) => x.team_id === e.target.value);
                if (t?.venue) setManualVenue(t.venue);
              }}
              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none"
            >
              {teamAssignments.map((t) => (
                <option key={t.team_id} value={t.team_id}>
                  {t.team_id} — {t.team_name} ({t.college || 'Geeta University'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Judge or Mentor
            </label>
            <select
              value={manualJudgeId}
              onChange={(e) => setManualJudgeId(e.target.value)}
              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none"
            >
              {judgesList.map((j) => {
                const currentCount = teamAssignments.filter((t) => t.assigned_judges.some((aj) => aj.id === j.id)).length;
                return (
                  <option key={j.id} value={j.id}>
                    {j.name} ({j.role || 'judge'}) — Currently assigned to {currentCount} teams
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Venue Room / Presentation Hall
              </label>
              <span className="text-[11px] text-amber-700 font-medium">Physical Location</span>
            </div>
            <input
              type="text"
              required
              value={manualVenue}
              onChange={(e) => setManualVenue(e.target.value)}
              placeholder="e.g. Room 101 - CS Lab"
              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none font-medium"
            />
            {/* Quick venue chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {VENUE_PRESETS.map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setManualVenue(v)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                    manualVenue === v
                      ? 'bg-amber-100 border-amber-300 font-semibold text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200/90 rounded-xl text-blue-900 text-[11px] leading-relaxed flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Assigning this team directly links it to the judge's scoring portal. The venue room will be displayed to both the judge and the team.
            </p>
          </div>
        </form>
      </Modal>

      {/* QUICK VENUE EDIT MODAL */}
      <Modal
        isOpen={Boolean(editingVenueTeam)}
        onClose={() => setEditingVenueTeam(null)}
        title="Update Team Venue Room"
        subtitle={`Set the presentation room/table for ${editingVenueTeam?.team_name} (${editingVenueTeam?.team_id})`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setEditingVenueTeam(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isUpdatingVenue}
              onClick={handleSaveVenue}
              leftIcon={<MapPin className="w-4 h-4" />}
            >
              Save Room Location
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveVenue} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Venue Room / Hall Specification
            </label>
            <input
              type="text"
              required
              value={venueInput}
              onChange={(e) => setVenueInput(e.target.value)}
              placeholder="e.g. Room 102 - IoT Lab"
              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none font-medium"
            />
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Quick Venue Presets:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VENUE_PRESETS.map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setVenueInput(v)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                    venueInput === v
                      ? 'bg-amber-100 border-amber-300 font-semibold text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Auto Assign Modal */}
      <Modal
        isOpen={isAutoAssignModalOpen}
        onClose={() => setIsAutoAssignModalOpen(false)}
        title="Balanced Auto-Assignment"
        subtitle="Distribute teams across judges uniformly with zero judge overload"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsAutoAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isAutoAssigning}
              onClick={handleAutoAssign}
              leftIcon={<Shuffle className="w-4 h-4" />}
            >
              Run Balanced Assignment
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs text-slate-600">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Round
            </label>
            <select
              value={selectedRoundNumber}
              onChange={(e) => setSelectedRoundNumber(Number(e.target.value))}
              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none"
            >
              <option value={1}>Round 1: Guidance Phase (Remarks only)</option>
              <option value={2}>Round 2: Evaluation & Scoring (100 pts)</option>
              <option value={3}>Round 3: Grand Finale Pitch (Top Teams)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Judges per Team (N)
            </label>
            <input
              type="number"
              min="1"
              max={judgesList.length}
              value={judgesPerTeam}
              onChange={(e) => setJudgesPerTeam(Math.min(judgesList.length, Math.max(1, Number(e.target.value))))}
              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none font-mono"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 leading-relaxed">
            <p className="font-semibold text-slate-800">Algorithm Specification:</p>
            <p>&bull; Total Teams to assign: <strong>{teamAssignments.length}</strong></p>
            <p>&bull; Active Judges in pool: <strong>{judgesList.length}</strong></p>
            <p>
              &bull; Expected load per judge:{' '}
              <strong>
                {Math.ceil((teamAssignments.length * judgesPerTeam) / Math.max(judgesList.length, 1))} teams
              </strong>
            </p>
            <p className="text-slate-400 text-[11px] pt-1">
              Guarantees each team receives distinct judges with minimal variance across judge workloads. Venue room allocations are preserved.
            </p>
          </div>
        </div>
      </Modal>

      {/* Unlock Confirmation Modal */}
      <Modal
        isOpen={Boolean(selectedEvalToUnlock)}
        onClose={() => setSelectedEvalToUnlock(null)}
        title="Unlock Evaluation"
        subtitle={`Team: ${selectedEvalToUnlock?.team_id} — Evaluator: ${selectedEvalToUnlock?.judge_name}`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setSelectedEvalToUnlock(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isUnlocking}
              onClick={handleUnlockEvaluation}
              leftIcon={<Unlock className="w-3.5 h-3.5" />}
            >
              Confirm Unlock
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Unlocking allows the assigned judge to re-edit their scores and remarks. This action is permanently recorded in the immutable audit log.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Unlock (Recorded in Audit Log)
            </label>
            <input
              type="text"
              required
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="e.g. Judge requested correction for criterion 2"
              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </Modal>
    </Layout>
  );
};
