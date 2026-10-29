/**
 * Generates sitemap.xml and robots.txt into dist/ after a build, using
 * site.config.json as the single source of truth for the public route list.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(resolve(root, 'site.config.json'), 'utf8'));
const base = (process.env.VITE_SITE_URL || site.url).replace(/\/$/, '');
const outDir = resolve(root, 'dist');

if (!existsSync(outDir)) {
  console.error('[seo] dist/ not found — run the build first.');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const today = new Date().toISOString().slice(0, 10);

const entries = [
  ...site.routes.map((r) => ({ loc: `${base}${r.path}`, priority: r.priority, changefreq: r.changefreq })),
  ...Array.from({ length: site.totalLevels }, (_, i) => ({
    loc: `${base}/case/${i + 1}`,
    priority: 0.5,
    changefreq: 'monthly',
  })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority.toFixed(1)}</priority>\n  </url>`,
  )
  .join('\n')}
</urlset>
`;
writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap, 'utf8');

const robots = `# ${site.name}
User-agent: *
Allow: /
Disallow: /sandbox

Sitemap: ${base}/sitemap.xml
`;
writeFileSync(resolve(outDir, 'robots.txt'), robots, 'utf8');

// SPA fallback for static hosts that do not rewrite unknown paths themselves.
writeFileSync(resolve(outDir, '404.html'), readFileSync(resolve(outDir, 'index.html'), 'utf8'), 'utf8');
writeFileSync(resolve(outDir, '_redirects'), '/*    /index.html   200\n', 'utf8');

console.log(`[seo] sitemap.xml (${entries.length} urls), robots.txt, 404.html and _redirects written to dist/`);
