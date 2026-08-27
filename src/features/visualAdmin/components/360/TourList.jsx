import React, { useState } from 'react';
import {
  Compass,
  Plus,
  Eye,
  Sliders,
  Trash2,
  CheckCircle2,
  Building2,
  Home,
  Image as ImageIcon
} from 'lucide-react';
import { visualAdminApi } from '../../services/visualAdminApi';

export function TourList({
  tours = [],
  onOpenCreate,
  onOpenPanoramaManager,
  onOpenPreview,
  onTourUpdated
}) {
  const [loadingId, setLoadingId] = useState(null);

  const handleDelete = async (tour) => {
    if (!window.confirm(`Удалить 360°-тур "${tour.name}"?`)) return;
    setLoadingId(tour.id);
    try {
      await visualAdminApi.deleteTour(tour.id);
      onTourUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка удаления тура');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            360° Виртуальные туры
          </h3>
          <p className="text-xs text-slate-500">
            Управление сферическими панорамами и интерактивными хотспотами
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/30 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Создать 360°-тур</span>
        </button>
      </div>

      {/* List */}
      {tours.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 border-dashed space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <Compass className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Нет 360°-туров</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Создайте виртуальный тур для шоурума, благоустройства или типовых квартир проекта.
          </p>
          <button
            onClick={onOpenCreate}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-500 transition cursor-pointer"
          >
            Создать тур
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {tours.map((tour) => {
            const isLoading = loadingId === tour.id;
            return (
              <div
                key={tour.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition shadow-2xs"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold">
                    <Compass className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                        {tour.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {tour.tour_type}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Панорам: <strong className="text-slate-700">{tour.panoramas_count || 0}</strong></span>
                      <span>Обновлено: <strong className="text-slate-700">{new Date(tour.updated_at).toLocaleDateString('ru-RU')}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onOpenPreview(tour)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Просмотр</span>
                  </button>

                  <button
                    onClick={() => onOpenPanoramaManager(tour)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-extrabold border border-purple-200 transition cursor-pointer"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Панорамы и Хотспоты</span>
                  </button>

                  <button
                    onClick={() => handleDelete(tour)}
                    disabled={isLoading}
                    title="Удалить тур"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
