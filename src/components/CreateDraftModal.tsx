import React, { useState } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Trophy,
  Users,
  Shield,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { Draft } from '../types';
import { fileToDataUrl, DEFAULT_BPL_LOGO } from '../lib/imageUtils';

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
  }) => Promise<void>;
}

export const CreateDraftModal: React.FC<CreateDraftModalProps> = ({
  isOpen,
  onClose,
  isSuperadmin = false,
  onCreateDraft,
}) => {
  const [name, setName] = useState('Brothers Premier League (BPL)');
  const [season, setSeason] = useState('Season-2');
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_BPL_LOGO);
  const [slogan, setSlogan] = useState("More Than a League It's a Family");
  const [subSlogan, setSubSlogan] = useState('Fair Play • Transparent • Stronger Teams');
  
  const [importPlayers, setImportPlayers] = useState(true);
  const [importTeams, setImportTeams] = useState(true);
  const [importCategories, setImportCategories] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        season: season.trim() || 'Season-2',
        logoUrl: logoUrl || DEFAULT_BPL_LOGO,
        slogan: slogan.trim(),
        subSlogan: subSlogan.trim(),
        importPlayers,
        importTeams,
        importCategories,
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
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
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
                Set tournament branding, logo, and initial roster setup
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* User Workspace Info Banner */}
          {!isSuperadmin ? (
            <div className="p-3 bg-blue-50/90 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 shadow-2xs">
              <Shield className="w-4 h-4 text-[#1283E6] mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                <span className="font-bold text-[#061A36]">Personal User Workspace:</span> This draft will be created and saved privately in your personal browser session. It will only be visible to you and will <span className="font-bold text-blue-800">never modify the official BPL Season-2 website</span> for any other users.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
              <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                <span className="font-bold text-amber-950">Superadmin Cloud League Mode:</span> You are logged in as Superadmin Arif Iquebal. This draft tournament will be synced to the global Firebase Cloud and published to the entire website.
              </div>
            </div>
          )}

          {/* Tournament Logo Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tournament Logo <span className="text-[#FF7A2E]">*</span>
            </label>

            <div className="flex items-center gap-4">
              {/* Logo Preview */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-slate-300 overflow-hidden p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                <img
                  src={logoUrl || DEFAULT_BPL_LOGO}
                  alt="Tournament Logo"
                  className="w-full h-full object-contain filter drop-shadow-xs"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1283E6] hover:bg-[#0A6EC9] text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Upload New Logo'}</span>
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                    title="Reset to official BPL crest"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  Recommended: Square PNG, SVG, or JPG (512×512px). Will automatically update website header, sidebar, and preloading screen.
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1283E6] focus:border-transparent bg-slate-50/50"
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
                placeholder="e.g. Season-2 (2026)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1283E6] focus:border-transparent bg-slate-50/50"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1283E6] bg-slate-50/50"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1283E6] bg-slate-50/50"
              />
            </div>
          </div>

          {/* Initial Setup Checkboxes */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">
              Starting Data & Player Configuration
            </h3>

            {/* Import Default Players */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={importPlayers}
                onChange={(e) => setImportPlayers(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-[#1283E6] focus:ring-[#1283E6]"
              />
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Users className="w-3.5 h-3.5 text-[#1283E6]" />
                  <span>Import 60 Registered Cricket Players (Recommended)</span>
                </div>
                <p className="text-slate-500 mt-0.5 text-[11px]">
                  Loads the official 60-player registry with player portrait photos, batting/bowling styles, and jersey numbers. (You can also import players later at any time).
                </p>
              </div>
            </label>

            {/* Include 6 Franchise Teams */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={importTeams}
                onChange={(e) => setImportTeams(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-[#1283E6] focus:ring-[#1283E6]"
              />
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Include 6 Franchise Teams</span>
                </div>
                <p className="text-slate-500 mt-0.5 text-[11px]">
                  Prime, Warriors, ABD Sports, Fearless, Mighty, and Amra Amroi with team logos, colors, and appointed captains.
                </p>
              </div>
            </label>

            {/* Include 10 Categories */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={importCategories}
                onChange={(e) => setImportCategories(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-[#1283E6] focus:ring-[#1283E6]"
              />
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Layers className="w-3.5 h-3.5 text-[#FF7A2E]" />
                  <span>Include 10 Official Role Categories</span>
                </div>
                <p className="text-slate-500 mt-0.5 text-[11px]">
                  Standard role categories (Wicket Keeper, Top Order Batter, All-Rounder, Fast Bowler, etc.) with pre-configured squad draft limits.
                </p>
              </div>
            </label>
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
