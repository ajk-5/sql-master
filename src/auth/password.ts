/**
 * Password hashing with PBKDF2-HMAC-SHA256 via Web Crypto, which both the
 * browser and Node provide with no dependency to install.
 *
 * A word on what this does and does not buy you. Hashing stops a stored password
 * being readable by anyone who opens the account database, and stops one leaked
 * password unlocking a reused account elsewhere. It cannot make a browser-only
 * account system a real security boundary: whoever controls the tab controls the
 * code. Treat these accounts as a way to keep several players' progress apart on
 * a shared machine, not as a way to keep anyone out.
 */

const ALGORITHM = 'pbkdf2';
const DIGEST = 'sha256';
/** OWASP's floor for PBKDF2-HMAC-SHA256. Deliberately slow. */
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export const MIN_PASSWORD_LENGTH = 8;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** Encodes as algorithm$digest$iterations$salt$hash, so the cost can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return [ALGORITHM, DIGEST, ITERATIONS, toBase64(salt), toBase64(hash)].join('$');
}

/** Compares in constant time, so a wrong password cannot be found byte by byte. */
function equalInConstantTime(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 5) return false;
  const [algorithm, digest, iterations, salt, expected] = parts;
  if (algorithm !== ALGORITHM || digest !== DIGEST) return false;

  const rounds = Number(iterations);
  if (!Number.isInteger(rounds) || rounds < 1000) return false;

  try {
    const actual = await derive(password, fromBase64(salt), rounds);
    return equalInConstantTime(actual, fromBase64(expected));
  } catch {
    return false;
  }
}

/** True when a stored hash was made with settings weaker than today's. */
export function needsRehash(encoded: string): boolean {
  const parts = encoded.split('$');
  if (parts.length !== 5) return true;
  return parts[0] !== ALGORITHM || parts[1] !== DIGEST || Number(parts[2]) < ITERATIONS;
}

export type Validation = { ok: true } | { ok: false; reason: string };

export function validateUsername(username: string): Validation {
  const trimmed = username.trim();
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return { ok: false, reason: `Pick a name of at least ${MIN_USERNAME_LENGTH} characters.` };
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return { ok: false, reason: `Keep the name under ${MAX_USERNAME_LENGTH} characters.` };
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return {
      ok: false,
      reason: 'Letters, digits, hyphens and underscores only, starting and ending with a letter or digit.',
    };
  }
  return { ok: true };
}

export function validatePassword(password: string): Validation {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (/^\d+$/.test(password)) {
    return { ok: false, reason: 'Digits alone are guessed in seconds. Add something else.' };
  }
  return { ok: true };
}

/** Names are compared case-insensitively, so store and match on one form. */
export function normaliseUsername(username: string): string {
  return username.trim().toLowerCase();
}
