import React, { useState } from 'react';
import { FileText, Download, X, Check, Loader2, Sparkles } from 'lucide-react';
import { Category, Draft, PdfExportOptions, Player, Team } from '../types';
import { generateBplDraftPdf } from '../lib/pdf';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: Draft;
  teams: Team[];
  players: Player[];
  categories: Category[];
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  draft,
  teams,
  players,
  categories,
}) => {
  const [options, setOptions] = useState<PdfExportOptions>({
    includeCover: true,
    includeTeamLogos: true,
    includePlayerPhotos: true,
    includeBadges: true,
    includeCategoryBreakdown: true,
    includeStatistics: true,
    includeSummaryTable: true,
    orientation: 'p',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsDone(false);

    try {
      const blob = await generateBplDraftPdf(
        draft,
        teams,
        players,
        categories,
        options,
        (msg) => setProgressMsg(msg)
      );

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BPL_Season2_Official_Rosters_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsDone(true);
      setProgressMsg('✓ PDF READY & DOWNLOADED');
      setTimeout(() => {
        setIsGenerating(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setProgressMsg('Error generating PDF. Please retry.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1283E6]" />
            <h3 className="font-extrabold text-base text-[#061A36]">
              Export Official BPL S-2 PDF
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Body */}
        <div className="p-6 space-y-5 text-xs">
          <p className="text-slate-500">
            Generate an official tournament publication document ready for print, sharing, and team franchise distribution.
          </p>

          {/* Checkboxes */}
          <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {[
              { id: 'includeCover', label: 'BPL Tournament Cover Page' },
              { id: 'includeStatistics', label: 'Draft Statistics & Overview' },
              { id: 'includeSummaryTable', label: 'Team Category Allocation Matrix' },
              { id: 'includeCategoryBreakdown', label: 'Category-wise Player Grouping' },
              { id: 'includeBadges', label: 'Player Specialization Badges' },
            ].map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2.5 cursor-pointer text-slate-700 font-medium"
              >
                <input
                  type="checkbox"
                  checked={Boolean(options[item.id as keyof PdfExportOptions])}
                  onChange={(e) =>
                    setOptions({ ...options, [item.id]: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-[#1283E6] focus:ring-[#1283E6] border-slate-300"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          {/* Page Orientation */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">Page Orientation</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOptions({ ...options, orientation: 'p' })}
                className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                  options.orientation === 'p'
                    ? 'border-[#1283E6] bg-blue-50 text-[#1283E6] ring-1 ring-[#1283E6]'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                A4 Portrait (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setOptions({ ...options, orientation: 'l' })}
                className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                  options.orientation === 'l'
                    ? 'border-[#1283E6] bg-blue-50 text-[#1283E6] ring-1 ring-[#1283E6]'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                A4 Landscape
              </button>
            </div>
          </div>

          {/* Progress Banner */}
          {isGenerating && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-[#0A5DB8] flex items-center gap-2.5 font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-[#1283E6]" />
              <span>{progressMsg}</span>
            </div>
          )}

          {isDone && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-bold">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{progressMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1283E6] hover:bg-[#0A5DB8] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
