import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Award, ChevronRight, Trophy, Users, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import type { LeaderboardRow } from '@/auth/accounts';
import { LEVELS } from '@/data/levels';
import { formatDuration } from '@/game/xp';
import { useAsync } from '@/hooks/useAsync';
import { useSeo } from '@/seo/useSeo';
import { BadgeInsignia } from '@/components/BadgeInsignia';
import { earnedBadgeList, investigatorTitle } from '@/components/investigator-utils';
import { InvestigatorAvatar, InvestigatorProfile } from '@/components/InvestigatorProfile';

export function Leaderboard() {
  const auth = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  useSeo({
    title: 'Leaderboard',
    description:
      'The investigators of SQL MASTER. Explore the rankings, inspect profiles and discover earned distinctions.',
    path: '/leaderboard',
  });
  const board = useAsync(
    async () => (auth.backend ? auth.backend.leaderboard(100) : []),
    [auth.backend, auth.revision, retry],
  );
  const rows = board.data ?? [];
  const mine = rows.find((row) => row.userId === auth.account?.id);
  const selected = rows.find((row) => row.userId === selectedId);
  const loading = !auth.ready || board.loading;
  const fieldAverageXp = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.xp, 0) / rows.length)
    : 0;
  const closeProfile = () => setSelectedId(null);
  const openProfile = (row: LeaderboardRow) => setSelectedId(row.userId);

  return (
    <div className="page leaderboard-page">
      <header className="bureau-heading">
        <div>
          <p className="eyebrow">The bureau / Investigator rankings</p>
          <h1>Leave your mark.</h1>
          <p className="muted">
            Every case closed tells a story. This is where the best investigators write theirs.
          </p>
        </div>
        <Link className="btn btn--primary" to={auth.account ? '/cases' : '/sign-in'}>
          {auth.account ? 'Back to the case book' : 'Sign in to appear here'}
          <ArrowUpRight size={17} />
        </Link>
      </header>
      <div className="board-layout">
        <div className="board-main">
          <div className="board-toolbar">
            <h2>
              Leaderboard <span className="board-count">{rows.length}</span>
            </h2>
            <span className="board-scope">
              {auth.scope === 'remote' ? <Wifi size={14} /> : <WifiOff size={14} />}
              {auth.scope === 'remote' ? 'Shared rankings' : 'This browser'}
            </span>
          </div>
          {loading ? (
            <div className="board-loading" role="status">
              <div className="spinner" />
              <p>Opening the personnel register…</p>
            </div>
          ) : board.error ? (
            <div className="board-empty" role="alert">
              <h3>The register is unavailable</h3>
              <p>We couldn’t load the rankings. Please try again.</p>
              <button className="btn" onClick={() => setRetry((value) => value + 1)}>
                Try again
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="board-empty">
              <Trophy size={44} strokeWidth={1} />
              <span className="eyebrow">The first name could be yours</span>
              <h3>A blank page. A new legacy.</h3>
              <p>Sign in and close your first case to start your investigator record.</p>
              <Link className="btn btn--primary" to="/sign-in">
                Join the investigators <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid-wrap board-table-wrap">
              <table className="grid board-table">
                <caption className="visually-hidden">
                  Investigators ranked by experience. Select an investigator to view their profile
                  and earned badges.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Investigator</th>
                    <th scope="col">Experience</th>
                    <th scope="col">Closed</th>
                    <th scope="col">Distinctions</th>
                    <th scope="col">Avg. time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isMe = row.userId === auth.account?.id;
                    const badges = earnedBadgeList(row.earnedBadges);
                    return (
                      <tr key={row.userId} className={isMe ? 'board-row--mine' : undefined}>
                        <td>
                          <span
                            className={`rank-number${row.rank <= 3 ? ' rank-number--top' : ''}`}
                          >
                            {row.rank === 1 ? (
                              <Trophy size={19} aria-label="Rank 1" />
                            ) : (
                              String(row.rank).padStart(2, '0')
                            )}
                          </span>
                        </td>
                        <td>
                          <button
                            className="investigator-button"
                            onClick={() => openProfile(row)}
                            aria-label={`View ${row.displayName}'s profile`}
                            aria-haspopup="dialog"
                          >
                            <InvestigatorAvatar name={row.displayName} />
                            <span className="investigator-meta">
                              <span className="investigator-name">
                                {row.displayName}
                                {isMe && <span className="you-label">you</span>}
                              </span>
                              <span className="investigator-title">
                                {investigatorTitle(row.solved)}
                              </span>
                            </span>
                            <ChevronRight className="profile-chevron" size={15} />
                          </button>
                        </td>
                        <td className="num board-xp">
                          {row.xp.toLocaleString()} <small>XP</small>
                        </td>
                        <td className="num">
                          {row.solved}
                          <span className="board-total"> / {LEVELS.length}</span>
                        </td>
                        <td>
                          <button
                            className="board-badges"
                            onClick={() => openProfile(row)}
                            aria-label={`View ${row.displayName}'s ${row.badges} badges`}
                            aria-haspopup="dialog"
                          >
                            {badges.slice(0, 3).map((badge) => (
                              <BadgeInsignia key={badge.id} badge={badge} small />
                            ))}
                            {row.badges > 3 ? (
                              <span>+{row.badges - 3}</span>
                            ) : badges.length === 0 ? (
                              <span className="faint">{row.badges || '—'}</span>
                            ) : null}
                          </button>
                        </td>
                        <td className="num board-time">
                          {formatDuration(row.averageMs ?? Number.NaN)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="board-footnote">
            <span>01 / XP earned</span>
            <span>02 / Cases closed</span>
            <span>03 / Fastest average</span>
            <span>Ranking order</span>
          </div>
        </div>
        <aside className="board-sidebar">
          <section className="field-record">
            <span className="eyebrow">Your field record</span>
            {mine ? (
              <>
                <div className="field-rank">
                  #{mine.rank}
                  <span>of {rows.length} investigators</span>
                </div>
                <div className="field-record__line">
                  <span>Experience earned</span>
                  <strong>{mine.xp.toLocaleString()} XP</strong>
                </div>
                <div className="field-record__line">
                  <span>Field average</span>
                  <strong>{fieldAverageXp.toLocaleString()} XP</strong>
                </div>
                <button className="btn" onClick={() => openProfile(mine)}>
                  View your profile <ArrowUpRight size={16} />
                </button>
              </>
            ) : (
              <>
                <Users size={32} strokeWidth={1.2} />
                <h3>
                  {auth.account ? 'Your record is taking shape.' : 'Your place in the bureau.'}
                </h3>
                <p>
                  {auth.account
                    ? 'Your investigator profile will appear when the rankings are available.'
                    : 'Keep a record of your solves, collect distinctions, and find your place in the rankings.'}
                </p>
                <Link className="text-link" to={auth.account ? '/cases' : '/sign-in'}>
                  {auth.account ? 'Open the case book' : 'Create your investigator profile'}{' '}
                  <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </section>
          <section className="distinction-note">
            <Award size={23} strokeWidth={1.3} />
            <span className="eyebrow">Earned, never given</span>
            <h3>
              A little proof of
              <br />a lot of persistence.
            </h3>
            <p>From your first SELECT to your last cold case. Every badge has a story behind it.</p>
            <Link className="text-link" to="/badges">
              Explore the badge collection <ChevronRight size={15} />
            </Link>
          </section>
          <p className="board-reach">
            {auth.scope === 'remote'
              ? `Rankings cover ${auth.reach}.`
              : 'These rankings include accounts saved in this browser.'}{' '}
            Select a name to open their personnel file.
          </p>
        </aside>
      </div>
      {selected && <InvestigatorProfile row={selected} onClose={closeProfile} />}
    </div>
  );
}
