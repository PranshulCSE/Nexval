import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table, Column } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Search, UserPlus, Upload, Download, Key, Shield, Award, Users, Check, AlertCircle, Printer } from 'lucide-react';

interface JudgeItem {
  id: string;
  name: string;
  email: string;
  role: 'judge' | 'mentor';
  password?: string;
  created_at?: string;
}

const DEFAULT_SEED_JUDGES: JudgeItem[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Dr. Sarah Verma',
    email: 'judge1@nexhack.com',
    role: 'judge',
    password: 'password123',
    created_at: '2026-11-17T14:30:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'Prof. Rajesh Kumar',
    email: 'judge2@nexhack.com',
    role: 'judge',
    password: 'password123',
    created_at: '2026-11-17T14:30:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    name: 'Ananya Sharma (Tech Lead)',
    email: 'judge3@nexhack.com',
    role: 'judge',
    password: 'password123',
    created_at: '2026-11-17T14:30:00Z',
  },
];

export const JudgesPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { success, error } = useToast();

  const [judges, setJudges] = useState<JudgeItem[]>(DEFAULT_SEED_JUDGES);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Manual form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'judge' | 'mentor'>('judge');
  const [customPassword, setCustomPassword] = useState('');
  const [autoGenPassword, setAutoGenPassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk CSV state
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchJudges = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/judges`);
      if (res.ok) {
        const data = await res.json();
        if (data.judges && data.judges.length > 0) {
          const localStored = JSON.parse(localStorage.getItem('nexhack_custom_judges') || '[]');
          const all = [...data.judges, ...localStored];
          const uniqueMap = new Map();
          all.forEach((j) => uniqueMap.set(j.email, j));
          setJudges(Array.from(uniqueMap.values()));
          return;
        }
      }
    } catch (e) {
      console.warn('Backend judges fetch fallback');
    }

    const localStored = JSON.parse(localStorage.getItem('nexhack_custom_judges') || '[]');
    const merged = [...DEFAULT_SEED_JUDGES, ...localStored];
    const uniqueMap = new Map();
    merged.forEach((j) => uniqueMap.set(j.email, j));
    setJudges(Array.from(uniqueMap.values()));
  };

  useEffect(() => {
    fetchJudges();
  }, []);

  const generatePassword = () => {
    return 'Nex-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      error('Missing Information', 'Please provide judge name and email.');
      return;
    }

    setIsSubmitting(true);
    const assignedPassword = autoGenPassword || !customPassword.trim() ? generatePassword() : customPassword.trim();

    const newJudgePayload = {
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      password: assignedPassword,
    };

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/judges/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ judges: [newJudgePayload], actor_id: profile?.id }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to create judge');
      }

      success('Judge Added', `Registered ${newName} as ${newRole}.`);
      fetchJudges();
    } catch (err: any) {
      console.warn('Backend unavailable, saving locally:', err.message);
      const localStored = JSON.parse(localStorage.getItem('nexhack_custom_judges') || '[]');
      const newEntry: JudgeItem = {
        id: `judge-${Date.now()}`,
        ...newJudgePayload,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('nexhack_custom_judges', JSON.stringify([...localStored, newEntry]));
      setJudges((prev) => [newEntry, ...prev]);
      success('Judge Added', `Registered ${newName}. Credentials ready for export.`);
    } finally {
      setIsSubmitting(false);
      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setCustomPassword('');
    }
  };

  const handleBulkImport = async () => {
    let rowsToParse = bulkCsvText.trim();

    if (bulkFile) {
      rowsToParse = await bulkFile.text();
    }

    if (!rowsToParse) {
      error('No Input Provided', 'Please paste CSV text or select a CSV file.');
      return;
    }

    setIsSubmitting(true);
    try {
      const lines = rowsToParse.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const itemsToCreate: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        // Skip header if line 0 contains "email"
        if (i === 0 && lines[i].toLowerCase().includes('email')) continue;

        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const name = cols[0];
        const email = cols[1];
        const role = cols[2] && cols[2].toLowerCase() === 'mentor' ? 'mentor' : 'judge';
        const password = cols[3] || generatePassword();

        if (name && email && email.includes('@')) {
          itemsToCreate.push({ name, email, role, password });
        }
      }

      if (itemsToCreate.length === 0) {
        throw new Error('No valid judge rows detected in CSV. Format: name,email,role');
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/v1/judges/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ judges: itemsToCreate, actor_id: profile?.id }),
      });

      if (!res.ok) {
        throw new Error('Server bulk import failed');
      }

      success('Judges Imported', `Successfully created ${itemsToCreate.length} judges.`);
      fetchJudges();
      setIsBulkModalOpen(false);
      setBulkCsvText('');
      setBulkFile(null);
    } catch (err: any) {
      console.warn('Fallback local bulk import:', err.message);
      // Fallback
      const lines = rowsToParse.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const fallbackList: JudgeItem[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (i === 0 && lines[i].toLowerCase().includes('email')) continue;
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols[0] && cols[1]) {
          fallbackList.push({
            id: `judge-${Date.now()}-${i}`,
            name: cols[0],
            email: cols[1],
            role: (cols[2] as any) || 'judge',
            password: cols[3] || generatePassword(),
            created_at: new Date().toISOString(),
          });
        }
      }
      const existing = JSON.parse(localStorage.getItem('nexhack_custom_judges') || '[]');
      localStorage.setItem('nexhack_custom_judges', JSON.stringify([...existing, ...fallbackList]));
      setJudges((prev) => [...fallbackList, ...prev]);
      success('Judges Imported', `Imported ${fallbackList.length} judges.`);
      setIsBulkModalOpen(false);
      setBulkCsvText('');
      setBulkFile(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadCredentialsCsv = () => {
    let csv = 'Name,Email,Role,GeneratedPassword\n';
    judges.forEach((j) => {
      csv += `"${j.name}","${j.email}","${j.role}","${j.password || 'password123'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexhack_judges_credentials_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Export Complete', 'Downloaded credentials CSV for judges.');
  };

  const filteredJudges = useMemo(() => {
    if (!search.trim()) return judges;
    const s = search.toLowerCase();
    return judges.filter(
      (j) => j.name.toLowerCase().includes(s) || j.email.toLowerCase().includes(s)
    );
  }, [judges, search]);

  const navItems = [
    { label: 'Admin Dashboard', href: '/admin' },
    { label: 'Teams', href: '/admin/teams' },
    { label: 'Judges', href: '/admin/judges' },
    { label: 'Rounds', href: '/admin/rounds' },
  ];

  const columns: Column<JudgeItem>[] = [
    {
      header: 'Judge Name',
      cell: (j) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
            {j.name.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 leading-tight">{j.name}</h4>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{j.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      cell: (j) => (
        <Badge variant={j.role === 'mentor' ? 'green' : 'blue'} className="text-[10px]">
          {j.role === 'mentor' ? <Users className="w-3 h-3 mr-1 inline" /> : <Award className="w-3 h-3 mr-1 inline" />}
          {j.role}
        </Badge>
      ),
    },
    {
      header: 'Access Password',
      cell: (j) => (
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
          {j.password || 'password123'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: () => (
        <Badge variant="green" dot className="text-[10px]">
          Active
        </Badge>
      ),
    },
    {
      header: 'Print Sheet',
      cell: (j) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
            window.open(`${backendUrl}/api/v1/pdf/judgement-sheet?judge_id=${j.id}&round_id=2`, '_blank');
          }}
          leftIcon={<Printer className="w-3.5 h-3.5 text-slate-500" />}
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          PDF
        </Button>
      ),
    },
  ];

  return (
    <Layout
      user={profile ? { name: profile.name, email: profile.email, role: profile.role } : null}
      navItems={navItems}
      onSignOut={signOut}
    >
      <PageHeader
        title="Judges & Mentors Roster"
        subtitle="Provision judge credentials, assign evaluation roles, and export login details for NexHack 2.0"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
                window.open(`${backendUrl}/api/v1/pdf/judgement-sheet?round_id=2`, '_blank');
              }}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              Print Master Sheets
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCredentialsCsv}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Download Credentials CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsBulkModalOpen(true)}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
            >
              Bulk Import CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Add Judge
            </Button>
          </div>
        }
      />

      {/* Search and Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Official Judges</p>
            <h4 className="text-xl font-bold text-slate-900">
              {judges.filter((j) => j.role === 'judge').length}
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Mentors</p>
            <h4 className="text-xl font-bold text-slate-900">
              {judges.filter((j) => j.role === 'mentor').length}
            </h4>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Credentials Ready</p>
            <h4 className="text-xl font-bold text-slate-900">{judges.length}</h4>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <Card padding="sm" className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search judges by name or email..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all text-slate-900"
          />
        </div>
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredJudges}
        keyExtractor={(item) => item.email}
        emptyMessage="No judges match the search criteria."
      />

      {/* Manual Add Judge Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Judge / Mentor"
        subtitle="Create credentials for hackathon evaluation panel"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmitting}
              onClick={handleManualCreate}
            >
              Create Account
            </Button>
          </div>
        }
      >
        <form onSubmit={handleManualCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name & Title
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Dr. Jane Smith"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="judge@university.edu"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewRole('judge')}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                  newRole === 'judge'
                    ? 'border-slate-900 bg-slate-50 text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Official Judge</span>
                {newRole === 'judge' && <Check className="w-4 h-4 text-slate-900" />}
              </button>
              <button
                type="button"
                onClick={() => setNewRole('mentor')}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                  newRole === 'mentor'
                    ? 'border-slate-900 bg-slate-50 text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Mentor</span>
                {newRole === 'mentor' && <Check className="w-4 h-4 text-slate-900" />}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password Generation
              </span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenPassword}
                  onChange={(e) => setAutoGenPassword(e.target.checked)}
                  className="rounded text-slate-900 focus:ring-slate-400"
                />
                Auto-generate secure key
              </label>
            </div>
            {!autoGenPassword && (
              <input
                type="text"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Enter password manually"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none"
              />
            )}
          </div>
        </form>
      </Modal>

      {/* Bulk CSV Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Import Judges from CSV"
        subtitle="Format: name, email, role (optional), password (optional)"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmitting}
              onClick={handleBulkImport}
            >
              Parse & Create Judges
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setBulkFile(e.target.files[0]);
                }
              }}
            />
            <Upload className="w-6 h-6 mx-auto mb-2 text-slate-500" />
            <p className="text-xs font-semibold text-slate-800">
              {bulkFile ? bulkFile.name : 'Choose CSV File or drag here'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Columns: name, email, role, password</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Or Paste CSV Lines
            </label>
            <textarea
              rows={4}
              value={bulkCsvText}
              onChange={(e) => setBulkCsvText(e.target.value)}
              placeholder="Dr. John Doe, john@university.edu, judge&#10;Dr. Alice Vance, alice@tech.org, judge"
              className="w-full p-3 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </Modal>
    </Layout>
  );
};
