import React,{useState} from 'react';
import useWorkspaceRead from './useWorkspaceRead';
const kinds={leads:{label:'Клиенты и лиды',prefix:'Контакт: ',detail:'Телефон'},deals:{label:'Договоры',prefix:'Договор №',detail:'Дата договора'},units:{label:'Помещения',prefix:'Помещение №',detail:'ЖК'}};
const statuses={AVAILABLE:'Свободно',RESERVED:'Забронировано',SOLD:'Продано',BLOCKED:'Недоступно',SIGNED:'Подписан',DRAFT:'Черновик',CANCELLED:'Отменён',TERMINATED:'Расторгнут',NEW:'Новый',WON:'Клиент',LOST:'Закрыт'};
export default function WorkspaceSearch({project,version,canDocuments=false,onDocument}){
 const [input,setInput]=useState(''),[query,setQuery]=useState(''),[reload,setReload]=useState(0),[selected,setSelected]=useState(null),[validation,setValidation]=useState('');
 const search=useWorkspaceRead(query?`/project-workspace/${project}/search`:null,{q:query},`${version}:${reload}`);
 const preview=useWorkspaceRead(selected?`/project-workspace/${project}/search/${selected.resource}/${selected.id}`:null,{},`${version}:${reload}`);
 function clear(){setInput('');setQuery('');setSelected(null);setValidation('');}
 function submit(e){e.preventDefault();const q=input.trim();setSelected(null);if((q.length<2&&!/^[0-9]$/.test(q))||q.length>100||[...q].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)){setQuery('');setValidation('Введите от 2 до 100 символов или одну цифру номера.');return;}setValidation('');setQuery(q);setReload(n=>n+1);}
 const groups=(search.data?.groups||[]).filter(g=>Object.hasOwn(kinds,g.resource)),record=preview.data?.record;
 return <section aria-label="Поиск в выбранном проекте" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
  <form role="search" aria-label="Поиск в проекте" onSubmit={submit} className="flex flex-wrap items-end gap-3">
   <label className="min-w-48 flex-1 text-sm font-semibold">Поиск в проекте<input type="search" aria-label="ФИО, телефон, номер договора или помещения" placeholder="ФИО, телефон, номер договора или помещения" maxLength={100} value={input} onChange={e=>{setInput(e.target.value);setQuery('');setSelected(null);setValidation('');}} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3"/></label>
   <button type="submit" disabled={search.loading} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Найти в проекте</button>
   {(input||query)&&<button type="button" onClick={clear} className="px-2 py-3 text-sm font-bold text-slate-500">Очистить поиск</button>}
  </form>
  <p className="text-xs text-slate-500">Поиск только в доступных Вам разделах выбранного проекта. Для ФИО и телефона — минимум 2 символа; для номера достаточно одной цифры.</p>
  {validation&&<p role="alert" className="text-sm text-rose-700">{validation}</p>}
  {query&&(search.loading?<p role="status">Поиск в выбранном проекте…</p>:search.error?<p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-700">{search.error}</p>:search.data&&<>
   <p className="text-sm text-slate-500">Результаты по запросу: «{query}»</p>
   {!groups.some(g=>g.records.length)?<p>Совпадений в доступных разделах проекта нет.</p>:<div className="grid gap-4 lg:grid-cols-3">{groups.map(group=><section key={group.resource} aria-label={`Результаты: ${kinds[group.resource].label}`} className="rounded-xl border p-4"><h3 className="font-bold">{kinds[group.resource].label}</h3>{!group.records.length?<p className="mt-3 text-sm text-slate-500">Совпадений нет.</p>:<ul className="mt-3 space-y-2">{group.records.map(r=><li key={r.id}><button type="button" onClick={()=>setSelected({resource:group.resource,id:r.id})} className="w-full rounded-lg bg-slate-50 p-3 text-left hover:bg-blue-50"><span className="block text-sm font-semibold text-blue-700">{kinds[group.resource].prefix}{r.title||`ID ${r.id}`}</span>{r.subtitle&&<span className="mt-1 block break-words text-xs text-slate-500">{r.subtitle}</span>}</button></li>)}</ul>}{group.has_more&&<p className="mt-3 text-xs text-amber-700">Показаны первые 10 совпадений. Уточните запрос.</p>}</section>)}</div>}
   {selected&&<section aria-label="Найденная запись" className="space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">Найденная запись</h3><button type="button" onClick={()=>setSelected(null)} className="text-sm font-bold text-blue-600">Закрыть запись</button></div>{preview.loading?<p role="status">Проверка доступа к записи…</p>:preview.error?<p role="alert" className="text-sm text-rose-700">{preview.error}</p>:record&&<><p className="font-semibold">{kinds[selected.resource].prefix}{record.title||`ID ${record.id}`}</p><p className="text-sm">{kinds[selected.resource].detail}: {record.subtitle||'Не указано'}</p><p className="text-sm">Статус: {statuses[record.status]||record.status||'Не указан'}</p>{canDocuments&&selected.resource==='deals'&&<button type="button" onClick={()=>onDocument?.(record.id)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Документы найденного договора</button>}</>}</section>}
  </>)}
 </section>;
}
