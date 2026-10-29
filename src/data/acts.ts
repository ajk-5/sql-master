import type { Act } from '@/engine/types';

export const ACTS: Act[] = [
  {
    id: 'blackwood',
    index: 1,
    name: 'The Blackwood Séance',
    tagline: 'A locked study, twelve guests, one missing letter opener.',
    synopsis:
      'Lord Alistair Blackwood is dead at 22:47 and the constabulary has given you the only copy of the case database. You cannot interview anyone. You can only ask the tables questions. This act teaches you to read a database at all: choosing columns, filtering rows, sorting, slicing, and noticing that a missing alibi is not the same as a bad one.',
    dataset: 'blackwood',
    accent: '#c9a227',
    glyph: '🕯',
    range: [1, 18],
  },
  {
    id: 'vault',
    index: 2,
    name: 'Ashgate Vault',
    tagline: 'You are on the wrong side of the door, and the air is on a timer.',
    synopsis:
      'Sub-level four sealed at 23:04 with you inside. Badges, doors, cameras and staff rosters all live in separate tables, and the exit logic depends on how they line up. This act is about joins and aggregation: nothing in here can be answered by one table alone.',
    dataset: 'vault',
    accent: '#3fa7d6',
    glyph: '🔒',
    range: [19, 36],
  },
  {
    id: 'cartel',
    index: 3,
    name: 'The Meridian Circuit',
    tagline: 'The money leaves, goes round, and comes home slightly smaller.',
    synopsis:
      'Financial Crimes has four hundred wires and a banker who has stopped answering. Layering, round-tripping and structuring are all patterns in time, and finding them needs a query that can look at a row and its neighbours at once. This act is subqueries, CTEs, recursion and window functions.',
    dataset: 'cartel',
    accent: '#7b5cd6',
    glyph: '💠',
    range: [37, 56],
  },
  {
    id: 'blackout',
    index: 4,
    name: 'Blackout at Kestrel',
    tagline: 'The generator failed mid-write. Now you own the consequences.',
    synopsis:
      'Orders lost their totals, items lost their orders, and a contractor ran an UPDATE with no WHERE clause. There is a snapshot six hours old and a journal of everything after it. This act is the one that matters at three in the morning: writing data, transactions, rollback, and rebuilding truth from what survived.',
    dataset: 'blackout',
    accent: '#e0533d',
    glyph: '⚡',
    range: [57, 78],
  },
  {
    id: 'nexus',
    index: 5,
    name: 'The Ninth Floor',
    tagline: 'The architect is gone and the schema he left will not let you out.',
    synopsis:
      'A wide untyped intake table, an index nobody built, a view nobody documented, and a hierarchy of rooms that only recursion can walk. This act hands you the other half of SQL: designing the thing, constraining it, indexing it, and asking the planner what it intends to do.',
    dataset: 'nexus',
    accent: '#3ec1a0',
    glyph: '🏛',
    range: [79, 96],
  },
  {
    id: 'archivist',
    index: 6,
    name: 'The Archivist',
    tagline: 'Someone has been deleting themselves from every case you have solved.',
    synopsis:
      'Every scene you have worked returns, and each one is missing something. The finale has no new syntax to teach. It asks whether you can pick the right tool without being told which act you are in.',
    dataset: 'nexus',
    accent: '#d64550',
    glyph: '🗝',
    range: [97, 108],
  },
];

const byId = new Map(ACTS.map((a) => [a.id, a]));

export function getAct(id: string): Act {
  const act = byId.get(id);
  if (!act) throw new Error(`Unknown act: ${id}`);
  return act;
}

export function actForLevel(levelId: number): Act {
  const act = ACTS.find((a) => levelId >= a.range[0] && levelId <= a.range[1]);
  if (!act) throw new Error(`No act contains level ${levelId}`);
  return act;
}
