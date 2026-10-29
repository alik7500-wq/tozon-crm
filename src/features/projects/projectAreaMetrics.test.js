import { it, expect } from 'vitest';
import { projectAreaMetrics, parseMetricArea } from './projectAreaMetrics';

const building = (id, units, extra = {}) => ({ id, name: `Блок ${id}`, sections: [{ floors: [{ units }] }], ...extra });
it('separates all sale categories and reconciles project totals using integer areas', () => {
  const { rows, total } = projectAreaMetrics([
    building(4, [{ unit_kind: 'APARTMENT', area_m2_x100: 434405, status: 'SOLD' }, { unit_kind: 'COMMERCIAL', area_m2_x100: 44940, status: 'AVAILABLE' }, { unit_kind: 'PARKING', area_m2_x100: 19792, status: 'RESERVED' }]),
    building(3, [{ unit_kind: 'APARTMENT', area_m2_x100: 522443, status: 'AVAILABLE' }, { unit_kind: 'COMMERCIAL', area_m2_x100: 55426, status: 'BLOCKED' }, { unit_kind: 'PARKING', area_m2_x100: 37468, status: 'AVAILABLE' }])
  ]);
  expect(rows.map(row => row.sellable.area)).toEqual([499137, 615337]);
  expect(total.sellable.area).toBe(1114474);
  expect(total.apartments.area).toBe(956848);
  expect(total.commercial.area).toBe(100366);
  expect(total.parking.area).toBe(57260);
  expect(total.available.area + total.reserved.area + total.sold.area + total.blocked.area).toBe(total.sellable.area);
  expect(total.footprint).toBeNull();
});
it('excludes archived buildings, sections, floors and units', () => {
  const unit = { area_m2_x100: 1000, status: 'SOLD' };
  const data = [building(1, [unit, { ...unit, archived_at: 'date' }]), building(2, [unit], { archived_at: 'date' }), { id: 3, sections: [{ archived_at: 'date', floors: [{ units: [unit] }] }, { floors: [{ archived_at: 'date', units: [unit] }] }] }];
  expect(projectAreaMetrics(data).total.sellable).toEqual({ count: 1, area: 1000, missing: 0 });
});
it('does not replace missing design or inventory areas with misleading zero totals', () => {
  const result = projectAreaMetrics([building(1, [{ area_m2_x100: null }], { footprint_area_m2_x100: 59500 }), building(2, [])]);
  expect(result.total.footprint).toBeNull();
  expect(result.total.sellable.missing).toBe(1);
  expect(result.rows[0].footprint).toBe(59500);
});
it('accepts a comma and rejects rounded, negative or ambiguous input', () => {
  expect(parseMetricArea('595,25')).toBe(59525);
  expect(parseMetricArea('')).toBeNull();
  for (const value of ['0', '-1', '12.345', '1e3', '1 000']) expect(() => parseMetricArea(value)).toThrow();
});
