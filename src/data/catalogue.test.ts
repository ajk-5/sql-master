// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SITE } from '@/config/site';
import { ACTS } from '@/data/acts';
import { BADGES } from '@/data/badges';
import {
  CONCEPTS,
  CONCEPT_FAMILIES,
  docsFor,
  getConcept,
  type ConceptFamily,
} from '@/data/docs';
import { LEVELS, TOTAL_LEVELS, TOTAL_XP, levelsOfAct } from '@/data/levels';

describe('site configuration agrees with the game', () => {
  it('declares the real number of cases, acts and badges', () => {
    expect(SITE.totalLevels).toBe(TOTAL_LEVELS);
    expect(SITE.totalActs).toBe(ACTS.length);
    expect(SITE.totalBadges).toBe(BADGES.length);
  });

  it('ships at least the 99 cases the game promises', () => {
    expect(TOTAL_LEVELS).toBeGreaterThanOrEqual(99);
  });

  it('points its documentation at sql.sh', () => {
    expect(SITE.docsSource).toMatch(/^https:\/\/sql\.sh/);
  });
});

describe('acts', () => {
  it('covers every case exactly once with no overlapping ranges', () => {
    const covered = new Set<number>();
    for (const act of ACTS) {
      for (let id = act.range[0]; id <= act.range[1]; id += 1) {
        expect(covered.has(id), `case ${id} is claimed by two acts`).toBe(false);
        covered.add(id);
      }
    }
    expect(covered.size).toBe(TOTAL_LEVELS);
  });

  it('gives each act a distinct id, accent colour and level set', () => {
    expect(new Set(ACTS.map((a) => a.id)).size).toBe(ACTS.length);
    expect(new Set(ACTS.map((a) => a.accent)).size).toBe(ACTS.length);
    for (const act of ACTS) {
      expect(levelsOfAct(act.id).length).toBe(act.range[1] - act.range[0] + 1);
    }
  });

  it('numbers acts consecutively from one', () => {
    expect(ACTS.map((a) => a.index)).toEqual(ACTS.map((_, i) => i + 1));
  });
});

describe('difficulty curve', () => {
  it('never lets a later act be worth less than an earlier one on average', () => {
    const averages = ACTS.map((act) => {
      const inAct = levelsOfAct(act.id);
      return inAct.reduce((sum, l) => sum + l.xp, 0) / inAct.length;
    });
    for (let i = 1; i < averages.length; i += 1) {
      expect(averages[i], `act ${i + 1} is easier than act ${i}`).toBeGreaterThan(averages[i - 1]);
    }
  });

  it('ends each act on its most valuable case', () => {
    for (const act of ACTS) {
      const inAct = levelsOfAct(act.id);
      const finale = inAct[inAct.length - 1];
      expect(finale.xp).toBe(Math.max(...inAct.map((l) => l.xp)));
    }
  });

  it('totals a sensible amount of XP', () => {
    expect(TOTAL_XP).toBeGreaterThan(10_000);
  });
});

describe('concepts', () => {
  it('has a unique slug for every concept', () => {
    expect(new Set(CONCEPTS.map((c) => c.slug)).size).toBe(CONCEPTS.length);
  });

  it('files every concept under a known family', () => {
    for (const concept of CONCEPTS) {
      expect(CONCEPT_FAMILIES).toContain(concept.family);
    }
  });

  it('uses only real concept slugs on cases', () => {
    for (const level of LEVELS) {
      for (const slug of level.concepts) {
        expect(getConcept(slug), `case ${level.id} uses unknown concept "${slug}"`).toBeDefined();
      }
    }
  });

  it('practises every concept in at least one case', () => {
    const used = new Set(LEVELS.flatMap((l) => l.concepts));
    const orphans = CONCEPTS.filter((c) => !used.has(c.slug)).map((c) => c.slug);
    // Engine background reading is reference-only and never drilled directly.
    expect(orphans.every((slug) => getConcept(slug)?.family === 'Engines')).toBe(true);
  });

  it('resolves doc links without duplicates', () => {
    const links = docsFor(['select', 'select', 'where']);
    expect(new Set(links.map((l) => l.url)).size).toBe(links.length);
    expect(links.length).toBeGreaterThan(1);
  });

  it('points every documentation link at sql.sh over https', () => {
    for (const concept of CONCEPTS) {
      for (const link of [concept.doc, ...(concept.extra ?? [])]) {
        expect(link.url).toMatch(/^https:\/\/sql\.sh\//);
      }
    }
  });

  it('explains itself wherever sql.sh does not cover the concept directly', () => {
    const needsNote = ['cte', 'recursive-cte', 'window-functions', 'transactions', 'views', 'upsert'];
    for (const slug of needsNote) {
      expect(getConcept(slug)?.note, `${slug} should carry a dialect note`).toBeTruthy();
    }
  });
});

describe('teaching coverage', () => {
  const requiredFamilies: ConceptFamily[] = [
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
  ];

  it('teaches every family of SQL the curriculum claims', () => {
    const taught = new Set(
      LEVELS.flatMap((l) => l.concepts.map((slug) => getConcept(slug)?.family)).filter(Boolean),
    );
    for (const family of requiredFamilies) {
      expect(taught.has(family), `nothing teaches ${family}`).toBe(true);
    }
  });

  it('includes recovery cases that actually change the database', () => {
    const recovery = LEVELS.filter((l) => l.kind === 'mutation' || l.kind === 'recovery');
    expect(recovery.length).toBeGreaterThanOrEqual(20);
    for (const level of recovery) {
      expect(level.check, `case ${level.id} mutates but is not graded on state`).toBeTruthy();
    }
  });

  it('exercises all five worlds', () => {
    expect(new Set(LEVELS.map((l) => l.dataset)).size).toBe(5);
  });
});
