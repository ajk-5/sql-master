import raw from '../../site.config.json';

export type SiteConfig = typeof raw;

export const SITE: SiteConfig = raw;

/** Deployment can override the canonical origin without a rebuild of the JSON. */
export const SITE_URL: string = (import.meta.env.VITE_SITE_URL ?? SITE.url).replace(/\/$/, '');

export function canonical(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
