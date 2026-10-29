// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { LEVELS } from '@/data/levels';
import { scoreSolve } from '@/game/scoring';
import { difficultyOf } from '@/data/difficulty';

// The server is run as a real process rather than imported, both because
// node:sqlite cannot travel through Vite's transform pipeline and because this
// exercises the actual `npm run server` entry point.
let child: ChildProcess;
let base: string;

beforeAll(async () => {
  child = spawn(process.execPath, ['server/index.ts'], {
    // The suite registers far more accounts in a minute than a real player would,
    // so the guessing limit is raised rather than being exercised here.
    env: {
      ...process.env,
      PORT: '0',
      SQLMASTER_DB: ':memory:',
      RATE_MAX_ATTEMPTS: '10000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  base = await new Promise<string>((resolveBase, reject) => {
    const timer = setTimeout(() => reject(new Error('The score server did not start.')), 30_000);
    child.stdout?.on('data', (chunk: Buffer) => {
      const match = /listening on (http:\/\/localhost:\d+)/.exec(chunk.toString());
      if (match) {
        clearTimeout(timer);
        resolveBase(match[1].replace('localhost', '127.0.0.1'));
      }
    });
    child.on('exit', (code) => reject(new Error(`The score server exited with code ${code}.`)));
  });
}, 40_000);

afterAll(() => {
  child?.kill();
});

type Reply<T> = { status: number; body: T };

async function call<T>(path: string, init: RequestInit = {}, token?: string): Promise<Reply<T>> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  return { status: response.status, body: (await response.json()) as T };
}

const post = <T>(path: string, body: unknown, token?: string) =>
  call<T>(path, { method: 'POST', body: JSON.stringify(body) }, token);

type Session = { account: { id: number; username: string }; token: string; error?: string };

let counter = 0;
const freshName = () => `player${(counter += 1)}${Date.now() % 100000}`;

describe('the score server', () => {
  it('answers a health check', async () => {
    const { status, body } = await call<{ ok: boolean }>('/api/health');
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it('registers an account and hands back a session token', async () => {
    const { status, body } = await post<Session>('/api/auth/register', {
      username: freshName(),
      password: 'inspector-1923',
    });
    expect(status).toBe(201);
    expect(body.token).toMatch(/.{20,}/);
    expect(body.account.id).toBeGreaterThan(0);
  });

  it('signs an account back in', async () => {
    const username = freshName();
    await post('/api/auth/register', { username, password: 'inspector-1923' });
    const { status, body } = await post<Session>('/api/auth/login', {
      username,
      password: 'inspector-1923',
    });
    expect(status).toBe(200);
    expect(body.account.username).toBe(username.toLowerCase());
  });

  it('refuses the wrong password', async () => {
    const username = freshName();
    await post('/api/auth/register', { username, password: 'inspector-1923' });
    const { status } = await post('/api/auth/login', { username, password: 'wrong-password-here' });
    expect(status).toBe(401);
  });
});

describe('usernames are unique', () => {
  it('rejects a second account with the same name', async () => {
    const username = freshName();
    const first = await post<Session>('/api/auth/register', { username, password: 'password-one' });
    expect(first.status).toBe(201);

    const second = await post<{ error: string }>('/api/auth/register', {
      username,
      password: 'password-two',
    });
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/taken/i);
  });

  it('treats names case-insensitively', async () => {
    const username = freshName();
    await post('/api/auth/register', {
      username: username.toUpperCase(),
      password: 'password-one',
    });
    const clash = await post('/api/auth/register', {
      username: username.toLowerCase(),
      password: 'password-two',
    });
    expect(clash.status).toBe(409);
  });

  it('lets exactly one of several simultaneous sign-ups win the name', async () => {
    // The unique index decides, not a check-then-insert, so a race cannot make
    // two accounts share a name.
    const username = freshName();
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        post<{ error?: string }>('/api/auth/register', { username, password: 'racing-password' }),
      ),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
  });

  it('reports availability before the password is typed', async () => {
    const username = freshName();
    const free = await call<{ available: boolean }>(
      `/api/username-available?name=${encodeURIComponent(username)}`,
    );
    expect(free.body.available).toBe(true);

    await post('/api/auth/register', { username, password: 'inspector-1923' });

    const taken = await call<{ available: boolean; reason: string }>(
      `/api/username-available?name=${encodeURIComponent(username)}`,
    );
    expect(taken.body.available).toBe(false);
    expect(taken.body.reason).toMatch(/taken/i);
  });

  it('rejects a name that is not a name at all', async () => {
    for (const bad of ['ab', 'has space', '-nope', "'; DROP TABLE users; --"]) {
      const { status } = await post('/api/auth/register', {
        username: bad,
        password: 'inspector-1923',
      });
      expect(status, `${bad} should be refused`).toBe(400);
    }
  });
});

