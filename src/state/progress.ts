import { ACTS } from '@/data/acts';
import { BADGES, newlyEarnedRuleBadges, type Badge } from '@/data/badges';
import { getConcept } from '@/data/docs';
import { actCompletionBonus, scoreLevelSolve, type XpBreakdown } from '@/game/xp';
import { LEVELS, getLevel } from '@/data/levels';
import {
  emptyProgress,
  emptyRecord,
  type LevelRecord,
  type Progress,
  type ProgressSnapshot,
  type Settings,
} from './types';

export const STORAGE_KEY = 'sqlmaster.progress.v2';
const LEGACY_KEYS = ['sqlmaster.progress.v1', 'sqlmaster:progress'];

/**
 * Reads saved progress. Storage can be unavailable (private windows, blocked
 * site data) or hold something written by an older build, so every failure
 * falls back to a fresh, playable file rather than throwing at start-up.
 */
export function loadProgress(storage: Storage | undefined = safeStorage()): Progress {
  if (!storage) return emptyProgress();
  try {
    const raw = storage.getItem(STORAGE_KEY) ?? readLegacy(storage);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return reconcile(parsed);
  } catch {
    return emptyProgress();
  }
}

function readLegacy(storage: Storage): string | null {
  for (const key of LEGACY_KEYS) {
    const value = storage.getItem(key);
    if (value) return value;
  }
  return null;
}

/** Repairs a parsed save so that missing or malformed fields cannot crash the app. */
export function reconcile(parsed: Partial<Progress>): Progress {
  const base = emptyProgress(parsed.createdAt ?? new Date().toISOString());
  const levels: Record<number, LevelRecord> = {};
  for (const [key, value] of Object.entries(parsed.levels ?? {})) {
    const id = Number(key);
    if (!Number.isInteger(id) || !getLevel(id)) continue;
    levels[id] = {
      ...emptyRecord(),
      ...value,
      solved: Boolean(value?.solved),
      attempts: Math.max(0, Number(value?.attempts ?? 0)),
      hintsUsed: Math.max(0, Number(value?.hintsUsed ?? 0)),
    };
  }
  const badges: Record<string, string> = {};
  for (const [id, when] of Object.entries(parsed.badges ?? {})) {
    if (BADGES.some((b) => b.id === id)) badges[id] = String(when);
  }
  return {
    ...base,
    lastPlayedAt: parsed.lastPlayedAt ?? base.lastPlayedAt,
    xp: Math.max(0, Number(parsed.xp ?? 0)),
    levels,
    badges,
    settings: { ...base.settings, ...(parsed.settings ?? {}) },
  };
}

export function saveProgress(
  progress: Progress,
  storage: Storage | undefined = safeStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Quota exceeded or storage disabled. The session still plays; it just will
    // not be here tomorrow, which is better than losing the current run.
  }
}

export function clearProgress(storage: Storage | undefined = safeStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
    for (const key of LEGACY_KEYS) storage.removeItem(key);
  } catch {
    // Nothing to do; the in-memory reset still happens.
  }
}

function safeStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined;
    // Touching the object is what actually throws in a blocked context.
    window.localStorage.getItem(STORAGE_KEY);
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function recordFor(progress: Progress, levelId: number): LevelRecord {
  return progress.levels[levelId] ?? emptyRecord();
}

export function snapshotOf(progress: Progress): ProgressSnapshot {
  const solvedIds = Object.entries(progress.levels)
    .filter(([, r]) => r.solved)
    .map(([id]) => Number(id))
    .sort((a, b) => a - b);

  const solvedLevels = solvedIds.map((id) => getLevel(id)).filter((l) => l !== undefined);

  const datasets = new Set(solvedLevels.map((l) => l.dataset));
  const families = new Set<string>();
  for (const level of solvedLevels) {
    for (const slug of level.concepts) {
      const concept = getConcept(slug);
      if (concept) families.add(concept.family);
    }
  }

  const actsCompleted = ACTS.filter((act) => {
    const inAct = LEVELS.filter((l) => l.actId === act.id);
    return inAct.length > 0 && inAct.every((l) => progress.levels[l.id]?.solved);
  }).map((a) => a.id);

  let solvedWithoutHints = 0;
  let solvedFirstAttempt = 0;
  for (const id of solvedIds) {
    const record = progress.levels[id];
    if (record.hintsUsed === 0 && !record.revealed) solvedWithoutHints += 1;
    if (record.solvedOnFirstAttempt) solvedFirstAttempt += 1;
  }

  return {
    xp: progress.xp,
    solvedIds,
    solvedCount: solvedIds.length,
    solvedWithoutHints,
    solvedFirstAttempt,
    datasetsCleared: [...datasets].sort(),
    conceptFamiliesCleared: [...families].sort(),
    actsCompleted,
  };
}

export type AttemptOutcome = {
  levelId: number;
  solved: boolean;
  elapsedMs: number;
  sql: string;
};

