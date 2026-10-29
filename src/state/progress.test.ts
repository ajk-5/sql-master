// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyAttempt,
  clearProgress,
  furthestUnlocked,
  isUnlocked,
  loadProgress,
  reconcile,
  recordFor,
  revealSolution,
  saveProgress,
  snapshotOf,
  STORAGE_KEY,
  updateSettings,
  applyHint,
  xpOnOffer,
} from './progress';
import { emptyProgress, emptyRecord, type Progress } from './types';
import { BADGES } from '@/data/badges';
import { LEVELS, getLevel } from '@/data/levels';

function solve(progress: Progress, levelId: number, sql = 'SELECT 1;'): Progress {
  return applyAttempt(progress, { levelId, solved: true, elapsedMs: 1000, sql }).progress;
}

/** A Storage implementation the tests own outright, so no browser is needed. */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, String(value)),
  };
}

/** Storage that throws on every access, as a blocked or full browser store does. */
function hostileStorage(): Storage {
  const boom = () => {
    throw new Error('storage is not available');
  };
  return {
    get length(): number {
      return boom();
    },
    clear: boom,
    getItem: boom,
    key: boom,
    removeItem: boom,
    setItem: boom,
  };
}

describe('applyAttempt', () => {
  it('awards XP and marks the case closed the first time', () => {
    const level = getLevel(1)!;
    const result = applyAttempt(emptyProgress(), {
      levelId: 1,
      solved: true,
      elapsedMs: 4200,
      sql: 'SELECT * FROM guests;',
    });
    expect(result.firstSolve).toBe(true);
    expect(result.xpGained).toBeGreaterThan(level.xp);
    expect(result.progress.levels[1].solved).toBe(true);
    expect(result.progress.levels[1].solvedOnFirstAttempt).toBe(true);
  });

  it('does not award XP twice for the same case', () => {
    const once = solve(emptyProgress(), 1);
    const twice = applyAttempt(once, { levelId: 1, solved: true, elapsedMs: 900, sql: 'x' });
    expect(twice.xpGained).toBe(0);
    expect(twice.firstSolve).toBe(false);
    expect(twice.progress.xp).toBe(once.xp);
  });

  it('counts failed attempts without closing the case', () => {
    const result = applyAttempt(emptyProgress(), {
      levelId: 1,
      solved: false,
      elapsedMs: 300,
      sql: 'SELECT',
    });
    expect(result.progress.levels[1].solved).toBe(false);
    expect(result.progress.levels[1].attempts).toBe(1);
    expect(result.progress.xp).toBe(0);
  });

  it('does not credit a first-attempt solve after a failure', () => {
    let progress = applyAttempt(emptyProgress(), {
      levelId: 1,
      solved: false,
      elapsedMs: 100,
      sql: 'bad',
    }).progress;
    progress = solve(progress, 1);
    expect(progress.levels[1].solvedOnFirstAttempt).toBe(false);
  });

  it('keeps the fastest solve time', () => {
    let progress = applyAttempt(emptyProgress(), {
      levelId: 1,
      solved: true,
      elapsedMs: 9000,
      sql: 'a',
    }).progress;
    progress = applyAttempt(progress, { levelId: 1, solved: true, elapsedMs: 2000, sql: 'b' })
      .progress;
    expect(progress.levels[1].bestElapsedMs).toBe(2000);
  });

  it('ignores a case that does not exist', () => {
    const result = applyAttempt(emptyProgress(), {
      levelId: 9999,
      solved: true,
      elapsedMs: 1,
      sql: 'x',
    });
    expect(result.xpGained).toBe(0);
    expect(Object.keys(result.progress.levels)).toHaveLength(0);
  });
});

