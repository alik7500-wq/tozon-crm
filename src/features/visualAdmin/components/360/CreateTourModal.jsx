import React, { useState } from 'react';
import { X, Compass, AlertCircle, Loader2 } from 'lucide-react';
import { visualAdminApi } from '../../services/visualAdminApi';

export function CreateTourModal({
  projectId,
  isOpen,
  onClose,
  onTourCreated
}) {
  const [name, setName] = useState('');
  const [tourType, setTourType] = useState('SHOWROOM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Укажите название тура');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const tour = await visualAdminApi.createTour(projectId, {
        name: name.trim(),
        tour_type: tourType,
        is_active: true
      });
      onTourCreated(tour);
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка создания тура');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 font-bold">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Новый 360°-тур
              </h3>
              <p className="text-xs text-slate-500">
                Создание виртуального панорамного тура
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Название тура *
            </label>
            <input
              type="text"
              required
              placeholder="например: Шоурум 3-комнатной квартиры"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Тип тура
            </label>
            <select
              value={tourType}
              onChange={(e) => setTourType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="SHOWROOM">Шоурум / Демо-квартира</option>
              <option value="PROJECT">Территория и фасад ЖК</option>
              <option value="COURTYARD">Двор и благоустройство</option>
              <option value="UNIT">Квартира</option>
              <option value="BUILDING">Корпус</option>
            </select>
          </div>

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
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
              <span>Создать тур</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
