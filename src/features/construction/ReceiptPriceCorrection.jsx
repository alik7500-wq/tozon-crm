import React, { useState } from 'react';
import { api } from '../../api/client';
const format = n => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 6 });
const input = 'border border-slate-300 rounded-lg px-3 py-2 w-full';
export function ReceiptPriceCorrection({ document: doc, materials, onClose, onSaved }) {
 const [values, setValues] = useState(doc.lines.map(l => String(l.value)));
 const [prices, setPrices] = useState(() => doc.lines.map(l => String(Number((Number(l.value) / Number(l.quantity)).toFixed(8)))));
 const [reason, setReason] = useState('');
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(false);
 const [requestId] = useState(() => crypto.randomUUID());
 const total = values.reduce((sum, v) => sum + Number(v || 0), 0);
 const original = doc.lines.reduce((sum, l) => sum + Number(l.value), 0);
 const save = async event => {
  event.preventDefault(); setBusy(true); setError('');
  try {
   await api.post(`/construction/documents/${doc.id}/price-corrections`, { id: requestId, expected_version: doc.price_version || 0, reason: reason.trim(), values: values.map(Number) });
   await onSaved();
  } catch (e) { setError(e.message); } finally { setBusy(false); }
 };
 return <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><form onSubmit={save} className="bg-white rounded-xl p-6 max-w-3xl max-h-[90vh] overflow-auto w-full space-y-4" role="dialog" aria-modal="true" aria-label="Корректировка цены поступления">
  <h2 className="text-xl font-bold">Корректировка цены поступления №{doc.number}</h2>
  <p className="text-sm text-slate-600">Будут пересчитаны остатки, стоимость последующих списаний и долг поставщику. Количество и валюта сохраняются. При наличии привязанных оплат себестоимости сначала отмените эти привязки.</p>
  {doc.lines.map((line, i) => <div key={i} className="border rounded-lg p-3 space-y-2">
   <p className="font-medium">{materials.find(m => m.id === line.material_id)?.name || 'Материал'} · {format(line.quantity)} {materials.find(m => m.id === line.material_id)?.unit}</p>
   <p className="text-sm text-slate-500">До корректировки: {format(Number(line.value) / Number(line.quantity))} {doc.currency} за единицу · {format(line.value)} {doc.currency}</p>
   <div className="grid md:grid-cols-2 gap-3">
    <label>Новая цена за единицу, {doc.currency}<input className={input} type="number" min="0" step="any" required disabled={busy} value={prices[i]} onChange={e => {const price=e.target.value;setPrices(v=>v.map((x,j)=>j===i?price:x));setValues(v=>v.map((x,j)=>j===i?(price===''?'':(Number(price)*Number(line.quantity)).toFixed(2)):x));}}/></label>
    <label>Новая стоимость строки, {doc.currency}<input className={input} type="number" min="0" max="999999999999" step="0.01" required disabled={busy} value={values[i]} onChange={e => {const value=e.target.value;setValues(v=>v.map((x,j)=>j===i?value:x));setPrices(v=>v.map((x,j)=>j===i?(value===''?'':String(Number((Number(value)/Number(line.quantity)).toFixed(8)))):x));}}/></label>
   </div>
  </div>)}
  <p className="font-semibold">Итого: {format(original)} → {format(total)} {doc.currency}</p>
  <label className="block">Причина корректировки<textarea className={input} required minLength={3} maxLength={2000} disabled={busy} value={reason} onChange={e => setReason(e.target.value)}/></label>
  {error && <p role="alert" className="text-red-700">{error}</p>}
  <div className="flex gap-4"><button disabled={busy || total === original && values.every((v, i) => Number(v) === Number(doc.lines[i].value))} className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-40">{busy ? 'Пересчёт…' : 'Сохранить и пересчитать'}</button><button type="button" disabled={busy} onClick={onClose}>Отмена</button></div>
 </form></div>;
}
