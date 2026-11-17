import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PillTabs } from '../components/ui/PillTabs';
import { EmptyState } from '../components/ui/EmptyState';
import { Users, Clock, CheckCircle2, FileEdit, AlertCircle, Search, ArrowRight, ShieldCheck, Sparkles, School } from 'lucide-react';

interface AssignedTeamItem {
  id: string;
  team_id: string;
  team_name: string;
  college?: string;
  members?: string[];
  extra_data?: Record<string, any>;
  evaluation_status: 'pending' | 'draft' | 'submitted';
  evaluation?: {
    id: string;
    total: number;
    locked: boolean;
    remarks: string;
  };
}

export const JudgeDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [assignedTeams, setAssignedTeams] = useState<AssignedTeamItem[]>([]);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [serverTime, setServerTime] = useState<string>('');
  const [progressLabel, setProgressLabel] = useState<string>('0/0 done');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'draft' | 'submitted'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Live countdown timer based on server time
  const [countdownText, setCountdownText] = useState('24h 00m 00s');

  const fetchAssignedTeams = async () => {
    if (!profile) return;
    setIsLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/assignments/my?judge_id=${profile.id}`);
      if (res.ok) {
        const data = await res.json();
        setAssignedTeams(data.teams || []);
        setActiveRound(data.round);
        setServerTime(data.server_time);
        setProgressLabel(data.progress_label || '0/0 done');
        setProgressPercent(data.progress_percent || 0);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Backend assignments fetch fallback');
    }

    // Demo fallback: assign 8 sample teams to the current judge
    const localTeams = JSON.parse(localStorage.getItem('nexhack_custom_teams') || '[]');
    const demoPool = localTeams.length > 0 ? localTeams : [
      { team_id: 'NEX-01', team_name: 'Quantum Coders', college: 'Geeta University', extra_data: { track: 'AI & ML' } },
      { team_id: 'NEX-02', team_name: 'Binary Beasts', college: 'IIT Delhi', extra_data: { track: 'Web3' } },
      { team_id: 'NEX-03', team_name: 'Cyber Hawks', college: 'DTU', extra_data: { track: 'IoT' } },
      { team_id: 'NEX-04', team_name: 'AlgoRhythm', college: 'Geeta University', extra_data: { track: 'Healthcare' } },
      { team_id: 'NEX-05', team_name: 'Code Catalyst', college: 'NSUT', extra_data: { track: 'Fintech' } },
      { team_id: 'NEX-06', team_name: 'NeuroBytes', college: 'Thapar University', extra_data: { track: 'Accessibility' } },
      { team_id: 'NEX-07', team_name: 'Glitch Hunters', college: 'Chitkara University', extra_data: { track: 'AgriTech' } },
      { team_id: 'NEX-08', team_name: 'DevForge', college: 'Geeta University', extra_data: { track: 'CleanTech' } },
    ];

    const mapped: AssignedTeamItem[] = demoPool.slice(0, 8).map((t: any, idx: number) => ({
      id: `t-${idx+1}`,
      team_id: t.team_id,
      team_name: t.team_name,
      college: t.college || 'Geeta University',
      extra_data: t.extra_data,
      evaluation_status: idx === 0 ? 'submitted' : idx === 1 ? 'draft' : 'pending',
    }));

    setAssignedTeams(mapped);
    setActiveRound({
      id: '11111111-0000-0000-0000-000000000001',
      number: 1,
      name: 'Round 1: Guidance Phase',
      type: 'remarks',
      status: 'live',
    });
    setServerTime(new Date().toISOString());
    setProgressLabel('1/8 done');
    setProgressPercent(12);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAssignedTeams();
  }, [profile]);

  // Non-negotiable Rule 3: Use SERVER time for round timer, never client clock
  useEffect(() => {
    if (!serverTime) return;
    const serverBaseDate = new Date(serverTime).getTime();
    const localStart = Date.now();

    const interval = setInterval(() => {
      // Calculate current server timestamp
      const elapsed = Date.now() - localStart;
      const currentServerTime = serverBaseDate + elapsed;

      // 24-hour hackathon end target
      const targetEnd = serverBaseDate + 24 * 60 * 60 * 1000;
      const diff = Math.max(0, targetEnd - currentServerTime);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownText(
        `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [serverTime]);

  const filteredTeams = useMemo(() => {
    return assignedTeams.filter((item) => {
      const matchSearch =
        !search ||
        item.team_id.toLowerCase().includes(search.toLowerCase()) ||
        item.team_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.college && item.college.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'all' || item.evaluation_status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [assignedTeams, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: assignedTeams.length,
      pending: assignedTeams.filter((t) => t.evaluation_status === 'pending').length,
      draft: assignedTeams.filter((t) => t.evaluation_status === 'draft').length,
      submitted: assignedTeams.filter((t) => t.evaluation_status === 'submitted').length,
    };
  }, [assignedTeams]);

  const tabs = [
    { id: 'all', label: 'All Assigned', count: counts.all },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'draft', label: 'Draft In Progress', count: counts.draft },
    { id: 'submitted', label: 'Submitted & Locked', count: counts.submitted },
  ];

  const navItems = [
    { label: 'My Teams', href: '/judge' },
    { label: 'Evaluation Guidelines', href: '/judge/guidelines' },
  ];

  const handleOpenEvaluate = (team: AssignedTeamItem) => {
    const rId = activeRound?.id || '11111111-0000-0000-0000-000000000001';
    navigate(`/judge/evaluate/${rId}/${team.team_id}`);
  };

  return (
    <Layout
      user={profile ? { name: profile.name, email: profile.email, role: profile.role } : null}
      navItems={navItems}
      onSignOut={signOut}
    >
      <PageHeader
        title="Judge Evaluation Hub"
        subtitle={`Welcome, ${profile?.name || 'Evaluator'}. Evaluate your assigned teams for NexHack 2.0.`}
        action={
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-800 shadow-subtle">
            <Clock className="w-4 h-4 text-slate-500 animate-pulse" />
            <span>Time Left: {countdownText}</span>
          </div>
        }
      />

      {/* Progress & Round Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Active Round Info */}
        <Card padding="md" className="md:col-span-2 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="green" dot className="text-[10px]">
                  Round Active
                </Badge>
                <Badge variant={activeRound?.type === 'remarks' ? 'blue' : 'yellow'} className="text-[10px]">
                  {activeRound?.type === 'remarks' ? 'Guidance Remarks' : '100-Mark Scoring'}
                </Badge>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Server Clock Active</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {activeRound?.name || 'Round 1: Guidance Phase'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {activeRound?.type === 'remarks'
                ? 'Mentors and judges give qualitative remarks directly to teams. No scores are given, and all teams advance.'
                : 'Score each team across the 5 rubric criteria. Marks will be verified and totaled server-side.'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-slate-600">Your Evaluation Progress</span>
              <strong className="text-slate-900 font-mono">{progressLabel}</strong>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
              <div
                className="bg-[#0F172A] h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Status Count Summary */}
        <Card padding="md" className="bg-slate-50/60 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Status Breakdown
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Submitted & Locked
                </span>
                <span className="font-bold text-slate-900 font-mono">{counts.submitted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <FileEdit className="w-3.5 h-3.5 text-amber-600" /> Draft In Progress
                </span>
                <span className="font-bold text-slate-900 font-mono">{counts.draft}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Pending Evaluation
                </span>
                <span className="font-bold text-slate-900 font-mono">{counts.pending}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-400">
            Assigned to {counts.all} teams
          </div>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card padding="sm" className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assigned teams..."
              className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-400 focus:outline-none"
            />
          </div>

          <PillTabs
            tabs={tabs}
            activeTab={statusFilter}
            onChange={(id) => setStatusFilter(id as any)}
          />
        </div>
      </Card>

      {/* Assigned Teams Grid */}
      {filteredTeams.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6 stroke-[1.5]" />}
          title="No teams match filter"
          description="Try selecting a different status filter or clearing your search term."
          actionText="Show All Assigned Teams"
          onAction={() => {
            setSearch('');
            setStatusFilter('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => {
            const isSubmitted = team.evaluation_status === 'submitted';
            const isDraft = team.evaluation_status === 'draft';

            return (
              <div
                key={team.team_id}
                onClick={() => handleOpenEvaluate(team)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSubmitted
                    ? 'bg-white border-slate-200 hover:border-slate-400 shadow-subtle'
                    : isDraft
                    ? 'bg-white border-amber-200/80 hover:border-amber-400 shadow-subtle'
                    : 'bg-white border-slate-200 hover:border-slate-900 shadow-subtle'
                }`}
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {team.team_id}
                    </span>

                    {isSubmitted && (
                      <Badge variant="green" dot className="text-[10px]">
                        Submitted
                      </Badge>
                    )}
                    {isDraft && (
                      <Badge variant="yellow" dot className="text-[10px]">
                        Draft
                      </Badge>
                    )}
                    {!isSubmitted && !isDraft && (
                      <Badge variant="gray" className="text-[10px]">
                        Pending
                      </Badge>
                    )}
                  </div>

                  {/* Team details */}
                  <h4 className="text-base font-bold text-slate-900 tracking-tight leading-snug group-hover:text-slate-950">
                    {team.team_name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <School className="w-3.5 h-3.5 text-slate-400" />
                    {team.college || 'Geeta University'}
                  </p>

                  {team.extra_data?.project && (
                    <p className="text-xs text-slate-600 mt-2 font-medium line-clamp-1">
                      Project: <span className="text-slate-500">{team.extra_data.project}</span>
                    </p>
                  )}
                </div>

                {/* Bottom button / total score */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {isSubmitted && team.evaluation?.total !== undefined ? (
                    <span className="text-xs font-mono font-bold text-slate-800">
                      Score: {team.evaluation.total} / 100
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {isDraft ? 'Draft In Progress' : 'Not started'}
                    </span>
                  )}

                  <span className="text-xs font-semibold text-slate-900 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                    {isSubmitted ? 'View Evaluation' : isDraft ? 'Continue Draft' : 'Start Evaluation'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};
