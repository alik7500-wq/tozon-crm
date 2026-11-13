// @vitest-environment jsdom
import React,{StrictMode} from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('./buyer-api',()=>({buyerRequest:vi.fn(),loadTelegram:vi.fn()}));
import {buyerRequest,loadTelegram} from './buyer-api';
import BuyerEntryPage from './BuyerEntryPage';
const token='a'.repeat(43);
beforeEach(()=>{
  vi.clearAllMocks();localStorage.clear();history.replaceState(null,'',`/buyer#invite=${token}`);
  loadTelegram.mockResolvedValue({initData:'signed-only',ready:vi.fn(),expand:vi.fn()});
  buyerRequest.mockImplementation(async path=>path==='/access'?[]:path==='/otp'?{challengeId:'challenge',maskedPhone:'+992•••••0001'}:{verified:true});
});
afterEach(cleanup);
it('defaults to Tajik, clears bearer from history after SDK initialization, and never auto-sends SMS',async()=>{
  render(<StrictMode><BuyerEntryPage/></StrictMode>);
  expect(await screen.findByRole('button',{name:'Гирифтани рамз бо SMS'})).toBeEnabled();
  expect(window.location.hash).toBe('');
  expect(buyerRequest.mock.calls.every(([path])=>path==='/access')).toBe(true);
  expect(document.querySelector('main')).toHaveAttribute('lang','tg');
});
it('confirms via HTTP, blocks duplicate clicks and shows explicit connection count',async()=>{
  render(<BuyerEntryPage/>);
  fireEvent.click(await screen.findByRole('button',{name:'Русский'}));
  fireEvent.click(await screen.findByRole('button',{name:'Получить код по SMS'}));
  const input=await screen.findByLabelText('6-значный код из SMS');
  expect(buyerRequest).toHaveBeenCalledWith('/otp','signed-only',{method:'POST',body:{token}});
  expect(screen.getByRole('button',{name:/Отправить повторно/})).toBeDisabled();
  buyerRequest.mockImplementation(async path=>path==='/access'?[{deal_id:123,language:'ru'}]:{verified:true});
  fireEvent.change(input,{target:{value:'123456'}});fireEvent.submit(input.closest('form'));
  expect(await screen.findByText('Подключение подтверждено')).toBeInTheDocument();
  expect(buyerRequest).toHaveBeenCalledWith('/verify','signed-only',{method:'POST',body:{challengeId:'challenge',code:'123456'}});
  expect(buyerRequest).toHaveBeenCalledWith('/preferences','signed-only',{method:'PATCH',body:{language:'ru'}});
  expect(screen.queryByRole('button',{name:'Получить код по SMS'})).not.toBeInTheDocument();
  expect(localStorage.getItem('tozon-buyer-language-v1')).toBe('ru');
  expect(JSON.stringify({...localStorage})).not.toContain('123456');
  expect(JSON.stringify({...localStorage})).not.toContain(token);
});
it('shows an expired invite explanation and never reports a connection',async()=>{
  render(<BuyerEntryPage/>);
  const send=await screen.findByRole('button',{name:'Гирифтани рамз бо SMS'});
  buyerRequest.mockRejectedValueOnce(new Error('BUYER_INVITE_UNAVAILABLE'));fireEvent.click(send);
  expect(await screen.findByRole('alert')).toHaveTextContent('QR дигар дастрас нест');
  expect(screen.queryByText('Пайвастшавӣ тасдиқ шуд')).not.toBeInTheDocument();
});
it('requires Telegram signed data and does not fall back to employee authentication',async()=>{
  loadTelegram.mockResolvedValue({initData:'',ready:vi.fn(),expand:vi.fn()});
  render(<BuyerEntryPage/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Telegram');
  expect(buyerRequest).not.toHaveBeenCalled();
});
it('restores the server language for a returning verified buyer',async()=>{
  history.replaceState(null,'','/buyer');buyerRequest.mockResolvedValue([{deal_id:5,language:'ru'}]);
  render(<BuyerEntryPage/>);
  expect(await screen.findByText('Подключение подтверждено')).toBeInTheDocument();
  expect(screen.queryByText('5')).not.toBeInTheDocument();
});
it('does not send customer information when closed while loading',async()=>{
  let resolve;loadTelegram.mockReturnValue(new Promise(r=>{resolve=r;}));
  const {unmount}=render(<BuyerEntryPage/>);unmount();
  resolve({initData:'signed-only',ready:vi.fn(),expand:vi.fn()});
  await waitFor(()=>expect(buyerRequest.mock.calls.filter(([,,o])=>o?.method==='POST')).toHaveLength(0));
});
