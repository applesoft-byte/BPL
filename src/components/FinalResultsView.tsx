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
} from 'lucide-react';
import { Category, Draft, Player, Team } from '../types';
import { PdfExportModal } from './PdfExportModal';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const draftedPlayers = players.filter((p) => p.status === 'drafted');
  const isComplete = draftedPlayers.length > 0;
  const draftDateStr = new Date(draft.completedAt || draft.updatedAt || Date.now()).toLocaleDateString(
    'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' }
  );

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
    <div className="space-y-8 max-w-7xl mx-auto print:p-0 print:m-0 print:space-y-4">
      {/* Top Hero Banner */}
      <div className="bg-[#061A36] text-white rounded-3xl p-6 sm:p-8 border border-[#0A244A] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 print:bg-white print:text-black print:border-none print:p-0">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-[#FF7A2E]/20 text-[#FF7A2E] border border-[#FF7A2E]/30 print:hidden">
            <Trophy className="w-3.5 h-3.5" />
            OFFICIAL ANNOUNCEMENT
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            FINAL TEAM ROSTERS
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl print:text-slate-600">
            Brothers Premier League (BPL) Season-2 • Certified Official Squads
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
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1283E6] hover:bg-[#0A5DB8] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            DOWNLOAD PDF
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
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
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

      {/* Filter and View Controls (Section 28) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {/* Team Filter */}
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-[#1283E6]"
          >
            <option value="all">All Teams</option>
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
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-[#1283E6]"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-white shadow-2xs text-[#1283E6]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-white shadow-2xs text-[#1283E6]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TEAM SQUAD ROSTERS SECTIONS (Section 27) */}
      <div className="space-y-8">
        {filteredTeams.map((team) => {
          const teamPlayers = players.filter((p) => p.assignedTeamId === team.id);

          return (
            <div
              key={team.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden break-inside-avoid print:border-slate-300"
            >
              {/* Franchise Team Header Banner */}
              <div
                className="p-5 sm:p-6 text-white flex items-center justify-between"
                style={{ backgroundColor: team.primaryColor || '#0A5DB8' }}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/15 backdrop-blur-xs flex items-center justify-center font-black text-xl border border-white/20 shrink-0">
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
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">{team.name}</h3>
                    <p className="text-xs text-white/80">
                      Official Squad Roster • {teamPlayers.length} / {team.maxPlayers || 11} Registered Players
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 backdrop-blur-xs border border-white/30">
                    {teamPlayers.length === (team.maxPlayers || 11) ? 'SQUAD COMPLETE' : `${(team.maxPlayers || 11) - teamPlayers.length} SLOTS OPEN`}
                  </span>
                </div>
              </div>

              {/* Dynamic Categories breakdown */}
              <div className="p-6 space-y-6">
                {categories
                  .filter((cat) => selectedCategoryFilter === 'all' || cat.id === selectedCategoryFilter)
                  .map((cat) => {
                    const catPlayers = teamPlayers.filter(
                      (p) => p.primaryCategoryId === cat.id || p.assignedCategoryId === cat.id
                    );

                    if (catPlayers.length === 0) return null;

                    return (
                      <div key={cat.id} className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <h4 className="text-xs font-black text-slate-800 tracking-wider uppercase">
                            {cat.name} ({catPlayers.length})
                          </h4>
                        </div>

                        {/* Player Cards */}
                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {catPlayers.map((player) => (
                              <div
                                key={player.id}
                                className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200 flex items-start gap-3 hover:bg-white hover:border-[#1283E6]/40 hover:shadow-2xs transition-all"
                              >
                                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs relative">
                                  {player.photoUrl ? (
                                    <img
                                      src={player.photoUrl}
                                      alt={player.fullName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="font-extrabold text-[#1283E6] text-xs">
                                      #{player.jerseyNumber || '00'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 truncate">
                                  <div className="flex items-center justify-between gap-1">
                                    <h5 className="font-extrabold text-sm text-[#061A36] truncate">
                                      {player.fullName}
                                    </h5>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#0A5DB8] shrink-0">
                                      {player.badge}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                    {player.battingStyle} • {player.bowlingStyle}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                            {catPlayers.map((player) => (
                              <div
                                key={player.id}
                                className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 bg-white"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                    {player.photoUrl ? (
                                      <img
                                        src={player.photoUrl}
                                        alt={player.fullName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="font-bold text-[#1283E6] text-[10px]">
                                        #{player.jerseyNumber}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-bold text-slate-900">{player.fullName}</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-500">
                                  <span>{player.battingStyle}</span>
                                  <span>{player.bowlingStyle}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                    {player.badge}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {/* PDF Export Modal */}
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
