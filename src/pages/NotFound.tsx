import { Link } from 'react-router-dom';
import { useSeo } from '@/seo/useSeo';

export function NotFound() {
  useSeo({
    title: 'Page not found',
    description: 'That page is not in the case book.',
    path: '/404',
    noindex: true,
  });

  return (
    <div className="page">
      <span className="eyebrow">404</span>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 40 }}>No record of that page</h1>
      <p className="muted" style={{ maxWidth: '60ch' }}>
        The archivist has been thorough. Try the <Link to="/cases">case files</Link>, the{' '}
        <Link to="/field-guide">field guide</Link>, or start again at <Link to="/">the beginning</Link>.
      </p>
    </div>
  );
}
