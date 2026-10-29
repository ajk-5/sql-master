import { BADGES, TIER_ORDER } from '@/data/badges';

export function earnedBadgeList(earned: Record<string, string> = {}) {
  return BADGES.filter((badge) => earned[badge.id]).sort(
    (a, b) => TIER_ORDER[b.tier] - TIER_ORDER[a.tier] || a.name.localeCompare(b.name),
  );
}

export function investigatorTitle(solved: number) {
  if (solved >= 108) return 'SQL Master';
  if (solved >= 75) return 'Chief Inspector';
  if (solved >= 50) return 'Inspector';
  if (solved >= 25) return 'Investigator';
  if (solved >= 10) return 'Apprentice';
  return 'New investigator';
}
