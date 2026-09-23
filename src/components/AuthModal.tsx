import React, { useState } from 'react';
import {
  X,
  LogIn,
  LogOut,
  ShieldCheck,
  User,
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Crown,
} from 'lucide-react';
import { signInWithGoogle, logOut } from '../lib/firebase';
import { AppUserProfile, ADMIN_EMAIL } from '../lib/firebaseDb';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  userProfile: AppUserProfile | null;
  onSyncToCloud?: () => Promise<void>;
  isSyncing?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onSyncToCloud,
  isSyncing = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
      onClose();
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await logOut();
      onClose();
    } catch (err: unknown) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Sign-out failed.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.email === ADMIN_EMAIL || userProfile?.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#061A36] to-[#0A5DB8] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Cloud className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">
                {currentUser ? 'Organizer Account' : 'Sign In to BPL Draft'}
              </h3>
              <p className="text-xs text-slate-300">
                {currentUser ? 'Firebase Cloud Connected' : 'Save & synchronize draft across devices'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {currentUser ? (
            <div className="space-y-5">
              {/* Signed In Profile Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-14 h-14 rounded-full border-2 border-[#1283E6] object-cover shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#061A36] text-white flex items-center justify-center text-xl font-bold">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-900 truncate">
                      {currentUser.displayName || 'BPL Organizer'}
                    </h4>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                        <Crown className="w-3 h-3 text-amber-600" />
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Firebase Firestore Active</span>
                  </div>
                </div>
              </div>

              {/* Benefits list */}
              <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Cloud Database Features Active:
                </div>
                <ul className="space-y-1 text-[11px] text-slate-600 pl-5 list-disc">
                  <li>Real-time multi-device synchronization</li>
                  <li>Live auction/lottery draft updates pushed instantly</li>
                  <li>Permanent cloud backups for all 6 franchise teams & 41 players</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                {onSyncToCloud && (
                  <button
                    onClick={onSyncToCloud}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0A5DB8] hover:bg-[#084B96] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Cloud className="w-4 h-4" />
                    )}
                    <span>{isSyncing ? 'Syncing to Cloud...' : 'Sync Current Draft to Firebase'}</span>
                  </button>
                )}

                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 mx-auto flex items-center justify-center text-[#0A5DB8]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  Access Cloud Database & Real-Time Sync
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Sign in with your Google account to manage drafts, live stream lottery picks, and sync team rosters automatically to Firebase Firestore.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 font-bold text-sm shadow-xs transition-all hover:border-slate-300 active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#0A5DB8]" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Sign in with Google</span>
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Authorized organizers get instant real-time admin rights and cloud sync.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
