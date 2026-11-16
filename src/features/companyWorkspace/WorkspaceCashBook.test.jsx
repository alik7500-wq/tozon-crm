import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act,within} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WorkspaceCashBook from './WorkspaceCashBook';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn()}}));
const row={id:1,kind:'INCOME',date:'2026-11-01',amount:'1000.50',currency:'TJS',status:'ACTIVE',active:true,settlement_method:'CASH',operation_type:'STANDARD',special:false};
const data={cash_desks:[{id:'a',name:'Касса Plaza',active:true},{id:'b',name:'Вторая касса',active:false}],selected_cash_desk_id:'a',requires_review:false,records:[row,{...row,id:2,kind:'EXPENSE',date:'2026-11-02',currency:'USD',amount:'20.00'}],totals:[{currency:'TJS',income:'1000.50',expense:'0.00',balance:'1000.50'}]};
beforeEach(()=>{vi.clearAllMocks();api.get.mockResolvedValue({data});});afterEach(cleanup);
it('reads only the scoped route and keeps full-history totals separate from local journal filters',async()=>{
 render(<WorkspaceCashBook project="plaza" version={0}/>);await screen.findByText('ПКО №1');expect(screen.getByLabelText('Итоги кассы за всё время')).toHaveTextContent('1 000,50 TJS');
 fireEvent.change(screen.getByLabelText('Валюта кассовой книги'),{target:{value:'USD'}});expect(screen.queryByText('ПКО №1')).toBeNull();expect(screen.getByText('РКО №2')).toBeVisible();expect(screen.getByLabelText('Итоги кассы за всё время')).toHaveTextContent('1 000,50 TJS');
 fireEvent.change(screen.getByLabelText('Кассовая книга с даты'),{target:{value:'2026-11-03'}});expect(screen.getByText('По выбранным фильтрам документов нет.')).toBeVisible();
 fireEvent.change(screen.getByLabelText('Кассовая книга по дату'),{target:{value:'2026-11-01'}});expect(screen.getByRole('alert')).toHaveTextContent('Начальная дата');
 expect(api.get).toHaveBeenCalledTimes(1);expect(api.get).toHaveBeenCalledWith('/project-workspace/plaza/cash-book',expect.objectContaining({params:{}}));
});
it('never renders a balance when history requires reconciliation',async()=>{
 api.get.mockResolvedValue({data:{...data,requires_review:true,totals:null,records:[{...row,operation_type:'INTERNAL_CASH_TRANSFER',special:true}]}});
 render(<WorkspaceCashBook project="plaza" version={0}/>);expect(await screen.findByRole('alert')).toHaveTextContent('Остаток требует сверки');expect(screen.queryByLabelText('Итоги кассы за всё время')).toBeNull();expect(screen.getByText('Перевод / обмен')).toBeVisible();
 fireEvent.change(screen.getByLabelText('Кассовая книга с даты'),{target:{value:'2026-11-01'}});expect(screen.queryByRole('region',{name:'Итоги кассы за период'})).toBeNull();
});
it('hides prior cash data while switching desk and after access revocation',async()=>{
 let resolve;api.get.mockImplementation((path,o)=>o.params.cash_desk_id?new Promise(r=>{resolve=r;}):Promise.resolve({data}));
 const view=render(<WorkspaceCashBook project="plaza" version={0}/>);await screen.findByText('ПКО №1');fireEvent.change(screen.getByLabelText('Кассовая книга с даты'),{target:{value:'2026-11-01'}});expect(screen.getByRole('region',{name:'Итоги кассы за период'})).toBeVisible();fireEvent.change(screen.getByLabelText('Касса книги'),{target:{value:'b'}});expect(screen.queryByText('ПКО №1')).toBeNull();expect(screen.queryByLabelText('Итоги кассы за всё время')).toBeNull();expect(screen.queryByRole('region',{name:'Итоги кассы за период'})).toBeNull();
 expect(api.get).toHaveBeenLastCalledWith('/project-workspace/plaza/cash-book',expect.objectContaining({params:{cash_desk_id:'b'}}));
 await act(async()=>resolve({data:{...data,selected_cash_desk_id:'b',records:[],totals:[]}}));expect(await screen.findByText('По выбранной кассе движений пока нет.')).toBeVisible();
 api.get.mockRejectedValue(new Error('Нет доступа'));view.rerender(<WorkspaceCashBook project="plaza" version={1}/>);expect(await screen.findByRole('alert')).toHaveTextContent('Нет доступа');expect(screen.queryByLabelText('Касса книги')).toBeNull();
});
it('paginates all returned documents without changing totals and shows cancelled documents distinctly',async()=>{
 api.get.mockResolvedValue({data:{...data,records:Array.from({length:102},(_,i)=>({...row,id:i+1,active:i!==101,status:i===101?'VOIDED':'ACTIVE'}))}});
 render(<WorkspaceCashBook project="plaza" version={0}/>);await screen.findByText('ПКО №1');expect(screen.queryByText('ПКО №102')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Далее'}));expect(screen.getByText('ПКО №102')).toBeVisible();expect(screen.getByText('Аннулирован · вне итогов')).toBeVisible();expect(screen.getByLabelText('Итоги кассы за всё время')).toHaveTextContent('1 000,50 TJS');
});
it('distinguishes no assigned desks from an empty assigned cash book',async()=>{
 api.get.mockResolvedValue({data:{cash_desks:[],records:[],totals:[]}});render(<WorkspaceCashBook project="plaza" version={0}/>);expect(await screen.findByText('Проекту не назначены кассы.')).toBeVisible();
});
it('computes period opening from earlier documents and keeps both directions regardless of journal filtering',async()=>{
 render(<WorkspaceCashBook project="plaza" version={0}/>);await screen.findByText('ПКО №1');
 fireEvent.change(screen.getByLabelText('Кассовая книга с даты'),{target:{value:'2026-11-02'}});fireEvent.change(screen.getByLabelText('Кассовая книга по дату'),{target:{value:'2026-11-02'}});
 const period=screen.getByRole('region',{name:'Итоги кассы за период'});expect(within(period).getByRole('row',{name:'TJS 1 000,50 0,00 0,00 1 000,50'})).toBeVisible();expect(within(period).getByRole('row',{name:'USD 0,00 0,00 20,00 -20,00'})).toBeVisible();
 fireEvent.change(screen.getByLabelText('Движение кассовой книги'),{target:{value:'INCOME'}});expect(screen.getByText('По выбранным фильтрам документов нет.')).toBeVisible();expect(within(period).getByRole('row',{name:'USD 0,00 0,00 20,00 -20,00'})).toBeVisible();
 fireEvent.change(screen.getByLabelText('Валюта кассовой книги'),{target:{value:'USD'}});expect(within(period).queryByText('TJS')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Сбросить период'}));expect(screen.queryByRole('region',{name:'Итоги кассы за период'})).toBeNull();expect(screen.getByLabelText('Кассовая книга с даты')).toHaveValue('');
});
it('does not display partial period totals if an active historical date cannot be interpreted',async()=>{
 api.get.mockResolvedValue({data:{...data,records:[{...row,date:'not-a-date'}]}});render(<WorkspaceCashBook project="plaza" version={0}/>);await screen.findByText('ПКО №1');fireEvent.change(screen.getByLabelText('Кассовая книга с даты'),{target:{value:'2026-11-01'}});
 const period=screen.getByRole('region',{name:'Итоги кассы за период'});expect(within(period).getByRole('alert')).toHaveTextContent('Итоги периода требуют сверки');expect(within(period).queryByRole('table')).toBeNull();
});
it('shows daily balances separately from the journal direction and carries an earlier balance through an empty period',async()=>{
 render(<WorkspaceCashBook project="plaza" version={0}/>);await screen.findByText('ПКО №1');fireEvent.change(screen.getByLabelText('Кассовая книга с даты'),{target:{value:'2026-11-01'}});
 fireEvent.click(screen.getByRole('button',{name:'Показать ежедневные остатки'}));const days=screen.getByRole('region',{name:'Ежедневные остатки кассы'});
 expect(within(days).getByRole('row',{name:'01.11.2026 TJS 0,00 1 000,50 0,00 1 000,50'})).toBeVisible();
 fireEvent.change(screen.getByLabelText('Движение кассовой книги'),{target:{value:'EXPENSE'}});expect(within(days).getByRole('row',{name:'01.11.2026 TJS 0,00 1 000,50 0,00 1 000,50'})).toBeVisible();
 fireEvent.change(screen.getByLabelText('Кассовая книга с даты'),{target:{value:'2026-11-03'}});expect(screen.getByText('В выбранном периоде движений нет. Остаток не менялся.')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Скрыть ежедневные остатки'}));expect(screen.queryByRole('region',{name:'Ежедневные остатки кассы'})).toBeNull();
});
it('paginates daily dates independently and resets their page when period changes',async()=>{
 const records=Array.from({length:150},(_,i)=>({...row,id:i+1,date:new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10),amount:'0.01'}));api.get.mockResolvedValue({data:{...data,records}});
 render(<WorkspaceCashBook project="plaza" version={0}/>);await screen.findByText('ПКО №1');fireEvent.change(screen.getByLabelText('Кассовая книга с даты'),{target:{value:'2026-01-01'}});fireEvent.click(screen.getByRole('button',{name:'Показать ежедневные остатки'}));
 fireEvent.click(screen.getByRole('button',{name:'Следующие даты'}));expect(within(screen.getByRole('region',{name:'Ежедневные остатки кассы'})).getByRole('row',{name:'11.04.2026 TJS 1,00 0,01 0,00 1,01'})).toBeVisible();expect(screen.getByText('ПКО №1')).toBeVisible();
 fireEvent.change(screen.getByLabelText('Кассовая книга по дату'),{target:{value:'2026-01-10'}});expect(within(screen.getByRole('region',{name:'Ежедневные остатки кассы'})).getByRole('row',{name:'01.01.2026 TJS 0,00 0,01 0,00 0,01'})).toBeVisible();expect(screen.getByRole('button',{name:'Предыдущие даты'})).toBeDisabled();
});
