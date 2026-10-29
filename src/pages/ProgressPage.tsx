import { useRef, useState } from 'react';
import { ACTS } from '@/data/acts';
import { BADGES } from '@/data/badges';
import { CONCEPT_FAMILIES } from '@/data/docs';
import { LEVELS, TOTAL_XP } from '@/data/levels';
import { reconcile } from '@/state/progress';
import { useProgressStore } from '@/state/useProgress';
import { useSeo } from '@/seo/useSeo';

export function ProgressPage() {
  const { progress, snapshot, reset } = useProgressStore();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useSeo({
    title: 'Your progress',
    description:
      'Cases closed, badges earned, experience gained, and the export and import controls for your SQL MASTER save file.',
    path: '/progress',
    noindex: true,
  });

  function exportSave() {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sql-master-progress.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Save file downloaded.');
  }

  function importSave(file: File) {
    file
      .text()
      .then((text) => {
        const parsed = reconcile(JSON.parse(text));
        window.localStorage.setItem('sqlmaster.progress.v2', JSON.stringify(parsed));
        setMessage('Save imported. Reloading…');
        window.setTimeout(() => window.location.reload(), 600);
      })
      .catch(() => setMessage('That file could not be read as a SQL MASTER save.'));
  }

  const solvedPercent = Math.round((snapshot.solvedCount / LEVELS.length) * 100);
  const attempts = Object.values(progress.levels).reduce((sum, r) => sum + r.attempts, 0);
  const hints = Object.values(progress.levels).reduce((sum, r) => sum + r.hintsUsed, 0);

  return (
    <div className="page">
      <div className="section-head">
        <h2>Your progress</h2>
        <span className="faint">Stored in this browser only, never sent anywhere.</span>
      </div>

      <div className="stat-row">
        <div className="card stat">
          <div className="stat-value">
            {snapshot.solvedCount}
            <span style={{ fontSize: 17, color: 'var(--text-faint)' }}>/{LEVELS.length}</span>
          </div>
          <div className="stat-label">Cases closed ({solvedPercent}%)</div>
        </div>
        <div className="card stat">
          <div className="stat-value">{progress.xp}</div>
          <div className="stat-label">XP of {TOTAL_XP}</div>
        </div>
        <div className="card stat">
          <div className="stat-value">
            {Object.keys(progress.badges).length}
            <span style={{ fontSize: 17, color: 'var(--text-faint)' }}>/{BADGES.length}</span>
          </div>
          <div className="stat-label">Badges</div>
        </div>
        <div className="card stat">
          <div className="stat-value">{attempts}</div>
          <div className="stat-label">Submissions</div>
        </div>
        <div className="card stat">
          <div className="stat-value">{hints}</div>
          <div className="stat-label">Hints taken</div>
        </div>
        <div className="card stat">
          <div className="stat-value">{snapshot.solvedFirstAttempt}</div>
          <div className="stat-label">First-attempt solves</div>
        </div>
      </div>

      <div className="section-head">
        <h2>By act</h2>
      </div>
      <div className="act-grid">
        {ACTS.map((act) => {
          const inAct = LEVELS.filter((l) => l.actId === act.id);
          const done = inAct.filter((l) => progress.levels[l.id]?.solved).length;
          return (
            <div
              className="card act-card"
              key={act.id}
              style={{ ['--act-accent' as string]: act.accent }}
            >
              <h3>
                {act.glyph} {act.name}
              </h3>
              <p className="act-card__tagline">{act.tagline}</p>
              <div className="act-card__foot">
                <span className="faint mono">
                  {done}/{inAct.length}
                </span>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.round((done / inAct.length) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-head">
        <h2>Concept coverage</h2>
        <span className="faint">
          {snapshot.conceptFamiliesCleared.length}/{CONCEPT_FAMILIES.length} families touched
        </span>
      </div>
      <div className="row">
        {CONCEPT_FAMILIES.map((family) => (
          <span
            key={family}
            className={
              snapshot.conceptFamiliesCleared.includes(family) ? 'pill pill--ok' : 'pill'
            }
          >
            {family}
          </span>
        ))}
      </div>

      <div className="section-head">
        <h2>Save file</h2>
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={exportSave}>
          Export save
        </button>
        <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
          Import save
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="visually-hidden"
          aria-label="Import a save file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importSave(file);
          }}
        />
        {confirming ? (
          <>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                reset();
                setConfirming(false);
                setMessage('Progress erased.');
              }}
            >
              Yes, erase everything
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--danger" onClick={() => setConfirming(true)}>
            Reset progress
          </button>
        )}
      </div>
      {message ? (
        <p className="muted" role="status" style={{ marginTop: 12 }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
