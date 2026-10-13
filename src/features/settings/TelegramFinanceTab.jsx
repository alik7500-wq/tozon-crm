import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

export function TelegramFinanceTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState({});
  const [cashSelection,setCashSelection]=useState({});
  const cashFields=s=>cashSelection[s.telegram_id]||{cash_desk_id:s.cash_desk_id||null,crm_user_id:s.crm_user_id||null,can_create_expense:s.can_create_expense||false};
  function setCash(s,key,value){setCashSelection({...cashSelection,[s.telegram_id]:{...cashFields(s),[key]:value}});}
  async function saveCash(s){setBusy(true);setError('');try{await api.put(`/telegram-finance/subscribers/${s.telegram_id}/cash-access`,cashFields(s));await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function load() {
    setError('');
    try { const r = await api.get('/telegram-finance'); setData(r.data); }
    catch (e) { setError(e.message || 'Не удалось загрузить настройки бота.'); }
  }
  useEffect(() => { void load(); }, []);
  async function change(id, slot) {
    setBusy(true); setError('');
    try { await api.put(`/telegram-finance/subscribers/${id}`, { slot }); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const statuses = { PENDING: 'Ожидает подтверждения', APPROVED: 'Доступ открыт', REVOKED: 'Доступ отозван' };
  const deliveries = { PROCESSING: 'Отправка начата — требует проверки при долгом ожидании', SENT: 'Передано Telegram', UNKNOWN: 'Результат неизвестен — автоматический повтор отключён' };
  return <section className="space-y-5" aria-label="Финансовый Telegram-бот">
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <h2 className="font-bold text-lg">TOZON CRM — отчёты в Telegram</h2>
      <p className="mt-2 text-sm">Продажи, поступления, итоговые расходы и остатки по кассам. Ежедневно в <strong>22:00 по Худжанду</strong>.</p>
      <p className="mt-2 text-sm">Акмалхону доступны ПКО и РКО всех касс. Остальным — операции своей кассы. Ввод РКО разрешается отдельно; перед записью бот требует подтверждение.</p>
      <a className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm" href="https://t.me/TozonFinanceBot" target="_blank" rel="noopener noreferrer">Открыть @TozonFinanceBot</a>
    </div>
    {error && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl">{error}</p>}
    <div className="flex items-center justify-between gap-3"><h3 className="font-bold">Доступ к отчётам</h3><button onClick={load} disabled={busy} className="text-blue-600 text-sm">Обновить</button></div>
    <p className="text-sm text-slate-600">Каждый получатель должен открыть бота и нажать «Старт». Сверьте его Telegram ID лично, выберите имя и подтвердите доступ. Имена Telegram сами по себе не подтверждают личность.</p>
    {data && <>
      <p className="text-sm">Токен: {data.tokenConfigured ? 'добавлен' : 'не настроен'} · Бот: {data.workerActive ? 'работает' : 'ожидает запуска / проверьте сервер'}</p>
      {!data.subscribers.length && <p className="rounded-xl border p-4 text-sm text-slate-500">Заявок пока нет. Откройте бота и нажмите «Старт».</p>}
      {data.subscribers.map(s => <div key={s.telegram_id} className="border rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-48"><p className="font-semibold">{s.display_name || 'Пользователь'} {s.username && <span className="text-slate-500">@{s.username}</span>}</p><p className="text-sm">Telegram ID: <strong>{s.telegram_id}</strong></p><p className="text-xs text-slate-500 mt-1">{statuses[s.status]} {s.slot && `· ${data.slots[s.slot]}`}</p></div>
        <label className="text-sm">Получатель<select aria-label={`Получатель ${s.telegram_id}`} className="block border rounded-lg p-2 mt-1" value={selection[s.telegram_id] ?? s.slot ?? ''} onChange={e => setSelection({ ...selection, [s.telegram_id]: e.target.value })}><option value="">Выберите имя</option>{Object.entries(data.slots).map(([key, label]) => <option key={key} value={key} disabled={data.subscribers.some(other => other.telegram_id !== s.telegram_id && other.slot === key)}>{label}</option>)}</select></label>
        <button disabled={busy || !(selection[s.telegram_id] || s.slot)} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50" onClick={() => change(s.telegram_id, selection[s.telegram_id] || s.slot)}>Подтвердить доступ</button>
        {s.status !== 'REVOKED' && <button disabled={busy} className="text-red-600 text-sm" onClick={() => change(s.telegram_id, null)}>Отозвать доступ</button>}
        <div className="w-full border-t pt-4 grid sm:grid-cols-3 gap-3">
          <label className="text-sm">Касса пользователя<select aria-label={`Касса ${s.telegram_id}`} className="block w-full border rounded-lg p-2 mt-1" disabled={s.slot==='AKMALKHON'} value={cashFields(s).cash_desk_id||''} onChange={e=>setCash(s,'cash_desk_id',e.target.value||null)}><option value="">{s.slot==='AKMALKHON'?'Все кассы — Акмалхон':'Не назначена'}</option>{(data.cashDesks||[]).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label className="text-sm">Автор РКО в CRM<select aria-label={`Автор РКО ${s.telegram_id}`} className="block w-full border rounded-lg p-2 mt-1" value={cashFields(s).crm_user_id||''} onChange={e=>setCash(s,'crm_user_id',e.target.value?Number(e.target.value):null)}><option value="">Выберите учётную запись</option>{(data.crmUsers||[]).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
          <div className="text-sm space-y-3"><label><input aria-label={`Ввод РКО ${s.telegram_id}`} type="checkbox" checked={cashFields(s).can_create_expense} onChange={e=>setCash(s,'can_create_expense',e.target.checked)}/> Разрешить ввод РКО</label><button disabled={busy} className="block px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50" onClick={()=>saveCash(s)}>Сохранить кассовый доступ</button></div>
          <p className="sm:col-span-3 text-xs text-slate-500">Автор должен соответствовать получателю. Для отдельного кассира создайте его учётную запись CRM. Без привязки ввод РКО закрыт. Создание ПКО через бота недоступно.</p>
        </div>
      </div>)}
      <details className="border rounded-xl p-4"><summary className="font-bold cursor-pointer">История ежедневной рассылки</summary>{!data.deliveries.length && <p className="mt-3 text-sm text-slate-500">Рассылок пока не было.</p>}{data.deliveries.map(d => <p key={`${d.report_date}:${d.telegram_id}`} className="text-sm border-t pt-3 mt-3">{d.report_date} · {data.subscribers.find(s => s.telegram_id === d.telegram_id)?.display_name || d.telegram_id} · {deliveries[d.status]}</p>)}</details>
    </>}
  </section>;
}
