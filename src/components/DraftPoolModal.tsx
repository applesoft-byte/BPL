import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  CheckSquare,
  Square,
  Users,
  CheckCircle2,
  Sparkles,
  Filter,
  Shield,
} from 'lucide-react';
import { Category, Player, Team } from '../types';

interface DraftPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  categories: Category[];
  teams: Team[];
  onUpdateDraftPool: (playerIdsToInclude: string[]) => Promise<void>;
}

export const DraftPoolModal: React.FC<DraftPoolModalProps> = ({
  isOpen,
  onClose,
  players,
  categories,
  teams,
  onUpdateDraftPool,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(players.filter((p) => p.inDraftPool !== false).map((p) => p.id));
  });

  // Calculate target squad quota requirement
  const targetRequired = useMemo(() => {
    return teams.reduce((acc, t) => {
      const qSum = Object.values(t.quotas).reduce((s, q) => s + (q || 0), 0);
      return acc + Math.max(t.maxPlayers || 11, qSum);
    }, 0);
  }, [teams]);

  if (!isOpen) return null;

  const filteredPlayers = players.filter((p) => {
    const matchSearch =
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.jerseyNumber.includes(searchTerm) ||
      p.playerType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'all' || p.primaryCategoryId === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(players.map((p) => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSelectFirstN = (n: number) => {
    setSelectedIds(new Set(players.slice(0, n).map((p) => p.id)));
  };

  const handleSave = async () => {
    await onUpdateDraftPool(Array.from(selectedIds));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-[#061A36] to-[#0A244A] text-white">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#1283E6]" />
            <div>
              <h3 className="text-base font-bold">Draft Player Selection Pool</h3>
              <p className="text-xs text-slate-300">
                Choose exactly which players enter the lottery wheel & draft arena
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar & Quick Presets */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800">
              Selected in Pool:{' '}
              <span
                className={
                  selectedIds.size >= targetRequired
                    ? 'text-emerald-600 font-extrabold text-sm'
                    : 'text-amber-600 font-extrabold text-sm'
                }
              >
                {selectedIds.size}
              </span>{' '}
              / {players.length}
            </span>
            <span className="text-[11px] text-slate-500">
              (Required for {teams.length} teams × 11: <strong>{targetRequired}</strong>)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
            >
              Select All ({players.length})
            </button>
            {targetRequired > 0 && targetRequired < players.length && (
              <button
                onClick={() => handleSelectFirstN(targetRequired)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 border border-blue-200 text-[#1283E6] rounded-lg hover:bg-blue-100"
              >
                Select Top {targetRequired}
              </button>
            )}
            <button
              onClick={handleDeselectAll}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by player name, jersey #..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#1283E6]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#1283E6]"
          >
            <option value="all">All Roles & Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Players Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No players match your search filter.
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isSelected = selectedIds.has(player.id);
              const cat = categories.find((c) => c.id === player.primaryCategoryId);

              return (
                <div
                  key={player.id}
                  onClick={() => handleToggle(player.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-300 shadow-xs'
                      : 'bg-white border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? 'bg-[#1283E6] text-white'
                          : 'border-2 border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Photo / Avatar */}
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={player.fullName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="font-bold text-xs text-slate-600">
                          {player.jerseyNumber || '00'}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#061A36] truncate">
                          {player.fullName}
                        </span>
                        <span className="text-[10px] font-extrabold text-[#1283E6] bg-blue-100/60 px-1.5 py-0.2 rounded">
                          #{player.jerseyNumber}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: cat?.color || '#1283E6' }}
                        />
                        <span>{cat?.name || 'Player'}</span>
                        <span>•</span>
                        <span>{player.badge}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {isSelected ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                        IN DRAFT POOL
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        EXCLUDED
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">
            <strong>{selectedIds.size}</strong> players will enter the draft lottery
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              Confirm Pool Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
