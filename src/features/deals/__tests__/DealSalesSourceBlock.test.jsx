import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { DealSalesSourceBlock } from '../DealSalesSourceBlock';
import { api } from '../../../api/client';
import { AuthProvider } from '../../auth/AuthContext';

let currentUser = { id: 1, role: 'ADMIN', fullName: 'Admin' };

const renderWithAuth = (ui) => render(<AuthProvider>{ui}</AuthProvider>);

const samplePartners = [
  { id: 10, name: 'Agency Alpha', commissionType: 'PERCENT', commissionRatePercent: 3 },
  { id: 11, name: 'Agency Beta', commissionType: 'NONE', commissionRatePercent: 0 },
];

const makeDeal = (overrides = {}) => ({
  id: 11,
  contract_number: '0001',
  status: 'SIGNED',
  sales_source: 'UNSPECIFIED',
  marketing_partner_id: null,
  marketing_partner_name: null,
  marketer_name: '',
  commission: {
    status: 'NOT_CALCULATED',
    statusLabel: 'Не рассчитана',
    commissionRatePercent: 0,
    calculatedCommissionUsd: 0,
    approvedCommissionUsd: 0,
    paidCommissionUsd: 0,
    remainingCommissionUsd: 0,
  },
  source_history: [],
  commission_history: [],
  ...overrides,
});

