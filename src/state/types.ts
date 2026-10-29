export type LevelRecord = {
  solved: boolean;
  attempts: number;
  hintsUsed: number;
  revealed: boolean;
  firstSolvedAt?: string;
  bestElapsedMs?: number;
  solvedOnFirstAttempt?: boolean;
  lastSql?: string;
};

export type Settings = {
  soundOn: boolean;
  showLineNumbers: boolean;
  fontScale: number;
};

export type Progress = {
  version: 2;
  createdAt: string;
  lastPlayedAt: string;
  xp: number;
  levels: Record<number, LevelRecord>;
  /** badge id to ISO timestamp it was earned. */
  badges: Record<string, string>;
  settings: Settings;
};

/** The read-only view of progress that badge rules are evaluated against. */
export type ProgressSnapshot = {
  xp: number;
  solvedIds: number[];
  solvedCount: number;
  solvedWithoutHints: number;
  solvedFirstAttempt: number;
  datasetsCleared: string[];
  conceptFamiliesCleared: string[];
  actsCompleted: string[];
};

export const DEFAULT_SETTINGS: Settings = {
  soundOn: true,
  showLineNumbers: true,
  fontScale: 1,
};

export function emptyProgress(now = new Date().toISOString()): Progress {
  return {
    version: 2,
    createdAt: now,
    lastPlayedAt: now,
    xp: 0,
    levels: {},
    badges: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function emptyRecord(): LevelRecord {
  return { solved: false, attempts: 0, hintsUsed: 0, revealed: false };
}
