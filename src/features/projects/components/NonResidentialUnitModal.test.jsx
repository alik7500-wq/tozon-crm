import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { NonResidentialUnitModal } from './NonResidentialUnitModal';
import { getUnitKindLabel, isNonResidentialUnit } from '../../../utils/unitKind';

const { patch, get } = vi.hoisted(() => ({ patch: vi.fn(), get: vi.fn() }));
vi.mock('../../../api/client', () => ({ api: { patch, get } }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: 'ADMIN' } }) }));
vi.mock('../../../hooks/useModalDismiss', () => ({ useModalDismiss: ({ onClose }) => ({ requestClose: onClose }) }));
vi.mock('../../deals/DealWizardModal', () => ({ DealWizardModal: props => <div data-testid="wizard">{props.initialStatus}<button onClick={() => props.onDealCreated({ id: 91, status: props.initialStatus })}>Создать тестовую сделку</button></div> }));
vi.mock('../../deals/DealDrawer', () => ({ DealDrawer: props => <div>Сделка {props.dealId}</div> }));
vi.mock('../../deals/ContractPrintView', () => ({ ContractPrintView: () => null }));
const parking = { id: 200, unit_kind: 'PARKING', unit_number: 'П-01', area_m2_x100: 2552, price_per_m2_minor: 0, status: 'AVAILABLE' };

describe('nonresidential chessboard cards', () => {
  beforeEach(() => { cleanup(); patch.mockReset(); get.mockReset(); get.mockResolvedValue({ data: { unit: parking } }); });
  it('keeps studios distinct from parking and commercial units', () => {
    expect(getUnitKindLabel(parking)).toBe('Машино-место');
    expect(getUnitKindLabel({ unit_kind: 'COMMERCIAL', rooms: 0 })).toBe('Коммерция');
    expect(getUnitKindLabel({ rooms: 0 })).toBe('Студия');
    expect(isNonResidentialUnit({ rooms: 0 })).toBe(false);
  });
  it('shows parking area and an unset price without an invented default', () => {
    render(<NonResidentialUnitModal unit={parking} floorNumber={-1} buildingName="Блок А" currency="USD" />);
    expect(screen.getByRole('heading').textContent).toContain('Машино-место');
    expect(screen.getAllByText('Не задана')).toHaveLength(2);
    expect(screen.getByText(/25[,.]52 м²/)).toBeTruthy();
    expect(screen.queryByText('Студия')).toBeNull();
  });
  it('saves price only for the selected unit and reports errors', async () => {
    patch.mockResolvedValue({ data: {} });
    const onUpdated = vi.fn();
    render(<NonResidentialUnitModal unit={parking} floorNumber={-1} buildingName="Блок А" currency="USD" onUpdated={onUpdated} />);
    fireEvent.change(screen.getByLabelText('Цена за м², USD'), { target: { value: '125,50' } });
    fireEvent.click(screen.getByText('Сохранить цену'));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/inventory/units/200/price', { price_per_m2_minor: 12550, scope: 'UNIT' }));
    expect(onUpdated).toHaveBeenCalledOnce();
    patch.mockRejectedValue(new Error('Ошибка сохранения'));
    fireEvent.click(screen.getByText('Сохранить цену'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Ошибка сохранения'));
  });
  it('closes only after a successful save and refreshes the chessboard', async () => {
    let resolve;
    patch.mockReturnValue(new Promise(done => { resolve = done; }));
    const onClose = vi.fn(), onUpdated = vi.fn();
    render(<NonResidentialUnitModal unit={parking} currency="USD" onClose={onClose} onUpdated={onUpdated} />);
    fireEvent.change(screen.getByLabelText('Цена за м², USD'), { target: { value: '400' } });
    fireEvent.click(screen.getByText('Сохранить цену'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Сохранение…').disabled).toBe(true);
    resolve({data:{}});
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onUpdated).toHaveBeenCalledOnce();
  });
  it('keeps the window open when the server rejects the price', async () => {
    patch.mockRejectedValue(new Error('Ошибка сохранения'));
    const onClose = vi.fn(), onUpdated = vi.fn();
    render(<NonResidentialUnitModal unit={parking} currency="USD" onClose={onClose} onUpdated={onUpdated} />);
    fireEvent.change(screen.getByLabelText('Цена за м², USD'), { target: { value: '400' } });
    fireEvent.click(screen.getByText('Сохранить цену'));
    await screen.findByRole('alert');
    expect(onClose).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it.each(['SIGNED', 'RESERVED'])('opens the shared wizard with %s status and then the created deal', async (status) => {
    const onUpdated = vi.fn();
    render(<NonResidentialUnitModal unit={parking} currency="USD" onUpdated={onUpdated} />);
    const action = screen.getByText(status === 'SIGNED' ? 'Оформить продажу' : 'Забронировать');
    await waitFor(() => expect(action.disabled).toBe(false));
    fireEvent.click(action);
    expect(screen.getByTestId('wizard').textContent).toContain(status);
    fireEvent.click(screen.getByText('Создать тестовую сделку'));
    expect(screen.getByText('Сделка 91')).toBeTruthy();
    expect(onUpdated).toHaveBeenCalledOnce();
  });
  it('shows an existing deal for sold parking and does not offer a new sale', async () => {
    get.mockResolvedValue({ data: { unit: { ...parking, status: 'SOLD', active_deal: { id: 92, lead_name: 'Тестовый покупатель' } } } });
    render(<NonResidentialUnitModal unit={{ ...parking, status: 'SOLD' }} currency="USD" />);
    fireEvent.click(await screen.findByText('Открыть сделку и платежи'));
    expect(screen.getByText('Сделка 92')).toBeTruthy();
    expect(screen.queryByText('Оформить продажу')).toBeNull();
  });

});
