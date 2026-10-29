import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, LockKeyhole, Check } from 'lucide-react';
import { BADGES, type BadgeTier } from '@/data/badges';
import { BadgeInsignia } from '@/components/BadgeInsignia';
import { TIER_COLOR } from '@/components/tier-colors';
import { useProgressStore } from '@/state/useProgress';
import { useSeo } from '@/seo/useSeo';

const TIERS: BadgeTier[] = ['legendary', 'gold', 'silver', 'bronze'];
const TIER_DESCRIPTION: Record<BadgeTier, string> = {
  legendary: 'For the few who see a case through to the very end.',
  gold: 'The moments when difficult becomes second nature.',
  silver: 'Proof that you know where to look, and what to ask.',
  bronze: 'Every investigator starts with a first question.',
};
export function Badges() {
  const { progress } = useProgressStore();
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const earnedCount = BADGES.filter((badge) => progress.badges[badge.id]).length;
  useSeo({
    title: 'Badges',
    description:
      'Explore 48 investigator distinctions, from your first SELECT to point-in-time recovery.',
    path: '/badges',
  });
  const visible = BADGES.filter(
    (badge) =>
      filter === 'all' ||
      (filter === 'earned' ? !!progress.badges[badge.id] : !progress.badges[badge.id]),
  );
  return (
    <div className="page collection-page">
      <header className="bureau-heading">
        <div>
          <p className="eyebrow">The bureau / Hall of distinctions</p>
          <h1>Proof of your persistence.</h1>
          <p className="muted">
            Small emblems. Big breakthroughs. A collection earned one query at a time.
          </p>
        </div>
        <div className="collection-progress">
          <strong>
            {earnedCount}
            <span> / {BADGES.length}</span>
          </strong>
          <span>
            {earnedCount} of {BADGES.length} earned
          </span>
          <progress
            value={earnedCount}
            max={BADGES.length}
            aria-label="Badge collection completion"
          />
        </div>
      </header>
      <div className="collection-toolbar">
        <div className="collection-filters" role="group" aria-label="Filter badges">
          {(['all', 'earned', 'locked'] as const).map((value) => (
            <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {value === 'all' ? 'All distinctions' : value === 'earned' ? 'Earned' : 'Locked'}
              <span>
                {value === 'all'
                  ? BADGES.length
                  : value === 'earned'
                    ? earnedCount
                    : BADGES.length - earnedCount}
              </span>
            </button>
          ))}
        </div>
        <span className="faint">38 case milestones · 10 career achievements</span>
      </div>
      {visible.length === 0 && (
        <div className="board-empty">
          <h3>
            {filter === 'earned'
              ? 'Your first distinction is one case away.'
              : 'Every distinction. Every story.'}
          </h3>
          <p>
            {filter === 'earned'
              ? 'Close case 1 to earn First Light and start your collection.'
              : 'You have earned the complete collection.'}
          </p>
          <Link className="btn btn--primary" to="/cases">
            Open the case book <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      {TIERS.map((tier) => {
        const badges = visible.filter((badge) => badge.tier === tier);
        if (!badges.length) return null;
        return (
          <section
            key={tier}
            className="collection-tier"
            style={{ ['--tier-color' as string]: TIER_COLOR[tier] }}
          >
            <div className="collection-tier__head">
              <h2>
                {tier}
                <span>
                  {
                    BADGES.filter((badge) => badge.tier === tier && progress.badges[badge.id])
                      .length
                  }{' '}
                  / {BADGES.filter((badge) => badge.tier === tier).length}
                </span>
              </h2>
              <p>{TIER_DESCRIPTION[tier]}</p>
            </div>
            <div className="distinction-grid">
              {badges.map((badge) => {
                const earnedAt = progress.badges[badge.id];
                return (
                  <article
                    className={`distinction-card${earnedAt ? ' distinction-card--earned' : ''}`}
                    key={badge.id}
                  >
                    <div className="distinction-card__top">
                      <span className="tier-label">{badge.tier}</span>
                      <span className="distinction-state">
                        {earnedAt ? (
                          <>
                            <Check size={12} /> Earned
                          </>
                        ) : (
                          <>
                            <LockKeyhole size={11} /> Locked
                          </>
                        )}
                      </span>
                    </div>
                    <BadgeInsignia badge={badge} locked={!earnedAt} />
                    <h3>{badge.name}</h3>
                    <p>{earnedAt ? badge.blurb : badge.how}</p>
                    <div className="distinction-card__foot">
                      {earnedAt ? (
                        <span>
                          Earned{' '}
                          {new Date(earnedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span>
                          {badge.levelId
                            ? `Case file ${String(badge.levelId).padStart(3, '0')}`
                            : 'Career achievement'}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
