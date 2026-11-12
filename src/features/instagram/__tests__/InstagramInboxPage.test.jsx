import React from 'react';
import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('../../../api/client',()=>({api}));
vi.mock('../../auth/AuthContext',()=>({useAuth:()=>({user:{role:'ADMIN'}})}));
import {InstagramInboxPage} from '../InstagramInboxPage';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
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

describe('Instagram history loading performance',()=>{
 it('immediately reuses a recently loaded dialog without another network request',async()=>{
  setup(url=>Promise.resolve({data:[{message_id:url.includes('/10/')?'a':'b',text_content:url.includes('/10/')?'Alice cached':'Bob cached'}]}));
  fireEvent.click(await screen.findByText('Alice'));await screen.findByText('Alice cached');
  fireEvent.click(screen.getByText('Bob'));await screen.findByText('Bob cached');
  const before=api.get.mock.calls.length;
  fireEvent.click(screen.getByText('Alice'));
  expect(screen.getByText('Alice cached')).toBeTruthy();expect(api.get.mock.calls).toHaveLength(before);
 });
 it('keeps cached messages visible while fetching a stale history in the background',async()=>{
  let time=100000,resolveUpdate;const dateSpy=vi.spyOn(Date,'now').mockImplementation(()=>time);
  let aliceCalls=0;
  setup(url=>url.includes('/10/')?(++aliceCalls===1?Promise.resolve({data:[{message_id:'a',text_content:'Alice cached'}]}):new Promise(resolve=>{resolveUpdate=resolve;})):Promise.resolve({data:[{message_id:'b',text_content:'Bob'}]}));
  fireEvent.click(await screen.findByText('Alice'));await screen.findByText('Alice cached');
  fireEvent.click(screen.getAllByText('Bob')[0]);await screen.findByText('Переписка: Bob');
  time+=11000;fireEvent.click(screen.getByText('Alice'));
  expect(screen.getByText('Alice cached')).toBeTruthy();expect(screen.getByRole('status').textContent).toBe('Обновление сообщений…');
  resolveUpdate({data:[{message_id:'a',text_content:'Alice updated'}]});await screen.findByText('Alice updated');
  dateSpy.mockRestore();
 });
 it('deduplicates an in-flight history when switching back before it finishes',async()=>{
  let resolveAlice;
  setup(url=>url.includes('/10/')?new Promise(resolve=>{resolveAlice=resolve;}):Promise.resolve({data:[{message_id:'b',text_content:'Bob cached'}]}));
  fireEvent.click(await screen.findByText('Alice'));fireEvent.click(screen.getByText('Bob'));await screen.findByText('Bob cached');fireEvent.click(screen.getByText('Alice'));
  expect(api.get.mock.calls.filter(([url])=>url.includes('/10/'))).toHaveLength(1);
  resolveAlice({data:[{message_id:'a',text_content:'Alice result'}]});await screen.findByText('Alice result');
 });
 it('forces a fresh read when the user presses Refresh',async()=>{
  let aliceCalls=0;setup(()=>Promise.resolve({data:[{message_id:'a',text_content:'Alice '+ ++aliceCalls}]}));
  fireEvent.click(await screen.findByText('Alice'));await screen.findByText('Alice 1');
  fireEvent.click(screen.getByRole('button',{name:'Обновить',exact:true}));await screen.findByText('Alice 2');expect(aliceCalls).toBe(2);
 });
});

it('clears previously displayed history if revalidation denies access',async()=>{
 let time=100000;vi.spyOn(Date,'now').mockImplementation(()=>time);let aliceCalls=0;
 setup(url=>url.includes('/10/')?(++aliceCalls===1?Promise.resolve({data:[{message_id:'a',text_content:'Private Alice history'}]}):Promise.reject(Object.assign(new Error('Access denied'),{response:{status:403}}))):Promise.resolve({data:[{message_id:'b',text_content:'Bob message'}]}));
 fireEvent.click(await screen.findByText('Alice'));await screen.findByText('Private Alice history');
 fireEvent.click(screen.getByText('Bob'));await screen.findByText('Bob message');time+=11000;fireEvent.click(screen.getByText('Alice'));
 await screen.findByRole('alert');await waitFor(()=>expect(screen.queryByText('Private Alice history')).toBeNull());
});