describe('scores are decided by the server', () => {
  let token: string;
  let userId: number;

  beforeEach(async () => {
    const { body } = await post<Session>('/api/auth/register', {
      username: freshName(),
      password: 'inspector-1923',
    });
    token = body.token;
    userId = body.account.id;
  });

  it('ignores whatever XP the client claims', async () => {
    const { status, body } = await post<{ awarded: number }>(
      '/api/solves',
      { levelId: 1, elapsedMs: 10_000, attempts: 1, hintsUsed: 0, xp: 999_999 },
      token,
    );
    expect(status).toBe(200);
    expect(body.awarded).toBeLessThan(1000);
  });

  it('prices a solve exactly as the browser would', async () => {
    const level = LEVELS[0];
    const expected = scoreSolve({
      baseXp: level.xp,
      difficulty: difficultyOf(level),
      elapsedMs: 20_000,
      attempts: 2,
      hintsUsed: 1,
      revealed: false,
    }).total;

    const { body } = await post<{ awarded: number }>(
      '/api/solves',
      { levelId: level.id, elapsedMs: 20_000, attempts: 2, hintsUsed: 1, revealed: false },
      token,
    );
    expect(body.awarded).toBe(expected);
  });

  it('pays less for a slower solve of the same case', async () => {
    const quick = await post<{ awarded: number }>(
      '/api/solves',
      { levelId: 3, elapsedMs: 10_000, attempts: 1, hintsUsed: 0 },
      token,
    );
    const other = await post<Session>('/api/auth/register', {
      username: freshName(),
      password: 'inspector-1923',
    });
    const slow = await post<{ awarded: number }>(
      '/api/solves',
      { levelId: 3, elapsedMs: 45 * 60_000, attempts: 1, hintsUsed: 0 },
      other.body.token,
    );
    expect(quick.body.awarded).toBeGreaterThan(slow.body.awarded);
  });

  it('refuses a case that does not exist', async () => {
    const { status } = await post('/api/solves', { levelId: 9999, elapsedMs: 1 }, token);
    expect(status).toBe(400);
  });

  it('turns anonymous writes away', async () => {
    expect((await post('/api/solves', { levelId: 1, elapsedMs: 1 })).status).toBe(401);
    expect((await post('/api/badges', { badgeId: 'first-light' })).status).toBe(401);
    expect((await call('/api/me')).status).toBe(401);
  });

  it('rejects a made-up token', async () => {
    expect((await call('/api/me', {}, 'not-a-real-token')).status).toBe(401);
  });

  it('keeps the best score when a case is solved again', async () => {
    await post('/api/solves', { levelId: 7, elapsedMs: 10_000, attempts: 1 }, token);
    const first = await call<{ solves: { levelId: number; xp: number }[] }>('/api/me', {}, token);
    const best = first.body.solves.find((s) => s.levelId === 7)!.xp;

    await post('/api/solves', { levelId: 7, elapsedMs: 60 * 60_000, attempts: 20 }, token);
    const second = await call<{ solves: { levelId: number; xp: number }[] }>('/api/me', {}, token);
    expect(second.body.solves.find((s) => s.levelId === 7)!.xp).toBe(best);
  });

  it('signs the session out again', async () => {
    expect((await post('/api/auth/logout', {}, token)).status).toBe(200);
    expect((await call('/api/me', {}, token)).status).toBe(401);
  });

  it('shows the account on the shared leaderboard', async () => {
    await post('/api/solves', { levelId: 4, elapsedMs: 12_000, attempts: 1 }, token);
    await post('/api/badges', { badgeId: 'first-light' }, token);
    // The suite has created plenty of accounts by now, so ask for the whole board.
    const { body } = await call<{
      rows: { userId: number; xp: number; earnedBadges: Record<string, string> }[];
    }>('/api/leaderboard?limit=500');
    const mine = body.rows.find((row) => row.userId === userId);
    expect(mine).toBeDefined();
    expect(mine!.xp).toBeGreaterThan(0);
    expect(mine!.earnedBadges['first-light']).toEqual(expect.any(String));
  });

  it('averages a case across everyone who closed it', async () => {
    await post('/api/solves', { levelId: 12, elapsedMs: 20_000, attempts: 1 }, token);
    const { body } = await call<{ solvers: number; averageMs: number }>('/api/levels/12/stats');
    expect(body.solvers).toBeGreaterThanOrEqual(1);
    expect(body.averageMs).toBeGreaterThan(0);
  });

  it('lists every player when no limit is given', async () => {
    // A missing ?limit must mean "the default", not zero.
    const other = await post<Session>('/api/auth/register', {
      username: freshName(),
      password: 'inspector-1923',
    });
    await post('/api/solves', { levelId: 5, elapsedMs: 11_000, attempts: 1 }, token);
    await post('/api/solves', { levelId: 5, elapsedMs: 90_000, attempts: 3 }, other.body.token);

    const { body } = await call<{ rows: unknown[] }>('/api/leaderboard');
    expect(body.rows.length).toBeGreaterThan(1);
  });

  it('answers a nonsense route with 404 rather than a stack trace', async () => {
    const { status, body } = await call<{ error: string }>('/api/nowhere');
    expect(status).toBe(404);
    expect(body.error).toMatch(/no route/i);
  });
});

describe('the level score manifest', () => {
  it('matches the real catalogue exactly', () => {
    // The server prices solves from this file. If it drifted from the game, the
    // leaderboard would be scoring a different set of cases.
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), 'server/level-scores.json'), 'utf8'),
    ) as { scores: Record<string, number> };

    expect(Object.keys(manifest.scores)).toHaveLength(LEVELS.length);
    for (const level of LEVELS) {
      expect(manifest.scores[String(level.id)], `case ${level.id}`).toBe(level.xp);
    }
  });
});
