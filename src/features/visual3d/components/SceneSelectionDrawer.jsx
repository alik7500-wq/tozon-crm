import React from 'react';
import { X, Home, Layers, CheckCircle2, User, Phone, MapPin, Maximize2 } from 'lucide-react';

const STATUS_BADGE = {
  AVAILABLE: { label: 'Свободно', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  RESERVED: { label: 'В брони', bg: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  SOLD: { label: 'Продано', bg: 'bg-rose-500/10 text-rose-600 border-rose-200' },
  BLOCKED: { label: 'Заблокировано', bg: 'bg-slate-500/10 text-slate-600 border-slate-200' },
};

export function SceneSelectionDrawer({
  selection,
  onClose,
  currency = 'TJS'
}) {
  if (!selection) return null;

  const { unit, entityType, meshKey } = selection;
  const statusCfg = unit?.status ? (STATUS_BADGE[unit.status] || STATUS_BADGE.AVAILABLE) : null;

  const formatPrice = (minor) => {
    if (!minor) return '0';
    return Math.round(minor / 100).toLocaleString('ru-RU');
  };

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-5 flex flex-col z-30 transition-all duration-200 ease-out animate-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Home className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
              {entityType === 'UNIT' ? `Квартира №${unit?.number || '—'}` : meshKey}
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">3D Выбор объекта</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {statusCfg && (
          <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${statusCfg.bg}`}>
            <span>Статус:</span>
            <span>{statusCfg.label}</span>
          </div>
        )}

        {entityType === 'UNIT' && unit && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase">Комнат</span>
                <span className="text-sm font-bold text-slate-800">{unit.rooms || 'Студия'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase">Площадь</span>
                <span className="text-sm font-bold text-slate-800">{unit.area_m2} м²</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
              {unit.floor_number && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Этаж:</span>
                  <span className="font-semibold text-slate-800">{unit.floor_number} этаж</span>
                </div>
              )}
              {unit.section_name && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Секция:</span>
                  <span className="font-semibold text-slate-800">{unit.section_name}</span>
                </div>
              )}
              {unit.building_name && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Корпус:</span>
                  <span className="font-semibold text-slate-800">{unit.building_name}</span>
                </div>
              )}
            </div>

            {unit.total_price_minor && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-semibold text-emerald-800 block uppercase">Полная стоимость</span>
                <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                  {formatPrice(unit.total_price_minor)} {currency}
                </div>
                {unit.price_per_m2_minor && (
                  <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
                    {formatPrice(unit.price_per_m2_minor)} {currency} / м²
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="font-semibold block text-slate-500 mb-0.5">3D Меш-идентификатор:</span>
          <code className="text-blue-600 text-[10px] break-all">{meshKey}</code>
        </div>
      </div>
    </div>
  );
}
