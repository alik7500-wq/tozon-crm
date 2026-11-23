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
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    project_id: '', original_home_area_x100: '', compensated_area_x100: '',
    paid_area_x100: '', price_per_m2_minor: '', links: [{ unit_id: '', deal_id: '' }, { unit_id: '', deal_id: '' }]
  });
  const toHundredths = value => {
    const normalized = String(value).trim().replace(',', '.');
    if (!/^\\d+(?:\\.\\d{1,2})?$/.test(normalized)) return null;
    const [whole, decimal = ''] = normalized.split('.');
    const result = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
    return Number.isSafeInteger(result) ? result : null;
  };
  const changeDraft = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));
  const changeLink = (index, field, value) => setDraft(prev => ({
    ...prev, links: prev.links.map((link, i) => i === index ? { ...link, [field]: value } : link)
  }));
  const createDraft = async event => {
    event.preventDefault();
    const projectId = Number(draft.project_id);
    const original = toHundredths(draft.original_home_area_x100);
    const compensated = toHundredths(draft.compensated_area_x100);
    const paid = toHundredths(draft.paid_area_x100);
    const price = toHundredths(draft.price_per_m2_minor);
    const links = draft.links.map(x => ({ unit_id: Number(x.unit_id), deal_id: Number(x.deal_id) }));
    if (!Number.isSafeInteger(projectId) || projectId < 1 || [original, compensated, paid, price].some(x => x === null) ||
        compensated < original || !links.every(x => Number.isSafeInteger(x.unit_id) && x.unit_id > 0 && Number.isSafeInteger(x.deal_id) && x.deal_id > 0)) {
      setError('Проверьте значения площадей, цену, ЖК и номера записей квартир и договоров.');
      return;
    }
    setBusy(true); setError('');
    try {
      const response = await api.post('/resettlements', {
        project_id: projectId, original_home_area_x100: original,
        compensated_area_x100: compensated, paid_area_x100: paid,
        price_per_m2_minor: price, links
      });
      setCreating(false);
      await refresh();
      await openCase(response?.data?.id);
    } catch (e) {
      setError('Создание не выполнено: ' + (e?.message || 'ошибка сервера'));
    } finally { setBusy(false); }
  };
  const canApprove = ['ADMIN', 'DIRECTOR'].includes(user?.role);

  const refresh = async () => {
    setError('');
    try {
      const response = await api.get('/resettlements');
      setItems(response?.data ?? []);
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
      setSelected(response?.data ?? null);
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
      <div className="flex gap-2">{canApprove && <button className="rounded-lg bg-blue-700 px-4 py-2 text-white" onClick={() => setCreating(v => !v)} disabled={busy}>{creating ? 'Отменить' : 'Новое переселение'}</button>}<button className="border rounded-lg px-4 py-2" onClick={refresh} disabled={busy}>Обновить</button></div>
    </div>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
    {creating && canApprove && <form onSubmit={createDraft} className="rounded-xl border bg-white p-5 space-y-4">
      <h2 className="font-semibold text-lg">Создать черновик переселения</h2>
      <p className="text-sm text-slate-600">Используйте внутренние ID жилого комплекса, квартиры и договора. Площади вводятся в м², цена — в USD за м². Создание черновика не меняет платежи и договоры.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['project_id','ID жилого комплекса'],['original_home_area_x100','Старое жильё, м²'],
          ['compensated_area_x100','Вся бесплатная площадь, м²'],['paid_area_x100','Платная площадь, м²'],
          ['price_per_m2_minor','Цена за м², USD']
        ].map(([key,label]) => <label key={key} className="text-sm">{label}<input required inputMode="decimal" value={draft[key]} onChange={e => changeDraft(key,e.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>)}
      </div>
      <h3 className="font-medium">Квартиры и договоры</h3>
      {draft.links.map((link,index) => <div key={index} className="flex flex-wrap gap-3">
        <label className="text-sm">ID квартиры<input required inputMode="numeric" value={link.unit_id} onChange={e => changeLink(index,'unit_id',e.target.value)} className="block rounded-lg border p-2" /></label>
        <label className="text-sm">ID договора<input required inputMode="numeric" value={link.deal_id} onChange={e => changeLink(index,'deal_id',e.target.value)} className="block rounded-lg border p-2" /></label>
        {draft.links.length > 1 && <button type="button" onClick={() => changeDraft('links',draft.links.filter((_,i) => i!==index))} className="self-end rounded border px-3 py-2">Удалить</button>}
      </div>)}
      <button type="button" disabled={draft.links.length >= 20} onClick={() => changeDraft('links',[...draft.links,{unit_id:'',deal_id:''}])} className="rounded border px-3 py-2">Добавить квартиру</button>
      <div><button type="submit" disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Сохранить черновик</button></div>
    </form>}
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
