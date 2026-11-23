import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';

const area = n => (Number(n || 0) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = n => (Number(n || 0) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statuses = { DRAFT: 'Черновик', APPROVED: 'Утверждено', CLOSED: 'Закрыто', CANCELLED: 'Отменено' };

export function ResettlementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const canApprove = ['ADMIN', 'DIRECTOR'].includes(user?.role);

  const refresh = async () => {
    setError('');
    try {
      const response = await api.get('/resettlements');
      setItems(response?.data?.data ?? []);
    } catch {
      setError('Не удалось загрузить реестр переселений.');
    }
  };
  useEffect(() => { refresh(); }, []);

  const openCase = async id => {
    setBusy(true);
    setError('');
    try {
      const response = await api.get('/resettlements/' + id);
      setSelected(response?.data?.data ?? null);
    } catch {
      setError('Не удалось открыть карточку переселения.');
    } finally { setBusy(false); }
  };

  const approve = async () => {
    if (!selected || !canApprove || selected.status !== 'DRAFT') return;
    if (!window.confirm('Утвердить переселение? После утверждения финансовые параметры будут заблокированы.')) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/resettlements/' + selected.id + '/approve', { note });
      await refresh();
      await openCase(selected.id);
    } catch {
      setError('Утверждение не выполнено. Проверьте договоры, площади и права доступа.');
    } finally { setBusy(false); }
  };

  return <div className="p-6 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Переселение и компенсация</h1><p className="text-sm text-slate-500">Учёт замещающей, дополнительной и платной площади</p></div>
      <button className="border rounded-lg px-4 py-2" onClick={refresh} disabled={busy}>Обновить</button>
    </div>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50"><tr>{['№', 'ЖК', 'Старое жильё, м²', 'Компенсация, м²', 'Платная площадь, м²', 'К оплате', 'Статус'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>{items.map(c => <tr key={c.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => openCase(c.id)}>
          <td className="p-3">{c.id}</td><td className="p-3">{c.project_id}</td><td className="p-3">{area(c.original_home_area_x100)}</td><td className="p-3">{area(c.compensated_area_x100)}</td><td className="p-3">{area(c.paid_area_x100)}</td><td className="p-3">{money(c.payable_total_minor)} USD</td><td className="p-3">{statuses[c.status] || c.status}</td>
        </tr>)}</tbody>
      </table>
      {!items.length && <p className="p-6 text-slate-500">Карточек переселения пока нет.</p>}
    </div>
    {selected && <section className="rounded-xl border bg-white p-5 space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Карточка №{selected.id}</h2><button onClick={() => setSelected(null)} className="border rounded px-3 py-1">Закрыть</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>Старое жильё: <strong>{area(selected.original_home_area_x100)} м²</strong></div>
        <div>Дополнительная компенсация: <strong>{area(selected.compensated_extra_area_x100)} м²</strong></div>
        <div>Платная площадь: <strong>{area(selected.paid_area_x100)} м²</strong></div>
        <div>Сумма к оплате: <strong>{money(selected.payable_total_minor)} USD</strong></div>
      </div>
      {!selected.area_matches && <p role="alert" className="text-red-700">Несоответствие общей площади квартир расчёту компенсации.</p>}
      <h3 className="font-semibold">Связанные квартиры</h3>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th className="p-2">Квартира</th><th className="p-2">Площадь</th><th className="p-2">Договор</th><th className="p-2">Статус</th></tr></thead><tbody>{(selected.units ?? []).map(u => <tr key={u.id} className="border-t"><td className="p-2">{u.unit?.unit_number ?? u.unit_id}</td><td className="p-2">{area(u.area_x100)} м²</td><td className="p-2">{u.deal?.contract_number ?? u.deal_id}</td><td className="p-2">{u.unit?.status ?? '—'}</td></tr>)}</tbody></table></div>
      {canApprove && selected.status === 'DRAFT' && <div className="space-y-2">
        <label className="block text-sm">Основание утверждения</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={2000} className="w-full rounded-lg border p-3" rows={2} />
        <button disabled={busy || !selected.area_matches} onClick={approve} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Утвердить переселение</button>
      </div>}
    </section>}
  </div>;
}
