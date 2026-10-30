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

// Facade slab edges in the original image, ordered from roof to ground.
// Each edge follows the perspective around the visible corner, rather than a horizontal strip.
const facadeEdges = {
  4: [[90,174,355,224,478,213],[90,210,355,270,519,295],[94,265,355,325,519,365],[97,322,355,387,519,429],[100,378,355,449,519,493],[103,434,355,511,519,557],[106,490,355,573,519,621],[109,546,355,635,519,685],[112,602,355,697,519,749],[115,658,355,759,519,813],[119,759,355,853,519,895]],
  3: [[478,213,740,260,800,259,1225,198],[480,286,740,337,800,333,1220,225],[519,365,740,406,800,402,1217,290],[519,429,740,477,800,473,1213,351],[519,493,740,548,800,544,1209,412],[519,557,740,619,800,615,1207,474],[519,621,740,690,800,686,1205,536],[519,685,740,761,800,757,1204,598],[519,749,740,832,800,828,1202,660],[519,813,740,903,800,899,1200,722],[531,944,637,1013,741,1021,846,1008,1020,906,1100,845,1200,786]]
};
const pairs = edge => Array.from({ length: edge.length / 2 }, (_, i) => [edge[i * 2], edge[i * 2 + 1]]);
export function getAerialFloorRegions(blockId) {
  const edges = facadeEdges[blockId] || [];
  return edges.slice(0, -1).map((edge, index) => ({
    floor: 10 - index,
    points: [...pairs(edge), ...pairs(edges[index + 1]).reverse()].map(point => point.join(',')).join(' ')
  }));
}
export function getAerialFloorInfo(buildings, blockId, floorNumber) {
  const building = buildings?.find(item => String(item.id) === String(blockId) && String(item.project_id) === '3' && !item.archived_at);
  if (!building) return null;
  const sections = (building.sections || []).filter(section => !section.archived_at).map(section => ({
    ...section, floors: (section.floors || []).filter(floor => !floor.archived_at && Number(floor.floor_number) === Number(floorNumber))
  }));
  if (!sections.some(section => section.floors.length)) return null;
  return getAerialBuildingInfo([{ ...building, sections }], blockId);
}
