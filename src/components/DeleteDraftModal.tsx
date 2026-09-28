import React from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { Draft } from '../types';

interface DeleteDraftModalProps {
  isOpen: boolean;
  draft: Draft | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirmDelete: (draftId: string) => Promise<void>;
}

export const DeleteDraftModal: React.FC<DeleteDraftModalProps> = ({
  isOpen,
  draft,
  isDeleting,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !draft) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-900 via-rose-800 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-rose-200">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase">Delete Tournament Draft</h3>
              <p className="text-[11px] text-rose-200 font-medium">Permanent removal confirmation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-950">Are you sure you want to delete this tournament?</p>
              <p className="text-rose-800 leading-relaxed">
                This will permanently delete <strong className="font-bold text-rose-950">"{draft.name}" ({draft.season})</strong> and completely erase all associated franchise teams, player rosters, and draft picks.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Tournament Name:</span>
              <span className="font-bold text-slate-900">{draft.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Season Edition:</span>
              <span className="font-bold text-slate-900">{draft.season}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Status:</span>
              <span className="font-bold uppercase text-slate-800">{draft.status}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirmDelete(draft.id)}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Draft'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
