import { useContext } from 'react';
import { ProgressContext, type ProgressApi } from './progress-context';

export function useProgressStore(): ProgressApi {
  const value = useContext(ProgressContext);
  if (!value) {
    throw new Error('useProgressStore must be used inside a ProgressProvider.');
  }
  return value;
}
