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
    const overlay = screen.getAllByText(label.label).find(element => element.parentElement.style.left).parentElement;
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
  expect(screen.getAllByText('Новый ракурс').length).toBeGreaterThan(0);
  expect(img.parentElement.style.maxWidth).toBe('1200px');
});

const realMap = 'https://res.cloudinary.com/r3pnvm9s/image/upload/v1787392389/tozon-crm/euh4vu4ocbgschzszw3p.png';
async function renderGenplan() {
  api.get.mockResolvedValue({ data: { maps: [{ id: 3, title: 'Генплан', image_path: realMap, hotspots: labels }] } });
  render(<VisualMapsTab projectId={3} />);
  loadImage(await screen.findByAltText('Генплан'), 792, 709);
}
it('highlights the full roof on hover and shows its name in the sidebar', async () => {
  await renderGenplan();
  const polygon = screen.getByRole('button', { name: 'Выделить Блок А' });
  expect(polygon.tagName.toLowerCase()).toBe('polygon');
  expect(polygon.getAttribute('fill')).toBe('transparent');
  fireEvent.mouseEnter(polygon);
  expect(polygon.getAttribute('fill')).toBe('rgba(59,130,246,0.45)');
  expect(screen.getByRole('status').textContent).toBe('Выделен: Блок А');
  fireEvent.mouseLeave(polygon);
  expect(polygon.getAttribute('fill')).toBe('transparent');
  expect(screen.getByRole('status').textContent).toBe('Корпус не выбран');
});
it('pins a selected building with click or keyboard, changes it from the sidebar, and clears it', async () => {
  await renderGenplan();
  const a = screen.getByRole('button', { name: 'Выделить Блок А' });
  fireEvent.click(a); fireEvent.mouseLeave(a);
  expect(a.getAttribute('aria-pressed')).toBe('true');
  expect(a.getAttribute('fill')).toBe('rgba(59,130,246,0.45)');
  const b = screen.getByRole('button', { name: 'Выделить Блок Б' });
  fireEvent.focus(b); fireEvent.keyDown(b, { key: 'Enter' }); fireEvent.blur(b);
  expect(screen.getByRole('status').textContent).toBe('Выделен: Блок Б');
  expect(a.getAttribute('fill')).toBe('transparent');
  fireEvent.click(screen.getByRole('button', { name: 'Блок Г', exact: true }));
  expect(screen.getByRole('status').textContent).toBe('Выделен: Блок Г');
  fireEvent.click(screen.getByRole('button', { name: 'Снять выделение' }));
  expect(screen.getByRole('status').textContent).toBe('Корпус не выбран');
});

it('opens the configured visual for A and Б from polygons, keyboard and sidebar; В and Г stay selectable', async () => {
  const onOpenMedia = vi.fn();
  const linked = labels.map((h, i) => ({ ...h, target_building_id: i === 0 ? 4 : i === 1 ? 3 : null }));
  api.get.mockResolvedValue({ data: { maps: [{ id: 3, title: 'Генплан', image_path: realMap, hotspots: linked }] } });
  render(<VisualMapsTab projectId={3} onOpenMedia={onOpenMedia} />);
  loadImage(await screen.findByAltText('Генплан'), 792, 709);
  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Выделить Блок А' }));
  expect(onOpenMedia).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Выделить Блок А' }));
  expect(onOpenMedia).toHaveBeenLastCalledWith(37);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Выделить Блок Б' }), { key: 'Enter' });
  expect(onOpenMedia).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Блок А', exact: true }));
  expect(onOpenMedia).toHaveBeenCalledTimes(3);
  for (const name of ['Блок В', 'Блок Г']) fireEvent.click(screen.getByRole('button', { name, exact: true }));
  expect(onOpenMedia).toHaveBeenCalledTimes(3);
});
