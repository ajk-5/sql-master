import { difficultyOf } from '@/data/difficulty';
import type { Level } from '@/engine/types';
import { scoreSolve, type XpBreakdown } from './scoring';

export {
  FLOOR_SHARE,
  PAR_MS,
  REVEAL_MULTIPLIER,
  difficultyFromXp,
  formatDuration,
  scoreSolve,
} from './scoring';
export type { Band, Difficulty, SolveContext, XpBreakdown } from './scoring';

/** Scores a solve of a particular case. */
export function scoreLevelSolve(
  level: Level,
  solve: { elapsedMs: number; attempts: number; hintsUsed: number; revealed: boolean },
): XpBreakdown {
  return scoreSolve({
    baseXp: level.xp,
    difficulty: difficultyOf(level),
    elapsedMs: solve.elapsedMs,
    attempts: solve.attempts,
    hintsUsed: solve.hintsUsed,
    revealed: solve.revealed,
  });
}

/** The most a case can pay, used to show players what is still on the table. */
export function bestPossible(level: Level): number {
  return scoreLevelSolve(level, {
    elapsedMs: 0,
    attempts: 1,
    hintsUsed: 0,
    revealed: false,
  }).total;
}

/** Finishing an act pays a tenth of everything it contained. */
export function actCompletionBonus(levels: Level[]): number {
  return Math.round(levels.reduce((sum, level) => sum + level.xp, 0) * 0.1);
}
