/// <reference lib="webworker" />
import type { Database } from 'sql.js';
import { createWorld, describeSchema, runSql } from './db';
import { judge } from './validate';
import {
  MAX_PAGE_COUNT,
  capOutcome,
  capVerdict,
  type SqlRequest,
  type SqlResponse,
} from './protocol';

/**
 * Runs every player statement off the main thread. A query with no end — an
 * unbounded recursive CTE, say — blocks only this worker, and the page destroys
 * and replaces it. On the main thread the same query would freeze the tab for
 * good, with no way left to click anything.
 */

let db: Database | null = null;

/** Caps how large the database may grow, so a runaway INSERT cannot eat memory. */
function applyLimits(database: Database): void {
  database.run(`PRAGMA max_page_count = ${MAX_PAGE_COUNT};`);
}

async function open(seed: string) {
  db?.close();
  db = await createWorld(seed);
  applyLimits(db);
  return describeSchema(db);
}

function requireDb(): Database {
  if (!db) throw new Error('No database is open in this session.');
  return db;
}

self.onmessage = async (event: MessageEvent<SqlRequest>) => {
  const request = event.data;
  const reply = (message: SqlResponse) => self.postMessage(message);

  try {
    switch (request.type) {
      case 'open':
        reply({ id: request.id, ok: true, type: 'open', result: await open(request.seed) });
        break;

      case 'run': {
        const database = requireDb();
        const outcome = runSql(database, request.sql);
        reply({
          id: request.id,
          ok: true,
          type: 'run',
          result: { outcome: capOutcome(outcome), schema: describeSchema(database) },
        });
        break;
      }

      case 'schema':
        reply({ id: request.id, ok: true, type: 'schema', result: describeSchema(requireDb()) });
        break;

      case 'judge': {
        // Grading uses its own throwaway worlds, so it never touches the one the
        // player is experimenting in.
        const attempt = await judge(request.level, request.seed, request.sql);
        reply({
          id: request.id,
          ok: true,
          type: 'judge',
          result: {
            verdict: capVerdict(attempt.verdict),
            outcome: capOutcome(attempt.outcome),
          },
        });
        break;
      }
    }
  } catch (error) {
    reply({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
