import { Player } from '../types';

/**
 * Strips Bangla script, Bangla names, and 'Bangla:' prefixes from players
 * Ensures completely clean English records in the database, storage, and UI.
 */
export function sanitizePlayerBangla(player: Player): Player {
  let notes = player.notes;
  let fullName = player.fullName;

  // 1. Strip Bangla from notes
  if (notes) {
    // Remove "Bangla: <anything up to | or end of line>"
    notes = notes.replace(/Bangla:\s*[^|]+(\||$)/gi, '');
    // Remove any remaining Bengali characters: \u0980-\u09FF
    notes = notes.replace(/[\u0980-\u09FF]+/g, '');
    // Clean up residual pipes like " | ", " |", "| ", or leading/trailing separators
    notes = notes
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' | ')
      .trim();
    if (!notes) {
      notes = undefined;
    }
  }

  // 2. Strip any Bengali characters or "Bangla:" from fullName if present
  if (fullName) {
    fullName = fullName
      .replace(/[\u0980-\u09FF]+/g, '')
      .replace(/Bangla:\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    ...player,
    notes,
    fullName: fullName || player.fullName,
  };
}
