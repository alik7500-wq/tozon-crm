import React,{useEffect,useRef,useState} from 'react';
import {api} from '../../api/client';
export default function ProjectReadiness({projectId,revision,dirty}){
 const [result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const pending=useRef(null),sequence=useRef(0);
 const key=JSON.stringify([projectId,revision]);
 useEffect(()=>()=>{sequence.current++;pending.current?.abort();pending.current=null;},[key]);
 async function check(){
  if(pending.current||dirty)return;
  const controller=new AbortController();pending.current=controller;const request=++sequence.current;
  setBusy(true);setError('');setResult(null);
  try{const response=await api.get(`/company-projects/${projectId}/readiness`,{signal:controller.signal});if(request===sequence.current)setResult({key,data:response.data});}
  catch(e){if(request===sequence.current)setError(e.message);}
  finally{if(request===sequence.current){pending.current=null;setBusy(false);}}
 }
 const data=!dirty&&result?.key===key?result.data:null;
 return <section aria-label="Проверка готовности проекта" className="lg:col-start-2 rounded-2xl border bg-white p-5 space-y-4">
  <h3 className="font-bold">Подготовка проекта к пилоту</h3>
  <p className="text-sm text-slate-600">Проверка читает сохранённые настройки. Права сотрудников и данные не изменяются.</p>
  <button type="button" disabled={busy||dirty} onClick={check} className="rounded-xl border border-blue-600 px-4 py-2 text-sm font-bold text-blue-600 disabled:opacity-40">{busy?'Проверяем…':'Проверить готовность проекта'}</button>
  {dirty&&<p className="text-sm text-amber-800">Сначала сохраните изменения проекта.</p>}
  {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
  {data&&<><p role="status" className="text-sm font-semibold">{data.configuration_ready?'Основные настройки заполнены. Нужна ручная проверка перед запуском.':'Есть незавершённые настройки проекта.'}</p>
   <ul className="divide-y">{data.checks.map(c=><li key={c.code} className="py-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{c.label}</strong><span className={c.status==='PASS'?'text-emerald-700':c.status==='BLOCKED'?'text-rose-700':'text-amber-800'}>{c.status==='PASS'?'Проверено':c.status==='BLOCKED'?'Нужно заполнить':'Проверить вручную'}</span></div>{c.action&&<p className="mt-1 text-slate-600">{c.action}</p>}</li>)}</ul>
   <p className="text-xs text-slate-500">Состояние на момент запроса. Эта проверка не включает проект в рабочей CRM.</p></>}
 </section>;
}
