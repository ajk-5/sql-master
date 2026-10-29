import { Link } from 'react-router-dom';
import { ACTS } from '@/data/acts';
import { LEVELS } from '@/data/levels';
import { SITE } from '@/config/site';
import { useProgressStore } from '@/state/useProgress';
import { furthestUnlocked } from '@/state/progress';
import { useSeo } from '@/seo/useSeo';

export function Home() {
  const { progress, snapshot } = useProgressStore();
  const resumeAt = furthestUnlocked(progress);
  const started = snapshot.solvedCount > 0;

  useSeo({
    title: 'SQL MASTER — Learn SQL by Solving 108 Crime Cases',
    description: SITE.description,
    path: '/',
  });

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">A game about asking databases the right question</p>
          <h1>SQL MASTER</h1>
          <p className="hero-lede">
            A locked study. A missing alibi. A database that knows more than it lets on. Learn SQL
            by solving 108 interconnected cases, from your first SELECT to the final recovery. The
            evidence is waiting.
          </p>
          <pre className="hero-sql">SELECT truth FROM evidence WHERE alibi IS NULL;</pre>
          <div className="row">
            <Link className="btn btn--primary" to={`/case/${started ? resumeAt : 1}`}>
              {started ? `Resume at case ${resumeAt}` : 'Open case 1'}
            </Link>
            <Link className="btn" to="/cases">
              Browse all cases
            </Link>
          </div>
        </div>
      </section>

      <div className="section-head">
        <h2>The case book</h2>
        <p className="faint" style={{ margin: 0 }}>
          Each act is a different crime and a different half of the language.
        </p>
      </div>

      <div className="act-grid">
        {ACTS.map((act) => {
          const inAct = LEVELS.filter((l) => l.actId === act.id);
          const done = inAct.filter((l) => progress.levels[l.id]?.solved).length;
          const percent = Math.round((done / inAct.length) * 100);
          return (
            <Link
              key={act.id}
              to={`/cases#${act.id}`}
              className="card act-card"
              style={{ ['--act-accent' as string]: act.accent }}
            >
              <span className="act-card__glyph" aria-hidden="true">
                {act.glyph}
              </span>
              <span className="eyebrow">Act {act.index}</span>
              <h3>{act.name}</h3>
              <p className="act-card__tagline">{act.tagline}</p>
              <p className="act-card__synopsis">{act.synopsis}</p>
              <div className="act-card__foot">
                <span className="faint mono">
                  {done}/{inAct.length}
                </span>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${percent}%` }} />
                </div>
                <span className="faint mono">
                  {act.range[0]}–{act.range[1]}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="section-head">
        <h2>How it works</h2>
      </div>
      <div className="act-grid">
        <div className="card act-card">
          <h3>Real SQLite, not a simulator</h3>
          <p className="act-card__synopsis">
            Every case seeds a genuine SQLite database compiled to WebAssembly. Your query is
            executed by the same engine that ships inside every phone in your pocket, so the errors
            you get are the errors you would get at work.
          </p>
        </div>
        <div className="card act-card">
          <h3>Any correct answer counts</h3>
          <p className="act-card__synopsis">
            Submissions are graded by replaying a reference solution in an identical world and
            comparing the outcome. There is no expected string to guess. If your query produces the
            right result, it is right.
          </p>
        </div>
        <div className="card act-card">
          <h3>Documentation on tap</h3>
          <p className="act-card__synopsis">
            Every case links to the chapter of{' '}
            <a href={SITE.docsSource} target="_blank" rel="noreferrer noopener">
              sql.sh
            </a>{' '}
            that covers it, including the places where SQLite and MySQL disagree. The{' '}
            <Link to="/field-guide">field guide</Link> maps every concept the game teaches to that
            reference.
          </p>
        </div>
      </div>
    </div>
  );
}
