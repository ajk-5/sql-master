import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import initSqlJs from 'sql.js';
import { configureSqlEngine } from '@/engine/db';

// The browser fetches sql-wasm.wasm from /public; under Vitest there is no server,
// so hand the engine the binary straight out of node_modules.
const require = createRequire(import.meta.url);
const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
const wasmFile = readFileSync(wasmPath);
// Node hands back a Buffer view; sql.js wants a plain ArrayBuffer.
const wasmBinary = wasmFile.buffer.slice(
  wasmFile.byteOffset,
  wasmFile.byteOffset + wasmFile.byteLength,
) as ArrayBuffer;

configureSqlEngine(() => initSqlJs({ wasmBinary }));

// The jsdom build in this toolchain exposes `window` without a Storage
// implementation. The app copes with that on purpose (see safeStorage), but the
// component tests need somewhere to save, so install a minimal one.
if (typeof window !== 'undefined' && !window.localStorage) {
  const backing = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return backing.size;
    },
    clear: () => backing.clear(),
    getItem: (key: string) => backing.get(key) ?? null,
    key: (index: number) => [...backing.keys()][index] ?? null,
    removeItem: (key: string) => void backing.delete(key),
    setItem: (key: string, value: string) => void backing.set(key, String(value)),
  };
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
}
