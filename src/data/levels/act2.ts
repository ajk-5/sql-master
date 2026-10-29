import { defineAct } from './util';

export const act2 = defineAct('vault', [
  {
    id: 19,
    title: 'Badge and Department',
    kind: 'query',
    dataset: 'vault',
    story:
      'Sub-level four sealed at 23:04 with you inside it. The terminal in the corner still answers, and it holds the whole security schema. The employees table stores a dept_id and nothing else; the department names live one table away. Nothing in this vault can be answered by a single table again.',
    objective:
      'Return every employee who belongs to a department, as name and a column named department holding the department name.',
    concepts: ['joins', 'inner-join', 'natural-join'],
    strictColumns: true,
    requireKeywords: ['JOIN'],
    solution: `SELECT e.name, d.name AS department
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;`,
    hints: [
      'A join states how a row on the left corresponds to a row on the right.',
      'Give each table a short alias so you can say which name you mean.',
      'FROM employees e INNER JOIN departments d ON e.dept_id = d.id',
      'NATURAL JOIN would guess the ON clause from shared column names. Both tables here have a column called name, so it would join people to departments by name and return nothing. Say what you mean.',
    ],
    xp: 80,
    badge: 'first-join',
  },
  {
    id: 20,
    title: 'Who Guards the Guards',
    kind: 'query',
    dataset: 'vault',
    story:
      'The door you are behind answers to Security. If anyone upstairs can still override it, they work in that department and they hold clearance three or better.',
    objective:
      'Return the name and title of every employee in the Security department whose clearance is 3 or higher and whose status is active.',
    concepts: ['inner-join', 'and-or'],
    solution: `SELECT e.name, e.title
FROM employees e
JOIN departments d ON e.dept_id = d.id
WHERE d.name = 'Security'
  AND e.clearance >= 3
  AND e.status = 'active';`,
    hints: [
      'You can filter on columns from either side of a join.',
      'INNER JOIN and JOIN mean the same thing.',
      "WHERE d.name = 'Security' AND e.clearance >= 3 AND e.status = 'active'",
    ],
    xp: 85,
  },
  {
    id: 21,
    title: 'The People With No Department',
    kind: 'query',
    dataset: 'vault',
    story:
      'An inner join quietly threw two people away, and you did not notice. Contractors have no dept_id, so they vanish from every report the building produces. One of them was in here yesterday.',
    objective:
      'Return the name and title of every employee who has no department, using an outer join rather than a NULL test on employees alone.',
    concepts: ['left-join', 'is-null'],
    requireKeywords: ['LEFT JOIN'],
    solution: `SELECT e.name, e.title
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id
WHERE d.id IS NULL;`,
    hints: [
      'LEFT JOIN keeps every row on the left even when the right side matches nothing.',
      'Unmatched rows get NULL in every right-hand column, which is how you find them.',
      'LEFT JOIN departments d ON e.dept_id = d.id WHERE d.id IS NULL',
    ],
    xp: 90,
    badge: 'the-left-behind',
  },
  {
    id: 22,
    title: 'The Empty Wing',
    kind: 'query',
    dataset: 'vault',
    story:
      'Turn the same question around. One department on the org chart has nobody in it at all, and its floor is below the one you are trapped on.',
    objective: 'Return the name and floor of every department that has no employees at all.',
    concepts: ['left-join', 'is-null'],
    solution: `SELECT d.name, d.floor
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
WHERE e.id IS NULL;`,
    hints: [
      'Put the table you want to keep everything from on the left.',
      'Then keep only the rows where the right side failed to match.',
      'FROM departments d LEFT JOIN employees e ON e.dept_id = d.id WHERE e.id IS NULL',
    ],
    xp: 90,
  },
  {
    id: 23,
    title: 'Cards That Never Moved',
    kind: 'query',
    dataset: 'vault',
    story:
      'Twenty cards exist. One has never been swiped anywhere, which means either its holder never comes in, or somebody is holding it in reserve. Write this one as a RIGHT JOIN so you can feel that it is a LEFT JOIN with the tables swapped.',
    objective:
      'Return the serial and level of every keycard that appears nowhere in access_log, written using RIGHT JOIN.',
    concepts: ['left-join', 'is-null'],
    requireKeywords: ['RIGHT JOIN'],
    solution: `SELECT k.serial, k.level
FROM access_log a
RIGHT JOIN keycards k ON a.card_id = k.id
WHERE a.id IS NULL;`,
    hints: [
      'RIGHT JOIN keeps every row of the table written second.',
      'So put access_log first and keycards second, then test the log side for NULL.',
      'FROM access_log a RIGHT JOIN keycards k ON a.card_id = k.id WHERE a.id IS NULL',
    ],
    xp: 95,
  },
  {
    id: 24,
    title: 'Cameras and Doors',
    kind: 'query',
    dataset: 'vault',
    story:
      'Two doors in this building are watched by no camera. If you are going to move, you want to know which. Keep both sides of the comparison, matched where they can be.',
    objective:
      'Match cameras to doors on their zone, keeping every camera and every door. Return a column named camera holding the camera label, a column named door holding the door code, and the zone from whichever side has one, named zone.',
    concepts: ['full-join'],
    strictColumns: true,
    requireKeywords: ['FULL'],
    solution: `SELECT c.label AS camera, d.code AS door, COALESCE(c.zone, d.zone) AS zone
FROM cameras c
FULL OUTER JOIN doors d ON c.zone = d.zone;`,
    hints: [
      'FULL OUTER JOIN keeps unmatched rows from both sides.',
      'When one side is missing, its zone is NULL, so read the zone from whichever side survived.',
      'COALESCE(c.zone, d.zone) returns the first argument that is not NULL.',
    ],
    xp: 100,
  },
  {
    id: 25,
    title: 'Three Tables, One Story',
    kind: 'query',
    dataset: 'vault',
    story:
      'A swipe is meaningless on its own. The log stores a card id and a door id, and the story only appears when all three tables are read together: who held the card, which door it touched, and whether the door opened.',
    objective:
      'For every swipe that was refused, return the employee name as person, the door code as door, the swipe time as swiped_at, and the refusal reason as reason, oldest first. Swipes by cards with no holder must still appear, with a NULL person. Row order is graded.',
    concepts: ['left-join', 'inner-join'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT e.name AS person, d.code AS door, a.swiped_at, a.reason
FROM access_log a
JOIN doors d ON a.door_id = d.id
LEFT JOIN keycards k ON a.card_id = k.id
LEFT JOIN employees e ON k.holder_id = e.id
WHERE a.granted = 0
ORDER BY a.swiped_at;`,
    hints: [
      'Chain joins one after another; each ON clause connects to what is already there.',
      'The door always exists, so that join can be inner. The card and holder might not, so those must be outer.',
      'JOIN doors ... LEFT JOIN keycards ... LEFT JOIN employees ... WHERE a.granted = 0',
    ],
    xp: 100,
    badge: 'chain-of-custody',
  },
  {
    id: 26,
    title: 'Who Reports to Whom',
    kind: 'query',
    dataset: 'vault',
    story:
      'The manager_id column points back into the same table it lives in. To read a name instead of a number you have to open the employees table twice at once and pretend the two copies are different tables.',
    objective:
      'Return every employee who has a manager, as a column named employee and a column named manager, both holding names.',
    concepts: ['self-join'],
    strictColumns: true,
    solution: `SELECT e.name AS employee, m.name AS manager
FROM employees e
JOIN employees m ON e.manager_id = m.id;`,
    hints: [
      'A self join is an ordinary join where both sides name the same table.',
      'The aliases are what make it possible: e and m are two views of employees.',
      'FROM employees e JOIN employees m ON e.manager_id = m.id',
    ],
    xp: 105,
  },
  {
    id: 27,
    title: 'The Access Matrix',
    kind: 'query',
    dataset: 'vault',
    story:
      'You need a grid: every active member of Security against every door that leads out of the building, and whether their clearance is enough. This is the one time you want every combination on purpose.',
    objective:
      'Return every pairing of an active Security employee with an exit door: employee name as person, door code as door, and a column named permitted holding 1 when the employee clearance is greater than or equal to the door min_level, otherwise 0.',
    concepts: ['cross-join', 'case'],
    strictColumns: true,
    requireKeywords: ['CROSS JOIN'],
    solution: `SELECT e.name AS person, d.code AS door,
       CASE WHEN e.clearance >= d.min_level THEN 1 ELSE 0 END AS permitted
FROM employees e
CROSS JOIN doors d
JOIN departments dept ON e.dept_id = dept.id
WHERE dept.name = 'Security' AND e.status = 'active' AND d.is_exit = 1;`,
    hints: [
      'CROSS JOIN pairs every row on the left with every row on the right, with no ON clause.',
      'Filter afterwards to keep the grid to the people and doors you care about.',
      'CROSS JOIN doors d ... WHERE d.is_exit = 1',
    ],
    xp: 110,
  },
  {
    id: 28,
    title: 'Every Zone in the Building',
    kind: 'query',
    dataset: 'vault',
    story:
      'You are drawing a map from two incomplete sources. Doors know their zone. Cameras know their zone. Neither knows all of them. Stack the two lists into one.',
    objective:
      'Return one row per distinct zone appearing in either the doors table or the cameras table, in a single column named zone.',
    concepts: ['union'],
    strictColumns: true,
    requireKeywords: ['UNION'],
    solution: `SELECT zone FROM doors
UNION
SELECT zone FROM cameras;`,
    hints: [
      'UNION stacks two results vertically and removes duplicates.',
      'Both sides must return the same number of columns, in compatible types.',
      'UNION ALL would keep the duplicates. Here you do not want them.',
    ],
    xp: 115,
  },
  {
    id: 29,
    title: 'Watched and Sealed',
    kind: 'query',
    dataset: 'vault',
    story:
      'A zone with both a door and a camera is a zone you cannot cross unseen. Find the overlap between the two lists rather than their sum.',
    objective: 'Return the zones that appear in both the doors table and the cameras table, as zone.',
    concepts: ['intersect'],
    strictColumns: true,
    requireKeywords: ['INTERSECT'],
    solution: `SELECT zone FROM doors
INTERSECT
SELECT zone FROM cameras;`,
    hints: [
      'INTERSECT keeps only rows produced by both sides.',
      'Like UNION, it compares whole rows, so column order matters.',
      'SELECT zone FROM doors INTERSECT SELECT zone FROM cameras;',
    ],
    xp: 120,
  },
  {
    id: 30,
    title: 'The Blind Corridors',
    kind: 'query',
    dataset: 'vault',
    story:
      'Now the difference. Zones with a door and no camera are the corridors nobody is watching, and one of them is your route out.',
    objective:
      'Return the zones that appear in the doors table but not in the cameras table, as zone.',
    concepts: ['except'],
    strictColumns: true,
    requireKeywords: ['EXCEPT'],
    solution: `SELECT zone FROM doors
EXCEPT
SELECT zone FROM cameras;`,
    hints: [
      'EXCEPT subtracts the second result from the first.',
      'It is not symmetric: swapping the two sides asks a different question.',
      'SELECT zone FROM doors EXCEPT SELECT zone FROM cameras;',
    ],
    xp: 120,
    badge: 'set-theorist',
  },
  {
    id: 31,
    title: 'How Bad Is It',
    kind: 'query',
    dataset: 'vault',
    story:
      'Before you plan anything, you want one number: how many swipes were refused across the whole log. Counting is the first aggregate anyone learns and the one most often got wrong.',
    objective: 'Return a single row with a single column named refusals holding the number of swipes where granted is 0.',
    concepts: ['aggregates'],
    strictColumns: true,
    solution: 'SELECT COUNT(*) AS refusals FROM access_log WHERE granted = 0;',
    hints: [
      'COUNT(*) counts rows. COUNT(column) counts rows where that column is not NULL.',
      'An aggregate with no GROUP BY collapses the whole result to one row.',
      'SELECT COUNT(*) AS refusals FROM access_log WHERE granted = 0;',
    ],
    xp: 125,
  },
  {
    id: 32,
    title: 'The Payroll Sheet',
    kind: 'query',
    dataset: 'vault',
    story:
      'Whoever helped someone into the vault was paid to. Get the shape of the salary bill for active staff: how many, the total, the average, and the extremes.',
    objective:
      'For active employees only, return one row with columns named headcount, total_pay, avg_pay, lowest and highest, holding the count of employees, the sum, the average, the minimum and the maximum of salary. Round avg_pay to 2 decimal places.',
    concepts: ['aggregates'],
    strictColumns: true,
    solution: `SELECT COUNT(*) AS headcount,
       SUM(salary) AS total_pay,
       ROUND(AVG(salary), 2) AS avg_pay,
       MIN(salary) AS lowest,
       MAX(salary) AS highest
FROM employees
WHERE status = 'active';`,
    hints: [
      'You can compute several aggregates in one pass over the rows.',
      'ROUND(value, 2) keeps two decimal places.',
      'SUM, AVG, MIN and MAX all ignore NULL values.',
    ],
    xp: 130,
  },
  {
    id: 33,
    title: 'Swipes Per Door',
    kind: 'query',
    dataset: 'vault',
    story:
      'One door in this building was touched far more than its traffic justifies. Break the log apart by door and count each pile.',
    objective:
      'Return door_id and a column named swipes holding the number of log entries for that door, busiest first, then by door_id ascending. Row order is graded.',
    concepts: ['group-by', 'aggregates'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['GROUP BY'],
    solution: `SELECT door_id, COUNT(*) AS swipes
FROM access_log
GROUP BY door_id
ORDER BY swipes DESC, door_id;`,
    hints: [
      'GROUP BY splits rows into buckets; the aggregate then runs once per bucket.',
      'Every non-aggregated column in the SELECT should appear in the GROUP BY.',
      'GROUP BY door_id ORDER BY swipes DESC, door_id',
    ],
    xp: 130,
    badge: 'the-grouper',
  },
  {
    id: 34,
    title: 'Departmental Weight',
    kind: 'query',
    dataset: 'vault',
    story:
      'Group and join at the same time. The board wants each department with its headcount and its payroll, and it wants the empty wing to appear with a zero rather than disappear.',
    objective:
      'Return every department as a column named department, with headcount holding the number of employees and payroll holding the total salary. Departments with no employees must appear with a headcount of 0 and a payroll of 0. Order by payroll descending, then department ascending. Row order is graded.',
    concepts: ['group-by', 'left-join', 'coalesce'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT d.name AS department,
       COUNT(e.id) AS headcount,
       COALESCE(SUM(e.salary), 0) AS payroll
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
ORDER BY payroll DESC, department;`,
    hints: [
      'COUNT(e.id) counts matched rows only, so an unmatched department counts 0. COUNT(*) would count 1.',
      'SUM over no rows is NULL, not zero. COALESCE turns it into zero.',
      'Group by the department, join outward to employees.',
    ],
    xp: 135,
  },
  {
    id: 35,
    title: 'Doors Worth Watching',
    kind: 'query',
    dataset: 'vault',
    story:
      'Counting every door gives you noise. You want only the doors that refused someone more than once, because a single refusal is a mistake and a repeated one is an attempt.',
    objective:
      'Return door_id and a column named refusals for every door with more than one refused swipe, most refusals first, then door_id ascending. Row order is graded.',
    concepts: ['having', 'group-by'],
    strictColumns: true,
    orderMatters: true,
    requireKeywords: ['HAVING'],
    solution: `SELECT door_id, COUNT(*) AS refusals
FROM access_log
WHERE granted = 0
GROUP BY door_id
HAVING COUNT(*) > 1
ORDER BY refusals DESC, door_id;`,
    hints: [
      'WHERE filters rows before grouping. HAVING filters groups after.',
      'You cannot put an aggregate in WHERE, which is the whole reason HAVING exists.',
      'GROUP BY door_id HAVING COUNT(*) > 1',
    ],
    xp: 140,
  },
  {
    id: 36,
    title: 'The Card With No Name',
    kind: 'query',
    dataset: 'vault',
    story:
      'Here is what the whole act has been walking towards. Two keycards in this building are issued to nobody. At 22:47 one of them walked through the server hall, the vault core, the decommissioned wing and out through the service tunnel, and every door said yes. Put the three tables together and read the route.',
    objective:
      'Return the card serial as card, the door code as door, the zone as zone and the swipe time as swiped_at, for every granted swipe made by a keycard with no holder, oldest first. Row order is graded.',
    concepts: ['inner-join', 'is-null', 'order-by'],
    strictColumns: true,
    orderMatters: true,
    solution: `SELECT k.serial AS card, d.code AS door, d.zone AS zone, a.swiped_at
FROM access_log a
JOIN keycards k ON a.card_id = k.id
JOIN doors d ON a.door_id = d.id
WHERE k.holder_id IS NULL
  AND a.granted = 1
ORDER BY a.swiped_at;`,
    hints: [
      'Three tables: the log in the middle, the card on one side, the door on the other.',
      'A card with no holder has holder_id IS NULL, which is not the same as a card with no swipes.',
      'WHERE k.holder_id IS NULL AND a.granted = 1 ORDER BY a.swiped_at',
    ],
    xp: 150,
    badge: 'case-two-closed',
  },
]);
