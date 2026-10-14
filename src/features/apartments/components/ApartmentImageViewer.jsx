import React, {useEffect,useRef} from 'react';
import {useModalDismiss} from '../../../hooks/useModalDismiss';
import {useI18n} from '../../../context/i18nContext';
import {createPortal} from 'react-dom';
export function ApartmentImageViewer({images,index,onNavigate,onClose}) {
 const {lang}=useI18n();
 const ref=useRef(null);
 useModalDismiss({isOpen:true,onClose});
 useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
 const move=n=>onNavigate((n+images.length)%images.length);
 return createPortal(<dialog ref={ref} aria-label={lang === 'tg' ? 'Тасвирҳои манзил' : 'Изображения квартиры'} onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>{e.stopPropagation();if(e.key==='ArrowRight')move(index+1);if(e.key==='ArrowLeft')move(index-1);}} className="m-0 w-screen h-dvh max-w-none max-h-none border-0 bg-white p-4 backdrop:bg-slate-700/50">
 <div className="flex h-full flex-col gap-3">
 <div className="flex items-center justify-between"><span>{images[index]?.title} · {index+1} / {images.length}</span><button autoFocus type="button" onClick={onClose} className="rounded-xl border px-4 py-2" aria-label={lang === 'tg' ? 'Пӯшидани тасвир' : 'Закрыть изображение'}>{lang === 'tg' ? 'Пӯшидан ×' : 'Закрыть ×'}</button></div>
 <img src={images[index]?.url} alt={images[index]?.title || 'Квартира'} className="min-h-0 flex-1 w-full object-contain" />
 {images.length>1&&<div className="flex justify-center gap-4"><button type="button" onClick={()=>move(index-1)} className="border rounded-xl px-4 py-2">{lang === 'tg' ? '← Пешина' : '← Предыдущее'}</button><button type="button" onClick={()=>move(index+1)} className="border rounded-xl px-4 py-2">{lang === 'tg' ? 'Баъдӣ →' : 'Следующее →'}</button></div>}
 </div></dialog>,document.body);
}
