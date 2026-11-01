import React from 'react';
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { LeadIntakeModal } from '../LeadIntakeModal';
import { api } from '../../../api/client';
vi.mock('../../../api/client',()=>({api:{get:vi.fn(),post:vi.fn(),patch:vi.fn(),defaults:{baseURL:'https://crm.invalid/api'}}}));
beforeEach(()=>{vi.clearAllMocks();api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/options')?{managers:[{id:3,name:'Sales'}],projects:[{id:4,name:'Plaza'}]}:{integrations:[],recent:[]}}));});afterEach(cleanup);
it('requires column mapping and preview before committing, then shows per-row results',async()=>{
 const onImported=vi.fn();const fileData={sheets:[{name:'Responses',headers:['ФИО','Телефон'],rows:[['Person','900123456']]}]};
 const preview={rows:[{row:1,data:{full_name:'Person',phone:'+992900123456'},outcome:'CREATED',errors:[]}],payload:{rows:[{full_name:'Person',phone:'+992900123456'}],settings:{}},expires:123,token:'signed'};
 api.post.mockImplementation((url)=>Promise.resolve({data:url.endsWith('/file')?fileData:url.endsWith('/preview')?preview:{results:[{row:1,outcome:'CREATED',lead_id:55}],next_offset:null}}));
 render(<LeadIntakeModal onClose={()=>{}} onImported={onImported}/>);
 expect(screen.queryByText('Импортировать проверенные строки')).toBeNull();
 fireEvent.change(screen.getByLabelText('Название списка / вебинара'),{target:{value:'Event'}});
 fireEvent.change(screen.getByLabelText('Файл лидов'),{target:{files:[new File(['a'],'leads.csv',{type:'text/csv'})]}});
 await screen.findByText('Проверить перед импортом');fireEvent.click(screen.getByText('Проверить перед импортом'));
 await screen.findByText('Импортировать проверенные строки');
 expect(api.post.mock.calls.find(c=>c[0].endsWith('/preview'))[1].rows[0]).toEqual({full_name:'Person',phone:'900123456',notes:'',submitted_at:''});
 fireEvent.click(screen.getByText('Импортировать проверенные строки'));
 await waitFor(()=>expect(onImported).toHaveBeenCalledOnce());expect(screen.getByText(/№55/)).toBeTruthy();
});
it('settings changes invalidate preview and API failure cannot display a successful import',async()=>{
 api.post.mockRejectedValue(new Error('Файл повреждён'));
 render(<LeadIntakeModal onClose={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('Файл лидов'),{target:{files:[new File(['bad'],'leads.xlsx')]}});
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','Файл повреждён');
 expect(screen.queryByText('Импортировать проверенные строки')).toBeNull();
});
it('Google form configuration is created only after explicit action and the key can be hidden',async()=>{
 api.post.mockResolvedValue({data:{integration:{id:'id'},token:'one-time-key'}});
 render(<LeadIntakeModal onClose={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Google Форма'}));
 await screen.findByText('Подключений пока нет.');expect(api.post).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Название списка / вебинара'),{target:{value:'Future webinar'}});
 fireEvent.click(screen.getByText('Создать подключение Google Формы'));
 expect(await screen.findByDisplayValue('one-time-key')).toBeTruthy();
 fireEvent.click(screen.getByText('Ключ сохранён — скрыть'));expect(screen.queryByDisplayValue('one-time-key')).toBeNull();
});
