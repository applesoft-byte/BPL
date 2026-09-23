import React, { useMemo, useRef, useEffect } from 'react';
import {
  Shuffle,
  Crown,
  CheckCircle2,
  Sparkles,
  Lock,
  ArrowLeft,
  ArrowRight,
  Users,
  SlidersHorizontal,
} from 'lucide-react';
import { Category, PickRecord, Player, Team } from '../types';
import { DEFAULT_BPL_LOGO } from '../lib/imageUtils';

interface StadiumLotteryArenaProps {
  teams: Team[];
  players: Player[];
  picks?: PickRecord[];
  activeCategory: Category;
  roundPlayers: Player[];
  highlightedPlayer: Player | null;
  onSelectPlayer: (player: Player) => void;
  isSpinning: boolean;
  onStartSpin: () => void;
  autoPickEnabled: boolean;
  onToggleAutoPick: (enabled: boolean) => void;
  spinningTargetTeamIndex: number | null;
  winningTeam: Team | null;
  canSpin: boolean;
  wheelSlotsCount?: number | 'auto';
  onChangeWheelSlotsCount?: (count: number | 'auto') => void;
  tournamentLogo?: string;
  excludedTeamIds?: string[];
  teamsWithCaptainInCategory?: Set<string>;
  onToggleTeamExclusion?: (teamId: string) => void;
  onIncludeAllTeams?: () => void;
  validParticipatingTeamsCount?: number;
}

