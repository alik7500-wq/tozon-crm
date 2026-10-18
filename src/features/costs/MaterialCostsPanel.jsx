import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

const n = value => Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 4 });
const usd = value => value == null ? '—' : `$${(value / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = value => Number(String(value ?? '').replace(',', '.'));
const KINDS = { REBAR: 'Арматура', CONCRETE: 'Бетон' };
const inputClass = 'mt-1 block w-full rounded-lg border bg-white p-2';

export function MaterialCostsPanel({ data, blocks, asOf }) {
  const client = useQueryClient();
  const [form, setForm] = useState(null);
  const [payment, setPayment] = useState(null);
  const [removal, setRemoval] = useState(null);
  const [error, setError] = useState('');
  const usages = data.material_usages || [];
  const sources = data.material_sources || [];
  const mutation = useMutation({
    mutationFn: ({ path, body, post }) => post ? api.post(path, body) : api.put(path, body),
    onSuccess: () => { client.invalidateQueries({ queryKey: ['block-costs'] }); client.invalidateQueries({ queryKey: ['block-cost-options'] }); setForm(null); setPayment(null); setRemoval(null); setError(''); },
    onError: e => setError(e.message)
  });
  const openNew = () => {
    setError(''); setForm({ id: crypto.randomUUID(), stock_entry_id: '', building_id: '', material_kind: '', usage_date: asOf,
      quantity: '', unit: '', amount: '', currency: 'TJS', exchange_rate: '', reason: '', status: 'ACTIVE', expected_version: 0 });
  };
  const openEdit = u => { setError(''); setForm({ id: u.id, stock_entry_id: u.stock_entry_id || '', building_id: u.building_id, material_kind: u.material_kind,
    usage_date: u.usage_date, quantity: u.quantity, unit: u.unit, amount: u.amount, currency: u.currency, exchange_rate: u.exchange_rate || '', reason: u.reason, status: u.status, expected_version: u.version }); };
  const selectSource = id => {
    const s = sources.find(s => String(s.id) === id);
    setForm(f => s ? { ...f, stock_entry_id: s.id, usage_date: s.usage_date, quantity: s.quantity, amount: s.amount, currency: s.currency,
      exchange_rate: s.exchange_rate || '', unit: s.unit, material_kind: /армат/i.test(s.material_name) ? 'REBAR' : /бетон/i.test(s.material_name) ? 'CONCRETE' : '' }
      : { ...f, stock_entry_id: '', quantity: '', amount: '', unit: '', exchange_rate: '' });
  };
  const saveUsage = () => {
    if (!form.building_id || !form.material_kind) { setError('Выберите блок и вид материала'); return; }
    const { id, ...values } = form;
    const body = { ...values, stock_entry_id: values.stock_entry_id ? num(values.stock_entry_id) : null, building_id: num(values.building_id),
      quantity: num(values.quantity), amount: num(values.amount), exchange_rate: values.exchange_rate ? num(values.exchange_rate) : null };
    mutation.mutate({ path: `/costs/material-usages/${id}`, body });
  };
  const openPayment = u => {
    setError(''); setPayment({ id: crypto.randomUUID(), usage: u, expense_id: '', paid_amount: '', cash_amount: '', reason: '' });
  };
  const chooseExpense = id => {
    const e = (data.rows || []).find(e => e.id === Number(id));
    setPayment(p => ({ ...p, expense_id: id, cash_amount: e ? e.available_material_payment_usd_minor / 100 : '',
      paid_amount: e && e.currency === p.usage.currency ? Math.min(p.usage.unpaid_amount, e.amount_minor / 100) : '' }));
  };
  const savePayment = () => {
    if (!payment.expense_id || !(num(payment.paid_amount) > 0) || !(num(payment.cash_amount) > 0)) { setError('Выберите РКО и укажите обе суммы оплаты'); return; }
    mutation.mutate({ path: `/costs/material-payments/${payment.id}`, body: { usage_id: payment.usage.id, expense_id: num(payment.expense_id),
      paid_amount: num(payment.paid_amount), cash_usd_minor: Math.round(num(payment.cash_amount) * 100), reason: payment.reason, expected_version: 0 } });
  };
  return <section className="rounded-2xl border bg-white p-4 space-y-4">
    <div className="flex flex-wrap justify-between gap-3 items-center"><h2 className="text-lg font-bold">Арматура и бетон по фактическому использованию</h2>{data.can_write && <button className="bg-blue-600 rounded-lg px-4 py-2 text-white" onClick={openNew}>Добавить расход материала</button>}</div>
    <p className="text-sm text-slate-600">Выберите проведённое складское списание либо внесите подтверждённый расход вручную. Материал на складе не включайте. Привяжите оплачивающие РКО: связанная часть будет исключена из обычных расходов, чтобы избежать двойного счёта.</p>
    <p className="text-sm text-amber-900">Оплату материала до его использования оставляйте в РКО как «Не включать в затраты» с пояснением. После использования добавьте расход здесь и привяжите ранее оплаченный РКО. Один расход нельзя вводить и вручную, и по складскому списанию.</p>
    {Boolean(data.material_payment_problems?.length) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">Некоторые РКО оплаты изменены, аннулированы либо их привязки превышают сумму. Проверьте помеченные оплаты: они не уменьшают неоплаченную стоимость материала.</p>}
    {!usages.length && <p className="text-slate-500 text-sm">Расходы арматуры и бетона по блокам ещё не указаны.</p>}
    {usages.map(u => <article key={u.id} className="rounded-xl border p-4 space-y-2">
      <div className="flex flex-wrap justify-between gap-2"><strong>{KINDS[u.material_kind]} · {blocks.find(b => b.id === u.building_id)?.name} · {u.usage_date}</strong><span className="text-sm">{u.status === 'CANCELLED' ? 'Отменён' : u.included ? 'Включён в себестоимость' : 'Не включён на выбранную дату / проверьте оценку'}</span></div>
      <p className="text-sm">Использовано: {n(u.quantity)} {u.unit} · стоимость {n(u.amount)} {u.currency} ({usd(u.usd_minor)})</p>
      <p className="text-sm">Оплачено из этой стоимости: {n(u.paid_amount)} {u.currency} · Не оплачено: <strong>{n(u.unpaid_amount)} {u.currency}</strong> ({usd(u.unpaid_usd_minor)})</p>
      <p className="text-xs text-slate-500">{u.stock_entry_id ? `Складская проводка №${u.stock_entry_id}. ` : 'Ввод по подтверждающему документу. '}{u.reason}</p>
      <div className="flex flex-wrap gap-4 text-sm">{data.can_write && <>
        <button className="underline text-blue-700" disabled={Boolean(u.payments?.length)} title={u.payments?.length ? 'Сначала отмените привязки оплат' : ''} onClick={() => openEdit(u)}>Изменить / отменить расход</button>
        {u.status === 'ACTIVE' && Number(u.unpaid_amount) > 0 && <button className="underline text-blue-700" onClick={() => openPayment(u)}>Привязать оплату по РКО</button>}
      </>}</div>
      {u.payments?.map(p => <div key={p.id} className={`text-sm border-t pt-2 ${!p.valid && p.expense_date <= asOf ? 'text-red-700' : ''}`}>
        {p.reference || `РКО-${p.expense_id}`} · {p.expense_date} · погашено {n(p.paid_amount)} {u.currency}; часть РКО {usd(p.cash_usd_minor)}
        {!p.valid && <span> · {p.expense_date > asOf ? 'После даты расчёта' : 'Проверьте привязку'}</span>}
        {data.can_write && <button className="underline ml-3" onClick={() => { setError(''); setRemoval({ link: p, reason: '' }); }}>Отменить привязку</button>}
      </div>)}
    </article>)}
    {(form || payment || removal) && <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-center items-center p-4"><section role="dialog" aria-modal="true" aria-label={form ? 'Расход материала' : removal ? 'Отмена привязки оплаты' : 'Оплата материала'} className="bg-white rounded-2xl p-5 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4">
      <h3 className="text-xl font-bold">{form ? 'Фактический расход бетона / арматуры' : removal ? 'Отмена привязки оплаты' : 'Привязка оплачивающего РКО'}</h3>
      <fieldset disabled={mutation.isPending} className="space-y-3">
      {form && <>
        <label className="block text-sm">Источник<select aria-label="Источник материала" className={inputClass} value={form.stock_entry_id} onChange={e => selectSource(e.target.value)}><option value="">Ввод по акту / накладной вручную</option>{sources.filter(s => !s.linked || String(s.id) === String(form.stock_entry_id)).map(s => <option key={s.id} value={s.id}>Документ №{s.document_number}: {s.material_name}, {n(s.quantity)} {s.unit}, {n(s.amount)} {s.currency}</option>)}</select></label>
        <label className="block text-sm">Вид материала<select aria-label="Вид материала" className={inputClass} value={form.material_kind} onChange={e => setForm({ ...form, material_kind: e.target.value })}><option value="">Выберите материал</option><option value="REBAR">Арматура</option><option value="CONCRETE">Бетон</option></select></label>
        <label className="block text-sm">Блок<select aria-label="Блок материала" className={inputClass} value={form.building_id} onChange={e => setForm({ ...form, building_id: e.target.value })}><option value="">Выберите блок</option>{blocks.filter(b => !b.archived_at).map(b => <option key={b.id} value={b.id}>{b.project_name} · {b.name}</option>)}</select></label>
        <label className="block text-sm">Дата использования<input aria-label="Дата использования" type="date" className={inputClass} disabled={Boolean(form.stock_entry_id)} value={form.usage_date} onChange={e => setForm({ ...form, usage_date: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Использованное количество<input aria-label="Количество материала" className={inputClass} inputMode="decimal" disabled={Boolean(form.stock_entry_id)} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label><label className="text-sm">Единица измерения<input aria-label="Единица материала" className={inputClass} disabled={Boolean(form.stock_entry_id)} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="т, кг, м³" /></label></div>
        <label className="block text-sm">Полная стоимость использованного количества<input aria-label="Стоимость материала" className={inputClass} inputMode="decimal" disabled={Boolean(form.stock_entry_id)} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
        <label className="block text-sm">Валюта стоимости<select aria-label="Валюта материала" className={inputClass} disabled={Boolean(form.stock_entry_id)} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}><option value="TJS">Сомони (TJS)</option><option value="USD">Доллары (USD)</option></select></label>
        {form.currency === 'TJS' && <label className="block text-sm">Исторический курс: сомони за 1 USD<input aria-label="Курс материала" className={inputClass} inputMode="decimal" disabled={Boolean(sources.find(s => String(s.id) === String(form.stock_entry_id))?.exchange_rate)} value={form.exchange_rate} onChange={e => setForm({ ...form, exchange_rate: e.target.value })} /></label>}
        <label className="block text-sm">Статус<select aria-label="Статус расхода материала" className={inputClass} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Действующий</option><option value="CANCELLED">Отменён</option></select></label>
        <label className="block text-sm">Основание / номер акта<textarea aria-label="Основание материала" className={inputClass} maxLength={2000} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label>
      </>}
      {payment && <>
        <p className="text-sm">{KINDS[payment.usage.material_kind]} · {blocks.find(b => b.id === payment.usage.building_id)?.name}. Не оплачено: {n(payment.usage.unpaid_amount)} {payment.usage.currency}.</p>
        <label className="block text-sm">Оплачивающий РКО<select aria-label="Оплачивающий РКО" className={inputClass} value={payment.expense_id} onChange={e => chooseExpense(e.target.value)}><option value="">Выберите РКО</option>{(data.rows || []).filter(e => e.state !== 'AUTO_EXCLUDED' && e.available_material_payment_usd_minor > 0).map(e => <option key={e.id} value={e.id}>{e.reference || `РКО-${e.id}`} · {e.date} · доступно {usd(e.available_material_payment_usd_minor)} · {e.category}</option>)}</select></label>
        <label className="block text-sm">Погашено стоимости материала, {payment.usage.currency}<input aria-label="Погашено материала" className={inputClass} inputMode="decimal" value={payment.paid_amount} onChange={e => setPayment({ ...payment, paid_amount: e.target.value })} /></label>
        <label className="block text-sm">Какая часть выбранного РКО относится к этой оплате, USD<input aria-label="Часть РКО USD" className={inputClass} inputMode="decimal" value={payment.cash_amount} onChange={e => setPayment({ ...payment, cash_amount: e.target.value })} /></label>
        <p className="text-xs text-slate-500">Обычно относится весь РКО — сумма подставляется автоматически. Если один РКО оплачивает несколько расходов, укажите только его часть. Погашение вводится в валюте стоимости материала, чтобы изменение курса не создавало остаточный долг.</p>
        <label className="block text-sm">Основание привязки<textarea aria-label="Основание оплаты материала" className={inputClass} maxLength={2000} value={payment.reason} onChange={e => setPayment({ ...payment, reason: e.target.value })} /></label>
      </>}
      {removal && <><p className="text-sm">Кассовый документ останется без изменений. Оплата перестанет уменьшать неоплаченную стоимость материала; эта часть РКО вернётся к обычным правилам распределения.</p><label className="block text-sm">Причина отмены<textarea aria-label="Причина отмены привязки" className={inputClass} maxLength={2000} value={removal.reason} onChange={e => setRemoval({ ...removal, reason: e.target.value })} /></label></>}
      </fieldset>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="flex justify-end gap-3"><button disabled={mutation.isPending} className="border rounded-lg px-4 py-2" onClick={() => { setForm(null); setPayment(null); setRemoval(null); setError(''); }}>Отмена</button><button disabled={mutation.isPending} className="bg-blue-600 text-white rounded-lg px-4 py-2" onClick={form ? saveUsage : payment ? savePayment : () => mutation.mutate({ path: `/costs/material-payments/${removal.link.id}/remove`, post: true, body: { expected_version: removal.link.version, reason: removal.reason } })}>{mutation.isPending ? 'Сохранение…' : 'Сохранить'}</button></div>
    </section></div>}
  </section>;
}
