import {it,expect} from 'vitest';
import {applicableSchemes,calculatePricing,verifyPricingQuote} from '../pricingCalculator';
const unit={id:55,project_id:3,unit_kind:'APARTMENT',area_m2_x100:7926,price_per_m2_minor:70000};
const scheme={id:'scheme',updated_at:'v1',project_id:3,is_active:true,rules:[{payment_percent:0,discount_percent:0,price_per_m2:700,months:36},{payment_percent:5,discount_percent:2.86,price_per_m2:680,months:36},{payment_percent:15,discount_percent:11.43,price_per_m2:650,months:36},{payment_percent:30,discount_percent:14.23,price_per_m2:620,months:36},{payment_percent:50,discount_percent:17.14,price_per_m2:580,months:36},{payment_percent:100,discount_percent:21.43,price_per_m2:550,months:0}]};
it('uses configured prices rather than stacking percentages or a hardcoded dollar ladder',()=>{
 const r=calculatePricing(unit,scheme,{mode:'tier',value:15,months:''});expect(r.total_minor).toBe(5151900);expect(r.price_per_m2).toBe(650);expect(r.down_payment_minor).toBe(772785);expect(r.months).toBe(36);
});
it('chooses the qualifying tier against its discounted final price and keeps the exact typed amount',()=>{
 const r=calculatePricing(unit,scheme,{mode:'amount',value:'20000',months:''});expect(r.rule_payment_percent).toBe(30);expect(r.total_minor).toBe(4914120);expect(r.down_payment_minor).toBe(2000000);expect(r.remaining_minor).toBe(2914120);expect(r.monthly_minor).toBe(Math.ceil(2914120/36));
 const below=calculatePricing(unit,scheme,{mode:'amount',value:'2694.83',months:''});expect(below.rule_payment_percent).toBe(0);
 const exact=calculatePricing(unit,scheme,{mode:'amount',value:'2694.84',months:''});expect(exact.rule_payment_percent).toBe(5);
});
it('supports percent input, a shorter term, and full payment without a residual balance',()=>{
 const r=calculatePricing(unit,scheme,{mode:'percent',value:'40',months:'24'});expect(r.rule_payment_percent).toBe(30);expect(r.down_payment_minor).toBe(Math.round(r.total_minor*.4));expect(r.months).toBe(24);
 expect(calculatePricing(unit,scheme,{mode:'percent',value:30,months:48}).error).toContain('36');
 const full=calculatePricing(unit,scheme,{mode:'amount',value:50000,months:''});expect(full.payment_type).toBe('FULL');expect(full.total_minor).toBe(4359300);expect(full.down_payment_minor).toBe(full.total_minor);expect(full.months).toBe(0);expect(full.remaining_minor).toBe(0);expect(full.excess_minor).toBe(640700);
});
it('filters schemes by project/date/kind and refuses stale quotes or changed inventory prices',()=>{
 expect(applicableSchemes([scheme,{...scheme,id:'wrong',project_id:4},{...scheme,id:'expired',ends_on:'2026-01-01'}],unit,'2026-11-02').map(x=>x.id)).toEqual(['scheme']);expect(applicableSchemes([scheme],{...unit,unit_kind:'PARKING'})).toEqual([]);
 const quote=calculatePricing(unit,scheme,{mode:'amount',value:20000,months:''});expect(verifyPricingQuote(unit,[scheme],quote).down_payment_minor).toBe(2000000);
 expect(()=>verifyPricingQuote(unit,[{...scheme,updated_at:'v2'}],quote)).toThrow('изменилась');expect(()=>verifyPricingQuote({...unit,price_per_m2_minor:71000},[scheme],quote)).toThrow('Базовая цена');
});
