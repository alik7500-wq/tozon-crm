import React,{useEffect,useRef,useState} from 'react';
import {api} from '../../api/client';
export default function ProjectReminderSettings({projectId}){
 const [result,setResult]=useState(null),[draft,setDraft]=useState(null),[error,setError]=useState(''),[saving,setSaving]=useState(false),[reload,setReload]=useState(0),[message,setMessage]=useState('');const lock=useRef(false);
 const key=JSON.stringify([projectId,reload]);
 useEffect(()=>{let active=true;const c=new AbortController();const [id]=JSON.parse(key);api.get(`/company-projects/${id}/reminders`,{signal:c.signal}).then(r=>{if(active){setResult({key});setDraft({...r.data.settings,backlog_from:r.data.settings.backlog_from||''});setError('');}}).catch(e=>{if(active){setResult({key,error:e.message});setDraft(null);}});return()=>{active=false;c.abort();};},[key]);
 async function save(){if(lock.current)return;if(draft.lead_days===''||!Number.isInteger(Number(draft.lead_days))||Number(draft.lead_days)<0||Number(draft.lead_days)>30){setError('Укажите целое число дней от 0 до 30');return;}lock.current=true;setSaving(true);setError('');setMessage('');try{const r=await api.put(`/company-projects/${projectId}/reminders`,{revision:draft.revision,enabled:draft.enabled,lead_days:Number(draft.lead_days),backlog_from:draft.backlog_from||null});setDraft({...r.data.settings,backlog_from:r.data.settings.backlog_from||''});setMessage('Настройки внутренних напоминаний сохранены. Внешние отправки не включались.');}catch(e){setError(e.message);}finally{lock.current=false;setSaving(false);}}
 const current=result?.key===key;
 return <section aria-label="Напоминания проекта" className="lg:col-start-2 rounded-2xl border bg-white p-5 space-y-4"><h3 className="font-bold">Внутренние напоминания о платежах</h3><p className="text-sm text-slate-500">Только сотрудникам этого проекта с доступом к договорам и платежам. SMS, Telegram и Google Sheets здесь не включаются.</p>
 {!current?<p role="status">Загрузка настроек напоминаний…</p>:result.error?<p role="alert">{result.error}</p>:draft&&<fieldset disabled={saving} className="space-y-3">
 <label className="flex gap-3 text-sm"><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>Включить внутренние напоминания этого проекта</label>
 <label className="block text-sm">За сколько дней до платежа<input aria-label="Дней до платежа" className="mt-1 block w-full rounded-lg border p-2" type="number" min="0" max="30" value={draft.lead_days} onChange={e=>setDraft({...draft,lead_days:e.target.value})}/></label>
 <label className="block text-sm">Учитывать задолженность начиная с даты<input aria-label="Начальная дата напоминаний" className="mt-1 block w-full rounded-lg border p-2" type="date" value={draft.backlog_from} onChange={e=>setDraft({...draft,backlog_from:e.target.value})}/></label>
 <p className="text-xs text-slate-500">Выберите дату начала, чтобы не создавать напоминания по всей старой задолженности. После оплаты или закрытия договора напоминание перестанет отображаться.</p>
 <button type="button" disabled={draft.enabled&&!draft.backlog_from} onClick={save} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-40">{saving?'Сохранение…':'Сохранить напоминания'}</button></fieldset>}
 <button type="button" disabled={saving} onClick={()=>{setReload(n=>n+1);setMessage('');}} className="text-sm font-bold text-blue-600">Обновить настройки напоминаний</button>
 {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}{message&&<p role="status" className="text-sm text-emerald-700">{message}</p>}
 </section>;
}
