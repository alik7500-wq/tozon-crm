import React from 'react';
import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup,act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ProjectWorkspacePage from './ProjectWorkspacePage';
import { api } from '../../api/client';
const state=vi.hoisted(()=>({user:{id:10,name:'Тестовый партнёр',permissions:['company.project-only']},logout:vi.fn()}));
vi.mock('../auth/AuthContext',()=>({useAuth:()=>state}));
vi.mock('../../api/client',()=>({api:{get:vi.fn(),post:vi.fn()}}));
const a='9e186c51-79b3-4bf8-8f69-c52a97acf834',b='9e186c51-79b3-4bf8-8f69-c52a97acf835';
const projects=[{id:a,name:'Plaza',location:'Худжанд',sections:['inventory.view','leads.view']},{id:b,name:'Tower',location:'Худжанд',sections:['inventory.view']}];
beforeEach(()=>{
 vi.clearAllMocks();state.user={id:10,name:'Тестовый партнёр',permissions:['company.project-only']};
 api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/projects')?{projects}:{records:[{id:1,name:'Plaza ЖК',code:'A'}],has_more:false}}));
});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
describe('project workspace privacy in UI',()=>{
 it('shows only server-granted sections and has no mutation/export controls',async()=>{
  render(<ProjectWorkspacePage/>);fireEvent.click(await screen.findByRole('button',{name:'Жилые комплексы',exact:true}));expect(await screen.findByText('Plaza ЖК')).toBeVisible();
  expect(screen.getByRole('button',{name:'Клиенты и лиды'})).toBeVisible();
  expect(screen.queryByRole('button',{name:'Расходы'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Создать|Сохранить|Экспорт/})).not.toBeInTheDocument();
  expect(screen.getByText(/Тестовое пространство/)).toBeVisible();
 });
 it('clears old rows immediately on project switch and ignores a late old-project response',async()=>{
  let finishOld;
  api.get.mockImplementation(path=>path.endsWith('/projects')?Promise.resolve({data:{projects}}):path.includes(a)?new Promise(resolve=>{finishOld=resolve;}):Promise.resolve({data:{records:[{id:2,name:'Tower ЖК'}],has_more:false}}));
  render(<ProjectWorkspacePage/>);const select=await screen.findByRole('combobox',{name:'Рабочий проект'});fireEvent.click(screen.getByRole('button',{name:'Жилые комплексы',exact:true}));
  await waitFor(()=>expect(finishOld).toBeTypeOf('function'));
  fireEvent.change(select,{target:{value:b}});fireEvent.click(await screen.findByRole('button',{name:'Жилые комплексы',exact:true}));
  expect(await screen.findByText('Tower ЖК')).toBeVisible();
  await act(async()=>finishOld({data:{records:[{id:1,name:'OLD SECRET'}],has_more:false}}));
  expect(screen.queryByText('OLD SECRET')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Клиенты и лиды'})).not.toBeInTheDocument();
 });
 it('removes previously displayed rows when access refresh fails',async()=>{
  render(<ProjectWorkspacePage/>);fireEvent.click(await screen.findByRole('button',{name:'Жилые комплексы',exact:true}));expect(await screen.findByText('Plaza ЖК')).toBeVisible();
  api.get.mockRejectedValue(new Error('Доступ отозван'));
  fireEvent(window,new Event('focus'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Доступ отозван');
  expect(screen.queryByText('Plaza ЖК')).not.toBeInTheDocument();
 });
 it('never requests scoped records for a legacy user',()=>{
  state.user={id:30,name:'Admin',permissions:[]};render(<ProjectWorkspacePage/>);
  expect(screen.getByRole('alert')).toHaveTextContent('проектной учётной записи');expect(api.get).not.toHaveBeenCalled();
 });
 it('keeps the selected project and pending form stable across focus refreshes',async()=>{
  api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/projects')?{projects}:path.endsWith('/options')?{commands:['EXPENSE']}:path.endsWith('/options/cash_desks')?{records:[{id:'cash',name:'Own cash'}]}:{records:[],has_more:false}}));
  render(<ProjectWorkspacePage/>);fireEvent.click(await screen.findByRole('button',{name:'Оформить РКО'}));
  expect(await screen.findByRole('dialog')).toBeVisible();expect(screen.getByLabelText('Рабочий проект')).toBeDisabled();expect(screen.getByRole('button',{name:'Выйти'})).toBeDisabled();
  const calls=api.get.mock.calls.length;fireEvent(window,new Event('focus'));
  await act(async()=>Promise.resolve());expect(api.get.mock.calls).toHaveLength(calls);expect(screen.getByRole('dialog')).toBeVisible();
 });

});

it('shows personal reminders only with both permissions and acknowledges through the scoped route',async()=>{
 vi.stubEnv('VITE_PROJECT_INTERNAL_REMINDERS_ENABLED','true');
 const reminderId='00000000-0000-4000-8000-000000000010';let read=false;
 api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/projects')?{projects:[{...projects[0],sections:['deals.view','finance.payments']},projects[1]]}:{records:[{id:reminderId,contract_number:'OWN-REMINDER',remaining_minor:12000,currency:'USD',reminder_kind:'DUE',is_read:read}],has_more:false}}));
 api.post.mockImplementation(async()=>{read=true;return {data:{is_read:true}};});
 render(<ProjectWorkspacePage/>);fireEvent.click(await screen.findByRole('button',{name:'Напоминания',exact:true}));expect(await screen.findByText('OWN-REMINDER')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Отметить прочитанным'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith(`/project-workspace/${a}/reminders/${reminderId}/read`,{}));
 expect(await screen.findByText('Прочитано',{selector:'td'})).toBeVisible();
 fireEvent.change(screen.getByRole('combobox',{name:'Рабочий проект'}),{target:{value:b}});
 expect(screen.queryByRole('button',{name:'Напоминания'})).not.toBeInTheDocument();
});

it('opens a scoped overview with full server counts and no legacy dashboard request',async()=>{
 api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/projects')?{projects}:path.endsWith('/overview')?{inventory:{available:147,reserved:9,sold:72,apartments:272},active_leads:17,upcoming_payments:null}:path.endsWith('/options')?{commands:[]}:{records:[],has_more:false}}));
 render(<ProjectWorkspacePage/>);expect(await screen.findByText('147')).toBeVisible();expect(screen.getByRole('heading',{name:/Добро пожаловать/})).toBeVisible();expect(api.get).toHaveBeenCalledWith(`/project-workspace/${a}/overview`,expect.any(Object));expect(api.get.mock.calls.every(([path])=>path.startsWith('/project-workspace/'))).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:/Свободные квартиры/}));await waitFor(()=>expect(api.get.mock.calls.some(([path])=>path.endsWith('/units'))).toBe(true));
});
