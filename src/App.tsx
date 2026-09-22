import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from './lib/db';
import { soundManager } from './lib/sound';
import { createSampleDraftData } from './lib/sampleData';
import { Category, Draft, DraftSettings, DraftStats, PickRecord, Player, Team } from './types';
import { NavView, Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { PlayersView } from './components/PlayersView';
import { TeamsView } from './components/TeamsView';
import { CategoriesView } from './components/CategoriesView';
import { DraftSetupView } from './components/DraftSetupView';
import { LiveDraftView } from './components/LiveDraftView';
import { DraftHistoryView } from './components/DraftHistoryView';
import { FinalResultsView } from './components/FinalResultsView';
import { SettingsView } from './components/SettingsView';
import { DraftPoolModal } from './components/DraftPoolModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('bpl_sidebar_collapsed') === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isGlobalPoolModalOpen, setIsGlobalPoolModalOpen] = useState<boolean>(false);

  // Database Entities State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [picks, setPicks] = useState<PickRecord[]>([]);

  // Sound preference state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('bpl_sound_enabled') !== 'false';
  });

  // Hidden file input ref for backup JSON restore
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync sound manager enabled
  useEffect(() => {
    soundManager.enabled = soundEnabled;
    localStorage.setItem('bpl_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  // Sync sidebar collapse to localStorage
  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('bpl_sidebar_collapsed', String(next));
      return next;
    });
  };

  // 1. Initial Load from IndexedDB
  const loadDatabase = useCallback(async () => {
    try {
      setIsLoading(true);
      const allDrafts = await db.getAllDrafts();
      const officialSeedKey = 'bpl_seeded_v2_official_sheet_41';

      if (allDrafts.length === 0 || localStorage.getItem(officialSeedKey) !== 'true') {
        // Initialize with official BPL Season-2 dataset from user's official sheet!
        const sample = createSampleDraftData();
        await db.saveDraft(sample.draft);
        await db.bulkSaveCategories(sample.categories);
        await db.bulkSaveTeams(sample.teams);
        await db.bulkSavePlayers(sample.players);
        localStorage.setItem(officialSeedKey, 'true');

        setDrafts([sample.draft]);
        setActiveDraftId(sample.draft.id);
        setCategories(sample.categories);
        setTeams(sample.teams);
        setPlayers(sample.players);
        setPicks([]);
      } else {
        setDrafts(allDrafts);
        // Find last opened draft or first draft
        const lastOpened = localStorage.getItem('bpl_last_draft_id');
        const selected = allDrafts.find((d) => d.id === lastOpened) || allDrafts[0];
        setActiveDraftId(selected.id);

        const [dbPlayers, dbTeams, dbCats, dbPicks] = await Promise.all([
          db.getPlayers(selected.id),
          db.getTeams(selected.id),
          db.getCategories(selected.id),
          db.getPicks(selected.id),
        ]);

        setPlayers(dbPlayers);
        setTeams(dbTeams);
        setCategories(dbCats);
        setPicks(dbPicks);
      }
    } catch (err) {
      console.error('Failed to initialize database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  // Load specific draft when activeDraftId changes
  const switchDraft = async (draftId: string) => {
    try {
      setIsLoading(true);
      setActiveDraftId(draftId);
      localStorage.setItem('bpl_last_draft_id', draftId);

      const [dbPlayers, dbTeams, dbCats, dbPicks] = await Promise.all([
        db.getPlayers(draftId),
        db.getTeams(draftId),
        db.getCategories(draftId),
        db.getPicks(draftId),
      ]);

      setPlayers(dbPlayers);
      setTeams(dbTeams);
      setCategories(dbCats);
      setPicks(dbPicks);
    } finally {
      setIsLoading(false);
    }
  };

  const activeDraft = useMemo(() => {
    return drafts.find((d) => d.id === activeDraftId) || null;
  }, [drafts, activeDraftId]);

  // Computed Stats
  const stats: DraftStats = useMemo(() => {
    const totalPlayers = players.length;
    const poolPlayersCount = players.filter((p) => p.inDraftPool !== false).length;
    const draftedPlayers = players.filter((p) => p.status === 'drafted').length;
    const remainingPlayers = totalPlayers - draftedPlayers;
    const totalTeams = teams.length;
    const totalCategories = categories.length;

    const totalRequired = teams.reduce((acc, t) => {
      const qSum = Object.values(t.quotas).reduce((sum, q) => sum + (q || 0), 0);
      return acc + Math.max(t.maxPlayers, qSum);
    }, 0);

    const progressPercent =
      totalRequired > 0 ? Math.min(100, Math.round((draftedPlayers / totalRequired) * 100)) : 0;
    const isComplete = draftedPlayers >= totalRequired && totalRequired > 0;

    return {
      totalPlayers,
      poolPlayersCount,
      draftedPlayers,
      remainingPlayers,
      totalTeams,
      totalCategories,
      totalQuotaRequired: totalRequired,
      progressPercent,
      isComplete,
    };
  }, [players, teams, categories]);

  // --- ACTIONS ---

  // Create New Blank Draft
  const handleCreateNewDraft = async () => {
    const now = Date.now();
    const newDraftId = `draft-${now}`;
    const newDraft: Draft = {
      id: newDraftId,
      name: `BPL Draft ${new Date().toLocaleDateString()}`,
      season: 'Season-2 (2026)',
      status: 'setup',
      settings: {
        animationSpeed: 'normal',
        soundEnabled: true,
        celebrationEnabled: true,
        reducedMotion: false,
        autoSave: true,
        categoryMode: 'category_by_category',
      },
      createdAt: now,
      updatedAt: now,
    };

    // Default categories for new draft
    const sample = createSampleDraftData();
    const newCategories = sample.categories.map((c) => ({
      ...c,
      id: `cat-${now}-${c.order}`,
      draftId: newDraftId,
      createdAt: now,
      updatedAt: now,
    }));

    await db.saveDraft(newDraft);
    await db.bulkSaveCategories(newCategories);

    setDrafts((prev) => [newDraft, ...prev]);
    await switchDraft(newDraftId);
    setCurrentView('setup');
  };

  // Reload Sample BPL Season-2 dataset
  const handleLoadSampleData = async () => {
    if (confirm('Load fresh BPL Season-2 demo tournament data? This will add or reset the sample tournament.')) {
      const sample = createSampleDraftData();
      await db.saveDraft(sample.draft);
      await db.bulkSaveCategories(sample.categories);
      await db.bulkSaveTeams(sample.teams);
      await db.bulkSavePlayers(sample.players);

      await loadDatabase();
      await switchDraft(sample.draft.id);
      setCurrentView('dashboard');
    }
  };

  // Duplicate Draft
  const handleDuplicateDraft = async (draftId: string) => {
    const orig = await db.exportFullDraft(draftId);
    const now = Date.now();
    const newDraftId = `draft-dup-${now}`;

    const newDraft: Draft = {
      ...orig.draft,
      id: newDraftId,
      name: `${orig.draft.name} (Copy)`,
      status: 'ready',
      createdAt: now,
      updatedAt: now,
    };

    const newCats = orig.categories.map((c) => ({ ...c, draftId: newDraftId }));
    const newTeams = orig.teams.map((t) => ({ ...t, draftId: newDraftId }));
    // Reset drafted status
    const newPlayers = orig.players.map((p) => ({
      ...p,
      draftId: newDraftId,
      status: 'available' as const,
      assignedTeamId: undefined,
      assignedCategoryId: undefined,
    }));

    await db.saveDraft(newDraft);
    await db.bulkSaveCategories(newCats);
    await db.bulkSaveTeams(newTeams);
    await db.bulkSavePlayers(newPlayers);

    await loadDatabase();
    await switchDraft(newDraftId);
  };

  // Delete Draft
  const handleDeleteDraft = async (draftId: string) => {
    if (confirm('Are you sure you want to permanently delete this tournament draft?')) {
      await db.deleteDraft(draftId);
      await loadDatabase();
    }
  };

  // Execute Pick (Live Arena)
  const handleExecutePick = async (player: Player, team: Team, categoryId: string) => {
    if (!activeDraft) return;

    const now = Date.now();
    const newSequence = picks.length + 1;
    const pickId = `pick-${now}-${newSequence}`;

    const pickRecord: PickRecord = {
      id: pickId,
      draftId: activeDraft.id,
      sequence: newSequence,
      playerId: player.id,
      teamId: team.id,
      categoryId,
      createdAt: now,
    };

    const updatedPlayer: Player = {
      ...player,
      status: 'drafted',
      assignedTeamId: team.id,
      assignedCategoryId: categoryId,
      updatedAt: now,
    };

    // Update in DB
    await db.savePick(pickRecord);
    await db.savePlayer(updatedPlayer);

    // Update state
    setPicks((prev) => [...prev, pickRecord]);
    setPlayers((prev) => prev.map((p) => (p.id === player.id ? updatedPlayer : p)));

    // Update draft status to live if not already
    if (activeDraft.status !== 'live') {
      const updatedDraft: Draft = {
        ...activeDraft,
        status: 'live',
        startedAt: activeDraft.startedAt || now,
        updatedAt: now,
      };
      await db.saveDraft(updatedDraft);
      setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
    }
  };

  // Undo Latest Pick (Section 25)
  const handleUndoLatestPick = async () => {
    if (picks.length === 0) return;
    const latestPick = picks[picks.length - 1];

    const playerToRestore = players.find((p) => p.id === latestPick.playerId);
    if (playerToRestore) {
      const restoredPlayer: Player = {
        ...playerToRestore,
        status: 'available',
        assignedTeamId: undefined,
        assignedCategoryId: undefined,
        updatedAt: Date.now(),
      };
      await db.savePlayer(restoredPlayer);
      setPlayers((prev) => prev.map((p) => (p.id === restoredPlayer.id ? restoredPlayer : p)));
    }

    await db.deletePick(latestPick.id);
    setPicks((prev) => prev.slice(0, -1));
  };

  // Mark Draft Completed (Section 26)
  const handleCompleteDraft = async () => {
    if (!activeDraft) return;
    const updatedDraft: Draft = {
      ...activeDraft,
      status: 'completed',
      completedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.saveDraft(updatedDraft);
    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
  };

  // Update Settings
  const handleUpdateSettings = async (newSettings: DraftSettings, currentCatId?: string) => {
    if (!activeDraft) return;
    const updatedDraft: Draft = {
      ...activeDraft,
      settings: newSettings,
      currentCategoryId: currentCatId || activeDraft.currentCategoryId,
      updatedAt: Date.now(),
    };
    await db.saveDraft(updatedDraft);
    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
  };

  // Generic Save Draft (for logo, name, season, quota updates)
  const handleSaveDraft = async (updatedDraft: Draft) => {
    await db.saveDraft(updatedDraft);
    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
  };

  // Bulk Save Players
  const handleBulkSavePlayers = async (updatedPlayers: Player[]) => {
    await db.bulkSavePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
  };

  // Update Active Category in Live Draft
  const handleUpdateDraftCategory = async (categoryId: string) => {
    if (!activeDraft) return;
    const updatedDraft: Draft = {
      ...activeDraft,
      currentCategoryId: categoryId,
      updatedAt: Date.now(),
    };
    await db.saveDraft(updatedDraft);
    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
  };

  // Export Backup JSON
  const handleExportBackup = async (draftIdToExport?: string) => {
    const id = draftIdToExport || activeDraftId;
    if (!id) return;
    const data = await db.exportFullDraft(id);
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', jsonStr);
    dl.setAttribute('download', `BPL_Season2_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
  };

  // Trigger Backup File Select
  const handleTriggerImportBackup = () => {
    fileInputRef.current?.click();
  };

  // Handle Backup JSON File Selected
  const handleFileImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.draft || !parsed.players || !parsed.teams) {
          alert('Invalid BPL backup JSON file structure.');
          return;
        }

        if (confirm(`Import draft "${parsed.draft.name}" with ${parsed.players.length} players?`)) {
          await db.importFullDraft(parsed);
          await loadDatabase();
          await switchDraft(parsed.draft.id);
          alert('Tournament backup successfully restored!');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Clear All Data
  const handleClearAllData = async () => {
    await db.clearAllData();
    await loadDatabase();
    setCurrentView('dashboard');
  };

  if (isLoading && drafts.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#061A36] text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1283E6]" />
        <div className="text-center">
          <h2 className="text-lg font-bold tracking-tight">Brothers Premier League Season-2</h2>
          <p className="text-xs text-slate-400 mt-1">Initializing IndexedDB Player Lottery Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1F2937] flex flex-col font-['Poppins',sans-serif]">
      {/* Hidden File Input for JSON Backup Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileImportBackup}
      />

      {/* Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:pl-[64px]' : 'md:pl-[204px]'
        }`}
      >
        {/* Top Header */}
        <Header
          draft={activeDraft}
          stats={stats}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          onOpenMobileSidebar={() => setMobileMenuOpen(true)}
          onNavigateToLive={() => setCurrentView('live')}
          onNavigateToResults={() => setCurrentView('results')}
          onSaveDraft={handleSaveDraft}
          onOpenDraftPoolModal={() => setIsGlobalPoolModalOpen(true)}
        />

        {/* View Page Router */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              drafts={drafts}
              activeDraft={activeDraft}
              stats={stats}
              teams={teams}
              players={players}
              onSelectDraft={(id) => switchDraft(id)}
              onCreateNewDraft={handleCreateNewDraft}
              onLoadSampleData={handleLoadSampleData}
              onImportBackup={handleTriggerImportBackup}
              onExportDraft={handleExportBackup}
              onDuplicateDraft={handleDuplicateDraft}
              onDeleteDraft={handleDeleteDraft}
              onNavigateToLive={() => setCurrentView('live')}
              onNavigateToResults={() => setCurrentView('results')}
              onNavigateToPlayers={() => setCurrentView('players')}
              onNavigateToTeams={() => setCurrentView('teams')}
            />
          )}

          {currentView === 'players' && (
            <PlayersView
              players={players}
              categories={categories}
              teams={teams}
              activeDraftId={activeDraftId || 'bpl-main'}
              onSavePlayer={async (p) => {
                await db.savePlayer(p);
                setPlayers((prev) => {
                  const idx = prev.findIndex((item) => item.id === p.id);
                  if (idx !== -1) {
                    const copy = [...prev];
                    copy[idx] = p;
                    return copy;
                  }
                  return [p, ...prev];
                });
              }}
              onBulkSavePlayers={async (newPlayers) => {
                await db.bulkSavePlayers(newPlayers);
                setPlayers((prev) => [...newPlayers, ...prev]);
              }}
              onDeletePlayer={async (pId) => {
                await db.deletePlayer(pId);
                setPlayers((prev) => prev.filter((p) => p.id !== pId));
              }}
            />
          )}

          {currentView === 'teams' && (
            <TeamsView
              teams={teams}
              categories={categories}
              players={players}
              activeDraftId={activeDraftId || 'bpl-main'}
              onSaveTeam={async (t) => {
                await db.saveTeam(t);
                setTeams((prev) => {
                  const idx = prev.findIndex((item) => item.id === t.id);
                  if (idx !== -1) {
                    const copy = [...prev];
                    copy[idx] = t;
                    return copy;
                  }
                  return [...prev, t];
                });
              }}
              onDeleteTeam={async (tId) => {
                await db.deleteTeam(tId);
                setTeams((prev) => prev.filter((t) => t.id !== tId));
              }}
            />
          )}

          {currentView === 'categories' && (
            <CategoriesView
              categories={categories}
              activeDraftId={activeDraftId || 'bpl-main'}
              onSaveCategory={async (c) => {
                await db.saveCategory(c);
                setCategories((prev) => {
                  const idx = prev.findIndex((item) => item.id === c.id);
                  if (idx !== -1) {
                    const copy = [...prev];
                    copy[idx] = c;
                    return copy;
                  }
                  return [...prev, c];
                });
              }}
              onBulkSaveCategories={async (newCats) => {
                await db.bulkSaveCategories(newCats);
                setCategories(newCats);
              }}
              onDeleteCategory={async (cId) => {
                await db.deleteCategory(cId);
                setCategories((prev) => prev.filter((c) => c.id !== cId));
              }}
            />
          )}

          {currentView === 'setup' && activeDraft && (
            <DraftSetupView
              draft={activeDraft}
              teams={teams}
              players={players}
              categories={categories}
              onUpdateDraftSettings={handleUpdateSettings}
              onStartDraft={() => setCurrentView('live')}
            />
          )}

          {currentView === 'live' && activeDraft && (
            <LiveDraftView
              draft={activeDraft}
              teams={teams}
              players={players}
              categories={categories}
              picks={picks}
              onExecutePick={handleExecutePick}
              onUndoLatestPick={handleUndoLatestPick}
              onUpdateDraftCategory={handleUpdateDraftCategory}
              onCompleteDraft={handleCompleteDraft}
              onNavigateToResults={() => setCurrentView('results')}
              onNavigateToHistory={() => setCurrentView('history')}
              onSaveDraft={handleSaveDraft}
              onBulkSavePlayers={handleBulkSavePlayers}
            />
          )}

          {currentView === 'history' && (
            <DraftHistoryView
              picks={picks}
              players={players}
              teams={teams}
              categories={categories}
              onUndoLatestPick={handleUndoLatestPick}
              onNavigateToLive={() => setCurrentView('live')}
            />
          )}

          {currentView === 'results' && activeDraft && (
            <FinalResultsView
              draft={activeDraft}
              teams={teams}
              players={players}
              categories={categories}
              onExportJson={() => handleExportBackup()}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              draft={activeDraft}
              onUpdateSettings={handleUpdateSettings}
              onExportBackup={() => handleExportBackup()}
              onImportBackup={handleTriggerImportBackup}
              onResetToSampleData={handleLoadSampleData}
              onClearAllData={handleClearAllData}
            />
          )}
        </main>
      </div>

      {/* Global Draft Pool Selection Modal */}
      {isGlobalPoolModalOpen && (
        <DraftPoolModal
          isOpen={isGlobalPoolModalOpen}
          onClose={() => setIsGlobalPoolModalOpen(false)}
          players={players}
          categories={categories}
          teams={teams}
          onUpdateDraftPool={async (playerIdsToInclude) => {
            const set = new Set(playerIdsToInclude);
            const updated = players.map((p) => ({
              ...p,
              inDraftPool: set.has(p.id),
              updatedAt: Date.now(),
            }));
            await handleBulkSavePlayers(updated);
          }}
        />
      )}
    </div>
  );
}
