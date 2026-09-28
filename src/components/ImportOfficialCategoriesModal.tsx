import React, { useState } from 'react';
import { Layers, X, CheckSquare, Square, Plus, Check } from 'lucide-react';
import { Category } from '../types';
import { createSampleDraftData } from '../lib/sampleData';

interface ImportOfficialCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDraftId: string;
  currentCategories: Category[];
  onImportCategories: (categoriesToImport: Category[]) => Promise<void>;
  onOpenCreateNewCategory: () => void;
}

export const ImportOfficialCategoriesModal: React.FC<ImportOfficialCategoriesModalProps> = ({
  isOpen,
  onClose,
  activeDraftId,
  currentCategories,
  onImportCategories,
  onOpenCreateNewCategory,
}) => {
  const sample = createSampleDraftData();
  const officialCategories = sample.categories;

  // Track existing category names
  const existingNames = new Set(currentCategories.map((c) => c.name.toLowerCase().trim()));

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    officialCategories.forEach((c) => {
      if (!existingNames.has(c.name.toLowerCase().trim())) {
        initial.add(c.id);
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
    officialCategories.forEach((c) => {
      if (!existingNames.has(c.name.toLowerCase().trim())) {
        all.add(c.id);
      }
    });
    setSelectedIds(all);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = async () => {
    const categoriesToImport: Category[] = [];
    const now = Date.now();
    let currentMaxOrder = currentCategories.reduce((max, c) => Math.max(max, c.order || 0), 0);

    officialCategories.forEach((c) => {
      if (selectedIds.has(c.id)) {
        currentMaxOrder += 1;
        categoriesToImport.push({
          ...c,
          id: `cat-${now}-${c.order}-${Math.floor(Math.random() * 1000)}`,
          draftId: activeDraftId,
          order: currentMaxOrder,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    if (categoriesToImport.length === 0) return;

    try {
      setIsSubmitting(true);
      await onImportCategories(categoriesToImport);
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
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide">Import Official Role Categories</h2>
              <p className="text-xs text-blue-200">Select which role categories to include in this draft or create custom categories</p>
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
              onOpenCreateNewCategory();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Custom Category</span>
          </button>
        </div>

        {/* Categories Checklist */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
          {officialCategories.map((cat) => {
            const alreadyExists = existingNames.has(cat.name.toLowerCase().trim());
            const isSelected = selectedIds.has(cat.id);

            return (
              <div
                key={cat.id}
                onClick={() => {
                  if (!alreadyExists) toggleSelect(cat.id);
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

                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs font-extrabold text-xs text-white" style={{ backgroundColor: cat.color }}>
                    #{cat.order}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{cat.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      Standard round: #{cat.order} • Icon: {cat.iconName || 'Zap'}
                    </p>
                  </div>
                </div>

                <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: cat.color }} />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">
            {selectedIds.size} categor{selectedIds.size === 1 ? 'y' : 'ies'} selected to import
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
              <span>{isSubmitting ? 'Importing...' : `Import ${selectedIds.size} Categor${selectedIds.size === 1 ? 'y' : 'ies'}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
