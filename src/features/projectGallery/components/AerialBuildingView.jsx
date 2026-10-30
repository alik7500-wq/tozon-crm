import React, { useId, useState } from 'react';
import { aerialBlocks, getAerialBuildingInfo } from './aerialBuildingInfo';
import { formatMetricArea } from '../../projects/projectAreaMetrics';
import { TypicalFloorPlanView } from './TypicalFloorPlanView';

export function AerialBuildingView({ image, buildings, initialBuildingId = null }) {
  const [selected, setSelected] = useState(() => aerialBlocks.some(block => block.id === Number(initialBuildingId)) ? Number(initialBuildingId) : null);
  const [hovered, setHovered] = useState(null);
  const [floorBlockId, setFloorBlockId] = useState(null);
  const clipId = useId().replaceAll(':', '');
  const activeId = hovered ?? selected;
  const active = aerialBlocks.find(block => block.id === activeId);
  const info = active ? getAerialBuildingInfo(buildings, active.id) : null;
  const src = image.url || image.image_url;
  const areaText = group => group.missing ? 'Уточняется' : formatMetricArea(group.area);
  const openFloorPlan = blockId => { setSelected(blockId); setHovered(null); setFloorBlockId(blockId); };
  if (floorBlockId !== null) return <TypicalFloorPlanView key={floorBlockId} block={aerialBlocks.find(block => block.id === floorBlockId)} onBack={() => setFloorBlockId(null)} />;

  return <div className="mx-auto grid w-full max-w-[1500px] items-center gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
    <div>
      <div className="mb-3 flex items-center justify-center gap-2" aria-label="Блоки объекта">
        {aerialBlocks.map(block => <button key={block.id} type="button" aria-pressed={selected === block.id}
          onMouseEnter={() => setHovered(block.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(block.id)} onBlur={() => setHovered(null)}
          onClick={() => openFloorPlan(block.id)} className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${activeId === block.id ? 'border-orange-400 bg-orange-500 text-slate-950' : 'border-white/30 bg-white/10 text-white hover:bg-white/20'}`}>{block.name}</button>)}
      </div>
      <div className="relative mx-auto w-full overflow-hidden rounded-xl shadow-2xl" style={{ maxWidth: 'calc((100dvh - 260px) * 1.25)' }}>
        <img src={src} alt={image.title} className={`block h-auto w-full transition-[filter] duration-200 ${active ? 'brightness-60' : ''}`} />
        <svg viewBox="0 0 1280 1024" preserveAspectRatio="none" aria-label="Выбор блока на визуализации" className="pointer-events-none absolute inset-0 h-full w-full">
          <defs><clipPath id={clipId}>{active && <polygon points={active.points} />}</clipPath></defs>
          {active && <image href={src} width="1280" height="1024" clipPath={`url(#${clipId})`} aria-hidden="true" />}
          {aerialBlocks.map(block => <polygon key={block.id} points={block.points} role="button" tabIndex={0}
            aria-label={`Показать информацию: ${block.name}`} aria-pressed={selected === block.id}
            onMouseEnter={() => setHovered(block.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(block.id)} onBlur={() => setHovered(null)}
            onClick={() => openFloorPlan(block.id)} onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openFloorPlan(block.id); }
            }} fill="transparent" stroke={activeId === block.id ? '#fb923c' : 'transparent'} strokeWidth="3" vectorEffect="non-scaling-stroke"
            className="pointer-events-auto cursor-pointer transition-colors focus:outline-none" />)}
        </svg>
        {aerialBlocks.map(block => <span key={block.id} style={{ left: `${block.label.x}%`, top: `${block.label.y}%` }}
          className={`pointer-events-none absolute -translate-x-1/2 rounded-lg px-3 py-1 text-xs font-bold shadow-lg ${activeId === block.id ? 'bg-orange-500 text-slate-950' : 'bg-slate-950/80 text-white'}`}>{block.name}</span>)}
      </div>
      <h3 className="mt-3 text-center text-base font-bold text-white">{image.title}</h3>
      <p className="mt-1 text-center text-xs text-slate-400">Наведите курсор для информации · Нажмите на корпус, чтобы открыть типовой этаж</p>
      {image.description && <details className="mt-3 text-xs text-slate-400"><summary className="cursor-pointer text-center">Описание визуализации</summary><p className="mt-2 leading-relaxed">{image.description}</p></details>}
    </div>
    <aside aria-label="Информация о выбранном блоке" aria-live="polite" className="lg:max-h-[calc(100dvh-150px)] lg:overflow-y-auto rounded-2xl border border-white/20 bg-white p-5 text-slate-900 shadow-2xl">
      {active ? <>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4"><h4 className="text-xl font-bold">{active.name}</h4><span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700">TOZON PLAZA</span></div>
        <button type="button" onClick={() => openFloorPlan(active.id)} className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-orange-400">Открыть типовую планировку</button>
        {info ? <>
          <dl className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Всего квартир</dt><dd className="mt-1 text-2xl font-bold">{info.apartments.total_units}</dd></div><div className="rounded-xl bg-emerald-50 p-3"><dt className="text-xs text-emerald-700">Свободно квартир</dt><dd className="mt-1 text-2xl font-bold text-emerald-800">{info.apartments.available_units}</dd></div></dl>
          <h5 className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">По комнатности</h5>
          <dl className="mt-2 divide-y divide-slate-100 text-sm">{Object.entries(info.rooms).sort(([a], [b]) => (Number(a) || 0) - (Number(b) || 0)).map(([rooms, count]) => <div key={rooms} className="flex justify-between gap-2 py-2.5"><dt>{rooms === 'unknown' ? 'Комнатность уточняется' : rooms === '0' ? 'Студии' : `${rooms}-комнатные`}</dt><dd className="font-bold tabular-nums">{count} шт.</dd></div>)}</dl>
          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center text-xs">{[['Продано', info.apartments.sold_units], ['В брони', info.apartments.reserved_units], ['Заблокировано', info.apartments.blocked_units]].map(([label, count]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-bold">{count}</dd></div>)}</dl>
          <h5 className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">Площади</h5>
          <dl className="mt-2 divide-y divide-slate-100 text-xs">{[['Квартиры', info.areas.apartments], ['Коммерция', info.areas.commercial], ['Машино-места', info.areas.parking]].map(([label, group]) => <div key={label} className="flex justify-between gap-2 py-2.5"><dt className="text-slate-500">{label}{label !== 'Квартиры' && ` · ${group.count} ед.`}</dt><dd className="font-bold tabular-nums">{areaText(group)}</dd></div>)}</dl>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-400">Данные из CRM. Коммерческие помещения и парковки учитываются отдельно от квартир.</p>
        </> : <p role="status" className="mt-4 text-sm text-slate-500">Данные блока не загружены. Обновите страницу, чтобы получить актуальную информацию.</p>}
        {selected !== null && <button type="button" onClick={() => { setSelected(null); setHovered(null); }} className="mt-4 text-xs font-semibold text-slate-500 hover:text-orange-600">Снять выбор блока</button>}
      </> : <div className="py-8 text-center"><h4 className="text-lg font-bold">Выберите блок</h4><p className="mt-3 text-sm leading-relaxed text-slate-500">Наведите курсор на здание или нажмите на блок А или Б. Здесь появятся сведения о квартирах и площадях.</p></div>}
    </aside>
  </div>;
}
