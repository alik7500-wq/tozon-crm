import React from 'react';
import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectDetailPage } from './ProjectDetailPage';
import { api } from '../../api/client';
import { projectGalleryApi } from '../projectGallery/services/projectGalleryApi';

vi.mock('../../api/client', () => ({ api: { get: vi.fn() } }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: 'SALES_MANAGER' } }) }));
vi.mock('./tabs/ChessboardTab', () => ({ ChessboardTab: () => null }));
vi.mock('./tabs/LayoutsTab', () => ({ LayoutsTab: () => null }));
vi.mock('./tabs/BatchGeneratorModal', () => ({ BatchGeneratorModal: () => null }));
vi.mock('../../components/ImageUpload', () => ({ default: () => null }));
vi.mock('../projectGallery/services/projectGalleryApi', () => ({ projectGalleryApi: { getProjectMedia: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it.each(['Блок А', 'Блок Б'])('opens the requested aerial visualization from %s through the project page', async name => {
  api.get.mockImplementation(async path => {
    if (path === '/projects/3') return { data: { project: { id: 3, name: 'TOZON PLAZA', currency: 'USD' } } };
    if (path === '/inventory/projects/3/chessboard') return { data: { chessboard: [
      { id: 4, project_id: 3, name: 'Блок А', sections: [{ floors: [{ units: [{ rooms: 1, area_m2_x100: 5000, status: 'AVAILABLE' }] }] }] },
      { id: 3, project_id: 3, name: 'Блок Б', sections: [{ floors: [{ units: [{ rooms: 2, area_m2_x100: 7000, status: 'SOLD' }] }] }] }
    ] } };
    if (path === '/inventory/projects/3/layouts') return { data: { layouts: [] } };
    if (path === '/visual-maps/projects/3') return { data: { maps: [{
      id: 3, title: 'Генплан', image_path: 'https://res.cloudinary.com/r3pnvm9s/image/upload/v1787392389/tozon-crm/euh4vu4ocbgschzszw3p.png',
      hotspots: [{ label: 'Блок А', target_building_id: 4, x_pct: 69.5, y_pct: 47, width_pct: 10, height_pct: 4.5 }, { label: 'Блок Б', target_building_id: 3, x_pct: 78, y_pct: 53, width_pct: 10, height_pct: 4.5 }]
    }] } };
    throw new Error(`Unexpected endpoint ${path}`);
  });
  projectGalleryApi.getProjectMedia.mockResolvedValue([{ id: 37, title: 'TOZON PLAZA с высоты', url: '/aerial.jpg', storage_path: 'projects/3/media/20261029/img_9690.jpg', category: 'MASTERPLAN', is_active: true }]);
  render(<MemoryRouter initialEntries={['/projects/3']}><Routes><Route path="/projects/:id" element={<ProjectDetailPage />} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Генплан и Фасады' }));
  const img = await screen.findByAltText('Генплан');
  Object.defineProperty(img, 'naturalWidth', { value: 792 });
  Object.defineProperty(img, 'naturalHeight', { value: 709 });
  fireEvent.load(img);
  fireEvent.click(screen.getByRole('button', { name: `Выделить ${name}` }));
  await screen.findByText('1 / 1');
  expect(screen.getByRole('heading', { name, exact: true })).toBeTruthy();
  expect(screen.getAllByAltText('TOZON PLAZA с высоты')).toHaveLength(2);
  expect(screen.queryByAltText('Генплан')).toBeNull();
  fireEvent.click(screen.getByTitle('Закрыть (Esc)'));
  expect(screen.queryByText('1 / 1')).toBeNull();
});
