import type { DocLink } from '@/engine/types';

/**
 * Every concept the game teaches, mapped to its page on sql.sh — the French SQL
 * reference this curriculum is built against. A handful of concepts (window
 * functions, CTEs, transactions) have no dedicated sql.sh page; those point at
 * the closest chapter and carry a note so the player is not sent hunting.
 */
export type Concept = {
  slug: string;
  label: string;
  family: ConceptFamily;
  summary: string;
  doc: DocLink;
  extra?: DocLink[];
  note?: string;
};

export type ConceptFamily =
  | 'Reading data'
  | 'Filtering'
  | 'Sorting and shaping'
  | 'Functions'
  | 'Joins and sets'
  | 'Aggregation'
  | 'Subqueries'
  | 'Analytics'
  | 'Writing data'
  | 'Transactions and recovery'
  | 'Schema and constraints'
  | 'Performance'
  | 'Engines';

const S = 'https://sql.sh';

function d(label: string, path: string): DocLink {
  return { label, url: `${S}${path}` };
}

export const CONCEPTS: Concept[] = [
  // Reading data
  {
    slug: 'select',
    label: 'SELECT',
    family: 'Reading data',
    summary: 'Pull columns out of a table. The first sentence of every query you will ever write.',
    doc: d('SQL SELECT', '/cours/select'),
  },
  {
    slug: 'alias',
    label: 'AS (alias)',
    family: 'Reading data',
    summary: 'Rename a column or a table for the length of one query. Report headings live here.',
    doc: d('SQL AS (alias)', '/cours/alias'),
  },
  {
    slug: 'distinct',
    label: 'DISTINCT',
    family: 'Reading data',
    summary: 'Collapse repeated rows down to one of each.',
    doc: d('SQL DISTINCT', '/cours/distinct'),
  },
  {
    slug: 'comments',
    label: 'Comments',
    family: 'Reading data',
    summary: 'Leave notes in SQL with -- and /* */ so the next investigator can follow you.',
    doc: d('Commentaires en SQL', '/cours/commentaires'),
  },

  // Filtering
  {
    slug: 'where',
    label: 'WHERE',
    family: 'Filtering',
    summary: 'Keep only the rows that satisfy a condition.',
    doc: d('SQL WHERE', '/cours/where'),
  },
  {
    slug: 'and-or',
    label: 'AND / OR',
    family: 'Filtering',
    summary: 'Combine conditions, and learn why the parentheses matter more than you think.',
    doc: d('SQL AND & OR', '/cours/where/and-or'),
  },
  {
    slug: 'in',
    label: 'IN',
    family: 'Filtering',
    summary: 'Match a column against a list of values, or against a subquery.',
    doc: d('SQL IN', '/cours/where/in'),
  },
  {
    slug: 'between',
    label: 'BETWEEN',
    family: 'Filtering',
    summary: 'Inclusive range matching for numbers, dates and text.',
    doc: d('SQL BETWEEN', '/cours/where/between'),
  },
  {
    slug: 'like',
    label: 'LIKE',
    family: 'Filtering',
    summary: 'Pattern matching on text.',
    doc: d('SQL LIKE', '/cours/where/like'),
    extra: [d('SQL Wildcards', '/cours/where/like/wildcards')],
  },
  {
    slug: 'is-null',
    label: 'IS NULL',
    family: 'Filtering',
    summary: 'NULL is not a value, it is the absence of one, so = never finds it.',
    doc: d('SQL IS NULL / IS NOT NULL', '/cours/where/is'),
    extra: [d('SQL ISNULL()', '/fonctions/isnull')],
  },
  {
    slug: 'exists',
    label: 'EXISTS',
    family: 'Filtering',
    summary: 'Ask whether a related row exists at all, without caring what is in it.',
    doc: d('SQL EXISTS', '/cours/where/exists'),
  },
  {
    slug: 'any-all',
    label: 'ANY / ALL',
    family: 'Filtering',
    summary: 'Compare one value against every value a subquery returns.',
    doc: d('SQL ANY / SOME', '/cours/where/any'),
    extra: [d('SQL ALL', '/cours/where/all')],
  },

  // Sorting and shaping
  {
    slug: 'order-by',
    label: 'ORDER BY',
    family: 'Sorting and shaping',
    summary: 'Impose an order. Without it, row order is not a promise.',
    doc: d('SQL ORDER BY', '/cours/order-by'),
  },
  {
    slug: 'limit',
    label: 'LIMIT / OFFSET',
    family: 'Sorting and shaping',
    summary: 'Take the top slice, or skip ahead into the middle of a result.',
    doc: d('SQL LIMIT', '/cours/limit'),
  },
  {
    slug: 'case',
    label: 'CASE',
    family: 'Sorting and shaping',
    summary: 'Branch inside a query. The nearest thing SQL has to an if statement.',
    doc: d('SQL CASE', '/cours/case'),
  },

  // Functions
  {
    slug: 'string-functions',
    label: 'String functions',
    family: 'Functions',
    summary: 'Cut, pad, case-fold and glue text.',
    doc: d('Fonctions de chaînes', '/fonctions/chaines-de-caracteres'),
    extra: [
      d('CONCAT()', '/fonctions/concat'),
      d('SUBSTRING()', '/fonctions/substring'),
      d('LENGTH()', '/fonctions/length'),
      d('UPPER()', '/fonctions/upper'),
      d('LOWER()', '/fonctions/lower'),
      d('TRIM()', '/fonctions/trim'),
      d('REPLACE()', '/fonctions/replace'),
      d('INSTR()', '/fonctions/instr'),
    ],
    note: 'SQLite writes string concatenation as || rather than CONCAT().',
  },
  {
    slug: 'math-functions',
    label: 'Numeric functions',
    family: 'Functions',
    summary: 'Round, truncate and do arithmetic that survives contact with money.',
    doc: d('Fonctions mathématiques', '/fonctions/mathematiques'),
    extra: [d('ROUND()', '/fonctions/round'), d('CAST()', '/fonctions/cast')],
  },
  {
    slug: 'date-functions',
    label: 'Date and time functions',
    family: 'Functions',
    summary: 'Extract a year, measure a gap, format a timestamp.',
    doc: d("Fonctions de dates et d'heures", '/fonctions/date-heure'),
    extra: [
      d('DATEDIFF()', '/fonctions/datediff'),
      d('YEAR()', '/fonctions/year'),
      d('MONTH()', '/fonctions/month'),
      d('NOW()', '/fonctions/now'),
    ],
    note: 'SQLite uses strftime(), date(), julianday() and datetime() in place of the MySQL date functions.',
  },
  {
    slug: 'coalesce',
    label: 'Handling NULL',
    family: 'Functions',
    summary: 'Substitute a fallback when a value is missing.',
    doc: d('SQL ISNULL()', '/fonctions/isnull'),
    note: 'SQLite spells this COALESCE() or IFNULL().',
  },
  {
    slug: 'group-concat',
    label: 'GROUP_CONCAT',
    family: 'Functions',
    summary: 'Flatten a group of rows into one delimited string.',
    doc: d('SQL GROUP_CONCAT()', '/fonctions/group_concat'),
  },

  // Joins and sets
  {
    slug: 'joins',
    label: 'Joins',
    family: 'Joins and sets',
    summary: 'Read two tables as one by stating how their rows correspond.',
    doc: d('Jointure SQL', '/cours/jointures'),
  },
  {
    slug: 'inner-join',
    label: 'INNER JOIN',
    family: 'Joins and sets',
    summary: 'Keep only rows that match on both sides.',
    doc: d('SQL INNER JOIN', '/cours/jointures/inner-join'),
  },
  {
    slug: 'left-join',
    label: 'LEFT JOIN',
    family: 'Joins and sets',
    summary: 'Keep every row on the left, even where the right side has nothing to offer.',
    doc: d('SQL LEFT JOIN', '/cours/jointures/left-join'),
    extra: [d('SQL RIGHT JOIN', '/cours/jointures/right-join')],
  },
  {
    slug: 'full-join',
    label: 'FULL JOIN',
    family: 'Joins and sets',
    summary: 'Keep everything on both sides, matched where possible.',
    doc: d('SQL FULL JOIN', '/cours/jointures/full-join'),
  },
  {
    slug: 'cross-join',
    label: 'CROSS JOIN',
    family: 'Joins and sets',
    summary: 'Every row against every row. Deliberately, not by accident.',
    doc: d('SQL CROSS JOIN', '/cours/jointures/cross-join'),
  },
  {
    slug: 'self-join',
    label: 'SELF JOIN',
    family: 'Joins and sets',
    summary: 'Join a table to itself to compare rows with their neighbours.',
    doc: d('SQL SELF JOIN', '/cours/jointures/self-join'),
  },
  {
    slug: 'natural-join',
    label: 'NATURAL JOIN',
    family: 'Joins and sets',
    summary: 'Joins on every shared column name, which is why it is rarely safe.',
    doc: d('SQL NATURAL JOIN', '/cours/jointures/natural-join'),
  },
  {
    slug: 'union',
    label: 'UNION',
    family: 'Joins and sets',
    summary: 'Stack two result sets vertically.',
    doc: d('SQL UNION', '/cours/union'),
    extra: [d('SQL UNION ALL', '/cours/union/union-all')],
  },
  {
    slug: 'intersect',
    label: 'INTERSECT',
    family: 'Joins and sets',
    summary: 'Rows present in both results.',
    doc: d('SQL INTERSECT', '/cours/intersect'),
  },
  {
    slug: 'except',
    label: 'EXCEPT',
    family: 'Joins and sets',
    summary: 'Rows in the first result and not the second. The shape of most reconciliations.',
    doc: d('SQL EXCEPT / MINUS', '/cours/except'),
  },

  // Aggregation
  {
    slug: 'aggregates',
    label: 'Aggregate functions',
    family: 'Aggregation',
    summary: 'Reduce many rows to one number.',
    doc: d("Fonctions d'agrégation", '/fonctions/agregation'),
    extra: [
      d('COUNT()', '/fonctions/agregation/count'),
      d('SUM()', '/fonctions/agregation/sum'),
      d('AVG()', '/fonctions/agregation/avg'),
      d('MIN()', '/fonctions/agregation/min'),
      d('MAX()', '/fonctions/agregation/max'),
    ],
  },
  {
    slug: 'group-by',
    label: 'GROUP BY',
    family: 'Aggregation',
    summary: 'Split rows into buckets, then aggregate each bucket.',
    doc: d('SQL GROUP BY', '/cours/group-by'),
    extra: [d('GROUP BY WITH ROLLUP', '/cours/group-by/with-rollup')],
  },
  {
    slug: 'having',
    label: 'HAVING',
    family: 'Aggregation',
    summary: 'Filter the groups themselves, after aggregation. WHERE cannot do this.',
    doc: d('SQL HAVING', '/cours/having'),
  },

  // Subqueries
  {
    slug: 'subquery',
    label: 'Subqueries',
    family: 'Subqueries',
    summary: 'A query used as a value, a list, or a table.',
    doc: d('SQL Sous-requête', '/cours/sous-requete'),
  },
  {
    slug: 'correlated',
    label: 'Correlated subqueries',
    family: 'Subqueries',
    summary: 'A subquery that re-runs for each outer row, referring back to it.',
    doc: d('SQL Sous-requête', '/cours/sous-requete'),
    extra: [d('SQL EXISTS', '/cours/where/exists')],
  },
  {
    slug: 'cte',
    label: 'Common table expressions',
    family: 'Subqueries',
    summary: 'Name a subquery up front with WITH, then use it like a table.',
    doc: d('SQL Sous-requête', '/cours/sous-requete'),
    note: 'sql.sh has no dedicated WITH page; a CTE is a named subquery, so read the sous-requête chapter first.',
  },
  {
    slug: 'recursive-cte',
    label: 'Recursive CTEs',
    family: 'Subqueries',
    summary: 'A CTE that refers to itself, walking a hierarchy one level at a time.',
    doc: d('SQL Sous-requête', '/cours/sous-requete'),
    note: 'Recursion is a SQLite and PostgreSQL extension of WITH: WITH RECURSIVE name AS (anchor UNION ALL step).',
  },

  // Analytics
  {
    slug: 'window-functions',
    label: 'Window functions',
    family: 'Analytics',
    summary: 'Aggregate across a window of rows without collapsing them.',
    doc: d('SQL GROUP BY', '/cours/group-by'),
    note: 'sql.sh does not cover OVER() yet. Compare it with GROUP BY: same maths, but every row survives.',
  },
  {
    slug: 'ranking',
    label: 'Ranking',
    family: 'Analytics',
    summary: 'ROW_NUMBER, RANK and DENSE_RANK, and the difference that trips everyone.',
    doc: d('SQL ORDER BY', '/cours/order-by'),
    note: 'Ranking functions are window functions: RANK() OVER (PARTITION BY ... ORDER BY ...).',
  },
  {
    slug: 'frames',
    label: 'Window frames',
    family: 'Analytics',
    summary: 'Running totals and moving averages, defined by ROWS BETWEEN.',
    doc: d("Fonctions d'agrégation", '/fonctions/agregation'),
    note: 'A frame narrows the window per row: ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW.',
  },

  // Writing data
  {
    slug: 'insert',
    label: 'INSERT INTO',
    family: 'Writing data',
    summary: 'Add rows, one at a time or straight from a SELECT.',
    doc: d('SQL INSERT INTO', '/cours/insert-into'),
  },
  {
    slug: 'upsert',
    label: 'UPSERT',
    family: 'Writing data',
    summary: 'Insert, or update instead when the row already exists.',
    doc: d('SQL ON DUPLICATE KEY UPDATE', '/cours/insert-into/on-duplicate-key'),
    note: 'SQLite spells it INSERT ... ON CONFLICT (col) DO UPDATE SET ...',
  },
  {
    slug: 'update',
    label: 'UPDATE',
    family: 'Writing data',
    summary: 'Change rows in place. The WHERE clause is the whole job.',
    doc: d('SQL UPDATE', '/cours/update'),
  },
  {
    slug: 'delete',
    label: 'DELETE',
    family: 'Writing data',
    summary: 'Remove rows, and understand what you can no longer get back.',
    doc: d('SQL DELETE', '/cours/delete'),
    extra: [d('SQL TRUNCATE TABLE', '/cours/truncate-table')],
  },
  {
    slug: 'merge',
    label: 'MERGE',
    family: 'Writing data',
    summary: 'Reconcile a source into a target in one statement.',
    doc: d('SQL MERGE', '/cours/merge'),
    note: 'SQLite has no MERGE; the equivalent is INSERT ... ON CONFLICT DO UPDATE.',
  },

  // Transactions and recovery
  {
    slug: 'transactions',
    label: 'Transactions',
    family: 'Transactions and recovery',
    summary: 'All of it happens, or none of it does.',
    doc: d('SQL Cours', '/cours'),
    note: 'BEGIN, COMMIT and ROLLBACK are the three words that make recovery possible.',
  },
  {
    slug: 'savepoints',
    label: 'Savepoints',
    family: 'Transactions and recovery',
    summary: 'Bookmarks inside a transaction you can rewind to without losing everything.',
    doc: d('SQL Cours', '/cours'),
    note: 'SAVEPOINT name / ROLLBACK TO name / RELEASE name.',
  },
  {
    slug: 'recovery',
    label: 'Data recovery',
    family: 'Transactions and recovery',
    summary: 'Rebuilding truth from snapshots, journals and audit logs after something breaks.',
    doc: d('SQLite', '/sgbd/sqlite'),
    note: 'Recovery is not one command. It is a snapshot, plus a journal, replayed in order.',
  },
  {
    slug: 'triggers',
    label: 'Triggers',
    family: 'Transactions and recovery',
    summary: 'Code the database runs for you whenever a row changes.',
    doc: d('CREATE TRIGGER', '/cours/create-trigger'),
  },
  {
    slug: 'procedures',
    label: 'Stored procedures',
    family: 'Transactions and recovery',
    summary: 'Named, reusable blocks of SQL stored in the database itself.',
    doc: d('Procédure stockée', '/cours/procedure-stockee'),
    note: 'SQLite has no stored procedures; the same job is done with views, triggers and application code.',
  },

  // Schema and constraints
  {
    slug: 'create-table',
    label: 'CREATE TABLE',
    family: 'Schema and constraints',
    summary: 'Declare what a row is allowed to be.',
    doc: d('SQL CREATE TABLE', '/cours/create-table'),
  },
  {
    slug: 'primary-key',
    label: 'PRIMARY KEY',
    family: 'Schema and constraints',
    summary: 'The column that identifies a row and refuses duplicates.',
    doc: d('SQL PRIMARY KEY', '/cours/create-table/primary-key'),
    extra: [d('AUTO_INCREMENT', '/cours/create-table/auto_increment')],
  },
  {
    slug: 'foreign-key',
    label: 'FOREIGN KEY',
    family: 'Schema and constraints',
    summary: 'A promise that a reference points at something real.',
    doc: d('SQL CREATE TABLE', '/cours/create-table'),
    note: 'In SQLite foreign keys are only enforced after PRAGMA foreign_keys = ON.',
  },
  {
    slug: 'constraints',
    label: 'CHECK, UNIQUE, DEFAULT',
    family: 'Schema and constraints',
    summary: 'Rules the database enforces so your application does not have to.',
    doc: d('SQL CREATE TABLE', '/cours/create-table'),
  },
  {
    slug: 'alter-table',
    label: 'ALTER TABLE',
    family: 'Schema and constraints',
    summary: 'Change a table that already holds data, without losing it.',
    doc: d('SQL ALTER TABLE', '/cours/alter-table'),
    extra: [d('SQL DROP TABLE', '/cours/drop-table')],
  },
  {
    slug: 'views',
    label: 'Views',
    family: 'Schema and constraints',
    summary: 'A saved query that behaves like a table.',
    doc: d('SQL CREATE TABLE', '/cours/create-table'),
    note: 'CREATE VIEW name AS SELECT ... — the query runs fresh every time you read it.',
  },
  {
    slug: 'normalisation',
    label: 'Normalisation',
    family: 'Schema and constraints',
    summary: 'One fact in one place. Everything else is a copy waiting to disagree.',
    doc: d('SQL CREATE TABLE', '/cours/create-table'),
    note: 'A repeating comma-separated column is the classic first-normal-form violation.',
  },
  {
    slug: 'cast',
    label: 'Types and CAST',
    family: 'Schema and constraints',
    summary: 'Convert a value from one type to another, deliberately.',
    doc: d('SQL CAST()', '/fonctions/cast'),
    extra: [d('SQL CONVERT()', '/fonctions/convert')],
  },

  // Performance
  {
    slug: 'indexes',
    label: 'Indexes',
    family: 'Performance',
    summary: 'A lookup structure that turns a scan into a seek.',
    doc: d('Index SQL', '/cours/index'),
    extra: [d('SQL CREATE INDEX', '/cours/index/create')],
  },
  {
    slug: 'explain',
    label: 'EXPLAIN',
    family: 'Performance',
    summary: 'Ask the database what it intends to do before it does it.',
    doc: d('SQL EXPLAIN', '/cours/explain'),
    note: 'SQLite spells it EXPLAIN QUERY PLAN.',
  },
  {
    slug: 'optimisation',
    label: 'Optimisation',
    family: 'Performance',
    summary: 'Making a correct query fast without making it wrong.',
    doc: d('Optimisation', '/optimisation'),
    extra: [d('SQL OPTIMIZE', '/cours/optimize')],
  },

  // Engines
  {
    slug: 'sqlite',
    label: 'SQLite',
    family: 'Engines',
    summary: 'The engine this game runs on, compiled to WebAssembly in your browser.',
    doc: d('SQLite', '/sgbd/sqlite'),
    extra: [d('Systèmes de gestion de base de données', '/sgbd')],
  },
  {
    slug: 'dialects',
    label: 'Dialect differences',
    family: 'Engines',
    summary: 'Where MySQL, PostgreSQL, SQL Server and SQLite quietly disagree.',
    doc: d('SGBD', '/sgbd'),
    extra: [
      d('MySQL', '/sgbd/mysql'),
      d('PostgreSQL', '/sgbd/postgresql'),
      d('SQL Server', '/sgbd/sql-server'),
    ],
  },
];

const conceptBySlug = new Map(CONCEPTS.map((c) => [c.slug, c]));

export function getConcept(slug: string): Concept | undefined {
  return conceptBySlug.get(slug);
}

/** Builds the doc-link list shown on a level from its concept slugs. */
export function docsFor(slugs: string[]): DocLink[] {
  const seen = new Set<string>();
  const links: DocLink[] = [];
  for (const slug of slugs) {
    const concept = conceptBySlug.get(slug);
    if (!concept) continue;
    for (const link of [concept.doc, ...(concept.extra ?? [])]) {
      if (seen.has(link.url)) continue;
      seen.add(link.url);
      links.push(link);
    }
  }
  return links;
}

export const CONCEPT_FAMILIES: ConceptFamily[] = [
  'Reading data',
  'Filtering',
  'Sorting and shaping',
  'Functions',
  'Joins and sets',
  'Aggregation',
  'Subqueries',
  'Analytics',
  'Writing data',
  'Transactions and recovery',
  'Schema and constraints',
  'Performance',
  'Engines',
];

export const DOCS_HOME = 'https://sql.sh/';
export const DOCS_EXERCISES = 'https://sql.sh/exercices-sql';
