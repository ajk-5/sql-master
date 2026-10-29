import { NavLink, Link, Outlet } from 'react-router-dom';
import { SITE } from '@/config/site';
import { TOTAL_XP } from '@/data/levels';
import { useProgressStore } from '@/state/useProgress';
import { useAuth } from '@/auth/useAuth';
import { BadgeToasts } from './BadgeToasts';

const NAV = [
  { to: '/cases', label: 'Case files' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/badges', label: 'Badges' },
  { to: '/field-guide', label: 'Field Guide' },
  { to: '/sandbox', label: 'Sandbox' },
  { to: '/progress', label: 'Progress' },
];

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <ellipse cx="32" cy="19" rx="17" ry="7" fill="none" stroke="#f0b429" strokeWidth="4" />
      <path
        d="M15 19v13c0 3.9 7.6 7 17 7s17-3.1 17-7V19"
        fill="none"
        stroke="#f0b429"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="41" cy="41" r="9.5" fill="none" stroke="#e8eaf0" strokeWidth="4" />
      <path d="M48 48l7 7" stroke="#e8eaf0" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

export function Layout() {
  const { progress, snapshot } = useProgressStore();
  const auth = useAuth();
  const percent = Math.min(100, Math.round((progress.xp / TOTAL_XP) * 100));

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="topbar">
        <Link to="/" className="brand">
          <BrandMark />
          SQL MASTER
        </Link>

        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-right">
          <div className="xp" title={`${progress.xp} of ${TOTAL_XP} XP`}>
            <span className="mono">{progress.xp} XP</span>
            <div
              className="xp-track"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Total experience"
            >
              <div className="xp-fill" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <span className="pill" title="Cases closed">
            {snapshot.solvedCount}/{SITE.totalLevels}
          </span>
          {auth.account ? (
            <Link className="pill pill--accent" to="/sign-in" title="Your account">
              {auth.account.displayName}
            </Link>
          ) : (
            <Link className="btn btn--sm" to="/sign-in">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <span>
            {SITE.name} — {SITE.totalLevels} cases, {SITE.totalBadges} badges, one SQLite engine
            running in your browser.
          </span>
          <a href={SITE.docsSource} target="_blank" rel="noreferrer noopener">
            Documentation: sql.sh
          </a>
          <span className="faint">Progress is saved in this browser only.</span>
        </div>
      </footer>

      <BadgeToasts />
    </div>
  );
}
