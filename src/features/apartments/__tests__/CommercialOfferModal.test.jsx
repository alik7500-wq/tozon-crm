// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CommercialOfferModal } from '../components/CommercialOfferModal';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      full_name: 'Акмалхон Абдуллоев',
      role: 'SALES_MANAGER',
    },
  }),
}));

vi.mock('../../../hooks/useModalDismiss', () => ({
  useModalDismiss: ({ onClose }) => ({ requestClose: onClose }),
}));

// Mock data for Apartment №1 (54.58 m², 1-room, Floor 2, $700/m²)
const mockUnit1 = {
  id: 89,
  project_id: 3,
  unit_number: '1',
  status: 'AVAILABLE',
  rooms: 1,
  area_m2_x100: 5458,
  price_per_m2_minor: 70000, // $700.00
  floor_number: 2,
  building_name: 'Блок Б',
  project_name: 'ЖК TOZON PLAZA',
  layout_types: {
    id: 17,
    name: 'Блок Б — тип 9 — 54.58 м²',
    name_tg: 'Манзили 1-ҳуҷрагӣ — 54.58 м²',
    code: 'CEILING315-B-9',
    technical_plan_path: '/layouts/block_b/catalog/block_b_typical_type_09_54_58m2_2d.png',
    furnished_plan_path: '/layouts/block_b/catalog/block_b_typical_type_09_54_58m2_3d.png',
  },
};

const mockPresentation1 = {
  unit: mockUnit1,
  layout: mockUnit1.layout_types,
  rooms: [
    { id: 1, room_number: 1, name_ru: 'Гостиная', name_tg: 'Меҳмонхона', area: 22.0 },
    { id: 2, room_number: 2, name_ru: 'Кухня', name_tg: 'Ошхона', area: 15.96 },
    { id: 3, room_number: 3, name_ru: 'Прихожая', name_tg: 'Долон', area: 9.97 },
    { id: 4, room_number: 4, name_ru: 'Ванная', name_tg: 'Ҳаммом', area: 4.45 },
  ],
};

// Mock data for Apartment №80 (84.80 m², 3-room penthouse, Floor 10, $650/m²)
const mockUnit80 = {
  id: 153,
  project_id: 3,
  unit_number: '80',
  status: 'AVAILABLE',
  rooms: 3,
  area_m2_x100: 8480,
  price_per_m2_minor: 65000, // $650.00
  floor_number: 10,
  building_name: 'Блок Б',
  project_name: 'ЖК TOZON PLAZA',
  layout_types: {
    id: 18,
    name: 'Блок Б — 10 этаж — тип 1',
    name_tg: 'Манзили 3-ҳуҷрагӣ — 84.8 м²',
    code: 'CEILING315-10-B-1',
    technical_plan_path: '/layouts/block_b/catalog/block_b_penthouse_type_01_84_80m2_unit_80_2d.png',
    furnished_plan_path: '/layouts/block_b/catalog/block_b_penthouse_type_01_84_80m2_unit_80_3d.png',
    description_ru: '3-комнатный угловой пентхаус на 10 этаже с панорамной террасой.',
    description_tg: 'Манзили 3-ҳуҷрагии кунҷӣ дар ошиёнаи 10 бо айвони панорамӣ.',
  },
};

