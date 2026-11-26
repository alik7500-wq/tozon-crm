import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LeadsPage } from '../LeadsPage';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn()
  }
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Director', role: 'DIRECTOR' } })
}));

describe('R07: LeadsPage background auto-refresh, multi-page/column preservation, race guards & offline recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('preserves multi-page loaded list across background refresh and handles leads leaving filter', async () => {
    let refreshCount = 0;
    api.get.mockImplementation((url, cfg) => {
      if (url === '/leads') {
        if (cfg?.params?.cursor === 'p2') {
          return Promise.resolve({
            data: {
              leads: [{ id: 2, full_name: 'Page 2 Lead', status: 'NEW', stage: 'NEW', version: 1 }],
              total: 2,
              nextCursor: null
            }
          });
        }
        refreshCount += 1;
        if (refreshCount === 1) {
          return Promise.resolve({
            data: {
              leads: [{ id: 1, full_name: 'Page 1 Lead', status: 'NEW', stage: 'NEW', version: 1 }],
              total: 2,
              nextCursor: 'p2'
            }
          });
        }
        // Background refresh requests loaded window (limit >= 50) and returns updated v2 + removes Lead 2 (left filter)
        return Promise.resolve({
          data: {
            leads: [
              { id: 1, full_name: 'Page 1 Lead v2', status: 'NEW', stage: 'NEW', version: 2 },
              { id: 3, full_name: 'New Incoming Lead', status: 'NEW', stage: 'NEW', version: 1 }
            ],
            total: 2,
            nextCursor: null
          }
        });
      }
      if (url === '/leads/stats') return Promise.resolve({ data: { stats: { total: 2, new: 2 } } });
      return Promise.resolve({ data: { projects: [], users: [] } });
    });

    render(
      <MemoryRouter initialEntries={['/leads?view=list']}>
        <LeadsPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Список/ }));
    await waitFor(() => expect(screen.getByText(/#1 • Page 1 Lead/)).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /Загрузить ещё/ }));
    await waitFor(() => expect(screen.getByText(/#2 • Page 2 Lead/)).toBeDefined());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5200);
    });

    await waitFor(() => {
      expect(screen.getByText(/#1 • Page 1 Lead v2/)).toBeDefined();
      expect(screen.getByText(/#3 • New Incoming Lead/)).toBeDefined();
    });
  });

  it('ignores late response from previous filter when filter changes', async () => {
    let resolveOld;
    api.get.mockImplementation((url, cfg) => {
      if (url === '/leads/board') {
        if (cfg?.params?.taskState === 'PAUSED') {
          return Promise.resolve({
            data: {
              boardColumns: { NEW: { leads: [{ id: 20, full_name: 'Paused Only', stage: 'NEW' }], total: 1, nextCursor: null } },
              total: 1,
              stageCounts: { NEW: 1 }
            }
          });
        }
        return new Promise((resolve) => {
          resolveOld = () => resolve({
            data: {
              boardColumns: { NEW: { leads: [{ id: 10, full_name: 'Stale Unfiltered', stage: 'NEW' }], total: 1, nextCursor: null } },
              total: 1,
              stageCounts: { NEW: 1 }
            }
          });
        });
      }
      if (url === '/leads/stats') return Promise.resolve({ data: { stats: {} } });
      return Promise.resolve({ data: { projects: [], users: [] } });
    });

    render(
      <MemoryRouter>
        <LeadsPage />
      </MemoryRouter>
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    fireEvent.change(screen.getByLabelText('Состояние задачи'), { target: { value: 'PAUSED' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });

    await waitFor(() => expect(screen.getByText('Paused Only')).toBeDefined());

    // Now resolve the stale unfiltered request -> must NOT overwrite Paused Only!
    await act(async () => { resolveOld?.(); });
    expect(screen.queryByText('Stale Unfiltered')).toBeNull();
    expect(screen.getByText('Paused Only')).toBeDefined();
  });

  it('recovers from offline -> online without overlapping cycles or timer leaks on unmount', async () => {
    api.get.mockResolvedValue({
      data: {
        boardColumns: { NEW: { leads: [], total: 0, nextCursor: null } },
        total: 0,
        stageCounts: { NEW: 0 },
        stats: {}
      }
    });

    const { unmount } = render(
      <MemoryRouter>
        <LeadsPage />
      </MemoryRouter>
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(screen.getByTestId('leads-sync-status').textContent).toBe('Нет сети');

    act(() => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(screen.getByTestId('leads-sync-status').textContent).toContain('Онлайн'));

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('R07.1: refreshes >500 loaded list items across bounded pages and removes archived/revoked tail items', async () => {
    const makeBatch = (start, count, suffix = '') =>
      Array.from({ length: count }, (_, idx) => ({
        id: start + idx,
        id_str: String(start + idx),
        full_name: `Lead ${start + idx}${suffix}`,
        status: 'NEW',
        stage: 'NEW',
        version: 1
      }));

    let phase = 'initial';
    api.get.mockImplementation((url, cfg) => {
      if (url === '/leads') {
        if (cfg?.params?.cursor === 'c_500') {
          if (phase === 'initial') {
            return Promise.resolve({ data: { leads: makeBatch(501, 50), total: 550, nextCursor: null } });
          }
          // After refresh: Lead 520 updated to v2, Lead 530 archived/revoked (removed!)
          const tail = makeBatch(501, 50, ' refreshed')
            .filter((l) => l.id !== 530)
            .map((l) => (l.id === 520 ? { ...l, full_name: 'Lead 520 Updated', version: 2 } : l));
          return Promise.resolve({ data: { leads: tail, total: 549, nextCursor: null } });
        }
        if (phase === 'initial') {
          return Promise.resolve({ data: { leads: makeBatch(1, 500), total: 550, nextCursor: 'c_500' } });
        }
        return Promise.resolve({ data: { leads: makeBatch(1, 500, ' refreshed'), total: 549, nextCursor: 'c_500' } });
      }
      if (url === '/leads/stats') return Promise.resolve({ data: { stats: { total: 550 } } });
      return Promise.resolve({ data: { projects: [], users: [] } });
    });

    render(
      <MemoryRouter>
        <LeadsPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Список/ }));
    await waitFor(() => expect(screen.getByText(/#1 • Lead 1$/)).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /Загрузить ещё/ }));
    await waitFor(() => expect(screen.getByText(/#530 • Lead 530$/)).toBeDefined());

    phase = 'refresh';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5200);
    });

    await waitFor(() => {
      expect(screen.getByText(/#520 • Lead 520 Updated/)).toBeDefined();
      expect(screen.queryByText(/#530 • Lead 530/)).toBeNull();
    });
  }, 15000);

  it('R07.1: refreshes >100 column cards without duplicates on stage move, discards stale loadMore on filter change, and keeps leads/boardColumns in sync', async () => {
    const makeCards = (start, count, stage = 'NEW') =>
      Array.from({ length: count }, (_, idx) => ({
        id: start + idx,
        id_str: String(start + idx),
        full_name: `Card ${start + idx}`,
        status: 'NEW',
        stage,
        version: 1
      }));

    let resolveLoadMoreA;
    let boardPhase = 'initial';

    api.get.mockImplementation((url, cfg) => {
      if (url === '/leads/board') {
        if (cfg?.params?.projectId === '2') {
          return Promise.resolve({
            data: {
              boardColumns: { NEW: { leads: [{ id: 901, full_name: 'Proj B Card', stage: 'NEW' }], total: 1, nextCursor: null } },
              total: 1,
              stageCounts: { NEW: 1 }
            }
          });
        }
        if (boardPhase === 'initial') {
          return Promise.resolve({
            data: {
              boardColumns: {
                NEW: { leads: makeCards(1, 20), total: 120, nextCursor: 'col_p2' },
                RESERVED: { leads: [], total: 0, nextCursor: null }
              },
              total: 120,
              stageCounts: { NEW: 120, RESERVED: 0 }
            }
          });
        }
        // Background refresh after Card 105 moved from NEW -> RESERVED
        return Promise.resolve({
          data: {
            boardColumns: {
              NEW: { leads: makeCards(1, 100), total: 119, nextCursor: 'col_tail' },
              RESERVED: { leads: [{ id: 105, id_str: '105', full_name: 'Card 105', stage: 'RESERVED', version: 2 }], total: 1, nextCursor: null }
            },
            total: 120,
            stageCounts: { NEW: 119, RESERVED: 1 }
          }
        });
      }
      if (url === '/leads') {
        if (cfg?.params?.cursor === 'col_p2') {
          return new Promise((resolve) => {
            resolveLoadMoreA = () => resolve({
              data: { leads: makeCards(21, 90), total: 120, nextCursor: null }
            });
          });
        }
        if (cfg?.params?.cursor === 'col_tail') {
          // Tail of NEW (19 cards, Card 105 excluded because it moved to RESERVED)
          return Promise.resolve({
            data: { leads: makeCards(101, 20).filter((c) => c.id !== 105), total: 119, nextCursor: null }
          });
        }
      }
      if (url === '/leads/stats') return Promise.resolve({ data: { stats: {} } });
      if (url === '/projects') return Promise.resolve({ data: { projects: [{ id: 1, name: 'Proj A' }, { id: 2, name: 'Proj B' }] } });
      return Promise.resolve({ data: { users: [] } });
    });

    render(
      <MemoryRouter>
        <LeadsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Card 1')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));
    await waitFor(() => expect(typeof resolveLoadMoreA).toBe('function'));

    // Complete loadMore (>100 cards in NEW)
    await act(async () => { resolveLoadMoreA(); });
    await waitFor(() => expect(screen.getByText('Card 105')).toBeDefined());

    // Background refresh moves Card 105 from NEW to RESERVED -> only 1 Card 105 exists (no duplicate!)
    boardPhase = 'moved';
    await act(async () => { await vi.advanceTimersByTimeAsync(5200); });
    await waitFor(() => expect(screen.getAllByText('Card 105')).toHaveLength(1));

    // Switch project filter to Project B -> stale Project A loadMore must not corrupt Project B
    fireEvent.change(screen.getByDisplayValue('Все объекты'), { target: { value: '2' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    await waitFor(() => expect(screen.getByText('Proj B Card')).toBeDefined());
    expect(screen.queryByText('Card 1')).toBeNull();
  });
});
