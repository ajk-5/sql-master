import { defineAct } from './util';

export const act5 = defineAct('nexus', [
  {
    id: 79,
    title: 'Declaring a Shape',
    kind: 'mutation',
    dataset: 'nexus',
    story:
      'The architect who built the ninth floor died in March and left a schema nobody can extend. Until now you have only read tables that somebody else designed. The rest of this act is about being that somebody. Start by declaring what a row is allowed to be.',
    objective:
      'Create a table named archive_boxes with four columns in this order: id as INTEGER and the primary key, label as TEXT, node_id as INTEGER, and opened_on as TEXT.',
    concepts: ['create-table', 'primary-key'],
    check:
      "SELECT name, type, pk FROM pragma_table_info('archive_boxes') ORDER BY cid;",
    requireKeywords: ['CREATE TABLE'],
    solution: `CREATE TABLE archive_boxes (
  id        INTEGER PRIMARY KEY,
  label     TEXT,
  node_id   INTEGER,
  opened_on TEXT
);`,
    hints: [
      'CREATE TABLE name (column type constraints, ...);',
      'A column marked PRIMARY KEY identifies the row and cannot repeat.',
      'In SQLite, INTEGER PRIMARY KEY is special: it becomes the row id itself.',
    ],
    xp: 130,
    badge: 'architect',
  },
  {
    id: 80,
    title: 'Rules the Database Enforces',
    kind: 'mutation',
    dataset: 'nexus',
    story:
      'A comment in the retention policy says days must be positive. Comments do not stop anybody. A CHECK constraint does, and it does it for every application that will ever connect, including the one somebody writes after you leave.',
    objective:
      'Create a table named retention_rules with: id INTEGER PRIMARY KEY; name TEXT that cannot be null; days INTEGER that cannot be null, defaults to 90, and is constrained to be greater than 0; and active INTEGER that cannot be null and defaults to 1.',
    concepts: ['constraints', 'create-table'],
    check: `INSERT INTO retention_rules (id, name) VALUES (1, 'probe');
SELECT r.id, r.name, r.days, r.active,
       (SELECT COUNT(*) FROM sqlite_master m
        WHERE m.name = 'retention_rules' AND UPPER(m.sql) LIKE '%CHECK%') AS has_check
FROM retention_rules r;`,
    requireKeywords: ['CHECK', 'DEFAULT', 'NOT NULL'],
    solution: `CREATE TABLE retention_rules (
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL,
  days   INTEGER NOT NULL DEFAULT 90 CHECK (days > 0),
  active INTEGER NOT NULL DEFAULT 1
);`,
    hints: [
      'NOT NULL, DEFAULT and CHECK are written after the column type, in that order.',
      'CHECK takes any boolean expression over the row.',
      'The grader inserts a row supplying only id and name, so your defaults have to fill the rest.',
    ],
    xp: 135,
  },
  {
    id: 81,
    title: 'No Two the Same',
    kind: 'mutation',
    dataset: 'nexus',
    story:
      'Two of the intake rows carry the same address written two different ways, and the only reason that was possible is that nobody told the database it mattered. UNIQUE is how you say it matters.',
    objective:
      'Create a table named mailboxes with id INTEGER PRIMARY KEY, address TEXT that cannot be null and must be unique, and owner TEXT. Then insert two rows: id 1 with address ops@nexus.example and owner Platform, and id 2 with address ops@nexus.example.upper and owner Insight.',
    concepts: ['constraints', 'create-table'],
    check: `SELECT (SELECT COUNT(*) FROM pragma_index_list('mailboxes') WHERE "unique" = 1) AS unique_indexes,
       (SELECT COUNT(*) FROM mailboxes) AS rows_stored,
       (SELECT address FROM mailboxes WHERE id = 1) AS first_address;`,
    requireKeywords: ['UNIQUE'],
    solution: `CREATE TABLE mailboxes (
  id      INTEGER PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  owner   TEXT
);
INSERT INTO mailboxes (id, address, owner) VALUES
  (1, 'ops@nexus.example', 'Platform'),
  (2, 'ops@nexus.example.upper', 'Insight');`,
    hints: [
      'UNIQUE creates an index behind the scenes, which is why it can reject duplicates cheaply.',
      'A primary key is a unique constraint that has also been chosen as the identity of the row.',
      'The two addresses differ, so both inserts succeed. Making them identical would raise an error.',
    ],
    xp: 140,
  },
  {
    id: 82,
    title: 'A Promise Between Tables',
    kind: 'mutation',
    dataset: 'nexus',
    story:
      'The nodes table is a tree of floors, wings, rooms and racks. If you attach a box to node 900, which does not exist, nothing stops you and nothing tells you. A foreign key turns that from a silent data-quality problem into an error at the moment of the mistake.',
    objective:
      'Create a table named node_boxes with id INTEGER PRIMARY KEY, node_id INTEGER that cannot be null and references the id column of nodes, and label TEXT. Then insert id 1 with node_id 13 and label Ledger box.',
    concepts: ['foreign-key', 'create-table'],
    check: `SELECT (SELECT COUNT(*) FROM pragma_foreign_key_list('node_boxes')) AS fk_count,
       (SELECT "table" FROM pragma_foreign_key_list('node_boxes')) AS references_table,
       (SELECT "to" FROM pragma_foreign_key_list('node_boxes')) AS references_column,
       (SELECT label FROM node_boxes WHERE id = 1) AS stored_label;`,
    requireKeywords: ['REFERENCES'],
    solution: `CREATE TABLE node_boxes (
  id      INTEGER PRIMARY KEY,
  node_id INTEGER NOT NULL REFERENCES nodes(id),
  label   TEXT
);
INSERT INTO node_boxes (id, node_id, label) VALUES (1, 13, 'Ledger box');`,
    hints: [
      'REFERENCES parent(column) declares the relationship on the child column.',
      'SQLite only enforces foreign keys when PRAGMA foreign_keys = ON, which this game sets for you.',
      'Try node_id 900 afterwards in the sandbox and watch the insert be refused.',
    ],
    xp: 145,
    badge: 'keeper-of-keys',
  },
  {
    id: 83,
    title: 'Changing a Table That Is In Use',
    kind: 'mutation',
    dataset: 'nexus',
    story:
      'The security review wants to know when each account was last seen, and the users table has ten live rows you are not allowed to drop and recreate. Adding a column to a populated table is the most common schema change there is, and the most commonly feared.',
    objective:
      'Add a column named last_seen of type TEXT to the users table, then set it for every user to the start time of their most recent session, leaving it NULL for users who have never had one.',
    concepts: ['alter-table', 'update', 'correlated'],
    check: `SELECT u.id, u.handle, u.last_seen,
       (SELECT COUNT(*) FROM pragma_table_info('users')) AS column_count
FROM users u ORDER BY u.id;`,
    requireKeywords: ['ALTER TABLE'],
    solution: `ALTER TABLE users ADD COLUMN last_seen TEXT;

UPDATE users
SET last_seen = (
  SELECT MAX(s.started_at) FROM sessions s WHERE s.user_id = users.id
);`,
    hints: [
      'ALTER TABLE name ADD COLUMN column type. Existing rows get NULL in the new column.',
      'A correlated MAX gives each user their latest session.',
      'A user with no sessions gets NULL from the subquery, which is exactly what is wanted.',
    ],
    xp: 150,
  },
  {
    id: 84,
    title: 'A Number Wearing a Coat',
    kind: 'query',
    dataset: 'nexus',
    story:
      'Every size in the intake table is stored as text: 1200 MB, 75 MB, 15000 MB. Text sorts alphabetically, so 75 comes after 15000 and the retention report has been wrong for two years. Types are not bureaucracy. They are what makes comparison mean anything.',
    objective:
      'Return each intake row as id, asset_name and a column named size_mb holding the numeric part of size_text as an integer, largest first, then by id. Row order is graded.',
    concepts: ['cast', 'string-functions'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['CAST'],
    solution: `SELECT id, asset_name,
       CAST(REPLACE(size_text, ' MB', '') AS INTEGER) AS size_mb
FROM raw_intake
ORDER BY size_mb DESC, id;`,
    hints: [
      'Strip the unit off the text first, then convert what is left.',
      'CAST(value AS INTEGER) is the portable spelling of a type conversion.',
      "REPLACE(size_text, ' MB', '') removes the suffix.",
    ],
    xp: 155,
  },
  {
    id: 85,
    title: 'A Query That Behaves Like a Table',
    kind: 'mutation',
    dataset: 'nexus',
    story:
      'Six different reports each rewrite the same filter for live access grants, and three of them get the expiry logic subtly wrong. Write it once, name it, and let everybody read the name instead.',
    objective:
      'Create a view named active_grants returning, for every grant that has no expiry or whose expires_at is after 2026-06-03, the columns id, user_id, node_id and grant_kind in that order.',
    concepts: ['views', 'is-null'],
    strictColumns: true,
    check: 'SELECT id, user_id, node_id, grant_kind FROM active_grants ORDER BY id;',
    requireKeywords: ['CREATE VIEW'],
    solution: `CREATE VIEW active_grants AS
SELECT id, user_id, node_id, grant_kind
FROM role_grants
WHERE expires_at IS NULL OR expires_at > '2026-06-03';`,
    hints: [
      'CREATE VIEW name AS SELECT ... stores the query, not its results.',
      'Reading the view runs the query again, so it is always current.',
      'Remember that a NULL expiry means no expiry, and needs its own test.',
    ],
    xp: 160,
    badge: 'the-named-query',
  },
  {
    id: 86,
    title: 'What the Planner Intends',
    kind: 'query',
    dataset: 'nexus',
    story:
      'Every morning at nine the ninth floor freezes for twenty seconds. Three analysts run the same report and the machine stops answering. Before optimising anything, ask the database what it plans to do, because guessing is how people add indexes that never get used.',
    objective:
      'Ask the query planner what it will do for: SELECT host, cpu FROM metrics WHERE host = \'rack-a1\' AND taken_at >= \'2026-06-02\'. Return the plan itself.',
    concepts: ['explain', 'optimisation'],
    requireKeywords: ['EXPLAIN QUERY PLAN'],
    solution: `EXPLAIN QUERY PLAN
SELECT host, cpu FROM metrics
WHERE host = 'rack-a1' AND taken_at >= '2026-06-02';`,
    hints: [
      'SQLite spells it EXPLAIN QUERY PLAN, written in front of the query you are asking about.',
      'The word SCAN in the plan means every row is being read.',
      'The word SEARCH means the engine can jump straight to the rows it needs.',
    ],
    xp: 165,
  },
  {
    id: 87,
    title: 'Building the Shortcut',
    kind: 'mutation',
    dataset: 'nexus',
    story:
      'The plan said SCAN. The table is read by host and then narrowed by time, in that order, every single morning. An index in that same order turns the morning scan into a seek.',
    objective:
      'Create an index named idx_metrics_host_time on the metrics table over the columns host and taken_at, in that order.',
    concepts: ['indexes'],
    check: `SELECT il.name AS index_name, ii.seqno, ii.name AS column_name
FROM pragma_index_list('metrics') il
JOIN pragma_index_info(il.name) ii
ORDER BY il.name, ii.seqno;`,
    requireKeywords: ['CREATE INDEX'],
    solution: 'CREATE INDEX idx_metrics_host_time ON metrics(host, taken_at);',
    hints: [
      'CREATE INDEX name ON table(column, column);',
      'Column order in a composite index matters: it can be used for the first column alone, but not the second alone.',
      'An index costs space and slows writes. That is the trade you are making.',
    ],
    xp: 170,
    badge: 'the-index-finger',
  },
  {
    id: 88,
    title: 'Proving It Worked',
    kind: 'query',
    dataset: 'nexus',
    story:
      'An optimisation you have not measured is a rumour. Build the index and ask the planner the same question again, in one submission, so the before and after are not separated by a week of assumptions.',
    objective:
      'Create the index idx_metrics_host_time on metrics over host and taken_at, then return the query plan for: SELECT host, cpu FROM metrics WHERE host = \'rack-a1\' AND taken_at >= \'2026-06-02\'. The plan is the answer.',
    concepts: ['indexes', 'explain', 'optimisation'],
    requireKeywords: ['CREATE INDEX', 'EXPLAIN QUERY PLAN'],
    solution: `CREATE INDEX idx_metrics_host_time ON metrics(host, taken_at);

EXPLAIN QUERY PLAN
SELECT host, cpu FROM metrics
WHERE host = 'rack-a1' AND taken_at >= '2026-06-02';`,
    hints: [
      'Several statements can be submitted at once; the graded answer is the last result returned.',
      'The plan should now read SEARCH rather than SCAN.',
      'COVERING INDEX in the plan means the index alone answered the query, without touching the table.',
    ],
    xp: 175,
  },
  {
    id: 89,
    title: 'The Index It Cannot Use',
    kind: 'query',
    dataset: 'nexus',
    story:
      'Here is the trap that costs more production time than any other. There is an index on the column. The query filters on that column. And the index is useless, because the column has been wrapped in a function, and the engine has no way to know that SUBSTR of the stored value has anything to do with the stored order.',
    objective:
      'Create an index named idx_documents_written on documents over written_at, then return the query plan for: SELECT id FROM documents WHERE SUBSTR(written_at, 1, 4) = \'2026\'. The plan is the answer, and it will not say SEARCH.',
    concepts: ['indexes', 'explain', 'optimisation'],
    requireKeywords: ['CREATE INDEX', 'SUBSTR'],
    solution: `CREATE INDEX idx_documents_written ON documents(written_at);

EXPLAIN QUERY PLAN
SELECT id FROM documents WHERE SUBSTR(written_at, 1, 4) = '2026';`,
    hints: [
      'An index stores the column values in order. A function of those values is in a different order entirely.',
      "The fix in real work is to rewrite the filter as a range: written_at >= '2026-01-01' AND written_at < '2027-01-01'.",
      'Keep the column bare on one side of the comparison and the index stays usable.',
    ],
    xp: 180,
  },
  {
    id: 90,
    title: 'The Database Watching Itself',
    kind: 'mutation',
    dataset: 'nexus',
    story:
      'Somebody deleted Cabinet 1 from the archive at one minute past midnight and there is no record of it beyond a line in an event log that the same person could have written. A trigger is the database keeping its own notes, and it fires whether or not the application remembered to.',
    objective:
      'Create a table named node_bin with columns id INTEGER, name TEXT and removed_at TEXT. Create a trigger named node_delete_log that fires after any delete on nodes and writes the deleted row id, its name, and the literal timestamp 2026-06-04 09:00 into node_bin. Then delete node 25.',
    concepts: ['triggers', 'delete', 'procedures'],
    check: `SELECT (SELECT COUNT(*) FROM nodes) AS nodes_left,
       b.id, b.name, b.removed_at
FROM node_bin b ORDER BY b.id;`,
    requireKeywords: ['CREATE TRIGGER'],
    solution: `CREATE TABLE node_bin (id INTEGER, name TEXT, removed_at TEXT);

CREATE TRIGGER node_delete_log AFTER DELETE ON nodes
BEGIN
  INSERT INTO node_bin (id, name, removed_at)
  VALUES (OLD.id, OLD.name, '2026-06-04 09:00');
END;

DELETE FROM nodes WHERE id = 25;`,
    hints: [
      'A trigger body sits between BEGIN and END, and each statement inside ends with a semicolon.',
      'OLD refers to the row as it was before the delete. On an update trigger you also get NEW.',
      'Create the trigger before the delete, or there is nothing to fire.',
      'Triggers and stored procedures are the two ways a database runs your code for you. SQLite offers only the first.',
    ],
    xp: 185,
  },
  {
    id: 91,
    title: 'Reading Inside the Blob',
    kind: 'query',
    dataset: 'nexus',
    story:
      'The users table stores preferences as JSON in a text column, which is how half the schemas in the world store the parts nobody wanted to design. The security review needs everyone without multi-factor authentication, and that fact is buried inside the string.',
    objective:
      'Return the handle, role and a column named quota_gb holding the quota_gb value from the settings JSON, for every user whose settings say mfa is false. Order by handle. Row order is graded.',
    concepts: ['string-functions', 'sqlite'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['json_extract'],
    solution: `SELECT handle, role,
       json_extract(settings, '$.quota_gb') AS quota_gb
FROM users
WHERE json_extract(settings, '$.mfa') = 0
ORDER BY handle;`,
    hints: [
      "json_extract(column, '$.key') pulls one value out of a JSON document.",
      'JSON true and false come back as 1 and 0.',
      'A value you filter on often should probably be a real column, not a key in a blob.',
    ],
    xp: 190,
    badge: 'json-whisperer',
  },
  {
    id: 92,
    title: 'The Twenty Second Morning',
    kind: 'query',
    dataset: 'nexus',
    story:
      'The events table logs every query with its duration inside a JSON payload. Now that you can read into the payload, put a number on the freeze that has been costing this floor an hour a week.',
    objective:
      'For every event of kind query, return id, actor, a column named ms holding the ms value from the payload and a column named plan holding the plan value from the payload, slowest first, then by id. Row order is graded.',
    concepts: ['string-functions', 'sqlite'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['json_extract'],
    solution: `SELECT id, actor,
       json_extract(payload, '$.ms') AS ms,
       json_extract(payload, '$.plan') AS plan
FROM events
WHERE kind = 'query'
ORDER BY ms DESC, id;`,
    hints: [
      'Extract two keys from the same document by calling json_extract twice.',
      'The extracted number sorts numerically, unlike the raw text of the document.',
      'Notice which plan text belongs to the one fast query in the list.',
    ],
    xp: 195,
  },
  {
    id: 93,
    title: 'Walking the Building',
    kind: 'query',
    dataset: 'nexus',
    story:
      'The nodes table is the building itself: root, floors, wings, rooms, racks, and the drives inside them. Nobody has ever printed it as a tree, because parent_id only shows one link and the depth is not stored anywhere. Recursion builds the path as it descends.',
    objective:
      'Starting from the node with no parent, return every node as id, a column named depth holding how many levels below the root it sits with the root at 0, and a column named path holding the names from the root to that node joined by the three characters space slash space. Order by path. Row order is graded.',
    concepts: ['recursive-cte', 'string-functions'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['RECURSIVE'],
    solution: `WITH RECURSIVE walk AS (
  SELECT id, name, 0 AS depth, name AS path
  FROM nodes
  WHERE parent_id IS NULL
  UNION ALL
  SELECT n.id, n.name, w.depth + 1, w.path || ' / ' || n.name
  FROM nodes n
  JOIN walk w ON n.parent_id = w.id
)
SELECT id, depth, path
FROM walk
ORDER BY path;`,
    hints: [
      'Carry the accumulated path along as a column and extend it at every step.',
      'The anchor row is the one whose parent_id IS NULL.',
      "w.path || ' / ' || n.name builds the next path from the previous one.",
    ],
    xp: 200,
  },
  {
    id: 94,
    title: 'One Fact Per Row',
    kind: 'mutation',
    dataset: 'nexus',
    story:
      'The intake table has a column called tags holding urgent,retain,legal. That single comma is a design decision, and everything downstream pays for it: you cannot index it, you cannot count it, and you cannot ask which assets are on legal hold without a LIKE that also matches the word illegal. Split it out.',
    objective:
      'Create a table named intake_tags with columns intake_id INTEGER and tag TEXT, and fill it with one row per tag per intake row, ignoring intake rows whose tags column is empty.',
    concepts: ['normalisation', 'recursive-cte', 'insert'],
    check: 'SELECT intake_id, tag FROM intake_tags ORDER BY intake_id, tag;',
    requireKeywords: ['RECURSIVE', 'intake_tags'],
    solution: `CREATE TABLE intake_tags (intake_id INTEGER, tag TEXT);

INSERT INTO intake_tags (intake_id, tag)
WITH RECURSIVE split(id, tag, rest) AS (
  SELECT id, '', tags || ',' FROM raw_intake WHERE tags <> ''
  UNION ALL
  SELECT id,
         SUBSTR(rest, 1, INSTR(rest, ',') - 1),
         SUBSTR(rest, INSTR(rest, ',') + 1)
  FROM split
  WHERE rest <> ''
)
SELECT id, tag FROM split WHERE tag <> '';`,
    hints: [
      'Append a trailing comma so every tag, including the last, ends with a delimiter.',
      'Each recursive step bites off the text before the first comma and keeps the remainder.',
      'The anchor row produces an empty tag, which the final WHERE discards.',
    ],
    xp: 205,
    badge: 'normaliser',
  },
  {
    id: 95,
    title: 'The Requester Is Not a String',
    kind: 'mutation',
    dataset: 'nexus',
    story:
      'A. Reyes appears in the intake table three times, with the same email typed out three times, in a department typed out three times. Change the department once and you must change it three times, which means one day it will be changed twice. Give the person a table and a number.',
    objective:
      'Create a table named requesters with id INTEGER PRIMARY KEY, name TEXT not null and unique, email TEXT not null and dept TEXT not null, and populate it with one row per distinct requester from raw_intake. Then add a requester_id INTEGER column to raw_intake and set it on every row to point at the matching requester.',
    concepts: ['normalisation', 'create-table', 'alter-table', 'insert'],
    check: `SELECT ri.id AS intake_id, r.name, r.email, r.dept,
       (SELECT COUNT(*) FROM requesters) AS requester_count
FROM raw_intake ri
JOIN requesters r ON r.id = ri.requester_id
ORDER BY ri.id;`,
    requireKeywords: ['CREATE TABLE', 'ALTER TABLE', 'DISTINCT'],
    solution: `CREATE TABLE requesters (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  dept  TEXT NOT NULL
);

INSERT INTO requesters (name, email, dept)
SELECT DISTINCT requester, requester_mail, dept FROM raw_intake;

ALTER TABLE raw_intake ADD COLUMN requester_id INTEGER;

UPDATE raw_intake
SET requester_id = (SELECT r.id FROM requesters r WHERE r.name = raw_intake.requester);`,
    hints: [
      'SELECT DISTINCT over the three requester columns gives you exactly one row per person.',
      'Let the primary key generate itself rather than inventing ids by hand.',
      'Then backfill the new column by matching on the natural key you already have.',
    ],
    xp: 210,
  },
  {
    id: 96,
    title: 'The Floor Releases You',
    kind: 'mutation',
    dataset: 'nexus',
    story:
      'One submission, and the ninth floor is somebody else problem. Build the intake table the architect should have built: typed, constrained, keyed to the requester table, indexed on the column every report filters by, and fronted by a view so nobody downstream has to know any of this happened.',
    objective:
      'Create requesters as in the previous case and populate it from the distinct requesters in raw_intake. Create a table named intake with id INTEGER PRIMARY KEY, requester_id INTEGER not null referencing requesters(id), asset_name TEXT not null, asset_kind TEXT not null, size_mb INTEGER not null, and approved TEXT not null constrained to be one of yes, no or pending. Populate intake from raw_intake, converting size_text to an integer number of megabytes. Create an index named idx_intake_requester on intake(requester_id). Finally create a view named intake_open returning asset_name, a column named requester_name holding the requester name, and size_mb, for every intake row that is not approved yes.',
    concepts: [
      'create-table',
      'foreign-key',
      'constraints',
      'indexes',
      'views',
      'normalisation',
      'cast',
    ],
    check: `SELECT v.asset_name, v.requester_name, v.size_mb,
       (SELECT COUNT(*) FROM pragma_foreign_key_list('intake')) AS fk_count,
       (SELECT COUNT(*) FROM pragma_index_list('intake') WHERE name = 'idx_intake_requester') AS index_count,
       (SELECT COUNT(*) FROM sqlite_master WHERE name = 'intake' AND UPPER(sql) LIKE '%CHECK%') AS has_check
FROM intake_open v
ORDER BY v.asset_name;`,
    requireKeywords: ['CREATE TABLE', 'CREATE INDEX', 'CREATE VIEW', 'REFERENCES', 'CHECK'],
    solution: `CREATE TABLE requesters (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  dept  TEXT NOT NULL
);

INSERT INTO requesters (name, email, dept)
SELECT DISTINCT requester, requester_mail, dept FROM raw_intake;

CREATE TABLE intake (
  id           INTEGER PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES requesters(id),
  asset_name   TEXT NOT NULL,
  asset_kind   TEXT NOT NULL,
  size_mb      INTEGER NOT NULL,
  approved     TEXT NOT NULL CHECK (approved IN ('yes', 'no', 'pending'))
);

INSERT INTO intake (id, requester_id, asset_name, asset_kind, size_mb, approved)
SELECT ri.id,
       r.id,
       ri.asset_name,
       ri.asset_kind,
       CAST(REPLACE(ri.size_text, ' MB', '') AS INTEGER),
       ri.approved
FROM raw_intake ri
JOIN requesters r ON r.name = ri.requester;

CREATE INDEX idx_intake_requester ON intake(requester_id);

CREATE VIEW intake_open AS
SELECT i.asset_name, r.name AS requester_name, i.size_mb
FROM intake i
JOIN requesters r ON r.id = i.requester_id
WHERE i.approved <> 'yes';`,
    hints: [
      'Build it in dependency order: the parent table, then its rows, then the child table, then the index and the view.',
      'The CHECK constraint is written CHECK (approved IN (...)) and belongs on the column.',
      'The view is the only thing the rest of the company should ever need to know about.',
    ],
    xp: 280,
    badge: 'case-five-closed',
  },
]);
