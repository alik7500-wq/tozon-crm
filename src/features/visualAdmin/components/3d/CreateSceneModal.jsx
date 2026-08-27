import React, { useState } from 'react';
import { X, Upload, Box, AlertCircle, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { visualAdminApi } from '../../services/visualAdminApi';

export function CreateSceneModal({
  projectId,
  buildings = [],
  isOpen,
  onClose,
  onSceneCreated
}) {
  const [name, setName] = useState('');
  const [sceneType, setSceneType] = useState('BUILDING');
  const [buildingId, setBuildingId] = useState('');
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Check extension
    if (!selected.name.toLowerCase().endsWith('.glb')) {
      setError('Поддерживаются только 3D-модели в бинарном формате .glb');
      return;
    }

    // Check size (max 100MB)
    if (selected.size > 100 * 1024 * 1024) {
      setError('Размер файла превышает лимит 100 МБ');
      return;
    }

    setError('');
    setFile(selected);
    if (!name) {
      setName(selected.name.replace(/\.glb$/i, ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Пожалуйста, выберите файл модели .glb');
      return;
    }
    if (!name.trim()) {
      setError('Укажите название сцены');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // 1. Get presigned upload URL from backend
      const uploadData = await visualAdminApi.getGlbUploadUrl(projectId, file.name, file.size);
      
      // 2. Upload file directly with progress
      await visualAdminApi.uploadFileToSignedUrl(uploadData.signedUploadUrl, file, (progress) => {
        setUploadProgress(progress);
      });

      // 3. Register scene in DB
      const sceneData = {
        name: name.trim(),
        scene_type: sceneType,
        building_id: buildingId ? parseInt(buildingId, 10) : null,
        storage_path: uploadData.storagePath,
        file_size_bytes: file.size,
        version: 1,
        is_active: false // Inactive until previewed and activated
      };

      const created = await visualAdminApi.createScene(projectId, sceneData);
      onSceneCreated(created);
      onClose();
    } catch (err) {
      console.error('Failed to create scene:', err);
      setError(err.message || 'Ошибка загрузки 3D сцены');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Новая 3D-сцена
              </h3>
              <p className="text-xs text-slate-500">
                Загрузка GLB модели и регистрация сцены
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
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
          {/* Scene Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Название сцены *
            </label>
            <input
              type="text"
              required
              disabled={isUploading}
              placeholder="например: Корпус А — Фасад и шахматка"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Scene Type & Building */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Тип сцены
              </label>
              <select
                value={sceneType}
                disabled={isUploading}
                onChange={(e) => setSceneType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="BUILDING">Здание / Корпус</option>
                <option value="MASTERPLAN">Генплан ЖК</option>
                <option value="FLOOR">Этаж</option>
                <option value="APARTMENT">Квартира</option>
              </select>
            </div>

            {sceneType === 'BUILDING' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Связанный корпус
                </label>
                <select
                  value={buildingId}
                  disabled={isUploading}
                  onChange={(e) => setBuildingId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Без привязки (Все)</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* GLB File Upload Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Файл 3D-модели (.glb, макс. 100 МБ) *
            </label>
            <div className="relative rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center transition cursor-pointer group">
              <input
                type="file"
                accept=".glb"
                disabled={isUploading}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                <Upload className="h-5 w-5" />
              </div>

              {file ? (
                <div>
                  <span className="text-xs font-extrabold text-blue-600 block">{file.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} МБ
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-xs font-bold text-slate-700 block">
                    Перетащите файл .glb сюда или нажмите для выбора
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Бинарный формат GLTF 2.0 (Three.js compatible)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span>Загрузка модели на сервер...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isUploading || !file}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Загрузка...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Загрузить сцену</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
