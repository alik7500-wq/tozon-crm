export const COST_STATES = { UNASSIGNED: 'Не распределён', DIRECT: 'Расход одного блока', SHARED: 'Общий расход по площади', EXCLUDED: 'Не включать в затраты', AUTO_EXCLUDED: 'Исключён автоматически', MISSING_FX: 'Нет курса / USD' };
export const emptyAllocation = () => ({ mode: 'UNASSIGNED', building_ids: [], reason: '' });
export function allocationPayload(value, expectedVersion = 0) {
  if (value.mode === 'DIRECT' && value.building_ids.length !== 1) throw new Error('Выберите один блок');
  if (value.mode === 'SHARED' && value.building_ids.length < 2) throw new Error('Выберите минимум два блока');
  if (value.reason.trim().length < 3) throw new Error('Укажите основание распределения (минимум 3 символа)');
  return { ...value, building_ids: ['DIRECT', 'SHARED'].includes(value.mode) ? value.building_ids.map(Number) : [], expected_version: expectedVersion };
}

