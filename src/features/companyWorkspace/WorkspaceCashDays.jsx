import React,{useState} from 'react';
import {stockNumber as amount} from './stockNumber';
const date=value=>value.replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$3.$2.$1');
export default function WorkspaceCashDays({days}){
 const [page,setPage]=useState(0);
 const lastPage=Math.max(0,Math.ceil(days.length/100)-1),current=Math.min(page,lastPage),visible=days.slice(current*100,(current+1)*100);
 return <section aria-label="Ежедневные остатки кассы" className="space-y-3 rounded-xl border border-blue-200 bg-white p-4">
  <h4 className="font-bold">Ежедневные остатки</h4>
  <p className="text-xs text-slate-600">Показаны даты с проведёнными движениями, по возрастанию. В дни без движений остаток не меняется. Каждая валюта рассчитывается отдельно; фильтр «Движение» не меняет расчёт.</p>
  {!days.length?<p className="text-sm">В выбранном периоде движений нет. Остаток не менялся.</p>:<>
   <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Дата','Валюта','На начало дня','Приход за день','Расход за день','На конец дня'].map(h=><th key={h} className="border-b p-3 text-slate-500">{h}</th>)}</tr></thead><tbody>{visible.map(day=><tr key={`${day.date}:${day.currency}`}><td className="border-b p-3 whitespace-nowrap">{date(day.date)}</td><td className="border-b p-3 font-bold">{day.currency}</td>{['opening','income','expense','closing'].map(k=><td key={k} className={`border-b p-3 whitespace-nowrap font-semibold ${k==='closing'&&day.closing.startsWith('-')?'text-rose-700':''}`}>{amount(day[k],true)}</td>)}</tr>)}</tbody></table></div>
   <div className="flex flex-wrap items-center gap-4 text-sm"><p>Строк: {days.length}. Страница {current+1} из {lastPage+1}.</p><button type="button" disabled={current===0} onClick={()=>setPage(current-1)} className="font-bold text-blue-600 disabled:text-slate-400">Предыдущие даты</button><button type="button" disabled={current===lastPage} onClick={()=>setPage(current+1)} className="font-bold text-blue-600 disabled:text-slate-400">Следующие даты</button></div>
  </>}
 </section>;
}
