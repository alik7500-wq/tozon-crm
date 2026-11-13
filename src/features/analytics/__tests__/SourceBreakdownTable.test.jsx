// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApartmentSalesReportPage } from '../ApartmentSalesReportPage';
import { api } from '../../../api/client';
import * as AuthContextModule from '../../auth/AuthContext';

const MOCK_REPORT = {
  filters: {
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    complex: 'ALL',
    block: 'ALL',
    salesSource: 'ALL',
    partnerId: 'ALL',
  },
  filterOptions: {
    complexes: ['TOZON PLAZA'],
    blocks: ['А', 'Б'],
    marketingPartners: [],
  },
  summary: {
    totalSoldCount: 3,
    totalAreaM2: 180,
    averageAreaM2: 60,
    totalSalesAmountUsd: 120000,
    totalPaidCashUsd: 10000,
    totalPaidBarterUsd: 15000,
    totalSettledUsd: 25000,
    totalRemainingDebtUsd: 95000,
    totalPaidPercent: 20.83,
    totalDebtPercent: 79.17,
    paidDownPaymentUsd: 25000,
    paidDownPaymentPercent: 20.83,
    directSoldCount: 1,
    marketerSoldCount: 1,
    unspecifiedSoldCount: 1,
    directSalesAmountUsd: 40000,
    marketerSalesAmountUsd: 50000,
    unspecifiedSalesAmountUsd: 30000,
    calculatedCommissionUsd: 1500,
    approvedCommissionUsd: 1500,
    paidCommissionUsd: 0,
    remainingCommissionUsd: 1500,
  },
  blocks: [
    {
      key: 'TOZON PLAZA::А',
      projectName: 'TOZON PLAZA',
      blockCode: 'А',
      availableStartCount: 10,
      soldCount: 3,
      directSoldCount: 1,
      marketerSoldCount: 1,
      unspecifiedSoldCount: 1,
      availableEndCount: 7,
      soldAreaM2: 180,
      salesAmountUsd: 120000,
      directSalesAmountUsd: 40000,
      marketerSalesAmountUsd: 50000,
      unspecifiedSalesAmountUsd: 30000,
      paidCashUsd: 10000,
      paidBarterUsd: 15000,
      totalSettledUsd: 25000,
      remainingDebtUsd: 95000,
      paidPercent: 20.83,
      debtPercent: 79.17,
      paidDownPaymentUsd: 25000,
      paidDownPaymentPercent: 20.83,
      calculatedCommissionUsd: 1500,
      approvedCommissionUsd: 1500,
      paidCommissionUsd: 0,
      remainingCommissionUsd: 1500,
      sourceBreakdown: [
        {
          salesSource: 'DIRECT',
          salesSourceLabel: 'Прямая продажа TOZON',
          soldCount: 1,
          salesAmountUsd: 40000,
          paidDownPaymentUsd: 10000,
          paidDownPaymentPercent: 25,
        },
        {
          salesSource: 'MARKETER',
          salesSourceLabel: 'Продажа через маркетологов',
          soldCount: 1,
          salesAmountUsd: 50000,
          paidDownPaymentUsd: 15000,
          paidDownPaymentPercent: 30,
        },
        {
          salesSource: 'UNSPECIFIED',
          salesSourceLabel: 'Источник не определён',
          soldCount: 1,
          salesAmountUsd: 30000,
          paidDownPaymentUsd: 0,
          paidDownPaymentPercent: 0,
        },
      ],
      apartments: [],
    },
    {
      key: 'TOZON PLAZA::Б',
      projectName: 'TOZON PLAZA',
      blockCode: 'Б',
      availableStartCount: 5,
      soldCount: 0,
      directSoldCount: 0,
      marketerSoldCount: 0,
      unspecifiedSoldCount: 0,
      availableEndCount: 5,
      soldAreaM2: 0,
      salesAmountUsd: 0,
      directSalesAmountUsd: 0,
      marketerSalesAmountUsd: 0,
      unspecifiedSalesAmountUsd: 0,
      paidCashUsd: 0,
      paidBarterUsd: 0,
      totalSettledUsd: 0,
      remainingDebtUsd: 0,
      paidPercent: 0,
      debtPercent: 0,
      paidDownPaymentUsd: 0,
      paidDownPaymentPercent: 0,
      calculatedCommissionUsd: 0,
      approvedCommissionUsd: 0,
      paidCommissionUsd: 0,
      remainingCommissionUsd: 0,
      sourceBreakdown: [
        {
          salesSource: 'DIRECT',
          salesSourceLabel: 'Прямая продажа TOZON',
          soldCount: 0,
          salesAmountUsd: 0,
          paidDownPaymentUsd: 0,
          paidDownPaymentPercent: 0,
        },
        {
          salesSource: 'MARKETER',
          salesSourceLabel: 'Продажа через маркетологов',
          soldCount: 0,
          salesAmountUsd: 0,
          paidDownPaymentUsd: 0,
          paidDownPaymentPercent: 0,
        },
        {
          salesSource: 'UNSPECIFIED',
          salesSourceLabel: 'Источник не определён',
          soldCount: 0,
          salesAmountUsd: 0,
          paidDownPaymentUsd: 0,
          paidDownPaymentPercent: 0,
        },
      ],
      apartments: [],
    },
  ],
  totals: {
    availableStartCount: 15,
    soldCount: 3,
    directSoldCount: 1,
    marketerSoldCount: 1,
    unspecifiedSoldCount: 1,
    availableEndCount: 12,
    soldAreaM2: 180,
    salesAmountUsd: 120000,
    directSalesAmountUsd: 40000,
    marketerSalesAmountUsd: 50000,
    unspecifiedSalesAmountUsd: 30000,
    paidCashUsd: 10000,
    paidBarterUsd: 15000,
    totalSettledUsd: 25000,
    remainingDebtUsd: 95000,
    paidPercent: 20.83,
    debtPercent: 79.17,
    paidDownPaymentUsd: 25000,
    paidDownPaymentPercent: 20.83,
    calculatedCommissionUsd: 1500,
    approvedCommissionUsd: 1500,
    paidCommissionUsd: 0,
    remainingCommissionUsd: 1500,
    sourceBreakdown: [
      {
        salesSource: 'DIRECT',
        salesSourceLabel: 'Прямая продажа TOZON',
        soldCount: 1,
        salesAmountUsd: 40000,
        paidDownPaymentUsd: 10000,
        paidDownPaymentPercent: 25,
      },
      {
        salesSource: 'MARKETER',
        salesSourceLabel: 'Продажа через маркетологов',
        soldCount: 1,
        salesAmountUsd: 50000,
        paidDownPaymentUsd: 15000,
        paidDownPaymentPercent: 30,
      },
      {
        salesSource: 'UNSPECIFIED',
        salesSourceLabel: 'Источник не определён',
        soldCount: 1,
        salesAmountUsd: 30000,
        paidDownPaymentUsd: 0,
        paidDownPaymentPercent: 0,
      },
    ],
  },
  apartments: [],
  marketingPartners: [],
};

