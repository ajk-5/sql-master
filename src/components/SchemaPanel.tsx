import { useState } from 'react';
import type { TableInfo } from '@/engine/db';

/**
 * The live schema of the world the player is currently inside, read back from
 * the database itself so that a case which creates a table shows it immediately.
 */
export function SchemaPanel({
  tables,
  onInsert,
}: {
  tables: TableInfo[];
  onInsert?: (text: string) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (tables.length === 0) {
    return <p className="empty-note">No tables yet.</p>;
  }

  return (
    <div>
      {tables.map((table) => {
        const isOpen = open[table.name] ?? false;
        return (
          <div className="schema-table" key={table.name}>
            <button
              type="button"
              className="schema-table__head"
              aria-expanded={isOpen}
              onClick={() => setOpen((s) => ({ ...s, [table.name]: !isOpen }))}
            >
              <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
              <span className="schema-table__name">{table.name}</span>
              {table.type === 'view' ? <span className="tag">view</span> : null}
              <span className="schema-table__count">{table.rowCount} rows</span>
            </button>
            {isOpen ? (
              <ul className="schema-cols">
                {table.columns.map((column) => (
                  <li key={column.name}>
                    {column.pk ? (
                      <span className="key-mark" title="primary key">
                        ⚿
                      </span>
                    ) : null}
                    {onInsert ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ padding: 0, background: 'none' }}
                        onClick={() => onInsert(column.name)}
                        title={`Insert ${column.name} into the editor`}
                      >
                        {column.name}
                      </button>
                    ) : (
                      <span>{column.name}</span>
                    )}
                    <span className="type">
                      {column.type}
                      {column.notNull ? ' · not null' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
