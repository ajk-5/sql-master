import { createContext } from 'react';
import type { Account, AuthResult } from './accounts';
import type { NameCheck, ScoreBackend } from './backend';

export type AuthApi = {
  /** False until the score service has been chosen and any session restored. */
  ready: boolean;
  account: Account | null;
  backend: ScoreBackend | null;
  /** 'remote' when a score server is answering, 'local' when it is not. */
  scope: 'local' | 'remote';
  /** How far the leaderboard actually reaches, in words fit for the page. */
  reach: string;
  register: (username: string, password: string) => Promise<AuthResult>;
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  checkUsername: (username: string) => Promise<NameCheck>;
  /** Bumped whenever scores change, so views reading the board refresh. */
  revision: number;
  refresh: () => void;
};

export const AuthContext = createContext<AuthApi | null>(null);
