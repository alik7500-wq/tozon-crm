import React, { useState } from 'react';
import { api } from '../../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { projectAreaMetrics, formatMetricArea, parseMetricArea } from '../projectAreaMetrics';

function UnitArea({ group }) {
  return <div><div className="font-bold text-slate-900 tabular-nums">{group.missing ? 'Площадь уточняется' : formatMetricArea(group.area)}</div><div className="mt-1 text-xs text-slate-500">{group.count} ед.{group.missing > 0 && ` · без площади: ${group.missing}`}</div></div>;
}

export function ProjectMetricsTab({ project, buildings, onBuildingUpdated, onRetry }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(null);
  const [footprint, setFootprint] = useState('');
  const [gross, setGross] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canEdit = ['ADMIN', 'DIRECTOR'].includes(user?.role);
  const { rows, total } = projectAreaMetrics(buildings || []);
  const openEdit = row => {
    setEditing(row); setFootprint(row.footprint === null ? '' : String(row.footprint / 100));
    setGross(row.gross === null ? '' : String(row.gross / 100)); setError(''); setMessage('');
  };
  const save = async event => {
    event.preventDefault(); setError('');
    try {
      const payload = { footprint_area_m2_x100: parseMetricArea(footprint), gross_floor_area_m2_x100: parseMetricArea(gross) };
      setSaving(true);
      const response = await api.patch(`/inventory/projects/${project.id}/buildings/${editing.id}/areas`, payload);
      const building = response.data?.building || response.building;
      if (!building) throw new Error('Не удалось получить сохранённые площади');
      onBuildingUpdated(building); setEditing(null); setMessage('Проектные площади сохранены');
    } catch (err) { setError(err.response?.data?.message || err.message || 'Не удалось сохранить площади'); }
    finally { setSaving(false); }
  };

  const columns = [
    ['footprint', 'Площадь застройки'], ['gross', 'Все этажи'], ['apartments', 'Квартиры'],
    ['commercial', 'Коммерция'], ['parking', 'Машино-места'], ['sellable', 'Продаваемая площадь']
  ];
  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      <h3 className="text-lg font-bold text-slate-900">Площади и состав объекта</h3>
      <p className="mt-2 text-sm text-slate-500">Сводка по каждому блоку и всему объекту. Продаваемая площадь включает весь фонд: квартиры, коммерцию и машино-места, в том числе уже проданные.</p>
      {buildings === null ? <div role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Не удалось загрузить площади. <button onClick={onRetry} className="font-bold underline">Повторить загрузку</button></div> : <>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {columns.map(([key, label]) => <div key={key} className={`rounded-xl border p-4 ${key === 'sellable' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="text-xs font-semibold text-slate-500">{label} · весь объект</div>
            <div className="mt-2 text-xl font-bold tabular-nums text-slate-900">{['footprint', 'gross'].includes(key) ? formatMetricArea(total[key]) : total[key].missing ? 'Площадь уточняется' : formatMetricArea(total[key].area)}</div>
            <div className="mt-1 text-xs text-slate-500">{key === 'footprint' ? 'Пятно зданий на участке' : key === 'gross' ? 'Общая площадь всех этажей по проекту' : `${total[key].count} ед.`}</div>
          </div>)}
        </div>
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[1050px] text-sm text-left">
            <caption className="sr-only">Площади по блокам и общий итог</caption>
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th scope="col" className="p-4">Блок</th>{columns.map(([key, label]) => <th scope="col" key={key} className="p-4">{label}</th>)}</tr></thead>
            <tbody>{[...rows, total].map(row => <tr key={row.id || 'total'} className={`border-t border-slate-100 ${row === total ? 'bg-blue-50/60' : ''}`}>
              <th scope="row" className="p-4 font-bold text-slate-900">{row.name}{canEdit && row !== total && <button onClick={() => openEdit(row)} aria-label={`Указать проектные площади: ${row.name}`} className="mt-2 block text-xs font-semibold text-blue-600 hover:underline">Указать площади</button>}</th>
              {columns.map(([key]) => <td key={key} className="p-4 align-top">{['footprint', 'gross'].includes(key) ? <span className={row[key] === null ? 'text-slate-400' : 'font-bold text-slate-900 tabular-nums'}>{formatMetricArea(row[key])}</span> : <UnitArea group={row[key]} />}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="mt-3 text-sm text-slate-500">Активные блоки пока не добавлены.</p>}
        <p className="mt-4 text-xs text-slate-500 leading-relaxed">Площадь застройки — площадь, занимаемая зданием на участке. Общая площадь всех этажей может включать стены, лестницы, коридоры и технические помещения. Эти показатели заполняются по проектной документации и не выводятся из суммы продаваемых помещений. Если данные есть не по всем блокам, общий итог проектной площади не указан.</p>
        {total.otherCount > 0 && <p role="alert" className="mt-3 text-sm text-amber-700">Объектов с нераспознанным назначением: {total.otherCount}. Они не включены в продаваемую площадь.</p>}
        <h4 className="mt-6 font-bold text-slate-900">Распределение продаваемого фонда</h4>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[680px] text-sm text-left">
          <caption className="sr-only">Площади и количество объектов по статусам</caption>
          <thead className="bg-slate-50 text-xs text-slate-500"><tr><th scope="col" className="p-4">Блок</th>{['Свободно', 'В брони', 'Продано', 'Заблокировано'].map(label => <th scope="col" key={label} className="p-4">{label}</th>)}</tr></thead>
          <tbody>{[...rows, total].map(row => <tr key={row.id || 'total'} className={`border-t border-slate-100 ${row === total ? 'bg-blue-50/60' : ''}`}><th scope="row" className="p-4 font-bold">{row.name}</th>{['available', 'reserved', 'sold', 'blocked'].map(key => <td key={key} className="p-4"><UnitArea group={row[key]} /></td>)}</tr>)}</tbody>
        </table></div>
      </>}
      {message && <p role="status" className="mt-4 text-sm text-emerald-700">{message}</p>}
      {editing && <form onSubmit={save} className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-4" aria-label={`Проектные площади: ${editing.name}`}>
        <h4 className="font-bold text-slate-900">{editing.name} · площади по проектной документации</h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm font-semibold text-slate-700">Площадь застройки (пятно здания), м²<input value={footprint} onChange={e => setFootprint(e.target.value)} inputMode="decimal" disabled={saving} placeholder="Не указано" className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2.5" /></label>
          <label className="text-sm font-semibold text-slate-700">Общая площадь всех этажей, м²<input value={gross} onChange={e => setGross(e.target.value)} inputMode="decimal" disabled={saving} placeholder="Не указано" className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2.5" /></label>
        </div>
        <p className="text-xs text-slate-500">Пустое поле означает «Не указано». Изменение этих площадей не меняет площади квартир и условия договоров.</p>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="flex gap-3"><button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Сохранение…' : 'Сохранить площади'}</button><button type="button" disabled={saving} onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm">Отмена</button></div>
      </form>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      <h3 className="text-lg font-bold text-slate-900">Описание объекта</h3>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">{project.description || 'Описание объекта пока не заполнено.'}</p>
      <div className="mt-5 grid sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm"><div><span className="text-slate-400">Валюта расчётов: </span><strong>{project.currency}</strong></div><div><span className="text-slate-400">Дата добавления в CRM: </span><strong>{project.created_at ? new Date(project.created_at).toLocaleDateString('ru-RU') : 'Не указано'}</strong></div></div>
    </section>
  </div>;
}
