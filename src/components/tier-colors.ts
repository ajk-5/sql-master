import type { BadgeTier } from '@/data/badges';

/** One colour per badge tier, shared by the shelf and the award toast. */
export const TIER_COLOR: Record<BadgeTier, string> = {
  bronze: '#c98b4b',
  silver: '#b7c0d3',
  gold: '#f0b429',
  legendary: '#d64550',
};
