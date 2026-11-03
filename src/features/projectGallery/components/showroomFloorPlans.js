// Original sheets supplied for the showroom. Each sheet contains both blocks
// in its group; floor selection never substitutes a typical plan for another use.
export function getShowroomFloorPlan(blockId, floorNumber) {
  const group = [3, 4].includes(Number(blockId)) ? 'ab' : [6, 7].includes(Number(blockId)) ? 'vg' : null;
  const floor = Number(floorNumber);
  const kind = floorNumber == null ? null : floor === -1 ? 'parking' : floor === 1 ? 'commercial'
    : floor === 10 ? 'penthouse' : Number.isInteger(floor) && floor >= 2 && floor <= 9 ? 'typical' : null;
  if (!group || !kind) return null;
  return {
    url: `/layouts/showroom/${group}-${kind}.pdf`,
    blocks: group === 'ab' ? 'А и Б' : 'В и Г',
    title: kind === 'parking' ? 'Парковка' : kind === 'commercial' ? 'Коммерческий этаж' : kind === 'penthouse' ? 'Пентхаус' : 'Типовой этаж'
  };
}
