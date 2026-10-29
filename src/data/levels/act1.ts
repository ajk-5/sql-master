import { defineAct } from './util';

export const act1 = defineAct('blackwood', [
  {
    id: 1,
    title: 'The Case File Opens',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'Inspector Mallory drops a leather folder on the table and leaves without a word. Inside is not paper. It is a database: twelve guests, eight staff, twelve rooms, and a man who stopped breathing at 22:47. You have never opened one of these before. Start by looking at everything.',
    objective: 'Return every column of every row in the guests table.',
    concepts: ['select'],
    starter: 'SELECT ',
    solution: 'SELECT * FROM guests;',
    hints: [
      'A query has two halves: what you want, and where it lives.',
      'The star * is shorthand for every column.',
      'SELECT * FROM guests;',
    ],
    xp: 40,
    badge: 'first-light',
  },
  {
    id: 2,
    title: 'Names and Origins',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'Mallory returns. "I do not need their blood type, I need to know who they are and where they travelled from." Twelve rows is small enough to read; a real case file is not. Learn to ask for less.',
    objective: 'Return only the name and home_city of every guest.',
    concepts: ['select'],
    solution: 'SELECT name, home_city FROM guests;',
    hints: [
      'Replace the star with the columns you actually want.',
      'Separate column names with commas.',
      'SELECT name, home_city FROM guests;',
    ],
    xp: 45,
  },
  {
    id: 3,
    title: 'Headings for the Inspector',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'The column called home_city means nothing to a magistrate. Mallory wants the sheet to read like evidence, not like a table dump. Rename the columns as they leave the query.',
    objective:
      'Return each guest with the name column labelled suspect and home_city labelled origin, in that order.',
    concepts: ['select', 'alias'],
    solution: 'SELECT name AS suspect, home_city AS origin FROM guests;',
    strictColumns: true,
    hints: [
      'AS renames a column for the length of one query. The stored table is untouched.',
      'You can alias each column independently.',
      'SELECT name AS suspect, home_city AS origin FROM guests;',
    ],
    xp: 50,
  },
  {
    id: 4,
    title: 'Where They Came From',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'Three guests came from Paris and you cannot see it, because the list repeats. Mallory wants the set of cities, each written once, so the telegraph office can be warned.',
    objective: 'Return every distinct home_city found in the guests table, one row per city.',
    concepts: ['distinct'],
    requireKeywords: ['DISTINCT'],
    solution: 'SELECT DISTINCT home_city FROM guests;',
    hints: [
      'DISTINCT sits immediately after SELECT.',
      'It removes duplicate rows from the result, not from the table.',
      'SELECT DISTINCT home_city FROM guests;',
    ],
    xp: 50,
  },
  {
    id: 5,
    title: 'The Paris Connection',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'A ticket stub in the study is stamped Gare du Nord. Two of the guests keep houses in Paris and neither mentioned it. Narrow the twelve down to them.',
    objective: 'Return the name of every guest whose home_city is Paris.',
    concepts: ['where'],
    requireKeywords: ['WHERE'],
    solution: "SELECT name FROM guests WHERE home_city = 'Paris';",
    hints: [
      'WHERE goes after the FROM clause and filters rows before you see them.',
      'Text values are wrapped in single quotes.',
      "SELECT name FROM guests WHERE home_city = 'Paris';",
    ],
    xp: 55,
    badge: 'the-narrowing',
  },
  {
    id: 6,
    title: 'Older Than the House',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'The wound went in upward, which the surgeon says argues for someone who could not reach down. Mallory grunts and asks for the older half of the party.',
    objective: 'Return the name and age of every guest older than 50.',
    concepts: ['where'],
    solution: 'SELECT name, age FROM guests WHERE age > 50;',
    hints: [
      'Numbers are not quoted.',
      'Comparison operators: = != < > <= >=',
      'SELECT name, age FROM guests WHERE age > 50;',
    ],
    xp: 60,
  },
  {
    id: 7,
    title: 'Blood and Youth',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'The will was rewritten on Tuesday. Everyone who loses by it is a Blackwood, and the young ones lose most. Two conditions, held at once.',
    objective:
      'Return the name and age of every guest who is family (is_family = 1) and younger than 40.',
    concepts: ['and-or', 'where'],
    requireKeywords: ['AND'],
    solution: 'SELECT name, age FROM guests WHERE is_family = 1 AND age < 40;',
    hints: [
      'AND requires both sides to be true. OR requires either.',
      'The flag column stores 1 for true and 0 for false.',
      'SELECT name, age FROM guests WHERE is_family = 1 AND age < 40;',
    ],
    xp: 60,
  },
  {
    id: 8,
    title: 'Two Cities, One List',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'Cairo and Riga. Two cities that appear in the dead man\'s correspondence, and two guests who will not say why. Writing this with OR would work. Writing it with IN says what you mean.',
    objective: 'Return the name and home_city of every guest whose home_city is Cairo or Riga.',
    concepts: ['in'],
    requireKeywords: ['IN ('],
    forbidKeywords: [' OR '],
    solution: "SELECT name, home_city FROM guests WHERE home_city IN ('Cairo', 'Riga');",
    hints: [
      'IN takes a parenthesised list of values.',
      'It is a tidier spelling of a chain of OR conditions.',
      "SELECT name, home_city FROM guests WHERE home_city IN ('Cairo', 'Riga');",
    ],
    xp: 65,
  },
  {
    id: 9,
    title: 'The Middle Years',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'The footprint in the flowerbed belongs to someone of ordinary build and ordinary age. Mallory wants everyone between thirty and fifty, inclusive at both ends.',
    objective: 'Return the name and age of every guest whose age is between 30 and 50 inclusive.',
    concepts: ['between'],
    requireKeywords: ['BETWEEN'],
    solution: 'SELECT name, age FROM guests WHERE age BETWEEN 30 AND 50;',
    hints: [
      'BETWEEN a AND b includes both a and b.',
      'It is equivalent to age >= 30 AND age <= 50.',
      'SELECT name, age FROM guests WHERE age BETWEEN 30 AND 50;',
    ],
    xp: 70,
  },
  {
    id: 10,
    title: 'The Family Name',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'Four people in this house carry the dead man\'s surname, and one of them is the dead man. You do not have a family column you can trust. You have text, and text can be searched.',
    objective: 'Return the name of every guest whose name contains the word Blackwood.',
    concepts: ['like'],
    requireKeywords: ['LIKE'],
    solution: "SELECT name FROM guests WHERE name LIKE '%Blackwood%';",
    hints: [
      'LIKE compares against a pattern rather than an exact value.',
      'The percent sign stands for any run of characters, including none.',
      "SELECT name FROM guests WHERE name LIKE '%Blackwood%';",
    ],
    xp: 75,
  },
  {
    id: 11,
    title: 'No Alibi At All',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'Every guest was scored on how well their evening holds together. Two were never scored, because nobody could find anyone to ask. A missing score is not a low score, and the database is strict about the difference.',
    objective: 'Return the name of every guest whose alibi_score is missing.',
    concepts: ['is-null'],
    requireKeywords: ['IS NULL'],
    solution: 'SELECT name FROM guests WHERE alibi_score IS NULL;',
    hints: [
      'NULL means unknown. Comparing anything to unknown gives unknown, not true.',
      'That is why = NULL never matches anything. Use IS NULL.',
      'SELECT name FROM guests WHERE alibi_score IS NULL;',
    ],
    xp: 80,
    badge: 'null-hypothesis',
  },
  {
    id: 12,
    title: 'Order of Arrival',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'The house filled over four days. Mallory believes whoever arrived last had the least time to plan and the most reason to hurry. Put the guest list in reverse order of arrival.',
    objective:
      'Return every guest name with arrived_at, newest arrival first. Row order is graded on this case.',
    concepts: ['order-by'],
    orderMatters: true,
    requireKeywords: ['ORDER BY'],
    solution: 'SELECT name, arrived_at FROM guests ORDER BY arrived_at DESC;',
    hints: [
      'ORDER BY is the last clause before LIMIT.',
      'DESC reverses the sort. Without it you get ASC.',
      'SELECT name, arrived_at FROM guests ORDER BY arrived_at DESC;',
    ],
    xp: 80,
  },
  {
    id: 13,
    title: 'Last Three Through the Door',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'Only the final three arrivals had not seen the new will. Mallory wants those three names and nothing else on the page.',
    objective:
      'Return the name and arrived_at of the three most recent arrivals, newest first. Row order is graded.',
    concepts: ['limit', 'order-by'],
    orderMatters: true,
    requireKeywords: ['LIMIT'],
    solution: 'SELECT name, arrived_at FROM guests ORDER BY arrived_at DESC LIMIT 3;',
    hints: [
      'Sort first, then cut. LIMIT without ORDER BY takes an arbitrary three.',
      'LIMIT is the final clause.',
      'SELECT name, arrived_at FROM guests ORDER BY arrived_at DESC LIMIT 3;',
    ],
    xp: 85,
  },
  {
    id: 14,
    title: 'The Second Page',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'The clerk has already copied out the first three arrivals. He wants the next three, and he wants them without recopying what he has. This is how every paginated list you have ever scrolled is built.',
    objective:
      'Ordered by arrived_at oldest first, skip the first three guests and return the next three: name and arrived_at. Row order is graded.',
    concepts: ['limit'],
    orderMatters: true,
    requireKeywords: ['OFFSET'],
    solution: 'SELECT name, arrived_at FROM guests ORDER BY arrived_at ASC LIMIT 3 OFFSET 3;',
    hints: [
      'OFFSET skips rows before LIMIT starts counting.',
      'Page n of size s skips s * (n - 1) rows.',
      'SELECT name, arrived_at FROM guests ORDER BY arrived_at LIMIT 3 OFFSET 3;',
    ],
    xp: 90,
  },
  {
    id: 15,
    title: 'Grading the Alibis',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'A number between 0 and 100 means nothing to a jury. Mallory wants words. Anyone unscored is unaccounted for, under thirty is weak, under seventy is partial, and the rest are solid.',
    objective:
      'Return each guest name and a second column named standing holding: unaccounted when alibi_score is NULL, weak when it is under 30, partial when it is under 70, and solid otherwise.',
    concepts: ['case', 'is-null'],
    strictColumns: true,
    requireKeywords: ['CASE'],
    solution: `SELECT name,
       CASE
         WHEN alibi_score IS NULL THEN 'unaccounted'
         WHEN alibi_score < 30 THEN 'weak'
         WHEN alibi_score < 70 THEN 'partial'
         ELSE 'solid'
       END AS standing
FROM guests;`,
    hints: [
      'CASE tests each WHEN in order and stops at the first that is true.',
      'Put the NULL test first, because a comparison against NULL is never true.',
      "CASE WHEN alibi_score IS NULL THEN 'unaccounted' WHEN alibi_score < 30 THEN 'weak' ... END AS standing",
    ],
    xp: 90,
  },
  {
    id: 16,
    title: 'The Monogram',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'A handkerchief was found under the desk, embroidered with two capitals and two full stops. You do not know whose it is yet, but you can produce the monogram of every guest in the house and read down the list.',
    objective:
      'For every guest return their name and a column named monogram holding their initials in the form A.B. — first letter of the forename, a dot, first letter of the surname, a dot, both upper case.',
    concepts: ['string-functions'],
    strictColumns: true,
    solution: `SELECT name,
       UPPER(SUBSTR(name, 1, 1)) || '.' ||
       UPPER(SUBSTR(name, INSTR(name, ' ') + 1, 1)) || '.' AS monogram
FROM guests;`,
    hints: [
      'SQLite glues text with || rather than CONCAT().',
      'INSTR(name, \' \') gives the position of the space, so the surname starts one character later.',
      "UPPER(SUBSTR(name,1,1)) || '.' || UPPER(SUBSTR(name, INSTR(name,' ')+1, 1)) || '.'",
    ],
    xp: 95,
    badge: 'wordsmith',
  },
  {
    id: 17,
    title: 'The Hour of the Crime',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'The movements table holds forty-two sightings across one evening. The surgeon puts death in the twenty-second hour. Pull that hour out of the timestamps and keep only what happened inside it.',
    objective:
      'Return guest_id, room_id and seen_at for every movement recorded during the 22nd hour, oldest first. Row order is graded.',
    concepts: ['date-functions', 'where'],
    orderMatters: true,
    solution: `SELECT guest_id, room_id, seen_at
FROM movements
WHERE STRFTIME('%H', seen_at) = '22'
ORDER BY seen_at;`,
    hints: [
      'SQLite reads timestamps with STRFTIME(format, column).',
      "STRFTIME('%H', seen_at) returns the hour as two characters of text, so compare it to '22'.",
      "WHERE STRFTIME('%H', seen_at) = '22' ORDER BY seen_at",
    ],
    xp: 100,
  },
  {
    id: 18,
    title: 'Who Entered the Study',
    kind: 'query',
    dataset: 'blackwood',
    story:
      'The study is room 3. It was locked from the inside when the butler broke the door at 23:20, and Lord Blackwood died at 22:47 give or take eight minutes. Three people were logged walking into that room in the twenty minutes before he stopped breathing. You do not have their names yet. You have their numbers, and that is enough to close the first act.',
    objective:
      'Return guest_id and seen_at for every movement into room 3 between 22:30 and 22:50 on 4 November 1923, oldest first. Row order is graded.',
    concepts: ['where', 'and-or', 'between', 'order-by'],
    orderMatters: true,
    solution: `SELECT guest_id, seen_at
FROM movements
WHERE room_id = 3
  AND seen_at BETWEEN '1923-11-04 22:30' AND '1923-11-04 22:50'
ORDER BY seen_at;`,
    hints: [
      'Two conditions joined by AND: the room, and the time window.',
      'Timestamps stored as text sort and compare correctly because the format runs from largest unit to smallest.',
      "WHERE room_id = 3 AND seen_at BETWEEN '1923-11-04 22:30' AND '1923-11-04 22:50'",
    ],
    xp: 120,
    badge: 'case-one-closed',
  },
]);
