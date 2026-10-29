import type { Level } from '@/engine/types';
import { difficultyFromXp, type Difficulty } from '@/game/scoring';

export type { Difficulty };

/**
 * Difficulty is derived from a case's XP rather than stored alongside it, so the
 * two can never drift apart. XP rises monotonically inside every act, which is
 * what makes each act read as a ramp from easy to hard. The band table lives in
 * game/scoring.ts, which the score server shares.
 */
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: 'Gentle',
  2: 'Steady',
  3: 'Testing',
  4: 'Hard',
  5: 'Brutal',
};

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  1: '#3ec1a0',
  2: '#3fa7d6',
  3: '#f0b429',
  4: '#e0533d',
  5: '#d64550',
};

export function difficultyOf(level: Pick<Level, 'xp'>): Difficulty {
  return difficultyFromXp(level.xp);
}

/** A compact "●●●○○" rating for the case tiles. */
export function difficultyDots(level: Pick<Level, 'xp'>): string {
  const rating = difficultyOf(level);
  return '●'.repeat(rating) + '○'.repeat(5 - rating);
}
