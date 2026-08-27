import React, { useState } from 'react';
import {
  Box,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Play,
  Trash2,
  Edit,
  Plus,
  ShieldCheck,
  Building2,
  Eye,
  Sliders
} from 'lucide-react';
import { visualAdminApi } from '../../services/visualAdminApi';

export function SceneList({
  scenes = [],
  onOpenCreate,
  onOpenMeshManager,
  onOpenPreview,
  onSceneUpdated
}) {
  const [loadingActionId, setLoadingActionId] = useState(null);

  const handleActivate = async (sceneId) => {
    setLoadingActionId(sceneId);
    try {
      await visualAdminApi.activateScene(sceneId);
      onSceneUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка активации сцены');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleDelete = async (scene) => {
    if (!window.confirm(`Вы действительно хотите удалить сцену "${scene.name}"?`)) return;
    setLoadingActionId(scene.id);
    try {
      await visualAdminApi.deleteScene(scene.id);
      onSceneUpdated();
    } catch (err) {
      alert(err.message || 'Ошибка удаления сцены');
    } finally {
      setLoadingActionId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    return (bytes / (1024 * 1024)).toFixed(2) + ' МБ';
  };

  return (
    <div className="space-y-4">
      {/* Header & Create Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            3D-сцены и фасады
          </h3>
          <p className="text-xs text-slate-500">
            Управление моделями GLB, версионированием и привязкой мешей
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить 3D-сцену</span>
        </button>
      </div>

      {/* Scenes List */}
      {scenes.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 border-dashed space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Box className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Нет 3D-сцен</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Загрузите первую 3D-модель здания в формате .glb для отображения фасада и интерактивной шахматки.
          </p>
          <button
            onClick={onOpenCreate}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-500 transition cursor-pointer"
          >
            Загрузить GLB
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {scenes.map((scene) => {
            const isActive = scene.is_active;
            const isLoading = loadingActionId === scene.id;

            return (
              <div
                key={scene.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border transition shadow-2xs ${
                  isActive
                    ? 'border-emerald-300 ring-1 ring-emerald-400/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Left info */}
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black ${
                    isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Box className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                        {scene.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700">
                        v{scene.version || 1}
                      </span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Активна
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Черновик
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Тип: <strong className="text-slate-600">{scene.scene_type}</strong></span>
                      {scene.building_name && (
                        <span>Корпус: <strong className="text-slate-600">{scene.building_name}</strong></span>
                      )}
                      <span>Размер: <strong className="text-slate-600">{formatFileSize(scene.file_size_bytes)}</strong></span>
                      <span>Обновлено: <strong className="text-slate-600">{new Date(scene.updated_at).toLocaleDateString('ru-RU')}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onOpenPreview(scene)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Просмотр</span>
                  </button>

                  <button
                    onClick={() => onOpenMeshManager(scene)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold border border-blue-200 transition cursor-pointer"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Меши ({scene.entities_count || 0})</span>
                  </button>

                  {!isActive && (
                    <button
                      onClick={() => handleActivate(scene.id)}
                      disabled={isLoading}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Активировать</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(scene)}
                    disabled={isLoading}
                    title="Удалить сцену"
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