describe('DealSalesSourceBlock (simplified single-click UI)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    currentUser = { id: 1, role: 'ADMIN', fullName: 'Admin' };
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({ data: { user: currentUser } });
      }
      return Promise.resolve({ data: { data: { partners: samplePartners } } });
    });
    vi.spyOn(api, 'patch').mockResolvedValue({ data: { data: { deal: makeDeal() } } });
  });

  afterEach(cleanup);

  it('does not render the removed bottom edit panel, duplicate checkboxes, reason field, or Save/Cancel buttons', async () => {
    renderWithAuth(<DealSalesSourceBlock mode="deal" deal={makeDeal()} />);

    expect(await screen.findByText('ИСТОЧНИК ПРОДАЖИ И КОМИССИЯ МАРКЕТОЛОГОВ')).toBeTruthy();
    expect(screen.queryByText(/Изменение источника подписанного договора/i)).toBeNull();
    expect(screen.queryByText(/Причина изменения источника/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Сохранить источник/i })).toBeNull();
    expect(screen.queryByTestId('btn-edit-sales-source')).toBeNull();

    // Only one checkbox for DIRECT and one for MARKETER
    expect(screen.getAllByLabelText('Прямая продажа TOZON')).toHaveLength(1);
    expect(screen.getAllByLabelText('Продажа через маркетологов')).toHaveLength(1);
  });

  it('renders UNSPECIFIED state with neither checkbox checked and informational message', () => {
    renderWithAuth(<DealSalesSourceBlock mode="deal" deal={makeDeal({ sales_source: 'UNSPECIFIED' })} />);

    const directCb = screen.getByLabelText('Прямая продажа TOZON');
    const marketerCb = screen.getByLabelText('Продажа через маркетологов');
    expect(directCb.checked).toBe(false);
    expect(marketerCb.checked).toBe(false);
    expect(screen.getByText(/Статус: Источник не определён\./i)).toBeTruthy();
  });

  it('saves DIRECT on single click for ADMIN on SIGNED deal with automatic audit reason and persists on reopen', async () => {
    const updatedDeal = makeDeal({ sales_source: 'DIRECT' });
    api.patch.mockResolvedValue({ data: { data: { deal: updatedDeal } } });
    const onDealUpdated = vi.fn();

    const { unmount } = renderWithAuth(
      <DealSalesSourceBlock mode="deal" deal={makeDeal()} onDealUpdated={onDealUpdated} />
    );

    const directBtn = screen.getByTestId('deal-source-option-direct');
    await waitFor(() => expect(directBtn.disabled).toBe(false));
    fireEvent.click(directBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(1);
      expect(api.patch).toHaveBeenCalledWith('/deals/11/sales-source', {
        salesSource: 'DIRECT',
        marketingPartnerId: null,
        marketerName: '',
        reason: 'Источник продажи установлен администратором через карточку договора',
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Прямая продажа TOZON').checked).toBe(true);
      expect(screen.getByLabelText('Продажа через маркетологов').checked).toBe(false);
      expect(onDealUpdated).toHaveBeenCalledWith(updatedDeal);
    });

    // Simulate closing and reopening the card with the saved deal
    unmount();
    renderWithAuth(<DealSalesSourceBlock mode="deal" deal={updatedDeal} />);
    expect(screen.getByLabelText('Прямая продажа TOZON').checked).toBe(true);
    expect(screen.getByText(/Комиссия маркетологам: 0\.00 USD/i)).toBeTruthy();
  });

  it('opens compact partner selector on MARKETER click and auto-saves when partner is selected', async () => {
    const updatedDeal = makeDeal({
      sales_source: 'MARKETER',
      marketing_partner_id: 10,
      marketing_partner_name: 'Agency Alpha',
    });
    api.patch.mockResolvedValue({ data: { data: { deal: updatedDeal } } });

    const { unmount } = renderWithAuth(<DealSalesSourceBlock mode="deal" deal={makeDeal()} />);

    const marketerBtn = screen.getByTestId('deal-source-option-marketer');
    await waitFor(() => expect(marketerBtn.disabled).toBe(false));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/reports/marketing-partners'));

    fireEvent.click(marketerBtn);

    // Compact partner selector appears, old panel does not
    const select = await screen.findByTestId('compact-partner-select');
    expect(screen.queryByText(/Причина изменения источника/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Сохранить источник/i })).toBeNull();

    fireEvent.change(select, { target: { value: '10' } });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/deals/11/sales-source', {
        salesSource: 'MARKETER',
        marketingPartnerId: 10,
        marketerName: '',
        reason: 'Источник продажи установлен администратором через карточку договора',
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Продажа через маркетологов').checked).toBe(true);
      expect(screen.queryByTestId('compact-partner-picker')).toBeNull();
    });

    // Reopen card
    unmount();
    renderWithAuth(<DealSalesSourceBlock mode="deal" deal={updatedDeal} />);
    expect(screen.getByLabelText('Продажа через маркетологов').checked).toBe(true);
    expect(screen.getByText(/Партнёр: Agency Alpha/i)).toBeTruthy();
  });

  it('restores previous state and shows error message when save fails', async () => {
    api.patch.mockRejectedValue({
      response: { data: { message: 'Ошибка сохранения в базе' } },
    });

    renderWithAuth(<DealSalesSourceBlock mode="deal" deal={makeDeal({ sales_source: 'UNSPECIFIED' })} />);

    const directBtn = screen.getByTestId('deal-source-option-direct');
    await waitFor(() => expect(directBtn.disabled).toBe(false));
    fireEvent.click(directBtn);

    await screen.findByText('Ошибка сохранения в базе');
    expect(screen.getByLabelText('Прямая продажа TOZON').checked).toBe(false);
    expect(screen.getByLabelText('Продажа через маркетологов').checked).toBe(false);
  });

  it('prevents duplicate requests on rapid double-click while saving', async () => {
    let resolvePatch;
    api.patch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        })
    );

    renderWithAuth(<DealSalesSourceBlock mode="deal" deal={makeDeal()} />);

    const directBtn = screen.getByTestId('deal-source-option-direct');
    await waitFor(() => expect(directBtn.disabled).toBe(false));
    fireEvent.click(directBtn);
    fireEvent.click(directBtn);

    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(directBtn.disabled).toBe(true);

    resolvePatch({ data: { data: { deal: makeDeal({ sales_source: 'DIRECT' }) } } });
    await waitFor(() => expect(directBtn.disabled).toBe(false));
  });

  it('locks SIGNED deal modification for non-ADMIN roles while displaying current source', async () => {
    for (const role of ['DIRECTOR', 'FINANCE_MANAGER', 'SALES_MANAGER', 'WAREHOUSE_MANAGER']) {
      currentUser = { id: 2, role };
      const { unmount } = renderWithAuth(
        <DealSalesSourceBlock mode="deal" deal={makeDeal({ sales_source: 'DIRECT' })} />
      );

      await waitFor(() => expect(api.get).toHaveBeenCalledWith('/auth/me'));
      const directBtn = screen.getByTestId('deal-source-option-direct');
      const marketerBtn = screen.getByTestId('deal-source-option-marketer');
      expect(screen.getByLabelText('Прямая продажа TOZON').checked).toBe(true);
      expect(directBtn.disabled).toBe(true);
      expect(marketerBtn.disabled).toBe(true);
      expect(screen.getByText(/доступно только администратору \(ADMIN\)/i)).toBeTruthy();

      fireEvent.click(marketerBtn);
      expect(api.patch).not.toHaveBeenCalled();
      unmount();
    }
  });

  it('allows SALES_MANAGER to select source on unsigned (RESERVED) deal', async () => {
    currentUser = { id: 3, role: 'SALES_MANAGER' };
    const reservedDeal = makeDeal({ status: 'RESERVED', sales_source: 'UNSPECIFIED' });
    api.patch.mockResolvedValue({
      data: { data: { deal: { ...reservedDeal, sales_source: 'DIRECT' } } },
    });

    renderWithAuth(<DealSalesSourceBlock mode="deal" deal={reservedDeal} />);

    const directBtn = screen.getByTestId('deal-source-option-direct');
    await waitFor(() => expect(directBtn.disabled).toBe(false));
    fireEvent.click(directBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/deals/11/sales-source', {
        salesSource: 'DIRECT',
        marketingPartnerId: null,
        marketerName: '',
        reason: 'Указание источника продажи через карточку договора',
      });
    });
  });
});
