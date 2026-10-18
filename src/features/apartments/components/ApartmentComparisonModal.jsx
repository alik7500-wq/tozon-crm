import React, { useState } from 'react';
import {
  X,
  Scale,
  Building2,
  Home,
  CheckCircle2,
  Tag,
  ArrowRight,
  Eye,
  Heart,
  SlidersHorizontal,
  Layers,
  Sparkles,
  DollarSign
} from 'lucide-react';

export const ApartmentComparisonModal = ({
  isOpen,
  onClose,
  units = [],
  currency = 'USD',
  onOpenUnitDetail,
  onSaveLeadInterest,
  onReserveUnit
}) => {
  const [highlightDifferences, setHighlightDifferences] = useState(true);

  if (!isOpen || !units || units.length === 0) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Свободна', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'RESERVED':
        return { label: 'Бронь', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'SOLD':
        return { label: 'Продана', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'BLOCKED':
        return { label: 'Блок', bg: 'bg-slate-100 text-slate-600 border-slate-200' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // Helper to determine if values in a row differ across all units
  const isRowDifferent = (getValue) => {
    if (units.length <= 1) return false;
    const first = getValue(units[0]);
    return units.some((u) => getValue(u) !== first);
  };

  const diffRooms = isRowDifferent((u) => u.rooms);
  const diffArea = isRowDifferent((u) => u.areaM2);
  const diffFloor = isRowDifferent((u) => u.floor_number);
  const diffBuilding = isRowDifferent((u) => u.building_name);
  const diffPricePerM2 = isRowDifferent((u) => u.pricePerM2);
  const diffTotalPrice = isRowDifferent((u) => u.totalPrice);
  const diffStatus = isRowDifferent((u) => u.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Сравнение квартир ({units.length} из 4)
                </h3>
                <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[11px] font-bold">
                  Подбор для клиента
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Наглядное сопоставление характеристик, планировок и стоимости без изменения статусов
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Highlight Differences */}
            <button
              type="button"
              onClick={() => setHighlightDifferences(!highlightDifferences)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                highlightDifferences
                  ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>{highlightDifferences ? 'Различия подсвечены' : 'Подсветить различия'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
            {units.map((unit, idx) => {
              const badge = getStatusBadge(unit.status);
              const planImg = unit.layout_types?.image_path || unit.plan_image_url;

              return (
                <div
                  key={unit.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition shadow-2xs overflow-hidden"
                >
                  {/* Card Top: Unit & Plan Thumbnail */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-sm font-black text-slate-900 block leading-tight">
                            Кв. №{unit.unit_number}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {unit.building_name}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Thumbnail */}
                    <div className="relative h-36 w-full rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-2 overflow-hidden group">
                      {planImg ? (
                        <img
                          src={planImg}
                          alt={`Планировка кв. ${unit.unit_number}`}
                          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-1">
                          <Home className="h-8 w-8 stroke-1 text-slate-300" />
                          <span className="text-[10px] text-slate-400">Типовая схема</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenUnitDetail(unit.id)}
                        className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white font-bold text-xs transition backdrop-blur-2xs cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Открыть карточку</span>
                      </button>
                    </div>
                  </div>

                  {/* Specs Rows */}
                  <div className="p-4 space-y-2.5 text-xs flex-1">
                    {/* Rooms */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl transition ${
                        highlightDifferences && diffRooms ? 'bg-amber-50/70 border border-amber-200/60' : 'bg-slate-50/60'
                      }`}
                    >
                      <span className="text-slate-500 font-medium">Комнат:</span>
                      <span className="font-extrabold text-slate-900">
                        {unit.rooms === 0 ? 'Студия' : `${unit.rooms}-комнатная`}
                      </span>
                    </div>

                    {/* Area */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl transition ${
                        highlightDifferences && diffArea ? 'bg-amber-50/70 border border-amber-200/60' : 'bg-slate-50/60'
                      }`}
                    >
                      <span className="text-slate-500 font-medium">Площадь:</span>
                      <span className="font-black text-slate-900">
                        {unit.areaM2.toFixed(2)} м²
                      </span>
                    </div>

                    {/* Floor */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl transition ${
                        highlightDifferences && diffFloor ? 'bg-amber-50/70 border border-amber-200/60' : 'bg-slate-50/60'
                      }`}
                    >
                      <span className="text-slate-500 font-medium">Этаж:</span>
                      <span className="font-extrabold text-slate-900">
                        {unit.floor_number} этаж
                      </span>
                    </div>

                    {/* Price per m2 */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl transition ${
                        highlightDifferences && diffPricePerM2 ? 'bg-amber-50/70 border border-amber-200/60' : 'bg-slate-50/60'
                      }`}
                    >
                      <span className="text-slate-500 font-medium">Цена за м²:</span>
                      <span className="font-extrabold text-blue-700">
                        {unit.pricePerM2 > 0 ? `${unit.pricePerM2.toLocaleString()} ${currency}` : '—'}
                      </span>
                    </div>

                    {/* Total Price */}
                    <div
                      className={`flex items-center justify-between p-2.5 rounded-xl transition ${
                        highlightDifferences && diffTotalPrice
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-slate-100'
                      }`}
                    >
                      <span className="text-slate-700 font-bold">Общая стоимость:</span>
                      <span className="text-sm font-black text-blue-900">
                        {unit.totalPrice > 0 ? `${unit.totalPrice.toLocaleString()} ${currency}` : '—'}
                      </span>
                    </div>

                    {/* Layout Type Name */}
                    {unit.layout_clean_name && (
                      <div className="pt-1 text-[11px] text-slate-500 text-center truncate" title={unit.layout_clean_name}>
                        Планировка: <span className="font-semibold text-slate-700">{unit.layout_clean_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => onSaveLeadInterest(unit)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 py-2 text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                      <Heart className="h-3.5 w-3.5 text-purple-600 fill-purple-100" />
                      <span>Интерес лида</span>
                    </button>

                    {unit.status === 'AVAILABLE' ? (
                      <button
                        type="button"
                        onClick={() => onReserveUnit(unit)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Забронировать</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenUnitDetail(unit.id)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 text-xs font-bold transition cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Открыть карточку</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Цены получены напрямую из утверждённого реестра CRM (без сторонних наценок)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-1.5 transition cursor-pointer"
          >
            Закрыть сравнение
          </button>
        </div>
      </div>
    </div>
  );
};
