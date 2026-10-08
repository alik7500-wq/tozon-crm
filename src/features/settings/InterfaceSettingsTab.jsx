import React, {useState} from 'react';
const COLORS={blue:['Синий','#2563eb'],emerald:['Зелёный','#059669'],violet:['Фиолетовый','#7c3aed']};
export function applyInterfacePreferences(){
  const key=localStorage.getItem('tozon-accent') || 'blue';
  document.documentElement.style.setProperty('--tozon-accent',COLORS[key]?.[1] || COLORS.blue[1]);
}
export function defaultPrintLanguage(){return localStorage.getItem('tozon-print-language') === 'RU' ? 'RU' : 'TJ';}
export function InterfaceSettingsTab(){
  const [color,setColor]=useState(localStorage.getItem('tozon-accent') || 'blue'),[lang,setLang]=useState(defaultPrintLanguage());
  return <div className="border rounded-2xl bg-white p-5 space-y-5"><h2 className="font-bold">Настройки интерфейса на этом устройстве</h2><label className="block text-sm">Основной цвет<select value={color} className="ml-3 border rounded-lg p-2" onChange={e=>{setColor(e.target.value);localStorage.setItem('tozon-accent',e.target.value);applyInterfacePreferences();}}>{Object.entries(COLORS).map(([k,[name]])=><option key={k} value={k}>{name}</option>)}</select></label><label className="block text-sm">Язык встроенных печатных форм по умолчанию<select className="ml-3 border rounded-lg p-2" value={lang} onChange={e=>{setLang(e.target.value);localStorage.setItem('tozon-print-language',e.target.value);}}><option value="TJ">Тоҷикӣ</option><option value="RU">Русский</option></select></label><p className="text-xs text-slate-500">Изменения сохраняются автоматически в этом браузере. Язык интерфейса CRM остаётся русским.</p></div>;
}
