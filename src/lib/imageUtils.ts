/**
 * Image and logo utilities for Brothers Premier League (BPL) Season-2
 * Handles file-to-DataURL compression and high-fidelity default SVG logos & cricket avatars
 */

export function fileToDataUrl(
  file: File,
  maxWidth = 512,
  maxHeight = 512,
  quality = 0.88
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file (PNG, JPG, SVG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate proportional scale
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to decode image.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * 3D Golden BPL Crest Logo (Matching Image 1 & 2)
 */
export const DEFAULT_BPL_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
  <defs>
    <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFE066" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#D97706" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#061A36" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF3BF"/>
      <stop offset="35%" stop-color="#F59F00"/>
      <stop offset="70%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#FFE066"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0A244A"/>
      <stop offset="60%" stop-color="#061A36"/>
      <stop offset="100%" stop-color="#030C1C"/>
    </linearGradient>
    <radialGradient id="ballGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FF6B6B"/>
      <stop offset="40%" stop-color="#E03131"/>
      <stop offset="90%" stop-color="#880000"/>
      <stop offset="100%" stop-color="#400000"/>
    </radialGradient>
  </defs>

  <!-- Ambient Glow Behind Crown -->
  <circle cx="120" cy="120" r="115" fill="url(#goldGlow)"/>

  <!-- Outer Ring with Gold Border -->
  <circle cx="120" cy="120" r="106" fill="url(#shieldGrad)" stroke="url(#goldRim)" stroke-width="7"/>
  <circle cx="120" cy="120" r="98" fill="none" stroke="#FFE066" stroke-width="1.5" stroke-dasharray="4 3"/>

  <!-- Crossed Wooden Cricket Bats Behind Ball -->
  <path d="M72 66 L168 174 M76 62 L172 170" stroke="#E6A23C" stroke-width="9" stroke-linecap="round"/>
  <path d="M72 66 L168 174" stroke="#78350F" stroke-width="3" stroke-linecap="round"/>
  <path d="M168 66 L72 174 M172 62 L76 170" stroke="#E6A23C" stroke-width="9" stroke-linecap="round"/>
  <path d="M168 66 L72 174" stroke="#78350F" stroke-width="3" stroke-linecap="round"/>

  <!-- Royal Golden 5-Peak Crown -->
  <path d="M78 84 L94 48 L120 74 L146 48 L162 84 Z" fill="url(#goldRim)" stroke="#78350F" stroke-width="2"/>
  <circle cx="94" cy="46" r="5" fill="#FFF3BF" stroke="#B45309" stroke-width="1.5"/>
  <circle cx="120" cy="72" r="6" fill="#FFF3BF" stroke="#B45309" stroke-width="1.5"/>
  <circle cx="146" cy="46" r="5" fill="#FFF3BF" stroke="#B45309" stroke-width="1.5"/>
  <circle cx="78" cy="84" r="4" fill="#F59F00"/>
  <circle cx="162" cy="84" r="4" fill="#F59F00"/>

  <!-- 3D Cricket Ball in Center -->
  <circle cx="120" cy="115" r="32" fill="url(#ballGrad)" stroke="#FFE066" stroke-width="2.5"/>
  <!-- Ball Seam -->
  <path d="M102 100 C114 105, 126 125, 138 130" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M101 100 C113 105, 125 125, 137 130" stroke="#FFE3E3" stroke-width="2" stroke-dasharray="2 2"/>

  <!-- BPL Main Typography Ribbon -->
  <g transform="translate(0, 10)">
    <!-- Dark Ribbon Backing -->
    <path d="M30 148 L210 148 L198 178 L42 178 Z" fill="#041226" stroke="url(#goldRim)" stroke-width="3"/>
    <text x="120" y="172" font-family="'Impact', 'Arial Black', sans-serif" font-size="25" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">
      BROTHERS
    </text>
  </g>

  <!-- Gold Secondary Ribbon: PREMIER LEAGUE -->
  <g transform="translate(0, 10)">
    <path d="M46 180 L194 180 L186 200 L54 200 Z" fill="#F59F00" stroke="#78350F" stroke-width="1.5"/>
    <text x="120" y="195" font-family="'Arial Black', sans-serif" font-size="12" font-weight="900" fill="#061A36" text-anchor="middle" letter-spacing="1">
      PREMIER LEAGUE
    </text>
  </g>

  <!-- Gold Star & SEASON-2 Tag -->
  <g transform="translate(0, 10)">
    <rect x="76" y="202" width="88" height="18" rx="9" fill="#061A36" stroke="url(#goldRim)" stroke-width="2"/>
    <text x="120" y="215" font-family="sans-serif" font-size="11" font-weight="900" fill="#FFE066" text-anchor="middle" letter-spacing="1.5">
      ★ SEASON-2 ★
    </text>
  </g>
</svg>
`)}`;

/**
 * Team Logos (Matching Image 1 & 2)
 */
export const TEAM_DEFAULT_LOGOS: Record<string, string> = {
  'team-warriors': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="bwShield" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0A244A"/>
      <stop offset="100%" stop-color="#021024"/>
    </linearGradient>
    <radialGradient id="bwBall" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FF6B6B"/>
      <stop offset="60%" stop-color="#DC2626"/>
      <stop offset="100%" stop-color="#7F1D1D"/>
    </radialGradient>
  </defs>
  <!-- Shield -->
  <path d="M80 14 L138 38 V92 C138 122 80 146 80 146 C80 146 22 122 22 92 V38 L80 14 Z" fill="url(#bwShield)" stroke="#16A34A" stroke-width="5"/>
  <!-- Crossed Bats -->
  <path d="M48 42 L112 106 M52 38 L116 102" stroke="#EAB308" stroke-width="5" stroke-linecap="round"/>
  <path d="M112 42 L48 106 M108 38 L44 102" stroke="#EAB308" stroke-width="5" stroke-linecap="round"/>
  <!-- Cricket Ball -->
  <circle cx="80" cy="72" r="22" fill="url(#bwBall)" stroke="#FFFFFF" stroke-width="2"/>
  <path d="M68 64 C74 68, 86 78, 92 82" stroke="#FFFFFF" stroke-width="2.5"/>
  <!-- Green Ribbon with Team Name -->
  <rect x="18" y="104" width="124" height="26" rx="6" fill="#16A34A" stroke="#FFFFFF" stroke-width="2"/>
  <text x="80" y="122" font-family="'Arial Black', sans-serif" font-size="11" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">
    BROTHERS
  </text>
  <text x="80" y="140" font-family="sans-serif" font-size="8" font-weight="800" fill="#86EFAC" text-anchor="middle" letter-spacing="1">
    WARRIORS
  </text>
</svg>
`)}`,

  'team-prime': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <radialGradient id="pbGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#0A1828"/>
    </radialGradient>
    <linearGradient id="pbGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
  </defs>
  <!-- Circle Crest -->
  <circle cx="80" cy="80" r="70" fill="#0A1828" stroke="url(#pbGold)" stroke-width="6"/>
  <circle cx="80" cy="80" r="62" fill="none" stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="3 3"/>
  <!-- Crossed Bats -->
  <path d="M42 42 L118 118" stroke="#D97706" stroke-width="6" stroke-linecap="round"/>
  <path d="M118 42 L42 118" stroke="#D97706" stroke-width="6" stroke-linecap="round"/>
  <!-- Ball -->
  <circle cx="114" cy="72" r="14" fill="#DC2626" stroke="#FFFFFF" stroke-width="2"/>
  <!-- PB Monogram -->
  <text x="76" y="88" font-family="'Impact', 'Arial Black', sans-serif" font-size="44" font-weight="900" fill="url(#pbGold)" text-anchor="middle">
    PB
  </text>
  <!-- CRICKET Banner -->
  <rect x="30" y="96" width="100" height="22" rx="4" fill="#DC2626" stroke="#FFFFFF" stroke-width="1.5"/>
  <text x="80" y="112" font-family="'Arial Black', sans-serif" font-size="11" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
    CRICKET
  </text>
  <text x="80" y="132" font-family="sans-serif" font-size="8.5" font-weight="800" fill="#FDE68A" text-anchor="middle" letter-spacing="0.5">
    PRIME BROTHERS XI
  </text>
</svg>
`)}`,

  'team-kings': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="crownGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#EAB308"/>
      <stop offset="100%" stop-color="#A16207"/>
    </linearGradient>
  </defs>
  <!-- Backing Shield -->
  <path d="M80 16 L134 38 V92 C134 122 80 144 80 144 C80 144 26 122 26 92 V38 L80 16 Z" fill="#0A244A" stroke="url(#crownGold)" stroke-width="5"/>
  <!-- 3D Golden Crown with Gems -->
  <path d="M46 76 L56 46 L80 66 L104 46 L114 76 Z" fill="url(#crownGold)" stroke="#78350F" stroke-width="2.5"/>
  <circle cx="56" cy="44" r="5" fill="#FEF08A" stroke="#A16207" stroke-width="1.5"/>
  <circle cx="80" cy="64" r="6" fill="#FEF08A" stroke="#A16207" stroke-width="1.5"/>
  <circle cx="104" cy="44" r="5" fill="#FEF08A" stroke="#A16207" stroke-width="1.5"/>
  <rect x="48" y="76" width="64" height="12" rx="3" fill="#A16207"/>
  <!-- Jewels on Crown Base -->
  <circle cx="58" cy="82" r="3" fill="#EF4444"/>
  <circle cx="80" cy="82" r="3.5" fill="#3B82F6"/>
  <circle cx="102" cy="82" r="3" fill="#10B981"/>
  <!-- Text: THE CROWN KINGS -->
  <text x="80" y="112" font-family="'Arial Black', sans-serif" font-size="10" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">
    THE CROWN KINGS
  </text>
  <text x="80" y="126" font-family="sans-serif" font-size="7.5" font-weight="700" fill="#EAB308" text-anchor="middle" letter-spacing="1">
    RULE THE GAME
  </text>
</svg>
`)}`,

  'team-titans': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="t4Grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
  </defs>
  <!-- Shield Frame -->
  <path d="M80 18 L136 40 V92 C136 122 80 144 80 144 C80 144 24 122 24 92 V40 L80 18 Z" fill="url(#t4Grad)" stroke="#38BDF8" stroke-width="5"/>
  <!-- Crossed Cricket Stumps and Ball -->
  <rect x="66" y="44" width="6" height="52" rx="2" fill="#E2E8F0"/>
  <rect x="77" y="40" width="6" height="56" rx="2" fill="#E2E8F0"/>
  <rect x="88" y="44" width="6" height="52" rx="2" fill="#E2E8F0"/>
  <rect x="62" y="38" width="36" height="5" rx="2" fill="#F8FAFC"/>
  <!-- Red Cricket Ball in Flight -->
  <circle cx="106" cy="58" r="12" fill="#DC2626" stroke="#FFFFFF" stroke-width="2"/>
  <path d="M100 54 C104 56, 110 62, 112 66" stroke="#FFFFFF" stroke-width="1.5"/>
  <!-- Banner -->
  <rect x="24" y="104" width="112" height="22" rx="4" fill="#0284C7" stroke="#BAE6FD" stroke-width="1.5"/>
  <text x="80" y="119" font-family="'Arial Black', sans-serif" font-size="10" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
    BROTHERS TITANS
  </text>
</svg>
`)}`,

  'team-strikers': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="bsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#DC2626"/>
      <stop offset="100%" stop-color="#7F1D1D"/>
    </linearGradient>
  </defs>
  <!-- Flame Shield Frame -->
  <path d="M80 16 L136 38 V92 C136 122 80 144 80 144 C80 144 24 122 24 92 V38 L80 16 Z" fill="#18181B" stroke="#DC2626" stroke-width="5"/>
  <!-- Fire Lightning Strike -->
  <path d="M86 36 L64 74 H86 L74 108 L104 68 H84 L96 36 Z" fill="#F59E0B" stroke="#DC2626" stroke-width="2"/>
  <!-- Banner -->
  <rect x="22" y="106" width="116" height="22" rx="4" fill="#DC2626" stroke="#FECACA" stroke-width="1.5"/>
  <text x="80" y="121" font-family="'Arial Black', sans-serif" font-size="9" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">
    BROTHERS STRIKERS
  </text>
</svg>
`)}`,

  'team-challengers': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="bcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0D9488"/>
      <stop offset="100%" stop-color="#134E4A"/>
    </linearGradient>
  </defs>
  <!-- Circle Crest -->
  <circle cx="80" cy="80" r="70" fill="#042F2E" stroke="#14B8A6" stroke-width="6"/>
  <!-- Crossed Bats & Eagle Wings -->
  <path d="M42 42 L118 118" stroke="#14B8A6" stroke-width="6" stroke-linecap="round"/>
  <path d="M118 42 L42 118" stroke="#14B8A6" stroke-width="6" stroke-linecap="round"/>
  <circle cx="80" cy="74" r="16" fill="#F59E0B" stroke="#FFFFFF" stroke-width="2"/>
  <!-- Banner -->
  <rect x="18" y="104" width="124" height="24" rx="4" fill="#0D9488" stroke="#99F6E4" stroke-width="1.5"/>
  <text x="80" y="120" font-family="'Arial Black', sans-serif" font-size="8.5" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">
    BROTHERS CHALLENGERS
  </text>
</svg>
`)}`,
};

/**
 * Generate a realistic cricket player portrait SVG avatar
 * Styled in official BPL blue jersey with handsome athletic portrait
 */
export function generateCricketAvatar(name: string, jersey: string, seed: number): string {
  // Variations based on seed
  const skinTones = ['#E0AC69', '#C68642', '#8D5524', '#F1C27D', '#B57C48'];
  const hairColors = ['#1A1A1A', '#262626', '#0F172A', '#1E1E1E'];
  const hairStyles = [
    // Short crop
    '<path d="M38 52 C38 28 82 28 82 52 C76 42 44 42 38 52 Z" fill="{HAIR}"/>',
    // Modern quiff / fade
    '<path d="M36 50 C36 24 84 24 84 50 C80 34 40 34 36 50 Z M46 25 Q60 14 74 25 Z" fill="{HAIR}"/>',
    // Spiky athletic
    '<path d="M37 52 C37 26 83 26 83 52 C78 38 42 38 37 52 Z M50 24 L54 16 L60 22 L66 14 L70 24 Z" fill="{HAIR}"/>',
  ];

  const skin = skinTones[seed % skinTones.length];
  const hair = hairColors[seed % hairColors.length];
  const hairSvg = hairStyles[seed % hairStyles.length].replace('{HAIR}', hair);
  const hasBeard = seed % 2 === 0;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 130" fill="none">
  <defs>
    <radialGradient id="stadiumGlow_${seed}" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#E0F2FE"/>
      <stop offset="60%" stop-color="#BAE6FD"/>
      <stop offset="100%" stop-color="#7DD3FC"/>
    </radialGradient>
    <linearGradient id="jerseyGrad_${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284C7"/>
      <stop offset="50%" stop-color="#0369A1"/>
      <stop offset="100%" stop-color="#0C4A6E"/>
    </linearGradient>
  </defs>

  <!-- Stadium Lighting Backdrop -->
  <rect width="120" height="130" rx="14" fill="url(#stadiumGlow_${seed})"/>
  <circle cx="20" cy="20" r="14" fill="#FFFFFF" opacity="0.4"/>
  <circle cx="100" cy="20" r="14" fill="#FFFFFF" opacity="0.4"/>

  <!-- Neck -->
  <rect x="52" y="70" width="16" height="20" rx="4" fill="${skin}"/>

  <!-- Official BPL Cricket Jersey Body -->
  <path d="M22 130 C22 96 36 86 52 86 L68 86 C84 86 98 96 98 130 Z" fill="url(#jerseyGrad_${seed})"/>
  <!-- Jersey Collar & Trim -->
  <path d="M48 86 L60 102 L72 86 L66 84 L60 92 L54 84 Z" fill="#F8FAFC"/>
  <path d="M52 86 L60 98 L68 86 Z" fill="#FF7A2E"/>

  <!-- Jersey Chest Logo & Number -->
  <circle cx="42" cy="106" r="6" fill="#F59E0B" opacity="0.9"/>
  <text x="42" y="109" font-family="'Impact', sans-serif" font-size="7" font-weight="900" fill="#061A36" text-anchor="middle">
    BPL
  </text>
  <text x="78" y="112" font-family="'Arial Black', sans-serif" font-size="14" font-weight="900" fill="#FFFFFF" opacity="0.9" text-anchor="middle">
    ${jersey || '00'}
  </text>

  <!-- Athletic Head & Face -->
  <ellipse cx="60" cy="54" rx="19" ry="24" fill="${skin}"/>

  <!-- Ears -->
  <circle cx="40" cy="56" r="4.5" fill="${skin}"/>
  <circle cx="80" cy="56" r="4.5" fill="${skin}"/>

  <!-- Hairstyle -->
  ${hairSvg}

  <!-- Eyebrows -->
  <path d="M47 48 Q53 45 57 48" stroke="${hair}" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M63 48 Q67 45 73 48" stroke="${hair}" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Eyes -->
  <circle cx="52" cy="53" r="2.2" fill="#1E293B"/>
  <circle cx="68" cy="53" r="2.2" fill="#1E293B"/>
  <circle cx="51.5" cy="52" r="0.8" fill="#FFFFFF"/>
  <circle cx="67.5" cy="52" r="0.8" fill="#FFFFFF"/>

  <!-- Nose -->
  <path d="M60 52 L58 61 L62 61" stroke="#9A5930" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Confident Sports Smile -->
  <path d="M53 66 Q60 71 67 66" stroke="#5E2B0C" stroke-width="2" stroke-linecap="round"/>

  <!-- Groomed Beard (for some players) -->
  ${
    hasBeard
      ? `<path d="M45 58 C45 76 75 76 75 58 C72 72 48 72 45 58 Z" fill="${hair}" opacity="0.6"/>
         <path d="M52 64 Q60 67 68 64" stroke="${hair}" stroke-width="1.5" stroke-linecap="round"/>`
      : ''
  }
</svg>
`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
