import { formatContractNumber } from './formatters.js';

/**
 * Очищает строку от служебных технических данных кассы, разделов и валютообмена
 */
export const cleanReceiptBasis = (text, fallback = '') => {
  if (!text || typeof text !== 'string') return fallback;

  let clean = text
    .replace(/\[Касса:\s*[^\]]+\]\s*/gi, '')
    .replace(/\[Раздел:\s*[^\]]+\]\s*/gi, '')
    .replace(/\s*•\s*(?:Внесено в кассу:\s*)?[\d\s\u00A0]+(?:[.,]\d+)?\s*(?:TJS|смн|сомонӣ|сомони)[^.]*?(?:\(Курс:[^)]+\))?/gi, '')
    .replace(/\s*•\s*Внесено в кассу:[^\n\r]+/gi, '')
    .replace(/\s*\(Курс:[^)]+\)/gi, '')
    .replace(/^[•\-\s]+|[•\-\s]+$/g, '')
    .trim();

  return clean || fallback;
};

/**
 * Форматирует дату в стандартный вид ДД.ММ.ГГГГ
 */
export const formatReceiptDate = (rawDate, fallbackDateStr = '') => {
  if (!rawDate) return fallbackDateStr;
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) {
    // Попытка разбора строки YYYY-MM-DD
    const parts = String(rawDate).split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
    }
    return String(rawDate);
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

/**
 * Формирует официальную строку основания для ПКО (Приходный кассовый ордер)
 * как для основного бланка, так и для отрывной квитанции ("Расид").
 */
export const getPkoBasisText = ({ payment = {}, deal = null, lang = 'TJ', defaultDateStr = '' }) => {
  const isTJ = lang === 'TJ';

  // 1. Поиск номера договора
  const rawContract = deal?.contract_number ||
    payment?.contract_number ||
    payment?.contract ||
    (payment?.comment ? (payment.comment.match(/договору\s*№?\s*([0-9A-Za-zА-Яа-я_-]+)/i)?.[1] || null) : null);

  const isGenericNonContract = rawContract && (
    String(rawContract).startsWith('СД-') || 
    String(rawContract).startsWith('Прямой')
  );

  const dealContractNum = (!isGenericNonContract && rawContract) 
    ? formatContractNumber(rawContract) 
    : null;

  // 2. Если есть договор — формируем первичное официальное основание договора
  if (dealContractNum) {
    const rawDealDate = deal?.contract_date ||
      deal?.deal_date ||
      payment?.dealDate ||
      payment?.deal_date ||
      payment?.contract_date ||
      (deal?.created_at ? String(deal.created_at).split('T')[0] : null) ||
      payment?.payment_date ||
      payment?.date;

    const dealDateFormatted = formatReceiptDate(rawDealDate, defaultDateStr);

    return isTJ
      ? `Пардохти маблағи ҳиссагузорӣ дар асоси шартномаи № ${dealContractNum} аз ${dealDateFormatted} сол`
      : `Оплата паевого взноса по договору № ${dealContractNum} от ${dealDateFormatted} г.`;
  }

  // 3. Если договора нет — берем первичное очищенное назначение платежа
  const cleanComment = cleanReceiptBasis(payment?.comment || '');
  if (cleanComment) {
    return cleanComment;
  }

  // 4. Резервный юридический текст
  return isTJ
    ? 'Пардохти маблағ ба хазина тибқи асос'
    : 'Прием денежных средств в кассу предприятия';
};

/**
 * Формирует строку основания для РКО (Расходный кассовый ордер)
 */
export const getRkoBasisText = ({ expense = {}, lang = 'TJ' }) => {
  const isTJ = lang === 'TJ';

  const rawDesc = expense?.description || expense?.comment || '';
  const cleanDesc = cleanReceiptBasis(rawDesc);

  if (cleanDesc) {
    return cleanDesc;
  }

  if (expense?.category && typeof expense.category === 'string') {
    return expense.category.trim();
  }

  return isTJ ? 'Хароҷоти амалиётӣ' : 'Операционный расход';
};
