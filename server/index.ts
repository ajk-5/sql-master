import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ScoreStore, UsernameTaken, type Account } from './store.ts';
import { difficultyFromXp, scoreSolve } from '../src/game/scoring.ts';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Base XP for every case, generated from the catalogue by
 * scripts/generate-level-scores.mjs. The server prices solves from this rather
 * than believing whatever the browser posts.
 */
const LEVEL_SCORES: Record<string, number> = JSON.parse(
  readFileSync(resolve(here, 'level-scores.json'), 'utf8'),
).scores;

const PORT = Number(process.env.PORT ?? 8787);
const DB_FILE = process.env.SQLMASTER_DB ?? resolve(here, 'scores.db');
const ORIGIN = process.env.CORS_ORIGIN ?? '*';

const MIN_USERNAME = 3;
const MAX_USERNAME = 20;
const MIN_PASSWORD = 8;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i;
const MAX_BODY_BYTES = 16 * 1024;

export type Api = { store: ScoreStore; close: () => Promise<void>; port: number };

// ── Rate limiting ─────────────────────────────────────────────────────────
// Password checks are deliberately slow, which makes them worth abusing. A
// sliding window per address keeps a guessing script from having a good time.

const attempts = new Map<string, number[]>();
const WINDOW_MS = Number(process.env.RATE_WINDOW_MS ?? 60_000);
const MAX_ATTEMPTS = Number(process.env.RATE_MAX_ATTEMPTS ?? 10);

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > MAX_ATTEMPTS;
}

// ── Plumbing ──────────────────────────────────────────────────────────────

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': ORIGIN,
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('Request body too large.');
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new Error('The request body was not valid JSON.');
  }
}

function bearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function publicAccount(account: Account) {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    createdAt: account.createdAt,
    lastSeenAt: account.lastSeenAt,
  };
}

function validate(username: string, password: string): string | null {
  const trimmed = username.trim();
  if (trimmed.length < MIN_USERNAME) return `Pick a name of at least ${MIN_USERNAME} characters.`;
  if (trimmed.length > MAX_USERNAME) return `Keep the name under ${MAX_USERNAME} characters.`;
  if (!USERNAME_PATTERN.test(trimmed)) {
    return 'Letters, digits, hyphens and underscores only, starting and ending with a letter or digit.';
  }
  if (password.length < MIN_PASSWORD) return `Use a password of at least ${MIN_PASSWORD} characters.`;
  if (/^\d+$/.test(password)) return 'Digits alone are guessed in seconds. Add something else.';
  return null;
}

