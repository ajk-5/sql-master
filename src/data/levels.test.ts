// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LEVELS } from '@/data/levels';
import { ACTS, actForLevel } from '@/data/acts';
import { DATASETS, getDataset } from '@/data/worlds';
import { createWorld, runSql } from '@/engine/db';
import { judge } from '@/engine/validate';

describe('worlds', () => {
  it.each(DATASETS.map((d) => [d.id, d] as const))('%s seeds without error', async (_id, dataset) => {
    const db = await createWorld(dataset.seed);
    const tables = runSql(
      db,
      "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';",
    );
    expect(tables.ok).toBe(true);
    expect(Number(tables.grids[0].values[0][0])).toBeGreaterThan(3);
    db.close();
  });
});

describe('level catalogue', () => {
  it('numbers levels from 1 with no gaps or duplicates', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(ids.map((_, i) => i + 1));
  });

  it('places every level inside the range of its declared act', () => {
    for (const level of LEVELS) {
      const act = actForLevel(level.id);
      expect(act.id).toBe(level.actId);
    }
  });

  it('covers every act range with real levels', () => {
    for (const act of ACTS) {
      const [from, to] = act.range;
      const inAct = LEVELS.filter((l) => l.id >= from && l.id <= to);
      expect(inAct.length).toBe(to - from + 1);
    }
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i is written properly', (_id, level) => {
    expect(level.title.length).toBeGreaterThan(2);
    expect(level.story.length).toBeGreaterThan(40);
    expect(level.objective.length).toBeGreaterThan(20);
    expect(level.concepts.length).toBeGreaterThan(0);
    expect(level.hints.length).toBeGreaterThanOrEqual(2);
    expect(level.xp).toBeGreaterThan(0);
    expect(() => getDataset(level.dataset)).not.toThrow();
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    'level %i links only to sql.sh documentation',
    (_id, level) => {
      expect(level.docs.length).toBeGreaterThan(0);
      for (const doc of level.docs) {
        expect(doc.url).toMatch(/^https:\/\/sql\.sh\//);
        expect(doc.label.length).toBeGreaterThan(1);
      }
    },
  );
});

describe('reference solutions', () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))(
    'level %i is solved by its own reference solution',
    async (_id, level) => {
      const { seed } = getDataset(level.dataset);
      const { verdict, outcome } = await judge(level, seed, level.solution);
      if (!verdict.solved) {
        throw new Error(
          `Level ${level.id} "${level.title}" failed self-check: ${verdict.title} — ${verdict.detail}` +
            (outcome.error ? ` (engine: ${outcome.error})` : ''),
        );
      }
      expect(verdict.solved).toBe(true);
    },
  );

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    'level %i has a non-empty expected answer',
    async (_id, level) => {
      const { seed } = getDataset(level.dataset);
      const db = await createWorld(seed);
      // Mutation levels are graded by a check query, which only means anything
      // once the solution has been applied to the world.
      const applied = runSql(db, level.solution);
      expect(applied.ok, `level ${level.id} solution failed: ${applied.error}`).toBe(true);
      const result = level.check ? runSql(db, level.check) : applied;
      db.close();
      expect(result.ok).toBe(true);
      const grid = result.grids.filter((g) => g.columns.length > 0).pop();
      expect(grid, `level ${level.id} produced no result grid`).toBeDefined();
      expect(grid!.values.length, `level ${level.id} expects zero rows`).toBeGreaterThan(0);
    },
  );

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    'level %i rejects an obviously wrong answer',
    async (_id, level) => {
      const { seed } = getDataset(level.dataset);
      const { verdict } = await judge(level, seed, "SELECT 'nonsense' AS wrong;");
      expect(verdict.solved).toBe(false);
    },
  );
});
