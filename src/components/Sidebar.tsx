import React from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { BplLogo } from './BplLogo';

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
}) => {
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
    onSelectView(view);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#061A36] text-white border-r border-[#0A244A] select-none text-xs">
      {/* Top Header Logo */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-[#0A244A] shrink-0">
        <div className="flex items-center overflow-hidden">
          <BplLogo size={32} showText={!collapsed} />
        </div>
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#0A244A] transition-colors focus:outline-none"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#0A244A]"
          aria-label="Close Mobile Menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav list */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-medium transition-all duration-150 group relative ${
                isActive
                  ? 'bg-[#1283E6] text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-[#0A244A]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                }`}
              />
              {!collapsed && (
                <span className="truncate text-left flex-1 text-xs">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-[#FF7A2E] text-white">
                  {item.badge}
                </span>
              )}

              {/* Collapsed Tooltip */}
              {collapsed && (
                <div className="absolute left-full ml-2.5 px-2 py-1 bg-[#0A244A] text-white text-[11px] font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap border border-slate-700">
                  {item.label}
                  {item.badge && (
                    <span className="ml-1 text-[9px] px-1 py-0.2 bg-[#FF7A2E] rounded">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Compact Tag */}
      <div className="p-2.5 border-t border-[#0A244A] shrink-0 bg-[#041226]">
        {!collapsed ? (
          <div className="text-center py-1">
            <div className="text-[9px] font-bold tracking-wider text-[#FF7A2E] uppercase">
              BPL SEASON-2
            </div>
            <div className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest mt-0.5">
              FAIR PLAY DRAFT
            </div>
          </div>
        ) : (
          <div className="text-center py-0.5 font-black text-[10px] text-[#FF7A2E]" title="BPL Season-2">
            BPL
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block h-screen fixed left-0 top-0 z-30 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-[64px]' : 'w-[204px]'
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
