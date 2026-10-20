import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { ClientModal } from '../ClientModal';
import { api } from '../../../api/client';
vi.mock('../../../api/client', () => ({ api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }));
vi.mock('../../documents/PassportScannerModal', () => ({ PassportScannerModal: () => null }));
const summary = { id: 'deal-9', lead_id: 12, name: 'Sample Buyer', phone: '+992000000000', address: 'г. Худжанд' };
const lead = { id: 12, full_name: 'Sample Buyer', phone: '+992000000000', secondary_phone: '+992000000001', passport_series: 'AB', passport_number: 'TEST123', passport_issued_by: 'Test authority', passport_issue_date: '2020-02-03T00:00:00Z', birth_date: '1990-04-05', registration_address: 'Actual saved address', inn: 'TEST987', responsible_user_id: 7, notes: 'Saved note' };
const props = { isOpen: true, mode: 'edit', client: summary, onClose: vi.fn(), onClientSaved: vi.fn() };
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function setup(getLead = () => Promise.resolve({ data: { lead } })) {
 api.get.mockImplementation(url => url === '/users' ? Promise.resolve({ users: [{ id: 7, name: 'Manager', role: 'ADMIN' }] }) : getLead(url));
 api.patch.mockResolvedValue({});
}
describe('buyer edit loads full lead instead of a summary', () => {
 it.each([true, false])('shows and preserves saved data (nested=%s)', async nested => {
  setup(() => Promise.resolve(nested ? { data: { lead } } : { lead }));
  const { container } = render(<ClientModal {...props} />);
  await screen.findByDisplayValue('Test authority');
  for (const value of ['AB', 'TEST123', '+992000000001', 'Actual saved address', 'TEST987', 'Saved note']) expect(screen.getByDisplayValue(value)).toBeInTheDocument();
  expect(container.querySelectorAll('input[type=date]')[0]).toHaveValue('1990-04-05');
  expect(container.querySelectorAll('input[type=date]')[1]).toHaveValue('2020-02-03');
  expect(screen.getByRole('combobox')).toHaveValue('7');
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить изменения' }));
  const { id, ...saved } = lead;
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/leads/12', { ...saved, passport_issue_date: '2020-02-03' }));
 });
 it('cannot save or edit while loading', () => {
  setup(() => new Promise(() => {}));
  const { container } = render(<ClientModal {...props} />);
  expect(screen.getByRole('button', { name: 'Сохранить изменения' })).toBeDisabled();
  fireEvent.submit(container.querySelector('form'));
  expect(api.patch).not.toHaveBeenCalled();
  expect(container.querySelector('fieldset')).toBeDisabled();
 });
 it.each([null, { ...lead, id: 99 }])('blocks incomplete or wrong-client response', async value => {
  setup(() => Promise.resolve({ data: { lead: value } }));
  render(<ClientModal {...props} />);
  await screen.findByText(/Не удалось загрузить полную карточку/);
  expect(screen.getByRole('button', { name: 'Сохранить изменения' })).toBeDisabled();
 });
 it('blocks save on request failure', async () => {
  setup(() => Promise.reject(new Error('Offline')));
  render(<ClientModal {...props} />);
  await screen.findByText(/Offline/);
  expect(screen.getByRole('button', { name: 'Сохранить изменения' })).toBeDisabled();
 });
 it('ignores late response for the previously selected buyer', async () => {
  let resolveOld;
  setup(url => url === '/leads/12' ? new Promise(r => { resolveOld = r; }) : Promise.resolve({ lead: { ...lead, id: 13, full_name: 'Second Buyer' } }));
  const view = render(<ClientModal {...props} />);
  view.rerender(<ClientModal {...props} client={{ id: 'deal-10', lead_id: 13 }} />);
  await screen.findByDisplayValue('Second Buyer');
  resolveOld({ lead });
  await waitFor(() => expect(screen.getByDisplayValue('Second Buyer')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить изменения' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/leads/13', expect.objectContaining({ full_name: 'Second Buyer' })));
 });
});
