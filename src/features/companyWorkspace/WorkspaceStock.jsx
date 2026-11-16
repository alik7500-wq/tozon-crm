import React,{useState} from 'react';
import useWorkspaceRead from './useWorkspaceRead';
import {stockNumber} from './stockNumber';
export default function WorkspaceStock({project,version}){
 const [warehouse,setWarehouse]=useState(''),[search,setSearch]=useState(''),[currency,setCurrency]=useState(''),[reload,setReload]=useState(0);
 const {data,loading,error}=useWorkspaceRead(`/project-workspace/${project}/stock`,warehouse?{warehouse_id:warehouse}:{},`${version}:${reload}`);
 const warehouses=data?.warehouses||[],records=data?.records||[];
 const rows=records.filter(row=>(!currency||row.currency===currency)&&`${row.name} ${row.unit}`.toLocaleLowerCase('ru-RU').includes(search.trim().toLocaleLowerCase('ru-RU')));
 return <section aria-label="Остатки склада проекта" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Остатки материалов</h2><button type="button" disabled={loading} onClick={()=>setReload(n=>n+1)} className="font-bold text-blue-600 disabled:opacity-40">Обновить остатки</button></div>
  <p className="text-sm text-slate-500">По проведённым складским движениям выбранного проекта. Учётная стоимость показана отдельно по валютам. Начальные остатки должны быть внесены складским документом.</p>
  {loading?<p role="status">Загрузка складских остатков…</p>:error?<p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>:!warehouses.length?<p>Проекту не назначены склады.</p>:<>
   <div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-semibold">Склад<select aria-label="Склад остатков" value={data.selected_warehouse_id||''} onChange={e=>{setWarehouse(e.target.value);setSearch('');setCurrency('');}} className="mt-2 w-full rounded-xl border p-3">{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}{w.active?'':' · Не действует'}</option>)}</select></label>
    <label className="text-sm font-semibold">Поиск материала<input type="search" aria-label="Поиск материала" value={search} onChange={e=>setSearch(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
    <label className="text-sm font-semibold">Валюта<select aria-label="Валюта остатков" value={currency} onChange={e=>setCurrency(e.target.value)} className="mt-2 w-full rounded-xl border p-3"><option value="">Все валюты</option><option value="TJS">Сомони (TJS)</option><option value="USD">Доллары (USD)</option></select></label></div>
   <div aria-label="Стоимость остатков всего склада" className="grid gap-3 sm:grid-cols-2">{(data.totals||[]).map(t=><div key={t.currency} className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-sm text-slate-500">Учётная стоимость всего склада · {t.currency}</p><p className="mt-2 text-xl font-extrabold">{stockNumber(t.value,true)} {t.currency}</p></div>)}</div>
   {records.some(r=>String(r.quantity).startsWith('-')||String(r.value).startsWith('-'))&&<p role="alert" className="text-sm text-rose-700">Есть отрицательные остатки. Проверьте начальные остатки и проведённые движения.</p>}
   {!rows.length?<p>{search||currency?'Материалы по выбранным фильтрам не найдены.':'По выбранному складу нет ненулевых остатков.'}</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Материал','Ед. изм.','Количество','Учётная стоимость','Валюта'].map(label=><th key={label} className="border-b p-3 text-slate-500">{label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={`${row.material_id}:${row.currency}`}><td className="border-b p-3 font-semibold">{row.name}</td><td className="border-b p-3">{row.unit}</td><td className="border-b p-3">{stockNumber(row.quantity)}</td><td className="border-b p-3">{stockNumber(row.value,true)}</td><td className="border-b p-3">{row.currency}</td></tr>)}</tbody></table></div>}
   <p className="text-xs text-slate-500">Показано строк: {rows.length} из {records.length}. Количества с разными единицами измерения не суммируются.</p>
  </>}
 </section>;
}
