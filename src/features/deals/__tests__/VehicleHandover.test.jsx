import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DealWizardModal } from '../DealWizardModal';
import { ContractPrintView } from '../ContractPrintView';
import { api } from '../../../api/client';
vi.mock('../../../api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../documents/PassportScannerModal', () => ({ PassportScannerModal: () => null }));
const vehicle = { brand_model: 'Test Motors Model X', production_year: '2021', color: 'Белый', registration_number: 'TEST01', vin: 'TESTVIN00000123456', registration_certificate: 'CERT-123', mileage_km: '0', handover_date: '2026-10-22', condition: 'Царапина на двери', accessories: 'Два ключа и техпаспорт', encumbrances: 'Отсутствуют' };
const labels = ['Марка и модель','Год выпуска','Цвет','Госномер','VIN','Свидетельство о регистрации','Пробег, км','Дата передачи автомобиля','Техническое состояние и недостатки','Переданные ключи, документы и принадлежности','Залог, арест или споры — при наличии'];
const unit = { id: 30, unit_kind: 'APARTMENT', unit_number: '24', area_m2_x100: 5000, price_per_m2_minor: 50000, project_currency: 'USD' };
const deal = { id: 10, unit_id: 30, unit_number: '24', currency: 'USD', contract_number: 'TEST', payment_type: 'PARTIAL_BARTER', passport_number: 'TEST', vehicle_details: vehicle, barter_amount_minor: 1400000, final_price_minor: 2500000, down_payment_minor: 1500000, schedules: [{ due_date: '2026-11-22', amount_minor: 1000000, paid_amount_minor: 0 }] };
beforeEach(() => {
 vi.clearAllMocks();
 api.get.mockImplementation(path => Promise.resolve({ data: path === '/leads' ? { leads: [{ id: 1, full_name: 'Тестовый покупатель', phone: '000000000' }] } : path.startsWith('/deals/') && path !== '/deals/available-units' ? { deal } : path === '/projects' ? { projects: [] } : path === '/deals/available-units' ? { units: [unit] } : { settings: { data: { reservation_days: 3 } } } }));
 api.post.mockResolvedValue({ data: { deal } });
});
afterEach(cleanup);
describe('car data at signing and in the printed act', () => {
 it('collects every car field at sale and retains it for the signed contract act', async () => {
  const onDealCreated = vi.fn();
  render(<DealWizardModal isOpen unit={unit} onClose={() => {}} onDealCreated={onDealCreated} />);
  fireEvent.click(await screen.findByText('Тестовый покупатель')); fireEvent.click(screen.getByText('Далее'));
  fireEvent.click(screen.getByText('Бартер + Доплата'));
  fireEvent.change(screen.getByPlaceholderText(/Например: Автомобиль Toyota/), { target: { value: 'Test Motors Model X' } });
  labels.forEach((label, i) => fireEvent.change(screen.getByLabelText(label), { target: { value: Object.values(vehicle)[i] } }));
  expect(screen.queryByText(/Номер двигателя/)).toBeNull();
  fireEvent.click(screen.getByText('Далее')); fireEvent.click(screen.getByText('Далее')); fireEvent.click(screen.getByText('Подписать договор'));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/deals', expect.objectContaining({ vehicle_details: vehicle })));
  expect(onDealCreated).toHaveBeenCalledWith(deal);
 });
 it.each(['TJ','RU'])('fills act in %s with all saved fields and removes engine number', lang => {
  render(<ContractPrintView deal={deal} initialLang={lang} onClose={() => {}} />);
  fireEvent.click(screen.getByText(lang === 'TJ' ? 'Санади қабулу супоридан' : 'Акт приёма-передачи'));
  const text = document.getElementById('print-section').textContent;
  Object.entries(vehicle).filter(([k]) => k !== 'handover_date').forEach(([,v]) => expect(text).toContain(v));
  expect(text).toContain('22.10.2026'); expect(text).not.toMatch(/Рақами муҳаррик|Номер двигателя/);
 });
 it('loads missing car data from canonical contract even if schedule and passport are present', async () => {
  render(<ContractPrintView deal={{ ...deal, vehicle_details: undefined }} initialLang="RU" onClose={() => {}} />);
  fireEvent.click(screen.getByText('Акт приёма-передачи'));
  await waitFor(() => expect(document.getElementById('print-section').textContent).toContain(vehicle.vin));
 });
 it('leaves blanks for older contracts instead of inventing vehicle facts', () => {
  render(<ContractPrintView deal={{ ...deal, vehicle_details: null }} initialLang="RU" onClose={() => {}} />);
  fireEvent.click(screen.getByText('Акт приёма-передачи'));
  const text = document.getElementById('print-section').textContent;
  expect(text).toContain('________________________'); expect(text).not.toContain(vehicle.vin);
 });
 it('renders saved text as text rather than HTML', () => {
  const { container } = render(<ContractPrintView deal={{ ...deal, vehicle_details: { ...vehicle, brand_model: '<img src=x onerror=alert(1)>' } }} initialLang="RU" onClose={() => {}} />);
  fireEvent.click(screen.getByText('Акт приёма-передачи'));
  expect(document.getElementById('print-section').textContent).toContain('<img src=x onerror=alert(1)>');
  expect(container.querySelector('img[src="x"]')).toBeNull();
 });
});
