import { useEffect, useState } from 'react';

export type AsyncState<T> = { data: T | null; loading: boolean; error: string | null };

/**
 * Runs a promise-returning function and reports its outcome, discarding results
 * that arrive after the inputs changed or the component went away.
 */
export function useAsync<T>(run: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    run().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
    // The caller owns the dependency list, as with useEffect itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
