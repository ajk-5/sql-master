// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ACTS } from '@/data/acts';
import { difficultyDots, difficultyOf, DIFFICULTY_LABEL } from '@/data/difficulty';
import { LEVELS, levelsOfAct } from '@/data/levels';

describe('difficulty ramp', () => {
  it.each(ACTS.map((a) => [a.id, a] as const))(
    'act %s never gets easier as it goes on',
    (_id, act) => {
      const inAct = levelsOfAct(act.id);
      for (let i = 1; i < inAct.length; i += 1) {
        expect(
          inAct[i].xp,
          `case ${inAct[i].id} ("${inAct[i].title}") is worth less than case ${inAct[i - 1].id} before it`,
        ).toBeGreaterThanOrEqual(inAct[i - 1].xp);
      }
    },
  );

  it.each(ACTS.map((a) => [a.id, a] as const))(
    'act %s difficulty rating never falls back',
    (_id, act) => {
      const ratings = levelsOfAct(act.id).map(difficultyOf);
      for (let i = 1; i < ratings.length; i += 1) {
        expect(ratings[i]).toBeGreaterThanOrEqual(ratings[i - 1]);
      }
    },
  );

  it('opens every act more gently than it closes', () => {
    for (const act of ACTS) {
      const inAct = levelsOfAct(act.id);
      expect(inAct[0].xp).toBeLessThan(inAct[inAct.length - 1].xp);
    }
  });

  it('makes each act finale the hardest case in its act', () => {
    for (const act of ACTS) {
      const inAct = levelsOfAct(act.id);
      const finale = inAct[inAct.length - 1];
      expect(finale.xp).toBe(Math.max(...inAct.map((l) => l.xp)));
      expect(inAct.filter((l) => l.xp === finale.xp)).toHaveLength(1);
    }
  });

  it('raises the ceiling with every act', () => {
    const tops = ACTS.map((act) => Math.max(...levelsOfAct(act.id).map((l) => l.xp)));
    for (let i = 1; i < tops.length; i += 1) {
      expect(tops[i]).toBeGreaterThan(tops[i - 1]);
    }
  });

  it('lets a new act restart gently, because each one opens a new topic', () => {
    // Act IV opens lower than Act III did: writing your first row really is easier
    // than a window function. The rule is that an act never opens at the pitch the
    // last one closed on, and never drops back to the very start of the game.
    const firstCaseXp = levelsOfAct(ACTS[0].id)[0].xp;
    for (let i = 1; i < ACTS.length; i += 1) {
      const previous = levelsOfAct(ACTS[i - 1].id);
      const current = levelsOfAct(ACTS[i].id);
      expect(current[0].xp).toBeLessThan(previous[previous.length - 1].xp);
      expect(current[0].xp).toBeGreaterThan(firstCaseXp);
    }
  });

  it('starts the whole game on the easiest case in the book', () => {
    const easiest = Math.min(...LEVELS.map((l) => l.xp));
    expect(LEVELS[0].xp).toBe(easiest);
  });

  it('ends the whole game on the hardest case in the book', () => {
    const hardest = Math.max(...LEVELS.map((l) => l.xp));
    expect(LEVELS[LEVELS.length - 1].xp).toBe(hardest);
  });
});

describe('difficulty rating', () => {
  it('maps XP onto the five bands', () => {
    expect(difficultyOf({ xp: 40 })).toBe(1);
    expect(difficultyOf({ xp: 100 })).toBe(2);
    expect(difficultyOf({ xp: 150 })).toBe(3);
    expect(difficultyOf({ xp: 200 })).toBe(4);
    expect(difficultyOf({ xp: 350 })).toBe(5);
  });

  it('never leaves a case unrated', () => {
    for (const level of LEVELS) {
      const rating = difficultyOf(level);
      expect(rating).toBeGreaterThanOrEqual(1);
      expect(rating).toBeLessThanOrEqual(5);
      expect(DIFFICULTY_LABEL[rating]).toBeTruthy();
    }
  });

  it('draws five dots whatever the rating', () => {
    for (const level of LEVELS) {
      expect(difficultyDots(level)).toHaveLength(5);
    }
    expect(difficultyDots({ xp: 40 })).toBe('●○○○○');
    expect(difficultyDots({ xp: 350 })).toBe('●●●●●');
  });

  it('uses every band somewhere in the game', () => {
    const used = new Set(LEVELS.map(difficultyOf));
    expect(used).toEqual(new Set([1, 2, 3, 4, 5]));
  });
});
