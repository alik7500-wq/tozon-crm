import React,{useEffect,useRef,useState} from 'react';
import {buyerRequest,buyerBlob} from './buyer-api';
const BuyerPanorama=React.lazy(()=>import('./BuyerPanorama'));
const words={ru:{plans:'Планировки',PLAN_2D:'Планировка 2D',PLAN_3D:'Планировка 3D',empty:'Материал пока не добавлен.',tour:'Тур 360°',documents:'Документы',load:'Загрузка…',error:'Материал недоступен. Обновите кабинет или обратитесь к менеджеру.',open:'Открыть',download:'Скачать',signed:'Подписанный оригинал',copy:'Одобренная копия',close:'Закрыть просмотр'},tj:{plans:'Нақшаҳо',PLAN_2D:'Нақшаи 2D',PLAN_3D:'Нақшаи 3D',empty:'Мавод ҳоло илова нашудааст.',tour:'Сайри 360°',documents:'Ҳуҷҷатҳо',load:'Боргирӣ…',error:'Мавод дастрас нест. Кабинетро нав кунед ё ба менеҷер муроҷиат кунед.',open:'Кушодан',download:'Боргирӣ',signed:'Асли имзошуда',copy:'Нусхаи тасдиқшуда',close:'Пӯшидани намоиш'}};
const extension=type=>type==='application/pdf'?'pdf':type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
export default function BuyerMaterials({dealId,initData,language}){
 const t=words[language]||words.tj;
 const [manifest,setManifest]=useState(null),[error,setError]=useState(false),[busy,setBusy]=useState(false),[viewer,setViewer]=useState(null),[documentFiles,setDocumentFiles]=useState({});
 const controller=useRef(null),urls=useRef(new Set()),loading=useRef(false),picture=useRef(null);
 useEffect(()=>{
  const abort=new AbortController();controller.current=abort;
  buyerRequest('/materials',initData,{method:'POST',body:{dealId},signal:abort.signal}).then(data=>{if(!abort.signal.aborted)setManifest(data);}).catch(()=>{if(!abort.signal.aborted)setError(true);});
  const allocated=urls.current;
  return()=>{abort.abort();allocated.forEach(URL.revokeObjectURL);allocated.clear();};
 },[dealId,initData]);
 async function load(type,id){
  if(loading.current)return;loading.current=true;setBusy(true);setError(false);
  try{
   const blob=await buyerBlob(initData,{dealId,type,id},{signal:controller.current.signal});if(controller.current.signal.aborted)return;
   const url=URL.createObjectURL(blob);urls.current.add(url);
   if(type==='DOCUMENT')setDocumentFiles(files=>({...files,[id]:{url,extension:extension(blob.type)}}));
   else {if(picture.current){URL.revokeObjectURL(picture.current);urls.current.delete(picture.current);}picture.current=url;setViewer({url,type,id});}
  }catch{if(!controller.current.signal.aborted){urls.current.forEach(URL.revokeObjectURL);urls.current.clear();picture.current=null;setViewer(null);setDocumentFiles({});setManifest(null);setError(true);}}
  finally{loading.current=false;if(!controller.current.signal.aborted)setBusy(false);}
 }
 const current=viewer?.type==='PANORAMA'?manifest?.tour?.panoramas.find(p=>p.id===viewer.id):null;
 return <section className="space-y-5">
  {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{t.error}</p>:null}
  {(!manifest&&!error)||busy?<p role="status">{t.load}</p>:null}
  {manifest?<>
   <div><h3 className="font-bold">{t.plans}</h3><div className="mt-3 grid grid-cols-2 gap-2">{['PLAN_2D','PLAN_3D'].map(key=><div key={key} className="rounded-xl border p-3 text-sm"><p className="font-semibold">{t[key]}</p>{manifest.plans.some(p=>p.key===key)?<button type="button" disabled={busy} onClick={()=>load(key)} className="mt-2 text-blue-700 underline disabled:opacity-50">{t.open}</button>:<p className="mt-2 text-slate-500">{t.empty}</p>}</div>)}</div></div>
   <div><h3 className="font-bold">{t.tour}</h3>{manifest.tour?.panoramas?.length?<div className="mt-3 flex flex-wrap gap-2">{manifest.tour.panoramas.map(p=><button type="button" key={p.id} disabled={busy} onClick={()=>load('PANORAMA',p.id)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{p.name}</button>)}</div>:<p className="mt-2 text-sm text-slate-500">{t.empty}</p>}</div>
   {viewer?<div className="space-y-3">{current?<React.Suspense fallback={<p>{t.load}</p>}><BuyerPanorama url={viewer.url} panorama={current} language={language} onNavigate={id=>{if(manifest.tour.panoramas.some(p=>p.id===id))load('PANORAMA',id);}}/></React.Suspense>:<img src={viewer.url} alt={t[viewer.type]} className="h-auto w-full rounded-xl"/>}<button type="button" onClick={()=>{if(picture.current){URL.revokeObjectURL(picture.current);urls.current.delete(picture.current);picture.current=null;}setViewer(null);}} className="text-sm text-blue-700 underline">{t.close}</button></div>:null}
   <div><h3 className="font-bold">{t.documents}</h3>{manifest.documents.length?<ul className="mt-3 space-y-3">{manifest.documents.map(doc=><li key={doc.id} className="rounded-xl border p-3 text-sm"><p className="font-semibold">{doc.title}</p><p className="mt-1 text-xs text-slate-500">{doc.language==='tj'?'Тоҷикӣ':'Русский'} · v{doc.version} · {doc.isSignedOriginal?t.signed:t.copy}</p>{documentFiles[doc.id]?<div className="mt-2 flex gap-4"><a href={documentFiles[doc.id].url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{t.open}</a><a href={documentFiles[doc.id].url} download={`TOZON-document.${documentFiles[doc.id].extension}`} className="text-blue-700 underline">{t.download}</a></div>:<button type="button" disabled={busy} onClick={()=>load('DOCUMENT',doc.id)} className="mt-2 text-blue-700 underline disabled:opacity-50">{t.open}</button>}</li>)}</ul>:<p className="mt-2 text-sm text-slate-500">{t.empty}</p>}</div>
  </>:null}
 </section>;
}
