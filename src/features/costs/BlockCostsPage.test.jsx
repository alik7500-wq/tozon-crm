// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlockCostsPage } from './BlockCostsPage';
import { saveExpenseWithAllocation } from './saveExpenseWithAllocation';
import { api } from '../../api/client';
const auth = vi.hoisted(() => ({ user: { id: 1, role: 'ADMIN', permissions: [] } }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/client', () => ({ api: { get: vi.fn(), put: vi.fn() } }));
const state = () => ({ projects: [{ id: 3, name: 'TOZON PLAZA' }], blocks: [{ id: 3, name: 'Блок Б', project_id: 3, basis: null, registry_area_m2: 5224.43, registry_unit_count: 80, amount_usd_minor: 0, direct_usd_minor: 0, shared_usd_minor: 0, cost_per_m2_usd: null, categories: {} }], totals: { allocated_usd_minor: 0, unassigned_count: 1, missing_fx_count: 0 }, can_write: true, rows: [{ id: 1, reference: 'РКО-1', date: '2026-10-01', amount_minor: 10000, currency: 'USD', usd_minor: 10000, state: 'UNASSIGNED', category: 'Арматура', portions: [] }] });
const mount = () => render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><BlockCostsPage /></QueryClientProvider></MemoryRouter>);
afterEach(() => { cleanup(); vi.resetAllMocks(); auth.user = { id: 1, role: 'ADMIN', permissions: [] }; });
describe('Block costs workflow', () => {
  it('formats decimal strings in RKO descriptions without changing dates or saved records', async () => {
    const data = state();
    data.rows[0].description = 'За питьевую воду • Оплачено: 40.0000000000000000 TJS; списание из USD по курсу 9.2600000000';
    api.get.mockResolvedValue({data}); mount();
    const description = await screen.findByText('За питьевую воду • Оплачено: 40,00 TJS; списание из USD по курсу 9,26');
    expect(description.textContent).not.toContain('000000');
    expect(screen.getByRole('cell', {name: /2026-10-01.*РКО-1/})).toBeTruthy();
    expect(data.rows[0].description).toContain('40.0000000000000000');
    expect(api.put).not.toHaveBeenCalled();
  });
  it('does not preconfirm suggested registry area and sends only an explicit confirmed basis', async () => {
    api.get.mockResolvedValue({ data: state() }); api.put.mockResolvedValue({ data: {} }); mount();
    fireEvent.click(await screen.findByText('Подтвердить / изменить площадь'));
    expect(screen.getByLabelText('Продаваемая площадь').value).toBe('');
    fireEvent.change(screen.getByLabelText('Продаваемая площадь'), { target: { value: '5500,50' } });
    fireEvent.change(screen.getByLabelText('Основание площади'), { target: { value: 'Проектная ведомость: квартиры и коммерция' } });
    fireEvent.click(screen.getByText('Сохранить'));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/costs/bases/3', { sellable_area_m2: 5500.5, reason: 'Проектная ведомость: квартиры и коммерция', expected_version: 0 }));
  });
  it('requires explicit block selection before assigning an RKO', async () => {
    api.get.mockResolvedValue({ data: state() }); mount(); fireEvent.click(await screen.findByText('Распределить'));
    fireEvent.change(screen.getByLabelText('Способ учёта'), { target: { value: 'DIRECT' } });
    fireEvent.click(screen.getByText('Сохранить'));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Выберите один блок');
    expect(api.put).not.toHaveBeenCalled();
  });
  it('keeps read-only costs visible with no mutation controls', async () => {
    auth.user = { role: 'FINANCE_MANAGER', permissions: ['access.v2', 'finance.costs'] };
    api.get.mockResolvedValue({ data: { ...state(), can_write: false } }); mount(); await screen.findByText('Арматура');
    expect(screen.queryByText('Распределить')).toBeNull(); expect(screen.queryByText('Подтвердить / изменить площадь')).toBeNull();
  });
  it('denies cash-only users without making a costs request', () => {
    auth.user = { role: 'FINANCE_MANAGER', permissions: ['finance.expenses'] }; mount();
    expect(screen.getByRole('alert').textContent).toContain('Нет доступа'); expect(api.get).not.toHaveBeenCalled();
  });
  it('does not report cash failure or repeat payment when analytics save fails', async () => {
    const addExpense = vi.fn().mockResolvedValue({ id: 73, amount_minor: 10000 });
    const saveAllocation = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await saveExpenseWithAllocation({ payload: { amount: 100 }, allocation: { mode: 'DIRECT' }, addExpense, saveAllocation });
    expect(result.id).toBe(73); expect(result.cost_allocation_warning).toContain('РКО сохранён'); expect(addExpense).toHaveBeenCalledTimes(1);
  });
});
