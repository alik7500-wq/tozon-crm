import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { applicableSchemes, calculatePricing, tierPrice } from './pricingCalculator';
const number=v=>Number(v).toLocaleString('ru-RU',{maximumFractionDigits:2});
const money=minor=>number(minor/100);
const field='w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
export function ApartmentPricingCalculator({unit,currency='USD',initialQuote=null,onChange,onCreateDeal,onReserve,onEditBasePrice}) {
 const [schemes,setSchemes]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
 const [schemeId,setSchemeId]=useState(initialQuote?.scheme_id||'');
 const [selection,setSelection]=useState(initialQuote?.selection||{mode:'percent',value:'0',months:''});
 const [showTable,setShowTable]=useState(true);
 const [depositInput,setDepositInput]=useState(null);
 const [exchange,setExchange]=useState({loading:currency==='USD',rate:null,stale:false,updatedAt:null});
 useEffect(()=>{
  if(currency!=='USD')return;
  let active=true;
  api.get('/finance/rates/eskhata').then(response=>{
   if(!active)return;
   const data=response.data || response;
   const rate=Number(data.sellRate);
   setExchange({loading:false,rate:data.available!==false&&Number.isFinite(rate)&&rate>0?rate:null,stale:!!data.isStale,updatedAt:data.updatedAt||null});
  }).catch(()=>{if(active)setExchange({loading:false,rate:null,stale:false,updatedAt:null})});
  return()=>{active=false};
 },[currency]);
 const somoni=minor=>currency==='USD'&&exchange.rate!=null?`≈ ${money(Math.round(minor*exchange.rate))} сомони`:null;
 const rateDate=exchange.updatedAt&&Number.isFinite(Date.parse(exchange.updatedAt))?new Date(exchange.updatedAt).toLocaleString('ru-RU',{timeZone:'Asia/Dushanbe'}):null;
 useEffect(()=>{let alive=true;setLoading(true);setError('');api.get('/discount-schemes').then(r=>{if(alive)setSchemes(r.data?.schemes||[])}).catch(()=>{if(alive)setError('Не удалось загрузить схемы скидок. Повторите загрузку перед расчётом.')}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[unit.id,reload]);
 const available=useMemo(()=>applicableSchemes(schemes,unit),[schemes,unit]);
 const scheme=available.find(s=>s.id===schemeId)||available[0];
 const quote=useMemo(()=>loading||error?null:calculatePricing(unit,scheme,selection),[loading,error,unit,scheme,selection]);
 useEffect(()=>{onChange?.(quote&&!quote.error?quote:null)},[quote,onChange]);
 const chooseTier=rule=>{setDepositInput(null);setSelection({mode:'tier',value:String(rule.payment_percent),months:''})};
 const changeValue=(mode,value)=>{setDepositInput(null);setSelection({mode,value,months:''})};
 const changeDeposit=value=>{
  if(currency==='USD'&&exchange.rate==null)return;
  setDepositInput(value);
  const amount=Number(value);
  setSelection({mode:'amount',value:value===''?'':String(Math.round(amount*100/(currency==='USD'?exchange.rate:1))/100),months:''});
 };
 const depositValue=depositInput??(selection.mode==='amount'?(currency==='USD'?(exchange.rate!=null?Math.round(Number(selection.value)*100*exchange.rate)/100:''):selection.value):(quote&&!quote.error?(currency==='USD'?(exchange.rate!=null?Math.round(quote.down_payment_minor*exchange.rate)/100:''):quote.down_payment_minor/100):''));
 const tiers=(scheme?.rules||[]).map(r=>tierPrice(unit,r)).filter(Boolean).sort((a,b)=>a.rule.payment_percent-b.rule.payment_percent);
 const active=quote?.rule_payment_percent;
 const termOptions=[...new Set(tiers.map(t=>Number(t.rule.months)).filter(n=>n>0))].sort((a,b)=>a-b);
 const base=Math.round(Number(unit.area_m2_x100)*Number(unit.price_per_m2_minor)/100);
 return <section aria-label="Калькулятор условий оплаты" className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white p-4 sm:p-5 space-y-4">
  <div className="flex flex-wrap justify-between items-start gap-3"><div><h3 className="font-extrabold text-slate-900">Лестничные условия цен</h3><p className="text-xs text-slate-500 mt-1">Выберите ступень или введите сумму, которую клиент готов внести.</p></div><button type="button" onClick={onEditBasePrice} disabled={!onEditBasePrice} className="text-xs font-bold rounded-xl bg-white border border-slate-200 px-3 py-2 text-slate-600 disabled:cursor-default">Базовая цена: {number(Number(unit.price_per_m2_minor)/100)} {currency}/м²</button></div>
  {loading&&<p role="status" className="text-sm text-slate-500">Загрузка условий скидок…</p>}
  {error&&<div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error} <button type="button" className="font-bold underline" onClick={()=>setReload(n=>n+1)}>Повторить</button></div>}
  {!loading&&!error&&<>
   {available.length>0?<label className="block text-sm font-semibold text-slate-700">Схема скидок<select aria-label="Схема скидок" className={`${field} mt-1`} value={scheme?.id||''} onChange={e=>{setDepositInput(null);setSchemeId(e.target.value);setSelection({mode:'tier',value:String(available.find(s=>s.id===e.target.value)?.rules?.[0]?.payment_percent||0),months:''})}}>{available.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:<p className="text-sm text-slate-500">Для этого ЖК нет действующей схемы. Расчёт по базовой цене, без скидки.</p>}
   <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">{tiers.map(t=><button type="button" key={t.rule.payment_percent} aria-pressed={active===t.rule.payment_percent} onClick={()=>chooseTier(t.rule)} className={`rounded-xl border px-3 py-3 text-left transition ${active===t.rule.payment_percent?'bg-indigo-600 border-indigo-600 text-white shadow-md':'bg-white border-slate-200 text-slate-700 hover:border-indigo-400'}`}><strong className="block">Взнос {number(t.rule.payment_percent)}%</strong><span className="block text-xs mt-1">{number(t.price_per_m2)} {currency}/м²</span><span className="block text-xs mt-1">{t.rule.months?`${t.rule.months} мес.`:'Полная оплата'}</span></button>)}</div>
   {quote&&!quote.error&&<div aria-live="polite" className="grid sm:grid-cols-3 gap-3">
    <Summary label="Стоимость после скидки" value={`${money(quote.total_minor)} ${currency}`} secondary={somoni(quote.total_minor)} detail={`${number(quote.price_per_m2)} ${currency}/м²${somoni(Math.round(quote.price_per_m2*100)) ? ` · ${somoni(Math.round(quote.price_per_m2*100))}/м²` : ''}`} color="rose"/>
    <Summary label={`Первоначальный взнос (${number(quote.actual_percent)}%)`} value={`${money(quote.down_payment_minor)} ${currency}`} secondary={somoni(quote.down_payment_minor)} detail={`Остаток: ${money(quote.remaining_minor)} ${currency}${somoni(quote.remaining_minor)?` · ${somoni(quote.remaining_minor)}`:''}`} color="emerald"/>
    <Summary label={quote.months?`Ежемесячный платёж (${quote.months} мес.)`:'Полная оплата'} value={`${money(quote.monthly_minor)} ${currency}`} secondary={somoni(quote.monthly_minor)} detail={quote.discount_minor?`Экономия: ${money(quote.discount_minor)} ${currency}${somoni(quote.discount_minor)?` · ${somoni(quote.discount_minor)}`:''}`:'Без скидки'} color="indigo"/>
   </div>}
   {currency==='USD'&&<p role="status" className={`text-xs ${exchange.stale?'text-amber-700':'text-slate-500'}`}>
    {exchange.loading?'Загрузка курса для эквивалента в сомони…':exchange.rate!=null?`${exchange.stale?'Последний доступный курс':'Курс продажи Банка Эсхата'}: 1 USD = ${number(exchange.rate)} сомони${rateDate?` · ${rateDate}`:''}. Эквивалент показан справочно.`:'Курс временно недоступен — эквивалент в сомони не рассчитан.'}
   </p>}
   <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-4 items-start">
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
     <h4 className="text-sm font-bold text-slate-800">Первоначальный взнос по желанию</h4>
     <label className="block text-xs font-semibold text-slate-500">Сумма ({currency==='USD'?'сомони':currency})<input aria-label="Желаемый первоначальный взнос" type="number" min="0" step="0.01" disabled={currency==='USD'&&exchange.rate==null} className={`${field} mt-1 disabled:bg-slate-100 disabled:text-slate-400`} value={depositValue} onChange={e=>changeDeposit(e.target.value)}/></label>
     {currency==='USD'&&<p className="text-xs text-slate-500">{exchange.rate!=null?`Взнос в сомони пересчитывается в USD по ${exchange.stale?'последнему доступному курсу':'курсу'}: 1 USD = ${number(exchange.rate)} сомони.${selection.mode==='amount'?` Эквивалент введённой суммы: ${number(Number(selection.value))} USD.`:''}`:exchange.loading?'Ввод суммы будет доступен после загрузки курса.':'Для ввода суммы в сомони необходим курс. Обновите страницу или выберите взнос в процентах.'}</p>}
     <label className="block text-xs font-semibold text-slate-500">Доля от цены после скидки (%)<input aria-label="Желаемый первоначальный взнос в процентах" type="number" min="0" max="100" step="0.01" className={`${field} mt-1`} value={selection.mode==='percent'?selection.value:(quote&&!quote.error?Number(quote.actual_percent.toFixed(2)):'')} onChange={e=>changeValue('percent',e.target.value)}/></label>
     <label className="block text-xs font-semibold text-slate-500">Срок рассрочки (месяцев)<input aria-label="Срок калькулятора" type="number" min={quote?.payment_type==='FULL'?0:1} max={quote?.max_months||120} step="1" disabled={quote?.payment_type==='FULL'} className={`${field} mt-1`} value={selection.months!==''?selection.months:(quote&&!quote.error?quote.months:'')} onChange={e=>setSelection(s=>({...s,months:e.target.value}))}/></label>
     {termOptions.length>0&&<div className="flex gap-2 flex-wrap">{termOptions.map(n=><button type="button" key={n} disabled={quote?.payment_type==='FULL'||n>(quote?.max_months||120)} className="rounded-lg border border-indigo-200 px-3 py-1 text-xs text-indigo-700 disabled:opacity-40" onClick={()=>setSelection(s=>({...s,months:String(n)}))}>{n} мес.</button>)}</div>}
     <p className="text-xs text-slate-500">Ступень определяется по взносу от цены после скидки. Срок можно сократить в пределах выбранного условия.</p>
     {quote?.excess_minor>0&&<p className="text-xs text-amber-700">Полная оплата: {money(quote.total_minor)} {currency}. Из введённой суммы остаётся {money(quote.excess_minor)} {currency}.</p>}
     {quote?.error&&<p role="alert" className="text-sm text-rose-700">{quote.error}</p>}
    </div>
    <div className="min-w-0 space-y-2"><button type="button" aria-expanded={showTable} className="text-xs font-bold text-indigo-700" onClick={()=>setShowTable(v=>!v)}>{showTable?'Скрыть':'Показать'} сравнительную таблицу</button>
     {showTable&&<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Первоначальный взнос','Скидка','Стоимость','Срок','Ежемесячно'].map(h=><th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead><tbody>{tiers.map(t=>{const remaining=t.total_minor-t.minimum_minor;return <tr key={t.rule.payment_percent} className={active===t.rule.payment_percent?'bg-emerald-600 text-white':'border-t border-slate-100 hover:bg-indigo-50'}><td className="p-3"><button type="button" className="font-bold underline decoration-dotted underline-offset-4" onClick={()=>chooseTier(t.rule)}>{money(t.minimum_minor)} ({number(t.rule.payment_percent)}%)</button></td><td className="p-3">{money(t.discount_minor)} ({number(t.discount_minor/base*100)}%)</td><td className="p-3 font-bold">{money(t.total_minor)}</td><td className="p-3">{t.rule.months}</td><td className="p-3 font-semibold">{money(t.rule.months?Math.ceil(remaining/t.rule.months):0)}</td></tr>})}</tbody></table></div>}
    </div>
   </div>
  </>}
  {(onReserve||onCreateDeal)&&<div className="flex flex-wrap justify-between gap-3 border-t border-indigo-100 pt-4">{onReserve&&<button type="button" onClick={onReserve} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white">Забронировать</button>}{onCreateDeal&&<button type="button" disabled={!quote||!!quote.error} onClick={()=>onCreateDeal(quote)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">Оформить по выбранным условиям</button>}</div>}
 </section>;
}
function Summary({label,value,secondary,detail,color}) {
 const colors={rose:'from-white to-rose-100',emerald:'from-white to-emerald-100',indigo:'from-white to-indigo-100'};
 return <div className={`rounded-xl border border-slate-200 bg-gradient-to-br ${colors[color]} p-4`}><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-xl font-extrabold text-slate-900 mt-3">{value}</p>{secondary&&<p className="text-sm font-bold text-slate-700 mt-1">{secondary}</p>}<p className="text-xs text-slate-600 mt-1 leading-relaxed">{detail}</p></div>;
}
