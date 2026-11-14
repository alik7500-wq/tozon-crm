import React,{useEffect,useRef,useState} from 'react';
import {api} from '../../api/client';
import {workspaceOfferHtml} from './workspaceOfferHtml';

export default function WorkspaceOffer({project,request,onClose}){
 const [language,setLanguage]=useState('RU'),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dialog=useRef(null),frame=useRef(null),printOnLoad=useRef(false),alive=useRef(true),printing=useRef(false),frameVersion=useRef(0);
 const path=`/project-workspace/${project}/offers/preview`,key=JSON.stringify([path,request,language]);
 const current=result?.key===key?result:null;
 useEffect(()=>{alive.current=true;const previous=document.activeElement;dialog.current?.querySelector('button')?.focus();return()=>{alive.current=false;previous?.focus?.();};},[]);
 useEffect(()=>{
  const [url,body,lang]=JSON.parse(key),controller=new AbortController();let active=true;
  api.post(url,{...body,language:lang},{signal:controller.signal}).then(r=>{if(active)setResult({key,html:workspaceOfferHtml(r.data)});}).catch(e=>{if(active)setResult({key,error:e.message});});
  return()=>{active=false;controller.abort();};
 },[key]);
 async function print(){
  if(printing.current)return;printing.current=true;setBusy(true);setError('');
  try{const {data}=await api.post(path,{...request,language});if(alive.current){printOnLoad.current=true;setResult({key,html:workspaceOfferHtml(data),frameVersion:++frameVersion.current});}}
  catch(e){if(alive.current){setResult({key,error:e.message});setError(e.message);}}
  finally{printing.current=false;if(alive.current)setBusy(false);}
 }
 function keyDown(e){
  if(e.key==='Escape'&&!busy){e.stopPropagation();onClose();}
  if(e.key==='Tab'){const items=dialog.current?.querySelectorAll('button:not([disabled]),select:not([disabled])'),first=items?.[0],last=items?.[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 }
 return <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="workspace-offer-title" onKeyDown={keyDown} className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-3"><div className="flex max-h-[94vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><h2 id="workspace-offer-title" className="text-xl font-bold">Предложение клиенту</h2><button type="button" disabled={busy} aria-label="Закрыть предложение" onClick={onClose} className="rounded-lg border px-3 py-2">✕</button></header>
  <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><label className="text-sm font-semibold">Язык предложения<select aria-label="Язык предложения" value={language} disabled={busy} onChange={e=>{printOnLoad.current=false;setError('');setLanguage(e.target.value);}} className="ml-3 rounded-xl border px-3 py-2"><option value="RU">Русский</option><option value="TJ">Тоҷикӣ</option></select></label><button type="button" disabled={busy||!current?.html} onClick={print} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{busy?'Проверка условий…':'Печать / Сохранить PDF'}</button></div>
  <div className="overflow-y-auto p-4">{!current?<p role="status">Проверка доступа, цены и выбранных условий…</p>:current.error?<p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{current.error}</p>:<iframe key={current.frameVersion||0} ref={frame} title="Печатное предложение клиенту" sandbox="allow-same-origin allow-modals" srcDoc={current.html} onLoad={()=>{if(printOnLoad.current&&current.frameVersion===frameVersion.current){printOnLoad.current=false;frame.current?.contentWindow?.focus();frame.current?.contentWindow?.print();}}} className="h-[65vh] w-full rounded-xl border"/>}{error&&!current?.error&&<p role="alert">{error}</p>}<p className="mt-3 text-xs text-slate-500">Для PDF выберите «Сохранить как PDF» в окне печати браузера.</p></div>
 </div></div>;
}
