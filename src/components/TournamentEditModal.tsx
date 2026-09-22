import React, { useState } from 'react';
import {
  X,
  Upload,
  Calendar,
  User,
  Shield,
  Sparkles,
  RotateCcw,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { Draft } from '../types';
import { fileToDataUrl, DEFAULT_BPL_LOGO } from '../lib/imageUtils';

interface TournamentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: Draft;
  onSaveDraft: (updatedDraft: Draft) => Promise<void>;
}

export const TournamentEditModal: React.FC<TournamentEditModalProps> = ({
  isOpen,
  onClose,
  draft,
  onSaveDraft,
}) => {
  const [formData, setFormData] = useState({
    name: draft.name || 'Brothers Premier League (BPL)',
    season: draft.season || 'Season-2',
    draftDate: draft.draftDate || '25 Sep 2026',
    organizerName: draft.organizerName || 'Arif Iquebal',
    organizerRole: draft.organizerRole || 'Organizer',
    slogan: draft.slogan || "More Than a League It's a Family",
    subSlogan: draft.subSlogan || 'Fair Play • Transparent • Stronger Teams',
    tagline: draft.tagline || 'Play Together Win Together',
    defaultPlayerQuota: draft.defaultPlayerQuota || 11,
    logoUrl: draft.logoUrl || DEFAULT_BPL_LOGO,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      const dataUrl = await fileToDataUrl(file, 512, 512);
      setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload logo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetDefaultLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: DEFAULT_BPL_LOGO }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDraft: Draft = {
      ...draft,
      name: formData.name.trim() || 'Brothers Premier League (BPL)',
      season: formData.season.trim() || 'Season-2',
      draftDate: formData.draftDate.trim() || '25 Sep 2026',
      organizerName: formData.organizerName.trim() || 'Arif Iquebal',
      organizerRole: formData.organizerRole.trim() || 'Organizer',
      slogan: formData.slogan.trim() || "More Than a League It's a Family",
      subSlogan: formData.subSlogan.trim() || 'Fair Play • Transparent • Stronger Teams',
      tagline: formData.tagline.trim() || 'Play Together Win Together',
      defaultPlayerQuota: Number(formData.defaultPlayerQuota) || 11,
      logoUrl: formData.logoUrl,
      updatedAt: Date.now(),
    };

    await onSaveDraft(updatedDraft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-[#061A36] to-[#0A244A] text-white rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#FF7A2E]" />
              <div>
                <h3 className="text-base font-bold">Customize Tournament & League</h3>
                <p className="text-xs text-slate-300">
                  Update league branding, logo, dates, slogans, and quotas
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 text-xs">
            {/* League Logo Upload Preview */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="block font-bold text-slate-800 text-xs">
                Official League Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#061A36] border-2 border-[#1283E6] flex items-center justify-center p-1.5 overflow-hidden shadow-md shrink-0">
                  <img
                    src={formData.logoUrl}
                    alt="League Logo Preview"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <p className="text-[11px] text-slate-500">
                    Upload your league logo (PNG, JPG, SVG). It will automatically update in the
                    sidebar, lottery wheel, and headers.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
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

                    <button
                      type="button"
                      onClick={handleResetDefaultLogo}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
                      title="Reset to 3D Golden BPL Crest Logo"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Default Crest</span>
                    </button>
                  </div>
                  {uploadError && <p className="text-[11px] text-red-600 font-medium">{uploadError}</p>}
                </div>
              </div>
            </div>

            {/* League Name & Season */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  League Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Brothers Premier League (BPL)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Season Edition <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  placeholder="e.g. Season-2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                />
              </div>
            </div>

            {/* Draft Date & Default Team Quota */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Draft Date
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.draftDate}
                    onChange={(e) => setFormData({ ...formData, draftDate: e.target.value })}
                    placeholder="e.g. 25 Sep 2026"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                  />
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Default Team Quota (Players per team)
                </label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={formData.defaultPlayerQuota}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultPlayerQuota: Number(e.target.value) || 11 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Default: 11 players per playing XI squad
                </span>
              </div>
            </div>

            {/* Organizer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Organizer Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.organizerName}
                    onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                    placeholder="e.g. Arif Iquebal"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                  />
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Organizer Role
                </label>
                <input
                  type="text"
                  value={formData.organizerRole}
                  onChange={(e) => setFormData({ ...formData, organizerRole: e.target.value })}
                  placeholder="e.g. Organizer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                />
              </div>
            </div>

            {/* Slogans & Taglines */}
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Header Quote Slogan
                </label>
                <input
                  type="text"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  placeholder='e.g. "More Than a League It&apos;s a Family"'
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Banner Subtitle
                  </label>
                  <input
                    type="text"
                    value={formData.subSlogan}
                    onChange={(e) => setFormData({ ...formData, subSlogan: e.target.value })}
                    placeholder="e.g. Fair Play • Transparent • Stronger Teams"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sidebar Footer Tagline
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="e.g. Play Together Win Together"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
