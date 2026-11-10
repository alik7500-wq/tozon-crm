import React,{useEffect,useRef,useState} from 'react';
import {api} from '../../api/client';
const money=n=>(Number(n||0)/100).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
async function fileCatalog(path,signal){
 const rows=[];let after='';
 for(let i=0;i<500;i++){
  const {data}=await api.get(`${path}/files`,{params:{after,limit:100},signal});rows.push(...data.records);
  if(!data.has_more)return rows;
  const next=String(data.records.at(-1)?.id||'');if(!next||next===after)throw new Error('Не удалось загрузить список вложений');after=next;
 }
 throw new Error('Слишком много вложений. Обратитесь к администратору.');
}
function saveBlob(blob,name){
 if(!(blob instanceof Blob))throw new Error('Сервер не вернул файл');
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function WorkspaceDocuments({project,dealId,onClose}){
 const path=`/project-workspace/${project}/documents/${dealId}`;
 const [result,setResult]=useState(null),[revision,setRevision]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[file,setFile]=useState(null),[lang,setLang]=useState('RU'),[card,setCard]=useState(null);
 const key=JSON.stringify([path,revision]),current=result?.key===key?result:null;
 const pending=useRef(null),lock=useRef(false),frame=useRef(null),printAfterLoad=useRef(false),dialog=useRef(null);
 useEffect(()=>{const previous=document.activeElement;dialog.current?.querySelector('button')?.focus();return()=>previous?.focus?.();},[]);
 useEffect(()=>{
  const [requestPath]=JSON.parse(key),controller=new AbortController();let active=true;
  Promise.all([api.get(requestPath,{signal:controller.signal}),fileCatalog(requestPath,controller.signal)]).then(([r,files])=>{if(active)setResult({key,data:r.data,files});}).catch(e=>{if(active)setResult({key,error:e.message});});
  return()=>{active=false;controller.abort();};
 },[key]);
 useEffect(()=>{if(!uncertain&&!pending.current)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[uncertain,busy]);
 async function task(fn){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(e.message);setCard(null);}finally{lock.current=false;setBusy(false);}}
 async function download(suffix,name){await task(async()=>{saveBlob(await api.get(path+suffix,{responseType:'blob'}),name);});}
 async function printCard(){await task(async()=>{setCard(null);const html=await api.get(`${path}/preview`,{responseType:'text'});if(typeof html!=='string'||!html.startsWith('<!doctype html>'))throw new Error('Сервер не вернул печатную карточку');printAfterLoad.current=true;setCard(html);});}
 async function upload(){
  if(lock.current)return;const command=pending.current||{id:crypto.randomUUID(),file};
  if(!command.file){setError('Выберите PDF, JPEG или PNG');return;}
  if(command.file.size>10*1024*1024){setError('Максимальный размер файла — 10 МБ');return;}
  pending.current=command;lock.current=true;setBusy(true);setError('');
  try{
   const body=new FormData();body.append('file',command.file);
   const r=await api.post(`${path}/files`,body,{headers:{'Content-Type':undefined,'X-Request-ID':command.id}});
   if(!r.data?.id)throw new Error('Сервер не подтвердил загрузку');
   pending.current=null;setUncertain(false);setFile(null);setRevision(n=>n+1);
  }catch(e){const ambiguous=!e.status||e.status>=500;setUncertain(ambiguous);if(!ambiguous)pending.current=null;setError(ambiguous?'Ответ о загрузке не подтверждён. Повторите тот же файл с тем же ключом.':e.message);}
  finally{lock.current=false;setBusy(false);}
 }
 const data=current?.data,templates=data?.templates||[],canClose=!busy&&!uncertain;
 return <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="workspace-documents-title" onKeyDown={e=>{if(e.key==='Escape'&&canClose)onClose();}} className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-3"><div className="flex max-h-[94vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl">
  <header className="flex justify-between items-center border-b p-5"><h2 id="workspace-documents-title" className="text-xl font-bold">Документы договора</h2><button type="button" aria-label="Закрыть документы" disabled={!canClose} onClick={onClose} className="rounded-lg border px-3 py-2">✕</button></header>
  <div className="overflow-y-auto p-5 space-y-5">
   {!current?<p role="status">Проверка доступа и загрузка документов…</p>:current.error?<div role="alert">{current.error}<button type="button" className="block mt-2 font-bold text-blue-600" onClick={()=>setRevision(n=>n+1)}>Повторить проверку доступа</button></div>:<>
    <section className="rounded-xl border p-4 space-y-2"><h3 className="font-bold">№ {data.deal.contract_number||data.deal.id} · {data.deal.status==='SIGNED'?'Подписан':'Черновик'}</h3><p>{data.unit.project_name} · помещение № {data.unit.unit_number}</p><p>Покупатель: {data.client.full_name}</p><p>Стоимость: {money(data.deal.final_price_minor)} {data.deal.currency}</p><p>Директор при подписании: {data.signer?.director_name||'Не указан'}</p><p className="text-sm text-slate-500">{data.signer?.director_authority||'Основание полномочий не заполнено'}</p></section>
    <section className="rounded-xl border p-4 space-y-3"><h3 className="font-bold">Печать</h3><label className="block text-sm">Язык бланка<select aria-label="Язык бланка" disabled={busy||uncertain} value={lang} onChange={e=>setLang(e.target.value)} className="ml-3 rounded-lg border p-2">{[['RU','Русский'],['TJ','Тоҷикӣ'],['UZ','O‘zbek'],['EN','English']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
     <div className="flex flex-wrap gap-2"><button type="button" disabled={busy||uncertain} onClick={printCard} className="rounded-xl bg-blue-600 px-4 py-2 text-white">Печатная карточка</button>{['CONTRACT','SCHEDULE'].map(kind=><button type="button" key={kind} disabled={busy||uncertain||data.deal.status!=='SIGNED'||!templates.some(t=>t.kind===kind&&t.language===lang)} onClick={()=>download(`/word/${kind}/${lang}`,`TOZON-${kind}-${dealId}-${lang}.docx`)} className="rounded-xl border px-4 py-2 disabled:opacity-40">{kind==='CONTRACT'?'Договор Word':'График Word'}</button>)}</div>
     <p className="text-xs text-slate-500">Для Word нужен действующий бланк в настройках своего ЖК или общий бланк компании. Карточка содержит учётные данные; текст договора она не заменяет.</p>
     {card&&<iframe ref={frame} title="Печатная карточка договора" sandbox="allow-same-origin allow-modals" srcDoc={card} onLoad={()=>{if(printAfterLoad.current){printAfterLoad.current=false;frame.current?.contentWindow?.focus();frame.current?.contentWindow?.print();}}} className="h-[460px] w-full rounded-xl border"/>}
    </section>
    <section className="rounded-xl border p-4 space-y-3"><h3 className="font-bold">Защищённые вложения</h3>{current.files.length?<ul className="space-y-2">{current.files.map(f=><li key={f.id} className="flex justify-between gap-3 text-sm"><span>{f.original_name} · {(f.file_size/1024).toFixed(1)} КБ</span><button type="button" disabled={busy||uncertain} className="font-bold text-blue-600" onClick={()=>download(`/files/${f.id}`,f.original_name)}>Скачать {f.original_name}</button></li>)}</ul>:<p className="text-sm text-slate-500">Вложений пока нет.</p>}
     {data.files_upload&&<div className="space-y-2 border-t pt-3"><label className="block text-sm">PDF, JPEG или PNG до 10 МБ<input aria-label="Файл договора" type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy||uncertain} onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 block w-full"/></label><button type="button" disabled={busy||(!file&&!uncertain)} onClick={upload} className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-40">{busy?'Обработка…':uncertain?'Повторить ту же загрузку':'Загрузить вложение'}</button></div>}
    </section>
   </>}
   {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
  </div>
 </div></div>;
}
