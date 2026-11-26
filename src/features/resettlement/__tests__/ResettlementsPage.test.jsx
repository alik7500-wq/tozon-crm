// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ResettlementsPage } from '../ResettlementsPage.jsx';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: 'ADMIN' } }) }));
vi.mock('antd', () => ({
  Select: ({ options, value, onChange, disabled, 'aria-label': label }) => (
    <select aria-label={label} value={value ?? ''} disabled={disabled} onChange={event => onChange(Number(event.target.value))}>
      <option value="">Выберите</option>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('saves a draft with only explicitly selected apartments and calculates the paid area', async () => {
  const resident = { lead_id: 12, lead_name: 'Тестовый житель', project_id: 3, unit_kind: 'APARTMENT', status: 'SIGNED' };
  api.get.mockImplementation(async url => ({
    data: ({
      '/projects': { projects: [{ id: 3, name: 'Тестовый ЖК' }] },
      '/deals': { deals: [
        { ...resident, id: 18, unit_id: 101, unit_number: '13', contract_number: '0018', area_m2_x100: 7926 },
        { ...resident, id: 19, unit_id: 102, unit_number: '14', contract_number: '0019', area_m2_x100: 5898 },
        { ...resident, id: 20, unit_id: 103, unit_number: '21', contract_number: '0020', area_m2_x100: 5898 }
      ] },
      '/resettlements': []
    })[url]
  }));
  api.post.mockResolvedValue({});

  render(<ResettlementsPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Новое переселение' }));
  await screen.findByRole('option', { name: 'Тестовый ЖК' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Жилой комплекс' }), { target: { value: '3' } });
  await screen.findByRole('option', { name: 'Тестовый житель' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Житель' }), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Квартира 13, договор 0018' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Квартира 14, договор 0019' }));
  fireEvent.change(screen.getByLabelText('Площадь старого жилья, м²'), { target: { value: '90' } });
  fireEvent.change(screen.getByLabelText('Дополнительная площадь, %'), { target: { value: '30' } });
  fireEvent.change(screen.getByLabelText('Цена платной площади, USD/м²'), { target: { value: '400' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить черновик' }));

  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/resettlements', {
    project_id: 3,
    original_home_area_x100: 9000,
    compensated_area_x100: 11700,
    paid_area_x100: 2124,
    price_per_m2_minor: 40000,
    links: [{ unit_id: 101, deal_id: 18 }, { unit_id: 102, deal_id: 19 }]
  }));
});