describe('badges', () => {
  it('awards the badge attached to a case', () => {
    const result = applyAttempt(emptyProgress(), {
      levelId: 1,
      solved: true,
      elapsedMs: 1,
      sql: 'x',
    });
    expect(result.earned.map((b) => b.id)).toContain('first-light');
    expect(result.progress.badges['first-light']).toBeTruthy();
  });

  it('awards a career badge when its rule turns true', () => {
    let progress = emptyProgress();
    for (let id = 1; id <= 9; id += 1) progress = solve(progress, id);
    expect(progress.badges.apprentice).toBeUndefined();

    const tenth = applyAttempt(progress, { levelId: 10, solved: true, elapsedMs: 1, sql: 'x' });
    expect(tenth.earned.map((b) => b.id)).toContain('apprentice');
  });

  it('never awards the same badge twice', () => {
    let progress = emptyProgress();
    for (let id = 1; id <= 11; id += 1) progress = solve(progress, id);
    const again = applyAttempt(progress, { levelId: 12, solved: true, elapsedMs: 1, sql: 'x' });
    expect(again.earned.filter((b) => b.id === 'apprentice')).toHaveLength(0);
  });

  it('gives every badge in the catalogue a way to be earned', () => {
    for (const badge of BADGES) {
      expect(
        badge.levelId !== undefined || badge.rule !== undefined,
        `${badge.id} can never be earned`,
      ).toBe(true);
      if (badge.levelId !== undefined) {
        expect(getLevel(badge.levelId), `${badge.id} points at a missing case`).toBeDefined();
      }
    }
  });

  it('matches every badge a case references to a real badge', () => {
    for (const level of LEVELS) {
      if (!level.badge) continue;
      expect(
        BADGES.some((b) => b.id === level.badge),
        `case ${level.id} references unknown badge ${level.badge}`,
      ).toBe(true);
      expect(
        BADGES.find((b) => b.id === level.badge)?.levelId,
        `badge ${level.badge} should point back at case ${level.id}`,
      ).toBe(level.id);
    }
  });

  it('awards SQL Master only when every case is closed', () => {
    let progress = emptyProgress();
    for (const level of LEVELS) progress = solve(progress, level.id);
    expect(progress.badges.grandmaster).toBeTruthy();
    expect(snapshotOf(progress).solvedCount).toBe(LEVELS.length);
  });
});

describe('scoring a solve', () => {
  it('pays less the longer the case took', () => {
    const quick = applyAttempt(emptyProgress(), {
      levelId: 1,
      solved: true,
      elapsedMs: 10_000,
      sql: 'x',
    });
    const slow = applyAttempt(emptyProgress(), {
      levelId: 1,
      solved: true,
      elapsedMs: 40 * 60_000,
      sql: 'x',
    });
    expect(quick.xpGained).toBeGreaterThan(slow.xpGained);
  });

  it('charges for hints on top of the time', () => {
    let hinted = applyHint(emptyProgress(), 1);
    hinted = applyHint(hinted, 1);
    const withHints = applyAttempt(hinted, {
      levelId: 1,
      solved: true,
      elapsedMs: 10_000,
      sql: 'x',
    });
    const without = applyAttempt(emptyProgress(), {
      levelId: 1,
      solved: true,
      elapsedMs: 10_000,
      sql: 'x',
    });
    expect(withHints.xpGained).toBeLessThan(without.xpGained);
    expect(withHints.breakdown?.hints.multiplier).toBeCloseTo(0.7);
  });

  it('shows the working behind the score', () => {
    const result = applyAttempt(emptyProgress(), {
      levelId: 1,
      solved: true,
      elapsedMs: 10_000,
      sql: 'x',
    });
    expect(result.breakdown?.speed.label).toBe('Lightning');
    expect(result.breakdown?.base).toBe(getLevel(1)!.xp);
  });

  it('quotes what the case is worth right now', () => {
    const offer = xpOnOffer(1, { ...emptyRecord() }, 10_000);
    expect(offer?.total).toBeGreaterThan(0);
    expect(xpOnOffer(9999, { ...emptyRecord() }, 0)).toBeNull();
  });

  it('pays a bonus for finishing an act', () => {
    let progress = emptyProgress();
    for (let id = 1; id <= 17; id += 1) progress = solve(progress, id);
    const finale = applyAttempt(progress, {
      levelId: 18,
      solved: true,
      elapsedMs: 10_000,
      sql: 'x',
    });
    expect(finale.actBonus).toBeGreaterThan(0);
    expect(finale.xpGained).toBeGreaterThan(finale.breakdown!.total);
  });

  it('pays no act bonus while the act is unfinished', () => {
    const result = applyAttempt(emptyProgress(), {
      levelId: 1,
      solved: true,
      elapsedMs: 10_000,
      sql: 'x',
    });
    expect(result.actBonus).toBe(0);
  });
});

describe('snapshot', () => {
  it('counts hint-free and first-attempt solves separately', () => {
    let progress = solve(emptyProgress(), 1);
    progress = applyHint(progress, 2);
    progress = solve(progress, 2);
    const snapshot = snapshotOf(progress);
    expect(snapshot.solvedCount).toBe(2);
    expect(snapshot.solvedWithoutHints).toBe(1);
    expect(snapshot.solvedFirstAttempt).toBe(2);
  });

  it('does not count a revealed case as hint-free', () => {
    let progress = revealSolution(emptyProgress(), 1);
    progress = solve(progress, 1);
    expect(snapshotOf(progress).solvedWithoutHints).toBe(0);
  });

  it('tracks which worlds and concept families have been touched', () => {
    const progress = solve(emptyProgress(), 1);
    const snapshot = snapshotOf(progress);
    expect(snapshot.datasetsCleared).toEqual(['blackwood']);
    expect(snapshot.conceptFamiliesCleared).toContain('Reading data');
  });

  it('reports an act as complete only when every case in it is closed', () => {
    let progress = emptyProgress();
    for (let id = 1; id <= 17; id += 1) progress = solve(progress, id);
    expect(snapshotOf(progress).actsCompleted).not.toContain('blackwood');
    progress = solve(progress, 18);
    expect(snapshotOf(progress).actsCompleted).toContain('blackwood');
  });
});

