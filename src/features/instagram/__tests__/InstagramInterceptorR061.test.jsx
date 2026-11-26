import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { api } from '../../../api/client';
import { InstagramReplyComposer } from '../InstagramReplyComposer';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'SALES_MANAGER' } })
}));

const convA = { instagramAccountId: '11111', contactId: '42' };
const convB = { instagramAccountId: '11111', contactId: '99' };

function makeAxiosHttpError(config, status, data) {
  const err = new Error(`Request failed with status code ${status}`);
  err.config = config;
  err.isAxiosError = true;
  err.response = { status, data, headers: {}, config };
  return err;
}

describe('R06.1: Real Axios Interceptor + Composer Operation Lifecycle', () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    cleanup();
  });

  it('treats Axios timeout (ECONNABORTED) and network drop through real interceptor as UNKNOWN, never fake response', async () => {
    api.defaults.adapter = async (config) => {
      const err = new Error('timeout of 25000ms exceeded');
      err.code = 'ECONNABORTED';
      err.config = config;
      throw err;
    };

    const { container } = render(<InstagramReplyComposer conversation={convA} />);
    fireEvent.change(screen.getByLabelText('Ответ клиенту'), { target: { value: 'Timeout msg' } });
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(container.querySelector('form').getAttribute('data-delivery-state')).toBe('unknown');
    });
    expect(screen.getByRole('button', { name: 'Сверить доставку' })).toBeTruthy();

    // Network drop without response on a fresh dialog
    cleanup();
    api.defaults.adapter = async (config) => {
      const err = new Error('Network Error');
      err.code = 'ERR_NETWORK';
      err.config = config;
      throw err;
    };
    const { container: containerB } = render(<InstagramReplyComposer conversation={convB} />);
    fireEvent.change(screen.getByLabelText('Ответ клиенту'), { target: { value: 'Offline msg' } });
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(containerB.querySelector('form').getAttribute('data-delivery-state')).toBe('unknown');
    });
  });

  it('treats HTTP 409 SEND_IN_PROGRESS through real interceptor as UNKNOWN requiring reconciliation', async () => {
    api.defaults.adapter = async (config) => {
      throw makeAxiosHttpError(config, 409, { code: 'SEND_IN_PROGRESS' });
    };

    const { container } = render(<InstagramReplyComposer conversation={convA} />);
    fireEvent.change(screen.getByLabelText('Ответ клиенту'), { target: { value: 'In progress msg' } });
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(container.querySelector('form').getAttribute('data-delivery-state')).toBe('unknown');
    });
    expect(screen.getByRole('button', { name: 'Сверить доставку' })).toBeTruthy();
  });

  it('handles confirmed FAILED -> fix cause -> explicit new attempt with a NEW idempotency_key', async () => {
    const keys = [];
    let callCount = 0;
    api.defaults.adapter = async (config) => {
      const body = JSON.parse(config.data);
      keys.push(body.idempotency_key);
      callCount += 1;
      if (callCount === 1) {
        throw makeAxiosHttpError(config, 409, { code: 'INSTAGRAM_REPLY_WINDOW_CLOSED' });
      }
      return {
        status: 200,
        data: { status: 'success', deliveryStatus: 'confirmed', data: { message: { message_id: 'm_ok', text_content: body.text, is_echo: true }, saved: true } },
        headers: {},
        config
      };
    };

    const { container } = render(<InstagramReplyComposer conversation={convA} />);
    fireEvent.change(screen.getByLabelText('Ответ клиенту'), { target: { value: 'First try' } });
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(container.querySelector('form').getAttribute('data-delivery-state')).toBe('failed');
    });
    expect(screen.getByText('Отправить').disabled).toBe(true);

    // Fix text & explicitly start a new attempt -> must issue a NEW idempotency_key
    fireEvent.change(screen.getByLabelText('Ответ клиенту'), { target: { value: 'Fixed try' } });
    fireEvent.click(screen.getByRole('button', { name: 'Начать новую попытку' }));
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('Принято поставщиком');
    });
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('preserves newly edited draft when reconciling an old UNKNOWN operation, and warns before resetting unknown', async () => {
    api.defaults.adapter = async (config) => {
      if (config.url.endsWith('/reconcile')) {
        return {
          status: 200,
          data: { status: 'success', deliveryStatus: 'confirmed', data: { message: { message_id: 'm_rec', text_content: 'Old unknown', is_echo: true }, saved: true } },
          headers: {},
          config
        };
      }
      const err = new Error('timeout');
      err.code = 'ECONNABORTED';
      err.config = config;
      throw err;
    };

    const { container } = render(<InstagramReplyComposer conversation={convA} />);
    fireEvent.change(screen.getByLabelText('Ответ клиенту'), { target: { value: 'Old unknown' } });
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(container.querySelector('form').getAttribute('data-delivery-state')).toBe('unknown');
    });

    // User clicks "Начать новое сообщение" -> must see explicit warning before resetting
    fireEvent.click(screen.getByRole('button', { name: 'Начать новое сообщение' }));
    expect(screen.getByText(/Прежняя отправка могла состояться/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    // User edits draft while previous operation is still UNKNOWN
    fireEvent.change(screen.getByLabelText('Ответ клиенту'), { target: { value: 'Brand new draft' } });
    expect(container.querySelector('form').getAttribute('data-delivery-state')).toBe('unknown');

    // Reconcile confirms the OLD operation -> new draft MUST NOT be cleared!
    fireEvent.click(screen.getByRole('button', { name: 'Сверить доставку' }));
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('Принято поставщиком');
    });
    expect(screen.getByLabelText('Ответ клиенту').value).toBe('Brand new draft');
  });

  it('does not let a late response from conversation A clear conversation B draft', async () => {
    let resolveA;
    api.defaults.adapter = (config) => new Promise((resolve) => {
      resolveA = () => resolve({
        status: 200,
        data: { status: 'success', deliveryStatus: 'confirmed', data: { message: { message_id: 'm_a', text_content: 'Msg A', is_echo: true }, saved: true } },
        headers: {},
        config
      });
    });

    const { rerender } = render(<InstagramReplyComposer conversation={convA} />);
    fireEvent.change(screen.getByLabelText('Ответ клиенту'), { target: { value: 'Msg A' } });
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => expect(typeof resolveA).toBe('function'));

    // Switch to conversation B while A is still in-flight
    rerender(<InstagramReplyComposer conversation={convB} />);
    fireEvent.change(screen.getByLabelText('Ответ клиенту'), { target: { value: 'Draft B' } });

    await act(async () => {
      resolveA();
    });

    expect(screen.getByLabelText('Ответ клиенту').value).toBe('Draft B');
  });
});
