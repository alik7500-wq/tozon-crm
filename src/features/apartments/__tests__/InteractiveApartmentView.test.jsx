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
    expect(screen.getByRole('button', { name: 'Показать 360°-тур' }).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Виртуальный тур 360°' })).toBeNull();
  });

  it('replaces the 3D model tab with a working tour for the same layout', async () => {
    renderTour({ ...apartmentTour, entity_id: 83, presentation_scope: 'LAYOUT',
      presentation_unit_id: 201, presentation_layout_id: 9, source_unit_number: '7' });
    fireEvent.click(await screen.findByRole('button', { name: 'Показать 360°-тур' }));
    expect(await screen.findByTestId('apartment-tour')).toBeDefined();
    expect(screen.getByText('Образец такой же планировки из квартиры №7')).toBeDefined();
    expect(screen.queryByRole('button', { name: '3D-модель' })).toBeNull();
  });

  it.each([
    { presentation_unit_id: 202, presentation_layout_id: 9 },
    { presentation_unit_id: 201, presentation_layout_id: 11 },
  ])('rejects a layout tour scoped to another apartment or layout: %j', async scope => {
    renderTour({ ...apartmentTour, entity_id: 83, presentation_scope: 'LAYOUT', ...scope });
    await screen.findByText('Требуется утверждённая планировка');
    expect(screen.getByRole('button', { name: 'Показать 360°-тур' }).disabled).toBe(true);
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
  it('shows a described room and its marker without inventing an unknown area', async()=>{
    localStorage.setItem('tozon_lang','ru');
    api.get.mockResolvedValue({data:{data:{...mockPresentation,layout:{id:28,furnished_plan_path:'/plan.png'},images:[{type:'furnished_plan',url:'/plan.png'}],rooms:[{id:100,room_number:1,name_ru:'Гостиная',description_ru:'Отдельная общая комната.',area:null,position_x_percent:45,position_y_percent:60}]}}});
    render(<I18nProvider><InteractiveApartmentView unitId={201}/></I18nProvider>);
    expect(await screen.findByText('Площадь уточняется')).toBeDefined();
    expect(screen.getByText('Отдельная общая комната.')).toBeDefined();
    expect(screen.getAllByText('1').length).toBe(2);
    expect(screen.queryByText('0 м²')).toBeNull();
  });

});
