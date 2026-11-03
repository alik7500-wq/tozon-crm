// Reviewed vector fragments: one selected block and floor use per document.
export function getShowroomFloorPlan(blockId, floorNumber) {
  const block = {4:['a','А'],3:['b','Б'],6:['v','В'],7:['g','Г']}[Number(blockId)];
  const floor = Number(floorNumber);
  const kind = floorNumber == null ? null : floor === -1 ? 'parking' : floor === 1 ? 'commercial'
    : floor === 10 ? 'penthouse' : Number.isInteger(floor) && floor >= 2 && floor <= 9 ? 'typical' : null;
  if (!block || !kind) return null;
  return {
    url: `/layouts/showroom/block-${block[0]}-${kind}.pdf`,
    block: block[1],
    title: kind === 'parking' ? 'Парковка' : kind === 'commercial' ? 'Коммерческий этаж' : kind === 'penthouse' ? 'Пентхаус' : 'Типовой этаж'
  };
}
