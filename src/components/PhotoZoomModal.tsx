import React, { useEffect } from 'react';
import { X, Trophy, Shield, Crown, Maximize2, Download } from 'lucide-react';
import { Category, Player, Team } from '../types';

interface PhotoZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  team?: Team | null;
  category?: { name: string; color?: string } | Category | null;
}

export const PhotoZoomModal: React.FC<PhotoZoomModalProps> = ({
  isOpen,
  onClose,
  player,
  team,
  category,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !player) return null;

  const handleDownloadImage = () => {
    if (!player.photoUrl) return;
    const a = document.createElement('a');
    a.href = player.photoUrl;
    a.download = `${player.fullName.replace(/\s+/g, '_')}_Photo.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#061A36] text-white rounded-3xl max-w-lg w-full border border-slate-700 shadow-2xl overflow-hidden relative flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-700/80 bg-[#041226] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-[#1283E6]" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-300">
              Player Portrait • Big View
            </span>
          </div>

          <div className="flex items-center gap-2">
            {player.photoUrl && (
              <button
                type="button"
                onClick={handleDownloadImage}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                title="Download full size photo"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Big Photo Container */}
        <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-[#061A36] to-[#041022]">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-700/80 bg-slate-900 flex items-center justify-center group">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.fullName}
                className="w-full h-full object-cover select-none"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-400">
                <span className="text-5xl sm:text-6xl font-black text-[#1283E6]">
                  #{player.jerseyNumber || '00'}
                </span>
                <span className="text-xs text-slate-400 mt-2 font-medium">No Photo Uploaded</span>
              </div>
            )}

            {/* Jersey Badge Overlay */}
            {player.jerseyNumber && (
              <div className="absolute top-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md border border-white/20 rounded-xl font-mono text-xs font-black text-amber-300 shadow-lg">
                #{player.jerseyNumber}
              </div>
            )}

            {/* Captain Crown Overlay */}
            {player.isCaptain && (
              <div className="absolute top-3 right-3 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-[#061A36] rounded-xl font-black text-xs shadow-lg flex items-center gap-1 uppercase">
                <Crown className="w-3.5 h-3.5" />
                Captain
              </div>
            )}
          </div>
        </div>

        {/* Player Identity Information (Fully visible, no truncation!) */}
        <div className="px-6 py-4 bg-[#030C1C] border-t border-slate-700/80 space-y-3">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug break-words">
              {player.fullName}
            </h3>
            {(() => {
              const cleanNotes = player.notes
                ? player.notes
                    .replace(/Bangla:\s*[^|]+(\||$)/gi, '')
                    .replace(/[\u0980-\u09FF]+/g, '')
                    .split('|')
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .join(' | ')
                    .trim()
                : null;
              return cleanNotes ? (
                <p className="text-xs text-amber-300 font-medium mt-0.5 break-words">
                  {cleanNotes}
                </p>
              ) : null;
            })()}
          </div>

          {/* Badges & Category Grid */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {category && (
              <span
                className="px-3 py-1 rounded-xl text-xs font-black text-white shadow-sm"
                style={{ backgroundColor: category.color || '#1283E6' }}
              >
                {category.name}
              </span>
            )}

            {player.badge && (
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-white/10 text-sky-200 border border-white/10">
                {player.badge}
              </span>
            )}

            {team && (
              <span
                className="px-3 py-1 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 border border-white/20"
                style={{ backgroundColor: `${team.primaryColor || '#0A5DB8'}80` }}
              >
                <Shield className="w-3.5 h-3.5" />
                {team.name}
              </span>
            )}
          </div>

          {/* Playing Style Details */}
          <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Batting</span>
              <span className="font-semibold text-white">{player.battingStyle || 'Right Handed'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Bowling</span>
              <span className="font-semibold text-white">{player.bowlingStyle || 'None / Not Listed'}</span>
            </div>
            {player.playerType && (
              <div className="col-span-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Discipline / Role</span>
                <span className="font-semibold text-white">{player.playerType}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
