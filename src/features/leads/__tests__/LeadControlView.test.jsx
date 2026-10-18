// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LeadControlView } from '../LeadControlView';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  },
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'DIRECTOR', name: 'Director User' }
  })
}));

const mockSlaSuccessData = {
  state: 'SUCCESS',
  isAvailable: true,
  summary: {
    totalActive: 10,
    unassignedCount: 0,
    contactWarningCount: 2,
    contactOverdueCount: 1,
    stagnantCount: 3,
    overdueTasksCount: 4,
    onTrackCount: 0,
    attentionRequiredCount: 10
  },
  leads: [
    {
      id: 501,
      full_name: 'Каримов Рустам',
      phone: '+992921112233',
      status: 'IN_PROGRESS',
      sla_status: 'OVERDUE_TASK',
      sla_badge: { label: 'Просрочена задача', color: 'rose' },
      responsible_user_name: 'Алиджон',
      hours_since_last_activity: 12
    }
  ],
  pagination: { total: 1, page: 1, limit: 50, totalPages: 1 }
};

describe('TOZON CRM — LeadControlView (Phase 3.6 Hotfix Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders exact numeric values (including genuine 0) when data loads successfully', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/users') return Promise.resolve({ data: [{ id: 1, name: 'Admin', is_active: true }] });
      if (url === '/leads/sla-control') return Promise.resolve({ data: mockSlaSuccessData });
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <LeadControlView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Каримов Рустам')).toBeDefined();
    });

    // Check that metrics are rendered
    expect(screen.getByText('2')).toBeDefined(); // contactWarningCount
    expect(screen.getByText('4')).toBeDefined(); // overdueTasksCount
    expect(screen.getByText('3')).toBeDefined(); // stagnantCount
    expect(screen.queryByTestId('kpi-unavailable')).toBeNull();
  });

  it('displays DATA_UNAVAILABLE state with dashes ("—") instead of false zeros when API fails', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/users') return Promise.resolve({ data: [{ id: 1, name: 'Admin', is_active: true }] });
      if (url === '/leads/sla-control') return Promise.reject(new Error('Произошла ошибка при обработке запроса'));
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <LeadControlView />
      </MemoryRouter>
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('DATA_UNAVAILABLE')).toBeDefined();
    });

    // Error message must be clearly visible
    expect(screen.getByText(/Произошла ошибка при обработке запроса/)).toBeDefined();

    // Retry button must be available
    expect(screen.getByRole('button', { name: /Повторить запрос/ })).toBeDefined();

    // Verify all 6 KPI cards show DATA_UNAVAILABLE indicator '—' and NOT false zeros
    const unavailableDashes = screen.getAllByTestId('kpi-unavailable');
    expect(unavailableDashes).toHaveLength(6);
    unavailableDashes.forEach((el) => {
      expect(el.textContent).toBe('—');
      expect(el.getAttribute('data-status')).toBe('DATA_UNAVAILABLE');
    });
  });

  it('handles structured DATA_UNAVAILABLE payload from server gracefully without false zeros', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/users') return Promise.resolve({ data: [{ id: 1, name: 'Admin', is_active: true }] });
      if (url === '/leads/sla-control') {
        return Promise.resolve({
          data: {
            state: 'DATA_UNAVAILABLE',
            isAvailable: false,
            message: 'Данные контроля обработки лидов временно недоступны',
            summary: { unassignedCount: 0 },
            leads: []
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <LeadControlView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DATA_UNAVAILABLE')).toBeDefined();
    });

    expect(screen.getByText(/Данные контроля обработки лидов временно недоступны/)).toBeDefined();

    const unavailableDashes = screen.getAllByTestId('kpi-unavailable');
    expect(unavailableDashes).toHaveLength(6);
  });

  it('re-fetches data when retry button is clicked after error', async () => {
    let callCount = 0;
    api.get.mockImplementation((url) => {
      if (url === '/users') return Promise.resolve({ data: [{ id: 1, name: 'Admin', is_active: true }] });
      if (url === '/leads/sla-control') {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ data: mockSlaSuccessData });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <LeadControlView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DATA_UNAVAILABLE')).toBeDefined();
    });

    const retryBtn = screen.getByRole('button', { name: /Повторить запрос/ });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Каримов Рустам')).toBeDefined();
    });

    expect(screen.queryByText('DATA_UNAVAILABLE')).toBeNull();
    expect(callCount).toBe(2);
  });
});
