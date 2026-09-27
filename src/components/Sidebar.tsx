import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  Layers,
  Settings2,
  PlayCircle,
  History,
  Trophy,
  Sliders,
  ChevronLeft,
  ChevronRight,
  X,
  Camera,
} from 'lucide-react';
import { Draft, AppUser } from '../types';
import { DEFAULT_BPL_LOGO } from '../lib/imageUtils';
import { authService } from '../lib/authService';
import { TournamentEditModal } from './TournamentEditModal';

export type NavView =
  | 'dashboard'
  | 'players'
  | 'teams'
  | 'categories'
  | 'setup'
  | 'live'
  | 'history'
  | 'results'
  | 'settings';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  draft?: Draft | null;
  onSaveDraft?: (updatedDraft: Draft) => Promise<void>;
  currentUser?: AppUser | null;
}

interface NavItem {
  id: NavView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  draft,
  onSaveDraft,
  currentUser,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isSuperadmin =
    currentUser?.role === 'superadmin' ||
    authService.isSuperadmin(currentUser?.mobile || '') ||
    authService.isSuperadmin(currentUser?.email || '');

  const effectiveLogo = draft?.logoUrl || DEFAULT_BPL_LOGO;
  const seasonText = draft?.season || 'Season-2';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'teams', label: 'Teams', icon: Shield },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'setup', label: 'Draft Setup', icon: Settings2 },
    { id: 'live', label: 'Run Draft', icon: PlayCircle, badge: 'LIVE' },
    { id: 'history', label: 'Draft History', icon: History },
    { id: 'results', label: 'Final Rosters', icon: Trophy },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  const handleNavClick = (view: NavView) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0;
      document.scrollingElement.scrollLeft = 0;
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const rootEl = document.getElementById('root');
    if (rootEl) rootEl.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    onSelectView(view);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#061A36] text-white border-r border-[#0A244A] select-none text-sm">
      {/* Top Header Logo Area */}
      {collapsed ? (
        /* Collapsed Header: Centered BPL Logo + Superadmin change capability */
        <div className="h-[64px] flex items-center justify-center p-2 border-b border-[#0A244A] shrink-0 bg-[#041226]/60 relative">
          <div
            onClick={() => {
              if (isSuperadmin && draft && onSaveDraft) {
                setIsEditModalOpen(true);
              }
            }}
            className={`relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 p-1 shadow-md shrink-0 transition-transform duration-200 ${
              isSuperadmin && draft
                ? 'cursor-pointer hover:border-[#FF7A2E] hover:ring-1 hover:ring-[#FF7A2E]/50 group/logo'
                : ''
            }`}
            title={
              isSuperadmin && draft
                ? 'Superadmin: Click to change tournament logo'
                : `BPL ${seasonText}`
            }
          >
            <img
              src={effectiveLogo}
              alt="BPL Logo"
              className="w-full h-full object-contain filter drop-shadow-md"
              referrerPolicy="no-referrer"
            />
            {isSuperadmin && draft && (
              <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover/logo:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Camera className="w-3.5 h-3.5 text-amber-300 drop-shadow" />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Expanded Header: BPL on top, Season-2 below, and Collapse Button */
        <div className="h-[64px] flex items-center justify-between px-3 border-b border-[#0A244A] shrink-0 bg-[#041226]/60">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            {/* Logo with dynamic superadmin update support */}
            <div
              onClick={() => {
                if (isSuperadmin && draft && onSaveDraft) {
                  setIsEditModalOpen(true);
                }
              }}
              className={`relative shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900/80 border border-slate-700/70 p-1 shadow-md transition-all duration-200 ${
                isSuperadmin && draft
                  ? 'cursor-pointer group/logo hover:border-[#FF7A2E] hover:ring-2 hover:ring-[#FF7A2E]/50'
                  : ''
              }`}
              title={
                isSuperadmin && draft
                  ? 'Superadmin: Click to change tournament logo'
                  : `BPL ${seasonText}`
              }
            >
              <img
                src={effectiveLogo}
                alt="BPL Logo"
                className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-200 group-hover/logo:scale-105"
                referrerPolicy="no-referrer"
              />
              {isSuperadmin && draft && (
                <div className="absolute inset-0 bg-black/45 rounded-xl opacity-0 group-hover/logo:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Camera className="w-3.5 h-3.5 text-amber-300 drop-shadow" />
                </div>
              )}
            </div>

            {/* Text Area: ONLY BPL on top, Season-2 below */}
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-base font-black tracking-wider text-white uppercase truncate drop-shadow-xs">
                BPL
              </span>
              <span className="text-[11px] font-bold text-[#FF7A2E] tracking-wider uppercase truncate mt-0.5">
                {seasonText}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0A244A] transition-colors focus:outline-none cursor-pointer"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0A244A]"
              aria-label="Close Mobile Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Expand Toggle Rail (Visible in Collapsed Mode) */}
      {collapsed && (
        <div className="py-1.5 border-b border-[#0A244A]/60 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#0A244A] transition-colors cursor-pointer"
            title="Expand Sidebar"
            aria-label="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav List - Well Proportioned & Centered when Collapsed */}
      <nav className={`flex-1 py-3 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2 space-y-1.5' : 'px-2.5 space-y-1'}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-xl font-medium transition-all duration-150 group relative cursor-pointer ${
                collapsed
                  ? 'justify-center w-10 h-10 mx-auto'
                  : 'w-full gap-2.5 px-3 py-2 text-[13px]'
              } ${
                isActive
                  ? 'bg-gradient-to-r from-[#1283E6] to-[#0A6EC9] text-white shadow-md font-bold ring-1 ring-blue-300/30'
                  : 'text-slate-300 hover:text-white hover:bg-[#0A244A]/80'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                }`}
              />

              {!collapsed && (
                <span className="truncate text-left flex-1 font-semibold tracking-wide">
                  {item.label}
                </span>
              )}

              {!collapsed && item.badge && (
                <span className="text-[9.5px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded-full bg-[#FF7A2E] text-white shadow-xs">
                  {item.badge}
                </span>
              )}

              {/* Collapsed Active Indicator Dot for Badges */}
              {collapsed && item.badge && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF7A2E] ring-2 ring-[#061A36]" />
              )}

              {/* Hover Tooltip when Collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#041226] text-white text-xs font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap border border-slate-700/80">
                  {item.label}
                  {item.badge && (
                    <span className="ml-1.5 text-[9px] px-1.5 py-0.2 bg-[#FF7A2E] rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Superadmin Quick Logo Edit Shortcut (When Expanded) */}
      {!collapsed && isSuperadmin && draft && onSaveDraft && (
        <div className="px-2.5 pb-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Change Tournament Logo</span>
          </button>
        </div>
      )}

      {/* Bottom Footer Compact Tag */}
      <div className="p-2.5 px-3 border-t border-[#0A244A] shrink-0 bg-[#041226]">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="leading-tight">
              <div className="text-[10px] font-black tracking-wider text-[#FF7A2E] uppercase">
                BPL {seasonText}
              </div>
              <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                FAIR PLAY DRAFT
              </div>
            </div>
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#0A244A] transition-colors cursor-pointer"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0A244A] transition-colors cursor-pointer"
            title="Expand Sidebar"
            aria-label="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Direct Tournament Edit Modal when changing logo */}
      {draft && onSaveDraft && (
        <TournamentEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          draft={draft}
          onSaveDraft={onSaveDraft}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block h-screen fixed left-0 top-0 z-30 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-[64px]' : 'w-[210px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 w-[240px] z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
