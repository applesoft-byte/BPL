import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Crown,
  CheckCircle2,
  Lock,
  Zap,
  X,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Category, Player, Team } from '../types';
import { soundManager } from '../lib/sound';
import { getCryptoRandomIndex } from '../lib/cryptoRandom';

interface TeamOrbitSpinOverlayProps {
  isOpen: boolean;
  player: Player | null;
  teams: Team[];
  activeCategory: Category;
  eligibleTeams: Team[];
  teamsWithCaptainInCategory?: Set<string>;
  excludedTeamIds?: string[];
  onConfirmPick: (player: Player, team: Team) => Promise<void>;
  onClose: () => void;
  autoPickEnabled: boolean;
  tournamentLogo?: string;
}

type SpinPhase = 'idle' | 'spinning' | 'landed' | 'flying' | 'done';

export const TeamOrbitSpinOverlay: React.FC<TeamOrbitSpinOverlayProps> = ({
  isOpen,
  player,
  teams,
  activeCategory,
  eligibleTeams,
  teamsWithCaptainInCategory = new Set(),
  excludedTeamIds = [],
  onConfirmPick,
  onClose,
  autoPickEnabled,
  tournamentLogo,
}) => {
  const [phase, setPhase] = useState<SpinPhase>('idle');
  const [rotationAngle, setRotationAngle] = useState(0);
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flightProgress, setFlightProgress] = useState(0); // 0 (center) to 1 (at team)
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [hasAnnounced, setHasAnnounced] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const flightFrameRef = useRef<number | null>(null);

  const totalTeams = teams.length;
  const stepAngle = totalTeams > 0 ? 360 / totalTeams : 60;

  // Dynamically scale orbit radius and team cards based on team count
  const { orbitRadius, cardSizeClass, logoSizeClass } = useMemo(() => {
    if (totalTeams <= 6) {
      return { orbitRadius: 170, cardSizeClass: 'min-w-[68px] p-2', logoSizeClass: 'w-11 h-11' };
    }
    if (totalTeams <= 8) {
      return { orbitRadius: 180, cardSizeClass: 'min-w-[60px] p-1.5', logoSizeClass: 'w-10 h-10' };
    }
    if (totalTeams <= 10) {
      return { orbitRadius: 190, cardSizeClass: 'min-w-[54px] p-1', logoSizeClass: 'w-9 h-9' };
    }
    return { orbitRadius: 200, cardSizeClass: 'min-w-[48px] p-0.5', logoSizeClass: 'w-8 h-8' };
  }, [totalTeams]);

  // Determine which teams are eligible for this specific player
  const eligibleTeamIds = useMemo(() => {
    return new Set(eligibleTeams.map((t) => t.id));
  }, [eligibleTeams]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      soundManager.cancelSpeech();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (flightFrameRef.current) cancelAnimationFrame(flightFrameRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Voice announcement helper
  const announceWinner = (playerName: string, teamName: string) => {
    if (isVoiceMuted) return;
    const text = `Congratulations! ${playerName} has been officially drafted by ${teamName}!`;
    soundManager.speak(text);
  };

  // Start the spin animation as soon as the overlay opens
  useEffect(() => {
    if (!isOpen || !player || totalTeams === 0) {
      setPhase('idle');
      setWinnerTeam(null);
      setFlightProgress(0);
      setHasAnnounced(false);
      soundManager.cancelSpeech();
      return;
    }

    // Determine destination team from eligible teams
    const candidates = eligibleTeams.length > 0 ? eligibleTeams : teams;
    const pickedTeam = candidates[getCryptoRandomIndex(candidates.length)];
    const winnerIndex = teams.findIndex((t) => t.id === pickedTeam.id);
    const targetIdx = winnerIndex >= 0 ? winnerIndex : 0;

    setPhase('spinning');
    setWinnerTeam(null);
    setIsSubmitting(false);
    setFlightProgress(0);
    setCountdown(3);
    setHasAnnounced(false);
    soundManager.playClick();

    // Physics parameters for smooth deceleration
    // The top selector points at 0 deg (top position).
    // Target team has base angle = targetIdx * stepAngle.
    // When the wheel rotates by finalAngle, we want:
    // (targetIdx * stepAngle + finalAngle) % 360 = 0 (top position)
    const baseRotations = 360 * 5; // 5 full rotations for drama
    const targetTeamAngle = targetIdx * stepAngle;
    const targetFinalAngle = baseRotations + (360 - (targetTeamAngle % 360));

    const spinDuration = 3800; // 3.8 seconds
    const startTime = performance.now();
    let lastTickedIndex = -1;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / spinDuration);

      // Quartic ease-out deceleration curve for intense suspense towards the end
      const ease = 1 - Math.pow(1 - progress, 3.5);
      const currentAngle = ease * targetFinalAngle;
      setRotationAngle(currentAngle);

      // Determine which team is currently passing under the selector line (at the top: 0 deg)
      const effectiveAngle = (360 - (currentAngle % 360)) % 360;
      const currentPassingIdx = Math.round(effectiveAngle / stepAngle) % totalTeams;

      if (currentPassingIdx !== lastTickedIndex) {
        lastTickedIndex = currentPassingIdx;
        setActiveHoverIndex(currentPassingIdx);
        // Play tick sound with pitch increasing as tension peaks
        soundManager.playWheelTick(Math.round(progress * 150));
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // LANDED ON TARGET TEAM!
        setRotationAngle(targetFinalAngle);
        setActiveHoverIndex(targetIdx);
        setWinnerTeam(pickedTeam);
        setPhase('landed');

        // Play celebration sound effects
        soundManager.playFanfare();
        soundManager.playCheer();

        // Voice announcement
        announceWinner(player.fullName, pickedTeam.name);
        setHasAnnounced(true);

        // Confetti celebration
        try {
          confetti({
            particleCount: 100,
            spread: 90,
            origin: { y: 0.45 },
            zIndex: 9999,
          });
          setTimeout(() => {
            confetti({
              particleCount: 75,
              spread: 120,
              origin: { y: 0.4 },
              zIndex: 9999,
            });
          }, 350);
        } catch {}
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, player, teams, eligibleTeams, totalTeams, stepAngle]);

  // Handle countdown for Auto-Pick mode
  useEffect(() => {
    if (phase === 'landed' && autoPickEnabled && winnerTeam && player) {
      setCountdown(3);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            triggerFlightAndConfirm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [phase, autoPickEnabled, winnerTeam, player]);

  // Trigger flight animation from center to the winning team, then confirm pick
  const triggerFlightAndConfirm = () => {
    if (!player || !winnerTeam || isSubmitting || phase === 'flying' || phase === 'done') return;
    setIsSubmitting(true);
    setPhase('flying');

    // Play whoosh sound effect for flight
    soundManager.playWhoosh();

    const flightDuration = 700; // 700ms smooth glide into winning team
    const startTime = performance.now();

    const stepFlight = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / flightDuration);
      // Smooth cubic bezier easing
      const easedT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setFlightProgress(easedT);

      if (t < 1) {
        flightFrameRef.current = requestAnimationFrame(stepFlight);
      } else {
        // Player medallion has merged into the winning team!
        setFlightProgress(1);
        soundManager.playPocketDrop();

        // Extra celebratory confetti puff at the team crest
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.25 },
            zIndex: 9999,
          });
        } catch {}

        // Allow user to witness the absorption before finishing
        setTimeout(async () => {
          try {
            await onConfirmPick(player, winnerTeam);
            setPhase('done');
            onClose();
          } catch {
            setIsSubmitting(false);
            setPhase('landed');
          }
        }, 500);
      }
    };

    flightFrameRef.current = requestAnimationFrame(stepFlight);
  };

  if (!isOpen || !player) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none animate-fadeIn"
      style={{
        backgroundColor: 'rgba(2, 8, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Container with gentle scaling for smaller displays */}
      <div className="relative w-full max-w-lg flex flex-col items-center justify-center scale-90 sm:scale-95 md:scale-100 transition-transform">
        {/* Top Dismiss Button */}
        <button
          onClick={() => {
            soundManager.cancelSpeech();
            onClose();
          }}
          disabled={phase === 'spinning' || phase === 'flying'}
          className="absolute -top-4 right-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors disabled:opacity-20 disabled:pointer-events-none z-50 cursor-pointer"
          title="Close spin window"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Live Broadcast Header Badge */}
        <div className="mb-2 flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/95 border border-blue-400/40 shadow-lg shadow-blue-500/20 text-white">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300">
            {phase === 'spinning'
              ? 'LIVE TEAM LOTTERY IN PROGRESS'
              : phase === 'flying'
              ? 'TRANSFERRING PLAYER TO TEAM SQUAD...'
              : 'OFFICIAL SELECTION COMPLETED'}
          </span>
          <span className="text-[9px] text-slate-300 font-bold bg-white/10 px-2 py-0.5 rounded-full">
            {activeCategory.name}
          </span>
        </div>

        {/* =================================================================== */}
        {/* CIRCULAR ARENA STAGE: PLAYER IN CENTER, TEAMS SPINNING AROUND      */}
        {/* =================================================================== */}
        <div className="relative w-[420px] h-[420px] sm:w-[460px] sm:h-[460px] flex items-center justify-center">
          {/* Subtle Outer Glowing Ring & Orbit Track */}
          <div className="absolute inset-1 rounded-full border border-blue-400/25 bg-gradient-to-b from-blue-900/20 via-slate-900/50 to-blue-950/40 shadow-[0_0_80px_rgba(18,131,230,0.25)] pointer-events-none" />
          <div className="absolute w-[360px] h-[360px] sm:w-[390px] sm:h-[390px] rounded-full border border-dashed border-blue-400/30 pointer-events-none animate-spin-slow" />

          {/* =============================================================== */}
          {/* HIGH-PRECISION SELECTOR LINE & TARGET RETICLE (At Top Position) */}
          {/* =============================================================== */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 460 460">
            <defs>
              <linearGradient id="laserGradSpin" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#00F0FF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="laserGradWinner" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FDE047" stopOpacity="1" />
              </linearGradient>
              <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glowing Laser Selector Line */}
            <line
              x1="230"
              y1="160"
              x2="230"
              y2={230 - orbitRadius + 24}
              stroke={phase !== 'spinning' ? 'url(#laserGradWinner)' : 'url(#laserGradSpin)'}
              strokeWidth={phase !== 'spinning' ? '4' : '3'}
              filter="url(#laserGlow)"
              strokeLinecap="round"
            />
          </svg>

          {/* Top Target Indicator Pointer Arrow */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-40">
            <div
              className={`transition-all duration-300 ${
                phase !== 'spinning'
                  ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,1)] scale-125 animate-bounce'
                  : 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.9)] animate-pulse'
              }`}
            >
              <Target className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            {/* Arrow Pointing Down Directly to the Passing Team */}
            <div
              className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent -mt-1 ${
                phase !== 'spinning'
                  ? 'border-t-[14px] border-t-amber-400'
                  : 'border-t-[12px] border-t-cyan-400'
              }`}
            />
          </div>

          {/* =============================================================== */}
          {/* ROTATING TEAMS ORBIT RING                                       */}
          {/* =============================================================== */}
          <div
            className="absolute inset-0 flex items-center justify-center will-change-transform"
            style={{
              transform: `rotate(${rotationAngle}deg)`,
              transition: phase === 'spinning' ? 'none' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {teams.map((team, idx) => {
              // Base angle for this team on the circle (0 deg is top: 12 o'clock)
              const teamBaseAngle = idx * stepAngle;
              const angleRad = ((teamBaseAngle - 90) * Math.PI) / 180;
              const x = orbitRadius * Math.cos(angleRad);
              const y = orbitRadius * Math.sin(angleRad);

              const isWinner = winnerTeam?.id === team.id;
              const isEligible = eligibleTeamIds.has(team.id);
              const isPassingUnderSelector = activeHoverIndex === idx;

              // Greyed out condition requested by user:
              // "Je ekbar player pabe sei team grayed out hobe"
              // Ineligible teams are already greyed out from start;
              // Once landed, ALL teams except winner are completely greyed out!
              const isGreyedOut =
                phase === 'landed' || phase === 'flying' || phase === 'done'
                  ? !isWinner
                  : !isEligible;

              // Pulse when flying player arrives at winner team
              const isAbsorbing = phase === 'flying' && flightProgress >= 0.9 && isWinner;

              return (
                <div
                  key={team.id}
                  style={{
                    position: 'absolute',
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: `translate(-50%, -50%) rotate(${-rotationAngle}deg)`, // Counter-rotate so logo stays upright!
                  }}
                  className={`transition-all duration-300 ${
                    isAbsorbing
                      ? 'z-50 scale-140 sm:scale-145'
                      : isWinner
                      ? 'z-40 scale-125 sm:scale-130'
                      : isGreyedOut
                      ? 'opacity-20 grayscale saturate-0 scale-85 z-10'
                      : isPassingUnderSelector
                      ? 'scale-110 z-30'
                      : 'opacity-95 scale-100 z-20'
                  }`}
                >
                  <div
                    className={`relative rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all duration-200 ${cardSizeClass} ${
                      isAbsorbing
                        ? 'bg-gradient-to-b from-amber-300 via-yellow-200 to-amber-400 ring-6 ring-amber-300 shadow-[0_0_50px_rgba(245,158,11,1)]'
                        : isWinner
                        ? 'bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-500 ring-4 ring-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.9)]'
                        : isPassingUnderSelector
                        ? 'bg-white ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)]'
                        : isGreyedOut
                        ? 'bg-slate-850/80 border border-slate-700/40'
                        : 'bg-slate-900/95 border-2 shadow-md hover:border-slate-400'
                    }`}
                    style={{
                      borderColor:
                        !isWinner && !isGreyedOut
                          ? team.primaryColor || '#1283E6'
                          : undefined,
                    }}
                  >
                    {/* Winner Crown & Pick Tag */}
                    {isWinner && (
                      <span className="absolute -top-3.5 px-2 py-0.5 rounded-full bg-[#061A36] text-amber-300 text-[8px] font-black uppercase tracking-wider shadow-md flex items-center gap-0.5 whitespace-nowrap animate-bounce border border-amber-400 z-30">
                        <Crown className="w-2.5 h-2.5 text-amber-400" /> PICK!
                      </span>
                    )}

                    {/* Ineligible Lock / Captain / Excluded Badge */}
                    {!isEligible && !isWinner && (
                      teamsWithCaptainInCategory.has(team.id) ? (
                        <span className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded-full bg-amber-950 text-amber-300 border border-amber-600 text-[6.5px] font-black z-20 flex items-center gap-0.5">
                          <Crown className="w-2 h-2 text-amber-400" /> CAPT
                        </span>
                      ) : excludedTeamIds.includes(team.id) ? (
                        <span className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded-full bg-rose-950 text-rose-300 border border-rose-600 text-[6.5px] font-black z-20 flex items-center gap-0.5">
                          ✕ EXCL
                        </span>
                      ) : (
                        <span className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded-full bg-slate-900 text-slate-400 border border-slate-700 text-[6.5px] font-black z-20 flex items-center gap-0.5">
                          <Lock className="w-2 h-2" /> FULL
                        </span>
                      )
                    )}

                    {/* Team Logo */}
                    <div
                      className={`rounded-xl overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-inner ${logoSizeClass} ${
                        isWinner
                          ? 'bg-white border-2 border-[#061A36]'
                          : isGreyedOut
                          ? 'bg-slate-900'
                          : 'bg-white'
                      }`}
                    >
                      {team.logoUrl ? (
                        <img
                          src={team.logoUrl}
                          alt={team.name}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span
                          className={`font-black text-xs ${
                            isWinner ? 'text-[#061A36]' : 'text-slate-200'
                          }`}
                        >
                          {team.shortName}
                        </span>
                      )}
                    </div>

                    {/* Team Short Name */}
                    <span
                      className={`mt-0.5 text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider truncate max-w-[56px] leading-tight ${
                        isWinner
                          ? 'text-[#061A36]'
                          : isGreyedOut
                          ? 'text-slate-500'
                          : 'text-white'
                      }`}
                    >
                      {team.shortName || team.name.slice(0, 6)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* =============================================================== */}
          {/* CENTER MEDALLION: THE PLAYER BEING DRAFTED                      */}
          {/* =============================================================== */}
          {/* When flying, the player medallion lifts and flies from center   */}
          {/* (0, 0) directly upward to the winning team at (0, -orbitRadius)  */}
          <div
            className={`relative z-30 w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-b from-[#0A2458] via-[#05183A] to-[#020B1C] border-3 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.35)] flex flex-col items-center justify-center text-center p-2 transition-transform duration-75 will-change-transform ${
              phase === 'flying' ? 'pointer-events-none' : ''
            }`}
            style={{
              transform:
                phase === 'flying'
                  ? `translate(0px, ${-orbitRadius * flightProgress}px) scale(${
                      1 - flightProgress * 0.6
                    })`
                  : undefined,
              opacity: phase === 'flying' ? Math.max(0.1, 1 - flightProgress * 0.9) : 1,
            }}
          >
            {/* Halo pulse */}
            <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xs pointer-events-none" />

            {/* Micro ON DECK Pill */}
            <span className="px-2 py-0.2 rounded-full bg-amber-400 text-[#061A36] text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider shadow-2xs whitespace-nowrap">
              {phase === 'spinning' ? '★ DRAFTING ★' : '★ DRAFTED ★'}
            </span>

            {/* Circular Player Photo */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-white border-2 border-white shadow-md shrink-0 relative mt-1">
              {player.photoUrl ? (
                <img
                  src={player.photoUrl}
                  alt={player.fullName}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1283E6] to-[#061A36] flex items-center justify-center text-white font-black text-base">
                  {player.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Jersey Number Tag Overlay */}
              {player.jerseyNumber && (
                <span className="absolute bottom-0 right-0 bg-[#061A36] text-amber-300 text-[7px] font-black px-1 rounded-tl shadow-2xs border border-amber-400/40">
                  #{player.jerseyNumber}
                </span>
              )}
            </div>

            {/* Full Name */}
            <h3 className="mt-0.5 font-black text-[10.5px] sm:text-[11.5px] text-white text-center leading-tight truncate max-w-[110px] drop-shadow-sm uppercase">
              {player.fullName}
            </h3>

            {/* Role Badge */}
            <span className="text-[7.5px] font-bold text-amber-300 truncate max-w-[105px] leading-none">
              {player.badge || player.playerType || activeCategory.name}
            </span>
          </div>

          {/* =============================================================== */}
          {/* CONGRATULATIONS CARD MODAL OVERLAY (When spin finishes)         */}
          {/* =============================================================== */}
          {phase === 'landed' && winnerTeam && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-3 animate-zoomIn pointer-events-auto">
              <div
                className="w-full max-w-[340px] sm:max-w-[370px] rounded-2xl bg-gradient-to-b from-[#0A214D] via-[#061633] to-[#020B1C] border-2 border-amber-400 p-3.5 sm:p-4 shadow-[0_0_60px_rgba(245,158,11,0.5)] flex flex-col items-center text-center text-white relative backdrop-blur-xl"
              >
                {/* Voice Announcer button in top corner */}
                <button
                  onClick={() => {
                    const next = !isVoiceMuted;
                    setIsVoiceMuted(next);
                    if (!next) {
                      announceWinner(player.fullName, winnerTeam.name);
                    } else {
                      soundManager.cancelSpeech();
                    }
                  }}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 transition-colors"
                  title={isVoiceMuted ? 'Unmute voice commentary' : 'Mute voice commentary'}
                >
                  {isVoiceMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 animate-pulse" />}
                </button>

                {/* Shimmering Congratulations Eyebrow */}
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-2">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>CONGRATULATIONS!</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </div>

                {/* Team Shield & Player Portrait Side-by-Side Showcase */}
                <div className="flex items-center justify-center gap-3 my-1">
                  {/* Winning Team Crest */}
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white border-2 shrink-0 p-1 flex items-center justify-center shadow-lg shadow-amber-400/20"
                    style={{ borderColor: winnerTeam.primaryColor || '#F59E0B' }}
                  >
                    {winnerTeam.logoUrl ? (
                      <img
                        src={winnerTeam.logoUrl}
                        alt={winnerTeam.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="font-black text-sm text-[#061A36]">
                        {winnerTeam.shortName}
                      </span>
                    )}
                  </div>

                  {/* Transfer / Sign Icon */}
                  <div className="flex flex-col items-center">
                    <span className="text-amber-400 font-black text-sm sm:text-base">➔</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>

                  {/* Player Portrait */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white border-2 border-amber-400 shrink-0 shadow-lg relative">
                    {player.photoUrl ? (
                      <img
                        src={player.photoUrl}
                        alt={player.fullName}
                        className="w-full h-full object-cover object-top"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1283E6] flex items-center justify-center text-white font-black text-sm">
                        {player.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {player.jerseyNumber && (
                      <span className="absolute bottom-0 right-0 bg-[#061A36] text-amber-300 text-[7px] font-black px-1 rounded-tl border border-amber-400/40">
                        #{player.jerseyNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Winner Team & Player Details */}
                <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-1">
                  {winnerTeam.name}
                </h2>
                <div className="text-xs text-amber-300 font-extrabold flex items-center gap-1 justify-center mt-0.5">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>Signs {player.fullName}</span>
                </div>

                <div className="mt-1 flex items-center justify-center gap-1.5 text-[9px] text-slate-300 font-medium">
                  <span className="px-1.5 py-0.2 rounded bg-white/10">{player.badge || 'ALL-ROUNDER'}</span>
                  <span>•</span>
                  <span>{player.battingStyle || 'Right Handed'}</span>
                  {player.bowlingStyle && (
                    <>
                      <span>•</span>
                      <span>{player.bowlingStyle}</span>
                    </>
                  )}
                </div>

                {/* Action Button: Click to trigger the flight animation */}
                <button
                  onClick={triggerFlightAndConfirm}
                  disabled={isSubmitting}
                  className="w-full mt-3 py-2.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-600 hover:to-yellow-500 text-[#061A36] font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-400/40 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {autoPickEnabled
                      ? `SEND TO TEAM SQUAD (${countdown}s)`
                      : 'SEND PLAYER TO TEAM SQUAD ➔'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* LOWER STATUS STRIP (When spinning or flying)                        */}
        {/* =================================================================== */}
        <div className="w-full max-w-md mt-2 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-md flex items-center justify-center text-center">
          {phase === 'spinning' && (
            <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
              <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Selecting franchise for {player.fullName}...</span>
            </div>
          )}
          {phase === 'flying' && (
            <div className="flex items-center gap-2 text-amber-300 text-xs font-black">
              <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>Flying to {winnerTeam?.name} franchise squad...</span>
            </div>
          )}
          {phase === 'landed' && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-extrabold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Press button above to transfer {player.fullName} to team</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
