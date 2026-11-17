import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { PillTabs } from '../components/ui/PillTabs';
import { EmptyState } from '../components/ui/EmptyState';
import { Users, HelpCircle, Sparkles, Clock, CheckCircle } from 'lucide-react';

export const JudgeDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('assigned');

  const tabs = [
    { id: 'assigned', label: 'Assigned Teams', count: 0 },
    { id: 'pending', label: 'Pending Evaluation', count: 0 },
    { id: 'completed', label: 'Completed', count: 0 },
  ];

  const navItems = [
    { label: 'My Teams', href: '/judge' },
    { label: 'Evaluation Guidelines', href: '/judge/guidelines' },
  ];

  return (
    <Layout
      user={profile ? { name: profile.name, email: profile.email, role: profile.role } : null}
      navItems={navItems}
      onSignOut={signOut}
    >
      <PageHeader
        title="Judge Portal"
        subtitle={`Welcome, ${profile?.name || 'Judge'}. You are signed in as an official NexHack 2.0 Evaluator.`}
        action={
          <Badge variant="blue" className="py-1 px-3 text-xs">
            <Clock className="w-3.5 h-3.5 mr-1 inline" />
            Hackathon Live
          </Badge>
        }
      />

      {/* Round 1 Status Banner */}
      <Card className="mb-6 p-5 sm:p-6 border-slate-200/90 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Hackathon Round</span>
              <Badge variant="green" className="text-[10px]">Active</Badge>
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Round 1: Guidance & Mentorship Phase
            </h3>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              In this round, judges provide constructive remarks and guidance directly to teams. No scores are assigned, and all ~150 teams advance to Round 2.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 sm:self-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Rule</span>
              <span className="text-xs font-bold text-slate-800">Remarks Only</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-4">
        <PillTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Empty State for Teams */}
      <EmptyState
        icon={<Users className="w-6 h-6 stroke-[1.5]" />}
        title="No Teams Assigned Yet"
        description="Admin will upload teams and balance judge assignments prior to the start of Round 1 judging session."
        actionText="Refresh Assignments"
        onAction={() => window.location.reload()}
      />

      {/* Guidelines Card */}
      <Card className="mt-8 p-6 bg-slate-50/50">
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
          <HelpCircle className="w-4 h-4 text-slate-500 mr-2" />
          Judge Instructions & Rubric Preview
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <p className="font-semibold text-slate-800 mb-1">Round 1: Guidance</p>
            <p className="text-slate-500">Focus on feasibility, architectural advice, and mentorship suggestions.</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <p className="font-semibold text-slate-800 mb-1">Round 2: Rubric Scoring</p>
            <p className="text-slate-500">Innovation (25), Technical (30), Impact (15), Scalability (15), Pitch (15).</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <p className="font-semibold text-slate-800 mb-1">Round 3: Grand Finale</p>
            <p className="text-slate-500">Top 20 teams will present live pitches on stage to the full panel.</p>
          </div>
        </div>
      </Card>
    </Layout>
  );
};
