import React, { useState, useMemo } from 'react';
import {
  X,
  Shield,
  Search,
  CheckCircle2,
  Sparkles,
  CheckSquare,
  Square,
  Plus,
} from 'lucide-react';
import { Team } from '../types';
import { createSampleDraftData } from '../lib/sampleData';

interface ImportDefaultTeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDraftId: string;
  currentTeams: Team[];
  onImportTeams: (teamsToImport: Team[]) => Promise<void>;
  onOpenCreateNew?: () => void;
}

export const ImportDefaultTeamsModal: React.FC<ImportDefaultTeamsModalProps> = ({
  isOpen,
  onClose,
  activeDraftId,
  currentTeams,
  onImportTeams,
  onOpenCreateNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultData = useMemo(() => createSampleDraftData(), []);
  const defaultTeams = defaultData.teams;

  // Existing team names
  const existingTeamNames = useMemo(() => {
    return new Set(currentTeams.map((t) => t.name.toLowerCase().trim()));
  }, [currentTeams]);

  // Selected team IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    defaultTeams.forEach((t) => {
      if (!existingTeamNames.has(t.name.toLowerCase().trim())) {
        initial.add(t.id);
      }
    });
    return initial.size > 0 ? initial : new Set(defaultTeams.map((t) => t.id));
  });

  const filteredTeams = useMemo(() => {
    return defaultTeams.filter((t) => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q);
    });
  }, [defaultTeams, searchTerm]);

  if (!isOpen) return null;

  const toggleSelectTeam = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(defaultTeams.map((t) => t.id)));
  };

  const handleClear = () => {
    setSelectedIds(new Set());
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsSubmitting(true);
      const now = Date.now();
      const teamsToImport: Team[] = defaultTeams
        .filter((t) => selectedIds.has(t.id))
        .map((t) => ({
          ...t,
          id: `team-imp-${now}-${t.id}`,
          draftId: activeDraftId,
          active: true,
          createdAt: now,
          updatedAt: now,
        }));

      await onImportTeams(teamsToImport);
      onClose();
    } catch (err) {
      console.error('Failed to import default teams:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#061A36] via-[#0A244A] to-[#0A5DB8] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">
                Import Franchise Teams
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Select which official franchise teams to import, import all, or create new
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

        {/* Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search team name or abbreviation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1283E6]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#1283E6] hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Select All (6)</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
              {onOpenCreateNew && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateNew();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Team List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTeams.map((team) => {
              const isChecked = selectedIds.has(team.id);
              const isAlreadyPresent = existingTeamNames.has(team.name.toLowerCase().trim());

              return (
                <div
                  key={team.id}
                  onClick={() => toggleSelectTeam(team.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isChecked
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-[#1283E6] border-slate-300 pointer-events-none"
                    />
                    <div className="w-10 h-10 rounded-xl bg-slate-100 p-1 flex items-center justify-center shrink-0 border border-slate-200">
                      {team.logoUrl ? (
                        <img
                          src={team.logoUrl}
                          alt={team.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Shield className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                        <span>{team.name}</span>
                        {isAlreadyPresent && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                            Already added
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: team.primaryColor }}
                        />
                        <span>{team.shortName}</span>
                        <span>• Max {team.maxPlayers || 11} squad</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isChecked
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isChecked ? 'Selected' : 'Exclude'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600 font-semibold">
            <span>Selected to import: </span>
            <span className="font-bold text-[#1283E6]">{selectedIds.size}</span> of {defaultTeams.length} franchise teams
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedIds.size === 0 || isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Importing...' : `Import ${selectedIds.size} Teams`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
