import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useActivityTracking } from '../activity/ActivityTracking';
import { api } from '../../api/client';
import { VisualMapsTab } from './tabs/VisualMapsTab';
import { GalleryLightbox } from '../projectGallery/components/GalleryLightbox';
import { projectGalleryApi } from '../projectGallery/services/projectGalleryApi';
import { isTozonAerial } from '../projectGallery/components/aerialBuildingInfo';
import { vgMedia } from '../projectGallery/components/vgBuildingModel';

export function ShowroomPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  useActivityTracking(user?.id, location.pathname);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [view, setView] = useState(null);
  const cache = useRef(new Map());
  const alive = useRef(true);
  const [resources, setResources] = useState({});
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // Page-local cache: no storage across users or sessions. In-flight requests
  // are shared by preloading, selection and reopening the same facade.
  const warmProject = useCallback(id => {
    const key = String(id);
    let entry = cache.current.get(key);
    if (!entry) { entry = {}; cache.current.set(key, entry); }
    const publish = () => {
      if (alive.current) setResources(prev => ({...prev, [key]: {
        images: entry.images, buildings: entry.buildings, error: entry.error,
        mediaLoading: !!entry.mediaRequest
      }}));
    };
    if (!entry.images && !entry.mediaRequest) {
      entry.error = '';
      entry.mediaRequest = (Number(id) === 4 ? Promise.resolve([vgMedia])
        : projectGalleryApi.getProjectMedia(id, {is_active:true}))
        .then(items => {
          entry.images = (items || []).filter(item => item.is_active !== false);
          // Fetch the interactive facade image while the user views the map.
          for (const image of entry.images.filter(item => isTozonAerial(id, item))) {
            const preview = new Image();
            preview.decoding = 'async';
            preview.src = image.url || image.image_url;
            preview.decode?.().catch(() => {});
          }
        }).catch(err => { entry.error = err.message; })
        .finally(() => { entry.mediaRequest = null; publish(); });
    }
    if (!entry.inventoryRequest && (!entry.inventoryAt || Date.now()-entry.inventoryAt > 30000)) {
      entry.inventoryRequest = api.get(`/inventory/projects/${id}/chessboard`)
        .then(res => { entry.buildings = res.data?.chessboard || []; entry.inventoryAt = Date.now(); })
        .catch(() => { /* Keep the facade usable if block statistics fail. */ })
        .finally(() => { entry.inventoryRequest = null; publish(); });
    }
    publish();
    return entry;
  }, []);

  const current = view ? resources[String(view.projectId)] : null;
  const images = current?.images || [];
  const buildings = current?.buildings || null;
  const index = view ? images.findIndex(image => String(image.id) === String(view.mediaId)) : -1;
  const mediaError = current?.error || (current?.images && index < 0 ? 'Фасад этого блока недоступен. Вернитесь к генплану.' : '');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    api.get('/projects').then(res => {
      if (!alive) return;
      const list = [...(res.data?.projects || [])].sort((a,b) => Number(a.id)-Number(b.id));
      setProjects(list); setProjectId(list[0] ? String(list[0].id) : '');
    }).catch(err => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reload]);

  useEffect(() => {
    if (!projectId) return;
    warmProject(projectId);
    // The shared genplan also links to В/Г. Only preload an accessible project.
    if (Number(projectId) === 3 && projects.some(project => Number(project.id) === 4)) warmProject(4);
  }, [projectId, projects, warmProject]);

  useEffect(() => {
    if (!view) return;
    const refresh = () => { if (document.visibilityState === 'visible') warmProject(view.projectId); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [view?.projectId, warmProject]);

  const openMedia = (mediaId, buildingId) => {
    const targetProject = mediaId === 'vg-schematic' ? 4 : Number(projectId);
    warmProject(targetProject);
    setView({mediaId, buildingId, projectId:targetProject});
  };

  return <main className="min-h-dvh w-full bg-slate-50 p-4 sm:p-6" aria-label="Шоурум">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold text-slate-900">Шоурум</h1>
      {projects.length > 0 && <label className="flex items-center gap-2 text-sm text-slate-600">Жилой комплекс
        <select aria-label="Жилой комплекс шоурума" className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900" value={projectId} onChange={e => { setView(null); setProjectId(e.target.value); }}>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>}
      <button type="button" onClick={() => navigate('/projects')} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">Выйти из шоурума</button>
    </header>
    {loading ? <p role="status">Загрузка объектов…</p> : error ? <p role="alert">{error} <button type="button" className="underline" onClick={() => setReload(n => n+1)}>Повторить</button></p> : projectId ?
      <VisualMapsTab key={projectId} projectId={projectId} presentationMode onOpenMedia={openMedia}/> : <p>Нет доступных объектов.</p>}
    {view && index < 0 && <div className="fixed inset-0 z-50 grid place-content-center gap-4 bg-slate-950/95 p-6 text-center text-white">
      <p role={mediaError?'alert':'status'}>{mediaError || 'Загрузка фасада…'}</p>
      <button type="button" onClick={() => setView(null)} className="rounded-xl border border-white/30 px-4 py-2">← К генплану</button>
    </div>}
    {view && index >= 0 && <GalleryLightbox key={`${view.projectId}:${view.buildingId}`} images={images} currentIndex={index} isOpen projectId={view.projectId} buildings={buildings} initialBuildingId={view.buildingId} floorSelectionOnly onNavigate={next => setView(prev => ({...prev,mediaId:images[next].id}))} onClose={() => setView(null)}/>}
  </main>;
}
