import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { actForLevel } from '@/data/acts';
import { getLevel, LEVELS } from '@/data/levels';
import { getDataset } from '@/data/worlds';
import { difficultyDots, difficultyOf, DIFFICULTY_COLOR, DIFFICULTY_LABEL } from '@/data/difficulty';
import { type TableInfo } from '@/engine/db';
import { SqlSession } from '@/engine/session';
import type { Grid, RunOutcome, Verdict } from '@/engine/types';
import { ResultGrid } from '@/components/ResultGrid';
import { SchemaPanel } from '@/components/SchemaPanel';
import { SqlEditor } from '@/components/SqlEditor';
import { SolveReport } from '@/components/SolveReport';
import { useProgressStore } from '@/state/useProgress';
import { isUnlocked, recordFor, xpOnOffer } from '@/state/progress';
import { formatDuration, type XpBreakdown } from '@/game/xp';
import { breadcrumb, useSeo } from '@/seo/useSeo';

export function Play() {
  const params = useParams();
  const navigate = useNavigate();
  const levelId = Number(params.id);
  const level = getLevel(levelId);
  const store = useProgressStore();

  const [sql, setSql] = useState('');
  const [ready, setReady] = useState(false);
  const session = useRef<SqlSession | null>(null);
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [report, setReport] = useState<{
    breakdown: XpBreakdown;
    actBonus: number;
    elapsedMs: number;
  } | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const startedAt = useRef<number>(Date.now());

  const act = level ? actForLevel(level.id) : null;
  const record = level ? recordFor(store.progress, level.id) : null;
  const unlocked = level ? isUnlocked(store.progress, level.id) : false;

  const crumbs = useMemo(
    () =>
      level && act
        ? breadcrumb([
            { name: 'Case files', path: '/cases' },
            { name: act.name, path: `/cases#${act.id}` },
            { name: `Case ${level.id}: ${level.title}`, path: `/case/${level.id}` },
          ])
        : undefined,
    [level, act],
  );

  useSeo({
    title: level ? `Case ${level.id}: ${level.title}` : 'Case not found',
    description: level
      ? `${level.objective} A SQL puzzle covering ${level.concepts.join(', ')}, solved against a real SQLite database in your browser.`
      : 'This case does not exist.',
    path: `/case/${levelId}`,
    jsonLd: crumbs,
    noindex: !level,
  });

  // Build a fresh world whenever the case changes, and tear the old one down.
  useEffect(() => {
    if (!level) return;
    let cancelled = false;
    const active = new SqlSession();
    session.current = active;
    setReady(false);
    setSchema([]);
    setOutcome(null);
    setVerdict(null);
    setHintsShown(0);
    setShowSolution(false);
    setEngineError(null);
    startedAt.current = Date.now();
    setElapsedMs(0);
    setReport(null);
    setSql(level.starter ?? '');

    active.open(getDataset(level.dataset).seed).then(
      (tables) => {
        if (cancelled) return;
        setSchema(tables);
        setReady(true);
      },
      (error: unknown) => {
        if (!cancelled) {
          setEngineError(error instanceof Error ? error.message : String(error));
        }
      },
    );

    return () => {
      cancelled = true;
      active.dispose();
    };
  }, [level]);

  // A visible clock, because time is the largest single lever on the score.
  useEffect(() => {
    if (!level || record?.solved) return;
    const tick = window.setInterval(() => setElapsedMs(Date.now() - startedAt.current), 1000);
    return () => window.clearInterval(tick);
  }, [level, record?.solved]);

  const resetWorld = useCallback(async () => {
    if (!session.current) return;
    setSchema(await session.current.reset());
    setOutcome(null);
    setVerdict(null);
  }, []);

  const handleRun = useCallback(async () => {
    if (!session.current || !ready || !sql.trim()) return;
    setVerdict(null);
    try {
      const result = await session.current.run(sql);
      setOutcome(result.outcome);
      setSchema(result.schema);
    } catch (error) {
      // A stopped query leaves no world behind, so rebuild one to carry on in.
      setOutcome({
        ok: false,
        grids: [],
        elapsedMs: 0,
        error: error instanceof Error ? error.message : String(error),
      });
      setSchema(await session.current.reset().catch(() => []));
    }
  }, [ready, sql]);

  const handleSubmit = useCallback(async () => {
    if (!level || !session.current || !sql.trim() || busy) return;
    setBusy(true);
    try {
      const attempt = await session.current.judge(level, getDataset(level.dataset).seed, sql);
      const took = Date.now() - startedAt.current;
      setOutcome(attempt.outcome);
      setVerdict(attempt.verdict);
      const result = store.submit({
        levelId: level.id,
        solved: attempt.verdict.solved,
        elapsedMs: took,
        sql,
      });
      if (result.firstSolve && result.breakdown) {
        setReport({ breakdown: result.breakdown, actBonus: result.actBonus, elapsedMs: took });
      }
    } catch (error) {
      setVerdict({
        solved: false,
        title: 'The query was stopped',
        detail: error instanceof Error ? error.message : String(error),
        notes: [],
      });
    } finally {
      setBusy(false);
    }
  }, [level, sql, busy, store]);

  if (!level) {
    return (
      <div className="page">
        <h1>No such case</h1>
        <p className="muted">
          The case book runs from 1 to {LEVELS.length}. <Link to="/cases">Back to the case files</Link>.
        </p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="page">
        <h1>Case {level.id} is sealed</h1>
        <p className="muted">
          Close the cases before it first. <Link to="/cases">Return to the case files</Link>.
        </p>
      </div>
    );
  }

  const solved = record?.solved ?? false;
  const onOffer = record ? xpOnOffer(level.id, record, elapsedMs) : null;
  const previous = LEVELS.find((l) => l.id === level.id - 1);
  const next = LEVELS.find((l) => l.id === level.id + 1);
  const grid: Grid | null =
    outcome?.grids.filter((g) => g.columns.length > 0).at(-1) ?? null;

  return (
    <div className="page page--wide">
      <div className="play" style={{ ['--act-accent' as string]: act?.accent }}>
        <aside className="play__brief">
          <div className="case-header">
            <div className="row">
              <span className="eyebrow">
                {act?.glyph} Act {act?.index} · {act?.name}
              </span>
            </div>
            <h1>
              Case {level.id}: {level.title}
            </h1>
            <div className="row">
              {solved ? <span className="pill pill--ok">Closed</span> : null}
              <span className="pill pill--accent" title="What this case pays if you solve it now">
                {onOffer ? onOffer.total : level.xp} XP
              </span>
              {!solved ? (
                <span
                  className="pill"
                  title={`Target time ${formatDuration(onOffer?.parMs ?? 0)} — ${onOffer?.speed.note ?? ''}`}
                >
                  ⏱ {formatDuration(elapsedMs)} · {onOffer?.speed.label}
                </span>
              ) : null}
              <span
                className="pill"
                style={{ color: DIFFICULTY_COLOR[difficultyOf(level)] }}
                title={`Difficulty ${difficultyOf(level)} of 5`}
              >
                <span aria-hidden="true">{difficultyDots(level)}</span>
                {DIFFICULTY_LABEL[difficultyOf(level)]}
              </span>
              {level.concepts.map((c) => (
                <span className="tag" key={c}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          <p className="story">{level.story}</p>

          <div className="brief-block">
            <h2>Your task</h2>
            <div className="objective">{level.objective}</div>
          </div>

          <div className="brief-block">
            <h2>Reading on sql.sh</h2>
            <ul className="doc-list">
              {level.docs.map((doc) => (
                <li key={doc.url}>
                  <a href={doc.url} target="_blank" rel="noreferrer noopener">
                    {doc.label}
                    <span className="ext" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="brief-block">
            <h2>Hints</h2>
            {level.hints.slice(0, hintsShown).map((hint, i) => (
              <div className="hint" key={hint}>
                <strong>Hint {i + 1}</strong>
                {hint}
              </div>
            ))}
            {hintsShown < level.hints.length ? (
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  setHintsShown((n) => n + 1);
                  store.takeHint(level.id);
                }}
              >
                Reveal hint {hintsShown + 1} of {level.hints.length}
                <span className="faint"> (−15% XP)</span>
              </button>
            ) : (
              <p className="faint" style={{ fontSize: 13 }}>
                Every hint is out.
              </p>
            )}
          </div>

          <div className="brief-block">
            <h2>Stuck</h2>
            {showSolution || solved ? (
              <pre
                className="mono"
                style={{
                  whiteSpace: 'pre-wrap',
                  background: 'var(--ink-800)',
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid var(--ink-600)',
                }}
              >
                {level.solution}
              </pre>
            ) : (
              <button
                type="button"
                className="btn btn--sm btn--danger"
                onClick={() => {
                  setShowSolution(true);
                  store.reveal(level.id);
                }}
              >
                Show the reference solution (−75% XP)
              </button>
            )}
          </div>

          <div className="row">
            {previous ? (
              <Link className="btn btn--sm" to={`/case/${previous.id}`}>
                ← Case {previous.id}
              </Link>
            ) : null}
            {next ? (
              <Link className="btn btn--sm" to={`/case/${next.id}`}>
                Case {next.id} →
              </Link>
            ) : null}
          </div>
        </aside>

        <section className="play__work">
          <div className="editor-pane">
            <div className="pane-bar">
              <h2>Your SQL</h2>
              <span className="spacer" />
              <span className="faint" style={{ fontSize: 12 }}>
                <span className="kbd">Ctrl</span> + <span className="kbd">Enter</span> to run
              </span>
              <button type="button" className="btn btn--sm" onClick={resetWorld}>
                Reset world
              </button>
              <button type="button" className="btn btn--sm" onClick={handleRun} disabled={!ready}>
                Run
              </button>
              <button
                type="button"
                className="btn btn--sm btn--primary"
                onClick={handleSubmit}
                disabled={busy || !sql.trim()}
              >
                {busy ? 'Checking…' : 'Submit'}
              </button>
            </div>
            {ready ? (
              <SqlEditor
                value={sql}
                onChange={setSql}
                onRun={handleRun}
                schema={schema}
                ariaLabel={`SQL editor for case ${level.id}`}
              />
            ) : engineError ? (
              <div className="verdict verdict--bad" role="alert">
                <h3>The database could not be opened</h3>
                <p>{engineError}</p>
                <p className="faint">
                  Nothing you typed caused this. Reload the page, and if it persists the engine file
                  is not being served.
                </p>
              </div>
            ) : (
              <div className="loading">
                <div className="spinner" />
                <p>Loading the SQLite engine…</p>
              </div>
            )}
          </div>

          <div className="output-pane">
            <div className="output-main">
              <div className="pane-bar">
                <h2>Result</h2>
                <span className="spacer" />
                {outcome?.ok ? (
                  <span className="faint" style={{ fontSize: 12 }}>
                    {outcome.elapsedMs.toFixed(1)} ms
                  </span>
                ) : null}
              </div>
              <div className="output-body">
                {report ? (
                  <SolveReport
                    levelId={level.id}
                    breakdown={report.breakdown}
                    actBonus={report.actBonus}
                    elapsedMs={report.elapsedMs}
                  />
                ) : null}

                {verdict ? (
                  <div className={`verdict verdict--${verdict.solved ? 'ok' : 'bad'}`}>
                    <h3>{verdict.title}</h3>
                    <p>{verdict.detail}</p>
                    {verdict.notes.map((note) => (
                      <p className="faint" key={note}>
                        {note}
                      </p>
                    ))}
                  </div>
                ) : null}

                {outcome && !outcome.ok ? (
                  <div className="verdict verdict--bad">
                    <h3>SQLite could not run that</h3>
                    <pre>{outcome.error}</pre>
                  </div>
                ) : null}

                {grid ? (
                  <ResultGrid grid={grid} caption={`Result for case ${level.id}`} />
                ) : outcome?.ok ? (
                  <p className="empty-note">
                    Statement ran. {outcome.rowsChanged ?? 0} row(s) changed, nothing to display.
                  </p>
                ) : !outcome ? (
                  <p className="empty-note">Run a query to see its result here.</p>
                ) : null}
              </div>
            </div>

            <aside className="side-pane" aria-label="Database schema">
              <div className="pane-bar">
                <h2>{getDataset(level.dataset).name}</h2>
              </div>
              <SchemaPanel
                tables={schema}
                onInsert={(text) => setSql((current) => `${current}${text}`)}
              />
            </aside>
          </div>
        </section>
      </div>

      {solved && next ? (
        <div style={{ position: 'fixed', left: 20, bottom: 20, zIndex: 90 }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate(`/case/${next.id}`)}
          >
            Next case: {next.title} →
          </button>
        </div>
      ) : null}
    </div>
  );
}
