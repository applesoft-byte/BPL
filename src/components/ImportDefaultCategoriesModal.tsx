import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Search,
  CheckCircle2,
  Sparkles,
  CheckSquare,
  Square,
  Plus,
} from 'lucide-react';
import { Category } from '../types';
import { createSampleDraftData } from '../lib/sampleData';

interface ImportDefaultCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDraftId: string;
  currentCategories: Category[];
  onImportCategories: (categoriesToImport: Category[]) => Promise<void>;
  onOpenCreateNew?: () => void;
}

export const ImportDefaultCategoriesModal: React.FC<ImportDefaultCategoriesModalProps> = ({
  isOpen,
  onClose,
  activeDraftId,
  currentCategories,
  onImportCategories,
  onOpenCreateNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultData = useMemo(() => createSampleDraftData(), []);
  const defaultCategories = defaultData.categories;

  // Existing category names
  const existingCatNames = useMemo(() => {
    return new Set(currentCategories.map((c) => c.name.toLowerCase().trim()));
  }, [currentCategories]);

  // Selected category IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    defaultCategories.forEach((c) => {
      if (!existingCatNames.has(c.name.toLowerCase().trim())) {
        initial.add(c.id);
      }
    });
    return initial.size > 0 ? initial : new Set(defaultCategories.map((c) => c.id));
  });

  const filteredCategories = useMemo(() => {
    return defaultCategories.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
  }, [defaultCategories, searchTerm]);

  if (!isOpen) return null;

  const toggleSelectCategory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(defaultCategories.map((c) => c.id)));
  };

  const handleClear = () => {
    setSelectedIds(new Set());
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsSubmitting(true);
      const now = Date.now();
      const categoriesToImport: Category[] = defaultCategories
        .filter((c) => selectedIds.has(c.id))
        .map((c, idx) => ({
          ...c,
          id: `cat-imp-${now}-${idx + 1}`,
          draftId: activeDraftId,
          order: currentCategories.length + idx + 1,
          active: true,
          createdAt: now,
          updatedAt: now,
        }));

      await onImportCategories(categoriesToImport);
      onClose();
    } catch (err) {
      console.error('Failed to import default categories:', err);
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
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">
                Import Role Categories
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Select which official role categories to import, import all, or create new
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
                placeholder="Search category name..."
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
                <span>Select All (10)</span>
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

        {/* Category List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredCategories.map((cat) => {
              const isChecked = selectedIds.has(cat.id);
              const isAlreadyPresent = existingCatNames.has(cat.name.toLowerCase().trim());

              return (
                <div
                  key={cat.id}
                  onClick={() => toggleSelectCategory(cat.id)}
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
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                        <span>{cat.name}</span>
                        {isAlreadyPresent && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                            Already added
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Order #{cat.order}
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
            <span className="font-bold text-[#1283E6]">{selectedIds.size}</span> of {defaultCategories.length} categories
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
              <span>{isSubmitting ? 'Importing...' : `Import ${selectedIds.size} Categories`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
