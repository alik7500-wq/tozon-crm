export const getUnitKindLabel = (unit) => {
  if (unit?.unit_kind === 'PARKING') return 'Машино-место';
  if (unit?.unit_kind === 'COMMERCIAL') return 'Коммерция';
  return unit?.rooms === 0 ? 'Студия' : `${unit?.rooms ?? ''}к`;
};

export const isNonResidentialUnit = (unit) => ['PARKING', 'COMMERCIAL'].includes(unit?.unit_kind);
