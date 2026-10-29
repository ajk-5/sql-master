import type { Database, SqlValue } from 'sql.js';
import { getEngine } from '@/engine/db';
import { hashPassword, normaliseUsername, verifyPassword } from './password';

/**
 * The account store is itself a SQLite database, which is only fitting. It is
 * kept in the browser, exported to bytes after every change and stashed in local
 * storage, so several people can share one machine and keep separate progress.
 *
 * Every statement below binds its parameters. A username is never concatenated
 * into SQL, so a player calling themselves `'; DROP TABLE users; --` is simply a
 * player with an unusual name.
 */

export const ACCOUNTS_KEY = 'sqlmaster.accounts.v1';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL
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
CREATE INDEX IF NOT EXISTS idx_solves_user ON solves(user_id);
`;

export type Account = {
  id: number;
  username: string;
  displayName: string;
  createdAt: string;
  lastSeenAt: string;
};

export type SolveRecord = {
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

export type AuthResult = { ok: true; account: Account } | { ok: false; reason: string };

function encode(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function decode(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export class AccountStore {
  private db: Database | null = null;

  constructor(private readonly storage: Storage | undefined) {}

  async open(): Promise<void> {
    if (this.db) return;
    const SQL = await getEngine();
    const saved = this.read();
    this.db = saved ? new SQL.Database(saved) : new SQL.Database();
    this.db.run('PRAGMA foreign_keys = ON;');
    this.db.run(SCHEMA);
    this.persist();
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  private require(): Database {
    if (!this.db) throw new Error('The account store is not open yet.');
    return this.db;
  }

  private read(): Uint8Array | undefined {
    try {
      const raw = this.storage?.getItem(ACCOUNTS_KEY);
      return raw ? decode(raw) : undefined;
    } catch {
      return undefined;
    }
  }

  private persist(): void {
    const db = this.require();
    let bytes: Uint8Array;
    try {
      bytes = db.export();
    } finally {
      // sql.js implements export() by closing and reopening the database, which
      // silently resets connection pragmas. Foreign keys have to be turned back
      // on afterwards or cascading deletes quietly stop happening.
      db.run('PRAGMA foreign_keys = ON;');
    }
    try {
      this.storage?.setItem(ACCOUNTS_KEY, encode(bytes));
    } catch {
      // Storage full or blocked. The session keeps working in memory.
    }
  }

  private query<T>(sql: string, params: SqlValue[] = []): T[] {
    const statement = this.require().prepare(sql);
    try {
      statement.bind(params);
      const rows: T[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as T);
      return rows;
    } finally {
      statement.free();
    }
  }

  private run(sql: string, params: SqlValue[] = []): void {
    this.require().run(sql, params);
  }

  // ── Accounts ────────────────────────────────────────────────────────────

  async register(username: string, password: string): Promise<AuthResult> {
    const handle = normaliseUsername(username);
    if (this.findByUsername(handle)) {
      return { ok: false, reason: 'That name is taken. Pick another, or sign in instead.' };
    }

    const now = new Date().toISOString();
    this.run(
      `INSERT INTO users (username, display_name, password_hash, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?)`,
      [handle, username.trim(), await hashPassword(password), now, now],
    );
    this.persist();

    const account = this.findByUsername(handle);
    return account
      ? { ok: true, account }
      : { ok: false, reason: 'The account could not be created.' };
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const handle = normaliseUsername(username);
    const rows = this.query<{ id: number; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE username = ?',
      [handle],
    );

    // Always run a verification, so a missing account and a wrong password take
    // the same time and cannot be told apart from the outside.
    const stored = rows[0]?.password_hash ?? (await hashPassword('placeholder-for-timing'));
    const matches = await verifyPassword(password, stored);

    if (!rows.length || !matches) {
      return { ok: false, reason: 'No account matches that name and password.' };
    }

    const now = new Date().toISOString();
    this.run('UPDATE users SET last_seen_at = ? WHERE id = ?', [now, rows[0].id]);
    this.persist();

    const account = this.findById(rows[0].id);
    return account ? { ok: true, account } : { ok: false, reason: 'The account has gone missing.' };
  }

  findById(id: number): Account | undefined {
    return this.mapAccounts('SELECT * FROM users WHERE id = ?', [id])[0];
  }

  findByUsername(username: string): Account | undefined {
    return this.mapAccounts('SELECT * FROM users WHERE username = ?', [normaliseUsername(username)])[0];
  }

  listAccounts(): Account[] {
    return this.mapAccounts('SELECT * FROM users ORDER BY created_at');
  }

  private mapAccounts(sql: string, params: SqlValue[] = []): Account[] {
    return this.query<{
      id: number;
      username: string;
      display_name: string;
      created_at: string;
      last_seen_at: string;
    }>(sql, params).map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
    }));
  }

  // ── Progress ────────────────────────────────────────────────────────────

  /** Records a solve, keeping the best score if the case is solved again. */
  recordSolve(userId: number, solve: SolveRecord): void {
    this.run(
      `INSERT INTO solves (user_id, level_id, solved_at, elapsed_ms, attempts, hints_used, revealed, xp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, level_id) DO UPDATE SET
         solved_at  = CASE WHEN excluded.xp > solves.xp THEN excluded.solved_at ELSE solves.solved_at END,
         elapsed_ms = MIN(solves.elapsed_ms, excluded.elapsed_ms),
         attempts   = MIN(solves.attempts, excluded.attempts),
         hints_used = MIN(solves.hints_used, excluded.hints_used),
         revealed   = MIN(solves.revealed, excluded.revealed),
         xp         = MAX(solves.xp, excluded.xp)`,
      [
        userId,
        solve.levelId,
        solve.solvedAt,
        Math.round(solve.elapsedMs),
        solve.attempts,
        solve.hintsUsed,
        solve.revealed ? 1 : 0,
        solve.xp,
      ],
    );
    this.persist();
  }

  awardBadge(userId: number, badgeId: string, earnedAt: string): void {
    this.run(
      'INSERT OR IGNORE INTO badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)',
      [userId, badgeId, earnedAt],
    );
    this.persist();
  }

  solvesOf(userId: number): SolveRecord[] {
    return this.query<{
      level_id: number;
      solved_at: string;
      elapsed_ms: number;
      attempts: number;
      hints_used: number;
      revealed: number;
      xp: number;
    }>('SELECT * FROM solves WHERE user_id = ? ORDER BY level_id', [userId]).map((row) => ({
      levelId: row.level_id,
      solvedAt: row.solved_at,
      elapsedMs: row.elapsed_ms,
      attempts: row.attempts,
      hintsUsed: row.hints_used,
      revealed: row.revealed === 1,
      xp: row.xp,
    }));
  }

  badgesOf(userId: number): Record<string, string> {
    const rows = this.query<{ badge_id: string; earned_at: string }>(
      'SELECT badge_id, earned_at FROM badges WHERE user_id = ?',
      [userId],
    );
    return Object.fromEntries(rows.map((row) => [row.badge_id, row.earned_at]));
  }

  // ── Analysis ────────────────────────────────────────────────────────────

  leaderboard(limit = 50): LeaderboardRow[] {
    const rows = this.query<{
      id: number;
      username: string;
      display_name: string;
      xp: number;
      solved: number;
      badges: number;
      average_ms: number | null;
      last_seen_at: string;
    }>(
      `SELECT u.id, u.username, u.display_name, u.last_seen_at,
              COALESCE(SUM(s.xp), 0)            AS xp,
              COUNT(s.level_id)                 AS solved,
              (SELECT COUNT(*) FROM badges b WHERE b.user_id = u.id) AS badges,
              AVG(s.elapsed_ms)                 AS average_ms
       FROM users u
       LEFT JOIN solves s ON s.user_id = u.id
       GROUP BY u.id
       ORDER BY xp DESC, solved DESC, average_ms ASC, u.username ASC
       LIMIT ?`,
      [limit],
    );

    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.id,
      username: row.username,
      displayName: row.display_name,
      xp: row.xp,
      solved: row.solved,
      badges: row.badges,
      earnedBadges: this.badgesOf(row.id),
      averageMs: row.average_ms === null ? null : Math.round(row.average_ms),
      lastSeenAt: row.last_seen_at,
    }));
  }

  /** How everyone who has closed this case did, for comparison against one player. */
  levelStats(levelId: number): LevelStats {
    const row = this.query<{
      solvers: number;
      average_ms: number | null;
      best_ms: number | null;
      average_attempts: number | null;
      average_xp: number | null;
    }>(
      `SELECT COUNT(*)          AS solvers,
              AVG(elapsed_ms)   AS average_ms,
              MIN(elapsed_ms)   AS best_ms,
              AVG(attempts)     AS average_attempts,
              AVG(xp)           AS average_xp
       FROM solves WHERE level_id = ?`,
      [levelId],
    )[0];

    return {
      levelId,
      solvers: row?.solvers ?? 0,
      averageMs: row?.average_ms === null || row === undefined ? null : Math.round(row.average_ms),
      bestMs: row?.best_ms ?? null,
      averageAttempts: row?.average_attempts ?? null,
      averageXp: row?.average_xp === null || row === undefined ? null : Math.round(row.average_xp),
    };
  }

  /** Where one player sits against everyone else, by total XP. */
  rankOf(userId: number): { rank: number; of: number } {
    const board = this.leaderboard(1000);
    const index = board.findIndex((row) => row.userId === userId);
    return { rank: index === -1 ? board.length : index + 1, of: board.length };
  }

  deleteAccount(userId: number): void {
    this.run('DELETE FROM users WHERE id = ?', [userId]);
    this.persist();
  }

  /** Exposed so the sandbox can let a player query their own account database. */
  exportBytes(): Uint8Array {
    return this.require().export();
  }
}
