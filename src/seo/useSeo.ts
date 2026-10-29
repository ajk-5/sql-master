import { useEffect } from 'react';
import { SITE, canonical } from '@/config/site';

export type SeoInput = {
  title: string;
  description: string;
  /** Route path, used for the canonical URL and og:url. */
  path: string;
  /** Optional schema.org graph node for this page. */
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
};

const JSON_LD_ID = 'route-json-ld';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setLink(rel: string, href: string): void {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

/**
 * Keeps the document head in step with the current route. A single-page app
 * otherwise ships one title and one description for every URL it serves.
 */
export function useSeo({ title, description, path, jsonLd, noindex }: SeoInput): void {
  useEffect(() => {
    const full = title.includes(SITE.name) ? title : `${title} — ${SITE.name}`;
    const url = canonical(path);

    document.title = full;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1',
    );
    setLink('canonical', url);

    setMeta('meta[property="og:title"]', 'property', 'og:title', full);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', full);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

    document.querySelector(`#${JSON_LD_ID}`)?.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = JSON_LD_ID;
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.querySelector(`#${JSON_LD_ID}`)?.remove();
    };
  }, [title, description, path, jsonLd, noindex]);
}

/** Breadcrumb graph node, so search results show the act a case belongs to. */
export function breadcrumb(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  };
}