export type ApplyResult = {
  progress: Progress;
  earned: Badge[];
  xpGained: number;
  firstSolve: boolean;
  /** Why the score was what it was, so the player can be shown the working. */
  breakdown: XpBreakdown | null;
  /** Extra XP for finishing an act with this solve. */
  actBonus: number;
};

/**
 * Folds one submission into the save file, awarding XP the first time a case is
 * solved and collecting any badges that became true as a result.
 */
export function applyAttempt(progress: Progress, outcome: AttemptOutcome): ApplyResult {
  const level = getLevel(outcome.levelId);
  if (!level) {
    return { progress, earned: [], xpGained: 0, firstSolve: false, breakdown: null, actBonus: 0 };
  }

  const previous = recordFor(progress, level.id);
  const attempts = previous.attempts + 1;
  const firstSolve = outcome.solved && !previous.solved;

  const record: LevelRecord = {
    ...previous,
    attempts,
    solved: previous.solved || outcome.solved,
    lastSql: outcome.sql,
    firstSolvedAt: previous.firstSolvedAt ?? (outcome.solved ? new Date().toISOString() : undefined),
    solvedOnFirstAttempt:
      previous.solvedOnFirstAttempt ?? (outcome.solved && attempts === 1 && !previous.revealed),
    bestElapsedMs: outcome.solved
      ? Math.min(previous.bestElapsedMs ?? Number.POSITIVE_INFINITY, outcome.elapsedMs)
      : previous.bestElapsedMs,
  };

  // Time is the biggest lever on the score, so it is scored here rather than
  // being a flat award per case.
  const breakdown = firstSolve
    ? scoreLevelSolve(level, {
        elapsedMs: outcome.elapsedMs,
        attempts,
        hintsUsed: record.hintsUsed,
        revealed: record.revealed,
      })
    : null;

  const levels = { ...progress.levels, [level.id]: record };
  const actLevels = LEVELS.filter((l) => l.actId === level.actId);
  const actJustFinished =
    firstSolve && actLevels.every((l) => (l.id === level.id ? true : levels[l.id]?.solved));
  const actBonus = actJustFinished ? actCompletionBonus(actLevels) : 0;
  const xpGained = (breakdown?.total ?? 0) + actBonus;

  let next: Progress = {
    ...progress,
    lastPlayedAt: new Date().toISOString(),
    xp: progress.xp + xpGained,
    levels,
  };

  const earned: Badge[] = [];
  if (firstSolve && level.badge && !next.badges[level.badge]) {
    const badge = BADGES.find((b) => b.id === level.badge);
    if (badge) earned.push(badge);
  }
  for (const badge of newlyEarnedRuleBadges(snapshotOf(next), next.badges)) {
    if (!earned.some((b) => b.id === badge.id)) earned.push(badge);
  }

  if (earned.length) {
    const now = new Date().toISOString();
    const badges = { ...next.badges };
    for (const badge of earned) badges[badge.id] = now;
    next = { ...next, badges };
  }

  return { progress: next, earned, xpGained, firstSolve, breakdown, actBonus };
}

/**
 * What this case would pay if it were solved right now, given the hints already
 * opened and the time already spent. Shown live so the cost of dithering is visible.
 */
export function xpOnOffer(
  levelId: number,
  record: LevelRecord,
  elapsedMs: number,
): XpBreakdown | null {
  const level = getLevel(levelId);
  if (!level) return null;
  return scoreLevelSolve(level, {
    elapsedMs,
    attempts: record.attempts + 1,
    hintsUsed: record.hintsUsed,
    revealed: record.revealed,
  });
}

export function applyHint(progress: Progress, levelId: number): Progress {
  const previous = recordFor(progress, levelId);
  return {
    ...progress,
    levels: {
      ...progress.levels,
      [levelId]: { ...previous, hintsUsed: previous.hintsUsed + 1 },
    },
  };
}

export function revealSolution(progress: Progress, levelId: number): Progress {
  const previous = recordFor(progress, levelId);
  return {
    ...progress,
    levels: { ...progress.levels, [levelId]: { ...previous, revealed: true } },
  };
}

export function updateSettings(progress: Progress, patch: Partial<Settings>): Progress {
  return { ...progress, settings: { ...progress.settings, ...patch } };
}

/** The highest case the player has unlocked: everything solved, plus the next one. */
export function furthestUnlocked(progress: Progress): number {
  let unlocked = 1;
  for (const level of LEVELS) {
    if (progress.levels[level.id]?.solved) unlocked = Math.max(unlocked, level.id + 1);
  }
  return Math.min(unlocked, LEVELS.length);
}

/**
 * Cases stay locked until the one before them is solved, with a three-case
 * window so that one hard puzzle never becomes a wall.
 */
export function isUnlocked(progress: Progress, levelId: number): boolean {
  return levelId <= furthestUnlocked(progress) + 2;
}