describe('unlocking', () => {
  it('opens the first three cases to a new player', () => {
    const progress = emptyProgress();
    expect(isUnlocked(progress, 1)).toBe(true);
    expect(isUnlocked(progress, 3)).toBe(true);
    expect(isUnlocked(progress, 4)).toBe(false);
  });

  it('advances the frontier as cases are closed', () => {
    const progress = solve(emptyProgress(), 1);
    expect(furthestUnlocked(progress)).toBe(2);
    expect(isUnlocked(progress, 4)).toBe(true);
    expect(isUnlocked(progress, 5)).toBe(false);
  });

  it('never points past the end of the case book', () => {
    let progress = emptyProgress();
    for (const level of LEVELS) progress = solve(progress, level.id);
    expect(furthestUnlocked(progress)).toBe(LEVELS.length);
  });
});

describe('persistence', () => {
  let store: Storage;

  beforeEach(() => {
    store = memoryStorage();
  });

  it('round-trips a save through storage', () => {
    const progress = solve(emptyProgress(), 1);
    saveProgress(progress, store);
    const loaded = loadProgress(store);
    expect(loaded.levels[1].solved).toBe(true);
    expect(loaded.xp).toBe(progress.xp);
  });

  it('returns a fresh file when storage is empty', () => {
    expect(loadProgress(store).xp).toBe(0);
  });

  it('returns a fresh file rather than throwing on corrupt data', () => {
    store.setItem(STORAGE_KEY, '{not json');
    expect(loadProgress(store).xp).toBe(0);
  });

  it('drops references to cases and badges that no longer exist', () => {
    const repaired = reconcile({
      xp: 50,
      levels: { 9999: { ...emptyRecord(), solved: true }, 1: { ...emptyRecord(), solved: true } },
      badges: { 'no-such-badge': 'now', 'first-light': 'now' },
    } as unknown as Partial<Progress>);
    expect(repaired.levels[9999]).toBeUndefined();
    expect(repaired.levels[1].solved).toBe(true);
    expect(repaired.badges['no-such-badge']).toBeUndefined();
    expect(repaired.badges['first-light']).toBe('now');
  });

  it('repairs negative or missing counters', () => {
    const repaired = reconcile({
      xp: -10,
      levels: { 1: { attempts: -5, hintsUsed: -2 } },
    } as unknown as Partial<Progress>);
    expect(repaired.xp).toBe(0);
    expect(repaired.levels[1].attempts).toBe(0);
    expect(repaired.levels[1].hintsUsed).toBe(0);
  });

  it('migrates a save written under an older key', () => {
    const old = solve(emptyProgress(), 1);
    store.setItem('sqlmaster.progress.v1', JSON.stringify(old));
    expect(loadProgress(store).levels[1].solved).toBe(true);
  });

  it('clears every key it owns', () => {
    saveProgress(solve(emptyProgress(), 1), store);
    store.setItem('sqlmaster.progress.v1', '{}');
    clearProgress(store);
    expect(store.getItem(STORAGE_KEY)).toBeNull();
    expect(store.getItem('sqlmaster.progress.v1')).toBeNull();
  });

  it('survives storage being unavailable', () => {
    expect(() => saveProgress(emptyProgress(), undefined)).not.toThrow();
    expect(loadProgress(undefined).xp).toBe(0);
  });

  it('survives storage that throws on every call', () => {
    const hostile = hostileStorage();
    expect(() => saveProgress(solve(emptyProgress(), 1), hostile)).not.toThrow();
    expect(() => clearProgress(hostile)).not.toThrow();
    expect(loadProgress(hostile).xp).toBe(0);
  });
});

describe('settings and records', () => {
  it('patches settings without losing the others', () => {
    const next = updateSettings(emptyProgress(), { soundOn: false });
    expect(next.settings.soundOn).toBe(false);
    expect(next.settings.showLineNumbers).toBe(true);
  });

  it('returns an empty record for an untouched case', () => {
    expect(recordFor(emptyProgress(), 42)).toEqual(emptyRecord());
  });
});
