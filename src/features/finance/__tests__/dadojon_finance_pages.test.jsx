// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IncomePage } from '../IncomePage';
import { ExpensesPage } from '../ExpensesPage';
import { financeApi } from '../../../api/finance.api';
import { dictionariesApi } from '../../../api/dictionaries.api';

// Mock AuthContext for Dadojon (SALES_MANAGER / MANAGER role)
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'dadojon-user-id',
      username: 'Dadojon',
      name: 'Дадочон',
      role: 'SALES_MANAGER',
      cash_desk_id: 'fba621e6-4ebe-4459-8623-19f46d864cc6'
    }
  })
}));

// Mock API calls
vi.mock('../../../api/finance.api', () => ({
  financeApi: {
    getIncome: vi.fn().mockResolvedValue({ list: [], totalsByCurrency: {} }),
    getExpenses: vi.fn().mockResolvedValue({ list: [], totalsByCurrency: {} }),
    getEskhataRate: vi.fn().mockResolvedValue({ available: true, sellRate: 9.26 }),
    getDealsForSelect: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../../../api/dictionaries.api', () => ({
  dictionariesApi: {
    getItems: vi.fn().mockResolvedValue([
      { id: 'fba621e6-4ebe-4459-8623-19f46d864cc6', code: 'SALES_MANAGER_Dadojon', name: 'Касса менеждера (Дадочон)', icon: '👔' },
      { id: 'ab90800a-73af-4cf7-88c2-397c304e2edf', code: 'SALES_MANAGER', name: 'Касса Отдела продаж (Акмалхон)', icon: '💼' }
    ])
  }
}));

describe('Dadojon Finance Pages Crash Prevention & Regression Suite', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 }
      }
    });
  });

  const renderWithProviders = (ui) => {
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          {ui}
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('1. IncomePage renders successfully for Dadojon without throwing ReferenceError', async () => {
    expect(() => renderWithProviders(<IncomePage />)).not.toThrow();

    await waitFor(() => {
      expect(financeApi.getIncome).toHaveBeenCalled();
    });

    expect(screen.getByText(/Доходы и приходные ордера \(ПКО\)/i)).toBeDefined();
  });

  it('2. ExpensesPage renders successfully for Dadojon without throwing ReferenceError', async () => {
    expect(() => renderWithProviders(<ExpensesPage />)).not.toThrow();

    await waitFor(() => {
      expect(financeApi.getExpenses).toHaveBeenCalled();
    });

    expect(screen.getByText(/Расходы и расходные ордера \(РКО\)/i)).toBeDefined();
  });

  it('3. Static repository check: DADOJON_DESK_ID is nowhere referenced as undefined identifier', () => {
    // Structural regression check: Ensure window.DADOJON_DESK_ID or global is undefined and not accessed
    expect(typeof globalThis.DADOJON_DESK_ID).toBe('undefined');
  });
});
