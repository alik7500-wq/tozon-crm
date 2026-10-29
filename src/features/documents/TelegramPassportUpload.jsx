import React, {useEffect, useRef, useState} from 'react';
import {api} from '../../api/client';

const base='/documents/passport/telegram';
export function TelegramPassportUpload({onResult}) {
  const [session,setSession]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
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
    setBusy(true);setError('');
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
    try{await api.post(`${base}/${session.id}/approve`);setSession(prev=>({...prev,status:'UPLOAD'}));}
    catch{setError('Подключение не подтверждено. Создайте новую сессию.');}
    finally{setBusy(false);}
  };
  return <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
    <h4 className="font-bold">Сфотографировать через Telegram</h4>
    <p className="text-sm">Фото передаётся через Telegram и обрабатывается ИИ. Фотография будет показана рядом с распознанными данными для сверки. Результат нужно проверить перед заполнением договора.</p>
    {!session?<button type="button" disabled={busy} onClick={create} className="rounded-lg bg-blue-600 text-white px-4 py-2">Открыть сканирование через бот</button>:<>
      <a href={session.url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">Открыть Telegram на телефоне</a>
      <p className="text-xs break-all select-all">Можно скопировать ссылку на телефон: {session.url}</p>
      {session.status==='PAIRING'?<div>
        <p>Подключается Telegram: <strong>{session.telegram_name}</strong>. Подтвердите, только если это Ваш аккаунт.</p>
        <button type="button" disabled={busy} onClick={approve} className="bg-blue-600 text-white rounded px-3 py-2">Подтвердить подключение</button>
      </div>:<p className="text-sm">{{PENDING:'Откройте ссылку и нажмите «Запустить» в Telegram.',UPLOAD:'Отправьте фото паспорта в бот и нажмите «Распознать паспорт».',PROCESSING:'Идёт распознавание…',REVIEW:'В боте нажмите «Передать в договор».',READY:'Получаю данные…'}[session.status]||'Ожидаю подключения…'}</p>}
      <button type="button" disabled={busy} onClick={create} className="text-sm underline">Создать новую ссылку</button>
    </>}
    {error&&<p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
