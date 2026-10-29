import { useEffect, useRef } from 'react';
import { X, Award } from 'lucide-react';
import type { LeaderboardRow } from '@/auth/accounts';
import { LEVELS } from '@/data/levels';
import { formatDuration } from '@/game/xp';
import { BadgeInsignia } from './BadgeInsignia';
import { earnedBadgeList, investigatorTitle } from './investigator-utils';

export function InvestigatorAvatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span
      className={`investigator-avatar${large ? ' investigator-avatar--large' : ''}`}
      aria-hidden="true"
    >
      {name
        .trim()
        .split(/\s+/)
        .map((part) => Array.from(part)[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()}
    </span>
  );
}

export function InvestigatorProfile({
  row,
  onClose,
}: {
  row: LeaderboardRow;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const badges = earnedBadgeList(row.earnedBadges);
  const percent = Math.round((row.solved / LEVELS.length) * 100);

  useEffect(() => {
    const element = dialog.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    if (!element.open) element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="profile-dialog"
      aria-labelledby="profile-name"
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="profile-topline">
        <span className="eyebrow">Personnel file / No. {String(row.userId).padStart(4, '0')}</span>
        <button className="icon-button" onClick={onClose} aria-label="Close profile">
          <X size={20} />
        </button>
      </div>
      <div className="profile-identity">
        <InvestigatorAvatar name={row.displayName} large />
        <div className="profile-name">
          <span className="eyebrow">{investigatorTitle(row.solved)}</span>
          <h2 id="profile-name">{row.displayName}</h2>
          <span className="muted">@{row.username}</span>
        </div>
        <div className="profile-featured" aria-label="Featured earned badges">
          {badges.slice(0, 2).map((badge) => (
            <BadgeInsignia key={badge.id} badge={badge} />
          ))}
        </div>
      </div>
      <dl className="profile-stats">
        <div>
          <dt>Field rank</dt>
          <dd>#{row.rank}</dd>
        </div>
        <div>
          <dt>Experience</dt>
          <dd>
            {row.xp.toLocaleString()} <small>XP</small>
          </dd>
        </div>
        <div>
          <dt>Avg. solve</dt>
          <dd>{formatDuration(row.averageMs ?? Number.NaN)}</dd>
        </div>
      </dl>
      <div className="profile-completion">
        <span>Case book completion</span>
        <strong>
          {row.solved} / {LEVELS.length}
        </strong>
        <progress
          value={row.solved}
          max={LEVELS.length}
          aria-label={`${percent}% of cases closed`}
        />
      </div>
      <div className="profile-badge-heading">
        <h3>
          <Award size={19} /> Earned distinctions
        </h3>
        <span className="mono">{row.badges}</span>
      </div>
      {badges.length ? (
        <div className="profile-badges">
          {badges.map((badge) => (
            <article className="profile-badge" key={badge.id}>
              <BadgeInsignia badge={badge} />
              <div>
                <span className={`tier-label tier-label--${badge.tier}`}>{badge.tier}</span>
                <h4>{badge.name}</h4>
                <p>{badge.blurb}</p>
                <span className="faint">
                  Earned{' '}
                  {new Date(row.earnedBadges![badge.id]).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="profile-empty">
          <Award size={30} />
          <h4>{row.badges ? 'Badge details are unavailable' : 'A career waiting to be written'}</h4>
          <p>
            {row.badges
              ? 'This scoreboard shares badge totals only.'
              : 'Their first distinction arrives with their first solved case.'}
          </p>
        </div>
      )}
    </dialog>
  );
}
