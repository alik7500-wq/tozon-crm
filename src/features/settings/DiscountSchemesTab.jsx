import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
export const EXAMPLE_DISCOUNT_RULES = [
  {payment_percent:0,discount_percent:0,months:30},
  {payment_percent:5,discount_percent:2.86,months:30},
  {payment_percent:15,discount_percent:7.14,months:30},
  {payment_percent:30,discount_percent:11.43,months:30},
  {payment_percent:50,discount_percent:17.14,months:30},
  {payment_percent:100,discount_percent:21.43,months:0},
];
export function DiscountSchemesTab({ projects }) {
  const [schemes,setSchemes]=useState([]),[form,setForm]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const load=async()=>{try{const r=await api.get('/discount-schemes');setSchemes(r.data?.schemes||[]);}catch(e){setMessage(e.response?.data?.message||e.message)}};
  useEffect(()=>{load()},[]);
  const create=()=>{setMessage('');setForm({name:'Новая схема',project_id:projects[0]?.id||'',is_active:true,starts_on:'',ends_on:'',rules:EXAMPLE_DISCOUNT_RULES.map(r=>({...r}))})};
  const field=(key,value)=>setForm(f=>({...f,[key]:value}));
  const save=async()=>{setBusy(true);setMessage('');try{
    const r=form.id?await api.put(`/discount-schemes/${form.id}`,form):await api.post('/discount-schemes',form);
    setForm(r.data.scheme);await load();setMessage('Схема сохранена');
  }catch(e){setMessage(e.response?.data?.message||e.message)}finally{setBusy(false)}};
  const remove=async()=>{if(!window.confirm(`Удалить схему «${form.name}»? Условия ранее оформленных сделок сохранятся.`))return;setBusy(true);try{await api.delete(`/discount-schemes/${form.id}`);setForm(null);await load()}catch(e){setMessage(e.response?.data?.message||e.message)}finally{setBusy(false)}};
  return <div className="space-y-4 mt-5">
    <h2 className="text-xl font-bold">Схемы скидок</h2>
    <p className="text-sm text-slate-600">Условия для новых продаж квартир. Процент взноса считается от цены после скидки. Срок — количество ежемесячных платежей; 0 — полная оплата. Скидки разных схем не суммируются.</p>
    {message&&<p role="status" className="rounded-xl bg-blue-50 p-3">{message}</p>}
    <div className="grid md:grid-cols-[240px_1fr] gap-5">
      <aside className="rounded-2xl border bg-white p-3 space-y-2">
        {schemes.map(s=><button key={s.id} disabled={busy} onClick={()=>{setForm({...s,rules:s.rules.map(r=>({...r}))});setMessage('')}} className={`w-full text-left p-3 rounded-xl ${form?.id===s.id?'bg-blue-600 text-white':'bg-slate-50'}`}><strong>{s.name}</strong><span className="block text-xs">{projects.find(p=>Number(p.id)===Number(s.project_id))?.name}{!s.is_active?' · Выключена':''}</span></button>)}
        <button onClick={create} disabled={busy} className="w-full bg-blue-600 text-white p-3 rounded-xl">+ Создать схему</button>
      </aside>
      {form?<section className="rounded-2xl border bg-white p-5 space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <label>Название<input aria-label="Название схемы" maxLength={100} value={form.name} onChange={e=>field('name',e.target.value)} className="border rounded-lg p-2 w-full"/></label>
          <label>Жилой комплекс<select aria-label="Жилой комплекс схемы" value={form.project_id} onChange={e=>field('project_id',Number(e.target.value))} className="border rounded-lg p-2 w-full">{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>Действует с<input type="date" value={form.starts_on||''} onChange={e=>field('starts_on',e.target.value)} className="border rounded-lg p-2 w-full"/></label>
          <label>Действует по<input type="date" value={form.ends_on||''} onChange={e=>field('ends_on',e.target.value)} className="border rounded-lg p-2 w-full"/></label>
        </div>
        <p className="text-xs text-slate-500">Для постоянной схемы оставьте даты пустыми. Для временной акции задайте период.</p>
        <label className="flex gap-2"><input type="checkbox" checked={form.is_active} onChange={e=>field('is_active',e.target.checked)}/>Схема включена</label>
        <p className="text-xs text-slate-500">Если указана цена за м², продажа рассчитывается по этой цене. Процент скидки дополнительно не вычитается. Оставьте цену пустой для расчёта по проценту.</p>
        {form.rules.map((rule,i)=><div key={i} className="grid grid-cols-2 xl:grid-cols-[1fr_1fr_1.5fr_1fr_auto] gap-3 items-end">
          {[['payment_percent','Взнос (%)'],['discount_percent','Скидка (%)']].map(([key,title])=><label key={key} className="text-sm">{title}<input aria-label={`${title} ${i+1}`} type="number" min="0" max={key==='months'?120:100} step={key==='months'?1:0.01} value={rule[key]} onChange={e=>field('rules',form.rules.map((r,j)=>j===i?{...r,[key]:e.target.value}:r))} className="w-full border rounded-lg p-2"/></label>)}
          <label className="text-sm">Цена со скидкой за м² ({projects.find(p=>Number(p.id)===Number(form.project_id))?.currency || 'USD'})<input aria-label={`Цена со скидкой за м² ${i+1}`} type="number" min="0.01" step="0.01" placeholder="По проценту скидки" value={rule.price_per_m2 ?? ''} onChange={e=>field('rules',form.rules.map((r,j)=>j===i?{...r,price_per_m2:e.target.value}:r))} className="w-full border rounded-lg p-2"/></label>
          <label className="text-sm">Срок (месяцев)<input aria-label={`Срок (месяцев) ${i+1}`} type="number" min="0" max="120" step="1" value={rule.months} onChange={e=>field('rules',form.rules.map((r,j)=>j===i?{...r,months:e.target.value}:r))} className="w-full border rounded-lg p-2"/></label>
          <button aria-label={`Удалить условие ${i+1}`} onClick={()=>field('rules',form.rules.filter((_,j)=>j!==i))} className="p-2 text-red-600">✕</button>
        </div>)}
        <button onClick={()=>field('rules',[...form.rules,{payment_percent:'',discount_percent:'',months:30}])} className="border border-dashed rounded-xl p-3 w-full">+ Добавить условие</button>
        <div className="flex gap-3"><button disabled={busy} onClick={save} className="bg-blue-600 text-white px-5 py-3 rounded-xl">{busy?'Сохранение…':'Сохранить'}</button>{form.id&&<button disabled={busy} onClick={remove} className="text-red-600">Удалить схему</button>}</div>
      </section>:<p className="p-5 text-slate-500">Выберите схему или создайте новую.</p>}
    </div>
  </div>;
}
