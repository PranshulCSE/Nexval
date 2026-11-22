import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PillTabs } from '../components/ui/PillTabs';
import {
  Award,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Code2,
  Sparkles,
  HelpCircle,
  Scale,
  Users,
  Compass,
  Lock,
  ArrowRight,
  Printer,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const EvaluationGuidelinesPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'rubric' | 'process' | 'ethics' | 'faq'>('rubric');

  const navItems = [
    { label: 'My Teams', href: '/judge' },
    { label: 'Evaluation Guidelines', href: '/judge/guidelines' },
    { label: 'Mentor Guidelines', href: '/mentor/guidelines' },
  ];

  return (
    <Layout
      user={profile ? { name: profile.name, email: profile.email, role: profile.role } : null}
      navItems={navItems}
      onSignOut={signOut}
    >
      <PageHeader
        title="Official Evaluation Guidelines & Scoring Rubric"
        subtitle="Standardized 100-point rubric, ethical judging principles, evaluation locking policies, and round procedures for NexHack 2.0"
        action={
          <div className="flex items-center gap-2">
            <Link to="/judge">
              <Button variant="primary" leftIcon={<Users className="w-4 h-4" />}>
                Go to My Assigned Teams
              </Button>
            </Link>
          </div>
        }
      />

      {/* Quick Rule Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="yellow" className="text-[10px] uppercase font-bold tracking-wider">
              Mandatory Protocol
            </Badge>
            <span className="text-xs text-slate-300">NexHack 2.0 Judging Commission</span>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Fair, Objective, & Real-Time Live Demonstrations
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            All team evaluations must be entered during the team's designated presentation slot. Numeric marks are strictly prohibited in Round 1 (Mentorship Phase), and all scores are locked upon submission in Round 2 & 3.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link to="/mentor/guidelines">
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Mentor Guidelines
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Card padding="sm" className="mb-6">
        <PillTabs
          tabs={[
            { id: 'rubric', label: '100-Point Scoring Rubric' },
            { id: 'process', label: 'Round Procedures & Timelines' },
            { id: 'ethics', label: 'Code of Ethics & Plagiarism' },
            { id: 'faq', label: 'Judge FAQs & Checklists' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />
      </Card>

      {/* TAB 1: 100-POINT SCORING RUBRIC */}
      {activeTab === 'rubric' && (
        <div className="space-y-6">
          {/* Summary Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <Card padding="sm" className="border-l-4 border-l-blue-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Criterion 1</span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">Technical Execution</h4>
              <p className="text-xl font-extrabold text-blue-600 font-mono mt-1">30 Pts</p>
              <p className="text-[11px] text-slate-500 mt-1">Architecture, working demo, code stability</p>
            </Card>

            <Card padding="sm" className="border-l-4 border-l-emerald-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Criterion 2</span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">Innovation & Originality</h4>
              <p className="text-xl font-extrabold text-emerald-600 font-mono mt-1">25 Pts</p>
              <p className="text-[11px] text-slate-500 mt-1">Novelty of solution & creative problem-solving</p>
            </Card>

            <Card padding="sm" className="border-l-4 border-l-amber-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Criterion 3</span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">Impact & Relevance</h4>
              <p className="text-xl font-extrabold text-amber-600 font-mono mt-1">15 Pts</p>
              <p className="text-[11px] text-slate-500 mt-1">Practical value & target market problem addressed</p>
            </Card>

            <Card padding="sm" className="border-l-4 border-l-purple-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Criterion 4</span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">Scalability & Design</h4>
              <p className="text-xl font-extrabold text-purple-600 font-mono mt-1">15 Pts</p>
              <p className="text-[11px] text-slate-500 mt-1">System resilience, edge cases, data security</p>
            </Card>

            <Card padding="sm" className="border-l-4 border-l-rose-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Criterion 5</span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">Presentation & Q&A</h4>
              <p className="text-xl font-extrabold text-rose-600 font-mono mt-1">15 Pts</p>
              <p className="text-[11px] text-slate-500 mt-1">5-min pitch clarity, live demo handling, jury Q&A</p>
            </Card>
          </div>

          {/* Deep Breakdown Cards */}
          <div className="space-y-4">
            {/* Criterion 1 */}
            <Card padding="md" className="border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                      CRITERION 1 &bull; 30 MARKS
                    </span>
                    <h3 className="text-base font-bold text-slate-900">Technical Execution & Working Prototype</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Evaluates whether the team built a genuine working technological artifact during the hackathon.
                  </p>
                </div>
                <Badge variant="blue" className="text-xs font-mono self-start sm:self-auto">Max 30 Pts</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Exceptional</span>
                    <span className="text-blue-600 font-mono">27 - 30 Pts</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Live working demo without crashes. Clean, modular architecture with live API/hardware integration. Git commits verify genuine progress.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Proficient</span>
                    <span className="text-blue-600 font-mono">21 - 26 Pts</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Core user flow works as expected. Minor UI glitches or mocked edge cases, but fundamental technical mechanics are solid and proven.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Developing</span>
                    <span className="text-blue-600 font-mono">15 - 20 Pts</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Partial implementation. Significant components rely on hardcoded dummy responses or slides rather than live runtime computation.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Incomplete</span>
                    <span className="text-blue-600 font-mono">&lt; 15 Pts</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Application fails to boot or demo is solely conceptual. Little to no original code produced during the hackathon period.
                  </p>
                </div>
              </div>
            </Card>

            {/* Criterion 2 */}
            <Card padding="md" className="border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                      CRITERION 2 &bull; 25 MARKS
                    </span>
                    <h3 className="text-base font-bold text-slate-900">Innovation, Novelty & Creativity</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Assesses uniqueness of perspective, novel application of algorithms, and creative differentiation.
                  </p>
                </div>
                <Badge variant="green" className="text-xs font-mono self-start sm:self-auto">Max 25 Pts</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Exceptional</span>
                    <span className="text-emerald-600 font-mono">23 - 25 Pts</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Groundbreaking concept or non-obvious synthesis of technologies. Tackles problem from a radically innovative angle.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Proficient</span>
                    <span className="text-emerald-600 font-mono">18 - 22 Pts</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Meaningful iteration over existing products. Clear competitive advantage or thoughtful improvement in user workflow.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Moderate</span>
                    <span className="text-emerald-600 font-mono">12 - 17 Pts</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Standard solution or straightforward clone of a popular service with superficial modifications.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Derivative</span>
                    <span className="text-emerald-600 font-mono">&lt; 12 Pts</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Cookie-cutter tutorial implementation with zero novel engineering or creative input.
                  </p>
                </div>
              </div>
            </Card>

            {/* Criterion 3 & 4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card padding="md" className="border-slate-200">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
                      CRITERION 3 &bull; 15 MARKS
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">Impact & Real-World Relevance</h3>
                  </div>
                  <Badge variant="yellow" className="text-xs font-mono">Max 15 Pts</Badge>
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate-600 leading-relaxed">
                  <p>&bull; <strong>13 - 15 Pts:</strong> Solves an acute, validated pain point with tangible societal, commercial, or environmental impact.</p>
                  <p>&bull; <strong>10 - 12 Pts:</strong> Clear use case and identifiable target demographic with realistic adoption viability.</p>
                  <p>&bull; <strong>&lt; 10 Pts:</strong> Artificial problem looking for a solution or unclear real-world beneficiary.</p>
                </div>
              </Card>

              <Card padding="md" className="border-slate-200">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
                      CRITERION 4 &bull; 15 MARKS
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">Scalability & Architecture</h3>
                  </div>
                  <Badge variant="blue" className="text-xs font-mono">Max 15 Pts</Badge>
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate-600 leading-relaxed">
                  <p>&bull; <strong>13 - 15 Pts:</strong> Architected for concurrency, robust edge case handling, data security, and efficient database indexing.</p>
                  <p>&bull; <strong>10 - 12 Pts:</strong> Reasonable schema design; handles standard payloads with graceful error handling.</p>
                  <p>&bull; <strong>&lt; 10 Pts:</strong> Monolithic anti-patterns, fragile unhandled exceptions, or clear security bottlenecks.</p>
                </div>
              </Card>
            </div>

            {/* Criterion 5 */}
            <Card padding="md" className="border-slate-200">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md">
                    CRITERION 5 &bull; 15 MARKS
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Presentation, Demo Clarity & Q&A Defense</h3>
                </div>
                <Badge variant="red" className="text-xs font-mono">Max 15 Pts</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <h4 className="font-bold text-slate-900">Pitch Structure (5 Pts)</h4>
                  <p className="text-[11px] text-slate-600">Problem statement framed within 60s, followed by clear architectural diagram and value proposition.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <h4 className="font-bold text-slate-900">Live Demo Fluency (5 Pts)</h4>
                  <p className="text-[11px] text-slate-600">Smooth navigation through core feature workflow without stalling or relying exclusively on pre-rendered screenshots.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <h4 className="font-bold text-slate-900">Jury Q&A Handling (5 Pts)</h4>
                  <p className="text-[11px] text-slate-600">Honest, precise technical answers demonstrating that all members actively contributed to the codebase.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ROUND PROCEDURES & TIMELINES */}
      {activeTab === 'process' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Round 1 */}
            <Card padding="md" className="border-slate-200 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="blue" className="text-xs font-bold uppercase">Round 1</Badge>
                  <span className="text-xs font-mono text-slate-400">Qualitative Only</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Guidance & Mentorship Phase</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Evaluators and mentors interact directly with every active team at their assigned venue rooms.
                </p>

                <div className="p-3 bg-blue-50/70 border border-blue-200/90 rounded-xl space-y-1.5 text-xs text-blue-950">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    Key Round 1 Directives:
                  </p>
                  <p>&bull; <strong>NO numerical marks</strong> are assigned or recorded.</p>
                  <p>&bull; Mentors diagnose architectural flaws and validate MVP scope.</p>
                  <p>&bull; Constructive remarks submitted into NexHack portal.</p>
                  <p>&bull; <strong>All ~150 teams advance</strong> unconditionally to Round 2.</p>
                </div>
              </div>
            </Card>

            {/* Round 2 */}
            <Card padding="md" className="border-slate-200 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="yellow" className="text-xs font-bold uppercase">Round 2</Badge>
                  <span className="text-xs font-mono text-amber-700 font-bold">100 Pts Cutoff</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Scoring & Elimination Phase</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Official jury panel evaluates each team against the 100-point rubric.
                </p>

                <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-1.5 text-xs text-amber-950">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    Key Round 2 Directives:
                  </p>
                  <p>&bull; 3 distinct judges evaluate each team independently.</p>
                  <p>&bull; Strictly 10 minutes total per presentation.</p>
                  <p>&bull; Inspect Git commit history and automated plagiarism flags.</p>
                  <p>&bull; <strong>Top 20 Teams promote</strong> to the Grand Finale.</p>
                </div>
              </div>
            </Card>

            {/* Round 3 */}
            <Card padding="md" className="border-slate-200 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="green" className="text-xs font-bold uppercase">Round 3</Badge>
                  <span className="text-xs font-mono text-emerald-700 font-bold">Grand Finale</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Grand Finale Pitch Stage</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Finalist teams present live in the main University Auditorium before all judges and audience.
                </p>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200/90 rounded-xl space-y-1.5 text-xs text-emerald-950">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Key Round 3 Directives:
                  </p>
                  <p>&bull; 5-judge consensus panel with normalized scoring.</p>
                  <p>&bull; 7-minute pitch + 5-minute rigorous technical Q&A.</p>
                  <p>&bull; Real-time cryptographic lock upon jury signoff.</p>
                  <p>&bull; <strong>Top 3 Winners + Track Champions</strong> selected.</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Time Management Guideline */}
          <Card padding="md" className="border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              10-Minute Presentation Time Allocation Framework
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-mono font-bold text-blue-600 text-sm">00:00 - 02:00</span>
                <h4 className="font-semibold text-slate-900">Problem Framing</h4>
                <p className="text-slate-500 text-[11px]">Context, target user, and core value proposition.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-mono font-bold text-emerald-600 text-sm">02:00 - 06:00</span>
                <h4 className="font-semibold text-slate-900">Live Demonstration</h4>
                <p className="text-slate-500 text-[11px]">Real runtime demonstration of working software/hardware.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-mono font-bold text-amber-600 text-sm">06:00 - 08:30</span>
                <h4 className="font-semibold text-slate-900">Jury Technical Q&A</h4>
                <p className="text-slate-500 text-[11px]">Questions on architecture, security, and edge cases.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-mono font-bold text-purple-600 text-sm">08:30 - 10:00</span>
                <h4 className="font-semibold text-slate-900">Scoring & Submission</h4>
                <p className="text-slate-500 text-[11px]">Judge enters scores, writes qualitative notes, and locks.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: CODE OF ETHICS & PLAGIARISM */}
      {activeTab === 'ethics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card padding="md" className="border-slate-200 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Impartiality & Conflict of Interest</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc pl-4">
                <li>
                  <strong>Recusal Obligation:</strong> If you are personally affiliated with a team's college, share a direct mentorship relationship, or have a conflict of interest, you must request reassignment immediately from the Super Admin.
                </li>
                <li>
                  <strong>Zero Institutional Bias:</strong> Teams must be evaluated purely on their technical merits, innovation, and demonstration—regardless of whether they represent premier IITs, state colleges, or local universities.
                </li>
                <li>
                  <strong>Independent Scoring:</strong> Do not consult or align scores with co-evaluators before submitting. Diversity of judicial perspective is essential for statistical fairness.
                </li>
              </ul>
            </Card>

            <Card padding="md" className="border-slate-200 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Anti-Plagiarism & Pre-Built Code Rules</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc pl-4">
                <li>
                  <strong>Fresh Codebase Mandate:</strong> All core logic must have been authored within the 24-hour hackathon window. The portal automatically flags repositories created prior to event kickoff.
                </li>
                <li>
                  <strong>Open Source & Libraries:</strong> Standard open-source libraries, UI components (Tailwind, Lucide), and cloud APIs (OpenAI, Supabase) are permitted, provided the team discloses their usage.
                </li>
                <li>
                  <strong>Plagiarism Disqualification:</strong> If code similarity exceeding 70% is detected with another team or an existing public GitHub repo without proper attribution, mark the team for Admin Disqualification Review.
                </li>
              </ul>
            </Card>
          </div>

          {/* Score Locking Rules */}
          <Card padding="md" className="border-slate-200 bg-slate-50/70">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Immutable Evaluation Locking Policy</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Upon clicking <strong>"Submit & Lock Evaluation"</strong>, the marks are finalized. Judges cannot independently alter or erase submitted marks. If an honest typographical error occurred during score entry, the judge must contact the Super Admin with an explanation. Any evaluation unlock requires admin authorization and is permanently logged in the NexHack audit log.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: JUDGE FAQS & CHECKLISTS */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          <Card padding="md" className="border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Judge Checklist Before Evaluating Each Team
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <input type="checkbox" defaultChecked className="rounded text-slate-900 focus:ring-0" />
                <span>Verify team ID & registered members match the room badge</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <input type="checkbox" defaultChecked className="rounded text-slate-900 focus:ring-0" />
                <span>Inspect GitHub commit history link in the deliverables tab</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <input type="checkbox" defaultChecked className="rounded text-slate-900 focus:ring-0" />
                <span>Enforce strictly 10 minutes total session limit per team</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <input type="checkbox" defaultChecked className="rounded text-slate-900 focus:ring-0" />
                <span>Provide at least 2 constructive observations in the remarks field</span>
              </label>
            </div>
          </Card>

          <div className="space-y-2">
            {[
              {
                q: 'What if a team’s prototype fails during the live demo?',
                a: 'Grant the team 60 seconds to restart their server or display error logs. If it still fails, evaluate what is demonstrable (UI components, API schemas, backend code) and score Technical Execution accordingly. Do not award 0 marks if genuine effort was made.',
              },
              {
                q: 'Can a mentor also award numerical scores to teams?',
                a: 'No. Mentors are restricted to qualitative guidance during Round 1. Only accredited Judges can record numeric scores during Rounds 2 and 3.',
              },
              {
                q: 'What should I do if my internet connection drops during scoring?',
                a: 'NexHack features built-in offline synchronization. Your score drafts are saved locally in browser storage and will automatically flush to the database as soon as connectivity resumes.',
              },
              {
                q: 'How are ties broken between teams on the cutoff boundary?',
                a: 'Ties are resolved automatically by the system using secondary criterion weighting: 1st tiebreaker is Technical Execution (Criterion 1), 2nd tiebreaker is Innovation (Criterion 2).',
              },
            ].map((faq, i) => (
              <Card key={i} padding="sm" className="border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono shrink-0">
                    Q{i + 1}
                  </span>
                  {faq.q}
                </h4>
                <p className="text-xs text-slate-600 mt-1 pl-7 leading-relaxed">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
};