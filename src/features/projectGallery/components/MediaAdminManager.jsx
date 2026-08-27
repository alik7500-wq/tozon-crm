import React, { useState, useEffect } from 'react';
import { projectGalleryApi } from '../services/projectGalleryApi';
import { UploadMediaModal } from './UploadMediaModal';
import { EditMediaModal } from './EditMediaModal';
import { GalleryLightbox } from './GalleryLightbox';
import {
  Image as ImageIcon,
  Plus,
  Star,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const CATEGORY_NAMES = {
  EXTERIOR: 'Фасады',
  COURTYARD: 'Двор',
  MASTERPLAN: 'Генплан',
  ENTRANCE: 'Входная группа',
  INTERIOR: 'Интерьеры',
  FLOOR_PLAN: 'Планировки',
  COMMERCIAL: 'Коммерция',
  CONSTRUCTION: 'Ход строительства',
  OTHER: 'Другое'
};

export const MediaAdminManager = ({ projectId }) => {
  const [mediaList, setMediaList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const items = await projectGalleryApi.getProjectMedia(projectId);
      setMediaList(items || []);
    } catch (err) {
      console.error('Failed to fetch media list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchMedia();
  }, [projectId]);

  const handleSetCover = async (mediaId) => {
    setActionLoading(mediaId);
    try {
      await projectGalleryApi.setCover(mediaId);
      await fetchMedia();
    } catch (err) {
      console.error('Failed to set cover:', err);
      alert('Ошибка назначения обложки');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Вы действительно хотите удалить это изображение из галереи?')) return;
    setActionLoading(mediaId);
    try {
      await projectGalleryApi.deleteMedia(mediaId);
      await fetchMedia();
    } catch (err) {
      console.error('Failed to delete media:', err);
      alert('Ошибка удаления изображения');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-base font-bold text-slate-900">Управление визуальными материалами (Галерея)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Загружайте рендеры фасадов, благоустройства двора, входных групп и генплана
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMedia}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer"
            title="Обновить список"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить изображение</span>
          </button>
        </div>
      </div>

      {/* List / Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center bg-white rounded-2xl border border-slate-200">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500 font-medium">Загрузка медиаматериалов...</span>
          </div>
        </div>
      ) : mediaList.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center shadow-2xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Галерея проекта пуста</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Нажмите кнопку «Добавить изображение», чтобы загрузить первый рендер
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Загрузить рендер</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200 select-none">
                <tr>
                  <th className="py-3 px-4 w-16">Превью</th>
                  <th className="py-3 px-4">Название и описание</th>
                  <th className="py-3 px-4">Категория</th>
                  <th className="py-3 px-4 text-center">Обложка</th>
                  <th className="py-3 px-4 text-center w-24">Порядок</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {mediaList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div
                        onClick={() => setLightboxIndex(idx)}
                        className="w-14 h-11 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer group relative"
                      >
                        <img
                          src={item.url || item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 line-clamp-1">{item.title}</div>
                      {item.description && (
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {CATEGORY_NAMES[item.category] || item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.is_cover ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          Главная
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetCover(item.id)}
                          disabled={actionLoading === item.id}
                          className="text-[11px] text-slate-400 hover:text-amber-600 font-semibold transition cursor-pointer"
                        >
                          Сделать обложкой
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {item.sort_order}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setLightboxIndex(idx)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                          title="Просмотреть"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingMedia(item)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition"
                          title="Редактировать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={actionLoading === item.id}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <UploadMediaModal
        projectId={projectId}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={fetchMedia}
      />

      <EditMediaModal
        media={editingMedia}
        isOpen={!!editingMedia}
        onClose={() => setEditingMedia(null)}
        onSuccess={fetchMedia}
      />

      <GalleryLightbox
        images={mediaList}
        currentIndex={lightboxIndex ?? 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  );
};
