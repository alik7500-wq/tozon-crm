import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Building2,LayoutGrid,List,X,RefreshCw} from 'lucide-react';
import useWorkspaceRead from './useWorkspaceRead';
import WorkspacePricing from './WorkspacePricing';
import useInventoryDraft from './useInventoryDraft';

const statuses={
 AVAILABLE:{label:'Свободна',style:'border-emerald-300 bg-emerald-50 text-emerald-900'},
 RESERVED:{label:'Бронь',style:'border-amber-300 bg-amber-50 text-amber-900'},
 SOLD:{label:'Продана',style:'border-rose-300 bg-rose-50 text-rose-900'},
 BLOCKED:{label:'Недоступна',style:'border-slate-300 bg-slate-100 text-slate-700'},
};
const kinds={APARTMENT:'Квартира',PARKING:'Машино-место',COMMERCIAL:'Коммерческое помещение'};
const number=value=>value==null?'—':Number(value).toLocaleString('ru-RU',{maximumFractionDigits:2});
const measure=value=>value==null?'—':number(value/100);
const unitLabel=u=>`${kinds[u.unit_kind]||'Помещение'} №${u.unit_number}`;
const status=u=>statuses[u.status]||{label:u.status||'Не указан',style:'border-slate-300 bg-slate-50 text-slate-700'};
const control='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900';
const emptyRecords=[];

function groupFloors(rows){
 const groups=new Map();
 for(const u of rows){
  const key=`${u.building_id}:${u.section_id}`;
  if(!groups.has(key))groups.set(key,{id:key,building:u.building_name||`Блок ${u.building_id}`,section:u.section_name||`Подъезд ${u.section_id}`,floors:new Map()});
  const floors=groups.get(key).floors;
  if(!floors.has(u.floor_id))floors.set(u.floor_id,{id:u.floor_id,number:u.floor_number,units:[]});
  floors.get(u.floor_id).units.push(u);
 }
 return Array.from(groups.values(),g=>({...g,floors:Array.from(g.floors.values()).sort((a,b)=>b.number-a.number||a.id-b.id)}));
}

