import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApartmentsPage } from '../ApartmentsPage';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('../ApartmentDetailModal', () => ({
  ApartmentDetailModal: ({ unitId, isOpen, onClose }) =>
    isOpen ? <div data-testid="apartment-detail-modal">Modal for unit {unitId}</div> : null,
}));

const mockProjects = [
  { id: 3, name: 'ЖК TOZON PLAZA', code: 'TP', currency: 'USD' },
];

const mockChessboard = [
  {
    id: 4,
    name: 'Блок А',
    sections: [
      {
        id: 4,
        name: 'Секция 1',
        floors: [
          {
            id: 10,
            floor_number: 2,
            units: [
              {
                id: 101,
                unit_number: '1',
                rooms: 1,
                area_m2_x100: 5898,
                price_per_m2_minor: 65000,
                manual_total_price_minor: null,
                status: 'AVAILABLE',
                layout_types: { id: 2, name: 'Блок А — тип 1 — 58.98 м²' },
              },
              {
                id: 102,
                unit_number: '2',
                rooms: 2,
                area_m2_x100: 7926,
                price_per_m2_minor: 68000,
                manual_total_price_minor: null,
                status: 'SOLD',
                layout_types: { id: 3, name: 'Блок А — тип 2 — 79.26 м²' },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'Блок Б',
    sections: [
      {
        id: 3,
        name: 'Секция 1',
        floors: [
          {
            id: 20,
            floor_number: 2,
            units: [
              {
                id: 201,
                unit_number: '9',
                rooms: 2,
                area_m2_x100: 6991,
                price_per_m2_minor: 65000,
                manual_total_price_minor: null,
                status: 'AVAILABLE',
                layout_types: { id: 9, name: 'Блок Б — тип 1 — 69.9100000000000000 м²' },
              },
              {
                id: 202,
                unit_number: '18',
                rooms: 2,
                area_m2_x100: 6991,
                price_per_m2_minor: 65000,
                manual_total_price_minor: null,
                status: 'RESERVED',
                layout_types: { id: 9, name: 'Блок Б — тип 1 — 69.9100000000000000 м²' },
              },
            ],
          },
          {
            id: 25,
            floor_number: 10,
            units: [
              {
                id: 280,
                unit_number: '80',
                rooms: 3,
                area_m2_x100: 8480,
                price_per_m2_minor: 70000,
                manual_total_price_minor: null,
                status: 'AVAILABLE',
                layout_types: { id: 18, name: 'Блок Б — 10 этаж — тип 1' },
              },
            ],
          },
        ],
      },
    ],
  },
];

describe('ApartmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/projects') {
        return Promise.resolve({ data: { projects: mockProjects } });
      }
      if (url.includes('/chessboard')) {
        return Promise.resolve({ data: { chessboard: mockChessboard } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all units and displays prices per m2 and total price', async () => {
    render(
      <MemoryRouter>
        <ApartmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Реестр квартир')).toBeDefined();
      expect(screen.getByText(/Кв\. №9/)).toBeDefined();
    });

    // Verify price columns are rendered
    expect(screen.getAllByText(/650\s*USD/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/45[,\s\u00a0]?442\s*USD/).length).toBeGreaterThan(0);
    // Total found = 5
    expect(screen.getByText('5')).toBeDefined();
  });

  it('filters units by building (e.g. Block B only)', async () => {
    render(
      <MemoryRouter>
        <ApartmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №1\b/)).toBeDefined();
      expect(screen.getByText(/Кв\. №9\b/)).toBeDefined();
    });

    const buildingSelect = screen.getByDisplayValue('Все корпуса (Блоки)');
    fireEvent.change(buildingSelect, { target: { value: 'Блок Б' } });

    // Block B has units 9, 18, 80; unit 1 is in Block A and should disappear
    expect(screen.queryByText(/Кв\. №1\b/)).toBeNull();
    expect(screen.getByText(/Кв\. №9\b/)).toBeDefined();
    expect(screen.getByText(/Кв\. №18\b/)).toBeDefined();
    expect(screen.getByText(/Кв\. №80\b/)).toBeDefined();
  });

  it('filters units by floor (e.g. Floor 10)', async () => {
    render(
      <MemoryRouter>
        <ApartmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №9\b/)).toBeDefined();
    });

    const floorSelect = screen.getByDisplayValue('Все этажи');
    fireEvent.change(floorSelect, { target: { value: '10' } });

    // Only unit 80 is on floor 10
    await waitFor(() => {
      expect(screen.queryByText(/Кв\. №9\b/)).toBeNull();
      expect(screen.getByText(/Кв\. №80\b/)).toBeDefined();
    });
  });

  it('filters units by status (e.g. AVAILABLE only)', async () => {
    render(
      <MemoryRouter>
        <ApartmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №18\b/)).toBeDefined(); // RESERVED
    });

    const statusSelect = screen.getByDisplayValue('Все статусы');
    fireEvent.change(statusSelect, { target: { value: 'AVAILABLE' } });

    // Unit 18 is RESERVED, Unit 2 is SOLD; both must not be visible
    await waitFor(() => {
      expect(screen.queryByText(/Кв\. №18\b/)).toBeNull();
      expect(screen.queryByText(/Кв\. №2\b/)).toBeNull();
      expect(screen.getByText(/Кв\. №9\b/)).toBeDefined();
    });
  });

  it('toggles advanced filters and filters by max budget', async () => {
    render(
      <MemoryRouter>
        <ApartmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №80\b/)).toBeDefined();
    });

    // Open advanced filters
    const paramsButton = screen.getByText('Параметры подбора');
    fireEvent.click(paramsButton);

    const budgetInput = screen.getByPlaceholderText('до 50 000 USD');
    // Set budget to 40 000 USD (Unit 1 is 58.98 * 650 = 38337 <= 40000, Unit 9 is 45442 > 40000)
    fireEvent.change(budgetInput, { target: { value: '40000' } });

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №1\b/)).toBeDefined();
      expect(screen.queryByText(/Кв\. №9\b/)).toBeNull();
      expect(screen.queryByText(/Кв\. №80\b/)).toBeNull();
    });
  });

  it('resets all active filters when reset button is clicked', async () => {
    render(
      <MemoryRouter>
        <ApartmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №9\b/)).toBeDefined();
    });

    const statusSelect = screen.getByDisplayValue('Все статусы');
    fireEvent.change(statusSelect, { target: { value: 'SOLD' } });

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №2\b/)).toBeDefined();
      expect(screen.queryByText(/Кв\. №9\b/)).toBeNull();
    });

    const resetButton = screen.getByTitle('Сбросить все фильтры');
    fireEvent.click(resetButton);

    // All units visible again
    await waitFor(() => {
      expect(screen.getByText(/Кв\. №9\b/)).toBeDefined();
      expect(screen.getByText(/Кв\. №2\b/)).toBeDefined();
    });
  });
});
