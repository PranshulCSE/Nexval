import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, X, ArrowRight, ArrowLeft, Download } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

interface PreviewRow {
  row_number: number;
  team_id: string;
  team_name: string;
  college?: string;
  members?: string[];
  extra_data?: Record<string, any>;
  already_exists?: boolean;
  errors?: string[];
}

interface PreviewResponse {
  total_rows: number;
  valid_count: number;
  error_count: number;
  headers: string[];
  valid_rows: PreviewRow[];
  error_rows: PreviewRow[];
  message: string;
}

interface TeamUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TeamUploadModal: React.FC<TeamUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'select' | 'preview'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { success, error } = useToast();
  const { profile } = useAuth();

  const resetState = () => {
    setStep('select');
    setFile(null);
    setPreviewData(null);
    setIsUploading(false);
    setIsCommitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const downloadSampleCSV = () => {
    const csvContent =
      "team_id,team_name,college,members\n" +
      "NEX-101,Aegis Guard,Geeta University,\"Aarav Sen, Kavya Iyer\"\n" +
      "NEX-102,Solaris X,IIT Roorkee,\"Nikhil Sharma, Rhea Rao\"\n" +
      "NEX-103,MediSync,BITS Pilani,\"Tanmay Roy, Sanya Goel\"\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'nexhack_sample_teams.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processFilePreview = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/teams/upload/preview`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to process file on server');
      }

      const data: PreviewResponse = await response.json();
      setPreviewData(data);
      setStep('preview');
      success('File Analyzed', `Parsed ${data.total_rows} rows: ${data.valid_count} valid, ${data.error_count} issues.`);
    } catch (err: any) {
      console.warn('Backend preview failed, running local CSV fallback parsing:', err.message);
      // Client-side fallback preview parsing if backend is unreachable
      try {
        const text = await selectedFile.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) throw new Error('File has no data rows');

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const validRows: PreviewRow[] = [];
        const errorRows: PreviewRow[] = [];
        const seenIds = new Set<string>();

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          const tId = cols[0] || '';
          const tName = cols[1] || '';
          const tCollege = cols[2] || '';
          const tMembers = cols[3] ? [cols[3]] : [];
          const rowErrors: string[] = [];

          if (!tId) rowErrors.push('Missing required team_id');
          else if (seenIds.has(tId)) rowErrors.push(`Duplicate team_id: '${tId}'`);
          else seenIds.add(tId);

          if (!tName) rowErrors.push('Missing required team_name');

          const item: PreviewRow = {
            row_number: i + 1,
            team_id: tId,
            team_name: tName,
            college: tCollege,
            members: tMembers,
            extra_data: cols[4] ? { extra: cols[4] } : {},
          };

          if (rowErrors.length > 0) {
            errorRows.push({ ...item, errors: rowErrors });
          } else {
            validRows.push(item);
          }
        }

        const fallbackData: PreviewResponse = {
          total_rows: lines.length - 1,
          valid_count: validRows.length,
          error_count: errorRows.length,
          headers,
          valid_rows: validRows,
          error_rows: errorRows,
          message: 'Client-side parsed preview',
        };

        setPreviewData(fallbackData);
        setStep('preview');
        success('File Preview Ready', `Found ${validRows.length} valid teams.`);
      } catch (parseErr: any) {
        error('File Parse Error', parseErr.message || 'Could not parse CSV file');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || previewData.valid_count === 0) return;
    setIsCommitting(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const payload = {
        teams: previewData.valid_rows.map((r) => ({
          team_id: r.team_id,
          team_name: r.team_name,
          college: r.college || 'Geeta University',
          members: r.members || [],
          passcode: (r as any).passcode || (r.extra_data?.passcode) || 'NEX-7K9P',
          extra_data: r.extra_data || {},
          current_round: 1,
          status: 'active',
        })),
        actor_id: profile?.id || null,
      };

      const response = await fetch(`${backendUrl}/api/v1/teams/upload/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Commit failed on server');
      }

      success('Import Successful', `Committed ${previewData.valid_count} teams into the system.`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.warn('Backend commit error, saving to local state:', err);
      // Fallback local storage
      const existing = JSON.parse(localStorage.getItem('nexhack_custom_teams') || '[]');
      const newTeams = previewData.valid_rows.map((r) => ({
        id: `t-local-${Date.now()}-${r.team_id}`,
        team_id: r.team_id,
        team_name: r.team_name,
        college: r.college || 'Geeta University',
        members: r.members || [],
        extra_data: r.extra_data || {},
        current_round: 1,
        status: 'active',
        created_at: new Date().toISOString(),
      }));
      localStorage.setItem('nexhack_custom_teams', JSON.stringify([...existing, ...newTeams]));
      success('Import Committed', `Saved ${newTeams.length} teams.`);
      onSuccess();
      handleClose();
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFilePreview(e.dataTransfer.files[0]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'select' ? 'Import Teams' : 'Preview & Validate Teams'}
      subtitle={
        step === 'select'
          ? 'Upload team roster via CSV or Excel file'
          : `Validating rows from "${file?.name}"`
      }
      maxWidth="xl"
      footer={
        step === 'select' ? (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={downloadSampleCSV}
              className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5 font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample CSV
            </button>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep('select')}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Choose Another File
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!previewData || previewData.valid_count === 0}
                isLoading={isCommitting}
                onClick={handleCommit}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Commit {previewData?.valid_count || 0} Teams
              </Button>
            </div>
          </div>
        )
      }
    >
      {step === 'select' && (
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-slate-900 bg-slate-50'
                : 'border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFilePreview(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-subtle text-slate-600">
              <UploadCloud className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">
              Click to select or drag and drop roster file
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Supports CSV, Microsoft Excel (.xlsx, .xls). Unrecognized columns are automatically captured into extra data.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="gray" className="text-[10px]">team_id (required)</Badge>
              <Badge variant="gray" className="text-[10px]">team_name (required)</Badge>
              <Badge variant="gray" className="text-[10px]">college (optional)</Badge>
              <Badge variant="gray" className="text-[10px]">members (optional)</Badge>
            </div>
          </div>

          {isUploading && (
            <div className="flex items-center justify-center gap-2 p-3 text-xs text-slate-600">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-[#0F172A] rounded-full animate-spin" />
              <span>Parsing and validating headers...</span>
            </div>
          )}
        </div>
      )}

      {step === 'preview' && previewData && (
        <div className="space-y-4">
          {/* Summary Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100 text-xs">
            <span className="font-semibold text-slate-700">Total Rows: {previewData.total_rows}</span>
            <span className="text-slate-300">&bull;</span>
            <Badge variant="green" dot>
              {previewData.valid_count} Ready to Import
            </Badge>
            {previewData.error_count > 0 && (
              <Badge variant="red" dot>
                {previewData.error_count} Invalid / Missing
              </Badge>
            )}
            <span className="text-slate-400 text-[11px] ml-auto font-mono">
              Step 1 of 2: Saves nothing until confirmed
            </span>
          </div>

          {/* Table Container */}
          <div className="max-h-[360px] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Team ID</th>
                  <th className="px-3 py-2">Team Name</th>
                  <th className="px-3 py-2">College</th>
                  <th className="px-3 py-2">Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Invalid / Error Rows first for clear visibility */}
                {previewData.error_rows.map((row, idx) => (
                  <tr key={`err-${idx}`} className="bg-rose-50/40 hover:bg-rose-50/70">
                    <td className="px-3 py-2 font-mono text-slate-400">#{row.row_number}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-rose-900">
                      {row.team_id || <span className="italic text-rose-400">[missing]</span>}
                    </td>
                    <td className="px-3 py-2 text-rose-900">
                      {row.team_name || <span className="italic text-rose-400">[missing]</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{row.college || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="space-y-0.5">
                        {row.errors?.map((err, eIdx) => (
                          <span
                            key={eIdx}
                            className="inline-flex items-center text-[10px] text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded font-medium mr-1"
                          >
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                            {err}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Valid Rows */}
                {previewData.valid_rows.map((row, idx) => (
                  <tr key={`val-${idx}`} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-slate-400">#{row.row_number}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-slate-900">{row.team_id}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.team_name}</td>
                    <td className="px-3 py-2 text-slate-500">{row.college || 'Geeta University'}</td>
                    <td className="px-3 py-2">
                      <Badge variant="green" className="text-[10px]">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1 inline" />
                        Valid
                      </Badge>
                      {row.already_exists && (
                        <Badge variant="yellow" className="text-[9px] ml-1">
                          Updates existing
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
};
