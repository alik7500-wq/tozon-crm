// @vitest-environment jsdom
import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('../../api/client',()=>({api:{get:vi.fn(),post:vi.fn()}}));
import {api} from '../../api/client';
import {BuyerDocumentsPanel} from './BuyerDocumentsPanel';
const draft={id:'doc1',title:'Signed original',version:1,is_signed_original:true,status:'DRAFT'};
beforeEach(()=>{vi.clearAllMocks();api.get.mockResolvedValue({data:[draft]});api.post.mockResolvedValue({data:'ok'});});
afterEach(cleanup);
it('lets managers upload a draft but never shows them a publication button',async()=>{
 render(<BuyerDocumentsPanel dealId={1} user={{role:'SALES_MANAGER'}}/>);
 await screen.findByText('Signed original');expect(screen.queryByRole('button',{name:'Разрешить показ покупателю'})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Название'),{target:{value:'Договор'}});
 fireEvent.change(screen.getByLabelText('Файл PDF, PNG или JPEG'),{target:{files:[new File(['%PDF-1.7'],'original.pdf',{type:'application/pdf'})]}});
 fireEvent.click(screen.getByLabelText('Подписанный оригинал'));
 fireEvent.submit(screen.getByRole('button',{name:'Загрузить для проверки'}).closest('form'));
 await waitFor(()=>expect(api.post).toHaveBeenCalled());
 const [path,form]=api.post.mock.calls[0];expect(path).toBe('/deals/1/buyer-documents');expect(form.get('isSignedOriginal')).toBe('true');expect(form.get('status')).toBeNull();
});
it('requires an explicit leadership action to publish or revoke a document',async()=>{
 render(<BuyerDocumentsPanel dealId={1} user={{role:'ADMIN'}}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Разрешить показ покупателю'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/deals/1/buyer-documents/doc1/action',{action:'PUBLISH'}));
});
