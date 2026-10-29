import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
// Letting the bundler emit the binary means the URL is correct under any deploy
// base and cannot be swallowed by a single-page-app HTML fallback, which is what
// happens when the engine asks a plain web server for a bare /sql-wasm.wasm.
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import type { Grid, RunOutcome } from './types';

const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d];

let enginePromise: Promise<SqlJsStatic> | null = null;
let loader: () => Promise<SqlJsStatic> = async () =>
  initSqlJs({ wasmBinary: await fetchWasm() });

/**
 * Replaces how the SQLite WASM build is obtained. The browser fetches the binary
 * the bundler emitted; tests hand it over from node_modules directly.
 */
export function configureSqlEngine(next: () => Promise<SqlJsStatic>): void {
  loader = next;
  enginePromise = null;
}

/**
 * Fetches the WebAssembly binary and checks it really is one. A misconfigured
 * static host answers unknown paths with index.html, and the resulting error
 * from the WebAssembly compiler names only the first four bytes it found.
 * Exported so the fallback-served-HTML case can be tested directly.
 */
export async function fetchWasm(): Promise<ArrayBuffer> {
  const response = await fetch(wasmUrl);
  if (!response.ok) {
    throw new Error(`${wasmUrl} returned HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const head = new Uint8Array(buffer.slice(0, 4));
  if (WASM_MAGIC.some((byte, i) => head[i] !== byte)) {
    const contentType = response.headers.get('content-type') ?? 'an unknown type';
    const looksLikeHtml = head[0] === 0x3c; // '<'
    throw new Error(
      looksLikeHtml
        ? `${wasmUrl} returned HTML (${contentType}) instead of WebAssembly. The server is answering it with the app's index.html; exclude static files from the single-page-app fallback.`
        : `${wasmUrl} returned ${contentType}, which is not WebAssembly.`,
    );
  }
  return buffer;
}

/** Loads the SQLite WASM build once and shares it across every level. */
export function getEngine(): Promise<SqlJsStatic> {
  if (!enginePromise) {
    enginePromise = load().catch((error: unknown) => {
      // Let a later attempt retry rather than caching the failure forever.
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

async function load(): Promise<SqlJsStatic> {
  if (typeof initSqlJs !== 'function') {
    // sql.js is CommonJS. If the bundler serves it raw instead of converting it
    // to ESM, the default import lands as an object or undefined and nothing works.
    throw new Error(
      'The SQLite engine failed to import. sql.js must be pre-bundled to ESM; check optimizeDeps in vite.config.ts.',
    );
  }
  try {
    return await loader();
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`The SQLite engine could not start: ${detail}`);
  }
}

/** A fresh, fully seeded database. Every run starts from an identical world. */
export async function createWorld(seed: string): Promise<Database> {
  const SQL = await getEngine();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.run(seed);
  return db;
}

function toGrid(result: { columns: string[]; values: unknown[][] }): Grid {
  return { columns: result.columns, values: result.values as unknown[][] };
}

/**
 * Runs arbitrary player SQL. Multiple statements are allowed so that levels can
 * cover transactions, restores and multi-step repairs.
 */
export function runSql(db: Database, sql: string): RunOutcome {
  const started = performance.now();
  try {
    const results = db.exec(sql);
    return {
      ok: true,
      grids: results.map(toGrid),
      elapsedMs: performance.now() - started,
      rowsChanged: db.getRowsModified(),
    };
  } catch (error) {
    return {
      ok: false,
      grids: [],
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: performance.now() - started,
    };
  }
}

export type TableInfo = {
  name: string;
  type: 'table' | 'view';
  columns: { name: string; type: string; pk: boolean; notNull: boolean }[];
  rowCount: number;
};

/** Reads the live schema so the player always sees the world as it is now. */
export function describeSchema(db: Database): TableInfo[] {
  const out: TableInfo[] = [];
  const listed = runSql(
    db,
    `SELECT name, type FROM sqlite_master
     WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'
     ORDER BY type DESC, name;`,
  );
  const rows = listed.grids[0]?.values ?? [];
  for (const [rawName, rawType] of rows) {
    const name = String(rawName);
    const type = String(rawType) as 'table' | 'view';
    const info = runSql(db, `PRAGMA table_info(${quoteIdent(name)});`);
    const columns = (info.grids[0]?.values ?? []).map((c) => ({
      name: String(c[1]),
      type: String(c[2] || 'ANY'),
      notNull: Number(c[3]) === 1,
      pk: Number(c[5]) > 0,
    }));
    const count = runSql(db, `SELECT COUNT(*) FROM ${quoteIdent(name)};`);
    out.push({
      name,
      type,
      columns,
      rowCount: Number(count.grids[0]?.values?.[0]?.[0] ?? 0),
    });
  }
  return out;
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Small helper for preview panels: first N rows of a table. */
export function peek(db: Database, table: string, limit = 8): Grid | null {
  const res = runSql(db, `SELECT * FROM ${quoteIdent(table)} LIMIT ${limit};`);
  return res.grids[0] ?? null;
}
