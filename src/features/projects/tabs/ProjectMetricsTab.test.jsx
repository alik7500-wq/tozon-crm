import React, { useState } from 'react';
import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProjectMetricsTab } from './ProjectMetricsTab';
import { api } from '../../../api/client';
const auth = vi.hoisted(() => ({ role: 'ADMIN' }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: auth.role } }) }));
vi.mock('../../../api/client', () => ({ api: { patch: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); auth.role = 'ADMIN'; });
const project = { id: 3, currency: 'USD', description: 'Объект', created_at: '2026-08-19' };
const data = [{ id: 4, name: 'Блок А', sections: [{ floors: [{ units: [{ unit_kind: 'APARTMENT', area_m2_x100: 10000, status: 'SOLD' }, { unit_kind: 'PARKING', area_m2_x100: 2000, status: 'AVAILABLE' }] }] }] }];
it('saves exact design areas and preserves unit areas', async () => {
  api.patch.mockResolvedValue({ data: { building: { id: 4, footprint_area_m2_x100: 59525, gross_floor_area_m2_x100: null } } });
  function Wrapper() {
    const [buildings, setBuildings] = useState(data);
    return <ProjectMetricsTab project={project} buildings={buildings} onBuildingUpdated={building => setBuildings(old => old.map(row => ({ ...row, ...building })))} />;
  }
  render(<Wrapper />);
  fireEvent.click(screen.getByLabelText('Указать проектные площади: Блок А'));
  fireEvent.change(screen.getByLabelText('Площадь застройки (пятно здания), м²'), { target: { value: '595,25' } });
  fireEvent.click(screen.getByText('Сохранить площади'));
  await screen.findByText('Проектные площади сохранены');
  expect(api.patch).toHaveBeenCalledWith('/inventory/projects/3/buildings/4/areas', { footprint_area_m2_x100: 59525, gross_floor_area_m2_x100: null });
  expect(screen.getAllByText('595,25 м²').length).toBeGreaterThan(0);
  expect(screen.getAllByText('120,00 м²').length).toBeGreaterThan(0);
});
it('keeps an invalid or failed edit open and displays the error', async () => {
  render(<ProjectMetricsTab project={project} buildings={data} onBuildingUpdated={vi.fn()} />);
  fireEvent.click(screen.getByLabelText('Указать проектные площади: Блок А'));
  fireEvent.change(screen.getByLabelText('Площадь застройки (пятно здания), м²'), { target: { value: '12.345' } });
  fireEvent.click(screen.getByText('Сохранить площади'));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(api.patch).not.toHaveBeenCalled();
  api.patch.mockRejectedValue(new Error('Ошибка сохранения'));
  fireEvent.change(screen.getByLabelText('Площадь застройки (пятно здания), м²'), { target: { value: '595' } });
  fireEvent.click(screen.getByText('Сохранить площади'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Ошибка сохранения'));
  expect(screen.getByLabelText('Площадь застройки (пятно здания), м²').value).toBe('595');
});
it('shows no edit action for sales staff and no false zero summary after a load failure', () => {
  auth.role = 'SALES_MANAGER';
  const { rerender } = render(<ProjectMetricsTab project={project} buildings={data} />);
  expect(screen.queryByLabelText('Указать проектные площади: Блок А')).toBeNull();
  rerender(<ProjectMetricsTab project={project} buildings={null} onRetry={vi.fn()} />);
  expect(screen.getByRole('alert').textContent).toContain('Не удалось загрузить площади');
  expect(screen.queryByText('0,00 м²')).toBeNull();
});
