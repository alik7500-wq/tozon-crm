import React,{useEffect,useRef,useState} from 'react';
import {buyerRequest,buyerBlob,buyerPdf} from './buyer-api';
const BuyerPanorama=React.lazy(()=>import('./BuyerPanorama'));
const words={ru:{plans:'Планировки',PLAN_2D:'Планировка 2D',PLAN_3D:'Планировка 3D',empty:'Материал пока не добавлен.',tour:'Тур 360°',documents:'Договор и документы',noDocs:'Подписанный оригинал пока не загружен. Вы можете скачать электронную выписку из CRM ниже.',crmPdfTitle:'Электронные копии из CRM',crmContractPdf:'Выписка по договору (PDF)',crmSchedulePdf:'График рассрочки (PDF)',specs:'Характеристики квартиры',project:'Жилой комплекс',building:'Блок',floor:'Этаж',unit:'Квартира',area:'Площадь',rooms:'Комнаты',contractNo:'Договор №',load:'Загрузка…',error:'Материал недоступен. Обновите кабинет или обратитесь к менеджеру.',open:'Открыть',download:'Скачать',signed:'Подписанный оригинал',copy:'Одобренная копия',close:'Закрыть просмотр'},tj:{plans:'Нақшаҳо',PLAN_2D:'Нақшаи 2D',PLAN_3D:'Нақшаи 3D',empty:'Мавод ҳоло илова нашудааст.',tour:'Сайри 360°',documents:'Шартнома ва ҳуҷҷатҳо',noDocs:'Асли имзошуда ҳоло бор нашудааст. Шумо метавонед нусхаи электрониро аз CRM дар поён боргирӣ кунед.',crmPdfTitle:'Нусхаҳои электронӣ аз CRM',crmContractPdf:'Маълумотномаи шартнома (PDF)',crmSchedulePdf:'Ҷадвали пардохт (PDF)',specs:'Хусусиятҳои хона',project:'Маҷмааи истиқоматӣ',building:'Блок',floor:'Ошёна',unit:'Хона',area:'Масоҳат',rooms:'Ҳуҷраҳо',contractNo:'Шартнома №',load:'Боргирӣ…',error:'Мавод дастрас нест. Кабинетро нав кунед ё ба менеҷер муроҷиат кунед.',open:'Кушодан',download:'Боргирӣ',signed:'Асли имзошуда',copy:'Нусхаи тасдиқшуда',close:'Пӯшидани намоиш'}};
const extension=type=>type==='application/pdf'?'pdf':type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
export default function BuyerMaterials({dealId,initData,language,mode='all',property=null,contractInfo=null}){
 const t=words[language]||words.tj;
 const [manifest,setManifest]=useState(null),[error,setError]=useState(false),[busy,setBusy]=useState(false),[viewer,setViewer]=useState(null),[documentFiles,setDocumentFiles]=useState({}),[generatedPdfs,setGeneratedPdfs]=useState({});
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
  }catch{if(!controller.current.signal.aborted){urls.current.forEach(URL.revokeObjectURL);urls.current.clear();picture.current=null;setViewer(null);setDocumentFiles({});setGeneratedPdfs({});setManifest(null);setError(true);}}
  finally{loading.current=false;if(!controller.current.signal.aborted)setBusy(false);}
 }
 async function loadGeneratedPdf(kind){
  if(loading.current)return;loading.current=true;setBusy(true);setError(false);
  try{
   const blob=await buyerPdf(initData,{dealId,kind,language},{signal:controller.current.signal});if(controller.current.signal.aborted)return;
   const url=URL.createObjectURL(blob);urls.current.add(url);
   setGeneratedPdfs(prev=>({...prev,[kind]:url}));
  }catch{if(!controller.current.signal.aborted)setError(true);}
  finally{loading.current=false;if(!controller.current.signal.aborted)setBusy(false);}
 }
 const current=viewer?.type==='PANORAMA'?manifest?.tour?.panoramas.find(p=>p.id===viewer.id):null;
 const showPlans=mode==='all'||mode==='plans';
 const showDocs=mode==='all'||mode==='documents';
 return <section className="space-y-5">
  {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{t.error}</p>:null}
  {(!manifest&&!error)||busy?<p role="status">{t.load}</p>:null}
  {manifest?<>
   {showPlans&&property?<div className="rounded-xl bg-slate-50 p-3 text-sm space-y-1"><p className="font-semibold text-slate-800">{t.specs}</p><p className="text-slate-600">{[property.projectName,property.buildingName?`${t.building} ${property.buildingName}`:null,property.floorNumber!==null&&property.floorNumber!==undefined?`${t.floor} ${property.floorNumber}`:null,property.unitNumber?`${t.unit} №${property.unitNumber}`:null].filter(Boolean).join(' · ')}</p><p className="text-slate-600">{[property.areaM2x100!==null&&property.areaM2x100!==undefined?`${t.area}: ${(property.areaM2x100/100).toFixed(2)} м²`:null,property.rooms!==null&&property.rooms!==undefined?`${t.rooms}: ${property.rooms}`:null].filter(Boolean).join(' · ')}</p></div>:null}
   {showPlans?<>
    <div><h3 className="font-bold">{t.plans}</h3><div className="mt-3 grid grid-cols-2 gap-2">{['PLAN_2D','PLAN_3D'].map(key=><div key={key} className="rounded-xl border p-3 text-sm"><p className="font-semibold">{t[key]}</p>{manifest.plans.some(p=>p.key===key)?<button type="button" disabled={busy} onClick={()=>load(key)} className="mt-2 text-blue-700 underline disabled:opacity-50">{t.open}</button>:<p className="mt-2 text-slate-500">{t.empty}</p>}</div>)}</div></div>
    <div><h3 className="font-bold">{t.tour}</h3>{manifest.tour?.panoramas?.length?<div className="mt-3 flex flex-wrap gap-2">{manifest.tour.panoramas.map(p=><button type="button" key={p.id} disabled={busy} onClick={()=>load('PANORAMA',p.id)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{p.name}</button>)}</div>:<p className="mt-2 text-sm text-slate-500">{t.empty}</p>}</div>
    {viewer?<div className="space-y-3">{current?<React.Suspense fallback={<p>{t.load}</p>}><BuyerPanorama url={viewer.url} panorama={current} language={language} onNavigate={id=>{if(manifest.tour.panoramas.some(p=>p.id===id))load('PANORAMA',id);}}/></React.Suspense>:<img src={viewer.url} alt={t[viewer.type]} className="h-auto w-full rounded-xl"/>}<button type="button" onClick={()=>{if(picture.current){URL.revokeObjectURL(picture.current);urls.current.delete(picture.current);picture.current=null;}setViewer(null);}} className="text-sm text-blue-700 underline">{t.close}</button></div>:null}
   </>:null}
   {showDocs?<>
    {contractInfo?<div className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold">{t.contractNo}{contractInfo.contractNumber}</p>{contractInfo.contractDate?<p className="text-xs text-slate-500 mt-1">{new Intl.DateTimeFormat('ru-RU').format(new Date(`${contractInfo.contractDate}T12:00:00`))}</p>:null}</div>:null}
    <div><h3 className="font-bold">{t.documents}</h3>{manifest.documents.length?<ul className="mt-3 space-y-3">{manifest.documents.map(doc=><li key={doc.id} className="rounded-xl border p-3 text-sm"><p className="font-semibold">{doc.title}</p><p className="mt-1 text-xs text-slate-500">{doc.language==='tj'?'Тоҷикӣ':'Русский'} · v{doc.version} · {doc.isSignedOriginal?t.signed:t.copy}</p>{documentFiles[doc.id]?<div className="mt-2 flex gap-4"><a href={documentFiles[doc.id].url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{t.open}</a><a href={documentFiles[doc.id].url} download={`TOZON-document.${documentFiles[doc.id].extension}`} className="text-blue-700 underline">{t.download}</a></div>:<button type="button" disabled={busy} onClick={()=>load('DOCUMENT',doc.id)} className="mt-2 text-blue-700 underline disabled:opacity-50">{t.open}</button>}</li>)}</ul>:<p className="mt-2 text-sm text-slate-500">{mode==='documents'?t.noDocs:t.empty}</p>}</div>
    {mode==='documents'?<div className="rounded-xl border border-slate-200 p-3 text-sm space-y-2"><p className="font-semibold">{t.crmPdfTitle}</p><div className="space-y-2">{['CONTRACT',...(contractInfo?.status==='CANCELLED'?[]:['SCHEDULE'])].map(kind=><div key={kind} className="flex flex-wrap items-center justify-between gap-2"><span>{kind==='CONTRACT'?t.crmContractPdf:t.crmSchedulePdf}</span>{generatedPdfs[kind]?<div className="flex gap-3"><a href={generatedPdfs[kind]} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{t.open}</a><a href={generatedPdfs[kind]} download={`TOZON-${kind.toLowerCase()}.pdf`} className="text-blue-700 underline">{t.download}</a></div>:<button type="button" disabled={busy} onClick={()=>loadGeneratedPdf(kind)} className="text-blue-700 underline disabled:opacity-50">{t.download}</button>}</div>)}</div></div>:null}
   </>:null}
  </>:null}
 </section>;
}
