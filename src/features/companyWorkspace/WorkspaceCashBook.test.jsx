import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
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
});
it('hides prior cash data while switching desk and after access revocation',async()=>{
 let resolve;api.get.mockImplementation((path,o)=>o.params.cash_desk_id?new Promise(r=>{resolve=r;}):Promise.resolve({data}));
 const view=render(<WorkspaceCashBook project="plaza" version={0}/>);await screen.findByText('ПКО №1');fireEvent.change(screen.getByLabelText('Касса книги'),{target:{value:'b'}});expect(screen.queryByText('ПКО №1')).toBeNull();expect(screen.queryByLabelText('Итоги кассы за всё время')).toBeNull();
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
