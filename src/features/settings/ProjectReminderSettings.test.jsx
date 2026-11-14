import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ProjectReminderSettings from './ProjectReminderSettings';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn(),put:vi.fn()}}));
const settings={enabled:false,lead_days:3,backlog_from:null,revision:0};
beforeEach(()=>{vi.clearAllMocks();api.get.mockResolvedValue({data:{settings}});api.put.mockResolvedValue({data:{settings:{...settings,enabled:true,backlog_from:'2026-11-01',revision:1}}});});afterEach(cleanup);
it('requires the backlog date before enabling and saves a separate project revision',async()=>{
 render(<ProjectReminderSettings projectId="plaza"/>);const toggle=await screen.findByRole('checkbox');fireEvent.click(toggle);expect(screen.getByRole('button',{name:'Сохранить напоминания'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Начальная дата напоминаний'),{target:{value:'2026-11-01'}});fireEvent.click(screen.getByRole('button',{name:'Сохранить напоминания'}));await waitFor(()=>expect(api.put).toHaveBeenCalledWith('/company-projects/plaza/reminders',{enabled:true,lead_days:3,backlog_from:'2026-11-01',revision:0}));expect(await screen.findByText(/Настройки внутренних напоминаний сохранены/)).toBeVisible();
});
it('discards an old project response',async()=>{
 let finish;api.get.mockImplementation(path=>path.includes('plaza')?new Promise(r=>{finish=r;}):Promise.resolve({data:{settings:{...settings,lead_days:7}}}));const r=render(<ProjectReminderSettings projectId="plaza"/>);await waitFor(()=>expect(finish).toBeTypeOf('function'));r.rerender(<ProjectReminderSettings projectId="tower"/>);expect(await screen.findByLabelText('Дней до платежа')).toHaveValue(7);await act(async()=>finish({data:{settings:{...settings,lead_days:1}}}));expect(screen.getByLabelText('Дней до платежа')).toHaveValue(7);
});