export const StadiumLotteryArena: React.FC<StadiumLotteryArenaProps> = ({
  teams,
  players,
  picks,
  activeCategory,
  roundPlayers,
  highlightedPlayer,
  onSelectPlayer,
  isSpinning,
  onStartSpin,
  autoPickEnabled,
  onToggleAutoPick,
  spinningTargetTeamIndex,
  winningTeam,
  canSpin,
  wheelSlotsCount = 'auto',
  onChangeWheelSlotsCount,
  tournamentLogo,
  excludedTeamIds = [],
  teamsWithCaptainInCategory = new Set(),
  onToggleTeamExclusion,
  onIncludeAllTeams,
  validParticipatingTeamsCount,
}) => {
  // Dynamically divide all tournament teams between Left and Right flanks
  const { leftTeams, rightTeams, totalTeams, halfCount } = useMemo(() => {
    const total = teams.length;
    const half = Math.ceil(total / 2);
    return {
      leftTeams: teams.slice(0, half),
      rightTeams: teams.slice(half),
      totalTeams: total,
      halfCount: half,
    };
  }, [teams]);

  // Determine dynamic flank width based on total teams
  const flankWidthClass = useMemo(() => {
    if (totalTeams <= 6) return 'w-52 xl:w-60';
    if (totalTeams <= 8) return 'w-56 xl:w-64';
    return 'w-64 xl:w-[380px]';
  }, [totalTeams]);

  return (
    <div className="w-full relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#E9F3FE] via-[#F4F8FE] to-[#DFEDFD] border border-blue-200/80 shadow-md p-2 sm:p-3 select-none">
      {/* Stadium Atmospheric Lighting & Subtle Floodlights */}
      <div className="absolute top-0 left-8 w-44 h-44 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-8 w-44 h-44 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-blue-500/10 to-transparent blur-md pointer-events-none" />

      {/* Main Stadium Arena Layout */}
      <div className="relative z-10 w-full">
        {/* ========================================================= */}
        {/* DESKTOP VIEW (lg and above): Dynamic Left - Center - Right */}
        {/* ========================================================= */}
        <div className="hidden lg:flex items-center justify-between gap-2 xl:gap-3.5 w-full mx-auto">
          {/* Left Flank Teams: Dynamic inward Arrow points Right (→) */}
          <div
            className={`flex flex-col gap-1.5 shrink-0 ${flankWidthClass} ${
              totalTeams > 8
                ? 'grid grid-cols-1 xl:grid-cols-2 max-h-[440px] overflow-y-auto pr-1'
                : ''
            }`}
          >
            {leftTeams.map((team, idx) => (
              <PerimeterTeamCard
                key={team.id}
                team={team}
                players={players}
                picks={picks}
                activeCategory={activeCategory}
                isTargeted={spinningTargetTeamIndex === idx}
                isWinner={winningTeam?.id === team.id}
                isExcluded={excludedTeamIds.includes(team.id)}
                isCaptainInCategory={teamsWithCaptainInCategory.has(team.id)}
                onToggleExclude={() => onToggleTeamExclusion?.(team.id)}
                arrow="right"
              />
            ))}
          </div>

          {/* Central Column: Wheel + Large On-Deck Center Spotlight + Spin Controls */}
          <div className="flex-1 flex flex-col items-center justify-center px-1">
            {/* Dynamic Circular Lottery Wheel */}
            <CentralLotteryWheel
              displayRoundPlayers={roundPlayers}
              highlightedPlayer={highlightedPlayer}
              onSelectPlayer={onSelectPlayer}
              isSpinning={isSpinning}
              tournamentLogo={tournamentLogo}
            />

            {/* Dynamic Controls Bar: Spin Button + Auto Pick + Wheel Slots Selector */}
            <div className="w-full max-w-md mt-2 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-center justify-center gap-2">
                <button
                  onClick={onStartSpin}
                  disabled={isSpinning || !canSpin}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0264D4] via-[#1283E6] to-[#0264D4] hover:from-[#0A5DB8] hover:to-[#0A5DB8] text-white font-extrabold text-xs rounded-xl shadow-sm shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  <Shuffle className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span className="truncate">
                    {isSpinning ? 'SPINNING...' : 'SPIN FOR NEXT PLAYER'}
                  </span>
                </button>

                <label className="flex items-center gap-1.5 px-2.5 py-2 bg-white/90 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:bg-white transition-colors shrink-0">
                  <input
                    type="checkbox"
                    checked={autoPickEnabled}
                    onChange={(e) => onToggleAutoPick(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#1283E6] focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">
                    Auto Pick (3s)
                  </span>
                </label>
              </div>

              {/* Dynamic Number of Wheel Slots Selector */}
              {onChangeWheelSlotsCount && (
                <div className="flex items-center gap-1 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-full border border-blue-200/80 shadow-2xs text-[9.5px]">
                  <span className="text-slate-500 font-bold flex items-center gap-1 mr-0.5">
                    <SlidersHorizontal className="w-2.5 h-2.5 text-[#1283E6]" />
                    Slots:
                  </span>
                  {(['auto', 4, 6, 8, 10] as const).map((count) => {
                    const isSelected = wheelSlotsCount === count;
                    return (
                      <button
                        key={String(count)}
                        onClick={() => !isSpinning && onChangeWheelSlotsCount(count)}
                        disabled={isSpinning}
                        className={`px-1.5 py-0.2 rounded-full font-extrabold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1283E6] text-white shadow-2xs'
                            : 'text-slate-600 hover:text-[#1283E6] hover:bg-white'
                        }`}
                      >
                        {count === 'auto' ? 'Auto' : count}
                      </button>
                    );
                  })}
                  <span className="text-slate-400 text-[8.5px] ml-0.5">
                    ({roundPlayers.length} on wheel)
                  </span>
                </div>
              )}

              {/* Spin Team Participation & Manual Exclusion Bar */}
              <div className="w-full bg-white/90 backdrop-blur-xs rounded-xl border border-blue-200/70 p-1.5 shadow-2xs mt-0.5">
                <div className="flex items-center justify-between gap-1 text-[8.5px] font-bold text-[#061A36] mb-1 px-0.5">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#1283E6]" />
                    <span>Next Spin Teams:</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-[#0A5DB8] font-black">
                      {validParticipatingTeamsCount ?? (teams.length - excludedTeamIds.length - teamsWithCaptainInCategory.size)} in spin
                    </span>
                  </div>
                  {excludedTeamIds.length > 0 && onIncludeAllTeams && (
                    <button
                      type="button"
                      onClick={onIncludeAllTeams}
                      disabled={isSpinning}
                      className="text-[#1283E6] hover:underline cursor-pointer font-extrabold"
                    >
                      Reset Excluded ({excludedTeamIds.length})
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {teams.map((t) => {
                    const isCapt = teamsWithCaptainInCategory.has(t.id);
                    const isExcl = excludedTeamIds.includes(t.id);
                    const tPlayers = players.filter((p) => p.assignedTeamId === t.id);
                    const catQuota = t.quotas[activeCategory.id] ?? 1;
                    const catDrafted = tPlayers.filter(
                      (p) => p.primaryCategoryId === activeCategory.id || p.assignedCategoryId === activeCategory.id
                    ).length;
                    const isQuotaFull = catDrafted >= catQuota && catQuota > 0;
                    const isMax = tPlayers.length >= (t.maxPlayers || 7);

                    if (isCapt) {
                      return (
                        <span
                          key={t.id}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-[8px] font-extrabold shadow-2xs cursor-help"
                          title="Captain is in this active category. Auto-excluded from spin as per tournament rules."
                        >
                          <Crown className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span className="truncate max-w-[70px]">{t.shortName || t.name}</span>
                          <span className="text-[7px] text-amber-700 bg-amber-100 px-0.5 py-0.1 rounded font-black">Capt</span>
                        </span>
                      );
                    }

                    if (isQuotaFull || isMax) {
                      return (
                        <span
                          key={t.id}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-300 text-[8px] font-bold opacity-60"
                          title="Team quota complete for this category / max roster reached."
                        >
                          <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[70px]">{t.shortName || t.name}</span>
                          <span className="text-[7px] bg-slate-200 px-0.5 py-0.1 rounded font-black">Full</span>
                        </span>
                      );
                    }

                    if (isExcl) {
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => !isSpinning && onToggleTeamExclusion?.(t.id)}
                          disabled={isSpinning}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[8px] font-extrabold transition-all shadow-2xs cursor-pointer active:scale-95"
                          title="Click to INCLUDE this team back in spin"
                        >
                          <span className="text-rose-500 font-black text-[8.5px]">✕</span>
                          <span className="truncate max-w-[70px]">{t.shortName || t.name}</span>
                          <span className="text-[7px] bg-rose-200/80 text-rose-800 px-0.5 py-0.1 rounded font-black">Excl</span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => !isSpinning && onToggleTeamExclusion?.(t.id)}
                        disabled={isSpinning}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-700 border border-emerald-300 hover:border-rose-300 text-[8px] font-extrabold transition-all shadow-2xs cursor-pointer active:scale-95 group"
                        title="Click to EXCLUDE this team from next spin"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 group-hover:hidden shrink-0" />
                        <span className="hidden group-hover:inline text-rose-500 font-black text-[8px]">✕</span>
                        <span className="truncate max-w-[70px]">{t.shortName || t.name}</span>
                        <span className="text-[7px] bg-emerald-200/80 group-hover:bg-rose-200/80 px-0.5 py-0.1 rounded font-black">
                          <span className="group-hover:hidden">In</span>
                          <span className="hidden group-hover:inline">Excl</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Flank Teams: Dynamic inward Arrow points Left (←) */}
          <div
            className={`flex flex-col gap-1.5 shrink-0 ${flankWidthClass} ${
              totalTeams > 8
                ? 'grid grid-cols-1 xl:grid-cols-2 max-h-[440px] overflow-y-auto pr-1'
                : ''
            }`}
          >
            {rightTeams.map((team, idx) => (
              <PerimeterTeamCard
                key={team.id}
                team={team}
                players={players}
                picks={picks}
                activeCategory={activeCategory}
                isTargeted={spinningTargetTeamIndex === halfCount + idx}
                isWinner={winningTeam?.id === team.id}
                isExcluded={excludedTeamIds.includes(team.id)}
                isCaptainInCategory={teamsWithCaptainInCategory.has(team.id)}
                onToggleExclude={() => onToggleTeamExclusion?.(team.id)}
                arrow="left"
              />
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MOBILE & TABLET VIEW (< lg): Centered Wheel + Dynamic Grid*/}
        {/* ========================================================= */}
        <div className="flex lg:hidden flex-col items-center w-full">
          {/* Central Circular Wheel */}
          <div className="relative flex items-center justify-center shrink-0 my-1">
            <CentralLotteryWheel
              displayRoundPlayers={roundPlayers}
              highlightedPlayer={highlightedPlayer}
              onSelectPlayer={onSelectPlayer}
              isSpinning={isSpinning}
              isMobile
              tournamentLogo={tournamentLogo}
            />
          </div>

          {/* Controls Bar */}
          <div className="w-full max-w-sm mt-1.5 flex flex-col items-center gap-1.5">
            <div className="w-full flex items-center justify-center gap-2">
              <button
                onClick={onStartSpin}
                disabled={isSpinning || !canSpin}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-[#0264D4] via-[#1283E6] to-[#0264D4] hover:from-[#0A5DB8] hover:to-[#0A5DB8] text-white font-extrabold text-xs rounded-xl shadow-sm shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <Shuffle className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
                <span className="truncate">
                  {isSpinning ? 'SPINNING...' : 'SPIN FOR NEXT PLAYER'}
                </span>
              </button>

              <label className="flex items-center gap-1.5 px-2.5 py-2 bg-white/90 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:bg-white transition-colors shrink-0">
                <input
                  type="checkbox"
                  checked={autoPickEnabled}
                  onChange={(e) => onToggleAutoPick(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#1283E6] focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">
                  Auto (3s)
                </span>
              </label>
            </div>

            {/* Dynamic Number of Wheel Slots Selector (Mobile) */}
            {onChangeWheelSlotsCount && (
              <div className="flex items-center gap-1 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-full border border-blue-200/80 shadow-2xs text-[9px]">
                <span className="text-slate-500 font-bold flex items-center gap-0.5 mr-0.5">
                  <SlidersHorizontal className="w-2.5 h-2.5 text-[#1283E6]" />
                  Slots:
                </span>
                {(['auto', 4, 6, 8, 10] as const).map((count) => {
                  const isSelected = wheelSlotsCount === count;
                  return (
                    <button
                      key={String(count)}
                      onClick={() => !isSpinning && onChangeWheelSlotsCount(count)}
                      disabled={isSpinning}
                      className={`px-1.5 py-0.2 rounded-full font-extrabold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1283E6] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-[#1283E6] hover:bg-white'
                      }`}
                    >
                      {count === 'auto' ? 'Auto' : count}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Spin Team Participation & Manual Exclusion Bar (Mobile) */}
            <div className="w-full bg-white/90 backdrop-blur-xs rounded-xl border border-blue-200/70 p-1.5 shadow-2xs mt-0.5">
              <div className="flex items-center justify-between gap-1 text-[8.5px] font-bold text-[#061A36] mb-1 px-0.5">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#1283E6]" />
                  <span>Next Spin Teams:</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-[#0A5DB8] font-black">
                    {validParticipatingTeamsCount ?? (teams.length - excludedTeamIds.length - teamsWithCaptainInCategory.size)} in spin
                  </span>
                </div>
                {excludedTeamIds.length > 0 && onIncludeAllTeams && (
                  <button
                    type="button"
                    onClick={onIncludeAllTeams}
                    disabled={isSpinning}
                    className="text-[#1283E6] hover:underline cursor-pointer font-extrabold"
                  >
                    Reset Excluded ({excludedTeamIds.length})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {teams.map((t) => {
                  const isCapt = teamsWithCaptainInCategory.has(t.id);
                  const isExcl = excludedTeamIds.includes(t.id);
                  const tPlayers = players.filter((p) => p.assignedTeamId === t.id);
                  const catQuota = t.quotas[activeCategory.id] ?? 1;
                  const catDrafted = tPlayers.filter(
                    (p) => p.primaryCategoryId === activeCategory.id || p.assignedCategoryId === activeCategory.id
                  ).length;
                  const isQuotaFull = catDrafted >= catQuota && catQuota > 0;
                  const isMax = tPlayers.length >= (t.maxPlayers || 7);

                  if (isCapt) {
                    return (
                      <span
                        key={t.id}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-[8px] font-extrabold shadow-2xs"
                        title="Captain is in this category"
                      >
                        <Crown className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                        <span className="truncate max-w-[70px]">{t.shortName || t.name}</span>
                        <span className="text-[7px] text-amber-700 bg-amber-100 px-0.5 py-0.1 rounded font-black">Capt</span>
                      </span>
                    );
                  }

                  if (isQuotaFull || isMax) {
                    return (
                      <span
                        key={t.id}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-300 text-[8px] font-bold opacity-60"
                      >
                        <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[70px]">{t.shortName || t.name}</span>
                        <span className="text-[7px] bg-slate-200 px-0.5 py-0.1 rounded font-black">Full</span>
                      </span>
                    );
                  }

                  if (isExcl) {
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => !isSpinning && onToggleTeamExclusion?.(t.id)}
                        disabled={isSpinning}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[8px] font-extrabold transition-all shadow-2xs cursor-pointer"
                        title="Click to Include team in spin"
                      >
                        <span className="text-rose-500 font-black text-[8.5px]">✕</span>
                        <span className="truncate max-w-[70px]">{t.shortName || t.name}</span>
                        <span className="text-[7px] bg-rose-200/80 text-rose-800 px-0.5 py-0.1 rounded font-black">Excl</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => !isSpinning && onToggleTeamExclusion?.(t.id)}
                      disabled={isSpinning}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-700 border border-emerald-300 hover:border-rose-300 text-[8px] font-extrabold transition-all shadow-2xs cursor-pointer group"
                      title="Click to Exclude team from next spin"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 group-hover:hidden shrink-0" />
                      <span className="hidden group-hover:inline text-rose-500 font-black text-[8px]">✕</span>
                      <span className="truncate max-w-[70px]">{t.shortName || t.name}</span>
                      <span className="text-[7px] bg-emerald-200/80 group-hover:bg-rose-200/80 px-0.5 py-0.1 rounded font-black">
                        <span className="group-hover:hidden">In</span>
                        <span className="hidden group-hover:inline">Excl</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dynamic All-Teams Grid (Adapts to 2, 4, 6, 8, 10, 12 teams) */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2.5">
            {teams.map((team, idx) => (
              <PerimeterTeamCard
                key={team.id}
                team={team}
                players={players}
                picks={picks}
                activeCategory={activeCategory}
                isTargeted={spinningTargetTeamIndex === idx}
                isWinner={winningTeam?.id === team.id}
                isExcluded={excludedTeamIds.includes(team.id)}
                isCaptainInCategory={teamsWithCaptainInCategory.has(team.id)}
                onToggleExclude={() => onToggleTeamExclusion?.(team.id)}
                isGridItem
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =====================================================================
 * CENTRAL LOTTERY WHEEL (With Large On-Deck Player Spotlight)
 * ===================================================================== */
interface CentralLotteryWheelProps {
  displayRoundPlayers: Player[];
  highlightedPlayer: Player | null;
  onSelectPlayer: (player: Player) => void;
  isSpinning: boolean;
  isMobile?: boolean;
  tournamentLogo?: string;
}

const CentralLotteryWheel: React.FC<CentralLotteryWheelProps> = ({
  displayRoundPlayers,
  highlightedPlayer,
  onSelectPlayer,
  isSpinning,
  isMobile = false,
  tournamentLogo,
}) => {
  const playerCount = displayRoundPlayers.length;

  return (
    <div
      className={`relative rounded-full bg-gradient-to-b from-white via-[#E8F1FC] to-[#CFE2F8] shadow-md border-2 border-white/95 ring-2 ring-blue-500/10 flex items-center justify-center transition-all ${
        isMobile
          ? 'w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] p-2'
          : 'w-[290px] h-[290px] xl:w-[310px] xl:h-[310px] p-2'
      }`}
    >
      {/* Dynamic Radial Segment Overlay Lines (N Slices drawn dynamically!) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-full" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#E2E8F0" strokeWidth="0.8" />
        {playerCount > 0 &&
          Array.from({ length: playerCount }).map((_, i) => {
            const angleDeg = 270 + (i * 360) / playerCount;
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = 50 + 48 * Math.cos(angleRad);
            const y = 50 + 48 * Math.sin(angleRad);
            return (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={x}
                y2={y}
                stroke="#CBD5E1"
                strokeWidth="0.6"
                strokeDasharray="1.5 1.5"
              />
            );
          })}
      </svg>

      {/* =================================================================== */}
      {/* CENTER MEDALLION: LARGE PHOTO & NAME OF ON-DECK PLAYER             */}
      {/* =================================================================== */}
      <div
        className={`relative z-20 rounded-full bg-gradient-to-b from-[#0A2458] via-[#05183A] to-[#020B1C] border-2 border-[#FBBF24] shadow-xl flex flex-col items-center justify-center text-center transition-all duration-300 ${
          highlightedPlayer
            ? 'ring-3 ring-amber-400/90 shadow-amber-500/25'
            : 'ring-2 ring-blue-400/40 shadow-blue-500/20'
        } ${
          isMobile
            ? 'w-28 h-28 sm:w-32 sm:h-32 p-1.5'
            : 'w-32 h-32 xl:w-36 xl:h-36 p-2'
        }`}
      >
        <div className="absolute inset-0 rounded-full bg-amber-400/10 blur-xs pointer-events-none" />

        {highlightedPlayer ? (
          /* Large Player Spotlight */
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
            {/* Top ON DECK Micro Pill */}
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-[#061A36] text-[7px] xl:text-[8px] font-black uppercase tracking-wider shadow-2xs animate-pulse whitespace-nowrap">
              ★ ON DECK ★
            </span>

            {/* Large Player Photo */}
            <div
              className={`rounded-full overflow-hidden bg-white border-2 border-white shadow-md shrink-0 relative mt-0.5 ${
                isMobile
                  ? 'w-13 h-13 sm:w-15 sm:h-15'
                  : 'w-14 h-14 xl:w-17 xl:h-17'
              }`}
            >
              {highlightedPlayer.photoUrl ? (
                <img
                  src={highlightedPlayer.photoUrl}
                  alt={highlightedPlayer.fullName}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1283E6] to-[#061A36] flex items-center justify-center text-white font-black text-sm xl:text-base">
                  {highlightedPlayer.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Jersey Number Tag Overlay */}
              {highlightedPlayer.jerseyNumber && (
                <span className="absolute bottom-0 right-0 bg-[#061A36] text-amber-300 text-[6.5px] font-black px-1 rounded-tl shadow-2xs border border-amber-400/40">
                  #{highlightedPlayer.jerseyNumber}
                </span>
              )}
            </div>

            {/* Large Full Name */}
            <h3 className="mt-0.5 font-black text-[9.5px] sm:text-[11px] xl:text-[12px] text-white text-center leading-tight truncate max-w-[95px] sm:max-w-[115px] xl:max-w-[125px] drop-shadow-sm uppercase">
              {highlightedPlayer.fullName}
            </h3>

            {/* Role Badge */}
            <span className="text-[7px] xl:text-[8px] font-bold text-amber-300 truncate max-w-[100px] leading-none">
              {highlightedPlayer.badge || highlightedPlayer.playerType || 'CRICKETER'}
            </span>
          </div>
        ) : (
          /* Fallback Tournament Logo when no player is highlighted */
          <div className="relative z-10 flex flex-col items-center justify-center p-1">
            <img
              src={tournamentLogo || DEFAULT_BPL_LOGO}
              alt="BPL Season-2"
              className="w-12 h-12 sm:w-14 sm:h-14 xl:w-16 xl:h-16 object-contain filter drop-shadow"
              referrerPolicy="no-referrer"
            />
            <span className="text-[7.5px] text-amber-300 font-bold uppercase tracking-wider mt-1">
              SELECT PLAYER
            </span>
          </div>
        )}
      </div>

      {/* Dynamic Radial Player Slots (Spaced evenly at 360 / N degrees) */}
      {displayRoundPlayers.map((player, idx) => {
        const angleDeg = 270 + (idx * 360) / playerCount;
        const angleRad = (angleDeg * Math.PI) / 180;
        // Adjust radius percent depending on player count to prevent clipping
        const radiusPct = playerCount > 6 ? 41.5 : 40;
        const leftPct = 50 + radiusPct * Math.cos(angleRad);
        const topPct = 50 + radiusPct * Math.sin(angleRad);

        const isHighlighted = highlightedPlayer?.id === player.id;
        const isDrafted = player.status === 'drafted';

        return (
          <div
            key={player.id}
            onClick={() => !isSpinning && onSelectPlayer(player)}
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute z-30 transition-all duration-200 ${
              isHighlighted
                ? 'opacity-100 scale-105 z-40'
                : isDrafted
                ? 'opacity-40 scale-95'
                : 'opacity-65 hover:opacity-95 scale-95 cursor-pointer'
            }`}
          >
            <div
              className={`relative flex flex-col items-center bg-white rounded-lg p-0.5 sm:p-1 shadow-sm transition-all ${
                playerCount > 6
                  ? 'w-12 sm:w-14 xl:w-15'
                  : 'w-13 sm:w-15 xl:w-16'
              } border ${
                isHighlighted
                  ? 'border-[#1283E6] ring-2 ring-[#1283E6]/40 shadow-blue-500/30 bg-blue-50/90'
                  : isDrafted
                  ? 'border-emerald-400 bg-emerald-50/50'
                  : 'border-slate-200/80 bg-white/95'
              }`}
            >
              {/* Active Indicator Pin */}
              {isHighlighted && (
                <span className="absolute -top-1.5 px-1 py-0.2 rounded-full bg-[#1283E6] text-[6.5px] font-black text-white uppercase tracking-wider shadow-2xs animate-pulse whitespace-nowrap">
                  ACTIVE
                </span>
              )}

              {/* Drafted Badge */}
              {isDrafted && (
                <span className="absolute -top-1.5 px-1 py-0.2 rounded-full bg-emerald-600 text-[6.5px] font-black text-white uppercase tracking-wider shadow-2xs flex items-center gap-0.5 whitespace-nowrap">
                  <CheckCircle2 className="w-1.5 h-1.5" /> DRAFT
                </span>
              )}

              {/* Mini Player Photo Thumbnail */}
              <div
                className={`rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-inner mt-0.5 ${
                  playerCount > 6 ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-7 h-7 sm:w-8 sm:h-8'
                }`}
              >
                {player.photoUrl ? (
                  <img
                    src={player.photoUrl}
                    alt={player.fullName}
                    className="w-full h-full object-cover object-top"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-slate-400 text-[8px]">
                    {player.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Player First Name */}
              <span className="mt-0.5 font-bold text-[8px] sm:text-[8.5px] text-[#061A36] text-center truncate max-w-full leading-tight">
                {player.fullName.split(' ')[0]}
              </span>

              {/* Role */}
              <span className="text-[6.5px] sm:text-[7px] font-medium text-slate-500 truncate max-w-full">
                {player.badge ? player.badge.slice(0, 3) : 'PLY'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* =====================================================================
 * PERIMETER TEAM CARD (With Scrollable Drafted Players List below Logo)
 * ===================================================================== */
interface PerimeterTeamCardProps {
  team: Team;
  players: Player[];
  picks?: PickRecord[];
  activeCategory: Category;
  isTargeted: boolean;
  isWinner: boolean;
  arrow?: 'left' | 'right';
  isGridItem?: boolean;
  isExcluded?: boolean;
  isCaptainInCategory?: boolean;
  onToggleExclude?: () => void;
}

const PerimeterTeamCard: React.FC<PerimeterTeamCardProps> = ({
  team,
  players,
  picks,
  activeCategory,
  isTargeted,
  isWinner,
  arrow,
  isGridItem = false,
  isExcluded = false,
  isCaptainInCategory = false,
  onToggleExclude,
}) => {
  // Sort team players so the LAST player drafted will be listed in the FIRST place!
  const teamPlayers = useMemo(() => {
    const list = players.filter((p) => p.assignedTeamId === team.id);
    return list.sort((a, b) => {
      const pickA = picks?.find((pk) => pk.playerId === a.id);
      const pickB = picks?.find((pk) => pk.playerId === b.id);
      const timeA = pickA?.createdAt ?? pickA?.sequence ?? a.updatedAt ?? 0;
      const timeB = pickB?.createdAt ?? pickB?.sequence ?? b.updatedAt ?? 0;
      return timeB - timeA; // Descending: newest pick first!
    });
  }, [players, team.id, picks]);

  const maxCap = team.maxPlayers || 7;

  // Category specific quota check
  const catQuota = team.quotas[activeCategory.id] ?? 1;
  const catDrafted = teamPlayers.filter(
    (p) => p.primaryCategoryId === activeCategory.id || p.assignedCategoryId === activeCategory.id
  ).length;
  const isCategoryLocked = catDrafted >= catQuota && catQuota > 0;
  const isMaxCapReached = teamPlayers.length >= maxCap;

  // "Je ekbar player pabe sei team grayed out hobe"
  // Once a team gets its player in this round / category (or max cap reached), or if captain is in category, or if manually excluded, gray it out!
  const isGrayedOut = !isWinner && (isCategoryLocked || isMaxCapReached || isCaptainInCategory || isExcluded);

  // Auto-scroll list to top when a new player is drafted so newest is immediately in view
  const rosterScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isWinner && rosterScrollRef.current) {
      rosterScrollRef.current.scrollTop = 0;
    }
  }, [isWinner, teamPlayers.length]);

  // Directional arrow pointing toward center
  const renderArrow = () => {
    if (!arrow) return null;
    const arrowColor = team.primaryColor || '#1283E6';
    const isLit = isTargeted || isWinner;

    return (
      <div
        className={`flex items-center justify-center shrink-0 transition-all duration-200 px-1 ${
          isLit ? 'scale-125 drop-shadow-sm animate-pulse' : 'opacity-60'
        }`}
        style={{ color: arrowColor }}
      >
        {arrow === 'right' && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
        {arrow === 'left' && <ArrowLeft className="w-4 h-4 stroke-[2.5]" />}
      </div>
    );
  };

  return (
    <div
      className={`relative flex items-center ${
        arrow === 'right' ? 'flex-row' : arrow === 'left' ? 'flex-row-reverse' : ''
      } w-full`}
    >
      {/* Main Compact Card Container */}
      <div
        className={`relative flex-1 p-1.5 xl:p-2 rounded-xl backdrop-blur-md shadow-2xs border transition-all duration-200 flex flex-col text-left ${
          isWinner
            ? 'scale-102 ring-2 ring-amber-400 bg-amber-50/95 shadow-md shadow-amber-400/30'
            : isTargeted
            ? 'scale-101 ring-2 ring-blue-400 bg-blue-50/90 shadow-sm shadow-blue-400/20'
            : isGrayedOut
            ? 'bg-slate-100/85 border-slate-300/80 opacity-60 grayscale-[60%] contrast-90 hover:opacity-90'
            : 'bg-white/95 hover:shadow-xs'
        }`}
        style={{ borderColor: isGrayedOut ? '#cbd5e1' : team.primaryColor || '#1283E6' }}
      >
        {/* Winner Flare */}
        {isWinner && (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-white font-black text-[7.5px] tracking-wider uppercase shadow-2xs flex items-center gap-0.5 animate-bounce whitespace-nowrap z-20">
            <Sparkles className="w-2 h-2" /> DRAFTED!
          </span>
        )}

        {/* Team Top Header: Logo + Name + Captain */}
        <div className="flex items-center gap-1.5">
          {/* Team Logo */}
          <div
            className="w-7 h-7 rounded-md overflow-hidden bg-slate-900 border shrink-0 flex items-center justify-center p-0.5 shadow-2xs"
            style={{ borderColor: isGrayedOut ? '#94a3b8' : team.primaryColor || '#1283E6' }}
          >
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-white font-black text-[8px]">{team.shortName}</span>
            )}
          </div>

          {/* Name & Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="font-extrabold text-[10.5px] xl:text-[11px] text-[#061A36] leading-tight truncate">
                {team.name}
              </h4>
              <div className="flex items-center gap-1 shrink-0">
                {isCaptainInCategory ? (
                  <span
                    className="px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[6.5px] font-black uppercase tracking-wider flex items-center gap-0.5 cursor-help"
                    title="Captain is in this active category, team does not participate in spin"
                  >
                    <Crown className="w-1.5 h-1.5 text-amber-600" /> CAPT
                  </span>
                ) : isExcluded ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExclude?.();
                    }}
                    className="px-1 py-0.2 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 text-[6.5px] font-black uppercase tracking-wider cursor-pointer"
                    title="Click to INCLUDE in spin"
                  >
                    ✕ EXCL
                  </button>
                ) : isCategoryLocked || isMaxCapReached ? (
                  <span className="px-1 py-0.2 rounded bg-slate-200 text-slate-600 text-[6.5px] font-black uppercase tracking-wider">
                    ✓ FULL
                  </span>
                ) : (
                  onToggleExclude && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExclude();
                      }}
                      className="px-1 py-0.2 rounded bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-300 text-[6px] font-bold uppercase transition-colors cursor-pointer"
                      title="Exclude from next spin"
                    >
                      Excl
                    </button>
                  )
                )}
              </div>
            </div>
            {team.captainName ? (
              <div className="flex items-center gap-0.5 text-[8px] font-bold text-amber-700 truncate">
                <Crown className="w-2 h-2 text-amber-500 shrink-0" />
                <span className="truncate">C: {team.captainName}</span>
              </div>
            ) : (
              <span className="text-[8px] text-slate-400 font-medium">No Captain</span>
            )}
          </div>
        </div>

        {/* Squad Count & Progress Dots */}
        <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-slate-600">
          <div className="flex items-center gap-1">
            <span>
              {teamPlayers.length}/{maxCap}
            </span>
            {isCategoryLocked && (
              <span className="inline-flex items-center text-amber-600" title="Category Quota Met">
                <Lock className="w-2 h-2" />
              </span>
            )}
          </div>

          {/* Progress Slot Dots */}
          <div className="flex items-center gap-0.5">
            {Array.from({ length: maxCap }).map((_, slotIdx) => {
              const isFilled = slotIdx < teamPlayers.length;
              return (
                <span
                  key={slotIdx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    isFilled ? '' : 'bg-slate-200'
                  }`}
                  style={{
                    backgroundColor: isFilled ? (isGrayedOut ? '#94a3b8' : team.primaryColor || '#1283E6') : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* =================================================================== */}
        {/* SCROLLABLE LIST OF DRAFTED PLAYERS BELOW THE TEAM LOGO / HEADER     */}
        {/* LAST PLAYER DRAFTED IS LISTED IN THE FIRST PLACE (NEWEST FIRST)     */}
        {/* =================================================================== */}
        <div className="mt-1 pt-0.5 border-t border-slate-100 flex flex-col">
          <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 px-0.5">
            <span>Roster (Latest First)</span>
            <span>{teamPlayers.length} picked</span>
          </div>

          {/* Scrollable Container (Compact & Fluid) */}
          <div
            ref={rosterScrollRef}
            className="w-full max-h-12 xl:max-h-16 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin scrollbar-thumb-slate-300"
          >
            {teamPlayers.length > 0 ? (
              teamPlayers.map((tp, pIdx) => {
                const isCaptain =
                  team.captainName === tp.fullName ||
                  (team as any).captainId === tp.id ||
                  tp.isCaptain;
                const isLatestDrafted = pIdx === 0;

                return (
                  <div
                    key={tp.id}
                    className={`flex items-center gap-1 rounded px-1 py-0.5 border transition-colors ${
                      isLatestDrafted
                        ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-semibold shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200/60 text-slate-800'
                    }`}
                  >
                    {/* Player Thumbnail */}
                    <div className="w-3.5 h-3.5 rounded overflow-hidden bg-white border border-slate-200 shrink-0 flex items-center justify-center">
                      {tp.photoUrl ? (
                        <img
                          src={tp.photoUrl}
                          alt={tp.fullName}
                          className="w-full h-full object-cover object-top"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[7px] font-bold text-slate-500">
                          {tp.fullName.slice(0, 1)}
                        </span>
                      )}
                    </div>

                    {/* Name & Latest Badge */}
                    <span className="flex-1 text-[8.5px] truncate leading-tight flex items-center gap-0.5">
                      <span className="truncate">{tp.fullName}</span>
                      {isLatestDrafted && (
                        <span className="text-[6px] font-black text-amber-700 bg-amber-200/80 px-0.5 rounded shrink-0">
                          NEW
                        </span>
                      )}
                      {isCaptain && (
                        <span title="Captain" className="inline-flex">
                          <Crown className="w-2 h-2 text-amber-500 shrink-0" />
                        </span>
                      )}
                    </span>

                    {/* Role Tag */}
                    <span className="text-[7px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200/60 shrink-0">
                      {tp.badge ? tp.badge.slice(0, 3) : 'PLY'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-1 text-center text-[8px] text-slate-400 italic bg-slate-50/50 rounded border border-dashed border-slate-200 flex items-center justify-center gap-0.5">
                <Users className="w-2 h-2 text-slate-300" />
                <span>No players yet</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Arrow on edge facing the center wheel */}
      {!isGridItem && renderArrow()}
    </div>
  );
};
