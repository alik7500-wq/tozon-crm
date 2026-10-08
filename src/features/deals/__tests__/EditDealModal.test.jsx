import React from 'react';
import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {EditDealModal} from '../EditDealModal';
import {api} from '../../../api/client';
vi.mock('../../../api/client',()=>({api:{get:vi.fn(),post:vi.fn(),patch:vi.fn()}}));
vi.mock('../../../hooks/useModalDismiss',()=>({useModalDismiss:({onClose})=>({requestClose:onClose})}));
const deal={id:1,unit_id:1,unit_number:'A1',project_id:1,project_name:'Test project',currency:'USD',status:'SIGNED',payment_type:'INSTALLMENT',contract_number:'0006',deal_date:'2026-02-12',updated_at:'2026-10-01T00:00:00Z',area_m2_x100:9220,final_price_minor:4425600,deal_price_per_m2_minor:48000,discount_minor:0,down_payment_minor:664100,installment_months:24,total_paid_minor:1435532};
beforeEach(()=>{
 vi.clearAllMocks();api.get.mockImplementation(path=>Promise.resolve(path==='/users'?{data:{users:[]}}:{data:{units:[{id:2,unit_number:'A2',area_m2_x100:10000,project_currency:'USD',floor_number:2,section_name:'A'}]}}));
 api.post.mockResolvedValue({data:{deal:{...deal,unit_id:2}}});api.patch.mockResolvedValue({data:{deal}});
});
afterEach(cleanup);
const open=()=>{const updated=vi.fn();const close=vi.fn();render(<EditDealModal isOpen deal={deal} onClose={close} onDealUpdated={updated}/>);return {updated,close};};
describe('contract amendment form',()=>{
 it('allows paid unit swap, shows new debt and submits immutable identity',async()=>{
   const {updated}=open();fireEvent.click(screen.getByRole('checkbox',{name:'Изменить квартиру и стоимость'}));
   await screen.findByRole('option',{name:/A2/});
   fireEvent.change(screen.getByLabelText('Квартира'),{target:{value:'2'}});
   fireEvent.change(screen.getByLabelText('Причина изменения'),{target:{value:'Client requested replacement'}});
   expect(screen.getByDisplayValue('48000')).toBeTruthy();
   fireEvent.click(screen.getByRole('button',{name:'Сохранить изменения'}));
   await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/deals/1/amend',{unit_id:2,final_price_minor:4800000,deal_price_per_m2_minor:48000,reason:'Client requested replacement',expected_updated_at:deal.updated_at}));
   expect(api.patch).not.toHaveBeenCalled();expect(updated).toHaveBeenCalled();
 });
 it('keeps ordinary paid metadata editing functional without financial fields',async()=>{
   open();fireEvent.click(screen.getByRole('button',{name:'Сохранить изменения'}));
   await waitFor(()=>expect(api.patch).toHaveBeenCalled());
   const payload=api.patch.mock.calls[0][1];expect(payload).not.toHaveProperty('payment_type');expect(payload).not.toHaveProperty('installment_months');expect(payload).not.toHaveProperty('final_price_minor');
 });
 it('retains entered data after unavailable unit conflict',async()=>{
   api.post.mockRejectedValue(new Error('Квартира занята'));const {close}=open();
   fireEvent.click(screen.getByRole('checkbox',{name:'Изменить квартиру и стоимость'}));await screen.findByRole('option',{name:/A2/});
   fireEvent.change(screen.getByLabelText('Причина изменения'),{target:{value:'Agreed'}});
   fireEvent.click(screen.getByRole('button',{name:'Сохранить изменения'}));
   await screen.findByText('Квартира занята');expect(close).not.toHaveBeenCalled();expect(screen.getByDisplayValue('Agreed')).toBeTruthy();
 });
 it('calculates cents without whole-dollar rounding',async()=>{
   open();fireEvent.click(screen.getByRole('checkbox',{name:'Изменить квартиру и стоимость'}));
   await screen.findByRole('option',{name:/A2/});
   fireEvent.change(screen.getByDisplayValue('480'),{target:{value:'480.01'}});
   expect(screen.getByDisplayValue('44256.92')).toBeTruthy();
 });
});
