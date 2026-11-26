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
});
