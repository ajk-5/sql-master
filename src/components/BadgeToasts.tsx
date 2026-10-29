import { useEffect } from 'react';
import { useProgressStore } from '@/state/useProgress';
import { TIER_COLOR } from './tier-colors';
import { BadgeInsignia } from './BadgeInsignia';

const DISMISS_AFTER_MS = 7000;

/** Announces newly earned badges, politely and without stealing focus. */
export function BadgeToasts() {
  const { pendingBadges, dismissBadge } = useProgressStore();
  const oldest = pendingBadges[0]?.id;

  useEffect(() => {
    if (!oldest) return;
    const timer = window.setTimeout(() => dismissBadge(oldest), DISMISS_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [oldest, dismissBadge]);

  if (pendingBadges.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {pendingBadges.slice(0, 3).map((badge) => (
        <div
          className="toast"
          key={badge.id}
          style={{ ['--tier-color' as string]: TIER_COLOR[badge.tier] }}
        >
          <div className="toast__glyph" aria-hidden="true">
            <BadgeInsignia badge={badge} small />
          </div>
          <div>
            <div className="toast__eyebrow">Badge earned</div>
            <div className="toast__name">{badge.name}</div>
            <div className="toast__blurb">{badge.blurb}</div>
          </div>
          <button type="button" onClick={() => dismissBadge(badge.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
