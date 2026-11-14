// @vitest-environment jsdom
import React from 'react';
import {MemoryRouter} from 'react-router-dom';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import '@testing-library/jest-dom/vitest';
vi.mock('../../api/client',()=>({api:{get:vi.fn(),post:vi.fn()}}));
import {api} from '../../api/client';
import BuyerInvitationsPage from './BuyerInvitationsPage';
const rows=[{leadId:1,name:'Buyer One',phone:'+992900000001',contracts:2,dealId:1,status:'NOT_INVITED',canSend:true,validPhone:true},{leadId:2,name:'Connected Buyer',phone:'+992900000002',contracts:1,dealId:2,status:'CONNECTED',canSend:true,validPhone:true},{leadId:3,name:'Waiting Buyer',phone:'+992900000003',contracts:1,dealId:3,pendingDealId:3,status:'PENDING',canSend:true,validPhone:true}];
beforeEach(()=>{vi.clearAllMocks();api.get.mockResolvedValue({data:rows});api.post.mockImplementation(async path=>path.endsWith('/preview')?{data:[{leadId:1,name:'Buyer One',phone:rows[0].phone,text:'TOZON example link',language:'tj',segments:5}]}:{data:{status:'SENT'}});});
afterEach(cleanup);
const open=()=>render(<MemoryRouter><BuyerInvitationsPage/></MemoryRouter>);
it('lists buyers without sending anything, defaults language to Tajik and disables connected/pending recipients',async()=>{
 open();expect(await screen.findByText('Buyer One')).toBeInTheDocument();expect(api.post).not.toHaveBeenCalled();
 expect(screen.getByLabelText('Язык приглашения')).toHaveValue('tj');expect(screen.getByLabelText('Выбрать Waiting Buyer')).toBeDisabled();
 expect(screen.getByRole('link',{name:'Подтвердить в договоре'})).toHaveAttribute('href','/deals?dealId=3');
});
it('requires preview and an explicit send click, then prevents double sending',async()=>{
 open();fireEvent.click(await screen.findByLabelText('Выбрать Buyer One'));fireEvent.click(screen.getByRole('button',{name:'Предпросмотр SMS (1)'}));
 expect(await screen.findByRole('dialog')).toBeInTheDocument();expect(api.post).toHaveBeenCalledWith('/sms/buyer-invitations/preview',{leadIds:[1],language:'tj'});
 expect(api.post.mock.calls.some(([path])=>path.endsWith('/send'))).toBe(false);
 const button=screen.getByRole('button',{name:'Отправить 1 приглашение'});fireEvent.click(button);fireEvent.click(button);
 expect(await screen.findByText('SMS передано провайдеру')).toBeInTheDocument();expect(api.post.mock.calls.filter(([path])=>path.endsWith('/send'))).toHaveLength(1);expect(button).toBeDisabled();
});
it('allows cancelling the preview without sending',async()=>{
 open();fireEvent.click(await screen.findByLabelText('Выбрать Buyer One'));fireEvent.click(screen.getByRole('button',{name:'Предпросмотр SMS (1)'}));
 fireEvent.click(await screen.findByRole('button',{name:'Отмена'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(api.post.mock.calls.filter(([path])=>path.endsWith('/send'))).toHaveLength(0);
});
it('shows an unknown result without retrying after a failed network response',async()=>{
 api.post.mockImplementation(async path=>{if(path.endsWith('/preview'))return {data:[{leadId:1,name:'Buyer One',phone:rows[0].phone,text:'Preview',language:'tj'}]};throw new Error('timeout');});
 open();fireEvent.click(await screen.findByLabelText('Выбрать Buyer One'));fireEvent.click(screen.getByRole('button',{name:'Предпросмотр SMS (1)'}));fireEvent.click(await screen.findByRole('button',{name:'Отправить 1 приглашение'}));
 expect(await screen.findByText('Результат неизвестен. Проверьте историю SMS')).toBeInTheDocument();expect(api.post.mock.calls.filter(([path])=>path.endsWith('/send'))).toHaveLength(1);
});
