// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesAnalyticsPage } from '../SalesAnalyticsPage';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  },
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'ADMIN', name: 'Admin User' }
  })
}));

const mockPlanFactData = {
  summary: {
    totalTargetDeals: 10,
    totalTargetVolumeUsd: 350000,
    totalActualDeals: 36,
    totalActualVolumeUsd: 1248870,
    dealsExecutionPercent: 360,
    volumeExecutionPercent: 356.8,
    dealsGap: 26,
    volumeGapUsd: 898870
  },
  monthlyComparison: [
    {
      period: '2026-10',
      target: { dealsCount: 0, volumeUsd: 0 },
      actual: { signedDealsCount: 10, signedVolumeUsd: 346378, uniqueBuyersCount: 10 },
      execution: { dealsPercent: 100, volumePercent: 100, dealsGap: 10, volumeGapUsd: 346378 },
      pipelineSupplementary: { reservedCount: 5, reservedVolumeUsd: 208208, cancelledCount: 6, cancelledVolumeUsd: 253764 }
    },
    {
      period: '2026-11',
      target: { dealsCount: 10, volumeUsd: 350000 },
      actual: { signedDealsCount: 0, signedVolumeUsd: 0, uniqueBuyersCount: 0 },
      execution: { dealsPercent: 0, volumePercent: 0, dealsGap: -10, volumeGapUsd: -350000 },
      pipelineSupplementary: { reservedCount: 0, reservedVolumeUsd: 0, cancelledCount: 0, cancelledVolumeUsd: 0 }
    }
  ]
};

const mockFunnelData = {
  totalLeads: 48,
  totalSignedContracts: 36,
  totalActiveReservations: 8,
  totalLostLeads: 2,
  overallConversionPercent: 75,
  stages: [
    { id: 'NEW', name: 'Новый лид', count: 1, color: '#64748b', conversionFromPrev: 100, reachedCount: 48, description: 'Первичное обращение' },
    { id: 'IN_PROGRESS', name: 'В работе', count: 1, color: '#3b82f6', conversionFromPrev: 95, reachedCount: 47, description: 'Установлен контакт' },
    { id: 'NEGOTIATION', name: 'Переговоры', count: 8, color: '#f59e0b', conversionFromPrev: 90, reachedCount: 46, description: 'Согласование условий' },
    { id: 'RESERVED', name: 'Бронирование', count: 8, color: '#06b6d4', conversionFromPrev: 80, reachedCount: 44, volumeUsd: 326082, description: 'Зафиксирована бронь' },
    { id: 'SIGNED', name: 'Подписанный договор', count: 36, color: '#10b981', conversionFromPrev: 81.8, reachedCount: 36, volumeUsd: 1248870, description: 'Договор подписан' }
  ],
  transitionCycleAverages: {
    leadToReservationAvgDays: 4.2,
    reservationToSigningAvgDays: 6.5,
    fullCycleLeadToSignedAvgDays: 10.7
  },
  lostReasons: [
    { code: 'PRICE', label: 'Высокая цена / бюджет', count: 1, percentOfLost: 50 },
    { code: 'CHOSE_COMPETITOR', label: 'Выбрал конкурента', count: 1, percentOfLost: 50 }
  ]
};

const mockManagersData = {
  isRestrictedToSelf: false,
  teamSummary: {
    totalAssignedLeads: 15,
    totalProcessedLeads: 14,
    totalUnprocessedLeads: 1,
    totalOverdueTasks: 26,
    totalCompletedCalls: 9,
    totalCompletedMeetings: 0,
    totalReservedDeals: 8,
    totalSignedDeals: 36,
    totalSalesVolumeUsd: 1248870,
    overallConversionRate: 85.7
  },
  managers: [
    {
      managerId: 3,
      name: 'Дадочон Саидов',
      email: 'manager1@tozon.tj',
      role: 'SALES_MANAGER',
      assignedLeadsCount: 1,
      processedLeadsCount: 1,
      unprocessedLeadsCount: 0,
      overdueTasksCount: 12,
      completedCalls: 6,
      completedMeetings: 0,
      reservedDealsCount: 6,
      signedDealsCount: 24,
      salesVolumeUsd: 820184,
      conversionRate: 100
    },
    {
      managerId: 1,
      name: 'Admin',
      email: 'admin@tozon.crm',
      role: 'ADMIN',
      assignedLeadsCount: 14,
      processedLeadsCount: 13,
      unprocessedLeadsCount: 1,
      overdueTasksCount: 14,
      completedCalls: 3,
      completedMeetings: 0,
      reservedDealsCount: 2,
      signedDealsCount: 12,
      salesVolumeUsd: 428686,
      conversionRate: 85.7
    }
  ]
};

