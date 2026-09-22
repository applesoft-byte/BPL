import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Lock,
  CheckCircle2,
  Trophy,
  Users,
  Shield,
  Layers,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Zap,
  Settings,
  Edit,
  Shuffle,
  Eye,
  Check,
  Filter,
} from 'lucide-react';
import { Category, Draft, PickRecord, Player, Team } from '../types';
import { BplLogo } from './BplLogo';
import { soundManager } from '../lib/sound';
import { DraftPoolModal } from './DraftPoolModal';
import { TournamentEditModal } from './TournamentEditModal';
import { CasinoRouletteWheel } from './CasinoRouletteWheel';

interface LiveDraftViewProps {
  draft: Draft;
  teams: Team[];
  players: Player[];
  categories: Category[];
  picks: PickRecord[];
  onExecutePick: (player: Player, team: Team, categoryId: string) => Promise<void>;
  onUndoLatestPick: () => Promise<void>;
  onUpdateDraftCategory: (categoryId: string) => Promise<void>;
  onCompleteDraft: () => Promise<void>;
  onNavigateToResults: () => void;
  onNavigateToHistory: () => void;
  onSaveDraft?: (draft: Draft) => Promise<void>;
  onBulkSavePlayers?: (players: Player[]) => Promise<void>;
}

export const LiveDraftView: React.FC<LiveDraftViewProps> = ({
  draft,
  teams,
  players,
  categories,
  picks,
  onExecutePick,
  onUndoLatestPick,
  onUpdateDraftCategory,
  onCompleteDraft,
  onNavigateToResults,
  onNavigateToHistory,
  onSaveDraft,
  onBulkSavePlayers,
}) => {
  // Current active category
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    draft.currentCategoryId || categories[0]?.id || ''
  );

  // Casino Roulette physics state
  const [cylinderRotation, setCylinderRotation] = useState<number>(0);
  const [ballAngle, setBallAngle] = useState<number>(0);
  const [ballRadiusPercent, setBallRadiusPercent] = useState<number>(43.5);
  const [isBallInPocket, setIsBallInPocket] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningTeamId, setWinningTeamId] = useState<string | null>(null);

  // Selected player on deck (the player about to be drafted)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Modals
  const [congratsData, setCongratsData] = useState<{
    player: Player;
    team: Team;
    category: Category;
  } | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);

  // Sound preference state
  const [isMuted, setIsMuted] = useState<boolean>(!soundManager.enabled);

  // Draft Pool calculation (all players who are inDraftPool !== false)
  const inPoolPlayers = useMemo(() => {
    return players.filter((p) => p.inDraftPool !== false);
  }, [players]);

  // Sync active category if draft updates
  useEffect(() => {
    if (draft.currentCategoryId && draft.currentCategoryId !== activeCategoryId) {
      setActiveCategoryId(draft.currentCategoryId);
    }
  }, [draft.currentCategoryId]);

  // Overall Draft Progress Calculation
  const totalRequired = useMemo(() => {
    return teams.reduce((acc, t) => {
      const qSum = Object.values(t.quotas).reduce((s, q) => s + (q || 0), 0);
      return acc + Math.max(t.maxPlayers || 11, qSum);
    }, 0);
  }, [teams]);

  const draftedPlayersCount = useMemo(() => {
    return players.filter((p) => p.status === 'drafted').length;
  }, [players]);

  const isAllAllocationsComplete = draftedPlayersCount >= totalRequired && totalRequired > 0;

  // Active Category Object
  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === activeCategoryId) || categories[0];
  }, [categories, activeCategoryId]);

  // Eligible Players for active category and pool
  const eligiblePlayers = useMemo(() => {
    return players.filter((p) => {
      if (p.status !== 'available') return false;
      if (p.inDraftPool === false) return false;

      if (draft.settings.categoryMode === 'all_mixed') {
        return teams.some((t) => {
          const catQuota = t.quotas[p.primaryCategoryId] || 0;
          const assignedCount = players.filter(
            (pl) =>
              pl.assignedTeamId === t.id &&
              (pl.primaryCategoryId === p.primaryCategoryId ||
                pl.assignedCategoryId === p.primaryCategoryId)
          ).length;
          const teamTotal = players.filter((pl) => pl.assignedTeamId === t.id).length;
          return assignedCount < catQuota && teamTotal < (t.maxPlayers || 11);
        });
      }

      return p.primaryCategoryId === activeCategoryId;
    });
  }, [players, teams, activeCategoryId, draft.settings.categoryMode]);

  // Eligible Teams for active category
  const eligibleTeams = useMemo(() => {
    return teams.filter((t) => {
      if (!t.active) return false;
      const teamPlayers = players.filter((p) => p.assignedTeamId === t.id);
      const maxLimit = t.maxPlayers || 11;
      if (teamPlayers.length >= maxLimit) return false;

      if (draft.settings.categoryMode === 'all_mixed') {
        return true;
      }

      const quota = t.quotas[activeCategoryId] ?? 0;
      const draftedInCat = teamPlayers.filter(
        (p) =>
          p.primaryCategoryId === activeCategoryId || p.assignedCategoryId === activeCategoryId
      ).length;

      return draftedInCat < quota;
    });
  }, [teams, players, activeCategoryId, draft.settings.categoryMode]);

  // The active player currently shown on the wheel
  const activeWheelPlayer = useMemo(() => {
    if (selectedPlayerId) {
      const found = eligiblePlayers.find((p) => p.id === selectedPlayerId);
      if (found) return found;
    }
    return eligiblePlayers[0] || null;
  }, [eligiblePlayers, selectedPlayerId]);

  // Auto-advance category when current category is exhausted
  useEffect(() => {
    if (draft.settings.categoryMode === 'category_by_category') {
      if (eligibleTeams.length === 0 || eligiblePlayers.length === 0) {
        const nextCat = categories.find((c) => {
          const hasOpenTeam = teams.some((t) => {
            const quota = t.quotas[c.id] || 0;
            const assigned = players.filter(
              (p) =>
                p.assignedTeamId === t.id &&
                (p.primaryCategoryId === c.id || p.assignedCategoryId === c.id)
            ).length;
            const totalInTeam = players.filter((p) => p.assignedTeamId === t.id).length;
            return assigned < quota && totalInTeam < (t.maxPlayers || 11);
          });
          const hasAvailPlayer = players.some(
            (p) => p.status === 'available' && p.inDraftPool !== false && p.primaryCategoryId === c.id
          );
          return hasOpenTeam && hasAvailPlayer;
        });

        if (nextCat && nextCat.id !== activeCategoryId) {
          setActiveCategoryId(nextCat.id);
          onUpdateDraftCategory(nextCat.id);
        }
      }
    }
  }, [
    eligibleTeams.length,
    eligiblePlayers.length,
    draft.settings.categoryMode,
    categories,
    teams,
    players,
  ]);

  // Check overall draft completion
  useEffect(() => {
    if (isAllAllocationsComplete && draft.status !== 'completed' && !isSpinning) {
      setShowCompletionModal(true);
      onCompleteDraft();
      triggerConfetti();
    }
  }, [isAllAllocationsComplete, draft.status, isSpinning]);

  const triggerConfetti = () => {
    if (!draft.settings.celebrationEnabled) return;
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#1283E6', '#FF7A2E', '#16A34A', '#F97316', '#DC2626', '#FFD700', '#FFFFFF'],
      });
    } catch {}
  };

  const toggleSound = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    soundManager.enabled = !newState;
  };

  // Cryptographically secure random helper
  const getCryptoRandomIndex = (length: number): number => {
    if (length <= 1) return 0;
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % length;
  };

  // MAIN CASINO ROULETTE SPIN ACTION:
  // "Jokhon ekjon player er jonno spin kora hobe tokhon sei player ti Wheel er upore ashbe then spin korte thakbe both team and the player then ashte ashte spin er speed komte thakbe last e randomly je kono team er kache giye theme jabe then congratulation and others thing ashbe."
  const handleStartSpin = async () => {
    if (isSpinning || isAllAllocationsComplete) return;

    if (!activeWheelPlayer) {
      alert(`No available players in Draft Pool for category "${currentCategory?.name || 'Selected'}". Check Draft Pool!`);
      return;
    }

    if (eligibleTeams.length === 0) {
      alert(`All team quotas for category "${currentCategory?.name || 'Selected'}" are already full!`);
      return;
    }

    const playerToDraft = activeWheelPlayer;

    // Filter valid teams for this player
    let validTeamsForPlayer = eligibleTeams;
    if (draft.settings.categoryMode === 'all_mixed') {
      validTeamsForPlayer = eligibleTeams.filter((t) => {
        const q = t.quotas[playerToDraft.primaryCategoryId] || 0;
        const count = players.filter(
          (p) =>
            p.assignedTeamId === t.id &&
            (p.primaryCategoryId === playerToDraft.primaryCategoryId ||
              p.assignedCategoryId === playerToDraft.primaryCategoryId)
        ).length;
        return count < q;
      });
      if (validTeamsForPlayer.length === 0) {
        validTeamsForPlayer = eligibleTeams;
      }
    }

    // 1. Pick destination team randomly using cryptographically secure RNG
    const chosenIndex = getCryptoRandomIndex(validTeamsForPlayer.length);
    const destinationTeam = validTeamsForPlayer[chosenIndex];

    // 2. Casino Roulette Geometry Calculation:
    const totalPockets = Math.max(12, teams.length * 4);
    const pocketSlice = 360 / totalPockets;

    // Find pockets matching destinationTeam
    const matchingPockets: number[] = [];
    for (let i = 0; i < totalPockets; i++) {
      if (teams[i % teams.length].id === destinationTeam.id) {
        matchingPockets.push(i);
      }
    }
    const targetPocketIndex =
      matchingPockets.length > 0
        ? matchingPockets[getCryptoRandomIndex(matchingPockets.length)]
        : 0;

    // Initial state
    const startCylinder = cylinderRotation;
    const startBall = ballAngle;
    const totalSpinTime = 4600; // 4.6 seconds total spin

    // Cylinder rotates clockwise by ~4.5 full turns
    const cylinderTurns = 4;
    const finalCylinder = startCylinder + cylinderTurns * 360 + 60;

    // The angle of the target pocket center at stop is:
    const targetPocketAngle = finalCylinder + targetPocketIndex * pocketSlice + pocketSlice / 2;

    // The Ivory Ball spins counter-clockwise around the rim by ~8 full turns and lands exactly in targetPocketAngle!
    const ballTurns = 8;
    const targetNorm = ((targetPocketAngle % 360) + 360) % 360;
    const startNorm = ((startBall % 360) + 360) % 360;
    const diff = (targetNorm - startNorm - 360) % 360;
    const finalBall = startBall - ballTurns * 360 + diff;

    setIsSpinning(true);
    setWinningTeamId(null);
    setIsBallInPocket(false);
    setBallRadiusPercent(43.5);
    soundManager.playClick();

    const startTime = performance.now();
    let lastBounceTime = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / totalSpinTime);

      // Deceleration curve: fast launch gradually coming to a stop
      const ease = 1 - Math.pow(1 - progress, 3.2);

      const curCylinder = startCylinder + (finalCylinder - startCylinder) * ease;
      const curBall = startBall + (finalBall - startBall) * ease;

      setCylinderRotation(curCylinder);
      setBallAngle(curBall);

      // Ball Radius transition: outer track -> deflectors -> pocket
      if (progress < 0.6) {
        setBallRadiusPercent(43.5); // high centrifugal force on outer track
      } else if (progress < 0.88) {
        const dropProgress = (progress - 0.6) / 0.28;
        setBallRadiusPercent(43.5 - dropProgress * 4.5); // drops down onto deflectors
      } else {
        setBallRadiusPercent(39.0); // inside pocket
      }

      // Ball rattling and bouncing sounds during deceleration against deflectors & frets
      if (progress > 0.55 && progress < 0.95) {
        const bounceInterval = 120 + Math.pow((progress - 0.55) / 0.4, 2) * 280;
        if (currentTime - lastBounceTime > bounceInterval) {
          lastBounceTime = currentTime;
          soundManager.playBallBounce(0.12 * (1 - (progress - 0.55)));
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Spin finished: Ball settles into pocket!
        setIsBallInPocket(true);
        soundManager.playPocketDrop();
        setWinningTeamId(destinationTeam.id);
        soundManager.playFanfare();
        triggerConfetti();

        setTimeout(async () => {
          await onExecutePick(playerToDraft, destinationTeam, activeCategoryId);
          setIsSpinning(false);
          setCongratsData({
            player: playerToDraft,
            team: destinationTeam,
            category: currentCategory,
          });
          setSelectedPlayerId(null);
        }, 900);
      }
    };

    requestAnimationFrame(animate);
  };

  const handleUpdateDraftPool = async (playerIdsToInclude: string[]) => {
    if (!onBulkSavePlayers) return;
    const set = new Set(playerIdsToInclude);
    const updated = players.map((p) => ({
      ...p,
      inDraftPool: set.has(p.id),
      updatedAt: Date.now(),
    }));
    await onBulkSavePlayers(updated);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 pb-8 select-none">
      {/* 1. TOP BROADCAST CONTROL HEADER */}
      <div className="bg-[#061A36] text-white rounded-2xl p-3.5 sm:p-4 border border-[#0A244A] shadow-md flex flex-wrap items-center justify-between gap-3">
        {/* Left: Tournament & Live Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 p-1 border border-white/20 flex items-center justify-center shrink-0">
            <BplLogo size={32} showText={false} logoUrl={draft.logoUrl} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">
                {draft.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FF7A2E] text-white uppercase tracking-wider animate-pulse">
                • LIVE DRAFT ARENA
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Season: <strong className="text-[#FF7A2E]">{draft.season}</strong> • Total Drafted:{' '}
              <strong className="text-emerald-400">{draftedPlayersCount} / {totalRequired}</strong>
            </p>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Draft Pool Selector Button */}
          <button
            onClick={() => setIsPoolModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all active:scale-95"
            title="Choose which players are included in this draft"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Draft Pool ({inPoolPlayers.length})</span>
          </button>

          {/* Tournament & Logo Edit */}
          {onSaveDraft && (
            <button
              onClick={() => setIsTournamentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 rounded-xl text-xs font-semibold transition-all"
              title="Customize tournament name, logo, or quota"
            >
              <Settings className="w-3.5 h-3.5 text-[#FF7A2E]" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}

          {/* Sound Mute Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Undo Last Pick */}
          {picks.length > 0 && (
            <button
              onClick={onUndoLatestPick}
              disabled={isSpinning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
              title="Undo the last completed pick"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo Pick</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CATEGORY SELECTOR TABS */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-black text-[#061A36] uppercase tracking-wider shrink-0">
          <Layers className="w-4 h-4 text-[#1283E6]" />
          <span>Role Categories:</span>
        </div>
        {categories.map((c) => {
          const isSelected = c.id === activeCategoryId;
          const availCount = players.filter(
            (p) => p.status === 'available' && p.inDraftPool !== false && p.primaryCategoryId === c.id
          ).length;

          return (
            <button
              key={c.id}
              onClick={() => {
                if (!isSpinning) {
                  setActiveCategoryId(c.id);
                  onUpdateDraftCategory(c.id);
                }
              }}
              disabled={isSpinning}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? 'bg-[#1283E6] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{c.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-white text-[#1283E6]' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {availCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. THE CASINO ROULETTE LOTTERY ARENA */}
      <div className="bg-gradient-to-b from-[#061A36] via-[#092244] to-[#041226] text-white rounded-3xl p-6 sm:p-8 border border-[#0A244A] shadow-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[640px]">
        {/* Stadium Background Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.15)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full bg-[#1283E6]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full bg-[#FF7A2E]/15 blur-3xl pointer-events-none" />

        {/* Casino Roulette Wheel & Spotlight Showcase Grid */}
        <div className="relative z-20 flex flex-col lg:flex-row items-center justify-center gap-8 w-full max-w-5xl my-2">
          {/* THE CASINO ROULETTE WHEEL */}
          <div className="flex flex-col items-center">
            <CasinoRouletteWheel
              teams={teams}
              activePlayer={activeWheelPlayer}
              isSpinning={isSpinning}
              winningTeamId={winningTeamId}
              cylinderRotation={cylinderRotation}
              ballAngle={ballAngle}
              ballRadiusPercent={ballRadiusPercent}
              isBallInPocket={isBallInPocket}
            />
            {/* Realtime Spin Status Subtitle */}
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-300">
              <span className={`w-2 h-2 rounded-full ${isSpinning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span>
                {isSpinning
                  ? 'CASINO ROULETTE SPINNING & DECELERATING...'
                  : winningTeamId
                  ? 'WINNING POCKET REACHED!'
                  : 'READY TO SPIN FOR ACTIVE PLAYER'}
              </span>
            </div>
          </div>

          {/* SPOTLIGHT PLAYER VIP SUITE */}
          <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur-md rounded-2xl p-5 border-2 border-[#D4AF37]/50 shadow-[0_10px_30px_rgba(0,0,0,0.7)] flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                VIP Player Spotlight
              </span>
            </div>

            {activeWheelPlayer ? (
              <div className="w-full space-y-3">
                <div className="relative inline-block mx-auto">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#061A36] to-[#0A244A] border-2 border-amber-400 overflow-hidden shadow-xl flex items-center justify-center">
                    {activeWheelPlayer.photoUrl ? (
                      <img
                        src={activeWheelPlayer.photoUrl}
                        alt={activeWheelPlayer.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-12 h-12 text-slate-300" />
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs rounded-lg shadow-md border border-white">
                    #{activeWheelPlayer.jerseyNumber || '00'}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white tracking-tight uppercase">
                    {activeWheelPlayer.fullName}
                  </h3>
                  <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white mt-1 border border-emerald-400/40">
                    {activeWheelPlayer.badge}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left bg-slate-800/80 rounded-xl p-2.5 text-[11px] border border-slate-700/60">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Batting:</span>
                    <strong className="text-slate-200">{activeWheelPlayer.battingStyle}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bowling:</span>
                    <strong className="text-slate-200">{activeWheelPlayer.bowlingStyle || 'None'}</strong>
                  </div>
                  {activeWheelPlayer.notes && (
                    <div className="col-span-2 pt-1 border-t border-slate-700 text-[10px] text-slate-400 truncate">
                      {activeWheelPlayer.notes}
                    </div>
                  )}
                </div>

                {eligiblePlayers.length > 1 && !isSpinning && (
                  <button
                    onClick={() => {
                      const remaining = eligiblePlayers.filter((p) => p.id !== activeWheelPlayer?.id);
                      if (remaining.length > 0) {
                        const next = remaining[getCryptoRandomIndex(remaining.length)];
                        setSelectedPlayerId(next.id);
                      }
                    }}
                    className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Shuffle Next Player</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8">
                <Users className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-300">Category Exhausted</p>
                <p className="text-xs text-slate-400 mt-1">Switch category above to continue draft</p>
              </div>
            )}
          </div>
        </div>

        {/* SPIN ACTION BUTTON */}
        <div className="mt-6 z-20 flex flex-col items-center gap-2">
          <button
            onClick={handleStartSpin}
            disabled={isSpinning || isAllAllocationsComplete || !activeWheelPlayer || eligibleTeams.length === 0}
            className={`flex items-center gap-3 px-10 sm:px-14 py-4 rounded-2xl font-black text-sm sm:text-base tracking-wider uppercase text-slate-950 shadow-2xl transition-all active:scale-95 ${
              isSpinning
                ? 'bg-slate-700 cursor-wait text-white'
                : isAllAllocationsComplete
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#B8860B] hover:brightness-110 shadow-amber-500/50 ring-4 ring-amber-300/30 hover:scale-105'
            }`}
          >
            <Play className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>
              {isSpinning
                ? 'ROULETTE DECELERATING...'
                : isAllAllocationsComplete
                ? 'DRAFT COMPLETED'
                : activeWheelPlayer
                ? `SPIN ROULETTE FOR ${activeWheelPlayer.fullName.toUpperCase()}`
                : 'SELECT PLAYER TO SPIN'}
            </span>
          </button>
        </div>
      </div>

      {/* 4. PLAYERS IN DRAFT POOL ON DECK STRIP */}
      {/* "ami jokhon player der draft er jonno slect korbo tokhon sei player gulo spin wheel er moddhe thakbe." */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1283E6]" />
            <h2 className="text-xs sm:text-sm font-black text-[#061A36] uppercase tracking-wider">
              Draft Pool on Deck: {currentCategory?.name} ({eligiblePlayers.length} Available)
            </h2>
          </div>
          <button
            onClick={() => setIsPoolModalOpen(true)}
            className="text-xs font-bold text-[#1283E6] hover:underline"
          >
            Manage Pool ({inPoolPlayers.length})
          </button>
        </div>

        {/* Horizontal Carousel of Players */}
        {eligiblePlayers.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {eligiblePlayers.map((player) => {
              const isSelected = activeWheelPlayer?.id === player.id;

              return (
                <div
                  key={player.id}
                  onClick={() => {
                    if (!isSpinning) {
                      setSelectedPlayerId(player.id);
                    }
                  }}
                  className={`w-36 shrink-0 rounded-2xl p-3 border transition-all cursor-pointer flex flex-col items-center text-center ${
                    isSelected
                      ? 'bg-blue-50/90 border-[#1283E6] shadow-sm ring-2 ring-[#1283E6]'
                      : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-xs mb-1.5">
                    {player.photoUrl ? (
                      <img
                        src={player.photoUrl}
                        alt={player.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-black text-[#1283E6] text-xs">
                        #{player.jerseyNumber || '00'}
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs text-[#061A36] truncate w-full">
                    {player.fullName}
                  </h4>
                  <span className="text-[9px] font-bold text-slate-500 truncate w-full mt-0.5">
                    {player.badge}
                  </span>
                  <button
                    disabled={isSpinning}
                    className={`mt-2 w-full py-1 text-[10px] font-black rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-[#1283E6] text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {isSelected ? 'ON WHEEL' : 'SELECT'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs font-semibold">
            No players available in the active category pool.{' '}
            <button
              onClick={() => setIsPoolModalOpen(true)}
              className="text-[#1283E6] font-bold hover:underline ml-1"
            >
              Add players to Draft Pool
            </button>
          </div>
        )}
      </div>

      {/* 5. FRANCHISE TEAMS SQUADS MATRIX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {teams.map((team) => {
          const teamPlayers = players.filter((p) => p.assignedTeamId === team.id);
          const quota = team.quotas[activeCategoryId] ?? 0;
          const draftedInCat = teamPlayers.filter(
            (p) =>
              p.primaryCategoryId === activeCategoryId || p.assignedCategoryId === activeCategoryId
          ).length;
          const isCategoryFull = draftedInCat >= quota && quota > 0;
          const maxSquad = team.maxPlayers || 11;
          const isSquadFull = teamPlayers.length >= maxSquad;

          return (
            <div
              key={team.id}
              className={`rounded-2xl p-4 border transition-all ${
                isCategoryFull || isSquadFull
                  ? 'bg-slate-50 border-slate-200 opacity-80'
                  : 'bg-white border-slate-200 shadow-2xs hover:border-[#1283E6]/40'
              }`}
            >
              {/* Team Header */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                    {team.logoUrl ? (
                      <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white font-black text-xs"
                        style={{ backgroundColor: team.primaryColor || '#061A36' }}
                      >
                        {team.shortName}
                      </div>
                    )}
                  </div>
                  <div className="truncate">
                    <h3 className="font-extrabold text-xs text-[#061A36] truncate">{team.name}</h3>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {draftedInCat}/{quota} in {currentCategory?.name.split(' ')[0]}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                {isCategoryFull || isSquadFull ? (
                  <span className="flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                    <Lock className="w-2.5 h-2.5" /> FULL
                  </span>
                ) : (
                  <span className="text-xs font-black text-[#1283E6] shrink-0">
                    {teamPlayers.length}/{maxSquad}
                  </span>
                )}
              </div>

              {/* 11-Player Slots Mini Indicators */}
              <div className="pt-2.5">
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: maxSquad }).map((_, slotIdx) => {
                    const playerInSlot = teamPlayers[slotIdx];
                    return (
                      <div
                        key={slotIdx}
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-extrabold transition-all overflow-hidden ${
                          playerInSlot
                            ? 'bg-[#061A36] text-white shadow-2xs'
                            : 'bg-slate-100 border border-dashed border-slate-300 text-slate-400'
                        }`}
                        title={
                          playerInSlot
                            ? `${playerInSlot.fullName} (#${playerInSlot.jerseyNumber})`
                            : `Open Slot #${slotIdx + 1}`
                        }
                      >
                        {playerInSlot ? (
                          playerInSlot.photoUrl ? (
                            <img
                              src={playerInSlot.photoUrl}
                              alt={playerInSlot.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            playerInSlot.jerseyNumber || '✓'
                          )
                        ) : (
                          slotIdx + 1
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. BROADCAST CONGRATULATIONS OVERLAY */}
      {congratsData && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-amber-100 text-amber-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              OFFICIAL DRAFT ANNOUNCEMENT
            </div>

            {/* Player Visual Card */}
            <div className="bg-[#E6F7FF] rounded-2xl p-5 border border-blue-200/80 space-y-2">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-white border-2 border-[#1283E6] overflow-hidden flex items-center justify-center shadow-md relative">
                {congratsData.player.photoUrl ? (
                  <img
                    src={congratsData.player.photoUrl}
                    alt={congratsData.player.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-[#1283E6]">
                    #{congratsData.player.jerseyNumber || '00'}
                  </span>
                )}
                <div className="absolute bottom-0 right-0 bg-[#061A36] text-white px-1.5 text-[9px] font-black rounded-tl-md">
                  #{congratsData.player.jerseyNumber}
                </div>
              </div>
              <h3 className="text-xl font-black text-[#061A36]">
                {congratsData.player.fullName}
              </h3>
              <p className="text-xs font-bold text-[#1283E6] uppercase tracking-wider">
                {congratsData.category.name}
              </p>
              <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white text-[#0A5DB8] border border-blue-200 shadow-2xs">
                {congratsData.player.badge}
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              OFFICIALLY DRAFTED BY
            </div>

            {/* Destination Team Badge */}
            <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-300 flex items-center justify-center shrink-0 shadow-sm">
                {congratsData.team.logoUrl ? (
                  <img
                    src={congratsData.team.logoUrl}
                    alt={congratsData.team.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-black text-sm text-white"
                    style={{ backgroundColor: congratsData.team.primaryColor || '#1283E6' }}
                  >
                    {congratsData.team.shortName}
                  </div>
                )}
              </div>
              <div className="text-left">
                <div className="font-extrabold text-sm text-[#061A36]">
                  {congratsData.team.name}
                </div>
                <div className="text-[11px] text-slate-500">Official Franchise Squad Assignment</div>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={() => setCongratsData(null)}
              className="w-full py-3.5 bg-[#1283E6] hover:bg-[#0A5DB8] text-white font-black text-sm tracking-wider uppercase rounded-2xl shadow-md transition-all active:scale-95"
            >
              CONFIRM & NEXT PLAYER
            </button>
          </div>
        </div>
      )}

      {/* 7. DRAFT COMPLETE MODAL */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#061A36] text-white rounded-3xl max-w-lg w-full p-8 text-center shadow-2xl border border-[#0A244A] space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#FF7A2E]/20 text-[#FF7A2E] flex items-center justify-center border border-[#FF7A2E]/30">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold tracking-widest text-[#FF7A2E] uppercase">
                DRAFT COMPLETED
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">{draft.name}</h2>
              <p className="text-sm text-slate-300">
                {draft.season} • All Team Rosters Allocated Successfully!
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-[#0A244A] rounded-2xl border border-slate-700 text-xs">
              <div>
                <div className="font-extrabold text-lg text-white">{draftedPlayersCount}</div>
                <div className="text-[10px] text-slate-400 uppercase">Players Drafted</div>
              </div>
              <div>
                <div className="font-extrabold text-lg text-white">{teams.length}</div>
                <div className="text-[10px] text-slate-400 uppercase">Franchises</div>
              </div>
              <div>
                <div className="font-extrabold text-lg text-white">{categories.length}</div>
                <div className="text-[10px] text-slate-400 uppercase">Categories</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  onNavigateToResults();
                }}
                className="w-full py-3.5 bg-[#1283E6] hover:bg-[#0A5DB8] text-white font-black text-sm tracking-wider uppercase rounded-2xl shadow-md transition-all active:scale-95"
              >
                VIEW FINAL TEAM ROSTERS & PDF
              </button>
              <button
                onClick={() => setShowCompletionModal(false)}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Pool Selection Modal */}
      {isPoolModalOpen && (
        <DraftPoolModal
          isOpen={isPoolModalOpen}
          onClose={() => setIsPoolModalOpen(false)}
          players={players}
          categories={categories}
          teams={teams}
          onUpdateDraftPool={handleUpdateDraftPool}
        />
      )}

      {/* Tournament Edit Modal */}
      {isTournamentModalOpen && onSaveDraft && (
        <TournamentEditModal
          isOpen={isTournamentModalOpen}
          onClose={() => setIsTournamentModalOpen(false)}
          draft={draft}
          onSaveDraft={async (updatedDraft) => {
            await onSaveDraft(updatedDraft);
            setIsTournamentModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
