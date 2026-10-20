import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { api } from '../../../api/client';
import { ClientModal } from '../ClientModal';
vi.mock('../../documents/PassportScannerModal', () => ({ PassportScannerModal: () => null }));
const oldAdapter = api.defaults.adapter;
afterEach(() => { cleanup(); api.defaults.adapter = oldAdapter; });
it('hydrates and saves through the real axios response interceptor', async () => {
 const requests = [];
 api.defaults.adapter = async config => {
  requests.push(config);
  const data = config.url === '/users' ? { data: { users: [] } } : { data: { lead: { id: 12, full_name: 'Test buyer', phone: '+992000000000', passport_issued_by: 'Saved authority', secondary_phone: '+992000000001', birth_date: '1991-01-02', registration_address: 'Saved address' } } };
  return { data, status: 200, statusText: 'OK', headers: {}, config };
 };
 render(<ClientModal isOpen mode="edit" client={{ id: 'deal-1', lead_id: 12, name: 'Test buyer' }} onClose={() => {}} />);
 await screen.findByDisplayValue('Saved authority');
 fireEvent.click(screen.getByRole('button', { name: 'Сохранить изменения' }));
 await waitFor(() => expect(requests.some(r => r.method === 'patch')).toBe(true));
 const payload = JSON.parse(requests.find(r => r.method === 'patch').data);
 expect(payload).toMatchObject({ passport_issued_by: 'Saved authority', secondary_phone: '+992000000001', birth_date: '1991-01-02', registration_address: 'Saved address' });
});
