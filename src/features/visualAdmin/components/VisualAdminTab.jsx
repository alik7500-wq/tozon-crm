import React, { useState, useEffect } from 'react';
import {
  Box,
  Compass,
  Sliders,
  Sparkles,
  Layers,
  Building2,
  Eye,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { SceneList } from './3d/SceneList';
import { CreateSceneModal } from './3d/CreateSceneModal';
import { MeshMappingManager } from './3d/MeshMappingManager';
import { TourList } from './360/TourList';
import { CreateTourModal } from './360/CreateTourModal';
import { PanoramaManager } from './360/PanoramaManager';
import { MediaAdminManager } from '../../projectGallery';
import { Scene3DViewer } from '../../visual3d';
import { Tour360Viewer } from '../../tour360';
import { visualAdminApi } from '../services/visualAdminApi';
import { api } from '../../../api/client';

export function VisualAdminTab({ projectId, currency = 'TJS' }) {
  const [activeSection, setActiveSection] = useState('3d'); // '3d' or '360'
  const [scenes, setScenes] = useState([]);
  const [tours, setTours] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 3D View states
  const [isCreateSceneOpen, setIsCreateSceneOpen] = useState(false);
  const [editingMeshScene, setEditingMeshScene] = useState(null);
  const [previewScene, setPreviewScene] = useState(null);

  // 360 View states
  const [isCreateTourOpen, setIsCreateTourOpen] = useState(false);
  const [managingTour, setManagingTour] = useState(null);
  const [previewTour, setPreviewTour] = useState(null);

  const loadData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [scenesList, toursList, projectRes] = await Promise.all([
        visualAdminApi.getScenes(projectId),
        visualAdminApi.getTours(projectId),
        api.get(`/projects/${projectId}`)
      ]);

      setScenes(scenesList);
      setTours(toursList);
      setBuildings(projectRes.data?.project?.buildings || []);
    } catch (err) {
      console.error('Failed to load visual admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // If in Mesh Mapping Manager mode
  if (editingMeshScene) {
    return (
      <MeshMappingManager
        scene={editingMeshScene}
        projectId={projectId}
        buildings={buildings}
        onBack={() => {
          setEditingMeshScene(null);
          loadData();
        }}
      />
    );
  }

  // If in Panorama Manager mode
  if (managingTour) {
    return (
      <PanoramaManager
        tour={managingTour}
        projectId={projectId}
        onBack={() => {
          setManagingTour(null);
          loadData();
        }}
        onTourUpdated={loadData}
      />
    );
  }

  // If Previewing a 3D Scene
  if (previewScene) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewScene(null)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              ← Вернуться к списку сцен
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-xs font-bold text-slate-800">
              Предпросмотр: {previewScene.name}
            </span>
          </div>
        </div>

        <Scene3DViewer
          projectId={projectId}
          currency={currency}
          onBackToChessboard={() => setPreviewScene(null)}
        />
      </div>
    );
  }

  // If Previewing a 360 Tour
  if (previewTour) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewTour(null)}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
            >
              ← Вернуться к списку туров
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-xs font-bold text-slate-800">
              Предпросмотр тура: {previewTour.name}
            </span>
          </div>
        </div>

        <Tour360Viewer
          projectId={projectId}
          initialTourId={previewTour.id}
          currency={currency}
          onBack={() => setPreviewTour(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sub-tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveSection('3d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeSection === '3d'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Box className="h-4 w-4" />
            <span>3D-сцены и Фасады ({scenes.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('360')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeSection === '360'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>360° Туры и Панорамы ({tours.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('media')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeSection === 'media'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>Фото и Рендеры</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Content */}
      {activeSection === '3d' && (
        <SceneList
          scenes={scenes}
          onOpenCreate={() => setIsCreateSceneOpen(true)}
          onOpenMeshManager={(scene) => setEditingMeshScene(scene)}
          onOpenPreview={(scene) => setPreviewScene(scene)}
          onSceneUpdated={loadData}
        />
      )}

      {activeSection === '360' && (
        <TourList
          tours={tours}
          onOpenCreate={() => setIsCreateTourOpen(true)}
          onOpenPanoramaManager={(tour) => setManagingTour(tour)}
          onOpenPreview={(tour) => setPreviewTour(tour)}
          onTourUpdated={loadData}
        />
      )}

      {activeSection === 'media' && (
        <MediaAdminManager projectId={projectId} />
      )}

      {/* Create Scene Modal */}
      <CreateSceneModal
        projectId={projectId}
        buildings={buildings}
        isOpen={isCreateSceneOpen}
        onClose={() => setIsCreateSceneOpen(false)}
        onSceneCreated={loadData}
      />

      {/* Create Tour Modal */}
      <CreateTourModal
        projectId={projectId}
        isOpen={isCreateTourOpen}
        onClose={() => setIsCreateTourOpen(false)}
        onTourCreated={loadData}
      />
    </div>
  );
}
