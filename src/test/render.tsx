import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { ProgressProvider } from '@/state/ProgressProvider';
import { AuthProvider } from '@/auth/AuthProvider';

/** Renders a component with the router and save file the app always provides. */
export function renderApp(ui: ReactElement, route = '/'): RenderResult {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <ProgressProvider>{ui}</ProgressProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}
