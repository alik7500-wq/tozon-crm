import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { FinanceTabs } from '../../components/FinanceTabs';
import { useAuth } from '../auth/AuthContext';
import { hasReadPermission } from '../../utils/permissions';
import { CostAllocationFields } from './CostAllocationFields';
import { COST_STATES, allocationPayload } from './allocation';
import { MaterialCostsPanel } from './MaterialCostsPanel';

const number = n => n == null ? '—' : Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = minor => minor == null ? '—' : `$${number(minor / 100)}`;
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dushanbe' });

export function BlockCostsPage() {
  const { user } = useAuth();
  const allowed = hasReadPermission(user, 'finance.costs');
  const [asOf, setAsOf] = useState(today);
  const [state, setState] = useState('UNASSIGNED');
  const [block, setBlock] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [basis, setBasis] = useState(null);
  const [error, setError] = useState('');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['block-costs', asOf, user?.id], queryFn: async () => (await api.get('/costs/state', { params: { as_of: asOf } })).data, enabled: allowed && Boolean(asOf) });
  const data = query.data;
  const blocks = (data?.blocks || []).map(b => ({ ...b, project_name: data.projects.find(p => p.id === b.project_id)?.name || '' }));
  const mutation = useMutation({
    mutationFn: ({ path, body }) => api.put(path, body),
    onSuccess: () => { client.invalidateQueries({ queryKey: ['block-costs'] }); setEditor(null); setBasis(null); setError(''); },
    onError: e => setError(e.message)
  });
  const saveAllocation = () => {
    try { setError(''); mutation.mutate({ path: `/costs/allocations/${editor.row.id}`, body: allocationPayload(editor.value, editor.row.allocation?.version || 0) }); } catch (e) { setError(e.message); }
  };
  const saveBasis = () => {
    const area = Number(String(basis.area).replace(',', '.'));
    if (!(area > 0) || !basis.reason.trim()) { setError('Укажите общую продаваемую площадь и основание'); return; }
    mutation.mutate({ path: `/costs/bases/${basis.block.id}`, body: { sellable_area_m2: area, reason: basis.reason, expected_version: basis.block.basis?.version || 0 } });
  };
  const rows = (data?.rows || []).filter(r => (state === 'ALL' || r.state === state || (state === 'MISSING_FX' && r.state === 'UNASSIGNED' && r.usd_minor == null)) &&
    (block === 'ALL' || r.portions.some(p => p.building_id === Number(block))) &&
    `${r.reference || r.id} ${r.category || ''} ${r.description || ''}`.toLowerCase().includes(search.toLowerCase()));
  if (!allowed) return <p role="alert">Нет доступа к себестоимости блоков.</p>;
  return <div className="space-y-5 pb-16">
    <h1 className="text-2xl font-bold text-slate-900">Себестоимость по блокам</h1>
    <FinanceTabs />
    <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-950">Себестоимость = расходы по проведённым РКО + неоплаченная стоимость использованной арматуры и залитого бетона. Оплаты этих материалов связываются с их использованием и повторно в затраты не добавляются. Материалы на складе и авансы до использования не включаются. Показатель на 1 м² рассчитан по всей подтверждённой продаваемой площади блока.</p>
    <label className="flex gap-3 items-center text-sm">Затраты по дату включительно
      <input aria-label="Дата расчёта" type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="border rounded-lg p-2" />
    </label>
    {query.isPending && <p>Загрузка расчёта…</p>}
    {query.isError && <div role="alert" className="bg-red-50 p-4 rounded-xl text-red-800">{query.error.message}<button className="underline ml-3" onClick={() => query.refetch()}>Повторить</button></div>}
    {data && <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border rounded-xl p-4"><p className="text-sm text-slate-500">Распределено в затраты</p><strong className="text-2xl">{money(data.totals.allocated_usd_minor)}</strong></div>
        <button className="border rounded-xl p-4 text-left bg-amber-50" onClick={() => { setState('UNASSIGNED'); setBlock('ALL'); }}><p className="text-sm">Ожидают распределения</p><strong className="text-2xl">{data.totals.unassigned_count} РКО</strong></button>
        <button className="border rounded-xl p-4 text-left" onClick={() => { setState('MISSING_FX'); setBlock('ALL'); }}><p className="text-sm">Без курса / USD среди всех неучтённых</p><strong className="text-2xl">{data.totals.missing_fx_count} РКО</strong></button>
      </div>
      <p className="text-sm text-amber-900">Расчёт предварительный, пока остались нераспределённые РКО, неподтверждённые площади или расходы без курса. Площадь используется из текущего подтверждения, даже при выборе прошлой даты.</p>
      <div className="grid md:grid-cols-2 gap-4">{blocks.map(b => <article key={b.id} className="rounded-2xl border p-5 bg-white space-y-3">
        <h2 className="text-lg font-bold">{b.project_name} · {b.name}{b.archived_at ? ' (архив)' : ''}</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-500">Себестоимость блока</dt><dd className="text-xl font-bold">{money(b.amount_usd_minor)}</dd></div>
          <div><dt className="text-slate-500">На 1 м²</dt><dd className="text-xl font-bold">{b.cost_per_m2_usd == null ? 'Подтвердите площадь' : `$${number(b.cost_per_m2_usd)}`}</dd></div>
          <div><dt>Прямые РКО</dt><dd>{money(b.direct_usd_minor)}</dd></div><div><dt>Доля общих РКО</dt><dd>{money(b.shared_usd_minor)}</dd></div>
          <div><dt>Оплаченная часть затрат</dt><dd>{money(b.paid_cost_usd_minor)}</dd></div><div><dt>Не оплачено использованных материалов</dt><dd>{money(b.unpaid_material_usd_minor)}</dd></div>
          <div><dt>Обычные расходы по РКО</dt><dd>{money(b.ordinary_rko_usd_minor)}</dd></div><div><dt>Бетон и арматура использованы</dt><dd>{money(b.material_used_usd_minor)}</dd></div>
          <div><dt>Продаваемая площадь</dt><dd>{b.basis ? `${number(b.basis.sellable_area_m2)} м²` : 'Не подтверждена'}</dd></div>
          <div><dt>В реестре помещений</dt><dd>{number(b.registry_area_m2)} м² · {b.registry_unit_count} шт.</dd></div>
        </dl>
        {b.basis && <p className="text-xs text-slate-500">Основание: {b.basis.reason} · {new Date(b.basis.updated_at).toLocaleDateString('ru-RU')}</p>}
        <div className="flex flex-wrap gap-3 text-sm">
          <button className="text-blue-700 underline" onClick={() => { setBlock(String(b.id)); setState('ALL'); }}>Показать расходы блока</button>
          {data.can_write && !b.archived_at && <button className="text-blue-700 underline" onClick={() => { setError(''); setBasis({ block: b, area: b.basis?.sellable_area_m2 || '', reason: '' }); }}>Подтвердить / изменить площадь</button>}
        </div>
        {Object.keys(b.categories).length > 0 && <details><summary className="text-sm cursor-pointer">По статьям расходов</summary>{Object.entries(b.categories).map(([key, amount]) => <div key={key} className="flex justify-between gap-3 text-sm py-1"><span>{key}</span><strong>{money(amount)}</strong></div>)}</details>}
      </article>)}</div>
      <MaterialCostsPanel data={data} blocks={blocks} asOf={asOf} />
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">Статус<select aria-label="Статус РКО" value={state} onChange={e => setState(e.target.value)} className="block border rounded-lg p-2 bg-white"><option value="ALL">Все</option>{Object.entries(COST_STATES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm">Блок<select aria-label="Фильтр блока" value={block} onChange={e => setBlock(e.target.value)} className="block border rounded-lg p-2 bg-white"><option value="ALL">Все, включая нераспределённые</option>{blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="text-sm">Поиск<input className="block border rounded-lg p-2" value={search} onChange={e => setSearch(e.target.value)} placeholder="РКО, статья, описание" /></label>
      </div>
      <p className="text-sm">Показано: {rows.length} РКО</p>
      <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm text-left"><thead className="bg-slate-100"><tr>{['Дата / РКО', 'Статья / описание', 'Сохранённая сумма', 'USD', 'Учёт', ''].map((t, i) => <th key={i} className="p-3">{t}</th>)}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} className="border-t"><td className="p-3 whitespace-nowrap">{r.date}<br />{r.reference || `РКО-${r.id}`}</td><td className="p-3 max-w-sm"><strong>{r.category}</strong><p className="text-xs text-slate-500 break-words">{r.description}</p></td><td className="p-3 whitespace-nowrap">{number(r.amount_minor / 100)} {r.currency}</td><td className="p-3">{money(r.usd_minor)}</td><td className="p-3"><strong>{COST_STATES[r.state]}</strong><p className="text-xs">{r.reason}</p>{r.portions.map(p => <div key={p.building_id} className="text-xs">{blocks.find(b => b.id === p.building_id)?.name}: {money(p.amount)}</div>)}</td><td className="p-3">{data.can_write && r.state !== 'AUTO_EXCLUDED' && <button className="text-blue-700 underline" onClick={() => { setError(''); setEditor({ row: r, value: { mode: r.allocation?.mode || 'UNASSIGNED', building_ids: (r.allocation?.shares || []).map(s => s.building_id), reason: r.allocation?.reason || '' } }); }}>Распределить</button>}</td></tr>)}
        {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Нет РКО с выбранными фильтрами.</td></tr>}
      </tbody></table></div>
    </>}
    {(editor || basis) && <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-center items-center p-4"><section role="dialog" aria-modal="true" aria-label={editor ? 'Распределение РКО' : 'Подтверждение площади'} className="bg-white rounded-2xl p-5 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4">
      <h2 className="text-xl font-bold">{editor ? `Распределение ${editor.row.reference || `РКО-${editor.row.id}`}` : `Площадь: ${basis.block.name}`}</h2>
      {editor ? <CostAllocationFields value={editor.value} onChange={value => setEditor({ ...editor, value })} blocks={blocks} disabled={mutation.isPending} /> : <>
        <p className="text-sm">Введите всю продаваемую площадь: квартиры + коммерция, включая проданные помещения. Лестницы, общие коридоры и другие непродаваемые площади не включайте.</p>
        <p className="text-sm text-amber-800">В реестре: {number(basis.block.registry_area_m2)} м². Проверьте, включена ли вся коммерция. Это подсказка, а не подтверждённый итог.</p>
        <label className="block">Общая продаваемая площадь, м²<input aria-label="Продаваемая площадь" className="block border rounded-lg p-2 w-full" inputMode="decimal" value={basis.area} onChange={e => setBasis({ ...basis, area: e.target.value })} /></label>
        <label className="block">Основание<textarea aria-label="Основание площади" className="block border rounded-lg p-2 w-full" maxLength={2000} value={basis.reason} onChange={e => setBasis({ ...basis, reason: e.target.value })} placeholder="Проектная ведомость площадей…" /></label>
        <p className="text-xs text-slate-500">Изменение площади обновит показатель на 1 м². Ранее распределённые общие РКО сохранят свои пропорции; при необходимости перераспределите их отдельно.</p>
      </>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="flex justify-end gap-3"><button disabled={mutation.isPending} onClick={() => { setEditor(null); setBasis(null); setError(''); }} className="border rounded-lg px-4 py-2">Отмена</button><button disabled={mutation.isPending} onClick={editor ? saveAllocation : saveBasis} className="bg-blue-600 text-white rounded-lg px-4 py-2">{mutation.isPending ? 'Сохранение…' : 'Сохранить'}</button></div>
    </section></div>}
  </div>;
}