describe('ApartmentSalesReportPage - Source Breakdown Sub-rows & Paid Down Payment', () => {
  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        role: 'DIRECTOR',
        permissions: ['access.v2', 'analytics.view', 'analytics.reports', 'deals.view', 'contracts.view'],
      },
    });
    vi.spyOn(api, 'get').mockResolvedValue({ data: MOCK_REPORT });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders DIRECT, MARKETER, and UNSPECIFIED sub-rows under block and ИТОГО with paid down payment metrics, hiding UNSPECIFIED when 0', async () => {
    render(
      <MemoryRouter>
        <ApartmentSalesReportPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('block-subrow-А-DIRECT')).toBeTruthy();
    });

    const directRow = screen.getByTestId('block-subrow-А-DIRECT');
    expect(directRow.textContent).toContain('Прямая продажа TOZON');
    expect(directRow.textContent).toContain('40');
    expect(directRow.textContent).toContain('10');
    expect(directRow.textContent).toContain('25,00%');

    const marketerRow = screen.getByTestId('block-subrow-А-MARKETER');
    expect(marketerRow.textContent).toContain('Продажа через маркетологов');
    expect(marketerRow.textContent).toContain('50');
    expect(marketerRow.textContent).toContain('15');
    expect(marketerRow.textContent).toContain('30,00%');

    // UNSPECIFIED is shown in Block А (soldCount = 1), hidden in Block Б (soldCount = 0)
    expect(screen.getByTestId('block-subrow-А-UNSPECIFIED')).toBeTruthy();
    expect(screen.queryByTestId('block-subrow-Б-UNSPECIFIED')).toBeNull();

    // ИТОГО row and sub-rows
    expect(screen.getByTestId('table-total-paid-down-payment-usd').textContent).toContain('25');
    expect(screen.getByTestId('table-total-paid-down-payment-percent').textContent).toContain('20,83%');
    expect(screen.getByTestId('total-subrow-DIRECT').textContent).toContain('ИТОГО — Прямая продажа TOZON');
    expect(screen.getByTestId('total-subrow-MARKETER').textContent).toContain('ИТОГО — Продажа через маркетологов');
    expect(screen.getByTestId('total-subrow-UNSPECIFIED').textContent).toContain('ИТОГО — Источник не определён');
  });
});
