import { describe, it, expect } from 'vitest';
import { summarizeInvestments } from '../InvestmentSummaryCard';
const investment = (extra = {}) => ({ operationType: 'INVESTMENT', currency: 'USD', amount: 100, payerName: 'Акмалхон', ...extra });
describe('Investment summary', () => {
  it('groups investors and uses saved exchange snapshots', () => {
    const result = summarizeInvestments([investment(), investment({ payerName: ' акмалхон ', amount: 10.01 }), investment({ payerName: 'Илхом', currency: 'TJS', amount: 926, amountUsd: 100 })]);
    expect(result.totalMinor).toBe(21001);
    expect(result.investors).toHaveLength(2);
    expect(result.investors[0].usdMinor).toBe(11001);
  });
  it('excludes cancelled, internal transfer and ordinary receipts', () => {
    expect(summarizeInvestments([investment({ status: 'VOIDED' }), investment({ transferId: 'transfer' }), investment({ operationType: 'STANDARD' })]).totalMinor).toBe(0);
  });
  it('does not invent a conversion rate for foreign currency', () => {
    const result = summarizeInvestments([investment({ currency: 'TJS', amount: 926 })]);
    expect(result.totalMinor).toBe(0);
    expect(result.missingRate).toBe(1);
    expect(result.investors[0].currencies.TJS).toBe(92600);
  });
});
