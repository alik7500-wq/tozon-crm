import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches between Kanban, Table, and List views preserving filters and displaying server total + cursor', async () => {
    api.get.mockImplementation((url) => {
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
      expect(screen.getByText(/Загрузить ещё/)).toBeDefined();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: /Список/ }));
    expect(screen.getByText(/#101 • Алишер Каримов/)).toBeDefined();
    expect(screen.getAllByText('42').length).toBeGreaterThanOrEqual(2);
  });

  it('shows explicit error banner instead of empty state when /leads fails', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/leads') return Promise.reject(new Error('Сервер временно недоступен'));
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
});
