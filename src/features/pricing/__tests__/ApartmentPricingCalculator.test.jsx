import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {ApartmentPricingCalculator} from '../ApartmentPricingCalculator';
import {api} from '../../../api/client';
vi.mock('../../../api/client',()=>({api:{get:vi.fn()}}));
afterEach(cleanup);
const unit={id:55,project_id:3,area_m2_x100:7926,price_per_m2_minor:70000};
const scheme={id:'one',project_id:3,is_active:true,updated_at:'v1',name:'Настроенная схема',rules:[{payment_percent:0,discount_percent:0,price_per_m2:700,months:36},{payment_percent:15,discount_percent:5,price_per_m2:650,months:36},{payment_percent:30,discount_percent:10,price_per_m2:620,months:36},{payment_percent:100,discount_percent:20,price_per_m2:550,months:0}]};
it('renders only configured tiers and updates all terms live from a typed deposit',async()=>{
 api.get.mockResolvedValue({data:{schemes:[scheme]}});const onChange=vi.fn(),onCreateDeal=vi.fn();render(<ApartmentPricingCalculator unit={unit} onChange={onChange} onCreateDeal={onCreateDeal}/>);
 expect(await screen.findByRole('button',{name:/Взнос 15%/})).toBeTruthy();expect(screen.queryByRole('button',{name:/Взнос 20%/})).toBeNull();
 fireEvent.change(screen.getByLabelText('Желаемый первоначальный взнос'),{target:{value:'20000'}});
 await waitFor(()=>expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({down_payment_minor:2000000,rule_payment_percent:30,total_minor:4914120,months:36})));
 fireEvent.click(screen.getByText('Оформить по выбранным условиям'));expect(onCreateDeal).toHaveBeenCalledWith(expect.objectContaining({down_payment_minor:2000000}));
 fireEvent.change(screen.getByLabelText('Срок калькулятора'),{target:{value:'24'}});await waitFor(()=>expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({months:24})));
});
it('does not fabricate discounts when loading fails',async()=>{
 api.get.mockRejectedValue(new Error('offline'));const onChange=vi.fn();render(<ApartmentPricingCalculator unit={unit} onChange={onChange} onCreateDeal={()=>{}}/>);expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить');expect(screen.getByText('Оформить по выбранным условиям')).toBeDisabled();expect(onChange).toHaveBeenLastCalledWith(null);
});
