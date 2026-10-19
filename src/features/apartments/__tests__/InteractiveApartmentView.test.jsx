import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { InteractiveApartmentView } from '../components/InteractiveApartmentView';
import { I18nProvider } from '../../../context/i18nContext';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('../../tour360/components/Tour360Viewer', () => ({
  Tour360Viewer: ({ initialTourId, projectId, onBack }) => (
    <div data-testid="apartment-tour" data-tour-id={initialTourId} data-project-id={projectId}>
      <button onClick={onBack}>Назад к планировке</button>
    </div>
  ),
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

  const apartmentTour = { id: 30, project_id: 3, entity_type: 'UNIT', entity_id: 201,
    is_active: true, tour_type: 'SHOWROOM', name: 'Тур квартиры №9' };

  function renderTour(tour = apartmentTour) {
    localStorage.setItem('tozon_lang', 'ru');
    api.get.mockResolvedValue({ data: { data: { ...mockPresentation, tour360: tour } } });
    return render(<I18nProvider><InteractiveApartmentView unitId={201} /></I18nProvider>);
  }

  it('opens the assigned tour directly from the apartment card and returns to the plan', async () => {
    renderTour();
    fireEvent.click(await screen.findByRole('button', { name: 'Показать 360°-тур' }));
    const viewer = await screen.findByTestId('apartment-tour');
    expect(viewer.getAttribute('data-tour-id')).toBe('30');
    expect(viewer.getAttribute('data-project-id')).toBe('3');
    expect(viewer.parentElement.className).not.toContain('h-[500px]');
    fireEvent.click(screen.getByRole('button', { name: 'Назад к планировке' }));
    expect(await screen.findByRole('button', { name: 'Показать 360°-тур' })).toBeDefined();
    expect(screen.queryByTestId('apartment-tour')).toBeNull();
  });

  it.each([
    { ...apartmentTour, entity_id: 83 },
    { ...apartmentTour, entity_type: 'BUILDING' },
    { ...apartmentTour, is_active: false },
    null,
  ])('does not offer a different apartment, building or draft tour: %j', async tour => {
    renderTour(tour);
    await screen.findByText('Требуется утверждённая планировка');
    expect(screen.queryByRole('button', { name: 'Показать 360°-тур' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Виртуальный тур 360°' })).toBeNull();
  });

  it('resets presentation mode when the manager switches apartments', async () => {
    const view = renderTour();
    fireEvent.click(await screen.findByRole('button', { name: 'Показать 360°-тур' }));
    await screen.findByTestId('apartment-tour');
    api.get.mockResolvedValue({ data: { data: { ...mockPresentation, unit: { ...mockPresentation.unit, id: 202 },
      tour360: { ...apartmentTour, id: 31, entity_id: 202 } } } });
    view.rerender(<I18nProvider><InteractiveApartmentView unitId={202} /></I18nProvider>);
    expect(await screen.findByRole('button', { name: 'Показать 360°-тур' })).toBeDefined();
    expect(screen.queryByTestId('apartment-tour')).toBeNull();
  });
});
