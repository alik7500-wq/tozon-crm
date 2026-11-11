import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ProjectSetup from './ProjectSetup';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn(),post:vi.fn()}}));
const members=[{id:3,name:'Company admin',project_only:false,sections:[],write_sections:[]},{id:10,name:'Project member',project_only:true,enabled:false,revision:1,sections:[],write_sections:[]}];
const cfg={revision:2,members,cash_desks:[],warehouses:[]};
const props=()=>({projectId:'plaza',dirty:false,onConfigured:vi.fn(),onBusy:vi.fn()});
beforeEach(()=>{vi.clearAllMocks();api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/setup')?structuredClone(cfg):{records:[{id:5,contract_number:'0001',status:'SIGNED',unit_number:'101',client_name:'Demo',updated_at:'stamp',eligible:true,reasons:[]}],has_more:false}}));api.post.mockResolvedValue({data:{id:10}});});afterEach(cleanup);
it('never converts the company admin and requires explicit grant choices',async()=>{
 render(<ProjectSetup {...props()}/>);expect(await screen.findByText(/Общая учётная запись:/)).toBeVisible();const access=await screen.findByRole('button',{name:'Сохранить доступ: Project member'});expect(screen.getByLabelText('Доступ к этому проекту включён')).not.toBeChecked();
 fireEvent.click(screen.getByLabelText('Доступ к этому проекту включён'));fireEvent.click(screen.getByLabelText('Договоры',{exact:true}));fireEvent.click(access);
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/company-projects/plaza/setup',expect.objectContaining({user_id:10,enabled:true,sections:['deals.view'],write_sections:[],revision:1,project_revision:2})));
});
it('requires confirmation before binding and keeps the original snapshot stamp',async()=>{
 render(<ProjectSetup {...props()}/>);const button=await screen.findByRole('button',{name:'Привязать договор № 0001'});expect(button).toBeDisabled();fireEvent.click(screen.getByLabelText(/Подтверждаю принадлежность/));fireEvent.click(button);
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/company-projects/plaza/setup',expect.objectContaining({kind:'BIND_DEMO_DEAL',deal_id:5,expected_updated_at:'stamp',confirmed:true})));
});
it('keeps the same request after an uncertain response and locks navigation through parent',async()=>{
 const p=props();api.post.mockRejectedValueOnce(Object.assign(new Error('unknown'),{status:503}));render(<ProjectSetup {...p}/>);fireEvent.click(await screen.findByRole('button',{name:'Сохранить доступ: Project member'}));fireEvent.click(await screen.findByRole('button',{name:'Повторить ту же настройку'}));await waitFor(()=>expect(api.post).toHaveBeenCalledTimes(2));expect(api.post.mock.calls[0][1]).toEqual(api.post.mock.calls[1][1]);expect(p.onBusy).toHaveBeenCalledWith(true);
});
it('does not show a late response for a previously selected project',async()=>{
 let finish;api.get.mockImplementation(()=>new Promise(r=>{finish=r;}));const {rerender}=render(<ProjectSetup {...props()}/>);rerender(<ProjectSetup key="tower" {...props()} projectId="tower"/>);await act(async()=>finish({data:{records:[],has_more:false}}));expect(screen.queryByText('Project member')).not.toBeInTheDocument();
});
it('disables mutations while the main project card has unsaved edits',async()=>{render(<ProjectSetup {...props()} dirty/>);expect(await screen.findByRole('button',{name:'Создать проектный вход'})).toBeDisabled();});
