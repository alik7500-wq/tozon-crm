// @vitest-environment jsdom
import React,{StrictMode} from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('./buyer-api',()=>({buyerRequest:vi.fn(),loadTelegram:vi.fn()}));
vi.mock('./BuyerDashboard',()=>({default:()=> <div>Личный кабинет</div>}));
import {buyerRequest,loadTelegram} from './buyer-api';
import BuyerEntryPage from './BuyerEntryPage';
const token='a'.repeat(43);
beforeEach(()=>{
 vi.clearAllMocks();localStorage.clear();history.replaceState(null,'',`/buyer#invite=${token}`);
 loadTelegram.mockResolvedValue({initData:'signed-only',ready:vi.fn(),expand:vi.fn()});
 buyerRequest.mockImplementation(async path=>path==='/access'?[]:{status:'PENDING',code:'ABC12345'});
});
afterEach(cleanup);
it('requests manager approval without sending SMS, defaults to Tajik and removes QR from history',async()=>{
 render(<StrictMode><BuyerEntryPage/></StrictMode>);
 expect(await screen.findByText('ABC12345')).toBeInTheDocument();expect(window.location.hash).toBe('');
 expect(buyerRequest.mock.calls.some(([path])=>path==='/connect')).toBe(true);
 expect(buyerRequest.mock.calls.some(([path])=>['/otp','/verify'].includes(path))).toBe(false);
 expect(document.querySelector('main')).toHaveAttribute('lang','tg');
});
it('opens a returning identity immediately even when an old QR is present',async()=>{
 buyerRequest.mockResolvedValue([{deal_id:1,language:'ru'}]);render(<BuyerEntryPage/>);
 expect(await screen.findByText('Личный кабинет')).toBeInTheDocument();
 expect(buyerRequest.mock.calls.every(([path])=>path==='/access')).toBe(true);
 expect(document.querySelector('main')).toHaveAttribute('lang','ru');
 expect(JSON.stringify({...localStorage})).not.toContain(token);
});
it('opens the dashboard after the server confirms the binding',async()=>{
 let calls=0;buyerRequest.mockImplementation(async path=>path==='/access'?(calls++? [{deal_id:1}]:[]):{status:'VERIFIED'});
 render(<BuyerEntryPage/>);expect(await screen.findByText('Личный кабинет')).toBeInTheDocument();
});
it('does not grant a dashboard on unavailable or expired QR',async()=>{
 buyerRequest.mockImplementation(async path=>{if(path==='/access')return [];throw new Error('BUYER_INVITE_UNAVAILABLE');});
 render(<BuyerEntryPage/>);expect(await screen.findByRole('alert')).toBeInTheDocument();expect(screen.queryByText('Личный кабинет')).not.toBeInTheDocument();
});
it('requires Telegram signed data rather than an employee session',async()=>{
 loadTelegram.mockResolvedValue({initData:'',ready:vi.fn(),expand:vi.fn()});render(<BuyerEntryPage/>);
 expect(await screen.findByRole('alert')).toBeInTheDocument();expect(buyerRequest).not.toHaveBeenCalled();
});
it('does not create a request after the view is closed',async()=>{
 let resolve;loadTelegram.mockReturnValue(new Promise(r=>{resolve=r;}));const {unmount}=render(<BuyerEntryPage/>);unmount();
 resolve({initData:'signed-only',ready:vi.fn(),expand:vi.fn()});
 await waitFor(()=>expect(buyerRequest.mock.calls.filter(([,,o])=>o?.method==='POST')).toHaveLength(0));
});