const mockCompanySettings = {
  data: {
    company: {
      company_name: 'ООО "Тозон"',
      company_phone: '+992999333000',
      branch_name: 'ТОЗОН ПЛАЗА',
      company_address: 'г. Худжанд, ул. Б. Ёкубов 2',
      company_inn: '630019325',
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  window.print = vi.fn();

  api.get.mockImplementation((path) => {
    if (path.includes('/inventory/projects/3/chessboard')) return Promise.resolve({data:{chessboard:[{id:3,name:'Блок Б',sections:[{floors:[{floor_number:-1},{floor_number:1},{floor_number:2},{floor_number:10}]}]}]}});
    if (path.includes('/document-settings/configuration')) {
      return Promise.resolve({ data: { settings: mockCompanySettings } });
    }
    if (path.includes('/units/89/presentation')) {
      return Promise.resolve({ data: { data: mockPresentation1 } });
    }
    if (path.includes('/units/153/presentation')) {
      return Promise.resolve({
        data: {
          data: {
            unit: mockUnit80,
            layout: mockUnit80.layout_types,
            rooms: [],
          },
        },
      });
    }
    return Promise.resolve({ data: {} });
  });
});

afterEach(() => {
  cleanup();
  document.body.classList.remove('has-print-modal');
});

describe('CommercialOfferModal Component', () => {
  it('correctly calculates and renders Commercial Offer for Unit №1 (54.58 m², $700/m²)', async () => {
    const onClose = vi.fn();
    render(<CommercialOfferModal unit={mockUnit1} onClose={onClose} initialLang="RU" />);

    // Check apartment title and specs
    const offers = await screen.findAllByText(/КП-25601-B-1/);
    expect(offers.length).toBeGreaterThanOrEqual(1);

    expect(screen.getAllByText('№1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/54\.58/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('3.15 м')).toBeTruthy();

    // Check default 3D image URL
    const planImage = screen.getByAltText('Планировка квартиры');
    expect(planImage.getAttribute('src')).toBe('/layouts/block_b/catalog/block_b_typical_type_09_54_58m2_3d.png');

    // Check room breakdown (гостиная 22.00 м², кухня 15.96 м²)
    expect(screen.getByText('Гостиная')).toBeTruthy();
    expect(screen.getByText('22.00 м²')).toBeTruthy();
    expect(screen.getByText('Кухня')).toBeTruthy();
    expect(screen.getByText('15.96 м²')).toBeTruthy();

    // Base price: $700/м² -> $38,206
    expect(screen.getAllByText(/38,206/).length).toBeGreaterThanOrEqual(1);

    // Official 30% installment calculation (cent-precise):
    // Price per m²: $700
    // Total price: 54.58 * 700 = $38,206
    // Down payment (30%): $11,461.80
    // Remaining (70%): $26,744.20
    expect(screen.getByText('$700 USD')).toBeTruthy();
    expect(screen.getAllByText('$38,206 USD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$11,461.80 USD')).toBeTruthy();
    expect(screen.getByText('$26,744.20 USD')).toBeTruthy();

    // Reconciled room breakdown and balcony
    expect(screen.getByText('Балкон / летняя зона')).toBeTruthy();
    expect(screen.getByText('2.20 м²')).toBeTruthy();
    expect(screen.getByText(/Площадь комнат: 52\.38 м² \+ Балкон\/лоджия: 2\.20 м² = Всего: 54\.58 м²/)).toBeTruthy();
  });

  it('switches between 3D furnished and 2D technical drawings for Unit №1', async () => {
    render(<CommercialOfferModal unit={mockUnit1} onClose={vi.fn()} initialLang="RU" />);

    await screen.findAllByText(/КП-25601-B-1/);
    const planImage = screen.getByAltText('Планировка квартиры');
    expect(planImage.getAttribute('src')).toBe('/layouts/block_b/catalog/block_b_typical_type_09_54_58m2_3d.png');

    // Click 2D Technical Plan switch button
    const btn2D = screen.getByRole('button', { name: /2D/i });
    fireEvent.click(btn2D);

    // Verify image source changed to 2D
    expect(planImage.getAttribute('src')).toBe('/layouts/block_b/catalog/block_b_typical_type_09_54_58m2_2d.png');
    expect(screen.getByText(/2D Архитектурно-технический/)).toBeTruthy();
  });

  it('switches to 100% full payment mode and reflects official single payment terms', async () => {
    render(<CommercialOfferModal unit={mockUnit1} onClose={vi.fn()} initialLang="RU" />);

    await screen.findAllByText(/КП-25601-B-1/);

    // Switch to 100% Payment Mode
    const btnFullPayment = screen.getByRole('button', { name: /100% Оплата/i });
    fireEvent.click(btnFullPayment);

    // Official 100% Payment terms:
    // Approved rate: $700/м²
    // Total price: 54.58 * 700 = $38,206
    // Down payment: $38,206
    // Remaining debt: $0 USD
    expect(screen.getByText('$700 USD')).toBeTruthy();
    expect(screen.getAllByText('$38,206 USD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$0 USD')).toBeTruthy();
    expect(screen.getAllByText('100% Оплата').length).toBeGreaterThanOrEqual(1);
  });

  it('correctly calculates and renders Commercial Offer for Unit №80 (84.80 м², $650/m² penthouse)', async () => {
    render(<CommercialOfferModal unit={mockUnit80} onClose={vi.fn()} initialLang="RU" />);

    expect((await screen.findAllByText(/КП-25601-B-80/)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('№80').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/84\.80/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('3 комн.')).toBeTruthy();

    // Check penthouse 3D image URL
    const planImage = screen.getByAltText('Планировка квартиры');
    expect(planImage.getAttribute('src')).toBe('/layouts/block_b/catalog/block_b_penthouse_type_01_84_80m2_unit_80_3d.png');

    // Base price: $650/м² -> 84.80 * 650 = $55,120
    expect(screen.getAllByText(/55,120/).length).toBeGreaterThanOrEqual(1);

    // Official 30% installment calculation:
    // Rate: $650/м²
    // Total price: 84.80 * 650 = $55,120
    // Down payment (30%): $16,536
    // Remaining (70%): $38,584
    expect(screen.getByText('$650 USD')).toBeTruthy();
    expect(screen.getAllByText('$55,120 USD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$16,536 USD')).toBeTruthy();
    expect(screen.getByText('$38,584 USD')).toBeTruthy();
  });

  it('renders accurate Tajik language (TG) translations and legal disclaimer', async () => {
    render(<CommercialOfferModal unit={mockUnit1} onClose={vi.fn()} initialLang="TG" />);

    expect((await screen.findAllByText(/ПЕШНИҲОДИ ТИҶОРАТӢ/)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/ШИНОСНОМАИ МАНЗИЛ/)).toBeTruthy();
    expect(screen.getByText(/Озод барои фурӯш/)).toBeTruthy();
    expect(screen.getByText(/Баландии шифт/)).toBeTruthy();
    expect(screen.getByText(/ШАРТҲОИ МОЛИЯВӢ/)).toBeTruthy();
    expect(screen.getByText(/ШУЪБАИ ФУРӮШ ВА МАСЛИҲАТ/)).toBeTruthy();
    expect(screen.getByText(/ЭЗОҲИ ҲУҚУҚӢ/)).toBeTruthy();

    // Verify official disclaimer text in Tajik
    expect(
      screen.getByText(/Пешниҳоди тиҷоратии мазкур танҳо хусусияти иттилоотӣ дошта, шартнома, офертаи оммавӣ ё тасдиқи бандкунӣ/i)
    ).toBeTruthy();
  });

  it('triggers window.print() when clicking print button', async () => {
    render(<CommercialOfferModal unit={mockUnit1} onClose={vi.fn()} initialLang="RU" />);

    await screen.findAllByText(/КП-25601-B-1/);
    const printButton = screen.getByRole('button', { name: /Печать \/ Сохранить в PDF/i });
    fireEvent.click(printButton);

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('calls navigator.share when available and copies to clipboard fallback', async () => {
    const shareMock = vi.fn().mockResolvedValue(true);
    navigator.share = shareMock;

    render(<CommercialOfferModal unit={mockUnit1} onClose={vi.fn()} initialLang="RU" />);

    await screen.findAllByText(/КП-25601-B-1/);
    const shareButton = screen.getByRole('button', { name: /Поделиться/i });
    fireEvent.click(shareButton);

    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('ЖК TOZON PLAZA — Квартира №1'),
      })
    );
  });
});

 it('uses the actual top floor from the building rather than a fixed 16', async () => {
   render(<CommercialOfferModal unit={mockUnit1} onClose={() => {}} initialLang="RU" />);
   expect(await screen.findByText('2 из 10')).toBeTruthy();
   expect(screen.getByText(/10-этажный жилой комплекс/)).toBeTruthy();
   expect(screen.queryByText(/из 16/)).toBeNull();
 });
 it('uses actual floor count in Tajik too', async () => {
   render(<CommercialOfferModal unit={mockUnit1} onClose={() => {}} initialLang="TG" />);
   expect(await screen.findByText('2 аз 10')).toBeTruthy();
   expect(screen.getByText(/10-ошёна/)).toBeTruthy();
 });
