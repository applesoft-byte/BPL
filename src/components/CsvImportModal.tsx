import React, { useState } from 'react';
import {
  X,
  Upload,
  AlertTriangle,
  CheckCircle,
  FileText,
  FileSpreadsheet,
  Link as LinkIcon,
  Sparkles,
  ClipboardPaste,
  Check,
  Info,
} from 'lucide-react';
import { Category, Player, PlayerBadge } from '../types';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  existingPlayers: Player[];
  draftId: string;
  onImportComplete: (players: Player[]) => void;
}

interface ParsedRow {
  fullName: string;
  jerseyNumber: string;
  categoryName: string;
  playerType: string;
  battingStyle: 'Right Handed' | 'Left Handed';
  bowlingStyle: string;
  badge: PlayerBadge;
  matchedCategoryId: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingPlayers,
  draftId,
  onImportComplete,
}) => {
  const [tab, setTab] = useState<'upload' | 'google_sheet' | 'paste_roster'>('upload');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [sourceName, setSourceName] = useState<string>('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [defaultCatId, setDefaultCatId] = useState(categories[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // File Upload Handler (CSV, TSV, TXT, PDF)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSourceName(file.name);
    setErrorMessage(null);
    setLoading(true);

    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        // Read text content from PDF file
        const text = await extractTextFromPdf(file);
        parseRawTextOrLines(text);
      } else {
        const text = await file.text();
        parseCsvOrTsv(text);
      }
    } catch (err: unknown) {
      console.error('File parsing error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to parse file. Please verify format.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Extract text from PDF using ArrayBuffer and text stream scanning
  const extractTextFromPdf = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let rawText = '';
    const decoder = new TextDecoder('utf-8');
    const content = decoder.decode(bytes);

    // Extract text from PDF stream objects: BT ... ET, (text) Tj, [(text)] TJ
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    const tjMatches: string[] = [];
    let match;
    while ((match = tjRegex.exec(content)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        tjMatches.push(match[1].replace(/\\([()\\])/g, '$1'));
      }
    }

    if (tjMatches.length > 5) {
      rawText = tjMatches.join('\n');
    } else {
      // Fallback: extract printable strings of 3+ letters
      const cleanWords = content.match(/[A-Za-z0-9\u0980-\u09FF\s.,\-_()/]{3,}/g) || [];
      rawText = cleanWords.slice(0, 1000).join('\n');
    }

    if (!rawText.trim()) {
      throw new Error(
        'Could not extract text from this PDF. Please copy the text from the PDF and use the "Paste Roster" tab.'
      );
    }
    return rawText;
  };

  // Google Sheets Fetch
  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      setErrorMessage('Please enter a Google Sheet URL.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      let csvUrl = googleSheetUrl.trim();
      // If regular sheet link: https://docs.google.com/spreadsheets/d/{ID}/edit...
      // Convert to export link: https://docs.google.com/spreadsheets/d/{ID}/export?format=csv
      const match = csvUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }

      setSourceName('Google Sheet');
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(
          'Could not fetch Google Sheet. Please ensure the sheet is set to "Anyone with the link can view" or File > Share > Publish to web as CSV.'
        );
      }
      const csvText = await response.text();
      parseCsvOrTsv(csvText);
    } catch (err: unknown) {
      console.warn('Google Sheet fetch error:', err);
      setErrorMessage(
        'Unable to load online sheet automatically. Tip: In Google Sheet, simply select all rows (Ctrl+A / Cmd+A), copy (Ctrl+C), and paste directly into the "Paste Roster / Table" tab!'
      );
    } finally {
      setLoading(false);
    }
  };

  // Paste Roster / Table parse
  const handleParsePastedContent = () => {
    if (!pastedContent.trim()) {
      setErrorMessage('Please paste player names or table data.');
      return;
    }
    setSourceName('Pasted Roster Data');
    parseCsvOrTsv(pastedContent);
  };

  // Parse CSV, TSV, or comma/tab separated text
  const parseCsvOrTsv = (rawText: string) => {
    const lines = rawText.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      setErrorMessage('No text lines found in input.');
      return;
    }

    // Determine delimiter (comma, tab, semicolon)
    const firstLine = lines[0];
    const isTab = firstLine.includes('\t');
    const isComma = firstLine.includes(',');
    const delimiter = isTab ? '\t' : isComma ? ',' : ',';

    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

    const hasHeaderRow =
      headers.some((h) => h.includes('name') || h.includes('player')) ||
      headers.some((h) => h.includes('cat') || h.includes('role'));

    const startIndex = hasHeaderRow ? 1 : 0;

    const nameIdx = hasHeaderRow
      ? headers.findIndex((h) => h.includes('name') || h.includes('player'))
      : 0;
    const jerseyIdx = hasHeaderRow
      ? headers.findIndex((h) => h.includes('jersey') || h.includes('no'))
      : 1;
    const catIdx = hasHeaderRow
      ? headers.findIndex((h) => h.includes('cat') || h.includes('role') || h.includes('type'))
      : 2;
    const batIdx = hasHeaderRow ? headers.findIndex((h) => h.includes('bat')) : 3;
    const bowlIdx = hasHeaderRow ? headers.findIndex((h) => h.includes('bowl')) : 4;
    const badgeIdx = hasHeaderRow ? headers.findIndex((h) => h.includes('badge')) : 5;

    const rows: ParsedRow[] = [];
    const existingNames = new Set(
      existingPlayers.map((p) => p.fullName.trim().toLowerCase())
    );

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let cols: string[] = [];
      if (line.includes(delimiter)) {
        cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      } else {
        // Plain single line with name
        cols = [line];
      }

      const rawName = cols[nameIdx !== -1 && cols[nameIdx] ? nameIdx : 0] || '';
      if (!rawName || rawName.length < 2) continue;

      const rawJersey = cols[jerseyIdx !== -1 ? jerseyIdx : 1] || `${existingPlayers.length + rows.length + 1}`;
      const rawCat = cols[catIdx !== -1 ? catIdx : 2] || '';
      const rawBat = cols[batIdx !== -1 ? batIdx : 3] || 'Right Handed';
      const rawBowl = cols[bowlIdx !== -1 ? bowlIdx : 4] || 'Right-arm Medium';
      const rawBadge = (cols[badgeIdx !== -1 ? badgeIdx : 5] || 'ALL-ROUNDER').toUpperCase();

      const errors: string[] = [];
      const isDuplicate = existingNames.has(rawName.toLowerCase());
      if (isDuplicate) {
        errors.push('Player already exists in current draft');
      }

      // Match category
      let matchedCat = categories.find(
        (c) =>
          c.name.toLowerCase() === rawCat.toLowerCase() ||
          rawCat.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(rawCat.toLowerCase())
      );

      if (!matchedCat && defaultCatId) {
        matchedCat = categories.find((c) => c.id === defaultCatId) || categories[0];
      }

      const validBadges: PlayerBadge[] = [
        'HARD HITTER',
        'CLASSIC',
        'DESTROYER',
        'FINISHER',
        'ALL-ROUNDER',
        'WICKET TAKER',
        'ECONOMIST',
        'GAME CHANGER',
        'SAFE HANDS',
        'LEADER',
        'CAPTAIN',
      ];
      const badge: PlayerBadge = validBadges.includes(rawBadge as PlayerBadge)
        ? (rawBadge as PlayerBadge)
        : 'ALL-ROUNDER';

      rows.push({
        fullName: rawName,
        jerseyNumber: rawJersey,
        categoryName: matchedCat?.name || 'General Roster',
        matchedCategoryId: matchedCat?.id || categories[0]?.id || '',
        playerType: rawCat || 'All-Rounder',
        battingStyle: rawBat.toLowerCase().includes('left') ? 'Left Handed' : 'Right Handed',
        bowlingStyle: rawBowl,
        badge,
        isValid: errors.length === 0,
        isDuplicate,
        errors,
      });
    }

    if (rows.length === 0) {
      setErrorMessage('Could not find valid player records in the provided data.');
      return;
    }

    setParsedRows(rows);
    setStep('preview');
  };

  // Fallback line parser for free-form PDF lines
  const parseRawTextOrLines = (text: string) => {
    const rawLines = text
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    const rows: ParsedRow[] = [];
    const existingNames = new Set(
      existingPlayers.map((p) => p.fullName.trim().toLowerCase())
    );

    let counter = existingPlayers.length + 1;

    for (const line of rawLines) {
      // Filter out obvious noise or header words
      if (
        line.toLowerCase().startsWith('page ') ||
        line.toLowerCase().startsWith('report') ||
        line.toLowerCase() === 'full name'
      ) {
        continue;
      }

      // Check if line contains a number e.g. "1. Shakib Al Hasan" or "45 Mashrafe"
      const nameMatch = line.replace(/^\d+[\s.)-]+\s*/, '').trim();
      if (!nameMatch || nameMatch.length < 2) continue;

      const isDuplicate = existingNames.has(nameMatch.toLowerCase());
      const errors = isDuplicate ? ['Player already exists in current draft'] : [];

      const matchedCat = categories.find((c) => c.id === defaultCatId) || categories[0];

      rows.push({
        fullName: nameMatch,
        jerseyNumber: `${counter++}`,
        categoryName: matchedCat?.name || 'General Roster',
        matchedCategoryId: matchedCat?.id || categories[0]?.id || '',
        playerType: 'All-Rounder',
        battingStyle: 'Right Handed',
        bowlingStyle: 'Right-arm Medium',
        badge: 'ALL-ROUNDER',
        isValid: errors.length === 0,
        isDuplicate,
        errors,
      });
    }

    if (rows.length === 0) {
      setErrorMessage('No valid player names found in PDF.');
      return;
    }

    setParsedRows(rows);
    setStep('preview');
  };

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid && !r.isDuplicate);
    const now = Date.now();

    const newPlayers: Player[] = validRows.map((r, i) => ({
      id: `player-imp-${now}-${i}`,
      draftId,
      fullName: r.fullName,
      jerseyNumber: r.jerseyNumber,
      primaryCategoryId: r.matchedCategoryId || categories[0]?.id || '',
      playerType: r.playerType,
      battingStyle: r.battingStyle,
      bowlingStyle: r.bowlingStyle,
      badge: r.badge,
      inDraftPool: true,
      status: 'available',
      createdAt: now,
      updatedAt: now,
    }));

    onImportComplete(newPlayers);
    onClose();
  };

  const validCount = parsedRows.filter((r) => r.isValid && !r.isDuplicate).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-[#061A36] to-[#0A5DB8] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Import Players to Tournament
              </h3>
              <p className="text-xs text-blue-100">
                Upload PDF, Google Sheets, Excel CSV, or Paste Roster List
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-5">
              {/* Method Selector Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setTab('upload')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    tab === 'upload'
                      ? 'bg-white text-[#061A36] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-[#1283E6]" />
                  <span>Upload File (PDF / CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTab('google_sheet')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    tab === 'google_sheet'
                      ? 'bg-white text-[#061A36] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Sheet URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTab('paste_roster')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    tab === 'paste_roster'
                      ? 'bg-white text-[#061A36] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-amber-500" />
                  <span>Paste Roster / Table</span>
                </button>
              </div>

              {/* Default Category selector */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl text-xs">
                <span className="font-bold text-[#061A36]">
                  Default Category for Imported Players:
                </span>
                <select
                  value={defaultCatId}
                  onChange={(e) => setDefaultCatId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1283E6] outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* TAB 1: FILE UPLOAD */}
              {tab === 'upload' && (
                <div className="border-2 border-dashed border-slate-300 rounded-3xl p-8 text-center hover:border-[#1283E6] transition-colors bg-slate-50 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100/60 text-[#1283E6] flex items-center justify-center mx-auto shadow-inner">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    Upload Player List (PDF, CSV, TSV, or TXT)
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Supported formats: PDF match sheets, Google Sheet CSV exports, or Excel spreadsheets.
                  </p>

                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A5DB8] hover:bg-[#061A36] text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all active:scale-95">
                    <Upload className="w-4 h-4" />
                    <span>{loading ? 'Reading file...' : 'Choose File to Upload'}</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt,.pdf,application/pdf,text/csv"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={loading}
                    />
                  </label>
                </div>
              )}

              {/* TAB 2: GOOGLE SHEET */}
              {tab === 'google_sheet' && (
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Google Sheet Share Link</label>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                      value={googleSheetUrl}
                      onChange={(e) => setGoogleSheetUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#1283E6] outline-none"
                    />
                  </div>

                  <div className="text-[11px] text-slate-500 bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-600" />
                      Google Sheet Sharing Instructions:
                    </p>
                    <p>
                      1. Open your Google Sheet &gt; Click <strong>Share</strong> &gt; Set to <strong>"Anyone with the link can view"</strong>.
                    </p>
                    <p>
                      2. Or click <strong>File &gt; Share &gt; Publish to web &gt; Comma-separated values (.csv)</strong> and paste the link.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleFetchGoogleSheet}
                    disabled={loading || !googleSheetUrl.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{loading ? 'Fetching Sheet...' : 'Load Google Sheet Data'}</span>
                  </button>
                </div>
              )}

              {/* TAB 3: PASTE ROSTER */}
              {tab === 'paste_roster' && (
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Paste Player Table or List of Names
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Works with copied Google Sheets / Excel cells!
                      </span>
                    </div>
                    <textarea
                      rows={7}
                      placeholder="Paste copied cells from Google Sheets, or names (1 per line):&#10;Shakib Al Hasan	75	All-Rounder	Left Handed&#10;Tamim Iqbal	28	Batsman	Left Handed&#10;Mustafizur Rahman	90	Bowler	Left-arm Fast"
                      value={pastedContent}
                      onChange={(e) => setPastedContent(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#1283E6] outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleParsePastedContent}
                    disabled={!pastedContent.trim()}
                    className="w-full py-2.5 bg-[#0A5DB8] hover:bg-[#061A36] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Parse & Preview Players</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: PREVIEW & CONFIRM */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="text-xs text-slate-600">
                  Source: <strong className="text-slate-800">{sourceName}</strong>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {validCount} Ready to Import
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      {invalidCount} Skipped (Duplicates)
                    </span>
                  )}
                </div>
              </div>

              {/* Parsed List */}
              <div className="border border-slate-200 rounded-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                {parsedRows.map((r, i) => (
                  <div
                    key={i}
                    className={`p-3 flex items-center justify-between gap-3 ${
                      !r.isValid || r.isDuplicate ? 'bg-amber-50/50 opacity-75' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-mono font-bold text-[11px] text-slate-600 shrink-0">
                        {r.jerseyNumber || i + 1}
                      </span>
                      <div>
                        <p className="font-extrabold text-[#061A36]">{r.fullName}</p>
                        <p className="text-[10px] text-slate-500">
                          {r.battingStyle} • {r.bowlingStyle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={r.matchedCategoryId}
                        onChange={(e) => {
                          const updated = [...parsedRows];
                          updated[i].matchedCategoryId = e.target.value;
                          const catObj = categories.find((c) => c.id === e.target.value);
                          updated[i].categoryName = catObj?.name || 'General';
                          setParsedRows(updated);
                        }}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      {r.isDuplicate && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Duplicate
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Back / Change Source
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={validCount === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Add {validCount} Players</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
