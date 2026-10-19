import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { financeApi } from '../../api/finance.api';
import { dictionariesApi } from '../../api/dictionaries.api';
import { FinanceTabs } from '../../components/FinanceTabs';
import { PaymentReceiptPrintModal } from './PaymentReceiptPrintModal';
import { customerBookPrintHtml, duplicatePkoNumbers, pkoNumber, voidedPko } from './customerPkoBookUtils';

export const CustomerPkoBookPage = () => {
  const [filters,setFilters]=useState({year:'ALL',currency:'ALL',cash_desk_id:'',search:'',date_from:'',date_to:'',book_status:'ALL'});
  const [printed,setPrinted]=useState(null);
  const [exportError,setExportError]=useState('');
  const [exporting,setExporting]=useState(false);
  const set=(key,value)=>setFilters(previous=>({...previous,[key]:value}));
  const params={...filters,cash_desk_id:filters.cash_desk_id||undefined,customer_book:'1',include_voided:'1'};
  const {data,isLoading,error,refetch}=useQuery({queryKey:['finance-income','customer-book',filters],queryFn:()=>financeApi.getIncome(params)});
  const {data:desks=[]}=useQuery({queryKey:['dictionaries','CASH_DESK'],queryFn:()=>dictionariesApi.getItems('CASH_DESK')});
  const rows=data?.list||[];
  const duplicates=useMemo(()=>duplicatePkoNumbers(rows),[rows]);
  const exportExcel=async()=>{
    setExportError('');setExporting(true);
    try {
      const blob=await api.get('/finance/income/customer-book.xlsx',{params,responseType:'blob'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Книга_ПКО_покупателей.xlsx';a.click();URL.revokeObjectURL(url);
    }catch(e){setExportError(e.message);}finally{setExporting(false);}
  };
  const printBook=()=>{
    const w=window.open('','_blank','width=1200,height=800');
    if(!w){setExportError('Разрешите открытие окна для печати книги.');return;}
    w.opener=null;w.document.write(customerBookPrintHtml(rows));w.document.close();w.focus();w.print();
  };
  return <div className="space-y-5 pb-12">
    <h1 className="text-2xl font-bold">Книга регистрации ПКО покупателей</h1>
    <p className="text-sm text-slate-600">Денежные поступления по договорам за квартиры, коммерческие помещения и машино-места. Прямые приходы без договора, бартер, инвестиции, конвертации и перемещения в книгу не входят. Единая нумерация по всем кассам и валютам; номер присваивается при сохранении платежа.</p>
    <FinanceTabs />
    <div className="flex flex-wrap gap-3">
      <Link to="/finance/income" className="rounded-xl bg-blue-600 px-4 py-2 text-white">Открыть оформление ПКО</Link>
      <button onClick={()=>refetch()} className="rounded-xl border px-4 py-2">Обновить</button>
      <button disabled={isLoading||Boolean(error)||exporting} onClick={exportExcel} className="rounded-xl border px-4 py-2 disabled:opacity-50">{exporting?'Подготовка Excel…':'Экспорт в Excel'}</button>
      <button disabled={isLoading||Boolean(error)} onClick={printBook} className="rounded-xl border px-4 py-2 disabled:opacity-50">Печать книги</button>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 rounded-xl border bg-white p-4 text-sm">
      <label>Поиск<input aria-label="Поиск по книге" value={filters.search} onChange={e=>set('search',e.target.value)} className="w-full rounded border p-2" placeholder="ПКО, покупатель, договор" /></label>
      <label>Касса<select value={filters.cash_desk_id} onChange={e=>set('cash_desk_id',e.target.value)} className="w-full rounded border p-2"><option value="">Все доступные кассы</option>{desks.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <label>Валюта<select value={filters.currency} onChange={e=>set('currency',e.target.value)} className="w-full rounded border p-2"><option value="ALL">Все валюты</option>{(data?.availableCurrencies||['USD','TJS']).map(c=><option key={c}>{c}</option>)}</select></label>
      <label>С даты<input type="date" value={filters.date_from} onChange={e=>set('date_from',e.target.value)} className="w-full rounded border p-2" /></label>
      <label>По дату<input type="date" value={filters.date_to} onChange={e=>set('date_to',e.target.value)} className="w-full rounded border p-2" /></label>
      <label>Статус<select value={filters.book_status} onChange={e=>set('book_status',e.target.value)} className="w-full rounded border p-2"><option value="ALL">Все</option><option value="ACTIVE">Действующие</option><option value="VOIDED">Аннулированные</option></select></label>
    </div>
    {exportError&&<p role="alert" className="text-red-700">{exportError}</p>}
    {error?<p role="alert" className="text-red-700">Не удалось загрузить книгу: {error.message}</p>:isLoading?<p>Загрузка книги…</p>:<>
      <p className="text-sm">Записей: <b>{rows.length}</b> · Аннулированных: {rows.filter(voidedPko).length}</p>
      {duplicates.size>0&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Повторы среди выбранных исторических записей: {[...duplicates].join(', ')}. Старые номера сохранены.</p>}
      <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[1200px] text-left text-xs"><thead className="bg-slate-50"><tr>{['Дата','№ ПКО','Покупатель','Договор / недвижимость','Касса','Сумма','Ответственный','Статус','Печать'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>
        {rows.map(p=><tr key={p.id} className="border-t"><td className="p-3 whitespace-nowrap">{String(p.date||'').slice(0,10)}</td><td className="p-3 whitespace-nowrap font-bold">{pkoNumber(p)}{duplicates.has(pkoNumber(p))&&<span className="block text-amber-700">Исторический повтор · ID {p.id}</span>}</td><td className="p-3">{p.clientName}</td><td className="p-3">{p.contract}<span className="block text-slate-500">{p.property}</span></td><td className="p-3">{p.cashDeskName||'—'}</td><td className="p-3 whitespace-nowrap">{Number(p.amount).toLocaleString('ru-RU',{minimumFractionDigits:2})} {p.currency}{p.amountTjs!=null&&<span className="block text-slate-500">ПКО: {Number(p.amountTjs).toLocaleString('ru-RU',{minimumFractionDigits:2})} TJS</span>}</td><td className="p-3">{p.createdByName}</td><td className="p-3">{voidedPko(p)?'Аннулирован':'Действует'}</td><td className="p-3"><button aria-label={`Печать ${pkoNumber(p)}`} onClick={()=>setPrinted(p)} className="rounded border px-2 py-1">ПКО</button></td></tr>)}
        {!rows.length&&<tr><td colSpan={9} className="p-6 text-center">По выбранным условиям ПКО покупателей не найдены.</td></tr>}
      </tbody></table></div>
      <p className="text-sm text-slate-600">Итого действующих поступлений в валюте учёта: {Object.entries(data?.totalsByCurrency||{}).map(([c,n])=>`${Number(n).toLocaleString('ru-RU',{minimumFractionDigits:2})} ${c}`).join(' · ')}. Аннулированные документы в итог не включены.</p>
    </>}
    {printed&&<PaymentReceiptPrintModal payment={printed} deal={printed.deal} onClose={()=>setPrinted(null)} />}
  </div>;
};
