// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApartmentSalesReportPage } from '../ApartmentSalesReportPage';
import { navGroups } from '../../../config/navigationRegistry';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn()
  }
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      role: 'DIRECTOR',
      permissions: ['access.v2', 'analytics.view', 'analytics.reports', 'deals.view', 'contracts.view']
    }
  })
}));

vi.mock('../../deals/DealDrawer', () => ({
  DealDrawer: ({ isOpen, dealId, onClose }) =>
    isOpen ? (
      <div data-testid="mock-deal-drawer">
        <span>Карточка договора #{dealId}</span>
        <button type="button" onClick={onClose}>
          Закрыть карточку
        </button>
      </div>
    ) : null
}));

vi.mock('../../deals/ContractPrintView', () => ({
  ContractPrintView: () => null
}));

const MOCK_REPORT = {
  generatedAt: '2026-11-13T07:00:00.000Z',
  generatedAtLabel: '13.11.2026, 12:00',
  timezone: 'Asia/Dushanbe',
  filters: {
    startDate: '2026-11-01',
    endDate: '2026-11-13',
    complex: 'ALL',
    block: 'ALL'
  },
  summary: {
    totalAvailableStartCount: 149,
    totalSoldCount: 4,
    directSoldCount: 2,
    marketerSoldCount: 1,
    unspecifiedSoldCount: 1,
    totalAvailableEndCount: 145,
    totalAreaM2: 204.26,
    averageAreaM2: 51.07,
    totalSalesAmountUsd: 112000,
    directSalesAmountUsd: 52000,
    marketerSalesAmountUsd: 40000,
    unspecifiedSalesAmountUsd: 20000,
    totalPaidCashUsd: 52000,
    totalPaidBarterUsd: 15000,
    totalSettledUsd: 67000,
    totalRemainingDebtUsd: 45000,
    totalOverpaidUsd: 0,
    totalPaidPercent: 59.82,
    totalDebtPercent: 40.18,
    calculatedCommissionUsd: 1200,
    approvedCommissionUsd: 1200,
    paidCommissionUsd: 400,
    remainingCommissionUsd: 800
  },
  marketingPartners: [
    { id: 701, name: 'Somon Agency', commissionType: 'PERCENT', commissionRatePercent: 3, isActive: true }
  ],
  blocks: [
    {
      key: 'TOZON PLAZA::А',
      projectName: 'TOZON PLAZA',
      blockCode: 'А',
      blockName: 'Блок А',
      totalApartments: 62,
      blockedCount: 5,
      sellableApartments: 57,
      availableStartCount: 33,
      reservedStartCount: 4,
      soldCount: 1,
      availableEndCount: 33,
      reservedEndCount: 4,
      soldAreaM2: 62.5,
      salesAmountUsd: 40000,
      paidCashUsd: 25000,
      paidBarterUsd: 15000,
      totalSettledUsd: 40000,
      remainingDebtUsd: 0,
      paidPercent: 100,
      debtPercent: 0,
      apartments: [
        {
          dealId: 101,
          unitId: 501,
          contractDate: '2026-11-05',
          contractNumber: 'ДП-2026-00015',
          projectName: 'TOZON PLAZA',
          blockCode: 'А',
          unitNumber: '12',
          floorNumber: 3,
          areaM2: 62.5,
          contractPriceUsd: 40000,
          paidCashUsd: 25000,
          paidBarterUsd: 15000,
          totalSettledUsd: 40000,
          remainingDebtUsd: 0,
          paidPercent: 100,
          debtPercent: 0,
          status: 'SIGNED',
          statusLabel: 'Действующий',
          salesSource: 'MARKETER',
          salesSourceLabel: 'Продажа через маркетологов',
          marketingPartnerId: 701,
          marketingPartnerName: 'Somon Agency',
          managerName: 'Азизов Т.',
          commissionRatePercent: 3,
          calculatedCommissionUsd: 1200,
          approvedCommissionUsd: 1200,
          paidCommissionUsd: 400,
          remainingCommissionUsd: 800,
          commissionStatusLabel: 'Частично выплачена'
        }
      ]
    },
    {
      key: 'TOZON PLAZA::Б',
      projectName: 'TOZON PLAZA',
      blockCode: 'Б',
      blockName: 'Блок Б',
      totalApartments: 80,
      blockedCount: 0,
      sellableApartments: 80,
      availableStartCount: 28,
      reservedStartCount: 2,
      soldCount: 0,
      availableEndCount: 24,
      reservedEndCount: 5,
      soldAreaM2: 0,
      salesAmountUsd: 0,
      paidCashUsd: 0,
      paidBarterUsd: 0,
      totalSettledUsd: 0,
      remainingDebtUsd: 0,
      paidPercent: 0,
      debtPercent: 0,
      apartments: []
    },
    {
      key: 'TOZON PLAZA-2::В',
      projectName: 'TOZON PLAZA-2',
      blockCode: 'В',
      blockName: 'Блок В',
      totalApartments: 70,
      blockedCount: 14,
      sellableApartments: 56,
      availableStartCount: 56,
      reservedStartCount: 0,
      soldCount: 0,
      availableEndCount: 56,
      reservedEndCount: 0,
      soldAreaM2: 0,
      salesAmountUsd: 0,
      paidCashUsd: 0,
      paidBarterUsd: 0,
      totalSettledUsd: 0,
      remainingDebtUsd: 0,
      paidPercent: 0,
      debtPercent: 0,
      apartments: []
    },
    {
      key: 'TOZON PLAZA-2::Г',
      projectName: 'TOZON PLAZA-2',
      blockCode: 'Г',
      blockName: 'Блок Г',
      totalApartments: 60,
      blockedCount: 25,
      sellableApartments: 35,
      availableStartCount: 35,
      reservedStartCount: 0,
      soldCount: 3,
      availableEndCount: 32,
      reservedEndCount: 0,
      soldAreaM2: 141.76,
      salesAmountUsd: 72000,
      paidCashUsd: 27000,
      paidBarterUsd: 0,
      totalSettledUsd: 27000,
      remainingDebtUsd: 45000,
      paidPercent: 37.5,
      debtPercent: 62.5,
      apartments: [
        {
          dealId: 202,
          unitId: 602,
          contractDate: '2026-11-10',
          contractNumber: 'ДП-2026-00044',
          projectName: 'TOZON PLAZA-2',
          blockCode: 'Г',
          unitNumber: '8',
          floorNumber: 2,
          areaM2: 49.96,
          contractPriceUsd: 72000,
          paidCashUsd: 27000,
          paidBarterUsd: 0,
          totalSettledUsd: 27000,
          remainingDebtUsd: 45000,
          paidPercent: 37.5,
          debtPercent: 62.5,
          status: 'SIGNED',
          statusLabel: 'Действующий'
        }
      ]
    }
  ],
  totals: {
    availableStartCount: 149,
    soldCount: 4,
    availableEndCount: 145,
    soldAreaM2: 204.26,
    salesAmountUsd: 112000,
    paidCashUsd: 52000,
    paidBarterUsd: 15000,
    totalSettledUsd: 67000,
    remainingDebtUsd: 45000,
    paidPercent: 59.82,
    debtPercent: 40.18
  },
  apartments: [
    {
      dealId: 101,
      unitId: 501,
      contractDate: '2026-11-05',
      contractNumber: 'ДП-2026-00015',
      projectName: 'TOZON PLAZA',
      blockCode: 'А',
      unitNumber: '12',
      floorNumber: 3,
      areaM2: 62.5,
      contractPriceUsd: 40000,
      paidCashUsd: 25000,
      paidBarterUsd: 15000,
      totalSettledUsd: 40000,
      remainingDebtUsd: 0,
      paidPercent: 100,
      debtPercent: 0,
      status: 'SIGNED',
      statusLabel: 'Действующий'
    }
  ]
};

