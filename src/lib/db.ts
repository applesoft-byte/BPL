import { Category, Draft, PickRecord, Player, Team } from '../types';

const DB_NAME = 'BPL_Season2_Draft_DB';
const DB_VERSION = 1;

class DraftDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Drafts
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'id' });
        }

        // Players
        if (!db.objectStoreNames.contains('players')) {
          const playerStore = db.createObjectStore('players', { keyPath: 'id' });
          playerStore.createIndex('draftId', 'draftId', { unique: false });
          playerStore.createIndex('status', 'status', { unique: false });
        }

        // Teams
        if (!db.objectStoreNames.contains('teams')) {
          const teamStore = db.createObjectStore('teams', { keyPath: 'id' });
          teamStore.createIndex('draftId', 'draftId', { unique: false });
        }

        // Categories
        if (!db.objectStoreNames.contains('categories')) {
          const catStore = db.createObjectStore('categories', { keyPath: 'id' });
          catStore.createIndex('draftId', 'draftId', { unique: false });
        }

        // Picks
        if (!db.objectStoreNames.contains('picks')) {
          const pickStore = db.createObjectStore('picks', { keyPath: 'id' });
          pickStore.createIndex('draftId', 'draftId', { unique: false });
          pickStore.createIndex('sequence', 'sequence', { unique: false });
        }

        // Assets (photos, logos)
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // --- Draft operations ---
  async getAllDrafts(): Promise<Draft[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const store = tx.objectStore('drafts');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getDraft(id: string): Promise<Draft | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const store = tx.objectStore('drafts');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveDraft(draft: Draft): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      const req = store.put(draft);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteDraft(id: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(['drafts', 'players', 'teams', 'categories', 'picks'], 'readwrite');

    // Delete draft
    tx.objectStore('drafts').delete(id);

    // Delete related players
    const pStore = tx.objectStore('players');
    const pIndex = pStore.index('draftId');
    const pReq = pIndex.getAllKeys(id);
    pReq.onsuccess = () => {
      for (const key of pReq.result) pStore.delete(key);
    };

    // Delete related teams
    const tStore = tx.objectStore('teams');
    const tIndex = tStore.index('draftId');
    const tReq = tIndex.getAllKeys(id);
    tReq.onsuccess = () => {
      for (const key of tReq.result) tStore.delete(key);
    };

    // Delete related categories
    const cStore = tx.objectStore('categories');
    const cIndex = cStore.index('draftId');
    const cReq = cIndex.getAllKeys(id);
    cReq.onsuccess = () => {
      for (const key of cReq.result) cStore.delete(key);
    };

    // Delete related picks
    const pkStore = tx.objectStore('picks');
    const pkIndex = pkStore.index('draftId');
    const pkReq = pkIndex.getAllKeys(id);
    pkReq.onsuccess = () => {
      for (const key of pkReq.result) pkStore.delete(key);
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Players ---
  async getPlayers(draftId: string): Promise<Player[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('players', 'readonly');
      const index = tx.objectStore('players').index('draftId');
      const req = index.getAll(draftId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async savePlayer(player: Player): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('players', 'readwrite');
      const store = tx.objectStore('players');
      const req = store.put(player);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async bulkSavePlayers(players: Player[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('players', 'readwrite');
      const store = tx.objectStore('players');
      for (const player of players) {
        store.put(player);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deletePlayer(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('players', 'readwrite');
      const store = tx.objectStore('players');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Teams ---
  async getTeams(draftId: string): Promise<Team[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('teams', 'readonly');
      const index = tx.objectStore('teams').index('draftId');
      const req = index.getAll(draftId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async saveTeam(team: Team): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('teams', 'readwrite');
      const store = tx.objectStore('teams');
      const req = store.put(team);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async bulkSaveTeams(teams: Team[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('teams', 'readwrite');
      const store = tx.objectStore('teams');
      for (const team of teams) {
        store.put(team);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteTeam(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('teams', 'readwrite');
      const store = tx.objectStore('teams');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Categories ---
  async getCategories(draftId: string): Promise<Category[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readonly');
      const index = tx.objectStore('categories').index('draftId');
      const req = index.getAll(draftId);
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => a.order - b.order);
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveCategory(category: Category): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      const req = store.put(category);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async bulkSaveCategories(categories: Category[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      for (const cat of categories) {
        store.put(cat);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteCategory(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readwrite');
      const store = tx.objectStore('categories');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Picks / History ---
  async getPicks(draftId: string): Promise<PickRecord[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('picks', 'readonly');
      const index = tx.objectStore('picks').index('draftId');
      const req = index.getAll(draftId);
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => a.sequence - b.sequence);
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async savePick(pick: PickRecord): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('picks', 'readwrite');
      const store = tx.objectStore('picks');
      const req = store.put(pick);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deletePick(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('picks', 'readwrite');
      const store = tx.objectStore('picks');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Full Backup & Export ---
  async exportFullDraft(draftId: string) {
    const draft = await this.getDraft(draftId);
    if (!draft) throw new Error('Draft not found');
    const players = await this.getPlayers(draftId);
    const teams = await this.getTeams(draftId);
    const categories = await this.getCategories(draftId);
    const picks = await this.getPicks(draftId);

    return {
      version: 1,
      exportedAt: Date.now(),
      draft,
      players,
      teams,
      categories,
      picks,
    };
  }

  async importFullDraft(data: {
    draft: Draft;
    players: Player[];
    teams: Team[];
    categories: Category[];
    picks: PickRecord[];
  }) {
    const db = await this.openDB();
    const tx = db.transaction(['drafts', 'players', 'teams', 'categories', 'picks'], 'readwrite');

    tx.objectStore('drafts').put(data.draft);
    const pStore = tx.objectStore('players');
    for (const p of data.players) pStore.put(p);
    const tStore = tx.objectStore('teams');
    for (const t of data.teams) tStore.put(t);
    const cStore = tx.objectStore('categories');
    for (const c of data.categories) cStore.put(c);
    const pkStore = tx.objectStore('picks');
    for (const pk of data.picks) pkStore.put(pk);

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(['drafts', 'players', 'teams', 'categories', 'picks', 'assets'], 'readwrite');
    tx.objectStore('drafts').clear();
    tx.objectStore('players').clear();
    tx.objectStore('teams').clear();
    tx.objectStore('categories').clear();
    tx.objectStore('picks').clear();
    tx.objectStore('assets').clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const db = new DraftDatabase();
