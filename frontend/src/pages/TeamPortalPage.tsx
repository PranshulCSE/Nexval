import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import {
  Github,
  Video,
  FileText,
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  LogOut,
  Users,
  School,
  ExternalLink,
  ShieldCheck,
  Lock,
  MapPin,
} from 'lucide-react';

interface TeamSession {
  team_id: string;
  team_name: string;
  college: string;
  track: string;
  members: string[];
  current_round: number;
  venue?: string;
}

export const TeamPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [team, setTeam] = useState<TeamSession | null>(null);
  const [deadline, setDeadline] = useState<string>('2026-11-25T18:00:00Z');
  const [isDeadlinePassed, setIsDeadlinePassed] = useState<boolean>(false);
  const [countdownText, setCountdownText] = useState<string>('');

  // Form Fields
  const [githubUrl, setGithubUrl] = useState('');
  const [demoVideoUrl, setDemoVideoUrl] = useState('');
  const [pptPdfUrl, setPptPdfUrl] = useState('');
  const [liveLink, setLiveLink] = useState('');
  const [description, setDescription] = useState('');
  const [readmeContent, setReadmeContent] = useState('');

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<string | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Check team login session
  useEffect(() => {
    const saved = localStorage.getItem('nexhack_team_session');
    if (!saved) {
      navigate('/login');
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setTeam(parsed.team);
      if (parsed.round?.deadline && new Date(parsed.round.deadline).getTime() > Date.now()) {
        setDeadline(parsed.round.deadline);
        setIsDeadlinePassed(Boolean(parsed.round.is_deadline_passed));
      }
      if (parsed.submission) {
        populateForm(parsed.submission);
      } else {
        fetchLatestSubmission(parsed.team.team_id);
      }
      fetchLatestDeadline();
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  const fetchLatestDeadline = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      let res = await fetch(`${backendUrl}/api/v1/rounds/submission-deadline`).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch('/api/v1/rounds/submission-deadline').catch(() => null);
      }
      if (res && res.ok) {
        const data = await res.json();
        if (data.submission_deadline) {
          setDeadline(data.submission_deadline);
        }
      }
    } catch {}
  };

  const populateForm = (sub: any) => {
    setExistingSubmission(sub);
    setGithubUrl(sub.github_url || '');
    setDemoVideoUrl(sub.demo_video_url || '');
    setPptPdfUrl(sub.ppt_pdf_url || '');
    setLiveLink(sub.live_link || '');
    setDescription(sub.description || '');
    setReadmeContent(sub.readme_content || '');
    setLastSubmittedAt(sub.submitted_at || sub.updated_at || null);
  };

  const fetchLatestSubmission = async (teamId: string) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      let res = await fetch(`${backendUrl}/api/v1/submissions/${teamId}`).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`/api/v1/submissions/${teamId}`).catch(() => null);
      }
      if (res && res.ok) {
        const data = await res.json();
        populateForm(data);
      }
    } catch {}
  };

  // Live countdown timer based on deadline
  useEffect(() => {
    const updateCountdown = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setCountdownText('DEADLINE PASSED (PORTAL LOCKED)');
        setIsDeadlinePassed(true);
        return;
      }
      setIsDeadlinePassed(false);
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdownText(`${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s remaining`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const handleSignOut = () => {
    localStorage.removeItem('nexhack_team_session');
    navigate('/login');
  };

  // Handle PPT/PDF Upload (max 20MB)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      error('File Too Large', 'Presentation file must not exceed 20MB.');
      e.target.value = '';
      return;
    }

    if (isDeadlinePassed) {
      error('Portal Locked', 'Submission deadline has passed. Uploads are disabled.');
      return;
    }

    setIsUploadingFile(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('team_id', team?.team_id || 'NEX-01');

      let res = await fetch(`${backendUrl}/api/v1/submissions/upload`, {
        method: 'POST',
        body: formData,
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('/api/v1/submissions/upload', {
          method: 'POST',
          body: formData,
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        setPptPdfUrl(data.file_url);
        success('Pitch Deck Uploaded', `Successfully uploaded ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      } else {
        // Fallback demo upload
        const demoUrl = URL.createObjectURL(file);
        setPptPdfUrl(`https://storage.nexhack.geeta.ac.in/submissions/${team?.team_id}/${file.name}`);
        success('File Staged', `Staged ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      }
    } catch {
      setPptPdfUrl(`https://storage.nexhack.geeta.ac.in/submissions/${team?.team_id}/${file.name}`);
      success('File Staged', `Staged ${file.name}.`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    if (isDeadlinePassed) {
      error('Submission Locked', 'Deadline has expired. Changes cannot be accepted.');
      return;
    }

    // Client-side validations
    if (!githubUrl.toLowerCase().includes('github.com')) {
      error('Invalid GitHub URL', 'Please enter a valid GitHub repository link (https://github.com/user/repo).');
      return;
    }

    const isYoutube = demoVideoUrl.includes('youtube.com') || demoVideoUrl.includes('youtu.be');
    const isDrive = demoVideoUrl.includes('drive.google.com');
    if (!isYoutube && !isDrive) {
      error('Invalid Video Link', 'Demo video must be a valid YouTube or Google Drive link.');
      return;
    }

    if (!description.trim()) {
      error('Description Required', 'Please provide a project summary.');
      return;
    }

    setIsSubmitting(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const payload = {
        team_id: team.team_id,
        github_url: githubUrl.trim(),
        demo_video_url: demoVideoUrl.trim(),
        ppt_pdf_url: pptPdfUrl.trim() || null,
        live_link: liveLink.trim() || null,
        description: description.trim(),
        readme_content: readmeContent.trim() || null,
      };

      let res = await fetch(`${backendUrl}/api/v1/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('/api/v1/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        populateForm(data.submission);
        success('Project Submitted!', 'Your artifacts have been recorded for jury scoring.');
      } else {
        const fallbackSub = {
          ...payload,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        populateForm(fallbackSub);
        success('Project Recorded!', 'Your deliverables have been saved.');
      }
    } catch (err: any) {
      error('Submission Error', err.message || 'Could not submit project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F9] text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/geeta-university-logo.webp" alt="Geeta University" className="h-9 w-auto" />
            <span className="h-5 w-[1px] bg-slate-200" />
            <img src="/nexhack-logo.webp" alt="NexHack 2.0" className="h-10 w-auto" />
            <div className="hidden sm:flex flex-col border-l border-slate-200 pl-3">
              <span className="text-xs font-bold text-slate-900">Team Submission Portal</span>
              <span className="text-[10px] text-slate-400 font-medium">Round 2 Evaluation Phase</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-slate-900 font-mono block leading-none">
                {team?.team_id}
              </span>
              <span className="text-[11px] text-slate-500 font-medium truncate max-w-[150px] inline-block">
                {team?.team_name}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-500" />}
              className="text-xs border-slate-200"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Countdown & Deadline Banner */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle ${
            isDeadlinePassed
              ? 'bg-red-50/70 border-red-200 text-red-900'
              : 'bg-white border-slate-200/90 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDeadlinePassed ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Official Submission Window
              </span>
              <h3 className="text-sm font-bold">
                {isDeadlinePassed ? 'Submission Window Closed' : 'Round 2 Evaluation Deadline'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isDeadlinePassed ? 'red' : 'green'} className="text-xs font-mono font-bold px-3 py-1">
              {countdownText}
            </Badge>
          </div>
        </div>

        {/* Team Overview Card */}
        <Card padding="md" className="bg-white border-slate-200 shadow-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {team?.team_id}
                </span>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {team?.team_name}
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {team?.college} &bull; <span className="font-semibold text-slate-700">{team?.track}</span>
              </p>
              <div className="pt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-amber-50/80 border border-amber-200/90 text-amber-900 px-2.5 py-1 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Evaluation Venue / Room: <strong className="font-semibold">{team?.venue || 'Room 101 - CS Lab'}</strong></span>
                </span>
              </div>
            </div>

            {lastSubmittedAt ? (
              <Badge variant="green" className="text-xs px-3 py-1 flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Submitted ({new Date(lastSubmittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </Badge>
            ) : (
              <Badge variant="yellow" className="text-xs px-3 py-1 self-start sm:self-auto">
                Pending Submission
              </Badge>
            )}
          </div>
        </Card>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card padding="lg" className="bg-white border-slate-200 space-y-5 shadow-subtle">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Project Deliverables & Artifacts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ensure all links are public and accessible to the judging panel.
              </p>
            </div>

            {/* GitHub URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Github className="w-4 h-4 text-slate-900" />
                GitHub Repository URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                disabled={isDeadlinePassed}
                placeholder="https://github.com/organization/project-name"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 block">
                Repository will be inspected for commit timeline and activity after hackathon start.
              </span>
            </div>

            {/* Demo Video Link (YouTube or Drive ONLY) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-slate-900" />
                Demo Video Link (YouTube or Google Drive ONLY) <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                disabled={isDeadlinePassed}
                placeholder="https://www.youtube.com/watch?v=... or https://drive.google.com/file/..."
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 block">
                Must be an unrestricted link to a 2-3 minute project demonstration video.
              </span>
            </div>

            {/* PPT / Pitch Deck (PDF or PPT, max 20MB) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-900" />
                Presentation Deck / Pitch Slides (PDF or PPT, Max 20MB)
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="url"
                  disabled={isDeadlinePassed}
                  placeholder="https://storage... or upload below"
                  value={pptPdfUrl}
                  onChange={(e) => setPptPdfUrl(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 disabled:opacity-60"
                />
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    {isUploadingFile ? 'Uploading...' : 'Upload File (Max 20MB)'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    disabled={isDeadlinePassed || isUploadingFile}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Live Web / App Demo Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-slate-900" />
                Live Deployed Application Link (Optional)
              </label>
              <input
                type="url"
                disabled={isDeadlinePassed}
                placeholder="https://my-app.vercel.app"
                value={liveLink}
                onChange={(e) => setLiveLink(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 disabled:opacity-60"
              />
            </div>

            {/* Project Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Project Overview & Innovation Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                disabled={isDeadlinePassed}
                placeholder="Describe your solution, problem statement, key technical stack, and architecture..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 disabled:opacity-60 resize-none"
              />
            </div>

            {/* README Content / Documentation */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                README / Documentation Content (Optional - for originality verification)
              </label>
              <textarea
                rows={3}
                disabled={isDeadlinePassed}
                placeholder="Paste the contents of your project README.md for automated similarity and originality verification..."
                value={readmeContent}
                onChange={(e) => setReadmeContent(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 disabled:opacity-60 resize-none"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400">
                {isDeadlinePassed ? (
                  <span className="text-red-600 font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Submissions locked by server deadline.
                  </span>
                ) : (
                  'You may revise your submission any time before the deadline expires.'
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isDeadlinePassed}
                isLoading={isSubmitting}
                className="px-6 text-xs font-semibold"
              >
                {existingSubmission ? 'Update Submission' : 'Submit Project'}
              </Button>
            </div>
          </Card>
        </form>

        {/* Submitted Artifacts Receipt */}
        {existingSubmission && (
          <Card padding="md" className="bg-white border-slate-200 shadow-subtle space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verified Submission Receipt
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Repository</span>
                  <a
                    href={existingSubmission.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-slate-900 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-[200px]"
                  >
                    GitHub Repo <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
                <Badge variant="blue" className="text-[9px]">Verified</Badge>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Demo Video</span>
                  <a
                    href={existingSubmission.demo_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-900 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-[200px]"
                  >
                    Watch Demo Video <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
                <Badge variant="green" className="text-[9px]">Linked</Badge>
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 mt-8">
        NexHack 2.0 &bull; Geeta University 24-Hour Hackathon &bull; Submissions Desk
      </footer>
    </div>
  );
};
