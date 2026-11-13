import React,{useMemo} from 'react';
import {ApartmentPricingView} from '../pricing/ApartmentPricingView';

export default function WorkspacePricing({unit,complexId,currency,schemes,initialQuote,onChange,rateInput,onRateChange}){
 const pricingUnit=useMemo(()=>({...unit,project_id:complexId}),[unit,complexId]);
 const rate=Number(String(rateInput).replace(',','.'));
 const validRate=Number.isFinite(rate)&&rate>0&&rate<=100000&&/^\d+(?:[.,]\d{1,6})?$/.test(rateInput);
 const exchange=useMemo(()=>({loading:false,rate:validRate?rate:null,stale:false,updatedAt:null,sourceLabel:'Справочный курс, введённый вручную',unavailableLabel:'Введите справочный курс для расчёта в сомони.'}),[validRate,rate]);
 return <div className="mt-6 space-y-4">
  {currency==='USD'&&<div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><label className="block max-w-sm text-sm font-semibold">Справочный курс USD → сомони<input aria-label="Справочный курс USD → сомони" inputMode="decimal" value={rateInput} onChange={e=>onRateChange(e.target.value)} placeholder="Введите курс" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"/></label><p className="mt-2 text-xs text-slate-500">Курс используется для предложения клиенту. При проведении оплаты курс указывается отдельно.</p>{rateInput&&!validRate&&<p role="alert" className="mt-2 text-sm text-rose-700">Укажите положительный курс до 100 000, не более 6 знаков после запятой.</p>}</div>}
  <ApartmentPricingView unit={pricingUnit} currency={currency} schemes={schemes} initialQuote={initialQuote} onChange={onChange} exchange={exchange}/>
 </div>;
}
