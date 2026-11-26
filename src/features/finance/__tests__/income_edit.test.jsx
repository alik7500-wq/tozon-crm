// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IncomePage } from '../IncomePage';
import { financeApi } from '../../../api/finance.api';

const auth = vi.hoisted(() => ({ role: 'ADMIN', status: 'ACTIVE' }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: auth.role } }) }));
vi.mock('../../../api/dictionaries.api', () => ({ dictionariesApi: { getItems: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../../api/client', () => ({ api: { get: vi.fn(async () => ({ data: { cashAccess: { canEditIncome: true, allWritableDesks: true } } })) } }));
vi.mock('../../../api/finance.api', () => ({ financeApi: {
  getIncome: vi.fn(async () => ({ list: [{ id: 91, date: '2026-10-09', amount: 100, currency: 'TJS', amount_tjs: 100, clientName: 'Тестовый клиент', contract: '0047', reference: 'ПКО-91', method: 'CASH', comment: '', status: auth.status, canVoid: auth.status === 'ACTIVE' }], totalsByCurrency: {} })),
  getDealsForSelect: vi.fn().mockResolvedValue([]), updateIncome: vi.fn(), deleteIncome: vi.fn(async () => { auth.status = 'VOIDED'; })
} }));
vi.mock('recharts', () => {
  const Container = ({ children }) => <div>{children}</div>;
  const Empty = () => null;
  return { ResponsiveContainer: Container, BarChart: Container, PieChart: Container, Bar: Empty, Pie: Empty, Cell: Empty, XAxis: Empty, YAxis: Empty, CartesianGrid: Empty, Tooltip: Empty };
});
afterEach(() => { cleanup(); auth.role = 'ADMIN'; auth.status = 'ACTIVE'; vi.restoreAllMocks(); vi.clearAllMocks(); });
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><IncomePage /></QueryClientProvider></MemoryRouter>);
}
describe('Income journal actions', () => {
  it('opens an existing PKO for editing without mutating financial records', async () => {
    mount();
    const edit = await screen.findByTitle('Редактировать ПКО');
    expect(screen.getByTitle('Печать ПКО (Квитанция)')).toBeDefined();
    expect(screen.getByTitle('Аннулировать ПКО')).toBeDefined();
    fireEvent.click(edit);
    expect(screen.getByText('Редактирование прихода (ПКО)')).toBeDefined();
    expect(screen.getByDisplayValue('ПКО-91')).toBeDefined();
    expect(screen.getByDisplayValue('Тестовый клиент')).toBeDefined();
    expect(financeApi.updateIncome).not.toHaveBeenCalled();
    expect(financeApi.deleteIncome).not.toHaveBeenCalled();
  });
  it('annuls the order and retains the marked journal row', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Аннулировать ПКО' }));
    expect(await screen.findByText('Аннулирован')).toBeDefined();
    expect(financeApi.deleteIncome).toHaveBeenCalledWith(91, expect.anything());
    expect(screen.queryByRole('button', { name: 'Аннулировать ПКО' })).toBeNull();
  });
  it('keeps editing and annulment unavailable to a sales manager', async () => {
    auth.role = 'SALES_MANAGER';
    mount();
    await screen.findByTitle('Печать ПКО (Квитанция)');
    expect(screen.queryByTitle('Редактировать ПКО')).toBeNull();
    expect(screen.queryByTitle('Аннулировать ПКО')).toBeNull();
  });
});
