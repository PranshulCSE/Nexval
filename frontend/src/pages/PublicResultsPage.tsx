import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Trophy, Award, Medal, Sparkles, Maximize2, Minimize2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface WinnerEntry {
  rank: number;
  team_id: string;
  team_name: string;
  college: string;
  track: string;
  avg_total: number;
  award_title: string;
  criteria_scores?: Record<string, number>;
}

interface FinalistEntry {
  rank: number;
  team_id: string;
  team_name: string;
  college: string;
  track: string;
  avg_total: number;
}

export const PublicResultsPage: React.FC = () => {
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [eventName, setEventName] = useState('NexHack 2.0 Hackathon');
  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const [finalists, setFinalists] = useState<FinalistEntry[]>([]);
  const [revealedRanks, setRevealedRanks] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPublicResults = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/results/public');
      if (res.ok) {
        const data = await res.json();
        setIsPublished(data.is_published);
        if (data.is_published) {
          setEventName(data.event_name || 'NexHack 2.0');
          setWinners(data.winners || []);
          setFinalists(data.finalists || []);
        }
      }
    } catch {
      // Demo fallback data if API is unconfigured
      setIsPublished(true);
      setWinners([
        {
          rank: 1,
          award_title: 'Grand Champion',
          team_id: 'NEX-01',
          team_name: 'Quantum Coders',
          college: 'Geeta University',
          track: 'AI & Machine Learning',
          avg_total: 94.5,
        },
        {
          rank: 2,
          award_title: '1st Runner-Up',
          team_id: 'NEX-02',
          team_name: 'Binary Beasts',
          college: 'IIT Delhi',
          track: 'Web3 & Security',
          avg_total: 91.8,
        },
        {
          rank: 3,
          award_title: '2nd Runner-Up',
          team_id: 'NEX-05',
          team_name: 'Code Catalyst',
          college: 'NSUT',
          track: 'Fintech & Inclusion',
          avg_total: 89.2,
        },
      ]);
      setFinalists([
        { rank: 4, team_id: 'NEX-03', team_name: 'Cyber Hawks', college: 'DTU', track: 'IoT', avg_total: 87.5 },
        { rank: 5, team_id: 'NEX-06', team_name: 'NeuroBytes', college: 'Thapar University', track: 'Accessibility', avg_total: 86.0 },
        { rank: 6, team_id: 'NEX-04', team_name: 'AlgoRhythm', college: 'Geeta University', track: 'Healthcare', avg_total: 84.8 },
        { rank: 7, team_id: 'NEX-08', team_name: 'DevForge', college: 'Geeta University', track: 'CleanTech', avg_total: 83.5 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicResults();
  }, []);

  const revealRank = (rank: number) => {
    setRevealedRanks((prev) => new Set([...prev, rank]));
  };

  const revealAll = () => {
    setRevealedRanks(new Set([1, 2, 3]));
  };

  const resetReveals = () => {
    setRevealedRanks(new Set());
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F5F9] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-3 border-slate-300 border-t-[#0F172A] rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-4 font-semibold">Connecting to Grand Finale Results Stream...</p>
      </div>
    );
  }

  // Not Published Screen (Projector Waiting Mode)
  if (!isPublished) {
    return (
      <div className="min-h-screen bg-[#F4F5F9] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-2xl p-8 shadow-subtle flex flex-col items-center">
          <div className="flex items-center gap-3 mb-6">
            <img src="/geeta-university-logo.webp" alt="Geeta University" className="h-10 w-auto" />
            <span className="h-6 w-[1px] bg-slate-200" />
            <img src="/nexhack-logo.webp" alt="NexHack 2.0" className="h-11 w-auto" />
          </div>

          <Badge variant="yellow" className="text-xs py-1 px-3 mb-4 animate-pulse">
            Jury Verifications in Progress
          </Badge>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
            Grand Finale Results
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            The jury and hackathon committees are concluding the official Round 3 tie-break evaluations. The winner reveal ceremony will broadcast live on this projector screen shortly.
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchPublicResults}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Check Live Status
          </Button>
        </div>
      </div>
    );
  }

  const firstPlace = winners.find((w) => w.rank === 1);
  const secondPlace = winners.find((w) => w.rank === 2);
  const thirdPlace = winners.find((w) => w.rank === 3);

  return (
    <div className="min-h-screen bg-[#F4F5F9] text-slate-900 flex flex-col font-sans">
      {/* Top Projector Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/geeta-university-logo.webp" alt="Geeta University" className="h-9 w-auto" />
            <span className="h-5 w-[1px] bg-slate-200" />
            <img src="/nexhack-logo.webp" alt="NexHack 2.0" className="h-10 w-auto" />
            <div className="hidden sm:flex flex-col border-l border-slate-200 pl-3">
              <span className="text-xs font-bold text-slate-900">Official Grand Finale Results</span>
              <span className="text-[10px] text-slate-400 font-mono">Geeta University 24-Hour Hackathon</span>
            </div>
          </div>

          {/* Presenter Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={revealedRanks.size === 3 ? resetReveals : revealAll}
              className="text-xs"
            >
              {revealedRanks.size === 3 ? 'Reset Reveals' : 'Reveal All Winners'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              leftIcon={isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Projector Mode'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-between">
        <div className="text-center mb-8">
          <Badge variant="green" className="text-xs px-3 py-1 mb-2 font-semibold">
            OFFICIAL RESULTS CERTIFIED
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            NexHack 2.0 &bull; Winners Podium
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl mx-auto">
            Evaluated by the official panel across Innovation, Technical Execution, Impact, Scalability & Pitch.
          </p>
        </div>

        {/* Podium Layout: 2nd place (left), 1st place (center), 3rd place (right) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-12 max-w-5xl mx-auto w-full">
          {/* 2nd Place Card (1st Runner Up) */}
          <div className="order-2 md:order-1">
            <WinnerCard
              winner={secondPlace}
              placeLabel="2ND PLACE"
              awardTitle="1st Runner-Up"
              badgeColor="slate"
              isRevealed={revealedRanks.has(2)}
              onReveal={() => revealRank(2)}
              cardHeight="min-h-[280px]"
              icon={<Medal className="w-8 h-8 text-slate-400" />}
            />
          </div>

          {/* 1st Place Card (Grand Champion) - Prominent Center */}
          <div className="order-1 md:order-2">
            <WinnerCard
              winner={firstPlace}
              placeLabel="1ST PLACE"
              awardTitle="GRAND CHAMPION"
              badgeColor="yellow"
              isRevealed={revealedRanks.has(1)}
              onReveal={() => revealRank(1)}
              cardHeight="min-h-[340px]"
              isChampion
              icon={<Trophy className="w-12 h-12 text-amber-500 animate-bounce" />}
            />
          </div>

          {/* 3rd Place Card (2nd Runner Up) */}
          <div className="order-3 md:order-3">
            <WinnerCard
              winner={thirdPlace}
              placeLabel="3RD PLACE"
              awardTitle="2nd Runner-Up"
              badgeColor="amber"
              isRevealed={revealedRanks.has(3)}
              onReveal={() => revealRank(3)}
              cardHeight="min-h-[250px]"
              icon={<Award className="w-8 h-8 text-amber-700" />}
            />
          </div>
        </div>

        {/* Finalists Table */}
        {finalists.length > 0 && (
          <div className="max-w-5xl mx-auto w-full mt-4">
            <Card padding="md" className="bg-white border-slate-200 shadow-subtle">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Top 20 Hackathon Finalists
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official rankings determined by multi-judge rubric aggregate
                  </p>
                </div>
                <Badge variant="blue" className="text-[10px]">
                  Round 3 Finalists
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Team ID</th>
                      <th className="py-2.5 px-3">Team Name</th>
                      <th className="py-2.5 px-3">College</th>
                      <th className="py-2.5 px-3">Track</th>
                      <th className="py-2.5 px-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {finalists.map((f) => (
                      <tr key={f.team_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-600">#{f.rank}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{f.team_id}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{f.team_name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{f.college}</td>
                        <td className="py-2.5 px-3 text-slate-500">{f.track}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{f.avg_total.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-3 text-center text-xs text-slate-400 mt-8">
        NexHack 2.0 &bull; Organized by Geeta University &bull; Official Judging System
      </footer>
    </div>
  );
};

interface WinnerCardProps {
  winner?: WinnerEntry;
  placeLabel: string;
  awardTitle: string;
  badgeColor: 'slate' | 'yellow' | 'amber';
  isRevealed: boolean;
  onReveal: () => void;
  cardHeight: string;
  isChampion?: boolean;
  icon: React.ReactNode;
}

const WinnerCard: React.FC<WinnerCardProps> = ({
  winner,
  placeLabel,
  awardTitle,
  isRevealed,
  onReveal,
  cardHeight,
  isChampion,
  icon,
}) => {
  if (!winner) return null;

  return (
    <Card
      padding="none"
      className={`relative overflow-hidden bg-white border-2 transition-all duration-500 flex flex-col justify-between ${cardHeight} ${
        isChampion
          ? 'border-slate-900 shadow-md ring-2 ring-slate-900/5'
          : 'border-slate-200/90 shadow-subtle'
      }`}
    >
      {/* Header Banner */}
      <div
        className={`px-4 py-2.5 text-center text-xs font-bold tracking-wider uppercase border-b ${
          isChampion
            ? 'bg-[#0F172A] text-white border-slate-900'
            : 'bg-slate-50 text-slate-700 border-slate-200'
        }`}
      >
        {placeLabel} &bull; {awardTitle}
      </div>

      {/* Body */}
      <div className="p-6 flex flex-col items-center justify-center text-center flex-1">
        {!isRevealed ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Awaiting Reveal
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={onReveal}
              className="text-xs font-semibold px-4 py-1.5"
            >
              Reveal {placeLabel}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 w-full animate-fadeIn">
            <div className="flex justify-center mb-1">{icon}</div>
            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
              {winner.team_id}
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
              {winner.team_name}
            </h2>
            <p className="text-xs text-slate-500 leading-snug">
              {winner.college}
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Track:</span>
              <span className="font-bold text-slate-700">{winner.track}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Score:</span>
              <span className="font-mono font-bold text-slate-900">{winner.avg_total.toFixed(1)} / 100</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
