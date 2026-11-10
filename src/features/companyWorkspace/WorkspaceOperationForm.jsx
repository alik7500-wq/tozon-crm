import React,{useEffect,useRef,useState} from 'react';
import { api } from '../../api/client';
import { discountRuleKey,tierPrice } from '../pricing/pricingCalculator';
import { initialOperation,loadOperationLookups,operationLabels,prepareOperation,signingPrice } from './workspaceOperations';
const control='mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2';
export default function WorkspaceOperationForm({project,kind,signerConfigured,signerName,onClose,onComplete}){
 const [form,setForm]=useState(initialOperation),[lookupResult,setLookupResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[reload,setReload]=useState(0);
 const lookupKey=JSON.stringify([project,kind,reload]);
 const lookups=lookupResult?.key===lookupKey?lookupResult.data:null;
 const loadError=lookupResult?.key===lookupKey?lookupResult.error:'';
 const lock=useRef(false),submitted=useRef(null),dialog=useRef(null);
 useEffect(()=>{const previous=document.activeElement;dialog.current?.querySelector('button')?.focus();return()=>previous?.focus?.();},[]);
 const change=patch=>setForm(current=>({...current,...patch}));
 useEffect(()=>{const [requestProject,requestKind]=JSON.parse(lookupKey);let active=true;const controller=new AbortController();loadOperationLookups(requestProject,requestKind,controller.signal).then(data=>{if(active)setLookupResult({key:lookupKey,data,error:''});}).catch(e=>{if(active)setLookupResult({key:lookupKey,data:null,error:e.message});});return()=>{active=false;controller.abort();};},[lookupKey]);
 useEffect(()=>{if(!busy&&!uncertain)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[busy,uncertain]);
 const quote=lookups&&kind==='SIGN_DEAL'?signingPrice(form,lookups):null;
 async function submit(event){
  event.preventDefault();if(lock.current)return;
  let command=submitted.current;
  try{command ||= prepareOperation(kind,form,lookups,crypto.randomUUID());}catch(e){setError(e.message);return;}
  submitted.current=command;lock.current=true;setBusy(true);setError('');
  try{
   const result=await api.post(`/project-workspace/${project}/commands`,command);
   if(!result.data?.id||!result.data?.resource)throw new Error('Сервер не подтвердил результат операции');
   submitted.current=null;setUncertain(false);onComplete(result.data);
  }catch(e){
   const ambiguous=!e.status||e.status>=500;setUncertain(ambiguous);if(!ambiguous)submitted.current=null;
   setError(ambiguous?'Ответ сервера не подтверждён. Повторите тот же запрос — повторного проведения не будет.':e.message);
  }finally{lock.current=false;setBusy(false);}
 }
 const field=(label,key,props={})=><label className="block text-sm font-semibold">{label}<input className={control} value={form[key]} onChange={e=>change({[key]:e.target.value})} {...props}/></label>;
 const select=(label,key,rows,extra={})=><label className="block text-sm font-semibold">{label}<select className={control} value={form[key]} onChange={e=>change({[key]:e.target.value})} {...extra}><option value="">Выберите…</option>{rows.map(row=><option key={row.id} value={row.id}>{row.name||`№${row.unit_number} · ${row.complex_name}`}</option>)}</select></label>;
 function chooseDraft(id){change({deal_id:id,scheme_id:'',rule_key:'',down:'0',down_currency:'USD',months:'12',first_payment_date:''});}
 function chooseScheme(id){const s=lookups.schemes.find(x=>x.id===id),rule=s?.rules?.[0],deal=lookups.deals.find(d=>String(d.id)===form.deal_id),price=deal?tierPrice(deal.unit,rule):null;change({scheme_id:id,rule_key:rule?discountRuleKey(rule):'',down:String((price?.minimum_minor||0)/100),down_currency:'USD',months:String(rule?.months??12)});}
 function chooseOffer(key){const s=lookups.schemes.find(x=>x.id===form.scheme_id),rule=s?.rules?.find(r=>discountRuleKey(r)===key),d=lookups.deals.find(d=>String(d.id)===form.deal_id),price=d?tierPrice(d.unit,rule):null;change({rule_key:key,down:String((price?.minimum_minor||0)/100),down_currency:'USD',months:String(rule?.months??12)});}
 return <div ref={dialog} onKeyDown={e=>{if(e.key==='Escape'&&!busy&&!uncertain){e.stopPropagation();onClose();}}} role="dialog" aria-modal="true" aria-labelledby="workspace-operation-title" className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-3"><div className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
  <header className="flex items-center justify-between border-b p-5"><h2 id="workspace-operation-title" className="text-xl font-bold">{operationLabels[kind]}</h2><button type="button" aria-label="Закрыть операцию" disabled={busy||uncertain} onClick={onClose} className="rounded-lg border px-3 py-2 disabled:opacity-40">✕</button></header>
  {!lookups?<div className="p-6">{loadError?<div><p role="alert">{loadError}</p><button type="button" className="mt-3 font-bold text-blue-600" onClick={()=>setReload(n=>n+1)}>Повторить загрузку</button></div>:<p role="status">Загрузка справочников проекта…</p>}</div>:<form onSubmit={submit} className="overflow-y-auto p-5 space-y-5">
   <p className="text-sm text-slate-500">Все списки относятся к выбранному проекту. Проверьте данные перед подтверждением.</p>
   <fieldset disabled={busy||uncertain} className="space-y-4 disabled:opacity-60">
    {kind!=='SIGN_DEAL'&&field('Дата документа','date',{type:'date',required:true})}
    {kind==='DEAL_DRAFT'&&<>{select('Квартира / помещение','unit_id',lookups.units,{required:true,onChange:e=>{const u=lookups.units.find(x=>String(x.id)===e.target.value);change({unit_id:e.target.value,final_price:String(((u?.unit_kind!=='APARTMENT'?u?.manual_total_price_minor:null)??tierPrice(u,null)?.total_minor??0)/100)});}})}{select('Клиент','lead_id',lookups.leads,{required:true})}{field('Предварительная стоимость, USD','final_price',{type:'number',min:'0.01',step:'0.01',required:true})}<p className="text-xs text-slate-500">Черновик закрепляет помещение. Цена и график будут проверены при подписании.</p></>}
    {kind==='SIGN_DEAL'&&<>
     {select('Черновик договора','deal_id',lookups.deals.filter(d=>d.status==='DRAFT'),{required:true,onChange:e=>chooseDraft(e.target.value)})}
     {!signerConfigured?<p role="alert" className="text-rose-700">Администратор должен заполнить директора объекта и основание полномочий.</p>:<p className="text-sm text-slate-600">От ООО «ТОЗОН»: {signerName}</p>}
     {form.deal_id&&<>{select('Схема условий','scheme_id',lookups.schemes.filter(s=>Number(s.project_id)===Number(lookups.deals.find(d=>String(d.id)===form.deal_id)?.unit.project_id)),{onChange:e=>chooseScheme(e.target.value)})}<p className="text-xs text-slate-500">Без выбранной схемы применяется базовая цена помещения.</p>
      {form.scheme_id&&<label className="block text-sm font-semibold">Оффер<select className={control} value={form.rule_key} onChange={e=>chooseOffer(e.target.value)}>{lookups.schemes.find(s=>s.id===form.scheme_id)?.rules.map(r=><option key={discountRuleKey(r)} value={discountRuleKey(r)}>Взнос {r.payment_percent}% · {r.price_per_m2!=null?`${r.price_per_m2} USD/м²`:`скидка ${r.discount_percent}%`} · {r.months?`${r.months} мес.`:'Полная оплата'}</option>)}</select></label>}
      {quote&&<div className="rounded-xl bg-blue-50 p-4 text-sm"><strong>Стоимость: {(quote.total_minor/100).toLocaleString('ru-RU')} USD</strong><p>Минимальный взнос: {(quote.minimum_minor/100).toLocaleString('ru-RU')} USD</p></div>}
      <label className="block text-sm font-semibold">Валюта ввода взноса<select className={control} value={form.down_currency} onChange={e=>change({down_currency:e.target.value,down:''})}><option value="USD">USD</option><option value="TJS">Сомони</option></select></label>
      {field(`Первоначальный взнос (${form.down_currency==='TJS'?'сомони':'USD'})`,'down',{type:'number',min:'0',step:'0.01',required:true})}
      {form.down_currency==='TJS'&&field('Курс для пересчёта взноса: сомони за 1 USD','down_rate',{type:'number',min:'0.000001',step:'0.000001',required:true})}
      {field('Срок рассрочки, месяцев (0 при полной оплате)','months',{type:'number',min:'0',max:quote?.maxMonths??120,step:'1',required:true})}
      {field('Дата первого платежа (можно оставить пустой)','first_payment_date',{type:'date',min:lookups.deals.find(d=>String(d.id)===form.deal_id)?.deal_date})}
      <p className="text-xs text-slate-500">Взнос — план по договору. Фактическое поступление оформляется отдельно через «Принять оплату». При взносе 0 график по умолчанию начинается с даты договора.</p>
     </>}
    </>}
    {['PAYMENT','EXPENSE'].includes(kind)&&<>
     {kind==='PAYMENT'&&select('Подписанный договор','deal_id',lookups.deals.filter(d=>d.status==='SIGNED'),{required:true})}
     {select('Касса','cash_desk_id',lookups.cash_desks,{required:true})}
     <label className="block text-sm font-semibold">Валюта операции<select className={control} value={form.currency} onChange={e=>change({currency:e.target.value})}><option value="USD">USD</option><option value="TJS">Сомони</option></select></label>
     {field('Сумма','amount',{type:'number',min:'0.01',step:'0.01',required:true})}
     {form.currency==='TJS'&&field('Исторический курс: сомони за 1 USD','exchange_rate',{type:'number',min:'0.000001',step:'0.000001',required:true})}
     {kind==='PAYMENT'?field('Комментарий','comment',{maxLength:1000}):<>{field('Статья расхода','category',{required:true,maxLength:200})}{field('Получатель','recipient',{maxLength:200})}{field('Назначение расхода','description',{maxLength:1000})}{select('Погасить задолженность контрагенту (необязательно)','settlement_party_id',lookups.parties)}{form.settlement_party_id&&<label className="block text-sm font-semibold">Вид расчёта<select className={control} value={form.settlement_account} onChange={e=>change({settlement_account:e.target.value})}><option value="PAYABLE">Погашение нашей задолженности</option><option value="ADVANCE_GIVEN">Аванс поставщику</option><option value="RECEIVABLE">Расчёт по дебиторской задолженности</option><option value="ADVANCE_RECEIVED">Возврат полученного аванса</option></select></label>}</>}
    </>}
    {kind==='STOCK_POST'&&<>
     <label className="block text-sm font-semibold">Вид документа<select className={control} value={form.kind} onChange={e=>change({kind:e.target.value})}>{Object.entries({RECEIPT:'Поступление',ISSUE:'Выдача на объект',TRANSFER:'Перемещение между своими складами',RETURN_STOCK:'Возврат на склад',WRITE_OFF:'Списание'}).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
     {select('Склад','warehouse_id',lookups.warehouses,{required:true})}
     {form.kind==='TRANSFER'&&select('Склад назначения','destination_id',lookups.warehouses.filter(w=>String(w.id)!==form.warehouse_id),{required:true})}
     {form.kind==='RECEIPT'&&select('Поставщик','party_id',lookups.parties,{required:true})}
     {['ISSUE','WRITE_OFF'].includes(form.kind)&&<>{select('Жилой комплекс','complex_id',lookups.complexes,{required:true})}{field('Вид работ','work_type',{required:true,maxLength:500})}</>}
     <label className="block text-sm font-semibold">Валюта стоимости<select className={control} value={form.currency} onChange={e=>change({currency:e.target.value})}><option value="USD">USD</option><option value="TJS">Сомони</option></select></label>
     {field('Основание','basis',{required:true,maxLength:3000})}
     {form.lines.map((row,i)=><div key={i} className="rounded-xl border p-3 space-y-2"><label className="block text-sm">Материал {i+1}<select aria-label={`Материал ${i+1}`} className={control} required value={row.material_id} onChange={e=>change({lines:form.lines.map((x,j)=>i===j?{...x,material_id:e.target.value}:x)})}><option value="">Выберите…</option>{lookups.materials.map(m=><option key={m.id} value={m.id}>{m.name} · {m.unit}</option>)}</select></label><label className="block text-sm">Количество<input aria-label={`Количество ${i+1}`} className={control} type="number" min="0.0001" step="0.0001" required value={row.quantity} onChange={e=>change({lines:form.lines.map((x,j)=>i===j?{...x,quantity:e.target.value}:x)})}/></label>{['RECEIPT','RETURN_STOCK'].includes(form.kind)&&<label className="block text-sm">Общая стоимость строки, {form.currency}<input aria-label={`Стоимость строки ${i+1}`} className={control} type="number" min="0" step="0.01" required value={row.value} onChange={e=>change({lines:form.lines.map((x,j)=>i===j?{...x,value:e.target.value}:x)})}/></label>}{form.lines.length>1&&<button type="button" className="text-sm text-rose-600" onClick={()=>change({lines:form.lines.filter((_,j)=>i!==j)})}>Убрать строку</button>}</div>)}
     <button type="button" disabled={form.lines.length>=200} className="text-sm font-bold text-blue-600" onClick={()=>change({lines:[...form.lines,{material_id:'',quantity:'',value:''}]})}>+ Добавить материал</button>
    </>}
   </fieldset>
   {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
   <div className="flex flex-wrap justify-between gap-3 border-t pt-4"><button type="button" disabled={busy||uncertain} className="text-sm text-blue-600" onClick={()=>setReload(n=>n+1)}>Обновить списки</button><button type="submit" disabled={busy||(kind==='SIGN_DEAL'&&!signerConfigured)} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-40">{busy?'Сохранение…':uncertain?'Повторить тот же запрос':kind==='SIGN_DEAL'?'Подписать и создать график':'Подтвердить операцию'}</button></div>
  </form>}
 </div></div>;
}
