import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultGrid } from './ResultGrid';

describe('ResultGrid', () => {
  it('renders headers and rows', () => {
    render(<ResultGrid grid={{ columns: ['name', 'age'], values: [['Vivienne', 54]] }} />);
    expect(screen.getByRole('columnheader', { name: 'name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'age' })).toBeInTheDocument();
    expect(screen.getByText('Vivienne')).toBeInTheDocument();
    expect(screen.getByText('54')).toBeInTheDocument();
  });

  it('shows NULL distinctly rather than as an empty cell', () => {
    render(<ResultGrid grid={{ columns: ['alibi'], values: [[null]] }} />);
    const cell = screen.getByText('NULL');
    expect(cell).toBeInTheDocument();
    expect(cell).toHaveClass('null');
  });

  it('right-aligns numbers and left-aligns text', () => {
    render(<ResultGrid grid={{ columns: ['n', 's'], values: [[7, 'seven']] }} />);
    expect(screen.getByText('7')).toHaveClass('num');
    expect(screen.getByText('seven')).not.toHaveClass('num');
  });

  it('tells the player when a query matched nothing', () => {
    render(<ResultGrid grid={{ columns: ['name'], values: [] }} />);
    expect(screen.getByText(/no rows returned/i)).toBeInTheDocument();
  });

  it('handles a statement that returned no columns at all', () => {
    render(<ResultGrid grid={{ columns: [], values: [] }} />);
    expect(screen.getByText(/returned no columns/i)).toBeInTheDocument();
  });

  it('caps very large results and says how many were hidden', () => {
    const values = Array.from({ length: 320 }, (_, i) => [i]);
    render(<ResultGrid grid={{ columns: ['n'], values }} />);
    expect(screen.getAllByRole('row')).toHaveLength(301); // 300 body rows plus the header
    expect(screen.getByText(/20 more row/i)).toBeInTheDocument();
  });

  it('summarises a blob instead of dumping bytes into the page', () => {
    render(<ResultGrid grid={{ columns: ['b'], values: [[new Uint8Array(12)]] }} />);
    expect(screen.getByText(/blob, 12 bytes/)).toBeInTheDocument();
  });
});
