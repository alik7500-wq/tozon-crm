import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { InstagramInboxPage } from '../InstagramInboxPage';
import { api } from '../../../api/client';

let mockUser = { id: 2, name: 'Manager A', role: 'SALES_MANAGER', permissions: ['leads.view', 'leads.manage'] };

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

describe('R07: InstagramInboxPage background refresh, off-page-1 selection, older history merge, 403 vs 409 & logout race', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUser = { id: 2, name: 'Manager A', role: 'SALES_MANAGER', permissions: ['leads.view', 'leads.manage'] };
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('keeps off-page-1 selected dialog open and merges new messages without erasing older history', async () => {
    let msgCall = 0;
    api.get.mockImplementation((url, cfg) => {
      if (url === '/integrations/instagram/inbox/accounts') {
        return Promise.resolve({ data: { accounts: [{ accountId: '11111', username: 'tozon' }] } });
      }
      if (url === '/integrations/instagram/inbox/conversations') {
        return Promise.resolve({
          data: [{ instagramAccountId: '11111', contactId: '10', name: 'Page 1 Contact' }],
          nextCursor: 'CUR_P2'
        });
      }
      if (url === '/integrations/instagram/inbox/conversations/page') {
        return Promise.resolve({
          data: [{ instagramAccountId: '11111', contactId: '20', name: 'Page 2 Selected Contact' }],
          nextCursor: null
        });
      }
      if (url === '/integrations/instagram/inbox/conversations/11111/20/messages') {
        if (cfg?.params?.after === 'OLD_CUR') {
          return Promise.resolve({
            data: [{ message_id: 'm_old', text_content: 'Older history msg', is_echo: false, created_at: '2026-11-26T09:00:00Z' }],
            nextCursor: null
          });
        }
        msgCall += 1;
        if (msgCall === 1) {
          return Promise.resolve({
            data: [{ message_id: 'm_mid', text_content: 'Initial latest msg', is_echo: false, created_at: '2026-11-26T10:00:00Z' }],
            nextCursor: 'OLD_CUR'
          });
        }
        return Promise.resolve({
          data: [
            { message_id: 'm_mid', text_content: 'Initial latest msg', is_echo: false, created_at: '2026-11-26T10:00:00Z' },
            { message_id: 'm_new', text_content: 'Brand new incoming', is_echo: false, created_at: '2026-11-26T10:05:00Z' }
          ],
          nextCursor: null
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<InstagramInboxPage />);
    fireEvent.click(await screen.findByText('Загрузить ещё диалоги'));
    fireEvent.click(await screen.findByText('Page 2 Selected Contact'));
    await screen.findByText('Initial latest msg');

    fireEvent.click(await screen.findByText('Более ранние сообщения'));
    await screen.findByText('Older history msg');

    // Background refresh ticks -> Page 1 conversations do NOT include contact 20, and latest messages arrive
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3200);
    });

    await waitFor(() => {
      expect(screen.getByText('Brand new incoming')).toBeDefined();
    });
    // Both off-page-1 conversation and older loaded message MUST still be visible!
    expect(screen.getByText('Page 2 Selected Contact')).toBeDefined();
    expect(screen.getByText('Older history msg')).toBeDefined();
  });

  it('clears draftStore Map and history on 403 access revocation, does NOT wipe on 409, and ignores late response after logout', async () => {
    let resolveInFlight;
    let failWith403 = false;
    let failWith409 = false;

    api.get.mockImplementation((url) => {
      if (url === '/integrations/instagram/inbox/accounts') {
        return Promise.resolve({ data: { accounts: [{ accountId: '11111', username: 'tozon' }] } });
      }
      if (url === '/integrations/instagram/inbox/conversations') {
        if (failWith403) {
          const err = new Error('Forbidden');
          err.response = { status: 403, data: { code: 'INSTAGRAM_ACCESS_DENIED' } };
          return Promise.reject(err);
        }
        if (failWith409) {
          const err = new Error('Conflict');
          err.response = { status: 409, data: { code: 'INSTAGRAM_RECONNECT_REQUIRED' } };
          return Promise.reject(err);
        }
        return Promise.resolve({
          data: [{ instagramAccountId: '11111', contactId: '42', name: 'Client 42' }]
        });
      }
      if (url === '/integrations/instagram/inbox/conversations/11111/42/messages') {
        return new Promise((resolve) => {
          resolveInFlight = () => resolve({
            data: [{ message_id: 'm1', text_content: 'Secret after logout', is_echo: false, created_at: '2026-11-26T10:00:00Z' }]
          });
        });
      }
      return Promise.resolve({ data: {} });
    });

    const { rerender, unmount } = render(<InstagramInboxPage />);
    fireEvent.click(await screen.findByText('Client 42'));
    fireEvent.change(screen.getByLabelText('Ответ клиенту'), { target: { value: 'My draft' } });

    // 409 conflict on background refresh must NOT wipe the draft or dialog
    failWith409 = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(3200); });
    expect(screen.getByLabelText('Ответ клиенту').value).toBe('My draft');

    // Simulate logout while message request is still in-flight
    failWith409 = false;
    mockUser = null;
    rerender(<InstagramInboxPage />);
    await act(async () => { resolveInFlight?.(); });
    expect(screen.queryByText('Secret after logout')).toBeNull();

    // Restore user and trigger real 403 revocation -> clears state
    mockUser = { id: 2, name: 'Manager A', role: 'SALES_MANAGER', permissions: ['leads.view', 'leads.manage'] };
    rerender(<InstagramInboxPage />);
    await screen.findByText('Client 42');
    failWith403 = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(3200); });
    expect(screen.queryByText('Client 42')).toBeNull();

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
