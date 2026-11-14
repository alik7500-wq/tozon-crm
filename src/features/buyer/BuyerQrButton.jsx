import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Modal,QRCode} from 'antd';
import {api} from '../../api/client';
import {useAuth} from '../auth/AuthContext';
import {canIssueBuyerQr} from './buyer-permissions';
import {BuyerInquiriesPanel} from './BuyerInquiriesPanel';
import {BuyerDocumentsPanel} from './BuyerDocumentsPanel';
const explanations={
  BUYER_PHONE_REQUIRES_STAFF_VERIFICATION:'Сначала проверьте и заполните телефон покупателя в CRM.',
  BUYER_ACCESS_DENIED:'У Вас нет права подключать покупателя к этому договору.',
  BUYER_CONTRACT_UNAVAILABLE:'QR доступен только для подписанного договора.',
  BUYER_OTP_NOT_CONFIGURED:'SMS-подключение ещё не настроено. Обратитесь к администратору.'
};
export function BuyerQrButton({deal}){
  return import.meta.env.VITE_BUYER_PORTAL_ENABLED==='true'?<BuyerQrControl deal={deal}/>:null;
}
function BuyerQrControl({deal}){
  const {user}=useAuth();
  const [open,setOpen]=useState(false),[invite,setInvite]=useState(null),[status,setStatus]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const qr=useRef(null),generation=useRef(0);
  useEffect(()=>()=>{generation.current++;},[]);
  if(!canIssueBuyerQr(user,deal))return null;
  const issue=async()=>{
    const current=++generation.current;setOpen(true);setBusy(true);setError('');setNotice('');setInvite(null);
    try{
      const [created,binding]=await Promise.all([api.post(`/deals/${deal.id}/buyer-invites`),api.get(`/deals/${deal.id}/buyer-status`)]);
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
    for(const value of ['TOZON — подключение покупателя',deal.lead_name,`Договор №${deal.contract_number||''}`,`${deal.project_name||''} · №${deal.unit_number||''}`,'QR действует 15 минут и используется один раз.']){
      const p=popup.document.createElement('p');p.textContent=value||'';sheet.appendChild(p);
    }
    const image=popup.document.createElement('img');image.width=280;image.height=280;image.alt='QR-код покупателя';
    image.onload=()=>{popup.focus();popup.print();};image.src=canvas.toDataURL('image/png');sheet.appendChild(image);popup.document.body.appendChild(sheet);
  };
  const refresh=async()=>{
    try{setStatus((await api.get(`/deals/${deal.id}/buyer-status`)).data);}catch{setError('Не удалось обновить статус.');}
  };
  return <>
    <button type="button" onClick={issue} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">QR-код покупателя</button>
    {open?createPortal(<Modal open title="QR-код покупателя" onCancel={close} footer={null} zIndex={2000} destroyOnHidden>
      <div className="space-y-4 text-slate-800">
        <dl className="rounded-xl bg-slate-50 p-4 text-sm"><dt className="text-slate-500">Покупатель</dt><dd className="font-semibold">{deal.lead_name}</dd><dt className="mt-2 text-slate-500">Договор / Объект</dt><dd>№{deal.contract_number} · {deal.project_name} · №{deal.unit_number}</dd></dl>
        {busy?<p role="status">Создание QR…</p>:null}
        {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>:null}
        {invite?<><div ref={qr} className="flex justify-center"><QRCode value={invite.url} size={240} type="canvas"/></div><p className="text-center text-xs text-slate-500">Одноразовый QR. Действует до {new Date(invite.expiresAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}.</p>
          <div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg border px-3 py-2" onClick={download}>Скачать QR</button><button type="button" className="rounded-lg border px-3 py-2" onClick={print}>Распечатать</button><button type="button" className="rounded-lg border px-3 py-2" onClick={async()=>{try{await navigator.clipboard.writeText(invite.url);setNotice('Ссылка скопирована.');}catch{setError('Не удалось скопировать ссылку.');}}}>Скопировать ссылку</button></div>
          <p role="status" className="text-sm">{notice}</p></>:null}
        {status?<div className="rounded-xl bg-blue-50 p-3 text-sm"><p className="font-semibold">{status.contractAccess?'Telegram подключён к договору':status.connected?'Telegram подтверждён, этот договор ещё не подключён':'Telegram пока не подключён'}</p>{status.verifiedAt?<p>Подтверждён: {new Date(status.verifiedAt).toLocaleString('ru-RU')}</p>:null}<button type="button" onClick={refresh} className="mt-2 text-blue-700 underline">Обновить статус</button></div>:null}
        {!busy?<button type="button" onClick={issue} className="text-sm text-blue-700 underline">Создать новый QR</button>:null}
        <BuyerDocumentsPanel dealId={deal.id} user={user}/>
        <BuyerInquiriesPanel dealId={deal.id}/>
      </div>
    </Modal>,document.body):null}
  </>;
}
