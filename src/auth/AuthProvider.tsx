import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Account } from './accounts';
import { chooseBackend, type ScoreBackend } from './backend';
import { AuthContext, type AuthApi } from './auth-context';

export { SESSION_KEY, TOKEN_KEY } from './backend';

function safeStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined;
    window.localStorage.getItem('sqlmaster.probe');
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [backend, setBackend] = useState<ScoreBackend | null>(null);
  const [revision, setRevision] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;

    // Use the score server when one answers, so the leaderboard is shared; fall
    // back to this browser when it does not, so the game still works offline.
    chooseBackend(safeStorage())
      .then(async (chosen) => {
        if (cancelled) return;
        setBackend(chosen);
        const restored = await chosen.restore().catch(() => null);
        if (cancelled) return;
        setAccount(restored);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, []);

  const register = useCallback<AuthApi['register']>(
    async (username, password) => {
      if (!backend) return { ok: false, reason: 'The score service is not ready yet.' };
      const result = await backend.register(username, password);
      if (result.ok && mounted.current) setAccount(result.account);
      return result;
    },
    [backend],
  );

  const login = useCallback<AuthApi['login']>(
    async (username, password) => {
      if (!backend) return { ok: false, reason: 'The score service is not ready yet.' };
      const result = await backend.login(username, password);
      if (result.ok && mounted.current) setAccount(result.account);
      return result;
    },
    [backend],
  );

  const logout = useCallback(() => {
    void backend?.logout();
    setAccount(null);
  }, [backend]);

  const checkUsername = useCallback<AuthApi['checkUsername']>(
    async (username) => {
      if (!backend) return { available: false, reason: 'The score service is not ready yet.' };
      return backend.checkUsername(username);
    },
    [backend],
  );

  const refresh = useCallback(() => setRevision((n) => n + 1), []);

  const value = useMemo<AuthApi>(
    () => ({
      ready,
      account,
      backend,
      scope: backend?.kind ?? 'local',
      reach: backend?.reach ?? 'this browser',
      register,
      login,
      logout,
      checkUsername,
      revision,
      refresh,
    }),
    [ready, account, backend, register, login, logout, checkUsername, revision, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
