import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WorkspaceStock from './WorkspaceStock';
import {stockNumber} from './stockNumber';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn()}}));
const data={warehouses:[{id:'a',name:'Plaza склад',active:true},{id:'b',name:'Plaza второй',active:false}],selected_warehouse_id:'a',records:[{material_id:'m',name:'Арматура',unit:'кг',currency:'TJS',quantity:'12.3456',value:'1000.50'},{material_id:'n',name:'Бетон',unit:'м³',currency:'USD',quantity:'3.0000',value:'900.00'}],totals:[{currency:'TJS',value:'1000.50'},{currency:'USD',value:'900.00'}]};
beforeEach(()=>{vi.clearAllMocks();api.get.mockResolvedValue({data});});afterEach(cleanup);
it('uses the scoped stock route and filters materials locally without combining currencies or units',async()=>{
 render(<WorkspaceStock project="plaza" version={0}/>);await screen.findByText('Арматура');expect(screen.getByText('12,3456')).toBeVisible();expect(screen.getByRole('region',{name:'Остатки склада проекта'})).toHaveTextContent('1 000,50 TJS');
 fireEvent.change(screen.getByLabelText('Валюта остатков'),{target:{value:'USD'}});expect(screen.queryByText('Арматура')).toBeNull();expect(screen.getByText('Бетон')).toBeVisible();
 expect(api.get).toHaveBeenCalledTimes(1);expect(api.get).toHaveBeenCalledWith('/project-workspace/plaza/stock',expect.objectContaining({params:{}}));
});
it('clears old warehouse balances while changing warehouse and uses its exact ID',async()=>{
 let resolve;api.get.mockImplementation((path,options)=>options.params.warehouse_id?new Promise(r=>{resolve=r;}):Promise.resolve({data}));
 render(<WorkspaceStock project="plaza" version={0}/>);await screen.findByText('Арматура');fireEvent.change(screen.getByLabelText('Склад остатков'),{target:{value:'b'}});expect(screen.queryByText('Арматура')).toBeNull();
 expect(api.get).toHaveBeenLastCalledWith('/project-workspace/plaza/stock',expect.objectContaining({params:{warehouse_id:'b'}}));
 await act(async()=>resolve({data:{...data,selected_warehouse_id:'b',records:[],totals:[]}}));expect(await screen.findByText('По выбранному складу нет ненулевых остатков.')).toBeVisible();
});
it('removes previous balances after a permission failure',async()=>{
 const r=render(<WorkspaceStock project="plaza" version={0}/>);await screen.findByText('Арматура');api.get.mockRejectedValue(new Error('Нет доступа'));
 r.rerender(<WorkspaceStock project="plaza" version={1}/>);expect(await screen.findByRole('alert')).toHaveTextContent('Нет доступа');expect(screen.queryByText('Арматура')).toBeNull();expect(screen.queryByLabelText('Стоимость остатков всего склада')).toBeNull();
});
it('distinguishes missing warehouses from no stock and formats exact decimals',async()=>{
 api.get.mockResolvedValue({data:{warehouses:[],records:[],totals:[]}});render(<WorkspaceStock project="plaza" version={0}/>);expect(await screen.findByText('Проекту не назначены склады.')).toBeVisible();
 expect(stockNumber('9999999999999999.99',true)).toBe('9 999 999 999 999 999,99');expect(stockNumber('-1.2500')).toBe('-1,25');expect(stockNumber('oops')).toBe('—');
});
