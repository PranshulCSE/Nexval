import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Download, MessageSquare, CheckCircle2, ShieldCheck, AlertCircle, FileText, Lock } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface RemarkItem {
  judge_name: string;
  role: 'judge' | 'mentor';
  remarks: string;
  created_at?: string;
}

interface TeamFeedbackData {
  team_id: string;
  team_name: string;
  college: string;
  track?: string;
  round_number: number;
  round_name: string;
  is_published: boolean;
  remarks: RemarkItem[];
}

interface TeamFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string | null;
  isAdmin?: boolean;
}

export const TeamFeedbackModal: React.FC<TeamFeedbackModalProps> = ({
  isOpen,
  onClose,
  teamId,
  isAdmin = false,
}) => {
  const { success, error } = useToast();
  const [data, setData] = useState<TeamFeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!isOpen || !teamId) return;

    const fetchFeedback = async () => {
      setIsLoading(true);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
        const res = await fetch(`${backendUrl}/api/v1/feedback/teams/${teamId}?is_admin=${isAdmin}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          const err = await res.json().catch(() => ({}));
          error('Feedback Locked', err.detail || 'Feedback is not currently approved for release.');
          setData(null);
        }
      } catch {
        // Fallback demo data
        setData({
          team_id: teamId,
          team_name: `Team ${teamId}`,
          college: 'Geeta University',
          track: 'AI & Data Science',
          round_number: 1,
          round_name: 'Round 1: Guidance Phase',
          is_published: true,
          remarks: [
            {
              judge_name: 'Dr. Sarah Verma',
              role: 'judge',
              remarks: 'Excellent architectural foundation. Make sure the latency stays under 100ms when tested under edge conditions for Round 2.',
              created_at: '2026-11-17T16:00:00Z',
            },
            {
              judge_name: 'Vikram Malhotra',
              role: 'mentor',
              remarks: 'Great UI flow. Consider clarifying the target demographic in your pitch slides. High potential for product-market fit.',
              created_at: '2026-11-17T17:30:00Z',
            },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedback();
  }, [isOpen, teamId, isAdmin]);

  const handleTogglePublish = async () => {
    if (!data) return;
    setIsPublishing(true);
    try {
      const nextStatus = !data.is_published;
      const res = await fetch('/api/v1/feedback/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: nextStatus }),
      });
      if (res.ok) {
        setData((prev) => (prev ? { ...prev, is_published: nextStatus } : null));
        success(
          nextStatus ? 'Feedback Published' : 'Feedback Retracted',
          nextStatus
            ? 'Teams can now download and view their official Round 1 feedback cards.'
            : 'Feedback reports have been hidden from teams.'
        );
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const downloadPdf = () => {
    if (!teamId) return;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    window.open(`${backendUrl}/api/v1/feedback/teams/${teamId}/pdf?is_admin=${isAdmin}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Team Feedback Report (Round 1 Guidance)"
    >
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0F172A] rounded-full animate-spin" />
          <p className="text-xs text-slate-400 mt-3">Loading official remarks...</p>
        </div>
      ) : !data ? (
        <div className="text-center py-8">
          <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-700">Feedback Reports Not Released</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Hackathon administrators have not yet approved the public release of Round 1 feedback.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Team overview block */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {data.team_id}
                </span>
                <h4 className="text-sm font-bold text-slate-900">{data.team_name}</h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.college}{data.track ? <> &bull; <span className="font-medium text-slate-700">{data.track}</span></> : null}
              </p>
            </div>

            <Badge variant={data.is_published ? 'green' : 'yellow'} className="text-[10px]">
              {data.is_published ? 'Released to Team' : 'Pending Approval'}
            </Badge>
          </div>

          {/* Qualitative Guidance Notice */}
          <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Round 1 Guidance Phase Notice</strong>
              Round 1 focuses solely on qualitative mentorship. Numeric marks are not given or recorded during this phase to maintain competitive integrity.
            </div>
          </div>

          {/* Evaluator Remarks List */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Evaluator & Mentor Observations ({data.remarks.length})
            </h5>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {data.remarks.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No written remarks recorded for this team.
                </div>
              ) : (
                data.remarks.map((r, i) => (
                  <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-subtle">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{r.judge_name}</span>
                      <Badge variant={r.role === 'mentor' ? 'green' : 'blue'} className="text-[9px]">
                        {r.role.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 italic leading-relaxed">
                      "{r.remarks}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {isAdmin ? (
              <Button
                variant={data.is_published ? 'outline' : 'primary'}
                size="sm"
                onClick={handleTogglePublish}
                isLoading={isPublishing}
                className="text-xs"
              >
                {data.is_published ? 'Revoke Approval' : 'Approve & Release to Teams'}
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPdf}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Download Feedback PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={onClose} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
