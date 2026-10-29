import React from 'react';
import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VisualMapsTab } from './VisualMapsTab';
import { api } from '../../../api/client';
vi.mock('../../../api/client', () => ({ api: { get: vi.fn() } }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: 'SALES_MANAGER' } }) }));
vi.mock('../../../components/ImageUpload', () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const labels = [
  { label: 'Блок А', x_pct: 69.5, y_pct: 47, width_pct: 10, height_pct: 4.5 },
  { label: 'Блок Б', x_pct: 78, y_pct: 53, width_pct: 10, height_pct: 4.5 },
  { label: 'Блок В', x_pct: 10.5, y_pct: 14.5, width_pct: 10, height_pct: 4.5 },
  { label: 'Блок Г', x_pct: 19, y_pct: 9.5, width_pct: 10, height_pct: 4.5 }
];
function loadImage(img, width, height) {
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: width });
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: height });
  fireEvent.load(img);
}
it('anchors all four labels to the scaled image rather than its letterbox', async () => {
  api.get.mockResolvedValue({ data: { maps: [{ id: 3, title: 'Генплан', image_path: '/map.png', hotspots: labels }] } });
  render(<VisualMapsTab projectId={3} />);
  const img = await screen.findByAltText('Генплан');
  expect(screen.queryByText('Блок А')).toBeNull();
  loadImage(img, 792, 709);
  expect(img.parentElement.style.maxWidth).toBe(`${600 * 792 / 709}px`);
  for (const label of labels) {
    const overlay = screen.getByText(label.label).parentElement;
    expect(overlay.parentElement).toBe(img.parentElement);
    expect(overlay.style.left).toBe(`${label.x_pct}%`);
    expect(overlay.style.top).toBe(`${label.y_pct}%`);
  }
});
it('remeasures a different map before displaying its labels', async () => {
  api.get.mockResolvedValue({ data: { maps: [
    { id: 3, title: 'Генплан', image_path: '/map.png', hotspots: labels },
    { id: 4, title: 'Фасад', image_path: '/facade.png', hotspots: [{ ...labels[0], label: 'Новый ракурс' }] }
  ] } });
  render(<VisualMapsTab projectId={3} />);
  loadImage(await screen.findByAltText('Генплан'), 792, 709);
  fireEvent.click(screen.getByRole('button', { name: 'Фасад (Фасад)' }));
  const img = screen.getByAltText('Фасад');
  expect(screen.queryByText('Новый ракурс')).toBeNull();
  loadImage(img, 1200, 600);
  expect(screen.getByText('Новый ракурс')).toBeTruthy();
  expect(img.parentElement.style.maxWidth).toBe('1200px');
});
