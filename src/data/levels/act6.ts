import { defineAct } from './util';

export const act6 = defineAct('archivist', [
  {
    id: 97,
    title: 'The Room Nobody Mentioned',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'Someone has been going back through every case you have closed and removing themselves from it. Start where you started. Three people walked into the study in the twenty minutes before Lord Blackwood died, and only one of them ever admitted to it in a statement. The other two are the beginning of the trail.',
    objective:
      'Return the id and name of every guest who was recorded entering room 3 between 22:30 and 22:50 on 4 November 1923 but who never gave a statement placing them in room 3. Order by id. Row order is graded.',
    concepts: ['exists', 'inner-join', 'where'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT DISTINCT g.id, g.name
FROM movements m
JOIN guests g ON g.id = m.guest_id
WHERE m.room_id = 3
  AND m.seen_at BETWEEN '1923-11-04 22:30' AND '1923-11-04 22:50'
  AND NOT EXISTS (
    SELECT 1 FROM statements s
    WHERE s.guest_id = g.id AND s.claimed_room = 3
  )
ORDER BY g.id;`,
    hints: [
      'Two sources: where the movements say they were, and what the statements say they admitted.',
      'NOT EXISTS asks whether the admission is missing entirely.',
      'DISTINCT matters if a guest entered the room more than once in the window.',
    ],
    xp: 190,
    badge: 'pattern-matcher',
  },
  {
    id: 98,
    title: 'The Route, Reconstructed',
    kind: 'query',
    dataset: 'vault',
    story:
      'Card AV-0016 belongs to nobody and went everywhere. You found the doors it opened in Act Two. Now put a clock on it, because the gaps between the swipes say whether somebody was walking or whether they already knew exactly where they were going.',
    objective:
      'For every granted swipe made by the keycard with serial AV-0016, return the door code as door, the zone, the swipe time as swiped_at, and a column named minutes_since_previous holding whole minutes since that card previous swipe, rounded to the nearest minute and NULL for the first. Oldest first. Row order is graded.',
    concepts: ['window-functions', 'inner-join', 'date-functions'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['LAG'],
    solution: `SELECT d.code AS door, d.zone, a.swiped_at,
       ROUND((JULIANDAY(a.swiped_at) -
              JULIANDAY(LAG(a.swiped_at) OVER (ORDER BY a.swiped_at))) * 1440) AS minutes_since_previous
FROM access_log a
JOIN keycards k ON k.id = a.card_id
JOIN doors d ON d.id = a.door_id
WHERE k.serial = 'AV-0016' AND a.granted = 1
ORDER BY a.swiped_at;`,
    hints: [
      'LAG over the swipe time gives the previous swipe for the same card.',
      'A julian day difference multiplied by 1440 is a difference in minutes.',
      'The first row has no predecessor, so the subtraction yields NULL, which is correct.',
    ],
    xp: 195,
    badge: 'night-route',
  },
  {
    id: 99,
    title: 'Two Hops From the Nominee',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Cygnet Nominees is account 15 and it is where the money is born. Follow it outward two hops and print every path it takes, because the shape of the spray is what tells a magistrate this was designed rather than merely untidy.',
    objective:
      'Starting from account 15, follow the wires outward for at most two hops. Return a column named hop holding 1 or 2 and a column named path holding the account ids joined by the two characters minus and greater-than, beginning with 15. Exclude the starting point itself. Order by hop, then path. Row order is graded.',
    concepts: ['recursive-cte'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['RECURSIVE'],
    solution: `WITH RECURSIVE flow AS (
  SELECT 15 AS acct, 0 AS hop, '15' AS path
  UNION ALL
  SELECT w.to_acct, f.hop + 1, f.path || '->' || w.to_acct
  FROM wires w
  JOIN flow f ON w.from_acct = f.acct
  WHERE f.hop < 2
)
SELECT hop, path
FROM flow
WHERE hop > 0
ORDER BY hop, path;`,
    hints: [
      'The anchor row is the starting account at hop 0, carrying its own id as the path so far.',
      'Bound the recursion with a hop limit, or a cycle in the payments will run forever.',
      "Concatenate with || to grow the path: f.path || '->' || w.to_acct",
    ],
    xp: 200,
    badge: 'follow-the-money',
  },
  {
    id: 100,
    title: 'Paid Twice, Counted Once',
    kind: 'query',
    dataset: 'blackout',
    story:
      'Back to Kestrel. Finance has signed off the incident and two customers are still out of pocket, because the duplicate payments were deleted from the ledger in one case and not the other. Produce the figure that finance actually needs: what was charged, what settled, and what was taken twice.',
    objective:
      'For every order that has at least one payment marked duplicate, return order_id, a column named charged holding the sum of all its payment amounts, a column named settled holding the sum of amounts whose status is settled, and a column named overcharged holding the sum of amounts whose status is duplicate. Round all three to 2 decimals. Order by order_id. Row order is graded.',
    concepts: ['group-by', 'having', 'case', 'aggregates'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT p.order_id,
       ROUND(SUM(p.amount), 2) AS charged,
       ROUND(SUM(CASE WHEN p.status = 'settled' THEN p.amount ELSE 0 END), 2) AS settled,
       ROUND(SUM(CASE WHEN p.status = 'duplicate' THEN p.amount ELSE 0 END), 2) AS overcharged
FROM payments p
GROUP BY p.order_id
HAVING SUM(CASE WHEN p.status = 'duplicate' THEN p.amount ELSE 0 END) > 0
ORDER BY p.order_id;`,
    hints: [
      'A CASE inside an aggregate is how you total one subset without filtering the others away.',
      'The same CASE expression can be reused in the HAVING clause.',
      'Rounding after summing, not before, keeps the cents honest.',
    ],
    xp: 205,
    badge: 'the-ledger-balances',
  },
  {
    id: 101,
    title: 'Ninety-One Megabytes at Midnight',
    kind: 'query',
    dataset: 'nexus',
    story:
      'The ninth floor again. Ordinary sessions move a few hundred kilobytes. Three sessions on this system moved more than the rest of the building combined, all of them after eleven at night, all of them from the same account. Measure them against what normal looks like.',
    objective:
      'Treating an ordinary session as one moving fewer than 10,000,000 bytes, return every session that moved more than ten times the average ordinary session, as handle, started_at, bytes_out and a column named times_normal holding the ratio to that ordinary average, rounded to 1 decimal place. Largest first. Row order is graded.',
    concepts: ['subquery', 'inner-join', 'math-functions'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT u.handle, s.started_at, s.bytes_out,
       ROUND(s.bytes_out * 1.0 /
             (SELECT AVG(bytes_out) FROM sessions WHERE bytes_out < 10000000), 1) AS times_normal
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE s.bytes_out > 10 * (SELECT AVG(bytes_out) FROM sessions WHERE bytes_out < 10000000)
ORDER BY s.bytes_out DESC;`,
    hints: [
      'Compute the baseline from the ordinary sessions only, or the outliers drag the average up to hide themselves.',
      'The same scalar subquery can appear in both the SELECT list and the WHERE clause.',
      'Multiply by 1.0 to force a real division rather than an integer one.',
    ],
    xp: 210,
    badge: 'exfiltration',
  },
  {
    id: 102,
    title: 'They Changed Their Story',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'Four guests at Blackwood Manor gave a statement, and then gave another one. Nobody amends an account of their evening because they remembered it more clearly. Find everyone who spoke twice, and how many hours passed before the second version.',
    objective:
      'Return the id and name of every guest who gave more than one statement, with statements_given holding how many, first_given holding their earliest given_at and last_given holding their latest. Order by id. Row order is graded.',
    concepts: ['group-by', 'having', 'aggregates', 'inner-join', 'group-concat'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT g.id, g.name,
       COUNT(*) AS statements_given,
       MIN(s.given_at) AS first_given,
       MAX(s.given_at) AS last_given
FROM statements s
JOIN guests g ON g.id = s.guest_id
GROUP BY g.id, g.name
HAVING COUNT(*) > 1
ORDER BY g.id;`,
    hints: [
      'Group by the guest, count the statements, and keep only the groups larger than one.',
      'MIN and MAX over a text timestamp give you the first and last, because the format sorts correctly.',
      'The guest name has to be in the GROUP BY, since it is not aggregated.',
      'GROUP_CONCAT would glue the claims themselves into one cell, but the order it does that in is not defined, so it is the wrong tool for anything you intend to compare.',
    ],
    xp: 215,
  },
  {
    id: 103,
    title: 'Cleared For Every Exit',
    kind: 'query',
    dataset: 'vault',
    story:
      'The question the vault never let you ask: not who can open a door, but who can open all of them. This shape of query is called a division, and the trick is that there is no ALL operator to lean on. You ask instead for the people for whom no exit exists that would refuse them.',
    objective:
      'Return the name and clearance of every employee whose clearance is sufficient for every exit door in the building. Order by clearance descending, then name. Row order is graded.',
    concepts: ['exists', 'correlated'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['NOT EXISTS'],
    solution: `SELECT e.name, e.clearance
FROM employees e
WHERE NOT EXISTS (
  SELECT 1 FROM doors d
  WHERE d.is_exit = 1 AND d.min_level > e.clearance
)
ORDER BY e.clearance DESC, e.name;`,
    hints: [
      'For all means there does not exist a counterexample. That translation is the entire technique.',
      'The counterexample here is an exit door demanding more than this person holds.',
      'NOT EXISTS (SELECT 1 FROM doors d WHERE d.is_exit = 1 AND d.min_level > e.clearance)',
    ],
    xp: 220,
  },
  {
    id: 104,
    title: 'Everyone the Watchlist Touched',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Three entries on the watchlist carry the highest severity. Between them they control six accounts, and everything those accounts paid out is now evidence. The sender might be flagged as a person or as a company, and you do not get to know which in advance.',
    objective:
      'Return every wire sent from an account controlled by a watchlist subject of severity 5, as wire_id, a column named sender holding the watchlisted name, a column named receiver holding the receiving iban, and the amount. Order by wire_id. Row order is graded.',
    concepts: ['inner-join', 'left-join', 'coalesce'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT DISTINCT w.id AS wire_id,
       wl.subject AS sender,
       recv.iban AS receiver,
       w.amount
FROM wires w
JOIN accounts src ON src.id = w.from_acct
JOIN accounts recv ON recv.id = w.to_acct
LEFT JOIN holders h ON h.id = src.holder_id
LEFT JOIN companies c ON c.id = src.company_id
JOIN watchlist wl
  ON wl.severity = 5
 AND wl.subject IN (h.full_name, c.legal_name)
ORDER BY w.id;`,
    hints: [
      'An account can be owned by a holder, by a company, or by both, so join outward to each.',
      'A watchlist subject matches either name, which IN over two columns expresses directly.',
      'DISTINCT guards against a wire matching two watchlist entries at once.',
    ],
    xp: 225,
  },
  {
    id: 105,
    title: 'Never Again Without a Record',
    kind: 'mutation',
    dataset: 'blackout',
    story:
      'Kestrel has one demand coming out of the incident review: no status on an order changes again without the database writing it down itself. Not the application. The database. Build it, then change two orders and let the trigger prove it works.',
    objective:
      'Create a trigger named orders_status_audit that fires after the status column of orders is updated, writing into audit_log a row with table_name orders, row_pk of the changed order, action update, changed_at 2026-03-01 09:00, actor recovery_team, column_name status, and the old and new status values. Then set the status of orders 1006 and 1007 to shipped.',
    concepts: ['triggers', 'update'],
    check: `SELECT table_name, row_pk, action, changed_at, actor, column_name, old_value, new_value
FROM audit_log WHERE actor = 'recovery_team' ORDER BY row_pk;`,
    requireKeywords: ['CREATE TRIGGER', 'AFTER UPDATE'],
    solution: `CREATE TRIGGER orders_status_audit AFTER UPDATE OF status ON orders
BEGIN
  INSERT INTO audit_log (table_name, row_pk, action, changed_at, actor, column_name, old_value, new_value)
  VALUES ('orders', OLD.id, 'update', '2026-03-01 09:00', 'recovery_team', 'status', OLD.status, NEW.status);
END;

UPDATE orders SET status = 'shipped' WHERE id IN (1006, 1007);`,
    hints: [
      'AFTER UPDATE OF column ON table restricts the trigger to changes of that one column.',
      'Inside the body, OLD holds the row before and NEW holds the row after.',
      'The trigger must exist before the UPDATE runs, or there is nothing to record it.',
    ],
    xp: 230,
  },
  {
    id: 106,
    title: 'Keys Held by Ghosts',
    kind: 'query',
    dataset: 'nexus',
    story:
      'Access that never expires is access somebody will still hold in five years. Find the standing grants belonging to people who have not signed in since the first of June, because those are the credentials an archivist would borrow.',
    objective:
      'Return every grant with no expiry date whose holder has not started a session on or after 2026-06-02, as handle, grant_kind, a column named node holding the node name, and a column named last_session holding that user most recent session start. Order by handle, then node. Row order is graded.',
    concepts: ['inner-join', 'group-by', 'having', 'is-null'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT u.handle, g.grant_kind, n.name AS node,
       MAX(s.started_at) AS last_session
FROM role_grants g
JOIN users u ON u.id = g.user_id
JOIN nodes n ON n.id = g.node_id
JOIN sessions s ON s.user_id = u.id
WHERE g.expires_at IS NULL
GROUP BY g.id, u.handle, g.grant_kind, n.name
HAVING MAX(s.started_at) < '2026-06-02'
ORDER BY u.handle, n.name;`,
    hints: [
      'Aggregate to the most recent session per grant holder, then filter on that aggregate.',
      'A condition on MAX belongs in HAVING, not WHERE.',
      'Grouping by g.id keeps two grants held by the same person as two rows.',
    ],
    xp: 235,
  },
  {
    id: 107,
    title: 'Filing the Cold Case',
    kind: 'mutation',
    dataset: 'blackwood',
    story:
      'Before the last door, leave the Blackwood file in a state the next investigator can use. Everything they will ask is a question about one room at one time, so index it that way, and give them the study as a named view rather than a query they have to rediscover.',
    objective:
      'Create an index named idx_movements_room_time on movements over room_id and seen_at, in that order. Then create a view named study_visitors returning guest_id, a column named name holding the guest name, and seen_at, for every movement into room 3.',
    concepts: ['indexes', 'views', 'inner-join'],
    strictColumns: true,
    check: `SELECT v.guest_id, v.name, v.seen_at,
       (SELECT COUNT(*) FROM pragma_index_list('movements') WHERE name = 'idx_movements_room_time') AS index_present
FROM study_visitors v
ORDER BY v.seen_at;`,
    requireKeywords: ['CREATE INDEX', 'CREATE VIEW'],
    solution: `CREATE INDEX idx_movements_room_time ON movements(room_id, seen_at);

CREATE VIEW study_visitors AS
SELECT m.guest_id, g.name AS name, m.seen_at
FROM movements m
JOIN guests g ON g.id = m.guest_id
WHERE m.room_id = 3;`,
    hints: [
      'The index goes on the columns the filter uses, in the order it uses them.',
      'The view carries the join so that nobody downstream has to write it again.',
      'Name the second view column explicitly, because g.name alone would come back as name anyway but relying on that is a habit worth breaking.',
    ],
    xp: 240,
  },
  {
    id: 108,
    title: 'The Archivist',
    kind: 'query',
    dataset: 'nexus',
    story:
      'The account is called archivist. It was created on the last day of 2019, it holds administrative rights over the root of the building and over the cold room, and at 23:59 on the third of June it logged an event of kind purge with a scope of self. Before it did that, it exported two wings of the archive to an address outside the building. This is the last query. Name the rooms, the bytes and the running total, and the file is closed.',
    objective:
      'For every event by the actor archivist that carries a bytes value in its payload, return occurred_at, a column named path holding the full slash-separated path of the node from the root, a column named bytes holding the payload bytes value, and a column named cumulative_bytes holding the running total of bytes ordered by occurred_at. Oldest first. Row order is graded.',
    concepts: ['recursive-cte', 'window-functions', 'frames', 'inner-join'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['RECURSIVE', 'OVER', 'json_extract'],
    solution: `WITH RECURSIVE walk AS (
  SELECT id, name AS path FROM nodes WHERE parent_id IS NULL
  UNION ALL
  SELECT n.id, w.path || ' / ' || n.name
  FROM nodes n JOIN walk w ON n.parent_id = w.id
)
SELECT e.occurred_at,
       w.path,
       json_extract(e.payload, '$.bytes') AS bytes,
       SUM(json_extract(e.payload, '$.bytes')) OVER (
         ORDER BY e.occurred_at
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS cumulative_bytes
FROM events e
JOIN walk w ON w.id = e.node_id
WHERE e.actor = 'archivist'
  AND json_extract(e.payload, '$.bytes') IS NOT NULL
ORDER BY e.occurred_at;`,
    hints: [
      'Three techniques in one query: recursion for the path, JSON extraction for the bytes, a window for the running total.',
      'Build the path CTE first and join the events to it on the node id.',
      'An event with no bytes key extracts to NULL, which the WHERE clause removes.',
    ],
    xp: 350,
    badge: 'case-six-closed',
  },
]);
