export const DEFAULT_CASH_DESKS = [
  { id: 'ab90800a-73af-4cf7-88c2-397c304e2edf', code: 'SALES_MANAGER', name: 'Касса Отдела продаж (Акмалхон)', icon: '💼' },
  { id: '6ddf2f64-0a77-4aeb-8daf-a391b2da0141', code: 'MAIN_CASHIER', name: 'Касса компании "Тозон" (Илхомчон)', icon: '🏢' },
  { id: 'fba621e6-4ebe-4459-8623-19f46d864cc6', code: 'SALES_MANAGER_Dadojon', name: 'Касса менеждера (Дадочон)', icon: '👔' },
  { id: 'c16e402e-2af2-4f12-9e9a-073d72a9682a', code: 'BANK_ACCOUNT', name: 'Расчетный счет в банке (Безналичные)', icon: '🏛' },
];

/**
 * Собирает список касс на основе справочника "Кассы компании" из Настроек
 */
export const buildCashDesksList = (dictionaryItems = []) => {
  if (dictionaryItems && dictionaryItems.length > 0) {
    return dictionaryItems.map(d => ({
      id: d.id || d.code || `CASH_DESK_${d.id}`,
      code: d.code,
      name: d.name,
      icon: d.icon || '🏢'
    }));
  }
  return DEFAULT_CASH_DESKS;
};

/**
 * Извлекает название кассы из строки примечания [Касса: ...]
 */
export const extractCashDeskFromComment = (comment) => {
  if (!comment) return '';
  const match = String(comment).match(/\[Касса:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : '';
};

/**
 * Очищает строку от технических тегов [Касса: ...] и [IDEMP: ...]
 */
export const cleanCashDeskFromComment = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/\[Касса:\s*[^\]]+\]\s*/gi, '')
    .replace(/\[IDEMP:[^\]]+\]\s*/gi, '')
    .trim();
};

/**
 * Сопоставляет переданный идентификатор или название с объектом кассы
 */
export const resolveCashDesk = (deskNameOrId, cashDesksList = []) => {
  const list = (cashDesksList && cashDesksList.length > 0) ? cashDesksList : DEFAULT_CASH_DESKS;
  if (!deskNameOrId) return null;
  const str = String(deskNameOrId).trim().toLowerCase();

  // 1. По точному ID или code
  let found = list.find(c => String(c.id).toLowerCase() === str || (c.code && c.code.toLowerCase() === str));
  if (found) return found;

  // 2. По точному названию
  found = list.find(c => c.name.toLowerCase() === str);
  if (found) return found;

  return null;
};

/**
 * Обновляет или добавляет блок [Касса: ...] в примечание
 */
export const updateCommentWithCashDesk = (comment, newDeskName) => {
  const text = cleanCashDeskFromComment(comment);
  if (!newDeskName) {
    return text;
  }
  if (text.length === 0) {
    return `[Касса: ${newDeskName}]`;
  }
  return `[Касса: ${newDeskName}] ${text}`.trim();
};