export default function WorkspaceInventory({project,version,draft,onDraftChange}){
 const [{complexId,view,filters,selectedId,pricingQuote,rateInput},updateDraft]=useInventoryDraft(project,draft,onDraftChange);
 const [reload,setReload]=useState(0);
 const setComplexId=value=>updateDraft({complexId:value}),setView=value=>updateDraft({view:value});
 const setSelectedId=value=>updateDraft({selectedId:value}),setPricingQuote=value=>updateDraft({pricingQuote:value});
 const setRateInput=value=>updateDraft({rateInput:value});
 const setFilters=value=>updateDraft(current=>({filters:typeof value==='function'?value(current.filters):value}));
 const rememberQuote=useCallback(quote=>{if(quote)updateDraft({pricingQuote:quote});},[updateDraft]);
 const {data,loading,error,errorStatus}=useWorkspaceRead(`/project-workspace/${project}/inventory`,complexId?{complex_id:complexId}:{},`${version}:${reload}`);
 useEffect(()=>{if([401,403].includes(errorStatus))updateDraft({selectedId:null,pricingQuote:null,rateInput:''});},[errorStatus,updateDraft]);
 const details=useRef(null),trigger=useRef(null);
 useEffect(()=>{if(selectedId!=null)details.current?.focus();},[selectedId]);
 const records=data?.records||emptyRecords;
 const rows=useMemo(()=>records.filter(u=>(!filters.status||u.status===filters.status)&&(!filters.kind||u.unit_kind===filters.kind)
  &&(filters.rooms===''||(u.unit_kind==='APARTMENT'&&String(u.rooms)===filters.rooms))
  &&(!filters.search.trim()||[u.unit_number,u.building_name,u.section_name].some(v=>String(v??'').toLocaleLowerCase('ru-RU').includes(filters.search.trim().toLocaleLowerCase('ru-RU'))))),[records,filters]);
 const groups=useMemo(()=>groupFloors(rows),[rows]);
 const complex=data?.complexes?.find(c=>c.id===data.selected_complex_id),currency=complex?.currency;
 const selected=records.find(u=>u.id===selectedId);
 const roomOptions=Array.from(new Set(records.filter(u=>u.unit_kind==='APARTMENT'&&u.rooms!=null).map(u=>u.rooms))).sort((a,b)=>a-b);
 const change=(key,value)=>setFilters(f=>({...f,[key]:value}));
 return <section aria-label="Шахматка проекта" className="space-y-5">
  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
   <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold"><Building2 size={21}/>Шахматка помещений</h2><div className="flex gap-2">
    <button type="button" aria-pressed={view==='board'} onClick={()=>setView('board')} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${view==='board'?'border-blue-600 bg-blue-50 text-blue-700':'border-slate-200'}`}><LayoutGrid size={16}/>Шахматка</button>
    <button type="button" aria-pressed={view==='list'} onClick={()=>setView('list')} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${view==='list'?'border-blue-600 bg-blue-50 text-blue-700':'border-slate-200'}`}><List size={16}/>Список</button>
    <button type="button" aria-label="Обновить шахматку" disabled={loading} onClick={()=>setReload(n=>n+1)} className="rounded-xl border border-slate-200 p-2 text-blue-600 disabled:opacity-40"><RefreshCw size={18}/></button>
   </div></div>
   {data&&<label className="block text-sm font-semibold">Жилой комплекс<select className={control} value={data.selected_complex_id??''} onChange={e=>{setComplexId(e.target.value);setSelectedId(null);setFilters({status:'',kind:'',rooms:'',search:''});}}>{!data.complexes.length&&<option value="">Нет закреплённых ЖК</option>}{data.complexes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <label className="text-sm text-slate-500">Статус<select className={control} value={filters.status} onChange={e=>change('status',e.target.value)}><option value="">Все статусы</option>{Object.entries(statuses).map(([key,s])=><option key={key} value={key}>{s.label}</option>)}</select></label>
    <label className="text-sm text-slate-500">Тип помещения<select className={control} value={filters.kind} onChange={e=>change('kind',e.target.value)}><option value="">Все помещения</option>{Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <label className="text-sm text-slate-500">Комнаты<select className={control} value={filters.rooms} onChange={e=>change('rooms',e.target.value)}><option value="">Все комнаты</option>{roomOptions.map(n=><option key={n} value={n}>{n===0?'Студия':`${n}-комнатная`}</option>)}</select></label>
    <label className="text-sm text-slate-500">Поиск помещения<input type="search" className={control} value={filters.search} onChange={e=>change('search',e.target.value)} placeholder="Номер, блок или подъезд"/></label>
   </div>
   {data&&<div className="flex flex-wrap gap-2 text-xs" aria-label="Статусы помещений">{Object.entries(statuses).map(([key,s])=><span key={key} className={`rounded-lg border px-3 py-2 ${s.style}`}>{s.label}: {records.filter(u=>u.status===key).length}</span>)}<span className="px-2 py-2 text-slate-500">Показано {rows.length} из {records.length} помещений ЖК</span></div>}
  </div>
  {loading?<p role="status" className="rounded-2xl border bg-white p-6">Загрузка шахматки выбранного проекта…</p>:error?<div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">{error}<button type="button" onClick={()=>setReload(n=>n+1)} className="ml-3 font-bold underline">Повторить</button></div>:!rows.length?<p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">{records.length?'Помещения по выбранным фильтрам не найдены.':'В выбранном ЖК нет действующих помещений.'}</p>:view==='list'?<div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead><tr>{['Помещение','Блок / подъезд','Этаж','Площадь, м²','Статус'].map(h=><th key={h} className="border-b bg-slate-50 p-4 text-slate-500">{h}</th>)}</tr></thead><tbody>{rows.map(u=><tr key={u.id}><td className="border-b p-4"><button type="button" onClick={e=>{trigger.current=e.currentTarget;if(selectedId!==u.id)setPricingQuote(null);setSelectedId(u.id);}} className="font-bold text-blue-700">{unitLabel(u)}</button></td><td className="border-b p-4">{u.building_name} · {u.section_name}</td><td className="border-b p-4">{u.floor_number}</td><td className="border-b p-4">{measure(u.area_m2_x100)}</td><td className="border-b p-4">{status(u).label}</td></tr>)}</tbody></table></div>:<div className="space-y-5">{groups.map(g=><section key={g.id} aria-label={`${g.building} · ${g.section}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h3 className="border-b bg-slate-50 px-5 py-4 font-bold">{g.building} · {g.section}</h3><div className="overflow-x-auto p-3 sm:p-5"><div className="min-w-[320px] space-y-3">{g.floors.map(f=><div key={f.id} className="flex gap-3"><div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-50 text-sm font-bold"><span>{f.number}</span><span className="text-xs font-normal text-slate-400">этаж</span></div><div className="flex flex-1 flex-wrap gap-2">{f.units.map(u=><button key={u.id} type="button" aria-label={`${unitLabel(u)}, ${f.number} этаж, ${status(u).label}`} aria-pressed={selectedId===u.id} onClick={e=>{trigger.current=e.currentTarget;if(selectedId!==u.id)setPricingQuote(null);setSelectedId(u.id);}} className={`min-w-24 flex-1 basis-24 rounded-xl border p-3 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600 sm:max-w-40 ${status(u).style} ${selectedId===u.id?'ring-2 ring-blue-600':''}`}><span className="block font-extrabold">№{u.unit_number}</span><span className="mt-1 block text-xs">{measure(u.area_m2_x100)} м²</span><span className="mt-1 block text-xs">{u.unit_kind==='APARTMENT'&&u.rooms!=null?(u.rooms===0?'Студия':`${u.rooms} комн.`):kinds[u.unit_kind]||'Помещение'}</span><span className="mt-2 block text-xs font-semibold">{status(u).label}</span></button>)}</div></div>)}</div></div></section>)}</div>}
  {selected&&!loading&&!error&&<section ref={details} tabIndex={-1} aria-label="Карточка помещения" className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-extrabold">{unitLabel(selected)}</h3><button type="button" aria-label="Закрыть карточку помещения" onClick={()=>{setSelectedId(null);trigger.current?.focus();}} className="rounded-xl border p-2"><X size={18}/></button></div><p className="mt-2 text-sm text-slate-500">{complex?.name} · {selected.building_name} · {selected.section_name} · {selected.floor_number} этаж</p><dl className="mt-5 grid gap-5 sm:grid-cols-3"><div><dt className="text-sm text-slate-500">Статус</dt><dd className="mt-1 font-bold">{status(selected).label}</dd></div><div><dt className="text-sm text-slate-500">Площадь</dt><dd className="mt-1 font-bold">{measure(selected.area_m2_x100)} м²</dd></div><div><dt className="text-sm text-slate-500">Базовая цена за м²</dt><dd className="mt-1 font-bold">{measure(selected.price_per_m2_minor)} {currency||'валюта не задана'}</dd></div>{selected.manual_total_price_minor!=null&&<div><dt className="text-sm text-slate-500">Фиксированная стоимость</dt><dd className="mt-1 font-bold">{measure(selected.manual_total_price_minor)} {currency||'валюта не задана'}</dd></div>}</dl><p className="mt-5 text-xs text-slate-500">Цена до индивидуальных условий и скидок. Оформление договора доступно через разрешённые операции проекта.</p>{selected.unit_kind==='APARTMENT'&&currency&&<WorkspacePricing unit={selected} complexId={data.selected_complex_id} currency={currency} schemes={data.schemes||emptyRecords} initialQuote={pricingQuote?.unit_id===selected.id?pricingQuote:null} onChange={rememberQuote} rateInput={rateInput} onRateChange={setRateInput}/>}</section>}
 </section>;
}
