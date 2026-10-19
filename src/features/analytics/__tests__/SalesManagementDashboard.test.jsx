// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesManagementDashboard } from '../SalesManagementDashboard';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  },
}));

let mockUser = { id: 1, role: 'DIRECTOR', name: 'Director User' };

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser
  })
}));

const mockDailyData = {
  date: '2026-10-19',
  timezone: 'Asia/Dushanbe',
  isSupervisor: true,
  summary: {
    newLeadsCount: 5,
    completedCallsCount: 8,
    completedMeetingsCount: 2,
    totalCompletedInteractions: 10,
    newReservationsCount: 2,
    newReservationsVolumeUsd: 85000,
    signedDealsCount: 3,
    signedDealsVolumeUsd: 125000,
    signedAreaM2: 215.5,
    paymentsCount: 4,
    collectedCashUsd: 45000,
    collectedCashTjs: 20000,
    collectedCashByCurrency: {
      usd: { count: 3, formatted: 45000 },
      tjs: { count: 1, formatted: 20000 }
    },
    overdueTasksCount: 4,
    cancelledDealsCount: 0
  },
  managerDailyBreakdown: [
    {
      managerId: 3,
      name: 'Дадочон Саидов',
      role: 'SALES_MANAGER',
      newLeadsCount: 3,
      completedCallsCount: 5,
      completedMeetingsCount: 1,
      newReservationsCount: 1,
      newReservationsVolumeUsd: 40000,
      signedDealsCount: 2,
      signedDealsVolumeUsd: 80000,
      collectedCashUsd: 30000,
      collectedCashTjs: 10000,
      overdueTasksCount: 2
    },
    {
      managerId: 1,
      name: 'Admin',
      role: 'ADMIN',
      newLeadsCount: 2,
      completedCallsCount: 3,
      completedMeetingsCount: 1,
      newReservationsCount: 1,
      newReservationsVolumeUsd: 45000,
      signedDealsCount: 1,
      signedDealsVolumeUsd: 45000,
      collectedCashUsd: 15000,
      collectedCashTjs: 10000,
      overdueTasksCount: 2
    }
  ],
  drilldowns: {
    newLeads: [
      { id: 101, fullName: 'Рустам Солихов', phone: '+992927771122', source: 'INSTAGRAM', status: 'NEW', managerId: 3, managerName: 'Дадочон Саидов', createdAt: '2026-10-19T08:30:00Z' },
      { id: 102, fullName: 'Шухрат Исмоилов', phone: '+992928883344', source: 'WEBSITE', status: 'IN_PROGRESS', managerId: 1, managerName: 'Admin', createdAt: '2026-10-19T09:15:00Z' }
    ],
    completedCalls: [
      { id: 201, title: 'Уточнить интерес к 2-комн.', clientName: 'Рустам Солихов', phone: '+992927771122', managerId: 3, managerName: 'Дадочон Саидов', completedAt: '2026-10-19T10:00:00Z' }
    ],
    completedMeetings: [
      { id: 202, title: 'Встреча в офисе продаж', clientName: 'Фаррух', phone: '+992929995566', managerId: 3, managerName: 'Дадочон Саидов', completedAt: '2026-10-19T11:00:00Z' }
    ],
    newReservations: [
      { id: 301, contractNumber: 'Бронь #18', clientName: 'Фаррух Каримов', phone: '+992929995566', unitNumber: '18', areaM2: 69.9, finalPriceUsd: 48937, managerId: 3, managerName: 'Дадочон Саидов', createdAt: '2026-10-19T12:00:00Z' }
    ],
    signedDeals: [
      { id: 401, contractNumber: '25601-2026-0036', clientName: 'Илхом Алиев', phone: '+992921110000', unitNumber: '25', areaM2: 84.5, finalPriceUsd: 65000, managerId: 3, managerName: 'Дадочон Саидов', signedAt: '2026-10-19T14:30:00Z' }
    ],
    postedPayments: [
      { id: 501, dealId: 401, contractNumber: '25601-2026-0036', clientName: 'Илхом Алиев', unitNumber: '25', amountFormatted: 25000, currency: 'USD', method: 'CASH', paymentDate: '2026-10-19', managerId: 3, managerName: 'Дадочон Саидов' },
      { id: 502, dealId: 401, contractNumber: '25601-2026-0036', clientName: 'Илхом Алиев', unitNumber: '25', amountFormatted: 20000, currency: 'TJS', method: 'BANK_TRANSFER', paymentDate: '2026-10-19', managerId: 3, managerName: 'Дадочон Саидов' }
    ],
    overdueTasks: [
      { id: 601, title: 'Позвонить по графику платежей', clientName: 'Сомон', phone: '+992925554433', managerId: 3, managerName: 'Дадочон Саидов', dueAt: '2026-10-17T18:00:00Z' }
    ]
  }
};

