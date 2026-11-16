import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act,within} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WorkspaceSearch from './WorkspaceSearch';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn()}}));
const record={id:80,title:'Own Client',subtitle:'+992 92 1234567',status:'NEW'};
const data={groups:[{resource:'leads',records:[record],has_more:true},{resource:'deals',records:[],has_more:false}]};
const find=q=>{fireEvent.change(screen.getByLabelText('ФИО, телефон, номер договора или помещения'),{target:{value:q}});fireEvent.submit(screen.getByRole('search',{name:'Поиск в проекте'}));};
beforeEach(()=>{vi.clearAllMocks();api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/search')?data:{resource:'leads',record}}));});afterEach(cleanup);
it('submits only to scoped search and reauthorizes a selected record before showing its preview',async()=>{
 render(<WorkspaceSearch project="plaza" version={0}/>);expect(api.get).not.toHaveBeenCalled();find('  Own  ');fireEvent.click(await screen.findByRole('button',{name:/^Контакт: Own Client/}));
 expect(await screen.findByText('Телефон: +992 92 1234567')).toBeVisible();expect(screen.getByText('Статус: Новый')).toBeVisible();expect(screen.getByText('Показаны первые 10 совпадений. Уточните запрос.')).toBeVisible();
 expect(api.get).toHaveBeenCalledWith('/project-workspace/plaza/search',expect.objectContaining({params:{q:'Own'}}));expect(api.get).toHaveBeenCalledWith('/project-workspace/plaza/search/leads/80',expect.objectContaining({params:{}}));
 fireEvent.click(screen.getByRole('button',{name:'Очистить поиск'}));expect(screen.queryByRole('region',{name:'Найденная запись'})).toBeNull();expect(screen.queryByText('Own Client')).toBeNull();
});
it('immediately clears old matches on editing and ignores late responses to abandoned queries',async()=>{
 let resolve;api.get.mockReturnValue(new Promise(r=>{resolve=r;}));render(<WorkspaceSearch project="plaza" version={0}/>);find('Old');expect(screen.getByRole('status')).toHaveTextContent('Поиск');
 fireEvent.change(screen.getByLabelText('ФИО, телефон, номер договора или помещения'),{target:{value:'New'}});await act(async()=>resolve({data}));expect(screen.queryByRole('button',{name:/^Контакт: Own Client/})).toBeNull();expect(screen.queryByText(/Результаты по запросу/)).toBeNull();
});
it('hides old results and record details if fresh authorization fails',async()=>{
 const view=render(<WorkspaceSearch project="plaza" version={0}/>);find('Own');fireEvent.click(await screen.findByRole('button',{name:/^Контакт: Own Client/}));await screen.findByText('Телефон: +992 92 1234567');
 api.get.mockRejectedValue(new Error('Доступ отозван'));view.rerender(<WorkspaceSearch project="plaza" version={1}/>);expect(await screen.findByRole('alert')).toHaveTextContent('Доступ отозван');expect(screen.queryByRole('region',{name:'Найденная запись'})).toBeNull();expect(screen.queryByRole('button',{name:/^Контакт: Own Client/})).toBeNull();
});
it('shows a vanished selected record as unavailable without displaying cached details',async()=>{
 api.get.mockImplementation(path=>path.endsWith('/search')?Promise.resolve({data}):Promise.reject(new Error('Запись больше недоступна')));render(<WorkspaceSearch project="plaza" version={0}/>);find('Own');fireEvent.click(await screen.findByRole('button',{name:/^Контакт: Own Client/}));
 const preview=await screen.findByRole('region',{name:'Найденная запись'});expect(await within(preview).findByRole('alert')).toHaveTextContent('Запись больше недоступна');expect(within(preview).queryByText(/Телефон:/)).toBeNull();
});
it('validates empty, short and control-character input without requests and reports honest empty matches',async()=>{
 render(<WorkspaceSearch project="plaza" version={0}/>);for(const q of ['','x','xy\tzz']){find(q);expect(screen.getByRole('alert')).toHaveTextContent('от 2 до 100');}expect(api.get).not.toHaveBeenCalled();
 api.get.mockResolvedValue({data:{groups:[]}});find('Missing');expect(await screen.findByText('Совпадений в доступных разделах проекта нет.')).toBeVisible();
});
it('opens contract documents only after a fresh record read and only with print capability',async()=>{
 const contract={id:80,title:'0080',subtitle:'2026-11-01',status:'SIGNED'},onDocument=vi.fn();api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/search')?{groups:[{resource:'deals',records:[contract],has_more:false}]}:{resource:'deals',record:contract}}));
 const view=render(<WorkspaceSearch project="plaza" version={0} canDocuments onDocument={onDocument}/>);find('0080');fireEvent.click(await screen.findByRole('button',{name:/^Договор №0080/}));fireEvent.click(await screen.findByRole('button',{name:'Документы найденного договора'}));expect(onDocument).toHaveBeenCalledWith(80);
 view.rerender(<WorkspaceSearch project="plaza" version={0} canDocuments={false}/>);expect(screen.queryByRole('button',{name:'Документы найденного договора'})).toBeNull();
});
