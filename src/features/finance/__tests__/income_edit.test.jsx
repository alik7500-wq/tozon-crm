// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IncomePage } from '../IncomePage';
import { financeApi } from '../../../api/finance.api';

const auth = vi.hoisted(() => ({ role: 'ADMIN' }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: auth.role } }) }));
vi.mock('../../../api/dictionaries.api', () => ({ dictionariesApi: { getItems: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../../api/finance.api', () => ({ financeApi: {
  getIncome: vi.fn().mockResolvedValue({ list: [{ id: 91, date: '2026-10-09', amount: 100, currency: 'TJS', amount_tjs: 100, clientName: 'Тестовый клиент', contract: '0047', reference: 'ПКО-91', method: 'CASH', comment: '' }], totalsByCurrency: {} }),
  getDealsForSelect: vi.fn().mockResolvedValue([]), updateIncome: vi.fn(), deleteIncome: vi.fn()
} }));
vi.mock('recharts', () => {
  const Container = ({ children }) => <div>{children}</div>;
  const Empty = () => null;
  return { ResponsiveContainer: Container, BarChart: Container, PieChart: Container, Bar: Empty, Pie: Empty, Cell: Empty, XAxis: Empty, YAxis: Empty, CartesianGrid: Empty, Tooltip: Empty };
});
afterEach(() => { cleanup(); auth.role = 'ADMIN'; vi.clearAllMocks(); });
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><IncomePage /></QueryClientProvider></MemoryRouter>);
}
describe('Income journal actions', () => {
  it('opens an existing PKO for editing without mutating financial records', async () => {
    mount();
    const edit = await screen.findByTitle('Редактировать ПКО (Админ)');
    expect(screen.getByTitle('Печать ПКО (Квитанция)')).toBeDefined();
    expect(screen.getByTitle('Удалить ПКО (Админ)')).toBeDefined();
    fireEvent.click(edit);
    expect(screen.getByText('Редактирование прихода (ПКО)')).toBeDefined();
    expect(screen.getByDisplayValue('ПКО-91')).toBeDefined();
    expect(screen.getByDisplayValue('Тестовый клиент')).toBeDefined();
    expect(financeApi.updateIncome).not.toHaveBeenCalled();
    expect(financeApi.deleteIncome).not.toHaveBeenCalled();
  });
  it('keeps editing and deletion unavailable to a sales manager', async () => {
    auth.role = 'SALES_MANAGER';
    mount();
    await screen.findByTitle('Печать ПКО (Квитанция)');
    expect(screen.queryByTitle('Редактировать ПКО (Админ)')).toBeNull();
    expect(screen.queryByTitle('Удалить ПКО (Админ)')).toBeNull();
  });
});
