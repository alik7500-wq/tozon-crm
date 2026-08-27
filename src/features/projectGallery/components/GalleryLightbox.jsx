import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Star, Maximize2, Tag, Calendar } from 'lucide-react';

const CATEGORY_LABELS = {
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

export const GalleryLightbox = ({
  images = [],
  currentIndex = 0,
  isOpen = false,
  onClose,
  onNavigate
}) => {
  const currentImage = images[currentIndex];

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (currentIndex > 0) onNavigate(currentIndex - 1);
    }
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !currentImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-50 bg-linear-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-md">
            {currentIndex + 1} / {images.length}
          </span>
          {currentImage.is_cover && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <Star className="w-3.5 h-3.5 fill-slate-950" />
              Обложка проекта
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
            <Tag className="w-3.5 h-3.5 text-blue-400" />
            {CATEGORY_LABELS[currentImage.category] || currentImage.category}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-white transition shadow-lg backdrop-blur-md cursor-pointer"
          title="Закрыть (Esc)"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Image Container */}
      <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-16">
        <img
          key={currentImage.id || currentImage.url}
          src={currentImage.url || currentImage.image_url}
          alt={currentImage.title}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-all duration-300 animate-in zoom-in-95"
        />

        {/* Previous Button */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition shadow-2xl backdrop-blur-md cursor-pointer group"
            title="Предыдущее (←)"
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Next Button */}
        {currentIndex < images.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition shadow-2xl backdrop-blur-md cursor-pointer group"
            title="Следующее (→)"
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Bottom Caption & Description Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-linear-to-t from-black/90 via-black/60 to-transparent z-50 text-center sm:text-left">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide drop-shadow-md">
              {currentImage.title}
            </h3>
            {currentImage.description && (
              <p className="text-sm text-slate-300 mt-1 max-w-2xl font-normal leading-relaxed">
                {currentImage.description}
              </p>
            )}
          </div>
          {currentImage.created_at && (
            <div className="text-xs text-slate-400 flex items-center gap-1.5 justify-center sm:justify-end">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(currentImage.created_at).toLocaleDateString('ru-RU')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
