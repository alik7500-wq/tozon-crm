import { describe, it, expect } from 'vitest';
import { buildPrintedSchedule } from '../printedSchedule';

const payments = [
  { id: 107, payment_date: '2026-08-21', amount_minor: 110000, status: 'ACTIVE' },
  { id: 399, payment_date: '2026-09-22', amount_minor: 107875, status: 'ACTIVE' },
  { id: 556, payment_date: '2026-10-26', amount_minor: 100541, status: 'ACTIVE' },
];
const schedules = [
  { id: 715, due_date: '2026-08-21', amount_minor: 169000, paid_amount_minor: 169000, updated_at: '2026-09-26', status: 'PAID' },
  { id: 716, due_date: '2026-09-21', amount_minor: 169000, paid_amount_minor: 149416, updated_at: '2026-10-26', status: 'OVERDUE' },
  { id: 717, due_date: '2026-10-21', amount_minor: 169000, paid_amount_minor: 0 },
];
const deal = { currency: 'USD', down_payment_minor: 0, schedules, payments };

describe('printed schedule receipt dates', () => {
  it('reconciles contract 0023 and shows the actual receipt dates for FIFO splits', () => {
    const result = buildPrintedSchedule(deal);
    expect(result.totalPaidMinor).toBe(318416);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].parts).toEqual([
      { date: '2026-08-21', amountMinor: 110000 },
      { date: '2026-09-22', amountMinor: 59000 },
    ]);
    expect(result.rows[1].parts).toEqual([
      { date: '2026-09-22', amountMinor: 48875 },
      { date: '2026-10-26', amountMinor: 100541 },
    ]);
    expect(result.rows[2].parts).toEqual([]);
    expect(result.rows.reduce((sum, r) => sum + (r.actualAmount || 0), 0)).toBe(result.totalPaidMinor);
  });
  it('consumes a positive down payment before allocating instalments', () => {
    const result = buildPrintedSchedule({ ...deal, down_payment_minor: 50000,
      schedules: [{ ...schedules[0], paid_amount_minor: 60000 }], payments: [payments[0]] });
    expect(result.rows.map(r => r.actualAmount)).toEqual([50000, 60000]);
    expect(result.rows[0].parts).toEqual([{ date: '2026-08-21', amountMinor: 50000 }]);
  });
  it('excludes cancelled, reversed and voided receipts from totals and dates', () => {
    const result = buildPrintedSchedule({ ...deal, payments: [payments[0],
      ...['VOIDED', 'CANCELLED', 'REVERSED'].map(status => ({ ...payments[1], status })),
      { ...payments[2], voided_at: '2026-10-26' }] });
    expect(result.totalPaidMinor).toBe(110000);
    expect(result.payments).toHaveLength(1);
  });
  it('never substitutes schedule dates or update timestamps for unknown receipt dates', () => {
    const result = buildPrintedSchedule({ ...deal, payments: undefined, total_paid_minor: 318416 });
    expect(result.rows.every(row => row.parts.length === 0)).toBe(true);
    expect(result.totalPaidMinor).toBe(318416);
  });
  it('uses an explicit empty payment list as zero rather than a stale summary', () => {
    expect(buildPrintedSchedule({ ...deal, payments: [], total_paid_minor: 318416 }).totalPaidMinor).toBe(0);
  });
  it('sorts receipts and schedules without mutating the source', () => {
    const shuffled = { ...deal, payments: [...payments].reverse(), schedules: [...schedules].reverse() };
    expect(buildPrintedSchedule(shuffled).rows[0].parts[0].date).toBe('2026-08-21');
    expect(shuffled.payments[0].id).toBe(556);
  });
  it('uses the same contract credit as the deal API, independent of receipt snapshots', () => {
    const result = buildPrintedSchedule({ currency: 'USD', payments: [{ amount_minor: '100001', amount_usd: '999.99' }] });
    expect(result.totalPaidMinor).toBe(100001);
    expect(result.rows[0].kind).toBe('unallocated');
    expect(result.rows[0].actualAmount).toBe(100001);
  });
});
