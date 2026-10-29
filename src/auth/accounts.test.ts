// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { AccountStore } from './accounts';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, String(value)),
  };
}

const solve = (levelId: number, elapsedMs: number, xp: number) => ({
  levelId,
  solvedAt: '2026-09-09T10:00:00.000Z',
  elapsedMs,
  attempts: 1,
  hintsUsed: 0,
  revealed: false,
  xp,
});

describe('accounts', () => {
  let storage: Storage;
  let store: AccountStore;

  beforeEach(async () => {
    storage = memoryStorage();
    store = new AccountStore(storage);
    await store.open();
  });

  it('registers an account and signs it back in', async () => {
    const created = await store.register('Mallory', 'inspector-1923');
    expect(created.ok).toBe(true);

    const signedIn = await store.login('mallory', 'inspector-1923');
    expect(signedIn.ok).toBe(true);
    if (signedIn.ok) expect(signedIn.account.displayName).toBe('Mallory');
  });

  it('refuses the wrong password', async () => {
    await store.register('mallory', 'inspector-1923');
    const attempt = await store.login('mallory', 'inspector-1924');
    expect(attempt.ok).toBe(false);
    if (!attempt.ok) expect(attempt.reason).toMatch(/no account matches/i);
  });

  it('gives the same answer for a wrong password and a missing account', async () => {
    await store.register('mallory', 'inspector-1923');
    const wrongPassword = await store.login('mallory', 'nope-nope-nope');
    const noSuchUser = await store.login('nobody', 'nope-nope-nope');
    expect(wrongPassword.ok).toBe(false);
    expect(noSuchUser.ok).toBe(false);
    if (!wrongPassword.ok && !noSuchUser.ok) {
      expect(wrongPassword.reason).toBe(noSuchUser.reason);
    }
  });

  it('will not let two people take the same name', async () => {
    await store.register('mallory', 'inspector-1923');
    const second = await store.register('MALLORY', 'different-password');
    expect(second.ok).toBe(false);
  });

  it('stores a hash, never the password', async () => {
    await store.register('mallory', 'inspector-1923');
    expect(storage.getItem('sqlmaster.accounts.v1')).not.toContain('inspector-1923');
  });

  it('treats a name full of SQL as just a name', async () => {
    // Bound parameters, so this is a lookup that finds nothing, not a statement.
    const attempt = await store.login("'; DROP TABLE users; --", 'whatever-here');
    expect(attempt.ok).toBe(false);
    expect(store.listAccounts()).toEqual([]);

    await store.register('mallory', 'inspector-1923');
    expect(store.listAccounts()).toHaveLength(1);
  });

  it('survives being closed and reopened', async () => {
    await store.register('mallory', 'inspector-1923');
    store.close();

    const reopened = new AccountStore(storage);
    await reopened.open();
    const signedIn = await reopened.login('mallory', 'inspector-1923');
    expect(signedIn.ok).toBe(true);
  });
});

describe('progress and scoring', () => {
  let store: AccountStore;
  let alice: number;
  let bob: number;

  beforeEach(async () => {
    store = new AccountStore(memoryStorage());
    await store.open();
    const a = await store.register('alice', 'password-alice');
    const b = await store.register('bob', 'password-bob');
    if (!a.ok || !b.ok) throw new Error('setup failed');
    alice = a.account.id;
    bob = b.account.id;
  });

  it('records a solve and reads it back', () => {
    store.recordSolve(alice, solve(1, 30_000, 60));
    expect(store.solvesOf(alice)).toHaveLength(1);
    expect(store.solvesOf(alice)[0].xp).toBe(60);
  });

  it('keeps the best score and the fastest time when a case is solved again', () => {
    store.recordSolve(alice, solve(1, 30_000, 60));
    store.recordSolve(alice, solve(1, 12_000, 40));
    const [record] = store.solvesOf(alice);
    expect(record.xp).toBe(60);
    expect(record.elapsedMs).toBe(12_000);
  });

  it('keeps each player’s progress to themselves', () => {
    store.recordSolve(alice, solve(1, 30_000, 60));
    expect(store.solvesOf(bob)).toHaveLength(0);
  });

  it('awards a badge at most once', () => {
    store.awardBadge(alice, 'first-light', '2026-09-09T10:00:00.000Z');
    store.awardBadge(alice, 'first-light', '2026-09-10T10:00:00.000Z');
    expect(Object.keys(store.badgesOf(alice))).toEqual(['first-light']);
  });

  it('ranks the leaderboard by XP, then cases, then speed', () => {
    store.recordSolve(alice, solve(1, 30_000, 60));
    store.recordSolve(alice, solve(2, 30_000, 60));
    store.recordSolve(bob, solve(1, 10_000, 200));

    const board = store.leaderboard();
    expect(board[0].username).toBe('bob');
    expect(board[0].xp).toBe(200);
    expect(board[1].username).toBe('alice');
    expect(board[1].solved).toBe(2);
    expect(board.map((r) => r.rank)).toEqual([1, 2]);
  });

  it('includes a player who has solved nothing yet', () => {
    const board = store.leaderboard();
    expect(board).toHaveLength(2);
    expect(board.every((row) => row.xp === 0)).toBe(true);
    expect(board[0].averageMs).toBeNull();
  });

  it('includes only the badges earned by each leaderboard investigator', () => {
    const earnedAt = '2026-09-09T10:00:00.000Z';
    store.awardBadge(alice, 'first-light', earnedAt);
    const board = store.leaderboard();
    expect(board.find((row) => row.userId === alice)?.earnedBadges).toEqual({
      'first-light': earnedAt,
    });
    expect(board.find((row) => row.userId === bob)?.earnedBadges).toEqual({});
  });

  it('averages a case across everyone who closed it', () => {
    store.recordSolve(alice, solve(5, 20_000, 50));
    store.recordSolve(bob, solve(5, 40_000, 30));

    const stats = store.levelStats(5);
    expect(stats.solvers).toBe(2);
    expect(stats.averageMs).toBe(30_000);
    expect(stats.bestMs).toBe(20_000);
  });

  it('says plainly when nobody has closed a case yet', () => {
    const stats = store.levelStats(99);
    expect(stats.solvers).toBe(0);
    expect(stats.averageMs).toBeNull();
  });

  it('reports where a player stands', () => {
    store.recordSolve(bob, solve(1, 10_000, 200));
    expect(store.rankOf(bob)).toEqual({ rank: 1, of: 2 });
    expect(store.rankOf(alice)).toEqual({ rank: 2, of: 2 });
  });

  it('removes a player’s solves with their account', () => {
    store.recordSolve(alice, solve(1, 30_000, 60));
    store.deleteAccount(alice);
    expect(store.listAccounts().map((a) => a.username)).toEqual(['bob']);
    expect(store.levelStats(1).solvers).toBe(0);
  });
});

describe('foreign keys survive persistence', () => {
  it('still cascades after the database has been exported', async () => {
    // sql.js closes and reopens the database inside export(), which resets
    // connection pragmas. Without re-applying them, deletes stop cascading.
    const store = new AccountStore(memoryStorage());
    await store.open();
    const created = await store.register('mallory', 'inspector-1923');
    if (!created.ok) throw new Error('setup failed');

    store.recordSolve(created.account.id, solve(1, 1000, 10));
    store.awardBadge(created.account.id, 'first-light', '2026-09-09T10:00:00.000Z');
    store.deleteAccount(created.account.id);

    expect(store.levelStats(1).solvers).toBe(0);
    expect(store.badgesOf(created.account.id)).toEqual({});
  });
});
