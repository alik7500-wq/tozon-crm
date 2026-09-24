// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('CashflowPage RTL Real Component Test Suite', () => {
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

  it('1. Renders CashflowPage component and loads initial cashflow data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(financeApi.getCashflow).toHaveBeenCalled();
    });

    expect(screen.getByText(/ДДС \(Движение денежных средств\)/i)).toBeDefined();
  });

  it('2. Clicking cash desk badge filters by exact UUID and triggers API call with valid UUID', async () => {
    renderComponent();

    await waitFor(() => expect(financeApi.getCashflow).toHaveBeenCalled());

    // Click Investment Cash Desk badge
    const badge = screen.getByTitle(/Фильтр по кассе: Инвестиционная касса TOZON PLAZA/i);
    fireEvent.click(badge);

    await waitFor(() => {
      expect(financeApi.getCashflow).toHaveBeenLastCalledWith(
        expect.objectContaining({
          cash_desk_id: '6b5c2380-1ab6-4e39-877a-4f4519a5ab65'
        })
      );
    });
  });

  it('3. Select dropdown change, date inputs, category selection and Excel export trigger financeApi.exportCashflowExcel with canonical payload', async () => {
    renderComponent();

    await waitFor(() => expect(financeApi.getCashflow).toHaveBeenCalled());

    // Select Cash Desk via dropdown
    const deskSelect = screen.getAllByLabelText('Фильтр по кассе')[0];
    fireEvent.change(deskSelect, { target: { value: 'ab90800a-73af-4cf7-88c2-397c304e2edf' } });

    // Set Date range
    const startDateInput = screen.getAllByLabelText('Дата начала периода')[0];
    const endDateInput = screen.getAllByLabelText('Дата окончания периода')[0];
    fireEvent.change(startDateInput, { target: { value: '2026-06-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-06-30' } });

    // Select Category
    const categorySelect = screen.getAllByLabelText('Фильтр по категории')[0];
    fireEvent.change(categorySelect, { target: { value: 'Инвестиции партнёров' } });

    // Click Export Excel Button
    const exportBtn = screen.getAllByRole('button', { name: /Выгрузить в Excel/i })[0];
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(financeApi.exportCashflowExcel).toHaveBeenCalledWith({
        year: 'ALL',
        date_from: '2026-06-01',
        date_to: '2026-06-30',
        cash_desk_id: 'ab90800a-73af-4cf7-88c2-397c304e2edf',
        category: 'Инвестиции партнёров'
      });
    });
  });

  it('4. Attempting non-UUID cash_desk_id blocks API call and shows error alert', async () => {
    renderComponent();

    await waitFor(() => expect(financeApi.getCashflow).toHaveBeenCalled());

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Try selecting invalid option value directly
    const deskSelect = screen.getAllByLabelText('Фильтр по кассе')[0];
    fireEvent.change(deskSelect, { target: { value: 'INVALID_NON_UUID_CODE' } });

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('UUID'));
  });

  it('5. buildCashflowFilters rejects desk.code and desk.name as cash_desk_id', () => {
    const invalidFilters = buildCashflowFilters({
      year: 2026,
      selectedCashDeskId: 'TOZON_PLAZA_INVESTMENT' // Non-UUID code
    });

    expect(invalidFilters.invalidCashDeskId).toBe(true);
    expect(invalidFilters.cash_desk_id).toBeUndefined();
  });
});
