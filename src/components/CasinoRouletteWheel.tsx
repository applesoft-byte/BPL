import React, { useMemo } from 'react';
import { Team, Player } from '../types';

interface CasinoRouletteWheelProps {
  teams: Team[];
  activePlayer: Player | null;
  isSpinning: boolean;
  winningTeamId: string | null;
  cylinderRotation: number;
  ballAngle: number;
  ballRadiusPercent: number; // 48% is outer track, 34% is inside pocket
  isBallInPocket: boolean;
}

export const CasinoRouletteWheel: React.FC<CasinoRouletteWheelProps> = ({
  teams,
  activePlayer,
  isSpinning,
  winningTeamId,
  cylinderRotation,
  ballAngle,
  ballRadiusPercent,
  isBallInPocket,
}) => {
  // Generate 12 or 18 alternating roulette pockets distributed across active teams
  const pockets = useMemo(() => {
    if (teams.length === 0) return [];
    // 12 pockets total (e.g. 4 pockets per team for 3 teams, perfectly distributed)
    const totalPockets = Math.max(12, teams.length * 4);
    const list: Array<{
      index: number;
      team: Team;
      label: string;
      number: number;
      color: string;
    }> = [];

    for (let i = 0; i < totalPockets; i++) {
      const team = teams[i % teams.length];
      list.push({
        index: i,
        team,
        label: team.shortName,
        number: i + 1,
        color: team.primaryColor || (i % 2 === 0 ? '#16A34A' : '#D97706'),
      });
    }
    return list;
  }, [teams]);

  const totalPockets = pockets.length;
  const pocketAngle = totalPockets > 0 ? 360 / totalPockets : 30;

  // Compute Ball Cartesian coordinates
  const ballRad = (ballAngle * Math.PI) / 180;
  // center is at 50%, 50%
  const ballX = 50 + ballRadiusPercent * Math.cos(ballRad);
  const ballY = 50 + ballRadiusPercent * Math.sin(ballRad);

  return (
    <div className="relative w-[340px] sm:w-[420px] md:w-[460px] h-[340px] sm:h-[420px] md:h-[460px] flex items-center justify-center select-none">
      {/* 1. OUTER POLISHED MAHOGANY CASING */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2c1005] via-[#481c0c] to-[#1a0802] p-3 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(217,119,6,0.25)] border-4 border-[#8B4513] flex items-center justify-center">
        {/* Brass Inlaid Outer Ring & Screws */}
        <div className="absolute inset-2 sm:inset-2.5 rounded-full border-2 border-[#D4AF37]/50 pointer-events-none" />
        {Array.from({ length: 12 }).map((_, idx) => {
          const angle = (idx / 12) * 360;
          const rad = (angle * Math.PI) / 180;
          const x = 50 + 48.5 * Math.cos(rad);
          const y = 50 + 48.5 * Math.sin(rad);
          return (
            <div
              key={idx}
              className="absolute w-2 h-2 rounded-full bg-gradient-to-tr from-[#8B6508] via-[#FFD700] to-[#FFF8DC] shadow-xs border border-[#4A3205]"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
            />
          );
        })}

        {/* 2. SILVER / CHROME BALL TRACK */}
        <div className="absolute inset-5 sm:inset-7 rounded-full bg-gradient-to-br from-[#4A5568] via-[#A0AEC0] to-[#2D3748] p-1.5 shadow-inner border border-slate-400/40 flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-gradient-to-b from-[#1A202C] via-[#2D3748] to-[#171923] border border-slate-600/60 relative flex items-center justify-center">
            
            {/* Brass Diamond Deflectors (8 canoes on the ball track) */}
            {Array.from({ length: 8 }).map((_, idx) => {
              const angle = (idx / 8) * 360;
              const rad = (angle * Math.PI) / 180;
              const x = 50 + 43.5 * Math.cos(rad);
              const y = 50 + 43.5 * Math.sin(rad);
              return (
                <div
                  key={idx}
                  className="absolute w-2 h-3.5 bg-gradient-to-b from-[#FFF8DC] via-[#FFD700] to-[#996515] rounded-[2px] shadow-sm border border-[#7B5B00] transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                  }}
                />
              );
            })}

            {/* 3. ROTATING ROULETTE CYLINDER (POCKETS) */}
            <div
              className="w-[82%] h-[82%] rounded-full relative overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.9)] border-2 border-[#FFD700]/70"
              style={{
                transform: `rotate(${cylinderRotation}deg)`,
                transition: isSpinning
                  ? 'transform 4.5s cubic-bezier(0.12, 0.8, 0.33, 1)'
                  : 'transform 0.3s ease-out',
              }}
            >
              {/* SVG Pockets Circle */}
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {pockets.map((pkt) => {
                  const startAngle = pkt.index * pocketAngle - 90;
                  const endAngle = startAngle + pocketAngle;

                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;

                  const x1 = 50 + 50 * Math.cos(startRad);
                  const y1 = 50 + 50 * Math.sin(startRad);
                  const x2 = 50 + 50 * Math.cos(endRad);
                  const y2 = 50 + 50 * Math.sin(endRad);

                  const isWinning = winningTeamId === pkt.team.id;

                  return (
                    <g key={pkt.index}>
                      {/* Pocket Sector */}
                      <path
                        d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                        fill={pkt.color}
                        stroke="#FFD700"
                        strokeWidth="0.6"
                        className={isWinning && !isSpinning ? 'animate-pulse brightness-125' : ''}
                      />
                    </g>
                  );
                })}
                {/* Inner Metallic Separator Ring */}
                <circle cx="50" cy="50" r="30" fill="none" stroke="#D4AF37" strokeWidth="1" />
                <circle cx="50" cy="50" r="29" fill="#1A202C" />
              </svg>

              {/* Pocket Labels & Numbers */}
              {pockets.map((pkt) => {
                const midAngle = pkt.index * pocketAngle;
                const rad = (midAngle * Math.PI) / 180;
                const r = 39; // 39% radius
                const x = 50 + r * Math.sin(rad);
                const y = 50 - r * Math.cos(rad);

                const isWinning = winningTeamId === pkt.team.id;

                return (
                  <div
                    key={pkt.index}
                    className="absolute pointer-events-none flex flex-col items-center justify-center text-center -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: `translate(-50%, -50%) rotate(${midAngle}deg)`,
                    }}
                  >
                    <span className="text-[9px] sm:text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] uppercase tracking-tight">
                      {pkt.label}
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-bold text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {pkt.number}
                    </span>
                    {isWinning && !isSpinning && (
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-ping mt-0.5" />
                    )}
                  </div>
                );
              })}

              {/* Inner Bowl Shadow */}
              <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none" />
            </div>

            {/* 4. CENTER BRASS TURRET / CONE SPINDLE */}
            <div className="absolute z-20 w-28 sm:w-32 h-28 sm:h-32 rounded-full bg-gradient-to-b from-[#FFF8DC] via-[#D4AF37] to-[#7B5B00] shadow-[0_5px_15px_rgba(0,0,0,0.7)] border-2 border-[#5A4200] flex items-center justify-center pointer-events-none">
              {/* 4-Prong Brass Roulette Handles */}
              <div className="absolute w-full h-2.5 bg-gradient-to-r from-[#996515] via-[#FFD700] to-[#996515] rounded-full shadow-md transform rotate-0" />
              <div className="absolute w-full h-2.5 bg-gradient-to-r from-[#996515] via-[#FFD700] to-[#996515] rounded-full shadow-md transform rotate-90" />

              {/* Center Gemstone / Crest Dome */}
              <div className="relative z-30 w-16 sm:w-18 h-16 sm:h-18 rounded-full bg-gradient-to-br from-[#061A36] to-[#0A244A] border-2 border-[#FFD700] shadow-inner flex flex-col items-center justify-center text-center p-1">
                {activePlayer ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-300 shadow-xs bg-slate-800 flex items-center justify-center">
                    {activePlayer.photoUrl ? (
                      <img
                        src={activePlayer.photoUrl}
                        alt={activePlayer.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-black text-amber-300">
                        #{activePlayer.jerseyNumber || '00'}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] font-black text-amber-400 tracking-wider">
                    BPL
                  </div>
                )}
                <span className="text-[8px] font-black text-slate-200 truncate max-w-[55px] mt-0.5">
                  {activePlayer ? activePlayer.fullName.split(' ')[0] : 'ROULETTE'}
                </span>
              </div>
            </div>

            {/* 5. THE IVORY ROULETTE BALL */}
            <div
              className={`absolute z-40 rounded-full bg-gradient-to-br from-white via-[#F8FAFC] to-[#CBD5E1] border border-slate-300 shadow-[0_3px_8px_rgba(0,0,0,0.8),0_0_6px_rgba(255,255,255,0.9)] transition-all pointer-events-none ${
                isBallInPocket ? 'w-3.5 h-3.5' : 'w-4 h-4'
              }`}
              style={{
                left: `${ballX}%`,
                top: `${ballY}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />

            {/* Winner Dolly / Golden Marker on Top of Winning Pocket */}
            {winningTeamId && !isSpinning && (
              <div
                className="absolute z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-bounce"
                style={{
                  left: `${ballX}%`,
                  top: `${ballY - 5}%`,
                }}
              >
                <div className="w-2.5 h-6 bg-gradient-to-b from-[#FFF8DC] via-[#FFD700] to-[#B8860B] rounded-full shadow-lg border border-amber-800" />
                <div className="w-4 h-1.5 bg-[#FFD700] rounded-full -mt-0.5 border border-amber-900" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
