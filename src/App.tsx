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
import { Loader2, Trash2, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { testFirestoreConnection } from './lib/firebase';
import { firebaseDb } from './lib/firebaseDb';
import { AppUser } from './types';
import { authService } from './lib/authService';
import { sanitizePlayerBangla } from './lib/cleanUtils';
import { DEFAULT_BPL_LOGO } from './lib/imageUtils';

export const OFFICIAL_DRAFT_IDS = ['bpl-season-2-official', 'bpl-s2-main'];
export const isOfficialDraft = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return OFFICIAL_DRAFT_IDS.includes(id);
};

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

  // Unique identifier for current active user or guest session
  const currentUserId = useMemo(() => {
    return currentUser?.id || currentUser?.mobile || currentUser?.email || 'guest';
  }, [currentUser]);

  // Determine if active user is Superadmin (Arif Iquebal)
  // ONLY Superadmin changes can sync to Firebase Cloud to update the whole website!
  const isSuperadmin = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.role === 'superadmin' ||
      authService.isSuperadmin(currentUser.mobile || '') ||
      authService.isSuperadmin(currentUser.email || '')
    );
  }, [currentUser]);

  // Filter drafts so personal drafts are ONLY visible to their respective owner!
  // Official drafts are always visible to everyone.
  const filterDraftsForUser = useCallback(
    (draftList: Draft[]) => {
      return draftList.filter((d) => {
        // Official tournament draft is ALWAYS visible to every user and guest
        if (isOfficialDraft(d.id) || d.isOfficial) return true;

        // If a registered user is logged in:
        if (currentUser) {
          if (d.ownerId) {
            return (
              d.ownerId === currentUser.id ||
              (currentUser.mobile && d.ownerId === currentUser.mobile) ||
              (currentUser.email && d.ownerId.toLowerCase() === currentUser.email.toLowerCase())
            );
          }
          // Legacy unassigned drafts only visible to superadmin
          return isSuperadmin;
        }

        // If guest user:
        // Guest only sees official drafts and drafts created in this session as guest
        return d.ownerId === 'guest';
      });
    },
    [currentUser, isSuperadmin]
  );

  // App-level Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Delete Draft Confirmation Modal State
  const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);
  const [isDeletingDraft, setIsDeletingDraft] = useState<boolean>(false);

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

  // Helper to check if a roster has corrupted player assignments (>10 players in any team)
  const isRosterCorrupted = useCallback((playerList: Player[]) => {
    if (!playerList || playerList.length === 0) return false;
    const counts: Record<string, number> = {};
    for (const p of playerList) {
      if (p.assignedTeamId) {
        counts[p.assignedTeamId] = (counts[p.assignedTeamId] || 0) + 1;
        if (counts[p.assignedTeamId] > 10) return true;
      }
    }
    return false;
  }, []);

  // 1. Initial Load from IndexedDB (Instant Cache-First ~10ms) & Background Cloud Sync
  const loadDatabase = useCallback(async () => {
    try {
      setIsLoading(true);
      const officialRosterKey = 'bpl_seeded_v10_season2_roster_10_players_fixed';

      // --- PHASE 1: INSTANT LOCAL LOAD (IndexedDB ~5-15ms) ---
      const rawLocalDrafts = await db.getAllDrafts();
      const allDrafts = filterDraftsForUser(rawLocalDrafts);

      if (allDrafts.length > 0) {
        setDrafts(allDrafts);
        const lastOpened = localStorage.getItem('bpl_last_draft_id');
        const selected =
          allDrafts.find((d) => d.id === lastOpened) ||
          allDrafts.find((d) => isOfficialDraft(d.id)) ||
          allDrafts[0];
        setActiveDraftId(selected.id);

        let [dbPlayers, dbTeams, dbCats, dbPicks] = await Promise.all([
          db.getPlayers(selected.id),
          db.getTeams(selected.id),
          db.getCategories(selected.id),
          db.getPicks(selected.id),
        ]);

        // Auto-fix if official tournament has corrupted rosters (>10 players in a team) or needs v10 roster update
        if (isOfficialDraft(selected.id) && (isRosterCorrupted(dbPlayers) || localStorage.getItem(officialRosterKey) !== 'true')) {
          const sample = createSampleDraftData();
          const fixedPlayers = sample.players.map((p) => ({ ...p, draftId: selected.id }));
          const fixedPicks = sample.picks.map((pk) => ({ ...pk, draftId: selected.id }));
          const fixedTeams = sample.teams.map((t) => ({ ...t, draftId: selected.id }));
          const fixedCats = sample.categories.map((c) => ({ ...c, draftId: selected.id }));

          await Promise.all([
            db.bulkSavePlayers(fixedPlayers),
            db.bulkSavePicks(fixedPicks),
            db.bulkSaveTeams(fixedTeams),
            db.bulkSaveCategories(fixedCats),
            db.saveDraft({ ...sample.draft, id: selected.id }),
          ]);
          localStorage.setItem(officialRosterKey, 'true');

          dbPlayers = fixedPlayers;
          dbTeams = fixedTeams;
          dbCats = fixedCats;
          dbPicks = fixedPicks;

          // Repair cloud Firestore as well
          firebaseDb.savePlayers(fixedPlayers, 'superadmin-arif').catch(() => {});
          Promise.all(fixedPicks.map((pk) => firebaseDb.savePick(pk, 'superadmin-arif'))).catch(() => {});
        }

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
        localStorage.setItem(officialRosterKey, 'true');

        setDrafts([sample.draft]);
        setActiveDraftId(sample.draft.id);
        setCategories(sample.categories);
        setTeams(sample.teams);
        setPlayers(sample.players);
        setPicks(sample.picks);
        setIsLoading(false); // <--- UNBLOCK UI IMMEDIATELY!

        // Background seed cloud ONLY if Superadmin
        if (isSuperadmin) {
          Promise.all([
            firebaseDb.saveDraft(sample.draft, 'superadmin-arif'),
            firebaseDb.saveCategories(sample.categories, 'superadmin-arif'),
            firebaseDb.saveTeams(sample.teams, 'superadmin-arif'),
            firebaseDb.savePlayers(sample.players, 'superadmin-arif'),
            ...sample.picks.map((pk) => firebaseDb.savePick(pk, 'superadmin-arif')),
          ]).catch(() => {});
        }
      }

      // --- PHASE 2: NON-BLOCKING ASYNC CLOUD REVALIDATION ---
      setTimeout(async () => {
        try {
          const cloudDrafts = await firebaseDb.getAllDrafts(currentUserId);
          if (cloudDrafts && cloudDrafts.length > 0) {
            const selectedCloudDraft =
              cloudDrafts.find((d) => isOfficialDraft(d.id)) || cloudDrafts[0];
            const [cPlayers, cTeams, cCats, cPicks] = await Promise.all([
              firebaseDb.getPlayers(selectedCloudDraft.id),
              firebaseDb.getTeams(selectedCloudDraft.id),
              firebaseDb.getCategories(selectedCloudDraft.id),
              firebaseDb.getPicks(selectedCloudDraft.id),
            ]);

            const cloudCorrupted = isOfficialDraft(selectedCloudDraft.id) && isRosterCorrupted(cPlayers || []);
            if (cloudCorrupted) {
              console.warn('Cloud draft has unbalanced roster (>10 players per team). Auto-repairing Firestore...');
              const sample = createSampleDraftData();
              const fixedPlayers = sample.players.map((p) => ({ ...p, draftId: selectedCloudDraft.id }));
              const fixedPicks = sample.picks.map((pk) => ({ ...pk, draftId: selectedCloudDraft.id }));
              const fixedTeams = sample.teams.map((t) => ({ ...t, draftId: selectedCloudDraft.id }));
              const fixedCats = sample.categories.map((c) => ({ ...c, draftId: selectedCloudDraft.id }));

              Promise.all([
                firebaseDb.saveDraft({ ...sample.draft, id: selectedCloudDraft.id }, 'superadmin-arif'),
                firebaseDb.saveCategories(fixedCats, 'superadmin-arif'),
                firebaseDb.saveTeams(fixedTeams, 'superadmin-arif'),
                firebaseDb.savePlayers(fixedPlayers, 'superadmin-arif'),
                ...fixedPicks.map((pk) => firebaseDb.savePick(pk, 'superadmin-arif')),
              ]).catch(() => {});
            } else if (cPlayers && cPlayers.length >= 20) {
              const localDrafts = await db.getAllDrafts();
              const merged = [...cloudDrafts];
              for (const ld of localDrafts) {
                if (!merged.some((cd) => cd.id === ld.id)) {
                  merged.push(ld);
                }
              }
              const userFilteredDrafts = filterDraftsForUser(merged);
              setDrafts(userFilteredDrafts);

              // Persist official cloud tournament locally in background
              Promise.all([
                db.saveDraft(selectedCloudDraft),
                db.bulkSaveCategories(cCats),
                db.bulkSaveTeams(cTeams),
                db.bulkSavePlayers(cPlayers),
                db.bulkSavePicks(cPicks),
              ]).catch(() => {});

              // Only update active draft if user was viewing official draft or has no custom draft open
              const lastOpened = localStorage.getItem('bpl_last_draft_id');
              const isCurrentlyOnOfficial = !lastOpened || isOfficialDraft(lastOpened);
              if (isCurrentlyOnOfficial) {
                setActiveDraftId(selectedCloudDraft.id);
                setCategories(cCats);
                setTeams(cTeams);
                setPlayers(cPlayers);
                setPicks(cPicks);
              }
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
  }, [isSuperadmin, filterDraftsForUser, currentUserId, isRosterCorrupted]);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  // Real-time Firestore subscriptions: ONLY for official cloud tournament!
  // Any change by Superadmin propagates instantly to the whole website.
  // Guest user created drafts are private and will NEVER subscribe to Firestore!
  useEffect(() => {
    if (!activeDraftId || !isOfficialDraft(activeDraftId)) return;

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
        if (isOfficialDraft(activeDraftId) && isRosterCorrupted(cloudPlayers)) {
          console.warn('Real-time subscription: Ignored corrupted cloud players snapshot (>10 players assigned to a team)');
          return;
        }
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
    selectedPlayerIds?: string[];
    selectedTeamIds?: string[];
    selectedCategoryIds?: string[];
  }) => {
    const now = Date.now();
    const newDraftId = `draft-${now}`;
    const sample = createSampleDraftData();

    // 1. Categories
    let newCategories: Category[] = [];
    if (params.importCategories) {
      const catsToImport =
        params.selectedCategoryIds && params.selectedCategoryIds.length > 0
          ? sample.categories.filter((c) => params.selectedCategoryIds!.includes(c.id))
          : sample.categories;

      newCategories = catsToImport.map((c, idx) => ({
        ...c,
        id: `cat-${now}-${idx + 1}`,
        draftId: newDraftId,
        order: idx + 1,
        createdAt: now,
        updatedAt: now,
      }));
    }

    // 2. Teams
    let newTeams: Team[] = [];
    if (params.importTeams) {
      const teamsToImport =
        params.selectedTeamIds && params.selectedTeamIds.length > 0
          ? sample.teams.filter((t) => params.selectedTeamIds!.includes(t.id))
          : sample.teams;

      newTeams = teamsToImport.map((t) => ({
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
      const playersToImport =
        params.selectedPlayerIds && params.selectedPlayerIds.length > 0
          ? sample.players.filter((p) => params.selectedPlayerIds!.includes(p.id))
          : sample.players;

      newPlayers = playersToImport.map((p, idx) => {
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
      ownerId: currentUserId,
      isOfficial: false,
      isPersonal: true,
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

    // Sync to Firebase Cloud ONLY if Superadmin
    // Guest user created drafts are strictly local and will never alter the whole website
    if (isSuperadmin) {
      const actorId = currentUser?.id || 'superadmin-arif';
      Promise.all([
        firebaseDb.saveDraft(newDraft, actorId),
        newCategories.length > 0 ? firebaseDb.saveCategories(newCategories, actorId) : Promise.resolve(),
        newTeams.length > 0 ? firebaseDb.saveTeams(newTeams, actorId) : Promise.resolve(),
        newPlayers.length > 0 ? firebaseDb.savePlayers(newPlayers, actorId) : Promise.resolve(),
      ]).catch((err) => console.warn('Firebase draft creation sync warning:', err));
    }

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

      if (isSuperadmin) {
        await Promise.all([
          firebaseDb.saveDraft(sample.draft, 'superadmin-arif'),
          firebaseDb.saveCategories(sample.categories, 'superadmin-arif'),
          firebaseDb.saveTeams(sample.teams, 'superadmin-arif'),
          firebaseDb.savePlayers(sample.players, 'superadmin-arif'),
          ...sample.picks.map((pk) => firebaseDb.savePick(pk, 'superadmin-arif')),
        ]).catch(() => {});
      }

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

    if (isSuperadmin) {
      const actorId = currentUser?.id || 'superadmin-arif';
      await Promise.all([
        firebaseDb.saveDraft(sample.draft, actorId),
        firebaseDb.saveCategories(sample.categories, actorId),
        firebaseDb.saveTeams(sample.teams, actorId),
        firebaseDb.savePlayers(sample.players, actorId),
        ...sample.picks.map((pk) => firebaseDb.savePick(pk, actorId)),
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

    if (isSuperadmin) {
      const actorId = currentUser?.id || 'superadmin-arif';
      Promise.all([
        firebaseDb.saveDraft(newDraft, actorId),
        firebaseDb.saveCategories(newCats, actorId),
        firebaseDb.saveTeams(newTeams, actorId),
        firebaseDb.savePlayers(newPlayers, actorId),
      ]).catch(() => {});
    }

    await loadDatabase();
    await switchDraft(newDraftId);
  };

  // Delete Draft (Opens confirmation modal)
  const handleDeleteDraft = (draftId: string) => {
    const target = drafts.find((d) => d.id === draftId);
    if (!target) return;

    if (isOfficialDraft(draftId) && !isSuperadmin) {
      showToast('The official BPL Season-2 tournament cannot be deleted by guest users.', 'error');
      return;
    }

    setDraftToDelete(target);
  };

  // Confirm and Execute Draft Deletion
  const handleConfirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    const draftId = draftToDelete.id;
    try {
      setIsDeletingDraft(true);

      // 1. Delete from local IndexedDB
      await db.deleteDraft(draftId);

      // 2. Delete from Firestore if exists
      await firebaseDb.deleteDraft(draftId).catch(() => {});

      // 3. Immediately update drafts list in React state
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));

      // 4. If deleting active draft, switch to official tournament
      if (activeDraftId === draftId) {
        localStorage.removeItem('bpl_last_draft_id');
        localStorage.removeItem('bpl_active_tournament_logo');
        localStorage.removeItem('bpl_active_tournament_name');
        localStorage.removeItem('bpl_active_tournament_season');
        const fallbackOfficialId = drafts.find((d) => isOfficialDraft(d.id) && d.id !== draftId)?.id || 'bpl-s2-main';
        await switchDraft(fallbackOfficialId);
      }

      showToast(`Tournament draft "${draftToDelete.name}" deleted successfully.`, 'success');
      setDraftToDelete(null);
    } catch (err) {
      console.error('Failed to delete draft:', err);
      showToast('Failed to delete draft. Please try again.', 'error');
    } finally {
      setIsDeletingDraft(false);
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

    // Sync to Cloud Firebase Firestore immediately ONLY if Superadmin
    if (isSuperadmin) {
      const actorId = currentUser?.id || 'superadmin-arif';
      Promise.all([
        firebaseDb.savePick(pickRecord, actorId),
        firebaseDb.saveSinglePlayer(updatedPlayer, actorId),
      ]).catch((err) => console.warn('Firebase pick sync error:', err));

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
    } else {
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
    }

    // Update state
    setPicks((prev) => [...prev, pickRecord]);
    setPlayers((prev) => prev.map((p) => (p.id === player.id ? updatedPlayer : p)));
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
    if (isSuperadmin) {
      const actorId = currentUser?.id || 'superadmin-arif';
      Promise.all([
        firebaseDb.deletePick(latestPick.id),
        restoredPlayer ? firebaseDb.saveSinglePlayer(restoredPlayer, actorId) : Promise.resolve(),
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
    if (isSuperadmin) {
      const actorId = currentUser?.id || 'superadmin-arif';
      firebaseDb.saveDraft(updatedDraft, actorId).catch((err) => console.warn(err));
    }
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
    if (isSuperadmin) {
      const actorId = currentUser?.id || 'superadmin-arif';
      firebaseDb.saveDraft(updatedDraft, actorId).catch((err) => console.warn(err));
    }
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

    if (isSuperadmin) {
      const actorId = currentUser?.id || 'superadmin-arif';
      firebaseDb.saveDraft(updatedDraft, actorId).catch((err) => {
        console.warn('Background cloud draft sync note:', err);
      });
    }
  };

  // Bulk Save Players
  const handleBulkSavePlayers = async (updatedPlayers: Player[]) => {
    await db.bulkSavePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
    if (isSuperadmin) {
      const actorId = currentUser?.id || 'superadmin-arif';
      firebaseDb.savePlayers(updatedPlayers, actorId).catch((err) => {
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
    if (!isSuperadmin) {
      alert('Only Superadmin Arif Iquebal can publish official data to the global cloud database.');
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
        isSuperadmin={isSuperadmin}
        onCreateDraft={handleCreateDraftConfirmed}
      />

      {/* Delete Draft Confirmation Modal */}
      {draftToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Tournament Draft</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900 font-bold">{draftToDelete.name}</strong> ({draftToDelete.season})?
              </p>
              <p className="text-[11px] text-slate-500">
                All players, franchise teams, role categories, and lottery picks in this draft will be removed from your workspace.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDraftToDelete(null)}
                disabled={isDeletingDraft}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDraft}
                disabled={isDeletingDraft}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingDraft ? 'Deleting...' : 'Yes, Delete Draft'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toast.type === 'error'
              ? 'bg-red-950 text-white border-red-500/50'
              : 'bg-[#061A36] text-white border-emerald-500/50'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              toast.type === 'error'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </div>
          <p className="text-xs font-bold text-white pr-2">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-xs ml-auto"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
