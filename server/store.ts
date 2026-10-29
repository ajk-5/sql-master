import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_BYTES = 64;
const SALT_BYTES = 16;
/** Sessions are valid for a fortnight of not signing in again. */
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL
);

-- The single source of truth for "no two accounts share a name". A unique index
-- on the lower-cased name means two simultaneous sign-ups cannot both win: one
-- INSERT succeeds and the other is rejected by the database itself.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS solves (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id   INTEGER NOT NULL,
  solved_at  TEXT NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  attempts   INTEGER NOT NULL,
  hints_used INTEGER NOT NULL,
  revealed   INTEGER NOT NULL,
  xp         INTEGER NOT NULL,
  PRIMARY KEY (user_id, level_id)
);

CREATE TABLE IF NOT EXISTS badges (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id  TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_solves_level ON solves(level_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`;

export type Account = {
  id: number;
  username: string;
  displayName: string;
  createdAt: string;
  lastSeenAt: string;
};

export type SolveRow = {
  levelId: number;
  solvedAt: string;
  elapsedMs: number;
  attempts: number;
  hintsUsed: number;
  revealed: boolean;
  xp: number;
};

export type LeaderboardRow = {
  rank: number;
  userId: number;
  username: string;
  displayName: string;
  xp: number;
  solved: number;
  badges: number;
  earnedBadges?: Record<string, string>;
  averageMs: number | null;
  lastSeenAt: string;
};

export type LevelStats = {
  levelId: number;
  solvers: number;
  averageMs: number | null;
  bestMs: number | null;
  averageAttempts: number | null;
  averageXp: number | null;
};

export class UsernameTaken extends Error {
  constructor(username: string) {
    super(`The name "${username}" is already registered.`);
    this.name = 'UsernameTaken';
  }
}

/** Tokens are stored hashed: a stolen database hands over no working sessions. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class ScoreStore {
  private db: DatabaseSync;

  constructor(filename: string) {
    this.db = new DatabaseSync(filename);
    this.db.exec(SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  // ── Passwords ───────────────────────────────────────────────────────────

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const key = await scryptAsync(password, salt, KEY_BYTES);
    return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
  }

  private async verifyPassword(password: string, encoded: string): Promise<boolean> {
    const [scheme, salt, expected] = encoded.split('$');
    if (scheme !== 'scrypt' || !salt || !expected) return false;
    try {
      const key = await scryptAsync(password, Buffer.from(salt, 'base64'), KEY_BYTES);
      const want = Buffer.from(expected, 'base64');
      return key.length === want.length && timingSafeEqual(key, want);
    } catch {
      return false;
    }
  }

  // ── Accounts ────────────────────────────────────────────────────────────

  /**
   * Creates an account. The unique index does the deciding, so two requests
   * racing for the same name cannot both succeed.
   */
  async register(username: string, password: string): Promise<Account> {
    const handle = username.trim().toLowerCase();
    const now = new Date().toISOString();
    const hash = await this.hashPassword(password);

    try {
      this.db
        .prepare(
          `INSERT INTO users (username, display_name, password_hash, created_at, last_seen_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(handle, username.trim(), hash, now, now);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/UNIQUE constraint failed/i.test(message)) throw new UsernameTaken(username.trim());
      throw error;
    }

    const account = this.findByUsername(handle);
    if (!account) throw new Error('The account vanished immediately after being created.');
    return account;
  }

  async login(username: string, password: string): Promise<Account | null> {
    const handle = username.trim().toLowerCase();
    const row = this.db
      .prepare('SELECT id, password_hash FROM users WHERE username = ?')
      .get(handle) as { id: number; password_hash: string } | undefined;

    // Verify even when there is no such account, so the two cases take the same
    // time and a prober cannot enumerate registered names.
    const stored = row?.password_hash ?? (await this.hashPassword('timing-placeholder'));
    const matches = await this.verifyPassword(password, stored);
    if (!row || !matches) return null;

    const now = new Date().toISOString();
    this.db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(now, row.id);
    return this.findById(row.id) ?? null;
  }

  isUsernameTaken(username: string): boolean {
    return Boolean(
      this.db
        .prepare('SELECT 1 FROM users WHERE username = ?')
        .get(username.trim().toLowerCase()),
    );
  }

  findById(id: number): Account | undefined {
    return this.mapAccount(this.db.prepare('SELECT * FROM users WHERE id = ?').get(id));
  }

  findByUsername(username: string): Account | undefined {
    return this.mapAccount(
      this.db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase()),
    );
  }

  private mapAccount(row: unknown): Account | undefined {
    if (!row) return undefined;
    const r = row as Record<string, unknown>;
    return {
      id: Number(r.id),
      username: String(r.username),
      displayName: String(r.display_name),
      createdAt: String(r.created_at),
      lastSeenAt: String(r.last_seen_at),
    };
  }

  // ── Sessions ────────────────────────────────────────────────────────────

  createSession(userId: number): { token: string; expiresAt: string } {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();
    this.db
      .prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(hashToken(token), userId, new Date(now).toISOString(), expiresAt);
    return { token, expiresAt };
  }

  accountForToken(token: string): Account | undefined {
    const row = this.db
      .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
      .get(hashToken(token)) as { user_id: number; expires_at: string } | undefined;
    if (!row) return undefined;
    if (Date.parse(row.expires_at) < Date.now()) {
      this.destroySession(token);
      return undefined;
    }
    return this.findById(row.user_id);
  }

  destroySession(token: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  }

  purgeExpiredSessions(): number {
    const result = this.db
      .prepare('DELETE FROM sessions WHERE expires_at < ?')
      .run(new Date().toISOString());
    return Number(result.changes ?? 0);
  }

  // ── Progress ────────────────────────────────────────────────────────────

  recordSolve(userId: number, solve: SolveRow): void {
    this.db
      .prepare(
        `INSERT INTO solves (user_id, level_id, solved_at, elapsed_ms, attempts, hints_used, revealed, xp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, level_id) DO UPDATE SET
           solved_at  = CASE WHEN excluded.xp > solves.xp THEN excluded.solved_at ELSE solves.solved_at END,
           elapsed_ms = MIN(solves.elapsed_ms, excluded.elapsed_ms),
           attempts   = MIN(solves.attempts, excluded.attempts),
           hints_used = MIN(solves.hints_used, excluded.hints_used),
           revealed   = MIN(solves.revealed, excluded.revealed),
           xp         = MAX(solves.xp, excluded.xp)`,
      )
      .run(
        userId,
        solve.levelId,
        solve.solvedAt,
        Math.round(solve.elapsedMs),
        solve.attempts,
        solve.hintsUsed,
        solve.revealed ? 1 : 0,
        solve.xp,
      );
  }

  awardBadge(userId: number, badgeId: string, earnedAt: string): void {
    this.db
      .prepare('INSERT OR IGNORE INTO badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)')
      .run(userId, badgeId, earnedAt);
  }

  solvesOf(userId: number): SolveRow[] {
    return (
      this.db.prepare('SELECT * FROM solves WHERE user_id = ? ORDER BY level_id').all(userId) as
        Record<string, unknown>[]
    ).map((r) => ({
      levelId: Number(r.level_id),
      solvedAt: String(r.solved_at),
      elapsedMs: Number(r.elapsed_ms),
      attempts: Number(r.attempts),
      hintsUsed: Number(r.hints_used),
      revealed: Number(r.revealed) === 1,
      xp: Number(r.xp),
    }));
  }

  badgesOf(userId: number): Record<string, string> {
    const rows = this.db
      .prepare('SELECT badge_id, earned_at FROM badges WHERE user_id = ?')
      .all(userId) as Record<string, unknown>[];
    return Object.fromEntries(rows.map((r) => [String(r.badge_id), String(r.earned_at)]));
  }

  // ── Analysis ────────────────────────────────────────────────────────────

  leaderboard(limit = 100): LeaderboardRow[] {
    const rows = this.db
      .prepare(
        `SELECT u.id, u.username, u.display_name, u.last_seen_at,
                COALESCE(SUM(s.xp), 0) AS xp,
                COUNT(s.level_id)      AS solved,
                (SELECT COUNT(*) FROM badges b WHERE b.user_id = u.id) AS badges,
                AVG(s.elapsed_ms)      AS average_ms
         FROM users u
         LEFT JOIN solves s ON s.user_id = u.id
         GROUP BY u.id
         ORDER BY xp DESC, solved DESC, average_ms ASC, u.username ASC
         LIMIT ?`,
      )
      .all(limit) as Record<string, unknown>[];

    return rows.map((r, index) => ({
      rank: index + 1,
      userId: Number(r.id),
      username: String(r.username),
      displayName: String(r.display_name),
      xp: Number(r.xp),
      solved: Number(r.solved),
      badges: Number(r.badges),
      earnedBadges: this.badgesOf(Number(r.id)),
      averageMs: r.average_ms === null ? null : Math.round(Number(r.average_ms)),
      lastSeenAt: String(r.last_seen_at),
    }));
  }

  levelStats(levelId: number): LevelStats {
    const r = this.db
      .prepare(
        `SELECT COUNT(*) AS solvers, AVG(elapsed_ms) AS average_ms, MIN(elapsed_ms) AS best_ms,
                AVG(attempts) AS average_attempts, AVG(xp) AS average_xp
         FROM solves WHERE level_id = ?`,
      )
      .get(levelId) as Record<string, unknown>;

    return {
      levelId,
      solvers: Number(r?.solvers ?? 0),
      averageMs: r?.average_ms == null ? null : Math.round(Number(r.average_ms)),
      bestMs: r?.best_ms == null ? null : Number(r.best_ms),
      averageAttempts: r?.average_attempts == null ? null : Number(r.average_attempts),
      averageXp: r?.average_xp == null ? null : Math.round(Number(r.average_xp)),
    };
  }

  rankOf(userId: number): { rank: number; of: number } {
    const board = this.leaderboard(100000);
    const index = board.findIndex((row) => row.userId === userId);
    return { rank: index === -1 ? board.length : index + 1, of: board.length };
  }
}
