import React from 'react';
import { afterEach, it, expect } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AerialBuildingView } from './AerialBuildingView';
import { getAerialBuildingInfo, isTozonAerial } from './aerialBuildingInfo';
afterEach(cleanup);
const image = { id: 37, title: 'TOZON PLAZA с высоты', url: '/aerial.jpg', storage_path: 'projects/3/media/20261029/img_9690.jpg' };
const unit = (rooms, status, kind = 'APARTMENT', area = 5000) => ({ rooms, status, unit_kind: kind, area_m2_x100: area });
const buildings = [
  { id: 4, project_id: 3, name: 'Блок А', sections: [{ floors: [{ units: [unit(1, 'AVAILABLE'), unit(2, 'SOLD'), unit(0, 'AVAILABLE', 'COMMERCIAL', 1000), unit(0, 'AVAILABLE', 'PARKING', 2000), { ...unit(3, 'AVAILABLE'), archived_at: 'date' }] }] }] },
  { id: 3, project_id: 3, name: 'Блок Б', sections: [{ floors: [{ units: [unit(1, 'RESERVED'), unit(3, 'AVAILABLE')] }] }] }
];
it('separates apartment room counts from commercial space and parking', () => {
  const info = getAerialBuildingInfo(buildings, 4);
  expect(info.apartments.total_units).toBe(2);
  expect(info.apartments.available_units).toBe(1);
  expect(info.rooms).toEqual({ 1: 1, 2: 1 });
  expect(info.areas.commercial).toEqual({ count: 1, area: 1000, missing: 0 });
  expect(info.areas.parking).toEqual({ count: 1, area: 2000, missing: 0 });
  expect(getAerialBuildingInfo([{ ...buildings[0], project_id: 9 }], 4)).toBeNull();
  expect(isTozonAerial(9, image)).toBe(false);
  expect(isTozonAerial(3, { ...image, storage_path: 'other.jpg' })).toBe(false);
});
it('opens with the building selected on the genplan, and updates the card and contour on hover', () => {
  render(<AerialBuildingView image={image} buildings={buildings} initialBuildingId={3} />);
  const panel = screen.getByRole('complementary', { name: 'Информация о выбранном блоке' });
  expect(within(panel).getByRole('heading', { name: 'Блок Б' })).toBeTruthy();
  const a = screen.getByRole('button', { name: 'Показать информацию: Блок А' });
  const b = screen.getByRole('button', { name: 'Показать информацию: Блок Б' });
  expect(b.getAttribute('stroke')).toBe('#fb923c');
  fireEvent.mouseEnter(a);
  expect(a.getAttribute('stroke')).toBe('#fb923c');
  expect(b.getAttribute('stroke')).toBe('transparent');
  expect(within(panel).getByRole('heading', { name: 'Блок А' })).toBeTruthy();
  expect(within(panel).getByText('2-комнатные')).toBeTruthy();
  fireEvent.mouseLeave(a);
  expect(within(panel).getByRole('heading', { name: 'Блок Б' })).toBeTruthy();
});
it('opens each block floor plan with mouse or keyboard and returns with its selection preserved', () => {
  render(<AerialBuildingView image={image} buildings={buildings} />);
  fireEvent.click(screen.getByRole('button', { name: 'Показать информацию: Блок А' }));
  expect(screen.getByAltText('Типовая планировка Блок А, этажи 2–9').getAttribute('src')).toBe('/layouts/floors/block_a_typical_floor.webp');
  fireEvent.click(screen.getByRole('button', { name: 'Увеличить план' }));
  expect(screen.getByAltText('Типовая планировка Блок А, этажи 2–9').style.width).toBe('125%');
  fireEvent.click(screen.getByRole('button', { name: 'Сбросить масштаб плана' }));
  expect(screen.getByAltText('Типовая планировка Блок А, этажи 2–9').style.width).toBe('100%');
  fireEvent.click(screen.getByRole('button', { name: '← К изображению здания' }));
  expect(screen.getByRole('button', { name: 'Блок А', exact: true }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Показать информацию: Блок Б' }), { key: ' ' });
  expect(screen.getByAltText('Типовая планировка Блок Б, этажи 2–9').getAttribute('src')).toBe('/layouts/floors/block_b_typical_floor.webp');
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.getByRole('heading', { name: 'Блок Б' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Снять выбор блока' }));
  expect(screen.getByRole('heading', { name: 'Выберите блок' })).toBeTruthy();
});
it('opens the floor plan from a block button or the information card', () => {
  render(<AerialBuildingView image={image} buildings={buildings} initialBuildingId={4} />);
  fireEvent.click(screen.getByRole('button', { name: 'Открыть типовую планировку' }));
  expect(screen.getByAltText('Типовая планировка Блок А, этажи 2–9')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '← К изображению здания' }));
  fireEvent.click(screen.getByRole('button', { name: 'Блок Б', exact: true }));
  expect(screen.getByAltText('Типовая планировка Блок Б, этажи 2–9')).toBeTruthy();
});
it('does not show zero counts when inventory failed to load', () => {
  render(<AerialBuildingView image={image} buildings={null} initialBuildingId={4} />);
  expect(screen.getByRole('status').textContent).toContain('Данные блока не загружены');
  expect(screen.queryByText('Всего квартир')).toBeNull();
});
