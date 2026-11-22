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
  Users,
  Compass,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Clock,
  Target,
  ChevronRight,
  ShieldAlert,
  MapPin,
  Flame,
  Zap,
} from 'lucide-react';

export const MentorGuidelinesPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'mission' | 'session' | 'feedback' | 'playbook'>('mission');

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
        title="Mentor Guidance Portal & Mentorship Rules"
        subtitle="Operational guide, qualitative feedback framework, MVP scoping advice, and session protocols for accredited NexHack 2.0 mentors"
        action={
          <div className="flex items-center gap-2">
            <Link to="/judge">
              <Button variant="primary" leftIcon={<Users className="w-4 h-4" />}>
                View My Assigned Teams
              </Button>
            </Link>
          </div>
        }
      />

      {/* Mentor Hero Banner */}
      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="green" className="text-[10px] uppercase font-bold tracking-wider">
              Mentor Advisory
            </Badge>
            <span className="text-xs text-emerald-300 font-medium">NexHack 2.0 Technical Council</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Empower, Unblock, & Refine Technical Architectures
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            As a mentor, your mission is to transform raw ideas into viable, production-grade hackathon prototypes. You provide qualitative wisdom, unblock technical roadblocks, and ensure teams focus on high-impact MVPs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link to="/judge/guidelines">
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Judging Rubric
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Card padding="sm" className="mb-6">
        <PillTabs
          tabs={[
            { id: 'mission', label: 'Mentor Mission & Principles' },
            { id: 'session', label: '15-Min Session Framework' },
            { id: 'feedback', label: 'Actionable Qualitative Feedback' },
            { id: 'playbook', label: 'Technical Playbook & Scoping' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />
      </Card>

      {/* TAB 1: MENTOR MISSION & ETHICAL PRINCIPLES */}
      {activeTab === 'mission' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card padding="md" className="border-slate-200 space-y-2 border-t-4 border-t-emerald-500">
              <div className="flex items-center gap-2 text-emerald-700">
                <Lightbulb className="w-5 h-5" />
                <h4 className="text-sm font-bold text-slate-900">Guide, Don't Build</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Provide architectural directions, API suggestions, and troubleshooting logic. Never write the actual production code for the participants or take over their keyboard.
              </p>
            </Card>

            <Card padding="md" className="border-slate-200 space-y-2 border-t-4 border-t-blue-500">
              <div className="flex items-center gap-2 text-blue-700">
                <Target className="w-5 h-5" />
                <h4 className="text-sm font-bold text-slate-900">Scope Slayer</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hackathon teams habitually over-promise on features (e.g. mobile app + VR + custom AI model in 24 hours). Help them cut scope ruthlessly to ship 1 flawless core feature.
              </p>
            </Card>

            <Card padding="md" className="border-slate-200 space-y-2 border-t-4 border-t-amber-500">
              <div className="flex items-center gap-2 text-amber-700">
                <Flame className="w-5 h-5" />
                <h4 className="text-sm font-bold text-slate-900">Psychological Boost</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Between 2 AM and 6 AM, fatigue and "demo despair" peak. Keep teams inspired, celebrate small breakthroughs, and help them navigate unexpected merge conflicts.
              </p>
            </Card>
          </div>

          {/* Difference Table: Mentor vs Judge */}
          <Card padding="md" className="border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-700" />
              Role Distinction: Mentor vs. Judge
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-700 font-semibold">
                    <th className="py-2.5 px-3">Dimension</th>
                    <th className="py-2.5 px-3 text-emerald-800">Accredited Mentor</th>
                    <th className="py-2.5 px-3 text-blue-800">Official Judge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Primary Objective</td>
                    <td className="py-2.5 px-3">Unblock, teach, refine, and support team execution</td>
                    <td className="py-2.5 px-3">Critique, evaluate, and rank performance against rubric</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Round 1 Role</td>
                    <td className="py-2.5 px-3">Conduct 15-min advisory session; give written remarks</td>
                    <td className="py-2.5 px-3">Conduct technical review; give qualitative remarks</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Numeric Scoring</td>
                    <td className="py-2.5 px-3 font-semibold text-rose-600">Strictly Restricted (No Marks)</td>
                    <td className="py-2.5 px-3 font-semibold text-blue-600">Authorized (Rounds 2 & 3: 100 Pts)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">Interaction Style</td>
                    <td className="py-2.5 px-3">Collaborative, encouraging, advisory dialogue</td>
                    <td className="py-2.5 px-3">Formal examination, probing Q&A defense</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: 15-MINUTE MENTORSHIP SESSION FRAMEWORK */}
      {activeTab === 'session' && (
        <div className="space-y-6">
          <Card padding="md" className="border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              The 15-Minute Venue Room Mentorship Structure
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mentors visit each assigned team in their allocated venue rooms during Round 1. Follow this time-tested protocol:
            </p>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <span className="font-mono text-xs font-bold bg-slate-200 text-slate-800 px-2 py-1 rounded-md shrink-0">
                  00:00 - 03:00
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Phase 1: Pitch & Problem Statement Check</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Ask: "Who is the user, what is the single biggest problem you solve, and why does existing software fail?" Ensure all teammates understand their core thesis.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <span className="font-mono text-xs font-bold bg-slate-200 text-slate-800 px-2 py-1 rounded-md shrink-0">
                  03:00 - 07:00
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Phase 2: Architectural & Schema Review</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Review their database schema, API contracts, third-party library dependencies, and hardware pinouts. Flag potential concurrency bottlenecks or fragile dependencies early.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <span className="font-mono text-xs font-bold bg-slate-200 text-slate-800 px-2 py-1 rounded-md shrink-0">
                  07:00 - 12:00
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Phase 3: Bottleneck Identification & Scope Trimming</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Ask: "What is currently broken or blocking your demo?" Help them pivot away from cosmetic nice-to-haves and prioritize end-to-end user journeys that will impress judges in Round 2.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
                <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md shrink-0">
                  12:00 - 15:00
                </span>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Phase 4: Written Feedback Logging</h4>
                  <p className="text-xs text-emerald-900 mt-0.5">
                    Open the NexHack Judge/Mentor Dashboard and submit your qualitative remarks. These observations appear directly on the team's feedback dashboard.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: ACTIONABLE QUALITATIVE FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <Card padding="md" className="border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              The 3-Part Constructive Mentorship Formulation
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              High-impact feedback is specific, objective, and forward-looking. Avoid generic statements like "Good job" or "Needs improvement".
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>1. Validated Strengths</span>
                </div>
                <p className="text-[11px] text-emerald-950 leading-relaxed">
                  "The offline raster tile caching on Mapbox works cleanly and addresses the real emergency response problem."
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>2. Architectural Risk</span>
                </div>
                <p className="text-[11px] text-amber-950 leading-relaxed">
                  "Querying Gemini synchronously on every keystroke will hit rate limits and lag the frontend during the demo."
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span>3. Actionable Fix</span>
                </div>
                <p className="text-[11px] text-blue-950 leading-relaxed">
                  "Add a 500ms debounce on the search input and pre-warm cache responses for the 3 demo query scenarios."
                </p>
              </div>
            </div>
          </Card>

          {/* Do's and Don'ts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card padding="md" className="border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Mentor Do's
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
                <li>Encourage every team member to speak up and own a specific component.</li>
                <li>Verify that their GitHub repository has recent commits with meaningful messages.</li>
                <li>Prompt the team to simulate demo failures: "What if Wi-Fi disconnects on stage?"</li>
                <li>Remind teams of the submission deadline countdown timer in their Team Portal.</li>
              </ul>
            </Card>

            <Card padding="md" className="border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 mb-3">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Mentor Don'ts
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
                <li>Never promise advancement or claim a team is "guaranteed 1st place".</li>
                <li>Never force a team to rewrite their stack in your favorite framework 6 hours before deadline.</li>
                <li>Never give discouragement or ridicule early prototypes.</li>
                <li>Never enter numeric scores during Round 1.</li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: TECHNICAL PLAYBOOK & SCOPING */}
      {activeTab === 'playbook' && (
        <div className="space-y-4">
          <Card padding="md" className="border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Common Hackathon Bottlenecks & Quick Mentor Remedies
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3 space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Badge variant="yellow" className="text-[9px]">Frontend / UI</Badge>
                  Team is spending hours styling login screens instead of the core engine.
                </h4>
                <p className="text-slate-600 pl-4">
                  <strong>Remedy:</strong> Direct them to use pre-built Tailwind UI / shadcn components. In hackathons, judges evaluate workflow logic and data presentation over custom CSS animations.
                </p>
              </div>

              <div className="py-3 space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Badge variant="blue" className="text-[9px]">Backend / API</Badge>
                  LLM API calls taking 8-12 seconds and causing UI freeze.
                </h4>
                <p className="text-slate-600 pl-4">
                  <strong>Remedy:</strong> Recommend streaming responses via Server-Sent Events (SSE) or optimistic UI placeholders with instant feedback.
                </p>
              </div>

              <div className="py-3 space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Badge variant="blue" className="text-[9px]">Git & Repo</Badge>
                  Merge conflicts preventing deployment 30 minutes before cutoff.
                </h4>
                <p className="text-slate-600 pl-4">
                  <strong>Remedy:</strong> Designate one team member as the release engineer. Freeze new feature branches 90 minutes before deadline and only merge emergency bug fixes.
                </p>
              </div>
            </div>
          </Card>

          {/* Emergency Contacts */}
          <Card padding="md" className="border-slate-200 bg-slate-50/70">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
              Emergency Support & Organizing Desk
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900">Technical & Wi-Fi Support</p>
                <p className="text-slate-500 font-mono mt-0.5">Ext: 204 &bull; Lab 101 Desk</p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900">Hardware & Component Lab</p>
                <p className="text-slate-500 font-mono mt-0.5">Innovation Hub &bull; Room 201</p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900">Super Admin / Escalations</p>
                <p className="text-slate-500 font-mono mt-0.5">admin@nexhack.com</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
};