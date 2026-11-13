import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act,within} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WorkspaceInventory from './WorkspaceInventory';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn()}}));
const data={complexes:[{id:1,name:'Plaza',currency:'USD'},{id:3,name:'Plaza 2',currency:'TJS'}],selected_complex_id:1,records:[
 {id:1,unit_number:'101',building_id:1,building_name:'Блок А',section_id:1,section_name:'Подъезд 1',floor_id:10,floor_number:10,unit_kind:'APARTMENT',rooms:2,status:'AVAILABLE',area_m2_x100:6000,price_per_m2_minor:70000},
 {id:2,unit_number:'P1',building_id:1,building_name:'Блок А',section_id:1,section_name:'Подъезд 1',floor_id:11,floor_number:-1,unit_kind:'PARKING',status:'SOLD',area_m2_x100:2000,manual_total_price_minor:1000000},
]};
beforeEach(()=>{vi.clearAllMocks();api.get.mockResolvedValue({data});});afterEach(cleanup);
it('shows floors descending and opens inventory-only detail without legacy requests',async()=>{
 render(<WorkspaceInventory project="plaza" version={0}/>);const apartment=await screen.findByRole('button',{name:'Квартира №101, 10 этаж, Свободна'}),parking=screen.getByRole('button',{name:'Машино-место №P1, -1 этаж, Продана'});
 expect(apartment.compareDocumentPosition(parking)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();fireEvent.click(apartment);
 expect(screen.getByRole('region',{name:'Карточка помещения'})).toHaveTextContent('700 USD');
 expect(api.get).toHaveBeenCalledTimes(1);expect(api.get).toHaveBeenCalledWith('/project-workspace/plaza/inventory',expect.objectContaining({params:{}}));
});
it('filters statuses, types and room counts without a network request and uses the same data for list view',async()=>{
 render(<WorkspaceInventory project="plaza" version={0}/>);await screen.findByRole('button',{name:/Квартира №101,/});
 fireEvent.change(screen.getByLabelText('Статус'),{target:{value:'SOLD'}});expect(screen.queryByRole('button',{name:/Квартира №101,/})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Список',exact:true}));expect(within(screen.getByRole('table')).getByText('Машино-место №P1')).toBeVisible();
 fireEvent.change(screen.getByLabelText('Комнаты'),{target:{value:'2'}});expect(screen.getByText('Помещения по выбранным фильтрам не найдены.')).toBeVisible();expect(api.get).toHaveBeenCalledTimes(1);
});
it('clears old complex records while switching and ignores its late response',async()=>{
 let finish;api.get.mockImplementation((path,options)=>options.params.complex_id?new Promise(resolve=>{finish=resolve;}):Promise.resolve({data}));
 render(<WorkspaceInventory project="plaza" version={0}/>);fireEvent.click(await screen.findByRole('button',{name:/Квартира №101,/}));
 fireEvent.change(screen.getByLabelText('Жилой комплекс'),{target:{value:'3'}});expect(screen.queryByRole('region',{name:'Карточка помещения'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/Квартира №101,/})).not.toBeInTheDocument();
 await act(async()=>finish({data:{...data,selected_complex_id:3,records:[]}}));expect(await screen.findByText('В выбранном ЖК нет действующих помещений.')).toBeVisible();
});
it('removes previously loaded inventory if a permission refresh is denied',async()=>{
 const r=render(<WorkspaceInventory project="plaza" version={0}/>);await screen.findByRole('button',{name:/Квартира №101,/});api.get.mockRejectedValue(new Error('Доступ отозван'));
 r.rerender(<WorkspaceInventory project="plaza" version={1}/>);expect(await screen.findByRole('alert')).toHaveTextContent('Доступ отозван');expect(screen.queryByRole('button',{name:/Квартира №101,/})).not.toBeInTheDocument();
});
it('retains the entered reference rate, somoni deposit and term across an authorized inventory reload',async()=>{
 render(<WorkspaceInventory project="plaza" version={0}/>);fireEvent.click(await screen.findByRole('button',{name:/Квартира №101,/}));
 fireEvent.change(screen.getByLabelText('Справочный курс USD → сомони'),{target:{value:'10'}});
 fireEvent.change(screen.getByLabelText('Желаемый первоначальный взнос'),{target:{value:'100000'}});
 fireEvent.change(screen.getByLabelText('Срок калькулятора'),{target:{value:'36'}});
 fireEvent.click(screen.getByRole('button',{name:'Обновить шахматку'}));await screen.findByLabelText('Срок калькулятора');
 expect(screen.getByLabelText('Справочный курс USD → сомони')).toHaveValue('10');expect(screen.getByLabelText('Желаемый первоначальный взнос')).toHaveValue(100000);expect(screen.getByLabelText('Срок калькулятора')).toHaveValue(36);
});
it('discards the selected quote when the inventory read itself is denied',async()=>{
 const r=render(<WorkspaceInventory project="plaza" version={0}/>);fireEvent.click(await screen.findByRole('button',{name:/Квартира №101,/}));fireEvent.change(screen.getByLabelText('Справочный курс USD → сомони'),{target:{value:'10'}});
 api.get.mockRejectedValue(Object.assign(new Error('Доступ отозван'),{status:403}));r.rerender(<WorkspaceInventory project="plaza" version={1}/>);await screen.findByRole('alert');
 api.get.mockResolvedValue({data});r.rerender(<WorkspaceInventory project="plaza" version={2}/>);await screen.findByRole('button',{name:/Квартира №101,/});expect(screen.queryByRole('region',{name:'Карточка помещения'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Квартира №101,/}));expect(screen.getByLabelText('Справочный курс USD → сомони')).toHaveValue('');
});
