import React,{useEffect,useState} from 'react';
import {Menu,X,LogOut,ChevronRight,ShieldCheck} from 'lucide-react';
import {TozonLogo} from '../../components/TozonLogo';

export default function ProjectShell({user,logout,groups,current,onNavigate,project,projects,onProjectChange,disabled=false,children}){
 const [open,setOpen]=useState(false);
 const scoped=user?.permissions?.includes('company.project-only');
 useEffect(()=>{if(!open)return;const close=e=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[open]);
 return <div className="min-h-screen bg-[#f7f9fc] text-slate-900" inert={disabled||undefined}>
  {open&&<button type="button" aria-label="Закрыть меню" onClick={()=>setOpen(false)} className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"/>}
  <aside id="project-navigation" aria-label="Боковое меню CRM" className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform motion-reduce:transition-none md:visible md:translate-x-0 ${open?'visible translate-x-0':'invisible -translate-x-full'}`}>
   <div className="flex h-24 shrink-0 items-center justify-between border-b px-5"><TozonLogo size="lg"/><button type="button" aria-label="Свернуть меню" onClick={()=>setOpen(false)} className="rounded-lg p-2 md:hidden"><X size={20}/></button></div>
   <nav aria-label="Разделы проекта" className="flex-1 overflow-y-auto px-3 py-5 space-y-5">{groups.map(group=><div key={group.label} className="space-y-1">{group.label&&<p className="px-4 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{group.label}</p>}{group.items.map(item=><button key={item.id} type="button" disabled={disabled} aria-pressed={current===item.id} onClick={()=>{onNavigate?.(item.id);setOpen(false);}} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${current===item.id?'bg-[#3154f5] text-white shadow-sm':'text-slate-600 hover:bg-slate-50 hover:text-blue-700'}`}><item.icon size={20} className="shrink-0"/>{item.label}</button>)}</div>)}</nav>
   <div className="shrink-0 border-t p-3"><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">{user?.name?.slice(0,1)||'T'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user?.name}</p><p className="mt-1 flex items-center gap-1 text-xs text-blue-600"><ShieldCheck size={13}/>{scoped?'Доступ к проекту':'Администратор компании'}</p></div><button type="button" disabled={disabled} aria-label="Выйти" title="Выйти" onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-600"><LogOut size={19}/></button></div></div>
  </aside>
  <div className="min-w-0 md:pl-72">
   <header className="sticky top-0 z-20 flex min-h-24 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-7">
    <div className="flex items-center gap-3"><button type="button" disabled={disabled} aria-label="Открыть меню" aria-expanded={open} aria-controls="project-navigation" onClick={()=>setOpen(true)} className="rounded-xl border p-2 md:hidden"><Menu size={20}/></button><div><p className="flex items-center gap-2 text-xs text-slate-400">TOZON CRM <ChevronRight size={12}/>{scoped?'Рабочий проект':'Настройки компании'}</p><p className="mt-1 font-bold">{project?.name||(scoped?'Выбор проекта':'Проекты и доступы')}</p></div></div>
    <div className="flex flex-wrap items-center gap-3">{project&&<label className="text-xs text-slate-500"><span className="sr-only">Проект</span><select aria-label="Рабочий проект" disabled={disabled} value={project.id} onChange={e=>onProjectChange(e.target.value)} className="max-w-64 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">{projects.map(p=><option key={p.id} value={p.id}>{p.name} · {p.location}</option>)}</select></label>}<span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Тестовая среда</span></div>
   </header>
   <main className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-7">{children}</main>
  </div>
 </div>;
}
