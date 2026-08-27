import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Compass,
  Trash2,
  Edit3,
  Sliders,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { UploadPanoramaModal } from './UploadPanoramaModal';
import { HotspotEditor } from './HotspotEditor';
import { visualAdminApi } from '../../services/visualAdminApi';

export function PanoramaManager({
  tour,
  projectId,
  projectUnits = [],
  onBack,
  onTourUpdated
}) {
  const [selectedPanorama, setSelectedPanorama] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeTour, setActiveTour] = useState(tour);

  const reloadTour = async () => {
    try {
      const refreshed = await visualAdminApi.getTourTree(tour.id);
      setActiveTour(refreshed);
      if (onTourUpdated) onTourUpdated();
    } catch (err) {
      console.error('Failed to reload tour:', err);
    }
  };

  const handleDeletePanorama = async (panoId) => {
    if (!window.confirm('Удалить эту панораму? Все связанные хотспоты также будут удалены.')) return;
    try {
      await visualAdminApi.deletePanorama(panoId);
      reloadTour();
    } catch (err) {
      alert(err.message || 'Ошибка удаления панорамы');
    }
  };

  // If in Hotspot Editor mode
  if (selectedPanorama) {
    return (
      <HotspotEditor
        tour={activeTour}
        panorama={selectedPanorama}
        allPanoramas={activeTour.panoramas || []}
        projectUnits={projectUnits}
        onBack={() => {
          setSelectedPanorama(null);
          reloadTour();
        }}
        onPanoramaUpdated={reloadTour}
      />
    );
  }

  const panoramas = activeTour.panoramas || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Панорамы тура: {activeTour.name}
              </h3>
              <span className="px-2 py-0.5 rounded-md text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">
                {panoramas.length} комнат
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Загружайте панорамы 360° и расставляйте точки перехода между ними
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/30 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить панораму</span>
        </button>
      </div>

      {/* Panoramas Grid */}
      {panoramas.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 border-dashed space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <ImageIcon className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Нет загруженных панорам</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Загрузите первую эквидистантную панораму (2:1) для этой локации.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-500 transition cursor-pointer"
          >
            Загрузить панораму
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {panoramas.map((pan) => (
            <div
              key={pan.id}
              className="group rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-2xs hover:border-purple-300 transition flex flex-col"
            >
              {/* Thumbnail / Image Preview */}
              <div className="relative h-36 bg-slate-900 overflow-hidden">
                {pan.panorama_url ? (
                  <img
                    src={pan.panorama_url}
                    alt={pan.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Compass className="h-8 w-8" />
                  </div>
                )}

                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-950/80 backdrop-blur-md text-white border border-slate-700">
                    {pan.hotspots?.length || 0} хотспотов
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                    {pan.name || pan.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                    FOV: {pan.initial_fov || 75}° • Порядок: #{pan.sort_order || 0}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedPanorama(pan)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-extrabold border border-purple-200 transition cursor-pointer"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Редактор хотспотов</span>
                  </button>

                  <button
                    onClick={() => handleDeletePanorama(pan.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Удалить панораму"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UploadPanoramaModal
        projectId={projectId}
        tourId={tour.id}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onPanoramaUploaded={reloadTour}
      />
    </div>
  );
}
