import React from 'react';
import { DEFAULT_BPL_LOGO } from '../lib/imageUtils';

interface BplLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  logoUrl?: string;
  title?: string;
  subtitle?: string;
}

export const BplLogo: React.FC<BplLogoProps> = ({
  className = '',
  size = 64,
  showText = true,
  logoUrl,
  title = 'Brothers Premier League',
  subtitle = 'Season-2 • Player Draft',
}) => {
  const effectiveLogo = logoUrl || DEFAULT_BPL_LOGO;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center rounded-xl overflow-hidden transition-transform duration-200"
        style={{ width: size, height: size }}
      >
        <img
          src={effectiveLogo}
          alt={title}
          className="w-full h-full object-contain filter drop-shadow-md"
          referrerPolicy="no-referrer"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[14px] font-extrabold tracking-tight text-white uppercase truncate drop-shadow-xs">
            {title}
          </span>
          <span className="text-[10.5px] font-semibold text-[#1283E6] tracking-wider uppercase truncate mt-0.5">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};
