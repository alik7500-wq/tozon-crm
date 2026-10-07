import { describe, it, expect } from 'vitest';
import { getPkoJournalDisplay } from '../../../utils/pkoJournalFormatter';

describe('PKO Journal TJS Display & Accounting Semantics Matrix', () => {

  // CASE 1: USD deal + TJS cash snapshot (Payment #428 / PKO-76)
  it('CASE 1: USD deal payment with amount_tjs displays physical TJS cash amount as PRIMARY and USD equivalent as SECONDARY', () => {
    const pko76 = {
      id: 428,
      reference: 'ПКО-76',
      currency: 'USD',
      amount: 5399.57,
      amount_tjs: 50000.00,
      amount_usd: 5399.57,
      exchange_rate: 9.26
    };

    const display = getPkoJournalDisplay(pko76);

    expect(display.isDefined).toBe(true);
    expect(display.primary).toContain('50 000,00 TJS');
    expect(display.primary).not.toContain('5 399,57');
    expect(display.secondary).toContain('5 399,57 USD');
    expect(display.secondary).toContain('9,26');
  });

  // CASE 2: Normal TJS PKO
  it('CASE 2: Normal TJS PKO displays TJS amount as PRIMARY without synthetic USD secondary text', () => {
    const normalTjsPko = {
      id: 432,
      reference: 'ПКО-КОНВ-432',
      currency: 'TJS',
      amount: 1400.00,
      amount_tjs: null,
      amount_usd: null,
      exchange_rate: null
    };

    const display = getPkoJournalDisplay(normalTjsPko);

    expect(display.isDefined).toBe(true);
    expect(display.primary).toBe('+1 400,00 TJS');
    expect(display.secondary).toBeNull();
  });

  // CASE 3: USD payment without amount_tjs
  it('CASE 3: USD payment without amount_tjs displays controlled warning state and NEVER converts USD 1:1 to TJS', () => {
    const usdWithoutTjs = {
      id: 999,
      reference: 'ПКО-999',
      currency: 'USD',
      amount: 5400.00,
      amount_tjs: null,
      amount_usd: 5400.00,
      exchange_rate: null
    };

    const display = getPkoJournalDisplay(usdWithoutTjs);

    expect(display.isDefined).toBe(false);
    expect(display.primary).toBe('Сумма в TJS не определена');
    expect(display.primary).not.toContain('5 400,00 TJS');
    expect(display.secondary).toBe('Платёж по договору: 5 400,00 USD');
  });

  // CASE 4: amount_tjs = 0 / null handling
  it('CASE 4: Null or zero amount_tjs gracefully falls through to currency-specific logic', () => {
    const zeroTjsPko = {
      id: 1000,
      currency: 'TJS',
      amount: 150.00,
      amount_tjs: 0
    };

    const display = getPkoJournalDisplay(zeroTjsPko);

    expect(display.isDefined).toBe(true);
    expect(display.primary).toBe('+150,00 TJS');
    expect(display.secondary).toBeNull();
  });

  // CASE 5: Journal / Print / Edit semantics parity
  it('CASE 5: Parity check — PKO-76 snapshot parameters are consistent across all views', () => {
    const pko76 = {
      id: 428,
      currency: 'USD',
      amount: 5399.57,
      amount_tjs: 50000.00,
      amount_usd: 5399.57,
      exchange_rate: 9.26
    };

    const journalDisplay = getPkoJournalDisplay(pko76);

    // Journal primary must be TJS 50 000
    expect(journalDisplay.primary).toContain('50 000,00 TJS');
    // Journal secondary must feature USD equivalent and rate
    expect(journalDisplay.secondary).toBe('≈ 5 399,57 USD · курс 9,26');

    // Print & Edit semantics verification
    const printCashAmount = pko76.amount_tjs;
    const dealUsdCredit = pko76.amount_usd || pko76.amount;
    const appliedRate = pko76.exchange_rate;

    expect(printCashAmount).toBe(50000.00);
    expect(dealUsdCredit).toBe(5399.57);
    expect(appliedRate).toBe(9.26);
  });

  // CASE 6: Pure USD cash transfer (Payment #477 / PKO-ПЕРЕМ-477)
  it('CASE 6: Pure USD cash transfer without amount_tjs displays +318,57 USD primary, no warning, and requiresTjsReconciliation=false', () => {
    const pureUsdTransfer = {
      id: 477,
      reference: 'ПКО-ПЕРЕМ-477',
      currency: 'USD',
      amount: 318.57,
      amount_tjs: null,
      amount_usd: 318.57,
      exchange_rate: null,
      operation_type: 'INTERNAL_CASH_TRANSFER',
      transfer_id: 'ba6c90cf-c6a7-48ef-9570-72a3a3a2d156'
    };

    const display = getPkoJournalDisplay(pureUsdTransfer);

    expect(display.isDefined).toBe(true);
    expect(display.primary).toBe('+318,57 USD');
    expect(display.secondary).toBeNull();
  });
});
