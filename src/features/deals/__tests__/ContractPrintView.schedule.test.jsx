import React from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ContractPrintView } from '../ContractPrintView';
vi.mock('../../../api/client', () => ({ api: { get: vi.fn().mockResolvedValue({ data: {} }) } }));
afterEach(cleanup);
it.each(['TJ', 'RU'])('prints real receipt dates and omits zero advance (%s)', lang => {
  render(<ContractPrintView initialLang={lang} onClose={() => {}} deal={{
    id: 33, contract_number: '0023', passport_number: 'TEST', currency: 'USD',
    final_price_minor: 4054800, down_payment_minor: 0,
    schedules: [{ due_date: '2026-08-21', amount_minor: 169000, paid_amount_minor: 110000, updated_at: '2026-09-26', status: 'OVERDUE' }],
    payments: [{ id: 107, reference: 'ПКО-50', payment_date: '2026-08-21', amount_minor: 110000, status: 'ACTIVE' }],
  }} />);
  fireEvent.click(screen.getByText(lang === 'TJ' ? 'Ҷадвали пардохт' : 'График платежей'));
  const section = document.getElementById('print-section');
  const rows = section.querySelectorAll('table')[0].querySelectorAll('tbody tr');
  expect(rows[0].cells[0].textContent).toBe('1');
  expect(rows[0].cells[1].textContent).toBe('21.08.2026');
  expect(rows[0].cells[3].textContent).toBe('21.08.2026');
  expect(section.textContent).not.toContain('26.09.2026');
  expect(section.textContent).toContain('ПКО-50');
  expect(section.querySelectorAll('table')).toHaveLength(2);
});
