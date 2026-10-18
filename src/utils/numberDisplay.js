const areaFormatter = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 2});

// Presentation only: keep calculations and submitted numeric values unchanged.
export function formatMeasure(value) {
  if (value == null || value === '') return '—';
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? areaFormatter.format(number) : String(value);
}

const stripFractionZeros = decimal => decimal.replace(/0+$/, '').replace(/[.,]$/, '');
// Clean a numeric field or a measurement inside a title/description. Never rewrite
// dates, identifiers, phone numbers, URLs or decimal numbers without a unit in text.
export function trimDecimalZeros(value) {
  const text = String(value ?? '');
  if (/^-?\d+[.,]\d+$/.test(text)) return stripFractionZeros(text);
  return text.replace(/(?<![\p{L}\p{N}_.,:/])(-?\d+[.,]\d+)(?=\s*(?:м²|м2|m²|m2|м\.кв\.|кв\.\s*м|см|мм|м|USD|TJS|RUB|сомони|сомонӣ)(?![\p{L}\p{N}_]))/gu, stripFractionZeros);
}
