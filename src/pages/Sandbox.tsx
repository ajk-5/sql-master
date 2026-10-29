import { useCallback, useEffect, useRef, useState } from 'react';
import { DATASETS, getDataset } from '@/data/worlds';
import { type TableInfo } from '@/engine/db';
import { SqlSession } from '@/engine/session';
import type { RunOutcome } from '@/engine/types';
import { ResultGrid } from '@/components/ResultGrid';
import { SchemaPanel } from '@/components/SchemaPanel';
import { SqlEditor } from '@/components/SqlEditor';
import { useSeo } from '@/seo/useSeo';

const STARTER = `-- Nothing is graded here. Break things.
SELECT name FROM sqlite_master WHERE type = 'table';`;

export function Sandbox() {
  const [datasetId, setDatasetId] = useState(DATASETS[0].id);
  const [sql, setSql] = useState(STARTER);
  const [ready, setReady] = useState(false);
  const session = useRef<SqlSession | null>(null);
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  useSeo({
    title: 'SQL sandbox',
    description:
      'A free SQL sandbox over all five game databases. Run any statement against a real SQLite engine in your browser, with nothing graded and nothing to lose.',
    path: '/sandbox',
    noindex: true,
  });

  useEffect(() => {
    let cancelled = false;
    const active = new SqlSession();
    session.current = active;
    setReady(false);
    setOutcome(null);
    setEngineError(null);
    active.open(getDataset(datasetId).seed).then(
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
  }, [datasetId]);

  const run = useCallback(async () => {
    if (!session.current || !ready) return;
    try {
      const result = await session.current.run(sql);
      setOutcome(result.outcome);
      setSchema(result.schema);
    } catch (error) {
      setOutcome({
        ok: false,
        grids: [],
        elapsedMs: 0,
        error: error instanceof Error ? error.message : String(error),
      });
      setSchema(await session.current.reset().catch(() => []));
    }
  }, [ready, sql]);

  const reset = useCallback(async () => {
    if (!session.current) return;
    setSchema(await session.current.reset());
    setOutcome(null);
  }, []);

  const grid = outcome?.grids.filter((g) => g.columns.length > 0).at(-1) ?? null;
  const dataset = getDataset(datasetId);

  return (
    <div className="page page--wide">
      <div className="play" style={{ gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)' }}>
        <aside className="play__brief">
          <span className="eyebrow">Sandbox</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24 }}>{dataset.name}</h1>
          <p className="muted">{dataset.blurb}</p>

          <div className="brief-block">
            <h2>World</h2>
            <select
              className="select"
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              aria-label="Choose a database"
              style={{ width: '100%' }}
            >
              {DATASETS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="brief-block">
            <h2>Schema</h2>
            <SchemaPanel tables={schema} onInsert={(t) => setSql((c) => `${c}${t}`)} />
          </div>
        </aside>

        <section className="play__work">
          <div className="editor-pane">
            <div className="pane-bar">
              <h2>Scratch SQL</h2>
              <span className="spacer" />
              <button type="button" className="btn btn--sm" onClick={reset}>
                Reset world
              </button>
              <button
                type="button"
                className="btn btn--sm btn--primary"
                onClick={run}
                disabled={!ready}
              >
                Run
              </button>
            </div>
            {ready ? (
              <SqlEditor
                value={sql}
                onChange={setSql}
                onRun={run}
                schema={schema}
                ariaLabel="Sandbox SQL editor"
              />
            ) : engineError ? (
              <div className="verdict verdict--bad" role="alert">
                <h3>The database could not be opened</h3>
                <p>{engineError}</p>
              </div>
            ) : (
              <div className="loading">
                <div className="spinner" />
                <p>Loading the SQLite engine…</p>
              </div>
            )}
          </div>

          <div className="output-pane" style={{ gridTemplateColumns: '1fr' }}>
            <div className="output-main">
              <div className="pane-bar">
                <h2>Result</h2>
                <span className="spacer" />
                {outcome?.ok ? (
                  <span className="faint" style={{ fontSize: 12 }}>
                    {outcome.elapsedMs.toFixed(1)} ms · {outcome.rowsChanged ?? 0} changed
                  </span>
                ) : null}
              </div>
              <div className="output-body">
                {outcome && !outcome.ok ? (
                  <div className="verdict verdict--bad">
                    <h3>SQLite could not run that</h3>
                    <pre>{outcome.error}</pre>
                  </div>
                ) : null}
                {grid ? (
                  <ResultGrid grid={grid} caption="Sandbox result" />
                ) : (
                  <p className="empty-note">
                    {outcome?.ok ? 'Statement ran with no result set.' : 'Run something.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
