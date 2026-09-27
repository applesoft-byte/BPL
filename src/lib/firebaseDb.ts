import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Category, Draft, PickRecord, Player, Team } from '../types';
import { sanitizePlayerBangla } from './cleanUtils';

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'organizer' | 'viewer';
  createdAt: string;
}

export const ADMIN_EMAIL = 'arif4egroup@gmail.com';

export const firebaseDb = {
  // --- User Profile Sync ---
  async syncUserProfile(user: FirebaseUser): Promise<AppUserProfile> {
    const path = `users/${user.uid}`;
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);

      const isAdmin = user.email === ADMIN_EMAIL;
      const role: 'admin' | 'organizer' | 'viewer' = isAdmin ? 'admin' : 'organizer';

      if (snap.exists()) {
        const existingData = snap.data() as AppUserProfile;
        const updatedProfile: AppUserProfile = {
          ...existingData,
          displayName: user.displayName || existingData.displayName || 'Organizer',
          photoURL: user.photoURL || existingData.photoURL || '',
          role: isAdmin ? 'admin' : existingData.role || 'organizer',
        };
        await setDoc(userRef, updatedProfile, { merge: true });
        return updatedProfile;
      } else {
        const newProfile: AppUserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Organizer',
          photoURL: user.photoURL || '',
          role,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, newProfile);
        return newProfile;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // --- Draft Tournament Operations ---
  async saveDraft(draft: Draft, ownerId: string = 'superadmin'): Promise<void> {
    const path = `drafts/${draft.id}`;
    try {
      const docRef = doc(db, 'drafts', draft.id);
      const cleanDraft: Record<string, unknown> = {
        id: draft.id,
        name: draft.name,
        season: draft.season,
        status: draft.status,
        logoUrl: draft.logoUrl || '',
        draftDate: draft.draftDate || '',
        organizerName: draft.organizerName || '',
        organizerRole: draft.organizerRole || '',
        slogan: draft.slogan || '',
        subSlogan: draft.subSlogan || '',
        tagline: draft.tagline || '',
        defaultPlayerQuota: draft.defaultPlayerQuota || 11,
        currentCategoryId: draft.currentCategoryId || '',
        settings: draft.settings,
        ownerId,
        createdAt: draft.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      if (draft.startedAt) cleanDraft.startedAt = draft.startedAt;
      if (draft.completedAt) cleanDraft.completedAt = draft.completedAt;

      await setDoc(docRef, cleanDraft, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getAllDrafts(): Promise<Draft[]> {
    const path = 'drafts';
    try {
      const snap = await getDocs(collection(db, 'drafts'));
      const list: Draft[] = [];
      snap.forEach((d) => {
        const data = d.data() as Draft;
        const isOfficial = data.id === 'bpl-season-2-official' || data.id === 'bpl-s2-main';
        const isSuperadminOwner =
          data.ownerId === 'superadmin' ||
          data.ownerId === 'superadmin-arif' ||
          data.ownerId?.startsWith('usr-superadmin');
        if (isOfficial || isSuperadminOwner) {
          list.push(data);
        }
      });
      // Fallback if list is empty but snap had documents
      if (list.length === 0 && !snap.empty) {
        snap.forEach((d) => {
          const data = d.data() as Draft;
          if (data.id === 'bpl-season-2-official' || data.id === 'bpl-s2-main') {
            list.push(data);
          }
        });
      }
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async deleteDraft(draftId: string): Promise<void> {
    const path = `drafts/${draftId}`;
    try {
      await deleteDoc(doc(db, 'drafts', draftId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // --- Teams Operations ---
  async saveTeams(teams: Team[], ownerId: string = 'superadmin'): Promise<void> {
    for (const team of teams) {
      await this.saveSingleTeam(team, ownerId);
    }
  },

  async saveSingleTeam(team: Team, ownerId: string = 'superadmin'): Promise<void> {
    const path = `teams/${team.id}`;
    try {
      const cleanTeam = {
        id: team.id,
        draftId: team.draftId,
        name: team.name,
        shortName: team.shortName,
        logoUrl: team.logoUrl || '',
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        maxPlayers: team.maxPlayers,
        captainPlayerId: team.captainPlayerId || '',
        captainName: team.captainName || '',
        quotas: team.quotas || {},
        active: team.active ?? true,
        ownerId,
        createdAt: team.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, 'teams', team.id), cleanTeam, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getTeams(draftId: string): Promise<Team[]> {
    const path = 'teams';
    try {
      const q = query(collection(db, 'teams'), where('draftId', '==', draftId));
      const snap = await getDocs(q);
      const list: Team[] = [];
      snap.forEach((d) => list.push(d.data() as Team));
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  // --- Players Operations ---
  async savePlayers(players: Player[], ownerId: string = 'superadmin'): Promise<void> {
    for (const player of players) {
      await this.saveSinglePlayer(player, ownerId);
    }
  },

  async saveSinglePlayer(player: Player, ownerId: string = 'superadmin'): Promise<void> {
    const path = `players/${player.id}`;
    const sanitized = sanitizePlayerBangla(player);
    try {
      const cleanPlayer = {
        id: sanitized.id,
        draftId: sanitized.draftId,
        fullName: sanitized.fullName,
        jerseyNumber: sanitized.jerseyNumber || '',
        primaryCategoryId: sanitized.primaryCategoryId,
        secondaryCategoryId: sanitized.secondaryCategoryId || '',
        playerType: sanitized.playerType || '',
        battingStyle: sanitized.battingStyle || 'Right Handed',
        bowlingStyle: sanitized.bowlingStyle || '',
        badge: sanitized.badge || 'ALL-ROUNDER',
        photoUrl: sanitized.photoUrl || '',
        inDraftPool: sanitized.inDraftPool ?? true,
        status: sanitized.status || 'available',
        assignedTeamId: sanitized.assignedTeamId || '',
        assignedCategoryId: sanitized.assignedCategoryId || '',
        isCaptain: sanitized.isCaptain ?? false,
        notes: sanitized.notes || '',
        contactEmail: sanitized.contactEmail || '',
        ownerId,
        createdAt: sanitized.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, 'players', sanitized.id), cleanPlayer, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getPlayers(draftId: string): Promise<Player[]> {
    const path = 'players';
    try {
      const q = query(collection(db, 'players'), where('draftId', '==', draftId));
      const snap = await getDocs(q);
      const list: Player[] = [];
      snap.forEach((d) => list.push(sanitizePlayerBangla(d.data() as Player)));
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async cleanBanglaFromFirestore(draftId: string): Promise<number> {
    const path = 'players';
    try {
      const q = query(collection(db, 'players'), where('draftId', '==', draftId));
      const snap = await getDocs(q);
      let cleanedCount = 0;
      for (const d of snap.docs) {
        const raw = d.data() as Player;
        const cleaned = sanitizePlayerBangla(raw);
        if (cleaned.notes !== raw.notes || cleaned.fullName !== raw.fullName) {
          await setDoc(
            doc(db, 'players', raw.id),
            {
              ...cleaned,
              notes: cleaned.notes || '',
              updatedAt: Date.now(),
            },
            { merge: true }
          );
          cleanedCount++;
        }
      }
      return cleanedCount;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return 0;
    }
  },

  // --- Categories Operations ---
  async saveCategories(categories: Category[], ownerId: string = 'superadmin'): Promise<void> {
    for (const cat of categories) {
      await this.saveSingleCategory(cat, ownerId);
    }
  },

  async saveSingleCategory(cat: Category, ownerId: string = 'superadmin'): Promise<void> {
    const path = `categories/${cat.id}`;
    try {
      const cleanCat = {
        id: cat.id,
        draftId: cat.draftId,
        name: cat.name,
        color: cat.color,
        iconName: cat.iconName || 'Award',
        order: cat.order,
        active: cat.active ?? true,
        ownerId,
        createdAt: cat.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, 'categories', cat.id), cleanCat, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getCategories(draftId: string): Promise<Category[]> {
    const path = 'categories';
    try {
      const q = query(collection(db, 'categories'), where('draftId', '==', draftId));
      const snap = await getDocs(q);
      const list: Category[] = [];
      snap.forEach((d) => list.push(d.data() as Category));
      return list.sort((a, b) => a.order - b.order);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  // --- Picks Operations ---
  async savePick(pick: PickRecord, ownerId: string = 'superadmin'): Promise<void> {
    const path = `picks/${pick.id}`;
    try {
      const cleanPick = {
        id: pick.id,
        draftId: pick.draftId,
        sequence: pick.sequence,
        playerId: pick.playerId,
        teamId: pick.teamId,
        categoryId: pick.categoryId,
        ownerId,
        createdAt: pick.createdAt || Date.now(),
      };
      await setDoc(doc(db, 'picks', pick.id), cleanPick);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getPicks(draftId: string): Promise<PickRecord[]> {
    const path = 'picks';
    try {
      const q = query(collection(db, 'picks'), where('draftId', '==', draftId));
      const snap = await getDocs(q);
      const list: PickRecord[] = [];
      snap.forEach((d) => list.push(d.data() as PickRecord));
      return list.sort((a, b) => a.sequence - b.sequence);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async deletePlayer(playerId: string): Promise<void> {
    const path = `players/${playerId}`;
    try {
      await deleteDoc(doc(db, 'players', playerId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteTeam(teamId: string): Promise<void> {
    const path = `teams/${teamId}`;
    try {
      await deleteDoc(doc(db, 'teams', teamId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteCategory(categoryId: string): Promise<void> {
    const path = `categories/${categoryId}`;
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deletePick(pickId: string): Promise<void> {
    const path = `picks/${pickId}`;
    try {
      await deleteDoc(doc(db, 'picks', pickId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // --- Real-time Subscriptions ---
  subscribeDraft(draftId: string, onUpdate: (draft: Draft | null) => void): Unsubscribe {
    const path = `drafts/${draftId}`;
    return onSnapshot(
      doc(db, 'drafts', draftId),
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as Draft);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },

  subscribeTeams(draftId: string, onUpdate: (teams: Team[]) => void): Unsubscribe {
    const path = 'teams';
    const q = query(collection(db, 'teams'), where('draftId', '==', draftId));
    return onSnapshot(
      q,
      (snap) => {
        const list: Team[] = [];
        snap.forEach((d) => list.push(d.data() as Team));
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  subscribeCategories(draftId: string, onUpdate: (categories: Category[]) => void): Unsubscribe {
    const path = 'categories';
    const q = query(collection(db, 'categories'), where('draftId', '==', draftId));
    return onSnapshot(
      q,
      (snap) => {
        const list: Category[] = [];
        snap.forEach((d) => list.push(d.data() as Category));
        onUpdate(list.sort((a, b) => a.order - b.order));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  subscribePlayers(draftId: string, onUpdate: (players: Player[]) => void): Unsubscribe {
    const path = 'players';
    const q = query(collection(db, 'players'), where('draftId', '==', draftId));
    return onSnapshot(
      q,
      (snap) => {
        const list: Player[] = [];
        snap.forEach((d) => list.push(sanitizePlayerBangla(d.data() as Player)));
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },

  subscribePicks(draftId: string, onUpdate: (picks: PickRecord[]) => void): Unsubscribe {
    const path = 'picks';
    const q = query(collection(db, 'picks'), where('draftId', '==', draftId));
    return onSnapshot(
      q,
      (snap) => {
        const list: PickRecord[] = [];
        snap.forEach((d) => list.push(d.data() as PickRecord));
        onUpdate(list.sort((a, b) => a.sequence - b.sequence));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },
};
