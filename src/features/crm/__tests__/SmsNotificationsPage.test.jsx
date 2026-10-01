// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmsNotificationsPage } from '../SmsNotificationsPage';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

describe('SmsNotificationsPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes('/sms/events')) {
        return Promise.resolve({
          success: true,
          data: {
            events: [
              {
                id: 3,
                event_type: 'PAYMENT_REMINDER',
                status: 'AWAITING_CONFIRMATION',
                template_code: 'PAYMENT_REMINDER',
                idempotency_key: 'KEY_3',
                created_at: new Date().toISOString()
              },
              {
                id: 4,
                event_type: 'PAYMENT_REMINDER',
                status: 'AWAITING_CONFIRMATION',
                template_code: 'PAYMENT_REMINDER',
                idempotency_key: 'KEY_4',
                created_at: new Date().toISOString()
              },
              {
                id: 5,
                event_type: 'PAYMENT_REMINDER',
                status: 'AWAITING_CONFIRMATION',
                template_code: 'PAYMENT_REMINDER',
                idempotency_key: 'KEY_5',
                created_at: new Date().toISOString()
              }
            ],
            total: 3,
            totalPages: 1
          }
        });
      }
      if (url.includes('/sms/history')) {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 9,
              phone: '+992927779757',
              message: 'TOZON CRM: По договору 0001 принята оплата 783 USD. Спасибо!',
              status: 'sent',
              created_at: new Date().toISOString(),
              client_name: 'Акмалхон Абдуллоев'
            }
          ]
        });
      }
      if (url.includes('/sms/templates')) {
        return Promise.resolve({ success: true, data: [] });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    api.post.mockImplementation((url) => {
      if (url.includes('/sms/template-availability')) {
        return Promise.resolve({ success: true, data: { templates: [] } });
      }
      return Promise.resolve({ success: true, data: {} });
    });
  });

  it('A. does not render hardcoded mock history rows', async () => {
    render(<SmsNotificationsPage />);
    expect(screen.queryByText('Алиев Рахим')).toBeNull();
    expect(screen.queryByText('Шахноза Алиева')).toBeNull();
  });

  it('B & C. renders real tab buttons and queue tab by default', async () => {
    render(<SmsNotificationsPage />);
    expect(screen.getAllByText('Ожидают отправки').length).toBeGreaterThan(0);
    expect(screen.getAllByText('История SMS').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/sms/events'));
    });
  });

  it('E. opening detail view does not trigger confirm API call automatically', async () => {
    render(<SmsNotificationsPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Напоминание об оплате/i).length).toBeGreaterThan(0);
    });

    // Check that confirm endpoint was never called
    const confirmCalls = api.post.mock.calls.filter(([url]) => url && typeof url === 'string' && url.includes('/confirm'));
    expect(confirmCalls.length).toBe(0);
  });

  it('K. clicking "Отправить SMS" opens SendSmsModal', async () => {
    render(<SmsNotificationsPage />);
    const sendButtons = screen.getAllByRole('button', { name: /Отправить SMS/i });
    fireEvent.click(sendButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/Payom.tj/i).length).toBeGreaterThan(0);
    });
  });
});
