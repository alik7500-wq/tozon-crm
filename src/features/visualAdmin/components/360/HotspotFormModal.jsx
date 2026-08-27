import React, { useState } from 'react';
import { X, Navigation, Info, Home, Sparkles, Check, AlertCircle } from 'lucide-react';

export function HotspotFormModal({
  isOpen,
  initialYaw = 0,
  initialPitch = 0,
  otherPanoramas = [],
  projectUnits = [],
  onClose,
  onSave
}) {
  const [hotspotType, setHotspotType] = useState('NAVIGATION');
  const [label, setLabel] = useState('');
  const [yaw, setYaw] = useState(initialYaw);
  const [pitch, setPitch] = useState(initialPitch);
  const [targetPanoramaId, setTargetPanoramaId] = useState(otherPanoramas[0]?.id || '');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [infoDesc, setInfoDesc] = useState('');
  const [searchUnit, setSearchUnit] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) {
      alert('Укажите название / подпись хотспота');
      return;
    }

    const payload = {
      hotspot_type: hotspotType,
      label: label.trim(),
      yaw: parseFloat(yaw) || 0,
      pitch: parseFloat(pitch) || 0,
      target_panorama_id: hotspotType === 'NAVIGATION' ? parseInt(targetPanoramaId, 10) : null,
      target_entity_type: hotspotType === 'UNIT' ? 'UNIT' : null,
      target_entity_id: hotspotType === 'UNIT' ? parseInt(selectedUnitId, 10) : null,
      metadata: hotspotType === 'INFO' ? { description: infoDesc.trim() } : {}
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Добавить хотспот
            </h3>
            <p className="text-xs text-slate-500">
              Позиция: Yaw {yaw.toFixed(1)}° • Pitch {pitch.toFixed(1)}°
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Тип хотспота
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setHotspotType('NAVIGATION');
                  if (!label) setLabel('Перейти в комнату');
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  hotspotType === 'NAVIGATION'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Navigation className="h-4 w-4" />
                <span>Переход</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHotspotType('UNIT');
                  if (!label) setLabel('Квартира');
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  hotspotType === 'UNIT'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Квартира</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHotspotType('INFO');
                  if (!label) setLabel('Информация');
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  hotspotType === 'INFO'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Info className="h-4 w-4" />
                <span>Инфо</span>
              </button>
            </div>
          </div>

          {/* Label / Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Название / Подпись *
            </label>
            <input
              type="text"
              required
              placeholder="например: В спальню или Остекление"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>

          {/* Type specific fields */}
          {hotspotType === 'NAVIGATION' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Целевая панорама / комната *
              </label>
              <select
                required
                value={targetPanoramaId}
                onChange={(e) => setTargetPanoramaId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="">Выберите комнату...</option>
                {otherPanoramas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.title || `Панорама #${p.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hotspotType === 'UNIT' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Связанная квартира CRM *
              </label>
              <select
                required
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="">Выберите квартиру...</option>
                {projectUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    Квартира №{u.unit_number || u.number} ({u.rooms}-комн., {u.area_m2_x100 ? u.area_m2_x100 / 100 : u.area_m2} м²)
                  </option>
                ))}
              </select>
            </div>
          )}

          {hotspotType === 'INFO' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Текст описания
              </label>
              <textarea
                rows={3}
                placeholder="Подробное описание отделки или характеристик..."
                value={infoDesc}
                onChange={(e) => setInfoDesc(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 outline-none focus:border-purple-500 focus:bg-white resize-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              Добавить хотспот
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
