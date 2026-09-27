import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  Check,
  Loader2,
  Crown,
  Trophy,
  Shield,
  Sparkles,
  Users,
  ChevronDown,
  Maximize2,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Category, Draft, Player, Team } from '../types';
import { DEFAULT_BPL_LOGO } from '../lib/imageUtils';
import { PhotoZoomModal } from './PhotoZoomModal';

interface TeamSquadPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  allTeams: Team[];
  players: Player[];
  categories: Category[];
  draft: Draft;
}

export const TeamSquadPosterModal: React.FC<TeamSquadPosterModalProps> = ({
  isOpen,
  onClose,
  team: initialTeam,
  allTeams,
  players,
  categories,
  draft,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    initialTeam?.id || allTeams[0]?.id || ''
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'png' | 'pdf' | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [zoomedPlayer, setZoomedPlayer] = useState<Player | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  // Sync selected team when initialTeam changes
  React.useEffect(() => {
    if (initialTeam?.id) {
      setSelectedTeamId(initialTeam.id);
    } else if (allTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(allTeams[0].id);
    }
  }, [initialTeam, allTeams]);

  if (!isOpen) return null;

  const activeTeam = allTeams.find((t) => t.id === selectedTeamId) || initialTeam || allTeams[0];
  if (!activeTeam) return null;

  const teamPlayers = players.filter((p) => p.assignedTeamId === activeTeam.id);
  const captain = players.find(
    (p) => p.id === activeTeam.captainPlayerId || (p.assignedTeamId === activeTeam.id && p.isCaptain)
  );

  // Group or sort players: Captain first, then by category order, then name
  const sortedPlayers = [...teamPlayers].sort((a, b) => {
    if (a.id === captain?.id) return -1;
    if (b.id === captain?.id) return 1;
    const catAIndex = categories.findIndex((c) => c.id === a.primaryCategoryId || c.id === a.assignedCategoryId);
    const catBIndex = categories.findIndex((c) => c.id === b.primaryCategoryId || c.id === b.assignedCategoryId);
    if (catAIndex !== catBIndex && catAIndex !== -1 && catBIndex !== -1) {
      return catAIndex - catBIndex;
    }
    return a.fullName.localeCompare(b.fullName);
  });

  const getCategory = (player: Player) => {
    return (
      categories.find((c) => c.id === player.assignedCategoryId || c.id === player.primaryCategoryId) || {
        name: 'General',
        color: '#1283E6',
      }
    );
  };

  const draftDateStr = new Date(draft.completedAt || draft.updatedAt || Date.now()).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  );

  // Helper to ensure images inside poster are loaded before canvas capture
  const waitForImages = async (container: HTMLElement) => {
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      })
    );
  };

  const handleDownloadPng = async () => {
    if (!posterRef.current || isExporting) return;
    setIsExporting(true);
    setExportType('png');
    setExportSuccess(null);

    try {
      await waitForImages(posterRef.current);
      const dataUrl = await toPng(posterRef.current, {
        pixelRatio: 2, // Crisp retina resolution
        cacheBust: true,
        backgroundColor: '#061A36',
        skipFonts: true,
      });

      const filename = `${activeTeam.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Official_Squad_BPL2.png`;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccess('PNG Squad Poster downloaded successfully!');
      setTimeout(() => setExportSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to generate squad PNG:', err);
      alert('Could not generate PNG. Please try again.');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!posterRef.current || isExporting) return;
    setIsExporting(true);
    setExportType('pdf');
    setExportSuccess(null);

    try {
      await waitForImages(posterRef.current);
      const dataUrl = await toPng(posterRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#061A36',
        skipFonts: true,
      });

      // Get dimensions of captured image
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      });

      const imgWidthPx = img.width || 1200;
      const imgHeightPx = img.height || 850;
      const isLandscape = imgWidthPx >= imgHeightPx;

      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate scale to fit on page with neat 8mm margin
      const margin = 8;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      let renderWidth = availableWidth;
      let renderHeight = (imgHeightPx * availableWidth) / imgWidthPx;

      if (renderHeight > availableHeight) {
        renderHeight = availableHeight;
        renderWidth = (imgWidthPx * availableHeight) / imgHeightPx;
      }

      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');

      const filename = `${activeTeam.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Official_Squad_BPL2.pdf`;
      pdf.save(filename);

      setExportSuccess('PDF Squad Document downloaded successfully!');
      setTimeout(() => setExportSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to generate squad PDF:', err);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0A192F] text-white rounded-3xl max-w-5xl w-full border border-slate-700 shadow-2xl flex flex-col my-auto max-h-[96vh] overflow-hidden">
        {/* Modal Top Action Bar */}
        <div className="px-5 py-3.5 border-b border-slate-700/80 bg-[#061426] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF7A2E] to-[#E05A12] flex items-center justify-center text-white shadow-md">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                Download Official Team Squad Poster
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Photos Included
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Generate high-definition PDF and PNG graphics with team logos & player photos
              </p>
            </div>
          </div>

          {/* Team Switcher */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 hidden sm:inline">Franchise:</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="bg-[#0D233A] border border-slate-600 text-white font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#1283E6]"
            >
              {allTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({players.filter((p) => p.assignedTeamId === t.id).length} players)
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Controls & Notifications */}
        <div className="px-5 py-3 bg-[#081B30] border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-white">{activeTeam.name}</span>
            <span>•</span>
            <span className="text-[#38BDF8]">
              {teamPlayers.length} / {activeTeam.maxPlayers || 11} Players
            </span>
            {captain && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-300">
                  <Crown className="w-3 h-3" />
                  Captain: {captain.fullName}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Download PNG Button */}
            <button
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#1283E6] to-[#0A5DB8] hover:from-[#1A90F5] hover:to-[#0F6BD0] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting && exportType === 'png' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
              <span>Save as PNG (Image)</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF7A2E] to-[#E05A12] hover:from-[#FF8B47] hover:to-[#EB661D] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting && exportType === 'pdf' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>Save as PDF (Document)</span>
            </button>
          </div>
        </div>

        {exportSuccess && (
          <div className="mx-5 my-2 px-4 py-2 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {/* Poster Live Canvas / Preview Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex justify-center items-start bg-[#030B17]">
          {/* THE ACTUAL RENDERABLE POSTER (Captured by html2canvas) */}
          <div
            ref={posterRef}
            className="w-full max-w-[960px] bg-[#061A36] text-white rounded-3xl overflow-hidden border border-[#0F356B] shadow-2xl relative select-none"
            style={{
              background: `radial-gradient(ellipse at 50% -10%, ${activeTeam.primaryColor || '#1283E6'}44 0%, #061A36 70%)`,
            }}
          >
            {/* Top Ornamental Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/10 relative overflow-hidden">
              {/* Background ambient watermarks */}
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between gap-4 relative z-10">
                {/* Tournament Brand Logo & Title */}
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#FFD700] to-[#FF8C00] p-0.5 shadow-xl shrink-0">
                    <div className="w-full h-full rounded-[14px] bg-[#061A36] flex items-center justify-center overflow-hidden">
                      <img
                        src={DEFAULT_BPL_LOGO}
                        alt="BPL Logo"
                        className="w-12 h-12 object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black tracking-widest text-[#FF7A2E] uppercase flex items-center gap-1.5">
                      <Trophy className="w-3 h-3 text-[#FFD700]" />
                      Brothers Premier League • Season 2 (2026)
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      OFFICIAL SQUAD ROSTER
                    </h2>
                    <div className="text-[11px] text-slate-300 font-medium">
                      Certified Player Lottery Allocations • {draftDateStr}
                    </div>
                  </div>
                </div>

                {/* Team Franchise Crest & Title */}
                <div className="flex items-center gap-3.5 text-right">
                  <div>
                    <div className="text-xs uppercase font-extrabold text-amber-300 tracking-wider">
                      Franchise Team
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                      {activeTeam.name}
                    </h1>
                    <div className="text-[11px] text-slate-300 font-medium flex items-center justify-end gap-2">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                        <Users className="w-3 h-3" />
                        {teamPlayers.length} / {activeTeam.maxPlayers || 11} Members
                      </span>
                      {activeTeam.shortName && (
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] font-bold">
                          {activeTeam.shortName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Team Logo Badge */}
                  <div
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl p-1 shadow-2xl flex items-center justify-center shrink-0 border-2"
                    style={{
                      borderColor: activeTeam.primaryColor || '#FF7A2E',
                      backgroundColor: `${activeTeam.primaryColor || '#1283E6'}25`,
                    }}
                  >
                    {activeTeam.logoUrl ? (
                      <img
                        src={activeTeam.logoUrl}
                        alt={activeTeam.name}
                        className="w-full h-full object-cover rounded-xl"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div
                        className="w-full h-full rounded-xl flex items-center justify-center font-black text-2xl text-white shadow-inner"
                        style={{ backgroundColor: activeTeam.primaryColor || '#1283E6' }}
                      >
                        {activeTeam.shortName || activeTeam.name.slice(0, 3).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Franchise Captain & Quota Bar */}
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Captain: {captain ? captain.fullName : activeTeam.captainName || 'Not Assigned'}</span>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-white/10 border border-white/20 text-slate-200 font-medium">
                    Squad Limit: <span className="font-bold text-white">{activeTeam.maxPlayers || 11} Players</span>
                  </div>
                </div>

                {/* Category count breakdown badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {categories.map((cat) => {
                    const count = teamPlayers.filter(
                      (p) => p.assignedCategoryId === cat.id || p.primaryCategoryId === cat.id
                    ).length;
                    if (count === 0) return null;
                    return (
                      <span
                        key={cat.id}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 border"
                        style={{
                          backgroundColor: `${cat.color || '#1283E6'}25`,
                          borderColor: `${cat.color || '#1283E6'}60`,
                          color: '#FFFFFF',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: cat.color || '#1283E6' }}
                        />
                        {cat.name}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Poster Main Body: Player Cards Grid with High-Res Photos */}
            <div className="p-5 sm:p-6">
              {sortedPlayers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-sm">No players allocated to this squad yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {sortedPlayers.map((player) => {
                    const cat = getCategory(player);
                    const isPlayerCaptain =
                      player.id === activeTeam.captainPlayerId || player.isCaptain;

                    return (
                      <div
                        key={player.id}
                        className={`rounded-2xl p-3.5 border transition-all relative overflow-hidden flex flex-col justify-between ${
                          isPlayerCaptain
                            ? 'bg-gradient-to-b from-[#1C2C4C] to-[#0A1B38] border-amber-400/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40'
                            : 'bg-[#0A2244]/90 border-[#143666]'
                        }`}
                      >
                        {/* Top Captain Ribbon */}
                        {isPlayerCaptain && (
                          <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-[#061A36] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl shadow-md flex items-center gap-1 z-10">
                            <Crown className="w-3 h-3" />
                            CAPTAIN
                          </div>
                        )}

                        {/* Player Photo + Basic Info */}
                        <div className="flex items-start gap-3.5">
                          {/* Photo Avatar with click-to-zoom */}
                          <div
                            onClick={() => setZoomedPlayer(player)}
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 shrink-0 shadow-md relative overflow-hidden cursor-pointer group/zoom ${
                              isPlayerCaptain
                                ? 'bg-gradient-to-tr from-amber-400 to-yellow-200 ring-2 ring-amber-400/50'
                                : 'bg-gradient-to-tr from-slate-600 to-slate-400'
                            }`}
                            title="Click to view large photo"
                          >
                            <div className="w-full h-full rounded-[14px] bg-[#061A36] overflow-hidden flex items-center justify-center relative">
                              {player.photoUrl ? (
                                <img
                                  src={player.photoUrl}
                                  alt={player.fullName}
                                  className="w-full h-full object-cover transition-transform group-hover/zoom:scale-105"
                                  crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 text-slate-300">
                                  <span className="font-extrabold text-sm text-[#1283E6]">
                                    #{player.jerseyNumber || '00'}
                                  </span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/zoom:opacity-100 flex items-center justify-center text-white transition-opacity pointer-events-none">
                                <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                              </div>
                            </div>

                            {/* Mini Jersey Number Badge */}
                            {player.jerseyNumber && (
                              <div className="absolute bottom-0 right-0 bg-[#061A36] border border-white/20 text-white font-mono font-black text-[9px] px-1 rounded-tl-md z-10">
                                #{player.jerseyNumber}
                              </div>
                            )}
                          </div>

                          {/* Player Identity (Fully visible, no truncate!) */}
                          <div className="flex-1 min-w-0 pr-1">
                            <h4 className="font-black text-sm text-white leading-snug break-words">
                              {player.fullName}
                            </h4>

                            {/* Notes / Subtitle */}
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
                                <div className="text-[11px] text-amber-200/90 font-medium mt-0.5 break-words">
                                  {cleanNotes}
                                </div>
                              ) : null;
                            })()}

                            {/* Role / Playing Type */}
                            <div className="text-[11px] text-slate-300 mt-1 font-medium break-words">
                              {player.playerType || player.battingStyle || 'Player'}
                            </div>

                            {/* Bowling Style */}
                            {player.bowlingStyle && (
                              <div className="text-[10px] text-slate-400 mt-0.5 break-words">
                                {player.bowlingStyle}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Category Tag & Badge */}
                        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                          <span
                            className="px-2.5 py-0.5 rounded-lg font-black tracking-wide shadow-xs"
                            style={{
                              backgroundColor: `${cat.color || '#1283E6'}35`,
                              color: '#FFFFFF',
                              border: `1px solid ${cat.color || '#1283E6'}80`,
                            }}
                          >
                            {cat.name}
                          </span>

                          <span className="font-mono font-black text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10">
                            {player.badge || 'PLAYER'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Poster Certified Footer */}
            <div className="px-6 py-3.5 bg-[#041226] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-slate-300">
                  Certified Official Squad • Brothers Premier League S-2
                </span>
              </div>

              <div className="flex items-center gap-3 text-[10px]">
                <span>Fair Play • Transparency • Brotherhood</span>
                <span>•</span>
                <span className="font-mono text-slate-500">
                  Generated: {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close Bar */}
        <div className="px-5 py-3 border-t border-slate-700/80 bg-[#061426] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            Tip: Both PNG and PDF formats include full team logos, badges, and high-resolution player photos.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Big Photo Zoom Lightbox Modal */}
      <PhotoZoomModal
        isOpen={Boolean(zoomedPlayer)}
        onClose={() => setZoomedPlayer(null)}
        player={zoomedPlayer}
        team={activeTeam}
        category={zoomedPlayer ? getCategory(zoomedPlayer) : undefined}
      />
    </div>
  );
};
