import React,{useState} from 'react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {ExpenseSettlementFields} from '../ExpenseSettlementFields';
afterEach(cleanup);
const parties=[{id:'supplier',name:'Сифат',kind:'SUPPLIER',active:true},{id:'debtor',name:'Дебитор',kind:'DEBTOR',active:true},{id:'old',name:'Архив',kind:'SUPPLIER',active:false}];
function Harness(){const [value,setValue]=useState({amount:100,currency:'TJS'});return <ExpenseSettlementFields value={value} onChange={patch=>setValue(v=>({...v,...patch}))} parties={parties}/>;}
describe('Expense automatic settlement fields',()=>{
 it('selects supplier and defaults to reducing payable debt in original currency',()=>{
  render(<Harness/>);fireEvent.change(screen.getByLabelText('Контрагент в расчётах'),{target:{value:'supplier'}});
  expect(screen.getByLabelText('Назначение расчёта').value).toBe('PAYABLE');expect(screen.getByText(/Долг перед контрагентом уменьшится/).textContent).toContain('100 TJS');
 });
 it('offers debit and advance directions and unlinks on selecting ordinary expense',()=>{
  render(<Harness/>);fireEvent.change(screen.getByLabelText('Контрагент в расчётах'),{target:{value:'debtor'}});
  expect(screen.getByLabelText('Назначение расчёта').value).toBe('RECEIVABLE');
  fireEvent.change(screen.getByLabelText('Назначение расчёта'),{target:{value:'ADVANCE_RECEIVED'}});expect(screen.getByText(/Полученный аванс уменьшится/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Контрагент в расчётах'),{target:{value:''}});expect(screen.queryByLabelText('Назначение расчёта')).toBeNull();
 });
 it('does not offer archived parties for new links and shows load errors',()=>{
  render(<ExpenseSettlementFields value={{}} onChange={vi.fn()} parties={parties} error={new Error('Offline')}/>);
  expect(screen.queryByText('Архив')).toBeNull();expect(screen.getByRole('alert')).toBeTruthy();
 });
});
