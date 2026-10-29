import {useEffect,useState} from 'react';
import {environment} from '../api/environment';
export default function StartupGate({children}) {
 const [state,setState]=useState('checking');
 useEffect(()=>{
  const controller=new AbortController();
  fetch(environment.apiUrl+'/health',{signal:controller.signal})
   .then(r=>r.ok?r.json():Promise.reject(new Error('unavailable')))
   .then(data=>setState(data.crmReady===true?'ready':'setup'))
   .catch(error=>{if(error.name!=='AbortError')setState('unavailable');});
  return ()=>controller.abort();
 },[]);
 if(state==='ready')return children;
 return <main className="min-h-screen grid place-items-center bg-slate-100 p-6"><section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-sm border border-slate-200"><p className="text-sm font-semibold text-blue-700">ТЕСТОВАЯ СРЕДА</p><h1 className="mt-3 text-3xl font-bold text-slate-900">TOZON CRM</h1><p role="status" className="mt-5 text-slate-700">{state==='checking'?'Подключаемся к тестовой системе…':state==='setup'?'Среда создана. Подключение базы ещё настраивается.':'Тестовый сервер пока недоступен. При первом запуске подключение может занять немного времени.'}</p><p className="mt-4 text-sm text-slate-500">Здесь будет отдельная CRM с демонстрационными данными.</p><button className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white" onClick={()=>window.location.reload()}>Проверить подключение</button></section></main>;
}
