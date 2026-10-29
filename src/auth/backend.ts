import { AccountStore, type Account, type AuthResult, type LeaderboardRow, type LevelStats, type SolveRecord } from './accounts';
import { validatePassword, validateUsername } from './password';

export type NameCheck = { available: boolean; reason: string | null };

export type LoadedProgress = {
  solves: SolveRecord[];
  badges: Record<string, string>;
};

/**
 * Where scores live. Two implementations: one entirely inside this browser, and
 * one talking to the score server. The game does not care which it has, except
 * to tell the player how far their leaderboard actually reaches.
 */
export type ScoreBackend = {
  /** 'remote' means scores are shared with everyone on the same server. */
  readonly kind: 'local' | 'remote';
  readonly reach: string;
  restore(): Promise<Account | null>;
  checkUsername(username: string): Promise<NameCheck>;
  register(username: string, password: string): Promise<AuthResult>;
  login(username: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
  loadProgress(userId: number): Promise<LoadedProgress>;
  recordSolve(userId: number, solve: SolveRecord): Promise<void>;
  awardBadge(userId: number, badgeId: string, earnedAt: string): Promise<void>;
  leaderboard(limit?: number): Promise<LeaderboardRow[]>;
  levelStats(levelId: number): Promise<LevelStats>;
};

export const API_BASE: string = import.meta.env.VITE_API_URL ?? '/api';
export const SESSION_KEY = 'sqlmaster.session.v1';
export const TOKEN_KEY = 'sqlmaster.token.v1';

function validate(username: string, password: string): string | null {
  const name = validateUsername(username);
  if (!name.ok) return name.reason;
  const secret = validatePassword(password);
  if (!secret.ok) return secret.reason;
  return null;
}

// ── Local ─────────────────────────────────────────────────────────────────

/** Scores kept in this browser. Everyone sharing the machine shares the board. */
export class LocalBackend implements ScoreBackend {
  readonly kind = 'local' as const;
  readonly reach = 'everyone using this browser';

  constructor(
    private readonly store: AccountStore,
    private readonly storage: Storage | undefined,
  ) {}

  async restore(): Promise<Account | null> {
    const saved = Number(this.storage?.getItem(SESSION_KEY) ?? '');
    if (!Number.isInteger(saved) || saved <= 0) return null;
    return this.store.findById(saved) ?? null;
  }

  async checkUsername(username: string): Promise<NameCheck> {
    const problem = validateUsername(username);
    if (!problem.ok) return { available: false, reason: problem.reason };
    return this.store.findByUsername(username)
      ? { available: false, reason: 'That name is taken. Pick another, or sign in instead.' }
      : { available: true, reason: null };
  }

  async register(username: string, password: string): Promise<AuthResult> {
    const problem = validate(username, password);
    if (problem) return { ok: false, reason: problem };
    const result = await this.store.register(username, password);
    if (result.ok) this.remember(result.account.id);
    return result;
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const result = await this.store.login(username, password);
    if (result.ok) this.remember(result.account.id);
    return result;
  }

  async logout(): Promise<void> {
    try {
      this.storage?.removeItem(SESSION_KEY);
    } catch {
      // Signed out for this tab regardless.
    }
  }

  private remember(id: number): void {
    try {
      this.storage?.setItem(SESSION_KEY, String(id));
    } catch {
      // Signed in for this session only.
    }
  }

  async loadProgress(userId: number): Promise<LoadedProgress> {
    return { solves: this.store.solvesOf(userId), badges: this.store.badgesOf(userId) };
  }

  async recordSolve(userId: number, solve: SolveRecord): Promise<void> {
    this.store.recordSolve(userId, solve);
  }

  async awardBadge(userId: number, badgeId: string, earnedAt: string): Promise<void> {
    this.store.awardBadge(userId, badgeId, earnedAt);
  }

  async leaderboard(limit = 100): Promise<LeaderboardRow[]> {
    return this.store.leaderboard(limit);
  }

  async levelStats(levelId: number): Promise<LevelStats> {
    return this.store.levelStats(levelId);
  }
}

// ── Remote ────────────────────────────────────────────────────────────────

type ApiAccount = {
  id: number;
  username: string;
  displayName: string;
  createdAt: string;
  lastSeenAt: string;
};

/** Scores kept on the score server and shared by everyone who signs in to it. */
export class RemoteBackend implements ScoreBackend {
  readonly kind = 'remote' as const;
  readonly reach = 'everyone on this server';
  private token: string | null = null;

  constructor(
    private readonly base: string,
    private readonly storage: Storage | undefined,
  ) {
    try {
      this.token = storage?.getItem(TOKEN_KEY) ?? null;
    } catch {
      this.token = null;
    }
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
    const response = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    const body = (await response.json().catch(() => ({}))) as T;
    return { status: response.status, body };
  }

  private keepToken(token: string | null): void {
    this.token = token;
    try {
      if (token) this.storage?.setItem(TOKEN_KEY, token);
      else this.storage?.removeItem(TOKEN_KEY);
    } catch {
      // Signed in for this session only.
    }
  }

  static async reachable(base: string): Promise<boolean> {
    try {
      const response = await fetch(`${base}/health`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }

  async restore(): Promise<Account | null> {
    if (!this.token) return null;
    const { status, body } = await this.call<{ account: ApiAccount }>('/me');
    if (status !== 200) {
      this.keepToken(null);
      return null;
    }
    return body.account;
  }

  async checkUsername(username: string): Promise<NameCheck> {
    const { body } = await this.call<NameCheck>(
      `/username-available?name=${encodeURIComponent(username)}`,
    );
    return body;
  }

  async register(username: string, password: string): Promise<AuthResult> {
    const problem = validate(username, password);
    if (problem) return { ok: false, reason: problem };

    const { status, body } = await this.call<{ account: ApiAccount; token: string; error?: string }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ username, password }) },
    );
    if (status === 201) {
      this.keepToken(body.token);
      return { ok: true, account: body.account };
    }
    return { ok: false, reason: body.error ?? 'The account could not be created.' };
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const { status, body } = await this.call<{ account: ApiAccount; token: string; error?: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) },
    );
    if (status === 200) {
      this.keepToken(body.token);
      return { ok: true, account: body.account };
    }
    return { ok: false, reason: body.error ?? 'No account matches that name and password.' };
  }

  async logout(): Promise<void> {
    if (this.token) await this.call('/auth/logout', { method: 'POST' }).catch(() => undefined);
    this.keepToken(null);
  }

  async loadProgress(): Promise<LoadedProgress> {
    const { status, body } = await this.call<{
      solves: SolveRecord[];
      badges: Record<string, string>;
    }>('/me');
    if (status !== 200) return { solves: [], badges: {} };
    return { solves: body.solves ?? [], badges: body.badges ?? {} };
  }

  async recordSolve(_userId: number, solve: SolveRecord): Promise<void> {
    // The server prices the solve itself; xp is not sent because it would not be
    // believed. Effort is what it needs.
    await this.call('/solves', {
      method: 'POST',
      body: JSON.stringify({
        levelId: solve.levelId,
        elapsedMs: solve.elapsedMs,
        attempts: solve.attempts,
        hintsUsed: solve.hintsUsed,
        revealed: solve.revealed,
      }),
    });
  }

  async awardBadge(_userId: number, badgeId: string): Promise<void> {
    await this.call('/badges', { method: 'POST', body: JSON.stringify({ badgeId }) });
  }

  async leaderboard(limit = 100): Promise<LeaderboardRow[]> {
    const { body } = await this.call<{ rows: LeaderboardRow[] }>(`/leaderboard?limit=${limit}`);
    return body.rows ?? [];
  }

  async levelStats(levelId: number): Promise<LevelStats> {
    const { body } = await this.call<LevelStats>(`/levels/${levelId}/stats`);
    return body;
  }
}

/**
 * Prefers the score server so the leaderboard is genuinely shared, and falls
 * back to this browser when there is none, so the game still works offline.
 */
export async function chooseBackend(
  storage: Storage | undefined,
  base = API_BASE,
): Promise<ScoreBackend> {
  if (await RemoteBackend.reachable(base)) {
    return new RemoteBackend(base, storage);
  }
  const store = new AccountStore(storage);
  await store.open();
  return new LocalBackend(store, storage);
}