function asInt(value: unknown, fallback = 0): number {
  // Number(null) and Number('') are both 0 and both finite, which would silently
  // turn a missing query parameter into zero rather than the intended default.
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

// ── Server ────────────────────────────────────────────────────────────────

export function createApi(dbFile = DB_FILE, port = PORT): Promise<Api> {
  const store = new ScoreStore(dbFile);
  store.purgeExpiredSessions();

  const server = createServer((req, res) => {
    handle(req, res, store).catch((error: unknown) => {
      send(res, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
    });
  });

  return new Promise((resolveReady) => {
    server.listen(port, () => {
      const address = server.address();
      const actual = typeof address === 'object' && address ? address.port : port;
      resolveReady({
        store,
        port: actual,
        close: () =>
          new Promise<void>((done) => {
            server.close(() => {
              store.close();
              done();
            });
          }),
      });
    });
  });
}

async function handle(req: IncomingMessage, res: ServerResponse, store: ScoreStore): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const address = req.socket.remoteAddress ?? 'unknown';

  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return;
  }

  const requireAccount = (): Account | null => {
    const token = bearer(req);
    if (!token) return null;
    return store.accountForToken(token) ?? null;
  };

  // ── Public ──────────────────────────────────────────────────────────────

  if (req.method === 'GET' && path === '/api/health') {
    send(res, 200, { ok: true, service: 'sql-master-scores' });
    return;
  }

  /** Lets the sign-up form say a name is taken before the password is typed. */
  if (req.method === 'GET' && path === '/api/username-available') {
    const name = url.searchParams.get('name') ?? '';
    const problem = validate(name, 'placeholder-ok');
    if (problem) {
      send(res, 200, { available: false, reason: problem });
      return;
    }
    const taken = store.isUsernameTaken(name);
    send(res, 200, {
      available: !taken,
      reason: taken ? 'That name is taken. Pick another, or sign in instead.' : null,
    });
    return;
  }

  if (req.method === 'GET' && path === '/api/leaderboard') {
    const limit = Math.min(Math.max(asInt(url.searchParams.get('limit'), 100), 1), 500);
    send(res, 200, { rows: store.leaderboard(limit) });
    return;
  }

  const statsMatch = path.match(/^\/api\/levels\/(\d+)\/stats$/);
  if (req.method === 'GET' && statsMatch) {
    send(res, 200, store.levelStats(Number(statsMatch[1])));
    return;
  }

  // ── Authentication ──────────────────────────────────────────────────────

  if (req.method === 'POST' && path === '/api/auth/register') {
    if (rateLimited(`register:${address}`)) {
      send(res, 429, { error: 'Too many attempts. Wait a minute and try again.' });
      return;
    }

    const body = await readJson(req);
    const username = String(body.username ?? '');
    const password = String(body.password ?? '');

    const problem = validate(username, password);
    if (problem) {
      send(res, 400, { error: problem });
      return;
    }

    try {
      const account = await store.register(username, password);
      const session = store.createSession(account.id);
      send(res, 201, { account: publicAccount(account), ...session });
    } catch (error) {
      if (error instanceof UsernameTaken) {
        // 409 Conflict: the name exists. The unique index decided this, not a
        // check-then-insert, so two simultaneous sign-ups cannot both succeed.
        send(res, 409, { error: 'That name is taken. Pick another, or sign in instead.' });
        return;
      }
      throw error;
    }
    return;
  }

  if (req.method === 'POST' && path === '/api/auth/login') {
    if (rateLimited(`login:${address}`)) {
      send(res, 429, { error: 'Too many attempts. Wait a minute and try again.' });
      return;
    }

    const body = await readJson(req);
    const account = await store.login(String(body.username ?? ''), String(body.password ?? ''));
    if (!account) {
      send(res, 401, { error: 'No account matches that name and password.' });
      return;
    }
    send(res, 200, { account: publicAccount(account), ...store.createSession(account.id) });
    return;
  }

  if (req.method === 'POST' && path === '/api/auth/logout') {
    const token = bearer(req);
    if (token) store.destroySession(token);
    send(res, 200, { ok: true });
    return;
  }

  // ── Signed in ───────────────────────────────────────────────────────────

  if (req.method === 'GET' && path === '/api/me') {
    const account = requireAccount();
    if (!account) {
      send(res, 401, { error: 'Sign in first.' });
      return;
    }
    send(res, 200, {
      account: publicAccount(account),
      solves: store.solvesOf(account.id),
      badges: store.badgesOf(account.id),
      rank: store.rankOf(account.id),
    });
    return;
  }

  if (req.method === 'POST' && path === '/api/solves') {
    const account = requireAccount();
    if (!account) {
      send(res, 401, { error: 'Sign in first.' });
      return;
    }

    const body = await readJson(req);
    const levelId = asInt(body.levelId, -1);
    const baseXp = LEVEL_SCORES[String(levelId)];
    if (baseXp === undefined) {
      send(res, 400, { error: `There is no case ${levelId}.` });
      return;
    }

    // The score is computed here, from the case's own base XP and the effort
    // reported. A client that posts "xp": 999999 gets whatever it earned.
    const elapsedMs = Math.max(0, asInt(body.elapsedMs, 0));
    const breakdown = scoreSolve({
      baseXp,
      difficulty: difficultyFromXp(baseXp),
      elapsedMs,
      attempts: Math.max(1, asInt(body.attempts, 1)),
      hintsUsed: Math.max(0, asInt(body.hintsUsed, 0)),
      revealed: Boolean(body.revealed),
    });

    store.recordSolve(account.id, {
      levelId,
      solvedAt: new Date().toISOString(),
      elapsedMs,
      attempts: Math.max(1, asInt(body.attempts, 1)),
      hintsUsed: Math.max(0, asInt(body.hintsUsed, 0)),
      revealed: Boolean(body.revealed),
      xp: breakdown.total,
    });

    send(res, 200, { awarded: breakdown.total, breakdown, rank: store.rankOf(account.id) });
    return;
  }

  if (req.method === 'POST' && path === '/api/badges') {
    const account = requireAccount();
    if (!account) {
      send(res, 401, { error: 'Sign in first.' });
      return;
    }
    const body = await readJson(req);
    const badgeId = String(body.badgeId ?? '').slice(0, 64);
    if (!badgeId) {
      send(res, 400, { error: 'Which badge?' });
      return;
    }
    store.awardBadge(account.id, badgeId, new Date().toISOString());
    send(res, 200, { ok: true });
    return;
  }

  send(res, 404, { error: `No route for ${req.method} ${path}` });
}

// Started directly rather than imported by a test.
// pathToFileURL is the only spelling that agrees with import.meta.url on Windows
// as well as everywhere else; hand-built file:// strings differ by a slash.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApi().then((api) => {
    console.log(`[scores] listening on http://localhost:${api.port}`);
    console.log(`[scores] database ${DB_FILE}`);
  });
}
