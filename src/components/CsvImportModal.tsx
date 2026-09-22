import React, { useState } from 'react';
import { X, Upload, AlertTriangle, CheckCircle, ArrowRight, FileText } from 'lucide-react';
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
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      parseCsv(text);
    };

    reader.readAsText(file);
  };

  const parseCsv = (csvText: string) => {
    const lines = csvText.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return;

    // Header parse
    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

    // Find indices
    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('player'));
    const jerseyIdx = headers.findIndex((h) => h.includes('jersey') || h.includes('no'));
    const catIdx = headers.findIndex((h) => h.includes('cat') || h.includes('role') || h.includes('type'));
    const batIdx = headers.findIndex((h) => h.includes('bat'));
    const bowlIdx = headers.findIndex((h) => h.includes('bowl'));
    const badgeIdx = headers.findIndex((h) => h.includes('badge'));

    const rows: ParsedRow[] = [];

    const existingNames = new Set(
      existingPlayers.map((p) => p.fullName.trim().toLowerCase())
    );

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      const rawName = cols[nameIdx !== -1 ? nameIdx : 0] || '';
      const rawJersey = cols[jerseyIdx !== -1 ? jerseyIdx : 1] || `${i}`;
      const rawCat = cols[catIdx !== -1 ? catIdx : 2] || '';
      const rawBat = cols[batIdx !== -1 ? batIdx : 3] || 'Right Handed';
      const rawBowl = cols[bowlIdx !== -1 ? bowlIdx : 4] || 'Right-arm Fast';
      const rawBadge = (cols[badgeIdx !== -1 ? badgeIdx : 5] || 'CLASSIC').toUpperCase();

      const errors: string[] = [];

      if (!rawName) {
        errors.push('Name is required');
      }

      // Check duplicates
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

      if (!matchedCat && categories.length > 0) {
        // Fallback to first available category
        matchedCat = categories[0];
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
      ];
      const badge: PlayerBadge = validBadges.includes(rawBadge as PlayerBadge)
        ? (rawBadge as PlayerBadge)
        : 'CLASSIC';

      rows.push({
        fullName: rawName,
        jerseyNumber: rawJersey,
        categoryName: matchedCat?.name || rawCat,
        matchedCategoryId: matchedCat?.id || '',
        playerType: rawCat || 'Cricketer',
        battingStyle: rawBat.toLowerCase().includes('left') ? 'Left Handed' : 'Right Handed',
        bowlingStyle: rawBowl,
        badge,
        isValid: errors.length === 0,
        isDuplicate,
        errors,
      });
    }

    setParsedRows(rows);
    setStep('preview');
  };

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid && !r.isDuplicate);
    const now = Date.now();

    const newPlayers: Player[] = validRows.map((r, i) => ({
      id: `imported-${now}-${i}`,
      draftId,
      fullName: r.fullName,
      jerseyNumber: r.jerseyNumber,
      primaryCategoryId: r.matchedCategoryId || categories[0]?.id || '',
      playerType: r.playerType,
      battingStyle: r.battingStyle,
      bowlingStyle: r.bowlingStyle,
      badge: r.badge,
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-[#061A36]">Import Players via CSV</h3>
            <p className="text-xs text-slate-500">
              Upload, validate, check duplicates, and preview before saving
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'upload' ? (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-[#1283E6] transition-colors bg-slate-50">
                <FileText className="w-12 h-12 text-[#1283E6] mx-auto mb-3" />
                <h4 className="font-bold text-sm text-slate-800">
                  Select CSV File to Upload
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Export from Google Sheets or Excel as .csv. Expected headers: Full Name, Jersey No, Category, Batting Style, Bowling Style, Badge.
                </p>

                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] text-white text-xs font-bold rounded-xl cursor-pointer mt-4 transition-all shadow-sm">
                  <Upload className="w-4 h-4" />
                  Choose CSV File
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#1283E6]" />
                  CSV Format Template:
                </div>
                <p className="font-mono text-[11px] bg-white p-2 rounded border border-blue-200 text-slate-700">
                  Full Name,Jersey No,Category,Batting Style,Bowling Style,Badge<br />
                  Asif,99,Bowler,Right Handed,Right-arm Express Fast,WICKET TAKER<br />
                  Naeem Roni,07,Top Order Batter,Right Handed,Right-arm Offbreak,CLASSIC
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-600">
                  File: <strong className="text-slate-800">{fileName}</strong>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {validCount} Ready to Import
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600 font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      {invalidCount} Skipped/Invalid
                    </span>
                  )}
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Player Name</th>
                      <th className="p-2.5">Jersey</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Batting</th>
                      <th className="p-2.5">Bowling</th>
                      <th className="p-2.5">Badge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid && !row.isDuplicate ? 'hover:bg-slate-50' : 'bg-red-50/50'}
                      >
                        <td className="p-2.5">
                          {row.isValid && !row.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Valid
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-red-600 font-semibold"
                              title={row.errors.join(', ')}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {row.errors[0] || 'Error'}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-bold text-slate-800">{row.fullName}</td>
                        <td className="p-2.5 text-slate-600">#{row.jerseyNumber}</td>
                        <td className="p-2.5 text-slate-600">{row.categoryName}</td>
                        <td className="p-2.5 text-slate-600">{row.battingStyle}</td>
                        <td className="p-2.5 text-slate-600">{row.bowlingStyle}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {row.badge}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {step === 'preview' ? (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back to Upload
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={validCount === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1283E6] hover:bg-[#0A5DB8] disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                <span>Confirm & Import ({validCount} Players)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
