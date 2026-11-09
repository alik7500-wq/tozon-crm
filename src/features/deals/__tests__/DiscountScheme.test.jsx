import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {DealWizardModal} from '../DealWizardModal';
import {api} from '../../../api/client';
import {calculatePricing,discountRuleKey} from '../../pricing/pricingCalculator';
vi.mock('../../../api/client',()=>({api:{get:vi.fn(),post:vi.fn()}}));
vi.mock('../../documents/PassportScannerModal',()=>({PassportScannerModal:()=>null}));
afterEach(cleanup);
it.each([[5,2.86,30],[100,21.43,0],[5,2.86,30,650]])('submits verified %s percent scheme and exact money',async(payment,discount,months,price)=>{
const unit={id:300,project_id:3,unit_kind:'APARTMENT',unit_number:'24',area_m2_x100:4322,price_per_m2_minor:70000,project_currency:'USD'};
api.get.mockImplementation(path=>Promise.resolve({data:path==='/discount-schemes'?{schemes:[{id:'scheme',project_id:3,name:'Плаза',updated_at:'v1',is_active:true,rules:[{payment_percent:payment,discount_percent:discount,months,...(price?{price_per_m2:price}:{})}]}]}:path==='/leads'?{leads:[{id:1,full_name:'Покупатель',phone:'000'}]}:{}}));
api.post.mockResolvedValue({data:{deal:{id:1}}});
const scheme={id:'scheme',project_id:3,name:'Плаза',updated_at:'v1',is_active:true,rules:[{payment_percent:payment,discount_percent:discount,months,...(price?{price_per_m2:price}:{})}]};
const quote=calculatePricing(unit,scheme,{mode:'tier',value:payment,months:''});
render(<DealWizardModal isOpen unit={unit} initialPricingQuote={quote} onClose={vi.fn()}/>);
fireEvent.click(await screen.findByText('Покупатель'));fireEvent.click(screen.getByText('Далее'));
await screen.findByText(/ступень от/);
const base=3025400,final=price?Math.round(4322*price):base-Math.round(base*discount/100),disc=base-final;
expect(screen.getByLabelText('Окончательная стоимость объекта')).toHaveValue(final/100);
expect(screen.getByLabelText('Окончательная стоимость объекта')).toBeDisabled();
fireEvent.click(screen.getByText('Далее'));fireEvent.click(screen.getByText('Далее'));
fireEvent.click(screen.getByText('Подписать договор'));
await waitFor(()=>expect(api.post).toHaveBeenLastCalledWith('/deals',expect.objectContaining({discount_scheme_id:'scheme',discount_scheme_updated_at:'v1',discount_rule_payment_percent:payment,base_price_minor:base,discount_minor:disc,final_price_minor:final,down_payment_minor:Math.round(final*payment/100),installment_months:months})));
});

it('opens apartments at inventory price instead of the old calculator price',async()=>{
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/leads'?{leads:[{id:1,full_name:'Покупатель',phone:'000'}]}:{schemes:[]}}));
 render(<DealWizardModal isOpen unit={{id:300,unit_kind:'APARTMENT',area_m2_x100:5645,price_per_m2_minor:70000}} initialPricePerM2={670} onClose={vi.fn()}/>);
 fireEvent.click(await screen.findByText('Покупатель'));fireEvent.click(screen.getByText('Далее'));
 expect(screen.getByLabelText('Цена объекта за м²')).toHaveValue(700);
 expect(screen.getByLabelText('Окончательная стоимость объекта')).toHaveValue(39515);
});

