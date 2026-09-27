import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
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
import { CreateDraftModal } from './components/CreateDraftModal';
import { Loader2 } from 'lucide-react';
import { testFirestoreConnection } from './lib/firebase';
import { firebaseDb } from './lib/firebaseDb';
import { AppUser } from './types';
import { authService } from './lib/authService';
import { sanitizePlayerBangla } from './lib/cleanUtils';
import { DEFAULT_BPL_LOGO } from './lib/imageUtils';

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
  const [isCreateDraftModalOpen, setIsCreateDraftModalOpen] = useState<boolean>(false);

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

  // Force manual scroll restoration so browsers/iframes do not retain or restore previous scroll
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Universal instant scroll to top across window, html, body, root, and main
  const resetScrollPosition = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0;
      document.scrollingElement.scrollLeft = 0;
    }
    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.scrollTop = 0;
      rootEl.scrollLeft = 0;
    }
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
      mainEl.scrollLeft = 0;
    }
  }, []);

  // Synchronous Layout Effect: Runs before the browser paints the new view
  useLayoutEffect(() => {
    resetScrollPosition();

    // 1st animation frame
    const raf1 = requestAnimationFrame(() => {
      resetScrollPosition();
    });

    // 2nd animation frame (after full DOM reconciliation and repaint)
    const raf2 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resetScrollPosition();
      });
    });

    // Fallback timer for any async image or font layout stabilization
    const timer = setTimeout(() => {
      resetScrollPosition();
    }, 25);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
    };
  }, [currentView, activeDraftId, resetScrollPosition]);

  // Unified fast navigation handler
  const navigateToView = useCallback((view: NavView) => {
    resetScrollPosition();
    setCurrentView(view);
  }, [resetScrollPosition]);

  // Sync sidebar collapse to localStorage
  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('bpl_sidebar_collapsed', String(next));
      return next;
    });
  };

  // 1. Initial Load from IndexedDB (Instant Cache-First ~10ms) & Background Cloud Sync
  const loadDatabase = useCallback(async () => {
    try {
      setIsLoading(true);
      const officialSeedKey = 'bpl_seeded_v8_season2_final_roster_60';

      // --- PHASE 1: INSTANT LOCAL LOAD (IndexedDB ~5-15ms) ---
      const allDrafts = await db.getAllDrafts();

      if (allDrafts.length > 0) {
        setDrafts(allDrafts);
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
        setIsLoading(false); // <--- UNBLOCK UI IMMEDIATELY! NO WAITING FOR NETWORK!
      } else {
        // First-time visit: seed sample data directly in memory & local storage in 10ms!
        const sample = createSampleDraftData();
        await Promise.all([
          db.saveDraft(sample.draft),
          db.bulkSaveCategories(sample.categories),
          db.bulkSaveTeams(sample.teams),
          db.bulkSavePlayers(sample.players),
          db.bulkSavePicks(sample.picks),
        ]);
        localStorage.setItem(officialSeedKey, 'true');

        setDrafts([sample.draft]);
        setActiveDraftId(sample.draft.id);
        setCategories(sample.categories);
        setTeams(sample.teams);
        setPlayers(sample.players);
        setPicks(sample.picks);
        setIsLoading(false); // <--- UNBLOCK UI IMMEDIATELY!

        // Background seed cloud
        Promise.all([
          firebaseDb.saveDraft(sample.draft, 'superadmin-arif'),
          firebaseDb.saveCategories(sample.categories, 'superadmin-arif'),
          firebaseDb.saveTeams(sample.teams, 'superadmin-arif'),
          firebaseDb.savePlayers(sample.players, 'superadmin-arif'),
          ...sample.picks.map((pk) => firebaseDb.savePick(pk, 'superadmin-arif')),
        ]).catch(() => {});
      }

      // --- PHASE 2: NON-BLOCKING ASYNC CLOUD REVALIDATION ---
      setTimeout(async () => {
        try {
          const cloudDrafts = await firebaseDb.getAllDrafts();
          if (cloudDrafts && cloudDrafts.length > 0) {
            const selectedCloudDraft =
              cloudDrafts.find((d) => d.id === 'bpl-season-2-official') || cloudDrafts[0];
            const [cPlayers, cTeams, cCats, cPicks] = await Promise.all([
              firebaseDb.getPlayers(selectedCloudDraft.id),
              firebaseDb.getTeams(selectedCloudDraft.id),
              firebaseDb.getCategories(selectedCloudDraft.id),
              firebaseDb.getPicks(selectedCloudDraft.id),
            ]);

            if (cPlayers && cPlayers.length >= 20) {
              setDrafts(cloudDrafts);
              setActiveDraftId(selectedCloudDraft.id);
              setCategories(cCats);
              setTeams(cTeams);
              setPlayers(cPlayers);
              setPicks(cPicks);

              // Persist locally in background
              Promise.all([
                db.saveDraft(selectedCloudDraft),
                db.bulkSaveCategories(cCats),
                db.bulkSaveTeams(cTeams),
                db.bulkSavePlayers(cPlayers),
                db.bulkSavePicks(cPicks),
              ]).catch(() => {});
            }
          }
        } catch (cloudErr) {
          console.warn('Background cloud revalidation note:', cloudErr);
        }
      }, 50);
    } catch (err) {
      console.error('Failed to initialize database:', err);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  // Real-time Firestore subscriptions: ANY change by Superadmin propagates instantly to the whole website!
  useEffect(() => {
    if (!activeDraftId) return;

    let unsubDraft: (() => void) | undefined;
    let unsubTeams: (() => void) | undefined;
    let unsubPlayers: (() => void) | undefined;
    let unsubCategories: (() => void) | undefined;
    let unsubPicks: (() => void) | undefined;

    try {
      unsubDraft = firebaseDb.subscribeDraft(activeDraftId, (updatedDraft) => {
        if (!updatedDraft) return;
        setDrafts((prev) => {
          const existing = prev.find((d) => d.id === updatedDraft.id);
          if (
            existing &&
            existing.name === updatedDraft.name &&
            existing.season === updatedDraft.season &&
            existing.logoUrl === updatedDraft.logoUrl &&
            existing.status === updatedDraft.status &&
            existing.currentCategoryId === updatedDraft.currentCategoryId &&
            existing.updatedAt === updatedDraft.updatedAt
          ) {
            return prev;
          }
          const exists = prev.some((d) => d.id === updatedDraft.id);
          return exists ? prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)) : [updatedDraft, ...prev];
        });
        db.saveDraft(updatedDraft).catch(() => {});
      });

      unsubTeams = firebaseDb.subscribeTeams(activeDraftId, (cloudTeams) => {
        if (!cloudTeams || cloudTeams.length === 0) return;
        setTeams((prev) => {
          if (prev.length === cloudTeams.length) {
            let isIdentical = true;
            for (let i = 0; i < cloudTeams.length; i++) {
              if (
                prev[i]?.id !== cloudTeams[i]?.id ||
                prev[i]?.captainPlayerId !== cloudTeams[i]?.captainPlayerId ||
                prev[i]?.name !== cloudTeams[i]?.name ||
                prev[i]?.primaryColor !== cloudTeams[i]?.primaryColor ||
                prev[i]?.logoUrl !== cloudTeams[i]?.logoUrl ||
                prev[i]?.maxPlayers !== cloudTeams[i]?.maxPlayers
              ) {
                isIdentical = false;
                break;
              }
            }
            if (isIdentical) return prev;
          }
          db.bulkSaveTeams(cloudTeams).catch(() => {});
          return cloudTeams;
        });
      });

      unsubPlayers = firebaseDb.subscribePlayers(activeDraftId, (cloudPlayers) => {
        if (!cloudPlayers || cloudPlayers.length === 0) return;
        setPlayers((prev) => {
          if (prev.length === cloudPlayers.length) {
            let isIdentical = true;
            for (let i = 0; i < cloudPlayers.length; i++) {
              const cp = cloudPlayers[i];
              const pp = prev[i];
              if (
                !pp ||
                pp.id !== cp.id ||
                pp.status !== cp.status ||
                pp.assignedTeamId !== cp.assignedTeamId ||
                pp.assignedCategoryId !== cp.assignedCategoryId ||
                pp.inDraftPool !== cp.inDraftPool ||
                pp.fullName !== cp.fullName ||
                pp.photoUrl !== cp.photoUrl ||
                pp.updatedAt !== cp.updatedAt
              ) {
                isIdentical = false;
                break;
              }
            }
            if (isIdentical) return prev;
          }
          const sanitizedCloudPlayers = cloudPlayers.map(sanitizePlayerBangla);
          db.bulkSavePlayers(sanitizedCloudPlayers).catch(() => {});
          return sanitizedCloudPlayers;
        });
      });

      unsubCategories = firebaseDb.subscribeCategories(activeDraftId, (cloudCats) => {
        if (!cloudCats || cloudCats.length === 0) return;
        setCategories((prev) => {
          if (prev.length === cloudCats.length) {
            let isIdentical = true;
            for (let i = 0; i < cloudCats.length; i++) {
              if (
                prev[i]?.id !== cloudCats[i]?.id ||
                prev[i]?.name !== cloudCats[i]?.name ||
                prev[i]?.order !== cloudCats[i]?.order ||
                prev[i]?.color !== cloudCats[i]?.color ||
                prev[i]?.active !== cloudCats[i]?.active
              ) {
                isIdentical = false;
                break;
              }
            }
            if (isIdentical) return prev;
          }
          db.bulkSaveCategories(cloudCats).catch(() => {});
          return cloudCats;
        });
      });

      unsubPicks = firebaseDb.subscribePicks(activeDraftId, (cloudPicks) => {
        if (!cloudPicks) return;
        setPicks((prev) => {
          if (prev.length === cloudPicks.length) {
            let isIdentical = true;
            for (let i = 0; i < cloudPicks.length; i++) {
              if (
                prev[i]?.id !== cloudPicks[i]?.id ||
                prev[i]?.sequence !== cloudPicks[i]?.sequence ||
                prev[i]?.playerId !== cloudPicks[i]?.playerId ||
                prev[i]?.teamId !== cloudPicks[i]?.teamId
              ) {
                isIdentical = false;
                break;
              }
            }
            if (isIdentical) return prev;
          }
          db.bulkSavePicks(cloudPicks).catch(() => {});
          return cloudPicks;
        });
      });
    } catch (err) {
      console.warn('Real-time subscription listener note:', err);
    }

    return () => {
      unsubDraft?.();
      unsubTeams?.();
      unsubPlayers?.();
      unsubCategories?.();
      unsubPicks?.();
    };
  }, [activeDraftId]);

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

      const targetDraft = drafts.find((d) => d.id === draftId);
      if (targetDraft) {
        localStorage.setItem('bpl_active_tournament_logo', targetDraft.logoUrl || DEFAULT_BPL_LOGO);
        localStorage.setItem('bpl_active_tournament_name', targetDraft.name);
        localStorage.setItem('bpl_active_tournament_season', targetDraft.season || 'Season-2');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const activeDraft = useMemo(() => {
    return drafts.find((d) => d.id === activeDraftId) || null;
  }, [drafts, activeDraftId]);

  // Visible drafted players and picks reflecting the official completed tournament
  const effectivePlayers = useMemo(() => {
    return players;
  }, [players]);

  const effectivePicks = useMemo(() => {
    return picks;
  }, [picks]);

  // Computed Stats
  const stats: DraftStats = useMemo(() => {
    const totalPlayers = effectivePlayers.length;
    const poolPlayersCount = effectivePlayers.filter((p) => p.inDraftPool !== false).length;
    const draftedPlayers = effectivePlayers.filter((p) => p.status === 'drafted').length;
    const remainingPlayers = totalPlayers - draftedPlayers;
    const totalTeams = teams.length;
    const totalCategories = categories.length;

    const totalRequired = teams.reduce((acc, t) => {
      return acc + (t.maxPlayers || 11);
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
  }, [effectivePlayers, teams, categories]);

  // --- ACTIONS ---

  // Open Create New Draft Dialog
  const handleOpenCreateDraftModal = () => {
    setIsCreateDraftModalOpen(true);
  };

  // Create New Draft with User's Logo and Selected Config
  const handleCreateDraftConfirmed = async (params: {
    name: string;
    season: string;
    logoUrl: string;
    slogan?: string;
    subSlogan?: string;
    importPlayers: boolean;
    importTeams: boolean;
    importCategories: boolean;
  }) => {
    const now = Date.now();
    const newDraftId = `draft-${now}`;
    const sample = createSampleDraftData();

    // 1. Categories
    let newCategories: Category[] = [];
    if (params.importCategories) {
      newCategories = sample.categories.map((c) => ({
        ...c,
        id: `cat-${now}-${c.order}`,
        draftId: newDraftId,
        createdAt: now,
        updatedAt: now,
      }));
    }

    // 2. Teams
    let newTeams: Team[] = [];
    if (params.importTeams) {
      newTeams = sample.teams.map((t) => ({
        ...t,
        id: `team-${now}-${t.id}`,
        draftId: newDraftId,
        createdAt: now,
        updatedAt: now,
      }));
    }

    // 3. Players
    let newPlayers: Player[] = [];
    if (params.importPlayers) {
      newPlayers = sample.players.map((p, idx) => {
        const origCat = sample.categories.find((c) => c.id === p.primaryCategoryId);
        const matchedTargetCat = newCategories.find(
          (c) => origCat && c.name.toLowerCase().trim() === origCat.name.toLowerCase().trim()
        );
        const targetCategoryId = matchedTargetCat ? matchedTargetCat.id : newCategories[0]?.id || '';

        return {
          ...p,
          id: `player-${now}-${idx}-${p.jerseyNumber || '00'}`,
          draftId: newDraftId,
          primaryCategoryId: targetCategoryId,
          assignedTeamId: undefined,
          assignedCategoryId: undefined,
          status: 'available' as const,
          inDraftPool: true,
          createdAt: now,
          updatedAt: now,
        };
      });
    }

    // 4. Draft Object
    const newDraft: Draft = {
      id: newDraftId,
      name: params.name,
      season: params.season,
      logoUrl: params.logoUrl || DEFAULT_BPL_LOGO,
      slogan: params.slogan || "More Than a League It's a Family",
      subSlogan: params.subSlogan || 'Fair Play • Transparent • Stronger Teams',
      tagline: 'Play Together Win Together',
      status: 'setup',
      defaultPlayerQuota: 11,
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

    // Save to local IndexedDB
    await db.saveDraft(newDraft);
    if (newCategories.length > 0) await db.bulkSaveCategories(newCategories);
    if (newTeams.length > 0) await db.bulkSaveTeams(newTeams);
    if (newPlayers.length > 0) await db.bulkSavePlayers(newPlayers);

    // Persist in localStorage for instant preloader and website branding sync
    localStorage.setItem('bpl_last_draft_id', newDraftId);
    localStorage.setItem('bpl_active_draft_id', newDraftId);
    localStorage.setItem('bpl_active_tournament_logo', newDraft.logoUrl || DEFAULT_BPL_LOGO);
    localStorage.setItem('bpl_active_tournament_name', newDraft.name);
    localStorage.setItem('bpl_active_tournament_season', newDraft.season);

    // Sync to Firebase Cloud if logged in
    const actorId = currentUser?.id || 'superadmin-arif';
    Promise.all([
      firebaseDb.saveDraft(newDraft, actorId),
      newCategories.length > 0 ? firebaseDb.saveCategories(newCategories, actorId) : Promise.resolve(),
      newTeams.length > 0 ? firebaseDb.saveTeams(newTeams, actorId) : Promise.resolve(),
      newPlayers.length > 0 ? firebaseDb.savePlayers(newPlayers, actorId) : Promise.resolve(),
    ]).catch((err) => console.warn('Firebase draft creation sync warning:', err));

    // Update React State immediately
    setDrafts((prev) => [newDraft, ...prev]);
    setActiveDraftId(newDraftId);
    setCategories(newCategories);
    setTeams(newTeams);
    setPlayers(newPlayers);
    setPicks([]);

    navigateToView('dashboard');
  };

  // Reload Sample BPL Season-2 dataset
  const handleLoadSampleData = async () => {
    if (confirm('Load fresh BPL Season-2 demo tournament data? This will add or reset the sample tournament.')) {
      const sample = createSampleDraftData();
      await db.saveDraft(sample.draft);
      await db.bulkSaveCategories(sample.categories);
      await db.bulkSaveTeams(sample.teams);
      await db.bulkSavePlayers(sample.players);
      await db.bulkSavePicks(sample.picks);

      await loadDatabase();
      await switchDraft(sample.draft.id);
      navigateToView('results');
    }
  };

  // Reset Categories & Roster to Official Tournament Photo Defaults
  const handleResetToOfficialDefaults = async () => {
    const sample = createSampleDraftData();
    await db.saveDraft(sample.draft);
    await db.bulkSaveCategories(sample.categories);
    await db.bulkSaveTeams(sample.teams);
    await db.bulkSavePlayers(sample.players);
    await db.bulkSavePicks(sample.picks);
    localStorage.setItem('bpl_seeded_v8_season2_final_roster_60', 'true');

    setDrafts([sample.draft]);
    setActiveDraftId(sample.draft.id);
    setCategories(sample.categories);
    setTeams(sample.teams);
    setPlayers(sample.players);
    setPicks(sample.picks);

    if (currentUser) {
      await Promise.all([
        firebaseDb.saveDraft(sample.draft, currentUser.id),
        firebaseDb.saveCategories(sample.categories, currentUser.id),
        firebaseDb.saveTeams(sample.teams, currentUser.id),
        firebaseDb.savePlayers(sample.players, currentUser.id),
        ...sample.picks.map((pk) => firebaseDb.savePick(pk, currentUser.id)),
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

    // Sync to Cloud Firebase Firestore immediately so all devices update in real-time
    const actorId = currentUser?.id || 'superadmin-arif';
    Promise.all([
      firebaseDb.savePick(pickRecord, actorId),
      firebaseDb.saveSinglePlayer(updatedPlayer, actorId),
    ]).catch((err) => console.warn('Firebase pick sync error:', err));

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
      firebaseDb.saveDraft(updatedDraft, actorId).catch((err) => console.warn(err));
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
    const actorId = currentUser?.id || 'superadmin-arif';
    Promise.all([
      firebaseDb.deletePick(latestPick.id),
      restoredPlayer ? firebaseDb.saveSinglePlayer(restoredPlayer, actorId) : Promise.resolve(),
    ]).catch((err) => console.warn('Firebase undo sync error:', err));

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
    const actorId = currentUser?.id || 'superadmin-arif';
    firebaseDb.saveDraft(updatedDraft, actorId).catch((err) => console.warn(err));
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
    const actorId = currentUser?.id || 'superadmin-arif';
    firebaseDb.saveDraft(updatedDraft, actorId).catch((err) => console.warn(err));
    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
  };

  // Generic Save Draft (for logo, name, season, quota updates)
  const handleSaveDraft = async (updatedDraft: Draft) => {
    await db.saveDraft(updatedDraft);
    setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));

    if (updatedDraft.id === activeDraftId) {
      localStorage.setItem('bpl_active_tournament_logo', updatedDraft.logoUrl || DEFAULT_BPL_LOGO);
      localStorage.setItem('bpl_active_tournament_name', updatedDraft.name);
      localStorage.setItem('bpl_active_tournament_season', updatedDraft.season || 'Season-2');
    }

    const actorId = currentUser?.id || 'superadmin-arif';
    firebaseDb.saveDraft(updatedDraft, actorId).catch((err) => {
      console.warn('Background cloud draft sync note:', err);
    });
  };

  // Bulk Save Players
  const handleBulkSavePlayers = async (updatedPlayers: Player[]) => {
    await db.bulkSavePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
    const actorId = currentUser?.id || 'superadmin-arif';
    firebaseDb.savePlayers(updatedPlayers, actorId).catch((err) => {
      console.warn('Background cloud players sync note:', err);
    });
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
    navigateToView('dashboard');
  };

  if (isLoading && drafts.length === 0) {
    const preloaderLogo =
      activeDraft?.logoUrl ||
      localStorage.getItem('bpl_active_tournament_logo') ||
      DEFAULT_BPL_LOGO;
    const preloaderSeason =
      activeDraft?.season ||
      localStorage.getItem('bpl_active_tournament_season') ||
      'Season-2';
    const preloaderName =
      activeDraft?.name ||
      localStorage.getItem('bpl_active_tournament_name') ||
      'Brothers Premier League';

    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#061A36] text-white p-6 select-none">
        {/* Logo Container with Glowing Aura */}
        <div className="relative mb-6">
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-[#1283E6] via-[#FF7A2E] to-[#F59F00] opacity-40 blur-xl animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-b from-[#0A244A] to-[#041226] border-2 border-slate-700/80 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
            <img
              src={preloaderLogo}
              alt="Tournament Logo"
              className="w-full h-full object-contain filter drop-shadow-md animate-pulse"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Loading Spinner & Season Badge */}
        <div className="flex items-center gap-2.5 mb-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#1283E6]" />
          <span className="text-xs font-black text-[#FF7A2E] uppercase tracking-widest">
            {preloaderSeason}
          </span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-white drop-shadow-sm">
            {preloaderName}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Initializing IndexedDB Player Lottery Engine...
          </p>
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
        onSelectView={navigateToView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        draft={activeDraft}
        onSaveDraft={handleSaveDraft}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:pl-[64px]' : 'md:pl-[210px]'
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
          onNavigateToLive={() => navigateToView('live')}
          onNavigateToResults={() => navigateToView('results')}
          onSaveDraft={handleSaveDraft}
          onOpenDraftPoolModal={() => setIsGlobalPoolModalOpen(true)}
        />

        {/* View Page Router */}
        <main
          key={currentView}
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
              players={effectivePlayers}
              currentUser={currentUser}
              isCloudConnected={isCloudConnected}
              isSyncing={isSyncingToCloud}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpenSuperadminPortal={() => setIsSuperadminPortalOpen(true)}
              onSyncToCloud={handleSyncToCloud}
              onSelectDraft={(id) => switchDraft(id)}
              onCreateNewDraft={handleOpenCreateDraftModal}
              onLoadSampleData={handleLoadSampleData}
              onImportBackup={handleTriggerImportBackup}
              onExportDraft={handleExportBackup}
              onDuplicateDraft={handleDuplicateDraft}
              onDeleteDraft={handleDeleteDraft}
              onNavigateToLive={() => navigateToView('live')}
              onNavigateToResults={() => navigateToView('results')}
              onNavigateToPlayers={() => navigateToView('players')}
              onNavigateToTeams={() => navigateToView('teams')}
            />
          )}

          {currentView === 'players' && (
            <PlayersView
              players={effectivePlayers}
              categories={categories}
              teams={teams}
              activeDraftId={activeDraftId || 'bpl-main'}
              currentUser={currentUser}
              onSavePlayer={async (p) => {
                await db.savePlayer(p);
                const actorId = currentUser?.id || 'superadmin-arif';
                firebaseDb.saveSinglePlayer(p, actorId).catch((err) => console.warn('Cloud player save note:', err));
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
                const actorId = currentUser?.id || 'superadmin-arif';
                firebaseDb.savePlayers(newPlayers, actorId).catch((err) => console.warn('Cloud bulk players note:', err));
                setPlayers((prev) => {
                  const map = new Map(prev.map((p) => [p.id, p]));
                  for (const p of newPlayers) map.set(p.id, p);
                  return Array.from(map.values());
                });
              }}
              onDeletePlayer={async (pId) => {
                await db.deletePlayer(pId);
                firebaseDb.deletePlayer(pId).catch((err) => console.warn('Cloud delete player note:', err));
                setPlayers((prev) => prev.filter((p) => p.id !== pId));
              }}
            />
          )}

          {currentView === 'teams' && (
            <TeamsView
              teams={teams}
              categories={categories}
              players={effectivePlayers}
              activeDraftId={activeDraftId || 'bpl-main'}
              currentUser={currentUser}
              onSaveTeam={async (t) => {
                const prevTeam = teams.find((item) => item.id === t.id);
                const oldCaptainId = prevTeam?.captainPlayerId;
                const newCaptainId = t.captainPlayerId;

                await db.saveTeam(t);
                const actorId = currentUser?.id || 'superadmin-arif';
                firebaseDb.saveSingleTeam(t, actorId).catch((err) => console.warn('Cloud team save note:', err));

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
                    firebaseDb.saveSinglePlayer(restoredOldCap, actorId).catch((err) => console.warn(err));
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
                    firebaseDb.saveSinglePlayer(updatedNewCap, actorId).catch((err) => console.warn(err));
                    setPlayers((prev) => prev.map((p) => (p.id === newCaptainId ? updatedNewCap : p)));
                  }
                }
              }}
              onBulkSaveTeams={async (newTeams) => {
                try {
                  await db.bulkSaveTeams(newTeams);
                } catch (err) {
                  console.warn('bulkSaveTeams IndexedDB error, saving individually:', err);
                  for (const t of newTeams) {
                    await db.saveTeam(t);
                  }
                }
                const actorId = currentUser?.id || 'superadmin-arif';
                firebaseDb.saveTeams(newTeams, actorId).catch((err) => console.warn(err));
                setTeams([...newTeams]);
              }}
              onDeleteTeam={async (tId) => {
                await db.deleteTeam(tId);
                firebaseDb.deleteTeam(tId).catch((err) => console.warn(err));
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
                const actorId = currentUser?.id || 'superadmin-arif';
                firebaseDb.saveSingleCategory(c, actorId).catch((err) => console.warn(err));
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
                const actorId = currentUser?.id || 'superadmin-arif';
                firebaseDb.saveCategories(newCats, actorId).catch((err) => console.warn(err));
                setCategories(newCats);
              }}
              onDeleteCategory={async (cId) => {
                await db.deleteCategory(cId);
                firebaseDb.deleteCategory(cId).catch((err) => console.warn(err));
                setCategories((prev) => prev.filter((c) => c.id !== cId));
              }}
              onResetToDefaults={handleResetToOfficialDefaults}
            />
          )}

          {currentView === 'setup' && activeDraft && (
            <DraftSetupView
              draft={activeDraft}
              teams={teams}
              players={effectivePlayers}
              categories={categories}
              onUpdateDraftSettings={handleUpdateSettings}
              onStartDraft={() => navigateToView('live')}
            />
          )}

          {currentView === 'live' && activeDraft && (
            <LiveDraftView
              draft={activeDraft}
              teams={teams}
              players={effectivePlayers}
              categories={categories}
              picks={effectivePicks}
              onExecutePick={handleExecutePick}
              onUndoLatestPick={handleUndoLatestPick}
              onUpdateDraftCategory={handleUpdateDraftCategory}
              onCompleteDraft={handleCompleteDraft}
              onNavigateToResults={() => navigateToView('results')}
              onNavigateToHistory={() => navigateToView('history')}
              onSaveDraft={handleSaveDraft}
              onBulkSavePlayers={handleBulkSavePlayers}
            />
          )}

          {currentView === 'history' && (
            <DraftHistoryView
              picks={effectivePicks}
              players={effectivePlayers}
              teams={teams}
              categories={categories}
              onUndoLatestPick={handleUndoLatestPick}
              onNavigateToLive={() => navigateToView('live')}
            />
          )}

          {currentView === 'results' && activeDraft && (
            <FinalResultsView
              draft={activeDraft}
              teams={teams}
              players={effectivePlayers}
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
          players={effectivePlayers}
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

      {/* Create New Tournament Draft Modal */}
      <CreateDraftModal
        isOpen={isCreateDraftModalOpen}
        onClose={() => setIsCreateDraftModalOpen(false)}
        onCreateDraft={handleCreateDraftConfirmed}
      />
    </div>
  );
}
