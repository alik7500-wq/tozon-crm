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

describe('SmsNotificationsPage Manager UX Hotfix Tests', () => {
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
                idempotency_key: 'PAYMENT_REMINDER:297:3:2026-10-03',
                deal_id: 14,
                contract_number: '0004',
                payload_json: {
                  detected_unpaid_minor: 63000,
                  detected_due_date: '2026-10-03'
                },
                created_at: new Date().toISOString()
              },
              {
                id: 4,
                event_type: 'PAYMENT_REMINDER',
                status: 'AWAITING_CONFIRMATION',
                template_code: 'PAYMENT_REMINDER',
                idempotency_key: 'PAYMENT_REMINDER:298:2:2026-10-02',
                deal_id: 14,
                contract_number: '0005',
                payload_json: {
                  detected_unpaid_minor: 63000,
                  detected_due_date: '2026-10-02'
                },
                created_at: new Date().toISOString()
              },
              {
                id: 5,
                event_type: 'PAYMENT_REMINDER',
                status: 'AWAITING_CONFIRMATION',
                template_code: 'PAYMENT_REMINDER',
                idempotency_key: 'PAYMENT_REMINDER:299:1:2026-10-01',
                deal_id: 14,
                payload_json: {
                  detected_unpaid_minor: 63000,
                  detected_due_date: '2026-10-01'
                },
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

  it('A. default queue query requests AWAITING_CONFIRMATION status', async () => {
    render(<SmsNotificationsPage />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('status=AWAITING_CONFIRMATION'));
    });
  });

  it('B. displays authoritative awaiting count (3) in queue badge', async () => {
    render(<SmsNotificationsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    });
  });

  it('C. "Все события" is not default active filter button', async () => {
    render(<SmsNotificationsPage />);
    const allEventsButtons = screen.getAllByRole('button', { name: 'Все события' });
    expect(allEventsButtons[0].className).not.toContain('bg-blue-600');
  });

  it('D. internal idempotency key is hidden from primary table row view', async () => {
    render(<SmsNotificationsPage />);
    await waitFor(() => {
      expect(screen.queryByText(/Key: PAYMENT_REMINDER/i)).toBeNull();
    });
  });

  it('E. PAYMENT_REMINDER displays as localized "Напоминание об оплате"', async () => {
    render(<SmsNotificationsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Напоминание об оплате').length).toBeGreaterThan(0);
    });
  });

  it('F. click "Проверить и отправить" opens modal and does not invoke confirm API', async () => {
    render(<SmsNotificationsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Проверить и отправить').length).toBeGreaterThan(0);
    });

    const checkButtons = screen.getAllByRole('button', { name: /Проверить и отправить/i });
    fireEvent.click(checkButtons[0]);

    const confirmCalls = api.post.mock.calls.filter(([url]) => url && typeof url === 'string' && url.includes('/confirm'));
    expect(confirmCalls.length).toBe(0);
  });

  it('G. history tab continues to work and display records', async () => {
    render(<SmsNotificationsPage />);
    const historyTabButtons = screen.getAllByRole('button', { name: /История SMS/i });
    fireEvent.click(historyTabButtons[0]);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/sms/history'));
    });
  });

  it('H. no bulk send / "Отправить все" controls are rendered', async () => {
    render(<SmsNotificationsPage />);
    expect(screen.queryByText(/Отправить все/i)).toBeNull();
    expect(screen.queryByText(/Массовая отправка/i)).toBeNull();
  });

  it('I. displays contract_number preserving leading zeros and uses safe fallback when missing', async () => {
    render(<SmsNotificationsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Напоминание об оплате').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Договор №0004/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Договор №0005/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Договор не указан/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Сделка №14/)).toBeNull();
  });

  it('J. preview modal displays localized labels, DD.MM.YYYY date, "Подтвердить отправку" button, and cancel prompt', async () => {
    api.post.mockImplementation((url) => {
      if (url.includes('/preview')) {
        return Promise.resolve({
          success: true,
          data: {
            event: {
              id: 3,
              event_type: 'PAYMENT_REMINDER',
              template_code: 'PAYMENT_REMINDER',
              status: 'AWAITING_CONFIRMATION',
              contract_number: '0004',
              payload_json: {
                detected_unpaid_minor: 63000,
                detected_due_date: '2026-10-03'
              }
            },
            isApplicable: true,
            text: 'Здравствуйте! Напоминаем об очередной оплате по договору №0004 в размере 630 USD до 03.10.2026. TOZON-PLAZA.',
            characterCount: 115,
            smsSegments: 2,
            isUnicode: true,
            previewHash: 'hash123'
          }
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    render(<SmsNotificationsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Проверить и отправить').length).toBeGreaterThan(0);
    });

    const checkButtons = screen.getAllByRole('button', { name: /Проверить и отправить/i });
    fireEvent.click(checkButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Подтвердить отправку')).toBeInTheDocument();
      expect(screen.getAllByText('Напоминание об оплате').length).toBeGreaterThan(0);
      expect(screen.getByText('03.10.2026')).toBeInTheDocument();
      expect(screen.queryByText(/Шаблон:/i)).toBeNull();
    });

    const notSendBtn = screen.getByRole('button', { name: /Не отправлять/i });
    fireEvent.click(notSendBtn);

    expect(screen.getByText(/Отменить это SMS-уведомление\? Оно исчезнет из очереди ожидающих отправки\./i)).toBeInTheDocument();
  });
});
