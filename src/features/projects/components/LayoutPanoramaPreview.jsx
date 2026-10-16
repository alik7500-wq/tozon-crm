import React, { Suspense, useEffect, useRef, useState } from 'react';
import { tour360Api } from '../../tour360/services/tour360Api';
import { SkyboxGeneratorPanel } from '../../tour360/components/SkyboxGeneratorPanel';
import { TourDraftNavigationEditor } from '../../tour360/components/TourDraftNavigationEditor';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { PanoramaSphere } from '../../tour360/components/PanoramaSphere';
import { TourCanvasErrorBoundary } from '../../tour360/components/TourCanvasErrorBoundary';

const MAX_BYTES = 25 * 1024 * 1024;
const MIN_WIDTH = 2048;
const REQUIRED_ROOMS = ['Гостиная', 'Спальня', 'Кухня', 'Санузел', 'Коридор'];

export function LayoutPanoramaPreview({ layout, projectId }) {
  const previewRef = useRef(null);
  const [url, setUrl] = useState(null);
  const [viewFov, setViewFov] = useState(85);
  const [fileToSave, setFileToSave] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchProgress, setBatchProgress] = useState('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [filename, setFilename] = useState('');
  const [roomName, setRoomName] = useState('Гостиная');
  const [savedRooms, setSavedRooms] = useState([]);
  const [selectedSavedRoom, setSelectedSavedRoom] = useState(null);
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
    const rooms = details.flatMap(t => t?.panoramas || []);
    setSavedRooms(rooms);
    setSelectedSavedRoom(previous => rooms.find(p => p.id === previous?.id) || null);
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
    setSelectedSavedRoom(null);
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

  const selectBatchFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setBatchFiles([]); setBatchProgress(''); setError(''); setSaved('');
    if (!files.length) return;
    if (files.length !== REQUIRED_ROOMS.length) {
      setError('Выберите ровно пять файлов: коридор, гостиная, спальня, кухня, санузел.'); return;
    }
    const matched = [];
    for (const room of REQUIRED_ROOMS) {
      const tokens = {
        'Гостиная': /living|гостиная|lounge/i,
        'Спальня': /bedroom|спальня/i,
        'Кухня': /kitchen|кухня/i,
        'Санузел': /bathroom|санузел|bath/i,
        'Коридор': /corridor|hallway|коридор/i
      };
      const candidates = files.filter(file => tokens[room].test(file.name));
      if (candidates.length !== 1) {
        setError('Не удалось однозначно распознать «' + room + '». Назовите файлы corridor.jpg, living.jpg, bedroom.jpg, kitchen.jpg, bathroom.jpg.'); return;
      }
      const file = candidates[0];
      if (!['image/jpeg', 'image/webp'].includes(file.type) || file.size > MAX_BYTES || file.size === 0) {
        setError('Файл «' + file.name + '» должен быть JPG/WEBP размером до 25 МБ.'); return;
      }
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      try {
        image.src = objectUrl;
        await image.decode();
        if (image.naturalWidth < MIN_WIDTH || image.naturalWidth !== image.naturalHeight * 2) {
          setError('Файл «' + file.name + '» должен иметь пропорции 2:1 и ширину от 2048 пикселей.'); return;
        }
      } catch {
        setError('Не удалось прочитать изображение «' + file.name + '».'); return;
      } finally { URL.revokeObjectURL(objectUrl); }
      matched.push({ room, file });
    }
    if (new Set(matched.map(item => item.file.name)).size !== REQUIRED_ROOMS.length) {
      setError('Для каждой комнаты нужен отдельный файл.'); return;
    }
    setBatchFiles(matched);
  };

  const saveBatch = async () => {
    if (isBatchSaving || batchFiles.length !== REQUIRED_ROOMS.length || !projectId || !layout?.id) return;
    setIsBatchSaving(true); setError(''); setSaved('');
    try {
      const project = Number(projectId);
      const name = `Планировка ${layout.code || layout.id} — 360°`;
      const tours = await tour360Api.getTours(project);
      let tour = tours.find(t => t.name === name && t.tour_type === 'SHOWROOM' && !t.is_active);
      if (tour) {
        const current = await tour360Api.getTourById(tour.id);
        const names = (current?.panoramas || []).map(p => p.name);
        if (names.some(room => !REQUIRED_ROOMS.includes(room)) || new Set(names).size !== names.length) throw new Error('В черновике обнаружены неизвестные или повторяющиеся помещения. Требуется ручная проверка.');
        if (names.length === REQUIRED_ROOMS.length) throw new Error('Все пять помещений уже сохранены. Повторная загрузка не нужна.');
      } else {
        tour = await tour360Api.createTour(project, { name, tour_type: 'SHOWROOM', is_active: false });
      }
      const existingTour = await tour360Api.getTourById(tour.id);
      const existingNames = new Set((existingTour?.panoramas || []).map(p => p.name));
      const pending = batchFiles.filter(({ room }) => !existingNames.has(room));
      for (let index = 0; index < pending.length; index++) {
        const { room, file } = pending[index];
        setBatchProgress(`Загрузка ${index + 1} из ${pending.length}: ${room}`);
        const signed = await tour360Api.requestUploadUrl(project, tour.id, file);
        if (!signed?.signedUploadUrl || !signed?.storagePath) throw new Error('Сервер не выдал ссылку загрузки для «' + room + '».');
        const response = await fetch(signed.signedUploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type, 'x-upsert': 'false' }, body: file });
        if (!response.ok) throw new Error('Загрузка «' + room + '» завершилась ошибкой HTTP ' + response.status);
        await tour360Api.createPanorama(tour.id, { name: room, storage_path: signed.storagePath });
      }
      setBatchFiles([]); setBatchProgress('');
      setSaved('Пять панорам сохранены в закрытом черновике CRM. Публикация не выполнялась.');
      await loadSavedRooms();
    } catch (err) {
      setError((err.message || 'Ошибка загрузки') + ' Уже сохранённые комнаты останутся в черновике. Повторно выберите те же пять файлов: система пропустит сохранённые помещения.');
    } finally { setIsBatchSaving(false); }
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
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>ИИ-задания для пяти помещений</strong>
          <button type="button" disabled={aiManifestLoading || !projectId} onClick={loadAiManifest} className="rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-700 disabled:opacity-50">{aiManifestLoading ? 'Загрузка...' : 'Показать ИИ-задания'}</button>
        </div>
        <p className="text-xs text-slate-600">Просмотр задания не запускает генерацию и не расходует средства.</p>
        {aiManifest && <div className="space-y-3">
          <p className="text-sm font-medium">Планировка {aiManifest.layoutCode} — {aiManifest.scenes?.length || 0} сцен по 4096×2048</p>
          {aiManifest.scenes?.map(scene => <details key={scene.room} className="rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold">{scene.room}</summary>
            <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-700">{scene.prompt}</p>
            <button type="button" onClick={() => navigator.clipboard.writeText(scene.prompt).then(() => setSaved('Задание «' + scene.room + '» скопировано.')).catch(() => setError('Не удалось скопировать задание.'))} className="mt-2 rounded border border-indigo-300 px-2 py-1 text-xs text-indigo-700">Копировать задание</button>
          </details>)}
          <div className="flex flex-wrap gap-3"><a href={aiManifest.planImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-700 underline">Меблированный план</a><a href={aiManifest.technicalPlanUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-700 underline">Технический план</a></div>
          <p className="text-xs text-amber-700">Панель Skybox доступна ниже при настроенном серверном API. Сферическую проекцию и геометрию необходимо проверять.</p>
        </div>}
      </div>
      {Number(layout?.id) === 7 && Number(projectId) === 3 && (
        <section className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h4 className="font-semibold text-emerald-950">Тестовая гостиная — Skybox AI 360°</h4>
          <p className="text-xs text-emerald-900">Внешняя демонстрация по ссылке Skybox AI. Не является опубликованным туром CRM и не подтверждает соответствие планировке.</p>
          <iframe
            title="Skybox AI — тестовая гостиная TOZON PLAZA"
            src="https://skybox.blockadelabs.com/e/96dc4340bf3ca9ff17da17178b5e7d4f"
            className="h-[420px] w-full rounded-lg border-0 bg-slate-900"
            loading="lazy"
            referrerPolicy="no-referrer"
            allow="fullscreen"
            allowFullScreen
          />
          <a href="https://skybox.blockadelabs.com/e/96dc4340bf3ca9ff17da17178b5e7d4f" target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-800 underline">Открыть 360° в отдельном окне</a>
        </section>
      )}
      <div className="rounded-xl border border-indigo-200 p-4 space-y-3">
        <h4 className="font-semibold">Загрузить все пять панорам 8K</h4>
        <p className="text-sm text-slate-600">Выберите пять JPG/WEBP-файлов (до 25 МБ каждый). Названия должны содержать corridor, living, bedroom, kitchen, bathroom либо соответствующие русские названия. Файлы сохраняются только в закрытый черновик. При повторном выборе тех же пяти файлов уже сохранённые комнаты пропускаются.</p>
        <input aria-label="Выбрать пять панорам" type="file" multiple accept="image/jpeg,image/webp" disabled={isBatchSaving} onChange={selectBatchFiles} className="block w-full text-sm" />
        {batchFiles.length === 5 && <div className="space-y-2"><ul className="text-sm">{batchFiles.map(({ room, file }) => <li key={room}>✓ {room}: {file.name}</li>)}</ul><button type="button" disabled={isBatchSaving || !projectId} onClick={saveBatch} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isBatchSaving ? 'Загрузка...' : 'Сохранить 5 комнат в черновик'}</button></div>}
        {batchProgress && <p role="status" className="text-sm text-indigo-700">{batchProgress}</p>}
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Выбрать панораму (2:1, от 2048×1024, до 25 МБ)
        <input type="file" accept="image/jpeg,image/webp" onChange={selectFile} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm" />
      </label>
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between"><strong>Черновики помещений — {completedRooms.length} из {REQUIRED_ROOMS.length}</strong><button type="button" onClick={() => loadSavedRooms().catch(e => setError(e.message))} className="text-sm text-indigo-700">Обновить</button></div>
        <ul className="mt-2 space-y-1 text-sm">{REQUIRED_ROOMS.map(room => <li key={room}>{completedRooms.includes(room) ? '✓' : '○'} {room} {savedRooms.filter(p => p.name === room).map(p => <button key={p.id} type="button" className="ml-2 text-indigo-700 underline" onClick={() => { setSelectedSavedRoom(p); setFileToSave(null); setUrl(null); setError(''); }}>Просмотреть черновик</button>)}</li>)}</ul>
        {savedRooms.length > completedRooms.length && <p className="mt-2 text-xs text-amber-700">Обнаружены повторные или дополнительные панорамы. Проверьте черновик перед публикацией.</p>}
        <p className="mt-2 text-xs text-slate-500">{completedRooms.length === REQUIRED_ROOMS.length ? 'Все пять помещений загружены. Для публикации потребуется отдельная проверка.' : 'Публикация недоступна до подготовки всех пяти помещений и проверки.'}</p>
      </div>
      <SkyboxGeneratorPanel projectId={projectId} layout={layout} />
      {savedRooms[0]?.tour_id && <TourDraftNavigationEditor key={savedRooms[0].tour_id} tourId={savedRooms[0].tour_id} />}
      {fileToSave && <label className="block text-sm font-semibold text-slate-700">Помещение<select value={roomName} onChange={e => setRoomName(e.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm">{REQUIRED_ROOMS.map(name => <option key={name} value={name}>{name}</option>)}</select></label>}
      {fileToSave && <button type="button" disabled={isSaving || !projectId} onClick={savePanorama} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? 'Сохранение...' : 'Сохранить в черновик CRM'}</button>}
      {saved && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{saved}</p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {(url || selectedSavedRoom?.panorama_url || selectedSavedRoom?.image_url) ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{url ? filename : `Черновик: ${selectedSavedRoom?.name}`} — вращайте мышью или пальцем. Пропорции 2:1 не гарантируют корректную сферическую проекцию.</p>
          {savedRooms.length > 0 && <nav className="flex flex-wrap gap-2" aria-label="Комнаты 360">
            {REQUIRED_ROOMS.map(room => {
              const panorama = savedRooms.find(p => p.name === room);
              return <button key={room} type="button" disabled={!panorama} onClick={() => { setSelectedSavedRoom(panorama); setFileToSave(null); setUrl(null); setError(''); }} className="rounded border px-3 py-2 text-sm disabled:opacity-40">{room}</button>;
            })}
          </nav>}
          <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => { const element = previewRef.current; if (element?.requestFullscreen) element.requestFullscreen().catch(() => setError('Полноэкранный просмотр недоступен.')); }}>На весь экран</button>
          <div className="flex flex-wrap items-center gap-3 text-sm"><label htmlFor="tour-fov">Угол обзора: {viewFov}°</label><input id="tour-fov" type="range" min="55" max="100" step="5" value={viewFov} onChange={e => setViewFov(Number(e.target.value))} aria-label="Угол обзора панорамы" /><button type="button" className="rounded border px-3 py-1" onClick={() => setViewFov(85)}>Сбросить масштаб</button><span className="text-xs text-slate-500">Меньший угол приближает изображение; 85° — обзор по умолчанию.</span></div>
          <div ref={previewRef} className="relative h-[55vh] min-h-[260px] max-h-[420px] overflow-hidden rounded-xl bg-slate-950 fullscreen:h-screen fullscreen:max-h-none">
            <TourCanvasErrorBoundary key={url || selectedSavedRoom?.id} panoramaUrl={url || selectedSavedRoom?.panorama_url || selectedSavedRoom?.image_url}>
              <Canvas dpr={[1, 1.5]} gl={{ antialias: true }}>
                <PerspectiveCamera makeDefault position={[0, 0, 0.1]} fov={viewFov} />
                <OrbitControls enablePan={false} enableZoom rotateSpeed={-0.4} minDistance={0.05} maxDistance={0.5} />
                <Suspense fallback={null}><PanoramaSphere panoramaUrl={url || selectedSavedRoom?.panorama_url || selectedSavedRoom?.image_url} /></Suspense>
              </Canvas>
            </TourCanvasErrorBoundary>
          </div>
        </div>
      ) : <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">Панорама пока не выбрана</div>}
    </section>
  );
}
