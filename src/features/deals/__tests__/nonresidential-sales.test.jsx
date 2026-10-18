import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { DealWizardModal } from '../DealWizardModal';
import { ContractPrintView } from '../ContractPrintView';
import { api } from '../../../api/client';
import { getUnitDefaultPrice } from '../../../utils/unitKind';

vi.mock('../../../api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../documents/PassportScannerModal', () => ({ PassportScannerModal: () => null }));
const unit = { id: 300, unit_kind: 'PARKING', unit_number: 'П-01', rooms: 0, area_m2_x100: 2552, price_per_m2_minor: 0, project_name: 'Тестовый ЖК', building_name: 'Блок Б', floor_number: -1, project_currency: 'USD' };
const deal = { ...unit, id: 55, lead_name: 'Тестовый покупатель', passport_number: 'TEST', contract_number: '0055', deal_date: '2026-10-18', currency: 'USD', final_price_minor: 510400, deal_price_per_m2_minor: 20000, down_payment_minor: 0, schedules: [{ due_date: '2026-11-18', amount_minor: 510400, paid_amount_minor: 0 }] };
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(path => Promise.resolve({ data: path === '/projects' ? { projects: [] } : path === '/leads' ? { leads: [{ id: 1, full_name: 'Тестовый покупатель', phone: '000000000' }] } : path === '/deals/available-units' ? { units: [unit] } : { settings: { data: { reservation_days: 3 } }, templates: [] } }));
});
afterEach(cleanup);

describe('parking and commercial sales', () => {
  it('never invents a default price for nonresidential property', () => {
    expect(getUnitDefaultPrice(unit)).toBe(0);
    expect(getUnitDefaultPrice({ ...unit, unit_kind: 'COMMERCIAL' })).toBe(0);
    expect(getUnitDefaultPrice({ rooms: 0 })).toBe(500);
  });
  it('opens a reservation for the supplied parking space, without a room count', async () => {
    render(<DealWizardModal isOpen unit={unit} initialStatus="RESERVED" onClose={vi.fn()} />);
    expect(screen.getAllByText(/Машино-место №П-01/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/0 комн/)).toBeNull();
    await screen.findByText('Тестовый покупатель');
  });
  it.each(['SIGNED', 'RESERVED'])('submits the selected parking space and %s status with exact cents', async status => {
    api.post.mockResolvedValue({ data: { deal: { ...deal, status } } });
    const onDealCreated = vi.fn();
    render(<DealWizardModal isOpen unit={unit} initialStatus={status} onClose={vi.fn()} onDealCreated={onDealCreated} />);
    fireEvent.click(await screen.findByText('Тестовый покупатель'));
    fireEvent.click(screen.getByText('Далее'));
    expect(screen.getByLabelText('Цена объекта за м²').value).toBe('0');
    fireEvent.click(screen.getByText('Далее'));
    expect(screen.getByText('Укажите положительную цену и стоимость объекта')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Окончательная стоимость объекта'), { target: { value: '5104.25' } });
    expect(screen.getByLabelText('Окончательная стоимость объекта').value).toBe('5104.25');
    fireEvent.click(screen.getByText('100% Оплата'));
    fireEvent.click(screen.getByText('Далее'));
    fireEvent.click(screen.getByText('Далее'));
    fireEvent.click(screen.getByText(status === 'SIGNED' ? 'Подписать договор' : 'Забронировать объект'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/deals', expect.objectContaining({ unit_id: 300, lead_id: 1, status, final_price_minor: 510425, record_initial_payment: false })));
    expect(onDealCreated).toHaveBeenCalledOnce();
  });
  it.each(['PARKING', 'COMMERCIAL'])('prints %s with the correct object, block, floor and area in both languages', (kind) => {
    render(<ContractPrintView deal={{ ...deal, unit_kind: kind }} initialLang="RU" onClose={vi.fn()} />);
    const text = () => document.getElementById('print-section').textContent;
    expect(text()).toContain(kind === 'PARKING' ? 'Машино-место №П-01' : 'Коммерческое помещение №П-01');
    expect(text()).toContain('Блок Б');
    expect(text()).toContain('-1');
    expect(text()).toMatch(/25[,.]52/);
    expect(text()).not.toMatch(/квартир[аыуе]/i);
    fireEvent.click(screen.getByText('🇹🇯 Тоҷикӣ'));
    expect(text()).toContain(kind === 'PARKING' ? 'Ҷойи таваққуф №П-01' : 'Бинои ғайриистиқоматӣ №П-01');
    expect(text()).not.toContain('ҳуҷрагӣ');
  });
  it('keeps installment amounts in minor units equal to the contract remainder', async () => {
    api.post.mockResolvedValue({ data: { deal } });
    render(<DealWizardModal isOpen unit={unit} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByText('Тестовый покупатель'));
    fireEvent.click(screen.getByText('Далее'));
    fireEvent.change(screen.getByLabelText('Окончательная стоимость объекта'), { target: { value: '5104.25' } });
    fireEvent.click(screen.getByText('Далее'));
    fireEvent.click(screen.getByText('Далее'));
    fireEvent.click(screen.getByText('Подписать договор'));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const payload = api.post.mock.calls.find(call => call[0] === '/deals')[1];
    expect(payload.schedules).toHaveLength(12);
    expect(payload.schedules.every(row => Number.isInteger(row.amount_minor))).toBe(true);
    expect(payload.schedules.reduce((sum, row) => sum + row.amount_minor, 0) + payload.down_payment_minor).toBe(payload.final_price_minor);
  });
  it('prints the parking payment schedule with its object identity and exact price', () => {
    render(<ContractPrintView deal={{ ...deal, deal_price_per_m2_minor: 20025 }} initialLang="RU" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'График платежей' }));
    const text = document.getElementById('print-section').textContent;
    expect(text).toContain('Машино-место №П-01');
    expect(text).toContain('Блок Б');
    expect(text).toContain('200,25 USD');
    expect(text).not.toContain('квартиры');
  });
  it('keeps the residential contract wording for apartments', () => {
    render(<ContractPrintView deal={{ ...deal, unit_kind: 'APARTMENT', unit_rooms: 2 }} initialLang="RU" onClose={vi.fn()} />);
    expect(document.getElementById('print-section').textContent).toContain('-комнатную квартиру');
  });
});
