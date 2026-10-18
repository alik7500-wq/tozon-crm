import {describe, it, expect} from 'vitest';
import {formatMeasure, trimDecimalZeros} from '../numberDisplay';

describe('measurement display', () => {
  it.each([[55.71, '55,71'], ['56.1800000000000000', '56,18'], [55, '55'], ['3.150000', '3,15'], [0, '0'], ['30,63000', '30,63'], [0.1 + 0.2, '0,3'], [null, '—']])('formats %s without padding or losing area hundredths', (value, expected) => {
    expect(formatMeasure(value)).toBe(expected);
  });
  it.each([
    ['Блок А — тип 5 — 55.7100000000000000 м²', 'Блок А — тип 5 — 55.71 м²'],
    ['Площадь 56,180000 м², потолок 3,150000 м', 'Площадь 56,18 м², потолок 3,15 м'],
    ['56.7400000000000000', '56.74'],
    ['81.8050', '81.805'],
    ['0.000', '0'],
    ['100.000 м²', '100 м²'],
    [null, ''],
  ])('cleans stored decimal zeros in %s', (value, expected) => {
    expect(trimDecimalZeros(value)).toBe(expected);
  });
  it.each(['18.10.2026', 'PDF20251016-A-5', 'TZ-2026-0003', '+992001200000', 'https://example.com/55.710000м²', 'Версия 1.00', 'Цена 123.4506 без единицы'])('preserves unrelated text: %s', value => {
    expect(trimDecimalZeros(value)).toBe(value);
  });
});
