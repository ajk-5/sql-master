import { useMemo, type KeyboardEvent } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, SQLite } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import type { TableInfo } from '@/engine/db';

type Props = {
  value: string;
  onChange: (next: string) => void;
  onRun: () => void;
  schema?: TableInfo[];
  readOnly?: boolean;
  ariaLabel?: string;
};

/**
 * The SQL editor. Completion is fed the live schema so the player gets the
 * real table and column names of the world they are currently inside.
 */
export function SqlEditor({ value, onChange, onRun, schema, readOnly, ariaLabel }: Props) {
  const extensions = useMemo(() => {
    const tables: Record<string, string[]> = {};
    for (const table of schema ?? []) {
      tables[table.name] = table.columns.map((c) => c.name);
    }
    return [sql({ dialect: SQLite, schema: tables, upperCaseKeywords: true })];
  }, [schema]);

  // Ctrl+Enter runs. Handled on the editor itself so no extra CodeMirror packages are needed.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      onRun();
    }
  }

  return (
    <div className="editor-host">
      <CodeMirror
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        theme={oneDark}
        extensions={extensions}
        editable={!readOnly}
        aria-label={ariaLabel ?? 'SQL editor'}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: !readOnly,
          foldGutter: false,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          highlightSelectionMatches: false,
        }}
      />
    </div>
  );
}
