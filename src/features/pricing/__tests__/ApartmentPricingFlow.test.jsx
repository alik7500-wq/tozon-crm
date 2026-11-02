import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {ApartmentDetailModal} from '../../apartments/ApartmentDetailModal';
import {api} from '../../../api/client';
const mocks=vi.hoisted(()=>({wizard:vi.fn(()=>null)}));
vi.mock('../../../api/client',()=>({api:{get:vi.fn()}}));
vi.mock('../../auth/AuthContext',()=>({useAuth:()=>({user:{id:1,role:'ADMIN'}})}));
vi.mock('../../deals/DealWizardModal',()=>({DealWizardModal:props=>mocks.wizard(props)}));
vi.mock('../../apartments/components/InteractiveApartmentView',()=>({InteractiveApartmentView:()=>null}));
afterEach(cleanup);
it('reopens the apartment without changing hook order and passes the selected calculator terms to the wizard',async()=>{
 const unit={id:55,status:'AVAILABLE',project_id:3,unit_number:'55',rooms:2,unit_kind:'APARTMENT',area_m2_x100:7926,price_per_m2_minor:70000};
 const scheme={id:'s',project_id:3,is_active:true,updated_at:'v1',name:'Плаза',rules:[{payment_percent:0,discount_percent:0,price_per_m2:700,months:36},{payment_percent:30,discount_percent:10,price_per_m2:620,months:36}]};
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/discount-schemes'?{schemes:[scheme]}:{unit}}));
 const {rerender}=render(<ApartmentDetailModal isOpen={false} unitId={55} onClose={()=>{}}/>);rerender(<ApartmentDetailModal isOpen unitId={55} onClose={()=>{}}/>);
 await screen.findByRole('button',{name:/Взнос 30%/});fireEvent.change(screen.getByLabelText('Желаемый первоначальный взнос'),{target:{value:'20000'}});fireEvent.click(screen.getByText('Оформить по выбранным условиям'));
 await waitFor(()=>expect(mocks.wizard).toHaveBeenLastCalledWith(expect.objectContaining({initialPricingQuote:expect.objectContaining({total_minor:4914120,down_payment_minor:2000000,rule_payment_percent:30,months:36})})));
});