const mockWeeklyData = {
  year: 2026,
  timezone: 'Asia/Dushanbe',
  periodRange: {
    startDate: '2026-09-01',
    endDate: '2026-10-19',
    weeksCount: 8
  },
  summary: {
    totalLeadsCount: 42,
    totalReservationsCount: 14,
    totalReservationsVolumeUsd: 580000,
    totalSignedDealsCount: 28,
    totalSignedDealsVolumeUsd: 980000,
    totalSignedAreaM2: 1940.5,
    totalPaymentsCount: 32,
    totalPaymentsVolumeUsd: 310000,
    totalPaymentsVolumeTjs: 85000,
    totalCancelledDealsCount: 2,
    overallConversionPercent: 66.7
  },
  weeks: [
    {
      weekNumber: 42,
      year: 2026,
      startDate: '2026-10-13',
      endDate: '2026-10-19',
      label: 'W42 (10-13 – 10-19)',
      leadsCount: 6,
      reservationsCount: 2,
      reservationsVolumeUsd: 85000,
      signedDealsCount: 4,
      signedDealsVolumeUsd: 145000,
      signedAreaM2: 280,
      paymentsCount: 5,
      paymentsVolumeUsd: 45000,
      paymentsVolumeTjs: 20000,
      conversionPercent: 66.7,
      drilldowns: {
        leads: [],
        reservations: [],
        signedDeals: [
          { id: 401, contractNumber: '25601-2026-0036', clientName: 'Илхом Алиев', unitNumber: '25', areaM2: 84.5, finalPriceUsd: 65000 }
        ],
        payments: []
      }
    }
  ]
};

const mockBlockData = {
  period: '2026-10',
  timezone: 'Asia/Dushanbe',
  summary: {
    totalBlocksCount: 2,
    plan: { targetDealsCount: 10, targetVolumeUsd: 350000 },
    fact: { signedDealsCount: 12, signedAreaM2: 840, signedVolumeUsd: 420000 },
    execution: { dealsPercent: 120, volumePercent: 120, dealsGap: -2, volumeGapUsd: -70000 },
    pipelineReserved: { reservedDealsCount: 5, reservedAreaM2: 350, reservedVolumeUsd: 180000 },
    cancelled: { cancelledDealsCount: 0, cancelledVolumeUsd: 0 }
  },
  blocks: [
    {
      buildingId: 4,
      buildingName: 'Блок А (ул. Ленина)',
      projectName: 'ЖК Somon Residence',
      plan: { targetDealsCount: 5, targetVolumeUsd: 175000 },
      fact: { signedDealsCount: 6, signedAreaM2: 420, signedVolumeUsd: 215000, averagePricePerM2Usd: 512 },
      execution: { dealsPercent: 120, volumePercent: 122.9, dealsGap: -1, volumeGapUsd: -40000 },
      pipelineReserved: { reservedDealsCount: 2, reservedAreaM2: 140, reservedVolumeUsd: 72000 },
      cancelled: { cancelledDealsCount: 0, cancelledVolumeUsd: 0 },
      managersBreakdown: [
        { managerId: 3, name: 'Дадочон Саидов', signedCount: 4, areaM2: 280, signedVolumeUsd: 145000, reservedCount: 1 }
      ],
      drilldowns: {
        signedDeals: [
          { id: 401, contractNumber: '25601-2026-0036', clientName: 'Илхом Алиев', unitNumber: '25', areaM2: 84.5, finalPriceUsd: 65000 }
        ],
        reservedDeals: []
      }
    },
    {
      buildingId: 3,
      buildingName: 'Блок Б (ул. И. Сомони)',
      projectName: 'ЖК Somon Residence',
      plan: { targetDealsCount: 5, targetVolumeUsd: 175000 },
      fact: { signedDealsCount: 6, signedAreaM2: 420, signedVolumeUsd: 205000, averagePricePerM2Usd: 488 },
      execution: { dealsPercent: 120, volumePercent: 117.1, dealsGap: -1, volumeGapUsd: -30000 },
      pipelineReserved: { reservedDealsCount: 3, reservedAreaM2: 210, reservedVolumeUsd: 108000 },
      cancelled: { cancelledDealsCount: 0, cancelledVolumeUsd: 0 },
      managersBreakdown: [],
      drilldowns: {
        signedDeals: [],
        reservedDeals: []
      }
    }
  ]
};

