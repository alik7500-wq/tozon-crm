import React from 'react';
import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('../../../api/client',()=>({api}));
vi.mock('../../auth/AuthContext',()=>({useAuth:()=>({user:{role:'ADMIN'}})}));
import {InstagramInboxPage} from '../InstagramInboxPage';
afterEach(cleanup);
beforeEach(()=>vi.resetAllMocks());
const list=[{instagramAccountId:'1',contactId:'10',name:'Alice'},{instagramAccountId:'1',contactId:'20',name:'Bob'}];
function setup(history){api.get.mockImplementation(url=>url.endsWith('/connection')?Promise.resolve({data:{connected:true}}):url.endsWith('/conversations')?Promise.resolve({data:list}):history(url));render(<InstagramInboxPage/>);}
describe('Instagram Direct UI',()=>{
 it('does not show empty inbox on request failure',async()=>{
  api.get.mockRejectedValue(new Error('Meta не разрешила доступ к перепискам.'));render(<InstagramInboxPage/>);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Meta не разрешила доступ к перепискам.');
  expect(screen.queryByText('Сообщений пока нет.')).toBeNull();
 });
 it('shows empty inbox only after successful request',async()=>{
  api.get.mockResolvedValue({data:[]});render(<InstagramInboxPage/>);
  expect(await screen.findByText('Сообщений пока нет.')).toBeTruthy();
 });
 it('ignores late message responses from previously selected contacts',async()=>{
  let resolveAlice;
  setup(url=>url.includes('/10/')?new Promise(resolve=>{resolveAlice=resolve;}):Promise.resolve({data:[{message_id:'b',text_content:'Bob message'}]}));
  fireEvent.click(await screen.findByText('Alice'));fireEvent.click(screen.getByText('Bob'));
  expect(await screen.findByText('Bob message')).toBeTruthy();
  resolveAlice({data:[{message_id:'a',text_content:'Alice old response'}]});
  await waitFor(()=>expect(screen.queryByText('Alice old response')).toBeNull());
  expect(screen.getByText('Bob message')).toBeTruthy();
 });
 it('loads additional conversations using the server cursor',async()=>{
  api.get.mockImplementation(url=>url.endsWith('/connection')?Promise.resolve({data:{connected:true}}):url.endsWith('/page')?Promise.resolve({data:[list[1]],nextCursor:null}):Promise.resolve({data:[list[0]],nextCursor:'CURSOR'}));
  render(<InstagramInboxPage/>);fireEvent.click(await screen.findByText('Загрузить ещё диалоги'));
  expect(await screen.findByText('Bob')).toBeTruthy();expect(screen.getByText('Alice')).toBeTruthy();
  expect(api.get).toHaveBeenCalledWith('/integrations/instagram/inbox/conversations/page',{params:{after:'CURSOR'}});
 });
});
