import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Download,
  Upload,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  CheckSquare,
  Square,
  Sparkles,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { Category, Player, PlayerBadge, Team } from '../types';
import { CsvImportModal } from './CsvImportModal';
import { DraftPoolModal } from './DraftPoolModal';
import { fileToDataUrl } from '../lib/imageUtils';

interface PlayersViewProps {
  players: Player[];
  categories: Category[];
  teams: Team[];
  activeDraftId: string;
  onSavePlayer: (player: Player) => Promise<void>;
  onBulkSavePlayers: (players: Player[]) => Promise<void>;
  onDeletePlayer: (playerId: string) => Promise<void>;
}

export const PlayersView: React.FC<PlayersViewProps> = ({
  players,
  categories,
  teams,
  activeDraftId,
  onSavePlayer,
  onBulkSavePlayers,
  onDeletePlayer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [poolFilter, setPoolFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'jersey' | 'category'>('name');

  // Edit/Create Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // CSV & Pool Modal State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);

  // Count in draft pool
  const poolCount = useMemo(() => {
    return players.filter((p) => p.inDraftPool !== false).length;
  }, [players]);

  // Filtered & Sorted players
  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        const matchesSearch =
          p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.jerseyNumber.includes(searchTerm) ||
          p.playerType.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
          selectedCategory === 'all' || p.primaryCategoryId === selectedCategory;
        const matchesStatus =
          selectedStatus === 'all' || p.status === selectedStatus;
        const inPool = p.inDraftPool !== false;
        const matchesPool =
          poolFilter === 'all' ||
          (poolFilter === 'in_pool' && inPool) ||
          (poolFilter === 'excluded' && !inPool);

        return matchesSearch && matchesCategory && matchesStatus && matchesPool;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
        if (sortBy === 'jersey')
          return (parseInt(a.jerseyNumber) || 0) - (parseInt(b.jerseyNumber) || 0);
        return a.primaryCategoryId.localeCompare(b.primaryCategoryId);
      });
  }, [players, searchTerm, selectedCategory, selectedStatus, poolFilter, sortBy]);

  const handleOpenAdd = () => {
    setEditingPlayer({
      id: `player-${Date.now()}`,
      draftId: activeDraftId,
      fullName: '',
      jerseyNumber: `${players.length + 1}`,
      primaryCategoryId: categories[0]?.id || '',
      playerType: 'All-Rounder',
      battingStyle: 'Right Handed',
      bowlingStyle: 'Right-arm Medium',
      badge: 'ALL-ROUNDER',
      inDraftPool: true,
      status: 'available',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setUploadError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (player: Player) => {
    setEditingPlayer({ ...player });
    setUploadError(null);
    setIsEditModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPlayer) return;

    try {
      setIsUploadingPhoto(true);
      setUploadError(null);
      const dataUrl = await fileToDataUrl(file, 400, 400);
      setEditingPlayer((prev) => (prev ? { ...prev, photoUrl: dataUrl } : null));
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleTogglePlayerPool = async (player: Player) => {
    const updated: Player = {
      ...player,
      inDraftPool: player.inDraftPool === false ? true : false,
      updatedAt: Date.now(),
    };
    await onSavePlayer(updated);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !editingPlayer.fullName.trim()) return;

    await onSavePlayer({
      ...editingPlayer,
      updatedAt: Date.now(),
    });
    setIsEditModalOpen(false);
    setEditingPlayer(null);
  };

  const handleUpdateDraftPool = async (playerIdsToInclude: string[]) => {
    const set = new Set(playerIdsToInclude);
    const updated = players.map((p) => ({
      ...p,
      inDraftPool: set.has(p.id),
      updatedAt: Date.now(),
    }));
    await onBulkSavePlayers(updated);
  };

  const handleExportCsv = () => {
    const headers = [
      'Full Name',
      'Jersey No',
      'Category',
      'Player Type',
      'Batting Style',
      'Bowling Style',
      'Badge',
      'In Draft Pool',
      'Status',
      'Assigned Team',
    ];

    const rows = players.map((p) => {
      const cat = categories.find((c) => c.id === p.primaryCategoryId)?.name || 'Unknown';
      const team = teams.find((t) => t.id === p.assignedTeamId)?.name || 'Unassigned';
      return [
        `"${p.fullName.replace(/"/g, '""')}"`,
        `"${p.jerseyNumber}"`,
        `"${cat}"`,
        `"${p.playerType}"`,
        `"${p.battingStyle}"`,
        `"${p.bowlingStyle}"`,
        `"${p.badge}"`,
        `"${p.inDraftPool !== false ? 'YES' : 'NO'}"`,
        `"${p.status}"`,
        `"${team}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `BPL_Season2_Players_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeStyle = (badge: PlayerBadge) => {
    switch (badge) {
      case 'HARD HITTER':
        return 'bg-red-50 text-[#DC2626] border-red-200';
      case 'CLASSIC':
        return 'bg-blue-50 text-[#2563EB] border-blue-200';
      case 'DESTROYER':
        return 'bg-orange-50 text-[#F97316] border-orange-200';
      case 'FINISHER':
        return 'bg-purple-50 text-[#7C3AED] border-purple-200';
      case 'ALL-ROUNDER':
        return 'bg-emerald-50 text-[#16A34A] border-emerald-200';
      case 'WICKET TAKER':
        return 'bg-rose-50 text-[#991B1B] border-rose-200';
      case 'ECONOMIST':
        return 'bg-teal-50 text-[#0F9CA6] border-teal-200';
      case 'GAME CHANGER':
        return 'bg-amber-50 text-[#D97706] border-amber-200';
      case 'SAFE HANDS':
        return 'bg-cyan-50 text-[#0891B2] border-cyan-200';
      case 'LEADER':
        return 'bg-indigo-50 text-[#0A5DB8] border-indigo-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#061A36] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1283E6]" />
            Cricket Player Registry ({players.length})
          </h2>
          <p className="text-xs text-slate-500">
            Upload player photos, manage draft selection pool ({poolCount} selected), and edit cricket disciplines
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Draft Selection Pool Button */}
          <button
            onClick={() => setIsPoolModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            title="Choose which players enter the draft lottery wheel"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Draft Pool ({poolCount} In Pool)</span>
          </button>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Player
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search player name, jersey number, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6] focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Draft Pool Filter */}
          <select
            value={poolFilter}
            onChange={(e) => setPoolFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-[#1283E6]"
          >
            <option value="all">Draft Pool: All Players</option>
            <option value="in_pool">✓ In Draft Pool Only</option>
            <option value="excluded">✕ Excluded from Draft</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#1283E6]"
          >
            <option value="all">All Roles</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#1283E6]"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available (Undrafted)</option>
            <option value="drafted">Drafted</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'jersey' | 'category')}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#1283E6]"
          >
            <option value="name">Sort by Name</option>
            <option value="jersey">Sort by Jersey #</option>
            <option value="category">Sort by Category</option>
          </select>
        </div>
      </div>

      {/* Players Cards Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 space-y-2">
          <p className="text-sm font-semibold text-slate-600">No players match current filters.</p>
          <p className="text-xs text-slate-400">Try adjusting your search criteria or add new players.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => {
            const category = categories.find((c) => c.id === player.primaryCategoryId);
            const team = teams.find((t) => t.id === player.assignedTeamId);
            const inPool = player.inDraftPool !== false;

            return (
              <div
                key={player.id}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                  player.status === 'drafted'
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : inPool
                    ? 'border-slate-200 hover:border-slate-300'
                    : 'border-slate-200 opacity-60 hover:opacity-100 bg-slate-50/40'
                }`}
              >
                <div>
                  {/* Card Top: Photo & Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                        {player.photoUrl ? (
                          <img
                            src={player.photoUrl}
                            alt={player.fullName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <Users className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.2 bg-[#061A36] text-white font-extrabold text-[10px] rounded-md shadow-xs">
                        #{player.jerseyNumber || '00'}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {player.status === 'drafted' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          DRAFTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1283E6] border border-blue-200">
                          AVAILABLE
                        </span>
                      )}

                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${getBadgeStyle(
                          player.badge
                        )}`}
                      >
                        {player.badge}
                      </span>
                    </div>
                  </div>

                  {/* Player Name & Category */}
                  <h3 className="font-extrabold text-sm text-[#061A36] truncate">
                    {player.fullName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: category?.color || '#1283E6' }}
                    />
                    <span className="truncate font-medium">{category?.name || 'Unassigned'}</span>
                  </div>

                  {/* Cricket Details */}
                  <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <div>
                      <span className="text-slate-400">Bat: </span>
                      <strong className="font-medium text-slate-700">{player.battingStyle}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Bowl: </span>
                      <strong className="font-medium text-slate-700">{player.bowlingStyle}</strong>
                    </div>
                    {team && (
                      <div className="pt-1 text-[#0A5DB8] font-bold flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span className="truncate">Team: {team.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pool Status & Actions */}
                <div className="flex items-center justify-between gap-1.5 pt-3 mt-3 border-t border-slate-100 text-xs">
                  {/* In Draft Pool Toggle */}
                  <button
                    onClick={() => handleTogglePlayerPool(player)}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                      inPool
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                    }`}
                    title={inPool ? 'Click to exclude from draft' : 'Click to include in draft'}
                  >
                    {inPool ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                    <span>{inPool ? 'In Draft Pool' : 'Excluded'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(player)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit player & photo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePlayer(player.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete player"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Player Modal */}
      {isEditModalOpen && editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <form onSubmit={handleSaveModal}>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-base font-bold text-[#061A36]">
                  {players.some((p) => p.id === editingPlayer.id) ? 'Edit Player & Photo' : 'Add New Player'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* Photo Upload Section */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                    {editingPlayer.photoUrl ? (
                      <img
                        src={editingPlayer.photoUrl}
                        alt="Player Portrait Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Users className="w-7 h-7 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="block font-bold text-slate-800">
                      Player Photo / Portrait
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1283E6] hover:bg-[#0A5DB8] text-white font-bold rounded-lg cursor-pointer transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                          disabled={isUploadingPhoto}
                        />
                      </label>

                      {editingPlayer.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditingPlayer({ ...editingPlayer, photoUrl: '' })}
                          className="px-2 py-1.5 text-slate-500 hover:text-red-600 text-[11px]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {uploadError && <p className="text-[11px] text-red-600">{uploadError}</p>}
                  </div>
                </div>

                {/* Draft Pool Inclusion Checkbox */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Include in Draft Pool</span>
                    <span className="text-[11px] text-slate-500">
                      When checked, this player appears in the live lottery wheel & queue
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingPlayer.inDraftPool !== false}
                    onChange={(e) =>
                      setEditingPlayer({ ...editingPlayer, inDraftPool: e.target.checked })
                    }
                    className="w-5 h-5 rounded text-[#1283E6] focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPlayer.fullName}
                    onChange={(e) =>
                      setEditingPlayer({ ...editingPlayer, fullName: e.target.value })
                    }
                    placeholder="e.g. Asif Khan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Jersey Number */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Jersey Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingPlayer.jerseyNumber}
                      onChange={(e) =>
                        setEditingPlayer({ ...editingPlayer, jerseyNumber: e.target.value })
                      }
                      placeholder="e.g. 07"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                    />
                  </div>

                  {/* Primary Category */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Role Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editingPlayer.primaryCategoryId}
                      onChange={(e) =>
                        setEditingPlayer({ ...editingPlayer, primaryCategoryId: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Player Type / Subtitle */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Player Discipline / Role Description
                  </label>
                  <input
                    type="text"
                    value={editingPlayer.playerType}
                    onChange={(e) =>
                      setEditingPlayer({ ...editingPlayer, playerType: e.target.value })
                    }
                    placeholder="e.g. Pure Batter, Express Pacer"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Batting Style */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Batting Style</label>
                    <select
                      value={editingPlayer.battingStyle}
                      onChange={(e) =>
                        setEditingPlayer({
                          ...editingPlayer,
                          battingStyle: e.target.value as 'Right Handed' | 'Left Handed',
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                    >
                      <option value="Right Handed">Right Handed</option>
                      <option value="Left Handed">Left Handed</option>
                    </select>
                  </div>

                  {/* Badge */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Skill Badge</label>
                    <select
                      value={editingPlayer.badge}
                      onChange={(e) =>
                        setEditingPlayer({
                          ...editingPlayer,
                          badge: e.target.value as PlayerBadge,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                    >
                      <option value="ALL-ROUNDER">ALL-ROUNDER</option>
                      <option value="HARD HITTER">HARD HITTER</option>
                      <option value="CLASSIC">CLASSIC</option>
                      <option value="DESTROYER">DESTROYER</option>
                      <option value="FINISHER">FINISHER</option>
                      <option value="WICKET TAKER">WICKET TAKER</option>
                      <option value="ECONOMIST">ECONOMIST</option>
                      <option value="GAME CHANGER">GAME CHANGER</option>
                      <option value="SAFE HANDS">SAFE HANDS</option>
                      <option value="LEADER">LEADER</option>
                    </select>
                  </div>
                </div>

                {/* Bowling Style */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bowling Style</label>
                  <input
                    type="text"
                    value={editingPlayer.bowlingStyle}
                    onChange={(e) =>
                      setEditingPlayer({ ...editingPlayer, bowlingStyle: e.target.value })
                    }
                    placeholder="e.g. Right-arm Fast, Left-arm Orthodox, None"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1283E6]"
                  />
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  Save Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <CsvImportModal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          draftId={activeDraftId}
          categories={categories}
          existingPlayers={players}
          onImportComplete={async (importedPlayers: Player[]) => {
            await onBulkSavePlayers(importedPlayers);
            setIsCsvModalOpen(false);
          }}
        />
      )}

      {/* Draft Pool Management Modal */}
      {isPoolModalOpen && (
        <DraftPoolModal
          isOpen={isPoolModalOpen}
          onClose={() => setIsPoolModalOpen(false)}
          players={players}
          categories={categories}
          teams={teams}
          onUpdateDraftPool={handleUpdateDraftPool}
        />
      )}
    </div>
  );
};
