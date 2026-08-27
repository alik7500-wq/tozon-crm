import React, { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  RotateCcw,
  Maximize,
  Minimize,
  Compass,
  ArrowLeft,
  Info,
  Building2,
  Sparkles
} from 'lucide-react';
import { useTour360 } from '../hooks/useTour360';
import { PanoramaSphere } from './PanoramaSphere';
import { TourNavigation } from './TourNavigation';
import { TourLoader } from './TourLoader';
import { TourErrorFallback } from './TourErrorFallback';
import { TourInfoModal } from './TourInfoModal';
import { ApartmentDetailModal } from '../../apartments/ApartmentDetailModal';

export function Tour360Viewer({
  projectId,
  initialTourId = null,
  initialPanoramaId = null,
  currency = 'TJS',
  onBack
}) {
  const {
    tours,
    tour,
    activeTourId,
    panoramas,
    currentPanorama,
    currentPanoramaId,
    hotspots,
    isTransitioning,
    isLoading,
    error,
    navigateToPanorama,
    selectTour,
    reload
  } = useTour360(projectId, initialTourId, initialPanoramaId);

  const containerRef = useRef(null);
  const controlsRef = useRef(null);

  const [activeInfoHotspot, setActiveInfoHotspot] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle hotspot clicks
  const handleHotspotClick = useCallback((hotspot) => {
    if (!hotspot) return;

    switch (hotspot.hotspot_type) {
      case 'NAVIGATION':
        if (hotspot.target_panorama_id) {
          navigateToPanorama(hotspot.target_panorama_id);
        }
        break;

      case 'INFO':
        setActiveInfoHotspot(hotspot);
        break;

      case 'UNIT':
        if (hotspot.entity_id) {
          setSelectedUnitId(String(hotspot.entity_id));
        }
        break;

      default:
        break;
    }
  }, [navigateToPanorama]);

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  // Toggle Fullscreen
  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(console.error);
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // If error or no active tour/panorama
  if (error || (!isLoading && (!tour || !currentPanorama?.panorama_url))) {
    return (
      <TourErrorFallback
        title={error ? 'Ошибка загрузки 360° тура' : '360° Тур не найден'}
        message={error || 'Для данного жилого комплекса пока не загружены активные панорамы 360°.'}
        onRetry={reload}
        onBack={onBack}
      />
    );
  }

  const initialFov = currentPanorama?.initial_fov || 75;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${
        isFullscreen ? 'h-screen' : 'h-[660px]'
      } rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden select-none`}
    >
      {/* Fade Transition Overlay */}
      <div
        className={`absolute inset-0 z-30 bg-slate-950 pointer-events-none transition-opacity duration-200 ease-in-out ${
          isTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Tour & Panorama Info */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-xl text-slate-200 text-xs font-bold transition shadow-lg cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Назад</span>
            </button>
          )}

          {tours.length > 1 ? (
            <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 p-1 shadow-lg">
              {tours.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTour(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    String(activeTourId) === String(t.id)
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 px-3.5 py-2 shadow-lg text-white">
              <Compass className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold">{tour?.name || '360° Тур'}</span>
            </div>
          )}

          {currentPanorama?.title && (
            <div className="hidden md:flex items-center gap-1.5 bg-purple-950/80 backdrop-blur-md border border-purple-500/40 px-3 py-1.5 rounded-xl text-purple-300 text-xs font-bold shadow-lg">
              <span>{currentPanorama.title}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleResetCamera}
            title="Сбросить положение камеры"
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-xl text-slate-200 text-xs font-bold transition shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Сбросить вид</span>
          </button>

          <button
            onClick={handleToggleFullscreen}
            title="Во весь экран"
            className="flex h-8 w-8 items-center justify-center bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 rounded-xl text-slate-200 transition shadow-lg cursor-pointer"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 360 Three.js Canvas */}
      {currentPanorama?.panorama_url && (
        <Canvas
          camera={{ position: [0, 0, 0.1], fov: initialFov }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          {/* First-person Look-Around Orbit Controls */}
          <OrbitControls
            ref={controlsRef}
            enableZoom
            enablePan={false}
            rotateSpeed={-0.4} // Natural inverted look
            zoomSpeed={0.8}
            minDistance={0.05}
            maxDistance={0.5}
            maxPolarAngle={Math.PI - 0.05} // Almost full vertical look
            minPolarAngle={0.05}
          />

          <Suspense fallback={<TourLoader message="Загрузка панорамы 360°..." />}>
            <PanoramaSphere
              panoramaUrl={currentPanorama.panorama_url}
              hotspots={hotspots}
              onHotspotClick={handleHotspotClick}
            />
          </Suspense>
        </Canvas>
      )}

      {/* Bottom Panoramas Navigation Bar */}
      <TourNavigation
        panoramas={panoramas}
        currentPanoramaId={currentPanoramaId}
        onSelectPanorama={navigateToPanorama}
      />

      {/* Info Hotspot Modal */}
      {activeInfoHotspot && (
        <TourInfoModal
          hotspot={activeInfoHotspot}
          onClose={() => setActiveInfoHotspot(null)}
        />
      )}

      {/* Existing CRM Apartment Detail Modal */}
      {selectedUnitId && (
        <ApartmentDetailModal
          unitId={selectedUnitId}
          isOpen={Boolean(selectedUnitId)}
          onClose={() => setSelectedUnitId(null)}
          currency={currency}
        />
      )}
    </div>
  );
}
