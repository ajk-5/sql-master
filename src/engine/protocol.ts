import type { Grid, Level, RunOutcome, Verdict } from './types';
import type { TableInfo } from './db';

/**
 * Messages exchanged with the SQL worker. Everything here must survive
 * structured cloning, so it is plain data only.
 */
export type SqlRequest =
  | { id: number; type: 'open'; seed: string }
  | { id: number; type: 'run'; sql: string }
  | { id: number; type: 'schema' }
  | { id: number; type: 'judge'; level: Level; seed: string; sql: string };

export type SqlResponse =
  | { id: number; ok: true; type: 'open'; result: TableInfo[] }
  | { id: number; ok: true; type: 'run'; result: { outcome: RunOutcome; schema: TableInfo[] } }
  | { id: number; ok: true; type: 'schema'; result: TableInfo[] }
  | { id: number; ok: true; type: 'judge'; result: { verdict: Verdict; outcome: RunOutcome } }
  | { id: number; ok: false; error: string };

/** Ceiling on database size, enforced by SQLite itself. 32768 pages is about 128 MB. */
export const MAX_PAGE_COUNT = 32_768;

/** A single statement may not run longer than this before the worker is destroyed. */
export const RUN_TIMEOUT_MS = 5_000;

/** Grading runs the player's SQL and the reference solution, so it gets more room. */
export const JUDGE_TIMEOUT_MS = 15_000;

/** Rows returned to the page. The grid only ever displays a few hundred. */
export const MAX_ROWS_RETURNED = 2_000;

/** Trims a result so a runaway query cannot flood the main thread with rows. */
export function capGrid(grid: Grid): Grid {
  if (grid.values.length <= MAX_ROWS_RETURNED) return grid;
  return { columns: grid.columns, values: grid.values.slice(0, MAX_ROWS_RETURNED) };
}

export function capOutcome(outcome: RunOutcome): RunOutcome {
  return { ...outcome, grids: outcome.grids.map(capGrid) };
}

export function capVerdict(verdict: Verdict): Verdict {
  return {
    ...verdict,
    expected: verdict.expected ? capGrid(verdict.expected) : undefined,
    actual: verdict.actual ? capGrid(verdict.actual) : undefined,
  };
}
