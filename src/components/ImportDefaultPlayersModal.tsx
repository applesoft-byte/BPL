import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  Search,
  CheckCircle2,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  Shield,
  Filter,
  Plus,
} from 'lucide-react';
import { Player, Category } from '../types';
import { createSampleDraftData } from '../lib/sampleData';

interface ImportDefaultPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDraftId: string;
  currentPlayers: Player[];
  categories: Category[];
  onImportPlayers: (playersToImport: Player[]) => Promise<void>;
  onOpenCreateNew?: () => void;
}

export const ImportDefaultPlayersModal: React.FC<ImportDefaultPlayersModalProps> = ({
  isOpen,
  onClose,
  activeDraftId,
  currentPlayers,
  categories,
  onImportPlayers,
  onOpenCreateNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate the 60 standard official players
  const defaultData = useMemo(() => {
    return createSampleDraftData();
  }, []);

  const defaultPlayers = defaultData.players;
  const defaultCategories = defaultData.categories;

  // Set of player names / jersey numbers already present in current draft
  const existingPlayerKeys = useMemo(() => {
    const set = new Set<string>();
    currentPlayers.forEach((p) => {
      set.add(p.fullName.toLowerCase().trim());
      if (p.jerseyNumber) set.add(`jersey-${p.jerseyNumber}`);
    });
    return set;
  }, [currentPlayers]);

  // Selected player IDs to import
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // By default select players that aren't already in the current draft
    const initial = new Set<string>();
    defaultPlayers.forEach((p) => {
      const isAlready =
        existingPlayerKeys.has(p.fullName.toLowerCase().trim()) ||
        (p.jerseyNumber ? existingPlayerKeys.has(`jersey-${p.jerseyNumber}`) : false);
      if (!isAlready) {
        initial.add(p.id);
      }
    });
    return initial;
  });

  // Filter players
  const filteredPlayers = useMemo(() => {
    return defaultPlayers.filter((p) => {
      const matchesSearch =
        p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.jerseyNumber && p.jerseyNumber.includes(searchTerm)) ||
        p.playerType.toLowerCase().includes(searchTerm.toLowerCase());

      const defaultCat = defaultCategories.find((c) => c.id === p.primaryCategoryId);
      const matchesCat =
        selectedCategoryId === 'all' ||
        p.primaryCategoryId === selectedCategoryId ||
        (defaultCat && defaultCat.name.toLowerCase() === selectedCategoryId.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [defaultPlayers, defaultCategories, searchTerm, selectedCategoryId]);

  if (!isOpen) return null;

  const toggleSelectPlayer = (id: string) => {
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

  const handleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredPlayers.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredPlayers.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;

    try {
      setIsSubmitting(true);
      const now = Date.now();

      // Find players selected and re-map category IDs to current draft's categories if possible
      const playersToImport: Player[] = defaultPlayers
        .filter((p) => selectedIds.has(p.id))
        .map((p, idx) => {
          const origCat = defaultCategories.find((c) => c.id === p.primaryCategoryId);
          // Match by category name in current draft
          const matchedTargetCat = categories.find(
            (c) => origCat && c.name.toLowerCase().trim() === origCat.name.toLowerCase().trim()
          );

          const targetCategoryId = matchedTargetCat ? matchedTargetCat.id : categories[0]?.id || p.primaryCategoryId;

          return {
            ...p,
            id: `player-imp-${now}-${idx}-${p.jerseyNumber || '00'}`,
            draftId: activeDraftId,
            primaryCategoryId: targetCategoryId,
            assignedTeamId: undefined, // Available for draft
            assignedCategoryId: undefined,
            status: 'available',
            inDraftPool: true,
            createdAt: now,
            updatedAt: now,
          };
        });

      await onImportPlayers(playersToImport);
      onClose();
    } catch (err) {
      console.error('Failed to import default players:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#061A36] via-[#0A244A] to-[#0A5DB8] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">
                Import from Default Player Registry
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Choose players from the official 60-player BPL cricket database to add to this draft
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search & Categories */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search player name, jersey #, role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1283E6]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1283E6] flex-1 sm:flex-none"
              >
                <option value="all">All Role Categories ({defaultPlayers.length})</option>
                {defaultCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#1283E6] border border-blue-200 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAllFiltered}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                Clear
              </button>
              {onOpenCreateNew && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateNew();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Showing {filteredPlayers.length} players • Selected: <strong>{selectedIds.size}</strong> players
            </span>
            <span className="text-[11px] text-slate-400">
              * Players already in current draft are tagged "Already Added"
            </span>
          </div>
        </div>

        {/* Players Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No players match your search filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredPlayers.map((player) => {
                const isSelected = selectedIds.has(player.id);
                const isAlreadyInDraft =
                  existingPlayerKeys.has(player.fullName.toLowerCase().trim()) ||
                  (player.jerseyNumber ? existingPlayerKeys.has(`jersey-${player.jerseyNumber}`) : false);
                const categoryName =
                  defaultCategories.find((c) => c.id === player.primaryCategoryId)?.name || 'General';

                return (
                  <div
                    key={player.id}
                    onClick={() => toggleSelectPlayer(player.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-blue-50/70 border-[#1283E6] ring-1 ring-[#1283E6]/40 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="shrink-0 text-slate-400">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#1283E6]" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 relative">
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={player.fullName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xs font-black text-slate-500">
                          #{player.jerseyNumber || '00'}
                        </span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-[#061A36] break-words leading-tight">
                          {player.fullName}
                        </span>
                        <span className="text-[10px] font-extrabold text-[#1283E6] bg-blue-100/70 px-1 py-0.2 rounded shrink-0">
                          #{player.jerseyNumber}
                        </span>
                        {isAlreadyInDraft && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full border border-amber-300 shrink-0">
                            Already Added
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">
                        {categoryName} • {player.battingStyle || player.playerType}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600 font-semibold">
            Ready to import <strong className="text-[#1283E6]">{selectedIds.size}</strong> players into the active draft
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isSubmitting || selectedIds.size === 0}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1283E6] hover:bg-[#0A6EC9] text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isSubmitting ? 'Importing...' : `Import Selected (${selectedIds.size})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
