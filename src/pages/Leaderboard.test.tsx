import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StrictMode } from 'react';
import type { LeaderboardRow } from '@/auth/accounts';
import { Leaderboard } from './Leaderboard';

const fixtures = vi.hoisted(() => ({ rows: [] as LeaderboardRow[] }));
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({ ready: true, account: null, scope: 'local', reach: 'this browser' }),
}));
vi.mock('@/hooks/useAsync', () => ({
  useAsync: () => ({ data: fixtures.rows, loading: false, error: null }),
}));

// jsdom has no native dialog implementation. These shims expose its open state;
// keyboard containment is supplied by the browser's native modal dialog.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
beforeEach(() => {
  fixtures.rows = [
    {
      rank: 1,
      userId: 7,
      username: 'mallory',
      displayName: 'Inspector Mallory',
      xp: 120,
      solved: 1,
      badges: 1,
      earnedBadges: { 'first-light': '2026-09-09T10:00:00.000Z' },
      averageMs: 30000,
      lastSeenAt: '2026-09-09T10:00:00.000Z',
    },
  ];
});

describe('leaderboard profiles', () => {
  it('opens the selected investigator with their earned badge, then returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <MemoryRouter>
          <Leaderboard />
        </MemoryRouter>
      </StrictMode>,
    );
    const trigger = screen.getByRole('button', { name: "View Inspector Mallory's profile" });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Inspector Mallory' });
    expect(within(dialog).getByRole('heading', { name: 'First Light' })).toBeInTheDocument();
    expect(within(dialog).queryByText('SQL Master')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    await user.click(within(dialog).getByRole('button', { name: 'Close profile' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('opens a profile from its badge control and handles older score servers honestly', async () => {
    fixtures.rows[0].earnedBadges = undefined;
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: "View Inspector Mallory's 1 badges" }));
    expect(screen.getByText('Badge details are unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'First Light' })).not.toBeInTheDocument();
  });

  it('shows a useful empty collection without inventing achievements', async () => {
    fixtures.rows[0].earnedBadges = {};
    fixtures.rows[0].badges = 0;
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: "View Inspector Mallory's profile" }));
    expect(screen.getByText('A career waiting to be written')).toBeInTheDocument();
  });
});
