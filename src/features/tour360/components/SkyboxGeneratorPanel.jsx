import React, { useEffect, useState } from 'react';
import { tour360Api } from '../services/tour360Api';

const ROOMS = ['Гостиная', 'Спальня', 'Кухня', 'Санузел', 'Коридор'];
export function SkyboxGeneratorPanel({ projectId, layout }) {
  const [status, setStatus] = useState(null);
  const [styles, setStyles] = useState([]);
  const [styleId, setStyleId] = useState('');
  const [room, setRoom] = useState('Гостиная');
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (Number(projectId) !== 3 || Number(layout?.id) !== 7) return;
    tour360Api.getSkyboxStatus(projectId).then(setStatus).catch(e => setError(e.message));
  }, [projectId, layout?.id]);
  if (Number(projectId) !== 3 || Number(layout?.id) !== 7) return null;
  const loadStyles = async () => {
    setBusy(true); setError('');
    try {
      const data = await tour360Api.getSkyboxStyles(projectId);
      const items = Array.isArray(data) ? data : data?.styles || data?.data || [];
      setStyles(Array.isArray(items) ? items : []);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const generate = async () => {
    if (!approved || !styleId) return;
    setBusy(true); setError('');
    try {
      const tourName = `Планировка ${layout.code || layout.id} — 360°`;
      const tours = await tour360Api.getTours(projectId);
      let tour = tours.find(t => t.name === tourName && t.tour_type === 'SHOWROOM' && !t.is_active);
      if (!tour) tour = await tour360Api.createTour(projectId, { name: tourName, tour_type: 'SHOWROOM', is_active: false });
      const result = await tour360Api.startSkyboxGeneration(projectId, { tourId: tour.id, room, styleId: Number(styleId), approved: true });
      setJob(result);
      setApproved(false);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const refreshJob = async () => {
    if (!job?.jobId) return;
    setBusy(true); setError('');
    try { const next = await tour360Api.getSkyboxJob(projectId, job.jobId); setJob(previous => ({ ...previous, status: next?.status || previous.status })); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
    <h3 className="font-semibold text-slate-900">ИИ-генератор Skybox AI — пилотная квартира</h3>
    <p className="text-sm text-slate-700">Ключ хранится только на сервере. Генерация расходует кредиты Skybox. Результат не публикуется автоматически и требует проверки планировки.</p>
    <p className="text-sm">API: {status?.configured ? 'ключ настроен' : 'ключ не настроен'} · Генерация: {status?.generationEnabled ? 'разрешена администратором' : 'отключена'}</p>
    {status?.configured && <button type="button" disabled={busy} onClick={loadStyles} className="rounded border px-3 py-2 text-sm">Загрузить стили Skybox</button>}
    {styles.length > 0 && <div className="flex flex-wrap gap-2">
      <select aria-label="Помещение" value={room} onChange={e => setRoom(e.target.value)} className="rounded border p-2">{ROOMS.map(r => <option key={r}>{r}</option>)}</select>
      <select aria-label="Стиль Skybox" value={styleId} onChange={e => setStyleId(e.target.value)} className="rounded border p-2"><option value="">Выберите стиль</option>{styles.map(s => <option key={s.id} value={s.id}>{s.name || s.title || s.id}</option>)}</select>
    </div>}
    {status?.generationEnabled && styles.length > 0 && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />Подтверждаю расход кредитов Skybox на создание одной панорамы</label>}
    <button type="button" disabled={!status?.configured || !status?.generationEnabled || !approved || !styleId || busy} onClick={generate} className="rounded bg-indigo-700 px-3 py-2 text-sm text-white disabled:opacity-40">Создать панораму за кредиты</button>
    {job && <div role="status" className="text-sm">Задание Skybox №{job.jobId}: {job.status}. Изображение пока не загружено в CRM. <button type="button" disabled={busy} onClick={refreshJob} className="underline">Проверить статус</button></div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
