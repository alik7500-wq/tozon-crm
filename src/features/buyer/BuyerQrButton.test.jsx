// @vitest-environment jsdom
import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('antd',()=>({Modal:({children,open})=>open?<div role="dialog">{children}</div>:null,QRCode:({value})=><canvas data-testid="qr" data-value={value}/>}));
vi.mock('../../api/client',()=>({api:{post:vi.fn(),get:vi.fn()}}));
const state=vi.hoisted(()=>({user:{id:7,is_active:true,role:'SALES_MANAGER'}}));
vi.mock('../auth/AuthContext',()=>({useAuth:()=>({user:state.user})}));
import {api} from '../../api/client';
import {BuyerQrButton} from './BuyerQrButton';
import {canIssueBuyerQr} from './buyer-permissions';
const deal={id:1,status:'SIGNED',responsible_user_id:7,lead_name:'Покупатель',contract_number:'001',project_name:'TOZON',unit_number:'7'};
beforeEach(()=>{
  vi.stubEnv('VITE_BUYER_PORTAL_ENABLED','true');vi.clearAllMocks();state.user={id:7,is_active:true,role:'SALES_MANAGER'};
  api.post.mockResolvedValue({data:{url:'https://t.me/ActualBot?start=buyer_opaque',expiresAt:'2026-11-14T01:00:00Z'}});
  api.get.mockResolvedValue({data:{connected:false,contractAccess:false}});
});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
it('opens buyer QR with the correct contract and locally rendered image',async()=>{
  render(<BuyerQrButton deal={deal}/>);fireEvent.click(screen.getByRole('button',{name:'QR-код покупателя'}));
  expect(await screen.findByTestId('qr')).toHaveAttribute('data-value','https://t.me/ActualBot?start=buyer_opaque');
  expect(api.post).toHaveBeenCalledWith('/deals/1/buyer-invites');expect(api.get).toHaveBeenCalledWith('/deals/1/buyer-status');
  expect(screen.getByText('Покупатель',{selector:'dd'})).toBeInTheDocument();
  for(const name of ['Скачать QR','Распечатать','Скопировать ссылку'])expect(screen.getByRole('button',{name})).toBeEnabled();
});
it('hides entry when rollout is disabled',()=>{
  vi.stubEnv('VITE_BUYER_PORTAL_ENABLED','false');render(<BuyerQrButton deal={deal}/>);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(api.post).not.toHaveBeenCalled();
});
it.each([
  {id:8,is_active:true,role:'SALES_MANAGER'}, {id:7,is_active:false,role:'ADMIN'},
  {id:7,is_active:true,role:'FINANCE_MANAGER'}, {id:7,is_active:true,role:'SALES_MANAGER',permissions:['access.v2','deals.view']}
])('hides QR for employees without assignment/write access',user=>{
  expect(canIssueBuyerQr(user,deal)).toBe(false);state.user=user;render(<BuyerQrButton deal={deal}/>);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('shows staff verification guidance for missing phone',async()=>{
  api.post.mockRejectedValue(new Error('BUYER_PHONE_REQUIRES_STAFF_VERIFICATION'));
  render(<BuyerQrButton deal={deal}/>);fireEvent.click(screen.getByRole('button',{name:'QR-код покупателя'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('телефон покупателя');expect(screen.queryByTestId('qr')).not.toBeInTheDocument();
});
