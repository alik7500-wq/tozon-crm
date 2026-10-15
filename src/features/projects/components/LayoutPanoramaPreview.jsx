import React, { Suspense, useEffect, useState } from 'react';
import { tour360Api } from '../../tour360/services/tour360Api';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PanoramaSphere } from '../../tour360/components/PanoramaSphere';
import { TourCanvasErrorBoundary } from '../../tour360/components/TourCanvasErrorBoundary';

const MAX_BYTES = 25 * 1024 * 1024;
const MIN_WIDTH = 2048;
const REQUIRED_ROOMS = ['Гостиная', 'Спальня', 'Кухня', 'Санузел', 'Коридор'];

export function LayoutPanoramaPreview({ layout, projectId }) {
  const [url, setUrl] = useState(null);
  const [fileToSave, setFileToSave] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [filename, setFilename] = useState('');
  const [roomName, setRoomName] = useState('Гостиная');
  const [savedRooms, setSavedRooms] = useState([]);
  const [aiManifest, setAiManifest] = useState(null);
  const [aiManifestLoading, setAiManifestLoading] = useState(false);
  const completedRooms = REQUIRED_ROOMS.filter(room => savedRooms.some(p => p.name === room));
  const [error, setError] = useState('');
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const loadSavedRooms = async () => {
    if (!projectId || !layout?.id) return;
    const name = `Планировка ${layout.code || layout.id} — 360°`;
    const tours = await tour360Api.getTours(Number(projectId));
    const drafts = tours.filter(t => t.name === name && t.tour_type === 'SHOWROOM' && !t.is_active);
    const details = await Promise.all(drafts.map(t => tour360Api.getTourById(t.id)));
    setSavedRooms(details.flatMap(t => t?.panoramas || []));
  };

  useEffect(() => {
    loadSavedRooms().catch(() => setSavedRooms([]));
  }, [projectId, layout?.id]);

  const loadAiManifest = async () => {
    setAiManifestLoading(true);
    setError('');
    try {
      const manifest = await tour360Api.getPilotAiManifest(projectId);
      if (!manifest || Number(layout?.id) !== Number(manifest.layoutTypeId)) {
        throw new Error('ИИ-задание пока доступно только для пилотной планировки блока А, тип 6.');
      }
      setAiManifest(manifest);
    } catch (err) {
      setError(err.message || 'Не удалось получить ИИ-задание.');
    } finally { setAiManifestLoading(false); }
  };

  const selectFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setSaved('');
    setFileToSave(null);
    setUrl(null);
    setFilename('');
    if (!['image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Выберите панораму JPG или WEBP.'); return;
    }
    if (file.size > MAX_BYTES) {
      setError('Размер изображения не должен превышать 25 МБ.'); return;
    }
    const candidate = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = candidate;
      await image.decode();
      if (image.naturalWidth < MIN_WIDTH || image.naturalWidth !== image.naturalHeight * 2) {
        setError('Требуется сферическая панорама с пропорциями 2:1, шириной от 2048 пикселей.');
        URL.revokeObjectURL(candidate);
        return;
      }
      setFilename(file.name);
      setFileToSave(file);
      setUrl(candidate);
    } catch {
      URL.revokeObjectURL(candidate);
      setError('Изображение повреждено или не поддерживается браузером.');
    }
  };

  const savePanorama = async () => {
    if (!fileToSave || !projectId) {
      setError('Не удалось определить проект планировки. Сохранение недоступно.');
      return;
    }
    setIsSaving(true);
    setError('');
    setSaved('');
    try {
      const targetProjectId = Number(projectId);
      const name = `Планировка ${layout.code || layout.id} — 360°`;
      const existing = await tour360Api.getTours(targetProjectId);
      let tour = existing.find(t => t.name === name && t.tour_type === 'SHOWROOM' && !t.is_active);
      if (tour) {
        const current = await tour360Api.getTourById(tour.id);
        if (current?.panoramas?.some(p => p.name === roomName)) {
          throw new Error(`Панорама «${roomName}» уже сохранена. Повторная загрузка отменена.`);
        }
      } else {
        tour = await tour360Api.createTour(targetProjectId, { name, tour_type: 'SHOWROOM', is_active: false });
      }
      const signed = await tour360Api.requestUploadUrl(targetProjectId, tour.id, fileToSave);
      if (!signed?.signedUploadUrl || !signed?.storagePath) {
        throw new Error('Сервер не предоставил ссылку для загрузки панорамы.');
      }
      const uploadEndpoint = signed.signedUploadUrl;
      const response = await fetch(uploadEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': fileToSave.type, 'x-upsert': 'false' },
        body: fileToSave
      });
      if (!response.ok) throw new Error(`Не удалось загрузить файл (HTTP ${response.status}).`);
      await tour360Api.createPanorama(tour.id, { name: roomName, storage_path: signed.storagePath });
      setSaved('Панорама сохранена в черновике 360°-тура. Публикация не выполнялась.');
      await loadSavedRooms();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить панораму.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4" aria-label="Проверка панорамы 360 градусов">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <h4 className="font-bold text-indigo-950">360° панорама — предварительный просмотр</h4>
        <p className="mt-1 text-sm text-indigo-900">Загрузите готовый сферический JPG/WEBP-файл для локальной проверки. Сначала проверьте изображение локально. По кнопке «Сохранить» файл отправляется в защищённое хранилище CRM как черновик без публикации.</p>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Выбрать панораму (2:1, от 2048×1024, до 25 МБ)
        <input type="file" accept="image/jpeg,image/webp" onChange={selectFile} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm" />
      </label>
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between"><strong>Черновики помещений — {completedRooms.length} из {REQUIRED_ROOMS.length}</strong><button type="button" onClick={() => loadSavedRooms().catch(e => setError(e.message))} className="text-sm text-indigo-700">Обновить</button></div>
        <ul className="mt-2 space-y-1 text-sm">{REQUIRED_ROOMS.map(room => <li key={room}>{completedRooms.includes(room) ? '✓' : '○'} {room}</li>)}</ul>
        {savedRooms.length > completedRooms.length && <p className="mt-2 text-xs text-amber-700">Обнаружены повторные или дополнительные панорамы. Проверьте черновик перед публикацией.</p>}
        <p className="mt-2 text-xs text-slate-500">{completedRooms.length === REQUIRED_ROOMS.length ? 'Все пять помещений загружены. Для публикации потребуется отдельная проверка.' : 'Публикация недоступна до подготовки всех пяти помещений и проверки.'}</p>
      </div>
      {fileToSave && <label className="block text-sm font-semibold text-slate-700">Помещение<select value={roomName} onChange={e => setRoomName(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm">{REQUIRED_ROOMS.map(name => <option key={name} value={name}>{name}</option>)}</select></label>}
      {fileToSave && <button type="button" disabled={isSaving || !projectId} onClick={savePanorama} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? 'Сохранение...' : 'Сохранить в черновик CRM'}</button>}
      {saved && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{saved}</p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {url ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{filename} — вращайте мышью или пальцем. Пропорции 2:1 не гарантируют корректную сферическую проекцию.</p>
          <div className="relative h-[420px] overflow-hidden rounded-xl bg-slate-950">
            <TourCanvasErrorBoundary panoramaUrl={url}>
              <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }} gl={{ antialias: true }}>
                <OrbitControls enablePan={false} enableZoom rotateSpeed={-0.4} minDistance={0.05} maxDistance={0.5} />
                <Suspense fallback={null}><PanoramaSphere panoramaUrl={url} /></Suspense>
              </Canvas>
            </TourCanvasErrorBoundary>
          </div>
        </div>
      ) : <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">Панорама пока не выбрана</div>}
    </section>
  );
}
