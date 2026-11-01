import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../../api/client';
const sections={ '/':'Обзор', '/leads':'Лиды', '/clients':'Клиенты', '/deals':'Сделки', '/projects':'Объекты ЖК', '/units':'Квартиры', '/apartments':'Квартиры', '/payments':'Платежи', '/finance':'Финансы', '/costs':'Себестоимость', '/construction':'Строительный учёт', '/analytics':'Аналитика', '/tasks':'Задачи', '/users':'Пользователи', '/settings':'Настройки', '/automation':'Автоматизация', '/notifications':'Уведомления', '/activity':'Активность сотрудников', '/crm':'CRM' };
export function useActivityTracking(userId, pathname) {
 useEffect(()=>{
  if(!userId)return;
  const beat=()=>{if(document.visibilityState==='visible')void api.post('/auth/activity/heartbeat',{section:sections['/'+pathname.split('/').filter(Boolean)[0]] || 'Обзор'}).catch(()=>{});};
  beat();const timer=setInterval(beat,60000);document.addEventListener('visibilitychange',beat);window.addEventListener('focus',beat);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',beat);window.removeEventListener('focus',beat)};
 },[userId,pathname]);
}
export function ActivityCounter(){
 const [count,setCount]=useState(null);
 useEffect(()=>{let alive=true;const refresh=async()=>{if(document.visibilityState!=='visible')return;try{const r=await api.get('/auth/activity',{params:{limit:1}});if(alive)setCount(r.data.online_count)}catch{if(alive)setCount(null)}};void refresh();const timer=setInterval(refresh,30000);return()=>{alive=false;clearInterval(timer)}},[]);
 return <NavLink to="/activity" title="Кто в CRM: активность за последние 2 минуты" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-500"/>В CRM: {count===null?'—':count}</NavLink>;
}
