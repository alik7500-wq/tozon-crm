import React,{useEffect,useRef,useState} from 'react';
import {buyerRequest,loadTelegram} from './buyer-api';

const text={
  tj:{title:'Кабинети харидор',welcome:'Хуш омадед ба TOZON',intro:'Барои пайваст кардани шартнома рақами телефони дар шартнома бударо бо SMS тасдиқ кунед.',send:'Гирифтани рамз бо SMS',code:'Рамзи 6-рақама аз SMS',verify:'Тасдиқ кардан',sent:'Рамз фиристода шуд ба',retry:'Аз нав фиристодан',wait:'Лутфан интизор шавед…',connected:'Пайвастшавӣ тасдиқ шуд',contracts:'Шартномаҳои пайвастшуда',next:'Рақами телефон тасдиқ шуд. Шартномаҳо ба кабинети шумо пайваст шуданд.',noInvite:'Барои пайваст кардани шартнома аз менеҷер QR-коди нав гиред.',back:'Рамзро танҳо дар ҳамин равзана ворид кунед. Онро ба касе надиҳед.'},
  ru:{title:'Кабинет покупателя',welcome:'Добро пожаловать в TOZON',intro:'Подтвердите через SMS телефон, указанный в договоре, чтобы подключить его к кабинету.',send:'Получить код по SMS',code:'6-значный код из SMS',verify:'Подтвердить',sent:'Код отправлен на',retry:'Отправить повторно',wait:'Подождите…',connected:'Подключение подтверждено',contracts:'Подключено договоров',next:'Телефон подтверждён. Договоры подключены к Вашему кабинету.',noInvite:'Для подключения договора получите новый QR-код у менеджера.',back:'Введите код только в этом окне. Никому его не сообщайте.'}
};
const errors={
  INVALID_TELEGRAM_AUTH:['Кабинетро аз тугмаи бот дар Telegram аз нав кушоед.','Откройте кабинет заново кнопкой в Telegram-боте.'],
  BUYER_INVITE_UNAVAILABLE:['QR дигар дастрас нест. Аз менеҷер QR-и нав гиред.','QR недоступен или использован. Получите новый у менеджера.'],
  BUYER_CODE_INVALID:['Рамз нодуруст ё муҳлаташ гузаштааст.','Код неверен, просрочен или исчерпан лимит попыток.'],
  BUYER_OTP_RATE_LIMITED:['SMS-ро зуд-зуд дархост кардед. Баъдтар такрор кунед.','Слишком много запросов SMS. Повторите позже.'],
  BUYER_BINDING_REQUIRES_STAFF_REVIEW:['Барои иваз кардани Telegram ба менеҷер муроҷиат кунед.','Для смены привязанного Telegram обратитесь к менеджеру.'],
  BUYER_PHONE_REQUIRES_STAFF_VERIFICATION:['Менеҷер бояд рақами телефонро дар CRM тафтиш кунад.','Менеджеру нужно проверить номер телефона в CRM.']
};
function initialLanguage(){try{return localStorage.getItem('tozon-buyer-language-v1')==='ru'?'ru':'tj';}catch{return 'tj';}}
function readInvite(){return new URLSearchParams(window.location.hash.slice(1)).get('invite')||'';}

