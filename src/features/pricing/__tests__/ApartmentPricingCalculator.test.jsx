import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,within} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {ApartmentPricingCalculator} from '../ApartmentPricingCalculator';
import {api} from '../../../api/client';
import {DiscountSchemesTab} from '../../settings/DiscountSchemesTab';
import {DISCOUNT_SCHEMES_STORAGE_KEY} from '../../settings/discountSchemeUpdates';
vi.mock('../../../api/client',()=>({api:{get:vi.fn(),put:vi.fn()}}));
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

it('synchronizes added and removed settings conditions with cards, comparison rows and the selected quote',async()=>{
 let saved=scheme;
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/finance/rates/eskhata'?{available:true,sellRate:10}:{schemes:[saved]}}));
 api.put.mockImplementation((path,form)=>{saved={...form,updated_at:'v2'};return Promise.resolve({data:{scheme:saved}})});
 const onChange=vi.fn();
 render(<><div data-testid="settings"><DiscountSchemesTab projects={[{id:3,name:'Плаза'}]}/></div><ApartmentPricingCalculator unit={unit} onChange={onChange}/></>);
 fireEvent.click(await screen.findByRole('button',{name:/Взнос 15%/}));
 const settings=within(screen.getByTestId('settings'));
 fireEvent.click(await settings.findByText('Настроенная схема'));
 fireEvent.click(settings.getByLabelText('Удалить условие 2'));
 fireEvent.click(settings.getByText('+ Добавить условие'));
 for(const [label,value] of [['Взнос (%) 4','25'],['Скидка (%) 4','0'],['Цена со скидкой за м² 4','630'],['Срок (месяцев) 4','24']])fireEvent.change(settings.getByLabelText(label),{target:{value}});
 fireEvent.click(settings.getByText('Сохранить'));
 expect(await screen.findByRole('button',{name:/Взнос 25%/})).toHaveTextContent('630 USD/м²');
 expect(screen.queryByRole('button',{name:/Взнос 15%/})).toBeNull();
 const rows=within(screen.getByRole('table')).getAllByRole('row');
 expect(rows).toHaveLength(saved.rules.length+1);
 expect(rows.some(row=>row.textContent.includes('(15%)'))).toBe(false);
 expect(rows.some(row=>row.textContent.includes('(25%)')&&row.textContent.includes('24'))).toBe(true);
 await waitFor(()=>expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({rule_payment_percent:0,scheme_updated_at:'v2'})));
 fireEvent.click(screen.getByRole('button',{name:/Взнос 25%/}));
 expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({rule_payment_percent:'25',total_minor:4993380,months:24}));
});

it('refreshes settings from another tab and falls back when the selected scheme is deleted',async()=>{
 let saved=[scheme];
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/finance/rates/eskhata'?{available:true,sellRate:10}:{schemes:saved}}));
 const onChange=vi.fn();render(<ApartmentPricingCalculator unit={unit} onChange={onChange}/>);
 fireEvent.click(await screen.findByRole('button',{name:/Взнос 30%/}));
 saved=[{...scheme,id:'new',name:'Другая схема'},scheme];
 fireEvent.focus(window);
 await screen.findByRole('option',{name:'Другая схема'});
 expect(screen.getByLabelText('Схема скидок')).toHaveValue('one');
 expect(screen.getByRole('button',{name:/Взнос 30%/})).toHaveAttribute('aria-pressed','true');
 saved=[{...scheme,updated_at:'v2',rules:[{payment_percent:20,discount_percent:0,price_per_m2:610,months:24}]}];
 fireEvent(window,new StorageEvent('storage',{key:DISCOUNT_SCHEMES_STORAGE_KEY,newValue:'v2'}));
 expect(await screen.findByRole('button',{name:/Взнос 20%/})).toHaveAttribute('aria-pressed','true');
 expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
 expect(screen.queryByRole('button',{name:/Взнос 30%/})).toBeNull();
 saved=[];
 fireEvent.focus(window);
 expect(await screen.findByText(/нет действующей схемы/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Взнос 20%/})).toBeNull();
 expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(1);
 expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({scheme_id:null,total_minor:5548200}));
});

it('selects duplicate deposit offers independently in cards and comparison rows',async()=>{
 const offers=[{payment_percent:0,discount_percent:0,price_per_m2:700,months:40},{payment_percent:0,discount_percent:8.57,price_per_m2:640,months:36}];
 api.get.mockImplementation(path=>Promise.resolve({data:path==='/finance/rates/eskhata'?{available:true,sellRate:10}:{schemes:[{...scheme,rules:offers}]}}));
 const onChange=vi.fn();render(<ApartmentPricingCalculator unit={unit} onChange={onChange}/>);
 const cards=await screen.findAllByRole('button',{name:/Взнос 0%/});
 expect(cards).toHaveLength(2);
 fireEvent.click(cards[0]);
 expect(cards[0]).toHaveAttribute('aria-pressed','true');expect(cards[1]).toHaveAttribute('aria-pressed','false');
 expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({price_per_m2:640,months:36,down_payment_minor:0}));
 const rows=within(screen.getByRole('table')).getAllByRole('row');expect(rows).toHaveLength(3);
 fireEvent.click(within(rows[1]).getByRole('button'));
 expect(cards[0]).toHaveAttribute('aria-pressed','false');expect(cards[1]).toHaveAttribute('aria-pressed','true');
 expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({price_per_m2:700,months:40}));
});