const mockDemandData = {
  summary: {
    totalInterestsCount: 1,
    uniqueBuyersCount: 1
  },
  topDemandedUnits: [
    {
      unitId: 90,
      unitNumber: '18',
      rooms: 2,
      areaM2: 69.91,
      floorNumber: 3,
      buildingName: 'Блок Б',
      projectName: 'TOZON PLAZA',
      currentStatus: 'RESERVED',
      priceUsd: 48937,
      interestsCount: 1,
      uniqueBuyersCount: 1,
      priorities: { HIGH: 1, MEDIUM: 0, LOW: 0 }
    }
  ],
  demandByRooms: [
    { rooms: '1-комн.', interestsCount: 0, uniqueBuyersCount: 0, percentOfTotal: 0 },
    { rooms: '2-комн.', interestsCount: 1, uniqueBuyersCount: 1, percentOfTotal: 100 },
    { rooms: '3-комн.', interestsCount: 0, uniqueBuyersCount: 0, percentOfTotal: 0 },
    { rooms: '4+ комн.', interestsCount: 0, uniqueBuyersCount: 0, percentOfTotal: 0 }
  ],
  demandByFloors: [
    { floorNumber: 3, floorLabel: 'Этаж 3', interestsCount: 1, uniqueBuyersCount: 1, percentOfTotal: 100 }
  ],
  demandByArea: [
    { id: '50_to_70', label: '50 – 70 м²', interestsCount: 1, uniqueBuyersCount: 1, percentOfTotal: 100 }
  ],
  demandByPrice: [
    { id: '35k_to_50k', label: '$35 000 – $50 000', interestsCount: 1, uniqueBuyersCount: 1, percentOfTotal: 100 }
  ]
};

