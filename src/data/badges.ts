import type { ProgressSnapshot } from '@/state/types';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'legendary';

export type Badge = {
  id: string;
  name: string;
  blurb: string;
  /** What the player has to do, in plain words, shown while it is still locked. */
  how: string;
  glyph: string;
  tier: BadgeTier;
  /** Awarded the moment this level is solved. */
  levelId?: number;
  /** Awarded when this rule turns true, checked after every solve. */
  rule?: (s: ProgressSnapshot) => boolean;
};

export const BADGES: Badge[] = [
  // Act I — Blackwood Manor
  {
    id: 'first-light',
    name: 'First Light',
    blurb: 'You opened the case file and asked a database its first question.',
    how: 'Solve case 1.',
    glyph: '🕯',
    tier: 'bronze',
    levelId: 1,
  },
  {
    id: 'the-narrowing',
    name: 'The Narrowing',
    blurb: 'Twelve suspects became two, because you learned to filter.',
    how: 'Solve case 5.',
    glyph: '🔍',
    tier: 'bronze',
    levelId: 5,
  },
  {
    id: 'null-hypothesis',
    name: 'Null Hypothesis',
    blurb: 'You understand that a missing alibi is not a weak one.',
    how: 'Solve case 11.',
    glyph: '␀',
    tier: 'silver',
    levelId: 11,
  },
  {
    id: 'wordsmith',
    name: 'Wordsmith',
    blurb: 'You cut, folded and glued text until it gave up a monogram.',
    how: 'Solve case 16.',
    glyph: '✒',
    tier: 'silver',
    levelId: 16,
  },
  {
    id: 'case-one-closed',
    name: 'The Blackwood Séance',
    blurb: 'Three names walked into the study. You found all three.',
    how: 'Solve case 18 and close Act I.',
    glyph: '🗝',
    tier: 'gold',
    levelId: 18,
  },

  // Act II — Ashgate Vault
  {
    id: 'first-join',
    name: 'Two Tables, One Truth',
    blurb: 'You made two tables speak to each other.',
    how: 'Solve case 19.',
    glyph: '⛓',
    tier: 'bronze',
    levelId: 19,
  },
  {
    id: 'the-left-behind',
    name: 'The Left Behind',
    blurb: 'An inner join was throwing people away. You noticed.',
    how: 'Solve case 21.',
    glyph: '👤',
    tier: 'silver',
    levelId: 21,
  },
  {
    id: 'chain-of-custody',
    name: 'Chain of Custody',
    blurb: 'Three tables, one story, and every link held.',
    how: 'Solve case 25.',
    glyph: '🔗',
    tier: 'silver',
    levelId: 25,
  },
  {
    id: 'set-theorist',
    name: 'Set Theorist',
    blurb: 'Union, intersection and difference, used deliberately.',
    how: 'Solve case 30.',
    glyph: '◑',
    tier: 'silver',
    levelId: 30,
  },
  {
    id: 'the-grouper',
    name: 'The Grouper',
    blurb: 'You stopped reading rows and started reading buckets.',
    how: 'Solve case 33.',
    glyph: '▦',
    tier: 'silver',
    levelId: 33,
  },
  {
    id: 'case-two-closed',
    name: 'Ashgate Vault',
    blurb: 'A card belonging to nobody walked out of a sealed building, and you traced it.',
    how: 'Solve case 36 and close Act II.',
    glyph: '🔓',
    tier: 'gold',
    levelId: 36,
  },

  // Act III — The Meridian Circuit
  {
    id: 'query-within-query',
    name: 'Query Within a Query',
    blurb: 'You used an answer as a question.',
    how: 'Solve case 37.',
    glyph: '❐',
    tier: 'bronze',
    levelId: 37,
  },
  {
    id: 'the-with-clause',
    name: 'Named the Middle',
    blurb: 'You gave the messy part of the query a name and it became readable.',
    how: 'Solve case 44.',
    glyph: '✎',
    tier: 'silver',
    levelId: 44,
  },
  {
    id: 'down-the-rabbit-hole',
    name: 'Down the Rabbit Hole',
    blurb: 'A query that calls itself, walking an ownership tree to its root.',
    how: 'Solve case 46.',
    glyph: '🌀',
    tier: 'gold',
    levelId: 46,
  },
  {
    id: 'through-the-window',
    name: 'Through the Window',
    blurb: 'You aggregated without collapsing a single row.',
    how: 'Solve case 48.',
    glyph: '🪟',
    tier: 'gold',
    levelId: 48,
  },
  {
    id: 'case-three-closed',
    name: 'The Meridian Circuit',
    blurb: 'The money left, went round and came home smaller. Three times.',
    how: 'Solve case 56 and close Act III.',
    glyph: '💠',
    tier: 'gold',
    levelId: 56,
  },

  // Act IV — Blackout at Kestrel
  {
    id: 'first-write',
    name: 'First Write',
    blurb: 'You changed a database instead of merely asking it things.',
    how: 'Solve case 57.',
    glyph: '✚',
    tier: 'bronze',
    levelId: 57,
  },
  {
    id: 'rebuilder',
    name: 'Rebuilder',
    blurb: 'Eight totals erased, eight totals derived back from the lines.',
    how: 'Solve case 62.',
    glyph: '🧱',
    tier: 'silver',
    levelId: 62,
  },
  {
    id: 'orphan-hunter',
    name: 'Orphan Hunter',
    blurb: 'Rows pointing at orders that never existed, found and removed.',
    how: 'Solve case 64.',
    glyph: '🕳',
    tier: 'silver',
    levelId: 64,
  },
  {
    id: 'atomic',
    name: 'All or Nothing',
    blurb: 'Two statements made indivisible. Stock can no longer be invented.',
    how: 'Solve case 66.',
    glyph: '⚛',
    tier: 'silver',
    levelId: 66,
  },
  {
    id: 'undo',
    name: 'Take It Back',
    blurb: 'You ran the wrong thing on purpose and then unran it.',
    how: 'Solve case 67.',
    glyph: '↶',
    tier: 'gold',
    levelId: 67,
  },
  {
    id: 'restorer',
    name: 'Restorer',
    blurb: 'A six hour old snapshot, applied only where it was allowed to reach.',
    how: 'Solve case 69.',
    glyph: '🗄',
    tier: 'silver',
    levelId: 69,
  },
  {
    id: 'journal-keeper',
    name: 'Journal Keeper',
    blurb: 'You replayed a write-ahead log and marked your work behind you.',
    how: 'Solve case 70.',
    glyph: '📓',
    tier: 'gold',
    levelId: 70,
  },
  {
    id: 'deduplicator',
    name: 'Deduplicator',
    blurb: 'The same customer twice became the same customer once.',
    how: 'Solve case 73.',
    glyph: '⧉',
    tier: 'silver',
    levelId: 73,
  },
  {
    id: 'case-four-closed',
    name: 'Blackout at Kestrel',
    blurb: 'The lorries loaded at six because of what you did at four.',
    how: 'Solve case 78 and close Act IV.',
    glyph: '⚡',
    tier: 'legendary',
    levelId: 78,
  },

  // Act V — The Ninth Floor
  {
    id: 'architect',
    name: 'Architect',
    blurb: 'You stopped reading schemas and started declaring them.',
    how: 'Solve case 79.',
    glyph: '📐',
    tier: 'bronze',
    levelId: 79,
  },
  {
    id: 'keeper-of-keys',
    name: 'Keeper of Keys',
    blurb: 'A reference that can no longer point at nothing.',
    how: 'Solve case 82.',
    glyph: '🔑',
    tier: 'silver',
    levelId: 82,
  },
  {
    id: 'the-named-query',
    name: 'The Named Query',
    blurb: 'Six reports and one definition of what active means.',
    how: 'Solve case 85.',
    glyph: '👁',
    tier: 'silver',
    levelId: 85,
  },
  {
    id: 'the-index-finger',
    name: 'The Index Finger',
    blurb: 'The nine o clock freeze became a seek.',
    how: 'Solve case 87.',
    glyph: '⚡',
    tier: 'gold',
    levelId: 87,
  },
  {
    id: 'json-whisperer',
    name: 'JSON Whisperer',
    blurb: 'You read the parts of the schema nobody bothered to design.',
    how: 'Solve case 91.',
    glyph: '{}',
    tier: 'silver',
    levelId: 91,
  },
  {
    id: 'normaliser',
    name: 'One Fact Per Row',
    blurb: 'A comma-separated column became a table, as it should always have been.',
    how: 'Solve case 94.',
    glyph: '⌗',
    tier: 'gold',
    levelId: 94,
  },
  {
    id: 'case-five-closed',
    name: 'The Ninth Floor',
    blurb: 'Typed, constrained, keyed, indexed and hidden behind a view. The floor let you go.',
    how: 'Solve case 96 and close Act V.',
    glyph: '🏛',
    tier: 'legendary',
    levelId: 96,
  },

  // Act VI — The Archivist
  {
    id: 'pattern-matcher',
    name: 'Pattern Matcher',
    blurb: 'Two people were in a room they never mentioned.',
    how: 'Solve case 97.',
    glyph: '🧩',
    tier: 'silver',
    levelId: 97,
  },
  {
    id: 'night-route',
    name: 'Night Route',
    blurb: 'You put a clock on a route and it stopped looking like wandering.',
    how: 'Solve case 98.',
    glyph: '🌙',
    tier: 'silver',
    levelId: 98,
  },
  {
    id: 'follow-the-money',
    name: 'Follow the Money',
    blurb: 'Two hops out from the nominee, every path printed.',
    how: 'Solve case 99.',
    glyph: '💸',
    tier: 'gold',
    levelId: 99,
  },
  {
    id: 'the-ledger-balances',
    name: 'The Ledger Balances',
    blurb: 'Charged, settled and taken twice, told apart at last.',
    how: 'Solve case 100.',
    glyph: '⚖',
    tier: 'gold',
    levelId: 100,
  },
  {
    id: 'exfiltration',
    name: 'Ninety-One Megabytes',
    blurb: 'You measured normal, and then measured what was not.',
    how: 'Solve case 101.',
    glyph: '📡',
    tier: 'gold',
    levelId: 101,
  },
  {
    id: 'case-six-closed',
    name: 'The Archivist',
    blurb: 'Recursion, JSON and a running total. The file is closed.',
    how: 'Solve case 108 and finish the game.',
    glyph: '🗝',
    tier: 'legendary',
    levelId: 108,
  },

  // Career badges, earned across the whole game
  {
    id: 'apprentice',
    name: 'Apprentice',
    blurb: 'Ten cases closed. The syntax has stopped fighting you.',
    how: 'Solve any 10 cases.',
    glyph: '★',
    tier: 'bronze',
    rule: (s) => s.solvedCount >= 10,
  },
  {
    id: 'investigator',
    name: 'Investigator',
    blurb: 'Twenty-five closed. You reach for the right clause without thinking.',
    how: 'Solve any 25 cases.',
    glyph: '★★',
    tier: 'silver',
    rule: (s) => s.solvedCount >= 25,
  },
  {
    id: 'inspector',
    name: 'Inspector',
    blurb: 'Half the case book. Most working developers stop long before here.',
    how: 'Solve any 50 cases.',
    glyph: '★★★',
    tier: 'gold',
    rule: (s) => s.solvedCount >= 50,
  },
  {
    id: 'chief-inspector',
    name: 'Chief Inspector',
    blurb: 'Seventy-five cases. There is very little left that can surprise you.',
    how: 'Solve any 75 cases.',
    glyph: '👑',
    tier: 'gold',
    rule: (s) => s.solvedCount >= 75,
  },
  {
    id: 'grandmaster',
    name: 'SQL Master',
    blurb: 'Every case in the book, from your first SELECT to point-in-time recovery.',
    how: 'Solve all 108 cases.',
    glyph: '🏆',
    tier: 'legendary',
    rule: (s) => s.solvedCount >= 108,
  },
  {
    id: 'unaided',
    name: 'Unaided',
    blurb: 'Ten cases solved without opening a single hint.',
    how: 'Solve 10 cases without using a hint.',
    glyph: '🔇',
    tier: 'silver',
    rule: (s) => s.solvedWithoutHints >= 10,
  },
  {
    id: 'purist',
    name: 'Purist',
    blurb: 'Thirty cases, no hints. You are reading the documentation instead.',
    how: 'Solve 30 cases without using a hint.',
    glyph: '🧊',
    tier: 'legendary',
    rule: (s) => s.solvedWithoutHints >= 30,
  },
  {
    id: 'clean-sweep',
    name: 'Clean Sweep',
    blurb: 'Fifteen cases that went in correctly the very first time.',
    how: 'Solve 15 cases on the first attempt.',
    glyph: '🎯',
    tier: 'gold',
    rule: (s) => s.solvedFirstAttempt >= 15,
  },
  {
    id: 'polyglot',
    name: 'Five Crime Scenes',
    blurb: 'You have worked every database in the game.',
    how: 'Solve at least one case in each of the five worlds.',
    glyph: '🗺',
    tier: 'silver',
    rule: (s) => s.datasetsCleared.length >= 5,
  },
  {
    id: 'thousand-club',
    name: 'Five Thousand',
    blurb: 'Five thousand experience points of accumulated stubbornness.',
    how: 'Earn 5,000 XP.',
    glyph: '💎',
    tier: 'gold',
    rule: (s) => s.xp >= 5000,
  },
];

const byId = new Map(BADGES.map((b) => [b.id, b]));

export function getBadge(id: string): Badge | undefined {
  return byId.get(id);
}

export const TIER_ORDER: Record<BadgeTier, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  legendary: 3,
};

/** Every badge whose rule now holds and that has not already been earned. */
export function newlyEarnedRuleBadges(
  snapshot: ProgressSnapshot,
  already: Record<string, string>,
): Badge[] {
  return BADGES.filter((b) => b.rule && !already[b.id] && b.rule(snapshot));
}

export const TOTAL_BADGES = BADGES.length;
