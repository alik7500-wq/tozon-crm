// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesControlPanel } from '../SalesControlPanel';
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
    user: { id: 1, role: 'DIRECTOR', name: 'Director User' }
  })
}));

const mockControlData = {
  timestamp: new Date().toISOString(),
  userRole: 'DIRECTOR',
  isSupervisor: true,
  summary: {
    unassignedLeadsCount: 3,
    noContactLeadsCount: 2,
    overdueTasksCount: 4,
    staleLeadsCount: 5,
    expiringReservationsCount: 1,
    highWorkloadManagersCount: 1
  },
  drilldowns: {
    unassignedLeads: [
      { id: 101, fullName: 'Сомон Нозимов', phone: '+992920001122', source: 'WEBSITE', workingMinutesInPool: 25, isOverduePool: true }
    ],
    noContactLeads: [
      { id: 102, fullName: 'Фаррух Каримов', phone: '+992921112233', managerName: 'Алиджон', workingMinutesElapsed: 18, isOverdue: true, overdueMinutes: 3 }
    ],
    overdueTasks: [
      { id: 201, title: 'Звонок по брони', type: 'CALL', clientName: 'Далер', phone: '+992923334455', managerName: 'Алиджон', dueDate: '2026-10-15', daysOverdue: 3 }
    ],
    staleLeads: [
      { id: 103, fullName: 'Манижа Саидова', phone: '+992924445566', status: 'IN_PROGRESS', managerName: 'Фаррух', hoursInactive: 55 }
    ],
    expiringReservations: [
      { id: 55, contractNumber: 'Бронь #55', unitNumber: '14', projectName: 'TOZON PLAZA', clientName: 'Илхом', managerName: 'Алиджон', hoursUntilExpiry: 12, isExpired: false }
    ],
    managerWorkloads: [
      { id: 2, name: 'Алиджон', openLeadsCount: 22, capacityLimit: 25, capacityUtilizationPercent: 88, overdueTasksCount: 1, isExcluded: false, status: 'HIGH_LOAD' }
    ]
  }
};

const mockSettingsData = {
  settings: {
    enabled: false,
    algorithm: 'LEAST_LOADED',
    maxOpenLeadsPerRep: 25,
    excludedUserIds: []
  },
  eligibleReps: [
    { id: 2, name: 'Алиджон', openLeadsCount: 22 }
  ]
};

describe('TOZON CRM — SalesControlPanel (Phase 3.6 Frontend Component)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all 6 supervisor indicator cards with accurate counts', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/reports/sales-control') return Promise.resolve({ data: mockControlData });
      if (url === '/leads/distribution/settings') return Promise.resolve({ data: mockSettingsData });
      if (url === '/leads/winback/opportunities') return Promise.resolve({ data: { opportunities: [] } });
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SalesControlPanel />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Панель оперативного контроля продаж (Phase 3.6)')).toBeDefined();
    });

    // Metric 1: Unassigned Leads
    expect(screen.getByText('Пул заявок')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();

    // Metric 2: 15 min SLA
    expect(screen.getByText('15 мин SLA')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();

    // Metric 3: Overdue Tasks
    expect(screen.getByText('Задачи')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();

    // Metric 4: Stale Leads >48h
    expect(screen.getByText('>48 часов')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();

    // Metric 5: Expiring Reservations
    expect(screen.getByText('Бронь')).toBeDefined();
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);

    // Metric 6: Workload
    expect(screen.getByText('Нагрузка')).toBeDefined();
  });

  it('clicking indicator cards switches drill-down dataset views', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/reports/sales-control') return Promise.resolve({ data: mockControlData });
      if (url === '/leads/distribution/settings') return Promise.resolve({ data: mockSettingsData });
      if (url === '/leads/winback/opportunities') return Promise.resolve({ data: { opportunities: [] } });
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SalesControlPanel />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Сомон Нозимов')).toBeDefined();
    });

    // Click on 15 min SLA tab
    fireEvent.click(screen.getByRole('button', { name: /Нарушение 15-мин SLA/i }));

    await waitFor(() => {
      expect(screen.getByText('Фаррух Каримов')).toBeDefined();
      expect(screen.getByText(/Просрочено на \+3 мин/i)).toBeDefined();
    });
  });

  it('opens and interacts with distribution settings modal', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/reports/sales-control') return Promise.resolve({ data: mockControlData });
      if (url === '/leads/distribution/settings') return Promise.resolve({ data: mockSettingsData });
      if (url === '/leads/winback/opportunities') return Promise.resolve({ data: { opportunities: [] } });
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <SalesControlPanel />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Настройка правил')).toBeDefined();
    });

    // Click on settings button
    fireEvent.click(screen.getByText('Настройка правил'));

    await waitFor(() => {
      expect(screen.getByText('Настройки авто-распределения')).toBeDefined();
      expect(screen.getByText('Наименее загруженному')).toBeDefined();
      expect(screen.getByText('По кругу (Round-Robin)')).toBeDefined();
    });
  });
});