export default function BuyerEntryPage(){
  const [language,setLanguage]=useState(initialLanguage),[token,setToken]=useState(readInvite);
  const [initData,setInitData]=useState(''),[access,setAccess]=useState([]),[ready,setReady]=useState(false);
  const [challenge,setChallenge]=useState(null),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[resendAt,setResendAt]=useState(0),[now,setNow]=useState(Date.now);
  const inFlight=useRef(false),alive=useRef(true),initialToken=useRef(token); const t=text[language];
  useEffect(()=>{
    alive.current=true;const controller=new AbortController();
    loadTelegram().then(async app=>{
      // SDK must read Telegram's signed hash before clearing it from browser history.
      history.replaceState(null,'',window.location.pathname+window.location.search);
      if (!app.initData) throw new Error('INVALID_TELEGRAM_AUTH');
      app.ready();app.expand();
      const list=await buyerRequest('/access',app.initData,{signal:controller.signal});
      if (!alive.current||controller.signal.aborted)return;
      setInitData(app.initData);setAccess(list);setReady(true);
      if(list[0]?.language && !initialToken.current)setLanguage(list[0].language);
    }).catch(e=>{if(alive.current&&!controller.signal.aborted&&e.name!=='AbortError')setError(e.message);});
    return()=>{alive.current=false;controller.abort();};
  },[]);
  useEffect(()=>{try{localStorage.setItem('tozon-buyer-language-v1',language);}catch{/* Language preference only. */}},[language]);
  useEffect(()=>{
    if(!resendAt)return;
    const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);
  },[resendAt]);
  async function changeLanguage(value){
    setLanguage(value);
    if(access.length&&initData){try{await buyerRequest('/preferences',initData,{method:'PATCH',body:{language:value}});}catch(e){setError(e.message);}}
  }
  async function sendCode(){
    if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
    try{
      const result=await buyerRequest('/otp',initData,{method:'POST',body:{token}});
      if(!alive.current)return;
      setChallenge(result);setCode('');setResendAt(Date.now()+60000);setNow(Date.now());
    }catch(e){if(alive.current)setError(e.message);}finally{inFlight.current=false;if(alive.current)setBusy(false);}
  }
  async function verify(event){
    event.preventDefault();if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
    try{
      await buyerRequest('/verify',initData,{method:'POST',body:{challengeId:challenge.challengeId,code}});
      if(!alive.current)return;
      // The QR is consumed now; never offer to reuse it, even if the refresh fails.
      setToken('');setChallenge(null);setCode('');
      await buyerRequest('/preferences',initData,{method:'PATCH',body:{language}});
      const list=await buyerRequest('/access',initData);
      if(alive.current)setAccess(list);
    }catch(e){if(alive.current)setError(e.message);}finally{inFlight.current=false;if(alive.current)setBusy(false);}
  }
  const translatedError=error?(errors[error]?.[language==='tj'?0:1]||(language==='tj'?'Хизмат муваққатан дастрас нест. Баъдтар такрор кунед.':'Сервис временно недоступен. Повторите позже.')):'';
  const connected=ready&&!token&&access.length>0;
  return <main lang={language==='tj'?'tg':'ru'} className="min-h-dvh bg-slate-100 px-4 py-8 text-slate-900" style={{paddingTop:'max(2rem, env(safe-area-inset-top))',paddingBottom:'max(2rem, env(safe-area-inset-bottom))'}}>
    <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-lg">
      <header className="bg-slate-900 px-6 py-6 text-white"><p className="text-xs font-bold tracking-widest text-blue-300">TOZON</p><h1 className="mt-2 text-2xl font-bold">{t.title}</h1>
        <div aria-label="Язык / Забон" className="mt-5 flex gap-2">{[['tj','Тоҷикӣ'],['ru','Русский']].map(([value,label])=><button key={value} type="button" disabled={busy} aria-pressed={language===value} onClick={()=>changeLanguage(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${language===value?'bg-white text-slate-900':'bg-slate-700 text-white'}`}>{label}</button>)}</div>
      </header>
      <section className="space-y-5 p-6">
        {error?<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{translatedError}</p>:null}
        {!ready&&!error?<p role="status">{t.wait}</p>:null}
        {ready&&token?<><h2 className="text-lg font-bold">{t.welcome}</h2><p className="text-sm leading-6 text-slate-600">{t.intro}</p>
          {challenge?<form onSubmit={verify} className="space-y-4"><p className="text-sm">{t.sent} <strong>{challenge.maskedPhone}</strong></p><label className="block text-sm font-semibold">{t.code}<input autoFocus inputMode="numeric" autoComplete="one-time-code" type="text" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-center text-2xl tracking-widest" required/></label><button disabled={busy||code.length!==6} className="w-full rounded-xl bg-blue-600 p-3 font-bold text-white disabled:opacity-50">{busy?t.wait:t.verify}</button></form>:null}
          <button type="button" disabled={busy||now<resendAt} onClick={sendCode} className={`w-full rounded-xl p-3 font-bold disabled:opacity-50 ${challenge?'bg-slate-100 text-blue-700':'bg-blue-600 text-white'}`}>{busy?t.wait:challenge?`${t.retry}${now<resendAt?` (${Math.ceil((resendAt-now)/1000)})`:''}`:t.send}</button><p className="text-xs leading-5 text-slate-500">{t.back}</p></>:null}
        {connected?<><h2 className="text-xl font-bold text-emerald-700">{t.connected}</h2><p>{t.contracts}: <strong>{access.length}</strong></p><p className="text-sm leading-6 text-slate-600">{t.next}</p></>:null}
        {ready&&!token&&!access.length?<p>{t.noInvite}</p>:null}
      </section>
    </div>
  </main>;
}
