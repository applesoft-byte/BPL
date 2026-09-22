import React, { useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { AnimationSpeed, Draft, DraftSettings } from '../types';

interface SettingsViewProps {
  draft: Draft | null;
  onUpdateSettings: (settings: DraftSettings) => Promise<void>;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onResetToSampleData: () => void;
  onClearAllData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  draft,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onResetToSampleData,
  onClearAllData,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const currentSettings: DraftSettings = draft?.settings || {
    animationSpeed: 'normal',
    soundEnabled: true,
    celebrationEnabled: true,
    reducedMotion: false,
    autoSave: true,
    categoryMode: 'category_by_category',
  };

  const handleChange = async (key: keyof DraftSettings, value: unknown) => {
    const updated = {
      ...currentSettings,
      [key]: value,
    };
    await onUpdateSettings(updated);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleConfirmClear = async () => {
    await onClearAllData();
    setShowClearConfirm(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#061A36] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#1283E6]" />
            Application Settings & Preferences
          </h2>
          <p className="text-xs text-slate-500">
            Configure animation rates, audio effects, accessibility motion, and data backups
          </p>
        </div>

        {saveToast && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Preferences Saved
          </span>
        )}
      </div>

      {/* Draft Wheel & Motion Settings */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
        <h3 className="font-extrabold text-sm text-[#061A36] uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#FF7A2E]" />
          Animation & Lottery Motion
        </h3>

        {/* Animation Speed */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <div className="font-bold text-xs text-slate-800">Wheel Spin Duration</div>
            <div className="text-[11px] text-slate-500">
              Controls rotation and card acceleration duration before revealing pick
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl text-xs">
            {(['fast', 'normal', 'slow'] as AnimationSpeed[]).map((spd) => (
              <button
                key={spd}
                onClick={() => handleChange('animationSpeed', spd)}
                className={`px-3 py-1.5 rounded-lg font-bold capitalize text-xs transition-colors ${
                  currentSettings.animationSpeed === spd
                    ? 'bg-[#1283E6] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {spd} ({spd === 'fast' ? '1.6s' : spd === 'normal' ? '3.2s' : '4.8s'})
              </button>
            ))}
          </div>
        </div>

        {/* Reduced Motion Toggle (Section 39) */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div>
            <div className="font-bold text-xs text-slate-800">Reduced Motion Mode (Accessibility)</div>
            <div className="text-[11px] text-slate-500">
              Disables orbital spin and card flight animation; displays immediate selection modal
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.reducedMotion}
              onChange={(e) => handleChange('reducedMotion', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1283E6]" />
          </label>
        </div>

        {/* Confetti Celebration Toggle */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div>
            <div className="font-bold text-xs text-slate-800">Confetti Celebration Effects</div>
            <div className="text-[11px] text-slate-500">
              Triggers colorful stadium particle confetti on every drafted player assignment
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.celebrationEnabled}
              onChange={(e) => handleChange('celebrationEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1283E6]" />
          </label>
        </div>
      </div>

      {/* Audio Synthesizer Settings */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-sm text-[#061A36] uppercase tracking-wider flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[#1283E6]" />
          Sound Effects & Synthesizer
        </h3>

        <div className="flex items-center justify-between gap-3 pt-2">
          <div>
            <div className="font-bold text-xs text-slate-800">Synthesized Audio Feedback</div>
            <div className="text-[11px] text-slate-500">
              Generates Web Audio API ticks, chimes, and fanfare sounds (100% offline, zero network requests)
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.soundEnabled}
              onChange={(e) => handleChange('soundEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1283E6]" />
          </label>
        </div>
      </div>

      {/* Database Backup & Disaster Recovery */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
        <h3 className="font-extrabold text-sm text-[#061A36] uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600" />
          Data Backup & Disaster Recovery
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Export JSON */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-[#1283E6]" />
              Export Full JSON Backup
            </div>
            <p className="text-[11px] text-slate-500">
              Download complete tournament snapshot including all teams, categories, players, and history.
            </p>
            <button
              onClick={onExportBackup}
              className="px-3.5 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white font-bold text-xs rounded-xl shadow-2xs transition-all w-full"
            >
              Export Tournament Backup (.json)
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#FF7A2E]" />
              Restore from Backup
            </div>
            <p className="text-[11px] text-slate-500">
              Upload a previously exported .json file to restore tournament state without data loss.
            </p>
            <button
              onClick={onImportBackup}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-2xs transition-all w-full"
            >
              Restore Backup (.json)
            </button>
          </div>
        </div>

        {/* Demo Data & Danger Zone */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={onResetToSampleData}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Reload Official BPL Season-2 Demo Dataset
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            Clear All IndexedDB Data
          </button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Confirm Data Purge</h3>
                <p className="text-xs text-slate-500">Irreversible IndexedDB storage wipe</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete all drafts, players, franchise teams, categories, and pick history from this browser?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Yes, Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
