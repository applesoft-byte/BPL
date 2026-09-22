export type PlayerStatus = 'available' | 'drafted' | 'inactive';
export type DraftStatus = 'setup' | 'ready' | 'live' | 'paused' | 'completed';
export type AnimationSpeed = 'fast' | 'normal' | 'slow';
export type CategoryDraftMode = 'category_by_category' | 'all_mixed' | 'manual';

export type PlayerBadge =
  | 'HARD HITTER'
  | 'CLASSIC'
  | 'DESTROYER'
  | 'FINISHER'
  | 'ALL-ROUNDER'
  | 'WICKET TAKER'
  | 'ECONOMIST'
  | 'GAME CHANGER'
  | 'SAFE HANDS'
  | 'LEADER';

export interface Player {
  id: string;
  draftId: string;
  fullName: string;
  jerseyNumber: string;
  primaryCategoryId: string;
  secondaryCategoryId?: string;
  playerType: string;
  battingStyle: 'Right Handed' | 'Left Handed';
  bowlingStyle: string;
  badge: PlayerBadge;
  photoUrl?: string; // Data URL or asset key
  inDraftPool?: boolean; // Controls if player is selected for draft lottery
  contactEmail?: string;
  notes?: string;
  status: PlayerStatus;
  assignedTeamId?: string;
  assignedCategoryId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Team {
  id: string;
  draftId: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  maxPlayers: number; // default 11
  quotas: Record<string, number>; // categoryId -> target count
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  draftId: string;
  name: string;
  color: string;
  iconName: string;
  order: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PickRecord {
  id: string;
  draftId: string;
  sequence: number;
  playerId: string;
  teamId: string;
  categoryId: string;
  createdAt: number;
}

export interface DraftSettings {
  animationSpeed: AnimationSpeed;
  animationStyle?: 'spin' | 'wheel360';
  autoPick?: boolean;
  soundEnabled: boolean;
  celebrationEnabled: boolean;
  reducedMotion: boolean;
  autoSave: boolean;
  categoryMode: CategoryDraftMode;
}

export interface Draft {
  id: string;
  name: string;
  season: string;
  status: DraftStatus;
  logoUrl?: string;
  draftDate?: string;
  organizerName?: string;
  organizerRole?: string;
  slogan?: string;
  subSlogan?: string;
  tagline?: string;
  defaultPlayerQuota?: number;
  currentCategoryId?: string;
  settings: DraftSettings;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface DraftStats {
  totalPlayers: number;
  poolPlayersCount: number;
  draftedPlayers: number;
  remainingPlayers: number;
  totalTeams: number;
  totalCategories: number;
  totalQuotaRequired: number;
  progressPercent: number;
  isComplete: boolean;
}

export interface HistoryItem {
  pick: PickRecord;
  player: Player;
  team: Team;
  category: Category;
}

export interface PdfExportOptions {
  includeCover: boolean;
  includeTeamLogos: boolean;
  includePlayerPhotos: boolean;
  includeBadges: boolean;
  includeCategoryBreakdown: boolean;
  includeStatistics: boolean;
  includeSummaryTable: boolean;
  orientation: 'p' | 'l'; // portrait or landscape
}
