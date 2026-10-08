import React from 'react';
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {api} from '../../api/client';
import {dealDocumentContext} from './documentTemplates';
import {TemplateDocumentButton} from './TemplateDocumentButton';
import {DocumentTemplatesTab} from './DocumentTemplatesTab';
import {CompanySettingsTab} from './CompanySettingsTab';
vi.mock('../../api/client',()=>({api:{get:vi.fn(),post:vi.fn(),put:vi.fn()}}));
beforeEach(()=>{vi.clearAllMocks();URL.createObjectURL=vi.fn(()=> 'blob:test');URL.revokeObjectURL=vi.fn();vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const tpl=(id,scope='*',language='TJ')=>({id,kind:'CONTRACT',language,scope,active:true,name:'Test.docx',file_size:300,created_at:'2026-10-09T00:00:00Z',created_by:1});
describe('document settings',()=>{
 it('prefers selected project template, excludes another project, uses correct language',async()=>{
   api.get.mockResolvedValue({data:{templates:[tpl('common'),tpl('project','7'),tpl('other','8'),tpl('russian','7','RU')]}});api.post.mockResolvedValue(new Blob(['docx']));
   render(<TemplateDocumentButton kind="CONTRACT" projectId={7} context={{contract_number:'0042'}}/>);
   fireEvent.click(await screen.findByRole('button',{name:'Ваш бланк Word'}));await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/document-settings/render/project',{contract_number:'0042'},{responseType:'blob'}));
   fireEvent.change(screen.getByRole('combobox'),{target:{value:'RU'}});fireEvent.click(screen.getByRole('button',{name:'Ваш бланк Word'}));await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/document-settings/render/russian',expect.anything(),expect.anything()));
 });
 it('offers other uploaded languages explicitly, does not silently use them',async()=>{
   api.get.mockResolvedValue({data:{templates:[tpl('uzbek','*','UZ')]}});
   render(<TemplateDocumentButton kind="CONTRACT" context={{}}/>);
   expect((await screen.findByRole('button',{name:'Ваш бланк Word'})).disabled).toBe(true);
   fireEvent.change(screen.getByRole('combobox'),{target:{value:'UZ'}});expect(screen.getByRole('button').disabled).toBe(false);
 });
 it('does not offer another project template as a global default',async()=>{
   api.get.mockResolvedValue({data:{templates:[tpl('other','8')]}});render(<TemplateDocumentButton kind="CONTRACT" projectId={7} context={{}}/>);
   await waitFor(()=>expect(api.get).toHaveBeenCalled());expect(screen.queryByRole('button')).toBeNull();
 });
 it('preserves full number, cents, FIFO plan and dates in context',()=>{
   const c=dealDocumentContext({contract_number:'TZ-2026-0003',deal_date:'2026-02-12',final_price_minor:123456,paid_amount_minor:23456,remaining_debt_minor:100000,area_m2_x100:9220,schedules:[{due_date:'2027-01-12',amount_minor:10001,paid_amount_minor:10000}]});
   expect(c.contract_number).toBe('TZ-2026-0003');expect(c.contract_date).toBe('12.02.2026');expect(c.area).toBe(92.2);expect(c.contract_total.replace(/\s/g,'')).toBe('1234,56');expect(c.schedules[0].balance).toBe('0,01');
 });
 it('uploads selected slot as multipart DOCX, preserving version history',async()=>{
   api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('templates')?{templates:[]}:{fields:['client_name'],settings:{version:1,data:{}}}}));api.post.mockResolvedValue({data:{id:'new'}});
   render(<DocumentTemplatesTab projects={[{id:7,name:'ЖК 7'}]}/>);await screen.findByText('История версий выбранного бланка');
   fireEvent.change(screen.getByLabelText('Жилой комплекс'),{target:{value:'7'}});
   fireEvent.change(screen.getByLabelText('Загрузить бланк DOCX'),{target:{files:[new File(['docx'],'custom.docx')]}});
   await waitFor(()=>expect(api.post).toHaveBeenCalled());const form=api.post.mock.calls[0][1];expect(form.get('scope')).toBe('7');expect(form.get('kind')).toBe('CONTRACT');expect(form.get('file').name).toBe('custom.docx');
 });
 it('sends expected version and surfaces stale settings without claiming success',async()=>{
   api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('history')?{history:[]}:{settings:{version:4,data:{}}}}));api.put.mockRejectedValue(new Error('Настройки уже изменены другим пользователем'));
   render(<CompanySettingsTab section="numbering"/>);const field=await screen.findByLabelText('Договор');fireEvent.change(field,{target:{value:'TZ-{year}-{id4}'}});fireEvent.click(screen.getByRole('button',{name:'Сохранить настройки'}));
   await screen.findByRole('alert');expect(api.put.mock.calls[0][1].version).toBe(4);expect(screen.queryByText('Настройки сохранены.')).toBeNull();
 });
});
