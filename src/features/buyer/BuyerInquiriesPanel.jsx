import React,{useEffect,useRef,useState} from 'react';
import {api} from '../../api/client';
export function BuyerInquiriesPanel({dealId}){
 const [rows,setRows]=useState([]),[drafts,setDrafts]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),generation=useRef(0),base=`/deals/${dealId}/buyer-inquiries`;
 useEffect(()=>{const current=++generation.current;
  // Clear sensitive history immediately when the selected contract changes.
  // eslint-disable-next-line react/set-state-in-effect
  setRows([]);setDrafts({});setError('');api.get(base).then(r=>{if(!Array.isArray(r.data))throw new Error();if(current===generation.current)setRows(r.data);}).catch(()=>{if(current===generation.current)setError('Не удалось загрузить обращения.');});return()=>{generation.current=current+1;};},[base]);
 const reply=async(e,id)=>{
  e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');const current=generation.current;
  try{await api.post(`${base}/reply`,{id,message:drafts[id]?.trim()});const r=await api.get(base);if(!Array.isArray(r.data))throw new Error();if(current===generation.current){setRows(r.data);setDrafts(values=>({...values,[id]:''}));}}
  catch{if(current===generation.current)setError('Не удалось сохранить ответ. Обновите историю перед повторной отправкой.');}
  finally{lock.current=false;if(current===generation.current)setBusy(false);}
 };
 return <section className="space-y-3 border-t pt-4"><h3 className="font-bold">Обращения покупателя</h3>{error?<p role="alert" className="text-red-700">{error}</p>:null}{!rows.length?<p className="text-sm text-slate-500">Обращений пока нет.</p>:rows.map(row=><article key={row.id} className="space-y-2 rounded-xl border p-3 text-sm"><p className="whitespace-pre-wrap break-words">{row.message}</p><p className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString('ru-RU')}</p>{row.reply?<div className="rounded-lg bg-blue-50 p-3"><strong>Ответ менеджера</strong><p className="whitespace-pre-wrap break-words">{row.reply}</p></div>:<form onSubmit={e=>reply(e,row.id)} className="space-y-2"><label className="block">Ответ покупателю<textarea rows={3} required maxLength={2000} disabled={busy} value={drafts[row.id]||''} onChange={e=>setDrafts(values=>({...values,[row.id]:e.target.value}))} className="mt-1 w-full rounded-lg border p-2"/></label><button disabled={busy||!drafts[row.id]?.trim()} className="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white disabled:opacity-50">Сохранить ответ</button></form>}</article>)}</section>;
}
