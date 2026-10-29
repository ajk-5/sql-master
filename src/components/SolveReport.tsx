import { useAuth } from '@/auth/useAuth';
import { formatDuration, type XpBreakdown } from '@/game/xp';
import { useAsync } from '@/hooks/useAsync';
import type { LevelStats } from '@/auth/accounts';

/** Enough other solves that an average means something rather than nothing. */
const MEANINGFUL_SAMPLE = 3;

type Props = {
  levelId: number;
  breakdown: XpBreakdown;
  actBonus: number;
  elapsedMs: number;
};

function comparison(elapsedMs: number, stats: LevelStats | null, parMs: number) {
  if (stats && stats.solvers >= MEANINGFUL_SAMPLE && stats.averageMs !== null) {
    const ratio = elapsedMs / stats.averageMs;
    const percent = Math.round(Math.abs(1 - ratio) * 100);
    return {
      label: `Average over ${stats.solvers} investigators`,
      value: formatDuration(stats.averageMs),
      verdict:
        ratio <= 0.95
          ? `You were ${percent}% faster than average.`
          : ratio >= 1.05
            ? `You took ${percent}% longer than average.`
            : 'You were right on the average.',
      good: ratio <= 1.05,
    };
  }

  // Not enough other solves to average honestly, so compare against the target.
  return {
    label: 'Target time for this difficulty',
    value: formatDuration(parMs),
    verdict:
      elapsedMs <= parMs
        ? 'Inside the target. Not enough other solves yet to compare against people.'
        : 'Over the target. Not enough other solves yet to compare against people.',
    good: elapsedMs <= parMs,
  };
}

/** Shown once a case is closed: what the solve paid, and how it compared. */
export function SolveReport({ levelId, breakdown, actBonus, elapsedMs }: Props) {
  const auth = useAuth();
  const { data: stats } = useAsync(
    async () => (auth.backend ? auth.backend.levelStats(levelId) : null),
    [auth.backend, levelId, auth.revision],
  );
  const against = comparison(elapsedMs, stats, breakdown.parMs);

  const factors = [
    { label: 'Base', value: `${breakdown.base}` },
    { label: breakdown.speed.label, value: `×${breakdown.speed.multiplier.toFixed(2)}` },
    { label: breakdown.attempts.label, value: `×${breakdown.attempts.multiplier.toFixed(2)}` },
    { label: breakdown.hints.label, value: `×${breakdown.hints.multiplier.toFixed(2)}` },
  ];

  return (
    <div className="solve-report">
      <div className="solve-report__score">
        <div className="solve-report__xp">+{breakdown.total + actBonus}</div>
        <div className="stat-label">XP earned</div>
      </div>

      <div className="solve-report__body">
        <div className="row" style={{ gap: 6 }}>
          {factors.map((factor) => (
            <span className="pill" key={factor.label}>
              {factor.label} <strong className="mono">{factor.value}</strong>
            </span>
          ))}
          {actBonus > 0 ? (
            <span className="pill pill--accent">Act complete +{actBonus}</span>
          ) : null}
        </div>

        <p style={{ margin: '10px 0 4px' }}>
          You closed this in <strong>{formatDuration(elapsedMs)}</strong>. {against.label}:{' '}
          <strong>{against.value}</strong>.
        </p>
        <p className={against.good ? 'pill pill--ok' : 'pill'} style={{ whiteSpace: 'normal' }}>
          {against.verdict}
        </p>

        {breakdown.speed.multiplier < 1.15 ? (
          <p className="faint" style={{ marginTop: 8, fontSize: 13 }}>
            Solving inside {formatDuration(breakdown.parMs)} would have paid{' '}
            {Math.round(breakdown.base * 1.15 * breakdown.attempts.multiplier * breakdown.hints.multiplier)}{' '}
            instead. Re-solving a case keeps your best score.
          </p>
        ) : null}

        {!auth.account ? (
          <p className="faint" style={{ marginTop: 8, fontSize: 13 }}>
            Sign in to have this count towards the leaderboard and the shared averages.
          </p>
        ) : null}
      </div>
    </div>
  );
}
