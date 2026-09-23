import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Lock,
  Upload,
  RotateCcw,
  Sparkles,
  Layers,
  Crown,
  Sliders,
  Users,
  Check,
} from 'lucide-react';
import { Category, Player, Team } from '../types';
import { fileToDataUrl } from '../lib/imageUtils';

interface TeamsViewProps {
  teams: Team[];
  categories: Category[];
  players: Player[];
  activeDraftId: string;
  onSaveTeam: (team: Team) => Promise<void>;
  onBulkSaveTeams?: (teams: Team[]) => Promise<void>;
  onDeleteTeam: (teamId: string) => Promise<void>;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  teams,
  categories,
  players,
  activeDraftId,
  onSaveTeam,
  onBulkSaveTeams,
  onDeleteTeam,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Global Franchise Settings State: Default Squad Size & Default Category Quota Limit
  const [defaultSquadSize, setDefaultSquadSize] = useState<number>(() => {
    return teams.length > 0 && teams[0].maxPlayers ? teams[0].maxPlayers : 11;
  });
  const [defaultQuotaLimit, setDefaultQuotaLimit] = useState<number>(1);
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showSettingsCard, setShowSettingsCard] = useState(true);

  const squadPresets = [7, 10, 11, 12, 14, 15];

  // Batch update all franchise teams with selected default squad size & quota limit
  const handleApplyToAllTeams = async () => {
    if (teams.length === 0) return;
    try {
      setIsApplyingAll(true);
      const updatedTeams = teams.map((team) => {
        const newQuotas: Record<string, number> = {};
        categories.forEach((c) => {
          newQuotas[c.id] = defaultQuotaLimit;
        });
        const sumQuotas = Object.values(newQuotas).reduce((a, b) => a + (b || 0), 0);
        const maxPlayers = Math.max(defaultSquadSize, sumQuotas);
        return {
          ...team,
          maxPlayers,
          quotas: newQuotas,
          updatedAt: Date.now(),
        };
      });

      if (onBulkSaveTeams) {
        await onBulkSaveTeams(updatedTeams);
      } else {
        for (const t of updatedTeams) {
          await onSaveTeam(t);
        }
      }

      setSuccessToast(
        `Applied ${defaultSquadSize}-player squad & ${defaultQuotaLimit} quota per category to all ${teams.length} teams!`
      );
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Failed to apply default squad and quota to all teams:', err);
    } finally {
      setIsApplyingAll(false);
    }
  };

  const handleOpenAdd = () => {
    // Default quotas: 1 per category for all categories
    const defaultQuotas: Record<string, number> = {};
    categories.forEach((c) => {
      defaultQuotas[c.id] = defaultQuotaLimit; // 1
    });

    setEditingTeam({
      id: `team-${Date.now()}`,
      draftId: activeDraftId,
      name: '',
      shortName: '',
      logoUrl: '',
      primaryColor: '#1283E6',
      secondaryColor: '#E6F7FF',
      maxPlayers: defaultSquadSize, // 11
      quotas: defaultQuotas,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setUploadError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (team: Team) => {
    const quotas = { ...team.quotas };
    categories.forEach((c) => {
      // Default quota limit for all categories is 1
      if (quotas[c.id] === undefined) {
        quotas[c.id] = defaultQuotaLimit;
      }
    });

    setEditingTeam({
      ...team,
      maxPlayers: team.maxPlayers || defaultSquadSize,
      quotas,
    });
    setUploadError(null);
    setIsModalOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTeam) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      const dataUrl = await fileToDataUrl(file, 400, 400);
      setEditingTeam((prev) => (prev ? { ...prev, logoUrl: dataUrl } : null));
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload logo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Reset category quotas in editing team to 1 for all categories
  const handleSetModalAllQuotas = (quotaVal: number) => {
    if (!editingTeam) return;
    const standardQuotas: Record<string, number> = {};
    categories.forEach((c) => {
      standardQuotas[c.id] = quotaVal;
    });
    setEditingTeam({
      ...editingTeam,
      quotas: standardQuotas,
    });
  };

  const handleSetModalSquadSize = (size: number) => {
    if (!editingTeam) return;
    setEditingTeam({
      ...editingTeam,
      maxPlayers: size,
    });
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editingTeam.name.trim()) return;

    const sumQuotas = Object.values(editingTeam.quotas).reduce((a, b) => a + (b || 0), 0);
    const maxPlayers = Math.max(editingTeam.maxPlayers || defaultSquadSize, sumQuotas);

    await onSaveTeam({
      ...editingTeam,
      maxPlayers,
      shortName:
        editingTeam.shortName.trim() ||
        editingTeam.name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 4),
      updatedAt: Date.now(),
    });

    setIsModalOpen(false);
    setEditingTeam(null);
  };

  // Calculations for current overall tournament quotas
  const totalSquadSlots = teams.reduce((acc, t) => acc + (t.maxPlayers || 11), 0);
  const totalAssignedPlayers = players.filter((p) => p.assignedTeamId).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#061A36] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#16A34A]" />
            Franchise Teams ({teams.length})
          </h2>
          <p className="text-xs text-slate-500">
            Configure franchise teams, default squad sizes, and category quota limits (Default: 1 per category)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsCard((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              showSettingsCard
                ? 'bg-blue-50 text-[#0A5DB8] border-blue-200 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-4 h-4 text-[#1283E6]" />
            <span>Squad & Quota Settings</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Franchise Team
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Default Player Squads and Quota Limit Control Panel */}
      {showSettingsCard && (
        <div className="bg-gradient-to-br from-slate-900 via-[#0A244A] to-[#061A36] text-white rounded-2xl p-5 sm:p-6 border border-blue-900/40 shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1283E6]/20 border border-[#1283E6]/40 flex items-center justify-center shrink-0">
                <Sliders className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
                  <span>Default Player Squads & Quota Limit</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FF7A2E]/20 text-[#FF7A2E] border border-[#FF7A2E]/30 uppercase">
                    Tournament Rule
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Choose default squad roster capacity and category quota limits for all franchise teams.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleApplyToAllTeams}
                disabled={isApplyingAll || teams.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FF7A2E] hover:bg-[#e0661e] text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isApplyingAll ? 'Applying...' : 'Apply to All Franchise Teams'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* 1. Default Player Squad Size */}
            <div className="space-y-2.5 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Default Squad Size (Players per Team)
                </label>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] border border-emerald-500/30">
                  {defaultSquadSize} Players / Team
                </span>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {squadPresets.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setDefaultSquadSize(size)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      defaultSquadSize === size
                        ? 'bg-[#1283E6] text-white shadow-xs scale-105'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {size} {size === 11 ? '★ (Official BPL)' : size === 7 ? '(Mini)' : 'Players'}
                  </button>
                ))}
              </div>

              {/* Custom size input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-slate-400 text-[11px]">Custom Squad Limit:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={defaultSquadSize}
                  onChange={(e) => setDefaultSquadSize(Math.max(1, parseInt(e.target.value) || 11))}
                  className="w-20 px-2.5 py-1 text-center bg-slate-900/80 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-[#1283E6]"
                />
                <span className="text-[11px] text-slate-400">players</span>
              </div>
            </div>

            {/* 2. Default Quota Limit for Categories */}
            <div className="space-y-2.5 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Default Quota Limit for All Categories
                </label>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[11px] border border-amber-500/30">
                  {defaultQuotaLimit} per Category (Default Rule)
                </span>
              </div>

              {/* Quota preset options */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDefaultQuotaLimit(1)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                    defaultQuotaLimit === 1
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs scale-105'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>1 per Category (Default Rule)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDefaultQuotaLimit(2)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    defaultQuotaLimit === 2
                      ? 'bg-[#1283E6] text-white shadow-xs'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  2 per Category
                </button>
              </div>

              {/* Custom Quota input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-slate-400 text-[11px]">Custom Category Quota:</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={defaultQuotaLimit}
                  onChange={(e) => setDefaultQuotaLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 px-2.5 py-1 text-center bg-slate-900/80 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-[#1283E6]"
                />
                <span className="text-[11px] text-slate-400">
                  (e.g. 1 pick from each of {categories.length} categories = {categories.length * defaultQuotaLimit} quota slots)
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Math Summary */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                • Total Teams: <strong className="text-white">{teams.length}</strong>
              </span>
              <span>
                • Tournament Roster Demand: <strong className="text-white">{teams.length * defaultSquadSize} slots</strong>
              </span>
              <span>
                • Total Quotas per Team: <strong className="text-white">{categories.length * defaultQuotaLimit} category slots</strong>
                {defaultSquadSize > categories.length * defaultQuotaLimit && (
                  <span className="text-amber-300 ml-1">
                    (+{defaultSquadSize - categories.length * defaultQuotaLimit} Captain/Wildcard slot)
                  </span>
                )}
              </span>
            </div>
            <div className="text-slate-400">
              Drafted: <strong className="text-emerald-400">{totalAssignedPlayers}</strong> / {totalSquadSlots}
            </div>
          </div>
        </div>
      )}

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 space-y-2">
          <p className="text-sm font-semibold text-slate-600">No franchise teams registered yet.</p>
          <p className="text-xs text-slate-400">Add teams to configure squad quotas and draft players.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {teams.map((team) => {
            const teamPlayers = players.filter((p) => p.assignedTeamId === team.id);
            const maxCap = team.maxPlayers || defaultSquadSize;
            const isFull = teamPlayers.length >= maxCap;
            const progress = maxCap > 0 ? Math.round((teamPlayers.length / maxCap) * 100) : 0;

            return (
              <div
                key={team.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Team Header Accent Stripe */}
                <div
                  className="h-3 w-full"
                  style={{ backgroundColor: team.primaryColor || '#1283E6' }}
                />

                <div className="p-5 flex-1 space-y-4">
                  {/* Team Identity Card */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-white text-base shadow-sm shrink-0 border-2 overflow-hidden bg-slate-900"
                        style={{ borderColor: team.primaryColor || '#1283E6' }}
                      >
                        {team.logoUrl ? (
                          <img
                            src={team.logoUrl}
                            alt={team.name}
                            className="w-full h-full object-contain p-1"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span style={{ color: team.primaryColor || '#FFFFFF' }}>
                            {team.shortName || team.name.slice(0, 3).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-extrabold text-base text-[#061A36] leading-tight truncate">
                          {team.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-slate-500">
                            Code: {team.shortName}
                          </span>
                          <span className="text-[11px] font-extrabold px-2 py-0.2 rounded bg-slate-100 text-slate-700">
                            Squad Quota: {maxCap} Players
                          </span>
                          {team.captainName && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                              <Crown className="w-3 h-3 text-amber-500" />
                              Captain: {team.captainName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end">
                      {isFull ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          SQUAD FULL ({teamPlayers.length}/{maxCap})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1283E6] border border-blue-200">
                          {maxCap - teamPlayers.length} SLOTS OPEN
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Squad Target</span>
                      <span className="font-bold text-slate-800">
                        {teamPlayers.length} / {maxCap} Players ({progress}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: team.primaryColor || '#1283E6',
                        }}
                      />
                    </div>
                  </div>

                  {/* Category Quotas Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        Role Quotas Breakdown
                      </span>
                      <span className="text-slate-400 font-normal">Target / Filled</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                      {categories.map((cat) => {
                        // Default quota is 1 per category
                        const targetQuota = team.quotas[cat.id] ?? defaultQuotaLimit;
                        const draftedInCat = teamPlayers.filter(
                          (p) => p.primaryCategoryId === cat.id || p.assignedCategoryId === cat.id
                        ).length;
                        const isCatLocked = draftedInCat >= targetQuota && targetQuota > 0;

                        return (
                          <div
                            key={cat.id}
                            className={`p-2 rounded-xl border text-[11px] flex items-center justify-between transition-colors ${
                              isCatLocked
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="truncate pr-1">{cat.name}</span>
                            <div className="flex items-center gap-1 shrink-0 font-bold">
                              <span>
                                {draftedInCat}/{targetQuota}
                              </span>
                              {isCatLocked && <Lock className="w-3 h-3 text-emerald-600" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: team.primaryColor || '#1283E6' }}
                    />
                    <span>{team.active ? 'Active Franchise' : 'Inactive'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(team)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Edit team & quotas"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit & Logo</span>
                    </button>
                    <button
                      onClick={() => onDeleteTeam(team.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete team"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Add Team Modal */}
      {isModalOpen && editingTeam && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <form onSubmit={handleSaveModal}>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-base font-bold text-[#061A36]">
                  {teams.some((t) => t.id === editingTeam.id)
                    ? 'Edit Franchise Team & Logo'
                    : 'Add Franchise Team'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* Team Logo Upload */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3.5">
                  <div
                    className="w-16 h-16 rounded-xl bg-slate-900 border-2 flex items-center justify-center overflow-hidden shrink-0 shadow-sm"
                    style={{ borderColor: editingTeam.primaryColor || '#1283E6' }}
                  >
                    {editingTeam.logoUrl ? (
                      <img
                        src={editingTeam.logoUrl}
                        alt="Team Logo Preview"
                        className="w-full h-full object-contain p-1"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="font-extrabold text-white text-base">
                        {editingTeam.shortName || 'LOGO'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="block font-bold text-slate-800">
                      Team Franchise Logo
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1283E6] hover:bg-[#0A5DB8] text-white font-bold rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploading ? 'Uploading...' : 'Upload Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={isUploading}
                        />
                      </label>

                      {editingTeam.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditingTeam({ ...editingTeam, logoUrl: '' })}
                          className="px-2 py-1.5 text-slate-500 hover:text-red-600 text-[11px] cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {uploadError && <p className="text-[11px] text-red-600">{uploadError}</p>}
                  </div>
                </div>

                {/* Team Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Team Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTeam.name}
                    onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                    placeholder="e.g. Brothers Warriors"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Short Code */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Short Code</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={editingTeam.shortName}
                      onChange={(e) =>
                        setEditingTeam({ ...editingTeam, shortName: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g. BW"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                    />
                  </div>

                  {/* Primary Color */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Theme Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingTeam.primaryColor}
                        onChange={(e) =>
                          setEditingTeam({ ...editingTeam, primaryColor: e.target.value })
                        }
                        className="w-9 h-8 rounded border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingTeam.primaryColor}
                        onChange={(e) =>
                          setEditingTeam({ ...editingTeam, primaryColor: e.target.value })
                        }
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Maximum Squad Quota & Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">
                      Total Squad Quota (Default: {defaultSquadSize})
                    </label>
                    <span className="text-[11px] font-bold text-slate-500">
                      Target: {editingTeam.maxPlayers || defaultSquadSize} Players
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {squadPresets.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSetModalSquadSize(size)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          editingTeam.maxPlayers === size
                            ? 'bg-[#1283E6] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {size} {size === 11 ? '(Standard)' : ''}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editingTeam.maxPlayers}
                    onChange={(e) =>
                      setEditingTeam({
                        ...editingTeam,
                        maxPlayers: Math.max(1, parseInt(e.target.value) || defaultSquadSize),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                  />
                  <p className="text-[11px] text-slate-500">
                    Standard BPL squad size is 11 players (10 category picks + 1 team captain).
                  </p>
                </div>

                {/* Team Captain Selector */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500" />
                      Team Captain
                    </label>
                    {editingTeam.captainPlayerId && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingTeam({
                            ...editingTeam,
                            captainPlayerId: undefined,
                            captainName: undefined,
                          })
                        }
                        className="text-[11px] text-red-500 hover:underline cursor-pointer"
                      >
                        Clear Captain
                      </button>
                    )}
                  </div>
                  <select
                    value={editingTeam.captainPlayerId || ''}
                    onChange={(e) => {
                      const pId = e.target.value;
                      if (!pId) {
                        setEditingTeam({
                          ...editingTeam,
                          captainPlayerId: undefined,
                          captainName: undefined,
                        });
                      } else {
                        const found = players.find((p) => p.id === pId);
                        setEditingTeam({
                          ...editingTeam,
                          captainPlayerId: pId,
                          captainName: found ? found.fullName : '',
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6] font-medium text-slate-800"
                  >
                    <option value="">-- No Captain Selected --</option>
                    {players.map((p) => {
                      const isAssignedToThis = p.assignedTeamId === editingTeam.id;
                      const cat = categories.find((c) => c.id === p.primaryCategoryId);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.fullName} {isAssignedToThis ? '★ (Drafted in this team)' : ''} (
                          {cat ? cat.name : p.playerType})
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select any player to lead this franchise team as official Captain.
                  </p>
                </div>

                {/* Role Quotas Configuration: Default 1 per category */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div>
                      <label className="block font-bold text-slate-800">
                        Role Quotas (Target per Category)
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Default: 1 per category ({categories.length} categories)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetModalAllQuotas(1)}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                        title="Set all category quotas to 1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Set All to 1
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetModalAllQuotas(2)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[10px] cursor-pointer"
                        title="Set all category quotas to 2"
                      >
                        Set All to 2
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetModalAllQuotas(0)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded text-[10px] cursor-pointer"
                        title="Clear all quotas to 0"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <span className="font-medium text-slate-700 truncate pr-2">{cat.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-slate-400 text-[11px]">Quota:</label>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={editingTeam.quotas[cat.id] ?? 1}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setEditingTeam({
                                ...editingTeam,
                                quotas: {
                                  ...editingTeam.quotas,
                                  [cat.id]: val,
                                },
                              });
                            }}
                            className="w-16 px-2 py-1 text-center bg-white border border-slate-300 rounded font-semibold focus:outline-none focus:border-[#1283E6]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quota balance check */}
                  {(() => {
                    const quotaSum = Object.values(editingTeam.quotas).reduce((a, b) => a + (b || 0), 0);
                    const squadCap = editingTeam.maxPlayers || defaultSquadSize;
                    const diff = squadCap - quotaSum;
                    return (
                      <div className="p-2 rounded-lg bg-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                        <span>
                          Role Quotas Total: <strong className="text-slate-800">{quotaSum}</strong> / Squad Quota:{' '}
                          <strong className="text-slate-800">{squadCap}</strong>
                        </span>
                        <span className={diff >= 0 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                          {diff === 0 && '✓ Perfectly Balanced'}
                          {diff === 1 && '✓ 1 Slot for Captain/Wildcard'}
                          {diff > 1 && `${diff} Open Slots`}
                          {diff < 0 && `⚠️ Quotas exceed squad by ${Math.abs(diff)}`}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Save Franchise Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
