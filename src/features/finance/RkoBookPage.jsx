import React,{useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {api} from '../../api/client';
import {financeApi} from '../../api/finance.api';
import {dictionariesApi} from '../../api/dictionaries.api';
import {FinanceTabs} from '../../components/FinanceTabs';
import {ExpenseReceiptPrintModal} from './ExpenseReceiptPrintModal';
import {duplicateRkoNumbers,rkoNumber,voidedRko,rkoBookPrintHtml} from './rkoBookUtils';
const money=n=>Number(n||0).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
export const RkoBookPage=()=>{
 const [filters,setFilters]=useState({search:'',cash_desk_id:'',currency:'ALL',date_from:'',date_to:'',book_status:'ALL'});
 const [printed,setPrinted]=useState(null),[exporting,setExporting]=useState(false),[actionError,setActionError]=useState('');
 const params={...filters,cash_desk_id:filters.cash_desk_id||undefined};
 const set=(key,value)=>setFilters(f=>({...f,[key]:value}));
 const {data,isLoading,error,refetch}=useQuery({queryKey:['finance-expenses','rko-book',filters],queryFn:()=>financeApi.getRkoBook(params)});
 const {data:desks=[]}=useQuery({queryKey:['dictionaries','CASH_DESK'],queryFn:()=>dictionariesApi.getItems('CASH_DESK')});
 const rows=data?.list||[],totals=data?.totalsByCurrency||{};
 const duplicates=useMemo(()=>duplicateRkoNumbers(rows),[rows]);
 const exportExcel=async()=>{
  setActionError('');setExporting(true);
  try{const blob=await api.get('/finance/expenses/book.xlsx',{params,responseType:'blob'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Книга_регистрации_РКО.xlsx';a.click();URL.revokeObjectURL(url);}
  catch(e){setActionError(e.message||'Не удалось выгрузить книгу');}finally{setExporting(false);}
 };
 const print=()=>{
  setActionError('');const w=window.open('','_blank','width=1200,height=800');
  if(!w){setActionError('Разрешите открытие окна для печати книги.');return;}
  w.opener=null;w.document.write(rkoBookPrintHtml(rows,totals));w.document.close();w.focus();w.print();
 };
 return <div className="space-y-5 pb-12">
  <h1 className="text-2xl font-bold">Книга регистрации РКО</h1>
  <p className="text-sm text-slate-600">Расходные кассовые ордера из доступных Вам касс. Новые РКО появляются автоматически; исходные номера сохраняются. Служебные записи конвертации в книгу не входят. Итоги рассчитываются отдельно по каждой валюте, без аннулированных документов.</p>
  <FinanceTabs/>
  <div className="flex flex-wrap gap-3">
   <Link to="/finance/expenses" className="rounded-xl bg-blue-600 px-4 py-2 text-white">Открыть оформление РКО</Link>
   <button onClick={()=>refetch()} className="rounded-xl border px-4 py-2">Обновить</button>
   <button disabled={isLoading||Boolean(error)||exporting} onClick={exportExcel} className="rounded-xl border px-4 py-2 disabled:opacity-50">{exporting?'Подготовка Excel…':'Экспорт в Excel'}</button>
   <button disabled={isLoading||Boolean(error)} onClick={print} className="rounded-xl border px-4 py-2 disabled:opacity-50">Печать книги</button>
  </div>
  <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 rounded-xl border bg-white p-4 text-sm">
   <label>Поиск<input aria-label="Поиск по книге РКО" className="w-full rounded border p-2" placeholder="РКО, получатель, основание" value={filters.search} onChange={e=>set('search',e.target.value)}/></label>
   <label>Касса<select className="w-full rounded border p-2" value={filters.cash_desk_id} onChange={e=>set('cash_desk_id',e.target.value)}><option value="">Все доступные кассы</option>{desks.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
   <label>Валюта<select className="w-full rounded border p-2" value={filters.currency} onChange={e=>set('currency',e.target.value)}><option value="ALL">Все валюты</option>{(data?.availableCurrencies||[]).map(c=><option key={c}>{c}</option>)}</select></label>
   <label>С даты<input type="date" className="w-full rounded border p-2" value={filters.date_from} onChange={e=>set('date_from',e.target.value)}/></label>
   <label>По дату<input type="date" className="w-full rounded border p-2" value={filters.date_to} onChange={e=>set('date_to',e.target.value)}/></label>
   <label>Статус<select className="w-full rounded border p-2" value={filters.book_status} onChange={e=>set('book_status',e.target.value)}><option value="ALL">Все</option><option value="ACTIVE">Действующие</option><option value="VOIDED">Аннулированные</option></select></label>
  </div>
  {actionError&&<p role="alert" className="text-red-700">{actionError}</p>}
  {error?<p role="alert" className="text-red-700">Не удалось загрузить книгу: {error.message}</p>:isLoading?<p>Загрузка книги…</p>:<>
   <p className="text-sm">Записей: <b>{rows.length}</b> · Аннулированных: {rows.filter(voidedRko).length}</p>
   {duplicates.size>0&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Повторы среди выбранных исторических записей: {[...duplicates].join(', ')}. Исходные номера сохранены.</p>}
   <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[1200px] text-left text-xs"><thead className="bg-slate-50"><tr>{['Дата','№ РКО','Получатель','Статья / основание','Касса','Сумма','Ответственный','Статус','Печать'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>
    {rows.map(r=><tr key={r.id} className={`border-t ${voidedRko(r)?'bg-rose-50':''}`}><td className="p-3 whitespace-nowrap">{r.date}</td><td className="p-3 whitespace-nowrap font-bold">{rkoNumber(r)}{duplicates.has(rkoNumber(r))&&<span className="block text-amber-700">Исторический повтор · ID {r.id}</span>}</td><td className="p-3">{r.recipient||'—'}</td><td className="p-3">{r.category||'—'}<span className="block text-slate-500 whitespace-pre-wrap">{r.description}</span></td><td className="p-3">{r.cashDeskName}</td><td className="p-3 whitespace-nowrap">{money(r.amount)} {r.currency}</td><td className="p-3">{r.createdByName}</td><td className="p-3">{voidedRko(r)?'Аннулирован':'Действует'}</td><td className="p-3"><button aria-label={`Печать ${rkoNumber(r)}`} onClick={()=>setPrinted({...r,status:voidedRko(r)?'VOIDED':r.status,expense_date:r.date,created_by_name:r.createdByName})} className="rounded border px-2 py-1">РКО</button></td></tr>)}
    {!rows.length&&<tr><td colSpan={9} className="p-6 text-center">По выбранным условиям РКО не найдены.</td></tr>}
   </tbody></table></div>
   <p className="text-sm text-slate-600">Итого действующих РКО: {Object.entries(totals).map(([c,n])=>`${money(n)} ${c}`).join(' · ')||'0'}. Аннулированные документы в итог не включены.</p>
  </>}
  {printed&&<ExpenseReceiptPrintModal expense={printed} onClose={()=>setPrinted(null)}/>}
 </div>;
};
