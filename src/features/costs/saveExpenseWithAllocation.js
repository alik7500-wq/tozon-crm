// Once cash is saved, an analytics failure must never become a retryable cash
// failure. The source RKO stays visible in the unassigned queue.
export async function saveExpenseWithAllocation({ payload, allocation, addExpense, saveAllocation }) {
  const result = await addExpense(payload);
  if (!allocation || allocation.mode === 'UNASSIGNED') return result;
  const expense = result?.data || result;
  try {
    if (!expense?.id) throw new Error('Не получен номер сохранённого РКО');
    await saveAllocation(expense.id, allocation);
    return result;
  } catch (error) {
    return { ...expense, cost_allocation_warning: `РКО сохранён. Распределение не сохранено: ${error.message}. Откройте «Себестоимость блоков» и распределите этот РКО. Не создавайте его повторно.` };
  }
}
