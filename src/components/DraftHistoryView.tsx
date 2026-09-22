import React, { useState, useMemo } from 'react';
import { History, RotateCcw, Search, Shield, Filter, AlertCircle, ArrowLeft } from 'lucide-react';
import { Category, PickRecord, Player, Team } from '../types';

interface DraftHistoryViewProps {
  picks: PickRecord[];
  players: Player[];
  teams: Team[];
  categories: Category[];
  onUndoLatestPick: () => Promise<void>;
  onNavigateToLive: () => void;
}

export const DraftHistoryView: React.FC<DraftHistoryViewProps> = ({
  picks,
  players,
  teams,
  categories,
  onUndoLatestPick,
  onNavigateToLive,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isUndoConfirmOpen, setIsUndoConfirmOpen] = useState(false);

  // Enriched Pick list in reverse chronological order
  const enrichedPicks = useMemo(() => {
    return picks
      .map((pick) => {
        const player = players.find((p) => p.id === pick.playerId);
        const team = teams.find((t) => t.id === pick.teamId);
        const category = categories.find((c) => c.id === pick.categoryId);
        return {
          pick,
          player,
          team,
          category,
        };
      })
      .filter((item) => {
        const matchesSearch =
          item.player?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.team?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTeam = teamFilter === 'all' || item.team?.id === teamFilter;
        const matchesCategory =
          categoryFilter === 'all' || item.category?.id === categoryFilter;
        return matchesSearch && matchesTeam && matchesCategory;
      })
      .sort((a, b) => b.pick.sequence - a.pick.sequence);
  }, [picks, players, teams, categories, searchTerm, teamFilter, categoryFilter]);

  const latestPick = picks[picks.length - 1];
  const latestPlayer = players.find((p) => p.id === latestPick?.playerId);
  const latestTeam = teams.find((t) => t.id === latestPick?.teamId);

  const handleConfirmUndo = async () => {
    await onUndoLatestPick();
    setIsUndoConfirmOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#061A36] flex items-center gap-2">
            <History className="w-5 h-5 text-[#1283E6]" />
            Official Draft Pick Ledger ({picks.length})
          </h2>
          <p className="text-xs text-slate-500">
            Immutable chronological lottery log • Reverse chronological sequence audit
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToLive}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Arena
          </button>

          {picks.length > 0 && (
            <button
              onClick={() => setIsUndoConfirmOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-colors shadow-2xs"
            >
              <RotateCcw className="w-4 h-4" />
              Undo Latest Pick (#{latestPick?.sequence})
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by player or franchise team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Team Filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#1283E6]"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#1283E6]"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pick Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 grid grid-cols-12 gap-3">
          <div className="col-span-1 text-center">Pick #</div>
          <div className="col-span-4">Drafted Player</div>
          <div className="col-span-3">Assigned Franchise</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2 text-right">Timestamp</div>
        </div>

        {enrichedPicks.length === 0 ? (
          <div className="text-center py-16 p-8 space-y-2">
            <p className="text-sm font-semibold text-slate-600">No draft picks recorded yet.</p>
            <p className="text-xs text-slate-400">Picks made in the Live Arena will appear here in sequence.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {enrichedPicks.map(({ pick, player, team, category }) => {
              const timeStr = new Date(pick.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={pick.id}
                  className="p-4 grid grid-cols-12 gap-3 items-center text-xs hover:bg-slate-50/80 transition-colors"
                >
                  {/* Sequence # */}
                  <div className="col-span-1 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#061A36] text-white font-extrabold text-xs shadow-2xs">
                      #{pick.sequence}
                    </span>
                  </div>

                  {/* Player */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#E6F7FF] text-[#1283E6] font-bold flex items-center justify-center text-xs shrink-0 border border-blue-100">
                      #{player?.jerseyNumber || '00'}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-900 text-sm truncate">
                        {player?.fullName || 'Unknown Player'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {player?.playerType} • {player?.badge}
                      </div>
                    </div>
                  </div>

                  {/* Team */}
                  <div className="col-span-3 flex items-center gap-2 truncate">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                      style={{ backgroundColor: team?.primaryColor || '#1283E6' }}
                    >
                      {team?.shortName || 'TM'}
                    </div>
                    <span className="font-bold text-slate-800 truncate">
                      {team?.name || 'Unassigned'}
                    </span>
                  </div>

                  {/* Category */}
                  <div className="col-span-2">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold truncate"
                      style={{
                        backgroundColor: `${category?.color || '#1283E6'}15`,
                        color: category?.color || '#1283E6',
                      }}
                    >
                      {category?.name || 'Category'}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="col-span-2 text-right text-slate-400 font-mono text-[11px]">
                    {timeStr}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Undo Confirmation Modal (Section 25) */}
      {isUndoConfirmOpen && latestPick && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Confirm Undo Pick</h3>
                <p className="text-xs text-slate-500">This action will reverse the latest lottery allocation</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="text-slate-600">
                Pick #{latestPick.sequence}: <strong className="text-slate-900">{latestPlayer?.fullName}</strong>
              </div>
              <div className="text-slate-600">
                Assigned Team: <strong className="text-slate-900">{latestTeam?.name}</strong>
              </div>
              <p className="text-[11px] text-amber-700 font-medium pt-1">
                Restores player to available pool, re-opens franchise team category quota, and reduces draft sequence by 1.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsUndoConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUndo}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Yes, Undo Pick
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
