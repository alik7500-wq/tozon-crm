import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DealWizardModal } from '../DealWizardModal';
import { api } from '../../../api/client';
vi.mock('../../../api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../documents/PassportScannerModal', () => ({ PassportScannerModal: () => null }));
const unit = { id: 300, unit_kind: 'APARTMENT', unit_number: '24', rooms: 2, area_m2_x100: 5000, price_per_m2_minor: 50000, project_currency: 'USD' };
const desks = Array.from({ length: 6 }, (_, i) => ({ id: `desk-${i}`, name: `Касса ${i + 1}`, is_active: i !== 5 }));
let dictionaryResponse;
beforeEach(() => {
 vi.clearAllMocks();
 dictionaryResponse = () => Promise.resolve({ data: desks });
 api.get.mockImplementation(path => path === '/dictionaries' ? dictionaryResponse() : Promise.resolve({ data: path === '/projects' ? { projects: [] } : path === '/leads' ? { leads: [{ id: 1, full_name: 'Тестовый покупатель', phone: '000000000' }] } : path === '/deals/available-units' ? { units: [unit] } : { settings: { data: { reservation_days: 3 } } } }));
 api.post.mockResolvedValue({ data: { deal: { id: 1 } } });
});
afterEach(cleanup);
async function confirmStep(status = 'SIGNED') {
 render(<DealWizardModal isOpen unit={unit} initialStatus={status} onClose={vi.fn()} />);
 fireEvent.click(await screen.findByText('Тестовый покупатель'));
 for (let i = 0; i < 3; i++) fireEvent.click(screen.getByText('Далее'));
}
async function enableReceipt() {
 await confirmStep();
 fireEvent.click(screen.getByLabelText('Первоначальный взнос уже получен в кассу'));
}
describe('initial buyer receipt cash desk', () => {
 it.each(['CASH', 'BANK_TRANSFER', 'CARD'])('lists all five active income desks and sends chosen destination for %s', async method => {
  await enableReceipt();
  await screen.findByRole('option', { name: 'Касса 5' });
  expect(screen.queryByRole('option', { name: 'Касса 6' })).not.toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/dictionaries', { params: { type: 'CASH_DESK', purpose: 'income' } });
  fireEvent.change(screen.getByLabelText('Касса зачисления *'), { target: { value: 'desk-4' } });
  const methodSelect = screen.getByRole('option', { name: /Наличные в кассу/ }).closest('select');
  fireEvent.change(methodSelect, { target: { value: method } });
  fireEvent.click(screen.getByText('Подписать договор'));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/deals', expect.objectContaining({ record_initial_payment: true, initial_payment_cash_desk_id: 'desk-4', initial_payment_method: method })));
 });
 it('requires an explicit desk and does not create a contract without one', async () => {
  await enableReceipt(); await screen.findByRole('option', { name: 'Касса 1' });
  fireEvent.click(screen.getByText('Подписать договор'));
  await screen.findByText('Выберите кассу зачисления первоначального взноса');
  expect(api.post).not.toHaveBeenCalled();
 });
 it.each(['empty', 'failure', 'loading'])('blocks receipt when desks are %s', async mode => {
  dictionaryResponse = mode === 'empty' ? () => Promise.resolve({ data: [] }) : mode === 'failure' ? () => Promise.reject(new Error('Offline')) : () => new Promise(() => {});
  await enableReceipt();
  if (mode === 'empty') await screen.findByText(/Нет доступных активных касс/);
  if (mode === 'failure') await screen.findByText(/Не удалось загрузить кассы/);
  fireEvent.click(screen.getByText('Подписать договор'));
  await waitFor(() => expect(screen.getByText(mode === 'loading' ? 'Дождитесь загрузки касс' : mode === 'failure' ? 'Offline' : 'Выберите кассу зачисления первоначального взноса')).toBeInTheDocument());
  expect(api.post).not.toHaveBeenCalled();
 });
 it('allows sale without initial receipt and does not load cash desks', async () => {
  await confirmStep(); fireEvent.click(screen.getByText('Подписать договор'));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/deals', expect.objectContaining({ record_initial_payment: false, initial_payment_cash_desk_id: null })));
  expect(api.get.mock.calls.some(([path]) => path === '/dictionaries')).toBe(false);
 });
 it('does not record a stale initial receipt when switched to reservation', async () => {
  await enableReceipt(); await screen.findByRole('option', { name: 'Касса 1' });
  fireEvent.change(screen.getByLabelText('Касса зачисления *'), { target: { value: 'desk-0' } });
  fireEvent.click(screen.getByText('Временная бронь'));
  fireEvent.click(screen.getByText('Забронировать объект'));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/deals', expect.objectContaining({ status: 'RESERVED', record_initial_payment: false, initial_payment_cash_desk_id: null })));
 });
});
