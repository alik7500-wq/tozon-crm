// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ContractCongratulationsModal } from '../ContractCongratulationsModal';
import { api } from '../../../api/client';
vi.mock('../../../api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
async function open() {
  api.get.mockResolvedValue({ data: { events: [{ id: 32, deal_id: 51, event_type: 'CONTRACT_CREATED' }] } });
  api.post.mockResolvedValue({ success: true, data: { event: { id: 32, status: 'AWAITING_CONFIRMATION' }, text: 'Поздравляем, клиент!', previewHash: 'server-hash', isApplicable: true } });
  render(<ContractCongratulationsModal />);
  await act(async () => window.dispatchEvent(new CustomEvent('tozon:contract-signed', { detail: { id: 51, contract_number: '0051' } })));
  await screen.findByText('Поздравляем, клиент!');
}
describe('Contract congratulations', () => {
  it('shows preview after signing and closes without sending', async () => {
    await open();
    expect(api.post).toHaveBeenCalledWith('/sms/events/32/preview');
    fireEvent.click(screen.getByText('Закрыть без SMS'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('confirms the existing queued event with the server preview hash', async () => {
    await open();
    api.post.mockResolvedValueOnce({ success: true, data: { status: 'SENT' } });
    fireEvent.click(screen.getByText('Отправить SMS'));
    await screen.findByText('SMS отправлено');
    expect(api.post).toHaveBeenLastCalledWith('/sms/events/32/confirm', { previewHash: 'server-hash' });
  });
});
