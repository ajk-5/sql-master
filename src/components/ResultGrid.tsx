import type { Grid } from '@/engine/types';

const MAX_ROWS = 300;

function renderCell(value: unknown, key: number) {
  if (value === null || value === undefined) {
    return (
      <td key={key} className="null">
        NULL
      </td>
    );
  }
  if (value instanceof Uint8Array) {
    return (
      <td key={key} className="null">{`<blob, ${value.length} bytes>`}</td>
    );
  }
  if (typeof value === 'number') {
    return (
      <td key={key} className="num">
        {value}
      </td>
    );
  }
  return (
    <td key={key} title={String(value)}>
      {String(value)}
    </td>
  );
}

export function ResultGrid({ grid, caption }: { grid: Grid; caption?: string }) {
  const rows = grid.values.slice(0, MAX_ROWS);
  const truncated = grid.values.length - rows.length;

  if (grid.columns.length === 0) {
    return <p className="empty-note">The statement ran but returned no columns.</p>;
  }

  return (
    <div className="grid-wrap">
      <table className="grid">
        {caption ? <caption className="visually-hidden">{caption}</caption> : null}
        <thead>
          <tr>
            {grid.columns.map((column, i) => (
              <th key={`${column}-${i}`} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>{row.map((cell, c) => renderCell(cell, c))}</tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="empty-note">No rows returned.</p> : null}
      {truncated > 0 ? (
        <p className="empty-note">{truncated} more row(s) not shown.</p>
      ) : null}
    </div>
  );
}
