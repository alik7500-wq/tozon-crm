import React, { useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  ArrowLeft,
  Plus,
  Compass,
  Trash2,
  Eye,
  Edit,
  Navigation,
  Info,
  Home,
  CheckCircle2,
  Sliders,
  Sparkles
} from 'lucide-react';
import { visualAdminApi } from '../../services/visualAdminApi';
import { PanoramaSphere } from '../../../tour360/components/PanoramaSphere';
import { TourLoader } from '../../../tour360/components/TourLoader';
import { HotspotFormModal } from './HotspotFormModal';

export function HotspotEditor({
  tour,
  panorama,
  allPanoramas = [],
  projectUnits = [],
  onBack,
  onPanoramaUpdated
}) {
  const [hotspots, setHotspots] = useState(panorama.hotspots || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentYaw, setCurrentYaw] = useState(0);
  const [currentPitch, setCurrentPitch] = useState(0);
  const [isEditMode, setIsEditMode] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const controlsRef = useRef(null);

  // Capture current camera orientation for placing hotspot
  const handleAddHotspotAtCurrentView = () => {
    if (controlsRef.current) {
      // Calculate spherical yaw and pitch from camera target/position
      const cam = controlsRef.current.object;
      const dir = new THREE.Vector3();
      cam.getWorldDirection(dir);

      // Convert direction to spherical angles in degrees
      const pitch = THREE.MathUtils.radToDeg(Math.asin(dir.y));
      let yaw = THREE.MathUtils.radToDeg(Math.atan2(dir.z, dir.x));
      if (yaw < 0) yaw += 360;

      setCurrentYaw(yaw);
      setCurrentPitch(pitch);
    }
    setIsModalOpen(true);
  };

  // Save new hotspot to backend
  const handleSaveHotspot = async (hotspotData) => {
    try {
      const created = await visualAdminApi.createHotspot(panorama.id, hotspotData);
      setHotspots(prev => [...prev, created]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onPanoramaUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка сохранения хотспота');
    }
  };

  // Delete hotspot
  const handleDeleteHotspot = async (hotspotId) => {
    if (!window.confirm('Удалить этот хотспот?')) return;
    try {
      await visualAdminApi.deleteHotspot(hotspotId);
      setHotspots(prev => prev.filter(h => h.id !== hotspotId));
      onPanoramaUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка удаления хотспота');
    }
  };

  const otherPanoramas = allPanoramas.filter(p => p.id !== panorama.id);

  return (
    <div className="space-y-4">
      {/* Top Header & Mode Toggle */}
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
                Хотспоты: {panorama.name || panorama.title}
              </h3>
              <span className="px-2 py-0.5 rounded-md text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">
                {tour.name}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Поверните обзор в нужную точку и нажмите «Поставить хотспот»
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setIsEditMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                isEditMode
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Редактор</span>
            </button>
            <button
              onClick={() => setIsEditMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                !isEditMode
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Превью</span>
            </button>
          </div>

          {isEditMode && (
            <button
              onClick={handleAddHotspotAtCurrentView}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-md shadow-purple-600/30 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Поставить хотспот</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport & Hotspots List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 360 Sphere Viewport */}
        <div className="lg:col-span-8 relative h-[620px] rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
          {panorama.panorama_url && (
            <Canvas
              camera={{ position: [0, 0, 0.1], fov: panorama.initial_fov || 75 }}
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: false }}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            >
              <OrbitControls
                ref={controlsRef}
                enableZoom
                enablePan={false}
                rotateSpeed={-0.4}
                minDistance={0.05}
                maxDistance={0.5}
              />
              <React.Suspense fallback={<TourLoader message="Загрузка панорамы..." />}>
                <PanoramaSphere
                  panoramaUrl={panorama.panorama_url}
                  hotspots={hotspots}
                  onHotspotClick={() => {}}
                />
              </React.Suspense>
            </Canvas>
          )}

          {/* Hint Overlay */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-lg">
            <span>Вращайте панораму (ЛКМ) для выбора точки размещения хотспота</span>
          </div>
        </div>

        {/* Right: Placed Hotspots Table / List */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col h-[620px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Установленные хотспоты ({hotspots.length})
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {hotspots.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <Compass className="h-8 w-8 text-slate-300 mx-auto" />
                <p>На этой панораме пока нет хотспотов.</p>
                <p className="text-[11px] text-slate-400">
                  Поверните камеру и нажмите «Поставить хотспот».
                </p>
              </div>
            ) : (
              hotspots.map((h) => {
                const isNav = h.hotspot_type === 'NAVIGATION';
                const isUnit = h.hotspot_type === 'UNIT';
                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold ${
                        isNav
                          ? 'bg-blue-100 text-blue-700'
                          : isUnit
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isNav ? <Navigation className="h-4 w-4" /> : isUnit ? <Home className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                      </div>

                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {h.label || h.title}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Yaw: {parseFloat(h.yaw).toFixed(0)}° • Pitch: {parseFloat(h.pitch).toFixed(0)}°
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteHotspot(h.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Удалить хотспот"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Hotspot Form Modal */}
      <HotspotFormModal
        isOpen={isModalOpen}
        initialYaw={currentYaw}
        initialPitch={currentPitch}
        otherPanoramas={otherPanoramas}
        projectUnits={projectUnits}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveHotspot}
      />
    </div>
  );
}