describe('SalesAnalyticsPage Component Suite (Phase 3.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/projects') {
        return Promise.resolve({ data: [{ id: 3, name: 'ЖК TOZON PLAZA' }] });
      }
      if (url === '/reports/sales-plan-fact') {
        return Promise.resolve({ data: mockPlanFactData });
      }
      if (url === '/reports/sales-funnel') {
        return Promise.resolve({ data: mockFunnelData });
      }
      if (url === '/reports/sales-managers') {
        return Promise.resolve({ data: mockManagersData });
      }
      if (url === '/reports/apartment-demand') {
        return Promise.resolve({ data: mockDemandData });
      }
      if (url === '/reports/sales-analytics-export') {
        return Promise.resolve(new Blob(['test csv content'], { type: 'text/csv' }));
      }
      return Promise.resolve({ data: null });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders page header, global filter bar and plan vs fact KPIs', async () => {
    render(
      <MemoryRouter>
        <SalesAnalyticsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Сквозная аналитика продаж и спроса (Phase 3.5)')).toBeDefined();
      expect(screen.getByText('План продаж (договоры)')).toBeDefined();
      expect(screen.getByText('Фактические продажи')).toBeDefined();
      expect(screen.getByText('Выполнение плана (USD)')).toBeDefined();
    });
  });

  it('switches to sales funnel tab and displays 5 pipeline stages and average transition days', async () => {
    render(
      <MemoryRouter>
        <SalesAnalyticsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Сквозная аналитика продаж и спроса (Phase 3.5)')).toBeDefined();
    });

    const funnelTab = screen.getByRole('button', { name: 'Воронка продаж' });
    fireEvent.click(funnelTab);

    await waitFor(() => {
      expect(screen.getByText('Сквозная воронка продаж TOZON CRM')).toBeDefined();
      expect(screen.getByText('Новый лид')).toBeDefined();
      expect(screen.getByText('В работе')).toBeDefined();
      expect(screen.getByText('Переговоры')).toBeDefined();
      expect(screen.getByText('Бронирование')).toBeDefined();
      expect(screen.getByText('Подписанный договор')).toBeDefined();
      expect(screen.getByText('Лид → Бронирование')).toBeDefined();
      expect(screen.getAllByText('Недоступно').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Н/Д').length).toBeGreaterThan(0);
    });
  });

  it('switches to KPI менеджеров tab and displays managers performance metrics', async () => {
    render(
      <MemoryRouter>
        <SalesAnalyticsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Сквозная аналитика продаж и спроса (Phase 3.5)')).toBeDefined();
    });

    const managersTab = screen.getByRole('button', { name: 'KPI менеджеров' });
    fireEvent.click(managersTab);

    await waitFor(() => {
      expect(screen.getByText('Персональные показатели сотрудников')).toBeDefined();
      expect(screen.getByText('Дадочон Саидов')).toBeDefined();
      expect(screen.getByText('$820 184')).toBeDefined();
    });
  });

  it('switches to Спрос на квартиры tab and displays top demanded units and unique buyers', async () => {
    render(
      <MemoryRouter>
        <SalesAnalyticsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Сквозная аналитика продаж и спроса (Phase 3.5)')).toBeDefined();
    });

    const demandTab = screen.getByRole('button', { name: 'Спрос на квартиры' });
    fireEvent.click(demandTab);

    await waitFor(() => {
      expect(screen.getByText('Самые востребованные квартиры')).toBeDefined();
      expect(screen.getByText('Кв. №18')).toBeDefined();
      expect(screen.getByText('Уникальных покупателей')).toBeDefined();
    });
  });

  it('displays banner «Данные аналитики спроса временно недоступны» when demand state is DATA_UNAVAILABLE', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/projects') return Promise.resolve({ data: [] });
      if (url === '/reports/sales-plan-fact') return Promise.resolve({ data: mockPlanFactData });
      if (url === '/reports/sales-funnel') return Promise.resolve({ data: mockFunnelData });
      if (url === '/reports/sales-managers') return Promise.resolve({ data: mockManagersData });
      if (url === '/reports/apartment-demand') {
        return Promise.resolve({
          data: {
            state: 'DATA_UNAVAILABLE',
            isAvailable: false,
            message: 'Данные аналитики спроса временно недоступны',
            summary: { totalInterestsCount: 0, uniqueBuyersCount: 0 },
            topDemandedUnits: [],
            demandByRooms: [],
            demandByFloors: [],
            demandByArea: [],
            demandByPrice: []
          }
        });
      }
      return Promise.resolve({ data: null });
    });

    render(
      <MemoryRouter>
        <SalesAnalyticsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Сквозная аналитика продаж и спроса (Phase 3.5)')).toBeDefined();
    });

    const demandTab = screen.getByRole('button', { name: 'Спрос на квартиры' });
    fireEvent.click(demandTab);

    await waitFor(() => {
      expect(screen.getByText('Данные аналитики спроса временно недоступны')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Повторить запрос' })).toBeDefined();
      // Verifies that misleading empty unit rankings are not rendered
      expect(screen.queryByText('Самые востребованные квартиры')).toBeNull();
    });
  });

  it('displays informative empty state when demand state is SUCCESS_EMPTY', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/projects') return Promise.resolve({ data: [] });
      if (url === '/reports/sales-plan-fact') return Promise.resolve({ data: mockPlanFactData });
      if (url === '/reports/sales-funnel') return Promise.resolve({ data: mockFunnelData });
      if (url === '/reports/sales-managers') return Promise.resolve({ data: mockManagersData });
      if (url === '/reports/apartment-demand') {
        return Promise.resolve({
          data: {
            state: 'SUCCESS_EMPTY',
            isAvailable: true,
            message: null,
            summary: { totalInterestsCount: 0, uniqueBuyersCount: 0 },
            topDemandedUnits: [],
            demandByRooms: [],
            demandByFloors: [],
            demandByArea: [],
            demandByPrice: []
          }
        });
      }
      return Promise.resolve({ data: null });
    });

    render(
      <MemoryRouter>
        <SalesAnalyticsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Сквозная аналитика продаж и спроса (Phase 3.5)')).toBeDefined();
    });

    const demandTab = screen.getByRole('button', { name: 'Спрос на квартиры' });
    fireEvent.click(demandTab);

    await waitFor(() => {
      expect(screen.getByText('Интересы покупателей отсутствуют')).toBeDefined();
      expect(screen.queryByText('Данные аналитики спроса временно недоступны')).toBeNull();
    });
  });
});
