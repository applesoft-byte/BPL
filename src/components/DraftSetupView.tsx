import React from 'react';
import {
  Settings2,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Shield,
  Users,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Category, CategoryDraftMode, Draft, Player, Team } from '../types';

interface DraftSetupViewProps {
  draft: Draft;
  teams: Team[];
  players: Player[];
  categories: Category[];
  onUpdateDraftSettings: (settings: Draft['settings'], currentCatId?: string) => Promise<void>;
  onStartDraft: () => void;
}

export const DraftSetupView: React.FC<DraftSetupViewProps> = ({
  draft,
  teams,
  players,
  categories,
  onUpdateDraftSettings,
  onStartDraft,
}) => {
  // Validation calculations
  const totalRequiredSlots = teams.reduce((acc, t) => {
    const quotaSum = Object.values(t.quotas).reduce((sum, q) => sum + (q || 0), 0);
    return acc + Math.max(t.maxPlayers, quotaSum);
  }, 0);

  const availablePlayers = players.filter((p) => p.status !== 'inactive').length;
  const hasTeams = teams.length >= 1;
  const hasCategories = categories.length >= 1;
  const hasPlayers = players.length >= 1;
  const hasEnoughPlayers = availablePlayers >= totalRequiredSlots;

  // Category specific check
  const categoryIssues: string[] = [];
  categories.forEach((cat) => {
    const requiredForCat = teams.reduce((acc, t) => acc + (t.quotas[cat.id] || 0), 0);
    const availableForCat = players.filter(
      (p) => p.primaryCategoryId === cat.id && p.status !== 'inactive'
    ).length;
    if (availableForCat < requiredForCat) {
      categoryIssues.push(
        `Category "${cat.name}": requires ${requiredForCat} players, but only ${availableForCat} available.`
      );
    }
  });

  const isSetupValid =
    hasTeams && hasCategories && hasPlayers && hasEnoughPlayers && categoryIssues.length === 0;

  const handleModeChange = (mode: CategoryDraftMode) => {
    onUpdateDraftSettings(
      {
        ...draft.settings,
        categoryMode: mode,
      },
      categories[0]?.id
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-[#061A36] flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-[#1283E6]" />
          Draft Configuration & Pre-Flight Validation
        </h2>
        <p className="text-xs text-slate-500">
          Verify franchise quotas, category rules, and pool sufficiency before entering the live draft arena
        </p>
      </div>

      {/* Pre-Flight Diagnostics Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
        <h3 className="font-bold text-sm text-[#061A36] flex items-center justify-between">
          <span>Pre-Draft System Checks</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
              isSetupValid
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {isSetupValid ? '✓ ALL CHECKS PASSED' : '⚠️ RESOLUTION REQUIRED'}
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Teams Check */}
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              hasTeams
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            {hasTeams ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <div>
              <div className="font-bold">Franchise Teams</div>
              <div className="text-[11px] text-slate-500">{teams.length} teams configured</div>
            </div>
          </div>

          {/* Categories Check */}
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              hasCategories
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            {hasCategories ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <div>
              <div className="font-bold">Player Categories</div>
              <div className="text-[11px] text-slate-500">{categories.length} categories active</div>
            </div>
          </div>

          {/* Total Players Pool Check */}
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              hasEnoughPlayers
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            {hasEnoughPlayers ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <div>
              <div className="font-bold">Pool Capacity</div>
              <div className="text-[11px] text-slate-500">
                {availablePlayers} avail. / {totalRequiredSlots} req.
              </div>
            </div>
          </div>

          {/* Category Quota Distribution */}
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              categoryIssues.length === 0
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            {categoryIssues.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <div>
              <div className="font-bold">Category Quotas</div>
              <div className="text-[11px] text-slate-500">
                {categoryIssues.length === 0 ? 'All quotas satisfied' : `${categoryIssues.length} shortages`}
              </div>
            </div>
          </div>
        </div>

        {/* Warning list if any */}
        {categoryIssues.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Category Player Pool Shortages:
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {categoryIssues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
            <p className="text-[11px] text-red-600 pt-1">
              Add more players in those categories or adjust franchise team category quotas in the Teams tab.
            </p>
          </div>
        )}
      </div>

      {/* Category Draft Mode Selector (Section 19) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-[#061A36]">Category Sequence Mode</h3>
        <p className="text-xs text-slate-500">
          Determine how the draft engine selects eligible players during wheel spins
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Mode 1: Category by category */}
          <div
            onClick={() => handleModeChange('category_by_category')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              draft.settings.categoryMode === 'category_by_category'
                ? 'border-[#1283E6] bg-blue-50/40 ring-2 ring-[#1283E6]/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-sm text-[#061A36] mb-1">
              1. Category by Category (Default)
            </div>
            <p className="text-xs text-slate-600">
              Drafts one category at a time in sequence (e.g. all Top Order Batters, then Middle Order, etc.) until each category is filled.
            </p>
          </div>

          {/* Mode 2: All mixed */}
          <div
            onClick={() => handleModeChange('all_mixed')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              draft.settings.categoryMode === 'all_mixed'
                ? 'border-[#1283E6] bg-blue-50/40 ring-2 ring-[#1283E6]/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-sm text-[#061A36] mb-1">
              2. All Categories Mixed
            </div>
            <p className="text-xs text-slate-600">
              Any undrafted player can be selected on any spin, provided at least one team still has an open quota for that category.
            </p>
          </div>

          {/* Mode 3: Manual selection */}
          <div
            onClick={() => handleModeChange('manual')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              draft.settings.categoryMode === 'manual'
                ? 'border-[#1283E6] bg-blue-50/40 ring-2 ring-[#1283E6]/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-sm text-[#061A36] mb-1">
              3. Manual Category Control
            </div>
            <p className="text-xs text-slate-600">
              The organizer freely switches the active category at any time directly in the Live Draft Arena.
            </p>
          </div>
        </div>
      </div>

      {/* Start Draft Action */}
      <div className="flex items-center justify-between bg-slate-50 p-5 rounded-2xl border border-slate-200">
        <div>
          <h4 className="font-bold text-sm text-[#061A36]">Ready to launch Live Draft?</h4>
          <p className="text-xs text-slate-500">
            {isSetupValid
              ? 'All pre-flight conditions are satisfied. You can now launch the lottery wheel arena.'
              : 'Please resolve any validation errors above before proceeding.'}
          </p>
        </div>

        <button
          onClick={onStartDraft}
          disabled={!isSetupValid}
          className="flex items-center gap-2 px-6 py-3 bg-[#FF7A2E] hover:bg-[#e0661e] disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:cursor-not-allowed"
        >
          <PlayCircle className="w-5 h-5" />
          <span>PROCEED TO LIVE DRAFT ARENA</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
