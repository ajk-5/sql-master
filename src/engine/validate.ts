import type { Database } from 'sql.js';
import { createWorld, runSql } from './db';
import type { Grid, Level, RunOutcome, Verdict } from './types';

/** Strips comments and string literals so keyword rules cannot be fooled by data. */
export function stripLiterals(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, " '' ")
    .replace(/"(?:[^"]|"")*"/g, ' "" ');
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return '\u2400NULL';
  if (value instanceof Uint8Array) return `blob:${value.length}`;
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    return String(Math.round(value * 1e6) / 1e6);
  }
  if (typeof value === 'boolean') return value ? '1' : '0';
  const text = String(value).trim();
  // SQLite hands back numeric text for some expressions; fold "3.0" and "3" together.
  if (/^-?\d+\.0+$/.test(text)) return text.replace(/\.0+$/, '');
  return text;
}

function rowKey(row: unknown[]): string {
  return row.map(normalizeCell).join('\u001f');
}

export function gridsMatch(
  expected: Grid,
  actual: Grid,
  opts: { orderMatters?: boolean; strictColumns?: boolean } = {},
): { equal: boolean; reason?: string } {
  if (expected.columns.length !== actual.columns.length) {
    return {
      equal: false,
      reason: `Expected ${expected.columns.length} column(s), your query returned ${actual.columns.length}.`,
    };
  }
  if (expected.values.length !== actual.values.length) {
    return {
      equal: false,
      reason: `Expected ${expected.values.length} row(s), your query returned ${actual.values.length}.`,
    };
  }
  if (opts.strictColumns) {
    for (let i = 0; i < expected.columns.length; i += 1) {
      const a = expected.columns[i].toLowerCase();
      const b = actual.columns[i].toLowerCase();
      if (a !== b) {
        return { equal: false, reason: `Column ${i + 1} should be named "${expected.columns[i]}", not "${actual.columns[i]}".` };
      }
    }
  }
  const left = expected.values.map(rowKey);
  const right = actual.values.map(rowKey);
  if (!opts.orderMatters) {
    left.sort();
    right.sort();
  }
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return {
        equal: false,
        reason: opts.orderMatters
          ? `Row ${i + 1} does not match the expected result.`
          : 'The rows returned do not match the expected set of rows.',
      };
    }
  }
  return { equal: true };
}

const WORD_EDGE = /[A-Za-z0-9_]/;

/**
 * Matches a token as a whole word rather than a substring, so that forbidding
 * DELETE does not also forbid a column named deleted_at.
 */
export function containsToken(haystack: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const lead = WORD_EDGE.test(token[0]) ? '\\b' : '';
  const tail = WORD_EDGE.test(token[token.length - 1]) ? '\\b' : '';
  return new RegExp(`${lead}${escaped}${tail}`, 'i').test(haystack);
}

/** Tokens are written with the padding the matcher needs; players should not see it. */
function display(token: string): string {
  return token.trim().toUpperCase();
}

function keywordAudit(level: Level, sql: string): string[] {
  const problems: string[] = [];
  const bare = ` ${stripLiterals(sql).replace(/\s+/g, ' ')} `;
  for (const token of level.requireKeywords ?? []) {
    if (!containsToken(bare, token)) {
      problems.push(`This case must be solved using ${display(token)}.`);
    }
  }
  for (const token of level.forbidKeywords ?? []) {
    if (containsToken(bare, token)) {
      problems.push(`${display(token)} is off limits for this case.`);
    }
  }
  return problems;
}

function lastGrid(outcome: RunOutcome): Grid | null {
  for (let i = outcome.grids.length - 1; i >= 0; i -= 1) {
    if (outcome.grids[i].columns.length > 0) return outcome.grids[i];
  }
  return null;
}

export type Attempt = { verdict: Verdict; outcome: RunOutcome };

/**
 * Judges a submission by replaying the reference solution in a pristine world and
 * comparing outcomes, so any correct formulation is accepted.
 */
export async function judge(level: Level, seed: string, sql: string): Promise<Attempt> {
  const trimmed = sql.trim();
  if (!trimmed) {
    return {
      outcome: { ok: false, grids: [], elapsedMs: 0, error: 'Nothing submitted.' },
      verdict: { solved: false, title: 'Empty submission', detail: 'Write some SQL first.', notes: [] },
    };
  }

  const playerDb = await createWorld(seed);
  const outcome = runSql(playerDb, trimmed);
  if (!outcome.ok) {
    playerDb.close();
    return {
      outcome,
      verdict: {
        solved: false,
        title: 'SQLite rejected the statement',
        detail: outcome.error ?? 'Unknown error.',
        notes: [],
      },
    };
  }

  const rules = keywordAudit(level, trimmed);
  if (rules.length) {
    playerDb.close();
    return {
      outcome,
      verdict: { solved: false, title: 'Constraint of the case', detail: rules[0], notes: rules.slice(1) },
    };
  }

  const referenceDb = await createWorld(seed);
  const reference = runSql(referenceDb, level.solution);
  if (!reference.ok) {
    playerDb.close();
    referenceDb.close();
    return {
      outcome,
      verdict: {
        solved: false,
        title: 'Case file corrupted',
        detail: `The reference solution failed to run: ${reference.error}. Please report level ${level.id}.`,
        notes: [],
      },
    };
  }

  let expected: Grid | null;
  let actual: Grid | null;
  if (level.check) {
    expected = lastGrid(runSql(referenceDb, level.check));
    const playerCheck = runSql(playerDb, level.check);
    if (!playerCheck.ok) {
      playerDb.close();
      referenceDb.close();
      return {
        outcome,
        verdict: {
          solved: false,
          title: 'The database is no longer usable',
          detail: `Verifying the result failed: ${playerCheck.error}`,
          notes: [],
        },
      };
    }
    actual = lastGrid(playerCheck);
  } else {
    expected = lastGrid(reference);
    actual = lastGrid(outcome);
  }

  playerDb.close();
  referenceDb.close();

  if (!expected) {
    return {
      outcome,
      verdict: { solved: false, title: 'Case file corrupted', detail: `Level ${level.id} produced no expected result.`, notes: [] },
    };
  }
  if (!actual) {
    return {
      outcome,
      verdict: {
        solved: false,
        title: 'No result set',
        detail: 'Your statements ran, but nothing came back to compare. This case is judged on what a SELECT returns.',
        notes: [],
      },
    };
  }

  const comparison = gridsMatch(expected, actual, {
    orderMatters: level.orderMatters,
    strictColumns: level.strictColumns,
  });

  if (!comparison.equal) {
    return {
      outcome,
      verdict: {
        solved: false,
        title: level.check ? 'The database is not in the expected state' : 'Not the answer the case needs',
        detail: comparison.reason ?? 'Result mismatch.',
        notes: [],
        expected,
        actual,
      },
    };
  }

  const notes: string[] = [];
  if (!level.orderMatters && !level.check) {
    notes.push('Row order was not graded on this case.');
  }
  return {
    outcome,
    verdict: { solved: true, title: 'Case closed', detail: 'Your result matches the evidence exactly.', notes, expected, actual },
  };
}

/** Used by the "peek at the answer" panel once a level is solved or surrendered. */
export function formatSql(sql: string): string {
  return sql.trim().replace(/\n[ \t]+/g, '\n  ');
}

export type { Database };
