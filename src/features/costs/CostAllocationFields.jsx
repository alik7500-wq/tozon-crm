import React from 'react';
import { COST_STATES } from './allocation';

export function CostAllocationFields({ value, onChange, blocks, disabled = false }) {
  const update = patch => onChange({ ...value, ...patch });
  const selected = value.building_ids.map(Number);
  return <fieldset disabled={disabled} className="space-y-3 rounded-xl border border-slate-200 p-3">
    <legend className="px-1 font-bold">Отнесение на себестоимость</legend>
    <label className="block text-sm">Способ учёта
      <select className="mt-1 w-full rounded-lg border p-2 bg-white" value={value.mode} onChange={e => update({ mode: e.target.value, building_ids: [] })}>
        {['UNASSIGNED', 'DIRECT', 'SHARED', 'EXCLUDED'].map(mode => <option key={mode} value={mode}>{COST_STATES[mode]}</option>)}
      </select>
    </label>
    {value.mode === 'DIRECT' && <label className="block text-sm">Блок
      <select className="mt-1 w-full rounded-lg border p-2 bg-white" value={selected[0] || ''} onChange={e => update({ building_ids: e.target.value ? [Number(e.target.value)] : [] })}>
        <option value="">Выберите блок</option>
        {blocks.filter(b => !b.archived_at).map(b => <option key={b.id} value={b.id}>{b.project_name} · {b.name}</option>)}
      </select>
    </label>}
    {value.mode === 'SHARED' && <div className="space-y-2 text-sm">
      <p>Выберите блоки одного проекта. Пропорция — по подтверждённой продаваемой площади.</p>
      {blocks.filter(b => !b.archived_at).map(b => <label key={b.id} className="flex gap-2 items-center">
        <input type="checkbox" checked={selected.includes(b.id)} onChange={e => update({ building_ids: e.target.checked ? [...selected, b.id] : selected.filter(id => id !== b.id) })} />
        {b.project_name} · {b.name} — {b.basis ? `${Number(b.basis.sellable_area_m2).toLocaleString('ru-RU')} м²` : 'площадь не подтверждена'}
      </label>)}
    </div>}
    <label className="block text-sm">Основание / пояснение
      <textarea className="mt-1 w-full rounded-lg border p-2" value={value.reason} maxLength={2000} onChange={e => update({ reason: e.target.value })} placeholder="Например: арматура для блока Б по накладной…" />
    </label>
    <p className="text-xs text-slate-500">Выдачу аванса, возврат займа и прочие выплаты, ещё не являющиеся расходом, оставляйте нераспределёнными либо исключайте с пояснением.</p>
  </fieldset>;
}
