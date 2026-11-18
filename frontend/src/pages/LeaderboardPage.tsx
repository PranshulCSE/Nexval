import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table, Column } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { PillTabs } from '../components/ui/PillTabs';
import { Trophy, Award, Radio, Users, CheckCircle2, AlertTriangle, Clock, Search, School, ArrowRight, Sparkles, AlertCircle, Download } from 'lucide-react';


interface LeaderboardItem {
  rank: number;
  team_id: string;
  team_name: string;
  college?: string;
  track?: string;
  status: 'active' | 'eliminated';
  current_round: number;
  avg_total: number;
  judges_completed_count: number;
  judges_assigned_count: number;
  criterion_averages: Record<string, number>;
  extra_data?: Record<string, any>;
}

interface JudgeProgressItem {
  judge_id: string;
  name: string;
  email: string;
  role: string;
  total_assigned: number;
  completed_count: number;
  draft_count: number;
  pending_count: number;
  progress_percent: number;
  label: string;
}

export const LeaderboardPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { success, error } = useToast();

  const [selectedRound, setSelectedRound] = useState<number>(2);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [judgeProgress, setJudgeProgress] = useState<JudgeProgressItem[]>([]);
  const [overallProgress, setOverallProgress] = useState<{ percentage: number; completed: number; total: number }>({
    percentage: 0,
    completed: 0,
    total: 0,
  });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  // Promotion modal state
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/results/export/excel?round_number=${selectedRound}`);
      if (!res.ok) throw new Error('Excel export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NexHack_Round_${selectedRound}_Leaderboard.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      success('Report Exported', `Downloaded multi-sheet Excel report for Round ${selectedRound}.`);
    } catch (err: any) {
      error('Export Failed', err.message || 'Could not export Excel file.');
    } finally {
      setIsExporting(false);
    }
  };


  const fetchResults = useCallback(async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      
      const lbRes = await fetch(`${backendUrl}/api/v1/results/leaderboard?round_number=${selectedRound}`);
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData.leaderboard || []);
      }

      const progRes = await fetch(`${backendUrl}/api/v1/results/judge-progress?round_number=${selectedRound}`);
      if (progRes.ok) {
        const progData = await progRes.json();
        setJudgeProgress(progData.judges || []);
        setOverallProgress({
          percentage: progData.overall_percentage || 0,
          completed: progData.overall_total_completed || 0,
          total: progData.overall_total_assigned || 0,
        });
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn('Backend fetch results fallback');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRound]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Realtime subscription via Supabase Realtime channel
  useEffect(() => {
    if (!isSupabaseConfigured) {
      const interval = setInterval(() => {
        fetchResults();
      }, 8000);
      setRealtimeActive(true);
      return () => clearInterval(interval);
    }

    const channel = supabase
      .channel('schema-db-evaluations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'evaluations' },
        (payload) => {
          console.log('Realtime evaluation update received:', payload);
          fetchResults();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeActive(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchResults]);

  const handlePromoteExecution = async () => {
    setIsPromoting(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const payload = {
        round_number: selectedRound,
        promote_count: selectedRound === 2 ? 20 : selectedRound === 3 ? 3 : 150,
        actor_id: profile?.id,
      };

      const res = await fetch(`${backendUrl}/api/v1/results/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Promotion failed on server');
      }

      const data = await res.json();
      success('Operation Succeeded', data.message || 'Promotion applied and logged to audit log.');
      setIsPromoteModalOpen(false);
      fetchResults();
    } catch (err: any) {
      error('Promotion Error', err.message || 'Could not execute promotion.');
    } finally {
      setIsPromoting(false);
    }
  };

  const filteredLeaderboard = useMemo(() => {
    if (!search.trim()) return leaderboard;
    const s = search.toLowerCase();
    return leaderboard.filter(
      (item) =>
        item.team_id.toLowerCase().includes(s) ||
        item.team_name.toLowerCase().includes(s) ||
        (item.college && item.college.toLowerCase().includes(s)) ||
        (item.track && item.track.toLowerCase().includes(s))
    );
  }, [leaderboard, search]);

  const roundTabs = [
    { id: '1', label: 'Round 1: Guidance Phase' },
    { id: '2', label: 'Round 2: Evaluation & Scoring (Top 20)' },
    { id: '3', label: 'Round 3: Grand Finale (Winners)' },
  ];

  const navItems = [
    { label: 'Admin Dashboard', href: '/admin' },
    { label: 'Teams', href: '/admin/teams' },
    { label: 'Judges', href: '/admin/judges' },
    { label: 'Rounds', href: '/admin/rounds' },
    { label: 'Assignments', href: '/admin/assignments' },
    { label: 'Leaderboard', href: '/admin/leaderboard' },
  ];

  const columns: Column<LeaderboardItem>[] = [
    {
      header: 'Rank',
      cell: (item) => {
        if (item.rank === 1) {
          return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs">
              🥇 1
            </span>
          );
        }
        if (item.rank === 2) {
          return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs">
              🥈 2
            </span>
          );
        }
        if (item.rank === 3) {
          return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs">
              🥉 3
            </span>
          );
        }
        return (
          <span className="font-mono text-xs font-semibold text-slate-500 pl-2">
            #{item.rank}
          </span>
        );
      },
      className: 'w-16',
    },
    {
      header: 'Team Info',
      cell: (item) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {item.team_id}
            </span>
            <span className="font-semibold text-sm text-slate-900">{item.team_name}</span>
            {item.extra_data?.winner_rank && (
              <Badge variant="yellow" className="text-[9px]">
                {item.extra_data.winner_title || `Winner #${item.extra_data.winner_rank}`}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center gap-1">
              <School className="w-3 h-3 text-slate-400" />
              {item.college || 'Geeta University'}
            </span>
            {item.track && (
              <>
                <span>&bull;</span>
                <span className="text-slate-500 font-medium">{item.track}</span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Evaluations Done',
      cell: (item) => {
        const isComplete = item.judges_completed_count >= item.judges_assigned_count;
        return (
          <Badge variant={isComplete ? 'green' : 'yellow'} className="text-[10px]">
            {item.judges_completed_count} / {item.judges_assigned_count} Judges
          </Badge>
        );
      },
    },
    {
      header: 'Technical / Innovation / Impact',
      cell: (item) => {
        const tech = item.criterion_averages?.['Technical Execution'] ?? 0;
        const innov = item.criterion_averages?.['Innovation & Creativity'] ?? 0;
        const impact = item.criterion_averages?.['Impact & Relevance'] ?? 0;
        return (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded" title="Technical Execution (Max 30)">
              T: {tech}
            </span>
            <span className="bg-slate-100 px-1.5 py-0.5 rounded" title="Innovation & Creativity (Max 25)">
              I: {innov}
            </span>
            <span className="bg-slate-100 px-1.5 py-0.5 rounded" title="Impact & Relevance (Max 15)">
              Imp: {impact}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Average Total',
      cell: (item) => (
        <div className="text-right pr-4">
          <span className="text-base font-extrabold font-mono text-slate-900">
            {item.avg_total.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-400"> / 100</span>
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
        title="Hackathon Leaderboard & Results"
        subtitle="Live average scores, tie-break hierarchy (Technical > Innovation > Impact), and real-time evaluator progress"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-medium shadow-subtle">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Realtime Sync Live ({lastUpdated})</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              isLoading={isExporting}
              onClick={handleExportExcel}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export Excel Report
            </Button>

            {selectedRound === 1 && (

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPromoteModalOpen(true)}
                leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Advance All to Round 2
              </Button>
            )}

            {selectedRound === 2 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPromoteModalOpen(true)}
                leftIcon={<Trophy className="w-3.5 h-3.5 text-amber-300" />}
              >
                Promote Top 20 to Round 3
              </Button>
            )}

            {selectedRound === 3 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPromoteModalOpen(true)}
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
              >
                Declare Top 3 Winners
              </Button>
            )}
          </div>
        }
      />

      {/* Round Selection Tabs */}
      <div className="mb-6">
        <PillTabs
          tabs={roundTabs}
          activeTab={String(selectedRound)}
          onChange={(id) => setSelectedRound(Number(id))}
        />
      </div>

      {/* Judge Progress Tracker Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Evaluator Progress Tracker
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Overall Completion:{' '}
            <strong className="text-slate-900 font-mono">
              {overallProgress.completed} / {overallProgress.total} ({overallProgress.percentage}%)
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {judgeProgress.map((j) => (
            <Card key={j.judge_id} padding="sm" className="bg-white border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                      {j.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">{j.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{j.email}</p>
                    </div>
                  </div>
                  <Badge variant={j.progress_percent === 100 ? 'green' : 'blue'} className="text-[9px]">
                    {j.progress_percent}%
                  </Badge>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden my-2.5">
                  <div
                    className="bg-[#0F172A] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${j.progress_percent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <span>{j.label}</span>
                <span className="text-amber-600 font-medium">{j.draft_count} in draft</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Tie-break Rule Callout */}
      <Card padding="sm" className="mb-4 bg-slate-50/70 border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <Award className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Strict Tie-Break Engine Order:{' '}
            <strong className="text-slate-800">
              Technical Execution (30) &gt; Innovation & Creativity (25) &gt; Impact & Relevance (15)
            </strong>
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">Scores averaged across assigned jury</span>
      </Card>

      {/* Search Bar */}
      <Card padding="sm" className="mb-4">
        <div className="relative max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams in leaderboard..."
            className="w-full pl-10 pr-3.5 py-1.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
          />
        </div>
      </Card>

      {/* Leaderboard Table */}
      <Table
        columns={columns}
        data={filteredLeaderboard}
        keyExtractor={(item) => item.team_id}
        isLoading={isLoading}
        emptyMessage="No teams evaluated for this round yet."
      />

      {/* Promotion / Winner Declaration Confirmation Modal */}
      <Modal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        title={
          selectedRound === 1
            ? 'Advance All Teams to Round 2?'
            : selectedRound === 2
            ? 'Promote Top 20 Teams to Round 3?'
            : 'Declare Top 3 Hackathon Winners?'
        }
        subtitle="This action modifies team status and writes an immutable record to audit log."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsPromoteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isPromoting}
              onClick={handlePromoteExecution}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm & Execute Action
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs text-slate-600">
          {selectedRound === 1 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
              <p className="font-bold mb-1">Round 1 Guidance Phase Rule:</p>
              <p>
                All teams advance to Round 2. No scores were given and no teams are eliminated. All active teams will be promoted to <strong>Round 2: Evaluation & Scoring</strong>.
              </p>
            </div>
          )}

          {selectedRound === 2 && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Cutoff Confirmation (Top 20 Promoted / Rest Eliminated):
                </p>
                <p>
                  Based on the tie-broken leaderboard, the top 20 teams will advance to <strong>Round 3 (Grand Finale Pitch)</strong>. Remaining teams will be marked as <strong>Eliminated</strong>.
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Preview: Top 20 Advancing Teams
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]">
                  {leaderboard.slice(0, 20).map((t, idx) => (
                    <span
                      key={t.team_id}
                      className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-800"
                    >
                      #{idx + 1} {t.team_id} ({t.avg_total} pts)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedRound === 3 && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-700" />
                  Grand Finale Winner Announcement:
                </p>
                <p>
                  The top 3 teams based on jury average scores will be officially recorded in the database as the NexHack 2.0 Hackathon Winners.
                </p>
              </div>

              <div className="space-y-2">
                {leaderboard.slice(0, 3).map((w, idx) => (
                  <div
                    key={w.team_id}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900">
                          {idx === 0 ? '1st Place Winner' : idx === 1 ? '1st Runner Up' : '2nd Runner Up'}: {w.team_name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {w.team_id} &bull; {w.college}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-base text-slate-900">
                      {w.avg_total} / 100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
};
