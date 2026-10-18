import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import { useI18n } from '../../../context/i18nContext';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';

export function ApartmentImageViewer({ images = [], index = 0, onNavigate, onClose }) {
  if (!images || images.length === 0) return null;

  const { lang, t } = useI18n();
  const ref = useRef(null);
  const isTJ = lang === 'tg';

  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useModalDismiss({ isOpen: true, onClose });

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog && dialog.open) {
        dialog.close();
      }
    };
  }, []);

  // Reset zoom when navigating to another image
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [index]);

  const move = useCallback((n) => {
    onNavigate((n + images.length) % images.length);
  }, [images.length, onNavigate]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.25, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2);
    }
  };

  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'ArrowRight') move(index + 1);
    if (e.key === 'ArrowLeft') move(index - 1);
    if (e.key === '+' || e.key === '=') handleZoomIn();
    if (e.key === '-') handleZoomOut();
    if (e.key === '0') handleResetZoom();
  };

  const currentImage = images[index] || images[0];

  return createPortal(
    <dialog
      ref={ref}
      aria-label={isTJ ? 'Тасвирҳои манзил' : 'Изображения квартиры'}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={handleKeyDown}
      className="m-0 w-screen h-dvh max-w-none max-h-none border-0 bg-slate-950/95 backdrop-blur-md p-0 text-white select-none overflow-hidden"
    >
      <div className="flex h-full w-full flex-col">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800/80 z-20 shrink-0">
          {/* Left: Title & Index */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white tracking-wide">
              {currentImage?.title || (isTJ ? 'Нақшаи манзил' : 'Планировка квартиры')}
            </span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
              {index + 1} / {images.length}
            </span>
          </div>

          {/* Center: Image Toggle Pills */}
          {images.length > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 p-1 bg-slate-800/90 rounded-xl border border-slate-700">
              {images.map((img, i) => (
                <button
                  key={img.url || i}
                  type="button"
                  onClick={() => onNavigate(i)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    i === index
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <span>{img.type === '3D' ? '🎨' : img.type === '2D' ? '📐' : '🖼️'}</span>
                  <span>{img.type ? `${img.type} ${isTJ ? 'Нақша' : 'План'}` : (img.title || `#${i + 1}`)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Right: Zoom & Close Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/90 rounded-xl border border-slate-700 p-0.5 text-xs">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 1}
                title={t('zoomOut') || 'Уменьшить (-)'}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                title={t('resetZoom') || 'Сбросить (100%)'}
                className="px-2 py-1 font-mono font-bold text-slate-200 hover:text-white transition cursor-pointer"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 4}
                title={t('zoomIn') || 'Увеличить (+)'}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              {scale !== 1 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Сбросить"
                  className="p-1.5 border-l border-slate-700 text-amber-400 hover:text-amber-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              autoFocus
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition border border-slate-700 hover:border-rose-500 cursor-pointer shadow-xs"
              aria-label={isTJ ? 'Пӯшидани тасвир' : 'Закрыть изображение'}
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">{isTJ ? 'Пӯшидан' : 'Закрыть'}</span>
            </button>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div
          className={`relative flex-1 w-full overflow-hidden flex items-center justify-center p-4 ${
            scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={currentImage?.url}
            alt={currentImage?.title || 'Квартира'}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className="max-h-full max-w-full object-contain pointer-events-none transition-transform"
            draggable={false}
          />

          {/* Left Arrow Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                move(index - 1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/80 hover:bg-blue-600 border border-slate-700 text-white shadow-xl transition cursor-pointer z-10"
              title={isTJ ? 'Пешина (←)' : 'Предыдущее (←)'}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Right Arrow Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                move(index + 1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/80 hover:bg-blue-600 border border-slate-700 text-white shadow-xl transition cursor-pointer z-10"
              title={isTJ ? 'Баъдӣ (→)' : 'Следующее (→)'}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Bottom Thumbnail Strip */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 bg-slate-900/80 border-t border-slate-800/80 overflow-x-auto shrink-0 z-20">
            {images.map((img, i) => (
              <button
                key={img.url || i}
                type="button"
                onClick={() => onNavigate(i)}
                className={`relative shrink-0 rounded-xl overflow-hidden border-2 p-0.5 transition cursor-pointer ${
                  i === index
                    ? 'border-blue-500 ring-2 ring-blue-400/40 scale-105'
                    : 'border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500'
                }`}
                aria-label={img.title || `Изображение ${i + 1}`}
              >
                <img
                  src={img.url}
                  alt={img.title || ''}
                  className="h-14 w-20 object-contain bg-white rounded-lg"
                />
                <span className="absolute bottom-1 right-1 px-1 rounded bg-slate-950/80 text-[9px] font-bold text-white">
                  {img.type || `#${i + 1}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>,
    document.body
  );
}