describe('ApartmentSalesReportPage Expanded UI & Financial Columns Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ status: 'success', data: MOCK_REPORT });
  });

  afterEach(() => {
    cleanup();
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/analytics/apartment-sales']}>
        <ApartmentSalesReportPage />
      </MemoryRouter>
    );

  it('renders all 6 summary KPIs, 9 metric columns per block, and ИТОГО row', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('kpi-total-sold-count').textContent).toBe('4');
    });

    expect(screen.getByTestId('kpi-total-area-m2').textContent).toContain('204,26');
    expect(screen.getByTestId('kpi-average-area-m2').textContent).toContain('51,07');
    expect(screen.getByTestId('kpi-total-sales-usd').textContent).toContain('112');
    expect(screen.getByTestId('kpi-total-settled-usd').textContent).toContain('67');
    expect(screen.getByTestId('kpi-total-debt-usd').textContent).toContain('45');

    expect(screen.getByTestId('block-row-А')).toBeTruthy();
    expect(screen.getByTestId('block-row-Б')).toBeTruthy();
    expect(screen.getByTestId('block-row-В')).toBeTruthy();
    expect(screen.getByTestId('block-row-Г')).toBeTruthy();

    expect(screen.getByTestId('table-total-available-start').textContent).toBe('149');
    expect(screen.getByTestId('table-total-sold-count').textContent).toBe('4');
    expect(screen.getByTestId('table-total-available-end').textContent).toBe('145');
    expect(screen.getByTestId('table-total-paid-percent').textContent).toContain('59,82%');
    expect(screen.getByTestId('table-total-debt-percent').textContent).toContain('40,18%');
  });

  it('opens block drilldown with cash/barter/debt columns and opens contract card drawer', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('block-row-А')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('block-row-А'));

    await waitFor(() => {
      expect(screen.getByTestId('drilldown-section')).toBeTruthy();
    });

    expect(screen.getByText(/Детализация: TOZON PLAZA — Блок А/)).toBeTruthy();
    expect(screen.getByTestId('drilldown-row-12')).toBeTruthy();
    expect(screen.getByText('№ 12')).toBeTruthy();
    expect(screen.getByText('Получено деньгами, USD')).toBeTruthy();
    expect(screen.getByText('Зачтено бартером, USD')).toBeTruthy();
    expect(screen.getByText('Всего погашено, USD')).toBeTruthy();
    expect(screen.getAllByText('Остаток долга, USD').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Продажа через маркетологов')).toBeTruthy();
    expect(screen.getAllByText(/Somon Agency/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Азизов Т.')).toBeTruthy();

    const openCardBtn = screen.getByRole('button', { name: /Карточка/i });
    fireEvent.click(openCardBtn);

    expect(screen.getByTestId('mock-deal-drawer')).toBeTruthy();
    expect(screen.getByText('Карточка договора #101')).toBeTruthy();
  });

  it('filters by salesSource and partnerId and switches between table view tabs (INVENTORY, FINANCE, COMMISSIONS)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('kpi-direct-sold-count').textContent).toContain('2 шт.');
    });

    expect(screen.getByTestId('kpi-marketer-sold-count').textContent).toContain('1 шт.');
    expect(screen.getByTestId('kpi-unspecified-sold-count').textContent).toContain('1 шт.');
    expect(screen.getByTestId('kpi-commissions-summary').textContent).toContain('800');

    // Switch to "Источники и комиссии" tab
    fireEvent.click(screen.getByTestId('report-tab-COMMISSIONS'));
    expect(screen.getByText('Начисленная комиссия, USD')).toBeTruthy();
    expect(screen.getByText('Утверждённая комиссия, USD')).toBeTruthy();
    expect(screen.getByText('Выплаченная комиссия, USD')).toBeTruthy();
    expect(screen.getByText('Остаток комиссии к выплате, USD')).toBeTruthy();

    // Filter by sales source = DIRECT
    const sourceSelect = screen.getByLabelText('Источник продажи');
    fireEvent.change(sourceSelect, { target: { value: 'DIRECT' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith('/reports/apartment-sales', {
        params: expect.objectContaining({
          salesSource: 'DIRECT',
          partnerId: 'ALL'
        })
      });
    });
  });

  it('dynamically restricts block options when complex filter changes and automatically refetches', async () => {
    renderPage();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    const complexSelect = screen.getByLabelText('Жилой комплекс');
    fireEvent.change(complexSelect, { target: { value: 'TOZON PLAZA-2' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith('/reports/apartment-sales', {
        params: expect.objectContaining({
          complex: 'TOZON PLAZA-2',
          block: 'ALL'
        })
      });
    });

    const blockSelect = screen.getByLabelText('Блок');
    const optionValues = Array.from(blockSelect.querySelectorAll('option')).map((o) => o.value);
    expect(optionValues).toEqual(['ALL', 'В', 'Г']);
  });

  it('registers "Отчёт о продажах квартир" in Analytics navigation menu and AnalyticsTabs', async () => {
    const analyticsGroup = navGroups.find((g) => g.id === 'analytics');
    expect(analyticsGroup).toBeDefined();

    const menuItem = analyticsGroup.children.find(
      (item) => item.path === '/analytics/apartment-sales'
    );
    expect(menuItem).toBeDefined();
    expect(menuItem.label).toBe('Отчёт о продажах квартир');
    expect(menuItem.permission).toBe('analytics.view');

    renderPage();
    const tabLinks = await screen.findAllByRole('link', { name: /Отчёт о продажах квартир/i });
    expect(tabLinks.length).toBeGreaterThan(0);
    expect(tabLinks[0].getAttribute('href')).toBe('/analytics/apartment-sales');
  });
});
