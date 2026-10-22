// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CashflowPage, buildCashflowFilters } from '../CashflowPage';
import { financeApi } from '../../../api/finance.api';
import { dictionariesApi } from '../../../api/dictionaries.api';
import { api } from '../../../api/client';

// Mock AuthContext
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Администратор', role: 'ADMIN' }
  })
}));

// Mock API modules
vi.mock('../../../api/finance.api', () => ({
  financeApi: {
    getCashflow: vi.fn(),
    exportCashflowExcel: vi.fn(),
    getEskhataRate: vi.fn().mockResolvedValue({ sellRate: 9.27 }),
    convertCurrency: vi.fn(),
    updateIncome: vi.fn(),
    updateExpense: vi.fn(),
    deleteIncome: vi.fn(),
    deleteExpense: vi.fn()
  }
}));

vi.mock('../../../api/dictionaries.api', () => ({
  dictionariesApi: {
    getItems: vi.fn()
  }
}));

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn()
  }
}));

afterEach(cleanup);

describe('Cash desk availability badges', () => {
  let queryClient;

  const mockCashDesks = [
    { id: 'ab90800a-73af-4cf7-88c2-397c304e2edf', code: 'SALES_MANAGER', name: 'Касса Отдела продаж (Акмалхон)', icon: '💼' },
    { id: '6ddf2f64-0a77-4aeb-8daf-a391b2da0141', code: 'MAIN_CASHIER', name: 'Касса компании "Тозон" (Илхомчон)', icon: '🏢' },
    { id: '6b5c2380-1ab6-4e39-877a-4f4519a5ab65', code: 'TOZON_PLAZA_INVESTMENT', name: 'Инвестиционная касса TOZON PLAZA', icon: '📈' }
  ];

  const mockCashflowResponse = {
    summaryByCurrency: {
      USD: { totalIncome: 399656.52, totalExpense: 266778.73, netCashflow: 132877.79 },
      TJS: { totalIncome: 147810.00, totalExpense: 147812.00, netCashflow: -2.00 }
    },
    cashDesksSummary: [
      { id: 'ab90800a-73af-4cf7-88c2-397c304e2edf', code: 'SALES_MANAGER', name: 'Касса Отдела продаж (Акмалхон)', balanceUsd: 4597.04, balanceTjs: -2, hasBalance: true },
      { id: '6b5c2380-1ab6-4e39-877a-4f4519a5ab65', code: 'TOZON_PLAZA_INVESTMENT', name: 'Инвестиционная касса TOZON PLAZA', balanceUsd: 132877.79, balanceTjs: 0, hasBalance: true }
    ],
    availableCurrencies: ['USD', 'TJS'],
    monthlyData: [],
    chartCurrency: 'USD',
    transactions: [
      {
        id: 'inc-1',
        rawId: 1,
        type: 'INCOME',
        date: '2026-06-01',
        amount: 150000,
        currency: 'USD',
        category: 'Инвестиции партнёров',
        reference: 'ПКО-001',
        cash_desk_id: '6b5c2380-1ab6-4e39-877a-4f4519a5ab65',
        cash_desk_name: 'Инвестиционная касса TOZON PLAZA',
        counterparty: 'Инвестор'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('tozon_cashflow_view_mode', 'expanded');
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 }
      }
    });

    dictionariesApi.getItems.mockResolvedValue(mockCashDesks);
    api.get.mockResolvedValue({ users: [] });
    financeApi.getCashflow.mockResolvedValue(mockCashflowResponse);
    financeApi.exportCashflowExcel.mockResolvedValue(new ArrayBuffer(8));

    // Mock URL & DOM download methods
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CashflowPage />
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it.each([
    { name: 'empty despite server flag', balanceUsd: 0, balanceTjs: 0, balanceRub: 0, expected: 'Нет средств' },
    { name: 'positive TJS only', balanceUsd: 0, balanceTjs: 44, balanceRub: 0, expected: 'Есть средства' },
    { name: 'negative balance only', balanceUsd: -2, balanceTjs: 0, balanceRub: 0, expected: 'Нет средств' },
    { name: 'mixed currency balances', balanceUsd: 100, balanceTjs: -2, balanceRub: 0, expected: 'Есть средства' },
    { name: 'positive RUB only', balanceUsd: 0, balanceTjs: 0, balanceRub: 100, expected: 'Есть средства' }
  ])('shows cash availability from actual balances: $name', async ({ name, expected, ...balances }) => {
    financeApi.getCashflow.mockResolvedValue({
      ...mockCashflowResponse,
      cashDesksSummary: [{ ...mockCashflowResponse.cashDesksSummary[0], ...balances, hasBalance: true }]
    });
    renderComponent();
    const showAll = await screen.findByRole('button', { name: /Показать все кассы/ });
    fireEvent.click(showAll);
    const card = screen.getByRole('heading', { name: mockCashDesks[0].name, level: 4 }).parentElement.parentElement;
    await waitFor(() => expect(within(card).getByText(expected)).toBeDefined());
    expect(within(card).queryByText(expected === 'Есть средства' ? 'Нет средств' : 'Есть средства')).toBeNull();
  });

});
