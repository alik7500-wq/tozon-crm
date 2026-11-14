import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WorkspaceDocuments from './WorkspaceDocuments';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn(),post:vi.fn()}}));
const data={deal:{id:1,contract_number:'Own-1',status:'SIGNED',final_price_minor:10000,currency:'USD'},unit:{project_name:'Plaza',unit_number:'1'},client:{full_name:'Own Buyer'},signer:{director_name:'Frozen director',director_authority:'Authority'},templates:[{kind:'CONTRACT',language:'RU'}],files_upload:true};
beforeEach(()=>{vi.clearAllMocks();api.get.mockImplementation(path=>Promise.resolve(path.endsWith('/files')?{data:{records:[],has_more:false}}:{data}));});
afterEach(cleanup);
it('uses only scoped endpoints and disables unavailable templates',async()=>{
 render(<WorkspaceDocuments project="plaza" dealId={1} onClose={vi.fn()}/>);expect(await screen.findByText('Покупатель: Own Buyer')).toBeVisible();expect(screen.getByText('Директор при подписании: Frozen director')).toBeVisible();
 expect(screen.getByRole('button',{name:'Договор Word'})).toBeEnabled();expect(screen.getByRole('button',{name:'График Word'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Язык бланка'),{target:{value:'TJ'}});expect(screen.getByRole('button',{name:'Договор Word'})).toBeDisabled();
 expect(api.get.mock.calls.every(([path])=>path.startsWith('/project-workspace/plaza/documents/1'))).toBe(true);
});
it('discards a late response after the project changes without showing old buyer data',async()=>{
 let finish;api.get.mockImplementation(path=>path.includes('plaza')&&!path.endsWith('files')?new Promise(resolve=>{finish=resolve;}):Promise.resolve(path.endsWith('files')?{data:{records:[],has_more:false}}:{data:{...data,client:{full_name:'Tower Buyer'}}}));
 const r=render(<WorkspaceDocuments project="plaza" dealId={1} onClose={vi.fn()}/>);await waitFor(()=>expect(finish).toBeTypeOf('function'));r.rerender(<WorkspaceDocuments project="tower" dealId={2} onClose={vi.fn()}/>);expect(await screen.findByText('Покупатель: Tower Buyer')).toBeVisible();
 await act(async()=>finish({data}));expect(screen.queryByText('Покупатель: Own Buyer')).not.toBeInTheDocument();
});
it('uses the same request ID and file on an uncertain upload retry and prevents closing',async()=>{
 api.post.mockRejectedValueOnce(new Error('Network')).mockResolvedValueOnce({data:{id:'file'}});const close=vi.fn();render(<WorkspaceDocuments project="plaza" dealId={1} onClose={close}/>);
 const input=await screen.findByLabelText('Файл договора');const file=new File(['%PDF-1.7\n%%EOF'],'document.pdf',{type:'application/pdf'});fireEvent.change(input,{target:{files:[file]}});fireEvent.click(screen.getByRole('button',{name:'Загрузить вложение'}));
 fireEvent.click(await screen.findByRole('button',{name:'Повторить ту же загрузку'}));await waitFor(()=>expect(api.post).toHaveBeenCalledTimes(2));
 expect(api.post.mock.calls[0][2].headers['X-Request-ID']).toBe(api.post.mock.calls[1][2].headers['X-Request-ID']);expect(api.post.mock.calls[0][1].get('file')).toBe(api.post.mock.calls[1][1].get('file'));expect(close).not.toHaveBeenCalled();
});
it('keeps a pending upload locked against duplicate clicks and Escape',async()=>{
 api.post.mockReturnValue(new Promise(()=>{}));const close=vi.fn();render(<WorkspaceDocuments project="plaza" dealId={1} onClose={close}/>);const input=await screen.findByLabelText('Файл договора');fireEvent.change(input,{target:{files:[new File(['pdf'],'x.pdf')]}});const b=screen.getByRole('button',{name:'Загрузить вложение'});fireEvent.click(b);fireEvent.click(b);
 expect(api.post).toHaveBeenCalledTimes(1);expect(screen.getByLabelText('Закрыть документы')).toBeDisabled();fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});expect(close).not.toHaveBeenCalled();
});
it('clears printing on revoked access and never falls back to legacy endpoints',async()=>{
 render(<WorkspaceDocuments project="plaza" dealId={1} onClose={vi.fn()}/>);const button=await screen.findByRole('button',{name:'Печатная карточка'});api.get.mockRejectedValue(Object.assign(new Error('Доступ отозван'),{status:403}));fireEvent.click(button);expect(await screen.findByRole('alert')).toHaveTextContent('Доступ отозван');expect(screen.queryByTitle('Печатная карточка договора')).not.toBeInTheDocument();
 expect(api.get.mock.calls.every(([path])=>!path.startsWith('/deals')&&!path.startsWith('/document-settings'))).toBe(true);
});

it('labels a terminated contract as closed and displays its reason and agreement',async()=>{
 api.get.mockImplementation(path=>Promise.resolve(path.endsWith('/files')?{data:{records:[],has_more:false}}:{data:{...data,deal:{...data.deal,status:'CANCELLED'},closure:{kind:'TERMINATE_UNPAID',reason:'Стороны согласовали',basis:'Соглашение № 8',basis_date:'2026-11-10'}}}));render(<WorkspaceDocuments project="plaza" dealId={1} onClose={vi.fn()}/>);
 expect(await screen.findByText('Договор расторгнут')).toBeVisible();expect(screen.getByText('Причина: Стороны согласовали')).toBeVisible();expect(screen.getByRole('button',{name:'Договор Word'})).toBeDisabled();
});
