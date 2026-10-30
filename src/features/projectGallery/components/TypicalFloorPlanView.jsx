import React, { useEffect, useState } from 'react';

const floorPlans = {
  4: '/layouts/floors/block_a_typical_floor.webp',
  3: '/layouts/floors/block_b_typical_floor.webp'
};

export function TypicalFloorPlanView({ block, floorNumber = null, onBack }) {
  const vg = [6, 7].includes(block.id);
  const kind = floorNumber === 10 ? 'penthouse' : floorNumber === 1 ? 'commercial' : floorNumber === -1 ? 'parking' : 'typical';
  const hasPlan = vg || floorNumber === null || (floorNumber >= 2 && floorNumber <= 9);
  const planSrc = vg ? `/layouts/floors/block_${block.id === 6 ? 'v' : 'g'}_${kind}_floor.webp` : floorPlans[block.id];
  const ratio = vg ? (block.id === 6 ? .65 : 1.24) : (block.id === 4 ? 1726 / 2068 : 2801 / 1638);
  const [zoom, setZoom] = useState(100);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const handleEscape = event => {
      if (event.key === 'Escape') { event.stopImmediatePropagation(); onBack(); }
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [onBack]);

  return <section className="mx-auto w-full max-w-[1500px]" aria-label={`Типовой этаж: ${block.name}`}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/20 bg-slate-900 p-3 text-white">
      <button type="button" onClick={onBack} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">← К изображению здания</button>
      <div><h3 className="text-base font-bold">{block.name} · {floorNumber === null ? 'Типовая планировка этажа' : `${floorNumber} этаж`}</h3><p className="mt-1 text-xs text-slate-400">{floorNumber === null ? 'Этажи 2–9 · исходный чертёж' : hasPlan ? (kind === 'typical' ? 'Типовая планировка выбранного этажа · исходный чертёж' : 'Отдельный проектный чертёж выбранного этажа') : 'Отдельная планировка этажа'}</p></div>
      <div className="flex items-center gap-2" aria-label="Масштаб плана">
        <button type="button" onClick={() => setZoom(value => Math.max(75, value - 25))} disabled={zoom === 75} aria-label="Уменьшить план" className="rounded-lg bg-white/10 px-3 py-2 font-bold disabled:opacity-40">−</button>
        <button type="button" onClick={() => setZoom(100)} aria-label="Сбросить масштаб плана" className="min-w-16 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">{zoom}%</button>
        <button type="button" onClick={() => setZoom(value => Math.min(250, value + 25))} disabled={zoom === 250} aria-label="Увеличить план" className="rounded-lg bg-white/10 px-3 py-2 font-bold disabled:opacity-40">+</button>
      </div>
    </div>
    <div className="max-h-[calc(100dvh-260px)] overflow-auto rounded-xl border border-slate-200 bg-white p-4">
      {!hasPlan ? <p role="status" className="p-8 text-center text-slate-700">Отдельный чертёж {floorNumber} этажа ещё не добавлен. Типовой план этажей 2–9 к этому этажу не относится.</p> : failed ? <p role="alert" className="p-8 text-center text-sm text-rose-700">Не удалось загрузить чертёж. Вернитесь к изображению здания и откройте план повторно.</p> :
        <div className="mx-auto w-full" style={{ maxWidth: `calc((100dvh - 290px) * ${ratio})` }}>
          <img src={planSrc} alt={`Типовая планировка ${block.name}, ${floorNumber === null ? 'этажи 2–9' : `${floorNumber} этаж`}`} onError={() => setFailed(true)} className="block h-auto" style={{ width: `${zoom}%`, maxWidth: 'none' }} />
        </div>}
    </div>
    <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">Чертёж из проекта. Актуальные площади для продажи и договора указаны в карточках квартир CRM. Для возврата используйте кнопку выше или Esc.</p>
  </section>;
}
