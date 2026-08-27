import React from 'react';
import { Home, Layers, CheckCircle2, Clock, Lock, Sparkles } from 'lucide-react';

const STATUS_CONFIG = {
  AVAILABLE: {
    label: 'Свободно',
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dot: 'bg-emerald-400'
  },
  RESERVED: {
    label: 'В брони',
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dot: 'bg-amber-400'
  },
  SOLD: {
    label: 'Продано',
    bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    dot: 'bg-rose-400'
  },
  BLOCKED: {
    label: 'Заблокировано',
    bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    dot: 'bg-slate-400'
  }
};

export function SceneTooltip({
  visible,
  position,
  data,
  currency = 'TJS'
}) {
  if (!visible || !data) return null;

  const { entityType, unit, building, floor, meshKey } = data;
  const statusCfg = unit?.status ? (STATUS_CONFIG[unit.status] || STATUS_CONFIG.AVAILABLE) : null;

  // Format currency
  const formatPrice = (minor) => {
    if (!minor) return null;
    return Math.round(minor / 100).toLocaleString('ru-RU');
  };

  return (
    <div
      className="pointer-events-none fixed z-50 transition-all duration-75 ease-out"
      style={{
        left: `${position.x + 14}px`,
        top: `${position.y - 12}px`,
        transform: 'translate(0, -50%)'
      }}
    >
      <div className="min-w-[210px] max-w-[260px] rounded-xl bg-slate-950/92 backdrop-blur-md border border-slate-700/80 p-3.5 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/20 text-blue-400">
              <Home className="h-3 w-3" />
            </span>
            <span className="text-xs font-extrabold tracking-tight text-white">
              {entityType === 'UNIT' ? `Квартира №${unit?.number || '—'}` : meshKey}
            </span>
          </div>

          {statusCfg && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${statusCfg.bg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
          )}
        </div>

        {/* Unit Info Body */}
        {entityType === 'UNIT' && unit && (
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Комнат / Площадь:</span>
              <span className="font-semibold text-slate-200">
                {unit.rooms ? `${unit.rooms}-комн.` : 'Студия'} • {unit.area_m2} м²
              </span>
            </div>

            {unit.floor_number && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Этаж:</span>
                <span className="font-semibold text-slate-200">{unit.floor_number} этаж</span>
              </div>
            )}

            {unit.total_price_minor && (
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-xs">
                <span className="text-slate-400">Стоимость:</span>
                <span className="font-extrabold text-emerald-400">
                  {formatPrice(unit.total_price_minor)} {currency}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Building / Floor Body */}
        {entityType === 'BUILDING' && building && (
          <div className="text-xs text-slate-300 font-semibold">
            {building.name}
          </div>
        )}

        {entityType === 'FLOOR' && floor && (
          <div className="text-xs text-slate-300 font-semibold">
            Этаж {floor.floor_number} {floor.name ? `(${floor.name})` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
