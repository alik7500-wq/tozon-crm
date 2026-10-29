import {formatMeasure, trimDecimalZeros} from '../../../utils/numberDisplay';
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ApartmentImageViewer } from './ApartmentImageViewer';
import { api } from '../../../api/client';
import { useI18n } from '../../../context/i18nContext';

const Tour360Viewer = lazy(() => import('../../tour360/components/Tour360Viewer').then(m => ({ default: m.Tour360Viewer })));

import {
  Maximize2,
  Sparkles,
  ShieldCheck,
  Globe,
  Layers,
  Wind,
  Flame,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  ChevronRight,
  Info,
  Building2,
  Calendar,
  Check,
  Tag,
  ArrowRight,
  FileText
} from 'lucide-react';

export const InteractiveApartmentView = ({
  unitId,
  currency = 'USD',
  onReserve,
  onCreateDeal,
  onGenerateOffer,
  onOpenEditor,
  userRole = 'SALES_MANAGER'
}) => {
  const { lang, toggleLanguage, t, getText } = useI18n();
  const [imageIndex, setImageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Active View Mode: 'plan' | '360'
  const [viewMode, setViewMode] = useState('plan');

  // Selected Room ID
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [hoveredRoomId, setHoveredRoomId] = useState(null);

  const roomListRef = useRef(null);

  const fetchPresentation = async () => {
    if (!unitId) return;
    setIsLoading(true);
    setError('');
    setViewMode('plan');
    setViewerOpen(false);
    setSelectedRoomId(null);
    setHoveredRoomId(null);
    try {
      const res = await api.get(`/inventory/units/${unitId}/presentation`);
      const payload = res.data?.data || res.data;
      setData(payload);
      setImageIndex(0);

      if (payload?.rooms && payload.rooms.length > 0) {
        setSelectedRoomId(payload.rooms[0].id);
      }
    } catch (err) {
      console.error('Error loading presentation:', err);
      setError(err.message || t('errorLoadingPresentation'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPresentation();
  }, [unitId]);

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-3 text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold">{t('loadingPresentation')}</p>
      </div>
    );
  }

  if (error || !data?.unit) {
    return (
      <div className="flex h-80 flex-col items-center justify-center p-8 text-center bg-rose-50 rounded-2xl border border-rose-200">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
        <h4 className="text-base font-bold text-slate-900">{t('errorLoadingPresentation')}</h4>
        <p className="mt-1 text-xs text-slate-600">{error || 'Квартира не найдена'}</p>
        <button
          onClick={fetchPresentation}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
        >
          Повторить попытку
        </button>
      </div>
    );
  }

  const { unit, layout, rooms = [], features = [], permissions } = data;
  const isLayoutTour = data.tour360?.presentation_scope === 'LAYOUT'
    && String(data.tour360.presentation_unit_id) === String(unitId)
    && String(data.tour360.presentation_layout_id) === String(layout?.id || unit.layout_type_id || unit.layout_types?.id);
  const tour360 = data.tour360?.is_active === true
    && data.tour360.entity_type === 'UNIT'
    && (String(data.tour360.entity_id) === String(unitId) || isLayoutTour)
    ? data.tour360 : null;

  const activeRoom = rooms.find((r) => r.id === (hoveredRoomId || selectedRoomId)) || rooms[0];

  const furnishedPlanImg = layout?.furnished_plan_path || layout?.image_path;
  const technicalPlanImg = layout?.technical_plan_path;
  const images = [
    ...(furnishedPlanImg ? [{ url: furnishedPlanImg, title: lang === 'tg' ? '3D Нақшаи мебелдор' : '3D Меблированный план', type: '3D' }] : []),
    ...(technicalPlanImg ? [{ url: technicalPlanImg, title: lang === 'tg' ? '2D Нақшаи техникӣ' : '2D Технический чертёж', type: '2D' }] : []),
    ...(layout?.gallery_images || [])
  ].filter((item, i, all) => item?.url && all.findIndex(x => x.url === item.url) === i);
  const shownImage = images[imageIndex] || images[0];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: t('statusAvailable'), bg: 'bg-emerald-50 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' };
      case 'RESERVED':
        return { label: t('statusReserved'), bg: 'bg-amber-50 text-amber-700 border-amber-300', dot: 'bg-amber-500' };
      case 'SOLD':
        return { label: t('statusSold'), bg: 'bg-rose-50 text-rose-700 border-rose-300', dot: 'bg-rose-500' };
      case 'BLOCKED':
        return { label: t('statusBlocked'), bg: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  const statusBadge = getStatusBadge(unit.status);

  // Price calculations
  const pricePerM2 = unit.price_per_m2_minor ? Math.round(unit.price_per_m2_minor / 100) : 0;
  const totalPrice = unit.manual_total_price_minor
    ? Math.round(unit.manual_total_price_minor / 100)
    : Math.round(((unit.area_m2_x100 / 100) * pricePerM2));

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white font-extrabold text-sm shadow-md">
            №{unit.unit_number}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">
                {t('unitNumber')} {unit.unit_number} — {layout ? trimDecimalZeros(getText(layout.name_tg, layout.name_ru || layout.name)) : ''}
              </h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadge.bg}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
                <span>{statusBadge.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {unit.floors?.sections?.buildings?.name || 'Здание'} • {t('floor')} {unit.floors?.floor_number} • {unit.rooms === 0 ? t('studio') : `${unit.rooms} ${t('roomsAbbr')}`} • {formatMeasure(unit.area_m2_x100 / 100)} м²
            </p>
          </div>
        </div>

        {/* View Mode & Language Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setViewMode('plan')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === 'plan' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{t('tabPlan')}</span>
            </button>

              <button
                type="button"
                disabled={!tour360}
                title={!tour360 ? (lang === 'tg' ? 'Барои ин нақша саёҳати 360° ҳоло омода нест' : 'Для этой планировки 360°-тур ещё не подготовлен') : undefined}
                onClick={() => setViewMode('360')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  viewMode === '360' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{lang === 'tg' ? 'Намоиши саёҳати 360°' : 'Показать 360°-тур'}</span>
              </button>
          </div>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
            title={t('langToggle')}
          >
            <Globe className="h-3.5 w-3.5 text-blue-600" />
            <span>{lang === 'tg' ? 'TJ' : lang.toUpperCase()}</span>
          </button>

          {permissions?.canEditLayout && onOpenEditor && layout?.id && (
            <button
              onClick={() => onOpenEditor(layout.id)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1.5 text-xs font-bold hover:bg-amber-100 transition cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('btnEditLayout')}</span>
            </button>
          )}
        </div>
      </div>

      {tour360 && viewMode === '360' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-purple-950">{lang === 'tg' ? 'Саёҳати 360°-и манзил' : '360°-тур квартиры'}</h4>
            <p className="text-xs text-purple-800 break-words">{tour360.name}</p>
            {isLayoutTour && <p className="text-xs text-purple-800 mt-1">{lang === 'tg' ? 'Намунаи ҳамин нақша аз манзили' : 'Образец такой же планировки из квартиры'} №{tour360.source_unit_number}</p>}
            {tour360.tour_type === 'SHOWROOM' && <p className="text-xs text-purple-700 mt-1">{lang === 'tg' ? 'Шоуруми виртуалӣ — намунаи ороиши дохилӣ' : 'Виртуальный шоурум — пример оформления интерьера'}</p>}
          </div>
        </div>
      )}

      {/* VIEW MODE 1: INTERACTIVE PLAN */}
      {viewMode === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Interactive Plan Image Canvas */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
            {/* Top Toolbar above plan canvas: 2D/3D switch & Fullscreen */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
              {images.length > 0 ? (
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  {images.map((img, i) => (
                    <button
                      key={img.url || i}
                      type="button"
                      onClick={() => setImageIndex(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        i === imageIndex
                          ? 'bg-white text-blue-900 shadow-xs border border-slate-200/80 ring-1 ring-blue-500/20'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{img.type === '3D' ? '🎨' : img.type === '2D' ? '📐' : '🖼️'}</span>
                      <span>{img.title}</span>
                    </button>
                  ))}
                </div>
              ) : <div />}

              {shownImage && (
                <button
                  type="button"
                  onClick={() => setViewerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer"
                  title={lang === 'tg' ? 'Дар тамоми экран кушоед' : 'Открыть на весь экран'}
                >
                  <Maximize2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>{lang === 'tg' ? 'Дар тамоми экран' : 'На весь экран'}</span>
                </button>
              )}
            </div>

            <div className="relative w-fit max-w-full mx-auto rounded-xl bg-white overflow-hidden border border-slate-200 select-none">
              {shownImage ? (
                <img
                  src={shownImage.url}
                  alt={shownImage.title || 'Планировка квартиры'}
                  role="button" tabIndex={0} aria-label={lang === 'tg' ? 'Кушодани тасвир дар тамоми экран' : 'Открыть изображение на весь экран'}
                  onClick={() => setViewerOpen(true)}
                  onKeyDown={e => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewerOpen(true); } }}
                  className="block w-auto h-auto max-w-full max-h-[600px] cursor-zoom-in"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-slate-50/60">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3 border border-amber-200 shadow-2xs">
                    <Layers className="h-7 w-7" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 mb-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                    <span>{t('planRequiredBadge')}</span>
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 max-w-sm">
                    {t('planRequiredTitle')}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed">
                    {t('planRequiredDesc')}
                  </p>
                </div>
              )}

              {/* Render Room Badges */}
              {rooms.filter(r => r.position_x_percent != null && r.position_y_percent != null && shownImage?.url === furnishedPlanImg).map((r) => {
                const isSelected = selectedRoomId === r.id;
                const isHovered = hoveredRoomId === r.id;
                const activeState = isSelected || isHovered;

                return (
                  <div
                    key={r.id}
                    onMouseEnter={() => setHoveredRoomId(r.id)}
                    onMouseLeave={() => setHoveredRoomId(null)}
                    onClick={() => {
                      setSelectedRoomId(r.id);
                      // Scroll right list into view
                      const el = document.getElementById(`room-card-${r.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                    style={{
                      left: `${r.position_x_percent}%`,
                      top: `${r.position_y_percent}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all cursor-pointer z-10 ${
                      activeState ? 'scale-115 z-30' : 'hover:scale-105'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-black text-xs shadow-lg border-2 transition-all ${
                        activeState
                          ? 'bg-amber-500 text-white border-white ring-4 ring-amber-400/50'
                          : 'bg-blue-600 text-white border-white hover:bg-blue-700'
                      }`}
                    >
                      {r.room_number}
                    </div>
                    <span
                      className={`mt-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-md backdrop-blur-xs transition-colors ${
                        activeState ? 'bg-amber-600 text-white' : 'bg-slate-900/85 text-white'
                      }`}
                    >
                      {r.area != null ? `${formatMeasure(r.area)} м²` : '—'}
                    </span>
                  </div>
                );
              })}

              {/* Polygon SVG Overlay for Selected or Hovered Room */}
              {rooms.map((r) => {
                if (shownImage?.url !== furnishedPlanImg || !r.polygon_points || r.polygon_points.length === 0) return null;
                const isActive = selectedRoomId === r.id || hoveredRoomId === r.id;
                if (!isActive) return null;

                const pointsStr = r.polygon_points.map((p) => `${p.x_pct}%,${p.y_pct}%`).join(' ');

                return (
                  <svg key={r.id} className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <polygon
                      points={pointsStr}
                      fill="rgba(245, 158, 11, 0.35)"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      className="animate-pulse"
                    />
                  </svg>
                );
              })}
            </div>

            {images.length>0 && <div className="flex gap-2 overflow-x-auto mt-3 pb-2">{images.map((img,i)=><button key={img.url} type="button" onClick={()=>setImageIndex(i)} className={`shrink-0 rounded-xl border-2 p-1 ${i===imageIndex?'border-blue-600':'border-slate-200'}`} aria-label={img.title || `Изображение ${i+1}`}><img src={img.url} alt={img.title || ''} className="w-20 h-16 object-contain bg-white" /></button>)}</div>}
            {shownImage && <button type="button" onClick={()=>setViewerOpen(true)} className="mt-2 text-sm text-blue-700 flex gap-2 items-center"><Maximize2 className="w-4 h-4" />{lang === 'tg' ? 'Дар тамоми экран кушоед' : 'Открыть на весь экран'}</button>}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-blue-600" />
                <span>{t('selectRoomHint')}</span>
              </span>
            </div>
          </div>

          {/* Right Side Room Description & Details List */}
          <div ref={roomListRef} className="lg:col-span-5 flex flex-col space-y-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                {t('roomsHeader')}
              </h4>

              {getText(layout?.description_tg, layout?.description_ru || layout?.description) && (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {trimDecimalZeros(getText(layout?.description_tg, layout?.description_ru || layout?.description))}
                </p>
              )}

              {rooms.length === 0 ? (

                !getText(layout?.description_tg, layout?.description_ru || layout?.description) && <p className="text-xs text-slate-500 italic">{t('noRoomsDefined')}</p>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {rooms.map((r) => {
                    const isSelected = selectedRoomId === r.id;
                    const name = getText(r.name_tg, r.name_ru);
                    const desc = trimDecimalZeros(getText(r.description_tg, r.description_ru));

                    return (
                      <div
                        id={`room-card-${r.id}`}
                        key={r.id}
                        onMouseEnter={() => setHoveredRoomId(r.id)}
                        onMouseLeave={() => setHoveredRoomId(null)}
                        onClick={() => setSelectedRoomId(r.id)}
                        className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50/70 shadow-md ring-2 ring-amber-400/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black shadow-xs ${
                                isSelected ? 'bg-amber-500 text-white' : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {r.room_number}
                            </span>
                            <h5 className="text-sm font-bold text-slate-900">{name}</h5>
                          </div>
                          <span className="rounded-lg bg-white px-2 py-1 text-xs font-extrabold text-slate-800 border border-slate-200 shadow-2xs">
                            {r.area != null ? `${formatMeasure(r.area)} м²` : (lang === 'tg' ? 'Масоҳат дақиқ карда мешавад' : 'Площадь уточняется')}
                          </span>
                        </div>

                        {desc && <p className="mt-2 text-xs text-slate-600 leading-relaxed">{desc}</p>}

                        {/* Finishes */}
                        {(r.floor_finish_ru || r.wall_finish_ru || r.ceiling_finish_ru) && (
                          <div className="mt-3 border-t border-slate-200/60 pt-2.5 text-[11px] text-slate-600 space-y-1">
                            {r.floor_finish_ru && (
                              <p>
                                <span className="font-semibold text-slate-800">{t('floorFinish')}:</span>{' '}
                                {getText(r.floor_finish_tg, r.floor_finish_ru)}
                              </p>
                            )}
                            {r.wall_finish_ru && (
                              <p>
                                <span className="font-semibold text-slate-800">{t('wallFinish')}:</span>{' '}
                                {getText(r.wall_finish_tg, r.wall_finish_ru)}
                              </p>
                            )}
                            {r.ceiling_finish_ru && (
                              <p>
                                <span className="font-semibold text-slate-800">{t('ceilingFinish')}:</span>{' '}
                                {getText(r.ceiling_finish_tg, r.ceiling_finish_ru)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: 360 TOUR */}
      {viewMode === '360' && tour360 && (
        <div className="min-w-0 rounded-2xl bg-slate-900 p-2 border border-slate-800" aria-label={lang === 'tg' ? 'Саёҳати 360°-и манзил' : '360°-тур квартиры'}>
          <Suspense fallback={<div className="flex h-full items-center justify-center text-white text-xs">Загрузка 360° виртуального тура...</div>}>
            <Tour360Viewer key={tour360.id} projectId={tour360.project_id} initialTourId={tour360.id} currency={currency} onBack={() => setViewMode('plan')} />
          </Suspense>
        </div>
      )}


      {viewerOpen && images.length>0 && <ApartmentImageViewer images={images} index={Math.min(imageIndex,images.length-1)} onNavigate={setImageIndex} onClose={()=>setViewerOpen(false)} />}
      {/* Bottom Section 1: Extended Characteristics */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          {t('characteristicsHeader')}
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">{t('livingArea')}</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {layout?.living_area ? `${formatMeasure(layout.living_area)} м²` : '—'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">{t('kitchenArea')}</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {layout?.kitchen_area ? `${formatMeasure(layout.kitchen_area)} м²` : '—'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">{t('ceilingHeight')}</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {layout?.ceiling_height ? `${formatMeasure(layout.ceiling_height)} м` : '—'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">{t('bathroomsCount')}</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {layout?.bathrooms_count ?? '—'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">{t('balconiesCount')}</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {layout?.balconies_count ?? '—'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">{t('heatingType')}</span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">
              {layout ? getText(layout.heating_type_tg, layout.heating_type_ru, '—') : '—'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">{t('orientation')}</span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">
              {layout ? getText(layout.orientation_tg, layout.orientation_ru, '—') : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Section 2: Advantages / Features */}
      {features.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            {t('featuresHeader')}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 shadow-2xs">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {getText(f.text_tg, f.text_ru)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-5 text-white shadow-xl">
        <div>
          <span className="text-xs text-slate-400">{t('totalPrice')}</span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-amber-400">
              {totalPrice.toLocaleString()} {currency}
            </h3>
            <span className="text-xs text-slate-300">
              ({pricePerM2.toLocaleString()} {currency}/м²)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {onGenerateOffer && (
            <button
              type="button"
              onClick={onGenerateOffer}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2"
              title={lang === 'tg' ? 'Таҳияи пешниҳоди тиҷоратӣ' : 'Сформировать коммерческое предложение'}
            >
              <FileText className="h-4 w-4" />
              <span>{lang === 'tg' ? 'Пешниҳоди тиҷоратӣ' : 'Сформировать предложение'}</span>
            </button>
          )}

          {unit.status === 'AVAILABLE' && (
            <>
              {onReserve && (
                <button
                  onClick={onReserve}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
                >
                  {t('btnReserve')}
                </button>
              )}

              {onCreateDeal && (
                <button
                  onClick={onCreateDeal}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-blue-500 transition cursor-pointer"
                >
                  {t('btnCreateDeal')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
