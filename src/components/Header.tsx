import React, { useState } from 'react';
import {
  Menu,
  Volume2,
  VolumeX,
  Sparkles,
  Shield,
  Users,
  ChevronDown,
  Settings2,
  LogIn,
  LogOut,
  Crown,
  KeyRound,
  Eye,
} from 'lucide-react';
import { Draft, DraftStats, AppUser } from '../types';
import { TournamentEditModal } from './TournamentEditModal';
import { authService, SUPERADMIN_MOBILE, SUPERADMIN_NAME } from '../lib/authService';

interface HeaderProps {
  draft: Draft | null;
  stats: DraftStats;
  soundEnabled: boolean;
  currentUser?: AppUser | null;
  isCloudConnected?: boolean;
  onOpenAuthModal?: () => void;
  onOpenSuperadminPortal?: () => void;
  onToggleSound: () => void;
  onOpenMobileSidebar: () => void;
  onNavigateToLive: () => void;
  onNavigateToResults: () => void;
  onSaveDraft?: (draft: Draft) => Promise<void>;
  onOpenDraftPoolModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  draft,
  stats,
  soundEnabled,
  currentUser,
  onOpenAuthModal,
  onOpenSuperadminPortal,
  onToggleSound,
  onOpenMobileSidebar,
  onSaveDraft,
  onOpenDraftPoolModal,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const leagueTitle = draft?.name || 'Brothers Premier League (BPL)';
  const seasonTitle = draft?.season || 'Season-2';
  const organizerName = currentUser?.fullName || draft?.organizerName || 'Arif Iquebal';

  const isSuperadmin =
    currentUser?.role === 'superadmin' ||
    authService.isSuperadmin(currentUser?.mobile || '') ||
    authService.isSuperadmin(currentUser?.email || '');

  const organizerRole = isSuperadmin ? 'Super Admin' : currentUser?.role || 'Guest Viewer';

  // Get initials for avatar
  const initials =
    organizerName
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AI';

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-3 sm:px-4 md:px-6 flex items-center justify-between shadow-2xs">
        {/* Left Side: League Name & Season */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-extrabold text-[#061A36] tracking-tight truncate flex items-center gap-2">
              <span className="truncate">{leagueTitle}</span>
              {draft?.status === 'live' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              )}
            </h1>
            <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 flex items-center gap-1 truncate">
              <span>{seasonTitle}</span>
              <span className="text-slate-300">|</span>
              <span>Official Player Draft Arena</span>
            </p>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live Real-time Cloud Sync Beacon */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700"
            title="Real-time Firestore Database Connected: Any changes by Superadmin update the whole website instantly"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xl:inline">Live Cloud Sync</span>
            <span className="xl:hidden">Live</span>
          </div>

          {/* Quick Superadmin Button if logged in */}
          {isSuperadmin && onOpenSuperadminPortal && (
            <button
              onClick={onOpenSuperadminPortal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-[#FF7A2E] text-white text-xs font-black shadow-xs hover:shadow-md transition-all active:scale-95"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Superadmin Portal</span>
            </button>
          )}

          {/* Draft Pool Count */}
          <div
            onClick={onOpenDraftPoolModal}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
            title="Click to manage draft player selection pool"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] text-slate-400 uppercase font-bold">Total Players</span>
              <span className="font-bold text-slate-800">
                {stats.poolPlayersCount || stats.totalPlayers}
              </span>
            </div>
          </div>

          {/* User Profile Pill or Guest State */}
          <div className="relative">
            {currentUser ? (
              <button
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-slate-100 border border-slate-200/80 transition-all focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-[#061A36] text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-[#061A36] truncate max-w-[100px]">
                      {organizerName}
                    </span>
                    {isSuperadmin && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    {organizerRole}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">
                  <Eye className="w-3 h-3 text-slate-400" />
                  <span>Guest Mode (Default Roster)</span>
                </div>
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A5DB8] hover:bg-[#061A36] text-white text-xs font-extrabold shadow-sm transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sign In / Register</span>
                </button>
              </div>
            )}

            {/* Dropdown Menu */}
            {userDropdownOpen && currentUser && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#061A36] text-white flex items-center justify-center font-bold text-xs">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#061A36] truncate flex items-center gap-1.5">
                      <span>{organizerName}</span>
                      {isSuperadmin && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800">
                          SUPERADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      +88{currentUser.mobile}
                    </div>
                  </div>
                </div>

                {isSuperadmin && onOpenSuperadminPortal && (
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenSuperadminPortal();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-amber-900 bg-amber-50/70 hover:bg-amber-100 font-bold text-left transition-colors"
                  >
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Manage Reference Numbers</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setIsEditModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 font-medium text-left transition-colors"
                >
                  <Settings2 className="w-4 h-4 text-[#1283E6]" />
                  <span>Customize League & Logo</span>
                </button>

                {onOpenDraftPoolModal && (
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenDraftPoolModal();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 font-medium text-left transition-colors"
                  >
                    <Users className="w-4 h-4 text-[#16A34A]" />
                    <span>Select Draft Player Pool</span>
                  </button>
                )}

                <div className="h-px bg-slate-100 my-1" />

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onToggleSound();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-slate-700 hover:bg-slate-50 font-medium text-left transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-red-500" />
                    )}
                    <span>Sound Effects</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {soundEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>

                <div className="h-px bg-slate-100 my-1" />

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onOpenAuthModal?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-600 hover:bg-red-50 font-semibold text-left transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-xl border transition-colors hidden xs:flex ${
              soundEnabled
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
            }`}
            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
            aria-label={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Edit Tournament Modal */}
      {draft && onSaveDraft && (
        <TournamentEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          draft={draft}
          onSaveDraft={onSaveDraft}
        />
      )}
    </>
  );
};
