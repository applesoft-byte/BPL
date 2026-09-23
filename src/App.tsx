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
import { AuthModal } from './components/AuthModal';
import { SuperadminReferenceModal } from './components/SuperadminReferenceModal';
import { Loader2 } from 'lucide-react';
import { testFirestoreConnection } from './lib/firebase';
import { firebaseDb } from './lib/firebaseDb';
import { AppUser } from './types';
import { authService } from './lib/authService';

export default function App() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('bpl_sidebar_collapsed') === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isGlobalPoolModalOpen, setIsGlobalPoolModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSuperadminPortalOpen, setIsSuperadminPortalOpen] = useState<boolean>(false);

  // Mobile + Ref Number Auth & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => authService.getCurrentUser());
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [isSyncingToCloud, setIsSyncingToCloud] = useState<boolean>(false);

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

  // Check connection to Firestore and initialize reference numbers
  useEffect(() => {
    testFirestoreConnection().then((ok) => {
      setIsCloudConnected(ok);
    });

    authService.initReferenceNumbers().catch((err) => {
      console.warn('Init reference numbers note:', err);
    });
  }, []);

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
      const officialSeedKey = 'bpl_seeded_v7_rayhan_emon_61';

      if (allDrafts.length === 0 || localStorage.getItem(officialSeedKey) !== 'true') {
        // Initialize or update with official BPL Season-2 dataset matching tournament photo (10 English categories & mapped roster)
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

        // Remove old unregistered Ashik Mahmud if present in existing database so total roster is exactly 61 players
        const filteredDbPlayers = dbPlayers.filter((p) => {
          if (p.fullName === 'Ashik Mahmud') {
            db.deletePlayer(p.id).catch((err) => console.warn(err));
            return false;
          }
          return true;
        });

        // Ensure any player assigned as captain in a team is synced as drafted & assigned
        let playersNeedingUpdate = false;
        const updatedPlayersList = filteredDbPlayers.map((p) => {
          const team = dbTeams.find(
            (t) => t.captainPlayerId === p.id || (t.captainName && t.captainName.toLowerCase() === p.fullName.toLowerCase())
          );
          if (team) {
            if (p.assignedTeamId !== team.id || !p.isCaptain || p.status !== 'drafted') {
              playersNeedingUpdate = true;
              return {
                ...p,
                isCaptain: true,
                assignedTeamId: team.id,
                assignedCategoryId: p.assignedCategoryId || p.primaryCategoryId,
                status: 'drafted' as const,
                badge: 'CAPTAIN' as const,
                updatedAt: Date.now(),
              };
            }
          }
          return p;
        });

        // Also check if any existing player has 'Emon (Crown)' or 'Raihan Emon' and rename to 'Rayhan Emon'
        let emonRenamed = false;
        const mappedPlayers = updatedPlayersList.map((p) => {
          if (p.fullName === 'Emon (Crown)' || p.fullName === 'Raihan Emon') {
            emonRenamed = true;
            return {
              ...p,
              fullName: 'Rayhan Emon',
              battingStyle: 'Right Handed' as const,
              bowlingStyle: 'Left Arm Spinner',
              playerType: 'Right Handed • Left Arm Spinner',
              notes: 'Bangla: রায়হান ইমন | Batsman Level-01',
              updatedAt: Date.now(),
            };
          }
          return p;
        });

        if (playersNeedingUpdate || emonRenamed || filteredDbPlayers.length !== dbPlayers.length) {
          await db.bulkSavePlayers(mappedPlayers);
          setPlayers(mappedPlayers);
        } else {
          setPlayers(dbPlayers);
        }

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

  // Reset Categories & Roster to Official Tournament Photo Defaults
  const handleResetToOfficialDefaults = async () => {
    const sample = createSampleDraftData();
    await db.saveDraft(sample.draft);
    await db.bulkSaveCategories(sample.categories);
    await db.bulkSaveTeams(sample.teams);
    await db.bulkSavePlayers(sample.players);
    localStorage.setItem('bpl_seeded_v7_rayhan_emon_61', 'true');

    setDrafts([sample.draft]);
    setActiveDraftId(sample.draft.id);
    setCategories(sample.categories);
    setTeams(sample.teams);
    setPlayers(sample.players);
    setPicks([]);

    if (currentUser) {
      await Promise.all([
        firebaseDb.saveDraft(sample.draft, currentUser.id),
        firebaseDb.saveCategories(sample.categories, currentUser.id),
        firebaseDb.saveTeams(sample.teams, currentUser.id),
        firebaseDb.savePlayers(sample.players, currentUser.id),
      ]).catch((err) => console.warn('Firebase sync error on reset:', err));
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

    // Sync to Cloud Firebase if logged in
    if (currentUser) {
      Promise.all([
        firebaseDb.savePick(pickRecord, currentUser.id),
        firebaseDb.savePlayers([updatedPlayer], currentUser.id),
      ]).catch((err) => console.warn('Firebase pick sync error:', err));
    }

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
      if (currentUser) {
        firebaseDb.saveDraft(updatedDraft, currentUser.id).catch((err) => console.warn(err));
      }
      setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
    }
  };

  // Undo Latest Pick (Section 25)
  const handleUndoLatestPick = async () => {
    if (picks.length === 0) return;
    const latestPick = picks[picks.length - 1];

    const playerToRestore = players.find((p) => p.id === latestPick.playerId);
    let restoredPlayer: Player | undefined;
    if (playerToRestore) {
      restoredPlayer = {
        ...playerToRestore,
        status: 'available',
        assignedTeamId: undefined,
        assignedCategoryId: undefined,
        updatedAt: Date.now(),
      };
      await db.savePlayer(restoredPlayer);
      setPlayers((prev) => prev.map((p) => (p.id === restoredPlayer!.id ? restoredPlayer! : p)));
    }

    await db.deletePick(latestPick.id);
    if (currentUser) {
      Promise.all([
        firebaseDb.deletePick(latestPick.id),
        restoredPlayer ? firebaseDb.savePlayers([restoredPlayer], currentUser.id) : Promise.resolve(),
      ]).catch((err) => console.warn('Firebase undo sync error:', err));
    }
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
    if (currentUser) {
      firebaseDb.saveDraft(updatedDraft, currentUser.id).catch((err) => {
        console.warn('Background cloud draft sync note:', err);
      });
    }
  };

  // Bulk Save Players
  const handleBulkSavePlayers = async (updatedPlayers: Player[]) => {
    await db.bulkSavePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
    if (currentUser) {
      firebaseDb.savePlayers(updatedPlayers, currentUser.id).catch((err) => {
        console.warn('Background cloud players sync note:', err);
      });
    }
  };

  // Sync full local dataset to Firebase Firestore Cloud
  const handleSyncToCloud = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!activeDraft) return;

    try {
      setIsSyncingToCloud(true);
      const uid = currentUser.id;
      await firebaseDb.saveDraft(activeDraft, uid);
      await firebaseDb.saveCategories(categories, uid);
      await firebaseDb.saveTeams(teams, uid);
      await firebaseDb.savePlayers(players, uid);
      for (const p of picks) {
        await firebaseDb.savePick(p, uid);
      }
      setIsCloudConnected(true);
    } catch (err) {
      console.error('Failed to sync to cloud:', err);
    } finally {
      setIsSyncingToCloud(false);
    }
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
          currentUser={currentUser}
          isCloudConnected={isCloudConnected}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenSuperadminPortal={() => setIsSuperadminPortalOpen(true)}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          onOpenMobileSidebar={() => setMobileMenuOpen(true)}
          onNavigateToLive={() => setCurrentView('live')}
          onNavigateToResults={() => setCurrentView('results')}
          onSaveDraft={handleSaveDraft}
          onOpenDraftPoolModal={() => setIsGlobalPoolModalOpen(true)}
        />

        {/* View Page Router */}
        <main
          className={`flex-1 w-full mx-auto ${
            currentView === 'live'
              ? 'p-2 sm:p-3 md:p-4 max-w-[1600px]'
              : 'p-4 md:p-6 lg:p-8 max-w-7xl'
          }`}
        >
          {currentView === 'dashboard' && (
            <DashboardView
              drafts={drafts}
              activeDraft={activeDraft}
              stats={stats}
              teams={teams}
              players={players}
              currentUser={currentUser}
              isCloudConnected={isCloudConnected}
              isSyncing={isSyncingToCloud}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpenSuperadminPortal={() => setIsSuperadminPortalOpen(true)}
              onSyncToCloud={handleSyncToCloud}
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
                if (currentUser) {
                  firebaseDb.savePlayers([p], currentUser.id).catch((err) => console.warn(err));
                }
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
                if (currentUser) {
                  firebaseDb.savePlayers(newPlayers, currentUser.id).catch((err) => console.warn(err));
                }
                setPlayers((prev) => [...newPlayers, ...prev]);
              }}
              onDeletePlayer={async (pId) => {
                await db.deletePlayer(pId);
                if (currentUser) {
                  firebaseDb.deletePlayer(pId).catch((err) => console.warn(err));
                }
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
                const prevTeam = teams.find((item) => item.id === t.id);
                const oldCaptainId = prevTeam?.captainPlayerId;
                const newCaptainId = t.captainPlayerId;

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

                // If captain was removed or changed, unassign old captain
                if (oldCaptainId && oldCaptainId !== newCaptainId) {
                  const oldCap = players.find((p) => p.id === oldCaptainId);
                  if (oldCap && !picks.some((pk) => pk.playerId === oldCaptainId)) {
                    const restoredOldCap: Player = {
                      ...oldCap,
                      isCaptain: false,
                      assignedTeamId: undefined,
                      assignedCategoryId: undefined,
                      status: 'available',
                      badge: 'ALL-ROUNDER',
                      updatedAt: Date.now(),
                    };
                    await db.savePlayer(restoredOldCap);
                    if (currentUser) {
                      firebaseDb.savePlayers([restoredOldCap], currentUser.id).catch((err) => console.warn(err));
                    }
                    setPlayers((prev) => prev.map((p) => (p.id === oldCaptainId ? restoredOldCap : p)));
                  }
                }

                // If new captain selected, assign to this team and mark as drafted
                if (newCaptainId) {
                  const newCap = players.find((p) => p.id === newCaptainId);
                  if (newCap) {
                    const updatedNewCap: Player = {
                      ...newCap,
                      isCaptain: true,
                      assignedTeamId: t.id,
                      assignedCategoryId: newCap.primaryCategoryId,
                      status: 'drafted',
                      badge: 'CAPTAIN',
                      updatedAt: Date.now(),
                    };
                    await db.savePlayer(updatedNewCap);
                    if (currentUser) {
                      firebaseDb.savePlayers([updatedNewCap], currentUser.id).catch((err) => console.warn(err));
                    }
                    setPlayers((prev) => prev.map((p) => (p.id === newCaptainId ? updatedNewCap : p)));
                  }
                }

                if (currentUser) {
                  firebaseDb.saveTeams([t], currentUser.id).catch((err) => console.warn(err));
                }
              }}
              onBulkSaveTeams={async (newTeams) => {
                await db.bulkSaveTeams(newTeams);
                if (currentUser) {
                  firebaseDb.saveTeams(newTeams, currentUser.id).catch((err) => console.warn(err));
                }
                setTeams(newTeams);
              }}
              onDeleteTeam={async (tId) => {
                await db.deleteTeam(tId);
                if (currentUser) {
                  firebaseDb.deleteTeam(tId).catch((err) => console.warn(err));
                }
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
                if (currentUser) {
                  firebaseDb.saveCategories([c], currentUser.id).catch((err) => console.warn(err));
                }
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
                if (currentUser) {
                  firebaseDb.saveCategories(newCats, currentUser.id).catch((err) => console.warn(err));
                }
                setCategories(newCats);
              }}
              onDeleteCategory={async (cId) => {
                await db.deleteCategory(cId);
                if (currentUser) {
                  firebaseDb.deleteCategory(cId).catch((err) => console.warn(err));
                }
                setCategories((prev) => prev.filter((c) => c.id !== cId));
              }}
              onResetToDefaults={handleResetToOfficialDefaults}
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

      {/* Superadmin Reference Numbers & Organizers Portal */}
      <SuperadminReferenceModal
        isOpen={isSuperadminPortalOpen}
        onClose={() => setIsSuperadminPortalOpen(false)}
        currentUser={currentUser}
      />

      {/* Organizer Auth Modal (Mobile + Reference Number + Password + OTP) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={(user) => setCurrentUser(user)}
        onOpenSuperadminPortal={() => setIsSuperadminPortalOpen(true)}
      />
    </div>
  );
}
