import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
const api=vi.hoisted(()=>({post:vi.fn()}));
vi.mock('../../../api/client',()=>({api}));
import {InstagramReplyComposer} from '../InstagramReplyComposer';
afterEach(()=>{cleanup();vi.resetAllMocks();});
const conversation={instagramAccountId:'1',contactId:'123'};
it('shows a confirmed send immediately and does not wait for slow history refresh',async()=>{
 const message={message_id:'sent',text_content:'answer',is_echo:true};api.post.mockResolvedValue({data:{message,saved:true}});
 const onSent=vi.fn(()=>new Promise(()=>{}));render(<InstagramReplyComposer conversation={conversation} onSent={onSent}/>);
 fireEvent.change(screen.getByLabelText('Ответ клиенту'),{target:{value:'answer'}});fireEvent.click(screen.getByText('Отправить'));
 await waitFor(()=>expect(onSent).toHaveBeenCalledWith({message,saved:true}));
 expect(screen.getByText('Отправить')).toBeTruthy();expect(screen.getByLabelText('Ответ клиенту').value).toBe('');
 expect(api.post).toHaveBeenCalledTimes(1);
});
it('preserves the draft and explains a Meta window refusal without automatically retrying',async()=>{
 api.post.mockRejectedValue(Object.assign(new Error('window'),{code:'INSTAGRAM_REPLY_WINDOW_CLOSED'}));
 render(<InstagramReplyComposer conversation={conversation}/>);fireEvent.change(screen.getByLabelText('Ответ клиенту'),{target:{value:'Салом 😊'}});fireEvent.click(screen.getByText('Отправить'));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','Окно ответа закрыто. Дождитесь нового сообщения клиента.');
 expect(screen.getByLabelText('Ответ клиенту').value).toBe('Салом 😊');expect(api.post).toHaveBeenCalledTimes(1);
});
