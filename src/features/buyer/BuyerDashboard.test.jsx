// @vitest-environment jsdom
import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('./buyer-api',()=>({buyerRequest:vi.fn()}));
import {buyerRequest} from './buyer-api';
import BuyerDashboard from './BuyerDashboard';
const detail={id:1,contractNumber:'001',property:{projectName:'TOZON',unitNumber:'7',areaM2x100:8180},manager:{name:'Менеҷер'},asOf:'2026-11-14',
 summary:{currency:'USD',totalMinor:100000,paidMinor:40000,remainingMinor:60000,overdueMinor:20000,downPaymentMinor:20000,downPaymentRemainingMinor:0,barterCreditedMinor:0,refundedMinor:0,overpaidMinor:0,nextPayment:{date:'2026-12-01',amountMinor:40000}},
 history:[{id:1,number:'ПКО-94',kind:'PAYMENT',date:'2026-11-01',amountMinor:40000,currency:'USD',status:'ACTIVE',method:'CASH',snapshotReviewRequired:true}],
 schedules:[{id:1,number:1,dueDate:'2026-11-01',plannedMinor:40000,paidMinor:20000,remainingMinor:20000,status:'OVERDUE'}],warnings:[]};
beforeEach(()=>{vi.clearAllMocks();buyerRequest.mockImplementation(async path=>path==='/contracts'?[{id:1,contractNumber:'001',projectName:'TOZON',unitNumber:'7'},{id:2,contractNumber:'002',projectName:'TOZON',unitNumber:'8'}]:detail);});
afterEach(cleanup);
it('shows totals and read-only history/schedule in Russian',async()=>{
 render(<BuyerDashboard initData="signed" language="ru"/>);
 expect(await screen.findByText('Стоимость договора')).toBeInTheDocument();
 expect(screen.getByText('600 USD')).toBeInTheDocument();expect(screen.getByText('Просрочено')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'История оплат'}));expect(screen.getByText('ПКО-94')).toBeInTheDocument();
 expect(screen.getByText(/Эквивалент этого платежа требует сверки/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'График оплаты'}));expect(screen.getByText('Просрочен')).toBeInTheDocument();
 expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
 expect(buyerRequest).toHaveBeenCalledWith('/contract','signed',expect.objectContaining({method:'POST',body:{dealId:'1'}}));
});
it('clears old financial data when another contract is denied',async()=>{
 render(<BuyerDashboard initData="signed" language="ru"/>);await screen.findByText('Стоимость договора');
 buyerRequest.mockRejectedValue(new Error('BUYER_CONTRACT_UNAVAILABLE'));
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'2'}});
 expect(await screen.findByRole('alert')).toHaveTextContent('Договор недоступен');expect(screen.queryByText('600 USD')).not.toBeInTheDocument();
});
it('uses Tajik labels without falling back to employee auth',async()=>{
 render(<BuyerDashboard initData="signed" language="tj"/>);
 expect(await screen.findByText('Арзиши шартнома')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Ҷадвали пардохт'}));expect(screen.getByText('Муҳлат гузаштааст')).toBeInTheDocument();
 expect(buyerRequest.mock.calls.every(([path])=>!path.includes('/auth'))).toBe(true);
});
it('shows a review message instead of an invented balance when FX is incomplete',async()=>{
 buyerRequest.mockImplementation(async path=>{if(path==='/contracts')return [{id:1,contractNumber:'001'}];throw new Error('BUYER_FINANCE_REVIEW_REQUIRED');});
 render(<BuyerDashboard initData="signed" language="ru"/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('проверки бухгалтерией');expect(screen.queryByText('Стоимость договора')).not.toBeInTheDocument();
});
it('does not render late results after unmount',async()=>{
 let finish;buyerRequest.mockReturnValue(new Promise(r=>{finish=r;}));
 const {unmount}=render(<BuyerDashboard initData="signed" language="ru"/>);unmount();finish([]);
 await waitFor(()=>expect(buyerRequest).toHaveBeenCalledTimes(1));
});
it('shows an unknown overdue amount as a dash instead of zero',async()=>{
 buyerRequest.mockImplementation(async path=>path==='/contracts'?[{id:1,contractNumber:'001'}]:{...detail,summary:{...detail.summary,overdueMinor:null,nextPayment:null},warnings:['SCHEDULE_REVIEW_REQUIRED']});
 render(<BuyerDashboard initData="signed" language="ru"/>);
 expect(await screen.findByText('График требует проверки. Уточните условия у менеджера.')).toBeInTheDocument();
 const card=screen.getByText('Просрочено').closest('div');expect(card).toHaveTextContent('—');expect(card).not.toHaveTextContent('0 USD');
});
it('labels terminated history and never presents its frozen balance as current debt',async()=>{
 buyerRequest.mockImplementation(async path=>path==='/contracts'?[{id:1,contractNumber:'001',archived:true,status:'CANCELLED'}]:{...detail,status:'CANCELLED',archived:true,summary:{...detail.summary,remainingMinor:null,overdueMinor:null,nextPayment:null},schedules:[]});
 render(<BuyerDashboard initData="signed" language="ru"/>);
 expect(await screen.findByText(/Договор расторгнут/)).toBeInTheDocument();expect(screen.queryByText('Просрочено')).not.toBeInTheDocument();expect(screen.queryByText('Остаток',{exact:true})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'График оплаты'})).toBeDisabled();expect(screen.queryByRole('button',{name:'Связь и уведомления'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'История оплат'}));expect(screen.getByText('ПКО-94')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Планы и документы'})).toBeEnabled();
});
