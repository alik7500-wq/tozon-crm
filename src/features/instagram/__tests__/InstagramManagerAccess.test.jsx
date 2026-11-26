import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout';
import { InstagramInboxPage } from '../InstagramInboxPage';
import { api } from '../../../api/client';

let mockUser = { id: 2, name: 'Manager A', role: 'SALES_MANAGER', permissions: ['leads.view', 'leads.manage'] };

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} }))
  }
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: vi.fn() })
}));

vi.mock('../../notifications/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />
}));

describe('R05: SALES_MANAGER UI access to InstagramInboxPage through MainLayout route & menu', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 2, name: 'Manager A', role: 'SALES_MANAGER', permissions: ['leads.view', 'leads.manage'] };
  });

  it('allows SALES_MANAGER to open Instagram Direct from menu, view owned thread, and hides account management controls', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/integrations/instagram/inbox/accounts') {
        return Promise.resolve({ data: { accounts: [{ accountId: '11111', username: 'tozon_sales' }] } });
      }
      if (url === '/integrations/instagram/inbox/conversations') {
        return Promise.resolve({
          data: [{ instagramAccountId: '11111', contactId: '42', name: 'Клиент А', lastMessage: 'Здравствуйте' }]
        });
      }
      if (url === '/integrations/instagram/inbox/conversations/11111/42/messages') {
        return Promise.resolve({
          data: [{ message_id: 'm1', text_content: 'Интересует квартира', is_echo: false, created_at: '2026-11-26T10:00:00Z' }]
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<div>Dashboard</div>} />
            <Route path="/instagram/inbox" element={<InstagramInboxPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const link = await screen.findByRole('link', { name: /Instagram Direct/i });
    fireEvent.click(link);

    await waitFor(() => {
      expect(screen.getByText('Клиент А')).toBeDefined();
    });

    // Must NOT call admin /connection endpoint and must NOT show connect/disconnect buttons
    expect(api.get).not.toHaveBeenCalledWith('/integrations/instagram/connection');
    expect(screen.queryByText('Добавить аккаунт Instagram')).toBeNull();
    expect(screen.queryByText('Переподключить')).toBeNull();
    expect(screen.queryByText('Отключить аккаунт')).toBeNull();

    fireEvent.click(screen.getByText('Клиент А'));
    await waitFor(() => {
      expect(screen.getByText('Интересует квартира')).toBeDefined();
    });
  });

  it('shows empty state when SALES_MANAGER has no permitted accounts/dialogs', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/integrations/instagram/inbox/accounts') {
        return Promise.resolve({ data: { accounts: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter initialEntries={['/instagram/inbox']}>
        <Routes>
          <Route path="/instagram/inbox" element={<InstagramInboxPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Нет доступных диалогов Instagram.')).toBeDefined();
    });
    expect(api.get).not.toHaveBeenCalledWith('/integrations/instagram/inbox/conversations', expect.anything());
  });
});
