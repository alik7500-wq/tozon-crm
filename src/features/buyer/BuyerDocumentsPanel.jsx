import React,{useEffect,useRef,useState} from 'react';
import {api} from '../../api/client';
export function BuyerDocumentsPanel({dealId,user}){
 const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [title,setTitle]=useState(''),[kind,setKind]=useState('CONTRACT'),[language,setLanguage]=useState('tj'),[signed,setSigned]=useState(false),[file,setFile]=useState(null),[review,setReview]=useState(null);
 const base=`/deals/${dealId}/buyer-documents`,leader=['ADMIN','DIRECTOR'].includes(user.role);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let live=true;api.get(base).then(r=>{if(!Array.isArray(r.data))throw new Error();if(live)setRows(r.data);}).catch(()=>{if(live)setError('Не удалось загрузить документы.');});return()=>{live=false;};},[base]);
 useEffect(()=>()=>{if(review?.url)URL.revokeObjectURL(review.url);},[review]);
 const reload=async()=>{const r=await api.get(base);if(!Array.isArray(r.data))throw new Error();setRows(r.data);};
 async function upload(e){
  e.preventDefault();if(!file||busy)return;
  if(file.size>12*1024*1024){setError('Максимальный размер файла — 12 МБ.');return;}
  setBusy(true);setError('');
  try{const form=new FormData();form.append('file',file);form.append('title',title);form.append('kind',kind);form.append('language',language);form.append('isSignedOriginal',String(signed));
   await api.post(base,form,{headers:{'Content-Type':'multipart/form-data'}});await reload();setFile(null);setTitle('');e.target.querySelector('input[type=file]').value='';
  }catch{setError('Не удалось загрузить документ. Допустимы PDF, PNG и JPEG.');}finally{setBusy(false);}
 }
 async function action(id,value){
  setBusy(true);setError('');try{await api.post(`${base}/${id}/action`,{action:value});await reload();}catch{setError('Не удалось изменить доступ к документу.');}finally{setBusy(false);}
 }
 async function preview(id){
  setBusy(true);setError('');try{const r=await api.post(`${base}/${id}/file`,{}, {responseType:'blob'});if(!mounted.current)return;const blob=r instanceof Blob?r:r.data;setReview({id,url:URL.createObjectURL(blob)});}catch{if(mounted.current)setError('Не удалось открыть файл для проверки.');}finally{if(mounted.current)setBusy(false);}
 }
 return <section className="space-y-4 border-t pt-4">
  <h3 className="font-bold">Документы покупателя</h3><p className="text-xs text-slate-500">Загрузите сохранённый файл. После проверки руководитель отдельно разрешает показ покупателю.</p>
  {error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}
  <form onSubmit={upload} className="space-y-3 rounded-xl bg-slate-50 p-3 text-sm">
   <label className="block">Название<input required maxLength={150} value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
   <div className="flex gap-2"><label className="flex-1">Вид<select value={kind} onChange={e=>setKind(e.target.value)} className="mt-1 w-full rounded border p-2">{[['CONTRACT','Договор'],['SCHEDULE','График'],['ACT','Акт'],['APPENDIX','Приложение'],['OTHER','Другой']].map(([v,t])=><option value={v} key={v}>{t}</option>)}</select></label><label>Язык<select value={language} onChange={e=>setLanguage(e.target.value)} className="mt-1 block rounded border p-2"><option value="tj">Тоҷикӣ</option><option value="ru">Русский</option></select></label></div>
   <label className="flex items-center gap-2"><input type="checkbox" checked={signed} onChange={e=>setSigned(e.target.checked)}/>Подписанный оригинал</label>
   <label className="block">Файл PDF, PNG или JPEG<input required type="file" accept="application/pdf,image/png,image/jpeg" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-1 block max-w-full"/></label>
   <button type="submit" disabled={busy||!file} className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-50">Загрузить для проверки</button>
  </form>
  <ul className="space-y-3 text-sm">{rows.map(doc=><li key={doc.id} className="rounded-xl border p-3"><p className="font-semibold">{doc.title}</p><p className="text-xs text-slate-500">v{doc.version} · {doc.is_signed_original?'Подписанный оригинал':'Копия'} · {doc.status==='PUBLISHED'?'Доступен покупателю':doc.status==='REVOKED'?'Доступ отозван':'Ожидает проверки'}</p><div className="mt-2 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={()=>preview(doc.id)} className="text-blue-700 underline">Проверить файл</button>{review?.id===doc.id?<a href={review.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Открыть файл</a>:null}{leader&&doc.status==='DRAFT'?<button type="button" disabled={busy} onClick={()=>action(doc.id,'PUBLISH')} className="text-emerald-700 underline">Разрешить показ покупателю</button>:null}{leader&&doc.status!=='REVOKED'?<button type="button" disabled={busy} onClick={()=>action(doc.id,'REVOKE')} className="text-red-700 underline">Отозвать доступ</button>:null}</div></li>)}</ul>
 </section>;
}
