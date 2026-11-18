import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Users,
  School,
  Layers,
  Award,
  TrendingUp,
  RefreshCw,
  Scale,
  Sparkles,
  ArrowRight,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface OverviewStats {
  total_teams: number;
  active_teams: number;
  colleges_count: number;
  tracks_count: number;
  total_evaluations: number;
  total_judges: number;
  average_score: number;
}

interface CollegeItem {
  college: string;
  team_count: number;
  active_count: number;
  eliminated_count: number;
}

interface DomainItem {
  domain: string;
  team_count: number;
  active_count: number;
  eliminated_count: number;
}

interface ScoreBucket {
  bucket: string;
  evaluation_count: number;
  percentage: number;
}

interface JudgeStrictnessItem {
  judge_id: string;
  judge_name: string;
  judge_email: string;
  role: string;
  total_evaluations: number;
  avg_score_given: number;
  min_score_given: number;
  max_score_given: number;
  stddev_score: number;
  strictness_index: 'Strict' | 'Balanced' | 'Lenient' | 'Guidance Only';
}

interface FunnelStage {
  stage_order: number;
  stage_name: string;
  team_count: number;
  round_number: number;
  description: string;
}

export const AnalyticsPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const [overview, setOverview] = useState<OverviewStats>({
    total_teams: 30,
    active_teams: 29,
    colleges_count: 11,
    tracks_count: 13,
    total_evaluations: 45,
    total_judges: 3,
    average_score: 83.6,
  });

  const [colleges, setColleges] = useState<CollegeItem[]>([]);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [scoreBuckets, setScoreBuckets] = useState<ScoreBucket[]>([]);
  const [judgesStats, setJudgesStats] = useState<JudgeStrictnessItem[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [ovRes, colRes, domRes, sbRes, jsRes, funRes] = await Promise.all([
        fetch('/api/v1/analytics/overview'),
        fetch('/api/v1/analytics/colleges'),
        fetch('/api/v1/analytics/domains'),
        fetch('/api/v1/analytics/score-distribution'),
        fetch('/api/v1/analytics/judge-strictness'),
        fetch('/api/v1/analytics/funnel'),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (colRes.ok) setColleges(await colRes.json());
      if (domRes.ok) setDomains(await domRes.json());
      if (sbRes.ok) setScoreBuckets(await sbRes.json());
      if (jsRes.ok) setJudgesStats(await jsRes.json());
      if (funRes.ok) setFunnel(await funRes.json());
    } catch {
      // Demo fallbacks are automatically populated by backend / defaults
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const navItems = [
    { label: 'Admin Dashboard', href: '/admin' },
    { label: 'Teams', href: '/admin/teams' },
    { label: 'Judges', href: '/admin/judges' },
    { label: 'Rounds', href: '/admin/rounds' },
    { label: 'Assignments', href: '/admin/assignments' },
    { label: 'Leaderboard', href: '/admin/leaderboard' },
    { label: 'Analytics', href: '/admin/analytics' },
  ];

  const maxCollegeCount = Math.max(...colleges.map((c) => c.team_count), 1);
  const maxDomainCount = Math.max(...domains.map((d) => d.team_count), 1);

  return (
    <Layout
      user={profile ? { name: profile.name, email: profile.email, role: profile.role } : null}
      navItems={navItems}
      onSignOut={signOut}
    >
      <PageHeader
        title="Event Analytics & Intelligence"
        subtitle="Real-time SQL views: participation demographics, score curves, judge strictness indices, and round funnel"
        action={
          <div className="flex items-center gap-2">
            <Link to="/admin/leaderboard?z_score=true">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Scale className="w-3.5 h-3.5 text-slate-700" />}
                className="bg-white border-slate-200"
              >
                Leaderboard (Z-Score)
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalyticsData}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              className="bg-white border-slate-200"
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Top Overview KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
        <Card padding="sm" className="bg-white border-slate-200 shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Teams
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              {overview.total_teams}
            </span>
            <Badge variant="green" className="text-[9px]">
              {overview.active_teams} active
            </Badge>
          </div>
        </Card>

        <Card padding="sm" className="bg-white border-slate-200 shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Colleges
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              {overview.colleges_count}
            </span>
            <School className="w-4 h-4 text-slate-400" />
          </div>
        </Card>

        <Card padding="sm" className="bg-white border-slate-200 shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Hack Tracks
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              {overview.tracks_count}
            </span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
        </Card>

        <Card padding="sm" className="bg-white border-slate-200 shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Evaluations
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              {overview.total_evaluations}
            </span>
            <Badge variant="blue" className="text-[9px]">
              logged
            </Badge>
          </div>
        </Card>

        <Card padding="sm" className="bg-white border-slate-200 shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Jury Panel
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              {overview.total_judges}
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
        </Card>

        <Card padding="sm" className="bg-white border-slate-200 shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Average Score
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              {overview.average_score.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-bold font-mono">/ 100</span>
          </div>
        </Card>
      </div>

      {/* Round Funnel Progression (150 -> 20 -> 3) */}
      <Card padding="md" className="mb-6 bg-white border-slate-200 shadow-subtle">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-slate-700" /> Hackathon Round Funnel Progression
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Strict rule enforcement: Round 1 (All advance) &bull; Round 2 (Top 20 promoted) &bull; Round 3 (Top 3 winners)
            </p>
          </div>
          <Badge variant="blue" className="text-[10px]">
            Funnel View
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {funnel.map((step, idx) => (
            <div
              key={step.stage_order}
              className={`p-4 rounded-xl border relative flex flex-col justify-between transition-all ${
                idx === 3
                  ? 'bg-amber-50/50 border-amber-200 shadow-xs'
                  : idx === 2
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Stage {step.stage_order}
                </span>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  {step.stage_name}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  {step.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {step.team_count}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Teams
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Two Column Section: Colleges and Domains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* College-wise Participation */}
        <Card padding="md" className="bg-white border-slate-200 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <School className="w-4 h-4 text-slate-700" /> College-wise Participation
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {colleges.length} Institutions
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {colleges.map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 truncate max-w-[260px]">
                      {c.college}
                    </span>
                    <span className="font-mono text-slate-600 font-bold">
                      {c.team_count} teams <span className="text-slate-400 font-normal">({c.active_count} active)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                    <div
                      className="bg-[#0F172A] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(c.team_count / maxCollegeCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Domain / Track-wise Participation */}
        <Card padding="md" className="bg-white border-slate-200 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-700" /> Track & Domain Breakdown
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {domains.length} Tracks
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {domains.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 truncate max-w-[260px]">
                      {d.domain}
                    </span>
                    <span className="font-mono text-slate-600 font-bold">
                      {d.team_count} teams
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                    <div
                      className="bg-slate-700 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(d.team_count / maxDomainCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Score Distribution Histogram */}
      <Card padding="md" className="mb-6 bg-white border-slate-200 shadow-subtle">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-slate-700" /> Evaluation Score Distribution
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Distribution curve of raw 100-mark scores across all locked judge evaluations
            </p>
          </div>
          <Badge variant="green" className="text-[10px]">
            Mean: {overview.average_score.toFixed(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {scoreBuckets.map((bucket, i) => (
            <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-slate-800 block truncate">
                {bucket.bucket}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900 font-mono">
                  {bucket.evaluation_count}
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">
                  {bucket.percentage}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#0F172A] h-1.5 rounded-full"
                  style={{ width: `${Math.min(bucket.percentage * 2, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Judge Strictness Comparison & Z-Score Info */}
      <Card padding="md" className="bg-white border-slate-200 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-slate-700" /> Judge Strictness & Variance Analysis
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Evaluator scoring profiles: average marks awarded, dispersion (σ), and strictness categorization
            </p>
          </div>

          <Link to="/admin/leaderboard?z_score=true">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:underline">
              Toggle Z-Score Normalization on Leaderboard <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Judge / Evaluator</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3 text-center">Evaluations</th>
                <th className="py-2.5 px-3 text-center">Avg Score Given</th>
                <th className="py-2.5 px-3 text-center">Min / Max</th>
                <th className="py-2.5 px-3 text-center">Std Dev (σ)</th>
                <th className="py-2.5 px-3 text-right">Strictness Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {judgesStats.map((j) => (
                <tr key={j.judge_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{j.judge_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{j.judge_email}</span>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={j.role === 'mentor' ? 'green' : 'blue'} className="text-[9px]">
                      {j.role.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                    {j.total_evaluations}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-900">
                    {j.avg_score_given > 0 ? `${j.avg_score_given.toFixed(1)} / 100` : '—'}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-500">
                    {j.min_score_given > 0 ? `${j.min_score_given} - ${j.max_score_given}` : '—'}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">
                    {j.stddev_score > 0 ? `±${j.stddev_score.toFixed(1)}` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Badge
                      variant={
                        j.strictness_index === 'Strict'
                          ? 'yellow'
                          : j.strictness_index === 'Lenient'
                          ? 'green'
                          : 'blue'
                      }
                      className="text-[10px]"
                    >
                      {j.strictness_index}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Z-Score Mathematical Normalization Box */}
        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 font-bold block mb-0.5">
              Why use Z-Score Normalization?
            </strong>
            In competitive hackathons, certain judges grade strictly (e.g. mean ~74) while others score generously (e.g. mean ~90).
            The Z-Score normalization algorithm standardizes each judge&apos;s marks [z = (score - judge_mean) / stddev] and maps them onto a calibrated distribution (mean = 80, stddev = 10), ensuring no team is disadvantaged by drawing a stricter evaluator.
          </div>
        </div>
      </Card>
    </Layout>
  );
};
