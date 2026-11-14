import React,{useEffect,useState} from 'react';
import {api} from '../../api/client';
const kinds={PAYMENT:'Оплата',PAYMENT_VOIDED:'Аннулирование оплаты',DOCUMENT:'Документ',SCHEDULE_CHANGED:'Изменение графика',TERMS_CHANGED:'Изменение договора',REMINDER_7:'За 7 дней',REMINDER_3:'За 3 дня',REMINDER_0:'День платежа',OVERDUE:'Просрочка',INQUIRY_REPLY:'Ответ менеджера'};
const states={PENDING:'В очереди',SENDING:'Отправляется',SENT:'Отправлено',CANCELLED:'Отменено',FAILED:'Ошибка отправки',UNKNOWN:'Доставка не подтверждена'};
export function BuyerNoticesPanel({dealId}){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;api.get(`/deals/${dealId}/buyer-notices`).then(r=>{if(!Array.isArray(r.data))throw new Error();if(live){setRows(r.data);setError('');}}).catch(()=>{if(live){setRows([]);setError('Не удалось загрузить журнал уведомлений.');}});return()=>{live=false;};},[dealId,revision]);
 return <section className="space-y-3 border-t pt-4"><div className="flex justify-between gap-3"><h3 className="font-bold">Уведомления покупателю</h3><button type="button" onClick={()=>setRevision(n=>n+1)} className="text-sm text-blue-700 underline">Обновить журнал</button></div>{error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}{rows.length?<ul className="space-y-2 text-sm">{rows.map(row=><li key={row.id} className="rounded-lg border p-3"><p>{kinds[row.kind]||'Уведомление'} · {row.audience==='OWNER'?'Основной покупатель':'Участник'}</p><p className="text-slate-500">{states[row.status]||'Статус неизвестен'} · {new Date(row.finishedAt||row.createdAt).toLocaleString('ru-RU')}</p></li>)}</ul>:<p className="text-sm text-slate-500">Уведомлений пока нет.</p>}</section>;
}
