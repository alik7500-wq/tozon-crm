import React, { useEffect, useState } from 'react';
import { tour360Api } from '../services/tour360Api';

export function TourDraftNavigationEditor({ tourId }) {
  const [tour, setTour] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [manifest, setManifest] = useState(null);
  const refresh = async () => {
    const value = await tour360Api.getTourById(tourId);
    if (!value || value.is_active) throw new Error('Редактировать можно только черновик.');
    setTour(value);
    setReport(null); setApproved(false); setManifest(null);
    setFrom(old => value.panoramas?.some(p => String(p.id) === old) ? old : String(value.panoramas?.[0]?.id || ''));
    setTo(old => value.panoramas?.some(p => String(p.id) === old) ? old : String(value.panoramas?.[1]?.id || ''));
  };
  useEffect(() => { refresh().catch(e => setError(e.message)); }, [tourId]);
  const run = async action => {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const panoramas = tour?.panoramas || [];
  const current = panoramas.find(p => String(p.id) === from);
  const links = (current?.hotspots || []).filter(h => h.hotspot_type === 'NAVIGATION');
  return <section className="space-y-3 rounded-xl border p-4">
    <h4 className="font-semibold">Переходы между помещениями</h4>
    <p className="text-sm">Выберите исходную и целевую комнату. Для обратного перехода создайте отдельную связь.</p>
    <div className="grid gap-2 sm:grid-cols-2">
      <label>Откуда<select className="block w-full border p-2" value={from} onChange={e => setFrom(e.target.value)}>{panoramas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Куда<select className="block w-full border p-2" value={to} onChange={e => setTo(e.target.value)}>{panoramas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Горизонтальный угол<input className="block w-full border p-2" type="number" min="-360" max="360" value={yaw} onChange={e => setYaw(e.target.value)} /></label>
      <label>Вертикальный угол<input className="block w-full border p-2" type="number" min="-90" max="90" value={pitch} onChange={e => setPitch(e.target.value)} /></label>
    </div>
    <button type="button" className="rounded bg-indigo-600 p-2 text-white disabled:opacity-50" disabled={busy || !from || !to} onClick={() => run(async () => {
      if (from === to) throw new Error('Выберите разные комнаты.');
      if (!Number.isFinite(Number(yaw)) || !Number.isFinite(Number(pitch)) || Math.abs(Number(yaw)) > 360 || Math.abs(Number(pitch)) > 90) throw new Error('Некорректный угол.');
      await tour360Api.createHotspot(from, { hotspot_type: 'NAVIGATION', target_panorama_id: Number(to), yaw: Number(yaw), pitch: Number(pitch), label: panoramas.find(p => String(p.id) === to)?.name });
      await refresh(); setReport(null);
    })}>Добавить переход</button>
    <ul>{links.map(h => <li key={h.id} className="flex justify-between gap-2 border-b p-2"><span>{panoramas.find(p => p.id === h.target_panorama_id)?.name || h.target_panorama_id}</span><button type="button" className="text-red-700 underline" disabled={busy} onClick={() => run(async () => { await tour360Api.deleteHotspot(h.id); await refresh(); setReport(null); })}>Удалить</button></li>)}</ul>
    <button type="button" className="rounded border p-2" disabled={busy} onClick={() => run(async () => setReport(await tour360Api.getPublishPreflight(tourId)))}>Проверить готовность</button>
    {report && <div className="text-sm"><p>{report.ready_for_publish ? 'Технические условия выполнены' : 'Тур ещё не готов'}</p><p>Отсутствуют комнаты: {report.navigation?.missing_rooms?.join(', ') || 'нет'}. Недоступных комнат: {report.navigation?.unreachable_panorama_ids?.length || 0}. Отсутствующих файлов: {report.missing_or_unreadable?.length || 0}.</p><p>Публикация требует отдельного разрешения и безопасного переноса файлов; здесь она не выполняется.</p></div>}
    {report?.ready_for_publish && <div className="space-y-2 border-t pt-2 text-sm"><label className="flex gap-2"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />Подтверждаю ручную проверку планировки, изображений и переходов. Тур не будет опубликован автоматически.</label><button type="button" disabled={!approved || busy} className="rounded border p-2 disabled:opacity-50" onClick={() => run(async () => setManifest(await tour360Api.getPublishManifest(tourId)))}>Проверить план публикации</button>{manifest && <p role="status">План подготовлен: {manifest.files?.length || 0} файлов. Выполнение: {manifest.can_execute === false ? 'заблокировано до отдельного релиза' : 'неожиданный статус — обратитесь к администратору'}.</p>}</div>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
