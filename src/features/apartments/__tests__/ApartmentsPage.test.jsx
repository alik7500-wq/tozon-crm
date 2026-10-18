// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApartmentsPage } from '../ApartmentsPage';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  },
}));

vi.mock('../ApartmentDetailModal', () => ({
  ApartmentDetailModal: ({ unitId, isOpen, onClose }) =>
    isOpen ? <div data-testid="apartment-detail-modal">Modal for unit {unitId}</div> : null,
}));

vi.mock('../ReserveApartmentModal', () => ({
  ReserveApartmentModal: ({ unit, isOpen, onClose }) =>
    isOpen ? <div data-testid="reserve-modal">Reserve modal for unit {unit?.unit_number}</div> : null,
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
                layout_types: { id: 2, name: 'Блок А — тип 1 — 58.98 м²', image_path: '/plan1.png' },
              },
              {
                id: 102,
                unit_number: '2',
                rooms: 2,
                area_m2_x100: 7926,
                price_per_m2_minor: 68000,
                manual_total_price_minor: null,
                status: 'SOLD',
                layout_types: { id: 3, name: 'Блок А — тип 2 — 79.26 м²', image_path: '/plan2.png' },
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
                layout_types: { id: 9, name: 'Блок Б — тип 1 — 69.91 м²', image_path: '/layouts/block_b/catalog/block_b_typical_type_01_69_91m2_3d.png' },
              },
              {
                id: 202,
                unit_number: '18',
                rooms: 2,
                area_m2_x100: 6991,
                price_per_m2_minor: 65000,
                manual_total_price_minor: null,
                status: 'RESERVED',
                layout_types: { id: 9, name: 'Блок Б — тип 1 — 69.91 м²', image_path: '/layouts/block_b/catalog/block_b_typical_type_01_69_91m2_3d.png' },
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
                layout_types: { id: 18, name: 'Блок Б — 10 этаж — тип 1', image_path: '/layouts/block_b/catalog/block_b_penthouse_type_01_84_80m2_unit_80_3d.png' },
              },
            ],
          },
        ],
      },
    ],
  },
];

describe('ApartmentsPage — Smart Selection, Comparison & Lead Interests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/projects') {
        return Promise.resolve({ data: { projects: mockProjects } });
      }
      if (url.includes('/chessboard')) {
        return Promise.resolve({ data: { chessboard: mockChessboard } });
      }
      if (url === '/leads') {
        return Promise.resolve({
          data: {
            leads: [
              { id: 10, full_name: 'Акмал Каримов', phone: '+992927778899', status: 'IN_PROGRESS' }
            ]
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders smart selection header and shows only AVAILABLE units by default', async () => {
    render(
      <MemoryRouter>
        <ApartmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Умный подбор и каталог квартир')).toBeDefined();
      expect(screen.getByText(/Кв\. №9/)).toBeDefined();
    });

    // Units 1, 9, 80 are AVAILABLE, while 2 (SOLD) and 18 (RESERVED) are filtered out by default
    expect(screen.getByText(/Кв\. №1\b/)).toBeDefined();
    expect(screen.getByText(/Кв\. №9\b/)).toBeDefined();
    expect(screen.getByText(/Кв\. №80\b/)).toBeDefined();
    expect(screen.queryByText(/Кв\. №2\b/)).toBeNull();
    expect(screen.queryByText(/Кв\. №18\b/)).toBeNull();
  });

  it('shows all units when status filter is set to "Все статусы"', async () => {
    render(
      <MemoryRouter>
        <ApartmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №9/)).toBeDefined();
    });

    const statusSelect = screen.getByDisplayValue('Свободные (AVAILABLE)');
    fireEvent.change(statusSelect, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №2\b/)).toBeDefined(); // SOLD
      expect(screen.getByText(/Кв\. №18\b/)).toBeDefined(); // RESERVED
    });
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

    // Block B has units 9, 80 (and 18 if all); unit 1 is in Block A and should disappear
    expect(screen.queryByText(/Кв\. №1\b/)).toBeNull();
    expect(screen.getByText(/Кв\. №9\b/)).toBeDefined();
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

  it('allows selecting up to 4 apartments for comparison and opens comparison modal', async () => {
    render(
      <MemoryRouter>
        <ApartmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №9\b/)).toBeDefined();
    });

    // Checkboxes for units
    const compareCheckboxes = screen.getAllByRole('checkbox');
    expect(compareCheckboxes.length).toBeGreaterThanOrEqual(2);

    // Select first two units
    fireEvent.click(compareCheckboxes[0]);
    fireEvent.click(compareCheckboxes[1]);

    // Bottom dock should appear
    await waitFor(() => {
      expect(screen.getByText(/Сравнение квартир \(2 из 4\)/)).toBeDefined();
      expect(screen.getByText(/Сравнить \(2\) →/)).toBeDefined();
    });

    // Open comparison modal
    const compareBtn = screen.getByText(/Сравнить \(2\) →/).closest('button');
    fireEvent.click(compareBtn);

    await waitFor(() => {
      expect(screen.getByText('Различия подсвечены')).toBeDefined();
    });
  });

  it('opens SaveLeadInterestModal when "Интерес лида" is clicked', async () => {
    render(
      <MemoryRouter>
        <ApartmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №9\b/)).toBeDefined();
    });

    const interestBtns = screen.getAllByRole('button', { name: /Интерес лида/i });
    expect(interestBtns.length).toBeGreaterThan(0);

    fireEvent.click(interestBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Зафиксировать интерес клиента')).toBeDefined();
      expect(screen.getByText('Приоритет интереса')).toBeDefined();
      expect(screen.getByText('Высокий (Топ)')).toBeDefined();
      expect(screen.getByText('Дата следующего контакта')).toBeDefined();
    });
  });

  it('toggles between Cards view and Table view', async () => {
    render(
      <MemoryRouter>
        <ApartmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Кв\. №9\b/)).toBeDefined();
    });

    const tableModeBtn = screen.getByTitle('Табличный реестр');
    fireEvent.click(tableModeBtn);

    // Table headers should now be visible
    await waitFor(() => {
      expect(screen.getByText('Корпус / Секция')).toBeDefined();
      expect(screen.getByText('Комнат')).toBeDefined();
      expect(screen.getByText('Общая стоимость')).toBeDefined();
    });

    const cardsModeBtn = screen.getByTitle('Режим карточек с планировками');
    fireEvent.click(cardsModeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Корпус / Секция')).toBeNull();
    });
  });
});
