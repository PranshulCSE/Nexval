import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table, Column } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PillTabs } from '../components/ui/PillTabs';
import { TeamUploadModal } from '../components/teams/TeamUploadModal';
import { Search, Plus, Filter, Users, School, Layers, CheckCircle2, XCircle, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { TeamFeedbackModal } from '../components/TeamFeedbackModal';

export interface TeamRecord {
  id: string;
  team_id: string;
  team_name: string;
  college?: string;
  members: string[] | string;
  extra_data?: Record<string, any>;
  status: 'active' | 'eliminated';
  current_round: number;
  created_at?: string;
}

const INITIAL_DEMO_TEAMS: TeamRecord[] = [
  {
    id: 't-001',
    team_id: 'NEX-01',
    team_name: 'Quantum Coders',
    college: 'Geeta University',
    members: ['Aarav Sharma', 'Pooja Patel', 'Rohan Gupta'],
    extra_data: { project: 'AI Disaster Response', track: 'AI & ML' },
    status: 'active',
    current_round: 1,
  },
  {
    id: 't-002',
    team_id: 'NEX-02',
    team_name: 'Binary Beasts',
    college: 'IIT Delhi',
    members: ['Vikram Malhotra', 'Sneha Rao'],
    extra_data: { project: 'Decentralized Identity', track: 'Web3' },
    status: 'active',
    current_round: 1,
  },
  {
    id: 't-003',
    team_id: 'NEX-03',
    team_name: 'Cyber Hawks',
    college: 'DTU',
    members: ['Kabir Singh', 'Neha Verma', 'Aditya Joshi'],
    extra_data: { project: 'Smart Grid Monitor', track: 'IoT' },
    status: 'active',
    current_round: 1,
  },
  {
    id: 't-004',
    team_id: 'NEX-04',
    team_name: 'AlgoRhythm',
    college: 'Geeta University',
    members: ['Ananya Roy', 'Karan Mehra'],
    extra_data: { project: 'Automated Healthcare Triage', track: 'Healthcare' },
    status: 'active',
    current_round: 1,
  },
  {
    id: 't-005',
    team_id: 'NEX-05',
    team_name: 'Code Catalyst',
    college: 'NSUT',
    members: ['Meera Nair', 'Devansh Sen'],
    extra_data: { project: 'FinTech Fraud Shield', track: 'Fintech' },
    status: 'active',
    current_round: 1,
  },
  {
    id: 't-006',
    team_id: 'NEX-06',
    team_name: 'NeuroBytes',
    college: 'Thapar University',
    members: ['Simran Kaur', 'Harsh Vardhan'],
    extra_data: { project: 'Assistive Vision AI', track: 'Accessibility' },
    status: 'active',
    current_round: 1,
  },
  {
    id: 't-007',
    team_id: 'NEX-07',
    team_name: 'Glitch Hunters',
    college: 'Chitkara University',
    members: ['Arjun Kapoor', 'Bhavna Joshi'],
    extra_data: { project: 'AgriDrone Crop Scout', track: 'AgriTech' },
    status: 'active',
    current_round: 1,
  },
  {
    id: 't-008',
    team_id: 'NEX-08',
    team_name: 'DevForge',
    college: 'Geeta University',
    members: ['Rishi Prasad', 'Tanvi Bhatia'],
    extra_data: { project: 'Green Logistics Route Optimizer', track: 'CleanTech' },
    status: 'active',
    current_round: 1,
  },
  {
    id: 't-009',
    team_id: 'NEX-09',
    team_name: 'ByteBenders',
    college: 'PEC Chandigarh',
    members: ['Deepak Saini', 'Ishita Grover'],
    extra_data: { project: 'Campus Safety Guardian', track: 'EdTech' },
    status: 'eliminated',
    current_round: 1,
  },
  {
    id: 't-010',
    team_id: 'NEX-10',
    team_name: 'Apex Legends',
    college: 'Kurukshetra University',
    members: ['Naveen Hooda', 'Poonam Rani'],
    extra_data: { project: 'Clean Energy Microgrid', track: 'CleanTech' },
    status: 'active',
    current_round: 1,
  },
];

export const TeamsPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { success, error } = useToast();

  const [teams, setTeams] = useState<TeamRecord[]>(INITIAL_DEMO_TEAMS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'eliminated'>('all');
  const [roundFilter, setRoundFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFeedbackTeamId, setSelectedFeedbackTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pageSize = 8;

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/teams?page_size=100`);
      if (res.ok) {
        const data = await res.json();
        if (data.teams && data.teams.length > 0) {
          // Merge with any locally imported teams
          const localStored = JSON.parse(localStorage.getItem('nexhack_custom_teams') || '[]');
          const all = [...data.teams, ...localStored];
          // deduplicate by team_id
          const uniqueMap = new Map();
          all.forEach((item) => uniqueMap.set(item.team_id, item));
          setTeams(Array.from(uniqueMap.values()));
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Backend fetch failed, using stored local demo teams');
    }

    const localStored = JSON.parse(localStorage.getItem('nexhack_custom_teams') || '[]');
    const merged = [...INITIAL_DEMO_TEAMS, ...localStored];
    const uniqueMap = new Map();
    merged.forEach((item) => uniqueMap.set(item.team_id, item));
    setTeams(Array.from(uniqueMap.values()));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const toggleTeamStatus = async (team: TeamRecord) => {
    const newStatus: 'active' | 'eliminated' = team.status === 'active' ? 'eliminated' : 'active';
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      await fetch(`${backendUrl}/api/v1/teams/${team.team_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, actor_id: profile?.id }),
      });
    } catch (e) {
      console.warn('Backend update fallback');
    }

    setTeams((prev) =>
      prev.map((t) => (t.team_id === team.team_id ? { ...t, status: newStatus } : t))
    );

    success('Status Updated', `Team ${team.team_id} marked as ${newStatus}.`);
  };

  // Filtered and paginated teams
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      // Search
      const matchSearch =
        !search ||
        t.team_id.toLowerCase().includes(search.toLowerCase()) ||
        t.team_name.toLowerCase().includes(search.toLowerCase()) ||
        (t.college && t.college.toLowerCase().includes(search.toLowerCase()));

      // Status
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;

      // Round
      const matchRound =
        roundFilter === 'all' || String(t.current_round) === roundFilter;

      return matchSearch && matchStatus && matchRound;
    });
  }, [teams, search, statusFilter, roundFilter]);

  const totalPages = Math.ceil(filteredTeams.length / pageSize) || 1;
  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTeams.slice(start, start + pageSize);
  }, [filteredTeams, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, roundFilter]);

  const statusTabs = [
    { id: 'all', label: 'All Teams', count: teams.length },
    { id: 'active', label: 'Active', count: teams.filter((t) => t.status === 'active').length },
    { id: 'eliminated', label: 'Eliminated', count: teams.filter((t) => t.status === 'eliminated').length },
  ];

  const roundTabs = [
    { id: 'all', label: 'All Rounds' },
    { id: '1', label: 'Round 1' },
    { id: '2', label: 'Round 2' },
    { id: '3', label: 'Round 3' },
  ];

  const navItems = [
    { label: 'Admin Dashboard', href: '/admin' },
    { label: 'Teams', href: '/admin/teams' },
    { label: 'Judges', href: '/admin/judges' },
    { label: 'Rounds', href: '/admin/rounds' },
    { label: 'Leaderboard', href: '/admin/leaderboard' },
    { label: 'Analytics', href: '/admin/analytics' },
  ];

  const columns: Column<TeamRecord>[] = [
    {
      header: 'Team ID',
      cell: (t) => (
        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
          {t.team_id}
        </span>
      ),
      className: 'w-28',
    },
    {
      header: 'Team & College',
      cell: (t) => (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 leading-tight">{t.team_name}</h4>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <School className="w-3 h-3 text-slate-400" />
            {t.college || 'Geeta University'}
          </p>
          {t.extra_data?.project && (
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Project: <span className="text-slate-600">{t.extra_data.project}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Members',
      cell: (t) => {
        const memArray = Array.isArray(t.members)
          ? t.members
          : typeof t.members === 'string'
          ? [t.members]
          : [];
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {memArray.map((m, idx) => (
              <span
                key={idx}
                className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium"
              >
                {m}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Round',
      cell: (t) => (
        <Badge variant={t.current_round === 1 ? 'blue' : 'green'} className="text-[10px]">
          Round {t.current_round}
        </Badge>
      ),
    },
    {
      header: 'Status',
      cell: (t) => (
        <Badge variant={t.status === 'active' ? 'green' : 'red'} dot className="text-[10px]">
          {t.status}
        </Badge>
      ),
    },
    {
      header: 'Action',
      cell: (t) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFeedbackTeamId(t.team_id)}
            leftIcon={<MessageSquare className="w-3.5 h-3.5 text-slate-500" />}
            className="text-xs py-1"
          >
            Feedback
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleTeamStatus(t)}
            className="text-xs py-1"
          >
            {t.status === 'active' ? 'Eliminate' : 'Reactivate'}
          </Button>
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
        title="Teams Directory"
        subtitle="Manage participating hackathon teams, review rosters, and upload CSV/Excel files"
        action={
          <Button
            variant="primary"
            onClick={() => setIsUploadOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Upload Teams CSV/Excel
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card padding="sm" className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by team ID, name, or university..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all text-slate-900"
            />
          </div>

          {/* Status Pills */}
          <PillTabs
            tabs={statusTabs}
            activeTab={statusFilter}
            onChange={(tabId) => setStatusFilter(tabId as any)}
          />
        </div>

        {/* Round Filter Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Round Filter:
          </span>
          <PillTabs
            tabs={roundTabs}
            activeTab={roundFilter}
            onChange={setRoundFilter}
          />
        </div>
      </Card>

      {/* Teams Table */}
      <Table
        columns={columns}
        data={paginatedTeams}
        keyExtractor={(item) => item.team_id}
        isLoading={isLoading}
        emptyMessage="No teams match the selected search or filter criteria."
      />

      {/* Pagination Bar */}
      {filteredTeams.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 px-2 text-xs text-slate-500 font-medium">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredTeams.length)} of {filteredTeams.length} teams
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* 2-Step CSV/Excel Upload Modal */}
      <TeamUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={fetchTeams}
      />

      {/* Team Feedback Modal (Round 1 Guidance) */}
      <TeamFeedbackModal
        isOpen={Boolean(selectedFeedbackTeamId)}
        onClose={() => setSelectedFeedbackTeamId(null)}
        teamId={selectedFeedbackTeamId}
        isAdmin={profile?.role === 'admin'}
      />
    </Layout>
  );
};
