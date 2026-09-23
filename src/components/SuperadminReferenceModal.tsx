import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Plus,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Users,
  KeyRound,
  Sparkles,
  PhoneCall,
  Search,
  ExternalLink,
} from 'lucide-react';
import { AppUser, ReferenceNumber } from '../types';
import { authService, SUPERADMIN_MOBILE, SUPERADMIN_NAME } from '../lib/authService';

interface SuperadminReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
}

export const SuperadminReferenceModal: React.FC<SuperadminReferenceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'refs' | 'users'>('refs');
  const [referenceNumbers, setReferenceNumbers] = useState<ReferenceNumber[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New Code Form State
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('5');
  const [newNotes, setNewNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isSuperadmin =
    currentUser?.role === 'superadmin' ||
    authService.isSuperadmin(currentUser?.mobile || '') ||
    authService.isSuperadmin(currentUser?.email || '');

  const loadData = async () => {
    setLoading(true);
    try {
      const [refs, userList] = await Promise.all([
        authService.getAllReferenceNumbers(),
        authService.getAllRegisteredUsers(),
      ]);
      setReferenceNumbers(refs);
      setUsers(userList);
    } catch (err) {
      console.warn('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGenerateRandomCode = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setNewCode(`BPL-${randomSuffix}`);
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) {
      setStatusMessage('Please enter or generate a Reference Code.');
      return;
    }

    try {
      setIsAdding(true);
      setStatusMessage(null);
      await authService.createReferenceNumber({
        code: newCode.trim(),
        label: newLabel.trim() || 'Organizer Pass',
        maxUses: Number(newMaxUses) || 1,
        notes: newNotes.trim(),
      });
      setNewCode('');
      setNewLabel('');
      setNewMaxUses('5');
      setNewNotes('');
      setStatusMessage('Reference Code successfully created & saved to Firebase!');
      await loadData();
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to create code.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleStatus = async (ref: ReferenceNumber) => {
    const nextStatus = ref.status === 'active' ? 'revoked' : 'active';
    await authService.updateReferenceNumber({ ...ref, status: nextStatus });
    await loadData();
  };

  const handleIncreaseUses = async (ref: ReferenceNumber, addAmount: number) => {
    const updatedUses = ref.maxUses + addAmount;
    const newStatus = ref.usedCount < updatedUses ? 'active' : ref.status;
    await authService.updateReferenceNumber({
      ...ref,
      maxUses: updatedUses,
      status: newStatus,
    });
    await loadData();
  };

  const handleDelete = async (refId: string, code: string) => {
    if (confirm(`Are you sure you want to permanently delete Reference Code "${code}"?`)) {
      await authService.deleteReferenceNumber(refId);
      await loadData();
    }
  };

  if (!isOpen) return null;

  const filteredRefs = referenceNumbers.filter(
    (r) =>
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.mobile.includes(searchQuery) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#061A36] via-[#0A5DB8] to-[#0264D4] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Superadmin Reference Portal
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-[#061A36] text-[10px] font-black uppercase">
                  Arif Iquebal
                </span>
              </div>
              <p className="text-xs text-blue-100 flex items-center gap-2">
                <span>Manage Registration Reference Numbers, Quotas & Organizers</span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                  <PhoneCall className="w-3 h-3" /> +88{SUPERADMIN_MOBILE}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('refs')}
              className={`flex-1 sm:flex-none flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'refs'
                  ? 'bg-[#061A36] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Reference Codes ({referenceNumbers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 sm:flex-none flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-[#061A36] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#1283E6]" />
              <span>Registered Organizers ({users.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'refs' ? 'Search codes or label...' : 'Search mobile, name...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1283E6] focus:border-transparent outline-none"
              />
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
              <span>{statusMessage}</span>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-emerald-600 hover:text-emerald-800 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {activeTab === 'refs' && (
            <div className="space-y-6">
              {/* Create New Reference Code Card */}
              <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl p-4 sm:p-5 border border-blue-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-[#061A36] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF7A2E]" />
                    Generate / Create New Reference Number
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    Will be instantly valid for registration
                  </span>
                </div>

                <form onSubmit={handleCreateCode} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">Reference Code</label>
                      <button
                        type="button"
                        onClick={handleGenerateRandomCode}
                        className="text-[10px] font-extrabold text-[#1283E6] hover:underline"
                      >
                        Auto-Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. BPL-2026-VIP"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider focus:ring-2 focus:ring-[#1283E6] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Label / Assigned To</label>
                    <input
                      type="text"
                      placeholder="e.g. Dhaka Division Tournament"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#1283E6] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Max Usages</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={newMaxUses}
                      onChange={(e) => setNewMaxUses(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-[#1283E6] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={isAdding}
                      className="w-full py-2 px-3 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      {isAdding ? 'Creating...' : 'Create Pass'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Reference Numbers Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3 bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-700 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-4 sm:col-span-3">Code</div>
                  <div className="col-span-4 sm:col-span-4">Label & Notes</div>
                  <div className="col-span-2 sm:col-span-2 text-center">Uses / Limit</div>
                  <div className="hidden sm:block sm:col-span-1 text-center">Status</div>
                  <div className="col-span-2 sm:col-span-2 text-right">Actions</div>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredRefs.map((ref) => {
                    const isExhausted = ref.maxUses > 0 && ref.usedCount >= ref.maxUses;
                    const isActive = ref.status === 'active' && !isExhausted;

                    return (
                      <div
                        key={ref.id}
                        className="p-3 sm:p-4 grid grid-cols-12 gap-3 items-center text-xs hover:bg-slate-50 transition-colors"
                      >
                        <div className="col-span-4 sm:col-span-3 flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-[#061A36] tracking-wide">
                            {ref.code}
                          </span>
                          <button
                            onClick={() => handleCopy(ref.code)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                            title="Copy Code"
                          >
                            {copiedCode === ref.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="col-span-4 sm:col-span-4">
                          <p className="font-bold text-slate-800 truncate">{ref.label}</p>
                          {ref.notes && (
                            <p className="text-[10px] text-slate-400 truncate">{ref.notes}</p>
                          )}
                          {ref.usedByMobiles && ref.usedByMobiles.length > 0 && (
                            <p className="text-[9px] text-blue-600 truncate mt-0.5">
                              Used by: {ref.usedByMobiles.join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="col-span-2 sm:col-span-2 text-center">
                          <span
                            className={`font-black text-xs ${
                              isExhausted ? 'text-rose-600' : 'text-slate-700'
                            }`}
                          >
                            {ref.usedCount} / {ref.maxUses}
                          </span>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${
                                isExhausted
                                  ? 'bg-rose-500'
                                  : ref.usedCount > 0
                                  ? 'bg-blue-600'
                                  : 'bg-slate-300'
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  ref.maxUses > 0 ? (ref.usedCount / ref.maxUses) * 100 : 0
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="hidden sm:block sm:col-span-1 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : ref.status === 'revoked'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isActive ? 'ACTIVE' : ref.status === 'revoked' ? 'REVOKED' : 'USED'}
                          </span>
                        </div>

                        <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleIncreaseUses(ref, 5)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                            title="Add +5 usage allowance"
                          >
                            +5 Uses
                          </button>

                          <button
                            onClick={() => handleToggleStatus(ref)}
                            className={`p-1.5 rounded-lg text-[10px] font-bold ${
                              ref.status === 'active'
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={ref.status === 'active' ? 'Revoke Pass' : 'Activate Pass'}
                          >
                            {ref.status === 'active' ? 'Revoke' : 'Active'}
                          </button>

                          <button
                            onClick={() => handleDelete(ref.id, ref.code)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredRefs.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No Reference Codes match your search.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-3 bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-700 grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4">Organizer Name</div>
                <div className="col-span-3">Mobile Number</div>
                <div className="col-span-3">Reference Used</div>
                <div className="col-span-2 text-right">Role</div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 sm:p-4 grid grid-cols-12 gap-3 items-center text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="col-span-4">
                      <p className="font-extrabold text-[#061A36]">{u.fullName}</p>
                      {u.email && <p className="text-[10px] text-slate-400">{u.email}</p>}
                    </div>

                    <div className="col-span-3 font-mono font-bold text-slate-700">
                      {u.mobile}
                    </div>

                    <div className="col-span-3">
                      <span className="font-mono font-black text-xs text-[#1283E6] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {u.referenceNumber || 'N/A'}
                      </span>
                    </div>

                    <div className="col-span-2 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          u.role === 'superadmin'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No registered organizers found yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            Arif Iquebal Support Helpline: <strong>+88{SUPERADMIN_MOBILE}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors"
          >
            Close Portal
          </button>
        </div>
      </div>
    </div>
  );
};
