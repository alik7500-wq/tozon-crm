import React from 'react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import {CustomerPkoBookPage} from './CustomerPkoBookPage';
import {financeApi} from '../../api/finance.api';
import {customerBookPrintHtml,duplicatePkoNumbers} from './customerPkoBookUtils';
vi.mock('../../api/finance.api',()=>({financeApi:{getIncome:vi.fn()}}));
vi.mock('../../api/dictionaries.api',()=>({dictionariesApi:{getItems:async()=>[]}}));
vi.mock('../../components/FinanceTabs',()=>({FinanceTabs:()=>null}));
vi.mock('./PaymentReceiptPrintModal',()=>({PaymentReceiptPrintModal:({payment})=><div>Печать документа {payment.document_number||payment.reference}</div>}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const rows=[{id:1,document_number:'ПКО-98',reference:'old',clientName:'Покупатель',date:'2026-10-19',amount:100,currency:'USD',status:'ACTIVE',cashDeskName:'Касса А'},{id:2,reference:'ПКО-97',date:'2026-10-18',amount:200,currency:'USD',status:'VOIDED'}];
const open=()=>{
 financeApi.getIncome.mockResolvedValue({list:rows,totalsByCurrency:{USD:100}});
 return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><CustomerPkoBookPage/></MemoryRouter></QueryClientProvider>);
};
describe('customer receipt book',()=>{
 it('loads only the customer book, includes voided records and prints the server-issued number',async()=>{
  open();await screen.findByText('ПКО-98');
  expect(financeApi.getIncome).toHaveBeenCalledWith(expect.objectContaining({customer_book:'1',include_voided:'1',year:'ALL'}));
  expect(screen.getByText('Аннулирован')).toBeDefined();
  fireEvent.click(screen.getByRole('button',{name:'Печать ПКО-98'}));
  expect(screen.getByText('Печать документа ПКО-98')).toBeDefined();
 });
 it('sends current filters and provides a clear export/print action',async()=>{
  open();await screen.findByText('ПКО-98');
  fireEvent.change(screen.getByLabelText('Поиск по книге'),{target:{value:'0045'}});
  await waitFor(()=>expect(financeApi.getIncome).toHaveBeenLastCalledWith(expect.objectContaining({search:'0045'})));
  expect(screen.getByRole('button',{name:'Экспорт в Excel'})).toBeDefined();expect(screen.getByRole('button',{name:'Печать книги'})).toBeDefined();
 });
 it('marks legacy duplicates without assigning a replacement number and escapes print content',()=>{
  expect([...duplicatePkoNumbers([{reference:'ПКО-25'},{reference:'ПКО-25'}])]).toEqual(['ПКО-25']);
  const html=customerBookPrintHtml([{...rows[0],clientName:'<script>alert(1)</script>'}]);
  expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('ПКО-98');
 });
});
