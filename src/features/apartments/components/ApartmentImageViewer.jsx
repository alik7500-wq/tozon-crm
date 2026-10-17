import React, {useEffect, useRef, useState} from 'react';
import {useModalDismiss} from '../../../hooks/useModalDismiss';
import {useI18n} from '../../../context/i18nContext';
import {createPortal} from 'react-dom';

const INITIAL_VIEW = {scale: 1, x: 0, y: 0};
const limit = (value, min, max) => Math.max(min, Math.min(max, value));

export function ApartmentImageViewer({images = [], index = 0, onNavigate, onClose}) {
  const {lang} = useI18n();
  const ref = useRef(null);
  const viewportRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [view, setView] = useState(INITIAL_VIEW);
  const [dragging, setDragging] = useState(false);
  const currentImage = images[index];
  const tg = lang === 'tg';
  const hasImages = images.length > 0;
  const constrain = (x, y, scale) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return {scale, x: 0, y: 0};
    const image = imageRef.current;
    const fit = image?.naturalWidth && image?.naturalHeight ? Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight) : null;
    const width = fit == null ? rect.width : image.naturalWidth * fit;
    const height = fit == null ? rect.height : image.naturalHeight * fit;
    const maxX = Math.max(0, (width * scale - rect.width) / 2);
    const maxY = Math.max(0, (height * scale - rect.height) / 2);
    return {scale, x: limit(x, -maxX, maxX), y: limit(y, -maxY, maxY)};
  };
  useModalDismiss({isOpen: hasImages, onClose});

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [hasImages]);

  useEffect(() => {
    setView(INITIAL_VIEW);
    dragRef.current = null;
    setDragging(false);
  }, [index, currentImage?.url]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const wheel = event => {
      event.preventDefault();
      event.stopPropagation();
      if (!event.deltaY) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
      const rect = viewport.getBoundingClientRect();
      const pointerX = event.clientX - rect.left - rect.width / 2;
      const pointerY = event.clientY - rect.top - rect.height / 2;
      setView(previous => {
        const scale = limit(previous.scale * Math.exp(-delta * 0.002), 1, 6);
        if (scale === 1) return INITIAL_VIEW;
        const ratio = scale / previous.scale;
        return constrain(pointerX - (pointerX - previous.x) * ratio, pointerY - (pointerY - previous.y) * ratio, scale);
      });
    };
    viewport.addEventListener('wheel', wheel, {passive: false});
    return () => viewport.removeEventListener('wheel', wheel);
  }, [hasImages]);

  if (!hasImages) return null;
  const reset = () => { setView(INITIAL_VIEW); dragRef.current = null; setDragging(false); };
  const move = n => { reset(); onNavigate((n + images.length) % images.length); };
  const zoom = factor => setView(previous => {
    const scale = limit(previous.scale * factor, 1, 6);
    return scale === 1 ? INITIAL_VIEW : constrain(previous.x * scale / previous.scale, previous.y * scale / previous.scale, scale);
  });
  const finishDrag = () => { dragRef.current = null; setDragging(false); };

  return createPortal(
    <dialog ref={ref} aria-label={tg ? 'Тасвирҳои манзил' : 'Изображения квартиры'}
      onCancel={e => {e.preventDefault(); onClose();}}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'ArrowRight') move(index + 1);
        if (e.key === 'ArrowLeft') move(index - 1);
        if (e.key === '+' || e.key === '=') {e.preventDefault(); zoom(1.2);}
        if (e.key === '-') {e.preventDefault(); zoom(1 / 1.2);}
        if (e.key === '0') reset();
      }}
      className="m-0 w-screen h-dvh max-w-none max-h-none border-0 bg-white p-4 backdrop:bg-slate-700/50 overflow-hidden">
      <div className="flex h-full flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-center justify-between shrink-0">
          <span>{currentImage?.title} · {index + 1} / {images.length}</span>
          <div className="flex gap-2 items-center">
            <button type="button" aria-label={tg ? 'Хурд кардан' : 'Уменьшить'} onClick={() => zoom(1 / 1.2)} className="rounded-xl border px-3 py-2">−</button>
            <span className="min-w-14 text-center tabular-nums" aria-live="polite">{Math.round(view.scale * 100)}%</span>
            <button type="button" aria-label={tg ? 'Калон кардан' : 'Увеличить'} onClick={() => zoom(1.2)} className="rounded-xl border px-3 py-2">+</button>
            <button type="button" onClick={reset} className="rounded-xl border px-3 py-2">{tg ? 'Барқарор кардан' : 'Сбросить'}</button>
            <button autoFocus type="button" onClick={onClose} className="rounded-xl border px-4 py-2" aria-label={tg ? 'Пӯшидани тасвир' : 'Закрыть изображение'}>{tg ? 'Пӯшидан ×' : 'Закрыть ×'}</button>
          </div>
        </div>
        <div ref={viewportRef} data-testid="apartment-image-viewport"
          className="min-h-0 flex-1 w-full overflow-hidden touch-none select-none"
          style={{cursor: view.scale > 1 ? dragging ? 'grabbing' : 'grab' : 'zoom-in'}}
          onPointerDown={e => {
            if (view.scale <= 1 || e.button !== 0) return;
            e.preventDefault();
            dragRef.current = {pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, x: view.x, y: view.y};
            e.currentTarget.setPointerCapture?.(e.pointerId);
            setDragging(true);
          }}
          onPointerMove={e => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== e.pointerId) return;
            setView(previous => constrain(drag.x + e.clientX - drag.clientX, drag.y + e.clientY - drag.clientY, previous.scale));
          }}
          onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}>
          <img ref={imageRef} src={currentImage?.url} alt={currentImage?.title || (tg ? 'Манзил' : 'Квартира')} draggable={false}
            className="h-full w-full object-contain select-none"
            style={{transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: 'center', willChange: 'transform'}} />
        </div>
        <p className="shrink-0 text-center text-xs text-slate-500">{tg ? 'Чархи муш — тағйири андоза. Тасвири калоншударо бо муш кӯчонед.' : 'Колёсико мыши — масштаб. Увеличенную картинку можно перемещать мышью.'}</p>
        {images.length > 1 && <div className="flex justify-center gap-4 shrink-0">
          <button type="button" onClick={() => move(index - 1)} className="border rounded-xl px-4 py-2">{tg ? '← Пешина' : '← Предыдущее'}</button>
          <button type="button" onClick={() => move(index + 1)} className="border rounded-xl px-4 py-2">{tg ? 'Баъдӣ →' : 'Следующее →'}</button>
        </div>}
      </div>
    </dialog>, document.body
  );
}
