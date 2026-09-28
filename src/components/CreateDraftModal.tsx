import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Trophy,
  Users,
  Shield,
  Layers,
  CheckCircle2,
  RotateCcw,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { fileToDataUrl, DEFAULT_BPL_LOGO } from '../lib/imageUtils';
import { createSampleDraftData } from '../lib/sampleData';

interface CreateDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperadmin?: boolean;
  onCreateDraft: (params: {
    name: string;
    season: string;
    logoUrl: string;
    slogan?: string;
    subSlogan?: string;
    importPlayers: boolean;
    importTeams: boolean;
    importCategories: boolean;
    selectedPlayerIds?: string[];
    selectedTeamIds?: string[];
    selectedCategoryIds?: string[];
  }) => Promise<void>;
}

export const CreateDraftModal: React.FC<CreateDraftModalProps> = ({
  isOpen,
  onClose,
  isSuperadmin = false,
  onCreateDraft,
}) => {
  const [name, setName] = useState('Brothers Premier League (BPL)');
  const [season, setSeason] = useState('Season-3');
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_BPL_LOGO);
  const [slogan, setSlogan] = useState("More Than a League It's a Family");
  const [subSlogan, setSubSlogan] = useState('Fair Play • Transparent • Stronger Teams');

  // Official Sample Data
  const sample = useMemo(() => createSampleDraftData(), []);
  const officialPlayers = sample.players;
  const officialTeams = sample.teams;
  const officialCategories = sample.categories;

  // Import Mode: 'all' | 'custom' | 'none'
  const [playerMode, setPlayerMode] = useState<'all' | 'custom' | 'none'>('all');
  const [teamMode, setTeamMode] = useState<'all' | 'custom' | 'none'>('all');
  const [categoryMode, setCategoryMode] = useState<'all' | 'custom' | 'none'>('all');

  // Custom Selected IDs
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(
    () => new Set(officialPlayers.map((p) => p.id))
  );
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(
    () => new Set(officialTeams.map((t) => t.id))
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    () => new Set(officialCategories.map((c) => c.id))
  );

  // Search filter for player picker
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerCatFilter, setPlayerCatFilter] = useState('all');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered Players in picker
  const filteredOfficialPlayers = useMemo(() => {
    return officialPlayers.filter((p) => {
      const matchesSearch =
        p.fullName.toLowerCase().includes(playerSearch.toLowerCase()) ||
        (p.jerseyNumber && p.jerseyNumber.includes(playerSearch));
      const matchesCat =
        playerCatFilter === 'all' || p.primaryCategoryId === playerCatFilter;
      return matchesSearch && matchesCat;
    });
  }, [officialPlayers, playerSearch, playerCatFilter]);

  if (!isOpen) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      const dataUrl = await fileToDataUrl(file, 512, 512);
      setLogoUrl(dataUrl);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload logo image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onCreateDraft({
        name: name.trim(),
        season: season.trim() || 'Season-3',
        logoUrl: logoUrl || DEFAULT_BPL_LOGO,
        slogan: slogan.trim(),
        subSlogan: subSlogan.trim(),
        importPlayers: playerMode !== 'none',
        importTeams: teamMode !== 'none',
        importCategories: categoryMode !== 'none',
        selectedPlayerIds:
          playerMode === 'custom' ? Array.from(selectedPlayerIds) : undefined,
        selectedTeamIds:
          teamMode === 'custom' ? Array.from(selectedTeamIds) : undefined,
        selectedCategoryIds:
          categoryMode === 'custom' ? Array.from(selectedCategoryIds) : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create draft:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#061A36] via-[#0A244A] to-[#0A5DB8] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">
                Create New Tournament Draft
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Customize tournament branding and configure which players, teams, and categories to import
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* User Workspace Info Banner */}
          {!isSuperadmin ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 shadow-2xs">
              <Shield className="w-4 h-4 text-[#1283E6] mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                <span className="font-bold text-[#061A36]">Personal User Workspace:</span> This draft will be created and saved privately in your personal browser session. It will <strong className="text-[#0A5DB8]">never modify the official BPL Season-2 website</strong> for any other users.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
              <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                <span className="font-bold text-amber-950">Superadmin Mode:</span> You are creating a tournament draft as Superadmin Arif Iquebal.
              </div>
            </div>
          )}

          {/* Tournament Logo Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tournament Logo <span className="text-[#FF7A2E]">*</span>
            </label>

            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-white border-2 border-slate-300 overflow-hidden p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src={logoUrl || DEFAULT_BPL_LOGO}
                  alt="Tournament Logo"
                  className="w-full h-full object-contain filter drop-shadow-xs"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1283E6] hover:bg-[#0A6EC9] text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setLogoUrl(DEFAULT_BPL_LOGO)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Recommended: Square PNG/JPG (512×512px). Updates header and lottery arena for this tournament.
                </p>
                {uploadError && <p className="text-xs text-rose-600 font-bold">{uploadError}</p>}
              </div>
            </div>
          </div>

          {/* Tournament Name & Season */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tournament Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Brothers Premier League"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1283E6] bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Season / Edition <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="e.g. Season-3 (2026)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1283E6] bg-slate-50/50"
              />
            </div>
          </div>

          {/* Slogans */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tournament Slogan
              </label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="e.g. More Than a League It's a Family"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1283E6] bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sub-Slogan / Fair Play Tag
              </label>
              <input
                type="text"
                value={subSlogan}
                onChange={(e) => setSubSlogan(e.target.value)}
                placeholder="e.g. Fair Play • Transparent • Stronger Teams"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1283E6] bg-slate-50/50"
              />
            </div>
          </div>

          {/* GRANULAR IMPORT SELECTORS */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center justify-between">
              <span>Import Data & Squad Configuration</span>
              <span className="text-[11px] font-normal text-slate-500">Choose all, select specific, or start blank</span>
            </h3>

            {/* 1. ROLE CATEGORIES SECTION */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                  <Layers className="w-4 h-4 text-[#FF7A2E]" />
                  <span>1. Role Categories</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setCategoryMode('all')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      categoryMode === 'all'
                        ? 'bg-white text-[#1283E6] font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Import All (10)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryMode('custom')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      categoryMode === 'custom'
                        ? 'bg-white text-[#1283E6] font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Select Specific ({selectedCategoryIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryMode('none')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      categoryMode === 'none'
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Create New
                  </button>
                </div>
              </div>

              {categoryMode === 'custom' && (
                <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-500 font-medium">
                      Select which categories to import:
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryIds(new Set(officialCategories.map((c) => c.id)))}
                        className="px-2 py-0.5 text-[11px] font-bold text-[#1283E6] hover:bg-blue-50 rounded"
                      >
                        Select All (10)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryIds(new Set())}
                        className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 rounded"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                    {officialCategories.map((cat) => {
                      const isChecked = selectedCategoryIds.has(cat.id);
                      return (
                        <label
                          key={cat.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-50/70 border-blue-300 font-bold text-blue-900'
                              : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedCategoryIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(cat.id)) next.delete(cat.id);
                                else next.add(cat.id);
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 rounded text-[#1283E6]"
                          />
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="truncate">{cat.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {categoryMode === 'none' && (
                <p className="text-[11px] text-slate-500 italic">
                  Draft will start with 0 categories. You can create custom categories in the Categories tab.
                </p>
              )}
            </div>

            {/* 2. FRANCHISE TEAMS SECTION */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>2. Franchise Teams</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setTeamMode('all')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      teamMode === 'all'
                        ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Import All (6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamMode('custom')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      teamMode === 'custom'
                        ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Select Specific ({selectedTeamIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamMode('none')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      teamMode === 'none'
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Create New
                  </button>
                </div>
              </div>

              {teamMode === 'custom' && (
                <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-500 font-medium">
                      Select which franchise teams to import:
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedTeamIds(new Set(officialTeams.map((t) => t.id)))}
                        className="px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded"
                      >
                        Select All (6)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTeamIds(new Set())}
                        className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 rounded"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                    {officialTeams.map((team) => {
                      const isChecked = selectedTeamIds.has(team.id);
                      return (
                        <label
                          key={team.id}
                          className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-50/70 border-emerald-300 font-bold text-emerald-950'
                              : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedTeamIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(team.id)) next.delete(team.id);
                                else next.add(team.id);
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 rounded text-emerald-600"
                          />
                          <div className="w-6 h-6 rounded bg-slate-100 p-0.5 flex items-center justify-center shrink-0">
                            {team.logoUrl ? (
                              <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                            ) : (
                              <Shield className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                          <span className="truncate">{team.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {teamMode === 'none' && (
                <p className="text-[11px] text-slate-500 italic">
                  Draft will start with 0 teams. You can create custom franchise teams in the Teams tab.
                </p>
              )}
            </div>

            {/* 3. REGISTERED PLAYERS SECTION */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                  <Users className="w-4 h-4 text-[#1283E6]" />
                  <span>3. Registered Players</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setPlayerMode('all')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      playerMode === 'all'
                        ? 'bg-white text-[#1283E6] font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Import All (60)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerMode('custom')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      playerMode === 'custom'
                        ? 'bg-white text-[#1283E6] font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Select Specific ({selectedPlayerIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerMode('none')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      playerMode === 'none'
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Create New
                  </button>
                </div>
              </div>

              {playerMode === 'custom' && (
                <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search player name or jersey..."
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#1283E6]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPlayerIds(new Set(officialPlayers.map((p) => p.id)))}
                        className="px-2 py-1 text-[11px] font-bold text-[#1283E6] hover:bg-blue-50 rounded"
                      >
                        Select All (60)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPlayerIds(new Set())}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 rounded"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 bg-white rounded-lg border border-slate-200">
                    {filteredOfficialPlayers.map((player) => {
                      const isChecked = selectedPlayerIds.has(player.id);
                      return (
                        <label
                          key={player.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-50/70 border-blue-300 font-bold text-blue-950'
                              : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedPlayerIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(player.id)) next.delete(player.id);
                                else next.add(player.id);
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 rounded text-[#1283E6]"
                          />
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                            {player.photoUrl ? (
                              <img src={player.photoUrl} alt={player.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold flex items-center justify-center h-full">
                                {player.fullName.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs">{player.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-normal">#{player.jerseyNumber}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {playerMode === 'none' && (
                <p className="text-[11px] text-slate-500 italic">
                  Draft will start with 0 players. You can add custom players individually or import players later at any time in the Players tab.
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1283E6] to-[#0A5DB8] hover:from-[#0f75cf] hover:to-[#084b96] text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Draft...' : 'Create & Apply Draft'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
