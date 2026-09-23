import React, { useState } from 'react';
import {
  X,
  LogIn,
  LogOut,
  UserPlus,
  KeyRound,
  Phone,
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  PhoneCall,
  Crown,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { AppUser } from '../types';
import {
  authService,
  SUPERADMIN_MOBILE,
  SUPERADMIN_NAME,
  SUPERADMIN_EMAIL,
} from '../lib/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUserChange: (user: AppUser | null) => void;
  onOpenSuperadminPortal?: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot_request' | 'forgot_verify';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  onOpenSuperadminPortal,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot Password OTP flow state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [activeOtpCode, setActiveOtpCode] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!isOpen) return null;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText('+8801878113798');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // 1. Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!referenceNumber.trim()) {
      setError('Reference Number is required. For Reference Number, please contact Arif Iquebal at +8801878113798.');
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter your full name or organizer name.');
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 11-digit mobile number.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const user = await authService.registerUser({
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        referenceNumber: referenceNumber.trim(),
        password,
      });

      onUserChange(user);
      setSuccessMessage('Account created successfully! Welcome to BPL Season-2.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please check your Reference Number.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!mobile.trim()) {
      setError('Please enter your registered mobile number or email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const user = await authService.loginUser({
        identifier: mobile.trim(),
        password,
      });

      onUserChange(user);
      setSuccessMessage(`Welcome back, ${user.fullName}!`);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Request OTP for Password Reset
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!forgotIdentifier.trim()) {
      setError('Please enter your registered mobile number or email.');
      return;
    }

    try {
      setLoading(true);
      const result = await authService.requestPasswordResetOtp(forgotIdentifier.trim());
      setActiveOtpCode(result.otp);
      setMode('forgot_verify');
      setSuccessMessage(`OTP verification code generated for ${result.target}. Enter the 6-digit code below.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to find registered account.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Verify OTP & Set New Password
  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!enteredOtp.trim()) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const user = await authService.verifyOtpAndResetPassword({
        identifier: forgotIdentifier.trim(),
        otp: enteredOtp.trim(),
        newPassword,
      });

      onUserChange(user);
      setSuccessMessage('Password successfully updated! You are now logged in.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    authService.logout();
    onUserChange(null);
    onClose();
  };

  const isSuperadmin =
    currentUser?.role === 'superadmin' ||
    authService.isSuperadmin(currentUser?.mobile || '') ||
    authService.isSuperadmin(currentUser?.email || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#061A36] via-[#0A5DB8] to-[#0264D4] px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              {currentUser ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <Lock className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {currentUser
                  ? 'Organizer Profile'
                  : mode === 'register'
                  ? 'Create Organizer Account'
                  : mode.startsWith('forgot')
                  ? 'Reset Forgotten Password'
                  : 'Organizer Sign In'}
              </h3>
              <p className="text-xs text-blue-100">
                {currentUser
                  ? 'BPL Season-2 Authenticated Session'
                  : 'Sign in with Mobile & Reference Number'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Messages */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">{successMessage}</div>
            </div>
          )}

          {/* ACTIVE USER VIEW */}
          {currentUser ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#061A36] text-white flex items-center justify-center font-bold text-sm">
                      {currentUser.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#061A36]">
                        {currentUser.fullName}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono">
                        Mobile: +88{currentUser.mobile}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isSuperadmin
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-blue-100 text-blue-900 border border-blue-200'
                    }`}
                  >
                    {isSuperadmin ? 'SUPERADMIN' : currentUser.role}
                  </span>
                </div>

                <div className="text-xs text-slate-600 pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Reference Number:</span>
                    <span className="font-mono font-black text-slate-800">
                      {currentUser.referenceNumber || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Status:</span>
                    <span className="text-emerald-700 font-bold capitalize">Active & Synced</span>
                  </div>
                </div>
              </div>

              {isSuperadmin && onOpenSuperadminPortal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSuperadminPortal();
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-[#FF7A2E] hover:from-amber-600 hover:to-[#e66c24] text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  <span>Open Superadmin Reference Portal</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <>
              {/* TAB SELECTOR (LOGIN vs REGISTER) */}
              {mode !== 'forgot_request' && mode !== 'forgot_verify' && (
                <div className="flex p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                      mode === 'login'
                        ? 'bg-white text-[#061A36] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                      mode === 'register'
                        ? 'bg-white text-[#061A36] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* 1. SIGN IN FORM */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Registered Mobile Number or Email</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 01878113798 or email@example.com"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1283E6] focus:bg-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Password</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotIdentifier(mobile);
                          setMode('forgot_request');
                          setError(null);
                        }}
                        className="text-[11px] font-bold text-[#1283E6] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#1283E6] focus:bg-white outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#0A5DB8] hover:bg-[#061A36] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  </button>

                  <div className="pt-2 text-center text-xs text-slate-500">
                    Need a Reference Number to create an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="font-bold text-[#1283E6] hover:underline"
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              )}

              {/* 2. REGISTRATION FORM */}
              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Reference Number Field with Arif Iquebal Notice */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                        <span>Reference Number *</span>
                      </label>
                    </div>

                    <input
                      type="text"
                      placeholder="Enter Reference Number (e.g. BPL-ARIF-VIP)"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value.toUpperCase())}
                      required
                      className="w-full px-3.5 py-2.5 bg-amber-50/40 border border-amber-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#061A36] focus:ring-2 focus:ring-amber-500 outline-none"
                    />

                    {/* Prominent English Notice per instructions */}
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#061A36] flex items-center gap-1.5 text-[11px]">
                          <HelpCircle className="w-3.5 h-3.5 text-[#1283E6]" />
                          For Reference Number, please contact Arif Iquebal at +8801878113798
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href="tel:+8801878113798"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0A5DB8] text-white text-[10px] font-bold rounded-lg hover:bg-[#061A36] transition-colors"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Call +8801878113798</span>
                        </a>

                        <button
                          type="button"
                          onClick={handleCopyPhone}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-slate-700 border border-slate-300 text-[10px] font-bold rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          {copiedPhone ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Number</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Organizer Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Full Name / Organizer Name *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tanvir Hasan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#1283E6] focus:bg-white outline-none"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mobile Number *</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 01700000000"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#1283E6] focus:bg-white outline-none"
                    />
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Password *</label>
                      <input
                        type="password"
                        placeholder="At least 6 chars"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#1283E6] focus:bg-white outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Confirm Password *</label>
                      <input
                        type="password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#1283E6] focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#1283E6] hover:bg-[#0A5DB8] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{loading ? 'Validating & Creating...' : 'Create Account'}</span>
                  </button>
                </form>
              )}

              {/* 3. FORGOT PASSWORD - STEP 1: REQUEST OTP */}
              {mode === 'forgot_request' && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    Enter your registered mobile number or email. We will send a 6-digit verification OTP code to reset your password.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Registered Mobile or Email</label>
                    <input
                      type="text"
                      placeholder="e.g. 01878113798"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#1283E6] outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      Back to Sign In
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-[#0A5DB8] hover:bg-[#061A36] text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      {loading ? 'Sending OTP...' : 'Send OTP Code'}
                    </button>
                  </div>
                </form>
              )}

              {/* 4. FORGOT PASSWORD - STEP 2: VERIFY OTP & SET NEW PASSWORD */}
              {mode === 'forgot_verify' && (
                <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
                  {/* OTP In-App Notification preview */}
                  {activeOtpCode && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          OTP Verification Code Received:
                        </span>
                        <button
                          type="button"
                          onClick={() => setEnteredOtp(activeOtpCode)}
                          className="text-[11px] font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg"
                        >
                          Auto-Fill OTP
                        </button>
                      </div>
                      <div className="p-2 bg-white rounded-xl text-center font-mono font-black text-xl text-[#061A36] tracking-widest border border-emerald-200">
                        {activeOtpCode}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-widest text-center focus:ring-2 focus:ring-[#1283E6] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">New Password</label>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#1283E6] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#1283E6] outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('forgot_request')}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      Resend OTP
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      {loading ? 'Updating Password...' : 'Save & Login'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
