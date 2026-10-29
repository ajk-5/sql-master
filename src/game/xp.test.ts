// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  FLOOR_SHARE,
  PAR_MS,
  actCompletionBonus,
  bestPossible,
  formatDuration,
  scoreLevelSolve,
  scoreSolve,
} from './xp';
import { LEVELS, getLevel } from '@/data/levels';
import { difficultyOf } from '@/data/difficulty';

const clean = { attempts: 1, hintsUsed: 0, revealed: false };

function score(elapsedMs: number, overrides: Partial<Parameters<typeof scoreSolve>[0]> = {}) {
  return scoreSolve({ baseXp: 100, difficulty: 3, elapsedMs, ...clean, ...overrides });
}

describe('time decides most of the reward', () => {
  it('pays more the faster the case is closed', () => {
    const par = PAR_MS[3];
    const lightning = score(par * 0.2).total;
    const fast = score(par * 0.6).total;
    const onPar = score(par * 0.9).total;
    const slow = score(par * 2).total;
    const patient = score(par * 10).total;

    expect(lightning).toBeGreaterThan(fast);
    expect(fast).toBeGreaterThan(onPar);
    expect(onPar).toBeGreaterThan(slow);
    expect(slow).toBeGreaterThan(patient);
  });

  it('never falls to nothing, however long it takes', () => {
    const forever = score(PAR_MS[3] * 1000);
    expect(forever.total).toBeGreaterThanOrEqual(Math.round(100 * FLOOR_SHARE));
    expect(forever.speed.label).toBe('Patient');
  });

  it('is worth more than twice as much fast as slow', () => {
    expect(score(PAR_MS[3] * 0.2).total / score(PAR_MS[3] * 10).total).toBeGreaterThan(2);
  });

  it('gives a harder case a longer target time', () => {
    expect(PAR_MS[1]).toBeLessThan(PAR_MS[3]);
    expect(PAR_MS[3]).toBeLessThan(PAR_MS[5]);
  });

  it('names the band so a player knows why', () => {
    expect(score(PAR_MS[3] * 0.2).speed.label).toBe('Lightning');
    expect(score(PAR_MS[3] * 0.9).speed.label).toBe('On par');
    expect(score(PAR_MS[3] * 2).speed.label).toBe('Slow');
  });

  it('treats a nonsense elapsed time as instant rather than crashing', () => {
    expect(score(-5000).total).toBeGreaterThan(0);
  });
});

describe('attempts and hints', () => {
  it('rewards getting it right first time', () => {
    const first = score(PAR_MS[3], { attempts: 1 }).total;
    const later = score(PAR_MS[3], { attempts: 8 }).total;
    expect(first).toBeGreaterThan(later);
  });

  it('charges fifteen per cent per hint, up to three', () => {
    const none = score(PAR_MS[3], { hintsUsed: 0 });
    const one = score(PAR_MS[3], { hintsUsed: 1 });
    const three = score(PAR_MS[3], { hintsUsed: 3 });
    const many = score(PAR_MS[3], { hintsUsed: 9 });

    expect(one.hints.multiplier).toBeCloseTo(0.85);
    expect(three.hints.multiplier).toBeCloseTo(0.55);
    expect(many.hints.multiplier).toBeCloseTo(0.55);
    expect(none.total).toBeGreaterThan(one.total);
  });

  it('collapses the reward when the answer is revealed, whatever the time', () => {
    const revealed = score(0, { revealed: true });
    expect(revealed.total).toBe(25);
    expect(revealed.hints.label).toMatch(/revealed/i);
  });
});

describe('the range the system spans', () => {
  it('spreads a single case across a wide band', () => {
    const level = getLevel(108)!;
    const best = bestPossible(level);
    const worst = scoreLevelSolve(level, {
      elapsedMs: PAR_MS[difficultyOf(level)] * 20,
      attempts: 40,
      hintsUsed: 3,
      revealed: false,
    }).total;

    expect(best).toBeGreaterThan(level.xp);
    expect(worst).toBeLessThan(level.xp);
    expect(best / worst).toBeGreaterThan(3);
  });

  it('can pay more than the base for an excellent solve', () => {
    const level = getLevel(1)!;
    expect(bestPossible(level)).toBeGreaterThan(level.xp);
  });

  it('keeps a harder case worth more than an easier one at equal effort', () => {
    const easy = scoreLevelSolve(getLevel(1)!, { elapsedMs: 30_000, ...clean });
    const hard = scoreLevelSolve(getLevel(108)!, { elapsedMs: 30_000, ...clean });
    expect(hard.total).toBeGreaterThan(easy.total);
  });

  it('pays a tenth of an act for finishing it', () => {
    const act = LEVELS.filter((l) => l.actId === 'blackwood');
    const base = act.reduce((sum, l) => sum + l.xp, 0);
    expect(actCompletionBonus(act)).toBe(Math.round(base * 0.1));
  });
});

describe('formatDuration', () => {
  it('reads naturally at every scale', () => {
    expect(formatDuration(4_000)).toBe('4s');
    expect(formatDuration(95_000)).toBe('1m 35s');
    expect(formatDuration(3_725_000)).toBe('1h 02m');
  });

  it('copes with nothing to report', () => {
    expect(formatDuration(Number.NaN)).toBe('—');
    expect(formatDuration(-1)).toBe('—');
  });
});
