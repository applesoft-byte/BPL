import React, { useState } from 'react';
import { Shield, X, CheckSquare, Square, Plus, Check } from 'lucide-react';
import { Team } from '../types';
import { createSampleDraftData } from '../lib/sampleData';

interface ImportOfficialTeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDraftId: string;
  currentTeams: Team[];
  onImportTeams: (teamsToImport: Team[]) => Promise<void>;
  onOpenCreateNewTeam: () => void;
}

export const ImportOfficialTeamsModal: React.FC<ImportOfficialTeamsModalProps> = ({
  isOpen,
  onClose,
  activeDraftId,
  currentTeams,
  onImportTeams,
  onOpenCreateNewTeam,
}) => {
  const sample = createSampleDraftData();
  const officialTeams = sample.teams;

  // Track existing team names so we don't import duplicates
  const existingNames = new Set(currentTeams.map((t) => t.name.toLowerCase().trim()));

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Select all official teams not yet added
    const initial = new Set<string>();
    officialTeams.forEach((t) => {
      if (!existingNames.has(t.name.toLowerCase().trim())) {
        initial.add(t.id);
      }
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set<string>();
    officialTeams.forEach((t) => {
      if (!existingNames.has(t.name.toLowerCase().trim())) {
        all.add(t.id);
      }
    });
    setSelectedIds(all);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = async () => {
    const teamsToImport: Team[] = [];
    const now = Date.now();

    officialTeams.forEach((t) => {
      if (selectedIds.has(t.id)) {
        teamsToImport.push({
          ...t,
          id: `team-${now}-${t.shortName.toLowerCase()}-${Math.floor(Math.random() * 1000)}`,
          draftId: activeDraftId,
          captainPlayerId: undefined,
          captainName: undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    if (teamsToImport.length === 0) return;

    try {
      setIsSubmitting(true);
      await onImportTeams(teamsToImport);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#061A36] via-[#0A244A] to-[#0A5DB8] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide">Import Official Franchise Teams</h2>
              <p className="text-xs text-blue-200">Select specific official teams to add or create new custom teams</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 rounded-lg bg-blue-100 text-[#0A5DB8] hover:bg-blue-200 font-bold transition-colors cursor-pointer"
            >
              Select All Available
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreateNewTeam();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Custom Team</span>
          </button>
        </div>

        {/* Team Cards Checklist */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
          {officialTeams.map((team) => {
            const alreadyExists = existingNames.has(team.name.toLowerCase().trim());
            const isSelected = selectedIds.has(team.id);

            return (
              <div
                key={team.id}
                onClick={() => {
                  if (!alreadyExists) toggleSelect(team.id);
                }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  alreadyExists
                    ? 'bg-slate-100/60 border-slate-200 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-50/70 border-[#1283E6] ring-1 ring-[#1283E6]/30 cursor-pointer shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-slate-500">
                    {alreadyExists ? (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">Added</span>
                    ) : isSelected ? (
                      <CheckSquare className="w-5 h-5 text-[#1283E6]" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                    {team.logoUrl ? (
                      <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                    ) : (
                      <Shield className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{team.name}</h4>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded" style={{ backgroundColor: `${team.primaryColor}20`, color: team.primaryColor }}>
                        {team.shortName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Squad Quota: {team.maxPlayers || 11} players • Primary color: {team.primaryColor}
                    </p>
                  </div>
                </div>

                <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: team.primaryColor }} />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">
            {selectedIds.size} team{selectedIds.size === 1 ? '' : 's'} selected to import
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 || isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Importing...' : `Import ${selectedIds.size} Team${selectedIds.size === 1 ? '' : 's'}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
