import {QRCode} from 'antd';
import React, {useEffect, useRef, useState} from 'react';
import {api} from '../../api/client';

const base='/documents/passport/telegram';
export function TelegramPassportUpload({onResult}) {
  const [session,setSession]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const active=useRef(null),resultHandler=useRef(onResult);
  resultHandler.current=onResult;
  useEffect(()=>()=>{const id=active.current;active.current=null;if(id)void api.delete(`${base}/${id}`).catch(()=>{});},[]);
  useEffect(()=>{
    if(!session?.id)return;
    let stopped=false,timer;
    const poll=async()=>{
      try{
        const response=await api.get(`${base}/${session.id}`);
        const data=response.data?.data||response.data;
        if(stopped||active.current!==session.id)return;
        setSession(prev=>({...prev,...data}));
        if(data.status==='READY'&&data.result){
          const previews=[];
          try {
            for(let index=0;index<(data.image_count||0);index++) {
              const response=await api.get(`${base}/${session.id}/images/${index}`,{responseType:'blob'});
              const blob=response instanceof Blob?response:response.data;
              previews.push({id:`telegram-${index}`,label:`Страница ${index+1}`,file:null,previewUrl:URL.createObjectURL(blob)});
            }
            if(stopped){previews.forEach(p=>URL.revokeObjectURL(p.previewUrl));return;}
            await api.post(`${base}/${session.id}/consume`);
          if(stopped){previews.forEach(p=>URL.revokeObjectURL(p.previewUrl));return;}
            active.current=null;resultHandler.current(data.result,previews);return;
          } catch(error) {previews.forEach(p=>URL.revokeObjectURL(p.previewUrl));throw error;}
        }
      }catch{if(!stopped)setError('Сессия недоступна или истекла. Создайте новую.');return;}
      if(!stopped)timer=setTimeout(poll,3000);
    };
    void poll();return()=>{stopped=true;clearTimeout(timer);};
  },[session?.id]);
  const create=async()=>{
    setBusy(true);setError('');setSent(false);
    try{
      if(active.current)await api.delete(`${base}/${active.current}`);
      const response=await api.post(base);
      const data=response.data?.data||response.data;
      active.current=data.id;setSession(data);
    }catch{setError('Не удалось создать сессию. Проверьте доступ или обратитесь к администратору.');}
    finally{setBusy(false);}
  };
  const approve=async()=>{
    setBusy(true);
    try{await api.post(`${base}/${session.id}/approve`);setSession(prev=>({...prev,status:'UPLOAD',linked:true}));}
    catch{setError('Подключение не подтверждено. Создайте новую сессию.');}
    finally{setBusy(false);}
  };
  const sendLink=async()=>{
    setBusy(true);setError('');
    try{await api.post(`${base}/${session.id}/send`,{url:session.url});setSent(true);}
    catch{setError('Не удалось отправить. Откройте бот по QR-коду.');}
    finally{setBusy(false);}
  };
  return <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
    <h4 className="font-bold mb-2">Сфотографировать паспорт телефоном</h4>
    {!session?<>
      <p className="text-sm mb-3">Откройте бот по QR-коду или получите запрос в своём Telegram.</p>
      <button type="button" disabled={busy} onClick={create} className="rounded-lg bg-blue-600 text-white px-4 py-2">Сканировать через Telegram</button>
    </>:<div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
      <div className="bg-white rounded-xl p-3 shrink-0 text-center">
        <QRCode value={session.url} size={160} bordered={false} errorLevel="M" />
        <p className="text-xs mt-1 text-slate-600">Наведите камеру телефона</p>
      </div>
      <div className="space-y-3 flex-1">
        <p className="text-sm">1. Откройте бот. 2. Сфотографируйте паспорт. 3. Нажмите «Распознать».</p>
        {session.linked&&<>
          <p className="text-sm">Ваш Telegram: <strong>{session.telegram_name||'подключён'}</strong></p>
          <button type="button" disabled={busy||sent||session.status!=='UPLOAD'} onClick={sendLink} className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-60">{sent?'✓ Запрос отправлен в Telegram':'Отправить запрос в мой Telegram'}</button>
        </>}
        <div><a href={session.url} target="_blank" rel="noreferrer" className="text-blue-700 font-semibold underline">Открыть бот на этом устройстве</a></div>
        {session.status==='PAIRING'?<div className="rounded-lg bg-white p-3">
          <p className="text-sm mb-2">Первое подключение: <strong>{session.telegram_name}</strong>. Подтвердите, что это Ваш аккаунт.</p>
          <button type="button" disabled={busy} onClick={approve} className="bg-blue-600 text-white rounded px-3 py-2">Подключить мой Telegram</button>
        </div>:<p role="status" className="text-sm font-medium">{{PENDING:'Сканируйте QR-код и нажмите «Запустить» в боте.',UPLOAD:'Ожидаю фотографии паспорта в боте.',PROCESSING:'Распознаю паспорт…',REVIEW:'В боте нажмите «Передать в договор».',READY:'Загружаю фотографии и данные…'}[session.status]||'Ожидаю подключения…'}</p>}
        <button type="button" disabled={busy} onClick={create} className="text-xs underline text-slate-600">Обновить QR-код</button>
        <p className="text-xs text-slate-500">Ссылка действует 15 минут. Фото обрабатывается через Telegram и ИИ; перед заполнением договора проверьте данные.</p>
      </div>
    </div>}
    {error&&<p role="alert" className="text-red-700 mt-3">{error}</p>}
  </section>;
}
