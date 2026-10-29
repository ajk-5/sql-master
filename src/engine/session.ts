import type { Database } from 'sql.js';
import { createWorld, describeSchema, runSql, type TableInfo } from './db';
import { judge } from './validate';
import type { Level, RunOutcome, Verdict } from './types';
import {
  JUDGE_TIMEOUT_MS,
  MAX_PAGE_COUNT,
  RUN_TIMEOUT_MS,
  capOutcome,
  capVerdict,
  type SqlRequest,
  type SqlResponse,
} from './protocol';

/** Omit distributed over the request union, so each variant keeps its own shape. */
type Unsent<T> = T extends { id: number } ? Omit<T, 'id'> : never;

export type RunResult = { outcome: RunOutcome; schema: TableInfo[] };
export type JudgeResult = { verdict: Verdict; outcome: RunOutcome };

export class QueryTimeout extends Error {
  constructor(readonly ms: number) {
    super(
      `The query was still running after ${ms / 1000} seconds and was stopped. ` +
        'A query with no end, such as a recursive CTE without a stopping condition, will do this. ' +
        'The database has been reset to its starting state.',
    );
    this.name = 'QueryTimeout';
  }
}

/**
 * A player's connection to one seeded world.
 *
 * In the browser the database lives in a Web Worker, so a query that never
 * finishes can be killed by destroying the worker. Nothing a player writes can
 * reach past this boundary: the database is created fresh from a seed string in
 * memory, is private to the tab, and is thrown away on reload.
 */
export class SqlSession {
  private worker: Worker | null = null;
  private inline: Database | null = null;
  private pending = new Map<
    number,
    {
      resolve: (value: SqlResponse) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private nextId = 1;
  private seed = '';
  private disposed = false;

  /** Workers are unavailable under jsdom and Node, where tests run in-process. */
  private get canUseWorker(): boolean {
    return typeof Worker !== 'undefined';
  }

  async open(seed: string): Promise<TableInfo[]> {
    this.seed = seed;
    if (!this.canUseWorker) {
      this.inline?.close();
      this.inline = await createWorld(seed);
      this.inline.run(`PRAGMA max_page_count = ${MAX_PAGE_COUNT};`);
      return describeSchema(this.inline);
    }
    const response = await this.send({ type: 'open', seed }, RUN_TIMEOUT_MS * 4);
    return response.ok && response.type === 'open' ? response.result : [];
  }

  /** Re-seeds the world, discarding anything the player changed. */
  reset(): Promise<TableInfo[]> {
    return this.open(this.seed);
  }

  async run(sql: string): Promise<RunResult> {
    if (!this.canUseWorker) {
      const db = this.inline;
      if (!db) throw new Error('No database is open in this session.');
      return { outcome: capOutcome(runSql(db, sql)), schema: describeSchema(db) };
    }
    const response = await this.send({ type: 'run', sql }, RUN_TIMEOUT_MS);
    if (!response.ok || response.type !== 'run') throw new Error('Unexpected worker reply.');
    return response.result;
  }

  async judge(level: Level, seed: string, sql: string): Promise<JudgeResult> {
    if (!this.canUseWorker) {
      const attempt = await judge(level, seed, sql);
      return { verdict: capVerdict(attempt.verdict), outcome: capOutcome(attempt.outcome) };
    }
    const response = await this.send({ type: 'judge', level, seed, sql }, JUDGE_TIMEOUT_MS);
    if (!response.ok || response.type !== 'judge') throw new Error('Unexpected worker reply.');
    return response.result;
  }

  dispose(): void {
    this.disposed = true;
    this.failAll(new Error('The session was closed.'));
    this.worker?.terminate();
    this.worker = null;
    this.inline?.close();
    this.inline = null;
  }

  private spawn(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./sql.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<SqlResponse>) => {
      const entry = this.pending.get(event.data.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      this.pending.delete(event.data.id);
      entry.resolve(event.data);
    };
    worker.onerror = (event) => {
      this.failAll(new Error(event.message || 'The SQL worker stopped unexpectedly.'));
      this.kill();
    };
    this.worker = worker;
    return worker;
  }

  private send(request: Unsent<SqlRequest>, timeoutMs: number): Promise<SqlResponse> {
    if (this.disposed) return Promise.reject(new Error('The session was closed.'));
    const id = this.nextId++;
    const worker = this.spawn();

    return new Promise<SqlResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        // The worker is wedged inside SQLite and will not answer again, so the
        // only way out is to destroy it. The next call spawns a fresh one.
        this.kill();
        reject(new QueryTimeout(timeoutMs));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      worker.postMessage({ ...request, id } as SqlRequest);
    }).then((response) => {
      if (!response.ok) throw new Error(response.error);
      return response;
    });
  }

  private kill(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private failAll(error: Error): void {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.pending.clear();
  }
}
