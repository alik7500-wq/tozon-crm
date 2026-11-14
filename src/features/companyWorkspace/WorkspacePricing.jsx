import React,{useCallback,useMemo,useState} from 'react';
import {ApartmentPricingView} from '../pricing/ApartmentPricingView';

export default function WorkspacePricing({unit,complexId,currency,schemes,initialQuote,onChange,rateInput,onRateChange,canOffer=false,onOffer}){
 const [quote,setQuote]=useState(null);
 const changed=useCallback(value=>{setQuote(value);onChange?.(value);},[onChange]);
 const pricingUnit=useMemo(()=>({...unit,project_id:complexId}),[unit,complexId]);
 const rate=Number(String(rateInput).replace(',','.'));
 const validRate=Number.isFinite(rate)&&rate>0&&rate<=100000&&/^\d+(?:[.,]\d{1,6})?$/.test(rateInput);
 const exchange=useMemo(()=>({loading:false,rate:validRate?rate:null,stale:false,updatedAt:null,sourceLabel:'Справочный курс, введённый вручную',unavailableLabel:'Введите справочный курс для расчёта в сомони.'}),[validRate,rate]);
 return <div className="mt-6 space-y-4">
  {currency==='USD'&&<div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><label className="block max-w-sm text-sm font-semibold">Справочный курс USD → сомони<input aria-label="Справочный курс USD → сомони" inputMode="decimal" value={rateInput} onChange={e=>onRateChange(e.target.value)} placeholder="Введите курс" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"/></label><p className="mt-2 text-xs text-slate-500">Курс используется для предложения клиенту. При проведении оплаты курс указывается отдельно.</p>{rateInput&&!validRate&&<p role="alert" className="mt-2 text-sm text-rose-700">Укажите положительный курс до 100 000, не более 6 знаков после запятой.</p>}</div>}
  <ApartmentPricingView unit={pricingUnit} currency={currency} schemes={schemes} initialQuote={initialQuote} onChange={changed} exchange={exchange}/>
  {canOffer&&<button type="button" disabled={!quote||!onOffer} onClick={()=>onOffer({complex_id:complexId,unit_id:unit.id,expected_unit_price_minor:quote.unit_price_per_m2_minor,expected_area_x100:quote.area_m2_x100,expected_total_minor:quote.total_minor,scheme_id:quote.scheme_id,scheme_updated_at:quote.scheme_updated_at,rule_key:quote.rule_key,down_payment_minor:quote.down_payment_minor,installment_months:quote.months,reference_rate:currency==='USD'&&validRate?rate:null})} className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-40">Сформировать предложение</button>}
 </div>;
}
