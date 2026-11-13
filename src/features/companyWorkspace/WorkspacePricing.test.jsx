import React from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,within,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WorkspacePricing from './WorkspacePricing';
import {api} from '../../api/client';
vi.mock('../../api/client',()=>({api:{get:vi.fn(),post:vi.fn()}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const unit={id:1,unit_kind:'APARTMENT',area_m2_x100:6000,price_per_m2_minor:70000};
const rules=[{payment_percent:0,price_per_m2:700,months:40},{payment_percent:0,price_per_m2:640,months:36},{payment_percent:30,price_per_m2:600,months:36},{payment_percent:100,price_per_m2:550,months:0}];
const scheme={id:'own',project_id:3,name:'Своя схема',is_active:true,updated_at:'v1',rules};
const props={unit,complexId:3,currency:'USD',schemes:[scheme],rateInput:'10',onRateChange:vi.fn()};
it('groups terms, keeps same-percent offers distinct and makes no legacy calls or writes',()=>{
 const change=vi.fn();render(<WorkspacePricing {...props} onChange={change}/>);
 const zero=screen.getAllByRole('button',{name:/Взнос 0%/});expect(zero[0]).toHaveTextContent('36 мес.');expect(zero[1]).toHaveTextContent('40 мес.');
 fireEvent.click(zero[1]);expect(change).toHaveBeenLastCalledWith(expect.objectContaining({months:40,total_minor:4200000,monthly_minor:105000}));
 const full=screen.getByRole('button',{name:/Взнос 100%/});expect(full.style.gridRow).toBe('1 / span 2');
 const rows=within(screen.getByRole('table')).getAllByRole('row').slice(1);expect(rows.map(r=>within(r).getAllByRole('cell')[3].textContent)).toEqual(['36','36','40','0']);
 expect(api.get).not.toHaveBeenCalled();expect(api.post).not.toHaveBeenCalled();
});
it('recalculates typed somoni using the manual rate and does not invent a bank rate',()=>{
 const change=vi.fn();const r=render(<WorkspacePricing {...props} onChange={change}/>);fireEvent.click(screen.getAllByRole('button',{name:/Взнос 0%/})[1]);
 fireEvent.change(screen.getByLabelText('Желаемый первоначальный взнос'),{target:{value:'10500'}});
 expect(change).toHaveBeenLastCalledWith(expect.objectContaining({down_payment_minor:105000,months:40,monthly_minor:102375}));
 r.rerender(<WorkspacePricing {...props} rateInput="12" onChange={change}/>);expect(screen.getByLabelText('Желаемый первоначальный взнос')).toHaveValue(10500);
 expect(change).toHaveBeenLastCalledWith(expect.objectContaining({down_payment_minor:87500,monthly_minor:102813}));expect(screen.getByText(/Справочный курс, введённый вручную: 1 USD = 12/)).toBeVisible();
 r.rerender(<WorkspacePricing {...props} rateInput="" onChange={change}/>);expect(screen.getByLabelText('Желаемый первоначальный взнос')).toBeDisabled();expect(change).toHaveBeenLastCalledWith(null);
});
it('updates added/removed scheme rules in cards and comparison and excludes another complex',()=>{
 const r=render(<WorkspacePricing {...props}/>);const next={...scheme,updated_at:'v2',rules:[rules[0],{payment_percent:20,price_per_m2:610,months:36},rules[3]]};
 r.rerender(<WorkspacePricing {...props} schemes={[next,{...scheme,id:'foreign',project_id:4,name:'Чужая схема'}]}/>);
 expect(screen.getByRole('button',{name:/Взнос 20%/})).toBeVisible();expect(screen.queryByRole('button',{name:/Взнос 30%/})).not.toBeInTheDocument();expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(4);expect(screen.queryByRole('option',{name:'Чужая схема'})).not.toBeInTheDocument();
});
