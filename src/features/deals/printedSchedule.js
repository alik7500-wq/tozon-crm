const minor = value => Math.max(0, Math.round(Number(value) || 0));

// The plan/paid amounts remain canonical. Receipt dates come only from receipts,
// never schedule.updated_at (which is a recalculation timestamp).
export function buildPrintedSchedule(deal) {
  const payments = (deal.payments || [])
    .filter(p => !p.voided_at && !['VOIDED', 'CANCELLED', 'REVERSED'].includes(p.status))
    // Match the deal API's FIFO calculation: amount_minor is the contract credit.
    .map(p => ({ ...p, creditedMinor: minor(p.amount_minor) }))
    .sort((a, b) => String(a.payment_date || '').localeCompare(String(b.payment_date || '')) || Number(a.id || 0) - Number(b.id || 0));
  const totalPaidMinor = Array.isArray(deal.payments)
    ? payments.reduce((sum, p) => sum + p.creditedMinor, 0)
    : minor(deal.paid_amount_minor ?? deal.total_paid_minor);
  const plannedDpMinor = minor(deal.down_payment_minor);
  const coveredDpMinor = Math.min(plannedDpMinor, minor(deal.down_payment_covered_minor
    ?? (deal.pko_allocations?.length
      ? deal.pko_allocations.reduce((sum, p) => sum + minor(p.down_payment_allocated_minor), 0)
      : totalPaidMinor)));
  const sources = payments.map(p => ({ date: p.payment_date || null, remaining: p.creditedMinor }));
  let sourceIndex = 0;
  const allocateDates = amount => {
    const parts = [];
    let remaining = amount;
    while (remaining > 0 && sourceIndex < sources.length) {
      const source = sources[sourceIndex];
      const used = Math.min(remaining, source.remaining);
      if (used > 0) parts.push({ date: source.date, amountMinor: used });
      remaining -= used;
      source.remaining -= used;
      if (source.remaining === 0) sourceIndex++;
    }
    return parts;
  };
  const rows = [];
  if (plannedDpMinor > 0) rows.push({
    kind: 'downPayment', dueDate: deal.deal_date, planAmount: plannedDpMinor,
    actualAmount: coveredDpMinor || null, parts: allocateDates(coveredDpMinor),
  });
  const schedules = [...(deal.schedules || [])].sort((a, b) =>
    String(a.due_date || '').localeCompare(String(b.due_date || '')) || Number(a.id || 0) - Number(b.id || 0));
  for (const schedule of schedules) {
    const paid = minor(schedule.paid_amount_minor);
    rows.push({ kind: 'installment', dueDate: schedule.due_date,
      planAmount: minor(schedule.amount_minor), actualAmount: paid || null,
      parts: allocateDates(paid), note: schedule.note || '' });
  }
  const unallocated = Math.max(0, totalPaidMinor - rows.reduce((sum, row) => sum + (row.actualAmount || 0), 0));
  if (unallocated > 0) rows.push({ kind: 'unallocated', dueDate: null,
    planAmount: null, actualAmount: unallocated, parts: allocateDates(unallocated) });
  return { rows, payments, totalPaidMinor };
}
