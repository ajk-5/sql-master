// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import initSqlJs from 'sql.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureSqlEngine, createWorld, fetchWasm, getEngine } from './db';

const require = createRequire(import.meta.url);
const file = readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'));
const wasmBinary = file.buffer.slice(
  file.byteOffset,
  file.byteOffset + file.byteLength,
) as ArrayBuffer;

/** Restores the working loader the shared test setup installed. */
function restore() {
  configureSqlEngine(() => initSqlJs({ wasmBinary }));
}

describe('engine loading', () => {
  afterEach(restore);

  it('imports sql.js as a callable module', () => {
    // The browser bug this guards: a CommonJS build served without ESM conversion
    // arrives as an object, so calling it throws "initSqlJs is not a function".
    expect(typeof initSqlJs).toBe('function');
  });

  it('reuses one engine across every world', async () => {
    restore();
    const [first, second] = await Promise.all([getEngine(), getEngine()]);
    expect(first).toBe(second);
  });

  it('explains itself when the engine cannot start', async () => {
    configureSqlEngine(() => Promise.reject(new Error('wasm 404')));
    await expect(getEngine()).rejects.toThrow(/could not start: wasm 404/);
  });

  it('reports the underlying reason it could not start', async () => {
    configureSqlEngine(() => Promise.reject(new Error('boom')));
    await expect(getEngine()).rejects.toThrow(/could not start: boom/);
  });

  it('does not cache the failure, so a retry can succeed', async () => {
    configureSqlEngine(() => Promise.reject(new Error('temporary')));
    await expect(getEngine()).rejects.toThrow();

    restore();
    await expect(getEngine()).resolves.toBeDefined();
  });

  it('propagates the failure to anything trying to open a world', async () => {
    configureSqlEngine(() => Promise.reject(new Error('no engine')));
    await expect(createWorld('SELECT 1;')).rejects.toThrow(/could not start/);
  });
});

describe('fetching the WebAssembly binary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respondWith(body: Uint8Array, contentType: string, ok = true, status = 200) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok,
        status,
        headers: { get: () => contentType },
        arrayBuffer: async () =>
          body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer,
      })),
    );
  }

  const wasm = () => new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
  const html = () => new TextEncoder().encode('<!doctype html><html></html>');

  it('accepts a real WebAssembly binary', async () => {
    respondWith(wasm(), 'application/wasm');
    await expect(fetchWasm()).resolves.toBeInstanceOf(ArrayBuffer);
  });

  it('recognises an index.html served in place of the binary', async () => {
    // This is exactly the single-page-app fallback failure, reported in a way
    // that says what to fix rather than quoting four bytes of hex.
    respondWith(html(), 'text/html');
    await expect(fetchWasm()).rejects.toThrow(/returned HTML/);
    await expect(fetchWasm()).rejects.toThrow(/single-page-app fallback/);
  });

  it('rejects any other content that is not WebAssembly', async () => {
    respondWith(new TextEncoder().encode('not wasm at all'), 'text/plain');
    await expect(fetchWasm()).rejects.toThrow(/is not WebAssembly/);
  });

  it('reports a failed request by status code', async () => {
    respondWith(wasm(), 'text/html', false, 404);
    await expect(fetchWasm()).rejects.toThrow(/HTTP 404/);
  });
});
