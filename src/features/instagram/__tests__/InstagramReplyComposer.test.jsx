import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
const api=vi.hoisted(()=>({post:vi.fn()}));
vi.mock('../../../api/client',()=>({api}));
import {InstagramReplyComposer} from '../InstagramReplyComposer';
afterEach(()=>{cleanup();sessionStorage.clear();vi.resetAllMocks();});
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

it('prevents double-click duplicate send and passes stable idempotency_key',async()=>{
 let resolveSend;
 api.post.mockImplementation(()=>new Promise(r=>{resolveSend=r;}));
 render(<InstagramReplyComposer conversation={conversation}/>);
 fireEvent.change(screen.getByLabelText('Ответ клиенту'),{target:{value:'Double click test'}});
 const btn=screen.getByText('Отправить');
 fireEvent.click(btn);
 fireEvent.click(btn);
 expect(api.post).toHaveBeenCalledTimes(1);
 expect(api.post.mock.calls[0][1]).toEqual(expect.objectContaining({text:'Double click test',idempotency_key:expect.stringMatching(/^ig_/)}));
 resolveSend({data:{message:{message_id:'m1',text_content:'Double click test',is_echo:true},saved:true}});
 await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('Принято поставщиком'));
});

it('keeps unknown state across text edits and remount, and reconciles with same idempotency_key without resending',async()=>{
 sessionStorage.clear();
 api.post.mockResolvedValueOnce({deliveryStatus:'unknown',data:{reconciliationRequired:true,nextAction:'Выполните сверку'}});
 const {unmount}=render(<InstagramReplyComposer conversation={conversation}/>);
 fireEvent.change(screen.getByLabelText('Ответ клиенту'),{target:{value:'Uncertain msg'}});
 fireEvent.click(screen.getByText('Отправить'));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Сверить доставку'})).toBeTruthy());
 const sentKey=api.post.mock.calls[0][1].idempotency_key;

 // Editing text must NOT clear unknown state
 fireEvent.change(screen.getByLabelText('Ответ клиенту'),{target:{value:'Edited text'}});
 expect(screen.getByRole('button',{name:'Сверить доставку'})).toBeTruthy();
 expect(screen.getByText('Отправить').disabled).toBe(true);

 // Unmount / reload simulation restores unknown state & key
 unmount();
 render(<InstagramReplyComposer conversation={conversation}/>);
 expect(screen.getByRole('button',{name:'Сверить доставку'})).toBeTruthy();

 api.post.mockResolvedValueOnce({deliveryStatus:'confirmed',data:{message:{message_id:'m2',text_content:'Uncertain msg',is_echo:true},saved:true}});
 fireEvent.click(screen.getByRole('button',{name:'Сверить доставку'}));
 await waitFor(()=>expect(api.post).toHaveBeenLastCalledWith('/integrations/instagram/send/1/123/reconcile',{idempotency_key:sentKey},{timeout:25000}));
 await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('Принято поставщиком'));
});
