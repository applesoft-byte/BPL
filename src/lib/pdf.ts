import jsPDF from 'jspdf';
import { Category, Draft, PdfExportOptions, Player, Team } from '../types';

export async function generateBplDraftPdf(
  draft: Draft,
  teams: Team[],
  players: Player[],
  categories: Category[],
  options: PdfExportOptions,
  onProgress?: (status: string) => void
): Promise<Blob> {
  onProgress?.('Initializing PDF generator...');

  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const navy = [6, 26, 54] as const;
  const primaryBlue = [18, 131, 230] as const;
  const darkGray = [31, 41, 55] as const;
  const lightBlueBg = [230, 247, 255] as const;
  const slateBorder = [229, 231, 235] as const;

  // Helper for footer
  const addFooter = (currentPage: number, totalPagesPlaceholder = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    // Subtle divider line
    doc.setDrawColor(...slateBorder);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.text('BROTHERS PREMIER LEAGUE • SEASON-2', margin, pageHeight - 7);
    doc.text('PLAY TOGETHER • WIN TOGETHER', pageWidth / 2, pageHeight - 7, { align: 'center' });
    doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  };

  let pageIndex = 1;

  // 1. Cover Page
  if (options.includeCover) {
    onProgress?.('Building Cover Page...');

    // Dark Navy Top Banner
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 85, 'F');

    // Accent line
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 85, pageWidth, 3, 'F');

    // Title text inside banner
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('OFFICIAL TOURNAMENT SQUAD ANNOUNCEMENT', pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(26);
    doc.text('BROTHERS PREMIER LEAGUE', pageWidth / 2, 36, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(255, 122, 46); // Accent orange
    doc.text('SEASON-2 (2026)', pageWidth / 2, 47, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(230, 247, 255);
    doc.text('FINAL PLAYER DRAFT & OFFICIAL TEAM ROSTERS', pageWidth / 2, 58, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(186, 230, 253);
    doc.text('FAIR PLAY • TRANSPARENT • STRONGER TEAMS', pageWidth / 2, 69, { align: 'center' });

    // Middle Content: Statistics card
    let curY = 100;
    doc.setFillColor(...lightBlueBg);
    doc.roundedRect(margin, curY, contentWidth, 38, 3, 3, 'F');
    doc.setDrawColor(...primaryBlue);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, curY, contentWidth, 38, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...navy);
    doc.text('TOURNAMENT DRAFT SUMMARY', margin + 6, curY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);

    const draftedCount = players.filter((p) => p.status === 'drafted').length;
    const statCols = [
      { label: 'Total Teams', val: `${teams.length}` },
      { label: 'Total Players', val: `${players.length}` },
      { label: 'Drafted Slots', val: `${draftedCount}` },
      { label: 'Categories', val: `${categories.length}` },
      { label: 'Status', val: draft.status.toUpperCase() },
    ];

    const colW = (contentWidth - 12) / statCols.length;
    statCols.forEach((st, idx) => {
      const cx = margin + 6 + idx * colW;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...primaryBlue);
      doc.text(st.val, cx, curY + 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(st.label, cx, curY + 30);
    });

    curY += 50;

    // Team Badges Grid
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...navy);
    doc.text('PARTICIPATING FRANCHISES', margin, curY);

    curY += 7;
    const teamCardW = (contentWidth - (teams.length > 2 ? 6 : 4)) / (teams.length > 2 ? 2 : 1);
    const cardH = 22;

    teams.forEach((t, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const tx = margin + col * (teamCardW + 6);
      const ty = curY + row * (cardH + 4);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(tx, ty, teamCardW, cardH, 2, 2, 'F');
      doc.setDrawColor(...slateBorder);
      doc.roundedRect(tx, ty, teamCardW, cardH, 2, 2, 'S');

      // Team accent stripe
      doc.setFillColor(t.primaryColor || '#1283E6');
      doc.rect(tx, ty, 3, cardH, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...navy);
      doc.text(t.name, tx + 7, ty + 9);

      const teamPlayers = players.filter((p) => p.assignedTeamId === t.id);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Roster: ${teamPlayers.length} / ${t.maxPlayers} Players • Code: ${t.shortName}`, tx + 7, ty + 16);
    });

    addFooter(pageIndex);
    pageIndex++;
    doc.addPage();
  }

  // 2. Summary Matrix Table (if enabled)
  if (options.includeSummaryTable) {
    onProgress?.('Generating Category Breakdown & Team Summary Matrix...');

    doc.setFillColor(...navy);
    doc.rect(margin, 12, contentWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('BPL S-2 SQUAD CATEGORY ALLOCATION MATRIX', margin + 6, 21);

    let curY = 32;

    // Table Header
    const colNameW = 48;
    const colTotalW = 18;
    const remainingW = contentWidth - colNameW - colTotalW;
    const catColW = remainingW / Math.max(1, categories.length);

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, curY, contentWidth, 8, 'F');
    doc.setDrawColor(...slateBorder);
    doc.rect(margin, curY, contentWidth, 8, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...navy);
    doc.text('Team Name', margin + 3, curY + 5.5);

    categories.forEach((cat, cIdx) => {
      const cx = margin + colNameW + cIdx * catColW;
      const shortName = cat.name.length > 12 ? cat.name.substring(0, 10) + '..' : cat.name;
      doc.text(shortName, cx + 1, curY + 5.5);
    });

    doc.text('Total', margin + contentWidth - colTotalW + 3, curY + 5.5);

    curY += 8;

    // Table Rows
    teams.forEach((t) => {
      const teamPlayers = players.filter((p) => p.assignedTeamId === t.id);

      doc.setFillColor(255, 255, 255);
      doc.rect(margin, curY, contentWidth, 7, 'F');
      doc.setDrawColor(...slateBorder);
      doc.rect(margin, curY, contentWidth, 7, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...navy);
      doc.text(t.name, margin + 3, curY + 5);

      categories.forEach((cat, cIdx) => {
        const cx = margin + colNameW + cIdx * catColW;
        const countInCat = teamPlayers.filter((p) => p.primaryCategoryId === cat.id || p.assignedCategoryId === cat.id).length;
        const quota = t.quotas[cat.id] ?? 0;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        if (countInCat >= quota && quota > 0) {
          doc.setTextColor(22, 163, 74);
        } else {
          doc.setTextColor(71, 85, 105);
        }
        doc.text(`${countInCat}/${quota}`, cx + 2, curY + 5);
      });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryBlue);
      doc.text(`${teamPlayers.length}/${t.maxPlayers}`, margin + contentWidth - colTotalW + 3, curY + 5);

      curY += 7;
    });

    curY += 12;

    // Detailed Team Rosters
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...navy);
    doc.text('OFFICIAL TEAM SQUAD ROSTERS', margin, curY);
    curY += 6;

    // Render each team's roster grouped by category
    for (let tIdx = 0; tIdx < teams.length; tIdx++) {
      const team = teams[tIdx];
      const teamPlayers = players.filter((p) => p.assignedTeamId === team.id);

      // Check page break
      if (curY > pageHeight - 50) {
        addFooter(pageIndex);
        pageIndex++;
        doc.addPage();
        curY = 20;
      }

      onProgress?.(`Formatting roster for ${team.name}...`);

      // Team Header
      doc.setFillColor(team.primaryColor || '#0A5DB8');
      doc.roundedRect(margin, curY, contentWidth, 11, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(255, 255, 255);
      doc.text(team.name.toUpperCase(), margin + 5, curY + 7.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Squad: ${teamPlayers.length} / ${team.maxPlayers} Players`, margin + contentWidth - 42, curY + 7.5);

      curY += 15;

      // Group players by category
      for (const cat of categories) {
        const catPlayers = teamPlayers.filter(
          (p) => p.primaryCategoryId === cat.id || p.assignedCategoryId === cat.id
        );

        if (catPlayers.length === 0) continue;

        if (curY > pageHeight - 35) {
          addFooter(pageIndex);
          pageIndex++;
          doc.addPage();
          curY = 20;
        }

        // Category Subheading
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, curY, contentWidth, 6, 'F');
        doc.setDrawColor(...slateBorder);
        doc.rect(margin, curY, contentWidth, 6, 'S');

        doc.setFillColor(cat.color || '#1283E6');
        doc.circle(margin + 4, curY + 3, 1.8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...navy);
        doc.text(cat.name.toUpperCase(), margin + 8, curY + 4.2);

        curY += 8;

        // Player cards in 2 columns
        const cardColW = (contentWidth - 4) / 2;
        const playerCardH = 15;

        for (let pI = 0; pI < catPlayers.length; pI++) {
          const player = catPlayers[pI];
          const col = pI % 2;
          const px = margin + col * (cardColW + 4);

          if (col === 0 && pI > 0) {
            curY += playerCardH + 3;
          }

          if (curY > pageHeight - 25) {
            addFooter(pageIndex);
            pageIndex++;
            doc.addPage();
            curY = 20;
          }

          // Card Background
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(px, curY, cardColW, playerCardH, 1.5, 1.5, 'F');
          doc.setDrawColor(...slateBorder);
          doc.roundedRect(px, curY, cardColW, playerCardH, 1.5, 1.5, 'S');

          // Jersey pill
          doc.setFillColor(...lightBlueBg);
          doc.roundedRect(px + 2, curY + 2.5, 8, 9.5, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(...primaryBlue);
          doc.text(`#${player.jerseyNumber || '00'}`, px + 3.2, curY + 8);

          // Player Name & Type
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...navy);
          doc.text(player.fullName, px + 12, curY + 6);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`${player.battingStyle} • ${player.bowlingStyle || 'Bowler'}`, px + 12, curY + 11.5);

          // Badge on right
          if (options.includeBadges && player.badge) {
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(px + cardColW - 25, curY + 3.5, 23, 4.5, 1, 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(15, 92, 184);
            doc.text(player.badge, px + cardColW - 13.5, curY + 6.8, { align: 'center' });
          }
        }

        curY += playerCardH + 5;
      }

      curY += 6;
    }

    addFooter(pageIndex);
  }

  onProgress?.('Finalizing and building document...');
  const blob = doc.output('blob');
  return blob;
}
