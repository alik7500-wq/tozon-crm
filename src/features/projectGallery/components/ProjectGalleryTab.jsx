import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { projectGalleryApi } from '../services/projectGalleryApi';
import { GalleryLightbox } from './GalleryLightbox';
import {
  Image as ImageIcon,
  Star,
  Maximize2,
  Sliders,
  Plus,
  Tag,
  Building2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

const CATEGORY_NAMES = {
  ALL: 'Все материалы',
  EXTERIOR: 'Фасады',
  COURTYARD: 'Двор и благоустройство',
  MASTERPLAN: 'Генплан',
  ENTRANCE: 'Входная группа',
  INTERIOR: 'Интерьеры',
  FLOOR_PLAN: 'Планировки',
  COMMERCIAL: 'Коммерция',
  CONSTRUCTION: 'Ход строительства',
  OTHER: 'Другое'
};

const CATEGORY_COLORS = {
  EXTERIOR: 'bg-blue-50 text-blue-700 border-blue-200/60',
  COURTYARD: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  MASTERPLAN: 'bg-amber-50 text-amber-700 border-amber-200/60',
  ENTRANCE: 'bg-purple-50 text-purple-700 border-purple-200/60',
  INTERIOR: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  FLOOR_PLAN: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
  COMMERCIAL: 'bg-rose-50 text-rose-700 border-rose-200/60',
  CONSTRUCTION: 'bg-orange-50 text-orange-700 border-orange-200/60',
  OTHER: 'bg-slate-50 text-slate-700 border-slate-200/60'
};

export const ProjectGalleryTab = ({ projectId, onOpenAdminManager }) => {
  const { user } = useAuth();
  const [mediaList, setMediaList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const items = await projectGalleryApi.getProjectMedia(projectId);
      setMediaList(items || []);
    } catch (err) {
      console.error('Failed to fetch project media:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchMedia();
  }, [projectId]);

  // Extract only available categories present in the project
  const availableCategories = ['ALL', ...new Set(mediaList.map(m => m.category).filter(Boolean))];

  // Filter items
  const filteredList = selectedCategory === 'ALL'
    ? mediaList
    : mediaList.filter(m => m.category === selectedCategory);

  const canManage = user?.role === 'ADMIN' || user?.role === 'DIRECTOR';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Gallery Header & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {availableCategories.map((catKey) => {
            const isSelected = selectedCategory === catKey;
            const count = catKey === 'ALL'
              ? mediaList.length
              : mediaList.filter(m => m.category === catKey).length;

            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-tozon-blue text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-tozon-blue-50 hover:text-tozon-blue-700'
                }`}
              >
                <span>{CATEGORY_NAMES[catKey] || catKey}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={fetchMedia}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer"
            title="Обновить материалы"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && onOpenAdminManager && (
            <button
              onClick={onOpenAdminManager}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-tozon-red hover:bg-tozon-red-hover text-white text-xs font-black transition shadow-md shadow-tozon-red/20 cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              <span>Управление медиа</span>
            </button>
          )}
        </div>
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center bg-white rounded-2xl border border-slate-200">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <span className="text-xs text-slate-500 font-medium">Загрузка галереи...</span>
          </div>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center shadow-2xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">В этой категории пока нет материалов</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {canManage
              ? 'Загрузите визуальные рендеры, фотографии фасадов, благоустройства или генплана через панель управления.'
              : 'Фотографии и визуальные материалы проекта будут добавлены в ближайшее время.'}
          </p>
          {canManage && onOpenAdminManager && (
            <button
              onClick={onOpenAdminManager}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Загрузить рендеры</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredList.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setLightboxIndex(idx)}
              className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg hover:border-blue-300 transition-all duration-300 flex flex-col cursor-pointer"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-900">
                <img
                  src={item.url || item.image_url}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Overlays and Badges */}
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-3.5">
                  <span className="text-xs font-medium text-white flex items-center gap-1.5 drop-shadow-md">
                    <Maximize2 className="w-3.5 h-3.5" />
                    Кликните для просмотра
                  </span>
                </div>

                {/* Badges Top Left */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
                  {item.is_cover && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20">
                      <Star className="w-3 h-3 fill-slate-950" />
                      Обложка
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold border backdrop-blur-md bg-white/90 ${
                    CATEGORY_COLORS[item.category] || 'bg-slate-100 text-slate-700'
                  }`}>
                    {CATEGORY_NAMES[item.category] || item.category}
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <GalleryLightbox
        images={filteredList}
        currentIndex={lightboxIndex ?? 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(newIdx) => setLightboxIndex(newIdx)}
      />
    </div>
  );
};