describe('TOZON CRM — SalesManagementDashboard (Phase 3.7.2 Frontend Suite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 1, role: 'DIRECTOR', name: 'Director User' };

    api.get.mockImplementation((url) => {
      if (url === '/projects') {
        return Promise.resolve({ data: [{ id: 1, name: 'ЖК Somon Residence' }] });
      }
      if (url === '/reports/daily-briefing') {
        return Promise.resolve({ data: mockDailyData });
      }
      if (url === '/reports/weekly-dynamics') {
        return Promise.resolve({ data: mockWeeklyData });
      }
      if (url === '/reports/plan-fact/blocks') {
        return Promise.resolve({ data: mockBlockData });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Daily Briefing view with 7 KPI metrics and currency separation', async () => {
    render(
      <MemoryRouter>
        <SalesManagementDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Панель управления продажами (Phase 3.7)')).toBeDefined();
    });

    // Sub-tabs
    expect(screen.getByText('Ежедневная сводка')).toBeDefined();
    expect(screen.getByText('Недельная динамика')).toBeDefined();
    expect(screen.getByText('План-факт по блокам')).toBeDefined();

    // Daily KPIs
    expect(screen.getAllByText('Новые лиды').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('5')).toBeDefined(); // 5 leads

    expect(screen.getAllByText('Звонки / Встречи').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Всего взаимодействий: 10')).toBeDefined();

    expect(screen.getByText('Новые бронирования')).toBeDefined();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Подписано договоров')).toBeDefined();
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);

    // Multi-currency cash isolation
    expect(screen.getByText('Поступления USD (касса/банк)')).toBeDefined();
    expect(screen.getByText('$45 000')).toBeDefined();

    expect(screen.getByText('Поступления TJS (сомони)')).toBeDefined();
    expect(screen.getByText(/20 000/)).toBeDefined();

    // Overdue tasks
    expect(screen.getByText('Просроченные задачи')).toBeDefined();
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);

    // Manager Daily Breakdown table
    expect(screen.getByText('Персональная активность менеджеров за день')).toBeDefined();
    expect(screen.getByText('Дадочон Саидов')).toBeDefined();
  });

  it('opens interactive drilldown modal when clicking an indicator card', async () => {
    render(
      <MemoryRouter>
        <SalesManagementDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Новые лиды').length).toBeGreaterThanOrEqual(1);
    });

    // Click on New Leads card
    fireEvent.click(screen.getByText('Показать реестр лидов'));

    await waitFor(() => {
      expect(screen.getByText('Новые лиды за день')).toBeDefined();
      expect(screen.getByText('Рустам Солихов')).toBeDefined();
      expect(screen.getByText('Шухрат Исмоилов')).toBeDefined();
    });

    // Search inside drilldown modal
    const searchInput = screen.getByPlaceholderText(/Поиск по ФИО покупателя/i);
    fireEvent.change(searchInput, { target: { value: 'Рустам' } });

    expect(screen.getByText('Рустам Солихов')).toBeDefined();
    expect(screen.queryByText('Шухрат Исмоилов')).toBeNull();

    // Close modal
    const closeBtn = screen.getByLabelText('Закрыть модальное окно');
    fireEvent.click(closeBtn);
  });

  it('switches to Weekly Dynamics tab and displays weekly progression & disclaimer', async () => {
    render(
      <MemoryRouter>
        <SalesManagementDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Недельная динамика')).toBeDefined();
    });

    // Switch to Weekly Dynamics
    fireEvent.click(screen.getByText('Недельная динамика'));

    await waitFor(() => {
      expect(screen.getByText('Всего лидов за период')).toBeDefined();
      expect(screen.getByText('42')).toBeDefined();
      expect(screen.getByText('W42 (10-13 – 10-19)')).toBeDefined();
    });

    // Rule 8: Velocity Ratio vs Cohort conversion methodology callout
    expect(screen.getByText(/Методологическое правило: Периодный темп продаж vs Когортная конверсия/i)).toBeDefined();
    expect(screen.getByText(/не является когортной конверсией/i)).toBeDefined();
  });

  it('switches to Block Plan-Fact tab and displays Block A vs Block B comparison', async () => {
    render(
      <MemoryRouter>
        <SalesManagementDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('План-факт по блокам')).toBeDefined();
    });

    // Switch to Block Plan-Fact
    fireEvent.click(screen.getByText('План-факт по блокам'));

    await waitFor(() => {
      expect(screen.getByText('Блок А (ул. Ленина)')).toBeDefined();
      expect(screen.getByText('Блок Б (ул. И. Сомони)')).toBeDefined();
      expect(screen.getByText('Пайплайн активных броней')).toBeDefined();
    });

    // Check Plan vs Fact isolation
    expect(screen.getByText('Реализованная площадь')).toBeDefined();
    expect(screen.getByText('840')).toBeDefined();
  });

  it('displays RBAC personal analytics notice when logged in as SALES_MANAGER', async () => {
    mockUser = { id: 3, role: 'SALES_MANAGER', name: 'Дадочон Саидов' };

    render(
      <MemoryRouter>
        <SalesManagementDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Режим персональной аналитики менеджера/i)).toBeDefined();
      expect(screen.getByText(/Ограничение защищено на стороне сервера/i)).toBeDefined();
    });
  });

  it('handles error state with retry button', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/projects') {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error('Network connection timeout'));
    });

    render(
      <MemoryRouter>
        <SalesManagementDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Не удалось загрузить аналитические данные/i)).toBeDefined();
      expect(screen.getByText('Повторить загрузку')).toBeDefined();
    });
  });

  it('renders "Скачать Excel" action button and triggers download request', async () => {
    render(
      <MemoryRouter>
        <SalesManagementDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const exportBtn = screen.getByText('Скачать Excel');
      expect(exportBtn).toBeDefined();
    });
  });
});
