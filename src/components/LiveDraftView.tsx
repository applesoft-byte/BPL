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
import { StadiumLotteryArena } from './StadiumLotteryArena';
import { TeamOrbitSpinOverlay } from './TeamOrbitSpinOverlay';

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

  // Stadium Lottery Arena state
  const [spinningTargetTeamIndex, setSpinningTargetTeamIndex] = useState<number | null>(null);
  const [winningTeam, setWinningTeam] = useState<Team | null>(null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [autoPickEnabled, setAutoPickEnabled] = useState<boolean>(false);
  const autoPickTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  const [activeBottomTab, setActiveBottomTab] = useState<'pool' | 'squads'>('pool');
  const [wheelSlotsCount, setWheelSlotsCount] = useState<number | 'auto'>('auto');
  const [isSpinOverlayOpen, setIsSpinOverlayOpen] = useState(false);
  const [activeSpinPlayer, setActiveSpinPlayer] = useState<Player | null>(null);

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

  // Set of all player IDs who are Captains (either by team.captainPlayerId or p.isCaptain)
  const captainPlayerIds = useMemo(() => {
    const set = new Set<string>();
    teams.forEach((t) => {
      if (t.captainPlayerId) set.add(t.captainPlayerId);
      if (t.captainName) {
        const found = players.find(
          (p) => p.fullName.toLowerCase() === t.captainName?.toLowerCase()
        );
        if (found) set.add(found.id);
      }
    });
    players.forEach((p) => {
      if (p.isCaptain) set.add(p.id);
    });
    return set;
  }, [teams, players]);

  // Which franchise teams have their Captain in the currently active category
  const teamsWithCaptainInActiveCategory = useMemo(() => {
    const set = new Set<string>();
    teams.forEach((t) => {
      let cap: Player | undefined;
      if (t.captainPlayerId) {
        cap = players.find((p) => p.id === t.captainPlayerId);
      }
      if (!cap && t.captainName) {
        cap = players.find((p) => p.fullName.toLowerCase() === t.captainName?.toLowerCase());
      }
      if (!cap) {
        cap = players.find((p) => p.isCaptain && p.assignedTeamId === t.id);
      }
      if (cap) {
        const capCat = cap.primaryCategoryId || cap.assignedCategoryId;
        if (capCat === activeCategoryId) {
          set.add(t.id);
        }
      }
    });
    return set;
  }, [teams, players, activeCategoryId]);

  // Manual team exclusion state for player spins
  const [manualExcludedTeamIds, setManualExcludedTeamIds] = useState<string[]>([]);

  const handleToggleTeamExclusion = (teamId: string) => {
    setManualExcludedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleIncludeAllTeams = () => {
    setManualExcludedTeamIds([]);
  };

  // Eligible Players for active category and pool (Captains NEVER appear in lottery draft spins!)
  const eligiblePlayers = useMemo(() => {
    return players.filter((p) => {
      // Captains are pre-assigned and must not be drafted in lottery spins
      if (captainPlayerIds.has(p.id) || p.isCaptain) return false;
      if (p.status !== 'available') return false;
      if (p.inDraftPool === false) return false;

      if (draft.settings.categoryMode === 'all_mixed') {
        return teams.some((t) => {
          if (teamsWithCaptainInActiveCategory.has(t.id)) return false;
          if (manualExcludedTeamIds.includes(t.id)) return false;
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
  }, [
    players,
    teams,
    activeCategoryId,
    draft.settings.categoryMode,
    captainPlayerIds,
    teamsWithCaptainInActiveCategory,
    manualExcludedTeamIds,
  ]);

  // Eligible Teams for active category (teams with captain in this category are automatically excluded)
  const eligibleTeams = useMemo(() => {
    return teams.filter((t) => {
      if (!t.active) return false;

      // User mandate: If a captain is in the same category, that team will NOT participate for that spin!
      if (teamsWithCaptainInActiveCategory.has(t.id)) return false;

      const teamPlayers = players.filter((p) => p.assignedTeamId === t.id);
      const maxLimit = t.maxPlayers || 11;
      if (teamPlayers.length >= maxLimit) return false;

      if (draft.settings.categoryMode === 'all_mixed') {
        return true;
      }

      const quota = t.quotas[activeCategoryId] ?? 1;
      const draftedInCat = teamPlayers.filter(
        (p) =>
          p.primaryCategoryId === activeCategoryId || p.assignedCategoryId === activeCategoryId
      ).length;

      return draftedInCat < quota;
    });
  }, [teams, players, activeCategoryId, draft.settings.categoryMode, teamsWithCaptainInActiveCategory]);

  // Category specific pool players (strictly excluding captains from the draft lottery)
  const categoryPoolPlayers = useMemo(() => {
    return players.filter(
      (p) =>
        p.primaryCategoryId === activeCategoryId &&
        p.inDraftPool !== false &&
        !captainPlayerIds.has(p.id) &&
        !p.isCaptain
    );
  }, [players, activeCategoryId, captainPlayerIds]);

  // Dynamic round players for this category round (available first, then drafted if needed)
  const roundPlayers = useMemo(() => {
    const avail = categoryPoolPlayers.filter((p) => p.status === 'available');
    const drafted = categoryPoolPlayers.filter((p) => p.status === 'drafted');
    let combined = [...avail, ...drafted];

    // If user clicked/selected a specific player, ensure that player is on the wheel (at index 0)
    if (selectedPlayerId) {
      const selectedIndex = combined.findIndex((p) => p.id === selectedPlayerId);
      if (selectedIndex > 0) {
        const [sel] = combined.splice(selectedIndex, 1);
        combined.unshift(sel);
      }
    }

    if (combined.length === 0) return [];

    let count: number;
    if (wheelSlotsCount === 'auto') {
      // Automatically choose slot count based on available players:
      // If 3 or fewer, show available. If 4 to 8, show available. Max default 8.
      if (avail.length > 0) {
        count = Math.max(3, Math.min(avail.length, 8));
      } else {
        count = Math.min(combined.length, 6);
      }
    } else {
      count = wheelSlotsCount;
    }

    return combined.slice(0, Math.max(1, count));
  }, [categoryPoolPlayers, selectedPlayerId, wheelSlotsCount]);

  // The active player currently highlighted on the central wheel
  const highlightedPlayer = useMemo(() => {
    if (selectedPlayerId) {
      const found = players.find(
        (p) => p.id === selectedPlayerId && p.status === 'available'
      );
      if (found) return found;
    }
    // Fallback to first available player in the round
    return roundPlayers.find((p) => p.status === 'available') || null;
  }, [players, roundPlayers, selectedPlayerId]);

  // Active player on deck for backwards compatibility
  const activeWheelPlayer = highlightedPlayer;

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

  // Filter valid teams for currently targeted player (excluding captain-category teams and manually excluded teams)
  const validTeamsForHighlightedPlayer = useMemo(() => {
    const targetPlayer = activeSpinPlayer || highlightedPlayer;
    // Exclude manually excluded teams from the candidate pool
    const baseTeams = eligibleTeams.filter((t) => !manualExcludedTeamIds.includes(t.id));

    if (!targetPlayer) return baseTeams;
    if (draft.settings.categoryMode === 'all_mixed') {
      const filtered = baseTeams.filter((t) => {
        const q = t.quotas[targetPlayer.primaryCategoryId] || 0;
        const count = players.filter(
          (p) =>
            p.assignedTeamId === t.id &&
            (p.primaryCategoryId === targetPlayer.primaryCategoryId ||
              p.assignedCategoryId === targetPlayer.primaryCategoryId)
        ).length;
        return count < q;
      });
      return filtered;
    }
    return baseTeams;
  }, [eligibleTeams, manualExcludedTeamIds, activeSpinPlayer, highlightedPlayer, draft.settings.categoryMode, players]);

  // Start the TV broadcast Team Orbit Spin
  const handleStartSpin = () => {
    if (isSpinning || isSpinOverlayOpen || isAllAllocationsComplete) return;

    if (!highlightedPlayer) {
      return;
    }

    if (validTeamsForHighlightedPlayer.length === 0) {
      return;
    }

    setActiveSpinPlayer(highlightedPlayer);
    setIsSpinning(true);
    setIsSpinOverlayOpen(true);
  };

  // Called when a pick is confirmed from the spin animation overlay
  const handleConfirmSpinPick = async (playerToDraft: Player, destinationTeam: Team) => {
    const teamIndex = teams.findIndex((t) => t.id === destinationTeam.id);
    setSpinningTargetTeamIndex(teamIndex >= 0 ? teamIndex : 0);
    setWinningTeam(destinationTeam);

    await onExecutePick(playerToDraft, destinationTeam, activeCategoryId);

    setIsSpinOverlayOpen(false);
    setIsSpinning(false);
    setActiveSpinPlayer(null);
    setSelectedPlayerId(null);
  };

  const handleCloseSpinOverlay = () => {
    setIsSpinOverlayOpen(false);
    setIsSpinning(false);
    setActiveSpinPlayer(null);
  };

  // Auto-pick (3s) automation effect
  useEffect(() => {
    if (
      autoPickEnabled &&
      !isSpinning &&
      !isSpinOverlayOpen &&
      highlightedPlayer &&
      !congratsData &&
      validTeamsForHighlightedPlayer.length > 0
    ) {
      autoPickTimerRef.current = setTimeout(() => {
        handleStartSpin();
      }, 3000);
    }
    return () => {
      if (autoPickTimerRef.current) clearTimeout(autoPickTimerRef.current);
    };
  }, [
    autoPickEnabled,
    isSpinning,
    isSpinOverlayOpen,
    highlightedPlayer,
    congratsData,
    validTeamsForHighlightedPlayer.length,
  ]);

  // If congrats dialog is open during auto-pick, auto dismiss after 2.5s to keep the draft flowing smoothly
  useEffect(() => {
    if (autoPickEnabled && congratsData) {
      const t = setTimeout(() => {
        setCongratsData(null);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [autoPickEnabled, congratsData]);

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
    <div className="w-full max-w-7xl mx-auto space-y-2.5 pb-6 select-none">
      {/* 1. COMPACT BROADCAST CONTROL HEADER WITH INLINE CATEGORIES */}
      <div className="bg-[#061A36] text-white rounded-xl px-3 py-2 border border-[#0A244A] shadow-xs flex flex-wrap items-center justify-between gap-2">
        {/* Left: Tournament & Live Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 p-0.5 border border-white/20 flex items-center justify-center shrink-0">
            <BplLogo size={24} showText={false} logoUrl={draft.logoUrl} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-white uppercase truncate">
                {draft.name}
              </h1>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-[#FF7A2E] text-white uppercase tracking-wider">
                LIVE ARENA
              </span>
            </div>
            <p className="text-[10px] text-slate-300">
              Season <strong className="text-[#FF7A2E]">{draft.season}</strong> • Total Drafted:{' '}
              <strong className="text-emerald-400">
                {draftedPlayersCount} / {totalRequired}
              </strong>
            </p>
          </div>
        </div>

        {/* Center: Role Categories Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
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
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#1283E6] text-white shadow-2xs ring-1 ring-white/30'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                <span>{c.name}</span>
                <span
                  className={`px-1 py-0.2 rounded-full text-[8.5px] font-black ${
                    isSelected ? 'bg-white text-[#1283E6]' : 'bg-white/20 text-slate-200'
                  }`}
                >
                  {availCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsPoolModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-all active:scale-95"
            title="Choose which players are included in this draft"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Pool ({inPoolPlayers.length})</span>
          </button>

          {onSaveDraft && (
            <button
              onClick={() => setIsTournamentModalOpen(true)}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 rounded-lg text-xs font-semibold transition-all"
              title="Customize tournament name, logo, or quota"
            >
              <Settings className="w-3.5 h-3.5 text-[#FF7A2E]" />
            </button>
          )}

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {picks.length > 0 && (
            <button
              onClick={onUndoLatestPick}
              disabled={isSpinning}
              className="flex items-center gap-1 px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
              title="Undo the last completed pick"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Undo</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. THE STADIUM BROADCAST LOTTERY ARENA (Dynamic & Viewport-Fitting) */}
      <StadiumLotteryArena
        teams={teams}
        players={players}
        picks={picks}
        activeCategory={currentCategory}
        roundPlayers={roundPlayers}
        highlightedPlayer={highlightedPlayer}
        onSelectPlayer={(p) => setSelectedPlayerId(p.id)}
        isSpinning={isSpinning}
        onStartSpin={handleStartSpin}
        autoPickEnabled={autoPickEnabled}
        onToggleAutoPick={setAutoPickEnabled}
        spinningTargetTeamIndex={spinningTargetTeamIndex}
        winningTeam={winningTeam}
        canSpin={!isAllAllocationsComplete && !!highlightedPlayer && validTeamsForHighlightedPlayer.length > 0}
        wheelSlotsCount={wheelSlotsCount}
        onChangeWheelSlotsCount={setWheelSlotsCount}
        tournamentLogo={draft.logoUrl}
        excludedTeamIds={manualExcludedTeamIds}
        teamsWithCaptainInCategory={teamsWithCaptainInActiveCategory}
        onToggleTeamExclusion={handleToggleTeamExclusion}
        onIncludeAllTeams={handleIncludeAllTeams}
        validParticipatingTeamsCount={validTeamsForHighlightedPlayer.length}
      />

      {/* 3. BOTTOM SECTION: TAB SWITCHER BETWEEN DRAFT POOL ON DECK & SQUADS MATRIX */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveBottomTab('pool')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeBottomTab === 'pool'
                ? 'bg-[#061A36] text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#1283E6]" />
            <span>
              Draft Pool on Deck: {currentCategory?.name} ({eligiblePlayers.length})
            </span>
          </button>

          <button
            onClick={() => setActiveBottomTab('squads')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeBottomTab === 'squads'
                ? 'bg-[#061A36] text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Franchise Squads Matrix ({teams.length})</span>
          </button>
        </div>

        {activeBottomTab === 'pool' && (
          <button
            onClick={() => setIsPoolModalOpen(true)}
            className="text-xs font-bold text-[#1283E6] hover:underline"
          >
            Manage Pool ({inPoolPlayers.length})
          </button>
        )}
      </div>

      {/* 4. DRAFT POOL ON DECK CONTENT (Compact) */}
      {activeBottomTab === 'pool' && (
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-2xs space-y-1.5">
          {eligiblePlayers.length > 0 ? (
            <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
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
                    className={`w-28 sm:w-32 shrink-0 rounded-xl p-2 border transition-all cursor-pointer flex flex-col items-center text-center ${
                      isSelected
                        ? 'bg-blue-50/90 border-[#1283E6] shadow-xs ring-2 ring-[#1283E6]'
                        : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-2xs mb-1">
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={player.fullName}
                          className="w-full h-full object-cover object-top"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="font-black text-[#1283E6] text-xs">
                          #{player.jerseyNumber || '00'}
                        </span>
                      )}
                      {isSelected && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                      )}
                    </div>
                    <h4 className="font-bold text-[11px] text-[#061A36] truncate w-full leading-tight">
                      {player.fullName}
                    </h4>
                    <span className="text-[8.5px] font-semibold text-slate-500 truncate w-full mt-0.5">
                      {player.badge}
                    </span>
                    <button
                      disabled={isSpinning}
                      className={`mt-1.5 w-full py-0.5 text-[9px] font-black rounded-md transition-colors ${
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
            <div className="text-center py-3 text-slate-500 text-xs font-semibold">
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
      )}

      {/* 5. FRANCHISE TEAMS SQUADS MATRIX (Tab Content) */}
      {activeBottomTab === 'squads' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
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
      )}

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

      {/* 8. TEAM ORBIT SPIN LOTTERY OVERLAY (Live Draft continues showing in background) */}
      <TeamOrbitSpinOverlay
        isOpen={isSpinOverlayOpen}
        player={activeSpinPlayer || highlightedPlayer}
        teams={teams}
        activeCategory={currentCategory}
        eligibleTeams={validTeamsForHighlightedPlayer}
        teamsWithCaptainInCategory={teamsWithCaptainInActiveCategory}
        excludedTeamIds={manualExcludedTeamIds}
        onConfirmPick={handleConfirmSpinPick}
        onClose={handleCloseSpinOverlay}
        autoPickEnabled={autoPickEnabled}
        tournamentLogo={draft.logoUrl}
      />
    </div>
  );
};
