// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryTimeout, SqlSession } from './session';
import {
  MAX_PAGE_COUNT,
  MAX_ROWS_RETURNED,
  RUN_TIMEOUT_MS,
  capGrid,
  capOutcome,
} from './protocol';
import { getDataset } from '@/data/worlds';
import { getLevel } from '@/data/levels';

const blackwood = getDataset('blackwood').seed;

describe('what a player is allowed to do to the database', () => {
  it('lets them drop a table, because the world is theirs alone', async () => {
    // Nothing here is a security boundary: the database is built from a seed
    // string in memory and thrown away. Destroying it is a legitimate move, and
    // one the game explicitly teaches.
    const session = new SqlSession();
    await session.open(blackwood);

    const dropped = await session.run('DROP TABLE autopsy;');
    expect(dropped.outcome.ok).toBe(true);
    expect(dropped.schema.some((t) => t.name === 'autopsy')).toBe(false);

    const gone = await session.run('SELECT * FROM autopsy;');
    expect(gone.outcome.ok).toBe(false);
    expect(gone.outcome.error).toMatch(/no such table/i);
    session.dispose();
  });

  it('still enforces foreign keys, so a referenced table cannot be dropped', async () => {
    // Not a security control, an integrity one, and the same rule Act V teaches.
    const session = new SqlSession();
    await session.open(blackwood);

    const refused = await session.run('DROP TABLE guests;');
    expect(refused.outcome.ok).toBe(false);
    expect(refused.outcome.error).toMatch(/foreign key/i);
    session.dispose();
  });

  it('gives them a clean world back after they wreck it', async () => {
    const session = new SqlSession();
    await session.open(blackwood);
    await session.run('DROP TABLE autopsy; DELETE FROM movements;');

    const restored = await session.reset();
    expect(restored.some((t) => t.name === 'autopsy')).toBe(true);
    expect(restored.find((t) => t.name === 'movements')?.rowCount).toBe(42);
    session.dispose();
  });

  it('cannot let one player world leak into another', async () => {
    const first = new SqlSession();
    const second = new SqlSession();
    await first.open(blackwood);
    await second.open(blackwood);

    await first.run("UPDATE guests SET name = 'tampered';");
    const untouched = await second.run("SELECT name FROM guests WHERE id = 1;");

    expect(untouched.outcome.grids[0].values[0][0]).toBe('Alistair Blackwood');
    first.dispose();
    second.dispose();
  });

  it('grades against throwaway worlds, so wrecking yours cannot change the answer', async () => {
    const level = getLevel(1)!;
    const session = new SqlSession();
    await session.open(blackwood);

    await session.run("DELETE FROM guests;");
    const attempt = await session.judge(level, blackwood, 'SELECT * FROM guests;');

    expect(attempt.verdict.solved).toBe(true);
    session.dispose();
  });

  it('cannot be tricked into passing by emptying the table first', async () => {
    const level = getLevel(1)!;
    const session = new SqlSession();
    await session.open(blackwood);

    const attempt = await session.judge(
      level,
      blackwood,
      'DELETE FROM guests; SELECT * FROM guests;',
    );
    expect(attempt.verdict.solved).toBe(false);
    session.dispose();
  });
});

describe('resource limits', () => {
  it('caps how large the database may grow', async () => {
    const session = new SqlSession();
    await session.open(blackwood);

    const limit = await session.run('PRAGMA max_page_count;');
    expect(Number(limit.outcome.grids[0].values[0][0])).toBe(MAX_PAGE_COUNT);
    session.dispose();
  });

  it('refuses a runaway insert instead of exhausting memory', async () => {
    const session = new SqlSession();
    await session.open(blackwood);

    // Doubling repeatedly is the cheapest way to ask for far too much space.
    const flood = await session.run(`
      CREATE TABLE flood (padding TEXT);
      INSERT INTO flood VALUES (randomblob(4096));
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
      INSERT INTO flood SELECT randomblob(4096) FROM flood;
    `);

    expect(flood.outcome.ok).toBe(false);
    expect(flood.outcome.error).toMatch(/full|too (big|large)/i);
    session.dispose();
  }, 60_000);

  it('trims a result before it reaches the page', () => {
    const huge = {
      columns: ['n'],
      values: Array.from({ length: MAX_ROWS_RETURNED + 500 }, (_, i) => [i]),
    };
    expect(capGrid(huge).values).toHaveLength(MAX_ROWS_RETURNED);
    expect(capGrid({ columns: ['n'], values: [[1]] }).values).toHaveLength(1);
  });

  it('trims every grid an outcome carries', () => {
    const outcome = {
      ok: true as const,
      elapsedMs: 1,
      grids: [
        { columns: ['n'], values: Array.from({ length: MAX_ROWS_RETURNED + 10 }, (_, i) => [i]) },
      ],
    };
    expect(capOutcome(outcome).grids[0].values).toHaveLength(MAX_ROWS_RETURNED);
  });
});

describe('session lifecycle', () => {
  it('refuses work after it has been disposed', async () => {
    const session = new SqlSession();
    await session.open(blackwood);
    session.dispose();
    await expect(session.run('SELECT 1;')).rejects.toThrow();
  });

  it('reports a query against a session that was never opened', async () => {
    const session = new SqlSession();
    await expect(session.run('SELECT 1;')).rejects.toThrow(/No database is open/);
  });
});

describe('a query that never finishes', () => {
  /**
   * A worker that accepts messages and never answers, which is exactly how a
   * real one behaves once SQLite is wedged inside an unbounded recursive CTE.
   */
  class SilentWorker {
    static instances: SilentWorker[] = [];
    terminated = false;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: { message: string }) => void) | null = null;

    constructor() {
      SilentWorker.instances.push(this);
    }
    postMessage() {
      // Deliberately silent.
    }
    terminate() {
      this.terminated = true;
    }
  }

  beforeEach(() => {
    SilentWorker.instances = [];
    vi.stubGlobal('Worker', SilentWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('stops the query instead of hanging the page for ever', async () => {
    vi.useFakeTimers();
    const session = new SqlSession();
    const pending = session.open(blackwood);
    const assertion = expect(pending).rejects.toBeInstanceOf(QueryTimeout);

    await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS * 4 + 100);
    await assertion;
  });

  it('explains what happened in words a player can act on', async () => {
    vi.useFakeTimers();
    const session = new SqlSession();
    const pending = session.open(blackwood);
    const assertion = expect(pending).rejects.toThrow(/still running after .* and was stopped/);

    await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS * 4 + 100);
    await assertion;
  });

  it('destroys the wedged worker rather than leaving it running', async () => {
    vi.useFakeTimers();
    const session = new SqlSession();
    const pending = session.open(blackwood);
    const assertion = expect(pending).rejects.toThrow();

    await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS * 4 + 100);
    await assertion;

    expect(SilentWorker.instances).toHaveLength(1);
    expect(SilentWorker.instances[0].terminated).toBe(true);
  });

  it('starts a fresh worker for the next attempt', async () => {
    vi.useFakeTimers();
    const session = new SqlSession();

    const first = session.open(blackwood);
    const firstAssertion = expect(first).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS * 4 + 100);
    await firstAssertion;

    const second = session.open(blackwood);
    const secondAssertion = expect(second).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS * 4 + 100);
    await secondAssertion;

    expect(SilentWorker.instances).toHaveLength(2);
    expect(SilentWorker.instances.every((w) => w.terminated)).toBe(true);
  });
});
