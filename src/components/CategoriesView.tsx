import React, { useState } from 'react';
import { Layers, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { Category } from '../types';

interface CategoriesViewProps {
  categories: Category[];
  activeDraftId: string;
  onSaveCategory: (category: Category) => Promise<void>;
  onBulkSaveCategories: (categories: Category[]) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  activeDraftId,
  onSaveCategory,
  onBulkSaveCategories,
  onDeleteCategory,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleOpenAdd = () => {
    setEditingCategory({
      id: `cat-${Date.now()}`,
      draftId: activeDraftId,
      name: '',
      color: '#1283E6',
      iconName: 'Zap',
      order: categories.length + 1,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory({ ...cat });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    await onSaveCategory({
      ...editingCategory,
      updatedAt: Date.now(),
    });
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    const reordered = [...categories];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    // Update orders
    const updated = reordered.map((cat, idx) => ({
      ...cat,
      order: idx + 1,
      updatedAt: Date.now(),
    }));

    await onBulkSaveCategories(updated);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#061A36] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FF7A2E]" />
            Cricket Player Categories ({categories.length})
          </h2>
          <p className="text-xs text-slate-500">
            Define dynamic categories, draft sequence order, and visual accent colors
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 grid grid-cols-12 gap-3">
          <div className="col-span-1">Order</div>
          <div className="col-span-5">Category Name</div>
          <div className="col-span-3">Accent Color</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-100">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className="p-4 grid grid-cols-12 gap-3 items-center text-xs hover:bg-slate-50 transition-colors"
            >
              {/* Order buttons */}
              <div className="col-span-1 flex items-center gap-1 font-bold text-slate-600">
                <span>{cat.order}</span>
                <div className="flex flex-col">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, 'up')}
                    className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    disabled={idx === categories.length - 1}
                    onClick={() => handleMove(idx, 'down')}
                    className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="col-span-5 flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="font-bold text-slate-800 text-sm">{cat.name}</span>
              </div>

              {/* Color swatch */}
              <div className="col-span-3 flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-md border border-slate-300 shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="font-mono text-slate-500 text-[11px]">{cat.color}</span>
              </div>

              {/* Status */}
              <div className="col-span-1 text-center">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-2 flex items-center justify-end gap-1">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg"
                  title="Edit category"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteCategory(cat.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit/Create Category Modal */}
      {isModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200">
            <form onSubmit={handleSaveModal}>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-base font-bold text-[#061A36]">
                  {categories.some((c) => c.id === editingCategory.id) ? 'Edit Category' : 'New Category'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCategory.name}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, name: e.target.value })
                    }
                    placeholder="e.g. Top Order Batter"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingCategory.color}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, color: e.target.value })
                      }
                      className="w-9 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingCategory.color}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, color: e.target.value })
                      }
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
