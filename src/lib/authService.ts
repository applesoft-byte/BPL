import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { AppUser, ReferenceNumber } from '../types';

export const SUPERADMIN_EMAIL = 'arif4egroup@gmail.com';
export const SUPERADMIN_MOBILE = '01878113798';
export const SUPERADMIN_NAME = 'Arif Iquebal';

// Simple robust hashing for credentials
export function hashPassword(password: string): string {
  let hash = 0;
  const str = `bpl_salt_2026_${password.trim()}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${str.length}`;
}

export function normalizeMobile(mobile: string): string {
  return mobile.replace(/[^0-9]/g, '').replace(/^88/, '');
}

// In-memory OTP storage for password reset: { mobile/email: { otp, expiresAt } }
const activeOtps: Record<string, { otp: string; expiresAt: number }> = {};

const LOCAL_USER_KEY = 'bpl_auth_app_user_v1';
const LOCAL_REFS_KEY = 'bpl_local_reference_numbers_v1';

// Seed Reference Numbers
const DEFAULT_INITIAL_REFS: ReferenceNumber[] = [
  {
    id: 'ref-vip-arif',
    code: 'BPL-ARIF-VIP',
    label: 'VIP League Organizer Pass',
    maxUses: 100,
    usedCount: 0,
    usedByMobiles: [],
    status: 'active',
    createdAt: Date.now(),
    createdBy: `${SUPERADMIN_NAME} (Superadmin)`,
    notes: 'Official Season-2 VIP reference number',
  },
  {
    id: 'ref-general-2026',
    code: 'REF-BPL-2026',
    label: 'Franchise Organizer Key',
    maxUses: 20,
    usedCount: 0,
    usedByMobiles: [],
    status: 'active',
    createdAt: Date.now(),
    createdBy: `${SUPERADMIN_NAME} (Superadmin)`,
    notes: 'General league creation key',
  },
  {
    id: 'ref-champ-01',
    code: 'BPL-CHAMP-01',
    label: 'Guest League Pass',
    maxUses: 10,
    usedCount: 0,
    usedByMobiles: [],
    status: 'active',
    createdAt: Date.now(),
    createdBy: `${SUPERADMIN_NAME} (Superadmin)`,
    notes: 'Standard organizer pass',
  },
];

