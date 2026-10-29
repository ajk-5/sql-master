import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { renderApp } from '@/test/render';
import { LEVELS } from '@/data/levels';
import { ACTS } from '@/data/acts';
import { BADGES } from '@/data/badges';
import { STORAGE_KEY } from '@/state/progress';
import { emptyProgress } from '@/state/types';

function saveSolved(ids: number[]) {
  const progress = emptyProgress();
  for (const id of ids) {
    progress.levels[id] = {
      solved: true,
      attempts: 1,
      hintsUsed: 0,
      revealed: false,
      firstSolvedAt: new Date().toISOString(),
    };
  }
  progress.xp = 500;
  progress.badges['first-light'] = new Date().toISOString();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

describe('shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the home page and lists every act', () => {
    renderApp(<App />, '/');
    expect(screen.getByRole('heading', { name: 'SQL MASTER', level: 1 })).toBeInTheDocument();
    for (const act of ACTS) {
      expect(screen.getByRole('heading', { name: act.name })).toBeInTheDocument();
    }
  });

  it('offers the main navigation on every page', () => {
    renderApp(<App />, '/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const label of ['Case files', 'Badges', 'Field Guide', 'Sandbox', 'Progress']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('gives keyboard users a skip link to the content', () => {
    renderApp(<App />, '/');
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main');
  });

  it('does not show the case preview panel or the stat row on the homepage', () => {
    renderApp(<App />, '/');
    expect(screen.queryByLabelText(/preview of your next case/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Closed by you')).not.toBeInTheDocument();
    expect(screen.queryByText('Of all XP')).not.toBeInTheDocument();
  });

  it('invites a new player into case 1 and a returning one back to where they were', () => {
    renderApp(<App />, '/');
    expect(screen.getByRole('link', { name: /open case 1/i })).toHaveAttribute('href', '/case/1');

    window.localStorage.clear();
    saveSolved([1, 2, 3]);
    renderApp(<App />, '/');
    expect(screen.getByRole('link', { name: /resume at case 4/i })).toBeInTheDocument();
  });
});

describe('case files', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lists every case in the book', () => {
    renderApp(<App />, '/cases');
    for (const level of [LEVELS[0], LEVELS[40], LEVELS[LEVELS.length - 1]]) {
      expect(screen.getByText(level.title)).toBeInTheDocument();
    }
  });

  it('seals cases beyond the player frontier and opens the ones in reach', () => {
    renderApp(<App />, '/cases');
    expect(screen.getByRole('link', { name: /^Case 1:/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Case 40:/ })).not.toBeInTheDocument();
  });

  it('shows a difficulty rating for each case', () => {
    renderApp(<App />, '/cases');
    expect(screen.getAllByText(/Difficulty \d of 5/).length).toBe(LEVELS.length);
  });

  it('marks solved cases as closed', () => {
    saveSolved([1]);
    renderApp(<App />, '/cases');
    expect(screen.getByRole('link', { name: /^Case 1:.*closed/ })).toBeInTheDocument();
  });
});

describe('badges page', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the whole shelf with locked badges hidden behind their requirement', () => {
    renderApp(<App />, '/badges');
    expect(screen.getByText(`0 of ${BADGES.length} earned`)).toBeInTheDocument();
    expect(screen.getByText('Solve case 1.')).toBeInTheDocument();
  });

  it('reveals a badge blurb once it has been earned', () => {
    saveSolved([1]);
    renderApp(<App />, '/badges');
    expect(screen.getByText(/You opened the case file/)).toBeInTheDocument();
  });
});

describe('progress page', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('asks for confirmation before erasing a save', async () => {
    const user = userEvent.setup();
    saveSolved([1, 2]);
    renderApp(<App />, '/progress');

    await user.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(screen.getByRole('button', { name: /yes, erase everything/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('button', { name: /yes, erase everything/i })).not.toBeInTheDocument();
  });

  it('erases progress when the player confirms', async () => {
    const user = userEvent.setup();
    saveSolved([1, 2]);
    renderApp(<App />, '/progress');

    await user.click(screen.getByRole('button', { name: /reset progress/i }));
    await user.click(screen.getByRole('button', { name: /yes, erase everything/i }));
    expect(screen.getByText(/progress erased/i)).toBeInTheDocument();
  });
});

describe('unknown routes', () => {
  it('shows a not-found page rather than a blank screen', () => {
    renderApp(<App />, '/no-such-place');
    expect(screen.getByText(/No record of that page/i)).toBeInTheDocument();
  });

  it('refuses a case number outside the book', () => {
    renderApp(<App />, '/case/9999');
    expect(screen.getByRole('heading', { name: /no such case/i })).toBeInTheDocument();
  });

  it('refuses a case that is still sealed', () => {
    renderApp(<App />, '/case/60');
    expect(screen.getByRole('heading', { name: /is sealed/i })).toBeInTheDocument();
  });

  it('has no route left at the old codex path', () => {
    renderApp(<App />, '/codex');
    expect(screen.getByText(/No record of that page/i)).toBeInTheDocument();
  });
});

describe('field guide', () => {
  it('links concepts out to sql.sh', () => {
    renderApp(<App />, '/field-guide');
    const link = screen.getAllByRole('link', { name: /SQL SELECT/ })[0];
    expect(link).toHaveAttribute('href', 'https://sql.sh/cours/select');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('warns where SQLite departs from the documentation', () => {
    renderApp(<App />, '/field-guide');
    expect(screen.getByText(/SQLite spells this COALESCE/)).toBeInTheDocument();
  });
});
