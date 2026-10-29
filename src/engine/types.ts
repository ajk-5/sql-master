export type Grid = { columns: string[]; values: unknown[][] };

export type DocLink = { label: string; url: string };

/** A named, seeded SQLite world that levels are played against. */
export type Dataset = {
  id: string;
  name: string;
  blurb: string;
  seed: string;
};

export type LevelKind =
  | 'query'      // answer is the shape of a SELECT result
  | 'mutation'   // answer is the state of the database after DML/DDL
  | 'recovery';  // answer is a restored / repaired database state

export type Level = {
  id: number;
  actId: string;
  title: string;
  /** Diegetic scene text. Sets the crime, the room, the ticking clock. */
  story: string;
  /** What the player must actually produce. */
  objective: string;
  dataset: string;
  kind: LevelKind;
  concepts: string[];
  docs: DocLink[];
  starter?: string;
  /** Reference SQL. Executed against a pristine copy to derive the expected answer. */
  solution: string;
  /**
   * For mutation/recovery levels: a SELECT run after execution on both the player's
   * database and the reference database. Equal grids means the world ended up the same.
   */
  check?: string;
  orderMatters?: boolean;
  strictColumns?: boolean;
  /** Case-insensitive tokens that must appear in the submitted SQL. */
  requireKeywords?: string[];
  /** Case-insensitive tokens that must NOT appear (stops brute-force literals). */
  forbidKeywords?: string[];
  hints: string[];
  xp: number;
  badge?: string;
};

export type Act = {
  id: string;
  index: number;
  name: string;
  tagline: string;
  synopsis: string;
  dataset: string;
  accent: string;
  glyph: string;
  range: [number, number];
};

export type RunOutcome = {
  ok: boolean;
  grids: Grid[];
  error?: string;
  elapsedMs: number;
  rowsChanged?: number;
};

export type Verdict = {
  solved: boolean;
  title: string;
  detail: string;
  /** Non-fatal observations shown even on success. */
  notes: string[];
  expected?: Grid;
  actual?: Grid;
};
