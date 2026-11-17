import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { PillTabs } from '../components/ui/PillTabs';
import { Table, Column } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Users, Shield, Layers, FileText, Plus, Eye, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuditItem {

  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  details: string;
}

const SAMPLE_AUDIT_LOGS: AuditItem[] = [
  {
    id: 'aud-001',
    timestamp: '2026-11-17 14:30:00 UTC',
    actor: 'admin@nexhack.com',
    action: 'SYSTEM_INIT',
    entity: 'SYSTEM',
    details: 'Database schema initialized with profiles and append-only audit enforcement trigger.',
  },
  {
    id: 'aud-002',
    timestamp: '2026-11-17 14:35:12 UTC',
    actor: 'admin@nexhack.com',
    action: 'SEED_ROLES',
    entity: 'PROFILES',
    details: 'Seeded 1 Chief Admin and 3 Faculty/Industry Judges for Phase 0 demonstration.',
  },
  {
    id: 'aud-003',
    timestamp: '2026-11-17 14:40:00 UTC',
    actor: 'admin@nexhack.com',
    action: 'ROUND_CONFIG',
    entity: 'ROUND_1',
    details: 'Configured Round 1 (Guidance phase): non-eliminating, qualitative remarks only.',
  },
];

export const AdminDashboard: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('audit');
  const [selectedAudit, setSelectedAudit] = useState<AuditItem | null>(null);


  const tabs = [
    { id: 'audit', label: 'Audit Log (Append-Only)', count: SAMPLE_AUDIT_LOGS.length },
    { id: 'judges', label: 'Judges Roster', count: 3 },
    { id: 'overview', label: 'Rounds' },
  ];

  const navItems = [
    { label: 'Admin Dashboard', href: '/admin' },
    { label: 'Teams', href: '/admin/teams' },
    { label: 'Judges', href: '/admin/judges' },
    { label: 'Rounds', href: '/admin/rounds' },
  ];


  const auditColumns: Column<AuditItem>[] = [
    {
      header: 'Timestamp (UTC)',
      accessorKey: 'timestamp',
      className: 'font-mono text-xs text-slate-500',
    },
    {
      header: 'Actor',
      cell: (item) => (
        <span className="font-semibold text-slate-900 text-xs">{item.actor}</span>
      ),
    },
    {
      header: 'Action',
      cell: (item) => (
        <Badge variant="blue" className="text-[10px]">
          {item.action}
        </Badge>
      ),
    },
    {
      header: 'Entity',
      cell: (item) => (
        <Badge variant="gray" className="text-[10px]">
          {item.entity}
        </Badge>
      ),
    },
    {
      header: 'Details',
      accessorKey: 'details',
      className: 'max-w-xs truncate text-xs text-slate-600',
    },
    {
      header: 'Inspect',
      cell: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedAudit(item)}
          leftIcon={<Eye className="w-3 h-3 text-slate-400" />}
          className="text-xs py-1"
        >
          View
        </Button>
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
        title="Admin Control Center"
        subtitle="NexHack 2.0 Hackathon administration, judge assignments, and immutable audit logs"
        action={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/admin/teams')}
          >
            Manage & Import Teams
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card
          padding="sm"
          onClick={() => navigate('/admin/teams')}
          className="flex items-center gap-4 cursor-pointer hover:border-slate-400 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Registered Teams</p>
            <h4 className="text-2xl font-bold text-slate-900 tracking-tight">150</h4>
          </div>
        </Card>

        <Card
          padding="sm"
          onClick={() => navigate('/admin/judges')}
          className="flex items-center gap-4 cursor-pointer hover:border-slate-400 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Active Judges</p>
            <h4 className="text-2xl font-bold text-slate-900 tracking-tight">3</h4>
          </div>
        </Card>

        <Card
          padding="sm"
          onClick={() => navigate('/admin/rounds')}
          className="flex items-center gap-4 cursor-pointer hover:border-slate-400 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Current Phase</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-slate-900">Round 1</span>
              <Badge variant="green" className="text-[9px] py-0">Guidance</Badge>
            </div>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Audit Logs</p>
            <div className="flex items-center gap-2 mt-0.5">
              <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{SAMPLE_AUDIT_LOGS.length}</h4>
              <Badge variant="gray" className="text-[9px] py-0">Immutable</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <PillTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <span className="text-xs text-slate-400 font-medium">
          Rule 4 Enforced: UPDATE/DELETE blocked by DB Trigger
        </span>
      </div>

      {/* Audit Log Table */}
      {activeTab === 'audit' && (
        <Table
          columns={auditColumns}
          data={SAMPLE_AUDIT_LOGS}
          keyExtractor={(item) => item.id}
          emptyMessage="No audit logs available."
        />
      )}

      {/* Judges Roster Tab */}
      {activeTab === 'judges' && (
        <Card className="p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Seeded Judges (Phase 0)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <Badge variant="blue" className="text-[10px] mb-2">Judge 1</Badge>
              <h4 className="text-sm font-bold text-slate-900">Dr. Sarah Verma</h4>
              <p className="text-xs text-slate-500 font-mono mt-1">judge1@nexhack.com</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <Badge variant="blue" className="text-[10px] mb-2">Judge 2</Badge>
              <h4 className="text-sm font-bold text-slate-900">Prof. Rajesh Kumar</h4>
              <p className="text-xs text-slate-500 font-mono mt-1">judge2@nexhack.com</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <Badge variant="blue" className="text-[10px] mb-2">Judge 3</Badge>
              <h4 className="text-sm font-bold text-slate-900">Ananya Sharma (Tech Lead)</h4>
              <p className="text-xs text-slate-500 font-mono mt-1">judge3@nexhack.com</p>
            </div>
          </div>
        </Card>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border-slate-300">
            <Badge variant="green" className="mb-2">Active</Badge>
            <h4 className="text-base font-bold text-slate-900">Round 1: Guidance</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Judges give qualitative remarks and mentorship only. No marks, no cutoff, all ~150 teams advance.
            </p>
          </Card>
          <Card className="p-5 opacity-75">
            <Badge variant="gray" className="mb-2">Upcoming</Badge>
            <h4 className="text-base font-bold text-slate-900">Round 2: Scoring</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Judges score rubric + remarks. Top 20 teams promoted, remaining teams eliminated.
            </p>
          </Card>
          <Card className="p-5 opacity-75">
            <Badge variant="gray" className="mb-2">Upcoming</Badge>
            <h4 className="text-base font-bold text-slate-900">Round 3: Final Pitch</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Top 20 teams pitch live to panel. Top 3 selected as hackathon winners.
            </p>
          </Card>
        </div>
      )}

      {/* Audit Detail Modal */}
      <Modal
        isOpen={Boolean(selectedAudit)}
        onClose={() => setSelectedAudit(null)}
        title="Audit Log Entry Details"
        subtitle={`ID: ${selectedAudit?.id}`}
        footer={
          <Button variant="secondary" onClick={() => setSelectedAudit(null)}>
            Close
          </Button>
        }
      >
        {selectedAudit && (
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Action</span>
              <p className="font-semibold text-slate-900">{selectedAudit.action}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Actor</span>
              <p className="text-slate-800 font-mono text-xs">{selectedAudit.actor}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Timestamp</span>
              <p className="text-slate-800 font-mono text-xs">{selectedAudit.timestamp}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Entity</span>
              <p className="text-slate-800">{selectedAudit.entity}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Payload / Details</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 whitespace-pre-wrap mt-1">
                {selectedAudit.details}
              </div>
            </div>
            <div className="pt-2">
              <Badge variant="green" className="text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Cryptographically immutable record
              </Badge>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};
