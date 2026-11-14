// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('../../api/client',()=>({api:{get:vi.fn(),post:vi.fn()}}));
import {api} from '../../api/client';
import {BuyerInquiriesPanel} from './BuyerInquiriesPanel';
beforeEach(()=>vi.clearAllMocks());afterEach(cleanup);
it('saves the answer through the employee session without a client-supplied author',async()=>{
 api.get.mockResolvedValueOnce({data:[{id:'question',message:'Вопрос покупателя',status:'OPEN',created_at:'2026-11-14'}]}).mockResolvedValue({data:[{id:'question',message:'Вопрос покупателя',status:'ANSWERED',reply:'Ответ',created_at:'2026-11-14'}]});api.post.mockResolvedValue({data:{status:'ANSWERED'}});
 render(<BuyerInquiriesPanel dealId={7}/>);fireEvent.change(await screen.findByRole('textbox'),{target:{value:'Ответ'}});fireEvent.click(screen.getByRole('button',{name:'Сохранить ответ'}));
 await waitFor(()=>expect(screen.queryByRole('textbox')).not.toBeInTheDocument());expect(screen.getByText('Ответ')).toBeInTheDocument();expect(api.post).toHaveBeenCalledWith('/deals/7/buyer-inquiries/reply',{id:'question',message:'Ответ'});expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
it('shows an access failure without rendering stale inquiries',async()=>{
 api.get.mockRejectedValue(new Error('BUYER_ACCESS_DENIED'));render(<BuyerInquiriesPanel dealId={8}/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить');expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
