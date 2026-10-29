// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  hashPassword,
  needsRehash,
  normaliseUsername,
  validatePassword,
  validateUsername,
  verifyPassword,
} from './password';

describe('password hashing', () => {
  it('never stores the password itself', async () => {
    const encoded = await hashPassword('correct horse battery');
    expect(encoded).not.toContain('correct horse battery');
    expect(encoded.startsWith('pbkdf2$sha256$')).toBe(true);
  });

  it('accepts the right password', async () => {
    const encoded = await hashPassword('correct horse battery');
    await expect(verifyPassword('correct horse battery', encoded)).resolves.toBe(true);
  });

  it('rejects the wrong password', async () => {
    const encoded = await hashPassword('correct horse battery');
    await expect(verifyPassword('correct horse batteries', encoded)).resolves.toBe(false);
    await expect(verifyPassword('', encoded)).resolves.toBe(false);
  });

  it('salts every hash, so identical passwords look different', async () => {
    const [a, b] = await Promise.all([hashPassword('same password'), hashPassword('same password')]);
    expect(a).not.toBe(b);
    await expect(verifyPassword('same password', a)).resolves.toBe(true);
    await expect(verifyPassword('same password', b)).resolves.toBe(true);
  });

  it('uses a deliberately expensive number of iterations', async () => {
    const iterations = Number((await hashPassword('x')).split('$')[2]);
    expect(iterations).toBeGreaterThanOrEqual(210_000);
  });

  it('refuses a malformed or truncated hash instead of throwing', async () => {
    for (const bad of ['', 'nonsense', 'pbkdf2$sha256$1$a', 'pbkdf2$sha256$10$c2FsdA==$aGFzaA==']) {
      await expect(verifyPassword('anything', bad)).resolves.toBe(false);
    }
  });

  it('knows when a stored hash is weaker than today’s settings', async () => {
    expect(needsRehash(await hashPassword('x'))).toBe(false);
    expect(needsRehash('pbkdf2$sha256$1000$c2FsdA==$aGFzaA==')).toBe(true);
    expect(needsRehash('md5$x$1$2$3')).toBe(true);
  });

  it('handles unicode and very long passwords', async () => {
    const password = '🕯️ Blackwood '.repeat(20);
    const encoded = await hashPassword(password);
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
  });
});

describe('validation', () => {
  it('accepts reasonable names and rejects the rest', () => {
    expect(validateUsername('mallory').ok).toBe(true);
    expect(validateUsername('mal_lory-01').ok).toBe(true);
    expect(validateUsername('ab').ok).toBe(false);
    expect(validateUsername('a'.repeat(30)).ok).toBe(false);
    expect(validateUsername('-nope').ok).toBe(false);
    expect(validateUsername('has space').ok).toBe(false);
    expect(validateUsername("'; DROP TABLE users; --").ok).toBe(false);
  });

  it('insists on a password long enough to be worth hashing', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH)).ok).toBe(true);
    expect(validatePassword('short').ok).toBe(false);
    expect(validatePassword('12345678').ok).toBe(false);
  });

  it('treats names case-insensitively', () => {
    expect(normaliseUsername('  MalLory  ')).toBe('mallory');
  });
});
