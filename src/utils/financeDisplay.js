const formatter = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatFinanceNumber = value => formatter.format(Number(value));

// Format monetary annotations without changing dates, document numbers or saved data.
export function formatFinanceText(value) {
  return String(value ?? '')
    .replace(/(\d+[.,]\d+)(?=\s*(?:TJS|USD|RUB|сомони|сомонӣ|смн)\b)/gi,
      number => formatFinanceNumber(number.replace(',', '.')))
    .replace(/((?:по курсу|курс)[:\s]+)(\d+(?:[.,]\d+)?)/gi,
      (_, label, number) => label + formatFinanceNumber(number.replace(',', '.')));
}
