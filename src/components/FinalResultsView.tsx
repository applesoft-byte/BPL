import React, { useState } from 'react';
import {
  Trophy,
  Download,
  FileSpreadsheet,
  FileJson,
  Printer,
  Shield,
  Layers,
  Filter,
  LayoutGrid,
  List,
  CheckCircle2,
  Calendar,
  Sparkles,
  Crown,
  Users,
  Image as ImageIcon,
  FileText,
  ChevronDown,
  Search,
  Maximize2,
} from 'lucide-react';
import { Category, Draft, Player, Team } from '../types';
import { PdfExportModal } from './PdfExportModal';
import { TeamSquadPosterModal } from './TeamSquadPosterModal';
import { PhotoZoomModal } from './PhotoZoomModal';

interface FinalResultsViewProps {
  draft: Draft;
  teams: Team[];
  players: Player[];
  categories: Category[];
  onExportJson: () => void;
}

export const FinalResultsView: React.FC<FinalResultsViewProps> = ({
  draft,
  teams,
  players,
  categories,
  onExportJson,
}) => {
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'compact' | 'list' | 'categories'>('compact');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [zoomedPlayer, setZoomedPlayer] = useState<Player | null>(null);
  
  // Squad Poster Modal state for PNG & PDF downloads with photos & logos
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [posterModalTeam, setPosterModalTeam] = useState<Team | null>(null);

  const draftedPlayers = players.filter((p) => p.status === 'drafted');
  const isComplete = draftedPlayers.length > 0;
  const draftDateStr = new Date(draft.completedAt || draft.updatedAt || Date.now()).toLocaleDateString(
    'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' }
  );

  const handleOpenPosterModal = (teamToOpen?: Team) => {
    setPosterModalTeam(teamToOpen || teams[0] || null);
    setIsPosterModalOpen(true);
  };

  const handleExportCsv = () => {
    const headers = [
      'Franchise Team',
      'Player Name',
      'Jersey No',
      'Category',
      'Badge',
      'Batting Style',
      'Bowling Style',
      'Role Description',
    ];

    const rows: string[] = [];

    teams.forEach((t) => {
      const teamPlayers = players.filter((p) => p.assignedTeamId === t.id);
      teamPlayers.forEach((p) => {
        const cat = categories.find((c) => c.id === p.primaryCategoryId)?.name || 'Unknown';
        rows.push(
          [
            `"${t.name.replace(/"/g, '""')}"`,
            `"${p.fullName.replace(/"/g, '""')}"`,
            `"${p.jerseyNumber}"`,
            `"${cat}"`,
            `"${p.badge}"`,
            `"${p.battingStyle}"`,
            `"${p.bowlingStyle}"`,
            `"${p.playerType}"`,
          ].join(',')
        );
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `BPL_Season2_Final_Rosters_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered teams list
  const filteredTeams = teams.filter(
    (t) => selectedTeamFilter === 'all' || t.id === selectedTeamFilter
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:p-0 print:m-0 print:space-y-4">
      {/* Top Hero Banner */}
      <div className="bg-[#061A36] text-white rounded-3xl p-6 sm:p-7 border border-[#0A244A] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 print:bg-white print:text-black print:border-none print:p-0">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-[#FF7A2E]/20 text-[#FF7A2E] border border-[#FF7A2E]/30 print:hidden">
            <Trophy className="w-3.5 h-3.5" />
            OFFICIAL TOURNAMENT ROSTERS
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            FINAL TEAM ROSTERS
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl print:text-slate-600">
            Brothers Premier League (BPL) Season-2 • Certified Official Squads & Player Allocations
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 print:text-slate-600">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {draftDateStr}
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Certified Allocations
            </span>
          </div>
        </div>

        {/* Export & Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 print:hidden">
          {/* Main Download Squad (PDF & PNG) Button */}
          <button
            onClick={() => handleOpenPosterModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF7A2E] to-[#E05A12] hover:from-[#FF8B47] hover:to-[#EB661D] text-white font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer ring-2 ring-orange-500/20"
            title="Download Squad as PNG image or PDF document with team logo and player photos"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD SQUAD (PDF / PNG)</span>
          </button>

          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#1283E6] hover:bg-[#0A5DB8] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            title="Generate multi-page BPL tournament booklet PDF"
          >
            <FileText className="w-4 h-4" />
            Full Tournament PDF
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <FileJson className="w-4 h-4" />
            JSON
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Total Teams</div>
          <div className="text-2xl font-black text-[#061A36]">{teams.length}</div>
          <div className="text-[11px] text-slate-400">Franchises</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Squad Members</div>
          <div className="text-2xl font-black text-[#1283E6]">{draftedPlayers.length}</div>
          <div className="text-[11px] text-slate-400">Total drafted</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Categories</div>
          <div className="text-2xl font-black text-[#16A34A]">{categories.length}</div>
          <div className="text-[11px] text-slate-400">Playing disciplines</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Status</div>
          <div className="text-2xl font-black text-[#FF7A2E]">
            {draft.status === 'completed' ? 'FINAL' : 'IN PROGRESS'}
          </div>
          <div className="text-[11px] text-slate-400">Roster state</div>
        </div>
      </div>

      {/* Dynamic Team Summary Matrix Table (Section 29) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1283E6]" />
            <h3 className="font-extrabold text-xs text-[#061A36] uppercase tracking-wider">
              Franchise Category Allocation Matrix
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Live Quotas & Actuals</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Team</th>
                <th className="p-3 text-center">Total Squad</th>
                {categories.map((c) => (
                  <th key={c.id} className="p-3 text-center">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map((team) => {
                const teamPlayers = players.filter((p) => p.assignedTeamId === team.id);

                return (
                  <tr key={team.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 flex items-center gap-2 font-bold text-slate-800">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                        style={{ backgroundColor: team.primaryColor || '#1283E6' }}
                      >
                        {team.shortName}
                      </div>
                      <span>{team.name}</span>
                    </td>

                    <td className="p-3 text-center font-extrabold text-[#1283E6]">
                      {teamPlayers.length} / {team.maxPlayers}
                    </td>

                    {categories.map((cat) => {
                      const count = teamPlayers.filter(
                        (p) =>
                          p.primaryCategoryId === cat.id || p.assignedCategoryId === cat.id
                      ).length;
                      const quota = team.quotas[cat.id] ?? 0;
                      const isSatisfied = count >= quota && quota > 0;

                      return (
                        <td key={cat.id} className="p-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] ${
                              isSatisfied
                                ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                                : 'text-slate-600 bg-slate-50'
                            }`}
                          >
                            {count}/{quota}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player, jersey, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:border-[#1283E6] w-48 sm:w-60"
            />
          </div>

          {/* Team Filter */}
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:border-[#1283E6]"
          >
            <option value="all">All Teams ({teams.length})</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:border-[#1283E6]"
          >
            <option value="all">All Disciplines</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Switcher: Compact, List, Grouped */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('compact')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-white shadow-2xs text-[#1283E6]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Compact Squad Grid (Photo + Name + Role)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Compact Squad</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white shadow-2xs text-[#1283E6]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Ultra-compact dense table rows"
          >
            <List className="w-3.5 h-3.5" />
            <span>Dense List</span>
          </button>
          <button
            onClick={() => setViewMode('categories')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'categories'
                ? 'bg-white shadow-2xs text-[#1283E6]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Category Grouped"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categorized</span>
          </button>
        </div>
      </div>

      {/* TEAM SQUAD ROSTERS SECTIONS (Compact & Beautiful) */}
      <div className="space-y-6">
        {filteredTeams.map((team) => {
          let teamPlayers = players.filter((p) => p.assignedTeamId === team.id);

          // Apply search query if present
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            teamPlayers = teamPlayers.filter((p) => {
              const cat = categories.find((c) => c.id === p.primaryCategoryId || c.id === p.assignedCategoryId);
              return (
                p.fullName.toLowerCase().includes(q) ||
                (p.jerseyNumber && String(p.jerseyNumber).includes(q)) ||
                (p.notes && p.notes.toLowerCase().includes(q)) ||
                (p.playerType && p.playerType.toLowerCase().includes(q)) ||
                (cat && cat.name.toLowerCase().includes(q))
              );
            });
          }

          // Apply category filter if not 'all'
          if (selectedCategoryFilter !== 'all') {
            teamPlayers = teamPlayers.filter(
              (p) => p.primaryCategoryId === selectedCategoryFilter || p.assignedCategoryId === selectedCategoryFilter
            );
          }

          const captain = players.find(
            (p) => p.id === team.captainPlayerId || (p.assignedTeamId === team.id && p.isCaptain)
          );

          // Sort: Captain first, then alphabetical
          const sortedSquad = [...teamPlayers].sort((a, b) => {
            if (a.id === captain?.id) return -1;
            if (b.id === captain?.id) return 1;
            return a.fullName.localeCompare(b.fullName);
          });

          return (
            <div
              key={team.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden break-inside-avoid print:border-slate-300 transition-shadow hover:shadow-sm"
            >
              {/* Franchise Team Header Banner (Compact & Sleek) */}
              <div
                className="p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${team.primaryColor || '#0A5DB8'} 0%, #061A36 100%)`,
                }}
              >
                {/* Team Info */}
                <div className="flex items-center gap-3.5 z-10">
                  {/* Team Logo Badge */}
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/15 backdrop-blur-xs flex items-center justify-center font-black text-xl border-2 border-white/30 shrink-0 shadow-md">
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      team.shortName
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                        {team.name}
                      </h3>
                      {team.shortName && (
                        <span className="px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[10px] font-bold">
                          {team.shortName}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/90 mt-0.5">
                      <span className="font-semibold flex items-center gap-1 text-sky-200">
                        <Users className="w-3.5 h-3.5" />
                        {teamPlayers.length} / {team.maxPlayers || 11} Players
                      </span>
                      {captain && (
                        <>
                          <span className="text-white/40">•</span>
                          <span className="flex items-center gap-1 text-amber-300 font-bold">
                            <Crown className="w-3.5 h-3.5 text-amber-300" />
                            Captain: {captain.fullName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Team Header Actions: DOWNLOAD SQUAD (PDF / PNG) + Quota summary */}
                <div className="flex flex-wrap items-center gap-2.5 z-10 sm:self-center">
                  {/* Category Quota Pills */}
                  <div className="hidden lg:flex items-center gap-1 bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-white/10">
                    {categories.map((cat) => {
                      const count = teamPlayers.filter(
                        (p) => p.assignedCategoryId === cat.id || p.primaryCategoryId === cat.id
                      ).length;
                      if (count === 0) return null;
                      return (
                        <span
                          key={cat.id}
                          className="text-[10px] font-bold text-white/90 px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${cat.color}35` }}
                        >
                          {cat.name}: {count}
                        </span>
                      );
                    })}
                  </div>

                  {/* DIRECT DOWNLOAD SQUAD (PDF / PNG) BUTTON */}
                  <button
                    onClick={() => handleOpenPosterModal(team)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#FF7A2E] to-[#E05A12] hover:from-[#FF8B47] hover:to-[#EB661D] active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer border border-white/20"
                    title="Download this team's squad poster with player photos and team logo in PDF and PNG"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Squad</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/30 text-amber-200 font-mono uppercase">
                      PDF / PNG
                    </span>
                  </button>
                </div>
              </div>

              {/* SQUAD PLAYERS DISPLAY */}
              <div className="p-4 sm:p-5">
                {sortedSquad.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    No players found matching your current filter.
                  </div>
                ) : viewMode === 'compact' ? (
                  /* 1. COMPACT SQUAD GRID (Spacious, elegant, with full names and zoomable photos) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {sortedSquad.map((player) => {
                      const cat = categories.find(
                        (c) => c.id === player.assignedCategoryId || c.id === player.primaryCategoryId
                      ) || { name: 'Player', color: '#1283E6' };
                      const isCaptain = player.id === captain?.id;

                      return (
                        <div
                          key={player.id}
                          className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between hover:shadow-sm ${
                            isCaptain
                              ? 'bg-amber-50/60 border-amber-300 shadow-xs ring-1 ring-amber-300/60'
                              : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-[#1283E6]/40'
                          }`}
                        >
                          {/* Top Row: Photo Avatar & Identity */}
                          <div className="flex items-start gap-3">
                            {/* Zoomable Avatar */}
                            <div
                              onClick={() => setZoomedPlayer(player)}
                              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative cursor-pointer group/zoom hover:ring-2 hover:ring-[#1283E6] transition-all"
                              title="Click to view large photo"
                            >
                              {player.photoUrl ? (
                                <img
                                  src={player.photoUrl}
                                  alt={player.fullName}
                                  className="w-full h-full object-cover transition-transform group-hover/zoom:scale-105"
                                />
                              ) : (
                                <span className="font-black text-[#1283E6] text-xs">
                                  #{player.jerseyNumber || '00'}
                                </span>
                              )}

                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/zoom:opacity-100 flex items-center justify-center text-white transition-opacity pointer-events-none">
                                <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                              </div>

                              {/* Corner Jersey Pill */}
                              {player.jerseyNumber && (
                                <div className="absolute bottom-0 right-0 bg-[#061A36] text-white font-mono font-black text-[9px] px-1 rounded-tl-md">
                                  #{player.jerseyNumber}
                                </div>
                              )}
                            </div>

                            {/* Full Name & Details (NO TRUNCATION!) */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1.5">
                                <h5 className="font-black text-sm text-[#061A36] leading-snug break-words">
                                  {player.fullName}
                                </h5>
                                {isCaptain && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs shrink-0">
                                    <Crown className="w-2.5 h-2.5" />
                                    CAPTAIN
                                  </span>
                                )}
                              </div>

                              {(() => {
                                const cleanNotes = player.notes
                                  ? player.notes
                                      .replace(/Bangla:\s*[^|]+(\||$)/gi, '')
                                      .replace(/[\u0980-\u09FF]+/g, '')
                                      .split('|')
                                      .map((p) => p.trim())
                                      .filter(Boolean)
                                      .join(' | ')
                                      .trim()
                                  : null;
                                return cleanNotes ? (
                                  <div className="text-[11px] text-amber-800 font-medium mt-0.5 break-words">
                                    {cleanNotes}
                                  </div>
                                ) : null;
                              })()}

                              <div className="text-xs text-slate-500 font-medium mt-1 break-words">
                                {player.playerType || `${player.battingStyle || 'RHB'}${player.bowlingStyle ? ` • ${player.bowlingStyle}` : ''}`}
                              </div>
                            </div>
                          </div>

                          {/* Bottom Row: Category and Badge */}
                          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                            <span
                              className="px-2.5 py-0.5 rounded-lg text-[10px] font-black text-white shadow-2xs"
                              style={{ backgroundColor: cat.color }}
                            >
                              {cat.name}
                            </span>

                            <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {player.badge || 'PLAYER'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : viewMode === 'list' ? (
                  /* 2. DENSE LIST VIEW (No name truncation, photo click-to-zoom) */
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
                    {sortedSquad.map((player) => {
                      const cat = categories.find(
                        (c) => c.id === player.assignedCategoryId || c.id === player.primaryCategoryId
                      ) || { name: 'Player', color: '#1283E6' };
                      const isCaptain = player.id === captain?.id;

                      return (
                        <div
                          key={player.id}
                          className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50 transition-colors ${
                            isCaptain ? 'bg-amber-50/40' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              onClick={() => setZoomedPlayer(player)}
                              className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer group/zoom relative hover:ring-2 hover:ring-[#1283E6]"
                              title="Click to view large photo"
                            >
                              {player.photoUrl ? (
                                <img
                                  src={player.photoUrl}
                                  alt={player.fullName}
                                  className="w-full h-full object-cover transition-transform group-hover/zoom:scale-105"
                                />
                              ) : (
                                <span className="font-bold text-[#1283E6] text-xs">
                                  #{player.jerseyNumber || '00'}
                                </span>
                              )}
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/zoom:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Maximize2 className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-sm text-slate-900 break-words">{player.fullName}</span>
                                {isCaptain && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                    <Crown className="w-2.5 h-2.5 text-amber-600" />
                                    CAPTAIN
                                  </span>
                                )}
                              </div>
                              {(() => {
                                const cleanNotes = player.notes
                                  ? player.notes
                                      .replace(/Bangla:\s*[^|]+(\||$)/gi, '')
                                      .replace(/[\u0980-\u09FF]+/g, '')
                                      .split('|')
                                      .map((p) => p.trim())
                                      .filter(Boolean)
                                      .join(' | ')
                                      .trim()
                                  : null;
                                return cleanNotes ? (
                                  <div className="text-[11px] text-amber-700 font-medium break-words">
                                    {cleanNotes}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-slate-600 text-xs pl-13 sm:pl-0">
                            <span className="hidden sm:inline">{player.battingStyle || 'RHB'}</span>
                            <span className="hidden md:inline">{player.bowlingStyle || 'Bowler'}</span>
                            <span
                              className="text-[10px] font-black px-2.5 py-0.5 rounded text-white shadow-2xs"
                              style={{ backgroundColor: cat.color }}
                            >
                              {cat.name}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              #{player.jerseyNumber || '00'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* 3. CATEGORIES BREAKDOWN (Spacious, zoomable, full names) */
                  <div className="space-y-4">
                    {categories.map((cat) => {
                      const catPlayers = sortedSquad.filter(
                        (p) => p.primaryCategoryId === cat.id || p.assignedCategoryId === cat.id
                      );
                      if (catPlayers.length === 0) return null;

                      return (
                        <div key={cat.id} className="space-y-2.5">
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              {cat.name} ({catPlayers.length})
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {catPlayers.map((player) => (
                              <div
                                key={player.id}
                                className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200 flex items-center gap-3 hover:bg-white transition-all shadow-2xs"
                              >
                                <div
                                  onClick={() => setZoomedPlayer(player)}
                                  className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer group/zoom relative hover:ring-2 hover:ring-[#1283E6]"
                                  title="Click to view large photo"
                                >
                                  {player.photoUrl ? (
                                    <img
                                      src={player.photoUrl}
                                      alt={player.fullName}
                                      className="w-full h-full object-cover transition-transform group-hover/zoom:scale-105"
                                    />
                                  ) : (
                                    <span className="font-bold text-[#1283E6] text-xs">
                                      #{player.jerseyNumber || '00'}
                                    </span>
                                  )}
                                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/zoom:opacity-100 flex items-center justify-center text-white transition-opacity">
                                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-black text-sm text-slate-900 leading-snug break-words">
                                    {player.fullName}
                                  </h5>
                                  <div className="text-xs text-slate-500 truncate mt-0.5">
                                    {player.battingStyle || 'RHB'}{player.bowlingStyle ? ` • ${player.bowlingStyle}` : ''}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* BIG PHOTO ZOOM LIGHTBOX MODAL */}
      <PhotoZoomModal
        isOpen={Boolean(zoomedPlayer)}
        onClose={() => setZoomedPlayer(null)}
        player={zoomedPlayer}
        team={teams.find((t) => t.id === zoomedPlayer?.assignedTeamId)}
        category={categories.find(
          (c) => c.id === zoomedPlayer?.primaryCategoryId || c.id === zoomedPlayer?.assignedCategoryId
        )}
      />

      {/* SQUAD POSTER DOWNLOAD MODAL (High-res PNG & PDF with Team Logo and Player Photos) */}
      <TeamSquadPosterModal
        isOpen={isPosterModalOpen}
        onClose={() => setIsPosterModalOpen(false)}
        team={posterModalTeam}
        allTeams={teams}
        players={players}
        categories={categories}
        draft={draft}
      />

      {/* Legacy Tournament Booklet PDF Export Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        draft={draft}
        teams={teams}
        players={players}
        categories={categories}
      />
    </div>
  );
};

