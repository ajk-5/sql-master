import { Link } from 'react-router-dom';
import { ACTS } from '@/data/acts';
import { LEVELS } from '@/data/levels';
import { getDataset } from '@/data/worlds';
import { difficultyDots, difficultyOf, DIFFICULTY_COLOR, DIFFICULTY_LABEL } from '@/data/difficulty';
import { useProgressStore } from '@/state/useProgress';
import { isUnlocked } from '@/state/progress';
import { useSeo } from '@/seo/useSeo';

export function Cases() {
  const { progress } = useProgressStore();

  useSeo({
    title: 'All 108 SQL cases',
    description:
      'The complete case book: 108 SQL puzzles across six acts, from your first SELECT through joins, window functions, transactions, disaster recovery and schema design.',
    path: '/cases',
  });

  return (
    <div className="page">
      <div className="section-head">
        <h2>The case book</h2>
        <p className="faint" style={{ margin: 0 }}>
          {LEVELS.length} cases. A case unlocks once you are within two of it.
        </p>
      </div>

      {ACTS.map((act) => {
        const inAct = LEVELS.filter((l) => l.actId === act.id);
        const done = inAct.filter((l) => progress.levels[l.id]?.solved).length;
        return (
          <section
            key={act.id}
            id={act.id}
            style={{ ['--act-accent' as string]: act.accent, marginBottom: 42, scrollMarginTop: 76 }}
          >
            <div className="section-head" style={{ marginTop: 20 }}>
              <div>
                <span className="eyebrow">
                  Act {act.index} · {getDataset(act.dataset).name}
                </span>
                <h2 style={{ color: act.accent }}>
                  {act.glyph} {act.name}
                </h2>
                <p className="muted" style={{ maxWidth: '72ch', margin: 0 }}>
                  {act.synopsis}
                </p>
                <p className="faint" style={{ margin: '6px 0 0', fontSize: 13 }}>
                  Cases run easiest first and get harder to the end of the act.
                </p>
              </div>
              <span className="pill">
                {done}/{inAct.length} closed
              </span>
            </div>

            <div className="case-grid">
              {inAct.map((level) => {
                const solved = progress.levels[level.id]?.solved ?? false;
                const open = isUnlocked(progress, level.id);
                const classes = [
                  'case-tile',
                  solved ? 'case-tile--solved' : '',
                  open ? '' : 'case-tile--locked',
                ]
                  .filter(Boolean)
                  .join(' ');

                const inner = (
                  <>
                    <span className="case-num" aria-hidden="true">
                      {solved ? '✓' : open ? level.id : '🔒'}
                    </span>
                    <span className="case-body">
                      <span className="case-title">{level.title}</span>
                      <span
                        className="case-difficulty"
                        style={{ color: DIFFICULTY_COLOR[difficultyOf(level)] }}
                        title={`${DIFFICULTY_LABEL[difficultyOf(level)]} — ${level.xp} XP`}
                      >
                        <span aria-hidden="true">{difficultyDots(level)}</span>
                        <span className="visually-hidden">
                          Difficulty {difficultyOf(level)} of 5
                        </span>
                        <span className="faint"> {DIFFICULTY_LABEL[difficultyOf(level)]}</span>
                      </span>
                    </span>
                  </>
                );

                return open ? (
                  <Link
                    key={level.id}
                    to={`/case/${level.id}`}
                    className={classes}
                    style={{ ['--act-accent' as string]: act.accent }}
                    aria-label={`Case ${level.id}: ${level.title}${solved ? ', closed' : ''}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={level.id}
                    className={classes}
                    aria-label={`Case ${level.id}, sealed`}
                    aria-disabled="true"
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
