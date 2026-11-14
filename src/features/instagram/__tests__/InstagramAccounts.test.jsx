import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('../../../api/client',()=>({api}));
vi.mock('../../auth/AuthContext',()=>({useAuth:()=>({user:{role:'ADMIN'}})}));
import {InstagramInboxPage} from '../InstagramInboxPage';
afterEach(()=>{cleanup();vi.resetAllMocks();});
const accounts=[{accountId:'11111',username:'first',connected:true},{accountId:'22222',username:'second',connected:true}];
function setup(history){api.get.mockImplementation((url,options)=>Promise.resolve(url.endsWith('/connection')?{data:{connected:true,accounts}}:url.endsWith('/conversations')?{data:[{instagramAccountId:options.params.account,contactId:'42',name:'Same contact'}]}:history(url)));render(<InstagramInboxPage/>);}
it('isolates histories and drafts for the same contact across accounts, and sends from the selected profile',async()=>{
 setup(url=>({data:[{message_id:'same',text_content:url.includes('/11111/')?'First private message':'Second private message'}]}));
 fireEvent.click(await screen.findByText('Same contact'));await screen.findByText('First private message');
 fireEvent.change(screen.getByLabelText('Ответ клиенту'),{target:{value:'Draft first'}});
 fireEvent.change(screen.getByLabelText('Аккаунт Instagram'),{target:{value:'22222'}});
 fireEvent.click(await screen.findByText('Same contact'));await screen.findByText('Second private message');expect(screen.queryByText('First private message')).toBeNull();
 expect(screen.getByLabelText('Ответ клиенту').value).toBe('');fireEvent.change(screen.getByLabelText('Ответ клиенту'),{target:{value:'Draft second'}});
 fireEvent.change(screen.getByLabelText('Аккаунт Instagram'),{target:{value:'11111'}});fireEvent.click(await screen.findByText('Same contact'));await screen.findByText('First private message');
 expect(screen.getByLabelText('Ответ клиенту').value).toBe('Draft first');
 api.post.mockResolvedValue({data:{message:{message_id:'sent',text_content:'Draft first',is_echo:true},saved:true}});fireEvent.click(screen.getByText('Отправить'));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/integrations/instagram/send/11111/42',{text:'Draft first'},{timeout:25000}));
});
it('ignores late history from a previous account after switching',async()=>{
 let finish;setup(url=>url.includes('/11111/')?new Promise(resolve=>{finish=resolve;}):{data:[{message_id:'b',text_content:'Second private message'}]});
 fireEvent.click(await screen.findByText('Same contact'));fireEvent.change(screen.getByLabelText('Аккаунт Instagram'),{target:{value:'22222'}});
 fireEvent.click(await screen.findByText('Same contact'));await screen.findByText('Second private message');
 await act(async()=>finish({data:[{message_id:'a',text_content:'Late first private message'}]}));expect(screen.queryByText('Late first private message')).toBeNull();
});
it('requires an explicit confirmation before disconnecting the selected account',async()=>{
 setup(()=>({data:[]}));await screen.findByLabelText('Аккаунт Instagram');
 fireEvent.change(screen.getByLabelText('Аккаунт Instagram'),{target:{value:'22222'}});fireEvent.click(screen.getByText('Отключить аккаунт'));expect(api.post).not.toHaveBeenCalled();
 api.post.mockResolvedValue({data:{disconnected:true}});fireEvent.click(screen.getByText('Подтвердить отключение'));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/integrations/instagram/accounts/22222/disconnect'));
});
