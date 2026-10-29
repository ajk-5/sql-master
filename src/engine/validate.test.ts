// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { containsToken, gridsMatch, judge, stripLiterals } from './validate';
import { createWorld, describeSchema, quoteIdent, runSql } from './db';
import { getDataset } from '@/data/worlds';
import { getLevel } from '@/data/levels';
import type { Grid, Level } from './types';

const grid = (columns: string[], values: unknown[][]): Grid => ({ columns, values });

describe('stripLiterals', () => {
  it('removes line comments, block comments and quoted text', () => {
    const stripped = stripLiterals("SELECT 'DELETE' -- DROP\n/* UPDATE */ FROM t");
    expect(stripped).not.toContain('DROP');
    expect(stripped).not.toContain('UPDATE');
    expect(stripped).not.toContain('DELETE');
    expect(stripped).toContain('SELECT');
  });

  it('handles escaped quotes without swallowing the rest of the statement', () => {
    expect(stripLiterals("SELECT 'it''s fine' AS x")).toContain('AS x');
  });
});

describe('containsToken', () => {
  it('matches whole words only', () => {
    expect(containsToken('UPDATE customers SET deleted_at = 1', 'DELETE')).toBe(false);
    expect(containsToken('DELETE FROM customers', 'DELETE')).toBe(true);
  });

  it('is case insensitive and tolerant of extra whitespace', () => {
    expect(containsToken('insert into t on   conflict(id) do nothing', 'ON CONFLICT')).toBe(true);
  });

  it('does not treat JOIN ( as IN (', () => {
    expect(containsToken('FROM a JOIN (SELECT 1)', 'IN (')).toBe(false);
    expect(containsToken('WHERE x IN (1, 2)', 'IN (')).toBe(true);
  });
});

describe('gridsMatch', () => {
  it('accepts the same rows in a different order when order is not graded', () => {
    const a = grid(['n'], [[1], [2]]);
    const b = grid(['n'], [[2], [1]]);
    expect(gridsMatch(a, b).equal).toBe(true);
    expect(gridsMatch(a, b, { orderMatters: true }).equal).toBe(false);
  });

  it('reports a column count difference', () => {
    const result = gridsMatch(grid(['a', 'b'], [[1, 2]]), grid(['a'], [[1]]));
    expect(result.equal).toBe(false);
    expect(result.reason).toMatch(/column/i);
  });

  it('reports a row count difference', () => {
    const result = gridsMatch(grid(['a'], [[1], [2]]), grid(['a'], [[1]]));
    expect(result.equal).toBe(false);
    expect(result.reason).toMatch(/row/i);
  });

  it('treats 3 and 3.0 as the same value', () => {
    expect(gridsMatch(grid(['a'], [[3]]), grid(['a'], [['3.0']])).equal).toBe(true);
  });

  it('distinguishes NULL from an empty string', () => {
    expect(gridsMatch(grid(['a'], [[null]]), grid(['a'], [['']])).equal).toBe(false);
  });

  it('only grades column names when the level asks for it', () => {
    const expected = grid(['suspect'], [['x']]);
    const actual = grid(['name'], [['x']]);
    expect(gridsMatch(expected, actual).equal).toBe(true);
    expect(gridsMatch(expected, actual, { strictColumns: true }).equal).toBe(false);
  });
});

describe('judge', () => {
  const level = getLevel(5)!;
  const seed = getDataset(level.dataset).seed;

  it('accepts a differently written query with the same result', async () => {
    const { verdict } = await judge(
      level,
      seed,
      "SELECT g.name FROM guests AS g WHERE g.home_city LIKE 'Paris';",
    );
    expect(verdict.solved).toBe(true);
  });

  it('rejects an empty submission', async () => {
    const { verdict } = await judge(level, seed, '   ');
    expect(verdict.solved).toBe(false);
    expect(verdict.title).toMatch(/empty/i);
  });

  it('surfaces the engine error for invalid SQL', async () => {
    const { verdict } = await judge(level, seed, 'SELCT name FROM guests;');
    expect(verdict.solved).toBe(false);
    expect(verdict.detail).toMatch(/syntax error/i);
  });

  it('enforces a required keyword', async () => {
    const distinctLevel = getLevel(4)!;
    const { verdict } = await judge(
      distinctLevel,
      getDataset(distinctLevel.dataset).seed,
      'SELECT home_city FROM guests GROUP BY home_city;',
    );
    expect(verdict.solved).toBe(false);
    expect(verdict.detail).toMatch(/DISTINCT/);
  });

  it('enforces a forbidden keyword', async () => {
    const inLevel = getLevel(8)!;
    const { verdict } = await judge(
      inLevel,
      getDataset(inLevel.dataset).seed,
      "SELECT name, home_city FROM guests WHERE home_city IN ('Cairo') OR home_city IN ('Riga');",
    );
    expect(verdict.solved).toBe(false);
    expect(verdict.detail).toMatch(/OR is off limits/i);
  });

  it('grades a mutation on the state of the world, not on what it returns', async () => {
    const mutation = getLevel(60)!;
    const mutationSeed = getDataset(mutation.dataset).seed;
    const solved = await judge(
      mutation,
      mutationSeed,
      "UPDATE orders SET status = 'shipped' WHERE id = 1005;",
    );
    expect(solved.verdict.solved).toBe(true);

    const wrongRow = await judge(
      mutation,
      mutationSeed,
      "UPDATE orders SET status = 'shipped' WHERE id = 1006;",
    );
    expect(wrongRow.verdict.solved).toBe(false);
  });

  it('does not let one submission leak into the next', async () => {
    const mutation = getLevel(60)!;
    const mutationSeed = getDataset(mutation.dataset).seed;
    await judge(mutation, mutationSeed, 'DELETE FROM orders;');
    const after = await judge(mutation, mutationSeed, mutation.solution);
    expect(after.verdict.solved).toBe(true);
  });

  it('fails safely when the reference solution itself is broken', async () => {
    const broken: Level = { ...getLevel(1)!, solution: 'SELECT * FROM nowhere;' };
    const { verdict } = await judge(broken, seed, 'SELECT * FROM guests;');
    expect(verdict.solved).toBe(false);
    expect(verdict.title).toMatch(/corrupted/i);
  });
});

describe('schema introspection', () => {
  it('describes tables, columns and row counts of a seeded world', async () => {
    const db = await createWorld(getDataset('blackwood').seed);
    const schema = describeSchema(db);
    const guests = schema.find((t) => t.name === 'guests');
    expect(guests).toBeDefined();
    expect(guests!.rowCount).toBe(12);
    expect(guests!.columns.find((c) => c.name === 'id')?.pk).toBe(true);
    expect(guests!.columns.find((c) => c.name === 'name')?.notNull).toBe(true);
    db.close();
  });

  it('picks up tables and views created during play', async () => {
    const db = await createWorld(getDataset('blackwood').seed);
    runSql(db, 'CREATE VIEW study_visitors AS SELECT * FROM movements WHERE room_id = 3;');
    const schema = describeSchema(db);
    const view = schema.find((t) => t.name === 'study_visitors');
    expect(view?.type).toBe('view');
    db.close();
  });

  it('quotes identifiers containing a double quote', () => {
    expect(quoteIdent('we"ird')).toBe('"we""ird"');
  });

  it('returns an error rather than throwing on bad SQL', async () => {
    const db = await createWorld(getDataset('blackwood').seed);
    const result = runSql(db, 'SELECT * FROM does_not_exist;');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no such table/i);
    db.close();
  });
});
