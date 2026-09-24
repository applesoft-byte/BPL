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
 * Official BPL Season-2 Franchise Team Logos (Matching Official Poster)
 */
export const TEAM_DEFAULT_LOGOS: Record<string, string> = {
  // 1. ABD SPORTS BROTHERS (Cricketer Batsman swinging bat + Cyan Theme)
  'team-abd-sports': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="asbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284C7"/>
      <stop offset="50%" stop-color="#0369A1"/>
      <stop offset="100%" stop-color="#082F49"/>
    </linearGradient>
    <radialGradient id="asbBall" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FF5252"/>
      <stop offset="70%" stop-color="#DC2626"/>
      <stop offset="100%" stop-color="#7F1D1D"/>
    </radialGradient>
  </defs>
  <!-- Shield Outline -->
  <path d="M80 12 L140 36 V96 C140 126 80 150 80 150 C80 150 20 126 20 96 V36 L80 12 Z" fill="url(#asbGrad)" stroke="#38BDF8" stroke-width="4.5"/>
  <path d="M80 20 L132 42 V92 C132 118 80 140 80 140 C80 140 28 118 28 92 V42 L80 20 Z" fill="#082F49" stroke="#0284C7" stroke-width="1.5"/>
  <!-- Batsman Figure Silhouette swinging bat -->
  <circle cx="80" cy="46" r="11" fill="#BAE6FD"/>
  <path d="M72 42 L88 42 L90 48 L74 48 Z" fill="#0284C7"/> <!-- Helmet Visor -->
  <path d="M68 58 C68 54 92 54 92 58 L96 78 L86 86 L82 72 L78 86 L64 78 Z" fill="#38BDF8"/>
  <!-- Cricket Bat in Motion -->
  <path d="M92 60 L126 42 L130 48 L96 66 Z" fill="#F59E0B" stroke="#78350F" stroke-width="1.5"/>
  <rect x="88" y="62" width="6" height="14" rx="2" fill="#FFFFFF" transform="rotate(-30 88 62)"/>
  <!-- Red Cricket Ball -->
  <circle cx="118" cy="74" r="9" fill="url(#asbBall)" stroke="#FFFFFF" stroke-width="1.5"/>
  <path d="M112 70 C116 74 120 78 124 80" stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="2 2"/>
  <!-- Ribbon Banner -->
  <rect x="14" y="106" width="132" height="24" rx="5" fill="#0284C7" stroke="#BAE6FD" stroke-width="1.5"/>
  <text x="80" y="122" font-family="'Arial Black', sans-serif" font-size="10" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">
    ABD SPORTS
  </text>
  <text x="80" y="142" font-family="'Arial Black', sans-serif" font-size="8.5" font-weight="900" fill="#38BDF8" text-anchor="middle" letter-spacing="1">
    BROTHERS
  </text>
</svg>
`)}`,

  // 2. BROTHERS WARRIORS (Spartan Helmet + Crimson Red)
  'team-warriors': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="bwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#DC2626"/>
      <stop offset="60%" stop-color="#991B1B"/>
      <stop offset="100%" stop-color="#450A0A"/>
    </linearGradient>
  </defs>
  <!-- Shield Frame -->
  <path d="M80 12 L140 36 V96 C140 126 80 150 80 150 C80 150 20 126 20 96 V36 L80 12 Z" fill="url(#bwGrad)" stroke="#EF4444" stroke-width="4.5"/>
  <path d="M80 20 L132 42 V92 C132 118 80 140 80 140 C80 140 28 118 28 92 V42 L80 20 Z" fill="#1C1917" stroke="#DC2626" stroke-width="1.5"/>
  <!-- Spartan Warrior Helmet Plume -->
  <path d="M80 28 C92 28 96 38 96 46 C96 56 80 58 80 58 C80 58 64 56 64 46 C64 38 68 28 80 28 Z" fill="#DC2626" stroke="#EF4444" stroke-width="1.5"/>
  <!-- Helmet Dome -->
  <path d="M62 48 C62 38 98 38 98 48 L100 68 L88 88 L80 82 L72 88 L60 68 Z" fill="#B91C1C" stroke="#FCA5A5" stroke-width="1.5"/>
  <!-- T-Shaped Spartan Visor Eye Slit -->
  <path d="M68 62 H92 V70 H83 V82 H77 V70 H68 Z" fill="#000000" stroke="#F87171" stroke-width="1"/>
  <!-- Ribbon Banner -->
  <rect x="14" y="106" width="132" height="24" rx="5" fill="#991B1B" stroke="#FECACA" stroke-width="1.5"/>
  <text x="80" y="122" font-family="'Arial Black', sans-serif" font-size="9" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">
    BROTHERS
  </text>
  <text x="80" y="142" font-family="'Arial Black', sans-serif" font-size="9.5" font-weight="900" fill="#F87171" text-anchor="middle" letter-spacing="1">
    WARRIORS
  </text>
</svg>
`)}`,

  // 3. PRIME BROTHERS (Golden Lion with Crown)
  'team-prime': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="pbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="50%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#451A03"/>
    </linearGradient>
    <linearGradient id="goldMane" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
  </defs>
  <!-- Shield Frame -->
  <path d="M80 12 L140 36 V96 C140 126 80 150 80 150 C80 150 20 126 20 96 V36 L80 12 Z" fill="url(#pbGrad)" stroke="#FBBF24" stroke-width="4.5"/>
  <path d="M80 20 L132 42 V92 C132 118 80 140 80 140 C80 140 28 118 28 92 V42 L80 20 Z" fill="#291402" stroke="#F59E0B" stroke-width="1.5"/>
  <!-- Crown on Lion -->
  <path d="M66 40 L72 32 L80 37 L88 32 L94 40 Z" fill="#FEF08A" stroke="#B45309" stroke-width="1.5"/>
  <!-- Majestic Lion Head Silhouette -->
  <path d="M80 42 C64 44 56 56 56 68 C56 82 66 90 80 92 C94 90 104 82 104 68 C104 56 96 44 80 42 Z" fill="url(#goldMane)"/>
  <path d="M72 60 L78 64 L74 68 Z M88 60 L82 64 L86 68 Z" fill="#451A03"/> <!-- Eyes -->
  <path d="M76 74 L84 74 L80 80 Z" fill="#451A03"/> <!-- Nose -->
  <!-- Ribbon Banner -->
  <rect x="14" y="106" width="132" height="24" rx="5" fill="#B45309" stroke="#FEF3C7" stroke-width="1.5"/>
  <text x="80" y="122" font-family="'Arial Black', sans-serif" font-size="10.5" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
    PRIME
  </text>
  <text x="80" y="142" font-family="'Arial Black', sans-serif" font-size="8.5" font-weight="900" fill="#FDE68A" text-anchor="middle" letter-spacing="1">
    BROTHERS
  </text>
</svg>
`)}`,

  // 4. FEARLESS BROTHERS (Hooded Ninja / Assassin)
  'team-fearless': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="fbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="50%" stop-color="#6D28D9"/>
      <stop offset="100%" stop-color="#2E1065"/>
    </linearGradient>
  </defs>
  <!-- Shield Frame -->
  <path d="M80 12 L140 36 V96 C140 126 80 150 80 150 C80 150 20 126 20 96 V36 L80 12 Z" fill="url(#fbGrad)" stroke="#A78BFA" stroke-width="4.5"/>
  <path d="M80 20 L132 42 V92 C132 118 80 140 80 140 C80 140 28 118 28 92 V42 L80 20 Z" fill="#13072E" stroke="#7C3AED" stroke-width="1.5"/>
  <!-- Hooded Shadow Warrior -->
  <path d="M80 28 C64 32 58 48 58 64 C58 78 66 90 80 92 C94 90 102 78 102 64 C102 48 96 32 80 28 Z" fill="#6D28D9" stroke="#C4B5FD" stroke-width="1.5"/>
  <!-- Dark Face Opening with Glowing Purple Eyes -->
  <path d="M68 54 C68 48 92 48 92 54 L94 72 L80 78 L66 72 Z" fill="#090217"/>
  <!-- Glowing Violet Eyes -->
  <ellipse cx="74" cy="58" rx="4" ry="2" fill="#E9D5FF" stroke="#A855F7" stroke-width="1"/>
  <ellipse cx="86" cy="58" rx="4" ry="2" fill="#E9D5FF" stroke="#A855F7" stroke-width="1"/>
  <!-- Ribbon Banner -->
  <rect x="14" y="106" width="132" height="24" rx="5" fill="#5B21B6" stroke="#DDD6FE" stroke-width="1.5"/>
  <text x="80" y="122" font-family="'Arial Black', sans-serif" font-size="9.5" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">
    FEARLESS
  </text>
  <text x="80" y="142" font-family="'Arial Black', sans-serif" font-size="8.5" font-weight="900" fill="#C4B5FD" text-anchor="middle" letter-spacing="1">
    BROTHERS
  </text>
</svg>
`)}`,

  // 5. MIGHTY BROTHERS (Fierce Eagle Head)
  'team-mighty': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="mbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06B6D4"/>
      <stop offset="50%" stop-color="#0891B2"/>
      <stop offset="100%" stop-color="#164E63"/>
    </linearGradient>
  </defs>
  <!-- Shield Frame -->
  <path d="M80 12 L140 36 V96 C140 126 80 150 80 150 C80 150 20 126 20 96 V36 L80 12 Z" fill="url(#mbGrad)" stroke="#22D3EE" stroke-width="4.5"/>
  <path d="M80 20 L132 42 V92 C132 118 80 140 80 140 C80 140 28 118 28 92 V42 L80 20 Z" fill="#083344" stroke="#06B6D4" stroke-width="1.5"/>
  <!-- Fierce Eagle Profile -->
  <path d="M58 52 C62 36 86 34 100 42 C108 46 114 54 116 62 C116 70 102 74 94 72 L86 86 L76 74 C66 74 58 64 58 52 Z" fill="#0891B2" stroke="#67E8F9" stroke-width="1.5"/>
  <!-- Eagle Hooked Beak -->
  <path d="M98 54 L118 64 L100 70 Z" fill="#F59E0B" stroke="#B45309" stroke-width="1"/>
  <!-- Eagle Eye -->
  <circle cx="84" cy="50" r="3.5" fill="#FEF08A"/>
  <circle cx="84" cy="50" r="1.5" fill="#000000"/>
  <!-- Ribbon Banner -->
  <rect x="14" y="106" width="132" height="24" rx="5" fill="#0E7490" stroke="#CFFAFE" stroke-width="1.5"/>
  <text x="80" y="122" font-family="'Arial Black', sans-serif" font-size="10.5" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
    MIGHTY
  </text>
  <text x="80" y="142" font-family="'Arial Black', sans-serif" font-size="8.5" font-weight="900" fill="#67E8F9" text-anchor="middle" letter-spacing="1">
    BROTHERS
  </text>
</svg>
`)}`,

  // 6. AMRA AMROI BROTHERS ELEVEN (Powerful Raised Clenched Fist)
  'team-amra-amroi': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <defs>
    <linearGradient id="aaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22C55E"/>
      <stop offset="50%" stop-color="#16A34A"/>
      <stop offset="100%" stop-color="#14532D"/>
    </linearGradient>
  </defs>
  <!-- Shield Frame -->
  <path d="M80 12 L140 36 V96 C140 126 80 150 80 150 C80 150 20 126 20 96 V36 L80 12 Z" fill="url(#aaGrad)" stroke="#4ADE80" stroke-width="4.5"/>
  <path d="M80 20 L132 42 V92 C132 118 80 140 80 140 C80 140 28 118 28 92 V42 L80 20 Z" fill="#052E16" stroke="#16A34A" stroke-width="1.5"/>
  <!-- Raised Fist of Unity & Power -->
  <path d="M70 88 L70 64 C70 60 74 58 76 58 C78 58 82 60 82 64 L82 88 Z" fill="#22C55E"/>
  <path d="M64 54 C64 50 96 50 96 54 L98 74 C98 84 92 90 80 92 C68 90 62 84 62 74 Z" fill="#16A34A" stroke="#86EFAC" stroke-width="2"/>
  <!-- Finger Segments of Clenched Fist -->
  <rect x="66" y="52" width="6" height="14" rx="3" fill="#4ADE80"/>
  <rect x="73" y="50" width="6" height="16" rx="3" fill="#4ADE80"/>
  <rect x="80" y="50" width="6" height="16" rx="3" fill="#4ADE80"/>
  <rect x="87" y="52" width="6" height="14" rx="3" fill="#4ADE80"/>
  <path d="M64 68 C64 68 76 68 84 76" stroke="#14532D" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Ribbon Banner -->
  <rect x="14" y="106" width="132" height="24" rx="5" fill="#15803D" stroke="#DCFCE7" stroke-width="1.5"/>
  <text x="80" y="122" font-family="'Arial Black', sans-serif" font-size="8" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">
    AMRA AMROI
  </text>
  <text x="80" y="142" font-family="'Arial Black', sans-serif" font-size="7.5" font-weight="900" fill="#86EFAC" text-anchor="middle" letter-spacing="0.5">
    BROTHERS ELEVEN
  </text>
</svg>
`)}`,

  // Backwards compatibility aliases
  'team-kings': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <circle cx="80" cy="80" r="70" fill="#0A244A" stroke="#EAB308" stroke-width="6"/>
  <text x="80" y="88" font-family="'Arial Black', sans-serif" font-size="12" font-weight="900" fill="#FFFFFF" text-anchor="middle">BPL</text>
</svg>
`)}`,
  'team-titans': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <circle cx="80" cy="80" r="70" fill="#0F172A" stroke="#38BDF8" stroke-width="6"/>
  <text x="80" y="88" font-family="'Arial Black', sans-serif" font-size="12" font-weight="900" fill="#FFFFFF" text-anchor="middle">BPL</text>
</svg>
`)}`,
  'team-strikers': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <circle cx="80" cy="80" r="70" fill="#7F1D1D" stroke="#DC2626" stroke-width="6"/>
  <text x="80" y="88" font-family="'Arial Black', sans-serif" font-size="12" font-weight="900" fill="#FFFFFF" text-anchor="middle">BPL</text>
</svg>
`)}`,
  'team-challengers': `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <circle cx="80" cy="80" r="70" fill="#042F2E" stroke="#14B8A6" stroke-width="6"/>
  <text x="80" y="88" font-family="'Arial Black', sans-serif" font-size="12" font-weight="900" fill="#FFFFFF" text-anchor="middle">BPL</text>
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
