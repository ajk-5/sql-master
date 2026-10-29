import { createContext } from 'react';
import type { Badge } from '@/data/badges';
import type { XpBreakdown } from '@/game/xp';
import type { Progress, ProgressSnapshot, Settings } from './types';

export type SubmitResult = {
  earned: Badge[];
  xpGained: number;
  firstSolve: boolean;
  /** How the score was arrived at, for showing the player the working. */
  breakdown: XpBreakdown | null;
  actBonus: number;
};

export type ProgressApi = {
  progress: Progress;
  snapshot: ProgressSnapshot;
  /** Folds a graded submission into the save file and returns what it earned. */
  submit: (input: { levelId: number; solved: boolean; elapsedMs: number; sql: string }) => SubmitResult;
  takeHint: (levelId: number) => void;
  reveal: (levelId: number) => void;
  setSettings: (patch: Partial<Settings>) => void;
  reset: () => void;
  /** Badges awarded but not yet acknowledged by the celebration overlay. */
  pendingBadges: Badge[];
  dismissBadge: (id: string) => void;
};

export const ProgressContext = createContext<ProgressApi | null>(null);
