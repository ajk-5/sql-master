/**
 * The scoring rules, and nothing else.
 *
 * This module deliberately imports nothing. The browser bundles it and the score
 * server runs it directly, so a case is worth exactly the same wherever it is
 * counted. If the two ever disagreed, the leaderboard would be fiction.
 */

export type Difficulty = 1 | 2 | 3 | 4 | 5;

const DIFFICULTY_BANDS: { max: number; level: Difficulty }[] = [
  { max: 80, level: 1 },
  { max: 130, level: 2 },
  { max: 170, level: 3 },
  { max: 220, level: 4 },
  { max: Number.POSITIVE_INFINITY, level: 5 },
];

export function difficultyFromXp(xp: number): Difficulty {
  return DIFFICULTY_BANDS.find((band) => xp < band.max)!.level;
}

/** How long a case is expected to take, by difficulty. */
export const PAR_MS: Record<Difficulty, number> = {
  1: 90_000,
  2: 150_000,
  3: 300_000,
  4: 480_000,
  5: 720_000,
};

export type Band = { multiplier: number; label: string; note: string };

const SPEED_BANDS: { upTo: number; band: Band }[] = [
  { upTo: 0.4, band: { multiplier: 1.6, label: 'Lightning', note: 'far inside the target time' } },
  { upTo: 0.7, band: { multiplier: 1.35, label: 'Fast', note: 'comfortably inside the target time' } },
  { upTo: 1.0, band: { multiplier: 1.15, label: 'On par', note: 'inside the target time' } },
  { upTo: 1.6, band: { multiplier: 1.0, label: 'Steady', note: 'a little over the target time' } },
  { upTo: 3.0, band: { multiplier: 0.85, label: 'Slow', note: 'well over the target time' } },
  {
    upTo: Number.POSITIVE_INFINITY,
    band: { multiplier: 0.7, label: 'Patient', note: 'a long way over the target time' },
  },
];

const ATTEMPT_BANDS: { upTo: number; band: Band }[] = [
  { upTo: 1, band: { multiplier: 1.15, label: 'First look', note: 'right on the first submission' } },
  { upTo: 2, band: { multiplier: 1.05, label: 'Second try', note: 'right on the second submission' } },
  { upTo: 5, band: { multiplier: 1.0, label: 'Worked for it', note: 'a handful of submissions' } },
  { upTo: 10, band: { multiplier: 0.92, label: 'Persistent', note: 'many submissions' } },
  {
    upTo: Number.POSITIVE_INFINITY,
    band: { multiplier: 0.85, label: 'Dogged', note: 'a great many submissions' },
  },
];

/** Revealing the answer collapses the reward to a quarter, whatever else happened. */
export const REVEAL_MULTIPLIER = 0.25;
/** No case ever pays less than this share of its base, so effort is never wasted. */
export const FLOOR_SHARE = 0.2;

export type SolveContext = {
  baseXp: number;
  difficulty: Difficulty;
  elapsedMs: number;
  attempts: number;
  hintsUsed: number;
  revealed: boolean;
};

export type XpBreakdown = {
  base: number;
  parMs: number;
  speed: Band;
  attempts: Band;
  hints: Band;
  total: number;
  flooredAt: boolean;
};

function pick(bands: { upTo: number; band: Band }[], value: number): Band {
  return bands.find((entry) => value <= entry.upTo)!.band;
}

function hintBand(hintsUsed: number): Band {
  const used = Math.max(0, Math.min(hintsUsed, 3));
  if (used === 0) return { multiplier: 1, label: 'Unaided', note: 'no hints opened' };
  return {
    multiplier: 1 - used * 0.15,
    label: used === 1 ? 'One hint' : `${used} hints`,
    note: `${used * 15} per cent given up for help`,
  };
}

/**
 * Scores one solve. Time is the largest single lever: the same case is worth
 * more than twice as much solved quickly as solved slowly.
 */
export function scoreSolve(context: SolveContext): XpBreakdown {
  const parMs = PAR_MS[context.difficulty];
  const speed = pick(SPEED_BANDS, Math.max(0, context.elapsedMs) / parMs);
  const attempts = pick(ATTEMPT_BANDS, Math.max(1, context.attempts));
  const hints = hintBand(context.hintsUsed);
  const floor = Math.round(context.baseXp * FLOOR_SHARE);

  if (context.revealed) {
    const revealed = Math.round(context.baseXp * REVEAL_MULTIPLIER);
    return {
      base: context.baseXp,
      parMs,
      speed,
      attempts,
      hints: {
        multiplier: REVEAL_MULTIPLIER,
        label: 'Answer revealed',
        note: 'a quarter of the base',
      },
      total: Math.max(floor, revealed),
      flooredAt: revealed < floor,
    };
  }

  const raw = context.baseXp * speed.multiplier * attempts.multiplier * hints.multiplier;
  const total = Math.max(floor, Math.round(raw));
  return { base: context.baseXp, parMs, speed, attempts, hints, total, flooredAt: total > raw };
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
}
