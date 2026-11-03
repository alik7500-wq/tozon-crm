import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useActivityTracking } from '../activity/ActivityTracking';
import { api } from '../../api/client';
import { VisualMapsTab } from './tabs/VisualMapsTab';
import { GalleryLightbox } from '../projectGallery/components/GalleryLightbox';
import { projectGalleryApi } from '../projectGallery/services/projectGalleryApi';
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
  const [images, setImages] = useState([]);
  const [buildings, setBuildings] = useState(null);
  const [index, setIndex] = useState(null);
  const [mediaError, setMediaError] = useState('');
  const [mediaLoading, setMediaLoading] = useState(false);

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
    if (!view) return;
    let alive = true;
    setImages([]); setIndex(null); setBuildings(null); setMediaError(''); setMediaLoading(true);
    // Load the facade and its actual project's inventory independently.
    const media = Number(view.projectId) === 4 ? Promise.resolve([vgMedia])
      : projectGalleryApi.getProjectMedia(view.projectId, { is_active: true });
    media.then(items => {
      if (!alive) return;
      const list = (items || []).filter(item => item.is_active !== false);
      const target = list.findIndex(item => String(item.id) === String(view.mediaId));
      if (target < 0) { setMediaError('Фасад этого блока недоступен. Вернитесь к генплану.'); return; }
      setImages(list); setIndex(target);
    }).catch(err => { if (alive) setMediaError(err.message); })
      .finally(() => { if (alive) setMediaLoading(false); });
    api.get(`/inventory/projects/${view.projectId}/chessboard`).then(res => {
      if (alive) setBuildings(res.data?.chessboard || []);
    }).catch(() => { if (alive) setBuildings(null); });
    return () => { alive = false; };
  }, [view]);

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
      <VisualMapsTab key={projectId} projectId={projectId} presentationMode onOpenMedia={(mediaId, buildingId) => { setIndex(null); setMediaError(''); setMediaLoading(true); setView({mediaId, buildingId, projectId:mediaId === 'vg-schematic' ? 4 : Number(projectId)}); }}/> : <p>Нет доступных объектов.</p>}
    {view && index === null && <div className="fixed inset-0 z-50 grid place-content-center gap-4 bg-slate-950/95 p-6 text-center text-white">
      <p role={mediaError?'alert':'status'}>{mediaError || (mediaLoading ? 'Загрузка фасада…' : 'Фасад недоступен.')}</p>
      <button type="button" onClick={() => setView(null)} className="rounded-xl border border-white/30 px-4 py-2">← К генплану</button>
    </div>}
    {view && index !== null && <GalleryLightbox key={`${view.projectId}:${view.buildingId}`} images={images} currentIndex={index} isOpen projectId={view.projectId} buildings={buildings} initialBuildingId={view.buildingId} floorSelectionOnly onNavigate={setIndex} onClose={() => setView(null)}/>}
  </main>;
}
