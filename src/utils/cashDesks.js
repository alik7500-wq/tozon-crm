export const DEFAULT_CASH_DESKS = [
  { id: 'MAIN_CASHIER', name: 'Главная касса компании (Бухгалтерия)', icon: '🏢' },
  { id: 'DIRECTOR', name: 'Касса Директора (Руководство)', icon: '👔' },
  { id: 'SALES_MANAGER', name: 'Касса Менеджера продаж (Отдел продаж)', icon: '💼' },
  { id: 'FINANCE_OFFICE', name: 'Касса Казначейства / Финансового отдела', icon: '🏦' },
  { id: 'BANK_ACCOUNT', name: 'Расчетный счет в банке (Безналичные)', icon: '🏛' },
];

/**
 * Собирает список касс исключительно на основе справочника "Кассы компании" из Настроек
 */
export const buildCashDesksList = (dictionaryItems = []) => {
  if (dictionaryItems && dictionaryItems.length > 0) {
    return dictionaryItems.map(d => ({
      id: d.code || `CASH_DESK_${d.id}`,
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
 * Обновляет или добавляет блок [Касса: ...] в примечание
 */
export const updateCommentWithCashDesk = (comment, newDeskName) => {
  const text = comment || '';
  if (!newDeskName) {
    return text.replace(/\[Касса:\s*[^\]]+\]\s*/gi, '').trim();
  }
  if (/\[Касса:\s*[^\]]+\]/i.test(text)) {
    return text.replace(/\[Касса:\s*[^\]]+\]/i, `[Касса: ${newDeskName}]`);
  }
  if (text.trim().length === 0) {
    return `[Касса: ${newDeskName}]`;
  }
  return `[Касса: ${newDeskName}] ${text}`.trim();
};
