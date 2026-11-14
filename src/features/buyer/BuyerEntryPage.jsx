import React,{useEffect,useState} from 'react';
import {buyerRequest,loadTelegram} from './buyer-api';
const BuyerDashboard=React.lazy(()=>import('./BuyerDashboard'));
const words={
 tj:{title:'Кабинети харидор',wait:'Лутфан интизор шавед…',intro:'Менеҷер пайвастшавии Telegram-ро як маротиба тасдиқ мекунад. SMS лозим нест.',code:'Ин рамзро ба менеҷер нишон диҳед',pending:'Тасдиқи менеҷерро интизор шавед. Пас аз тасдиқ кабинет худкор кушода мешавад.',retry:'Санҷидани пайвастшавӣ',noInvite:'Барои пайвастшавии аввал аз менеҷер QR-код гиред.',error:'Пайвастшавӣ дастрас нест. Кабинетро аз бот аз нав кушоед ё аз менеҷер QR-и нав гиред.'},
 ru:{title:'Кабинет покупателя',wait:'Подождите…',intro:'Менеджер один раз подтвердит подключение Вашего Telegram. SMS не требуется.',code:'Покажите этот код менеджеру',pending:'Ожидаем подтверждения менеджера. После подтверждения кабинет откроется автоматически.',retry:'Проверить подключение',noInvite:'Для первого подключения получите QR-код у менеджера.',error:'Подключение недоступно. Откройте кабинет заново из бота или получите новый QR у менеджера.'}
};
function initialLanguage(){try{return localStorage.getItem('tozon-buyer-language-v1')==='ru'?'ru':'tj';}catch{return 'tj';}}
export default function BuyerEntryPage(){
 const [language,setLanguage]=useState(initialLanguage),[token,setToken]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('invite')||'');
 const [initData,setInitData]=useState(''),[access,setAccess]=useState([]),[ready,setReady]=useState(false),[pending,setPending]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const t=words[language];
 useEffect(()=>{
  const controller=new AbortController();
  loadTelegram().then(async app=>{
   history.replaceState(null,'',window.location.pathname+window.location.search);
   if(!app.initData)throw new Error('INVALID_TELEGRAM_AUTH');app.ready();app.expand();
   const list=await buyerRequest('/access',app.initData,{signal:controller.signal});
   if(controller.signal.aborted)return;
   setInitData(app.initData);setAccess(list);setReady(true);
   // Existing verified Telegram identity wins over old, expired or consumed QR hashes.
   if(list.length){setToken('');if(list[0]?.language)setLanguage(list[0].language);}
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>controller.abort();
 },[]);
 useEffect(()=>{try{localStorage.setItem('tozon-buyer-language-v1',language);}catch{}},[language]);
 useEffect(()=>{
  if(!ready||!token||access.length)return;
  const controller=new AbortController();let timer;
  const check=async()=>{
   try{
    const result=await buyerRequest('/connect',initData,{method:'POST',body:{token},signal:controller.signal});
    if(controller.signal.aborted)return;
    setError('');
    if(result.status==='VERIFIED'){
     const list=await buyerRequest('/access',initData,{signal:controller.signal});
     if(!controller.signal.aborted){setAccess(list);setToken('');setPending(null);}
    }else{setPending(result);timer=setTimeout(check,4000);}
   }catch(e){if(!controller.signal.aborted)setError(e.message);}
  };check();return()=>{controller.abort();clearTimeout(timer);};
 },[ready,token,initData,access.length,revision]);
 async function changeLanguage(value){setLanguage(value);if(access.length)try{await buyerRequest('/preferences',initData,{method:'PATCH',body:{language:value}});}catch{}}
 return <main lang={language==='tj'?'tg':'ru'} className="min-h-dvh bg-slate-100 px-4 py-8 text-slate-900">
  <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-lg">
   <header className="bg-slate-900 px-6 py-6 text-white"><p className="text-xs font-bold tracking-widest text-blue-300">TOZON</p><h1 className="mt-2 text-2xl font-bold">{t.title}</h1>
    <div aria-label="Язык / Забон" className="mt-5 flex gap-2">{[['tj','Тоҷикӣ'],['ru','Русский']].map(([value,label])=><button key={value} type="button" aria-pressed={language===value} onClick={()=>changeLanguage(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${language===value?'bg-white text-slate-900':'bg-slate-700 text-white'}`}>{label}</button>)}</div>
   </header>
   <section className="space-y-5 p-6">
    {error?<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{t.error}</p>:null}
    {!ready&&!error?<p role="status">{t.wait}</p>:null}
    {ready&&access.length?<React.Suspense fallback={<p role="status">{t.wait}</p>}><BuyerDashboard initData={initData} language={language}/></React.Suspense>:null}
    {ready&&token&&!access.length?<><p>{t.intro}</p>{pending?<><p>{t.code}</p><strong className="block rounded-xl bg-blue-50 p-4 text-center font-mono text-3xl tracking-widest">{pending.code}</strong><p role="status">{t.pending}</p></>:null}{error?<button onClick={()=>setRevision(v=>v+1)} className="rounded-xl bg-blue-600 p-3 text-white">{t.retry}</button>:null}</>:null}
    {ready&&!token&&!access.length?<p>{t.noInvite}</p>:null}
   </section>
  </div>
 </main>;
}
