import { defineAct } from './util';

export const act3 = defineAct('cartel', [
  {
    id: 37,
    title: 'Above the Line',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Financial Crimes hands you forty wires and one instruction: stop reading them one at a time. The first thing anyone asks of a payment file is which movements are abnormal, and abnormal begins as a comparison against the file itself.',
    objective:
      'Return the id, amount and reference of every wire larger than the average wire amount, largest first. Row order is graded.',
    concepts: ['subquery'],
    orderMatters: true,
    solution: `SELECT id, amount, reference
FROM wires
WHERE amount > (SELECT AVG(amount) FROM wires)
ORDER BY amount DESC;`,
    hints: [
      'A subquery in parentheses that returns one value can be used anywhere a value can.',
      'The inner query runs against the whole table, unaffected by the outer WHERE.',
      'WHERE amount > (SELECT AVG(amount) FROM wires)',
    ],
    xp: 110,
    badge: 'query-within-query',
  },
  {
    id: 38,
    title: 'High-Risk Money',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Three holders carry a high risk band. You want their accounts, but the risk band lives on the holder and the balance lives on the account. A subquery can hand one table a list drawn from another.',
    objective:
      'Return the iban and balance of every account whose holder is in the high risk band, largest balance first. Row order is graded.',
    concepts: ['subquery', 'in'],
    orderMatters: true,
    requireKeywords: ['IN ('],
    solution: `SELECT iban, balance
FROM accounts
WHERE holder_id IN (SELECT id FROM holders WHERE risk_band = 'high')
ORDER BY balance DESC;`,
    hints: [
      'IN accepts a subquery in place of a hand-written list.',
      'The subquery must return exactly one column.',
      "WHERE holder_id IN (SELECT id FROM holders WHERE risk_band = 'high')",
    ],
    xp: 115,
  },
  {
    id: 39,
    title: 'Counting From the Inside',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Now a subquery that cannot be run on its own, because it refers back to the row being examined. For each account you want the number of wires it sent, and the subquery has to know which account it is looking at.',
    objective:
      'Return every account iban with a column named sent_count holding how many wires that account sent, busiest first, then by iban. Row order is graded.',
    concepts: ['correlated'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT a.iban,
       (SELECT COUNT(*) FROM wires w WHERE w.from_acct = a.id) AS sent_count
FROM accounts a
ORDER BY sent_count DESC, a.iban;`,
    hints: [
      'A correlated subquery mentions a column from the outer query, so it runs once per outer row.',
      'Alias the outer table so the inner query can point at it.',
      '(SELECT COUNT(*) FROM wires w WHERE w.from_acct = a.id) AS sent_count',
    ],
    xp: 120,
  },
  {
    id: 40,
    title: 'Does It Exist',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Sometimes you do not care what the related rows contain, only whether there are any. EXISTS stops looking the moment it finds one, which on a large table is the difference between a second and a minute.',
    objective:
      'Return the full_name of every holder who owns at least one account, alphabetically. Row order is graded.',
    concepts: ['exists', 'correlated'],
    orderMatters: true,
    requireKeywords: ['EXISTS'],
    solution: `SELECT h.full_name
FROM holders h
WHERE EXISTS (SELECT 1 FROM accounts a WHERE a.holder_id = h.id)
ORDER BY h.full_name;`,
    hints: [
      'EXISTS returns true or false, so what the subquery selects is irrelevant. SELECT 1 is the convention.',
      'The link back to the outer row lives in the subquery WHERE clause.',
      'WHERE EXISTS (SELECT 1 FROM accounts a WHERE a.holder_id = h.id)',
    ],
    xp: 120,
  },
  {
    id: 41,
    title: 'Nobody Vouched For Them',
    kind: 'query',
    dataset: 'cartel',
    story:
      'The holders table points at itself: referred_by names whoever introduced this client to the bank. Seven holders have never introduced anyone. They are the ends of the network, and the ends are where money stops moving.',
    objective:
      'Return the full_name of every holder who has never referred another holder, alphabetically. Row order is graded.',
    concepts: ['exists', 'self-join'],
    orderMatters: true,
    requireKeywords: ['NOT EXISTS'],
    solution: `SELECT h.full_name
FROM holders h
WHERE NOT EXISTS (SELECT 1 FROM holders r WHERE r.referred_by = h.id)
ORDER BY h.full_name;`,
    hints: [
      'NOT EXISTS is true when the subquery finds nothing at all.',
      'Both the outer and inner query read holders, so alias them differently.',
      'WHERE NOT EXISTS (SELECT 1 FROM holders r WHERE r.referred_by = h.id)',
    ],
    xp: 125,
  },
  {
    id: 42,
    title: 'Bigger Than All of Them',
    kind: 'query',
    dataset: 'cartel',
    story:
      'The euro accounts are the visible business. The dollar accounts are something else. Find the accounts holding more than every single euro account, without first working out what that threshold is. In MySQL or Oracle you would write balance > ALL (...). SQLite has no ALL operator, so this case is also a lesson in what to do when your engine is missing a word.',
    objective:
      'Return the iban and balance of every account whose balance exceeds the balance of every account denominated in EUR, largest first. Write it without the ALL keyword, which SQLite does not implement. Row order is graded.',
    concepts: ['any-all', 'subquery', 'dialects'],
    orderMatters: true,
    solution: `SELECT iban, balance
FROM accounts
WHERE balance > (SELECT MAX(balance) FROM accounts WHERE currency = 'EUR')
ORDER BY balance DESC;`,
    hints: [
      'x > ALL (values) says exactly the same thing as x > MAX(values).',
      'Likewise x > ANY (values) is x > MIN(values).',
      "WHERE balance > (SELECT MAX(balance) FROM accounts WHERE currency = 'EUR')",
    ],
    xp: 130,
  },
  {
    id: 43,
    title: 'A Table That Does Not Exist',
    kind: 'query',
    dataset: 'cartel',
    story:
      'You cannot filter on a SUM in a WHERE clause. So build the sums first, treat that result as if it were a table, and filter the table. A subquery in the FROM clause is called a derived table, and it is the ancestor of everything in the rest of this act.',
    objective:
      'Return from_acct and a column named total_sent for every account that has sent more than 1,000,000 in total across all its wires, largest first. Row order is graded.',
    concepts: ['subquery', 'group-by'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT t.from_acct, t.total_sent
FROM (
  SELECT from_acct, SUM(amount) AS total_sent
  FROM wires
  GROUP BY from_acct
) t
WHERE t.total_sent > 1000000
ORDER BY t.total_sent DESC;`,
    hints: [
      'A subquery in FROM must be given an alias, because the outer query has to name it.',
      'The inner query aggregates; the outer query filters the aggregate.',
      'FROM (SELECT from_acct, SUM(amount) AS total_sent FROM wires GROUP BY from_acct) t',
    ],
    xp: 135,
  },
  {
    id: 44,
    title: 'Naming the Middle',
    kind: 'query',
    dataset: 'cartel',
    story:
      'The same query again, written so a human can read it. WITH lifts the derived table out to the front and gives it a name, which matters enormously once you have three of them nested inside each other.',
    objective:
      'Using a common table expression, return the iban and a column named total_sent for the five accounts that sent the most money, largest first. Row order is graded.',
    concepts: ['cte', 'group-by'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['WITH'],
    solution: `WITH sent AS (
  SELECT from_acct AS acct_id, SUM(amount) AS total_sent
  FROM wires
  GROUP BY from_acct
)
SELECT a.iban, s.total_sent
FROM sent s
JOIN accounts a ON a.id = s.acct_id
ORDER BY s.total_sent DESC
LIMIT 5;`,
    hints: [
      'WITH name AS (query) defines a result you can then select from as if it were a table.',
      'The CTE comes first, the main SELECT follows it.',
      'WITH sent AS (SELECT from_acct AS acct_id, SUM(amount) AS total_sent FROM wires GROUP BY from_acct)',
    ],
    xp: 135,
    badge: 'the-with-clause',
  },
  {
    id: 45,
    title: 'In and Out',
    kind: 'query',
    dataset: 'cartel',
    story:
      'An account that receives four million and sends three point nine million is not a business. It is a pipe. Build two named results, one for money in and one for money out, and set them against each other.',
    objective:
      'Using two common table expressions, return iban, a column named received, a column named sent and a column named net holding received minus sent, for every account that both sent and received at least one wire. Order by net ascending, then iban. Row order is graded.',
    concepts: ['cte', 'group-by', 'inner-join'],
    strictColumns: true,
    orderMatters: true,
    solution: `WITH inflow AS (
  SELECT to_acct AS acct_id, SUM(amount) AS received
  FROM wires GROUP BY to_acct
),
outflow AS (
  SELECT from_acct AS acct_id, SUM(amount) AS sent
  FROM wires GROUP BY from_acct
)
SELECT a.iban, i.received, o.sent, i.received - o.sent AS net
FROM inflow i
JOIN outflow o ON o.acct_id = i.acct_id
JOIN accounts a ON a.id = i.acct_id
ORDER BY net, a.iban;`,
    hints: [
      'Separate CTEs are comma-separated, and each may refer to the ones before it.',
      'Joining the two CTEs on the account id keeps only accounts appearing in both.',
      'WITH inflow AS (...), outflow AS (...) SELECT ...',
    ],
    xp: 140,
  },
  {
    id: 46,
    title: 'The Ownership Tree',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Meridian Holdings owns Kestrel Freight, which owns Orsini Marine. Nobody wrote down how deep it goes, because parent_id only ever shows you one step. A recursive query takes that one step over and over until there are no steps left.',
    objective:
      'Starting from Meridian Holdings SA (company id 1), return every company in its ownership tree as id, legal_name and a column named depth holding how many levels below Meridian it sits, with Meridian itself at depth 0. Order by depth, then id. Row order is graded.',
    concepts: ['recursive-cte'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['RECURSIVE'],
    solution: `WITH RECURSIVE tree AS (
  SELECT id, legal_name, 0 AS depth
  FROM companies
  WHERE id = 1
  UNION ALL
  SELECT c.id, c.legal_name, t.depth + 1
  FROM companies c
  JOIN tree t ON c.parent_id = t.id
)
SELECT id, legal_name, depth
FROM tree
ORDER BY depth, id;`,
    hints: [
      'A recursive CTE has two halves joined by UNION ALL: the starting row, and the step that extends it.',
      'The step half joins the real table back to the CTE being defined.',
      'WITH RECURSIVE tree AS (SELECT ... WHERE id = 1 UNION ALL SELECT ... JOIN tree t ON c.parent_id = t.id)',
    ],
    xp: 145,
    badge: 'down-the-rabbit-hole',
  },
  {
    id: 47,
    title: 'Everyone He Brought In',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Salvatierra introduced three clients. Two of them introduced others. The bank checked each referral in isolation and never once looked at the shape of the whole tree, which is how a single high-risk client became five accounts.',
    objective:
      'Return every holder introduced directly or indirectly by Dario Salvatierra (holder id 1), excluding Salvatierra himself, as id, full_name and depth, where a direct referral has depth 1. Order by depth, then id. Row order is graded.',
    concepts: ['recursive-cte'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['RECURSIVE'],
    solution: `WITH RECURSIVE chain AS (
  SELECT id, full_name, 1 AS depth
  FROM holders
  WHERE referred_by = 1
  UNION ALL
  SELECT h.id, h.full_name, c.depth + 1
  FROM holders h
  JOIN chain c ON h.referred_by = c.id
)
SELECT id, full_name, depth
FROM chain
ORDER BY depth, id;`,
    hints: [
      'Anchor on the direct referrals rather than on holder 1, and Salvatierra never enters the result.',
      'Each recursive step finds the people referred by whoever the last step found.',
      'WHERE referred_by = 1 ... UNION ALL ... JOIN chain c ON h.referred_by = c.id',
    ],
    xp: 150,
  },
  {
    id: 48,
    title: 'Numbering the Evidence',
    kind: 'query',
    dataset: 'cartel',
    story:
      'A window function does what GROUP BY does, and then puts every row back. Nothing collapses. You get the aggregate and the detail on the same line, which is the entire reason analysts stopped writing self-joins.',
    objective:
      'Return the ten largest wires as id, amount and a column named position holding their rank order by amount, with 1 for the largest. Row order is graded.',
    concepts: ['window-functions', 'ranking'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['OVER'],
    solution: `SELECT id, amount,
       ROW_NUMBER() OVER (ORDER BY amount DESC) AS position
FROM wires
ORDER BY position
LIMIT 10;`,
    hints: [
      'OVER () turns an ordinary function into one that sees a window of rows.',
      'ROW_NUMBER assigns 1, 2, 3 with no ties and no gaps.',
      'ROW_NUMBER() OVER (ORDER BY amount DESC) AS position',
    ],
    xp: 155,
    badge: 'through-the-window',
  },
  {
    id: 49,
    title: 'Ties and Gaps',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Six withdrawals in this file are for exactly the same amount. How your ranking handles that is not a detail; it decides whether the report says there were four suspicious accounts or nine. Put the two ranking functions side by side and watch them disagree.',
    objective:
      'For every card and cash transaction, return id, amount, a column named ranked using RANK and a column named dense using DENSE_RANK, both ordered by amount ascending. Order the output by amount ascending, then id. Row order is graded.',
    concepts: ['ranking', 'window-functions'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT id, amount,
       RANK() OVER (ORDER BY amount) AS ranked,
       DENSE_RANK() OVER (ORDER BY amount) AS dense
FROM transactions
WHERE channel IN ('card', 'cash')
ORDER BY amount, id;`,
    hints: [
      'RANK leaves a hole after a tie: 1, 2, 2, 4. DENSE_RANK does not: 1, 2, 2, 3.',
      'Two window functions can share the same OVER clause shape without interfering.',
      'RANK() OVER (ORDER BY amount), DENSE_RANK() OVER (ORDER BY amount)',
    ],
    xp: 155,
  },
  {
    id: 50,
    title: 'Ranked Within the Account',
    kind: 'query',
    dataset: 'cartel',
    story:
      'A global ranking tells you about the file. A ranking inside each account tells you about the account. PARTITION BY restarts the count every time the account changes, and it is the single most useful word in analytical SQL.',
    objective:
      'For every wire, return from_acct, id, amount and a column named rank_in_account holding its position by amount within its sending account, largest first. Order by from_acct, then rank_in_account. Row order is graded.',
    concepts: ['window-functions', 'ranking'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['PARTITION BY'],
    solution: `SELECT from_acct, id, amount,
       ROW_NUMBER() OVER (PARTITION BY from_acct ORDER BY amount DESC) AS rank_in_account
FROM wires
ORDER BY from_acct, rank_in_account;`,
    hints: [
      'PARTITION BY splits the window into groups; the function restarts inside each.',
      'It does not reduce the number of rows, unlike GROUP BY.',
      'ROW_NUMBER() OVER (PARTITION BY from_acct ORDER BY amount DESC)',
    ],
    xp: 160,
  },
  {
    id: 51,
    title: 'The Balance Curve',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Lasko Trading received eight hundred and seventy thousand and moved it out again within nine hours. A running total makes that visible as a shape rather than a list, and shapes are what get taken to a magistrate.',
    objective:
      'For every wire sent by account 7, return id, sent_at, amount and a column named running_total holding the cumulative sum of amount ordered by sent_at. Order by sent_at. Row order is graded.',
    concepts: ['frames', 'window-functions'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT id, sent_at, amount,
       SUM(amount) OVER (
         ORDER BY sent_at
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_total
FROM wires
WHERE from_acct = 7
ORDER BY sent_at;`,
    hints: [
      'An ordered window with a frame gives you a running aggregate.',
      'UNBOUNDED PRECEDING means from the first row of the partition.',
      'SUM(amount) OVER (ORDER BY sent_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)',
    ],
    xp: 165,
  },
  {
    id: 52,
    title: 'How Long Did It Sit',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Layered money does not rest. If a sum arrives and leaves the same account within hours, that account is not holding it, it is passing it. Look at each wire alongside the previous wire from the same account.',
    objective:
      'For every wire that was sent within 24 hours of the previous wire from the same account, return from_acct, id, sent_at and a column named gap_hours holding the hours since that account previous wire, rounded to 1 decimal place. Order by from_acct, then sent_at. Row order is graded.',
    concepts: ['window-functions', 'cte', 'date-functions'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['LAG'],
    solution: `WITH spaced AS (
  SELECT from_acct, id, sent_at,
         LAG(sent_at) OVER (PARTITION BY from_acct ORDER BY sent_at) AS previous_at
  FROM wires
)
SELECT from_acct, id, sent_at,
       ROUND((JULIANDAY(sent_at) - JULIANDAY(previous_at)) * 24, 1) AS gap_hours
FROM spaced
WHERE previous_at IS NOT NULL
  AND (JULIANDAY(sent_at) - JULIANDAY(previous_at)) * 24 <= 24
ORDER BY from_acct, sent_at;`,
    hints: [
      'LAG reaches back to the previous row of the window; the first row of each partition gets NULL.',
      'JULIANDAY turns a timestamp into a number of days, so subtracting gives a duration.',
      'You cannot filter on a window function in WHERE, so compute it in a CTE first.',
    ],
    xp: 170,
  },
  {
    id: 53,
    title: 'Smoothing the Noise',
    kind: 'query',
    dataset: 'cartel',
    story:
      'One large wire is an event. Three large wires in a row is a pattern. A moving average over a narrow frame is how you tell the two apart without staring at forty rows.',
    objective:
      'For every wire, return from_acct, sent_at, amount and a column named moving_avg holding the average amount over the current wire and the two before it from the same account, rounded to 2 decimal places. Order by from_acct, then sent_at. Row order is graded.',
    concepts: ['frames', 'window-functions'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['ROWS BETWEEN'],
    solution: `SELECT from_acct, sent_at, amount,
       ROUND(AVG(amount) OVER (
         PARTITION BY from_acct
         ORDER BY sent_at
         ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
       ), 2) AS moving_avg
FROM wires
ORDER BY from_acct, sent_at;`,
    hints: [
      'The frame clause narrows the window relative to the current row.',
      'Early rows in a partition simply average over fewer rows.',
      'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW',
    ],
    xp: 170,
  },
  {
    id: 54,
    title: 'Quartiles of Wealth',
    kind: 'query',
    dataset: 'cartel',
    story:
      'The unit wants the account book split into four bands of equal size so the top band can be reviewed first. Do not compute thresholds. Ask the window to cut the deck.',
    objective:
      'Return every account as iban, balance and a column named quartile holding which quarter of the balance distribution it falls into, with 1 holding the largest balances. Order by balance descending, then iban. Row order is graded.',
    concepts: ['ranking', 'window-functions'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['NTILE'],
    solution: `SELECT iban, balance,
       NTILE(4) OVER (ORDER BY balance DESC) AS quartile
FROM accounts
ORDER BY balance DESC, iban;`,
    hints: [
      'NTILE(n) distributes the ordered rows into n buckets as evenly as it can.',
      'The ordering inside OVER decides which end gets bucket 1.',
      'NTILE(4) OVER (ORDER BY balance DESC) AS quartile',
    ],
    xp: 175,
  },
  {
    id: 55,
    title: 'Just Under the Threshold',
    kind: 'query',
    dataset: 'cartel',
    story:
      'Reporting kicks in at ten thousand. So the withdrawals are for nine thousand eight hundred, over and over, from cash machines in two towns. The individual transaction is unremarkable. The sequence is the crime.',
    objective:
      'Find every account with three or more cash transactions, and return each of those transactions as acct_id, booked_at, a column named taken holding the amount as a positive number, and a column named running_total holding the cumulative sum of taken for that account ordered by booked_at. Order by acct_id, then booked_at. Row order is graded.',
    concepts: ['cte', 'having', 'frames'],
    strictColumns: true,
    orderMatters: true,
    solution: `WITH cash AS (
  SELECT acct_id, booked_at, -amount AS taken
  FROM transactions
  WHERE channel = 'cash'
),
repeat_offenders AS (
  SELECT acct_id
  FROM cash
  GROUP BY acct_id
  HAVING COUNT(*) >= 3
)
SELECT c.acct_id, c.booked_at, c.taken,
       SUM(c.taken) OVER (PARTITION BY c.acct_id ORDER BY c.booked_at) AS running_total
FROM cash c
JOIN repeat_offenders r ON r.acct_id = c.acct_id
ORDER BY c.acct_id, c.booked_at;`,
    hints: [
      'Build the cash-only view first, then find which accounts qualify, then bring back the detail.',
      'Withdrawals are stored negative, so negate them to read as amounts taken.',
      'A CTE can be selected from more than once in the same query.',
    ],
    xp: 180,
  },
  {
    id: 56,
    title: 'The Circuit Closes',
    kind: 'query',
    dataset: 'cartel',
    story:
      'This is what the whole act was for. Money leaves an account, arrives somewhere else, and comes back to where it started within days, slightly smaller, wearing a different reference. Three such loops are hiding in these forty wires. Nobody has ever found them by reading the file top to bottom.',
    objective:
      'Find every round trip: a wire out from an account, followed within 3 days by a wire back to that same account from the account that received it. Return out_id, back_id, a column named origin holding the originating account id, a column named hop holding the intermediate account id, a column named sent_out holding the amount that left and a column named came_back holding the amount that returned. Order by out_id. Row order is graded.',
    concepts: ['self-join', 'correlated', 'date-functions'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT w1.id AS out_id,
       w2.id AS back_id,
       w1.from_acct AS origin,
       w1.to_acct AS hop,
       w1.amount AS sent_out,
       w2.amount AS came_back
FROM wires w1
JOIN wires w2
  ON w2.from_acct = w1.to_acct
 AND w2.to_acct = w1.from_acct
 AND w2.sent_at > w1.sent_at
 AND JULIANDAY(w2.sent_at) - JULIANDAY(w1.sent_at) <= 3
WHERE w1.from_acct <> w1.to_acct
ORDER BY w1.id;`,
    hints: [
      'Join the wires table to itself: one copy is the outbound leg, the other is the return.',
      'The return leg reverses the two account columns, which is the whole condition.',
      'Guard against an account wiring itself, and bound the gap with JULIANDAY.',
    ],
    xp: 200,
    badge: 'case-three-closed',
  },
]);
