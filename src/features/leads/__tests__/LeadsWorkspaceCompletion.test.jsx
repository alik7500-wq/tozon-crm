import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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

describe('LeadsPage workspace completion (F-01, F-03, A34-A36)', () => {
  afterEach(() => {
    cleanup();
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches between Kanban (/leads/board), Table, and List views preserving filters and displaying server total + cursor', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/leads/board') {
        return Promise.resolve({
          data: {
            boardColumns: {
              NEW: {
                leads: [{ id: 101, full_name: 'Алишер Каримов', phone: '+992900111222', status: 'NEW', stage: 'NEW', source: 'INSTAGRAM', version: 1 }],
                total: 25,
                nextCursor: 'col_cur_1'
              },
              RESERVED: {
                leads: [{ id: 202, full_name: 'Фируз Шарипов', phone: '+992900333444', status: 'NEW', stage: 'RESERVED', source: 'PHONE', version: 1 }],
                total: 1,
                nextCursor: null
              }
            },
            total: 42,
            stageCounts: { NEW: 25, RESERVED: 1 }
          }
        });
      }
      if (url === '/leads') {
        return Promise.resolve({
          data: {
            leads: [
              { id: 101, full_name: 'Алишер Каримов', phone: '+992900111222', status: 'NEW', stage: 'NEW', source: 'INSTAGRAM', version: 1 }
            ],
            total: 42,
            nextCursor: '1'
          }
        });
      }
      if (url === '/leads/stats') {
        return Promise.resolve({ data: { stats: { total: 42, new: 10, unassigned: 5, awaiting_contact: 4, overdue: 2, in_progress: 15, closed: 17 } } });
      }
      if (url === '/projects') return Promise.resolve({ data: { projects: [{ id: 1, name: 'TOZON PLAZA' }] } });
      if (url === '/users') return Promise.resolve({ data: { users: [{ id: 2, name: 'Менеджер А', is_active: 1 }] } });
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <LeadsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Всего по выборке:/)).toBeDefined();
      expect(screen.getByText('Фируз Шарипов')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Показать ещё' })).toBeDefined();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: /Список/ }));
    await waitFor(() => {
      expect(screen.getByText(/#101 • Алишер Каримов/)).toBeDefined();
      expect(screen.getByText(/Загрузить ещё/)).toBeDefined();
    });
    expect(screen.getAllByText('42').length).toBeGreaterThanOrEqual(2);
  });

  it('shows explicit error banner instead of empty state when /leads/board fails', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/leads/board' || url === '/leads') return Promise.reject(new Error('Сервер временно недоступен'));
      if (url === '/leads/stats') return Promise.resolve({ data: { stats: {} } });
      return Promise.resolve({ data: { projects: [], users: [] } });
    });

    render(
      <MemoryRouter>
        <LeadsPage />
      </MemoryRouter>
    );

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Сервер временно недоступен');
  });

  it('sends identical filters to /leads/board, /leads/stats, and /leads/export and loads more per column', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    api.get.mockImplementation((url, config) => {
      if (url === '/leads/board') {
        return Promise.resolve({
          data: {
            boardColumns: {
              NEW: {
                leads: [{ id: 101, full_name: 'Алишер Каримов', status: 'NEW', stage: 'NEW', source: 'INSTAGRAM', version: 1 }],
                total: 35,
                nextCursor: 'new_page_2'
              },
              LOST: {
                leads: [{ id: 303, full_name: 'Отказ Лид', status: 'LOST', stage: 'LOST', source: 'PHONE', version: 1 }],
                total: 2,
                nextCursor: null
              }
            },
            total: 99,
            stageCounts: { NEW: 35, IN_PROGRESS: 20, NEGOTIATION: 15, MEETING_SCHEDULED: 5, SHOWING_DONE: 4, RESERVED: 10, CONTRACT_PREP: 5, SIGNED: 3, LOST: 2 }
          }
        });
      }
      if (url === '/leads') {
        expect(config?.params?.stage).toBe('NEW');
        expect(config?.params?.cursor).toBe('new_page_2');
        return Promise.resolve({
          data: {
            leads: [{ id: 102, full_name: 'Вторая Страница NEW', status: 'NEW', stage: 'NEW', source: 'INSTAGRAM', version: 1 }],
            total: 35,
            nextCursor: null
          }
        });
      }
      if (url === '/leads/stats') {
        return Promise.resolve({ data: { stats: { total: 99, new: 35, unassigned: 0, awaiting_contact: 0, overdue: 0, in_progress: 0, closed: 5 } } });
      }
      return Promise.resolve({ data: { projects: [], users: [] } });
    });

    render(
      <MemoryRouter>
        <LeadsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('35').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Отказ Лид')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Состояние задачи'), { target: { value: 'PAUSED' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/leads/board', expect.objectContaining({ params: expect.objectContaining({ taskState: 'PAUSED', perStageLimit: 20 }) }));
      expect(api.get).toHaveBeenCalledWith('/leads/stats', expect.objectContaining({ params: expect.objectContaining({ taskState: 'PAUSED' }) }));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }));
    await waitFor(() => {
      expect(screen.getByText('Вторая Страница NEW')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Экспорт Excel' }));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('/leads/export?taskState=PAUSED'), '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });
});
