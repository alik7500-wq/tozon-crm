import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { InteractiveApartmentView } from '../components/InteractiveApartmentView';
import { I18nProvider } from '../../../context/i18nContext';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('InteractiveApartmentView', () => {
  const mockPresentation = {
    unit: {
      id: 201,
      unit_number: '9',
      floor_number: 2,
      rooms: 2,
      area_m2_x100: 6991,
      price_per_m2_minor: 65000,
      status: 'AVAILABLE',
      building_name: 'Блок Б',
      section_name: 'Секция 1',
      layout_types: {
        id: 9,
        name: 'Блок Б — тип 1 — 69.91 м²',
        furnished_plan_path: null,
        technical_plan_path: null,
        image_path: null,
        ceiling_height: 3.15,
        living_area_m2_x100: 3824,
        kitchen_area_m2_x100: 1250,
      },
    },
    rooms: [
      { id: 1, name: 'Гостиная', name_tg: 'Меҳмонхона', area_m2_x100: 2200 },
      { id: 2, name: 'Спальня', name_tg: 'Ҳуҷраи хоб', area_m2_x100: 1624 },
    ],
    features: [
      { id: 1, title: 'Высокие потолки 3.15м', title_tg: 'Шифти баланд 3.15м' },
    ],
    images: [],
    model3d: null,
    tour360: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes('/presentation')) {
        return Promise.resolve({ data: { data: mockPresentation } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders "Требуется утверждённая планировка" badge when no plan image exists in Russian', async () => {
    localStorage.setItem('tozon_lang', 'ru');

    render(
      <I18nProvider>
        <InteractiveApartmentView unitId={201} currency="USD" />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Требуется утверждённая планировка')).toBeDefined();
    });

    expect(screen.getByText('Архитектурный чертёж на стадии утверждения')).toBeDefined();
    expect(
      screen.getByText(/Официальный архитектурный план и экспликация данного типа квартиры находятся на утверждении/i)
    ).toBeDefined();

    expect(screen.getByText(/69,91\s*м²|69\.91\s*м²/)).toBeDefined();
  });

  it('renders "Нақшаи тасдиқшуда талаб карда мешавад" badge when no plan image exists in Tajik', async () => {
    localStorage.setItem('tozon_lang', 'tg');

    render(
      <I18nProvider>
        <InteractiveApartmentView unitId={201} currency="USD" />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Нақшаи тасдиқшуда талаб карда мешавад')).toBeDefined();
    });

    expect(screen.getByText('Нақшаи меъморӣ дар марҳилаи тасдиқ')).toBeDefined();
    expect(
      screen.getByText(/Нақшаи расмии меъморӣ ва тавсифи хонаҳо барои ин навъи манзил дар марҳилаи тасдиқ қарор дорад/i)
    ).toBeDefined();
  });
});
