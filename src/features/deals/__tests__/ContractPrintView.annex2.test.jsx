import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ContractPrintView } from '../ContractPrintView';

// Mock client api
vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} })
  }
}));

describe('ContractPrintView Annex 2 (Приложение №2 — Планировка квартиры)', () => {
  const apartmentDealBlockB = {
    id: 101,
    unit_id: 83,
    unit_number: '7',
    unit_kind: 'APARTMENT',
    rooms: 2,
    area_m2_x100: 8180,
    unit_area: 81.80,
    price_per_m2_minor: 65000,
    project_id: 3,
    project_name: 'ЖК TOZON PLAZA',
    building_name: 'Блок Б',
    building_id: 3,
    section_name: 'Подъезд 1',
    floor_number: 2,
    lead_name: 'Собиров Дилшод Раҳимович',
    lead_phone: '+992927770001',
    contract_number: '25601-2026-0007',
    deal_date: '2026-10-21',
    currency: 'USD',
    final_price_minor: 5317000,
    down_payment_minor: 1595100,
    technical_plan_path: '/layouts/block_b/catalog/block_b_typical_type_03_81_80m2_2d.png',
    furnished_plan_path: '/layouts/block_b/catalog/block_b_typical_type_03_81_80m2_3d.png',
    layout_code: '2A-81.80',
    layout_name: '2-комнатная квартира 81.80 м²',
    schedules: [
      { due_date: '2026-11-20', amount_minor: 310158, paid_amount_minor: 0, status: 'PENDING' }
    ]
  };

  const apartmentDealBlockA = {
    id: 102,
    unit_id: 90,
    unit_number: '2',
    unit_kind: 'APARTMENT',
    rooms: 2,
    area_m2_x100: 8118,
    unit_area: 81.18,
    price_per_m2_minor: 66000,
    project_id: 3,
    project_name: 'ЖК TOZON PLAZA',
    building_name: 'Блок А',
    building_id: 4,
    section_name: 'Подъезд 1',
    floor_number: 2,
    lead_name: 'Каримов Рустам Бахтиёрович',
    lead_phone: '+992928880002',
    contract_number: '25601-2026-0002',
    deal_date: '2026-10-21',
    currency: 'USD',
    final_price_minor: 5357880,
    down_payment_minor: 1607364,
    technical_plan_path: '/layouts/block_a/catalog/block_a_typical_type_06_81_18m2_2d.png',
    furnished_plan_path: '/layouts/block_a/catalog/block_a_typical_type_06_81_18m2_3d.png',
    layout_code: '2A-81.18',
    layout_name: '2-комнатная квартира 81.18 м²',
    schedules: [
      { due_date: '2026-11-20', amount_minor: 312543, paid_amount_minor: 0, status: 'PENDING' }
    ]
  };

  const parkingDeal = {
    id: 103,
    unit_id: 301,
    unit_number: 'П-05',
    unit_kind: 'PARKING',
    rooms: 0,
    area_m2_x100: 2200,
    unit_area: 22.00,
    price_per_m2_minor: 50000,
    project_id: 3,
    project_name: 'ЖК TOZON PLAZA',
    building_name: 'Блок Б',
    building_id: 3,
    section_name: 'Подъезд 1',
    floor_number: -1,
    lead_name: 'Алиев Хуршед',
    contract_number: '25601-2026-П05',
    deal_date: '2026-10-21',
    currency: 'USD',
    final_price_minor: 1100000,
    down_payment_minor: 1100000,
    technical_plan_path: null,
    furnished_plan_path: null,
    schedules: []
  };

  afterEach(cleanup);

  it('renders Annex 2 tab for Block B apartment with 2D and 3D images', () => {
    render(<ContractPrintView deal={apartmentDealBlockB} initialLang="RU" onClose={vi.fn()} />);

    // Click on Annex 2 tab
    const planTabButton = screen.getByText('Приложение №2 (Планировка)');
    expect(planTabButton).toBeTruthy();
    fireEvent.click(planTabButton);

    const printSection = document.getElementById('print-section');
    expect(printSection).toBeTruthy();
    const content = printSection.textContent;

    // Check header
    expect(content).toContain('Приложение № 2');
    expect(content).toContain('Архитектурно-технический и 3D-план');

    // Check passport parameters
    expect(content).toContain('Блок Б');
    expect(content).toContain('Подъезд 1');
    expect(content).toContain('№ 7');
    expect(content).toMatch(/81[,.]80\s*м²/);

    // Check 2D and 3D image tags
    const images = printSection.querySelectorAll('img');
    expect(images.length).toBe(2);
    expect(images[0].getAttribute('src')).toBe('/layouts/block_b/catalog/block_b_typical_type_03_81_80m2_2d.png');
    expect(images[1].getAttribute('src')).toBe('/layouts/block_b/catalog/block_b_typical_type_03_81_80m2_3d.png');

    // Check legal explanatory note
    expect(content).toContain('Настоящее Приложение является неотъемлемой частью Договора');
  });

  it('renders Annex 2 tab for Block A apartment with 2D and 3D images in Tajik', () => {
    render(<ContractPrintView deal={apartmentDealBlockA} initialLang="TJ" onClose={vi.fn()} />);

    // Click on Annex 2 tab
    const planTabButton = screen.getByText('Замимаи №2 (Нақша)');
    expect(planTabButton).toBeTruthy();
    fireEvent.click(planTabButton);

    const printSection = document.getElementById('print-section');
    expect(printSection).toBeTruthy();
    const content = printSection.textContent;

    // Check header
    expect(content).toContain('Замимаи № 2');
    expect(content).toContain('Нақшаи меъморию техникӣ ва тарҳи 3D-и хона');

    // Check passport parameters
    expect(content).toContain('Блок А');
    expect(content).toContain('№ 2');
    expect(content).toMatch(/81[,.]18\s*м²/);

    // Check 2D and 3D image tags
    const images = printSection.querySelectorAll('img');
    expect(images.length).toBe(2);
    expect(images[0].getAttribute('src')).toBe('/layouts/block_a/catalog/block_a_typical_type_06_81_18m2_2d.png');
    expect(images[1].getAttribute('src')).toBe('/layouts/block_a/catalog/block_a_typical_type_06_81_18m2_3d.png');

    // Check Tajik legal note
    expect(content).toContain('Нақшаи мазкур қисми ҷудонашавандаи Шартнома буда');
  });

  it('renders combined full package (Contract + Annex 1 + Annex 2) when ALL tab is selected', () => {
    render(<ContractPrintView deal={apartmentDealBlockB} initialLang="RU" onClose={vi.fn()} />);

    const allTabButton = screen.getByText('Весь пакет');
    expect(allTabButton).toBeTruthy();
    fireEvent.click(allTabButton);

    const printSection = document.getElementById('print-section');
    expect(printSection).toBeTruthy();
    const content = printSection.textContent;

    // Verify all 3 documents are present sequentially
    expect(content).toContain('ДОГОВОР ДОЛЕВОГО УЧАСТИЯ В СТРОИТЕЛЬСТВЕ ЖИЛОГО ДОМА'); // Contract
    expect(content).toContain('График платежей к Договору долевого участия в строительстве'); // Annex 1
    expect(content).toContain('Приложение № 2 к Договору'); // Annex 2

    // Verify page breaks are applied for printing
    const pageBreakElements = printSection.querySelectorAll('.print-page-break');
    expect(pageBreakElements.length).toBe(2); // Before Annex 1 and before Annex 2
  });

  it('renders appropriate legal notice for non-residential parking space without fake apartment plans', () => {
    render(<ContractPrintView deal={parkingDeal} initialLang="RU" onClose={vi.fn()} />);

    const planTabButton = screen.getByText('Приложение №2 (Планировка)');
    fireEvent.click(planTabButton);

    const printSection = document.getElementById('print-section');
    const content = printSection.textContent;

    // Must NOT invent or show apartment images
    const images = printSection.querySelectorAll('img');
    expect(images.length).toBe(0);

    // Shows official non-residential notice
    expect(content).toContain('Индивидуальная планировка для машино-места не предусмотрена');
    expect(content).toContain('Расположение и границы машино-места определяются утверждённым генеральным планом этажа');
  });

  it('shows clear warning when apartment plan is missing rather than inventing mock plans', () => {
    const dealWithoutPlans = {
      ...apartmentDealBlockA,
      technical_plan_path: null,
      furnished_plan_path: null
    };

    render(<ContractPrintView deal={dealWithoutPlans} initialLang="RU" onClose={vi.fn()} />);

    const planTabButton = screen.getByText('Приложение №2 (Планировка)');
    fireEvent.click(planTabButton);

    const printSection = document.getElementById('print-section');
    const content = printSection.textContent;

    expect(content).toContain('Утверждённый план для данной квартиры отсутствует в каталоге');
    expect(content).toContain('Пожалуйста, обратитесь к администратору для загрузки официальных 2D/3D материалов');
  });
});
