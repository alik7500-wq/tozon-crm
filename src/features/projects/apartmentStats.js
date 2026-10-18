import {getUnitKind} from '../../utils/unitKind';

export function apartmentStats(buildings = []) {
  const stats = {total_units: 0, available_units: 0, reserved_units: 0, sold_units: 0, blocked_units: 0, total_area_x100: 0};
  const statuses = {AVAILABLE:'available_units', RESERVED:'reserved_units', SOLD:'sold_units', BLOCKED:'blocked_units'};
  for (const building of buildings) {
    if (building.archived_at) continue;
    for (const section of building.sections || []) {
      if (section.archived_at) continue;
      for (const floor of section.floors || []) {
        if (floor.archived_at) continue;
        for (const unit of floor.units || []) {
          if (unit.archived_at || getUnitKind(unit) !== 'APARTMENT') continue;
          stats.total_units++;
          stats.total_area_x100 += Number(unit.area_m2_x100) || 0;
          if (statuses[unit.status]) stats[statuses[unit.status]]++;
        }
      }
    }
  }
  return stats;
}
