import { apartmentStats } from '../../projects/apartmentStats';
import { projectAreaMetrics } from '../../projects/projectAreaMetrics';
import { getUnitKind } from '../../../utils/unitKind';

export const isTozonAerial = (projectId, image) => String(projectId) === '3' && image?.storage_path === 'projects/3/media/20261029/img_9690.jpg';

// Outlines reviewed on the original 1280 × 1024 architectural visualization.
export const aerialBlocks = [
  { id: 4, name: 'Блок А', label: { x: 29, y: 18 }, points: '65,203 90,174 133,160 126,109 250,94 354,110 355,78 393,73 395,57 513,43 588,51 589,137 647,148 648,180 546,197 478,213 480,286 519,295 519,895 434,879 119,759 65,734' },
  { id: 3, name: 'Блок Б', label: { x: 75, y: 25 }, points: '474,201 615,162 647,155 646,98 708,75 822,80 825,117 1111,111 1199,128 1203,188 1225,198 1234,222 1220,262 1200,786 1100,845 1020,906 846,1008 741,1021 637,1013 531,944 515,882 515,294 476,284' }
];

export function getAerialBuildingInfo(buildings, id) {
  const building = buildings?.find(item => String(item.id) === String(id) && !item.archived_at && String(item.project_id) === '3');
  if (!building) return null;
  const rooms = {};
  for (const section of building.sections || []) {
    if (section.archived_at) continue;
    for (const floor of section.floors || []) {
      if (floor.archived_at) continue;
      for (const unit of floor.units || []) {
        if (unit.archived_at || getUnitKind(unit) !== 'APARTMENT') continue;
        const key = Number.isInteger(unit.rooms) && unit.rooms >= 0 ? String(unit.rooms) : 'unknown';
        rooms[key] = (rooms[key] || 0) + 1;
      }
    }
  }
  return { apartments: apartmentStats([building]), rooms, areas: projectAreaMetrics([building]).total };
}