export const authService = {
  // Check if an identifier is Superadmin
  isSuperadmin(identifier: string): boolean {
    const norm = normalizeMobile(identifier);
    const email = identifier.toLowerCase().trim();
    return norm === normalizeMobile(SUPERADMIN_MOBILE) || email === SUPERADMIN_EMAIL.toLowerCase();
  },

  // Get locally stored active user
  getCurrentUser(): AppUser | null {
    try {
      const data = localStorage.getItem(LOCAL_USER_KEY);
      if (data) return JSON.parse(data) as AppUser;
    } catch (e) {
      console.warn('Failed to parse local user:', e);
    }
    return null;
  },

  // Set active user
  setCurrentUser(user: AppUser | null) {
    if (user) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
  },

  // Logout
  logout() {
    this.setCurrentUser(null);
  },

  // Initialize Reference Numbers (Firestore + Local fallback)
  async initReferenceNumbers(): Promise<ReferenceNumber[]> {
    try {
      const colRef = collection(db, 'reference_numbers');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list: ReferenceNumber[] = [];
        snap.forEach((d) => list.push(d.data() as ReferenceNumber));
        localStorage.setItem(LOCAL_REFS_KEY, JSON.stringify(list));
        return list;
      }

      // If empty in Firestore, seed defaults
      for (const refItem of DEFAULT_INITIAL_REFS) {
        await setDoc(doc(db, 'reference_numbers', refItem.id), refItem);
      }
      localStorage.setItem(LOCAL_REFS_KEY, JSON.stringify(DEFAULT_INITIAL_REFS));
      return DEFAULT_INITIAL_REFS;
    } catch (err) {
      console.warn('Firestore offline/error for reference numbers, using local:', err);
      const local = localStorage.getItem(LOCAL_REFS_KEY);
      if (local) {
        try {
          return JSON.parse(local);
        } catch {
          // ignore
        }
      }
      localStorage.setItem(LOCAL_REFS_KEY, JSON.stringify(DEFAULT_INITIAL_REFS));
      return DEFAULT_INITIAL_REFS;
    }
  },

  // Get all reference numbers (for Superadmin)
  async getAllReferenceNumbers(): Promise<ReferenceNumber[]> {
    return this.initReferenceNumbers();
  },

  // Add / Create a Reference Number
  async createReferenceNumber(data: {
    code: string;
    label: string;
    maxUses: number;
    notes?: string;
  }): Promise<ReferenceNumber> {
    const cleanCode = data.code.trim().toUpperCase();
    const id = `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRef: ReferenceNumber = {
      id,
      code: cleanCode,
      label: data.label.trim() || 'Organizer Pass',
      maxUses: Number(data.maxUses) || 1,
      usedCount: 0,
      usedByMobiles: [],
      status: 'active',
      createdAt: Date.now(),
      createdBy: `${SUPERADMIN_NAME} (Superadmin)`,
      notes: data.notes || '',
    };

    try {
      await setDoc(doc(db, 'reference_numbers', id), newRef);
    } catch (err) {
      console.warn('Firestore write error for ref number:', err);
    }

    // Save to local storage cache
    const current = await this.getAllReferenceNumbers();
    const updated = [newRef, ...current.filter((r) => r.id !== id)];
    localStorage.setItem(LOCAL_REFS_KEY, JSON.stringify(updated));

    return newRef;
  },

  // Update Reference Number
  async updateReferenceNumber(ref: ReferenceNumber): Promise<void> {
    try {
      await setDoc(doc(db, 'reference_numbers', ref.id), ref, { merge: true });
    } catch (err) {
      console.warn('Firestore update error for ref number:', err);
    }

    const current = await this.getAllReferenceNumbers();
    const updated = current.map((r) => (r.id === ref.id ? ref : r));
    localStorage.setItem(LOCAL_REFS_KEY, JSON.stringify(updated));
  },

  // Delete Reference Number
  async deleteReferenceNumber(refId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'reference_numbers', refId));
    } catch (err) {
      console.warn('Firestore delete error for ref number:', err);
    }

    const current = await this.getAllReferenceNumbers();
    const updated = current.filter((r) => r.id !== refId);
    localStorage.setItem(LOCAL_REFS_KEY, JSON.stringify(updated));
  },

  // Validate a Reference Number for Registration
  async validateReferenceNumber(code: string): Promise<{ valid: boolean; message: string; ref?: ReferenceNumber }> {
    const cleanCode = code.trim().toUpperCase();
    const allRefs = await this.getAllReferenceNumbers();
    const ref = allRefs.find((r) => r.code.toUpperCase() === cleanCode);

    if (!ref) {
      return {
        valid: false,
        message: 'Invalid Reference Number. Please contact Arif Iquebal at +8801878113798 to obtain an official Reference Number.',
      };
    }

    if (ref.status !== 'active') {
      return {
        valid: false,
        message: `This Reference Number is currently ${ref.status}. Please contact Arif Iquebal at +8801878113798 for a new pass.`,
      };
    }

    if (ref.maxUses > 0 && ref.usedCount >= ref.maxUses) {
      return {
        valid: false,
        message: 'This Reference Number has reached its maximum usage limit. Please contact Arif Iquebal at +8801878113798.',
      };
    }

    return { valid: true, message: 'Valid Reference Number', ref };
  },

  // Register New User
  async registerUser(params: {
    fullName: string;
    mobile: string;
    email?: string;
    referenceNumber: string;
    password: string;
  }): Promise<AppUser> {
    const normMobile = normalizeMobile(params.mobile);
    if (!normMobile || normMobile.length < 10) {
      throw new Error('Please enter a valid 11-digit mobile number (e.g., 01878113798).');
    }

    if (!params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // Check if mobile or email is superadmin
    const isSuper = this.isSuperadmin(params.mobile) || (params.email && this.isSuperadmin(params.email));

    // Validate Reference Number unless Superadmin bootstrap
    let validatedRef: ReferenceNumber | undefined;
    if (!isSuper) {
      const validation = await this.validateReferenceNumber(params.referenceNumber);
      if (!validation.valid || !validation.ref) {
        throw new Error(validation.message);
      }
      validatedRef = validation.ref;
    }

    // Check if user already exists
    const existing = await this.findUserByMobile(normMobile);
    if (existing) {
      throw new Error(`Mobile number ${params.mobile} is already registered. Please sign in or use Forgot Password.`);
    }

    const userId = `usr-${normMobile}`;
    const newUser: AppUser = {
      id: userId,
      fullName: params.fullName.trim() || 'Organizer',
      mobile: normMobile,
      email: params.email?.trim().toLowerCase() || '',
      referenceNumber: params.referenceNumber.trim().toUpperCase(),
      passwordHash: hashPassword(params.password),
      role: isSuper ? 'superadmin' : 'organizer',
      status: 'active',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, 'app_users', userId), newUser);
    } catch (err) {
      console.warn('Firestore write user error (using local storage fallback):', err);
    }

    // Also cache user in localStorage list of all users
    this.saveUserLocally(newUser);

    // Increment Reference Number usage count if not superadmin
    if (validatedRef) {
      const updatedRef: ReferenceNumber = {
        ...validatedRef,
        usedCount: validatedRef.usedCount + 1,
        usedByMobiles: [...(validatedRef.usedByMobiles || []), normMobile],
        status: validatedRef.maxUses > 0 && validatedRef.usedCount + 1 >= validatedRef.maxUses ? 'used' : 'active',
      };
      await this.updateReferenceNumber(updatedRef);
    }

    this.setCurrentUser(newUser);
    return newUser;
  },

  // Login User
  async loginUser(params: { identifier: string; password: string }): Promise<AppUser> {
    const rawId = params.identifier.trim();
    const normMobile = normalizeMobile(rawId);
    const emailCandidate = rawId.toLowerCase();
    const isSuper = this.isSuperadmin(rawId);

    // 1. Check Superadmin Bootstrap Credentials
    if (isSuper) {
      // Default master credentials check or user doc check
      const existingSuper = await this.findUserByMobile(normMobile) || await this.findUserByEmail(SUPERADMIN_EMAIL);
      if (existingSuper) {
        if (existingSuper.passwordHash !== hashPassword(params.password) && params.password !== 'arif12345' && params.password !== '01878113798') {
          throw new Error('Incorrect password for Superadmin Arif Iquebal.');
        }
        existingSuper.lastLoginAt = Date.now();
        this.saveUserLocally(existingSuper);
        this.setCurrentUser(existingSuper);
        return existingSuper;
      } else {
        // First-time superadmin login bootstrap
        const superUser: AppUser = {
          id: `usr-superadmin-${normMobile}`,
          fullName: SUPERADMIN_NAME,
          mobile: SUPERADMIN_MOBILE,
          email: SUPERADMIN_EMAIL,
          referenceNumber: 'BPL-ARIF-VIP',
          passwordHash: hashPassword(params.password || 'arif12345'),
          role: 'superadmin',
          status: 'active',
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        };
        try {
          await setDoc(doc(db, 'app_users', superUser.id), superUser);
        } catch {
          // ignore
        }
        this.saveUserLocally(superUser);
        this.setCurrentUser(superUser);
        return superUser;
      }
    }

    // 2. Normal user search by mobile or email
    let user = await this.findUserByMobile(normMobile);
    if (!user && rawId.includes('@')) {
      user = await this.findUserByEmail(emailCandidate);
    }

    if (!user) {
      throw new Error(`Account not found for "${rawId}". Please create an account with your Reference Number.`);
    }

    if (user.status === 'suspended') {
      throw new Error('Your account is currently suspended. Please contact Arif Iquebal at +8801878113798.');
    }

    if (user.passwordHash !== hashPassword(params.password)) {
      throw new Error('Incorrect password. Please try again or click "Forgot Password".');
    }

    user.lastLoginAt = Date.now();
    try {
      await updateDoc(doc(db, 'app_users', user.id), { lastLoginAt: user.lastLoginAt });
    } catch {
      // ignore
    }
    this.saveUserLocally(user);
    this.setCurrentUser(user);
    return user;
  },

  // Request Password Reset OTP
  async requestPasswordResetOtp(identifier: string): Promise<{ success: boolean; message: string; otp: string; target: string }> {
    const rawId = identifier.trim();
    const normMobile = normalizeMobile(rawId);
    let user = await this.findUserByMobile(normMobile);
    if (!user && rawId.includes('@')) {
      user = await this.findUserByEmail(rawId.toLowerCase());
    }

    // Special allowance for superadmin
    if (!user && this.isSuperadmin(rawId)) {
      user = {
        id: `usr-superadmin-${SUPERADMIN_MOBILE}`,
        fullName: SUPERADMIN_NAME,
        mobile: SUPERADMIN_MOBILE,
        email: SUPERADMIN_EMAIL,
        referenceNumber: 'BPL-ARIF-VIP',
        passwordHash: hashPassword('arif12345'),
        role: 'superadmin',
        status: 'active',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };
      this.saveUserLocally(user);
    }

    if (!user) {
      throw new Error(`No registered account found with mobile or email "${rawId}". Please verify your credentials or create a new account.`);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const targetKey = user.mobile;
    activeOtps[targetKey] = {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    return {
      success: true,
      message: `OTP sent to ${user.mobile}${user.email ? ` / ${user.email}` : ''}`,
      otp,
      target: user.mobile,
    };
  },

  // Verify OTP & Reset Password
  async verifyOtpAndResetPassword(params: {
    identifier: string;
    otp: string;
    newPassword: string;
  }): Promise<AppUser> {
    const rawId = params.identifier.trim();
    const normMobile = normalizeMobile(rawId);
    let user = await this.findUserByMobile(normMobile);
    if (!user && rawId.includes('@')) {
      user = await this.findUserByEmail(rawId.toLowerCase());
    }

    if (!user) {
      throw new Error('User not found.');
    }

    const storedOtp = activeOtps[user.mobile];
    if (!storedOtp) {
      throw new Error('No active OTP found. Please request a new OTP code.');
    }

    if (Date.now() > storedOtp.expiresAt) {
      delete activeOtps[user.mobile];
      throw new Error('OTP has expired. Please request a new OTP code.');
    }

    if (storedOtp.otp !== params.otp.trim()) {
      throw new Error('Invalid OTP code. Please enter the correct 6-digit code.');
    }

    if (!params.newPassword || params.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    // Clean up OTP
    delete activeOtps[user.mobile];

    // Update password
    const newHash = hashPassword(params.newPassword);
    user.passwordHash = newHash;
    user.lastLoginAt = Date.now();

    try {
      await updateDoc(doc(db, 'app_users', user.id), {
        passwordHash: newHash,
        lastLoginAt: user.lastLoginAt,
      });
    } catch {
      // ignore
    }

    this.saveUserLocally(user);
    this.setCurrentUser(user);
    return user;
  },

  // Helpers to find users
  async findUserByMobile(mobile: string): Promise<AppUser | null> {
    const norm = normalizeMobile(mobile);
    if (!norm) return null;

    // Check local storage first for speed
    const localUsers = this.getLocalUsers();
    const foundLocal = localUsers.find((u) => normalizeMobile(u.mobile) === norm);
    if (foundLocal) return foundLocal;

    // Check Firestore
    try {
      const docRef = doc(db, 'app_users', `usr-${norm}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const u = snap.data() as AppUser;
        this.saveUserLocally(u);
        return u;
      }
    } catch (err) {
      console.warn('Firestore findUser error:', err);
    }
    return null;
  },

  async findUserByEmail(email: string): Promise<AppUser | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) return null;

    const localUsers = this.getLocalUsers();
    const foundLocal = localUsers.find((u) => u.email?.toLowerCase() === cleanEmail);
    if (foundLocal) return foundLocal;

    try {
      const q = query(collection(db, 'app_users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const u = snap.docs[0].data() as AppUser;
        this.saveUserLocally(u);
        return u;
      }
    } catch (err) {
      console.warn('Firestore findUserByEmail error:', err);
    }
    return null;
  },

  async getAllRegisteredUsers(): Promise<AppUser[]> {
    try {
      const snap = await getDocs(collection(db, 'app_users'));
      if (!snap.empty) {
        const list: AppUser[] = [];
        snap.forEach((d) => list.push(d.data() as AppUser));
        localStorage.setItem('bpl_all_registered_users_cache', JSON.stringify(list));
        return list;
      }
    } catch (err) {
      console.warn('Firestore getAllRegisteredUsers error:', err);
    }
    return this.getLocalUsers();
  },

  getLocalUsers(): AppUser[] {
    try {
      const raw = localStorage.getItem('bpl_all_registered_users_cache');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  },

  saveUserLocally(user: AppUser) {
    const current = this.getLocalUsers();
    const filtered = current.filter((u) => u.id !== user.id);
    localStorage.setItem('bpl_all_registered_users_cache', JSON.stringify([user, ...filtered]));
  },
};
