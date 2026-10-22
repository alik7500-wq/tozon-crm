import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ContractPrintView } from '../ContractPrintView';
import { api } from '../../../api/client';
vi.mock('../../../api/client', () => ({ api: { get: vi.fn().mockResolvedValue({ data: {} }) } }));
const base = { id: 15, unit_id: 24, unit_number: '24', unit_kind: 'APARTMENT', payment_type: 'PARTIAL_BARTER', passport_number: 'TEST', contract_number: '0060', currency: 'USD', barter_amount_minor: 1405425, final_price_minor: 5000000, down_payment_minor: 2000000, schedules: [{ due_date: '2026-11-22', amount_minor: 3000000, paid_amount_minor: 0 }] };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const clause = () => [...document.querySelectorAll('#print-section p')].find(p => p.textContent.startsWith('6.5.'))?.textContent.replace(/\u00a0|\u202f/g, ' ');
describe('saved barter amount in contract and vehicle act', () => {
 it.each(['TJ','RU'])('prints saved USD cents in clause 6.5 and act (%s)', lang => {
  render(<ContractPrintView deal={base} initialLang={lang} onClose={() => {}} />);
  expect(clause()).toContain('14 054,25'); expect(clause()).toContain('(USD)');
  expect(clause()).not.toMatch(/сомон/);
  fireEvent.click(screen.getByText(lang === 'TJ' ? 'Санади қабулу супоридан' : 'Акт приёма-передачи'));
  const text = document.getElementById('print-section').textContent.replace(/\u00a0|\u202f/g, ' ');
  expect(text).toContain('14 054,25'); expect(text).toContain('(USD)');
 });
 it.each(['TJ','RU'])('prints saved TJS amount (%s)', lang => {
  render(<ContractPrintView deal={{ ...base, currency: 'TJS', barter_amount_minor: '12000000' }} initialLang={lang} onClose={() => {}} />);
  expect(clause()).toContain('120 000,00'); expect(clause()).toContain('(TJS)'); expect(clause()).not.toContain('USD');
 });
 it('uses saved data for contract 0054 rather than a hardcoded amount', () => {
  render(<ContractPrintView deal={{ ...base, contract_number: '0054', barter_amount_minor: 800000 }} initialLang="RU" onClose={() => {}} />);
  expect(clause()).toContain('8 000,00'); expect(clause()).not.toContain('120 000');
 });
 it.each([null, 0, -100, 'invalid'])('does not invent amounts for invalid saved value %s', value => {
  render(<ContractPrintView deal={{ ...base, barter_amount_minor: value }} initialLang="RU" onClose={() => {}} />);
  expect(clause()).toContain('________________'); expect(clause()).not.toContain('120 000');
 });
 it.each(['nested','flat'])('loads missing barter data from canonical deal response (%s)', async shape => {
  api.get.mockResolvedValue(shape === 'nested' ? { data: { deal: base } } : { deal: base });
  render(<ContractPrintView deal={{ ...base, barter_amount_minor: undefined }} initialLang="RU" onClose={() => {}} />);
  await waitFor(() => expect(clause()).toContain('14 054,25'));
  expect(api.get).toHaveBeenCalledWith('/deals/15');
 });
 it('resets amount when selecting another contract', () => {
  const view = render(<ContractPrintView deal={base} initialLang="RU" onClose={() => {}} />);
  view.rerender(<ContractPrintView deal={{ ...base, id: 16, barter_amount_minor: 200000 }} initialLang="RU" onClose={() => {}} />);
  expect(clause()).toContain('2 000,00'); expect(clause()).not.toContain('14 054');
 });
 it('does not add the vehicle clause to a cash-only contract', () => {
  render(<ContractPrintView deal={{ ...base, payment_type: 'INSTALLMENT' }} initialLang="RU" onClose={() => {}} />);
  expect(clause()).toBeUndefined();
 });
});
