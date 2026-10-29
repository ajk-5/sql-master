import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { MIN_PASSWORD_LENGTH, MIN_USERNAME_LENGTH } from '@/auth/password';
import { useSeo } from '@/seo/useSeo';

type Mode = 'login' | 'register';

export function SignIn() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameCheck, setNameCheck] = useState<{ available: boolean; reason: string | null } | null>(
    null,
  );

  // Tell the player a name is taken while they are still typing, rather than
  // after they have chosen a password. The database still has the final say.
  useEffect(() => {
    if (mode !== 'register' || username.trim().length < 3) {
      setNameCheck(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      auth
        .checkUsername(username)
        .then((result) => {
          if (!cancelled) setNameCheck(result);
        })
        .catch(() => {
          if (!cancelled) setNameCheck(null);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, username, auth]);

  useSeo({
    title: 'Sign in',
    description:
      'Sign in to keep your SQL MASTER progress under your own name and appear on the leaderboard.',
    path: '/sign-in',
    noindex: true,
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === 'login'
          ? await auth.login(username, password)
          : await auth.register(username, password);
      if (result.ok) navigate('/cases');
      else setError(result.reason);
    } finally {
      setBusy(false);
    }
  }

  if (auth.account) {
    return (
      <div className="page">
        <h1 style={{ fontFamily: 'var(--font-serif)' }}>
          Signed in as {auth.account.displayName}
        </h1>
        <p className="muted">
          Your solves are being recorded against this name, and counted for{' '}
          {auth.reach}.
        </p>
        <div className="row">
          <button type="button" className="btn" onClick={() => navigate('/leaderboard')}>
            See the leaderboard
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              auth.logout();
              navigate('/');
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 480 }}>
      <span className="eyebrow">{mode === 'login' ? 'Welcome back' : 'New investigator'}</span>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32 }}>
        {mode === 'login' ? 'Sign in' : 'Create an account'}
      </h1>
      <p className="muted">
        A name and a password, nothing else. Names are unique, and no two accounts can share one.
      </p>
      <p className="faint" style={{ fontSize: 13 }}>
        {auth.scope === 'remote'
          ? 'A score server is answering, so your scores are shared with everyone on it. Your password is hashed on the server with scrypt and never stored in readable form.'
          : 'No score server is answering, so this account lives in this browser only. Your password is hashed with PBKDF2 and never leaves the machine.'}
      </p>

      <form onSubmit={handleSubmit} className="stack card" style={{ padding: 20, marginTop: 18 }}>
        <label htmlFor="username" className="eyebrow">
          Username
        </label>
        <input
          id="username"
          className="text-input"
          value={username}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          minLength={MIN_USERNAME_LENGTH}
          required
          onChange={(e) => setUsername(e.target.value)}
          aria-describedby="username-status"
        />
        <p
          id="username-status"
          className={
            nameCheck === null ? 'faint' : nameCheck.available ? 'pill pill--ok' : 'pill pill--bad'
          }
          style={{ margin: 0, fontSize: 12.5, whiteSpace: 'normal' }}
        >
          {mode === 'register' && nameCheck
            ? nameCheck.available
              ? `"${username.trim()}" is available.`
              : nameCheck.reason
            : ' '}
        </p>

        <label htmlFor="password" className="eyebrow">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="text-input"
          value={password}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={MIN_PASSWORD_LENGTH}
          required
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'register' ? (
          <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>
            At least {MIN_PASSWORD_LENGTH} characters. Do not reuse a password that matters: this is
            a game running entirely in your browser, not a bank.
          </p>
        ) : null}

        {error ? (
          <p className="pill pill--bad" role="alert" style={{ whiteSpace: 'normal' }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn btn--primary"
          disabled={busy || !auth.ready || (mode === 'register' && nameCheck?.available === false)}
        >
          {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
        </button>
      </form>

      <p className="faint" style={{ marginTop: 16, fontSize: 13 }}>
        You can play without an account. Signing in keeps several people&apos;s progress apart on one
        machine and puts you on the leaderboard.
      </p>
    </div>
  );
}
