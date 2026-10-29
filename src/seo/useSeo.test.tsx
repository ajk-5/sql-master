import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { breadcrumb, useSeo, type SeoInput } from './useSeo';
import { SITE_URL } from '@/config/site';

function Page(props: SeoInput) {
  useSeo(props);
  return <p>page</p>;
}

const meta = (selector: string) =>
  document.head.querySelector<HTMLMetaElement>(selector)?.getAttribute('content');

describe('useSeo', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  it('sets the document title and appends the site name', () => {
    render(<Page title="Badges" description="d" path="/badges" />);
    expect(document.title).toBe('Badges — SQL MASTER');
  });

  it('does not double up the site name when it is already there', () => {
    render(<Page title="SQL MASTER — Learn SQL" description="d" path="/" />);
    expect(document.title).toBe('SQL MASTER — Learn SQL');
  });

  it('writes the description to the meta tag, Open Graph and Twitter', () => {
    render(<Page title="T" description="A description." path="/x" />);
    expect(meta('meta[name="description"]')).toBe('A description.');
    expect(meta('meta[property="og:description"]')).toBe('A description.');
    expect(meta('meta[name="twitter:description"]')).toBe('A description.');
  });

  it('sets an absolute canonical URL for the route', () => {
    render(<Page title="T" description="d" path="/case/42" />);
    const canonical = document.head
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.getAttribute('href');
    expect(canonical).toBe(`${SITE_URL}/case/42`);
    expect(meta('meta[property="og:url"]')).toBe(`${SITE_URL}/case/42`);
  });

  it('marks a page noindex only when asked', () => {
    const { unmount } = render(<Page title="T" description="d" path="/a" />);
    expect(meta('meta[name="robots"]')).toMatch(/^index, follow/);
    unmount();
    render(<Page title="T" description="d" path="/sandbox" noindex />);
    expect(meta('meta[name="robots"]')).toBe('noindex, follow');
  });

  it('injects structured data and removes it again on unmount', () => {
    const { unmount } = render(
      <Page title="T" description="d" path="/a" jsonLd={{ '@type': 'Thing' }} />,
    );
    const script = document.head.querySelector('#route-json-ld');
    expect(script).not.toBeNull();
    expect(JSON.parse(script!.textContent!)).toEqual({ '@type': 'Thing' });
    unmount();
    expect(document.head.querySelector('#route-json-ld')).toBeNull();
  });

  it('does not leave two tags behind when the route changes', () => {
    const { rerender } = render(<Page title="One" description="1" path="/one" />);
    rerender(<Page title="Two" description="2" path="/two" />);
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(meta('meta[name="description"]')).toBe('2');
  });
});

describe('breadcrumb', () => {
  it('numbers the trail from one and makes every item absolute', () => {
    const data = breadcrumb([
      { name: 'Case files', path: '/cases' },
      { name: 'Case 1', path: '/case/1' },
    ]) as { itemListElement: { position: number; name: string; item: string }[] };

    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[0].position).toBe(1);
    expect(data.itemListElement[1].item).toBe(`${SITE_URL}/case/1`);
  });
});
