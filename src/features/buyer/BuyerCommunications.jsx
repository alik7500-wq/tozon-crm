import React,{useEffect,useRef,useState} from 'react';
import {buyerRequest} from './buyer-api';
const labels={ru:{title:'Связь с менеджером',send:'Отправить',message:'Ваш вопрос по договору',empty:'Обращений пока нет.',sent:'Обращение сохранено в CRM.',waiting:'Ожидает ответа',reply:'Ответ менеджера',enabled:'Получать уведомления в Telegram',error:'Не удалось выполнить запрос. Повторите позже.',limit:'Вы недавно отправили обращение. Подождите минуту.',refresh:'Обновить',notices:'Уведомления',noNotices:'Уведомлений пока нет.',read:'Прочитано',mark:'Отметить прочитанным'},tj:{title:'Тамос бо менеҷер',send:'Фиристодан',message:'Саволи шумо оид ба шартнома',empty:'Ҳоло муроҷиат нест.',sent:'Муроҷиат дар CRM сабт шуд.',waiting:'Дар интизори ҷавоб',reply:'Ҷавоби менеҷер',enabled:'Гирифтани огоҳиҳо дар Telegram',error:'Дархост иҷро нашуд. Баъдтар такрор кунед.',limit:'Шумо ба наздикӣ муроҷиат фиристодед. Як дақиқа интизор шавед.',refresh:'Навсозӣ',notices:'Огоҳиҳо',noNotices:'Ҳоло огоҳӣ нест.',read:'Хонда шуд',mark:'Хондам'}};
const kinds={ru:{PAYMENT:'Платёж учтён',PAYMENT_VOIDED:'Платёж аннулирован',DOCUMENT:'Новый документ',SCHEDULE_CHANGED:'Изменён график оплаты',TERMS_CHANGED:'Изменены условия договора',REMINDER_7:'До платежа 7 дней',REMINDER_3:'До платежа 3 дня',REMINDER_0:'День платежа',OVERDUE:'Есть просроченный платёж',INQUIRY_REPLY:'Ответ менеджера'},tj:{PAYMENT:'Пардохт ба ҳисоб гирифта шуд',PAYMENT_VOIDED:'Пардохт бекор шуд',DOCUMENT:'Ҳуҷҷати нав',SCHEDULE_CHANGED:'Ҷадвали пардохт тағйир ёфт',TERMS_CHANGED:'Шартҳои шартнома тағйир ёфтанд',REMINDER_7:'То пардохт 7 рӯз',REMINDER_3:'То пардохт 3 рӯз',REMINDER_0:'Рӯзи пардохт',OVERDUE:'Пардохти муҳлатгузашта ҳаст',INQUIRY_REPLY:'Ҷавоби менеҷер'}};
export default function BuyerCommunications({initData,dealId,language}){
 const lang=language==='ru'?'ru':'tj',t=labels[lang];
 const [rows,setRows]=useState([]),[notices,setNotices]=useState([]),[settings,setSettings]=useState(null),[message,setMessage]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 const request=useRef(null),saving=useRef(false),generation=useRef(0);
 useEffect(()=>{
  const controller=new AbortController(),current=++generation.current;
  // Clear protected data before fetching another contract or refreshing access.
  // eslint-disable-next-line react/set-state-in-effect
  setBusy(false);setRows([]);setNotices([]);setSettings(null);setError('');
  Promise.all([buyerRequest('/inquiries',initData,{method:'POST',body:{dealId},signal:controller.signal}),buyerRequest('/notices',initData,{signal:controller.signal}),buyerRequest('/communication-settings',initData,{signal:controller.signal})]).then(([history,inbox,prefs])=>{if(!controller.signal.aborted){setRows(history);setNotices(inbox);setSettings(prefs);}}).catch(()=>{if(!controller.signal.aborted)setError(t.error);});
  return()=>{controller.abort();generation.current=current+1;};
 },[initData,dealId,revision,t.error]);
 const mutate=async(fn)=>{
  if(saving.current)return;saving.current=true;setBusy(true);setError('');setNotice('');const current=generation.current;
  try{await fn(()=>current===generation.current);}catch(e){if(current===generation.current)setError(e.message==='BUYER_INQUIRY_RATE_LIMITED'?t.limit:t.error);}finally{saving.current=false;if(current===generation.current)setBusy(false);}
 };
 const send=e=>{e.preventDefault();mutate(async(active)=>{
  const text=message.trim();if(!text)return;
  // Reuse this ID after an uncertain response; the server returns the same saved inquiry.
  if(!request.current||request.current.message!==text)request.current={id:crypto.randomUUID(),message:text};
  await buyerRequest('/contact',initData,{method:'POST',body:{dealId,...request.current}});
  if(active()){request.current=null;setMessage('');setNotice(t.sent);setRevision(n=>n+1);}
 });};
 return <section className="space-y-4">
  <div className="flex justify-between gap-3"><h3 className="font-bold">{t.title}</h3><button type="button" disabled={busy} onClick={()=>setRevision(n=>n+1)} className="text-blue-700 underline">{t.refresh}</button></div>
  {error?<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
  {settings?<label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><input type="checkbox" checked={settings.enabled} disabled={busy} onChange={e=>{const enabled=e.target.checked;mutate(async(active)=>{const next=await buyerRequest('/communication-settings',initData,{method:'PATCH',body:{enabled,language:lang}});if(active())setSettings(next);});}}/>{t.enabled}</label>:null}
  <form onSubmit={send} className="space-y-3"><label className="block text-sm font-semibold">{t.message}<textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={2000} required disabled={busy} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3"/></label><button disabled={busy||!message.trim()} className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{t.send}</button></form>
  {rows.length?rows.map(row=><article key={row.id} className="space-y-2 rounded-xl border p-3 text-sm"><p className="whitespace-pre-wrap break-words">{row.message}</p><p className="text-xs text-slate-500">{new Date(row.createdAt||row.created_at).toLocaleString(lang==='ru'?'ru-RU':'tg-TJ')}</p>{row.reply?<div className="rounded-lg bg-blue-50 p-3"><strong>{t.reply}</strong><p className="whitespace-pre-wrap break-words">{row.reply}</p></div>:<p className="text-slate-500">{t.waiting}</p>}</article>):<p className="text-sm text-slate-500">{t.empty}</p>}
  <h3 className="font-bold">{t.notices}</h3>
  {notices.length?notices.map(row=><article key={row.id} className="rounded-xl border p-3 text-sm"><p>{kinds[lang][row.kind]||t.notices} · №{row.contractNumber}</p>{row.readAt?<span className="text-slate-500">{t.read}</span>:<button type="button" disabled={busy} className="mt-2 text-blue-700 underline" onClick={()=>mutate(async(active)=>{await buyerRequest('/notice-read',initData,{method:'POST',body:{id:row.id}});if(active())setNotices(current=>current.map(n=>n.id===row.id?{...n,readAt:new Date().toISOString()}:n));})}>{t.mark}</button>}</article>):<p className="text-sm text-slate-500">{t.noNotices}</p>}
 </section>;
}
