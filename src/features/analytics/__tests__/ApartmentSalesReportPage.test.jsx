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
    totalSoldCount: 23,
    totalAreaM2: 1412.46,
    averageAreaM2: 61.41
  },
  blocks: [
    {
      key: 'TOZON PLAZA::А',
      projectName: 'TOZON PLAZA',
      blockCode: 'А',
      blockName: 'Блок А',
      soldCount: 20,
      soldAreaM2: 1262.5,
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
          status: 'SIGNED',
          statusLabel: 'Действующий'
        }
      ]
    },
    {
      key: 'TOZON PLAZA::Б',
      projectName: 'TOZON PLAZA',
      blockCode: 'Б',
      blockName: 'Блок Б',
      soldCount: 0,
      soldAreaM2: 0,
      apartments: []
    },
    {
      key: 'TOZON PLAZA-2::В',
      projectName: 'TOZON PLAZA-2',
      blockCode: 'В',
      blockName: 'Блок В',
      soldCount: 0,
      soldAreaM2: 0,
      apartments: []
    },
    {
      key: 'TOZON PLAZA-2::Г',
      projectName: 'TOZON PLAZA-2',
      blockCode: 'Г',
      blockName: 'Блок Г',
      soldCount: 3,
      soldAreaM2: 149.96,
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
          status: 'SIGNED',
          statusLabel: 'Действующий'
        }
      ]
    }
  ],
  totals: {
    soldCount: 23,
    soldAreaM2: 1412.46
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
      status: 'SIGNED',
      statusLabel: 'Действующий'
    },
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
      status: 'SIGNED',
      statusLabel: 'Действующий'
    }
  ]
};

describe('ApartmentSalesReportPage UI & Interaction Tests', () => {
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

  it('renders summary KPIs, 4 blocks (including zero-sale blocks), and ИТОГО row', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('kpi-total-sold-count').textContent).toBe('23');
    });

    expect(screen.getByTestId('kpi-total-area-m2').textContent).toContain('1');
    expect(screen.getByTestId('kpi-total-area-m2').textContent).toContain('412,46');
    expect(screen.getByTestId('kpi-average-area-m2').textContent).toContain('61,41');

    expect(screen.getByTestId('block-row-А')).toBeTruthy();
    expect(screen.getByTestId('block-row-Б')).toBeTruthy();
    expect(screen.getByTestId('block-row-В')).toBeTruthy();
    expect(screen.getByTestId('block-row-Г')).toBeTruthy();
    expect(screen.getByTestId('table-total-sold-count').textContent).toBe('23');
  });

  it('opens block drilldown when clicking a block row and opens contract card drawer', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('block-row-А')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('block-row-А'));

    await waitFor(() => {
      expect(screen.getByTestId('drilldown-section')).toBeTruthy();
    });

    expect(screen.getByText(/Детализация: TOZON PLAZA — Блок А/)).toBeTruthy();
    expect(screen.getByText('05.11.2026')).toBeTruthy();
    expect(screen.getByText('№ 12')).toBeTruthy();

    const openCardBtn = screen.getByRole('button', { name: /Карточка/i });
    fireEvent.click(openCardBtn);

    expect(screen.getByTestId('mock-deal-drawer')).toBeTruthy();
    expect(screen.getByText('Карточка договора #101')).toBeTruthy();
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

