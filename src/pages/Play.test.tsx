import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { renderApp } from '@/test/render';
import { getLevel } from '@/data/levels';
import { STORAGE_KEY } from '@/state/progress';
import type { Progress } from '@/state/types';

// CodeMirror needs layout APIs jsdom does not implement. The editor itself is a
// third-party component; what these tests care about is the play loop around it.
vi.mock('@/components/SqlEditor', () => ({
  SqlEditor: ({ value, onChange }: { value: string; onChange: (next: string) => void }) => (
    <textarea aria-label="SQL editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

function savedProgress(): Progress {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Progress;
}

async function openCaseOne() {
  const user = userEvent.setup();
  renderApp(<App />, '/case/1');
  const editor = await screen.findByLabelText('SQL editor', {}, { timeout: 30_000 });
  return { user, editor };
}

describe('playing a case', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the brief, the objective and the sql.sh reading list', async () => {
    const level = getLevel(1)!;
    await openCaseOne();

    expect(screen.getByRole('heading', { name: `Case 1: ${level.title}`, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(level.objective)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SQL SELECT/ })).toHaveAttribute(
      'href',
      'https://sql.sh/cours/select',
    );
  });

  it('loads the schema of the world the case is set in', async () => {
    await openCaseOne();
    const panel = screen.getByRole('complementary', { name: /database schema/i });
    expect(await within(panel).findByText('guests')).toBeInTheDocument();
    expect(within(panel).getByText('movements')).toBeInTheDocument();
  });

  it('runs a query and shows its rows without grading it', async () => {
    const { user, editor } = await openCaseOne();

    await user.clear(editor);
    await user.type(editor, 'SELECT name FROM guests WHERE id = 1;');
    await user.click(screen.getByRole('button', { name: 'Run' }));

    expect(await screen.findByText('Alistair Blackwood')).toBeInTheDocument();
    expect(savedProgress().levels?.[1]).toBeUndefined();
  });

  it('reports a SQL error back to the player', async () => {
    const { user, editor } = await openCaseOne();

    await user.clear(editor);
    await user.type(editor, 'SELCT name FROM guests;');
    await user.click(screen.getByRole('button', { name: 'Run' }));

    expect(await screen.findByText(/could not run that/i)).toBeInTheDocument();
    expect(screen.getByText(/syntax error/i)).toBeInTheDocument();
  });

  it('closes the case, awards XP and pops the badge when the answer is right', async () => {
    const { user, editor } = await openCaseOne();

    await user.clear(editor);
    await user.type(editor, 'SELECT * FROM guests;');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Case closed', {}, { timeout: 30_000 })).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();

    const toast = await screen.findByRole('status');
    expect(within(toast).getByText('First Light')).toBeInTheDocument();

    await waitFor(() => {
      expect(savedProgress().levels[1].solved).toBe(true);
    });
    // Scoring is timed now: a solve this fast pays more than the base.
    expect(savedProgress().xp).toBeGreaterThan(getLevel(1)!.xp);
    expect(savedProgress().badges['first-light']).toBeTruthy();
  });

  it('rejects a wrong answer and counts the attempt', async () => {
    const { user, editor } = await openCaseOne();

    await user.clear(editor);
    await user.type(editor, 'SELECT name FROM guests;');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(
      await screen.findByText(/not the answer the case needs/i, {}, { timeout: 30_000 }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(savedProgress().levels[1].attempts).toBe(1);
    });
    expect(savedProgress().levels[1].solved).toBe(false);
    expect(savedProgress().xp).toBe(0);
  });

  it('reveals hints one at a time and charges for them', async () => {
    const level = getLevel(1)!;
    const { user } = await openCaseOne();

    await user.click(screen.getByRole('button', { name: /reveal hint 1 of 3/i }));
    expect(screen.getByText(level.hints[0])).toBeInTheDocument();
    expect(screen.queryByText(level.hints[1])).not.toBeInTheDocument();

    await waitFor(() => {
      expect(savedProgress().levels[1].hintsUsed).toBe(1);
    });

    await user.click(screen.getByRole('button', { name: /reveal hint 2 of 3/i }));
    expect(screen.getByText(level.hints[1])).toBeInTheDocument();
  });

  it('hides the reference solution until the player asks for it', async () => {
    const level = getLevel(1)!;
    const { user } = await openCaseOne();

    expect(screen.queryByText(level.solution)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /show the reference solution/i }));
    expect(screen.getByText(level.solution)).toBeInTheDocument();

    await waitFor(() => {
      expect(savedProgress().levels[1].revealed).toBe(true);
    });
  });

  it('offers a way on to the next case', async () => {
    await openCaseOne();
    expect(screen.getByRole('link', { name: /Case 2/ })).toHaveAttribute('href', '/case/2');
  });
});
