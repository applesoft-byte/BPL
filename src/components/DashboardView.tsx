import React from 'react';
import {
  PlusCircle,
  PlayCircle,
  Upload,
  Sparkles,
  Trophy,
  Users,
  Shield,
  Layers,
  CheckCircle2,
  Clock,
  Trash2,
  Copy,
  Download,
  ArrowRight,
  TrendingUp,
  Cloud,
  LogIn,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { Draft, DraftStats, Player, Team } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { ADMIN_EMAIL } from '../lib/firebaseDb';

interface DashboardViewProps {
  drafts: Draft[];
  activeDraft: Draft | null;
  stats: DraftStats;
  teams: Team[];
  players: Player[];
  currentUser?: FirebaseUser | null;
  isCloudConnected?: boolean;
  isSyncing?: boolean;
  onOpenAuthModal?: () => void;
  onSyncToCloud?: () => Promise<void>;
  onSelectDraft: (draftId: string) => void;
  onCreateNewDraft: () => void;
  onLoadSampleData: () => void;
  onImportBackup: () => void;
  onExportDraft: (draftId: string) => void;
  onDuplicateDraft: (draftId: string) => void;
  onDeleteDraft: (draftId: string) => void;
  onNavigateToLive: () => void;
  onNavigateToResults: () => void;
  onNavigateToPlayers: () => void;
  onNavigateToTeams: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  drafts,
  activeDraft,
  stats,
  teams,
  players,
  currentUser,
  isCloudConnected = true,
  isSyncing = false,
  onOpenAuthModal,
  onSyncToCloud,
  onSelectDraft,
  onCreateNewDraft,
  onLoadSampleData,
  onImportBackup,
  onExportDraft,
  onDuplicateDraft,
  onDeleteDraft,
  onNavigateToLive,
  onNavigateToResults,
  onNavigateToPlayers,
  onNavigateToTeams,
}) => {
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#061A36] via-[#0A244A] to-[#0A5DB8] text-white p-6 sm:p-8 shadow-md border border-[#0A244A]">
        {/* Subtle decorative background cricket ball / ring */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full border-8 border-white/5 pointer-events-none" />
        <div className="absolute right-20 -bottom-20 w-80 h-80 rounded-full border-12 border-[#1283E6]/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-[#FF7A2E]/20 text-[#FF7A2E] border border-[#FF7A2E]/30">
              <Sparkles className="w-3.5 h-3.5" />
              BPL Season-2 Official Management System
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              PLAYER DRAFT
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl">
              Fair Play • Transparent • Stronger Teams
            </p>
            <p className="text-xs text-slate-400">
              Manage franchise team quotas, randomize cricket player lotteries, execute live orbital wheel spins, and publish certified rosters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={onCreateNewDraft}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1283E6] hover:bg-[#0A5DB8] text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              CREATE NEW DRAFT
            </button>

            {activeDraft && (
              <button
                onClick={stats.isComplete ? onNavigateToResults : onNavigateToLive}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FF7A2E] hover:bg-[#e0661e] text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95"
              >
                {stats.isComplete ? (
                  <>
                    <Trophy className="w-4 h-4" />
                    VIEW FINAL SQUADS
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    RESUME DRAFT
                  </>
                )}
              </button>
            )}

            <button
              onClick={onImportBackup}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-[#061A36]/80 hover:bg-[#061A36] text-slate-200 border border-slate-600 font-semibold text-sm rounded-xl transition-all hover:text-white"
              title="Import draft JSON backup"
            >
              <Upload className="w-4 h-4" />
              IMPORT DRAFT
            </button>

            <button
              onClick={onLoadSampleData}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
              title="Load full ready-to-run BPL Season-2 demo dataset"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              LOAD SAMPLE S-2 DRAFT
            </button>
          </div>
        </div>
      </div>

      {/* Cloud Database & Authentication Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5 text-[#0A5DB8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Firebase Firestore Cloud Database
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isCloudConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isCloudConnected ? 'Connected & Live' : 'Connecting...'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {currentUser ? (
                <span>
                  Logged in as <strong className="text-slate-700">{currentUser.displayName || currentUser.email}</strong>
                  {isAdmin && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-700 font-extrabold text-[10px]">
                      <Crown className="w-3 h-3 text-amber-500 inline" /> Admin
                    </span>
                  )}
                  {' '}• Draft changes sync across organizers in real-time
                </span>
              ) : (
                <span>Local database active. Sign in with Google to enable real-time cloud sync & admin rights.</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          {currentUser ? (
            <>
              {onSyncToCloud && (
                <button
                  onClick={onSyncToCloud}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0A5DB8] border border-blue-200 text-xs font-bold transition-all disabled:opacity-50"
                  title="Push current local draft state to Firebase Cloud"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync to Cloud'}</span>
                </button>
              )}
              {onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Manage Account</span>
                </button>
              )}
            </>
          ) : (
            onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#061A36] to-[#0A5DB8] hover:from-[#082247] hover:to-[#0c6cd6] text-white text-xs font-bold shadow-xs transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sign In with Google</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Players */}
        <div
          onClick={onNavigateToPlayers}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-[#1283E6] hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Players</span>
            <Users className="w-4 h-4 text-[#1283E6] group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-[#061A36]">{stats.totalPlayers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Available in pool</div>
        </div>

        {/* Total Teams */}
        <div
          onClick={onNavigateToTeams}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-[#1283E6] hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Teams</span>
            <Shield className="w-4 h-4 text-[#16A34A] group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-[#061A36]">{stats.totalTeams}</div>
          <div className="text-[11px] text-slate-500 mt-1">Franchises</div>
        </div>

        {/* Categories */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Categories</span>
            <Layers className="w-4 h-4 text-[#FF7A2E]" />
          </div>
          <div className="text-2xl font-extrabold text-[#061A36]">{stats.totalCategories}</div>
          <div className="text-[11px] text-slate-500 mt-1">Configured roles</div>
        </div>

        {/* Players Drafted */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Drafted</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{stats.draftedPlayers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Assigned to squads</div>
        </div>

        {/* Players Remaining */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Remaining</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{stats.remainingPlayers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting spin</div>
        </div>

        {/* Progress % */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Progress</span>
            <TrendingUp className="w-4 h-4 text-[#1283E6]" />
          </div>
          <div className="text-2xl font-extrabold text-[#1283E6]">{stats.progressPercent}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-[#1283E6] h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active Draft Quick Arena Access Banner */}
      {activeDraft && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#E6F7FF] flex items-center justify-center text-[#1283E6] font-bold text-xl shrink-0">
              BPL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#061A36]">{activeDraft.name}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#1283E6] border border-blue-200">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeDraft.season} • {teams.length} Teams • {players.length} Total Players Registered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToLive}
              className="flex items-center gap-2 px-4 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <PlayCircle className="w-4 h-4" />
              Open Live Arena
            </button>
            {stats.isComplete && (
              <button
                onClick={onNavigateToResults}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                <Trophy className="w-4 h-4" />
                View Final Rosters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Saved Drafts List (Section 6) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#061A36]">Saved Draft Tournaments</h2>
            <p className="text-xs text-slate-500">
              Manage multiple isolated draft events or tournaments
            </p>
          </div>
          <button
            onClick={onCreateNewDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Draft
          </button>
        </div>

        {drafts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-700">No Drafts Found in Database</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Get started by creating a new tournament draft, or load the pre-configured Brothers Premier League Season-2 sample dataset.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={onLoadSampleData}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                Load BPL Season-2 Demo Data
              </button>
              <button
                onClick={onCreateNewDraft}
                className="px-4 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl transition-all"
              >
                Create Blank Draft
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.map((d) => {
              const isCurrent = activeDraft?.id === d.id;
              const dateStr = new Date(d.updatedAt || d.createdAt).toLocaleDateString();

              return (
                <div
                  key={d.id}
                  className={`bg-white rounded-xl p-5 border transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'border-[#1283E6] ring-2 ring-[#1283E6]/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <h4 className="font-bold text-sm text-[#061A36] truncate">{d.name}</h4>
                        <span className="text-xs text-slate-500">{d.season}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          d.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : d.status === 'live'
                            ? 'bg-blue-50 text-[#1283E6] border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>

                    <div className="pt-2 text-xs text-slate-600 flex items-center justify-between border-t border-slate-100">
                      <span>Last updated: {dateStr}</span>
                      {isCurrent && (
                        <span className="text-[#1283E6] font-bold text-[11px]">ACTIVE</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
                    <button
                      onClick={() => onSelectDraft(d.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-[#1283E6] text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{isCurrent ? 'Open Arena' : 'Select'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onExportDraft(d.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Export JSON backup"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDuplicateDraft(d.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Duplicate draft"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteDraft(d.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
