import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Badge } from '@/data/badges';
import {
  applyAttempt,
  clearProgress,
  loadProgress,
  revealSolution,
  saveProgress,
  snapshotOf,
  updateSettings,
  applyHint,
} from './progress';
import { emptyProgress, emptyRecord, type Progress, type Settings } from './types';
import { ProgressContext, type ProgressApi, type SubmitResult } from './progress-context';
import { useAuth } from '@/auth/useAuth';
import type { SolveRecord } from '@/auth/accounts';

/** Rebuilds a save file from what the score service holds for one player. */
function progressFromSolves(solves: SolveRecord[], badges: Record<string, string>): Progress {
  const base = emptyProgress();
  const levels: Progress['levels'] = {};
  let xp = 0;

  for (const solve of solves) {
    xp += solve.xp;
    levels[solve.levelId] = {
      ...emptyRecord(),
      solved: true,
      attempts: solve.attempts,
      hintsUsed: solve.hintsUsed,
      revealed: solve.revealed,
      firstSolvedAt: solve.solvedAt,
      bestElapsedMs: solve.elapsedMs,
      solvedOnFirstAttempt: solve.attempts === 1 && solve.hintsUsed === 0 && !solve.revealed,
    };
  }

  return { ...base, xp, levels, badges };
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [pendingBadges, setPendingBadges] = useState<Badge[]>([]);
  const firstRender = useRef(true);

  // Signing in swaps the whole save file for that player's record; signing out
  // falls back to the anonymous one kept in this browser.
  useEffect(() => {
    if (!auth.ready) return;
    let cancelled = false;
    setPendingBadges([]);

    if (auth.account && auth.backend) {
      auth.backend
        .loadProgress(auth.account.id)
        .then((loaded) => {
          if (!cancelled) setProgress(progressFromSolves(loaded.solves, loaded.badges));
        })
        .catch(() => {
          if (!cancelled) setProgress(emptyProgress());
        });
    } else {
      setProgress(loadProgress());
    }

    return () => {
      cancelled = true;
    };
  }, [auth.ready, auth.account, auth.backend, auth.revision]);

  // Persist on change, but not for the initial state we just read back. While a
  // player is signed in the account database is the record, not this cache.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!auth.account) saveProgress(progress);
  }, [progress, auth.account]);

  const submit = useCallback<ProgressApi['submit']>(
    (input) => {
      let result: SubmitResult = {
        earned: [],
        xpGained: 0,
        firstSolve: false,
        breakdown: null,
        actBonus: 0,
      };

      setProgress((current) => {
        const applied = applyAttempt(current, input);
        result = {
          earned: applied.earned,
          xpGained: applied.xpGained,
          firstSolve: applied.firstSolve,
          breakdown: applied.breakdown,
          actBonus: applied.actBonus,
        };
        return applied.progress;
      });

      if (result.earned.length) {
        setPendingBadges((queue) => [...queue, ...result.earned]);
      }

      // Write the solve through so it counts on the leaderboard. The remote
      // backend re-prices it server-side; xp here is what the local one stores.
      if (result.firstSolve && auth.account && auth.backend) {
        const now = new Date().toISOString();
        const userId = auth.account.id;
        const backend = auth.backend;
        void (async () => {
          await backend.recordSolve(userId, {
            levelId: input.levelId,
            solvedAt: now,
            elapsedMs: input.elapsedMs,
            attempts: (progress.levels[input.levelId]?.attempts ?? 0) + 1,
            hintsUsed: progress.levels[input.levelId]?.hintsUsed ?? 0,
            revealed: progress.levels[input.levelId]?.revealed ?? false,
            xp: result.xpGained,
          });
          for (const badge of result.earned) await backend.awardBadge(userId, badge.id, now);
          auth.refresh();
        })().catch(() => undefined);
      }

      return result;
    },
    [auth, progress.levels],
  );

  const takeHint = useCallback((levelId: number) => {
    setProgress((current) => applyHint(current, levelId));
  }, []);

  const reveal = useCallback((levelId: number) => {
    setProgress((current) => revealSolution(current, levelId));
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setProgress((current) => updateSettings(current, patch));
  }, []);

  const reset = useCallback(() => {
    clearProgress();
    setPendingBadges([]);
    setProgress(emptyProgress());
  }, []);

  const dismissBadge = useCallback((id: string) => {
    setPendingBadges((queue) => queue.filter((b) => b.id !== id));
  }, []);

  const value = useMemo<ProgressApi>(
    () => ({
      progress,
      snapshot: snapshotOf(progress),
      submit,
      takeHint,
      reveal,
      setSettings,
      reset,
      pendingBadges,
      dismissBadge,
    }),
    [progress, submit, takeHint, reveal, setSettings, reset, pendingBadges, dismissBadge],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
