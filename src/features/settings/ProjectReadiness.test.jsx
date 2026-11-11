import React from 'react';
import {it,expect,vi,afterEach,beforeEach} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ProjectReadiness from './ProjectReadiness';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn()}}));
beforeEach(()=>vi.clearAllMocks());afterEach(cleanup);
it('checks on demand and never enables a project or changes rights',async()=>{
 api.get.mockResolvedValue({data:{configuration_ready:false,checks:[{code:'DIRECTOR',status:'BLOCKED',label:'Директор объекта',action:'Укажите ФИО.'}]}});
 render(<ProjectReadiness projectId="plaza" revision={1} dirty={false}/>);expect(api.get).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Проверить готовность проекта'}));
 expect(await screen.findByText('Укажите ФИО.')).toBeVisible();expect(screen.getByRole('status')).toHaveTextContent('незавершённые');
 expect(api.get).toHaveBeenCalledWith('/company-projects/plaza/readiness',expect.objectContaining({signal:expect.any(AbortSignal)}));
});
it('does not show a late response from a previously selected project',async()=>{
 let finish;api.get.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const {rerender}=render(<ProjectReadiness projectId="plaza" revision={1} dirty={false}/>);
 fireEvent.click(screen.getByRole('button',{name:'Проверить готовность проекта'}));
 rerender(<ProjectReadiness key="tower" projectId="tower" revision={1} dirty={false}/>);
 await act(async()=>finish({data:{configuration_ready:true,checks:[{code:'SECRET',status:'PASS',label:'Old project result'}]}}));
 expect(screen.queryByText('Old project result')).not.toBeInTheDocument();
});
it('hides the old check until edits are saved and rechecked',async()=>{
 api.get.mockResolvedValue({data:{configuration_ready:true,checks:[]}});const {rerender}=render(<ProjectReadiness projectId="plaza" revision={1} dirty={false}/>);
 fireEvent.click(screen.getByRole('button',{name:'Проверить готовность проекта'}));expect(await screen.findByRole('status')).toHaveTextContent('заполнены');
 rerender(<ProjectReadiness projectId="plaza" revision={1} dirty/>);expect(screen.queryByRole('status')).not.toBeInTheDocument();expect(screen.getByRole('button')).toBeDisabled();
});
