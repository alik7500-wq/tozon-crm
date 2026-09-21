export const DEFAULT_CASH_DESKS = [
  { id: 'ab90800a-73af-4cf7-88c2-397c304e2edf', code: 'SALES_MANAGER', name: 'Касса Отдела продаж (Акмалхон)', icon: '💼' },
  { id: '6ddf2f64-0a77-4aeb-8daf-a391b2da0141', code: 'MAIN_CASHIER', name: 'Касса компании "Тозон" (Илхомчон)', icon: '🏢' },
  { id: 'fba621e6-4ebe-4459-8623-19f46d864cc6', code: 'SALES_MANAGER_Dadojon', name: 'Касса менеждера (Дадочон)', icon: '👔' },
  { id: 'c16e402e-2af2-4f12-9e9a-073d72a9682a', code: 'BANK_ACCOUNT', name: 'Расчетный счет в банке (Безналичные)', icon: '🏛' },
  { id: '6b5c2380-1ab6-4e39-877a-4f4519a5ab65', code: 'TOZON_PLAZA_INVESTMENT', name: 'Инвестиционная касса TOZON PLAZA', icon: '📈' },
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
 * Динамически определяет ID кассы менеджера на основе данных пользователя и списка касс из API.
 * При неоднозначном результате или отсутствии у пользователя собственной кассы
 * функция возвращает null, предотвращая случайный доступ к чужим кассам.
 */
export const resolveManagerDeskId = (user, cashDesksList = []) => {
  if (!user) return null;
  const list = (cashDesksList && cashDesksList.length > 0) ? cashDesksList : DEFAULT_CASH_DESKS;

  // 1. Прямая привязка по ID кассы в профиле пользователя (наивысший приоритет)
  if (user?.cash_desk_id) {
    const found = list.find(d => String(d.id) === String(user.cash_desk_id));
    if (found) return found.id;
  }
  if (user?.desk_id) {
    const found = list.find(d => String(d.id) === String(user.desk_id));
    if (found) return found.id;
  }

  // 2. Поиск совпадений по имени менеджера в названии кассы
  const userName = (user?.name || user?.full_name || '').trim().toLowerCase();
  if (userName && userName.length > 2) {
    const matchedByName = list.filter(d => d.name && d.name.toLowerCase().includes(userName));
    // Если найдена ровно одна уникальная касса — используем её
    if (matchedByName.length === 1) {
      return matchedByName[0].id;
    }
    // При неоднозначности (несколько совпадений) — завершаемся безопасно
    if (matchedByName.length > 1) {
      console.warn(`[resolveManagerDeskId] Найдено несколько касс по имени "${userName}". Выбор заблокирован ради безопасности.`);
      return null;
    }
  }

  // 3. Сопоставление по известным первично настроенным персональным кодам
  if (user?.username === 'Dadojon' || userName.includes('дадочон')) {
    const matchedByCode = list.find(d => d.code === 'SALES_MANAGER_Dadojon' || (d.name && d.name.includes('Дадочон')));
    if (matchedByCode) return matchedByCode.id;
  }

  // Безопасная блокировка: при отсутствии привязки возврат null
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
