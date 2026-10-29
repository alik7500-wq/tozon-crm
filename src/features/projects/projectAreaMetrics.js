import { getUnitKind } from '../../utils/unitKind';

const kinds = ['APARTMENT', 'COMMERCIAL', 'PARKING'];
const empty = () => ({ count: 0, area: 0, missing: 0 });
const area = value => value !== null && value !== undefined && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const metrics = () => ({ apartments: empty(), commercial: empty(), parking: empty(), sellable: empty(), available: empty(), reserved: empty(), sold: empty(), blocked: empty(), otherCount: 0 });
const add = (group, value) => { group.count++; if (value === null) group.missing++; else group.area += value; };

export function projectAreaMetrics(buildings = []) {
  const rows = [];
  for (const building of buildings) {
    if (building.archived_at) continue;
    const row = { ...metrics(), id: building.id, name: building.name, footprint: area(building.footprint_area_m2_x100), gross: area(building.gross_floor_area_m2_x100) };
    for (const section of building.sections || []) {
      if (section.archived_at) continue;
      for (const floor of section.floors || []) {
        if (floor.archived_at) continue;
        for (const unit of floor.units || []) {
          if (unit.archived_at) continue;
          const kind = getUnitKind(unit);
          if (!kinds.includes(kind)) { row.otherCount++; continue; }
          const value = area(unit.area_m2_x100);
          add(row[{ APARTMENT: 'apartments', COMMERCIAL: 'commercial', PARKING: 'parking' }[kind]], value);
          add(row.sellable, value);
          const status = { AVAILABLE: 'available', RESERVED: 'reserved', SOLD: 'sold', BLOCKED: 'blocked' }[unit.status];
          if (status) add(row[status], value);
        }
      }
    }
    rows.push(row);
  }
  const total = { ...metrics(), name: 'Итого по объекту', footprint: rows.length ? 0 : null, gross: rows.length ? 0 : null };
  for (const row of rows) {
    for (const key of ['apartments', 'commercial', 'parking', 'sellable', 'available', 'reserved', 'sold', 'blocked']) {
      for (const field of ['count', 'area', 'missing']) total[key][field] += row[key][field];
    }
    total.otherCount += row.otherCount;
    for (const key of ['footprint', 'gross']) total[key] = row[key] === null || total[key] === null ? null : total[key] + row[key];
  }
  return { rows, total };
}

export const formatMetricArea = value => value === null ? 'Не указано' : `${(value / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} м²`;

export function parseMetricArea(value) {
  const text = String(value).trim().replace(',', '.');
  if (!text) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Укажите площадь с точностью до 0,01 м²');
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result <= 0 || result > 2147483647) throw new Error('Площадь должна быть больше нуля и не превышать 21 474 836,47 м²');
  return result;
}
