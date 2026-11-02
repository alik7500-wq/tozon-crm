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
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/finance/rates/eskhata'?{available:true,sellRate:10}:{schemes:[scheme]}}));const onChange=vi.fn(),onCreateDeal=vi.fn();render(<ApartmentPricingCalculator unit={unit} onChange={onChange} onCreateDeal={onCreateDeal}/>);
 expect(await screen.findByRole('button',{name:/Взнос 15%/})).toBeTruthy();expect(screen.queryByRole('button',{name:/Взнос 20%/})).toBeNull();
 fireEvent.change(screen.getByLabelText('Желаемый первоначальный взнос'),{target:{value:'200000'}});
 await waitFor(()=>expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({down_payment_minor:2000000,rule_payment_percent:30,total_minor:4914120,months:36})));
 fireEvent.click(screen.getByText('Оформить по выбранным условиям'));expect(onCreateDeal).toHaveBeenCalledWith(expect.objectContaining({down_payment_minor:2000000}));
 fireEvent.change(screen.getByLabelText('Срок калькулятора'),{target:{value:'24'}});await waitFor(()=>expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({months:24})));
});
it('does not fabricate discounts when loading fails',async()=>{
 api.get.mockRejectedValue(new Error('offline'));const onChange=vi.fn();render(<ApartmentPricingCalculator unit={unit} onChange={onChange} onCreateDeal={()=>{}}/>);expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить');expect(screen.getByText('Оформить по выбранным условиям')).toBeDisabled();expect(onChange).toHaveBeenLastCalledWith(null);
});
it('shows somoni equivalents for price, deposit, installment, balance and saving without changing the USD quote',async()=>{
 const rate=9.26;
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/finance/rates/eskhata'?{available:true,sellRate:rate,isStale:false,updatedAt:'2026-11-02T10:00:00Z'}:{schemes:[scheme]}}));
 const onChange=vi.fn();render(<ApartmentPricingCalculator unit={unit} onChange={onChange}/>);
 fireEvent.click(await screen.findByRole('button',{name:/Взнос 15%/}));
 await waitFor(()=>expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({total_minor:5151900,down_payment_minor:772785})));
 const quote=onChange.mock.calls.at(-1)[0];
 const tjs=minor=>'≈ '+(Math.round(minor*rate)/100).toLocaleString('ru-RU',{maximumFractionDigits:2})+' сомони';
 for(const minor of [quote.total_minor,quote.down_payment_minor,quote.monthly_minor])expect(await screen.findByText((_,node)=>node.tagName==='P'&&node.textContent===tjs(minor))).toBeTruthy();
 expect(screen.getByText((_,node)=>node.tagName==='P'&&node.textContent.startsWith('Остаток:')&&node.textContent.includes(tjs(quote.remaining_minor)))).toBeTruthy();
 expect(screen.getByText((_,node)=>node.tagName==='P'&&node.textContent.startsWith('Экономия:')&&node.textContent.includes(tjs(quote.discount_minor)))).toBeTruthy();
 expect(screen.getByText(/Курс продажи Банка Эсхата: 1 USD = 9,26/)).toBeTruthy();
});
it('marks a cached rate and does not fabricate somoni amounts when rates are unavailable',async()=>{
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/finance/rates/eskhata'?{available:false,sellRate:null}:{schemes:[scheme]}}));
 render(<ApartmentPricingCalculator unit={unit}/>);
 expect(await screen.findByText(/Курс временно недоступен/)).toBeTruthy();expect(screen.queryByText(/≈ .* сомони/)).toBeNull();
 cleanup();
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/finance/rates/eskhata'?{available:true,sellRate:9.26,isStale:true}:{schemes:[scheme]}}));
 render(<ApartmentPricingCalculator unit={unit}/>);expect(await screen.findByText(/Последний доступный курс/)).toBeTruthy();
});

it('accepts somoni, keeps the typed amount and transfers a USD quote through term and tier changes',async()=>{
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/finance/rates/eskhata'?{available:true,sellRate:9.26}:{schemes:[scheme]}}));
 const onChange=vi.fn();render(<ApartmentPricingCalculator unit={unit} onChange={onChange}/>);
 const input=await screen.findByLabelText('Желаемый первоначальный взнос');
 await waitFor(()=>expect(input).toBeEnabled());
 fireEvent.change(input,{target:{value:'185200.09'}});
 await waitFor(()=>expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({down_payment_minor:2000001,rule_payment_percent:30,selection:expect.objectContaining({mode:'amount',value:'20000.01'})})));
 expect(input).toHaveValue(185200.09);
 fireEvent.change(screen.getByLabelText('Срок калькулятора'),{target:{value:'24'}});
 expect(input).toHaveValue(185200.09);
 expect(onChange.mock.calls.at(-1)[0]).toMatchObject({months:24,down_payment_minor:2000001});
 fireEvent.click(screen.getByRole('button',{name:/Взнос 15%/}));
 expect(input).toHaveValue(Math.round(772785*9.26)/100);
 fireEvent.change(screen.getByLabelText('Желаемый первоначальный взнос в процентах'),{target:{value:'30'}});
 expect(input).toHaveValue(Math.round(1474236*9.26)/100);
});
it('disables somoni amount entry while the exchange rate is unavailable',async()=>{
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/finance/rates/eskhata'?{available:false}:{schemes:[scheme]}}));
 render(<ApartmentPricingCalculator unit={unit}/>);
 expect(await screen.findByLabelText('Желаемый первоначальный взнос')).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:/Взнос 15%/}));
 expect(screen.getByLabelText('Желаемый первоначальный взнос в процентах')).toHaveValue(15);
});
