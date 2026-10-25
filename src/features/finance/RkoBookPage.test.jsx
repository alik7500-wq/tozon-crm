import React from 'react';
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import {RkoBookPage} from './RkoBookPage';
import {financeApi} from '../../api/finance.api';
import {api} from '../../api/client';
import {rkoBookPrintHtml,duplicateRkoNumbers} from './rkoBookUtils';
vi.mock('../../api/finance.api',()=>({financeApi:{getRkoBook:vi.fn()}}));
vi.mock('../../api/client',()=>({api:{get:vi.fn()}}));
vi.mock('../../api/dictionaries.api',()=>({dictionariesApi:{getItems:async()=>[{id:'a',name:'Касса А'}]}}));
vi.mock('../../components/FinanceTabs',()=>({FinanceTabs:()=>null}));
vi.mock('./ExpenseReceiptPrintModal',()=>({ExpenseReceiptPrintModal:({expense})=><div>Печать ордера {expense.reference}</div>}));
const rows=[{id:1,reference:'РКО-846',date:'2026-10-25',recipient:'Бетонзавод',amount:100,currency:'TJS',status:'ACTIVE',cashDeskName:'Касса А'},{id:2,reference:'РКО-845',amount:200,currency:'USD',status:'VOIDED'}];
const open=()=>render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><RkoBookPage/></MemoryRouter></QueryClientProvider>);
beforeEach(()=>{financeApi.getRkoBook.mockResolvedValue({list:rows,availableCurrencies:['TJS','USD'],totalsByCurrency:{TJS:100}});});
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();});
describe('RKO book page',()=>{
 it('loads all statuses, displays original numbers and prints an expense',async()=>{
  open();await screen.findByText('РКО-846');expect(financeApi.getRkoBook).toHaveBeenCalledWith(expect.objectContaining({book_status:'ALL'}));expect(screen.getByText('Аннулирован')).toBeDefined();
  fireEvent.click(screen.getByRole('button',{name:'Печать РКО-846'}));expect(screen.getByText('Печать ордера РКО-846')).toBeDefined();
 });
 it('sends every selected filter to the book endpoint and the Excel export',async()=>{
  open();await screen.findByText('РКО-846');
  fireEvent.change(screen.getByLabelText('Поиск по книге РКО'),{target:{value:'бетон'}});fireEvent.change(screen.getByLabelText('Касса'),{target:{value:'a'}});fireEvent.change(screen.getByLabelText('С даты'),{target:{value:'2026-10-01'}});fireEvent.change(screen.getByLabelText('Статус'),{target:{value:'ACTIVE'}});
  await waitFor(()=>expect(financeApi.getRkoBook).toHaveBeenLastCalledWith(expect.objectContaining({search:'бетон',cash_desk_id:'a',date_from:'2026-10-01',book_status:'ACTIVE'})));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Экспорт в Excel'}).disabled).toBe(false));api.get.mockRejectedValueOnce(new Error('Ошибка экспорта'));fireEvent.click(screen.getByRole('button',{name:'Экспорт в Excel'}));await screen.findByText('Ошибка экспорта');
  expect(api.get).toHaveBeenCalledWith('/finance/expenses/book.xlsx',expect.objectContaining({params:expect.objectContaining({search:'бетон',cash_desk_id:'a',book_status:'ACTIVE'}),responseType:'blob'}));
 });
 it('prints the filtered book and totals, escaping user text',()=>{
  const html=rkoBookPrintHtml([{...rows[0],recipient:'<img onerror=bad>',description:'<script>x</script>'}],{TJS:100});expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');expect(html).toContain('100.00 TJS');expect(html).toContain('РКО-846');
  expect([...duplicateRkoNumbers([rows[0],{...rows[0],id:3}])]).toEqual(['РКО-846']);
 });
 it('shows a clear error rather than an empty success when loading fails',async()=>{
  financeApi.getRkoBook.mockRejectedValueOnce(new Error('Нет доступа'));open();await screen.findByRole('alert');expect(screen.queryByText('По выбранным условиям РКО не найдены.')).toBeNull();expect(screen.getByRole('button',{name:'Экспорт в Excel'}).disabled).toBe(true);
 });
});
