import React, { useState } from 'react';
import { api } from '../../../api/client';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  Layers,
  Check
} from 'lucide-react';

export const BatchGeneratorModal = ({ isOpen, onClose, projectId, currency = 'USD', layouts = [], onGenerated }) => {
  const [buildingName, setBuildingName] = useState('Блок А');
  const [sectionName, setSectionName] = useState('Секция 1');

  const [floorFrom, setFloorFrom] = useState(2);
  const [floorTo, setFloorTo] = useState(9);
  const [numberPrefix, setNumberPrefix] = useState('кв.');
  const [numberStart, setNumberStart] = useState(1);

  // Slots on a typical floor without price column
  const [slots, setSlots] = useState([
    { position: 1, layoutTypeId: '', rooms: 1, area: 58.98 },
    { position: 2, layoutTypeId: '', rooms: 2, area: 68 },
    { position: 3, layoutTypeId: '', rooms: 3, area: 95 },
    { position: 4, layoutTypeId: '', rooms: 1, area: 48 },
  ]);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalFloors = Math.max(0, floorTo - floorFrom + 1);
  const totalUnits = totalFloors * slots.length;

  const handleAddSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        position: prev.length + 1,
        layoutTypeId: '',
        rooms: 2,
        area: 65,
      },
    ]);
  };

  const handleRemoveSlot = (index) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSlotChange = (index, field, value) => {
    setSlots((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      // If layout was chosen, autofill rooms and area
      if (field === 'layoutTypeId') {
        const found = layouts.find((l) => String(l.id) === String(value));
        if (found) {
          current.rooms = found.rooms;
          current.area = found.area_m2_x100 / 100;
        }
      }

      updated[index] = current;
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const floorSlotsPayload = slots.map((s, idx) => ({
        position: idx + 1,
        layoutTypeId: s.layoutTypeId ? parseInt(s.layoutTypeId, 10) : null,
        rooms: parseInt(s.rooms, 10),
        area_m2_x100: Math.round(parseFloat(s.area) * 100),
        price_per_m2_minor: 0,
      }));

      await api.post(`/inventory/projects/${projectId}/batch-generate`, {
        buildingName: buildingName.trim(),
        buildingCode: buildingName.trim(),
        sectionName: sectionName.trim(),
        floorFrom: parseInt(floorFrom, 10),
        floorTo: parseInt(floorTo, 10),
        numberPrefix: numberPrefix || '',
        numberStart: parseInt(numberStart, 10) || 1,
        floorSlots: floorSlotsPayload,
      });

      onGenerated();
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка генерации квартир');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Конфигуратор структуры и этажей</h3>
              <p className="text-xs text-slate-500">Настройка планировок по квартирам на этаже и пакетная генерация</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Target Block & Section selection */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>Строящийся блок и секция</span>
              </span>
              <div className="flex items-center gap-1">
                {['Блок А', 'Блок Б', 'Блок В', 'Блок 1', 'Блок 2', 'Корпус 1'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBuildingName(b)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      buildingName === b
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                        : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Номер или буква блока (Корпус) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="например: Блок А или Блок 1"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Секция / Подъезд *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Секция 1"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Floor Range & Start Number */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Этаж С *</label>
              <input
                type="number"
                min="1"
                required
                value={floorFrom}
                onChange={(e) => setFloorFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Этаж ПО *</label>
              <input
                type="number"
                min="1"
                required
                value={floorTo}
                onChange={(e) => setFloorTo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Префикс номера</label>
              <input
                type="text"
                value={numberPrefix}
                onChange={(e) => setNumberPrefix(e.target.value)}
                placeholder="кв."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Стартовый № *</label>
              <input
                type="number"
                min="1"
                required
                value={numberStart}
                onChange={(e) => setNumberStart(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Floor Layout Slots Configuration (Without Price) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Квартиры на типовом этаже ({slots.length} кв./этаж)
                </h4>
                <p className="text-xs text-slate-500">
                  Задайте комнатность и площадь (м²) для каждой позиции на этаже
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSlot}
                className="flex items-center gap-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Добавить квартиру на этаж</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-blue-200 transition"
                >
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800 font-bold text-xs">
                    №{index + 1}
                  </div>

                  {/* Choose from existing layouts */}
                  {layouts.length > 0 && (
                    <div className="flex-1 min-w-[150px]">
                      <select
                        value={slot.layoutTypeId}
                        onChange={(e) => handleSlotChange(index, 'layoutTypeId', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                      >
                        <option value="">Шаблон типовой планировки</option>
                        {layouts.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.rooms}к, {(l.area_m2_x100 / 100).toFixed(1)} м²)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Rooms */}
                  <div className="w-36">
                    <select
                      value={slot.rooms}
                      onChange={(e) => handleSlotChange(index, 'rooms', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                    >
                      <option value="1">1 комнатная</option>
                      <option value="2">2 комнатная</option>
                      <option value="3">3 комнатная</option>
                      <option value="4">4 комнатная</option>
                      <option value="0">Студия</option>
                    </select>
                  </div>

                  {/* Area */}
                  <div className="w-40 flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Площадь"
                      value={slot.area}
                      onChange={(e) => handleSlotChange(index, 'area', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">м²</span>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(index)}
                    disabled={slots.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-20 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Calculation summary banner */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-center justify-between text-xs text-blue-950">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                <strong>{buildingName}</strong> ({sectionName}): будет создано <strong>{totalFloors} этажей</strong> по <strong>{slots.length} квартир</strong> (номера {numberPrefix}{numberStart} – {numberPrefix}{numberStart + totalUnits - 1})
              </span>
            </div>
            <div className="text-sm font-black text-blue-700 whitespace-nowrap pl-4">
              Итог: {totalUnits} квартир
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalUnits === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isSubmitting ? 'Генерация...' : `Сгенерировать ${totalUnits} квартир`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
