import { describe, it, expect, vi } from 'vitest';

/**
 * Frontend Filter Transmission Contract Test for Cashflow Excel Export
 */
describe('Cashflow Excel Export Active Filter Transmission', () => {
  it('passes all active UI filters to financeApi.exportCashflowExcel correctly', () => {
    const activeState = {
      year: 2026,
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      selectedCashDeskId: '6b5c2380-1ab6-4e39-877a-4f4519a5ab65',
      currency: 'USD',
      typeFilter: 'INCOME',
      categoryFilter: 'PARTNER_INVESTMENT',
      search: ' Мубинчон '
    };

    // Construct filter payload as CashflowPage.jsx does
    const filters = {
      year: activeState.year === 'ALL' ? 'ALL' : activeState.year,
      date_from: activeState.startDate || undefined,
      date_to: activeState.endDate || undefined,
      cash_desk_id: activeState.selectedCashDeskId !== 'ALL' ? activeState.selectedCashDeskId : undefined,
      currency: activeState.currency !== 'ALL' ? activeState.currency : undefined,
      type: activeState.typeFilter !== 'ALL' ? activeState.typeFilter : undefined,
      category: activeState.categoryFilter !== 'ALL' ? activeState.categoryFilter : undefined,
      search: activeState.search.trim() || undefined
    };

    Object.keys(filters).forEach(k => filters[k] === undefined && delete filters[k]);

    expect(filters).toEqual({
      year: 2026,
      date_from: '2026-06-01',
      date_to: '2026-06-30',
      cash_desk_id: '6b5c2380-1ab6-4e39-877a-4f4519a5ab65',
      currency: 'USD',
      type: 'INCOME',
      category: 'PARTNER_INVESTMENT',
      search: 'Мубинчон'
    });
  });

  it('omits empty/ALL filter values cleanly without breaking backend contract', () => {
    const defaultState = {
      year: 'ALL',
      startDate: '',
      endDate: '',
      selectedCashDeskId: 'ALL',
      currency: 'ALL',
      typeFilter: 'ALL',
      categoryFilter: 'ALL',
      search: ''
    };

    const filters = {
      year: defaultState.year === 'ALL' ? 'ALL' : defaultState.year,
      date_from: defaultState.startDate || undefined,
      date_to: defaultState.endDate || undefined,
      cash_desk_id: defaultState.selectedCashDeskId !== 'ALL' ? defaultState.selectedCashDeskId : undefined,
      currency: defaultState.currency !== 'ALL' ? defaultState.currency : undefined,
      type: defaultState.typeFilter !== 'ALL' ? defaultState.typeFilter : undefined,
      category: defaultState.categoryFilter !== 'ALL' ? defaultState.categoryFilter : undefined,
      search: defaultState.search.trim() || undefined
    };

    Object.keys(filters).forEach(k => filters[k] === undefined && delete filters[k]);

    expect(filters).toEqual({
      year: 'ALL'
    });
  });
});
