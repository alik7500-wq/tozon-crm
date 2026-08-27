import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RotateCcw,
  Maximize,
  Minimize,
  Filter,
  Search,
  Building2,
  HelpCircle,
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { useScene3D } from '../hooks/useScene3D';
import { SceneCanvas } from './SceneCanvas';
import { SceneTooltip } from './SceneTooltip';
import { SceneErrorFallback } from './SceneErrorFallback';
import { ApartmentDetailModal } from '../../apartments/ApartmentDetailModal';
import { STATUS_THEME } from '../utils/statusTheme';

export function Scene3DViewer({
  projectId,
  currency = 'TJS',
  onBackToChessboard
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    scenes,
    activeScene,
    activeSceneId,
    entities,
    entitiesMap,
    unitIdToMeshKeyMap,
    unitNumberToMeshKeyMap,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    roomsFilter,
    setRoomsFilter,
    searchQuery,
    setSearchQuery,
    isMeshFilteredOut,
    selectScene,
    refreshEntities,
    reload
  } = useScene3D(projectId);

  const containerRef = useRef(null);
  const controlsRef = useRef(null);

  // Interaction and Modal state
  const [hoveredMeshKey, setHoveredMeshKey] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // -------------------------------------------------------------
  // URL Deep-Linking: Check if unit query param is present
  // -------------------------------------------------------------
  useEffect(() => {
    const unitParam = searchParams.get('unit');
    if (unitParam) {
      setSelectedUnitId(unitParam);
    }
  }, [searchParams]);

  // Handle mesh hover (instant from preloaded batch entitiesMap)
  const handleHoverMesh = useCallback((meshKey, clientPos, isMapped) => {
    if (!meshKey || !isMapped) {
      setHoveredMeshKey(null);
      return;
    }

    setHoveredMeshKey(meshKey);
    if (clientPos) {
      setTooltipPos(clientPos);
    }
  }, []);

  // Handle mesh click selection -> Open existing CRM ApartmentDetailModal
  const handleSelectMesh = useCallback((meshKey) => {
    if (!meshKey) return;
    const entity = entitiesMap.get(meshKey);
    if (entity && entity.entity_type === 'UNIT' && entity.entity_id) {
      setSelectedUnitId(String(entity.entity_id));

      // Update URL query param cleanly without reloading
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('unit', String(entity.entity_id));
        return next;
      }, { replace: true });
    }
  }, [entitiesMap, setSearchParams]);

  // Close modal and remove URL query param
  const handleCloseModal = useCallback(() => {
    setSelectedUnitId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('unit');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    const q = searchQuery.trim().toLowerCase().replace(/^№/, '');
    if (!q) return;

    // Try finding matching unit number
    const meshKey = unitNumberToMeshKeyMap.get(q);
    if (meshKey) {
      handleSelectMesh(meshKey);
    }
  };

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

  // Get active hovered entity data
  const hoveredEntity = hoveredMeshKey ? entitiesMap.get(hoveredMeshKey) : null;
  const hoveredTooltipData = hoveredEntity ? {
    entityType: hoveredEntity.entity_type,
    unit: hoveredEntity.unit,
    meshKey: hoveredMeshKey
  } : null;

  // Selected mesh key for highlight
  const selectedMeshKey = selectedUnitId ? unitIdToMeshKeyMap.get(String(selectedUnitId)) : null;

  // If error or no active scene
  if (error || (!isLoading && (!activeScene || !activeScene.model_url))) {
    return (
      <SceneErrorFallback
        title={error ? 'Ошибка загрузки 3D сцены' : '3D-модель не найдена'}
        message={error || 'Для данного жилого комплекса пока не загружена активная 3D-модель.'}
        onRetry={reload}
        onBack={onBackToChessboard}
      />
    );
  }

  const mappedCount = entities?.length || 0;

  return (
    <div className="space-y-3">
      {/* Filters & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3.5 border border-slate-200 shadow-2xs">
        {/* Left: Filters & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>Фильтры 3D:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Все статусы</option>
            <option value="AVAILABLE">🟢 Свободные</option>
            <option value="RESERVED">🟡 В брони</option>
            <option value="SOLD">🔴 Проданные</option>
            <option value="BLOCKED">⚪ Заблокированные</option>
          </select>

          {/* Rooms Filter */}
          <select
            value={roomsFilter}
            onChange={(e) => setRoomsFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Все комнаты</option>
            <option value="1">1-комнатные</option>
            <option value="2">2-комнатные</option>
            <option value="3">3-комнатные</option>
            <option value="4">4-комнатные</option>
            <option value="0">Студии</option>
          </select>

          {/* Apartment Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="№ квартиры..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </form>
        </div>

        {/* Right: Legend */}
        <div className="flex flex-wrap items-center gap-3.5 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span>Свободна</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span>В брони</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-xs" />
            <span>Продана</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shadow-xs" />
            <span>Блок</span>
          </div>
        </div>
      </div>

      {/* 3D Viewport Container */}
      <div
        ref={containerRef}
        className={`relative w-full ${
          isFullscreen ? 'h-screen' : 'h-[660px]'
        } rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden select-none`}
      >
        {/* Top Floating Scene Selector & Controls */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          {/* Scene Selector & Realtime Indicator */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {scenes.length > 1 ? (
              <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/70 p-1 shadow-lg">
                {scenes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectScene(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeSceneId === s.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {s.building_name ? s.building_name : s.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/70 px-3.5 py-2 shadow-lg text-white">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold">{activeScene?.name || '3D Модель'}</span>
              </div>
            )}

            {/* Realtime Active Badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 px-3 py-1.5 rounded-xl text-emerald-300 text-xs font-bold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime ({mappedCount} квартир)</span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handleResetCamera}
              title="Сбросить положение камеры"
              className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/70 px-3 py-2 rounded-xl text-slate-200 text-xs font-bold transition shadow-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Сбросить вид</span>
            </button>

            <button
              onClick={handleToggleFullscreen}
              title="Во весь экран"
              className="flex h-8 w-8 items-center justify-center bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/70 rounded-xl text-slate-200 transition shadow-lg cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 3D Canvas */}
        {activeScene?.model_url && (
          <SceneCanvas
            modelUrl={activeScene.model_url}
            cameraConfig={activeScene.camera_config}
            environmentConfig={activeScene.environment_config}
            entitiesMap={entitiesMap}
            isMeshFilteredOut={isMeshFilteredOut}
            onHoverMesh={handleHoverMesh}
            onSelectMesh={handleSelectMesh}
            hoveredMeshKey={hoveredMeshKey}
            selectedMeshKey={selectedMeshKey}
            controlsRef={controlsRef}
          />
        )}

        {/* Hover Tooltip */}
        <SceneTooltip
          visible={!!hoveredMeshKey && !!hoveredTooltipData}
          position={tooltipPos}
          data={hoveredTooltipData}
          currency={currency}
        />

        {/* Bottom Hint */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none flex items-center gap-2 bg-slate-950/70 backdrop-blur-sm border border-slate-800/80 px-3 py-1.5 rounded-lg text-[11px] text-slate-400">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>Клик по квартире открывает карточку • Вращение (ЛКМ) • Панорама (ПКМ)</span>
        </div>
      </div>

      {/* CRM Apartment Detail Modal (Direct Reuse of existing CRM component) */}
      {selectedUnitId && (
        <ApartmentDetailModal
          unitId={selectedUnitId}
          isOpen={Boolean(selectedUnitId)}
          onClose={handleCloseModal}
          onUnitUpdated={refreshEntities}
          currency={currency}
        />
      )}
    </div>
  );
}
