import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Modal,QRCode} from 'antd';
import {api} from '../../api/client';
import {useAuth} from '../auth/AuthContext';
import {canIssueBuyerQr} from './buyer-permissions';
import {BuyerParticipantsPanel} from './BuyerParticipantsPanel';
import {BuyerNoticesPanel} from './BuyerNoticesPanel';
import {BuyerInquiriesPanel} from './BuyerInquiriesPanel';
import {BuyerDocumentsPanel} from './BuyerDocumentsPanel';
const explanations={
  BUYER_PHONE_REQUIRES_STAFF_VERIFICATION:'Сначала проверьте и заполните телефон покупателя в CRM.',
  BUYER_ACCESS_DENIED:'У Вас нет права подключать покупателя к этому договору.',
  BUYER_CONTRACT_UNAVAILABLE:'QR доступен только для подписанного договора.',
  BUYER_OTP_NOT_CONFIGURED:'SMS-подключение ещё не настроено. Обратитесь к администратору.'
};
export function BuyerQrButton({deal}){
  return import.meta.env.VITE_BUYER_PORTAL_ENABLED==='true'?<BuyerQrControl key={deal.id} deal={deal}/>:null;
}
function BuyerQrControl({deal}){
  const {user}=useAuth();
  const [open,setOpen]=useState(false),[invite,setInvite]=useState(null),[status,setStatus]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [person,setPerson]=useState({id:null,name:deal.lead_name});
  const qr=useRef(null),generation=useRef(0);
  useEffect(()=>()=>{generation.current++;},[]);
  if(!['SIGNED','CANCELLED'].includes(deal.status)||!canIssueBuyerQr(user,{...deal,status:'SIGNED'}))return null;
  const issue=async(participantId=null,name=deal.lead_name)=>{
    const current=++generation.current;setOpen(true);setBusy(true);setError('');setNotice('');setInvite(null);setPerson({id:participantId,name});
    try{
      const [created,binding]=await Promise.all([deal.status==='SIGNED'?(participantId?api.post(`/deals/${deal.id}/buyer-invites`,{participantId}):api.post(`/deals/${deal.id}/buyer-invites`)):Promise.resolve({data:null}),api.get(`/deals/${deal.id}/buyer-status${participantId?`?participantId=${participantId}`:''}`)]);
      if(current!==generation.current)return;
      setInvite(created.data);setStatus(binding.data);
    }catch(e){if(current===generation.current)setError(explanations[e.message]||'Подключение покупателя недоступно. Повторите позже.');}
    finally{if(current===generation.current)setBusy(false);}
  };
  const close=()=>{generation.current++;setOpen(false);setInvite(null);setBusy(false);};
  const download=()=>{
    const canvas=qr.current?.querySelector('canvas');if(!canvas)return;
    const link=document.createElement('a');link.download='TOZON-buyer-QR.png';link.href=canvas.toDataURL('image/png');link.click();
  };
  const print=()=>{
    const canvas=qr.current?.querySelector('canvas');if(!canvas)return;
    const popup=window.open('','_blank','width=560,height=760');
    if(!popup){setError('Разрешите открытие окна для печати.');return;}
    popup.opener=null;popup.document.title='TOZON — QR покупателя';
    const sheet=popup.document.createElement('main');sheet.style.cssText='font:18px system-ui;text-align:center;padding:40px';
    for(const value of ['TOZON — подключение покупателя',person.name,`Договор №${deal.contract_number||''}`,`${deal.project_name||''} · №${deal.unit_number||''}`,'QR действует 15 минут и используется один раз.']){
      const p=popup.document.createElement('p');p.textContent=value||'';sheet.appendChild(p);
    }
    const image=popup.document.createElement('img');image.width=280;image.height=280;image.alt='QR-код покупателя';
    image.onload=()=>{popup.focus();popup.print();};image.src=canvas.toDataURL('image/png');sheet.appendChild(image);popup.document.body.appendChild(sheet);
  };
  const refresh=async()=>{
    try{setStatus((await api.get(`/deals/${deal.id}/buyer-status${person.id?`?participantId=${person.id}`:''}`)).data);}catch{setError('Не удалось обновить статус.');}
  };
  return <>
    <button type="button" onClick={()=>issue()} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">{deal.status==='SIGNED'?'QR-код покупателя':'Доступ к архиву договора'}</button>
    {open?createPortal(<Modal open title="QR-код покупателя" onCancel={close} footer={null} zIndex={2000} destroyOnHidden>
      <div className="space-y-4 text-slate-800">
        <dl className="rounded-xl bg-slate-50 p-4 text-sm"><dt className="text-slate-500">Покупатель</dt><dd className="font-semibold">{person.name}</dd><dt className="mt-2 text-slate-500">Договор / Объект</dt><dd>№{deal.contract_number} · {deal.project_name} · №{deal.unit_number}</dd></dl>
        {busy?<p role="status">Создание QR…</p>:null}
        {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>:null}
        {invite?<><div ref={qr} className="flex justify-center"><QRCode value={invite.url} size={240} type="canvas"/></div><p className="text-center text-xs text-slate-500">Одноразовый QR. Действует до {new Date(invite.expiresAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}.</p>
          <div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg border px-3 py-2" onClick={download}>Скачать QR</button><button type="button" className="rounded-lg border px-3 py-2" onClick={print}>Распечатать</button><button type="button" className="rounded-lg border px-3 py-2" onClick={async()=>{try{await navigator.clipboard.writeText(invite.url);setNotice('Ссылка скопирована.');}catch{setError('Не удалось скопировать ссылку.');}}}>Скопировать ссылку</button></div>
          <p role="status" className="text-sm">{notice}</p></>:null}
        {status?<div className="rounded-xl bg-blue-50 p-3 text-sm"><p className="font-semibold">{status.archived?'Telegram подключён к архиву договора':status.contractAccess?'Telegram подключён к договору':status.connected?'Telegram подтверждён, этот договор ещё не подключён':'Telegram пока не подключён'}</p>{status.lastActiveAt?<p>Последняя активность: {new Date(status.lastActiveAt).toLocaleString('ru-RU')}</p>:null}{status.verifiedAt?<p>Подтверждён: {new Date(status.verifiedAt).toLocaleString('ru-RU')}</p>:null}{status.contractCount!==undefined?<p>Связанных договоров: {status.contractCount}</p>:null}<button type="button" onClick={refresh} className="mt-2 text-blue-700 underline">Обновить статус</button></div>:null}
        {!busy&&deal.status==='SIGNED'?<button type="button" onClick={()=>issue(person.id,person.name)} className="text-sm text-blue-700 underline">Создать новый QR</button>:null}
        {person.id&&deal.status==='SIGNED'?<button type="button" disabled={busy} onClick={()=>issue()} className="text-sm text-blue-700 underline">QR основного покупателя</button>:null}
        <BuyerParticipantsPanel key={deal.id} deal={deal} user={user} onInvite={issue} onRevoked={id=>{if(person.id===id){setInvite(null);setStatus(null);}}}/>
        {['ADMIN','DIRECTOR'].includes(user.role)&&!person.id&&status?.connected?<button type="button" disabled={busy} className="text-sm text-red-700 underline" onClick={async()=>{setBusy(true);try{await api.post(`/deals/${deal.id}/buyer-unlink`);await refresh();setInvite(null);}catch{setError('Не удалось отключить Telegram.');}finally{setBusy(false);}}}>Отключить Telegram покупателя по всем его договорам</button>:null}
        <BuyerNoticesPanel key={`notices-${deal.id}`} dealId={deal.id}/>
        <BuyerDocumentsPanel dealId={deal.id} user={user} archived={deal.status==='CANCELLED'}/>
        {deal.status==='SIGNED'?<BuyerInquiriesPanel dealId={deal.id}/>:null}
      </div>
    </Modal>,document.body):null}
  </>;
}
