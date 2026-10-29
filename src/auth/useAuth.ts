import { useContext } from 'react';
import { AuthContext, type AuthApi } from './auth-context';

export function useAuth(): AuthApi {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside an AuthProvider.');
  return value;
}