it('edits the calculator from the compact wizard summary and keeps exact client amount and shortened term',async()=>{
 const unit={id:300,project_id:3,unit_kind:'APARTMENT',unit_number:'24',area_m2_x100:7926,price_per_m2_minor:70000};
 const scheme={id:'scheme',project_id:3,name:'Плаза',updated_at:'v1',is_active:true,rules:[{payment_percent:0,discount_percent:0,price_per_m2:700,months:36},{payment_percent:30,discount_percent:10,price_per_m2:620,months:36}]};
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/finance/rates/eskhata'?{available:true,sellRate:10}:path==='/discount-schemes'?{schemes:[scheme]}:path==='/leads'?{leads:[{id:1,full_name:'Покупатель',phone:'000'}]}:{}}));api.post.mockResolvedValue({data:{deal:{id:1}}});
 render(<DealWizardModal isOpen unit={unit} onClose={vi.fn()}/>);
 fireEvent.click(await screen.findByText('Покупатель'));fireEvent.click(screen.getByText('Далее'));
 expect(screen.queryByRole('button',{name:/Взнос 30%/})).toBeNull();
 fireEvent.click(screen.getByText('Изменить условия цены'));await screen.findByRole('button',{name:/Взнос 30%/});
 fireEvent.change(screen.getByLabelText('Желаемый первоначальный взнос'),{target:{value:'200000'}});fireEvent.click(screen.getByText('Применить условия'));
 await waitFor(()=>expect(screen.queryByLabelText('Изменение условий цены')).toBeNull());
 expect(screen.getByLabelText('Окончательная стоимость объекта')).toHaveValue(49141.2);
 fireEvent.click(screen.getByText('Далее'));expect(screen.getByLabelText('Первоначальный взнос по графику')).not.toBeDisabled();expect(screen.getByLabelText('Первоначальный взнос по графику')).toHaveValue(20000);
 fireEvent.change(screen.getByLabelText('Количество платежей по рассрочке'),{target:{value:'24'}});fireEvent.click(screen.getByText('Далее'));fireEvent.click(screen.getByText('Подписать договор'));
 await waitFor(()=>expect(api.post).toHaveBeenLastCalledWith('/deals',expect.objectContaining({discount_scheme_id:'scheme',discount_rule_payment_percent:30,final_price_minor:4914120,down_payment_minor:2000000,installment_months:24})));
 const data=api.post.mock.calls.at(-1)[1];expect(data.schedules.reduce((sum,row)=>sum+row.amount_minor,0)).toBe(2914120);
});

it.each([[700,40],[640,36]])('submits the exact zero-deposit offer at %s for %s months',async(price,months)=>{
 const unit={id:300,project_id:3,unit_kind:'APARTMENT',unit_number:'24',area_m2_x100:4322,price_per_m2_minor:70000,project_currency:'USD'};
 const rules=[{payment_percent:0,discount_percent:0,price_per_m2:700,months:40},{payment_percent:0,discount_percent:8.57,price_per_m2:640,months:36}];
 const scheme={id:'scheme',project_id:3,name:'Офферы',updated_at:'v1',is_active:true,rules};
 const key=discountRuleKey(rules.find(r=>r.price_per_m2===price));
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/discount-schemes'?{schemes:[scheme]}:path==='/leads'?{leads:[{id:1,full_name:'Покупатель',phone:'000'}]}:{}}));
 api.post.mockClear();api.post.mockResolvedValue({data:{deal:{id:1}}});
 const quote=calculatePricing(unit,scheme,{mode:'tier',value:0,rule_key:key,months:''});
 render(<DealWizardModal isOpen unit={unit} initialPricingQuote={quote} onClose={vi.fn()}/>);
 fireEvent.click(await screen.findByText('Покупатель'));fireEvent.click(screen.getByText('Далее'));
 await screen.findByText(/ступень от/);
 expect(screen.getByLabelText('Окончательная стоимость объекта')).toHaveValue(4322*price/100);
 fireEvent.click(screen.getByText('Далее'));fireEvent.click(screen.getByText('Далее'));fireEvent.click(screen.getByText('Подписать договор'));
 await waitFor(()=>expect(api.post).toHaveBeenLastCalledWith('/deals',expect.objectContaining({discount_rule_key:key,discount_rule_payment_percent:0,final_price_minor:4322*price,down_payment_minor:0,installment_months:months})));
});
