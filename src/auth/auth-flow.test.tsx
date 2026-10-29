import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '@/App';
import { renderApp } from '@/test/render';
import { ACCOUNTS_KEY } from './accounts';
import { SESSION_KEY } from './AuthProvider';

async function signUp(user: ReturnType<typeof userEvent.setup>, name: string, password: string) {
  await user.click(await screen.findByRole('button', { name: /create one/i }));
  await user.type(screen.getByLabelText('Username'), name);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: /create account/i }));
}

describe('signing up and in', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('creates an account and shows the player as signed in', async () => {
    const user = userEvent.setup();
    renderApp(<App />, '/sign-in');

    await signUp(user, 'mallory', 'inspector-1923');

    expect(
      await screen.findByRole('link', { name: 'mallory' }, { timeout: 20_000 }),
    ).toBeInTheDocument();
  }, 30_000);

  it('never writes the password into storage', async () => {
    const user = userEvent.setup();
    renderApp(<App />, '/sign-in');
    await signUp(user, 'mallory', 'inspector-1923');

    await waitFor(
      () => expect(window.localStorage.getItem(ACCOUNTS_KEY)).toBeTruthy(),
      { timeout: 20_000 },
    );
    expect(window.localStorage.getItem(ACCOUNTS_KEY)).not.toContain('inspector-1923');
  }, 30_000);

  it('remembers the session so a reload keeps you signed in', async () => {
    const user = userEvent.setup();
    const first = renderApp(<App />, '/sign-in');
    await signUp(user, 'mallory', 'inspector-1923');
    await waitFor(() => expect(window.localStorage.getItem(SESSION_KEY)).toBeTruthy(), {
      timeout: 20_000,
    });
    first.unmount();

    renderApp(<App />, '/');
    expect(
      await screen.findByRole('link', { name: 'mallory' }, { timeout: 20_000 }),
    ).toBeInTheDocument();
  }, 40_000);

  it('says a name is taken while it is still being typed', async () => {
    const user = userEvent.setup();
    const first = renderApp(<App />, '/sign-in');
    await signUp(user, 'mallory', 'inspector-1923');
    await screen.findByRole('link', { name: 'mallory' }, { timeout: 20_000 });
    first.unmount();
    window.localStorage.removeItem(SESSION_KEY);

    renderApp(<App />, '/sign-in');
    await user.click(await screen.findByRole('button', { name: /create one/i }));
    await user.type(screen.getByLabelText('Username'), 'mallory');

    // The form checks as you type, so the clash is reported before a password is
    // chosen and the submit button refuses to send it.
    await waitFor(
      () => expect(screen.getByText(/that name is taken/i)).toBeInTheDocument(),
      { timeout: 20_000 },
    );
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  }, 60_000);

  it('offers a free name as available', async () => {
    const user = userEvent.setup();
    renderApp(<App />, '/sign-in');
    await user.click(await screen.findByRole('button', { name: /create one/i }));
    await user.type(screen.getByLabelText('Username'), 'brand-new-name');

    await waitFor(() => expect(screen.getByText(/is available/i)).toBeInTheDocument(), {
      timeout: 20_000,
    });
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled();
  }, 30_000);

  it('rejects a password that is too short before hashing anything', async () => {
    const user = userEvent.setup();
    renderApp(<App />, '/sign-in');

    await user.click(await screen.findByRole('button', { name: /create one/i }));
    await user.type(screen.getByLabelText('Username'), 'mallory');
    // The form's own minLength would normally stop this, so submit past it.
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    await user.type(password, 'short');
    password.removeAttribute('minlength');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert', {}, { timeout: 20_000 })).toHaveTextContent(
      /at least 8 characters/i,
    );
  }, 30_000);

  it('signs out again', async () => {
    const user = userEvent.setup();
    renderApp(<App />, '/sign-in');
    await signUp(user, 'mallory', 'inspector-1923');
    // Creating an account drops you into the case files, so go back via the chip.
    await user.click(await screen.findByRole('link', { name: 'mallory' }, { timeout: 20_000 }));

    await user.click(await screen.findByRole('button', { name: /sign out/i }));
    expect(await screen.findByRole('link', { name: /^sign in$/i })).toBeInTheDocument();
  }, 40_000);
});

describe('the leaderboard', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('invites an anonymous player to sign in', async () => {
    renderApp(<App />, '/leaderboard');
    expect(
      await screen.findByRole('link', { name: /sign in to appear here/i }, { timeout: 20_000 }),
    ).toBeInTheDocument();
  }, 30_000);

  it('lists a signed-in player and marks which row is theirs', async () => {
    const user = userEvent.setup();
    renderApp(<App />, '/sign-in');
    await signUp(user, 'mallory', 'inspector-1923');
    await screen.findByRole('link', { name: 'mallory' }, { timeout: 20_000 });

    await user.click(screen.getByRole('link', { name: 'Leaderboard' }));
    const table = await screen.findByRole('table', {}, { timeout: 20_000 });
    const row = within(table).getByText('mallory').closest('tr');
    expect(row).not.toBeNull();
    expect(within(row!).getByText('you')).toBeInTheDocument();
  }, 40_000);
});
