export const getUnitKind = (unit) => unit?.unit_kind || unit?.units?.unit_kind || 'APARTMENT';

export const getUnitTitle = (unit, language = 'RU') => {
  const names = language === 'TJ'
    ? { APARTMENT: 'Хона', PARKING: 'Ҷойи таваққуф', COMMERCIAL: 'Бинои ғайриистиқоматӣ' }
    : { APARTMENT: 'Квартира', PARKING: 'Машино-место', COMMERCIAL: 'Коммерческое помещение' };
  return names[getUnitKind(unit)] || names.APARTMENT;
};

export const getUnitDefaultPrice = (unit) => Number(unit?.price_per_m2_minor) > 0
  ? Number(unit.price_per_m2_minor) / 100
  : (Number(unit?.price_per_m2) > 0 ? Number(unit.price_per_m2) : (isNonResidentialUnit(unit) ? 0 : 500));

export const getUnitKindLabel = (unit) => {
  if (getUnitKind(unit) === 'PARKING') return 'Машино-место';
  if (getUnitKind(unit) === 'COMMERCIAL') return 'Коммерция';
  const rooms = unit?.rooms ?? unit?.unit_rooms;
  return rooms === 0 ? 'Студия' : `${rooms ?? ''}к`;
};

export const isNonResidentialUnit = (unit) => ['PARKING', 'COMMERCIAL'].includes(getUnitKind(unit));
